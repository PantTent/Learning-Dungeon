import type { BankItem, Difficulty } from './types';

/**
 * Banque de questions de français (lecture et langue) pour les élèves du
 * Québec, alignée sur le Programme de formation de l'école québécoise,
 * Français langue d'enseignement : 1er cycle (1re et 2e année) et 3e année.
 *
 * Difficulté = année scolaire : 1 = 1re année, 2 = 2e année, 3 = 3e année.
 */
export const READING_TOPICS_FR: Record<string, string> = {
  "fr-vocabulaire": "Vocabulaire",
  "fr-synonymes": "Synonymes",
  "fr-contraires": "Contraires",
  "fr-sons": "Sons et syllabes",
  "fr-orthographe": "Orthographe",
  "fr-grammaire": "Grammaire",
  "fr-homophones": "Homophones",
  "fr-lecture": "Compréhension de lecture",
};

/** Mini-leçons « J'ai besoin d'un prof! » : comment réfléchir, sans donner la réponse. */
export const READING_LESSONS_FR: Record<string, string> = {
  "fr-vocabulaire":
    "Lis la question lentement. Pense à un moment où tu as déjà entendu ce mot. Essaie chaque réponse dans ta tête et garde celle qui a le plus de sens.",
  "fr-synonymes":
    "Un synonyme, c'est un mot qui veut dire presque la même chose. Remplace le mot par chaque choix dans une petite phrase. Si le sens ne change pas, tu l'as trouvé!",
  "fr-contraires":
    "Un contraire, c'est un mot qui veut dire tout l'inverse, comme le haut et le bas. Imagine le mot, puis cherche le choix qui est complètement différent.",
  "fr-sons":
    "Dis le mot à voix haute, tout doucement. Tape dans tes mains pour chaque syllabe, ou écoute bien le tout premier ou le dernier son.",
  "fr-orthographe":
    "Regarde chaque mot lettre par lettre. Pense aux mots que tu as vus dans tes livres. Lequel ressemble à ce que tu as déjà lu?",
  "fr-grammaire":
    "Lis la phrase en entier avec chaque choix. Demande-toi si le mot va avec « un » ou « une », avec un seul ou avec plusieurs. Une seule phrase sonne juste.",
  "fr-homophones":
    "Les homophones se disent pareil, mais s'écrivent autrement. Essaie de remplacer le mot : par exemple, « a » peut devenir « avait », et « est » peut devenir « était ».",
  "fr-lecture":
    "Relis la petite histoire tranquillement. Cherche les mots de la question dans le texte. La réponse se cache souvent tout près!",
};

function q(
  topic: string,
  difficulty: Difficulty,
  prompt: string,
  answer: string,
  wrong: string[],
  explanation: string,
): BankItem {
  return { topic, difficulty, prompt, answer, wrong, explanation };
}

const ORTHO = "Quel mot est bien écrit?";
const PHRASE = "Quelle phrase est bien écrite?";

