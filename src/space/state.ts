// Learning Space save data and rules (no Phaser here, so it can be tested).
import { defaultLearningSettings, newLearningStats, upgradeSettings, type LearningSettings, type LearningStats } from '../questions/engine';
import { getLang } from '../i18n';
import type { Grade } from '../questions/curriculum';
import { pick, ri, weighted } from '../util/rng';
import { MAX_PART, MINERAL_IDS, MINERALS, PARTS, planet, type PartDef, type Text } from './data';

export type PartId = PartDef['id'];

/** One planet's base: fuel plants, their stock, and the command center. */
export interface Base {
  loxLv: number;
  ch4Lv: number;
  adminLv: number;
  /** Fuel made and waiting in the tanks. */
  lox: number;
  ch4: number;
  /** Time production was last counted up to. */
  paidTo: number;
}

export interface SpaceSave {
  version: 1;
  commander: string;
  /** The planet the player started on (decides ship and special skill). */
  start: string;
  /** Planet the player is on now. */
  at: string;
  /** World number: 1 on the first planet, +1 for each new planet reached. */
  world: number;
  /** Planets reached, in order. */
  visited: string[];
  bases: Record<string, Base>;
  /** Minerals stored at the bases (shared). */
  minerals: Record<string, number>;
  /** Minerals in the ship's hold, not unloaded yet. */
  cargo: Record<string, number>;
  ship: Record<PartId, number>;
  /** Minerals seen at least once (for the "new mineral" lesson). */
  seen: string[];
  /** Missions whose reward was collected. */
  missions: string[];
  /** The Deep Space Telescope on Pluto is built (the big ending). */
  scope?: boolean;
  settings: LearningSettings;
  learning: LearningStats;
  createdAt: number;
  lastPlayed: number;
}

const KEY = 'learning-space.save.v1';

// ---------------------------------------------------------------- balance
/** Fuel made per minute by a plant of this level. */
export const fuelPerMinute = (lv: number) => 4 * lv;
/** Fuel each tank at a base can hold. */
export const fuelCap = (adminLv: number) => 60 * adminLv;
/** Plants can be upgraded up to twice the command center level. */
export const plantMax = (adminLv: number) => Math.min(10, adminLv * 2);
export const MAX_ADMIN = 5;
/** Minerals the hold carries. */
export const cargoCap = (lv: number) => 15 + 10 * lv;
/** Ship speed in pixels per second. */
export const shipSpeed = (lv: number) => 220 + 40 * lv;
/** Fuel (of each kind) for a trip to a new planet, and to a planet already visited. */
export const tripFuel = (level: number) => Math.min(MAX_TRIP_FUEL, 40 * (level - 1));
/** The longest trips still fit in a level 5 base's tanks. */
export const MAX_TRIP_FUEL = 280;
export const RETURN_FUEL = 20;

function newBase(now: number): Base {
  return { loxLv: 1, ch4Lv: 1, adminLv: 1, lox: 0, ch4: 0, paidTo: now };
}

const zero = () => Object.fromEntries(MINERAL_IDS.map((m) => [m, 0])) as Record<string, number>;

export function newSpace(commander: string, grade: Grade, start: string, now = Date.now()): SpaceSave {
  const lang = getLang();
  return {
    version: 1,
    commander,
    start,
    at: start,
    world: 1,
    visited: [start],
    bases: { [start]: newBase(now) },
    minerals: zero(),
    cargo: zero(),
    ship: { engine: 1, tank: 1, cargo: 1, laser: 1, shield: 1 },
    seen: [],
    missions: [],
    settings: { ...defaultLearningSettings(lang), grade },
    learning: newLearningStats(),
    createdAt: now,
    lastPlayed: now,
  };
}

export function loadSpace(): SpaceSave | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SpaceSave;
    s.settings = upgradeSettings(s.settings);
    s.minerals = { ...zero(), ...s.minerals };
    s.cargo = { ...zero(), ...s.cargo };
    s.seen ??= [];
    s.missions ??= [];
    return s;
  } catch {
    return null;
  }
}

export function saveSpace(s: SpaceSave): void {
  s.lastPlayed = Date.now();
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked */
  }
}

export function base(s: SpaceSave): Base {
  return (s.bases[s.at] ??= newBase(Date.now()));
}

