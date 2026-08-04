import express from "express";
import cors from "cors";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { imagesRouter } from "./routes/images";
import { measurementsRouter } from "./routes/measurements";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/images", imagesRouter);
app.use("/api/measurements", measurementsRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(400).json({ error: err.message || "予期しないエラーが発生しました" });
});

app.listen(env.port, () => {
  console.log(`posture-analysis backend listening on :${env.port}`);
});
