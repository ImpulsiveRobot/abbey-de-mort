// Illustrated Story Vignettes, Stolen German Troop Movement Chart, and Live Abbey Minimap

// Render atmospheric WWII parchment/noir vignette for each Act Interlude Card
export function drawActVignette(canvas, sketchType) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Vintage sky gradient by act mood
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (sketchType === 'paratroopers') {
    sky.addColorStop(0, '#1e2742');
    sky.addColorStop(0.55, '#8c4435');
    sky.addColorStop(1, '#e69f4c');
  } else if (sketchType === 'climb') {
    sky.addColorStop(0, '#0d1424');
    sky.addColorStop(0.6, '#261822');
    sky.addColorStop(1, '#4d1b1e');
  } else if (sketchType === 'retreat') {
    sky.addColorStop(0, '#12131a');
    sky.addColorStop(1, '#3b1f1a');
  } else {
    sky.addColorStop(0, '#0d1522');
    sky.addColorStop(0.65, '#1d2a3d');
    sky.addColorStop(1, '#2d3540');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Subtle parchment grain lines
  ctx.strokeStyle = 'rgba(245, 232, 200, 0.06)';
  ctx.lineWidth = 1;
  for (let y = 8; y < h; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Moon or Dawn Sun
  ctx.fillStyle = sketchType === 'paratroopers' ? 'rgba(255, 224, 150, 0.85)' : 'rgba(218, 228, 245, 0.72)';
  ctx.beginPath();
  ctx.arc(sketchType === 'paratroopers' ? w * 0.78 : w * 0.22, h * 0.28, sketchType === 'paratroopers' ? 28 : 18, 0, Math.PI * 2);
  ctx.fill();

  // Iconic 100-meter rocky outcrop + Abbaye de Mort Gothic silhouette
  ctx.fillStyle = '#101216';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.78);
  ctx.lineTo(w * 0.26, h * 0.62);
  ctx.lineTo(w * 0.34, h * 0.48);
  ctx.lineTo(w * 0.74, h * 0.48);
  ctx.lineTo(w * 0.79, h * 0.92); // Sheer 100-meter eastern rock face!
  ctx.lineTo(w, h * 0.96);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Abbey spires, gatehouse & bell tower atop the outcrop
  ctx.fillRect(w * 0.38, h * 0.34, w * 0.3, h * 0.15);
  ctx.fillRect(w * 0.41, h * 0.2, w * 0.07, h * 0.29); // Bell tower
  ctx.beginPath();
  ctx.moveTo(w * 0.405, h * 0.2);
  ctx.lineTo(w * 0.445, h * 0.11);
  ctx.lineTo(w * 0.485, h * 0.2);
  ctx.fill();

  // Glowing stained-glass lancet slits
  ctx.fillStyle = '#e89b3c';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(w * (0.51 + i * 0.045), h * 0.38, 6, 15);
  }

  // Act-specific storytelling focal illustration
  if (sketchType === 'cliff') {
    // Sweeping German searchlights
    ctx.fillStyle = 'rgba(210, 228, 255, 0.14)';
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.85);
    ctx.lineTo(w * 0.42, h * 0.05);
    ctx.lineTo(w * 0.56, h * 0.05);
    ctx.closePath();
    ctx.fill();
  } else if (sketchType === 'radio') {
    // Concentric emerald shortwave signal rings from Abbey to London
    ctx.strokeStyle = 'rgba(102, 232, 154, 0.55)';
    ctx.lineWidth = 1.6;
    for (let r = 16; r <= 78; r += 16) {
      ctx.beginPath();
      ctx.arc(w * 0.55, h * 0.34, r, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.stroke();
    }
  } else if (sketchType === 'retreat') {
    // Iron portcullis bars & ember sparks
    ctx.strokeStyle = 'rgba(220, 92, 48, 0.55)';
    ctx.lineWidth = 2;
    for (let x = w * 0.38; x <= w * 0.68; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.24);
      ctx.lineTo(x, h * 0.52);
      ctx.stroke();
    }
  } else if (sketchType === 'climb') {
    // Crimson flares shooting up the 100-meter East cliff face + rope line!
    const grd = ctx.createRadialGradient(w * 0.82, h * 0.36, 3, w * 0.82, h * 0.36, 54);
    grd.addColorStop(0, 'rgba(255, 92, 74, 0.95)');
    grd.addColorStop(1, 'rgba(255, 45, 45, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.36, 54, 0, Math.PI * 2);
    ctx.fill();

    // Dashed climbing path up the 100m face
    ctx.strokeStyle = '#ff7b6b';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.82, h * 0.94);
    ctx.lineTo(w * 0.77, h * 0.49);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (sketchType === 'paratroopers') {
    // Descending British paratroopers in dawn sky!
    ctx.fillStyle = 'rgba(255, 245, 224, 0.9)';
    ctx.strokeStyle = 'rgba(255, 245, 224, 0.55)';
    ctx.lineWidth = 1;
    const chutes = [[0.2, 0.22], [0.34, 0.16], [0.56, 0.2], [0.68, 0.28], [0.85, 0.18], [0.46, 0.3]];
    for (const [px, py] of chutes) {
      const cx = w * px, cy = h * py;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy); ctx.lineTo(cx, cy + 14);
      ctx.moveTo(cx + 8, cy); ctx.lineTo(cx, cy + 14);
      ctx.stroke();
      ctx.fillRect(cx - 2, cy + 14, 4, 6);
    }
  }

  // Fine brass border
  ctx.strokeStyle = 'rgba(212, 175, 95, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, w - 8, h - 8);
}

