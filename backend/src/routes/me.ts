import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get("/", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) {
    res.status(404).json({ error: "ユーザーが見つかりません" });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, heightCm: user.heightCm });
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  heightCm: z.number().min(50).max(250).optional(),
});

meRouter.patch("/", async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" });
    return;
  }
  const user = await prisma.user.update({ where: { id: req.user!.sub }, data: parsed.data });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, heightCm: user.heightCm });
});
