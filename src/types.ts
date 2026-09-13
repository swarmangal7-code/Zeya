export type Stage =
  | "loading"
  | "locked"
  | "unlocking"
  | "door_idle"
  | "knock_1"
  | "knock_2"
  | "open_available"
  | "opening"
  | "revealing"
  | "revealed"
  | "scroll";

export type Quality = "high" | "medium" | "low";