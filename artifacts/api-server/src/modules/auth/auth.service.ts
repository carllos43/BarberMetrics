import type { UsersRepo } from "../users/users.repository";
import type { MembershipsRepo } from "../memberships/memberships.repository";
import { hashPassword, verifyPassword } from "../../lib/password";
import { signJwt } from "../../lib/jwt";
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } from "../../domain/errors";

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "barbearia";
}

export interface SignupInput {
  email: string;
  password: string;
  fullName: string;
  barbershopName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: { id: string; email: string; fullName: string; role: string; commissionPercent: number };
  barbershop: { id: string; name: string; slug: string };
}

export class AuthService {
  constructor(private users: UsersRepo, private memberships: MembershipsRepo) {}

  private async issue(userId: string): Promise<AuthResult> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("Usuário não encontrado");
    const m = await this.memberships.findActiveForUser(user.id);
    if (!m) throw new ForbiddenError("Usuário sem barbearia vinculada");
    const bs = await this.memberships.getBarbershop(m.barbershopId);
    if (!bs) throw new ForbiddenError("Barbearia não encontrada");

    const token = signJwt({ sub: user.id, email: user.email, bsId: bs.id, role: m.role });
    return {
      token,
      user: {
        id: user.id, email: user.email, fullName: user.fullName,
        role: user.role, commissionPercent: user.commissionPercent,
      },
      barbershop: { id: bs.id, name: bs.name, slug: bs.slug },
    };
  }

  async signup(input: SignupInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictError("E-mail já cadastrado");

    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create({ email, passwordHash, fullName: input.fullName.trim() });

    const bsName = (input.barbershopName?.trim() || `Barbearia de ${input.fullName.trim()}`).slice(0, 80);
    const baseSlug = slugify(bsName);
    const slug = `${baseSlug}-${user.id.slice(0, 8)}`;
    await this.memberships.createBarbershopForOwner({
      ownerUserId: user.id, name: bsName, slug,
    });

    return this.issue(user.id);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedError("E-mail ou senha inválidos");
    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError("E-mail ou senha inválidos");
    return this.issue(user.id);
  }

  async me(userId: string): Promise<AuthResult> {
    return this.issue(userId);
  }
}
