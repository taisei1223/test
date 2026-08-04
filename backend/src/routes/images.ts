import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import imageSize from "image-size";
import { prisma } from "../db";
import { env } from "../env";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

export const imagesRouter = Router();
imagesRouter.use(requireAuth);

fs.mkdirSync(env.uploadDir, { recursive: true });

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME[file.mimetype]) {
      cb(new Error("JPEGまたはPNG形式の画像のみアップロードできます"));
      return;
    }
    cb(null, true);
  },
});

imagesRouter.post("/", upload.single("image"), async (req: AuthedRequest, res) => {
  const file = req.file;
  const view = req.body.view;
  if (!file) {
    res.status(400).json({ error: "画像ファイルが必要です" });
    return;
  }
  if (view !== "front" && view !== "side") {
    res.status(400).json({ error: "view は front または side を指定してください" });
    return;
  }

  let dimensions: { width?: number; height?: number };
  try {
    dimensions = imageSize(file.buffer);
  } catch {
    res.status(400).json({ error: "画像を読み取れませんでした" });
    return;
  }
  if (!dimensions.width || !dimensions.height) {
    res.status(400).json({ error: "画像サイズを取得できませんでした" });
    return;
  }

  const userId = req.user!.sub;
  const userDir = path.join(env.uploadDir, userId);
  fs.mkdirSync(userDir, { recursive: true });
  const filename = `${randomUUID()}${ALLOWED_MIME[file.mimetype]}`;
  const filePath = path.join(userDir, filename);
  fs.writeFileSync(filePath, file.buffer);

  const image = await prisma.image.create({
    data: {
      userId,
      view,
      filePath,
      width: dimensions.width,
      height: dimensions.height,
    },
  });

  res.status(201).json({
    id: image.id,
    view: image.view,
    width: image.width,
    height: image.height,
    url: `/api/images/${image.id}/file`,
    createdAt: image.createdAt,
  });
});

imagesRouter.get("/:id/file", async (req: AuthedRequest, res) => {
  const image = await prisma.image.findUnique({ where: { id: req.params.id } });
  if (!image || image.userId !== req.user!.sub) {
    res.status(404).json({ error: "画像が見つかりません" });
    return;
  }
  res.sendFile(path.resolve(image.filePath));
});
