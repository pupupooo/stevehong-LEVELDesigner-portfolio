const _dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const randRange = (lo, hi) => lo + Math.random() * (hi - lo);
const randInt = (lo, hi) => Math.floor(randRange(lo, hi + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const pointInArea = (x, y, a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h;
const randomPointInArea = (a, m = 20) => ({
  x: randRange(a.x + m, a.x + a.w - m),
  y: randRange(a.y + m, a.y + a.h - m)
});

function lineCircleIntersect(ox, oy, dx, dy, cx, cy, r) {
  const fx = ox - cx, fy = oy - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  let disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  disc = Math.sqrt(disc);
  const t1 = (-b - disc) / (2 * a);
  if (t1 >= 0) return t1;
  const t2 = (-b + disc) / (2 * a);
  if (t2 >= 0) return t2;
  return null;
}