// ---------------------------------------------------------------- skills
const skill = (s: SpaceSave, p: string) => s.start === p;
/** Mercury: fuel plants make 50% more. */
export const fuelBoost = (s: SpaceSave) => (skill(s, 'mercury') ? 1.5 : 1);
/** Venus: shields 50% stronger. */
export const shieldHits = (s: SpaceSave) => Math.floor((2 + s.ship.shield) * (skill(s, 'venus') ? 1.5 : 1));

// ---------------------------------------------------------------- fuel
/** Fuel a plant at the current base makes per minute (skills and moons can double it). */
export function plantRate(s: SpaceSave, kind: 'lox' | 'ch4'): number {
  const b = base(s);
  const site = planet(s.at).site.bonus === kind ? 2 : 1;
  return fuelPerMinute(kind === 'lox' ? b.loxLv : b.ch4Lv) * fuelBoost(s) * site;
}

/** Count up fuel made since last time (plants stop when the tanks are full). */
export function produce(s: SpaceSave, now = Date.now()): void {
  const b = base(s);
  const minutes = Math.max(0, now - b.paidTo) / 60000;
  const cap = fuelCap(b.adminLv);
  b.lox = Math.min(cap, b.lox + minutes * plantRate(s, 'lox'));
  b.ch4 = Math.min(cap, b.ch4 + minutes * plantRate(s, 'ch4'));
  b.paidTo = now;
}

// ---------------------------------------------------------------- costs
export type Cost = Record<string, number>;

export function partCost(part: PartId, toLevel: number): Cost {
  const def = PARTS.find((p) => p.id === part)!;
  const c: Cost = {};
  for (const [m, n] of Object.entries(def.cost)) c[m] = n * toLevel;
  // Higher levels also need some gold.
  if (toLevel >= 4) c.au = (c.au ?? 0) + Math.floor(toLevel / 2);
  // The top levels need metals from the outer solar system.
  if (toLevel >= 7) c.ti = toLevel - 5;
  if (toLevel >= 9) c.pt = toLevel - 7;
  return c;
}

export function plantCost(kind: 'lox' | 'ch4', toLevel: number): Cost {
  return kind === 'lox' ? { fe: 3 * toLevel, cu: 2 * toLevel } : { fe: 3 * toLevel, ni: 2 * toLevel };
}

export function adminCost(toLevel: number): Cost {
  return { fe: 6 * toLevel, al: 4 * toLevel, ag: 2 * toLevel, au: toLevel - 1 };
}

export function canAfford(s: SpaceSave, c: Cost): boolean {
  return Object.entries(c).every(([m, n]) => (s.minerals[m] ?? 0) >= n);
}

function pay(s: SpaceSave, c: Cost): boolean {
  if (!canAfford(s, c)) return false;
  for (const [m, n] of Object.entries(c)) s.minerals[m] -= n;
  return true;
}

export function upgradePart(s: SpaceSave, part: PartId): boolean {
  const lv = s.ship[part];
  if (lv >= MAX_PART || !pay(s, partCost(part, lv + 1))) return false;
  s.ship[part] = lv + 1;
  return true;
}

export function upgradePlant(s: SpaceSave, kind: 'lox' | 'ch4', now = Date.now()): boolean {
  produce(s, now);
  const b = base(s);
  const key = kind === 'lox' ? 'loxLv' : 'ch4Lv';
  if (b[key] >= plantMax(b.adminLv) || !pay(s, plantCost(kind, b[key] + 1))) return false;
  b[key]++;
  return true;
}

export function upgradeAdmin(s: SpaceSave, now = Date.now()): boolean {
  produce(s, now);
  const b = base(s);
  if (b.adminLv >= MAX_ADMIN || !pay(s, adminCost(b.adminLv + 1))) return false;
  b.adminLv++;
  return true;
}

// ---------------------------------------------------------------- mining
export const cargoTotal = (s: SpaceSave) => Object.values(s.cargo).reduce((a, b) => a + b, 0);

/** Past the asteroid belt (Jupiter and farther). */
export const isOuter = (planetId: string) => planet(planetId).reach > 1;

/** A random mineral for a new asteroid (gold and silver are rare; titanium and platinum only far out). */
export function rollMineral(outer = false): string {
  return weighted(Object.fromEntries(MINERALS.filter((m) => outer || !m.outer).map((m) => [m.id, m.weight])) as Record<string, number>);
}

