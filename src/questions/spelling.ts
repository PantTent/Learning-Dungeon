// Spelling test words ("Spell the word you hear"). The word is read out loud
// and the child types it. Words that sound like another word (there / their,
// mer / mère) are left out, since there is no sentence to tell them apart.
import type { Grade } from './curriculum';

/** Massachusetts-style grade lists, grades 1-5. */
export const SPELL_WORDS_EN: Record<1 | 2 | 3 | 4 | 5, string[]> = {
  1: [
    'cat', 'dog', 'hat', 'red', 'big', 'run', 'fun', 'bed', 'sit', 'map', 'cup', 'top', 'box', 'fox', 'pig', 'hen', 'bug', 'mom',
    'dad', 'can', 'ten', 'yes', 'net', 'pan', 'jam', 'leg', 'hot', 'mud', 'wet', 'the', 'and', 'play', 'look', 'like', 'said',
    'come', 'nut', 'pen', 'web', 'went',
  ],
  2: [
    'frog', 'ship', 'chin', 'duck', 'fish', 'jump', 'hand', 'sing', 'cake', 'bike', 'home', 'rope', 'cute', 'train', 'boat',
    'snow', 'tree', 'green', 'team', 'light', 'stay', 'bird', 'girl', 'turn', 'farm', 'star', 'corn', 'book', 'school',
    'friend', 'because', 'little', 'clap', 'smile', 'nest', 'flower', 'always', 'many', 'every', 'once',
  ],
  3: [
    'happy', 'funny', 'puppy', 'jumped', 'running', 'stopped', 'kitten', 'rabbit', 'garden', 'window', 'bright', 'laugh',
    'caught', 'thought', 'enough', 'beautiful', 'different', 'important', 'again', 'before', 'began', 'family', 'morning',
    'people', 'pretty', 'until', 'answer', 'center', 'circle', 'color', 'father', 'mother', 'river', 'sister', 'winter',
    'summer', 'kitchen', 'question', 'animal', 'birthday',
  ],
  4: [
    'believe', 'calendar', 'chocolate', 'daughter', 'decided', 'discover', 'eighty', 'excited', 'favorite', 'finally',
    'government', 'grammar', 'guess', 'height', 'island', 'knowledge', 'library', 'minute', 'neighbor', 'ocean', 'perhaps',
    'probably', 'quarter', 'receive', 'restaurant', 'scissors', 'separate', 'special', 'surprise', 'though', 'tomorrow',
    'usually', 'vacation', 'weird', 'wonderful', 'wrinkle', 'yesterday', 'dictionary', 'interesting', 'February',
  ],
  5: [
    'accident', 'achieve', 'appreciate', 'argument', 'beginning', 'business', 'campaign', 'certain', 'committee', 'conscience',
    'curious', 'definitely', 'describe', 'disappear', 'embarrass', 'environment', 'especially', 'exaggerate', 'experience',
    'foreign', 'guarantee', 'immediately', 'independent', 'interrupt', 'jewelry', 'laboratory', 'lightning', 'mischievous',
    'necessary', 'occasion', 'opinion', 'parallel', 'privilege', 'recommend', 'rhythm', 'schedule', 'sincerely', 'temperature',
    'thorough', 'vegetable',
  ],
};

/** Quebec-style dictée words, 1re to 3e année. */
export const SPELL_WORDS_FR: Record<1 | 2 | 3, string[]> = {
  1: [
    'papa', 'maman', 'chat', 'chien', 'lit', 'sac', 'vélo', 'école', 'lune', 'robe', 'tomate', 'jupe', 'moto', 'ballon',
    'soleil', 'maison', 'porte', 'table', 'livre', 'pomme', 'rouge', 'bleu', 'jaune', 'petit', 'grand', 'bébé', 'lapin',
    'cheval', 'bonjour', 'merci', 'oui', 'avec', 'fille', 'garçon', 'souris', 'arbre', 'neige', 'fleur', 'poule', 'canard',
  ],
  2: [
    'famille', 'enfant', 'histoire', 'journée', 'matin', 'soir', 'semaine', 'hiver', 'printemps', 'automne', 'chaussure',
    'manteau', 'chapeau', 'crayon', 'cahier', 'gomme', 'ciseaux', 'musique', 'jardin', 'oiseau', 'poisson', 'mouton', 'cochon',
    'vache', 'animal', 'voiture', 'autobus', 'chocolat', 'gâteau', 'fromage', 'banane', 'carotte', 'fraise', 'orange',
    'bonhomme', 'toujours', 'beaucoup', 'maintenant', 'ensemble', 'content',
  ],
  3: [
    'anniversaire', 'bicyclette', 'cadeau', 'campagne', 'château', 'citrouille', 'dictionnaire', 'écureuil', 'élève',
    'enseignante', 'épicerie', 'forêt', 'glace', 'habitant', 'hôpital', 'journal', 'lumière', 'magasin', 'montagne', 'nuage',
    'ordinateur', 'papillon', 'parapluie', 'pharmacie', 'plage', 'quelquefois', 'récréation', 'rivière', 'sapin', 'silence',
    'sorcière', 'téléphone', 'tempête', 'tortue', 'trésor', 'vacances', 'village', 'voyage', 'pourquoi', 'hibou',
  ],
};

export function spellWords(lang: 'en' | 'fr', grade: Grade): string[] {
  if (lang === 'fr') return SPELL_WORDS_FR[Math.min(3, Math.max(1, grade)) as 1 | 2 | 3];
  return SPELL_WORDS_EN[grade];
}

/** Clean up a typed or pasted word list: one word per line or comma, no doubles. */
export function parseWordList(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\n,;\t]+/)) {
    const w = raw.trim().replace(/\s+/g, ' ').replace(/[’`]/g, "'").replace(/^[\d.)\-\s]+/, '');
    if (w && w.length <= 24 && /\p{L}/u.test(w) && !out.some((o) => o.toLowerCase() === w.toLowerCase())) out.push(w);
  }
  return out.slice(0, 60);
}

/** "cat" -> "c-a-t" (for the explanation after answering). */
export function spellOut(word: string): string {
  return [...word].join('-');
}
