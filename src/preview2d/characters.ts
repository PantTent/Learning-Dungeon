// Heroes and monsters drawn in layers, so every piece of equipped gear
// shows on the character and changes with its rarity.
import { ellipse, rr, shade, tint, type Ctx } from './paint';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ClassId = 'knight' | 'ranger' | 'mage';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** Metal / cloth colors for each rarity. */
const METAL: Record<Rarity, string> = {
  common: '#9aa0a8',
  uncommon: '#7cc06a',
  rare: '#5a8ee8',
  epic: '#a86ae8',
  legendary: '#f2c03a',
};

export interface Look {
  cls: ClassId;
  helm: Rarity;
  chest: Rarity;
  gloves: Rarity;
  boots: Rarity;
  weapon: Rarity;
}

const rank = (r: Rarity) => RARITIES.indexOf(r);
const SKIN = '#f2c8a0';

/** 96x96 hero facing the viewer, slightly turned right. Feet at y ~ 88. */
export function drawHero(c: Ctx, L: Look) {
  const metal = (r: Rarity) => METAL[r];
  // Cape (legendary chest) behind everything
  if (rank(L.chest) >= 4) {
    c.beginPath();
    c.moveTo(34, 40);
    c.quadraticCurveTo(22, 70, 26, 84);
    c.lineTo(70, 84);
    c.quadraticCurveTo(74, 70, 62, 40);
    c.closePath();
    shade(c, '#c8322a', '#7a1414', 40, 84);
  }
  // Ranger quiver / mage nothing
  if (L.cls === 'ranger') {
    rr(c, 56, 30, 10, 28, 3);
    shade(c, '#8a5a2a', '#4a2a10', 30, 58);
    c.strokeStyle = '#e8e0d0';
    c.lineWidth = 2;
    for (const x of [58, 61, 64]) {
      c.beginPath();
      c.moveTo(x, 30);
      c.lineTo(x - 1, 22);
      c.stroke();
    }
  }

  // Legs + boots
  for (const x of [38, 52]) {
    rr(c, x, 62, 10, 16, 3);
    shade(c, '#4a3a2e', '#2a201a', 62, 78);
    rr(c, x - 2, 74, 14, 12, 4);
    shade(c, rank(L.boots) ? tint(metal(L.boots), 0.1) : '#6a4a2a', rank(L.boots) ? tint(metal(L.boots), -0.35) : '#3a2614', 74, 86);
    if (rank(L.boots) >= 3) {
      c.fillStyle = '#f8e070';
      c.fillRect(x - 1, 75, 12, 2);
    }
  }

  // Body: robe for mage, tunic + armor for others
  const tunic = L.cls === 'ranger' ? '#4a7a3a' : L.cls === 'mage' ? '#3a5ab8' : '#a83a32';
  if (L.cls === 'mage') {
    c.beginPath();
    c.moveTo(34, 40);
    c.lineTo(62, 40);
    c.lineTo(68, 80);
    c.lineTo(28, 80);
    c.closePath();
    shade(c, tint(rank(L.chest) ? metal(L.chest) : tunic, 0.05), tint(rank(L.chest) ? metal(L.chest) : tunic, -0.4), 40, 80);
    c.fillStyle = '#e8c860';
    c.fillRect(45, 42, 6, 38);
  } else {
    rr(c, 32, 38, 32, 28, 9);
    shade(c, tint(tunic, 0.1), tint(tunic, -0.35), 38, 66);
    if (rank(L.chest) >= 1 || L.cls === 'knight') {
      // Breastplate
      c.beginPath();
      c.moveTo(34, 40);
      c.quadraticCurveTo(48, 34, 62, 40);
      c.lineTo(60, 58);
      c.quadraticCurveTo(48, 64, 36, 58);
      c.closePath();
      shade(c, tint(metal(L.chest), 0.35), tint(metal(L.chest), -0.35), 36, 62);
      c.strokeStyle = 'rgba(255,255,255,0.6)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(40, 44);
      c.quadraticCurveTo(44, 41, 48, 42);
      c.stroke();
    }
    rr(c, 32, 58, 32, 6, 2);
    shade(c, '#5a3a1a', '#2a1a0a', 58, 64, '#140c06', 2);
    c.fillStyle = '#e8c048';
    c.fillRect(45, 58, 6, 6);
  }
  // Shoulder pads (epic+)
  if (rank(L.chest) >= 3) {
    for (const x of [30, 66]) {
      ellipse(c, x, 42, 9, 7);
      shade(c, tint(metal(L.chest), 0.4), tint(metal(L.chest), -0.3), 35, 49);
      if (rank(L.chest) >= 4) {
        c.fillStyle = '#fff2a0';
        ellipse(c, x, 40, 3, 2);
        c.fill();
      }
    }
  }

  // Off-hand: knight shield on the left
  if (L.cls === 'knight') {
    c.beginPath();
    c.moveTo(16, 44);
    c.lineTo(36, 44);
    c.lineTo(36, 62);
    c.quadraticCurveTo(26, 72, 16, 62);
    c.closePath();
    shade(c, tint(metal(L.chest), 0.2), tint(metal(L.chest), -0.4), 44, 70);
    c.fillStyle = rank(L.chest) >= 3 ? '#fff2a0' : '#c83a2a';
    c.fillRect(24, 48, 4, 16);
    c.fillRect(19, 53, 14, 4);
  }

  // Arms + gloves
  for (const [x, flip] of [[28, -1], [64, 1]] as const) {
    if (L.cls === 'knight' && flip === -1) continue; // behind the shield
    rr(c, x - 4, 42, 9, 18, 4);
    shade(c, tint(tunic, 0.05), tint(tunic, -0.4), 42, 60);
    ellipse(c, x + 0.5, 62, 5.5, 5);
    shade(c, rank(L.gloves) ? tint(metal(L.gloves), 0.2) : SKIN, rank(L.gloves) ? tint(metal(L.gloves), -0.35) : tint(SKIN, -0.25), 57, 67);
  }

  // Weapon in the right hand
  const wm = metal(L.weapon);
  if (L.cls === 'knight') {
    c.save();
    c.translate(66, 62);
    c.rotate(-0.5);
    rr(c, -3, -46, 6, 42, 2);
    shade(c, '#ffffff', rank(L.weapon) >= 2 ? wm : '#a8b0bc', -46, -4, '#1a1424', 2);
    rr(c, -10, -6, 20, 5, 2);
    shade(c, tint(wm, 0.2), tint(wm, -0.3), -6, -1, '#1a1424', 2);
    rr(c, -2, -1, 4, 10, 1);
    shade(c, '#6a4020', '#3a2010', -1, 9, '#1a1424', 1.5);
    c.restore();
  } else if (L.cls === 'ranger') {
    c.strokeStyle = '#1a1424';
    c.lineWidth = 6;
    c.beginPath();
    c.arc(60, 54, 24, -1.2, 1.2);
    c.stroke();
    c.strokeStyle = rank(L.weapon) ? wm : '#9a6a3a';
    c.lineWidth = 3.5;
    c.stroke();
    c.strokeStyle = '#f0f0f0';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(60 + Math.cos(-1.2) * 24, 54 + Math.sin(-1.2) * 24);
    c.lineTo(60 + Math.cos(1.2) * 24, 54 + Math.sin(1.2) * 24);
    c.stroke();
  } else {
    rr(c, 66, 20, 5, 64, 2);
    shade(c, '#8a5a32', '#4a2a12', 20, 84, '#1a1424', 2);
    const g = c.createRadialGradient(68, 18, 1, 68, 18, 12);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, rank(L.weapon) ? wm : '#7ad8ff');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    ellipse(c, 68, 18, 12, 12);
    c.fill();
  }

  // Head
  ellipse(c, 48, 28, 15, 14);
  shade(c, tint(SKIN, 0.1), tint(SKIN, -0.2), 14, 42);
  for (const x of [43, 54]) {
    ellipse(c, x, 30, 2.2, 3);
    c.fillStyle = '#1a1424';
    c.fill();
    c.fillStyle = '#fff';
    c.fillRect(x, 28, 1.2, 1.2);
  }
  c.fillStyle = 'rgba(240,120,120,0.45)';
  ellipse(c, 39, 35, 3, 2);
  c.fill();
  ellipse(c, 58, 35, 3, 2);
  c.fill();

  // Headgear by class + rarity
  const hr = rank(L.helm);
  if (L.cls === 'mage') {
    const hat = hr ? metal(L.helm) : '#3a5ab8';
    c.beginPath();
    c.moveTo(30, 22);
    c.quadraticCurveTo(46, -6, 60, 0);
    c.quadraticCurveTo(54, 8, 64, 22);
    c.closePath();
    shade(c, tint(hat, 0.15), tint(hat, -0.35), 0, 22);
    ellipse(c, 47, 22, 21, 5);
    shade(c, tint(hat, 0.05), tint(hat, -0.4), 17, 27);
    if (hr >= 3) {
      c.fillStyle = '#fff2a0';
      ellipse(c, 50, 12, 3, 3);
      c.fill();
    }
  } else if (L.cls === 'ranger' && hr === 0) {
    c.beginPath();
    c.arc(48, 26, 17, Math.PI, 0);
    c.lineTo(64, 34);
    c.quadraticCurveTo(48, 20, 32, 34);
    c.closePath();
    shade(c, '#5a8a3a', '#2a4a1a', 9, 34);
  } else {
    // Helmet
    const hm = hr || L.cls === 'knight' ? metal(L.helm) : '#6a4a2a';
    c.beginPath();
    c.arc(48, 27, 17, Math.PI * 1.02, -0.02 * Math.PI);
    c.lineTo(65, 33);
    c.lineTo(31, 33);
    c.closePath();
    shade(c, tint(hm, 0.35), tint(hm, -0.35), 10, 33);
    if (L.cls === 'knight') {
      // visor slit
      c.fillStyle = '#14101c';
      rr(c, 38, 25, 20, 4, 2);
      c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(48, 27, 12, Math.PI * 1.15, Math.PI * 1.45);
    c.stroke();
    if (hr >= 2) {
      // plume
      c.beginPath();
      c.moveTo(48, 10);
      c.quadraticCurveTo(66, 0, 72, 16);
      c.quadraticCurveTo(62, 10, 50, 14);
      c.closePath();
      shade(c, hr >= 4 ? '#ff5a4a' : '#e84a6a', hr >= 4 ? '#a81a1a' : '#8a1a3a', 0, 16);
    }
    if (hr >= 4) {
      // little crown + gem
      c.beginPath();
      c.moveTo(38, 12);
      c.lineTo(41, 4);
      c.lineTo(45, 10);
      c.lineTo(48, 2);
      c.lineTo(51, 10);
      c.lineTo(55, 4);
      c.lineTo(58, 12);
      c.closePath();
      shade(c, '#fff2a0', '#d8a020', 2, 12, '#5a3a08', 2);
      c.fillStyle = '#ff3a6a';
      ellipse(c, 48, 9, 2.5, 2.5);
      c.fill();
    }
  }
}

