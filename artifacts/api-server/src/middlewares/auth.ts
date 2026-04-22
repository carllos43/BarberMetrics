import type { Request, Response, NextFunction, RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

const userCache = new Set<string>();

async function ensureUserRow(id: string, email: string): Promise<void> {
  if (userCache.has(id)) return;
  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing) {
    const fullName = email.split("@")[0] || "Barbeiro";
    await db
      .insert(usersTable)
      .values({ id, email, fullName })
      .onConflictDoNothing({ target: usersTable.id });
  }
  userCache.add(id);
}

export const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (!token) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: "Token inválido" });
      return;
    }

    const email = data.user.email ?? "";
    await ensureUserRow(data.user.id, email);

    req.userId = data.user.id;
    req.userEmail = email;
    next();
  } catch (err) {
    res.status(500).json({ error: "Erro de autenticação" });
  }
};
