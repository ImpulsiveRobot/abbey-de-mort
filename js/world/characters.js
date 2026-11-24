// Articulated 3D Characters, C-47 Paratrooper Planes & Descending Silk Chutes
// Distinct silhouettes & palettes so enemies and allies read instantly in dark atmospheric combat.

export function renderCharacter(renderer, ent, time) {
  const { x, y, z, yaw, role, state, hitFlash, animPhase, muzzleTimer } = ent;
  const flash = hitFlash > 0 ? 1 : 0;

  // Death fall rotation
  const deadTilt = state === 'dead' ? Math.min(1, (ent.deathTime || 0) * 3.8) : 0;
  const baseY = y - deadTilt * 0.65;
  const bodyRotX = deadTilt * 1.48;

  const walkSwing = (state === 'moving' || state === 'climbing') ? Math.sin(animPhase * 8.5) * 0.38 : 0;
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);

  // Local offset helper (lx = right, ly = up, lz = forward in entity space where +Z is facing if yaw=0)
  // Using forward = (sin(yaw), 0, cos(yaw))
  const toWorld = (lx, ly, lz) => {
    const tiltLy = ly * Math.cos(bodyRotX) - lz * Math.sin(bodyRotX);
    const tiltLz = ly * Math.sin(bodyRotX) + lz * Math.cos(bodyRotX);
    return [
      x + cosY * lx + sinY * tiltLz,
      baseY + tiltLy,
      z - sinY * lx + cosY * tiltLz,
    ];
  };

  const tint = (rgb) => (flash ? [1.0, 0.72, 0.62] : rgb);
  const em = flash ? 0.55 : 0;

  if (role === 'abbot') {
    // ABBOT HENRI — Benedictine cassock, corded waist, silver beard, glowing brass oil lantern
    const robe = tint([0.28, 0.22, 0.19]);
    const trim = tint([0.55, 0.45, 0.32]);
    const skin = tint([0.84, 0.71, 0.6]);
    const pTorso = toWorld(0, 0.92, 0);
    renderer.drawBox(pTorso[0], pTorso[1], pTorso[2], 0.56, 1.35, 0.42, yaw, robe, 'white', em, bodyRotX);
    // Corded sash & cross
    const pSash = toWorld(0, 0.96, 0.18);
    renderer.drawBox(pSash[0], pSash[1], pSash[2], 0.46, 0.1, 0.12, yaw, trim, 'white', em, bodyRotX);
    // Head & silver beard
    const pHead = toWorld(0, 1.74, 0);
    renderer.drawBox(pHead[0], pHead[1], pHead[2], 0.31, 0.33, 0.31, yaw, skin, 'white', em, bodyRotX);
    const pHair = toWorld(0, 1.85, -0.02);
    renderer.drawBox(pHair[0], pHair[1], pHair[2], 0.33, 0.1, 0.33, yaw, tint([0.78, 0.78, 0.8]), 'white', em, bodyRotX);
    // Raised arm holding glowing brass lantern!
    const pArm = toWorld(0.36, 1.24, 0.25);
    renderer.drawBox(pArm[0], pArm[1], pArm[2], 0.16, 0.16, 0.48, yaw, robe, 'white', em, bodyRotX);
    const pLantern = toWorld(0.38, 1.18 + Math.sin(time * 4) * 0.03, 0.54);
    renderer.drawBox(pLantern[0], pLantern[1], pLantern[2], 0.18, 0.28, 0.18, yaw, [1.0, 0.78, 0.32], 'white', 1.35);
    return;
  }

  // Uniform palette by role
  let coatCol = [0.34, 0.39, 0.35];   // Wehrmacht Feldgrau
  let pantsCol = [0.26, 0.29, 0.27];
  let helmetCol = [0.22, 0.25, 0.24];
  let skinCol = [0.82, 0.69, 0.58];
  let accentCol = null;

  if (role === 'german_officer') {
    coatCol = [0.18, 0.2, 0.22];
    pantsCol = [0.15, 0.16, 0.18];
    helmetCol = [0.14, 0.15, 0.17];
    accentCol = [0.82, 0.18, 0.18]; // Crimson collar/band
  } else if (role === 'german_smg') {
    coatCol = [0.27, 0.31, 0.29];
    helmetCol = [0.19, 0.22, 0.21];
    accentCol = [0.55, 0.52, 0.42];
  } else if (role === 'resistance') {
    coatCol = [0.32, 0.28, 0.24];     // Weathered French Maquis trench coat
    pantsCol = [0.22, 0.22, 0.26];
    helmetCol = [0.15, 0.16, 0.22];   // Classic French beret
    accentCol = [0.18, 0.42, 0.88];   // Blue-White-Red Maquis armband!
  }

  // Legs
  const pL = toWorld(-0.15, 0.4, walkSwing * 0.35);
  const pR = toWorld( 0.15, 0.4, -walkSwing * 0.35);
  renderer.drawBox(pL[0], pL[1], pL[2], 0.18, 0.78, 0.2, yaw, tint(pantsCol), 'white', em, bodyRotX + walkSwing * 0.4);
  renderer.drawBox(pR[0], pR[1], pR[2], 0.18, 0.78, 0.2, yaw, tint(pantsCol), 'white', em, bodyRotX - walkSwing * 0.4);

  // Torso / Greatcoat
  const pTorso = toWorld(0, 1.1, 0);
  renderer.drawBox(pTorso[0], pTorso[1], pTorso[2], 0.52, 0.74, 0.3, yaw, tint(coatCol), 'white', em, bodyRotX);

  // Webbing / Armband / Officer insignia
  if (role === 'resistance') {
    const pBand = toWorld(-0.32, 1.24, 0.04);
    renderer.drawBox(pBand[0], pBand[1], pBand[2], 0.12, 0.18, 0.22, yaw, [0.15, 0.42, 0.92], 'white', 0.35, bodyRotX);
    const pRed = toWorld(-0.32, 1.12, 0.04);
    renderer.drawBox(pRed[0], pRed[1], pRed[2], 0.12, 0.12, 0.22, yaw, [0.92, 0.22, 0.22], 'white', 0.35, bodyRotX);
  } else if (accentCol) {
    const pAcc = toWorld(0, 1.38, 0.16);
    renderer.drawBox(pAcc[0], pAcc[1], pAcc[2], 0.34, 0.1, 0.06, yaw, accentCol, 'white', 0.25, bodyRotX);
  }

  // Head
  const pHead = toWorld(0, 1.66, 0);
  renderer.drawBox(pHead[0], pHead[1], pHead[2], 0.27, 0.29, 0.27, yaw, tint(skinCol), 'white', em, bodyRotX);

  // Helmet (Stahlhelm silhouette for Germans, slanted Beret for Resistance)
  if (role === 'resistance') {
    const pBeret = toWorld(0.04, 1.83, -0.02);
    renderer.drawBox(pBeret[0], pBeret[1], pBeret[2], 0.36, 0.11, 0.34, yaw, tint(helmetCol), 'white', em, bodyRotX, -0.18);
  } else {
    const pHelm = toWorld(0, 1.81, -0.02);
    renderer.drawBox(pHelm[0], pHelm[1], pHelm[2], 0.35, 0.18, 0.37, yaw, tint(helmetCol), 'white', em, bodyRotX);
    if (role === 'german_officer') {
      const pBand = toWorld(0, 1.77, 0.14);
      renderer.drawBox(pBand[0], pBand[1], pBand[2], 0.32, 0.05, 0.14, yaw, [0.85, 0.72, 0.25], 'white', 0.2, bodyRotX);
    }
  }

  // Arms & Weapon
  const pArmR = toWorld(0.32, 1.18, 0.18);
  renderer.drawBox(pArmR[0], pArmR[1], pArmR[2], 0.15, 0.16, 0.44, yaw, tint(coatCol), 'white', em, bodyRotX);
  const pArmL = toWorld(-0.28, 1.16, 0.16);
  renderer.drawBox(pArmL[0], pArmL[1], pArmL[2], 0.15, 0.16, 0.42, yaw, tint(coatCol), 'white', em, bodyRotX);

  if (state !== 'dead') {
    const pGun = toWorld(0.14, 1.18, 0.56);
    renderer.drawBox(pGun[0], pGun[1], pGun[2], 0.08, 0.1, 0.88, yaw, [0.22, 0.19, 0.16], 'iron', 0, bodyRotX);
    if (muzzleTimer > 0) {
      const pFlash = toWorld(0.14, 1.2, 1.06);
      const s = 0.26 + Math.random() * 0.14;
      renderer.drawBox(pFlash[0], pFlash[1], pFlash[2], s, s, s, yaw + time * 20, [1.0, 0.85, 0.38], 'white', 1.9);
    }
  }
}