// Draw the Stolen German Troop Movement Chart inside the Intelligence Dossier
export function drawTroopMovementChart(canvas, act) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Aged parchment paper
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#dfd1b2');
  bg.addColorStop(1, '#c7b58e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle topographic grid
  ctx.strokeStyle = 'rgba(65, 52, 34, 0.14)';
  ctx.lineWidth = 1;
  for (let x = 24; x < w; x += 36) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 24; y < h; y += 36) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Stylized Loire / Cher river curves
  ctx.strokeStyle = 'rgba(54, 88, 122, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.32);
  ctx.bezierCurveTo(w * 0.3, h * 0.22, w * 0.65, h * 0.42, w, h * 0.28);
  ctx.stroke();

  // Demarcation Line (Occupied Zone vs Free France)
  ctx.strokeStyle = '#7a2323';
  ctx.lineWidth = 2.4;
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.56);
  ctx.quadraticCurveTo(w * 0.48, h * 0.46, w, h * 0.62);
  ctx.stroke();
  ctx.setLineDash([]);

  // Zone Labels
  ctx.fillStyle = 'rgba(42, 32, 22, 0.72)';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillText('OCCUPIED ZONE (WEHRMACHT)', 14, 24);
  ctx.fillStyle = 'rgba(36, 62, 92, 0.85)';
  ctx.fillText('FREE FRANCE TERRITORY — DEMARCATION BORDER', 14, h - 14);

  // German Panzer / Rail movement arrows (the stolen intelligence!)
  ctx.strokeStyle = '#991e1e';
  ctx.fillStyle = '#991e1e';
  ctx.lineWidth = 2.5;
  const arrows = [
    [[w * 0.22, h * 0.18], [w * 0.36, h * 0.42]],
    [[w * 0.62, h * 0.16], [w * 0.54, h * 0.44]],
    [[w * 0.82, h * 0.26], [w * 0.72, h * 0.48]],
  ];
  for (const [[x1, y1], [x2, y2]] of arrows) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(ang - 0.45) * 9, y2 - Math.sin(ang - 0.45) * 9);
    ctx.lineTo(x2 - Math.cos(ang + 0.45) * 9, y2 - Math.sin(ang + 0.45) * 9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.font = '10px monospace';
  ctx.fillText('7. Pz-Div', w * 0.16, h * 0.15);
  ctx.fillText('Rail Supply', w * 0.58, h * 0.14);

  // Abbaye de Mort marker right on the border outcrop!
  const ax = w * 0.5, ay = h * 0.58;
  ctx.fillStyle = '#1f1912';
  ctx.beginPath();
  ctx.arc(ax, ay, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b57b1b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ax, ay, 13, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#1f1912';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillText('ABBAYE DE MORT (100m OUTCROP)', ax - 84, ay + 28);

  // Act IV+ Maquis cliff flank arrow
  if (act >= 4) {
    ctx.strokeStyle = '#1d5fa3';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.78, h * 0.78);
    ctx.lineTo(ax + 15, ay + 4);
    ctx.stroke();
    ctx.fillStyle = '#1d5fa3';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('MAQUIS 100m FLANK', w * 0.62, h * 0.83);
  }

  // Stamp
  ctx.save();
  ctx.translate(w - 72, h - 32);
  ctx.rotate(-0.14);
  ctx.strokeStyle = 'rgba(155, 32, 32, 0.72)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-54, -14, 108, 24);
  ctx.fillStyle = 'rgba(155, 32, 32, 0.78)';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('TOP SECRET SOE', -47, 2);
  ctx.restore();
}