/** Minerals from one asteroid: right answer = all, wrong = half. */
export function mineYield(s: SpaceSave, mineralId: string, rich: boolean, correct: boolean): number {
  let n = 3 + s.ship.laser + ri(0, 1);
  if (skill(s, 'earth')) n *= 1.25;
  if (skill(s, 'mars') && mineralId === 'fe') n *= 2;
  if (rich) n *= 3;
  if (!correct) n /= 2;
  return Math.max(1, Math.round(n));
}

/** Put minerals in the hold; returns how many fit. */
export function addCargo(s: SpaceSave, mineralId: string, n: number): number {
  const room = Math.max(0, cargoCap(s.ship.cargo) - cargoTotal(s));
  const got = Math.min(room, n);
  s.cargo[mineralId] = (s.cargo[mineralId] ?? 0) + got;
  return got;
}

/** Landing: everything in the hold goes into storage. */
export function unload(s: SpaceSave): Record<string, number> {
  const moved: Record<string, number> = {};
  for (const m of MINERAL_IDS) {
    if (s.cargo[m]) moved[m] = s.cargo[m];
    s.minerals[m] += s.cargo[m];
    s.cargo[m] = 0;
  }
  return moved;
}

// ---------------------------------------------------------------- aliens
/** Alien hit points grow a little with each world. */
export const alienHits = (s: SpaceSave) => 2 + s.world;

/** Minerals for chasing an alien away. */
export function alienReward(s: SpaceSave): Record<string, number> {
  const out: Record<string, number> = {};
  const kinds = ri(2, 3);
  for (let i = 0; i < kinds; i++) {
    const m = Math.random() < 0.2 ? pick(isOuter(s.at) ? ['ag', 'au', 'ti', 'pt'] : ['ag', 'au']) : rollMineral(isOuter(s.at));
    out[m] = (out[m] ?? 0) + 3 + s.world + ri(0, 2);
  }
  return out;
}

/** Losing to an alien: the ship hurries home and drops half of its hold. */
export function loseHalfCargo(s: SpaceSave): void {
  for (const m of MINERAL_IDS) s.cargo[m] = Math.floor(s.cargo[m] / 2);
}

// ---------------------------------------------------------------- travel
export interface TripCheck {
  /** Reaching it makes it a new world. */
  isNew: boolean;
  world: number;
  lox: number;
  ch4: number;
  engine: number;
  tank: number;
  ok: boolean;
}

export function tripCheck(s: SpaceSave, target: string, now = Date.now()): TripCheck {
  produce(s, now);
  const b = base(s);
  const isNew = !s.visited.includes(target);
  const world = isNew ? s.world + 1 : s.world;
  // Far planets need a strong ship even if you go there early.
  const need = isNew ? Math.max(world, planet(target).reach) : 1;
  const fuel = isNew ? tripFuel(need) : RETURN_FUEL;
  const ok = target !== s.at && b.lox >= fuel && b.ch4 >= fuel && s.ship.engine >= need && s.ship.tank >= need;
  return { isNew, world, lox: fuel, ch4: fuel, engine: need, tank: need, ok };
}

/** Fly to another planet. Returns false if the ship isn't ready. */
export function travel(s: SpaceSave, target: string, now = Date.now()): boolean {
  const c = tripCheck(s, target, now);
  if (!c.ok) return false;
  const b = base(s);
  b.lox -= c.lox;
  b.ch4 -= c.ch4;
  if (c.isNew) {
    s.visited.push(target);
    s.world = c.world;
  }
  s.at = target;
  // A new base starts fresh; an old one made fuel while you were away.
  if (!s.bases[target]) s.bases[target] = newBase(now);
  produce(s, now);
  return true;
}

// ---------------------------------------------------------------- missions
export interface Mission {
  id: string;
  text: Text;
  reward: Cost;
  done: (s: SpaceSave) => boolean;
}

const been = (s: SpaceSave, ...ids: string[]) => ids.every((id) => s.visited.includes(id));