// ------------------------------------------------------------------ monsters (96x96, feet at ~88)

export function drawSkeleton(c: Ctx) {
  const bone = (path: () => void, y0: number, y1: number) => {
    path();
    shade(c, '#fbf6e8', '#b8b0a0', y0, y1, '#1a1424', 2.5);
  };
  for (const x of [40, 54]) bone(() => rr(c, x, 62, 6, 24, 3), 62, 86);
  bone(() => rr(c, 38, 40, 22, 22, 6), 40, 62);
  c.strokeStyle = '#6a6458';
  c.lineWidth = 2;
  for (const y of [46, 51, 56]) {
    c.beginPath();
    c.moveTo(41, y);
    c.lineTo(57, y);
    c.stroke();
  }
  for (const x of [30, 62]) bone(() => rr(c, x, 42, 6, 22, 3), 42, 64);
  // rusty axe
  c.save();
  c.translate(68, 60);
  c.rotate(-0.4);
  rr(c, -2, -34, 4, 40, 1);
  shade(c, '#6a4a2a', '#3a2410', -34, 6, '#1a1424', 2);
  c.beginPath();
  c.moveTo(2, -34);
  c.quadraticCurveTo(18, -28, 14, -14);
  c.lineTo(2, -18);
  c.closePath();
  shade(c, '#c08050', '#7a4a2a', -34, -14, '#1a1424', 2);
  c.restore();
  // skull
  ellipse(c, 49, 26, 15, 15);
  shade(c, '#fffaf0', '#c8c0b0', 11, 41, '#1a1424', 3);
  for (const x of [43, 55]) {
    ellipse(c, x, 26, 4, 5);
    c.fillStyle = '#1a1018';
    c.fill();
    ellipse(c, x, 26, 1.5, 1.5);
    c.fillStyle = '#ffb04a';
    c.fill();
  }
  c.fillStyle = '#1a1018';
  for (let i = 0; i < 4; i++) c.fillRect(43 + i * 4, 35, 2, 4);
}

