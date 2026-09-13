export type Stage =
  | "loading"
  | "locked"
  | "unlocking"
  | "door_idle"
  | "knock_1"
  | "knock_2"
  | "open_available"
  | "opening"
  | "door_open"
  | "step_inside_available"
  | "entering"
  | "interior_reveal"
  | "revealed"
  | "scroll";

export type Quality = "high" | "medium" | "low";

export type CameraMode = "normal" | "door_opening" | "door_open" | "entering" | "interior";