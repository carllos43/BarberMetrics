import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { PersonalCategoriesRepo } from "./personalCategories.repository";
import { sendOk } from "../../http/response";
import { ValidationError, NotFoundError } from "../../domain/errors";

export const CategoryBody = z.object({
  nome: z.string().min(1).max(40),
  icon: z.string().max(40).optional(),
  color: z.string().max(40).optional(),
});
export const CategoryPatch = CategoryBody.partial();

const slugify = (s: string) =>
  "u_" + s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30);

export class PersonalCategoriesController {
  constructor(private repo: PersonalCategoriesRepo) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      sendOk(res, await this.repo.ensureSystemCategories(auth.barbershopId, auth.userId));
    } catch (e) { next(e); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const body = req.body as z.infer<typeof CategoryBody>;
      const slug = slugify(body.nome);
      const exists = await this.repo.findBySlug(auth.barbershopId, auth.userId, slug);
      if (exists) throw new ValidationError("Já existe uma categoria com nome parecido");
      const created = await this.repo.create(auth.barbershopId, auth.userId, {
        slug, nome: body.nome, icon: body.icon, color: body.color, isSystem: false,
      });
      sendOk(res, created, 201);
    } catch (e) { next(e); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const id = Number(req.params.id);
      const cur = await this.repo.findById(auth.barbershopId, id);
      if (!cur) throw new NotFoundError("Categoria não encontrada");
      const updated = await this.repo.update(auth.barbershopId, id, req.body);
      sendOk(res, updated);
    } catch (e) { next(e); }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const id = Number(req.params.id);
      const cur = await this.repo.findById(auth.barbershopId, id);
      if (!cur) return res.status(204).end();
      if (cur.isSystem) throw new ValidationError("Categoria fixa não pode ser excluída");
      await this.repo.delete(auth.barbershopId, id);
      res.status(204).end();
    } catch (e) { next(e); }
  };
}
