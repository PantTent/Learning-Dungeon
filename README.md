# Learning Dungeon

![Screenshots](docs/screenshots.png)

A top-down, turn-based dungeon crawler for a 4th grader. Every attack is a
question. Answer right for **full damage**, wrong for **half damage**, and the
game always shows the correct answer with a short explanation.

Questions follow the **Massachusetts 2017 Grade 4 curriculum frameworks**:

- **Math** (generated fresh every time, with step-by-step explanations):
  multiplication (facts, 2-digit x 1-digit, up to 4-digit x 1-digit,
  2-digit x 2-digit), division with remainders, long division, place value,
  rounding, comparing numbers, factors/multiples/primes, patterns, equivalent
  fractions, comparing fractions, adding and subtracting fractions, fraction x
  whole number, decimals, measurement conversions, area and perimeter, angles,
  and word problems.
- **Reading/vocabulary** (579 hand-written questions): synonyms, antonyms,
  vocabulary, context clues, prefixes and suffixes, Greek and Latin roots,
  figurative language, homophones, grammar, spelling, and short reading
  comprehension passages.

**Grades 3, 4 and 5** can be picked per hero (grade 4 is the full set; grade 3
is easier, and grade 5 adds 3-digit x 2-digit, dividing by 2-digit numbers,
order of operations, unlike fractions, decimal adding and subtracting, and
volume). Each time a hero is played, the child picks which topics to practice.
An **"I need a teacher!"** button explains how to think about the question
without giving away the answer.

Difficulty adapts per subject. Missed questions come back a few turns later.

## What's in v0.1

- **7 classes**: Warrior, Mage, Ranger, Paladin, Necromancer (summons
  skeletons), Druid, and Demonologist (summons an imp).
- **Spellbook**: each class has 10 spells. A new spell or a stronger rank
  (I/II/III) unlocks every 2 levels. Pick **3** to bring into battle, plus a
  free basic attack. Mages get fire, ice, arcane and lightning, including
  spells that hit every enemy. Stronger spells cost a lot more mana.
  After every win a little mana comes back: 0.5% of max mana per point of
  Intellect (compounded), up to 25%. Potions are still needed.
- **Summons** (Necromancer skeleton, Demonologist imp): cast once and the pet
  follows you on the map and into every fight. It has about 1/3 of your
  health, and monsters can attack it and defeat it. Casting again heals or
  upgrades it, and the camp fountain heals it too.
- **Lighting**: caves are dark, with flickering torches and glowing campfires,
  portals and chests. Places outside the rooms and paths are just empty black.
- **Gear slots**: head, necklace, chest, gloves, pants, boots, 2 rings, main
  hand and off hand. Two-handed weapons (greatsword, greataxe, staff, bow) take
  both hands. One-handed weapons can be paired with a shield or spellbook.
- **Random loot**: Common, Uncommon, Rare, Epic and Legendary rarities, with
  random stats (Strength, Intellect, Agility, Stamina, Armor, Crit).
- **Area 1, Mossfang Caverns** (levels 1-10): 3 random cave floors, a camp
  with a healing fountain, a shop and fast travel, treasure chests. Boss:
  **Grukk the Goblin King**.
- **Area 2, Whisperwood Forest** (levels 11-20): a sunny outdoor forest with
  new monsters, reached through a portal that opens after beating Grukk. Boss:
  **Old Gnarlroot the Treant**. Level cap is now **20**.
- **Boss fights** are 5 questions and you need **4 of 5 (80%)** to win.
  Bosses can be farmed for Rare to Mythic loot.
- **Potions** in four strengths (Minor, Medium, Major, Superior) for health
  and mana. They drop from monsters and chests, scaled by monster level, and
  stronger ones unlock in the shop as you level up.
- **Parent dashboard** (hold the button on the title screen): accuracy by
  topic, weakest first. You can also set the math/reading mix and turn on
  read-aloud.
- **Sound**: chiptune music for the menus, dungeon, battles and the boss, plus
  sound effects for every attack, spell, answer, level-up and treasure chest. All
  of it is synthesized in code (`src/audio/audio.ts`), with no audio files. The
  Sound button switches between all sound on, music off, and all sound off.
- Up to 3 hero save slots. Saves are on the device for now; cloud login comes
  next.

## Playing it

### In a browser (quickest)
```bash
npm install
npm run dev        # then open the printed URL on the tablet (same Wi-Fi)
```
Once the repo is on GitHub with Pages enabled (Settings -> Pages -> Source:
GitHub Actions), every push publishes a playable web version.

### On Android
Every push to `main` builds an APK through GitHub Actions (`Android APK`
workflow). Open the run, download `learning-dungeon-apk` from **Artifacts**,
copy it to the tablet, and open it. Allow "install unknown apps" when asked.

To build locally you need Android Studio:
```bash
npm run build && npx cap sync android && npx cap open android
```

## Project layout

| Path | What |
|---|---|
| `src/questions/` | Math generators, reading bank, adaptive question engine (+ tests) |
| `src/data/` | Classes, items/loot, enemies, map generator |
| `src/state/` | Hero profile, stats, equip rules, saving; current dungeon floor |
| `src/scenes/` | Title, hero creation, dungeon map, battle, inventory, shop, parent screen |
| `src/ui/` | Buttons, bars, question overlay |
| `src/art/pixelData.ts` | All pixel art, generated by `tools/art/gen.py` |
| `tools/art/` | Editable sprite grids (`src_*.py`). Run `python3 gen.py` to rebuild the art and `python3 render.py` for a preview sheet |
| `android/` | Capacitor Android project |

## Tests
```bash
npm test
```
The tests check every math generator against independently computed answers,
validate all 579 reading questions, and cover the equip rules (two-handed and
off-hand, rings), the level cap, and the boss's 4-of-5 rule.

## Roadmap
- Cloud save + login (Google / email) so progress follows the child across devices
- More areas
- Full 3D art with gear that shows on the hero (try the preview: `preview3d.html`)
- iOS build
