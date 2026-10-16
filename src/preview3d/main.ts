// 3D art-style preview: a chibi, toon-shaded hero whose equipment is
// visible on the model and changes with rarity, in a bright arena.
// This is a standalone test page (preview3d.html), not part of the game yet.
import * as THREE from 'three';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type ClassId = 'ranger' | 'warrior' | 'mage';

const RARITY_COLOR: Record<Rarity, number> = {
  common: 0x9a8a7a,
  uncommon: 0x4fae4a,
  rare: 0x3a7ae0,
  epic: 0x9a4ae0,
  legendary: 0xffb020,
};
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// ------------------------------------------------------------------ renderer / scene

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd8ff);
scene.fog = new THREE.Fog(0x8fd8ff, 28, 55);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
// Archero-style: high, angled view looking down at the arena.
const FAR_VIEW = { pos: new THREE.Vector3(0, 12, 11), look: new THREE.Vector3(0, 0, 0.5) };
const CLOSE_VIEW = { pos: new THREE.Vector3(0, 3.6, 7.6), look: new THREE.Vector3(0, 1.1, 3) };
let closeUp = false;
camera.position.copy(FAR_VIEW.pos);
camera.lookAt(FAR_VIEW.look);
const camLook = FAR_VIEW.look.clone();

scene.add(new THREE.HemisphereLight(0xffffff, 0x6a9a4a, 1.6));
const sun = new THREE.DirectionalLight(0xfff2d0, 2.4);
sun.position.set(-6, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 });
scene.add(sun);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Cartoon shading: 3 flat bands of light instead of smooth gradients.
const toonRamp = (() => {
  const data = new Uint8Array([90, 170, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

function toon(color: number, emissive = 0x000000, emissiveIntensity = 0): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp, emissive, emissiveIntensity });
}

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1424, side: THREE.BackSide });

/** A toon mesh with a thin dark outline (inverted hull), casting shadows. */
function part(geo: THREE.BufferGeometry, mat: THREE.Material, outline = 0.06): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  g.add(m);
  if (outline > 0) {
    const o = new THREE.Mesh(geo, outlineMat);
    o.scale.setScalar(1 + outline);
    g.add(o);
  }
  return g;
}

// ------------------------------------------------------------------ arena

function buildArena() {
  const tiles = new THREE.Group();
  const a = toon(0x8ed85a);
  const b = toon(0x7ccb4c);
  const tileGeo = new THREE.BoxGeometry(1, 0.3, 1);
  for (let x = -6; x < 6; x++) {
    for (let z = -7; z < 7; z++) {
      const t = new THREE.Mesh(tileGeo, (x + z) & 1 ? a : b);
      t.position.set(x + 0.5, -0.15, z + 0.5);
      t.receiveShadow = true;
      tiles.add(t);
    }
  }
  scene.add(tiles);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), toon(0x5aa83c));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.31;
  ground.receiveShadow = true;
  scene.add(ground);

  // Chunky stone blocks in the corners.
  const stone = toon(0xc8d0c8);
  for (const [x, z] of [[-5.5, -6.5], [5.5, -6.5], [-5.5, 6.5], [5.5, 6.5], [-4.5, -6.5], [4.5, 6.5], [-5.5, -5.5], [5.5, 5.5]]) {
    const s = part(new THREE.BoxGeometry(0.95, 0.9, 0.95), stone, 0.03);
    s.position.set(x, 0.45, z);
    scene.add(s);
  }

  // Round cartoon trees around the edge.
  const leaf = [toon(0x3fae4a), toon(0x2f9a3f), toon(0x56c04f)];
  const trunk = toon(0x8a5a32);
  for (let i = 0; i < 26; i++) {
    const ang = (i / 26) * Math.PI * 2;
    const r = 9.5 + (i % 3) * 1.4;
    const tree = new THREE.Group();
    const t = part(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 8), trunk, 0.04);
    t.position.y = 0.7;
    tree.add(t);
    const c = part(new THREE.IcosahedronGeometry(1.1 + (i % 2) * 0.3, 1), leaf[i % 3], 0.04);
    c.position.y = 2;
    tree.add(c);
    tree.position.set(Math.cos(ang) * r * 0.75, 0, Math.sin(ang) * r);
    scene.add(tree);
  }
  // Mushrooms and flowers for decoration.
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Group();
    const stem = part(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 8), toon(0xfff2e0), 0.05);
    stem.position.y = 0.1;
    const cap = part(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xe04040), 0.05);
    cap.position.y = 0.2;
    m.add(stem, cap);
    m.position.set(-5 + ((i * 3.7) % 10), 0, -6 + ((i * 5.3) % 12));
    scene.add(m);
  }
}