// Live Abbey Blueprint Minimap (used both in HUD corner radar & inside Dossier modal)
export function drawAbbeyMap(canvas, player, combat, story, world) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(14, 17, 22, 0.86)';
  ctx.fillRect(0, 0, w, h);

  // World bounds: X in [-25, +27], Z in [-31, +50]
  const toX = (wx) => ((wx + 26) / 54) * (w - 16) + 8;
  const toY = (wz) => ((wz + 32) / 84) * (h - 16) + 8;

  // Draw 100m sheer cliff drop indicator on East side
  ctx.fillStyle = 'rgba(84, 34, 34, 0.25)';
  ctx.fillRect(toX(24), 0, w - toX(24), h);
  ctx.strokeStyle = 'rgba(215, 92, 76, 0.55)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(toX(24), toY(-29));
  ctx.lineTo(toX(24), toY(23));
  ctx.stroke();
  ctx.setLineDash([]);

  // Floor silhouettes
  ctx.fillStyle = 'rgba(215, 198, 165, 0.13)';
  // Approach
  ctx.fillRect(toX(-6), toY(23), toX(6) - toX(-6), toY(49) - toY(23));
  // Main Abbey footprint
  ctx.fillRect(toX(-22), toY(-29), toX(24) - toX(-22), toY(23) - toY(-29));

  // Interior room outlines
  ctx.strokeStyle = 'rgba(218, 196, 152, 0.5)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(toX(-12), toY(-16), toX(12) - toX(-12), toY(4) - toY(-16));   // Nave
  ctx.strokeRect(toX(-12), toY(-29), toX(12) - toX(-12), toY(-16) - toY(-29)); // Sanctum
  ctx.strokeRect(toX(-22), toY(-29), toX(-12) - toX(-22), toY(23) - toY(-29)); // West Cloister
  ctx.strokeRect(toX(12), toY(-29), toX(24) - toX(12), toY(23) - toY(-29));    // East Terrace
  ctx.strokeRect(toX(-12), toY(4), toX(12) - toX(-12), toY(23) - toY(4));      // Courtyard

  // Nave Portcullis status bar
  if (world.naveGate.closedAmount > 0.3) {
    ctx.strokeStyle = '#ff6b52';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(toX(-3.5), toY(4));
    ctx.lineTo(toX(3.5), toY(4));
    ctx.stroke();
  }

  // Objective Waypoint pulsing ring
  if (story.waypoint) {
    const wx = toX(story.waypoint.x);
    const wy = toY(story.waypoint.z);
    const pulse = 5 + Math.sin(performance.now() * 0.007) * 2.5;
    ctx.strokeStyle = '#f2c75c';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(wx, wy, pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Entities
  for (const e of combat.entities) {
    if (e.state === 'dead') continue;
    const ex = toX(e.x), ey = toY(e.z);
    if (e.team === 'enemy') {
      ctx.fillStyle = e.role === 'german_officer' ? '#ff4444' : '#e06a52';
      ctx.beginPath();
      ctx.arc(ex, ey, 3.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.role === 'abbot') {
      ctx.fillStyle = '#f5be58';
      ctx.beginPath();
      ctx.arc(ex, ey, 4.0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#57a8ff';
      ctx.beginPath();
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Player directional arrow
  const px = toX(player.x), py = toY(player.z);
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  ctx.strokeStyle = 'rgba(255, 245, 200, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + fx * 15, py + fz * 15);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, 3.8, 0, Math.PI * 2);
  ctx.fill();

  // Subtle compass North & 100m Cliff label
  ctx.fillStyle = 'rgba(218, 196, 152, 0.65)';
  ctx.font = '9px monospace';
  ctx.fillText('N', w * 0.5 - 3, 10);
  if (w >= 170) {
    ctx.fillStyle = 'rgba(240, 128, 112, 0.75)';
    ctx.fillText('100m', toX(24.2), h * 0.5);
  }
}
