// The parent gate's check (kept free of Phaser so it can be unit-tested).
export const ADULT_AGE = 18;

/** True when `year` is a believable birth year for an adult. */
export function isAdultBirthYear(year: number, now = new Date().getFullYear()): boolean {
  return Number.isInteger(year) && year >= now - 110 && year <= now - ADULT_AGE;
}