// ------------------------------------------------------------------ hero

interface HeroLook {
  cls: ClassId;
  helm: Rarity;
  chest: Rarity;
  weapon: Rarity;
  boots: Rarity;
  gloves: Rarity;
}

let hero = new THREE.Group();
let weaponPivot = new THREE.Group();
let cape: THREE.Mesh | null = null;
const sparkles: THREE.Mesh[] = [];

function buildHero(look: HeroLook): THREE.Group {
  const g = new THREE.Group();
  sparkles.length = 0;
  cape = null;
  const skin = toon(0xffd2b0);
  const rank = (r: Rarity) => RARITIES.indexOf(r);
  const glow = (r: Rarity) => (rank(r) >= 3 ? 0.35 : 0);
  const gearMat = (r: Rarity) => toon(RARITY_COLOR[r], RARITY_COLOR[r], glow(r));
  const cloth = { ranger: 0x5a7a3a, warrior: 0xb03a30, mage: 0x3a5ab0 }[look.cls];
  const pants = toon(0x5a4a3a);

  // Legs + boots
  for (const side of [-1, 1]) {
    const leg = part(new THREE.CapsuleGeometry(0.13, 0.25, 4, 8), pants);
    leg.position.set(side * 0.17, 0.33, 0);
    g.add(leg);
    const boot = part(new THREE.BoxGeometry(0.26, 0.2, 0.36), gearMat(look.boots));
    boot.position.set(side * 0.17, 0.1, 0.04);
    g.add(boot);
    if (rank(look.boots) >= 2) {
      const cuff = part(new THREE.TorusGeometry(0.13, 0.04, 6, 12), toon(0xffd24a), 0.05);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.set(side * 0.17, 0.24, 0);
      g.add(cuff);
    }
  }

  // Body (tunic colored by class, armor plate by chest rarity)
  const body = part(new THREE.CapsuleGeometry(0.33, 0.35, 6, 12), toon(cloth));
  body.position.y = 0.8;
  g.add(body);
  if (rank(look.chest) >= 1) {
    const plate = part(new THREE.SphereGeometry(0.36, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), gearMat(look.chest), 0.04);
    plate.position.y = 0.72;
    plate.scale.set(1, 0.9, 1);
    g.add(plate);
  }
  const belt = part(new THREE.TorusGeometry(0.34, 0.05, 6, 20), toon(0x5a3a1a), 0.04);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.62;
  g.add(belt);
  // Shoulder pads from epic chests up
  if (rank(look.chest) >= 3) {
    for (const side of [-1, 1]) {
      const pad = part(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), gearMat(look.chest), 0.06);
      pad.position.set(side * 0.38, 1.02, 0);
      pad.rotation.z = side * -0.4;
      g.add(pad);
    }
  }
  // Legendary cape
  if (rank(look.chest) >= 4) {
    const capeMat = toon(0xc02a2a);
    capeMat.side = THREE.DoubleSide;
    cape = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.85, 4, 6), capeMat);
    cape.position.set(0, 0.65, -0.33);
    cape.rotation.x = 0.15;
    cape.castShadow = true;
    g.add(cape);
  }

  // Arms + hands (gloves)
  for (const side of [-1, 1]) {
    const arm = part(new THREE.CapsuleGeometry(0.09, 0.28, 4, 8), toon(cloth));
    arm.position.set(side * 0.42, 0.78, 0.05);
    arm.rotation.z = side * 0.35;
    g.add(arm);
    const hand = part(new THREE.SphereGeometry(0.11, 12, 8), rank(look.gloves) >= 1 ? gearMat(look.gloves) : skin);
    hand.position.set(side * 0.5, 0.56, 0.12);
    g.add(hand);
  }

  // Big chibi head
  const head = new THREE.Group();
  head.position.y = 1.42;
  g.add(head);
  head.add(part(new THREE.SphereGeometry(0.42, 24, 18), skin, 0.04));
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), toon(0x1a1424));
    eye.position.set(side * 0.15, 0.02, 0.38);
    eye.scale.set(1, 1.35, 0.6);
    head.add(eye);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(side * 0.15 + 0.02, 0.06, 0.42);
    head.add(shine);
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), new THREE.MeshBasicMaterial({ color: 0xff9a9a, transparent: true, opacity: 0.7 }));
    blush.position.set(side * 0.25, -0.08, 0.36);
    blush.lookAt(side * 0.6, -0.1, 1.5);
    head.add(blush);
  }

  // Helmet / hood / hat by class and rarity
  const helmR = rank(look.helm);
  if (look.cls === 'mage') {
    const hat = part(new THREE.ConeGeometry(0.42, 0.75, 16), helmR >= 1 ? gearMat(look.helm) : toon(0x3a5ab0));
    hat.position.y = 0.5;
    hat.rotation.z = -0.15;
    head.add(hat);
    const brim = part(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 20), helmR >= 1 ? gearMat(look.helm) : toon(0x3a5ab0), 0.04);
    brim.position.y = 0.22;
    head.add(brim);
  } else if (helmR === 0) {
    const hair = part(new THREE.SphereGeometry(0.44, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), toon(look.cls === 'ranger' ? 0x3f8a3a : 0x6a4a2a), 0.04);
    hair.position.y = 0.04;
    hair.rotation.x = -0.25;
    head.add(hair);
  } else {
    const helm = part(new THREE.SphereGeometry(0.46, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), gearMat(look.helm), 0.04);
    helm.position.y = 0.02;
    helm.rotation.x = -0.2;
    head.add(helm);
    if (helmR >= 2) {
      // Crest / horns get fancier with rarity.
      for (const side of [-1, 1]) {
        const horn = part(new THREE.ConeGeometry(0.07, 0.3, 8), toon(helmR >= 4 ? 0xffe066 : 0xf0f0f0), 0.08);
        horn.position.set(side * 0.33, 0.32, 0);
        horn.rotation.z = side * -0.6;
        head.add(horn);
      }
    }
    if (helmR >= 4) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), toon(0xff3a6a, 0xff3a6a, 0.9));
      gem.position.set(0, 0.25, 0.4);
      head.add(gem);
    }
  }

  // Weapon in the right hand
  weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.5, 0.56, 0.12);
  g.add(weaponPivot);
  const wr = look.weapon;
  const wmat = gearMat(wr);
  if (look.cls === 'ranger') {
    const bow = part(new THREE.TorusGeometry(0.45, 0.045, 8, 20, Math.PI), wmat, 0.08);
    bow.rotation.z = -Math.PI / 2;
    bow.position.set(0.05, 0.1, 0.1);
    weaponPivot.add(bow);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    str.position.set(0.05, 0.1, 0.1);
    weaponPivot.add(str);
  } else if (look.cls === 'warrior') {
    const blade = part(new THREE.BoxGeometry(0.1, 0.85 + rank(wr) * 0.08, 0.04), toon(0xe0e8f0, RARITY_COLOR[wr], glow(wr) + 0.1), 0.06);
    blade.position.y = 0.55;
    weaponPivot.add(blade);
    const guard = part(new THREE.BoxGeometry(0.34, 0.06, 0.08), wmat, 0.08);
    guard.position.y = 0.12;
    weaponPivot.add(guard);
    weaponPivot.rotation.z = -0.3;
    // Shield on the other arm
    const shield = part(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 20), gearMat(look.chest), 0.05);
    shield.rotation.x = Math.PI / 2;
    shield.position.set(-0.55, 0.65, 0.2);
    g.add(shield);
  } else {
    const staff = part(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8), toon(0x8a5a32), 0.08);
    staff.position.y = 0.35;
    weaponPivot.add(staff);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13 + rank(wr) * 0.015, 1), toon(RARITY_COLOR[wr], RARITY_COLOR[wr], 0.6 + glow(wr)));
    orb.position.y = 1.05;
    weaponPivot.add(orb);
  }

  // Legendary sparkle aura
  const legendaryCount = [look.helm, look.chest, look.weapon, look.boots, look.gloves].filter((r) => r === 'legendary').length;
  for (let i = 0; i < legendaryCount * 4; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    s.userData.phase = Math.random() * Math.PI * 2;
    s.userData.r = 0.6 + Math.random() * 0.3;
    g.add(s);
    sparkles.push(s);
  }

  // Soft blob shadow + rarity ring under the hero
  const best = RARITIES[Math.max(...[look.helm, look.chest, look.weapon].map(rank))];
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 32), new THREE.MeshBasicMaterial({ color: RARITY_COLOR[best], transparent: true, opacity: 0.7 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  g.add(ring);
  return g;
}

// ------------------------------------------------------------------ monsters

const monsters: THREE.Group[] = [];

function slime(color: number): THREE.Group {
  const g = new THREE.Group();
  const body = part(new THREE.SphereGeometry(0.55, 20, 14), toon(color), 0.05);
  body.scale.set(1, 0.75, 1);
  body.position.y = 0.4;
  g.add(body);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), toon(0x1a1424));
    eye.position.set(side * 0.18, 0.5, 0.45);
    eye.scale.set(1, 1.4, 0.6);
    g.add(eye);
  }
  g.userData.hp = 100;
  return g;
}

