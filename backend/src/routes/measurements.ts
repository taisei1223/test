import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { computeMetrics, calibratePxToCm, metricsToCm, KeypointMap } from "@posture/shared";

export const measurementsRouter = Router();
measurementsRouter.use(requireAuth);

const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
  score: z.number().min(0).max(1).default(1),
  estimated: z.boolean().default(false),
});

const createSchema = z.object({
  imageId: z.string(),
  view: z.enum(["front", "side"]),
  keypoints: z.record(z.string(), pointSchema),
  sessionId: z.string().optional(),
});

measurementsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" });
    return;
  }
  const { imageId, view, keypoints, sessionId } = parsed.data;
  const userId = req.user!.sub;

  const image = await prisma.image.findUnique({ where: { id: imageId } });
  if (!image || image.userId !== userId) {
    res.status(404).json({ error: "画像が見つかりません" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const kp = keypoints as KeypointMap;
  let metrics = computeMetrics(kp, view);
  if (user?.heightCm) {
    const pxToCm = calibratePxToCm(kp, user.heightCm);
    metrics = metricsToCm(metrics, pxToCm);
  }

  const measurement = await prisma.measurement.create({
    data: {
      userId,
      imageId,
      view,
      keypoints: JSON.stringify(keypoints),
      metrics: JSON.stringify(metrics),
      sessionId,
    },
    include: { image: true },
  });

  res.status(201).json(serialize(measurement));
});

function serialize(m: {
  id: string;
  imageId: string;
  view: string;
  keypoints: string;
  metrics: string;
  sessionId: string | null;
  createdAt: Date;
  image: { width: number; height: number };
}) {
  return {
    id: m.id,
    imageId: m.imageId,
    view: m.view,
    keypoints: JSON.parse(m.keypoints),
    metrics: JSON.parse(m.metrics),
    sessionId: m.sessionId,
    createdAt: m.createdAt,
    imageWidth: m.image.width,
    imageHeight: m.image.height,
  };
}

measurementsRouter.get("/", async (req: AuthedRequest, res) => {
  const measurements = await prisma.measurement.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { image: true },
  });
  res.json(measurements.map(serialize));
});

measurementsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const m = await prisma.measurement.findUnique({ where: { id: req.params.id }, include: { image: true } });
  if (!m || m.userId !== req.user!.sub) {
    res.status(404).json({ error: "測定結果が見つかりません" });
    return;
  }
  res.json(serialize(m));
});

const compareSchema = z.object({ ids: z.string().min(1) });

measurementsRouter.get("/compare/batch", async (req: AuthedRequest, res) => {
  const parsed = compareSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "ids クエリパラメータが必要です" });
    return;
  }
  const ids = parsed.data.ids.split(",").filter(Boolean);
  const measurements = await prisma.measurement.findMany({
    where: { id: { in: ids }, userId: req.user!.sub },
    orderBy: { createdAt: "asc" },
    include: { image: true },
  });
  res.json(measurements.map(serialize));
});
