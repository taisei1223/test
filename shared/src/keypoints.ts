/**
 * The 19 anatomical keypoints defined in the requirements doc (section 3.1).
 * Front-view photos use the bilateral points; side-view photos use only the
 * right-side points (a side photo can only show one side of the body).
 */
export type KeypointName =
  | "headTop" // 1 頭頂
  | "neckMid" // 2 首の中点
  | "shoulderL" // 3 左肩
  | "shoulderR" // 4 右肩
  | "elbowL" // 5 左肘
  | "elbowR" // 6 右肘
  | "wristL" // 7 左手首
  | "wristR" // 8 右手首
  | "trochanterL" // 9 左大転子
  | "trochanterR" // 10 右大転子
  | "kneeL" // 11 左膝
  | "kneeR" // 12 右膝
  | "ankleL" // 13 左足首
  | "ankleR" // 14 右足首
  | "eyeR" // 15 右目
  | "earR" // 16 右耳
  | "c7" // 17 第七頚椎
  | "psisR" // 18 右上後腸骨棘
  | "asisR"; // 19 右上前腸骨棘

export type View = "front" | "side";

export interface KeypointDef {
  name: KeypointName;
  no: number;
  label: string;
  views: View[];
  /**
   * True for landmarks that have no standard output in general pose
   * estimation models (MediaPipe/OpenPose) and must be approximated from
   * nearby standard landmarks in the Phase 1 pipeline. See section 8 of the
   * requirements doc ("特殊ランドマークの検出精度") — these values are
   * shown to the user as reference/approximate, not precise detections.
   */
  isSpecialLandmark: boolean;
}

export const KEYPOINTS: KeypointDef[] = [
  { name: "headTop", no: 1, label: "頭頂", views: ["front", "side"], isSpecialLandmark: true },
  { name: "neckMid", no: 2, label: "首の中点", views: ["front", "side"], isSpecialLandmark: false },
  { name: "shoulderL", no: 3, label: "左肩", views: ["front"], isSpecialLandmark: false },
  { name: "shoulderR", no: 4, label: "右肩", views: ["front", "side"], isSpecialLandmark: false },
  { name: "elbowL", no: 5, label: "左肘", views: ["front"], isSpecialLandmark: false },
  { name: "elbowR", no: 6, label: "右肘", views: ["front", "side"], isSpecialLandmark: false },
  { name: "wristL", no: 7, label: "左手首", views: ["front"], isSpecialLandmark: false },
  { name: "wristR", no: 8, label: "右手首", views: ["front", "side"], isSpecialLandmark: false },
  { name: "trochanterL", no: 9, label: "左大転子", views: ["front"], isSpecialLandmark: true },
  { name: "trochanterR", no: 10, label: "右大転子", views: ["front", "side"], isSpecialLandmark: true },
  { name: "kneeL", no: 11, label: "左膝", views: ["front"], isSpecialLandmark: false },
  { name: "kneeR", no: 12, label: "右膝", views: ["front", "side"], isSpecialLandmark: false },
  { name: "ankleL", no: 13, label: "左足首", views: ["front"], isSpecialLandmark: false },
  { name: "ankleR", no: 14, label: "右足首", views: ["front", "side"], isSpecialLandmark: false },
  { name: "eyeR", no: 15, label: "右目", views: ["side"], isSpecialLandmark: false },
  { name: "earR", no: 16, label: "右耳", views: ["side"], isSpecialLandmark: false },
  { name: "c7", no: 17, label: "第七頚椎", views: ["side"], isSpecialLandmark: true },
  { name: "psisR", no: 18, label: "右上後腸骨棘", views: ["side"], isSpecialLandmark: true },
  { name: "asisR", no: 19, label: "右上前腸骨棘", views: ["side"], isSpecialLandmark: true },
];

export const KEYPOINTS_BY_NAME: Record<KeypointName, KeypointDef> = Object.fromEntries(
  KEYPOINTS.map((k) => [k.name, k])
) as Record<KeypointName, KeypointDef>;

export function keypointsForView(view: View): KeypointDef[] {
  return KEYPOINTS.filter((k) => k.views.includes(view));
}

/** Bone connections used to draw the skeleton overlay. */
export const SKELETON_EDGES_FRONT: [KeypointName, KeypointName][] = [
  ["headTop", "neckMid"],
  ["neckMid", "shoulderL"],
  ["neckMid", "shoulderR"],
  ["shoulderL", "elbowL"],
  ["elbowL", "wristL"],
  ["shoulderR", "elbowR"],
  ["elbowR", "wristR"],
  ["shoulderL", "trochanterL"],
  ["shoulderR", "trochanterR"],
  ["trochanterL", "trochanterR"],
  ["trochanterL", "kneeL"],
  ["kneeL", "ankleL"],
  ["trochanterR", "kneeR"],
  ["kneeR", "ankleR"],
];

export const SKELETON_EDGES_SIDE: [KeypointName, KeypointName][] = [
  ["headTop", "neckMid"],
  ["earR", "eyeR"],
  ["neckMid", "c7"],
  ["c7", "shoulderR"],
  ["shoulderR", "elbowR"],
  ["elbowR", "wristR"],
  ["shoulderR", "trochanterR"],
  ["asisR", "psisR"],
  ["trochanterR", "kneeR"],
  ["kneeR", "ankleR"],
];