function treant(): THREE.Group {
  const g = new THREE.Group();
  const trunk = part(new THREE.CylinderGeometry(0.45, 0.6, 1.4, 10), toon(0x7a5030), 0.04);
  trunk.position.y = 0.7;
  g.add(trunk);
  const crown = part(new THREE.IcosahedronGeometry(0.95, 1), toon(0x3f9a3a), 0.04);
  crown.position.y = 1.85;
  g.add(crown);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon(0xfff27a, 0xfff27a, 0.9));
    eye.position.set(side * 0.2, 1.0, 0.5);
    g.add(eye);
    const arm = part(new THREE.CylinderGeometry(0.08, 0.12, 0.9, 6), toon(0x7a5030), 0.06);
    arm.position.set(side * 0.7, 0.9, 0);
    arm.rotation.z = side * 0.9;
    g.add(arm);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 6, 12, Math.PI), toon(0x2a1a10));
  mouth.position.set(0, 0.72, 0.55);
  mouth.rotation.z = Math.PI;
  g.add(mouth);
  g.userData.hp = 200;
  return g;
}

// ------------------------------------------------------------------ UI

const look: HeroLook = { cls: 'ranger', helm: 'common', chest: 'common', weapon: 'common', boots: 'common', gloves: 'common' };

function rebuildHero() {
  scene.remove(hero);
  hero = buildHero(look);
  hero.position.set(0, 0, 3);
  hero.scale.setScalar(1.35);
  scene.add(hero);
  drawUi();
}

