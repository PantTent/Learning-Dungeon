import Phaser from 'phaser';
import { sfx } from '../audio/audio';
import { MAX_CHOSEN, classPowers, bestRank, chosenFamilies, chosenSpells, families, familyName, familyOf, nextRank, petHealthShare } from '../data/spells';
import type { Fx, SkillDef } from '../data/classes';
import { classOf, current, derive, saveProfile } from '../state/profile';
import { C, H, W, button, panel, toast, txt } from '../ui/widgets';
import { fmtNum, tr } from '../i18n';
import { spellLabel } from '../ui/spellText';

const FX_NAME: Record<Fx, string> = {
  slash: 'Melee', fire: 'Fire', frost: 'Ice', arcane: 'Arcane', arrow: 'Arrow', holy: 'Holy',
  shadow: 'Shadow', nature: 'Nature', fel: 'Fel fire', heal: 'Healing', lightning: 'Lightning',
};
const FX_COLOR: Record<Fx, number> = {
  slash: 0x6a6a7a, fire: 0xa8401a, frost: 0x2a6aa8, arcane: 0x7a3aa8, arrow: 0x6a5a2a, holy: 0xa88a1a,
  shadow: 0x4a2a7a, nature: 0x2f7a3a, fel: 0x2f8a2a, heal: 0x2a8a5a, lightning: 0x2a5ac0,
};

/** Pick which 3 spells to bring into battle. */
export class SpellbookScene extends Phaser.Scene {
  private onClose?: () => void;
  private layer?: Phaser.GameObjects.Container;

  constructor() {
    super('Spells');
  }

  create(data: { onClose?: () => void }) {
    this.onClose = data.onClose;
    this.add.rectangle(0, 0, W, H, 0, 0.75).setOrigin(0).setInteractive();
    this.draw();
  }

  private draw() {
    this.layer?.destroy();
    const p = current();
    const cls = classOf(p);
    const list = cls.skills;
    // Saved as spell families (Cleave, not Cleave I); first time: the newest ones.
    p.spells = chosenFamilies(list, p.level, p.spells);
    const chosen = chosenSpells(list, p.level, p.spells);
    const stats = derive(p);
    const c = this.add.container(0, 0);
    this.layer = c;
    c.add(panel(this, 16, 12, W - 32, H - 24, 0x1d1730, cls.color));
    c.add(txt(this, 36, 22, tr('{cls} Spellbook', { cls: tr(cls.name) }), 26, '#ffd24a'));
    c.add(txt(this, 36, 56, tr('Pick {n} spells to bring into battle. {spell} is always ready (free).', { n: MAX_CHOSEN, spell: tr(list[0].name) }), 16, C.dim));
    c.add(button(this, W - 90, 40, 130, 46, tr('Done'), () => {
      saveProfile(p);
      this.scene.stop();
      this.onClose?.();
    }, { size: 20, color: 0x2f9a4a }));

    const remove = (fam: string) => {
      p.spells = p.spells!.filter((id) => id !== fam);
      sfx('click');
      this.draw();
    };

    // The 3 battle slots
    for (let i = 0; i < MAX_CHOSEN; i++) {
      const sp = chosen[i];
      const x = 36 + i * 300;
      const g = this.add.graphics();
      g.fillStyle(sp ? FX_COLOR[sp.fx] : 0x0f0b1a, 1).fillRoundedRect(x, 84, 284, 52, 8);
      g.lineStyle(3, 0xffd24a, sp ? 1 : 0.4).strokeRoundedRect(x, 84, 284, 52, 8);
      c.add(g);
      c.add(txt(this, x + 12, 90, sp ? spellLabel(list, sp) : tr('Empty slot {n}', { n: i + 1 }), 18, sp ? '#ffffff' : C.dim));
      if (sp) {
        c.add(txt(this, x + 12, 113, tr('{mp} MP  -  tap to remove', { mp: sp.mp }), 13, '#ffe9a0'));
        c.add(this.add.zone(x, 84, 284, 52).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => remove(familyOf(sp.id))));
      }
    }

