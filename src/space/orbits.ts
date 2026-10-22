// Where the planets really are around the Sun today. Uses the JPL "Keplerian
// elements for approximate positions of the major planets" (E. M. Standish,
// valid 1800-2050): good to well under a degree, plenty for a map.

export interface Elements {
  /** Semi-major axis (AU) and its rate per century. */
  a: number;
  /** Eccentricity. */
  e: number;
  /** Mean longitude (degrees) at J2000 and its rate (degrees per century). */
  L: number;
  dL: number;
  /** Longitude of perihelion (degrees) and its rate. */
  w: number;
  dw: number;
}

/** J2000 elements (Standish, Table 1). Earth is the Earth-Moon barycenter. */
export const ELEMENTS: Record<string, Elements> = {
  mercury: { a: 0.38709927, e: 0.20563593, L: 252.2503235, dL: 149472.67411175, w: 77.45779628, dw: 0.16047689 },
  venus: { a: 0.72333566, e: 0.00677672, L: 181.9790995, dL: 58517.81538729, w: 131.60246718, dw: 0.00268329 },
  earth: { a: 1.00000261, e: 0.01671123, L: 100.46457166, dL: 35999.37244981, w: 102.93768193, dw: 0.32327364 },
  mars: { a: 1.52371034, e: 0.0933941, L: -4.55343205, dL: 19140.30268499, w: -23.94362959, dw: 0.44441088 },
  jupiter: { a: 5.202887, e: 0.04838624, L: 34.39644051, dL: 3034.74612775, w: 14.72847983, dw: 0.21252668 },
  saturn: { a: 9.53667594, e: 0.05386179, L: 49.95424423, dL: 1222.49362201, w: 92.59887831, dw: -0.41897216 },
  uranus: { a: 19.18916464, e: 0.04725744, L: 313.23810451, dL: 428.48202785, w: 170.9542763, dw: 0.40805281 },
  neptune: { a: 30.06992276, e: 0.00859048, L: -55.12002969, dL: 218.45945325, w: 44.96476227, dw: -0.32241464 },
  pluto: { a: 39.48211675, e: 0.2488273, L: 238.92903833, dL: 145.20780515, w: 224.06891629, dw: -0.04062942 },
};

/** Julian centuries since J2000.0 (2000-01-01 12:00 TT, close enough to UTC here). */
export function centuries(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  return (jd - 2451545.0) / 36525;
}

const rad = (d: number) => (d * Math.PI) / 180;
const norm = (d: number) => ((d % 360) + 360) % 360;

/**
 * Heliocentric position seen from above the solar system: longitude
 * (degrees, counter-clockwise from the vernal equinox) and distance (AU).
 * The small tilts of the orbits are ignored, which is fine for a flat map.
 */
export function heliocentric(planet: string, date: Date = new Date()): { lon: number; r: number } {
  const el = ELEMENTS[planet];
  const T = centuries(date);
  const L = el.L + el.dL * T;
  const w = el.w + el.dw * T;
  const M = rad(norm(L - w));
  // Kepler's equation: E - e sin E = M.
  let E = M + el.e * Math.sin(M);
  for (let i = 0; i < 10; i++) E -= (E - el.e * Math.sin(E) - M) / (1 - el.e * Math.cos(E));
  const nu = 2 * Math.atan2(Math.sqrt(1 + el.e) * Math.sin(E / 2), Math.sqrt(1 - el.e) * Math.cos(E / 2));
  const r = el.a * (1 - el.e * Math.cos(E));
  return { lon: norm((nu * 180) / Math.PI + w), r };
}

/** Smallest angle between two longitudes (degrees). */
export function angleBetween(a: number, b: number): number {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 360 - d);
}

/** Distance between two planets today (AU), on the flat map. */
export function distanceAU(p: string, q: string, date: Date = new Date()): number {
  const a = heliocentric(p, date);
  const b = heliocentric(q, date);
  const ax = a.r * Math.cos(rad(a.lon));
  const ay = a.r * Math.sin(rad(a.lon));
  const bx = b.r * Math.cos(rad(b.lon));
  const by = b.r * Math.sin(rad(b.lon));
  return Math.hypot(ax - bx, ay - by);
}
