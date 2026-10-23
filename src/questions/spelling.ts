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

/** Quebec / Nova Scotia (CSAP) style dictée words, 1re to 6e année. */
export const SPELL_WORDS_FR: Record<1 | 2 | 3 | 4 | 5 | 6, string[]> = {
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
  4: [
    'alphabet', 'araignée', 'bibliothèque', 'bouteille', 'champignon', 'chaussette', 'cuisine', 'dinosaure', 'enveloppe',
    'escalier', 'étoile', 'fenêtre', 'fourchette', 'grenouille', 'hélicoptère', 'horloge', 'insecte', 'jambon', 'kangourou',
    'légume', 'marteau', 'médecin', 'mouchoir', 'orteil', 'pantalon', 'pyjama', 'raquette', 'squelette', 'tambour',
    'tracteur', 'triangle', 'tulipe', 'violon', 'souvent', 'parfois', 'longtemps', 'bientôt', 'demain', 'hier', 'ensuite',
  ],
  5: [
    'aéroport', 'ambulance', 'appartement', 'aquarium', 'astronaute', 'aventure', 'boussole', 'calendrier', 'capitaine',
    'catastrophe', 'cinéma', 'continent', 'électricité', 'exercice', 'explorateur', 'frontière', 'géographie', 'gymnase',
    'hameçon', 'horizon', 'imagination', 'instrument', 'laboratoire', 'microscope', 'moustique', 'océan', 'orchestre',
    'paysage', 'pingouin', 'planète', 'population', 'poussière', 'rhinocéros', 'spectacle', 'thermomètre', 'tourbillon',
    'volcan', 'vraiment', 'malgré', 'pourtant',
  ],
  6: [
    'accueil', 'agriculture', 'architecte', 'atmosphère', 'biodiversité', 'chrysalide', 'circonférence', 'civilisation',
    'communauté', 'connaissance', 'conséquence', 'démocratie', 'développement', 'écosystème', 'enthousiasme', 'équilibre',
    'gouvernement', 'hémisphère', 'hypothèse', 'immédiatement', 'inondation', 'kilomètre', 'labyrinthe', 'métamorphose',
    'néanmoins', 'orthographe', 'parlement', 'patrimoine', 'phénomène', 'photographie', 'pyramide', 'rythme', 'silhouette',
    'symbole', 'technologie', 'territoire', 'tremblement', 'vocabulaire', 'archipel', 'glacier',
  ],
};

export function spellWords(lang: 'en' | 'fr', grade: Grade): string[] {
  // Numeric clamp so this keeps working whatever range Grade covers (1-6).
  const g = Math.round(Math.min(6, Math.max(1, Number(grade) || 1)));
  if (lang === 'fr') return SPELL_WORDS_FR[g as 1 | 2 | 3 | 4 | 5 | 6];
  // English lists stop at grade 5.
  return SPELL_WORDS_EN[Math.min(5, g) as 1 | 2 | 3 | 4 | 5];
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
