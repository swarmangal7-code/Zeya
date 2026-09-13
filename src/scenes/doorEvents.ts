export type DoorEventType = "knock" | "open" | "enter";
export interface DoorEventDetail {
  variant?: 1 | 2;
}

export const doorEmitter = new EventTarget();

export function emitDoor(type: DoorEventType, detail: DoorEventDetail = {}): void {
  doorEmitter.dispatchEvent(new CustomEvent(type, { detail }));
}

export function onDoor(type: DoorEventType, handler: (detail: DoorEventDetail) => void): () => void {
  const fn = (e: Event) => handler((e as CustomEvent<DoorEventDetail>).detail ?? {});
  doorEmitter.addEventListener(type, fn);
  return () => doorEmitter.removeEventListener(type, fn);
}