export function drawGoblin(c: Ctx) {
  for (const x of [40, 52]) {
    rr(c, x, 64, 9, 20, 4);
    shade(c, '#5a8a3a', '#2a4a1a', 64, 84);
  }
  rr(c, 34, 42, 30, 26, 10);
  shade(c, '#7a5a3a', '#4a3020', 42, 68);
  for (const x of [26, 64]) {
    ellipse(c, x + 4, 56, 6, 6);
    shade(c, '#8ac85a', '#4a8a2a', 50, 62);
  }
  c.save();
  c.translate(70, 58);
  c.rotate(0.6);
  c.beginPath();
  c.moveTo(-2, 0);
  c.lineTo(0, -24);
  c.lineTo(3, 0);
  c.closePath();
  shade(c, '#ffffff', '#9aa0aa', -24, 0, '#1a1424', 2);
  c.restore();
  // big ears
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(49 + s * 10, 26);
    c.lineTo(49 + s * 30, 14);
    c.lineTo(49 + s * 12, 36);
    c.closePath();
    shade(c, '#9ad86a', '#5a9a3a', 14, 36);
  }
  ellipse(c, 49, 30, 15, 13);
  shade(c, '#9ad86a', '#5a9a3a', 17, 43);
  for (const x of [43, 55]) {
    ellipse(c, x, 28, 3.5, 4);
    c.fillStyle = '#fff6a0';
    c.fill();
    ellipse(c, x + 1, 29, 1.5, 2);
    c.fillStyle = '#1a1424';
    c.fill();
  }
  c.strokeStyle = '#1a1424';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(42, 37);
  c.quadraticCurveTo(49, 41, 56, 37);
  c.stroke();
  c.fillStyle = '#fff';
  c.fillRect(44, 37, 3, 3);
  c.fillRect(52, 37, 3, 3);
}

