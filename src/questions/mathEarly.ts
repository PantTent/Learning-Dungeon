// Early-grade math (ages 6-8), following Quebec's "Progression des
// apprentissages en mathematique" for 1re, 2e and 3e annee.
// Difficulty = school year: 1 = 1re annee, 2 = 2e annee, 3 = 3e annee.
// All text is picked with L(en, fr) at generation time, so every generator
// works in English and French. Each question has a `key` that encodes its
// numbers: the same question always gets the same id, and tests can
// recompute the answer from it.
import type { Difficulty, Question } from './types';
import { chance, pick, ri, shuffle } from '../util/rng';
import { L, fmtNum, getUnits } from '../i18n';

export const EARLY_TOPICS: Record<string, { en: string; fr: string }> = {
  'e-count': { en: 'Counting (before, after, between)', fr: 'Compter (avant, après, entre)' },
  'e-add': { en: 'Addition', fr: 'Addition' },
  'e-sub': { en: 'Subtraction', fr: 'Soustraction' },
  'e-missing': { en: 'Missing numbers', fr: 'Nombres manquants' },
  'e-compare': { en: 'Comparing numbers', fr: 'Comparer des nombres' },
  'e-place': { en: 'Tens and ones', fr: 'Dizaines et unités' },
  'e-skip': { en: 'Skip counting', fr: 'Compter par bonds' },
  'e-doubles': { en: 'Doubles and halves', fr: 'Doubles et moitiés' },
  'e-even-odd': { en: 'Even and odd', fr: 'Pair et impair' },
  'e-money': { en: 'Money', fr: 'Argent' },
  'e-time': { en: 'Time', fr: 'Le temps' },
  'e-shapes': { en: 'Shapes', fr: 'Figures et solides' },
  'e-mult': { en: 'Multiplication (equal groups)', fr: 'Multiplication (groupes égaux)' },
  'e-div': { en: 'Sharing equally', fr: 'Partage égal' },
  'e-fractions': { en: 'Fractions', fr: 'Fractions' },
  'e-measure': { en: 'Measuring length', fr: 'Mesurer des longueurs' },
  'e-word': { en: 'Story problems', fr: 'Problèmes écrits' },
};

type EarlyQ = Omit<Question, 'id' | 'subject' | 'topic' | 'difficulty'> & { key: string };
type Gen = (d: Difficulty) => EarlyQ;

const f = (n: number) => fmtNum(n);
const MINUS = '−';
const cents = (n: number) => L(`${n}¢`, `${n} ¢`);
const dollars = (n: number) => L(`$${n}`, `${n} $`);
/** 25 -> "25¢", 100 -> "$1", 200 -> "$2". */
const money = (c: number) => (c < 100 ? cents(c) : dollars(c / 100));

const GENERIC_TEACH = () =>
  L(
    'Read it slowly. Draw dots, use your fingers or a number line, then check your answer.',
    'Lis lentement. Dessine des points, utilise tes doigts ou une droite numérique, puis vérifie ta réponse.',
  );

/** True when `text` contains `answer` as a whole number ("1 000" counts as 1000). */
export function mentionsNumber(text: string, answer: string): boolean {
  const flat = text.replace(/(\d)[ ,\u00a0\u202f](?=\d{3}(?!\d))/g, '$1');
  return new RegExp(`(^|[^\\d])${answer}([^\\d]|$)`).test(flat);
}

function num(key: string, prompt: string, answer: number, explanation: string, teach: string, safe?: string): EarlyQ {
  const a = String(answer);
  const t = mentionsNumber(teach, a) ? (safe && !mentionsNumber(safe, a) ? safe : GENERIC_TEACH()) : teach;
  return { key, prompt, input: 'number', answer: a, explanation, teach: t };
}

