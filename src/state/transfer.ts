// "Move my save": pack everything this device has saved (heroes, farm, games
// unlocked, settings) into one text code, and load such a code on another
// device or in the app. The code is compressed so it stays short enough to
// copy and paste.
const PREFIXES = ['learning-dungeon.', 'learning-farm.', 'learning-arcade.', 'learning-space.', 'learning-animals.'];
const VERSION = 'LD1';

function storage(): Storage {
  return globalThis.localStorage;
}

function ours(key: string): boolean {
  return PREFIXES.some((p) => key.startsWith(p));
}

/** Everything the games saved on this device. */
export function collectSave(): Record<string, string> {
  const s = storage();
  const out: Record<string, string> = {};
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && ours(k)) out[k] = s.getItem(k) ?? '';
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** Make the save code ("LD1." + compressed data). */
export async function exportSave(): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(collectSave()));
  if (typeof CompressionStream === 'undefined') return `${VERSION}.r.${toBase64Url(json)}`;
  return `${VERSION}.z.${toBase64Url(await pipe(json, new CompressionStream('deflate')))}`;
}

/** Read a save code back into its saved values (throws if it isn't one). */
export async function decodeSave(code: string): Promise<Record<string, string>> {
  const clean = code.replace(/\s+/g, '');
  const [version, kind, data] = clean.split('.');
  if (version !== VERSION || !data || (kind !== 'z' && kind !== 'r')) throw new Error('not a save code');
  let bytes = fromBase64Url(data);
  if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate'));
  const obj = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  if (!obj || typeof obj !== 'object') throw new Error('bad save');
  const values = obj as Record<string, unknown>;
  const keys = Object.keys(values);
  if (!keys.length || !keys.every((k) => ours(k) && typeof values[k] === 'string')) throw new Error('bad save');
  return values as Record<string, string>;
}

/** What a code holds, to show before loading it. */
export function describeSave(values: Record<string, string>): { heroes: string[]; farm?: string } {
  let heroes: string[] = [];
  try {
    heroes = (JSON.parse(values['learning-dungeon.profiles.v1'] ?? '[]') as { name: string; level: number }[]).map((p) => `${p.name} (${p.level})`);
  } catch {
    /* no heroes */
  }
  let farm: string | undefined;
  try {
    const f = values['learning-farm.save.v1'];
    if (f) farm = (JSON.parse(f) as { farmer: string }).farmer;
  } catch {
    /* no farm */
  }
  return { heroes, farm };
}

/** Replace this device's saves with the ones in the code. */
export function applySave(values: Record<string, string>): void {
  const s = storage();
  const old: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && ours(k)) old.push(k);
  }
  old.forEach((k) => s.removeItem(k));
  for (const [k, v] of Object.entries(values)) s.setItem(k, v);
}