export function drawSlime(c: Ctx) {
  c.beginPath();
  c.moveTo(20, 84);
  c.quadraticCurveTo(14, 50, 48, 40);
  c.quadraticCurveTo(82, 50, 76, 84);
  c.closePath();
  const g = c.createRadialGradient(40, 54, 4, 48, 66, 40);
  g.addColorStop(0, '#c8ff9a');
  g.addColorStop(0.5, '#6ad04a');
  g.addColorStop(1, '#2a7a2a');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = '#123a12';
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.75)';
  ellipse(c, 36, 54, 7, 4);
  c.fill();
  for (const x of [40, 56]) {
    ellipse(c, x, 66, 4, 6);
    c.fillStyle = '#123a12';
    c.fill();
    c.fillStyle = '#fff';
    c.fillRect(x - 1, 62, 2, 2);
  }
}

export function drawRat(c: Ctx) {
  c.strokeStyle = '#d88a8a';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(24, 76);
  c.quadraticCurveTo(8, 70, 12, 56);
  c.stroke();
  ellipse(c, 44, 72, 22, 14);
  shade(c, '#9a7a6a', '#5a4038', 58, 86);
  ellipse(c, 66, 66, 13, 11);
  shade(c, '#a8887a', '#6a4a40', 55, 77);
  ellipse(c, 62, 54, 6, 7);
  shade(c, '#e8a8a8', '#a86a6a', 47, 61);
  ellipse(c, 78, 68, 3, 3);
  c.fillStyle = '#ff8a9a';
  c.fill();
  ellipse(c, 69, 63, 2.5, 3);
  c.fillStyle = '#ff3a3a';
  c.fill();
}