function drawUi() {
  const ui = document.getElementById('ui')!;
  ui.innerHTML = '';
  const row = (items: [string, string, () => void][]) => {
    const r = document.createElement('div');
    r.className = 'row';
    for (const [label, cls, fn] of items) {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = cls;
      b.onclick = fn;
      r.appendChild(b);
    }
    ui.appendChild(r);
  };
  row((['ranger', 'warrior', 'mage'] as ClassId[]).map((c) => [c[0].toUpperCase() + c.slice(1), look.cls === c ? 'on' : '', () => { look.cls = c; rebuildHero(); }]));
  row(RARITIES.map((r) => [`${r[0].toUpperCase() + r.slice(1)} set`, `r-${r}`, () => { Object.assign(look, { helm: r, chest: r, weapon: r, boots: r, gloves: r }); rebuildHero(); }]));
  row([
    [`Helm: ${look.helm}`, `r-${look.helm}`, () => cycle('helm')],
    [`Armor: ${look.chest}`, `r-${look.chest}`, () => cycle('chest')],
    [`Weapon: ${look.weapon}`, `r-${look.weapon}`, () => cycle('weapon')],
    [`Gloves: ${look.gloves}`, `r-${look.gloves}`, () => cycle('gloves')],
    [`Boots: ${look.boots}`, `r-${look.boots}`, () => cycle('boots')],
    [closeUp ? 'Far view' : 'Close-up', '', () => { closeUp = !closeUp; drawUi(); }],
    ['Attack!', 'attack', attack],
  ]);
}

function cycle(slot: 'helm' | 'chest' | 'weapon' | 'boots' | 'gloves') {
  look[slot] = RARITIES[(RARITIES.indexOf(look[slot]) + 1) % RARITIES.length];
  rebuildHero();
}

// ------------------------------------------------------------------ attack effects

const effects: { obj: THREE.Object3D; t: number; update: (t: number) => boolean }[] = [];

function floatNumber(pos: THREE.Vector3, text: string, color: string) {
  const v = pos.clone().project(camera);
  const el = document.createElement('div');
  el.className = 'dmg';
  el.textContent = text;
  el.style.color = color;
  el.style.left = `${((v.x + 1) / 2) * window.innerWidth - 30}px`;
  el.style.top = `${((1 - v.y) / 2) * window.innerHeight - 40}px`;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = 'translateY(-60px) scale(1.2)';
    el.style.opacity = '0';
  });
  setTimeout(() => el.remove(), 900);
}

