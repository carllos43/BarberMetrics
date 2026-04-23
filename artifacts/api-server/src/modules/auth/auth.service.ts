import type { UsersRepo } from "../users/users.repository";
import type { MembershipsRepo } from "../memberships/memberships.repository";
import { ForbiddenError, NotFoundError } from "../../domain/errors";

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "barbearia";
}

export interface OnboardInput {
  fullName: string;
  barbershopName?: string;
}

export interface SessionPayload {
  user: { id: string; email: string; fullName: string; role: string; commissionPercent: number };
  barbershop: { id: string; name: string; slug: string };
}

/**
 * AuthService no longer issues tokens — those come from Supabase Auth.
 * It manages the application-side mirror: profile row, barbershop, membership.
 */
export class AuthService {
  constructor(private users: UsersRepo, private memberships: MembershipsRepo) {}

  /**
   * Called once after a Supabase signUp succeeds. Creates the profile,
   * the barbershop, and the owner membership (idempotent if called twice).
   */
  async onboard(authUser: { id: string; email: string }, input: OnboardInput): Promise<SessionPayload> {
    const fullName = input.fullName.trim() || authUser.email.split("@")[0];
    const user = await this.users.upsert({ id: authUser.id, email: authUser.email, fullName });

    let m = await this.memberships.findActiveForUser(user.id);
    if (!m) {
      const bsName = (input.barbershopName?.trim() || `Barbearia de ${fullName}`).slice(0, 80);
      const baseSlug = slugify(bsName);
      const slug = `${baseSlug}-${user.id.slice(0, 8)}`;
      const bs = await this.memberships.createBarbershopForOwner({
        ownerUserId: user.id, name: bsName, slug,
      });
      return {
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, commissionPercent: user.commissionPercent },
        barbershop: { id: bs.id, name: bs.name, slug: bs.slug },
      };
    }
    const bs = await this.memberships.getBarbershop(m.barbershopId);
    if (!bs) throw new ForbiddenError("Barbearia não encontrada");
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, commissionPercent: user.commissionPercent },
      barbershop: { id: bs.id, name: bs.name, slug: bs.slug },
    };
  }

  async me(authUser: { id: string; email: string }): Promise<SessionPayload> {
    const user = await this.users.findById(authUser.id);
    if (!user) throw new NotFoundError("Perfil não encontrado — faça o onboarding");
    const m = await this.memberships.findActiveForUser(user.id);
    if (!m) throw new ForbiddenError("Usuário sem barbearia vinculada");
    const bs = await this.memberships.getBarbershop(m.barbershopId);
    if (!bs) throw new ForbiddenError("Barbearia não encontrada");
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, commissionPercent: user.commissionPercent },
      barbershop: { id: bs.id, name: bs.name, slug: bs.slug },
    };
  }
}