export const READING_BANK_FR: BankItem[] = [
  // ------------------------------------------------------------ sons : 1re année
  q("fr-sons", 1, "Quel mot commence par le son [ch]?", "chat", ["rat", "lune"], "On entend [ch] au début de « chat », comme dans « chien »."),
  q("fr-sons", 1, "Quel mot commence par le son [m]?", "maman", ["papa", "lune"], "« Maman » commence par [m]. Ferme bien la bouche : mmm!"),
  q("fr-sons", 1, "Quel mot commence par le son [p]?", "pomme", ["lune", "sac"], "« Pomme » commence par [p], comme « papa »."),
  q("fr-sons", 1, "Quel mot commence par le son [l]?", "lune", ["mur", "sac"], "« Lune » commence par [l], comme « lapin »."),
  q("fr-sons", 1, "Quel mot commence par le son [r]?", "robot", ["lapin", "vélo"], "« Robot » commence par [r], comme « rat »."),
  q("fr-sons", 1, "Quel mot commence par le son [s]?", "sac", ["chat", "vache"], "« Sac » commence par [s]. « Chat » commence par [ch]."),
  q("fr-sons", 1, "Quel mot commence par le son [b]?", "ballon", ["pain", "domino"], "« Ballon » commence par [b], comme « bébé »."),
  q("fr-sons", 1, "Quel mot commence par le son [v]?", "vélo", ["fée", "mur"], "« Vélo » commence par [v], comme « vache ». « Fée » commence par [f]."),
  q("fr-sons", 1, "Quel mot rime avec « chat »?", "rat", ["lune", "pomme"], "« Chat » et « rat » finissent par le même son [a]."),
  q("fr-sons", 1, "Quel mot rime avec « bateau »?", "gâteau", ["ballon", "lapin"], "« Bateau » et « gâteau » finissent tous les deux par [teau]."),
  q("fr-sons", 1, "Quel mot rime avec « lapin »?", "sapin", ["lune", "bateau"], "« Lapin » et « sapin » finissent tous les deux par [pin]."),
  q("fr-sons", 1, "Quel mot rime avec « mouton »?", "bouton", ["souris", "vélo"], "« Mouton » et « bouton » finissent tous les deux par [ton]."),
  q("fr-sons", 1, "Quel mot rime avec « lune »?", "plume", ["soleil", "chat"], "« Lune » et « plume » finissent tous les deux par le son [une]."),
  q("fr-sons", 1, "Combien de syllabes dans « chat »?", "1", ["2", "3"], "On dit « chat » d'un seul coup. Une seule tape dans les mains : 1 syllabe."),
  q("fr-sons", 1, "Combien de syllabes dans « lapin »?", "2", ["1", "3"], "On tape deux fois : la-pin. Ça fait 2 syllabes."),
  q("fr-sons", 1, "Combien de syllabes dans « papillon »?", "3", ["2", "4"], "On tape trois fois : pa-pil-lon. Ça fait 3 syllabes."),
  q("fr-sons", 1, "Combien de syllabes dans « vélo »?", "2", ["1", "3"], "On tape deux fois : vé-lo. Ça fait 2 syllabes."),
  q("fr-sons", 1, "Quel mot commence par la syllabe « ma »?", "maman", ["lapin", "robot"], "On entend ma-man. Le mot commence par « ma »."),
  q("fr-sons", 1, "Quel mot commence par la syllabe « la »?", "lapin", ["vélo", "mouton"], "On entend la-pin. Le mot commence par « la »."),
  q("fr-sons", 1, "Quel mot finit par le son [o]?", "vélo", ["lune", "sac"], "On entend vé-lo : le dernier son est [o]."),
  q("fr-sons", 1, "Quel mot finit par le son [i]?", "lit", ["sac", "bol"], "On dit [li] : le dernier son est [i]. Le « t » ne s'entend pas."),
  q("fr-sons", 1, "Quelle lettre ne s'entend pas dans « lit »?", "t", ["l", "i"], "On entend « l » et « i ». Le « t » à la fin est une lettre muette."),
  q("fr-sons", 1, "Quelle lettre ne s'entend pas dans « nid »?", "d", ["n", "i"], "On entend « n » et « i ». Le « d » à la fin est une lettre muette."),

  // ------------------------------------------------------------ sons : 2e année
  q("fr-sons", 2, "Combien de syllabes dans « chocolat »?", "3", ["2", "4"], "On tape trois fois : cho-co-lat. Ça fait 3 syllabes."),
  q("fr-sons", 2, "Combien de syllabes dans « kangourou »?", "3", ["2", "4"], "On tape trois fois : kan-gou-rou. Ça fait 3 syllabes."),
  q("fr-sons", 2, "Combien de syllabes dans « éléphant »?", "3", ["2", "4"], "On tape trois fois : é-lé-phant. Ça fait 3 syllabes."),
  q("fr-sons", 2, "Quel mot commence par le son [s], comme « sac »?", "cerise", ["chemise", "kiwi"], "Devant « e », la lettre « c » fait le son [s]. On dit [s]erise!"),
  q("fr-sons", 2, "Quel mot commence par le son [k], comme « kiwi »?", "carotte", ["cerise", "girafe"], "Devant « a », la lettre « c » fait le son [k] : ca-rotte."),
  q("fr-sons", 2, "Quel mot rime avec « souris »?", "tapis", ["bateau", "ballon"], "« Souris » et « tapis » finissent par le même son [i]. Le « s » final est muet."),
  q("fr-sons", 2, "Quel mot rime avec « soleil »?", "abeille", ["fenêtre", "lapin"], "« Soleil » et « abeille » finissent par le même son [eil]."),
  q("fr-sons", 2, "Quel son entends-tu dans « loup »?", "ou", ["u", "on"], "Dans « loup », les lettres « o » et « u » font ensemble le son [ou]."),
  q("fr-sons", 2, "Quel son entends-tu à la fin de « maison »?", "on", ["an", "ou"], "Mai-son : la dernière syllabe finit par le son [on]."),
  q("fr-sons", 2, "Quelle lettre est muette à la fin de « souris »?", "s", ["r", "i"], "On dit sou-ri. Le « s » à la fin s'écrit, mais ne s'entend pas."),
  q("fr-sons", 2, "Quelle lettre est muette à la fin de « sirop »?", "p", ["r", "o"], "On dit si-ro. Le « p » à la fin s'écrit, mais ne s'entend pas."),
  q("fr-sons", 2, "Quel mot contient le son [an]?", "enfant", ["ballon", "lapin"], "Dans « enfant », « en » et « an » font le même son [an]."),
  q("fr-sons", 2, "Quel mot contient le son [in], comme « lapin »?", "jardin", ["melon", "maman"], "Jar-din : on entend [in] à la fin, comme dans « lapin »."),
  q("fr-sons", 2, "Quel mot commence par le même son que « jupe »?", "girafe", ["chapeau", "gâteau"], "Devant « i », le « g » se dit comme le « j » de « jupe »."),

  // ------------------------------------------------------------ sons : 3e année
  q("fr-sons", 3, "Combien de syllabes dans « ordinateur »?", "4", ["3", "5"], "On tape quatre fois : or-di-na-teur. Ça fait 4 syllabes."),
  q("fr-sons", 3, "Combien de syllabes dans « télévision »?", "4", ["3", "5"], "On tape quatre fois : té-lé-vi-sion. Ça fait 4 syllabes."),
  q("fr-sons", 3, "Dans quel mot le « g » se dit-il comme dans « girafe »?", "genou", ["gâteau", "guitare"], "Devant « e » ou « i », le « g » fait un son doux, comme dans « genou »."),
  q("fr-sons", 3, "Quel mot rime avec « castor »?", "trésor", ["tortue", "carotte"], "« Castor » et « trésor » finissent par le même son [or]."),
  q("fr-sons", 3, "Quelle lettre ne s'entend pas au début de « hiver »?", "h", ["i", "v"], "On dit [i]-ver. Le « h » du début est muet : il s'écrit, mais ne se dit pas."),
  q("fr-sons", 3, "Quel mot contient le son « oi », comme « roi »?", "étoile", ["école", "pomme"], "É-toile : les lettres « o » et « i » font ensemble le son [oi]."),
  q("fr-sons", 3, "Quel mot contient le son [gn], comme « montagne »?", "araignée", ["arbre", "aiguille"], "Dans « araignée », les lettres « g » et « n » font ensemble le son [gn]."),

  // ------------------------------------------------------- vocabulaire : 1re année
  q("fr-vocabulaire", 1, "Où met-on une tuque?", "sur la tête", ["aux pieds", "aux mains"], "La tuque est un bonnet chaud. On la met sur la tête en hiver."),
  q("fr-vocabulaire", 1, "Où met-on des mitaines?", "sur les mains", ["sur la tête", "aux pieds"], "Les mitaines gardent les mains au chaud quand il fait froid."),
  q("fr-vocabulaire", 1, "Quel animal fait « miaou »?", "le chat", ["le chien", "la vache"], "Le chat miaule : miaou! Le chien aboie et la vache meugle."),
  q("fr-vocabulaire", 1, "Quel animal fait « meuh »?", "la vache", ["le cochon", "le canard"], "La vache meugle : meuh! Le canard fait coin-coin."),
  q("fr-vocabulaire", 1, "Avec quoi mange-t-on la soupe?", "une cuillère", ["une fourchette", "un couteau"], "La soupe est liquide. La cuillère peut la tenir sans qu'elle coule."),
  q("fr-vocabulaire", 1, "Quel mot est un fruit?", "la pomme", ["la carotte", "le pain"], "La pomme pousse sur un pommier. La carotte est un légume."),
  q("fr-vocabulaire", 1, "De quelle couleur est la neige?", "blanche", ["verte", "rouge"], "La neige fraîche est toute blanche."),
  q("fr-vocabulaire", 1, "Que met-on aux pieds pour patiner?", "des patins", ["des sandales", "des mitaines"], "Les patins ont une lame qui glisse sur la glace."),
  q("fr-vocabulaire", 1, "Quel animal vole dans le ciel?", "l'oiseau", ["le poisson", "le chat"], "L'oiseau a des ailes pour voler. Le poisson nage."),
  q("fr-vocabulaire", 1, "Le soir, où vas-tu dormir?", "dans mon lit", ["dans la baignoire", "sur la table"], "Le lit est fait pour dormir. On s'y couche le soir."),
  q("fr-vocabulaire", 1, "Quel animal coupe des arbres avec ses dents?", "le castor", ["le chat", "le poisson"], "Le castor a de grandes dents très fortes pour couper le bois."),
  q("fr-vocabulaire", 1, "Quel jour vient après lundi?", "mardi", ["jeudi", "dimanche"], "Lundi, mardi, mercredi... Mardi vient juste après lundi."),
  q("fr-vocabulaire", 1, "Quel mot est une boisson?", "le lait", ["le pain", "la chaise"], "Le lait se boit dans un verre. Le pain se mange."),
  q("fr-vocabulaire", 1, "Où joue-t-on au hockey sur glace?", "sur une patinoire", ["dans une piscine", "dans un lit"], "Le hockey sur glace se joue avec des patins, sur une patinoire."),

  // ------------------------------------------------------- vocabulaire : 2e année
  q("fr-vocabulaire", 2, "Que veut dire « grelotter »?", "trembler de froid", ["rire très fort", "courir vite"], "Quand on a très froid, le corps tremble : on grelotte."),
  q("fr-vocabulaire", 2, "Que fait-on à la cabane à sucre?", "du sirop d'érable", ["du pain", "des patins"], "À la cabane à sucre, on fait bouillir l'eau d'érable pour faire du sirop."),
  q("fr-vocabulaire", 2, "Qu'est-ce qu'un huard?", "un oiseau", ["un poisson", "un insecte"], "Le huard est un oiseau qui vit sur les lacs du Québec."),
  q("fr-vocabulaire", 2, "Qu'est-ce qu'un orignal?", "un gros animal des bois", ["un petit oiseau", "un poisson"], "L'orignal est un très gros animal de la forêt, avec de grands bois."),
  q("fr-vocabulaire", 2, "Que veut dire « chuchoter »?", "parler tout bas", ["crier", "chanter"], "Chuchoter, c'est parler très doucement, pour qu'on entende à peine."),
  q("fr-vocabulaire", 2, "Que veut dire « affamé »?", "qui a très faim", ["qui a sommeil", "qui a froid"], "Le mot « affamé » vient de « faim ». Une personne affamée a très faim."),
  q("fr-vocabulaire", 2, "Que veut dire « épuisé »?", "très fatigué", ["très content", "très propre"], "Après une longue course, on est épuisé : on n'a plus d'énergie."),
  q("fr-vocabulaire", 2, "À quoi sert une boussole?", "à trouver son chemin", ["à mesurer la pluie", "à couper du bois"], "L'aiguille de la boussole montre le nord. Ça aide à trouver son chemin."),
  q("fr-vocabulaire", 2, "Qu'est-ce que le Saint-Laurent?", "un fleuve", ["une montagne", "une forêt"], "Le Saint-Laurent est un grand fleuve qui coule au Québec."),
  q("fr-vocabulaire", 2, "Que veut dire « bondir »?", "sauter", ["dormir", "pleurer"], "Le lapin bondit : il fait de grands sauts."),
  q("fr-vocabulaire", 2, "Que veut dire « minuscule »?", "très petit", ["très grand", "très lourd"], "Une fourmi est minuscule : elle est toute petite."),
  q("fr-vocabulaire", 2, "Que veut dire « une bordée de neige »?", "une grosse chute de neige", ["une glissade", "un bonhomme de neige"], "Au Québec, une bordée, c'est quand il tombe beaucoup de neige d'un coup."),
  q("fr-vocabulaire", 2, "Qu'est-ce qu'un érable?", "un arbre", ["un oiseau", "un fruit"], "L'érable est un arbre. Sa feuille est sur le drapeau du Canada."),
  q("fr-vocabulaire", 2, "Comment s'appelle le petit du chat?", "le chaton", ["le chiot", "le poussin"], "Le petit du chat est le chaton. Le chiot est le petit du chien."),
  q("fr-vocabulaire", 2, "Comment s'appelle le petit de la vache?", "le veau", ["l'agneau", "le poulain"], "Le petit de la vache est le veau. L'agneau est le petit du mouton."),

  // ------------------------------------------------------- vocabulaire : 3e année
  q("fr-vocabulaire", 3, "Que veut dire « hiberner »?", "dormir tout l'hiver", ["manger beaucoup", "nager très loin"], "Certains animaux, comme la marmotte, dorment pendant tout l'hiver : ils hibernent."),
  q("fr-vocabulaire", 3, "Que veut dire « s'emmitoufler »?", "s'habiller très chaudement", ["se cacher", "se laver"], "S'emmitoufler, c'est se couvrir de vêtements chauds : tuque, foulard, mitaines!"),
  q("fr-vocabulaire", 3, "Que veut dire « ravi »?", "très content", ["très fâché", "très triste"], "Être ravi, c'est être très heureux de quelque chose."),
  q("fr-vocabulaire", 3, "Que veut dire « gigantesque »?", "énorme", ["fragile", "rapide"], "Gigantesque vient de « géant ». Ça veut dire très, très grand."),
  q("fr-vocabulaire", 3, "Que veut dire « prudent »?", "qui fait attention", ["qui court vite", "qui parle fort"], "Une personne prudente fait attention pour éviter le danger."),
  q("fr-vocabulaire", 3, "Que veut dire « étincelant »?", "qui brille", ["qui est mouillé", "qui est cassé"], "La neige au soleil est étincelante : elle brille de mille feux."),
  q("fr-vocabulaire", 3, "Quel mot est de la même famille que « neige »?", "enneigé", ["nager", "neuf"], "« Enneigé » contient le mot « neige » : couvert de neige."),
  q("fr-vocabulaire", 3, "Quel mot est de la même famille que « dent »?", "dentiste", ["dans", "danse"], "Le dentiste soigne les dents. On voit « dent » dans « dentiste »."),
  q("fr-vocabulaire", 3, "Quel mot est de la même famille que « jardin »?", "jardinier", ["jaune", "journal"], "Le jardinier s'occupe du jardin. Les deux mots partagent « jardin »."),
  q("fr-vocabulaire", 3, "Que veut dire « dévaler » une pente?", "la descendre très vite", ["la monter lentement", "la regarder"], "En traîne sauvage, on dévale la côte : on descend à toute vitesse!"),
  q("fr-vocabulaire", 3, "Qu'est-ce qu'un sentier?", "un petit chemin", ["une grosse roche", "un lac"], "Un sentier est un petit chemin, souvent dans la forêt."),
  q("fr-vocabulaire", 3, "Que veut dire « admirer »?", "regarder avec plaisir", ["oublier", "se moquer"], "Quand on admire un beau paysage, on le regarde avec plaisir."),
  q("fr-vocabulaire", 3, "Quel mot est de la même famille que « glace »?", "glacière", ["glisser", "classe"], "On voit « glace » dans « glacière » : une boîte qui garde au froid."),

  // --------------------------------------------------------- synonymes : 1re année
  q("fr-synonymes", 1, "Quel mot veut dire la même chose que « content »?", "heureux", ["triste", "fâché"], "Quand on est content, on est heureux. Les deux mots disent qu'on se sent bien."),
  q("fr-synonymes", 1, "Quel mot veut dire la même chose que « joli »?", "beau", ["laid", "sale"], "Une jolie fleur est une belle fleur. « Joli » et « beau » vont ensemble."),
  q("fr-synonymes", 1, "Quel mot veut dire la même chose que « vite »?", "rapidement", ["lentement", "jamais"], "Courir vite, c'est courir rapidement."),
  q("fr-synonymes", 1, "Quel mot veut dire la même chose que « crier »?", "hurler", ["chuchoter", "dormir"], "Crier et hurler, c'est parler très, très fort."),
  q("fr-synonymes", 1, "Quel mot veut dire la même chose que « un ami »?", "un copain", ["un ennemi", "un inconnu"], "Un copain, c'est un ami avec qui on aime jouer."),
  q("fr-synonymes", 1, "Quel mot veut dire la même chose que « finir »?", "terminer", ["commencer", "jouer"], "Finir son dessin, c'est le terminer."),
  q("fr-synonymes", 1, "Quel mot veut dire la même chose que « une auto »?", "une voiture", ["un vélo", "un avion"], "Une auto et une voiture, c'est la même chose : ça roule sur la route."),

  // --------------------------------------------------------- synonymes : 2e année
  q("fr-synonymes", 2, "Quel mot veut dire la même chose que « effrayé »?", "apeuré", ["courageux", "joyeux"], "Effrayé et apeuré veulent dire qu'on a peur."),
  q("fr-synonymes", 2, "Quel mot veut dire la même chose que « malin »?", "rusé", ["lent", "timide"], "Le renard est malin : il est rusé et trouve des idées astucieuses."),
  q("fr-synonymes", 2, "Quel mot veut dire la même chose que « fâché »?", "en colère", ["calme", "joyeux"], "Quand on est fâché, on est en colère."),
  q("fr-synonymes", 2, "Quel mot veut dire la même chose que « regarder »?", "observer", ["écouter", "sentir"], "Observer, c'est regarder avec attention. On écoute avec les oreilles."),
  q("fr-synonymes", 2, "Quel mot veut dire la même chose que « froid »?", "glacé", ["chaud", "tiède"], "Un vent glacé, c'est un vent très froid."),
  q("fr-synonymes", 2, "Quel mot veut dire la même chose que « habiter »?", "demeurer", ["partir", "visiter"], "J'habite à Québec ou je demeure à Québec : c'est pareil!"),
  q("fr-synonymes", 2, "Quel mot veut dire la même chose que « gentil »?", "aimable", ["méchant", "bruyant"], "Une personne gentille est aimable : elle est douce avec les autres."),
  q("fr-synonymes", 2, "Quel mot veut dire la même chose que « bavarder »?", "jaser", ["se taire", "pleurer"], "Au Québec, jaser, c'est bavarder : parler avec ses amis."),
  q("fr-synonymes", 2, "Quel mot veut dire la même chose que « énorme »?", "immense", ["minuscule", "léger"], "Énorme et immense veulent dire très, très grand."),
  q("fr-synonymes", 2, "Quel mot veut dire la même chose que « une erreur »?", "une faute", ["un succès", "une idée"], "Faire une erreur, c'est faire une faute. On peut la corriger!"),

  // --------------------------------------------------------- synonymes : 3e année
  q("fr-synonymes", 3, "Quel mot est un synonyme de « magnifique »?", "splendide", ["ordinaire", "affreux"], "Magnifique et splendide veulent dire très, très beau."),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « courageux »?", "brave", ["peureux", "paresseux"], "Une personne courageuse est brave : elle fait face au danger."),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « soudain »?", "tout à coup", ["lentement", "souvent"], "Soudain, le chien a jappé! Ça veut dire que c'est arrivé tout à coup."),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « silencieux »?", "sans bruit", ["bruyant", "pressé"], "Une souris silencieuse se déplace sans faire de bruit."),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « triste »?", "malheureux", ["joyeux", "surpris"], "Quand on est triste, on est malheureux. On a le cœur gros."),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « débuter »?", "commencer", ["terminer", "attendre"], "Le match débute à midi : il commence à midi."),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « dégringoler »?", "tomber", ["grimper", "courir"], "Les blocs dégringolent : ils tombent très vite, l'un après l'autre."),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « un périple »?", "un voyage", ["un repas", "un jeu"], "Un périple est un long voyage, avec plusieurs arrêts."),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « surpris »?", "étonné", ["ennuyé", "fâché"], "Être surpris ou étonné, c'est ne pas s'attendre à ce qui arrive."),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « se dépêcher »?", "se presser", ["se reposer", "s'arrêter"], "Se dépêcher, c'est se presser pour aller plus vite."),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « une demeure »?", "une maison", ["une route", "une forêt"], "Une demeure, c'est l'endroit où l'on habite : une maison."),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « délicieux »?", "savoureux", ["dégoûtant", "froid"], "Un plat délicieux est savoureux : il a très bon goût!"),
  q("fr-synonymes", 3, "Quel mot est un synonyme de « effrayant »?", "terrifiant", ["amusant", "rassurant"], "Un film effrayant est terrifiant : il fait très peur."),

  // --------------------------------------------------------- contraires : 1re année
  q("fr-contraires", 1, "Quel est le contraire de « chaud »?", "froid", ["brûlant", "mouillé"], "Chaud et froid sont des contraires, comme l'été et l'hiver."),
  q("fr-contraires", 1, "Quel est le contraire de « grand »?", "petit", ["gros", "haut"], "Grand et petit sont des contraires, comme un orignal et une souris."),
  q("fr-contraires", 1, "Quel est le contraire de « jour »?", "nuit", ["matin", "soleil"], "Le jour, il fait clair. La nuit, il fait noir."),
  q("fr-contraires", 1, "Quel est le contraire de « ouvert »?", "fermé", ["cassé", "grand"], "Une porte peut être ouverte ou fermée : ce sont des contraires."),
  q("fr-contraires", 1, "Quel est le contraire de « plein »?", "vide", ["lourd", "rond"], "Un verre plein a du lait dedans. Un verre vide n'a plus rien."),
  q("fr-contraires", 1, "Quel est le contraire de « monter »?", "descendre", ["sauter", "grimper"], "On monte l'escalier, puis on le descend. Grimper, c'est comme monter."),
  q("fr-contraires", 1, "Quel est le contraire de « rire »?", "pleurer", ["sourire", "chanter"], "Quand on est joyeux, on rit. Quand on a de la peine, on pleure."),
  q("fr-contraires", 1, "Quel est le contraire de « propre »?", "sale", ["beau", "neuf"], "Des mains propres sont lavées. Des mains sales ont besoin de savon!"),
  q("fr-contraires", 1, "Quel est le contraire de « dur »?", "mou", ["lourd", "froid"], "Une roche est dure. Un oreiller est mou."),
  q("fr-contraires", 1, "Quel est le contraire de « devant »?", "derrière", ["dessus", "loin"], "Devant et derrière sont des contraires, comme dans une file."),
  q("fr-contraires", 1, "Quel est le contraire de « gagner »?", "perdre", ["jouer", "courir"], "Dans un match, une équipe gagne et l'autre perd."),
  q("fr-contraires", 1, "Quel est le contraire de « entrer »?", "sortir", ["ouvrir", "marcher"], "On entre dans la maison, puis on sort pour jouer dehors."),

  // --------------------------------------------------------- contraires : 2e année
  q("fr-contraires", 2, "Quel est le contraire de « lourd »?", "léger", ["gros", "dur"], "Une roche est lourde. Une plume est légère."),
  q("fr-contraires", 2, "Quel est le contraire de « rapide »?", "lent", ["vif", "pressé"], "Le lièvre est rapide, la tortue est lente."),
  q("fr-contraires", 2, "Quel est le contraire de « allumer »?", "éteindre", ["chauffer", "briller"], "On allume la lumière le soir et on l'éteint pour dormir."),
  q("fr-contraires", 2, "Quel est le contraire de « toujours »?", "jamais", ["souvent", "parfois"], "Toujours, c'est chaque fois. Jamais, c'est aucune fois."),
  q("fr-contraires", 2, "Quel est le contraire de « facile »?", "difficile", ["simple", "court"], "Facile et difficile sont des contraires. Simple veut dire facile."),
  q("fr-contraires", 2, "Quel est le contraire de « commencer »?", "finir", ["débuter", "continuer"], "On commence un livre à la première page et on le finit à la dernière."),
  q("fr-contraires", 2, "Quel est le contraire de « remplir »?", "vider", ["porter", "laver"], "On remplit le seau d'eau, puis on le vide."),
  q("fr-contraires", 2, "Quel est le contraire de « gentil »?", "méchant", ["aimable", "poli"], "Gentil et méchant sont des contraires. Aimable veut dire gentil."),
  q("fr-contraires", 2, "Quel est le contraire de « beaucoup »?", "peu", ["trop", "assez"], "Beaucoup de neige, c'est une grosse quantité. Peu de neige, c'est presque rien."),
  q("fr-contraires", 2, "Quel est le contraire de « la ville »?", "la campagne", ["la rue", "l'école"], "En ville, il y a beaucoup de maisons. À la campagne, il y a des champs."),

  // --------------------------------------------------------- contraires : 3e année
  q("fr-contraires", 3, "Quel est le contraire de « possible »?", "impossible", ["passable", "visible"], "Le petit morceau « im » au début change le sens : impossible."),
  q("fr-contraires", 3, "Quel est le contraire de « patient »?", "impatient", ["calme", "content"], "Avec « im » au début, « patient » devient son contraire : impatient."),
  q("fr-contraires", 3, "Quel est le contraire de « heureux »?", "malheureux", ["joyeux", "sérieux"], "Avec « mal » au début, « heureux » devient son contraire : malheureux."),
  q("fr-contraires", 3, "Quel est le contraire de « honnête »?", "malhonnête", ["poli", "sage"], "Une personne malhonnête ne dit pas la vérité. C'est l'inverse d'honnête."),
  q("fr-contraires", 3, "Quel est le contraire de « accepter »?", "refuser", ["recevoir", "prendre"], "Accepter, c'est dire oui. Refuser, c'est dire non."),
  q("fr-contraires", 3, "Quel est le contraire de « généreux »?", "avare", ["gentil", "riche"], "Une personne généreuse aime partager. Une personne avare garde tout pour elle."),
  q("fr-contraires", 3, "Quel est le contraire de « la victoire »?", "la défaite", ["la course", "la médaille"], "Une victoire, c'est gagner. Une défaite, c'est perdre."),
  q("fr-contraires", 3, "Quel est le contraire de « ancien »?", "moderne", ["vieux", "célèbre"], "Un objet ancien est très vieux. Un objet moderne est récent."),
  q("fr-contraires", 3, "Quel est le contraire de « obéir »?", "désobéir", ["écouter", "suivre"], "Avec « dés » au début, « obéir » devient son contraire : désobéir."),

  // -------------------------------------------------------- orthographe : 1re année
  q("fr-orthographe", 1, ORTHO, "maison", ["maizon", "méson"], "« Maison » s'écrit avec « ai ». Le « s » entre deux voyelles fait le son [z]."),
  q("fr-orthographe", 1, ORTHO, "chat", ["sha", "chatt"], "« Chat » s'écrit c-h-a-t, avec un « t » muet à la fin."),
  q("fr-orthographe", 1, ORTHO, "lune", ["lunne", "lun"], "« Lune » s'écrit avec un seul « n » et un « e » à la fin."),
  q("fr-orthographe", 1, ORTHO, "papa", ["pappa", "papah"], "« Papa » s'écrit simplement : deux fois « pa »."),
  q("fr-orthographe", 1, ORTHO, "vélo", ["vélau", "vélot"], "« Vélo » finit par un simple « o ». Il n'y a pas de lettre muette."),
  q("fr-orthographe", 1, ORTHO, "école", ["écol", "ékole"], "« École » s'écrit avec un « c » et un « e » à la fin."),

  // -------------------------------------------------------- orthographe : 2e année
  q("fr-orthographe", 2, ORTHO, "bateau", ["bato", "batau"], "Le son [o] de « bateau » s'écrit « eau »."),
  q("fr-orthographe", 2, ORTHO, "gâteau", ["gatau", "gâtot"], "« Gâteau » prend un accent circonflexe sur le « â » et finit par « eau »."),
  q("fr-orthographe", 2, ORTHO, "cadeau", ["cadau", "kado"], "« Cadeau » commence par « ca » et finit par « eau »."),
  q("fr-orthographe", 2, ORTHO, "oiseau", ["oisau", "oizeau"], "« Oiseau » : « oi », puis un « s » qui fait [z], puis « eau »."),
  q("fr-orthographe", 2, ORTHO, "chapeau", ["chapo", "chapau"], "Le son [o] à la fin de « chapeau » s'écrit « eau »."),
  q("fr-orthographe", 2, ORTHO, "hiver", ["iver", "hivère"], "« Hiver » commence par un « h » muet et finit par « er »."),
  q("fr-orthographe", 2, ORTHO, "neige", ["nège", "neije"], "Dans « neige », le son [è] s'écrit « ei », et le « g » se dit comme un « j »."),
  q("fr-orthographe", 2, ORTHO, "hockey", ["hokey", "hockée"], "« Hockey » s'écrit avec « ck » au milieu et « ey » à la fin."),
  q("fr-orthographe", 2, ORTHO, "sapin", ["sapain", "sappin"], "« Sapin » s'écrit avec un seul « p » et finit par « in »."),
  q("fr-orthographe", 2, ORTHO, "garçon", ["garcon", "garsson"], "La cédille sous le « ç » lui donne le son [s] devant « o »."),

  // -------------------------------------------------------- orthographe : 3e année
  q("fr-orthographe", 3, ORTHO, "mitaine", ["mitène", "mittaine"], "« Mitaine » s'écrit avec un seul « t » et le son [è] s'écrit « ai »."),
  q("fr-orthographe", 3, ORTHO, "érable", ["érabble", "érrable"], "« Érable » s'écrit avec un seul « r » et un seul « b »."),
  q("fr-orthographe", 3, ORTHO, "castor", ["castore", "kastor"], "« Castor » commence par un « c » et finit par « or », sans « e »."),
  q("fr-orthographe", 3, ORTHO, "pantalon", ["pentalon", "pantalont"], "« Pantalon » commence par « pan » et finit par « on », sans « t »."),
  q("fr-orthographe", 3, ORTHO, "grenouille", ["greunouille", "grenouye"], "« Grenouille » commence par « gre » et finit par « ouille », comme « citrouille »."),
  q("fr-orthographe", 3, ORTHO, "automne", ["autonne", "ôtomne"], "« Automne » commence par « au » et cache un « m » muet juste avant le « n »."),
  q("fr-orthographe", 3, ORTHO, "toujours", ["toujour", "toujoure"], "« Toujours » finit toujours par un « s », même s'il ne s'entend pas!"),
  q("fr-orthographe", 3, ORTHO, "beaucoup", ["beaucou", "bocoup"], "« Beaucoup » commence par « beau » et finit par un « p » muet."),
  q("fr-orthographe", 3, ORTHO, "patinoire", ["patinoir", "patinnoire"], "« Patinoire » vient de « patin » et finit par « oire »."),
  q("fr-orthographe", 3, ORTHO, "chocolat", ["chocola", "chocolla"], "« Chocolat » s'écrit avec un seul « l » et un « t » muet à la fin."),

  // ---------------------------------------------------------- grammaire : 1re année
  q("fr-grammaire", 1, "Complète : ___ pomme", "une", ["un", "le"], "On dit « une pomme » et « la pomme ». Pomme est un mot féminin."),
  q("fr-grammaire", 1, "Complète : ___ chat", "un", ["une", "la"], "On dit « un chat » et « le chat ». Chat est un mot masculin."),
  q("fr-grammaire", 1, "Complète : ___ tuque", "une", ["un", "le"], "On dit « une tuque » et « la tuque ». Tuque est un mot féminin."),
  q("fr-grammaire", 1, "Complète : ___ ballon", "un", ["une", "la"], "On dit « un ballon » et « le ballon ». Ballon est un mot masculin."),
  q("fr-grammaire", 1, "Complète : ___ maison", "la", ["le", "un"], "On dit « la maison » et « une maison ». Maison est un mot féminin."),
  q("fr-grammaire", 1, "Complète : ___ soleil", "le", ["la", "une"], "On dit « le soleil » et « un soleil ». Soleil est un mot masculin."),
  q("fr-grammaire", 1, "Complète : ___ mitaines", "des", ["un", "une"], "Il y a un « s » à « mitaines » : il y en a plusieurs. On dit « des mitaines »."),
  q("fr-grammaire", 1, "Complète : Léa ___ contente.", "est", ["suis", "sont"], "On dit « je suis », mais « elle est ». Léa est contente!"),
  q("fr-grammaire", 1, "Complète : Je ___ content.", "suis", ["est", "sont"], "Avec « je », le verbe être devient « suis » : je suis content."),
  q("fr-grammaire", 1, "Complète : un lion, une ___", "lionne", ["lion", "lionette"], "Au féminin, « lion » devient « lionne », avec deux « n » et un « e »."),
  q("fr-grammaire", 1, "Quel mot prend toujours une majuscule?", "Léa", ["chat", "pomme"], "Léa est un prénom. Un prénom commence toujours par une majuscule."),
  q("fr-grammaire", 1, "Par quoi commence une phrase?", "une majuscule", ["un point", "une virgule"], "Une phrase commence par une majuscule et finit par un point."),
  q("fr-grammaire", 1, "Complète : ___ chats jouent.", "Les", ["Le", "Un"], "Il y a plusieurs chats, avec un « s ». On dit « les chats »."),
  q("fr-grammaire", 1, "Complète : ___ amis sont là.", "Mes", ["Mon", "Ma"], "Il y a plusieurs amis. Pour plusieurs, on dit « mes »."),

  // ---------------------------------------------------------- grammaire : 2e année
  q("fr-grammaire", 2, "Complète : Nous ___ un chien.", "avons", ["avez", "ont"], "Avec « nous », le verbe avoir devient « avons » : nous avons."),
  q("fr-grammaire", 2, "Complète : Tu ___ à la patinoire.", "vas", ["allez", "vont"], "Avec « tu », le verbe aller devient « vas » : tu vas."),
  q("fr-grammaire", 2, "Complète : Ils ___ en 2e année.", "sont", ["est", "suis"], "Avec « ils », le verbe être devient « sont » : ils sont."),
  q("fr-grammaire", 2, "Complète : un cheval, des ___", "chevaux", ["chevals", "cheval"], "Les mots en « al » changent souvent au pluriel : un cheval, des chevaux."),
  q("fr-grammaire", 2, "Quel signe met-on à la fin d'une question?", "le point d'interrogation", ["la virgule", "le point"], "Une question finit par un point d'interrogation, comme « Où vas-tu? »"),
  q("fr-grammaire", 2, "Complète : La neige est ___.", "blanche", ["blanc", "blancs"], "Neige est un mot féminin. On dit donc « blanche » : la neige est blanche."),
  q("fr-grammaire", 2, "Complète : Zoé et Léa ___ amies.", "sont", ["est", "es"], "Zoé et Léa, ça fait deux personnes : elles sont amies."),
  q("fr-grammaire", 2, "Complète : Vous ___ gentils.", "êtes", ["sommes", "sont"], "Avec « vous », le verbe être devient « êtes » : vous êtes."),
  q("fr-grammaire", 2, "Complète : Nous ___ dehors.", "jouons", ["jouent", "jouez"], "Avec « nous », le verbe finit par « ons » : nous jouons."),
  q("fr-grammaire", 2, "Quel mot est un verbe (une action)?", "courir", ["maison", "rouge"], "Courir, c'est une action qu'on peut faire. Maison est un nom."),
  q("fr-grammaire", 2, "Quelle phrase est une question?", "Où est ma tuque?", ["Ma tuque est ici.", "Prends ta tuque."], "Cette phrase demande quelque chose et finit par un point d'interrogation."),
  q("fr-grammaire", 2, "Complète : Florence ___ un nouveau vélo.", "a", ["ont", "avons"], "Florence est une seule personne. On dit « elle a » : Florence a un vélo."),
  q("fr-grammaire", 2, "Complète : Aujourd'hui, nous ___ à la cabane à sucre.", "allons", ["vont", "va"], "Avec « nous », le verbe aller devient « allons » : nous allons."),
  q("fr-grammaire", 2, "Quelle phrase a du sens?", "Le chien mange un os.", ["Un os mange le chien.", "Mange le chien un os."], "Dans une phrase, les mots sont en ordre : qui fait l'action, puis l'action."),

  // ---------------------------------------------------------- grammaire : 3e année
  q("fr-grammaire", 3, "Complète : Les mitaines sont ___.", "chaudes", ["chaude", "chaud"], "« Mitaines » est féminin et pluriel. On ajoute « e » et « s » : chaudes."),
  q("fr-grammaire", 3, "Complète : un œil, des ___", "yeux", ["œils", "œil"], "C'est un mot spécial : un œil, mais des yeux."),
  q("fr-grammaire", 3, "Complète : Mes amies sont ___.", "contentes", ["content", "contente"], "« Amies » est féminin et pluriel. L'adjectif prend « e » et « s » : contentes."),
  q("fr-grammaire", 3, "Quel mot est un adjectif?", "joyeux", ["sauter", "table"], "Un adjectif dit comment est quelqu'un ou quelque chose. Joyeux décrit."),
  q("fr-grammaire", 3, "Complète : Les enfants ___ leurs tuques.", "mettent", ["met", "mets"], "« Les enfants », c'est « ils ». Avec « ils », on écrit « mettent »."),
  q("fr-grammaire", 3, "Complète : Thomas et moi, nous ___ prêts.", "sommes", ["sont", "êtes"], "Thomas et moi, c'est « nous ». Avec « nous », on dit « sommes »."),
  q("fr-grammaire", 3, "Complète : Tu ___ froid aux mains.", "as", ["avez", "ont"], "Avec « tu », le verbe avoir devient « as » : tu as froid."),
  q("fr-grammaire", 3, "Dans « Le gros orignal mange », quel est le verbe?", "mange", ["gros", "orignal"], "Le verbe dit l'action. Que fait l'orignal? Il mange."),
  q("fr-grammaire", 3, "Dans « Olivia lit un livre », qui fait l'action?", "Olivia", ["un livre", "lit"], "Qui est-ce qui lit? C'est Olivia. Elle est le sujet de la phrase."),
  q("fr-grammaire", 3, PHRASE, "Les chats noirs dorment.", ["Les chat noirs dorment.", "Les chats noir dorment."], "Il y a plusieurs chats : « chats » et « noirs » prennent tous les deux un « s »."),
  q("fr-grammaire", 3, PHRASE, "Elle porte une belle tuque.", ["Elle porte un beau tuque.", "Elle porte une beau tuque."], "Tuque est un mot féminin. On dit « une belle tuque »."),
  q("fr-grammaire", 3, "Quel signe termine « Comme c'est beau »?", "le point d'exclamation", ["le point d'interrogation", "la virgule"], "Cette phrase montre une émotion forte. Elle finit par un point d'exclamation."),
  q("fr-grammaire", 3, "Complète : un bijou, des ___", "bijoux", ["bijous", "bijou"], "Bijou fait partie des mots en « ou » qui prennent un « x » au pluriel."),
  q("fr-grammaire", 3, "Complète : Les élèves ___ à l'école en autobus.", "vont", ["va", "allons"], "« Les élèves », c'est « ils ». Avec « ils », le verbe aller devient « vont »."),

  // -------------------------------------------------------- homophones : 2e année
  q("fr-homophones", 2, "Complète : Léa ___ un chat.", "a", ["à", "as"], "On peut dire « Léa avait un chat ». Alors on écrit « a », sans accent."),
  q("fr-homophones", 2, "Complète : Je vais ___ l'école.", "à", ["a", "as"], "On ne peut pas dire « je vais avait l'école ». Alors on écrit « à », avec un accent."),
  q("fr-homophones", 2, "Complète : Félix ___ Zoé jouent.", "et", ["est", "es"], "On peut dire « Félix et puis Zoé ». Le petit mot « et » relie deux noms."),
  q("fr-homophones", 2, "Complète : Le ciel ___ bleu.", "est", ["et", "es"], "On peut dire « Le ciel était bleu ». Alors on écrit « est »."),
  q("fr-homophones", 2, "Complète : Tu veux une pomme ___ une poire?", "ou", ["où", "on"], "On peut dire « une pomme ou bien une poire ». C'est un choix : « ou » sans accent."),
  q("fr-homophones", 2, "Complète : ___ est ma tuque?", "Où", ["Ou", "On"], "La question demande un endroit. Pour un lieu, « où » prend un accent."),
  q("fr-homophones", 2, "Complète : Il y ___ de la neige.", "a", ["à", "as"], "On peut dire « Il y avait de la neige ». Alors on écrit « a », sans accent."),
  q("fr-homophones", 2, "Complète : Zoé ___ contente.", "est", ["et", "ai"], "On peut dire « Zoé était contente ». Alors on écrit « est »."),
  q("fr-homophones", 2, "Complète : Mon chien ___ mon chat sont amis.", "et", ["est", "ai"], "On peut dire « mon chien et puis mon chat ». « Et » relie les deux animaux."),
  q("fr-homophones", 2, "Complète : On va ___ la patinoire.", "à", ["a", "as"], "On ne peut pas dire « on va avait la patinoire ». On écrit « à », avec un accent."),

  // -------------------------------------------------------- homophones : 3e année
  q("fr-homophones", 3, "Complète : Les enfants ___ faim.", "ont", ["on", "sont"], "On peut dire « Les enfants avaient faim ». Alors on écrit « ont »."),
  q("fr-homophones", 3, "Complète : ___ joue dehors.", "On", ["Ont", "Son"], "On peut dire « Il joue dehors ». Alors on écrit « on », sans « t »."),
  q("fr-homophones", 3, "Complète : Mes amis ___ partis.", "sont", ["son", "ont"], "On peut dire « Mes amis étaient partis ». Alors on écrit « sont »."),
  q("fr-homophones", 3, "Complète : Émile cherche ___ chapeau.", "son", ["sont", "on"], "On peut dire « Émile cherche mon chapeau ». Alors on écrit « son »."),
  q("fr-homophones", 3, "Complète : J'aime le hockey, ___ je suis fatigué.", "mais", ["mes", "met"], "On peut dire « pourtant je suis fatigué ». Alors on écrit « mais »."),
  q("fr-homophones", 3, "Complète : ___ bottes sont mouillées.", "Mes", ["Mais", "Met"], "On parle de bottes à moi. On pourrait dire « tes bottes », alors on écrit « mes »."),
  q("fr-homophones", 3, "Complète : Le chat ___ cache sous le lit.", "se", ["ce", "sa"], "Le chat se cache lui-même. Comme dans « je me cache », on écrit « se »."),
  q("fr-homophones", 3, "Complète : ___ livre est à moi.", "Ce", ["Se", "Ceux"], "On peut montrer le livre du doigt : « ce livre-là ». Alors on écrit « ce »."),
  q("fr-homophones", 3, "Complète : Ils ___ un chalet au bord du lac.", "ont", ["on", "sont"], "On peut dire « Ils avaient un chalet ». Alors on écrit « ont »."),
  q("fr-homophones", 3, "Complète : Les castors ___ dans l'eau.", "sont", ["son", "ont"], "On peut dire « Les castors étaient dans l'eau ». Alors on écrit « sont »."),
  q("fr-homophones", 3, "Complète : Alice ___ Jacob vont à la cabane à sucre.", "et", ["est", "es"], "On peut dire « Alice et puis Jacob ». « Et » relie les deux amis."),
  q("fr-homophones", 3, "Complète : Je ne sais pas ___ est mon autre mitaine.", "où", ["ou", "on"], "On cherche un endroit. Pour un lieu, on écrit « où », avec un accent."),
  q("fr-homophones", 3, "Complète : Rosalie ___ peur de l'orage.", "a", ["à", "as"], "On peut dire « Rosalie avait peur ». Alors on écrit « a », sans accent."),
  q("fr-homophones", 3, "Complète : Noah ___ lave les mains.", "se", ["ce", "ces"], "Noah lave ses propres mains : il se lave. On peut dire « je me lave »."),
  q("fr-homophones", 3, "Complète : J'ai perdu ___ mitaines.", "mes", ["mais", "met"], "Les mitaines sont à moi. On peut dire « tes mitaines ». Alors on écrit « mes »."),
  q("fr-homophones", 3, "Complète : Il fait froid ___ il neige.", "et", ["est", "ai"], "On peut dire « Il fait froid et puis il neige ». « Et » relie les deux idées."),

  // ------------------------------------------------------------ lecture : 1re année
  q("fr-lecture", 1, "Léa a un chat gris.\n\nDe quelle couleur est le chat?", "gris", ["noir", "blanc"], "Le texte dit : « Léa a un chat gris »."),
  q("fr-lecture", 1, "Félix mange une pomme rouge.\n\nQue mange Félix?", "une pomme", ["une banane", "un gâteau"], "Le texte dit que Félix mange une pomme rouge."),
  q("fr-lecture", 1, "Zoé met sa tuque. Il neige dehors.\n\nQuel temps fait-il?", "Il neige.", ["Il fait soleil.", "Il pleut."], "Le texte dit : « Il neige dehors »."),
  q("fr-lecture", 1, "Le chien de Samuel s'appelle Max.\n\nComment s'appelle le chien?", "Max", ["Samuel", "Léo"], "Samuel est le garçon. Son chien s'appelle Max."),
  q("fr-lecture", 1, "Thomas joue au hockey sur la patinoire.\n\nÀ quoi joue Thomas?", "au hockey", ["au ballon", "aux cartes"], "Le texte dit que Thomas joue au hockey sur la patinoire."),
  q("fr-lecture", 1, "Le petit castor nage dans le lac.\n\nOù nage le castor?", "dans le lac", ["dans la piscine", "dans le bain"], "Le texte dit que le castor nage dans le lac."),
  q("fr-lecture", 1, "Olivia a trois ballons bleus.\n\nCombien de ballons a Olivia?", "trois", ["deux", "cinq"], "Le texte dit : « trois ballons bleus »."),
  q("fr-lecture", 1, "Émile dort. Il est très fatigué.\n\nPourquoi Émile dort-il?", "Il est fatigué.", ["Il a faim.", "Il a froid."], "Le texte dit qu'Émile est très fatigué. C'est pour ça qu'il dort."),
  q("fr-lecture", 1, "Alice prend l'autobus scolaire pour aller à l'école.\n\nOù va Alice?", "à l'école", ["au parc", "chez sa grand-mère"], "Le texte dit qu'Alice prend l'autobus pour aller à l'école."),
  q("fr-lecture", 1, "Noah boit un verre de lait.\n\nQue boit Noah?", "du lait", ["du jus", "de l'eau"], "Le texte dit que Noah boit un verre de lait."),
  q("fr-lecture", 1, "Il fait froid. Rosalie met ses mitaines.\n\nQue met Rosalie?", "ses mitaines", ["ses sandales", "son maillot"], "Il fait froid, alors Rosalie met ses mitaines pour avoir chaud."),

  // ------------------------------------------------------------ lecture : 2e année
  q("fr-lecture", 2, "Samedi, Jacob va à la cabane à sucre avec sa famille. Il mange de la tire sur la neige. C'est sucré!\n\nOù va Jacob samedi?", "à la cabane à sucre", ["au zoo", "à la piscine"], "La première phrase dit que Jacob va à la cabane à sucre."),
  q("fr-lecture", 2, "Charlotte fait un bonhomme de neige. Elle lui met une carotte pour le nez.\n\nÀ quoi sert la carotte?", "à faire le nez", ["à faire les bras", "à faire la soupe"], "Le texte dit que Charlotte met une carotte pour le nez du bonhomme."),
  q("fr-lecture", 2, "William a perdu sa tuque à l'école. Il la cherche partout. Enfin, il la trouve dans son sac!\n\nOù était la tuque?", "dans son sac", ["dans la cour", "sous son pupitre"], "À la fin, William trouve sa tuque dans son sac."),
  q("fr-lecture", 2, "Le huard est un oiseau. Il vit sur les lacs. Il plonge pour attraper des poissons.\n\nOù vit le huard?", "sur les lacs", ["dans le désert", "dans les grottes"], "Le texte dit : « Il vit sur les lacs »."),
  q("fr-lecture", 2, "Florence a sept ans. Son frère Thomas a cinq ans.\n\nQui est le plus âgé?", "Florence", ["Thomas", "Ils ont le même âge."], "Florence a sept ans et Thomas en a cinq. Sept, c'est plus que cinq."),
  q("fr-lecture", 2, "Il pleut beaucoup. Léa prend son parapluie et ses bottes de pluie.\n\nPourquoi Léa prend-elle son parapluie?", "parce qu'il pleut", ["parce qu'il neige", "parce qu'il fait chaud"], "Le texte commence par « Il pleut beaucoup ». Le parapluie la garde au sec."),
  q("fr-lecture", 2, "Le matin, Félix se brosse les dents. Ensuite, il mange ses céréales. Enfin, il part à l'école.\n\nQue fait Félix en premier?", "Il se brosse les dents.", ["Il mange ses céréales.", "Il part à l'école."], "Les mots « ensuite » et « enfin » viennent après. En premier, il se brosse les dents."),
  q("fr-lecture", 2, "L'orignal est un très grand animal. Il a de grands bois sur la tête. Il vit dans la forêt.\n\nOù vit l'orignal?", "dans la forêt", ["dans la mer", "en ville"], "La dernière phrase dit que l'orignal vit dans la forêt."),
  q("fr-lecture", 2, "Zoé et Émile font une course. Zoé court très vite. Elle arrive la première!\n\nQui gagne la course?", "Zoé", ["Émile", "personne"], "Zoé arrive la première. C'est donc elle qui gagne."),
  q("fr-lecture", 2, "Mamie fait une tarte aux bleuets. Ça sent bon dans toute la maison.\n\nQuelle tarte fait Mamie?", "une tarte aux bleuets", ["une tarte aux pommes", "une tarte au sucre"], "La première phrase dit que Mamie fait une tarte aux bleuets."),
  q("fr-lecture", 2, "Olivia arrose ses fleurs tous les jours. Maintenant, elles sont grandes et belles.\n\nPourquoi les fleurs sont-elles belles?", "Olivia les arrose.", ["Il neige beaucoup.", "Elles sont en plastique."], "Olivia arrose ses fleurs chaque jour. L'eau les aide à bien pousser."),

  // ------------------------------------------------------------ lecture : 3e année
  q("fr-lecture", 3, "Le castor vit près des rivières. Avec ses grandes dents, il coupe des arbres. Il construit un barrage pour bloquer l'eau. Sa maison s'appelle une hutte.\n\nComment s'appelle la maison du castor?", "une hutte", ["un barrage", "un nid"], "La dernière phrase dit : « Sa maison s'appelle une hutte ». Le barrage bloque l'eau."),
  q("fr-lecture", 3, "En hiver, Noah et sa sœur Alice glissent sur la grosse côte. Noah tombe de sa traîne sauvage et rit très fort. Alice l'aide à se relever. Puis, ils remontent la côte ensemble.\n\nQue fait Alice quand Noah tombe?", "Elle l'aide à se relever.", ["Elle rentre à la maison.", "Elle se moque de lui."], "Le texte dit : « Alice l'aide à se relever »."),
  q("fr-lecture", 3, "Au printemps, les érables donnent de l'eau d'érable. On la fait bouillir longtemps à la cabane à sucre. L'eau devient du sirop. Il faut beaucoup d'eau pour faire un peu de sirop!\n\nQue fait-on bouillir pour faire du sirop?", "de l'eau d'érable", ["du lait", "de la neige"], "Le texte dit qu'on fait bouillir l'eau d'érable, et qu'elle devient du sirop."),
  q("fr-lecture", 3, "Rosalie voulait jouer dehors, mais il faisait très froid. Elle a mis son habit de neige, sa tuque et ses mitaines. Dehors, elle a fait un fort avec ses amis.\n\nPourquoi Rosalie a-t-elle mis son habit de neige?", "parce qu'il faisait froid", ["parce qu'il pleuvait", "pour aller à la piscine"], "Le texte dit qu'il faisait très froid. L'habit de neige garde au chaud."),
  q("fr-lecture", 3, "Samuel a oublié sa collation à la maison. À la récréation, son ami Jacob partage ses biscuits avec lui. Samuel le remercie avec un grand sourire.\n\nQuel mot décrit le mieux Jacob?", "généreux", ["méchant", "paresseux"], "Jacob partage ses biscuits avec son ami. Partager, c'est être généreux."),
  q("fr-lecture", 3, "Le Saint-Laurent est un grand fleuve du Québec. Beaucoup de bateaux y naviguent. On peut même y voir des baleines près de Tadoussac!\n\nQuel animal peut-on voir près de Tadoussac?", "des baleines", ["des castors", "des crocodiles"], "La dernière phrase dit qu'on peut voir des baleines près de Tadoussac."),
  q("fr-lecture", 3, "Charlotte adore lire. Chaque soir, avant de dormir, elle lit une histoire à son petit frère. Il s'endort souvent avant la fin!\n\nQuand Charlotte lit-elle une histoire?", "chaque soir", ["chaque matin", "à la récréation"], "Le texte dit : « Chaque soir, avant de dormir »."),
  q("fr-lecture", 3, "On voit le huard sur la pièce d'un dollar canadien. Cet oiseau plonge très bien et peut rester longtemps sous l'eau. Son cri ressemble à un drôle de rire.\n\nOù peut-on voir un dessin de huard?", "sur la pièce d'un dollar", ["sur un panneau d'arrêt", "sur le drapeau du Québec"], "La première phrase dit qu'on voit le huard sur la pièce d'un dollar."),
  q("fr-lecture", 3, "Thomas et Florence préparent une surprise. Thomas dessine une carte. Florence fait un gâteau avec l'aide de papa. Ce soir, c'est l'anniversaire de maman!\n\nPourquoi préparent-ils une surprise?", "C'est l'anniversaire de maman.", ["C'est Noël.", "Maman est malade."], "La dernière phrase dit que c'est l'anniversaire de maman ce soir."),
  q("fr-lecture", 3, "Les feuilles des arbres deviennent rouges, jaunes et orange. Le vent les fait tomber. Émile les ramasse et saute dans le gros tas!\n\nQuelle saison est-ce?", "l'automne", ["l'hiver", "l'été"], "Les feuilles qui changent de couleur et qui tombent : c'est l'automne."),
  q("fr-lecture", 3, "Les ours noirs mangent beaucoup à l'automne. Quand l'hiver arrive, ils dorment dans une tanière. Ils se réveillent au printemps, très affamés.\n\nOù dorment les ours en hiver?", "dans une tanière", ["dans un arbre", "dans l'eau"], "Le texte dit que les ours dorment dans une tanière quand l'hiver arrive."),
  // La Nouvelle-Écosse et l'Acadie.
  q("fr-lecture", 1, "Le drapeau acadien a une étoile jaune.\n\nDe quelle couleur est l'étoile?", "jaune", ["rouge", "bleue"], "Le texte dit : « Le drapeau acadien a une étoile jaune »."),
  q("fr-lecture", 1, "Papa pêche un homard. Le homard a deux grosses pinces.\n\nQue pêche papa?", "un homard", ["un poisson", "un crabe"], "Le texte dit : « Papa pêche un homard »."),
  q("fr-lecture", 2, "Le 15 août, c'est la fête des Acadiens. Les gens font du bruit dans la rue avec des casseroles et des sifflets. C'est le tintamarre!\n\nAvec quoi les gens font-ils du bruit?", "des casseroles et des sifflets", ["des tambours et des guitares", "des cloches et des klaxons"], "Le texte dit qu'ils font du bruit avec des casseroles et des sifflets."),
  q("fr-lecture", 2, "Chloé habite à Halifax. Halifax est la capitale de la Nouvelle-Écosse. Il y a un grand port avec beaucoup de bateaux.\n\nQu'y a-t-il à Halifax?", "un grand port", ["une grande montagne", "un grand désert"], "Le texte dit : « Il y a un grand port avec beaucoup de bateaux »."),
  q("fr-lecture", 2, "Sur la côte, il y a un phare blanc et rouge. La nuit, sa lumière tourne pour guider les bateaux.\n\nÀ quoi sert la lumière du phare?", "à guider les bateaux", ["à chauffer la maison", "à éclairer la route"], "Le texte dit que la lumière tourne pour guider les bateaux."),
  q("fr-lecture", 3, "Dans la baie de Fundy, la mer monte et descend plus que partout ailleurs dans le monde. À marée basse, on peut marcher au fond de la mer. Quelques heures plus tard, l'eau revient!\n\nQue peut-on faire à marée basse?", "marcher au fond de la mer", ["nager avec les baleines", "faire du bateau"], "Le texte dit qu'à marée basse, on peut marcher au fond de la mer."),
  q("fr-lecture", 3, "Grand-maman prépare une râpure. Elle râpe beaucoup de pommes de terre, puis elle ajoute du poulet. Toute la famille adore ce plat acadien!\n\nQuel légume grand-maman râpe-t-elle?", "des pommes de terre", ["des carottes", "des navets"], "Le texte dit qu'elle râpe beaucoup de pommes de terre."),
  q("fr-lecture", 3, "Le drapeau acadien est bleu, blanc et rouge. Dans la partie bleue, il y a une étoile dorée. On l'appelle l'étoile de la mer, car elle guide les marins.\n\nPourquoi appelle-t-on l'étoile « l'étoile de la mer »?", "parce qu'elle guide les marins", ["parce qu'elle est bleue", "parce qu'elle brille le jour"], "La dernière phrase dit qu'elle guide les marins."),
  q("fr-vocabulaire", 2, "Qu'est-ce qu'un phare?", "une tour avec une lumière", ["un gros bateau de pêche", "une maison sur la plage"], "Le phare est une haute tour près de la mer. Sa lumière guide les bateaux la nuit."),
  q("fr-vocabulaire", 2, "Qu'est-ce que la marée?", "la mer qui monte et qui descend", ["une grosse vague de tempête", "un poisson de la mer"], "Deux fois par jour, la mer monte et descend : c'est la marée."),
];
