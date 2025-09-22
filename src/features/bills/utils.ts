export function labelFor(id: string) {
  return id; // swap with your name lookup
}

export function toNum(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
