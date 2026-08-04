import type { MetricResult, KeypointMap } from "@posture/shared";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: "customer" | "trainer";
  heightCm: number | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UploadedImage {
  id: string;
  view: "front" | "side";
  width: number;
  height: number;
  url: string;
  createdAt: string;
}

export interface Measurement {
  id: string;
  imageId: string;
  view: "front" | "side";
  keypoints: KeypointMap;
  metrics: MetricResult[];
  sessionId: string | null;
  createdAt: string;
  imageWidth: number;
  imageHeight: number;
}