/** Big goals for the whole game, in order. Each gives a reward once. */
export const MISSIONS: Mission[] = [
  { id: 'world2', text: { en: 'Reach a new planet (World 2).', fr: 'Atteins une nouvelle planète (monde 2).' }, reward: { fe: 10, cu: 6 }, done: (s) => s.world >= 2 },
  { id: 'inner', text: { en: 'Visit all four rocky planets: Mercury, Venus, Earth and Mars.', fr: 'Visite les quatre planètes rocheuses : Mercure, Vénus, la Terre et Mars.' }, reward: { al: 10, ag: 4 }, done: (s) => been(s, 'mercury', 'venus', 'earth', 'mars') },
  { id: 'minerals6', text: { en: 'Find iron, nickel, copper, aluminum, silver and gold.', fr: 'Trouve du fer, du nickel, du cuivre, de l’aluminium, de l’argent et de l’or.' }, reward: { au: 4 }, done: (s) => ['fe', 'ni', 'cu', 'al', 'ag', 'au'].every((m) => s.seen.includes(m)) },
  { id: 'ship4', text: { en: 'Get your engine and fuel tank to level 4.', fr: 'Monte ton moteur et ton réservoir au niveau 4.' }, reward: { fe: 12, ni: 8 }, done: (s) => s.ship.engine >= 4 && s.ship.tank >= 4 },
  { id: 'jupiter', text: { en: 'Build a moon base on Ganymede, at Jupiter.', fr: 'Construis une base lunaire sur Ganymède, près de Jupiter.' }, reward: { ti: 6, au: 4 }, done: (s) => been(s, 'jupiter') },
  { id: 'saturn', text: { en: 'Build a moon base on Titan, at Saturn.', fr: 'Construis une base lunaire sur Titan, près de Saturne.' }, reward: { ti: 8, pt: 2 }, done: (s) => been(s, 'saturn') },
  { id: 'admin5', text: { en: 'Upgrade a Command Center to level 5.', fr: 'Améliore un centre de commande jusqu’au niveau 5.' }, reward: { au: 8, ag: 6 }, done: (s) => Object.values(s.bases).some((b) => b.adminLv >= 5) },
  { id: 'uranus', text: { en: 'Build a space station at Uranus.', fr: 'Construis une station spatiale près d’Uranus.' }, reward: { pt: 4, ti: 6 }, done: (s) => been(s, 'uranus') },
  { id: 'neptune', text: { en: 'Build a space station at Neptune.', fr: 'Construis une station spatiale près de Neptune.' }, reward: { pt: 4, ti: 6 }, done: (s) => been(s, 'neptune') },
  { id: 'minerals8', text: { en: 'Find titanium and platinum too: all 8 minerals!', fr: 'Trouve aussi du titane et du platine : les 8 minéraux!' }, reward: { au: 6 }, done: (s) => MINERAL_IDS.every((m) => s.seen.includes(m)) },
  { id: 'pluto', text: { en: 'Land on Pluto, the dwarf planet at the edge of the solar system.', fr: 'Pose-toi sur Pluton, la planète naine au bord du système solaire.' }, reward: { pt: 4, au: 10 }, done: (s) => been(s, 'pluto') },
  { id: 'scope', text: { en: 'Build the Deep Space Telescope on Pluto.', fr: 'Construis le télescope de l’espace lointain sur Pluton.' }, reward: {}, done: (s) => !!s.scope },
];

/** A finished mission with its reward not collected yet. */
export const canClaim = (s: SpaceSave, m: Mission) => m.done(s) && !s.missions.includes(m.id);

/** Collect a mission's reward (into storage). */
export function claimMission(s: SpaceSave, id: string): boolean {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m || !canClaim(s, m)) return false;
  for (const [k, n] of Object.entries(m.reward)) s.minerals[k] = (s.minerals[k] ?? 0) + n;
  s.missions.push(id);
  return true;
}

/** The first mission not done yet (what to do next). */
export const nextMission = (s: SpaceSave) => MISSIONS.find((m) => !m.done(s));

// ---------------------------------------------------------------- telescope
export const SCOPE_COST: Cost = { al: 40, au: 15, ti: 25, pt: 12 };

/** Build the Deep Space Telescope (only on Pluto, once). */
export function buildScope(s: SpaceSave): boolean {
  if (s.at !== 'pluto' || s.scope || !pay(s, SCOPE_COST)) return false;
  s.scope = true;
  return true;
}