function burst(at: THREE.Vector3, color: number) {
  for (let i = 0; i < 14; i++) {
    const p = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshBasicMaterial({ color }));
    p.position.copy(at);
    const vel = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).multiplyScalar(0.18);
    scene.add(p);
    effects.push({ obj: p, t: 0, update: (t) => { p.position.add(vel); vel.y -= 0.012; p.rotation.x += 0.2; return t < 40; } });
  }
}

function attack() {
  const target = monsters.find((m) => m.visible) ?? monsters[0];
  const from = hero.position.clone().add(new THREE.Vector3(0.5, 1, 0));
  const to = target.position.clone().add(new THREE.Vector3(0, 0.7, 0));
  hero.lookAt(target.position.x, 0, target.position.z);
  const rankSum = [look.helm, look.chest, look.weapon].reduce((s, r) => s + RARITIES.indexOf(r), 0);
  const dmg = 40 + rankSum * 25 + Math.floor(Math.random() * 20);
  const color = RARITY_COLOR[look.weapon];
  let proj: THREE.Object3D;
  if (look.cls === 'ranger') {
    proj = part(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), toon(0xe8d8a0), 0.1);
  } else if (look.cls === 'mage') {
    proj = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), toon(0xff7a2a, 0xff7a2a, 1));
  } else {
    // Warrior: sword sweep
    let t = 0;
    effects.push({ obj: weaponPivot, t: 0, update: () => { t++; weaponPivot.rotation.z = -0.3 - Math.sin((t / 14) * Math.PI) * 2.2; return t < 14; } });
    setTimeout(() => hit(target, dmg, color), 200);
    return;
  }
  proj.position.copy(from);
  proj.lookAt(to);
  proj.rotateX(Math.PI / 2);
  scene.add(proj);
  effects.push({
    obj: proj,
    t: 0,
    update: (t) => {
      proj.position.lerpVectors(from, to, Math.min(1, t / 18));
      if (t >= 18) {
        hit(target, dmg, color);
        return false;
      }
      return true;
    },
  });
}

function hit(target: THREE.Group, dmg: number, color: number) {
  burst(target.position.clone().add(new THREE.Vector3(0, 0.7, 0)), color);
  floatNumber(target.position.clone().add(new THREE.Vector3(0, 1.6, 0)), `-${dmg}`, dmg > 120 ? '#ffd24a' : '#ffffff');
  target.userData.squash = 1;
}

// ------------------------------------------------------------------ go

buildArena();
const s1 = slime(0x6ad04a);
s1.position.set(-2.5, 0, -3);
const s2 = slime(0x5ab0ff);
s2.position.set(2.8, 0, -1.5);
const boss = treant();
boss.position.set(0.3, 0, -5);
monsters.push(s1, s2, boss);
scene.add(s1, s2, boss);
rebuildHero();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  hero.position.y = Math.abs(Math.sin(t * 2.2)) * 0.06;
  // Close-up slowly turns the hero so you can see the gear from all sides.
  const wantRot = closeUp ? Math.sin(t * 0.5) * 1.2 : Math.sin(t * 0.4) * 0.5;
  hero.rotation.y += (wantRot - hero.rotation.y) * 0.03;
  const view = closeUp ? CLOSE_VIEW : FAR_VIEW;
  camera.position.lerp(view.pos, 0.06);
  camLook.lerp(view.look, 0.06);
  camera.lookAt(camLook);
  if (cape) cape.rotation.x = 0.15 + Math.sin(t * 3) * 0.08;
  sparkles.forEach((s) => {
    const a = t * 1.5 + s.userData.phase;
    s.position.set(Math.cos(a) * s.userData.r, 0.6 + Math.sin(a * 1.7) * 0.5 + 0.6, Math.sin(a) * s.userData.r);
    s.rotation.y = t * 3;
  });
  monsters.forEach((m, i) => {
    const squash = (m.userData.squash ?? 0) as number;
    const bounce = Math.abs(Math.sin(t * 2.5 + i));
    m.scale.set(1 + squash * 0.25 + (1 - bounce) * 0.08, 1 - squash * 0.25 + bounce * 0.06, 1 + squash * 0.25);
    m.userData.squash = Math.max(0, squash - 0.06);
  });
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.t++;
    if (!e.update(e.t)) {
      if (e.obj !== weaponPivot) scene.remove(e.obj);
      effects.splice(i, 1);
    }
  }
  renderer.render(scene, camera);
});

// For automated screenshots.
(window as unknown as { preview: unknown }).preview = { look, rebuildHero, attack, setClose: (v: boolean) => { closeUp = v; drawUi(); } };