function choice(key: string, prompt: string, answer: string, wrong: string[], explanation: string, teach: string): EarlyQ {
  const uniqueWrong = [...new Set(wrong.filter((w) => w !== answer))].slice(0, 3);
  return { key, prompt, input: 'choice', answer, choices: shuffle([answer, ...uniqueWrong]), explanation, teach };
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// ---------------------------------------------------------------- people
interface Person { en: string; fr: string; girl: boolean }
const PEOPLE: Person[] = [
  { en: 'Leah', fr: 'Léa', girl: true },
  { en: 'Felix', fr: 'Félix', girl: false },
  { en: 'Zoe', fr: 'Zoé', girl: true },
  { en: 'Samuel', fr: 'Samuel', girl: false },
  { en: 'Florence', fr: 'Florence', girl: true },
  { en: 'Thomas', fr: 'Thomas', girl: false },
  { en: 'William', fr: 'William', girl: false },
  { en: 'Olivia', fr: 'Olivia', girl: true },
  { en: 'Emile', fr: 'Émile', girl: false },
  { en: 'Rosalie', fr: 'Rosalie', girl: true },
];
const nm = (p: Person) => L(p.en, p.fr);
const He = (p: Person) => L(p.girl ? 'She' : 'He', p.girl ? 'Elle' : 'Il');
const he = (p: Person) => L(p.girl ? 'she' : 'he', p.girl ? 'elle' : 'il');

// ---------------------------------------------------------------- word problem stories
type Story = (p: Person, a: number, b: number) => string;
interface Ctx { add: Story; sub: Story; big: boolean }
const CTX: Ctx[] = [
  {
    big: false,
    add: (p, a, b) => L(`${nm(p)} has ${a} mittens. ${He(p)} finds ${b} more. How many mittens does ${he(p)} have now?`, `${nm(p)} a ${a} mitaines. ${He(p)} en trouve ${b} autres. Combien de mitaines a-t-${he(p)} maintenant?`),
    sub: (p, a, b) => L(`${nm(p)} has ${a} mittens. ${He(p)} loses ${b} in the snow. How many mittens are left?`, `${nm(p)} a ${a} mitaines. ${He(p)} en perd ${b} dans la neige. Combien de mitaines lui reste-t-il?`),
  },
  {
    big: true,
    add: (p, a, b) => L(`${nm(p)} catches ${a} snowflakes. Then ${he(p)} catches ${b} more. How many snowflakes in all?`, `${nm(p)} attrape ${a} flocons de neige. Puis ${he(p)} en attrape ${b} autres. Combien de flocons en tout?`),
    sub: (p, a, b) => L(`${a} snowflakes land on ${nm(p)}'s coat. ${b} melt. How many snowflakes are left?`, `${a} flocons tombent sur le manteau de ${nm(p)}. ${b} fondent. Combien de flocons reste-t-il?`),
  },
  {
    big: false,
    add: (p, a, b) => L(`${nm(p)} has ${a} hockey pucks. The coach gives ${p.girl ? 'her' : 'him'} ${b} more. How many pucks now?`, `${nm(p)} a ${a} rondelles de hockey. L'entraîneur lui en donne ${b} autres. Combien de rondelles a-t-${he(p)} maintenant?`),
    sub: (p, a, b) => L(`${nm(p)} has ${a} hockey pucks. ${He(p)} loses ${b} in a snowbank. How many pucks are left?`, `${nm(p)} a ${a} rondelles de hockey. ${He(p)} en perd ${b} dans un banc de neige. Combien de rondelles lui reste-t-il?`),
  },
  {
    big: true,
    add: (_p, a, b) => L(`A sugar shack has ${a} cans of maple syrup. It fills ${b} more. How many cans now?`, `Une cabane à sucre a ${a} cannes de sirop d'érable. On en remplit ${b} autres. Combien de cannes y a-t-il maintenant?`),
    sub: (_p, a, b) => L(`A sugar shack has ${a} cans of maple syrup. It sells ${b}. How many cans are left?`, `Une cabane à sucre a ${a} cannes de sirop d'érable. Elle en vend ${b}. Combien de cannes reste-t-il?`),
  },
  {
    big: false,
    add: (_p, a, b) => L(`${a} beavers swim in the pond. ${b} more come. How many beavers now?`, `${a} castors nagent dans l'étang. ${b} autres arrivent. Combien de castors y a-t-il maintenant?`),
    sub: (_p, a, b) => L(`${a} beavers build a dam. ${b} swim away. How many beavers are left?`, `${a} castors construisent un barrage. ${b} partent à la nage. Combien de castors reste-t-il?`),
  },
  {
    big: false,
    add: (_p, a, b) => L(`There are ${a} kids on the school bus. ${b} more get on. How many kids are on the bus now?`, `Il y a ${a} enfants dans l'autobus scolaire. ${b} autres montent. Combien d'enfants y a-t-il maintenant?`),
    sub: (_p, a, b) => L(`There are ${a} kids on the school bus. ${b} get off. How many kids are still on the bus?`, `Il y a ${a} enfants dans l'autobus scolaire. ${b} descendent. Combien d'enfants reste-t-il dans l'autobus?`),
  },
  {
    big: true,
    add: (p, a, b) => L(`${nm(p)} has ${a} marbles. ${He(p)} wins ${b} more. How many marbles does ${he(p)} have now?`, `${nm(p)} a ${a} billes. ${He(p)} en gagne ${b} autres. Combien de billes a-t-${he(p)} maintenant?`),
    sub: (p, a, b) => L(`${nm(p)} has ${a} marbles. ${He(p)} gives ${b} to a friend. How many marbles are left?`, `${nm(p)} a ${a} billes. ${He(p)} en donne ${b} à un ami. Combien de billes lui reste-t-il?`),
  },
  {
    big: true,
    add: (p, a, b) => L(`${nm(p)} picks ${a} red apples and ${b} green apples. How many apples in all?`, `${nm(p)} cueille ${a} pommes rouges et ${b} pommes vertes. Combien de pommes en tout?`),
    sub: (p, a, b) => L(`There are ${a} apples in the orchard. ${nm(p)} picks ${b}. How many apples are left on the trees?`, `Il y a ${a} pommes dans le verger. ${nm(p)} en cueille ${b}. Combien de pommes reste-t-il dans les arbres?`),
  },
];
const MULT_STORIES: Story[] = [
  (p, a, b) => L(`${nm(p)} has ${a} bags. Each bag has ${b} marbles. How many marbles in all?`, `${nm(p)} a ${a} sacs. Chaque sac contient ${b} billes. Combien de billes en tout?`),
  (_p, a, b) => L(`There are ${a} boxes. Each box has ${b} cans of maple syrup. How many cans in all?`, `Il y a ${a} boîtes. Chaque boîte contient ${b} cannes de sirop d'érable. Combien de cannes en tout?`),
  (_p, a, b) => L(`${a} hockey teams each have ${b} players. How many players in all?`, `${a} équipes de hockey ont chacune ${b} joueurs. Combien de joueurs en tout?`),
];
const SHARE_STORIES: Story[] = [
  (_p, t, k) => L(`${t} pucks are shared equally by ${k} teams. How many pucks does each team get?`, `On partage ${t} rondelles également entre ${k} équipes. Combien de rondelles chaque équipe reçoit-elle?`),
  (p, t, k) => L(`${nm(p)} puts ${t} apples equally into ${k} baskets. How many apples go in each basket?`, `${nm(p)} place ${t} pommes également dans ${k} paniers. Combien de pommes y a-t-il dans chaque panier?`),
];

// ---------------------------------------------------------------- shapes
interface Shape { id: string; en: string; enPl: string; fr: string; frPl: string; sides: number }
const SHAPES: Shape[] = [
  { id: 'tri', en: 'triangle', enPl: 'triangles', fr: 'triangle', frPl: 'triangles', sides: 3 },
  { id: 'sq', en: 'square', enPl: 'squares', fr: 'carré', frPl: 'carrés', sides: 4 },
  { id: 'rect', en: 'rectangle', enPl: 'rectangles', fr: 'rectangle', frPl: 'rectangles', sides: 4 },
  { id: 'pent', en: 'pentagon', enPl: 'pentagons', fr: 'pentagone', frPl: 'pentagones', sides: 5 },
  { id: 'hex', en: 'hexagon', enPl: 'hexagons', fr: 'hexagone', frPl: 'hexagones', sides: 6 },
  { id: 'oct', en: 'octagon', enPl: 'octagons', fr: 'octogone', frPl: 'octogones', sides: 8 },
];
const sName = (s: Shape) => L(s.en, s.fr);

// ---------------------------------------------------------------- measuring
const UNIT_ITEMS: { en: string; fr: string; unit: 'cm' | 'm' | 'km' }[] = [
  { en: 'a pencil', fr: "d'un crayon", unit: 'cm' },
  { en: 'a book', fr: "d'un livre", unit: 'cm' },
  { en: 'a mitten', fr: "d'une mitaine", unit: 'cm' },
  { en: 'an eraser', fr: "d'une gomme à effacer", unit: 'cm' },
  { en: 'a hockey rink', fr: "d'une patinoire de hockey", unit: 'm' },
  { en: 'a school bus', fr: "d'un autobus scolaire", unit: 'm' },
  { en: 'a classroom', fr: "d'une classe", unit: 'm' },
  { en: 'a swimming pool', fr: "d'une piscine", unit: 'm' },
  { en: 'the road to Montreal', fr: 'de la route jusqu’à Montréal', unit: 'km' },
  { en: 'a trip to Quebec City', fr: "d'un voyage jusqu'à Québec", unit: 'km' },
  { en: 'the St. Lawrence River', fr: 'du fleuve Saint-Laurent', unit: 'km' },
];

/** US units: inches, feet and miles. */
const UNIT_ITEMS_US: { en: string; fr: string; unit: 'inches' | 'feet' | 'miles' }[] = [
  { en: 'a pencil', fr: "d'un crayon", unit: 'inches' },
  { en: 'a book', fr: "d'un livre", unit: 'inches' },
  { en: 'a mitten', fr: "d'une mitaine", unit: 'inches' },
  { en: 'an eraser', fr: "d'une gomme à effacer", unit: 'inches' },
  { en: 'a school bus', fr: "d'un autobus scolaire", unit: 'feet' },
  { en: 'a classroom', fr: "d'une classe", unit: 'feet' },
  { en: 'a swimming pool', fr: "d'une piscine", unit: 'feet' },
  { en: 'a basketball court', fr: "d'un terrain de basketball", unit: 'feet' },
  { en: 'the road to Boston', fr: "de la route jusqu'à Boston", unit: 'miles' },
  { en: 'a trip to New York City', fr: "d'un voyage jusqu'à New York", unit: 'miles' },
  { en: 'the Mississippi River', fr: 'du fleuve Mississippi', unit: 'miles' },
];
const US_UNIT_FR = { inches: 'pouces', feet: 'pieds', miles: 'milles' } as const;

/** e-measure with inches, feet, yards and miles. */
function measureUS(d: number): EarlyQ {
  const forms = d === 2 ? ['ftin', 'unit', 'unit', 'long', 'short', 'diff'] : ['unit', 'ydft', 'kft', 'add', 'add', 'diff'];
  const t = pick(forms);
  const inch = L('inches', 'pouces');
  if (t === 'ftin')
    return num(
      'us-ftin',
      L('How many inches are in 1 foot?', 'Combien de pouces y a-t-il dans 1 pied?'),
      12,
      L('1 foot = 12 inches. A ruler is 1 foot long and has 12 inch marks.', '1 pied = 12 pouces. Une règle mesure 1 pied et a 12 marques de pouces.'),
      L('A ruler is one foot long. Count its inch marks, one by one, all the way to the end.', 'Une règle mesure un pied. Compte ses marques de pouces une par une, jusqu’au bout.'),
    );
  if (t === 'ydft')
    return num(
      'us-ydft',
      L('How many feet are in 1 yard?', 'Combien de pieds y a-t-il dans 1 verge?'),
      3,
      L('1 yard = 3 feet. A yardstick is as long as 3 rulers.', '1 verge = 3 pieds. Une verge est aussi longue que 3 règles.'),
      L('A yardstick is a long measuring stick. How many 1-foot rulers fit along it, end to end?', 'Une verge est un long bâton pour mesurer. Combien de règles de 1 pied peux-tu placer bout à bout dessus?'),
    );
  if (t === 'kft') {
    const k = ri(2, 6);
    return num(
      `us-kft:${k}`,
      L(`How many inches are in ${k} feet?`, `Combien de pouces y a-t-il dans ${k} pieds?`),
      12 * k,
      L(`Each foot is 12 inches. ${k} × 12 = ${12 * k} inches.`, `Chaque pied vaut 12 pouces. ${k} × 12 = ${12 * k} pouces.`),
      L('One foot is twelve inches. Count by twelves, once for each foot.', 'Un pied vaut douze pouces. Compte par douze, une fois pour chaque pied.'),
    );
  }
  if (t === 'unit') {
    const i = ri(0, UNIT_ITEMS_US.length - 1);
    const it = UNIT_ITEMS_US[i];
    const name = L(it.unit, US_UNIT_FR[it.unit]);
    const why = it.unit === 'inches' ? L('it is small', "c'est petit") : it.unit === 'feet' ? L('it is big, like a room', "c'est grand, comme une pièce") : L('it is a very long way', "c'est très long");
    return choice(
      `us-unit:${i}`,
      L(`Which unit would you use to measure the length of ${it.en}?`, `Quelle unité utiliserais-tu pour mesurer la longueur ${it.fr}?`),
      name,
      (['inches', 'feet', 'miles'] as const).map((u) => L(u, US_UNIT_FR[u])),
      L(`Use ${name}: ${why}.`, `On utilise les ${name} : ${why}.`),
      L('Think about the size. Is it small enough to hold in your hand, as big as a room, or a long trip by car? Pick the unit that fits.', 'Pense à la taille. Est-ce assez petit pour tenir dans ta main, grand comme une pièce, ou un long voyage en auto?'),
    );
  }
  const a = ri(5, d === 2 ? 60 : 95);
  let b = ri(3, d === 2 ? 60 : 95);
  while (b === a) b = ri(3, 60);
  if (t === 'long' || t === 'short') {
    const long = t === 'long';
    const ans = long ? Math.max(a, b) : Math.min(a, b);
    const other = long ? Math.min(a, b) : Math.max(a, b);
    return choice(
      `us-${t}:${a},${b}`,
      long ? L(`Which is longer: ${a} inches or ${b} inches?`, `Lequel est le plus long : ${a} pouces ou ${b} pouces?`) : L(`Which is shorter: ${a} inches or ${b} inches?`, `Lequel est le plus court : ${a} pouces ou ${b} pouces?`),
      `${ans} ${inch}`,
      [`${other} ${inch}`],
      long
        ? L(`${ans} inches is longer, because ${ans} is more than ${other}.`, `${ans} pouces, c'est plus long, car ${ans} est plus grand que ${other}.`)
        : L(`${ans} inches is shorter, because ${ans} is less than ${other}.`, `${ans} pouces, c'est plus court, car ${ans} est plus petit que ${other}.`),
      L('Both are in inches, so just compare the numbers. A bigger number means a longer length.', 'Les deux sont en pouces : compare seulement les nombres. Un plus grand nombre veut dire plus long.'),
    );
  }
  if (t === 'add') {
    const p = pick(PEOPLE);
    return num(
      `us-add:${a},${b}`,
      L(`${nm(p)} puts a ${a} inch stick end to end with a ${b} inch stick. How long is it in all, in inches?`, `${nm(p)} place un bâton de ${a} pouces au bout d'un bâton de ${b} pouces. Quelle est la longueur totale, en pouces?`),
      a + b,
      L(`${a} + ${b} = ${a + b}. It is ${a + b} inches long.`, `${a} + ${b} = ${a + b}. Ça mesure ${a + b} pouces.`),
      L('End to end means one after the other, so add the two lengths together.', 'Bout à bout veut dire l’un après l’autre : additionne les deux longueurs.'),
    );
  }
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return num(
    `us-diff:${hi},${lo}`,
    L(`A ribbon is ${hi} inches long. A string is ${lo} inches long. How many inches longer is the ribbon?`, `Un ruban mesure ${hi} pouces. Une ficelle mesure ${lo} pouces. De combien de pouces le ruban est-il plus long?`),
    hi - lo,
    L(`${hi} ${MINUS} ${lo} = ${hi - lo}. The ribbon is ${hi - lo} inches longer.`, `${hi} ${MINUS} ${lo} = ${hi - lo}. Le ruban est plus long de ${hi - lo} pouces.`),
    L('To find how much longer, take the short length away from the long length. Or count up from the short one.', 'Pour savoir de combien c’est plus long, enlève la petite longueur de la grande. Ou compte à partir de la petite.'),
  );
}

const FOODS = [
  { en: 'a pizza', fr: 'une pizza' },
  { en: 'a pie', fr: 'une tarte' },
  { en: 'a chocolate bar', fr: 'une tablette de chocolat' },
];
const FRAC_NAME = (n: number) =>
  n === 2 ? L('one half', 'un demi') : n === 3 ? L('one third', 'un tiers') : L('one quarter', 'un quart');

const tensW = (n: number) => L(n === 1 ? 'ten' : 'tens', n <= 1 ? 'dizaine' : 'dizaines');
const onesW = (n: number) => L(n === 1 ? 'one' : 'ones', n <= 1 ? 'unité' : 'unités');
const hundW = (n: number) => L(n === 1 ? 'hundred' : 'hundreds', n <= 1 ? 'centaine' : 'centaines');
const groupsW = (n: number) => L(n === 1 ? 'group' : 'groups', n <= 1 ? 'groupe' : 'groupes');

const pad2 = (n: number) => String(n).padStart(2, '0');

// ---------------------------------------------------------------- generators
export const EARLY_GENERATORS: Record<string, { levels: Difficulty[]; gen: Gen }> = {
  'e-count': {
    levels: [1, 2, 3],
    gen: (d) => {
      const max = d === 1 ? (chance(0.6) ? 20 : 50) : d === 2 ? 100 : 1000;
      const low = d === 3 ? 100 : d === 2 ? 10 : 2;
      let n = ri(low, max - 1);
      // Crossing a ten (39 -> 40) or a hundred (399 -> 400) is the tricky part.
      if (d >= 2 && chance(0.35)) n = d === 2 ? ri(1, 9) * 10 + pick([0, 9]) : ri(1, 9) * 100 + pick([0, 99, 9, 10]);
      n = Math.min(Math.max(n, low), max - 1);
      const t = pick(['after', 'before', 'between'] as const);
      if (t === 'after')
        return num(
          `after:${n}`,
          L(`What number comes after ${f(n)}?`, `Quel nombre vient après ${f(n)}?`),
          n + 1,
          L(`After ${f(n)} comes ${f(n + 1)}. Just add one!`, `Après ${f(n)}, il y a ${f(n + 1)}. On ajoute un!`),
          L('Say the number out loud, then say the very next number when you count up by one.', 'Dis le nombre à voix haute, puis dis le nombre qui suit quand tu comptes un par un.'),
        );
      if (t === 'before')
        return num(
          `before:${n}`,
          L(`What number comes just before ${f(n)}?`, `Quel nombre vient juste avant ${f(n)}?`),
          n - 1,
          L(`${f(n - 1)} comes just before ${f(n)}. It is one less.`, `${f(n - 1)} vient juste avant ${f(n)}. C'est un de moins.`),
          L('Count backward by one from the number. The next number you say comes before it.', 'Compte à rebours un par un à partir du nombre. Le prochain nombre que tu dis vient avant.'),
        );
      return num(
        `between:${n}`,
        L(`What number is between ${f(n - 1)} and ${f(n + 1)}?`, `Quel nombre est entre ${f(n - 1)} et ${f(n + 1)}?`),
        n,
        L(`${f(n - 1)}, ${f(n)}, ${f(n + 1)}: ${f(n)} is in the middle.`, `${f(n - 1)}, ${f(n)}, ${f(n + 1)} : ${f(n)} est au milieu.`),
        L('Start at the first number and count up by one. The number you say before the second number is in between.', 'Pars du premier nombre et compte un par un. Le nombre que tu dis avant le deuxième est au milieu.'),
      );
    },
  },

  'e-add': {
    levels: [1, 2, 3],
    gen: (d) => {
      let a: number;
      let b: number;
      if (d === 1) {
        if (chance(0.55)) {
          a = ri(1, 8);
          b = ri(1, 10 - a);
        } else {
          a = ri(2, 9);
          b = ri(11 - a, 9);
        }
      } else if (d === 2) {
        a = ri(10, 89);
        b = chance(0.4) || 100 - a < 10 ? ri(2, Math.min(9, 100 - a)) : ri(10, 100 - a);
      } else {
        a = ri(100, 899);
        b = chance(0.3) ? ri(10, 99) : ri(100, 1000 - a);
        if (a + b > 1000) b = 1000 - a;
      }
      if (chance(0.5)) [a, b] = [b, a];
      const s = a + b;
      const big = Math.max(a, b);
      const small = Math.min(a, b);
      let explanation: string;
      let teach: string;
      if (d === 1) {
        explanation = L(`${a} + ${b} = ${s}. Start at ${big} and count up ${small} more.`, `${a} + ${b} = ${s}. Pars de ${big} et compte ${small} de plus.`);
        teach = L('Start at the bigger number. Then count up the smaller number on your fingers.', 'Pars du plus grand nombre. Ensuite, compte le plus petit nombre sur tes doigts.');
      } else if (d === 2) {
        const regroup = (a % 10) + (b % 10) >= 10;
        explanation = regroup
          ? L(`Ones: ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}, so trade 10 ones for 1 ten. ${a} + ${b} = ${s}.`, `Unités : ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}, on échange 10 unités pour 1 dizaine. ${a} + ${b} = ${s}.`)
          : L(`Add the ones, then the tens: ${a} + ${b} = ${s}.`, `On additionne les unités, puis les dizaines : ${a} + ${b} = ${s}.`);
        teach = L('Add the ones first, then the tens. If the ones make ten or more, trade ten ones for one ten.', "Additionne d'abord les unités, puis les dizaines. Si les unités font dix ou plus, échange dix unités pour une dizaine.");
      } else {
        explanation = L(`${f(a)} + ${f(b)} = ${f(s)}. Add ones, then tens, then hundreds.`, `${f(a)} + ${f(b)} = ${f(s)}. On additionne les unités, les dizaines, puis les centaines.`);
        teach = L('Line up hundreds, tens and ones. Add the ones, then the tens, then the hundreds. Carry when a place makes ten or more.', 'Aligne les centaines, les dizaines et les unités. Additionne les unités, puis les dizaines, puis les centaines. Fais une retenue si ça fait dix ou plus.');
      }
      return num(`${a}+${b}`, `${f(a)} + ${f(b)} = ?`, s, explanation, teach);
    },
  },

  'e-sub': {
    levels: [1, 2, 3],
    gen: (d) => {
      let a: number;
      let b: number;
      if (d === 1) {
        if (chance(0.55)) {
          a = ri(3, 10);
          b = ri(1, a - 1);
        } else {
          a = ri(11, 18);
          b = ri(a - 9, 9);
        }
      } else if (d === 2) {
        a = ri(20, 100);
        b = chance(0.4) ? ri(2, 9) : ri(10, a - 1);
      } else {
        a = ri(200, 1000);
        b = chance(0.3) ? ri(10, 99) : ri(100, a - 1);
      }
      const r = a - b;
      let explanation: string;
      let teach: string;
      if (d === 1) {
        explanation = L(`${a} ${MINUS} ${b} = ${r}. Start at ${a} and count back ${b}.`, `${a} ${MINUS} ${b} = ${r}. Pars de ${a} et recule de ${b}.`);
        teach = L('Start at the big number and count back. Or ask: what do I add to the small number to get the big one?', 'Pars du grand nombre et recule. Ou demande-toi : combien faut-il ajouter au petit nombre pour arriver au grand?');
      } else if (d === 2) {
        const trade = a % 10 < b % 10;
        explanation = trade
          ? L(`Not enough ones, so trade 1 ten for 10 ones. ${a} ${MINUS} ${b} = ${r}.`, `Pas assez d'unités : on échange 1 dizaine pour 10 unités. ${a} ${MINUS} ${b} = ${r}.`)
          : L(`Take away the ones, then the tens: ${a} ${MINUS} ${b} = ${r}.`, `On enlève les unités, puis les dizaines : ${a} ${MINUS} ${b} = ${r}.`);
        teach = L('Take away the ones first, then the tens. If there are not enough ones, trade one ten for ten ones.', "Enlève d'abord les unités, puis les dizaines. S'il n'y a pas assez d'unités, échange une dizaine pour dix unités.");
      } else {
        explanation = L(`${f(a)} ${MINUS} ${f(b)} = ${f(r)}. Check: ${f(r)} + ${f(b)} = ${f(a)}.`, `${f(a)} ${MINUS} ${f(b)} = ${f(r)}. Vérifie : ${f(r)} + ${f(b)} = ${f(a)}.`);
        teach = L('Line up the places. Subtract ones, then tens, then hundreds. If a top digit is too small, borrow from the next place.', "Aligne les positions. Soustrais les unités, les dizaines, puis les centaines. Si le chiffre du haut est trop petit, emprunte à la position d'à côté.");
      }
      return num(`${a}-${b}`, `${f(a)} ${MINUS} ${f(b)} = ?`, r, explanation, teach);
    },
  },

  'e-missing': {
    levels: [1, 2, 3],
    gen: (d) => {
      let T: number;
      let p: number;
      if (d === 1) {
        if (chance(0.6)) {
          T = ri(4, 10);
          p = ri(1, T - 1);
        } else {
          T = ri(11, 18);
          p = ri(T - 9, 9);
        }
      } else if (d === 2) {
        T = ri(20, 100);
        p = ri(chance(0.4) ? 2 : 10, T - 2);
      } else {
        T = ri(200, 1000);
        p = ri(chance(0.3) ? 10 : 100, T - 10);
      }
      const q = T - p;
      const form = ri(0, 3);
      const NOTE_ADD = L('Start at the number you know and count up to the total. How many did you count?', 'Pars du nombre que tu connais et compte jusqu’au total. Combien as-tu compté?');
      if (form === 0)
        return num(`${p}+?=${T}`, `${f(p)} + ? = ${f(T)}`, q, L(`${f(p)} + ${f(q)} = ${f(T)}, so the missing number is ${f(q)}.`, `${f(p)} + ${f(q)} = ${f(T)}, donc le nombre manquant est ${f(q)}.`), NOTE_ADD);
      if (form === 1)
        return num(`?+${p}=${T}`, `? + ${f(p)} = ${f(T)}`, q, L(`${f(q)} + ${f(p)} = ${f(T)}, so the missing number is ${f(q)}.`, `${f(q)} + ${f(p)} = ${f(T)}, donc le nombre manquant est ${f(q)}.`), NOTE_ADD);
      if (form === 2)
        return num(
          `?-${p}=${q}`,
          `? ${MINUS} ${f(p)} = ${f(q)}`,
          T,
          L(`${f(q)} + ${f(p)} = ${f(T)}, so ${f(T)} ${MINUS} ${f(p)} = ${f(q)}.`, `${f(q)} + ${f(p)} = ${f(T)}, donc ${f(T)} ${MINUS} ${f(p)} = ${f(q)}.`),
          L('Some were taken away and this is what is left. Put them back: add the two numbers you see.', "On en a enlevé et voici ce qui reste. Remets-les : additionne les deux nombres que tu vois."),
        );
      return num(
        `${T}-?=${q}`,
        `${f(T)} ${MINUS} ? = ${f(q)}`,
        p,
        L(`${f(T)} ${MINUS} ${f(p)} = ${f(q)}, so the missing number is ${f(p)}.`, `${f(T)} ${MINUS} ${f(p)} = ${f(q)}, donc le nombre manquant est ${f(p)}.`),
        L('How many must you take away from the first number to land on the last one? Count up from the last number to the first.', 'Combien faut-il enlever au premier nombre pour arriver au dernier? Compte du dernier nombre jusqu’au premier.'),
      );
    },
  },

  'e-compare': {
    levels: [1, 2, 3],
    gen: (d) => {
      const max = d === 1 ? (chance(0.6) ? 20 : 50) : d === 2 ? 100 : 999;
      const low = d === 3 ? 100 : 1;
      const make = (): [number, number] => {
        const a = ri(low, max);
        // Tricky pairs with swapped digits (34 / 43, 352 / 325).
        if (d >= 2 && chance(0.4)) {
          const s = String(a);
          const sw = d === 2 ? s.split('').reverse().join('') : s[0] + s[2] + s[1];
          const b = Number(sw);
          if (b !== a && b >= low && b <= max && !sw.startsWith('0')) return [a, b];
        }
        let b = ri(low, max);
        while (b === a) b = ri(low, max);
        return [a, b];
      };
      const TEACH_PLACE =
        d === 1
          ? L('Count up from the smaller number. The number you say later when you count is bigger.', 'Quand tu comptes, le nombre que tu dis plus tard est le plus grand. Pense à une droite numérique.')
          : d === 2
            ? L('Look at the tens first. More tens means bigger. If the tens are the same, look at the ones.', "Regarde d'abord les dizaines. Plus de dizaines, c'est plus grand. Si elles sont pareilles, regarde les unités.")
            : L('Look at the hundreds first, then the tens, then the ones. The first place that is different tells you.', "Regarde d'abord les centaines, puis les dizaines, puis les unités. La première position différente te donne la réponse.");
      const t = ri(0, 2);
      if (t === 2) {
        let [a, b] = make();
        if (chance(0.12)) b = a;
        const sym = a > b ? '>' : a < b ? '<' : '=';
        const explanation =
          sym === '='
            ? L(`${f(a)} = ${f(b)}: they are the same number.`, `${f(a)} = ${f(b)} : c'est le même nombre.`)
            : sym === '<'
              ? L(`${f(a)} < ${f(b)} because ${f(a)} is smaller than ${f(b)}.`, `${f(a)} < ${f(b)}, car ${f(a)} est plus petit que ${f(b)}.`)
              : L(`${f(a)} > ${f(b)} because ${f(a)} is bigger than ${f(b)}.`, `${f(a)} > ${f(b)}, car ${f(a)} est plus grand que ${f(b)}.`);
        return choice(
          `sym:${a},${b}`,
          L(`Pick the right sign: ${f(a)} ? ${f(b)}`, `Choisis le bon signe : ${f(a)} ? ${f(b)}`),
          sym,
          ['<', '>', '='],
          explanation,
          L('The open mouth of the sign always faces the bigger number. If both numbers are the same, use the sign with two lines.', 'La bouche ouverte du signe est toujours tournée vers le plus grand nombre. Si les nombres sont pareils, prends le signe à deux traits.'),
        );
      }
      const nums = make() as number[];
      if (d >= 2 && chance(0.4)) {
        let c = ri(low, max);
        while (nums.includes(c)) c = ri(low, max);
        nums.push(c);
      }
      const big = t === 0;
      const ans = big ? Math.max(...nums) : Math.min(...nums);
      const others = nums.filter((n) => n !== ans);
      const key = `${big ? 'big' : 'small'}:${nums.join(',')}`;
      const word = big ? L('bigger', 'plus grand') : L('smaller', 'plus petit');
      const explanation =
        nums.length === 2
          ? L(`${f(ans)} is ${word} than ${f(others[0])}.`, `${f(ans)} est ${word} que ${f(others[0])}.`)
          : L(`${f(ans)} is the ${big ? 'biggest' : 'smallest'} of the three numbers.`, `${f(ans)} est le ${word} des trois nombres.`);
      return choice(
        key,
        big ? L('Which number is the biggest?', 'Quel nombre est le plus grand?') : L('Which number is the smallest?', 'Quel nombre est le plus petit?'),
        String(ans),
        others.map(String),
        explanation,
        TEACH_PLACE,
      );
    },
  },

  'e-place': {
    levels: [1, 2, 3],
    gen: (d) => {
      if (d <= 2) {
        const n = d === 1 ? ri(11, 50) : ri(10, 99);
        const T = Math.floor(n / 10);
        const O = n % 10;
        const forms = d === 1 ? [0, 1, 2] : [0, 1, 2, 3, 4];
        const PART = L('The left digit tells the tens. The right digit tells the ones. Think of bundles of ten sticks and loose sticks.', 'Le chiffre de gauche donne les dizaines. Celui de droite donne les unités. Pense à des paquets de dix bâtonnets et à des bâtonnets seuls.');
        const BUILD = L('Each ten is worth ten. Count the tens by tens, then count on the ones.', 'Chaque dizaine vaut dix. Compte les dizaines par bonds de dix, puis ajoute les unités.');
        const split = L(`${n} = ${T} ${tensW(T)} and ${O} ${onesW(O)}`, `${n} = ${T} ${tensW(T)} et ${O} ${onesW(O)}`);
        switch (pick(forms)) {
          case 0:
            return num(`p10:${n}`, L(`How many tens are in ${n}?`, `Combien de dizaines y a-t-il dans ${n}?`), T, L(`${split}. So there are ${T} ${tensW(T)}.`, `${split}. Il y a donc ${T} ${tensW(T)}.`), PART);
          case 1:
            return num(`p1:${n}`, L(`How many ones are in ${n}?`, `Combien d'unités y a-t-il dans ${n}?`), O, L(`${split}. So there are ${O} ${onesW(O)}.`, `${split}. Il y a donc ${O} ${onesW(O)}.`), PART);
          case 2:
            return num(`b:0,${T},${O}`, L(`${T} ${tensW(T)} and ${O} ${onesW(O)} = ?`, `${T} ${tensW(T)} et ${O} ${onesW(O)} = ?`), n, L(`${T} ${tensW(T)} = ${T * 10}. ${T * 10} + ${O} = ${n}.`, `${T} ${tensW(T)} = ${T * 10}. ${T * 10} + ${O} = ${n}.`), BUILD);
          case 3:
            return num(
              `r:0,${T},${O}`,
              L(`${O} ${onesW(O)} and ${T} ${tensW(T)} = ?`, `${O} ${onesW(O)} et ${T} ${tensW(T)} = ?`),
              n,
              L(`Tens go first! ${T} ${tensW(T)} = ${T * 10}. ${T * 10} + ${O} = ${n}.`, `Les dizaines d'abord! ${T} ${tensW(T)} = ${T * 10}. ${T * 10} + ${O} = ${n}.`),
              L('Careful, the order is mixed up! Write the tens digit first, then the ones digit.', "Attention, l'ordre est mélangé! Écris d'abord le chiffre des dizaines, puis celui des unités."),
            );
          default:
            return num(`e:0,${T},${O}`, `${T * 10} + ${O} = ?`, n, L(`${T * 10} + ${O} = ${n}: ${T} ${tensW(T)} and ${O} ${onesW(O)}.`, `${T * 10} + ${O} = ${n} : ${T} ${tensW(T)} et ${O} ${onesW(O)}.`), BUILD);
        }
      }
      const n = ri(100, 999);
      const H = Math.floor(n / 100);
      const T = Math.floor(n / 10) % 10;
      const O = n % 10;
      const split = L(`${n} = ${H} ${hundW(H)}, ${T} ${tensW(T)} and ${O} ${onesW(O)}`, `${n} = ${H} ${hundW(H)}, ${T} ${tensW(T)} et ${O} ${onesW(O)}`);
      const PLACE = L('In a 3-digit number, the first digit is the hundreds, the middle digit is the tens and the last digit is the ones.', 'Dans un nombre à 3 chiffres, le premier chiffre est celui des centaines, celui du milieu les dizaines et le dernier les unités.');
      const BUILD3 = L('A hundred is ten tens. Write the hundreds digit, then the tens digit, then the ones digit. Use zero for an empty place.', 'Une centaine, c’est dix dizaines. Écris le chiffre des centaines, puis des dizaines, puis des unités. Mets zéro pour une position vide.');
      switch (ri(0, 3)) {
        case 0: {
          const pl = pick([1, 10, 100]);
          const dig = Math.floor(n / pl) % 10;
          const nameEn = pl === 100 ? 'hundreds' : pl === 10 ? 'tens' : 'ones';
          const nameFr = pl === 100 ? 'centaines' : pl === 10 ? 'dizaines' : 'unités';
          return num(
            `p${pl}:${n}`,
            L(`What digit is in the ${nameEn} place in ${n}?`, `Quel est le chiffre des ${nameFr} dans ${n}?`),
            dig,
            L(`${split}. The ${nameEn} digit is ${dig}.`, `${split}. Le chiffre des ${nameFr} est ${dig}.`),
            PLACE,
          );
        }
        case 1: {
          const t = chance(0.25) ? 0 : T;
          const v = H * 100 + t * 10 + O;
          const promptEn = t === 0 ? `${H} ${hundW(H)} and ${O} ${onesW(O)} = ?` : `${H} ${hundW(H)}, ${t} ${tensW(t)} and ${O} ${onesW(O)} = ?`;
          const promptFr = t === 0 ? `${H} ${hundW(H)} et ${O} ${onesW(O)} = ?` : `${H} ${hundW(H)}, ${t} ${tensW(t)} et ${O} ${onesW(O)} = ?`;
          return num(`b:${H},${t},${O}`, L(promptEn, promptFr), v, L(`${H * 100} + ${t * 10} + ${O} = ${v}.`, `${H * 100} + ${t * 10} + ${O} = ${v}.`), BUILD3);
        }
        case 2:
          return num(
            `r:${H},${T},${O}`,
            L(`${O} ${onesW(O)}, ${H} ${hundW(H)} and ${T} ${tensW(T)} = ?`, `${O} ${onesW(O)}, ${H} ${hundW(H)} et ${T} ${tensW(T)} = ?`),
            n,
            L(`Hundreds first: ${H * 100} + ${T * 10} + ${O} = ${n}.`, `Les centaines d'abord : ${H * 100} + ${T * 10} + ${O} = ${n}.`),
            L('Careful, the order is mixed up! Find the hundreds first, then the tens, then the ones.', "Attention, l'ordre est mélangé! Trouve d'abord les centaines, puis les dizaines, puis les unités."),
          );
        default: {
          const parts = [H * 100, T * 10, O].filter((x) => x > 0);
          return num(`e:${H},${T},${O}`, `${parts.join(' + ')} = ?`, n, L(`${parts.join(' + ')} = ${n}. ${split}.`, `${parts.join(' + ')} = ${n}. ${split}.`), BUILD3);
        }
      }
    },
  },

  'e-skip': {
    levels: [1, 2, 3],
    gen: (d) => {
      let step: number;
      let start: number;
      let up = true;
      if (d === 1) {
        step = pick([2, 5, 10]);
        start = step === 2 ? 2 * ri(0, 5) : step === 5 ? 5 * ri(0, 5) : 10 * ri(0, 5);
      } else if (d === 2) {
        step = pick([2, 5, 10]);
        up = chance(0.75);
        start = step === 2 ? ri(1, 80) : step === 5 ? 5 * ri(1, 15) : ri(1, 50);
        if (!up) start += 4 * step;
      } else {
        step = pick([3, 4, 25, 100, 3, 4, 25]);
        up = chance(0.7);
        start = step === 3 ? 3 * ri(0, 10) : step === 4 ? 4 * ri(0, 10) : step === 25 ? 25 * ri(0, 12) : 10 * ri(1, 50);
        if (!up) start += 4 * step;
      }
      const sign = up ? 1 : -1;
      const seq = [0, 1, 2, 3].map((i) => start + sign * i * step);
      const next = start + sign * 4 * step;
      const last = seq[3];
      const prompt = up
        ? L(`Count by ${step}s. What comes next?\n${seq.map(f).join(', ')}, ?`, `Compte de ${step} en ${step}. Quel nombre vient ensuite?\n${seq.map(f).join(', ')}, ?`)
        : L(`Count back by ${step}s. What comes next?\n${seq.map(f).join(', ')}, ?`, `Compte à rebours de ${step} en ${step}. Quel nombre vient ensuite?\n${seq.map(f).join(', ')}, ?`);
      const explanation = up
        ? L(`Add ${step} each time: ${f(last)} + ${step} = ${f(next)}.`, `On ajoute ${step} chaque fois : ${f(last)} + ${step} = ${f(next)}.`)
        : L(`Take away ${step} each time: ${f(last)} ${MINUS} ${step} = ${f(next)}.`, `On enlève ${step} chaque fois : ${f(last)} ${MINUS} ${step} = ${f(next)}.`);
      const teach = up
        ? L(`Each number is ${step} more than the one before. Do one more jump of ${step} from the last number.`, `Chaque nombre a ${step} de plus que celui d'avant. Fais encore un bond de ${step} à partir du dernier nombre.`)
        : L(`Each number is ${step} less than the one before. Do one more jump back of ${step} from the last number.`, `Chaque nombre a ${step} de moins que celui d'avant. Fais encore un bond de ${step} vers l'arrière.`);
      const safe = L('Look at how much the numbers change each time. Do that same jump one more time.', 'Regarde de combien les nombres changent chaque fois. Fais ce même bond encore une fois.');
      return num(`${step}:${start}:${up ? 'u' : 'd'}`, prompt, next, explanation, teach, safe);
    },
  },

  'e-doubles': {
    levels: [1, 2],
    gen: (d) => {
      const t = ri(0, 2);
      if (t < 2) {
        const n = d === 1 ? ri(2, 10) : ri(6, 50);
        const sum = chance(0.5);
        return num(
          `${sum ? 'dd' : 'dbl'}:${n}`,
          sum ? `${n} + ${n} = ?` : L(`What is double ${n}?`, `Quel est le double de ${n}?`),
          2 * n,
          L(`Double ${n} is ${n} + ${n} = ${2 * n}.`, `Le double de ${n}, c'est ${n} + ${n} = ${2 * n}.`),
          d === 1
            ? L('Double means the same number two times. Show it on both hands, or add the number to itself.', 'Le double, c’est le même nombre deux fois. Montre-le sur tes deux mains, ou ajoute le nombre à lui-même.')
            : L('Double the tens, then double the ones, then put them together.', 'Double les dizaines, double les unités, puis mets-les ensemble.'),
        );
      }
      const h = d === 1 ? ri(1, 10) : ri(5, 50);
      const n = 2 * h;
      return num(
        `half:${n}`,
        L(`What is half of ${n}?`, `Quelle est la moitié de ${n}?`),
        h,
        L(`${h} + ${h} = ${n}, so half of ${n} is ${h}.`, `${h} + ${h} = ${n}, donc la moitié de ${n} est ${h}.`),
        L('Half means two equal groups. Which number, added to itself, makes this number?', 'La moitié, c’est deux groupes égaux. Quel nombre, ajouté à lui-même, donne ce nombre?'),
      );
    },
  },

  'e-even-odd': {
    levels: [2, 3],
    gen: (d) => {
      const max = d === 2 ? 100 : 999;
      const EVEN = L('Even', 'Pair');
      const ODD = L('Odd', 'Impair');
      if (chance(0.55)) {
        const n = ri(1, max);
        const even = n % 2 === 0;
        return choice(
          `eo:${n}`,
          L(`Is ${f(n)} even or odd?`, `Est-ce que ${f(n)} est pair ou impair?`),
          even ? EVEN : ODD,
          [even ? ODD : EVEN],
          even
            ? L(`${f(n)} ends in ${n % 10}, so it is even. It splits into two equal groups.`, `${f(n)} se termine par ${n % 10} : il est pair. On peut le partager en deux groupes égaux.`)
            : L(`${f(n)} ends in ${n % 10}, so it is odd. One is always left over.`, `${f(n)} se termine par ${n % 10} : il est impair. Il en reste toujours un.`),
          L('Look only at the last digit. Could you share that many cookies between two friends with none left over?', 'Regarde seulement le dernier chiffre. Peux-tu partager autant de biscuits entre deux amis sans qu’il en reste?'),
        );
      }
      const wantEven = chance(0.5);
      const pickParity = (even: boolean) => {
        const v = ri(1, Math.floor(max / 2)) * 2;
        return even ? v : v - 1;
      };
      const ans = pickParity(wantEven);
      const wrong = new Set<number>();
      while (wrong.size < 2) {
        const w = pickParity(!wantEven);
        if (w !== ans) wrong.add(w);
      }
      return choice(
        `${wantEven ? 'we' : 'wo'}:${ans},${[...wrong].join(',')}`,
        wantEven ? L('Which number is even?', 'Quel nombre est pair?') : L('Which number is odd?', 'Quel nombre est impair?'),
        String(ans),
        [...wrong].map(String),
        wantEven
          ? L(`${f(ans)} ends in ${ans % 10}, so it is even.`, `${f(ans)} se termine par ${ans % 10}, donc il est pair.`)
          : L(`${f(ans)} ends in ${ans % 10}, so it is odd.`, `${f(ans)} se termine par ${ans % 10}, donc il est impair.`),
        L('Look at the last digit of each number. Even numbers end in 0, 2, 4, 6 or 8. Odd numbers end in 1, 3, 5, 7 or 9.', 'Regarde le dernier chiffre. Les nombres pairs finissent par 0, 2, 4, 6 ou 8. Les impairs finissent par 1, 3, 5, 7 ou 9.'),
      );
    },
  },

  'e-money': {
    levels: [2, 3],
    gen: (d) => {
      const t = d === 2 ? ri(0, 2) : ri(0, 4);
      if (d === 2 && t < 2) {
        // Count a handful of coins (at most 100 cents).
        let q = 0;
        let dm = 0;
        let n = 0;
        for (let tries = 0; tries < 50; tries++) {
          q = ri(0, 3);
          dm = ri(0, 5);
          n = ri(0, 4);
          const kinds = [q, dm, n].filter((x) => x > 0).length;
          if (kinds >= 2 && 25 * q + 10 * dm + 5 * n <= 100) break;
          q = 1;
          dm = 2;
          n = 1;
        }
        const total = 25 * q + 10 * dm + 5 * n;
        const parts: string[] = [];
        if (q) parts.push(L(`${q} ${plural(q, 'quarter', 'quarters')} (25¢)`, `${q} ${plural(q, 'pièce', 'pièces')} de 25 ¢`));
        if (dm) parts.push(L(`${dm} ${plural(dm, 'dime', 'dimes')} (10¢)`, `${dm} ${plural(dm, 'pièce', 'pièces')} de 10 ¢`));
        if (n) parts.push(L(`${n} ${plural(n, 'nickel', 'nickels')} (5¢)`, `${n} ${plural(n, 'pièce', 'pièces')} de 5 ¢`));
        const list = parts.length === 3 ? `${parts[0]}, ${parts[1]} ${L('and', 'et')} ${parts[2]}` : parts.join(` ${L('and', 'et')} `);
        const adds = [...Array(q).fill(25), ...Array(dm).fill(10), ...Array(n).fill(5)].join(' + ');
        return num(
          `c:${q},${dm},${n}`,
          L(`You have ${list}. How many cents do you have?`, `Tu as ${list}. Combien de cents as-tu en tout?`),
          total,
          L(`${adds} = ${total}. You have ${total}¢.`, `${adds} = ${total}. Tu as ${total} ¢.`),
          L('Start with the biggest coins and count on: by 25s, then by 10s, then by 5s.', 'Commence par les plus grosses pièces et compte par bonds : de 25, puis de 10, puis de 5.'),
          L('Start with the biggest coins and count on, one coin at a time.', 'Commence par les plus grosses pièces et compte une pièce à la fois.'),
        );
      }
      if (d === 2) {
        const [from, to] = pick([
          [25, 100],
          [10, 100],
          [5, 25],
          [5, 50],
          [10, 50],
          [25, 50],
          [100, 200],
        ] as const);
        const k = to / from;
        return num(
          `mk:${from},${to}`,
          L(`How many ${money(from)} coins make ${money(to)}?`, `Combien de pièces de ${money(from)} faut-il pour faire ${money(to)}?`),
          k,
          L(`${k} × ${money(from)} = ${money(to)}.`, `${k} × ${money(from)} = ${money(to)}.`),
          L(`Count by ${from < 100 ? from : 1}s until you reach ${to < 100 ? to : to / 100}${to >= 100 && from < 100 ? ' (one dollar is 100 cents)' : ''}. Count how many jumps you made.`, `Compte par bonds de ${from < 100 ? from : 1} jusqu'à ${to < 100 ? to : to / 100}${to >= 100 && from < 100 ? ' (un dollar vaut 100 cents)' : ''}. Compte tes bonds.`),
          L('Count by the coin value until you reach the total. Count how many jumps you made.', 'Compte par bonds de la valeur de la pièce jusqu’au total. Compte tes bonds.'),
        );
      }
      if (t === 0) {
        const p = 5 * ri(2, 19);
        const item = pick([
          ['a pack of gum', 'Une gomme'],
          ['a sticker', 'Un autocollant'],
          ['a pencil', 'Un crayon'],
          ['an apple', 'Une pomme'],
        ]);
        return num(
          `ch1:${p}`,
          L(`${item[0][0].toUpperCase()}${item[0].slice(1)} costs ${cents(p)}. You pay with $1. How many cents of change do you get?`, `${item[1]} coûte ${cents(p)}. Tu paies avec 1 $. Combien de cents te remet-on?`),
          100 - p,
          L(`$1 = 100¢. 100 ${MINUS} ${p} = ${100 - p}. You get ${100 - p}¢ back.`, `1 $ = 100 ¢. 100 ${MINUS} ${p} = ${100 - p}. On te remet ${100 - p} ¢.`),
          L('One dollar is 100 cents. Count up from the price to 100, or subtract the price from 100.', 'Un dollar vaut 100 cents. Compte à partir du prix jusqu’à 100, ou enlève le prix de 100.'),
        );
      }
      if (t === 1) {
        const p = ri(1, 4);
        const item = pick([
          ['A book', 'Un livre'],
          ['A toy', 'Un jouet'],
          ['A ball', 'Un ballon'],
        ]);
        return num(
          `ch5:${p}`,
          L(`${item[0]} costs $${p}. You pay with a $5 bill. How many dollars of change do you get?`, `${item[1]} coûte ${p} $. Tu paies avec un billet de 5 $. Combien de dollars te remet-on?`),
          5 - p,
          L(`5 ${MINUS} ${p} = ${5 - p}. You get $${5 - p} back.`, `5 ${MINUS} ${p} = ${5 - p}. On te remet ${5 - p} $.`),
          L('Change is what you paid minus the price. Count up from the price to five.', 'La monnaie, c’est ce que tu donnes moins le prix. Compte à partir du prix jusqu’à cinq.'),
        );
      }
      if (t === 2) {
        const a = ri(2, 9);
        const b = ri(2, 9);
        return num(
          `add:${a},${b}`,
          L(`A muffin costs $${a} and a juice costs $${b}. How many dollars in all?`, `Un muffin coûte ${a} $ et un jus coûte ${b} $. Combien de dollars en tout?`),
          a + b,
          L(`${a} + ${b} = ${a + b}. It costs $${a + b} in all.`, `${a} + ${b} = ${a + b}. Ça coûte ${a + b} $ en tout.`),
          L('In all means put the prices together. Add the two prices.', 'En tout veut dire qu’on met les prix ensemble. Additionne les deux prix.'),
        );
      }
      const tw = ri(1, 5);
      const lo = ri(1, 4);
      return num(
        `dl:${tw},${lo}`,
        L(`You have ${tw} ${plural(tw, 'toonie', 'toonies')} ($2) and ${lo} ${plural(lo, 'loonie', 'loonies')} ($1). How many dollars do you have?`, `Tu as ${tw} ${plural(tw, 'pièce', 'pièces')} de 2 $ et ${lo} ${plural(lo, 'huard', 'huards')} (1 $). Combien de dollars as-tu?`),
        2 * tw + lo,
        L(`Toonies: ${tw} × 2 = ${2 * tw}. Plus ${lo} loonies: ${2 * tw} + ${lo} = $${2 * tw + lo}.`, `Pièces de 2 $ : ${tw} × 2 = ${2 * tw}. Plus ${lo} huards : ${2 * tw} + ${lo} = ${2 * tw + lo} $.`),
        L('Count the toonies by twos first. Then count on one for each loonie.', 'Compte d’abord les pièces de 2 $ par bonds de deux. Ensuite, ajoute un pour chaque huard.'),
      );
    },
  },

  'e-time': {
    levels: [2, 3],
    gen: (d) => {
      const forms = d === 2 ? ['later', 'later', 'mh', 'mhalf', 'dw', 'my'] : ['later', 'earlier', 'hd', 'mq', 'sum', 'sum', 'until', 'until'];
      const t = pick(forms);
      if (t === 'later') {
        const h = ri(1, 10);
        const k = ri(1, Math.min(5, 12 - h));
        return num(
          `later:${h},${k}`,
          L(`It is ${h} o'clock. What time will it be in ${k} ${plural(k, 'hour', 'hours')}?`, `Il est ${h} h. Quelle heure sera-t-il dans ${k} ${plural(k, 'heure', 'heures')}?`),
          h + k,
          L(`${h} + ${k} = ${h + k}. It will be ${h + k} o'clock.`, `${h} + ${k} = ${h + k}. Il sera ${h + k} h.`),
          L('Picture the clock. Move the short hand forward one number for each hour.', 'Imagine l’horloge. Avance la petite aiguille d’un nombre pour chaque heure.'),
        );
      }
      if (t === 'earlier') {
        const h = ri(3, 12);
        const k = ri(1, Math.min(5, h - 1));
        return num(
          `earlier:${h},${k}`,
          L(`It is ${h} o'clock. What time was it ${k} ${plural(k, 'hour', 'hours')} ago?`, `Il est ${h} h. Quelle heure était-il il y a ${k} ${plural(k, 'heure', 'heures')}?`),
          h - k,
          L(`${h} ${MINUS} ${k} = ${h - k}. It was ${h - k} o'clock.`, `${h} ${MINUS} ${k} = ${h - k}. Il était ${h - k} h.`),
          L('Picture the clock. Move the short hand backward one number for each hour.', 'Imagine l’horloge. Recule la petite aiguille d’un nombre pour chaque heure.'),
        );
      }
      if (t === 'sum') {
        const p = pick(PEOPLE);
        const a = 5 * ri(1, 9);
        const b = 5 * ri(1, 9);
        return num(
          `sum:${a},${b}`,
          L(`${nm(p)} reads for ${a} minutes, then ${b} more minutes. How many minutes in all?`, `${nm(p)} lit pendant ${a} minutes, puis encore ${b} minutes. Combien de minutes en tout?`),
          a + b,
          L(`${a} + ${b} = ${a + b} minutes.`, `${a} + ${b} = ${a + b} minutes.`),
          L('Put the two times together: add the minutes. Add the tens first, then the ones.', "Mets les deux temps ensemble : additionne les minutes. Les dizaines d'abord, puis les unités."),
        );
      }
      if (t === 'until') {
        const h = ri(1, 11);
        const m1 = 5 * ri(0, 8);
        const m2 = m1 + 5 * ri(2, 11 - m1 / 5);
        const e1 = L(`${h}:${pad2(m1)}`, `${h} h ${pad2(m1)}`);
        const e2 = L(`${h}:${pad2(m2)}`, `${h} h ${pad2(m2)}`);
        return num(
          `until:${h},${m1},${m2}`,
          L(`It is ${e1}. How many minutes until ${e2}?`, `Il est ${e1}. Combien de minutes reste-t-il avant ${e2}?`),
          m2 - m1,
          L(`${m2} ${MINUS} ${m1} = ${m2 - m1}. That is ${m2 - m1} minutes.`, `${m2} ${MINUS} ${m1} = ${m2 - m1}. Ça fait ${m2 - m1} minutes.`),
          L('The hour is the same, so look at the minutes. Count by 5s from the first time to the second, or subtract.', "L'heure est la même, alors regarde les minutes. Compte par bonds de 5 du premier temps au deuxième, ou soustrais."),
          L('The hour is the same, so look at the minutes. Count by fives from the first time to the second, or subtract.', "L'heure est la même, alors regarde les minutes. Compte par bonds de cinq du premier temps au deuxième, ou soustrais."),
        );
      }
      const FACTS: Record<string, [number, string, string, string, string, string, string]> = {
        mh: [60, 'How many minutes are in 1 hour?', 'Combien de minutes y a-t-il dans 1 heure?', 'There are 60 minutes in 1 hour.', 'Il y a 60 minutes dans 1 heure.', 'The long hand goes all the way around the clock in one hour. Count by fives at each number.', 'La grande aiguille fait tout le tour de l’horloge en une heure. Compte par bonds de cinq à chaque nombre.'],
        mhalf: [30, 'How many minutes are in a half hour?', 'Combien de minutes y a-t-il dans une demi-heure?', 'A half hour is half of 60 minutes: 30 minutes.', 'Une demi-heure, c’est la moitié de 60 minutes : 30 minutes.', 'A half hour is half of one hour. Think: what is half of the minutes in an hour?', 'Une demi-heure, c’est la moitié d’une heure. Quelle est la moitié des minutes dans une heure?'],
        mq: [15, 'How many minutes are in a quarter hour?', "Combien de minutes y a-t-il dans un quart d'heure?", 'A quarter hour is 60 ÷ 4 = 15 minutes.', "Un quart d'heure, c'est 60 ÷ 4 = 15 minutes.", 'A quarter is one of four equal parts. Split the minutes of one hour into four equal parts.', "Un quart, c'est une de quatre parts égales. Partage les minutes d'une heure en quatre parts égales."],
        dw: [7, 'How many days are in a week?', 'Combien de jours y a-t-il dans une semaine?', 'Monday to Sunday: there are 7 days in a week.', 'Du lundi au dimanche : il y a 7 jours dans une semaine.', 'Say the days: Monday, Tuesday, Wednesday... up to Sunday. Count them on your fingers.', 'Dis les jours : lundi, mardi, mercredi... jusqu’à dimanche. Compte-les sur tes doigts.'],
        my: [12, 'How many months are in a year?', 'Combien de mois y a-t-il dans une année?', 'January to December: there are 12 months in a year.', 'De janvier à décembre : il y a 12 mois dans une année.', 'Say the months from January to December and count them on your fingers.', 'Dis les mois de janvier à décembre et compte-les sur tes doigts.'],
        hd: [24, 'How many hours are in 1 day?', 'Combien d’heures y a-t-il dans 1 journée?', 'The short hand goes around twice: 12 + 12 = 24 hours.', 'La petite aiguille fait deux tours : 12 + 12 = 24 heures.', 'The short hand goes around the clock two times in one day. How many numbers are on the clock?', 'La petite aiguille fait deux fois le tour de l’horloge en une journée. Combien de nombres y a-t-il sur l’horloge?'],
      };
      const [ans, pe, pf, ee, ef, te, tf] = FACTS[t];
      return num(`f:${t}`, L(pe, pf), ans, L(ee, ef), L(te, tf));
    },
  },

  'e-shapes': {
    levels: [1, 2, 3],
    gen: (d) => {
      const SIDES = L('Go around the shape with your finger. Count each straight side one time.', 'Fais le tour de la figure avec ton doigt. Compte chaque côté droit une seule fois.');
      const CORNERS = L('A corner is where two sides meet. Go around the shape and count each corner one time.', 'Un sommet, c’est là où deux côtés se rencontrent. Fais le tour et compte chaque sommet une fois.');
      const t = d === 1 ? ri(0, 2) : d === 2 ? ri(0, 3) : ri(0, 4);
      if (d === 1 && t === 2 && chance(0.6)) {
        return num(
          'c:circle',
          L('How many corners does a circle have?', 'Combien de sommets a un cercle?'),
          0,
          L('A circle is round all the way around, so it has 0 corners.', 'Un cercle est tout rond : il a 0 sommet.'),
          L('A corner is a pointy spot where two straight sides meet. Is a circle pointy anywhere?', 'Un sommet est un coin pointu où deux côtés droits se rencontrent. Le cercle a-t-il un coin pointu?'),
        );
      }
      const pool = d === 1 ? SHAPES.slice(0, 3) : d === 2 ? SHAPES : SHAPES.slice(3);
      if (t === 3 && d === 2) {
        const ans = pick([SHAPES[0], SHAPES[3], SHAPES[4], SHAPES[5]]);
        const wrong = shuffle(SHAPES.filter((s) => s.sides !== ans.sides && s.id !== 'rect')).slice(0, 2);
        return choice(
          `which:${ans.id}`,
          L(`Which shape has ${ans.sides} sides?`, `Quelle figure a ${ans.sides} côtés?`),
          sName(ans),
          wrong.map(sName),
          L(`A ${ans.en} has ${ans.sides} sides.`, `Un ${ans.fr} a ${ans.sides} côtés.`),
          L('Picture each shape and count its sides. A stop sign, a honeycomb cell and a slice of pizza can help you remember!', 'Imagine chaque figure et compte ses côtés. Un panneau d’arrêt, une alvéole d’abeille et une pointe de pizza peuvent t’aider!'),
        );
      }
      if (d === 3 && t === 3) {
        const part = pick(['f', 'v', 'e'] as const);
        if (part === 'f')
          return num('cube:f', L('How many faces does a cube have?', 'Combien de faces a un cube?'), 6, L('A cube has 6 square faces: top, bottom and 4 around.', 'Un cube a 6 faces carrées : le dessus, le dessous et 4 autour.'), L('Think of a die. Count the flat sides: the top, the bottom, and all the way around.', 'Pense à un dé. Compte les côtés plats : le dessus, le dessous et tout autour.'));
        if (part === 'v')
          return num('cube:v', L('How many corners (vertices) does a cube have?', 'Combien de sommets a un cube?'), 8, L('A cube has 4 corners on top and 4 on the bottom: 8 corners.', 'Un cube a 4 sommets en haut et 4 en bas : 8 sommets.'), L('Count the corners on the top square. Then count the corners on the bottom square. Add them.', 'Compte les sommets du carré du dessus, puis ceux du carré du dessous. Additionne-les.'));
        return num('cube:e', L('How many edges does a cube have?', "Combien d'arêtes a un cube?"), 12, L('4 edges on top + 4 on the bottom + 4 going up and down = 12 edges.', '4 arêtes en haut + 4 en bas + 4 qui montent = 12 arêtes.'), L("Edges are the lines where two faces meet. Count the top square's edges, the bottom square's, then the ones going up and down.", 'Les arêtes sont les lignes où deux faces se touchent. Compte celles du dessus, celles du dessous, puis celles qui montent.'));
      }
      if (d === 3 && t === 4) {
        const s = pick(SHAPES.slice(0, 5));
        const k = ri(2, 4);
        const adds = Array(k).fill(s.sides).join(' + ');
        return num(
          `tot:${s.id},${k}`,
          L(`How many sides do ${k} ${s.enPl} have in all?`, `Combien de côtés ont ${k} ${s.frPl} en tout?`),
          k * s.sides,
          L(`A ${s.en} has ${s.sides} sides. ${adds} = ${k * s.sides}.`, `Un ${s.fr} a ${s.sides} côtés. ${adds} = ${k * s.sides}.`),
          L('Find how many sides one shape has. Then add that number once for each shape.', 'Trouve combien de côtés a une figure. Ensuite, ajoute ce nombre une fois pour chaque figure.'),
        );
      }
      const s = pick(pool);
      if (t === 0)
        return num(`s:${s.id}`, L(`How many sides does a ${s.en} have?`, `Combien de côtés a un ${s.fr}?`), s.sides, L(`A ${s.en} has ${s.sides} sides.`, `Un ${s.fr} a ${s.sides} côtés.`), SIDES);
      return num(
        `c:${s.id}`,
        L(`How many corners (vertices) does a ${s.en} have?`, `Combien de sommets a un ${s.fr}?`),
        s.sides,
        L(`A ${s.en} has ${s.sides} corners, the same as its number of sides.`, `Un ${s.fr} a ${s.sides} sommets, autant que de côtés.`),
        CORNERS,
      );
    },
  },

  'e-mult': {
    levels: [3],
    gen: () => {
      let a = pick([2, 3, 4, 5, 10, 2, 3, 4, 5, 1]);
      let b = ri(2, 10);
      if (chance(0.5)) [a, b] = [b, a];
      const p = a * b;
      if (chance(0.5))
        return num(
          `g:${a},${b}`,
          L(`${a} ${groupsW(a)} of ${b} = ?`, `${a} ${groupsW(a)} de ${b} = ?`),
          p,
          L(`${a} ${groupsW(a)} of ${b}: ${a} × ${b} = ${p}.`, `${a} ${groupsW(a)} de ${b} : ${a} × ${b} = ${p}.`),
          L(`Draw ${a} circles with ${b} dots in each. Then count all the dots, or skip-count by ${b}.`, `Dessine ${a} cercles avec ${b} points dans chacun. Compte tous les points, ou compte par bonds de ${b}.`),
          L('Draw the groups with dots in each one. Then count all the dots.', 'Dessine les groupes avec des points dans chacun. Puis compte tous les points.'),
        );
      return num(
        `x:${a},${b}`,
        `${a} × ${b} = ?`,
        p,
        L(`${a} × ${b} means ${a} ${groupsW(a)} of ${b}. That makes ${p}.`, `${a} × ${b}, c'est ${a} ${groupsW(a)} de ${b}. Ça fait ${p}.`),
        L(`Think of ${a} ${groupsW(a)} of ${b}. Skip-count by ${b}, one jump for each group.`, `Pense à ${a} ${groupsW(a)} de ${b}. Compte par bonds de ${b}, un bond par groupe.`),
        L('Think of equal groups. Skip-count by the group size, one jump for each group.', 'Pense à des groupes égaux. Compte par bonds de la taille du groupe, un bond par groupe.'),
      );
    },
  },

  'e-div': {
    levels: [3],
    gen: () => {
      const k = ri(2, 5);
      const each = ri(2, 10);
      const t = k * each;
      if (chance(0.3))
        return num(
          `d:${t},${k}`,
          `${t} ÷ ${k} = ?`,
          each,
          L(`${t} ÷ ${k} = ${each}, because ${k} × ${each} = ${t}.`, `${t} ÷ ${k} = ${each}, car ${k} × ${each} = ${t}.`),
          L(`Share ${t} into ${k} equal groups. Or think: ${k} times what makes ${t}?`, `Partage ${t} en ${k} groupes égaux. Ou pense : ${k} fois combien donne ${t}?`),
          L('Share the total into equal groups. Or think: what number times the groups makes the total?', 'Partage le total en groupes égaux. Ou pense : quel nombre fois les groupes donne le total?'),
        );
      const item = ri(0, 3);
      const [en, fr] = [
        [`${t} cookies are shared equally by ${k} friends. How many cookies does each friend get?`, `${t} biscuits sont partagés également entre ${k} amis. Combien de biscuits chaque ami reçoit-il?`],
        [`${t} marbles are shared equally by ${k} kids. How many marbles does each kid get?`, `${t} billes sont partagées également entre ${k} enfants. Combien de billes chaque enfant reçoit-il?`],
        [`${t} hockey cards are shared equally by ${k} friends. How many cards does each friend get?`, `${t} cartes de hockey sont partagées également entre ${k} amis. Combien de cartes chaque ami reçoit-il?`],
        [`${t} apples are put equally into ${k} baskets. How many apples go in each basket?`, `${t} pommes sont placées également dans ${k} paniers. Combien de pommes y a-t-il dans chaque panier?`],
      ][item];
      return num(
        `share:${t},${k}:${item}`,
        L(en, fr),
        each,
        L(`${t} ÷ ${k} = ${each}. Check: ${k} × ${each} = ${t}.`, `${t} ÷ ${k} = ${each}. Vérifie : ${k} × ${each} = ${t}.`),
        L('Hand them out one at a time, like dealing cards, until none are left. Then count how many one group has.', "Distribue-les un à la fois, comme des cartes, jusqu'à ce qu'il n'en reste plus. Puis compte combien il y en a dans un groupe."),
      );
    },
  },

  'e-fractions': {
    levels: [2, 3],
    gen: (d) => {
      const t = d === 2 ? ri(0, 1) : ri(0, 3);
      if (t === 0) {
        const n = pick([2, 3, 4]);
        const fi = ri(0, FOODS.length - 1);
        const food = FOODS[fi];
        return choice(
          `nm:${n}:${fi}`,
          L(`${food.en[0].toUpperCase()}${food.en.slice(1)} is cut into ${n} equal parts. What is one part called?`, `On coupe ${food.fr} en ${n} parts égales. Comment s'appelle une part?`),
          FRAC_NAME(n),
          [2, 3, 4].filter((x) => x !== n).map(FRAC_NAME),
          L(`${n} equal parts, so each part is ${FRAC_NAME(n)} (1/${n}).`, `${n} parts égales : chaque part est ${FRAC_NAME(n)} (1/${n}).`),
          L('Count how many equal parts there are. The name of one part comes from that number. More parts means smaller pieces.', 'Compte combien il y a de parts égales. Le nom d’une part vient de ce nombre. Plus il y a de parts, plus elles sont petites.'),
        );
      }
      if (t === 1 || t === 3) {
        const k = d === 2 ? 2 : t === 1 ? 2 : pick([3, 4]);
        const each = d === 2 ? ri(1, 10) : ri(2, 10);
        const n = k * each;
        const promptEn = k === 2 ? `What is half of ${n}?` : k === 3 ? `What is one third of ${n}?` : `What is one quarter of ${n}?`;
        const promptFr = k === 2 ? `Quelle est la moitié de ${n}?` : k === 3 ? `Combien fait le tiers de ${n}?` : `Combien fait le quart de ${n}?`;
        return num(
          `fr:${k}:${n}`,
          L(promptEn, promptFr),
          each,
          L(`Split ${n} into ${k} equal groups: ${n} ÷ ${k} = ${each}.`, `On partage ${n} en ${k} groupes égaux : ${n} ÷ ${k} = ${each}.`),
          L(`Split ${n} into ${k} equal groups, like sharing between ${k} friends. How many are in one group?`, `Partage ${n} en ${k} groupes égaux, comme entre ${k} amis. Combien y en a-t-il dans un groupe?`),
          L('Share the number equally into the parts, like sharing between friends. How many are in one group?', 'Partage le nombre également, comme entre des amis. Combien y en a-t-il dans un groupe?'),
        );
      }
      const [a, b] = shuffle([...pick([[2, 4], [2, 3], [3, 4], [2, 8]])]);
      const big = Math.min(a, b);
      return choice(
        `cmp:${a},${b}`,
        L(`Two pizzas are the same size. Which piece is bigger: 1/${a} or 1/${b}?`, `Deux pizzas ont la même taille. Quelle part est la plus grande : 1/${a} ou 1/${b}?`),
        `1/${big}`,
        [`1/${Math.max(a, b)}`],
        L(`1/${big} is bigger. Fewer parts means bigger pieces.`, `1/${big} est plus grande. Moins de parts, ça donne de plus grosses parts.`),
        L('The bottom number tells how many parts the pizza is cut into. More parts means each part is smaller.', 'Le nombre du bas dit en combien de parts on coupe la pizza. Plus il y a de parts, plus chaque part est petite.'),
      );
    },
  },

  'e-measure': {
    levels: [2, 3],
    gen: (d) => {
      if (getUnits() === 'imperial') return measureUS(d);
      const forms = d === 2 ? ['cmm', 'unit', 'unit', 'long', 'short', 'diff'] : ['unit', 'kmm', 'mcm', 'add', 'add', 'diff'];
      const t = pick(forms);
      if (t === 'cmm')
        return num(
          'cmm',
          L('How many centimeters are in 1 meter?', 'Combien de centimètres y a-t-il dans 1 mètre?'),
          100,
          L('1 meter = 100 centimeters. A meter stick has 100 little cm marks.', '1 mètre = 100 centimètres. Un mètre a 100 petites marques de cm.'),
          L('A meter stick is a long ruler. Count its centimeter marks by tens: ten, twenty, thirty... all the way to the end.', 'Un mètre, c’est une longue règle. Compte ses marques de centimètres par dizaines : dix, vingt, trente... jusqu’au bout.'),
        );
      if (t === 'kmm')
        return num(
          'kmm',
          L('How many meters are in 1 kilometer?', 'Combien de mètres y a-t-il dans 1 kilomètre?'),
          1000,
          L(`1 km = ${f(1000)} m. "Kilo" means a thousand.`, `1 km = ${f(1000)} m. « Kilo » veut dire mille.`),
          L('Think of a kilogram: a kilogram has as many grams as a kilometer has meters.', 'Pense au kilogramme : il y a autant de grammes dans un kilogramme que de mètres dans un kilomètre.'),
        );
      if (t === 'mcm') {
        const k = ri(2, 9);
        return num(
          `mcm:${k}`,
          L(`How many centimeters are in ${k} meters?`, `Combien de centimètres y a-t-il dans ${k} mètres?`),
          100 * k,
          L(`Each meter is 100 cm. ${k} × 100 = ${100 * k} cm.`, `Chaque mètre vaut 100 cm. ${k} × 100 = ${100 * k} cm.`),
          L('One meter is one hundred centimeters. Count by hundreds, once for each meter.', 'Un mètre vaut cent centimètres. Compte par centaines, une fois pour chaque mètre.'),
        );
      }
      if (t === 'unit') {
        const i = ri(0, UNIT_ITEMS.length - 1);
        const it = UNIT_ITEMS[i];
        const why = it.unit === 'cm' ? L('it is small', "c'est petit") : it.unit === 'm' ? L('it is big, like a room', "c'est grand, comme une pièce") : L('it is a very long way', "c'est très long");
        return choice(
          `unit:${i}`,
          L(`Which unit would you use to measure the length of ${it.en}?`, `Quelle unité utiliserais-tu pour mesurer la longueur ${it.fr}?`),
          it.unit,
          ['cm', 'm', 'km'],
          L(`Use ${it.unit}: ${why}.`, `On utilise le ${it.unit} : ${why}.`),
          L('Think about the size. Is it small enough to hold in your hand, as big as a room, or a long trip by car? Pick the unit that fits.', 'Pense à la taille. Est-ce assez petit pour tenir dans ta main, grand comme une pièce, ou un long voyage en auto?'),
        );
      }
      const a = ri(5, d === 2 ? 60 : 95);
      let b = ri(3, d === 2 ? 60 : 95);
      while (b === a) b = ri(3, 60);
      if (t === 'long' || t === 'short') {
        const long = t === 'long';
        const ans = long ? Math.max(a, b) : Math.min(a, b);
        const other = long ? Math.min(a, b) : Math.max(a, b);
        return choice(
          `${t}:${a},${b}`,
          long ? L(`Which is longer: ${a} cm or ${b} cm?`, `Lequel est le plus long : ${a} cm ou ${b} cm?`) : L(`Which is shorter: ${a} cm or ${b} cm?`, `Lequel est le plus court : ${a} cm ou ${b} cm?`),
          `${ans} cm`,
          [`${other} cm`],
          long
            ? L(`${ans} cm is longer, because ${ans} is more than ${other}.`, `${ans} cm est plus long, car ${ans} est plus grand que ${other}.`)
            : L(`${ans} cm is shorter, because ${ans} is less than ${other}.`, `${ans} cm est plus court, car ${ans} est plus petit que ${other}.`),
          L('Both are in centimeters, so just compare the numbers. A bigger number means a longer length.', 'Les deux sont en centimètres : compare seulement les nombres. Un plus grand nombre veut dire plus long.'),
        );
      }
      if (t === 'add') {
        const p = pick(PEOPLE);
        return num(
          `add:${a},${b}`,
          L(`${nm(p)} puts a ${a} cm stick end to end with a ${b} cm stick. How long is it in all, in cm?`, `${nm(p)} place un bâton de ${a} cm au bout d'un bâton de ${b} cm. Quelle est la longueur totale, en cm?`),
          a + b,
          L(`${a} + ${b} = ${a + b}. It is ${a + b} cm long.`, `${a} + ${b} = ${a + b}. Ça mesure ${a + b} cm.`),
          L('End to end means one after the other, so add the two lengths together.', 'Bout à bout veut dire l’un après l’autre : additionne les deux longueurs.'),
        );
      }
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      return num(
        `diff:${hi},${lo}`,
        L(`A ribbon is ${hi} cm long. A string is ${lo} cm long. How many cm longer is the ribbon?`, `Un ruban mesure ${hi} cm. Une ficelle mesure ${lo} cm. De combien de centimètres le ruban est-il plus long?`),
        hi - lo,
        L(`${hi} ${MINUS} ${lo} = ${hi - lo}. The ribbon is ${hi - lo} cm longer.`, `${hi} ${MINUS} ${lo} = ${hi - lo}. Le ruban est plus long de ${hi - lo} cm.`),
        L('To find how much longer, take the short length away from the long length. Or count up from the short one.', 'Pour savoir de combien c’est plus long, enlève la petite longueur de la grande. Ou compte à partir de la petite.'),
      );
    },
  },

  'e-word': {
    levels: [1, 2, 3],
    gen: (d) => {
      const pi = ri(0, PEOPLE.length - 1);
      const p = PEOPLE[pi];
      const type = d === 3 ? pick(['add', 'sub', 'mult', 'share', 'add', 'sub']) : pick(['add', 'sub']);
      if (type === 'mult') {
        const si = ri(0, MULT_STORIES.length - 1);
        const a = ri(2, 5);
        const b = ri(2, 10);
        return num(
          `mult:${si}:${pi}:${a},${b}`,
          MULT_STORIES[si](p, a, b),
          a * b,
          L(`${a} groups of ${b}: ${a} × ${b} = ${a * b}.`, `${a} groupes de ${b} : ${a} × ${b} = ${a * b}.`),
          L('Equal groups! Skip-count by the number in each group, one jump for every group. Or multiply.', 'Des groupes égaux! Compte par bonds du nombre dans chaque groupe, un bond par groupe. Ou multiplie.'),
        );
      }
      if (type === 'share') {
        const si = ri(0, SHARE_STORIES.length - 1);
        const k = ri(2, 5);
        const each = ri(2, 10);
        const t = k * each;
        return num(
          `share:${si}:${pi}:${t},${k}`,
          SHARE_STORIES[si](p, t, k),
          each,
          L(`${t} ÷ ${k} = ${each}, because ${k} × ${each} = ${t}.`, `${t} ÷ ${k} = ${each}, car ${k} × ${each} = ${t}.`),
          L('Sharing equally means every group gets the same. Hand them out one at a time, or think: what times the groups makes the total?', 'Partager également, c’est donner la même chose à chaque groupe. Distribue un à la fois, ou pense : quel nombre fois les groupes donne le total?'),
        );
      }
      let a: number;
      let b: number;
      if (d === 1) {
        if (type === 'add') {
          a = ri(2, 8);
          b = chance(0.65) ? ri(2, Math.max(2, 10 - a)) : ri(2, 9);
        } else {
          a = chance(0.65) ? ri(4, 10) : ri(11, 18);
          b = ri(2, Math.min(9, a - 2));
        }
      } else if (d === 2) {
        if (type === 'add') {
          a = ri(10, 80);
          b = ri(2, 100 - a);
        } else {
          a = ri(20, 99);
          b = ri(2, a - 2);
        }
      } else if (type === 'add') {
        a = ri(100, 700);
        b = ri(20, 1000 - a);
      } else {
        a = ri(200, 999);
        b = ri(20, a - 20);
      }
      const pool = d === 3 ? CTX.map((c, i) => [c, i] as const).filter(([c]) => c.big) : CTX.map((c, i) => [c, i] as const);
      const [ctx, ci] = pick(pool);
      if (type === 'add')
        return num(
          `add:${ci}:${pi}:${a},${b}`,
          ctx.add(p, a, b),
          a + b,
          L(`${f(a)} + ${f(b)} = ${f(a + b)}. There are ${f(a + b)} in all.`, `${f(a)} + ${f(b)} = ${f(a + b)}. Il y en a ${f(a + b)} en tout.`),
          L('More are coming, so the group gets bigger. Put the two numbers together: add them.', 'Il en arrive plus, donc le groupe grandit. Mets les deux nombres ensemble : additionne-les.'),
        );
      return num(
        `sub:${ci}:${pi}:${a},${b}`,
        ctx.sub(p, a, b),
        a - b,
        L(`${f(a)} ${MINUS} ${f(b)} = ${f(a - b)}. There are ${f(a - b)} left.`, `${f(a)} ${MINUS} ${f(b)} = ${f(a - b)}. Il en reste ${f(a - b)}.`),
        L('Some go away, so the group gets smaller. Start with how many there were and take away the ones that left.', 'Il en part, donc le groupe devient plus petit. Pars du nombre du début et enlève ceux qui sont partis.'),
      );
    },
  },
};

/** Topics with a generator for the given school year (1-3). */
export function earlyTopicsFor(d: Difficulty): string[] {
  return Object.keys(EARLY_GENERATORS).filter((k) => EARLY_GENERATORS[k].levels.includes(d));
}

export function makeEarlyQuestion(topic: string, d: Difficulty): Question {
  const g = EARLY_GENERATORS[topic];
  const level = g.levels.includes(d) ? d : g.levels.reduce((best, l) => (Math.abs(l - d) < Math.abs(best - d) ? l : best), g.levels[0]);
  const { key, ...q } = g.gen(level);
  return { ...q, id: `m:${topic}:${key}`, subject: 'math', topic, difficulty: level };
}