// Act V Spectacle: British C-47 Dakota Transport Planes & Descending Paratroopers in the Dawn Sky!
export function renderAirborneDrop(renderer, planes, paratroopers, time) {
  for (const pl of planes) {
    const { x, y, z, yaw } = pl;
    // Fuselage
    renderer.drawBox(x, y, z, 2.2, 2.1, 13.5, yaw, [0.28, 0.32, 0.26], 'iron');
    // Main wings (wide iconic C-47 silhouette)
    renderer.drawBox(x, y - 0.1, z + 0.8, 19.5, 0.45, 3.0, yaw, [0.32, 0.36, 0.3], 'iron');
    // Tailplane & vertical fin
    renderer.drawBox(x, y + 0.4, z - 5.8, 6.8, 0.3, 1.5, yaw, [0.3, 0.34, 0.28], 'iron');
    renderer.drawBox(x, y + 1.8, z - 5.6, 0.35, 3.0, 2.0, yaw, [0.32, 0.36, 0.3], 'iron');
    // Twin engines + spinning prop discs
    const sy = Math.sin(yaw), cy = Math.cos(yaw);
    for (const side of [-4.2, 4.2]) {
      const ex = x + cy * side + sy * 2.2;
      const ez = z - sy * side + cy * 2.2;
      renderer.drawBox(ex, y - 0.2, ez, 1.1, 1.1, 2.2, yaw, [0.2, 0.22, 0.24], 'iron');
      renderer.drawBox(ex + sy * 1.2, y - 0.2, ez + cy * 1.2, 2.1, 2.1, 0.08, yaw, [0.75, 0.78, 0.82], 'white', 0.25, 0, time * 26);
    }
    // Red/green wingtip navigation lights
    renderer.drawBox(x + cy * 9.8, y, z - sy * 9.8, 0.4, 0.4, 0.4, 0, [0.2, 1.0, 0.35], 'white', 1.6);
    renderer.drawBox(x - cy * 9.8, y, z + sy * 9.8, 0.4, 0.4, 0.4, 0, [1.0, 0.2, 0.2], 'white', 1.6);
  }

  for (const pt of paratroopers) {
    const sway = Math.sin(time * 2.1 + pt.phase) * 0.14;
    // Silk parachute canopy (layered dome)
    renderer.drawBox(pt.x, pt.y + 4.4, pt.z, 4.4, 1.1, 4.4, pt.phase, [0.92, 0.88, 0.78], 'white', 0.22, sway, sway * 0.7);
    renderer.drawBox(pt.x, pt.y + 5.0, pt.z, 3.0, 0.7, 3.0, pt.phase, [0.95, 0.91, 0.82], 'white', 0.25, sway, sway * 0.7);
    // Suspension cords (thin vertical box)
    renderer.drawBox(pt.x, pt.y + 2.4, pt.z, 0.08, 3.2, 0.08, 0, [0.65, 0.65, 0.6], 'white');
    // British Airborne Trooper dangling beneath!
    renderer.drawBox(pt.x, pt.y + 0.7, pt.z, 0.55, 1.4, 0.4, pt.phase, [0.35, 0.36, 0.26], 'white');
    // Iconic maroon Red Devil beret/helmet glint
    renderer.drawBox(pt.x, pt.y + 1.55, pt.z, 0.32, 0.22, 0.32, pt.phase, [0.65, 0.14, 0.18], 'white', 0.2);
  }
}
