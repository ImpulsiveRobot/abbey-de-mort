// Abbaye de Mort — 3D Fortress perched on a 100-meter rocky outcrop in Central France
// Interconnected sectors:
// 1. Cliffside Approach (Z: +48..+24)
// 2. Gatehouse & Watchtowers (Z: +24..+21)
// 3. Grand Courtyard (Z: +21..+4, X: -14..+14)
// 4. Stained-Glass Abbey Nave (Z: +4..-16, X: -12..+12)
// 5. West Cloister Corridor & Side Rooms (Z: +18..-26, X: -22..-12)
// 6. Abbot's Scriptorium & Radio Sanctum (Z: -16..-29, X: -12..+12)
// 7. East Cliffside Terrace overlooking the 100m sheer rock face (Z: +18..-26, X: +12..+24)

import { MeshBuilder } from '../engine/renderer.js';

export const ZONES = [
  { id: 'approach',    name: 'Cliffside Approach',      minX: -8,  maxX: 8,   minZ: 23,  maxZ: 50 },
  { id: 'courtyard',   name: 'Abbey Courtyard',         minX: -14, maxX: 14,  minZ: 4,   maxZ: 23 },
  { id: 'nave',        name: 'Grand Nave',              minX: -12, maxX: 12,  minZ: -16, maxZ: 4 },
  { id: 'cloister',    name: 'West Cloister Corridors', minX: -23, maxX: -12, minZ: -26, maxZ: 20 },
  { id: 'sanctum',     name: "Abbot's Radio Sanctum",   minX: -12, maxX: 12,  minZ: -30, maxZ: -16 },
  { id: 'terrace',     name: '100m Cliffside Terrace',  minX: 12,  maxX: 25,  minZ: -26, maxZ: 20 },
];

export function getZoneAt(x, z) {
  for (const zn of ZONES) {
    if (x >= zn.minX && x <= zn.maxX && z >= zn.minZ && z <= zn.maxZ) return zn;
  }
  return { id: 'outcrop', name: 'Abbaye de Mort Outcrop' };
}

