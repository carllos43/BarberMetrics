import type { AuthContext } from "../../http/middlewares/auth";
import type { BillsRepo, BillDTO } from "./bills.repository";
import { NotFoundError } from "../../domain/errors";

export interface CreateBillInput { name: string; value: number; dueDay: number; category?: string }
export interface UpdateBillInput { name?: string; value?: number; dueDay?: number; category?: string }

export class BillsService {
  constructor(private repo: BillsRepo) {}

  list(ctx: AuthContext) { return this.repo.list(ctx.barbershopId); }

  create(ctx: AuthContext, input: CreateBillInput): Promise<BillDTO> {
    return this.repo.create(ctx.barbershopId, { userId: ctx.userId, ...input, category: input.category ?? "Fixa" });
  }

  async update(ctx: AuthContext, id: number, patch: UpdateBillInput): Promise<BillDTO> {
    const updated = await this.repo.update(ctx.barbershopId, id, patch);
    if (!updated) throw new NotFoundError("Conta não encontrada");
    return updated;
  }

  async remove(ctx: AuthContext, id: number): Promise<void> {
    const found = await this.repo.findById(ctx.barbershopId, id);
    if (!found) throw new NotFoundError("Conta não encontrada");
    await this.repo.delete(ctx.barbershopId, id);
  }
}