    // The ultimate is a surprise: any of the class's ultimates, at random.
    const all = classPowers(cls);
    c.add(txt(this, W / 2, 452, `\u2605 ${tr('Ultimate: a surprise every time!')} \u2605`, 22, '#ffd24a').setOrigin(0.5));
    c.add(txt(this, W / 2, 482, tr('It can be: {list}', { list: all.map((x) => tr(x.name)).join(', ') }), 14, C.dim, { align: 'center', wordWrap: { width: W - 80 } }).setOrigin(0.5));

    // Every spell once, at its best rank. All cards are the same size.
    const CW = 284;
    const CH = 94;
    families(list).forEach((fam, i) => {
      const x = 36 + (i % 3) * 300;
      const y = 146 + Math.floor(i / 3) * 100;
      const best = bestRank(fam, p.level);
      const shown = best ?? fam.ranks[0];
      const next = nextRank(fam, p.level);
      const picked = !!best && p.spells!.includes(fam.id);
      const g = this.add.graphics();
      g.fillStyle(best ? FX_COLOR[shown.fx] : 0x241e30, best ? 0.85 : 1).fillRoundedRect(x, y, CW, CH, 8);
      g.lineStyle(picked ? 4 : 2, picked ? 0xffd24a : 0x5b4a82, 1).strokeRoundedRect(x, y, CW, CH, 8);
      c.add(g);
      const name = txt(this, x + 10, y + 6, `${picked ? '✔ ' : ''}${best ? spellLabel(list, best) : familyName(tr(shown.name))}`, 17, best ? '#ffffff' : C.dim);
      for (let size = 16; name.width > CW - 86 && size >= 12; size--) name.setFontSize(size);
      c.add(name);
      c.add(txt(this, x + CW - 10, y + 8, best ? tr('{mp} MP', { mp: shown.mp }) : tr('Level {n}', { n: shown.unlock }), 14, best ? '#ffe9a0' : '#ff9a9a').setOrigin(1, 0));
      // School and what it does: at most two lines.
      const desc = txt(this, x + 10, y + 29, `${tr(FX_NAME[shown.fx])}  -  ${tr(shown.desc)}`, 13, best ? '#e8e0ff' : '#6a6080', { wordWrap: { width: CW - 20 }, maxLines: 2 });
      c.add(desc);
      // Bottom line: how strong it is right now, and the next rank.
      const parts: string[] = [];
      if (best) {
        parts.push(this.effectText(best, stats.power, stats.maxHp));
        if (fam.ranks.length > 1) parts.push(tr('Rank {r} of {n}', { r: fam.ranks.indexOf(best) + 1, n: fam.ranks.length }));
        if (next) parts.push(tr('next at level {n}', { n: next.unlock }));
      } else parts.push(tr('Unlocks at level {n}', { n: shown.unlock }));
      const info = txt(this, x + 10, y + CH - 18, parts.join('  \u00b7  '), 12, best ? '#ffe066' : '#6a6080').setOrigin(0, 0.5);
      // Long lines (French) shrink; if still too long, leave out "next at level".
      for (let size = 11; info.width > CW - 20 && size >= 10; size--) info.setFontSize(size);
      if (info.width > CW - 20 && next) info.setText(parts.slice(0, -1).join('  \u00b7  '));
      c.add(info);
      if (!best) return;
      c.add(this.add.zone(x, y, CW, CH).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (picked) return remove(fam.id);
        if (p.spells!.length >= MAX_CHOSEN) return toast(this, tr('All 3 slots are full. Tap a slot at the top to remove one.'), C.bad);
        p.spells = [...p.spells!, fam.id];
        sfx('equip');
        this.draw();
      }));
    });
  }

  /** "~45 damage", "~30 to each enemy", "Heals ~60", "Pet with ~70 health". */
  private effectText(sk: SkillDef, power: number, maxHp: number): string {
    switch (sk.kind) {
      case 'heal':
        return tr('Heals ~{n}', { n: fmtNum(Math.round(maxHp * sk.power)) });
      case 'summon':
        return tr('Pet with ~{n} health', { n: fmtNum(Math.round(maxHp * petHealthShare(sk))) });
      case 'aoe':
        return tr('~{n} to each enemy', { n: fmtNum(Math.round(power * sk.power)) });
      default:
        return tr('~{n} damage', { n: fmtNum(Math.round(power * sk.power)) });
    }
  }
}