export function buildAbbeyWorld(gl) {
  const builders = {
    limestone: new MeshBuilder(),
    cobble: new MeshBuilder(),
    flagstone: new MeshBuilder(),
    stainedGlass: new MeshBuilder(),
    wood: new MeshBuilder(),
    cliff: new MeshBuilder(),
    sandbag: new MeshBuilder(),
    iron: new MeshBuilder(),
    bookshelf: new MeshBuilder(),
    radio: new MeshBuilder(),
    ground: new MeshBuilder(),
    white: new MeshBuilder(),
  };

  const colliders = [];
  const braziers = [];
  const interactables = [];

  function addSolidBox(tex, cx, cy, cz, sx, sy, sz, color = [1, 1, 1], uvScale = 0.25, opts = {}) {
    builders[tex].addBox(cx, cy, cz, sx, sy, sz, color, uvScale);
    if (!opts.noCollide) {
      colliders.push({
        minX: cx - sx * 0.5,
        maxX: cx + sx * 0.5,
        minY: cy - sy * 0.5,
        maxY: cy + sy * 0.5,
        minZ: cz - sz * 0.5,
        maxZ: cz + sz * 0.5,
        bulletsPass: Boolean(opts.bulletsPass),
        tag: opts.tag || '',
      });
    }
  }

  // Helper: wall with doorway gap along X (constant Z)
  function addWallX(tex, x1, x2, z, h, thick, doorCenter = null, doorW = 3.6, doorH = 3.6, tint = [1, 1, 1]) {
    if (doorCenter === null) {
      const cx = (x1 + x2) * 0.5;
      addSolidBox(tex, cx, h * 0.5, z, x2 - x1, h, thick, tint);
      return;
    }
    const d1 = doorCenter - doorW * 0.5;
    const d2 = doorCenter + doorW * 0.5;
    if (d1 > x1 + 0.1) addSolidBox(tex, (x1 + d1) * 0.5, h * 0.5, z, d1 - x1, h, thick, tint);
    if (x2 > d2 + 0.1) addSolidBox(tex, (d2 + x2) * 0.5, h * 0.5, z, x2 - d2, h, thick, tint);
    // Lintel arch above doorway
    if (h > doorH + 0.2) {
      addSolidBox(tex, doorCenter, doorH + (h - doorH) * 0.5, z, doorW, h - doorH, thick, tint);
    }
  }

  // Helper: wall with doorway gap(s) along Z (constant X)
  function addWallZ(tex, z1, z2, x, h, thick, doors = [], tint = [1, 1, 1]) {
    const sorted = [...doors].sort((a, b) => a.z - b.z);
    let cursor = z1;
    for (const d of sorted) {
      const start = d.z - d.w * 0.5;
      const end = d.z + d.w * 0.5;
      if (start > cursor + 0.1) {
        addSolidBox(tex, x, h * 0.5, (cursor + start) * 0.5, thick, h, start - cursor, tint);
      }
      const dh = d.h || 3.6;
      if (h > dh + 0.2) {
        addSolidBox(tex, x, dh + (h - dh) * 0.5, d.z, thick, h - dh, d.w, tint);
      }
      cursor = end;
    }
    if (z2 > cursor + 0.1) {
      addSolidBox(tex, x, h * 0.5, (cursor + z2) * 0.5, thick, h, z2 - cursor, tint);
    }
  }

  function addBrazier(x, z, color = [1.0, 0.58, 0.22], radius = 14, intensity = 1.45, y = 0) {
    builders.iron.addBox(x, y + 0.55, z, 0.45, 1.1, 0.45, [0.8, 0.8, 0.85], 0.8);
    builders.iron.addBox(x, y + 1.15, z, 0.78, 0.22, 0.78, [0.9, 0.85, 0.8], 0.8);
    braziers.push({ x, y: y + 1.45, z, color, radius, intensity, phase: x * 1.7 + z * 2.3 });
  }

  // =========================================================================
  // 1. THE 100-METER ROCKY OUTCROP & DISTANT CENTRAL FRANCE VALLEY
  // =========================================================================
  // Massive vertical cliff column supporting the Abbey (drops 100 meters!)
  addSolidBox('cliff', 0, -50.2, -3, 52, 100, 62, [0.78, 0.75, 0.72], 0.08, { noCollide: true });
  // Rocky approach spur
  addSolidBox('cliff', 0, -50.2, 36, 13.5, 100, 26, [0.74, 0.72, 0.68], 0.08, { noCollide: true });

  // Rugged cliff ledges along the sheer 100m East rock face (where the Resistance climbs!)
  const cliffLedges = [
    [25.6, -6, -6, 3.2, 5, 12],
    [26.2, -16, 4, 4.0, 7, 16],
    [25.8, -28, -14, 4.5, 9, 14],
    [27.0, -44, -2, 5.5, 14, 24],
    [28.5, -68, 6, 8.0, 22, 32],
    [25.4, -10, -18, 2.8, 4, 8],
    [-25.8, -14, -4, 4.0, 14, 22],
    [-27.0, -40, 8, 6.0, 22, 28],
    [0, -24, -33, 22, 16, 5],
  ];
  for (const [lx, ly, lz, sx, sy, sz] of cliffLedges) {
    builders.cliff.addBox(lx, ly, lz, sx, sy, sz, [0.7, 0.68, 0.64], 0.1);
  }

  // Far valley floor 100 meters below + distant rolling hills of Central France
  builders.ground.addBox(0, -100, 0, 520, 2, 520, [0.42, 0.48, 0.44], 0.02);
  const hills = [
    [130, -72, -40, 80, 55, 140],
    [145, -62, 65, 90, 72, 110],
    [-135, -68, -25, 85, 62, 160],
    [-125, -75, 90, 90, 48, 120],
    [10, -64, -155, 220, 68, 70],
    [25, -76, 155, 210, 44, 75],
  ];
  for (const [hx, hy, hz, sx, sy, sz] of hills) {
    builders.cliff.addBox(hx, hy, hz, sx, sy, sz, [0.42, 0.46, 0.5], 0.025);
  }

  // =========================================================================
  // 2. GROUND FLOORS ACROSS ALL PLAYABLE SECTORS
  // =========================================================================
  // Approach ridge path (Z: +23 to +49, X: -6 to +6)
  builders.cobble.addBox(0, -0.25, 36, 12.2, 0.5, 26, [0.9, 0.88, 0.86], 0.35);
  // Courtyard (Z: +4 to +23, X: -14 to +14)
  builders.cobble.addBox(0, -0.25, 13.5, 28, 0.5, 19, [0.95, 0.94, 0.92], 0.35);
  // Grand Nave (Z: -16 to +4, X: -12 to +12)
  builders.flagstone.addBox(0, -0.25, -6, 24, 0.5, 20, [0.96, 0.94, 0.9], 0.25);
  // Abbot's Radio Sanctum (Z: -29 to -16, X: -12 to +12)
  builders.flagstone.addBox(0, -0.25, -22.5, 24, 0.5, 13, [0.92, 0.89, 0.85], 0.28);
  // West Cloister Corridors (Z: -26 to +20, X: -22 to -12)
  builders.flagstone.addBox(-17, -0.25, -3, 10.5, 0.5, 46, [0.88, 0.86, 0.84], 0.3);
  // East 100m Cliffside Terrace (Z: -26 to +20, X: +12 to +24)
  builders.cobble.addBox(18, -0.25, -3, 12.5, 0.5, 46, [0.92, 0.9, 0.88], 0.35);

  // =========================================================================
  // 3. CLIFFSIDE APPROACH & GATEHOUSE (ACT I)
  // =========================================================================
  // Low stone parapets guarding the 100m sheer drops along approach path
  addSolidBox('limestone', -5.8, 0.7, 36, 0.7, 1.4, 25, [0.9, 0.88, 0.85], 0.3, { bulletsPass: true });
  addSolidBox('limestone',  5.8, 0.7, 36, 0.7, 1.4, 25, [0.9, 0.88, 0.85], 0.3, { bulletsPass: true });
  // South boundary barricade behind player spawn
  addSolidBox('sandbag', 0, 0.9, 48.5, 11.5, 1.8, 1.2, [0.9, 0.86, 0.8], 0.4);
  // Cover rocks/ruined masonry along approach
  addSolidBox('limestone', -2.6, 0.65, 38.5, 2.2, 1.3, 1.1, [0.85, 0.84, 0.82]);
  addSolidBox('sandbag', 2.4, 0.6, 32.5, 2.6, 1.2, 1.0, [0.95, 0.92, 0.86]);
  addSolidBox('limestone', -2.8, 0.7, 27.8, 2.0, 1.4, 1.1, [0.88, 0.86, 0.82]);

  // Imposing Gatehouse Wall (Z = 22.8) with wide arch (X = -3.4..+3.4)
  addWallX('limestone', -22.5, 24.5, 22.8, 7.2, 1.4, 0, 6.8, 4.6, [0.95, 0.93, 0.9]);
  // Twin Gatehouse Watchtowers flanking the arch
  addSolidBox('limestone', -5.4, 6.0, 22.8, 3.6, 12.0, 3.8, [0.92, 0.9, 0.87]);
  addSolidBox('limestone',  5.4, 6.0, 22.8, 3.6, 12.0, 3.8, [0.92, 0.9, 0.87]);
  // Battlement crenels atop towers
  for (const tx of [-5.4, 5.4]) {
    for (const dx of [-1.3, 0, 1.3]) {
      builders.limestone.addBox(tx + dx, 12.5, 24.3, 0.8, 1.0, 0.6, [0.9, 0.88, 0.85]);
      builders.limestone.addBox(tx + dx, 12.5, 21.3, 0.8, 1.0, 0.6, [0.9, 0.88, 0.85]);
    }
  }
  addBrazier(-4.2, 24.9);
  addBrazier( 4.2, 24.9);
  addBrazier(-4.2, 35.5);
  addBrazier( 4.2, 35.5);

  // =========================================================================
  // 4. GRAND COURTYARD (Z: +4 to +22)
  // =========================================================================
  // Ruined Gothic Stone Cross Monument in center of Courtyard
  addSolidBox('limestone', 0, 0.55, 13.0, 3.2, 1.1, 3.2, [0.92, 0.9, 0.87]);
  addSolidBox('limestone', 0, 2.7, 13.0, 0.85, 3.8, 0.85, [0.95, 0.93, 0.9]);
  builders.limestone.addBox(0, 3.6, 13.0, 2.4, 0.55, 0.55, [0.95, 0.93, 0.9]);
  // Tactical sandbag emplacements & wooden supply crates in Courtyard
  addSolidBox('sandbag', -6.8, 0.6, 16.5, 3.6, 1.2, 1.1, [0.95, 0.9, 0.82]);
  addSolidBox('sandbag',  6.8, 0.6, 16.5, 3.6, 1.2, 1.1, [0.95, 0.9, 0.82]);
  addSolidBox('sandbag', -5.5, 0.6, 8.2, 3.4, 1.2, 1.0, [0.95, 0.9, 0.82]);
  addSolidBox('sandbag',  5.5, 0.6, 8.2, 3.4, 1.2, 1.0, [0.95, 0.9, 0.82]);
  addSolidBox('wood', -8.8, 0.65, 12.2, 1.4, 1.3, 1.4, [0.9, 0.85, 0.8]);
  addSolidBox('wood',  9.2, 0.65, 11.0, 1.6, 1.3, 1.2, [0.9, 0.85, 0.8]);

  addBrazier(-8.5, 19.2);
  addBrazier( 8.5, 19.2);
  addBrazier(-5.2, 5.6);
  addBrazier( 5.2, 5.6);

  // =========================================================================
  // 5. GRAND NAVE (Z: +4 to -16, X: -12 to +12) — SOARING GOTHIC INTERIOR
  // =========================================================================
  // South Nave Facade Wall (Z = 4.0) with grand portal X = -3.4..+3.4
  addWallX('limestone', -12.5, 12.5, 4.0, 9.2, 1.2, 0, 6.8, 4.5, [0.96, 0.94, 0.9]);
  // Towering Abbey Bell Tower rising above South-West Nave corner (iconic silhouette!)
  builders.limestone.addBox(-11.0, 14.0, 3.5, 5.6, 16.0, 5.6, [0.9, 0.88, 0.85]);
  builders.limestone.addBox(-11.0, 23.0, 3.5, 4.6, 2.2, 4.6, [0.85, 0.83, 0.8]);
  // Bell hanging inside tower arch
  builders.iron.addBox(-11.0, 19.5, 3.5, 1.5, 1.8, 1.5, [0.75, 0.62, 0.38]);

  // Nave East Wall (X = +12) separating Nave & Courtyard from East Cliff Terrace
  // Doors: Z = +13 (Courtyard <-> Terrace), Z = -6 (Nave <-> Terrace), Z = -22 (Sanctum <-> Terrace)
  addWallZ('limestone', -29.0, 22.8, 12.0, 8.8, 1.1, [
    { z: 13.0, w: 4.4, h: 4.0 },
    { z: -6.0, w: 4.2, h: 4.2 },
    { z: -22.0, w: 3.8, h: 3.8 },
  ], [0.94, 0.92, 0.88]);

  // Nave West Wall (X = -12) separating Nave & Courtyard from West Cloister
  addWallZ('limestone', -29.0, 22.8, -12.0, 8.8, 1.1, [
    { z: 13.0, w: 4.4, h: 4.0 },
    { z: -6.0, w: 4.2, h: 4.2 },
    { z: -22.0, w: 3.8, h: 3.8 },
  ], [0.94, 0.92, 0.88]);

  // Gothic Nave Pillars (two majestic colonnades)
  for (const pz of [-0.5, -5.5, -10.5]) {
    addSolidBox('limestone', -6.8, 4.4, pz, 1.15, 8.8, 1.15, [0.96, 0.93, 0.88]);
    addSolidBox('limestone',  6.8, 4.4, pz, 1.15, 8.8, 1.15, [0.96, 0.93, 0.88]);
    // Overhead vaulted stone cross-beams
    builders.limestone.addBox(0, 8.6, pz, 23.0, 0.9, 0.95, [0.85, 0.82, 0.78]);
  }
  // Partially collapsed vaulted roof over Nave (lets dramatic storm clouds & dawn rays peek through!)
  builders.limestone.addBox(-6.5, 9.2, -6.0, 11.0, 0.7, 20.0, [0.76, 0.74, 0.72]);
  builders.limestone.addBox( 7.5, 9.2, -11.0, 9.0, 0.7, 10.0, [0.76, 0.74, 0.72]);
  builders.wood.addBox(3.5, 9.0, -2.0, 12.0, 0.35, 0.45, [0.75, 0.68, 0.6]);

  // Luminous Gothic Stained-Glass Windows mounted along Nave upper walls (emissive!)
  const glassPanels = [
    // West Nave interior face
    { p0: [-11.35, 2.4, -2.5], p1: [-11.35, 2.4, 1.0], p2: [-11.35, 7.6, 1.0], p3: [-11.35, 7.6, -2.5], n: [1, 0, 0] },
    { p0: [-11.35, 2.4, -13.5], p1: [-11.35, 2.4, -10.0], p2: [-11.35, 7.6, -10.0], p3: [-11.35, 7.6, -13.5], n: [1, 0, 0] },
    // East Nave interior face
    { p0: [11.35, 2.4, 1.0], p1: [11.35, 2.4, -2.5], p2: [11.35, 7.6, -2.5], p3: [11.35, 7.6, 1.0], n: [-1, 0, 0] },
    { p0: [11.35, 2.4, -10.0], p1: [11.35, 2.4, -13.5], p2: [11.35, 7.6, -13.5], p3: [11.35, 7.6, -10.0], n: [-1, 0, 0] },
    // Grand Rose Window above South Nave entry (facing North inside)
    { p0: [2.2, 4.8, 3.35], p1: [-2.2, 4.8, 3.35], p2: [-2.2, 8.6, 3.35], p3: [2.2, 8.6, 3.35], n: [0, 0, -1] },
    // Rose Window visible from Courtyard (facing South outside)
    { p0: [-2.2, 4.8, 4.65], p1: [2.2, 4.8, 4.65], p2: [2.2, 8.6, 4.65], p3: [-2.2, 8.6, 4.65], n: [0, 0, 1] },
  ];
  for (const gp of glassPanels) {
    builders.stainedGlass.addQuad(gp.p0, gp.p1, gp.p2, gp.p3, gp.n, [1, 1, 1], [1, 1]);
  }

  // Overturned & intact oak pews inside the Nave (cover for room-to-room fighting!)
  addSolidBox('wood', -4.0, 0.55, -2.5, 3.6, 1.1, 0.75, [0.92, 0.86, 0.8]);
  addSolidBox('wood',  4.0, 0.55, -2.5, 3.6, 1.1, 0.75, [0.92, 0.86, 0.8]);
  addSolidBox('wood', -4.2, 0.55, -8.2, 3.4, 1.1, 0.75, [0.92, 0.86, 0.8]);
  addSolidBox('wood',  4.2, 0.55, -8.2, 3.4, 1.1, 0.75, [0.92, 0.86, 0.8]);
  // Ruined Stone Altar at North end of Nave
  addSolidBox('limestone', 0, 0.6, -12.6, 4.2, 1.2, 1.5, [0.98, 0.95, 0.9]);
  addBrazier(-3.6, -12.6, [1.0, 0.65, 0.28], 16, 1.55);
  addBrazier( 3.6, -12.6, [1.0, 0.65, 0.28], 16, 1.55);

  // =========================================================================
  // 6. ABBOT'S SCRIPTORIUM & RADIO SANCTUM (Z: -16 to -29, X: -12 to +12)
  // =========================================================================
  // Dividing wall between Nave & Sanctum (Z = -16.0) with doorway X = -2.4..+2.4
  addWallX('limestone', -12.5, 12.5, -16.0, 7.6, 1.1, 0, 4.8, 3.8, [0.94, 0.91, 0.87]);
  // North Rear Abbey Wall (Z = -29.0)
  addSolidBox('limestone', 0, 3.8, -29.0, 47.0, 7.6, 1.2, [0.9, 0.88, 0.85]);
  // Sanctum ceiling
  builders.limestone.addBox(0, 7.6, -22.5, 24.0, 0.6, 13.5, [0.8, 0.77, 0.74]);
  // Ancient Abbey Bookshelves lining the Sanctum walls
  addSolidBox('bookshelf', -6.8, 2.2, -28.0, 6.2, 4.4, 0.85, [1, 1, 1], 0.35);
  addSolidBox('bookshelf',  6.8, 2.2, -28.0, 6.2, 4.4, 0.85, [1, 1, 1], 0.35);
  addSolidBox('bookshelf', -7.2, 2.2, -17.0, 5.4, 4.4, 0.85, [1, 1, 1], 0.35);
  addSolidBox('bookshelf',  7.2, 2.2, -17.0, 5.4, 4.4, 0.85, [1, 1, 1], 0.35);

  // Abbot's Oak Radio Desk + British B2 Shortwave Radio at (0, 0, -25.4)
  addSolidBox('wood', 0, 0.5, -25.4, 3.2, 1.0, 1.3, [0.95, 0.9, 0.82]);
  builders.radio.addBox(0, 1.32, -25.5, 1.15, 0.62, 0.68, [1, 1, 1], 0.9);
  // Radio antenna mast
  builders.iron.addBox(0.45, 2.6, -25.6, 0.05, 2.1, 0.05, [0.7, 0.75, 0.78]);
  // Warm Sanctum glow + green radio tube light
  braziers.push({ x: 0, y: 1.8, z: -25.2, color: [0.35, 1.0, 0.62], radius: 7.5, intensity: 0.95, phase: 4.1, steady: true });
  addBrazier(-5.2, -22.5, [1.0, 0.68, 0.32], 14, 1.35);
  addBrazier( 5.2, -22.5, [1.0, 0.68, 0.32], 14, 1.35);

  // =========================================================================
  // 7. WEST CLOISTER CORRIDOR & ROOMS (X: -22 to -12, Z: -28 to +22)
  // =========================================================================
  // Outer West Fortress Wall (X = -22.2) with narrow embrasures
  addSolidBox('limestone', -22.2, 3.4, -3.0, 1.2, 6.8, 52.0, [0.9, 0.88, 0.85]);
  // Cloister vaulted roof
  builders.limestone.addBox(-17.0, 6.8, -3.0, 10.5, 0.6, 51.0, [0.78, 0.76, 0.74]);
  // Partition arches dividing the West Cloister into fighting rooms (Cellar, Dormitory, Chapter House)
  addWallX('limestone', -22.0, -12.0, 5.5, 6.6, 0.9, -17.0, 3.6, 3.6, [0.92, 0.9, 0.86]);
  addWallX('limestone', -22.0, -12.0, -14.0, 6.6, 0.9, -17.0, 3.6, 3.6, [0.92, 0.9, 0.86]);
  // Cover crates & sandbags inside Cloister rooms
  addSolidBox('wood', -19.8, 0.6, 0.5, 1.8, 1.2, 1.4, [0.9, 0.85, 0.8]);
  addSolidBox('sandbag', -14.8, 0.58, -9.5, 2.8, 1.15, 1.0, [0.92, 0.88, 0.8]);
  addSolidBox('wood', -19.5, 0.6, -20.5, 1.8, 1.2, 1.8, [0.9, 0.85, 0.8]);
  addBrazier(-17.0, 12.0, [1.0, 0.6, 0.24], 13, 1.3);
  addBrazier(-17.0, -4.0, [1.0, 0.6, 0.24], 13, 1.3);
  addBrazier(-17.0, -20.0, [1.0, 0.6, 0.24], 13, 1.3);

  // =========================================================================
  // 8. EAST CLIFFSIDE TERRACE — 100-METER SHEER ROCK FACE OVERLOOK (X: +12..+24)
  // =========================================================================
  // Low crenellated stone parapet along X = +24.0 so you can gaze down 100m into the valley!
  addSolidBox('limestone', 24.0, 0.55, -3.0, 0.85, 1.1, 51.5, [0.92, 0.9, 0.86], 0.3, { bulletsPass: true });
  // Invisible safety rail above parapet so players can't accidentally jump off the 100m cliff
  colliders.push({ minX: 23.6, maxX: 24.8, minY: 1.0, maxY: 4.0, minZ: -29, maxZ: 23, bulletsPass: true, tag: 'cliff-guard' });
  // Battlement merlons along the 100m cliff edge
  for (let mz = -25; mz <= 19; mz += 4.0) {
    builders.limestone.addBox(24.0, 1.48, mz, 0.9, 0.82, 1.7, [0.92, 0.9, 0.86], 0.3);
  }
  // Tactical stone pillars & sandbag cover along the Terrace
  addSolidBox('sandbag', 18.2, 0.58, 5.5, 3.6, 1.16, 1.0, [0.94, 0.9, 0.84]);
  addSolidBox('sandbag', 18.2, 0.58, -13.5, 3.6, 1.16, 1.0, [0.94, 0.9, 0.84]);
  addSolidBox('wood', 15.2, 0.65, -2.5, 1.5, 1.3, 1.5, [0.88, 0.84, 0.78]);
  addBrazier(22.2, 11.0, [1.0, 0.56, 0.22], 15, 1.4);
  addBrazier(22.2, -6.0, [1.0, 0.56, 0.22], 15, 1.4);
  addBrazier(22.2, -21.0, [1.0, 0.56, 0.22], 15, 1.4);

  // =========================================================================
  // INTERACTABLE STORY OBJECTS & PICKUPS
  // =========================================================================
  interactables.push(
    {
      id: 'radio',
      x: 0, y: 1.3, z: -24.4,
      radius: 3.2,
      label: 'Transmit Troop Charts to London (SOE Wireless)',
      active: false,
      type: 'radio',
    },
    {
      id: 'abbot-rifle',
      x: 4.5, y: 0.8, z: -24.8,
      radius: 2.5,
      label: 'Take Abbot Henri\'s Hidden MAS-36 Rifle & Ammo',
      active: false,
      collected: false,
      type: 'weapon',
      weaponId: 'rifle',
    },
    {
      id: 'resistance-crate',
      x: 20.5, y: 0.8, z: -6.0,
      radius: 3.0,
      label: 'Claim Maquis Resupply Crate (Sten Mk II + Full Ammo)',
      active: false,
      collected: false,
      type: 'resupply',
    },
    {
      id: 'intel-order',
      x: -6.5, y: 0.9, z: 16.0,
      radius: 2.6,
      label: 'Inspect Captured German Border Breach Order',
      active: true,
      collected: false,
      type: 'lore',
      loreId: 'german_order',
    },
    {
      id: 'intel-chronicle',
      x: 0, y: 1.1, z: -12.0,
      radius: 2.6,
      label: 'Read 1412 Chronicle of Abbaye de Mort',
      active: true,
      collected: false,
      type: 'lore',
      loreId: 'abbey_chronicle',
    },
    {
      id: 'intel-cipher',
      x: -18.5, y: 0.9, z: -19.5,
      radius: 2.6,
      label: 'Recover Abbot\'s Hidden Maquis Flare Chart',
      active: true,
      collected: false,
      type: 'lore',
      loreId: 'maquis_chart',
    }
  );

  // Upload static batched world meshes
  const meshes = [];
  for (const [texName, builder] of Object.entries(builders)) {
    if (builder.vCount === 0) continue;
    meshes.push({
      texName,
      mesh: builder.upload(gl),
      emissive: texName === 'stainedGlass' ? 0.82 : (texName === 'radio' ? 0.25 : 0),
    });
  }

  // Dynamic Nave Portcullis Gate (seals during Act III room-to-room defense, opens again in Act IV)
  const naveGate = {
    x: 0,
    z: 4.0,
    closedAmount: 0, // 0 = open (up), 1 = closed (down)
    targetClosed: 0,
    collider: {
      minX: -3.5, maxX: 3.5,
      minY: 10, maxY: 14, // off the floor when open
      minZ: 3.6, maxZ: 4.4,
      bulletsPass: true, // bars let you shoot through!
      tag: 'nave-gate',
    },
  };
  colliders.push(naveGate.collider);

  return {
    meshes,
    colliders,
    braziers,
    interactables,
    naveGate,
    updateDynamic(dt) {
      const diff = naveGate.targetClosed - naveGate.closedAmount;
      naveGate.closedAmount += diff * Math.min(1, dt * 2.5);
      if (naveGate.closedAmount > 0.35) {
        naveGate.collider.minY = 0;
        naveGate.collider.maxY = 4.2;
      } else {
        naveGate.collider.minY = 10;
        naveGate.collider.maxY = 14;
      }
    },
    renderDynamic(renderer, time) {
      // Draw Nave Iron Portcullis Bars
      const gateBottom = 4.35 - naveGate.closedAmount * 4.35;
      for (let bx = -2.8; bx <= 2.81; bx += 0.7) {
        renderer.drawBox(bx, gateBottom + 2.1, 4.0, 0.1, 4.2, 0.1, 0, [0.42, 0.45, 0.5], 'iron');
      }
      renderer.drawBox(0, gateBottom + 0.3, 4.0, 6.4, 0.18, 0.16, 0, [0.45, 0.48, 0.52], 'iron');
      renderer.drawBox(0, gateBottom + 2.1, 4.0, 6.4, 0.16, 0.14, 0, [0.45, 0.48, 0.52], 'iron');

      // Draw glowing flame cores inside braziers
      for (const b of braziers) {
        if (b.steady) continue;
        const flick = 0.24 + Math.sin(time * 11 + b.phase) * 0.05;
        renderer.drawBox(b.x, b.y - 0.12, b.z, flick, flick * 1.4, flick, time * 1.5 + b.phase, [1.0, 0.65, 0.2], 'white', 1.4);
      }

      // Draw collectible/interactive visual props
      for (const it of interactables) {
        if (!it.active || it.collected) continue;
        const bob = Math.sin(time * 3.2) * 0.06;
        if (it.type === 'weapon') {
          // Leaning MAS-36 rifle + brass ammo box
          renderer.drawBox(it.x, 0.35, it.z, 0.7, 0.45, 0.45, 0.3, [0.48, 0.52, 0.34], 'wood', 0.12);
          renderer.drawBox(it.x, 0.75 + bob, it.z, 1.15, 0.1, 0.1, 0.3, [0.55, 0.38, 0.22], 'wood', 0.2);
          renderer.drawBox(it.x + 0.35, 0.78 + bob, it.z, 0.6, 0.06, 0.06, 0.3, [0.35, 0.38, 0.42], 'iron', 0.2);
        } else if (it.type === 'resupply') {
          // Resistance Parachute/Supply Crate with glowing beacon strip
          renderer.drawBox(it.x, 0.42, it.z, 1.25, 0.78, 0.85, 0.15, [0.36, 0.46, 0.32], 'wood', 0.18);
          renderer.drawBox(it.x, 0.88 + bob, it.z, 0.9, 0.12, 0.22, 0.15, [0.95, 0.32, 0.25], 'white', 0.85);
        } else if (it.type === 'lore') {
          // Parchment dispatch folder with subtle warm glint
          renderer.drawBox(it.x, 0.9 + bob, it.z, 0.48, 0.06, 0.36, time * 0.6, [0.94, 0.86, 0.65], 'white', 0.45);
        }
      }
    },
  };
}
