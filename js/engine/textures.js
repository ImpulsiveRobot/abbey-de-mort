// Procedural high-craft Canvas textures for Abbaye de Mort (zero external assets)

function makeCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return { canvas: c, ctx: c.getContext('2d'), size };
}

function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function addNoise(ctx, size, alpha = 0.08, seed = 1) {
  const rand = seededRand(seed);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const amp = alpha * 255;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amp;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

// 1. Weathered French Limestone Masonry (Abbey Walls)
function texLimestone() {
  const { canvas, ctx, size } = makeCanvas(512);
  const rand = seededRand(101);
  ctx.fillStyle = '#3d3832';
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    const cols = 4;
    const offset = (r % 2) * (size / cols / 2);
    for (let c = -1; c <= cols; c++) {
      const x = c * (size / cols) + offset;
      const w = size / cols;
      const y = r * rowH;
      const shade = 112 + Math.floor((rand() - 0.5) * 34);
      const warm = Math.floor(rand() * 14);
      ctx.fillStyle = `rgb(${shade + warm}, ${shade + warm - 5}, ${shade - 12})`;
      ctx.fillRect(x + 3, y + 3, w - 6, rowH - 6);

      // Subtle bevel highlight & shadow
      ctx.fillStyle = 'rgba(255,245,225,0.12)';
      ctx.fillRect(x + 3, y + 3, w - 6, 4);
      ctx.fillStyle = 'rgba(15,12,10,0.28)';
      ctx.fillRect(x + 3, y + rowH - 7, w - 6, 4);

      // Weathering blotches & moss
      if (rand() < 0.35) {
        ctx.fillStyle = `rgba(48, 66, 38, ${0.15 + rand() * 0.25})`;
        ctx.beginPath();
        ctx.ellipse(x + rand() * w, y + rand() * rowH, 14 + rand() * 24, 8 + rand() * 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Rain streaks
      if (rand() < 0.4) {
        ctx.fillStyle = 'rgba(20, 22, 24, 0.16)';
        ctx.fillRect(x + rand() * (w - 10), y, 3 + rand() * 5, rowH);
      }
    }
  }
  addNoise(ctx, size, 0.12, 102);
  return canvas;
}

// 2. Dark Wet Cobblestones (Courtyard & Abbey Floors)
function texCobble() {
  const { canvas, ctx, size } = makeCanvas(512);
  const rand = seededRand(202);
  ctx.fillStyle = '#242320';
  ctx.fillRect(0, 0, size, size);

  const rows = 12;
  const cols = 10;
  const rh = size / rows;
  const cw = size / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * cw + off + (rand() - 0.5) * 4;
      const y = r * rh + (rand() - 0.5) * 3;
      const w = cw - 6;
      const h = rh - 6;
      const v = 64 + Math.floor(rand() * 38);
      const blue = Math.floor(rand() * 14);
      ctx.fillStyle = `rgb(${v}, ${v + 2}, ${v + blue})`;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, w, h, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(190, 210, 235, 0.14)'; // wet sheen
      ctx.fillRect(x + 6, y + 5, w - 12, 4);
    }
  }
  // Mossy cracks
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = 'rgba(46, 68, 36, 0.22)';
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 6 + rand() * 16, 0, Math.PI * 2);
    ctx.fill();
  }
  addNoise(ctx, size, 0.11, 203);
  return canvas;
}

// 3. Flagstone Interior Floor (Nave / Scriptorium)
function texFlagstone() {
  const { canvas, ctx, size } = makeCanvas(512);
  const rand = seededRand(303);
  ctx.fillStyle = '#25211d';
  ctx.fillRect(0, 0, size, size);

  const g = 4;
  const s = size / g;
  for (let r = 0; r < g; r++) {
    for (let c = 0; c < g; c++) {
      const v = 74 + Math.floor(rand() * 28);
      ctx.fillStyle = `rgb(${v + 8}, ${v + 4}, ${v - 2})`;
      ctx.fillRect(c * s + 4, r * s + 4, s - 8, s - 8);
      ctx.strokeStyle = 'rgba(255,240,210,0.08)';
      ctx.lineWidth = 2;
      ctx.strokeRect(c * s + 6, r * s + 6, s - 12, s - 12);
    }
  }
  // Subtle cracks
  ctx.strokeStyle = 'rgba(18,16,14,0.45)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    let x = rand() * size, y = rand() * size;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (rand() - 0.5) * 45;
      y += (rand() - 0.5) * 45;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  addNoise(ctx, size, 0.1, 304);
  return canvas;
}

// 4. Gothic Stained Glass Window (Luminous ruby, sapphire, amber)
function texStainedGlass() {
  const { canvas, ctx, size } = makeCanvas(512);
  ctx.fillStyle = '#0e0c14';
  ctx.fillRect(0, 0, size, size);

  // Pointed lancet arch frame
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(46, size - 20);
  ctx.lineTo(46, 200);
  ctx.quadraticCurveTo(46, 60, size / 2, 24);
  ctx.quadraticCurveTo(size - 46, 60, size - 46, 200);
  ctx.lineTo(size - 46, size - 20);
  ctx.closePath();
  ctx.clip();

  // Glowing jewel-tone mosaic
  const palette = ['#b8293d', '#1d4d8f', '#d99326', '#287a6b', '#8d2444', '#2660a4', '#e3b53b'];
  const rand = seededRand(404);
  const step = 32;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
      ctx.fillRect(x, y, step, step);
      ctx.strokeStyle = '#111015';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, step, step);
    }
  }

  // Rose medallion in upper arch
  const cx = size / 2, cy = 155, R = 82;
  const grd = ctx.createRadialGradient(cx, cy, 8, cx, cy, R);
  grd.addColorStop(0, '#fff2b0');
  grd.addColorStop(0.45, '#e87822');
  grd.addColorStop(0.8, '#9e1933');
  grd.addColorStop(1, '#1a2f6b');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#121016';
  ctx.lineWidth = 6;
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
  }

  // Central golden cross motif
  ctx.fillStyle = 'rgba(255, 224, 130, 0.85)';
  ctx.fillRect(cx - 10, 255, 20, 170);
  ctx.fillRect(cx - 58, 300, 116, 20);
  ctx.strokeStyle = '#141118';
  ctx.lineWidth = 5;
  ctx.strokeRect(cx - 10, 255, 20, 170);
  ctx.strokeRect(cx - 58, 300, 116, 20);

  ctx.restore();

  // Heavy lead stone mullion border
  ctx.strokeStyle = '#2d2926';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(46, size - 20);
  ctx.lineTo(46, 200);
  ctx.quadraticCurveTo(46, 60, size / 2, 24);
  ctx.quadraticCurveTo(size - 46, 60, size - 46, 200);
  ctx.lineTo(size - 46, size - 20);
  ctx.closePath();
  ctx.stroke();
  return canvas;
}

// 5. Heavy Carved Dark Oak Wood (Doors, Pews, Beams, Crates)
function texWood() {
  const { canvas, ctx, size } = makeCanvas(512);
  const rand = seededRand(505);
  ctx.fillStyle = '#432d1c';
  ctx.fillRect(0, 0, size, size);

  const planks = 6;
  const pw = size / planks;
  for (let i = 0; i < planks; i++) {
    const x = i * pw;
    const tone = Math.floor((rand() - 0.5) * 18);
    ctx.fillStyle = `rgb(${74 + tone}, ${49 + tone}, ${30 + tone})`;
    ctx.fillRect(x + 2, 0, pw - 4, size);
    // Grain lines
    for (let g = 0; g < 24; g++) {
      ctx.fillStyle = `rgba(25, 14, 7, ${0.08 + rand() * 0.14})`;
      ctx.fillRect(x + 4 + rand() * (pw - 8), 0, 1 + rand() * 2, size);
    }
  }
  // Wrought iron bands
  ctx.fillStyle = '#202226';
  ctx.fillRect(0, 90, size, 26);
  ctx.fillRect(0, size - 116, size, 26);
  ctx.fillStyle = '#4c5159';
  for (let r = 24; r < size; r += 64) {
    ctx.beginPath();
    ctx.arc(r, 103, 5, 0, Math.PI * 2);
    ctx.arc(r, size - 103, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  addNoise(ctx, size, 0.09, 506);
  return canvas;
}

// 6. Sheer 100-Meter Cliff Rock Strata
function texCliffRock() {
  const { canvas, ctx, size } = makeCanvas(512);
  const rand = seededRand(606);
  ctx.fillStyle = '#3b3733';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 65; i++) {
    const y = rand() * size;
    const h = 14 + rand() * 44;
    const v = 50 + Math.floor(rand() * 48);
    ctx.fillStyle = `rgb(${v + 6}, ${v + 3}, ${v - 2})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 64) {
      ctx.lineTo(x, y + (rand() - 0.5) * 18);
    }
    ctx.lineTo(size, y + h);
    ctx.lineTo(0, y + h);
    ctx.closePath();
    ctx.fill();
  }
  // Vertical crevices & moss
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = rand() < 0.6 ? 'rgba(18,16,14,0.35)' : 'rgba(52,72,38,0.28)';
    ctx.fillRect(rand() * size, rand() * size, 6 + rand() * 14, 40 + rand() * 160);
  }
  addNoise(ctx, size, 0.14, 607);
  return canvas;
}

// 7. Sandbag Barricade & Military Burlap
function texSandbag() {
  const { canvas, ctx, size } = makeCanvas(512);
  const rand = seededRand(707);
  ctx.fillStyle = '#4d4432';
  ctx.fillRect(0, 0, size, size);
  const rows = 8;
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * 64;
    for (let c = -1; c <= 4; c++) {
      const x = c * 128 + off;
      const y = r * rh;
      const v = 128 + Math.floor((rand() - 0.5) * 24);
      ctx.fillStyle = `rgb(${v}, ${v - 14}, ${v - 38})`;
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, 120, rh - 8, 22);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,24,14,0.45)';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }
  addNoise(ctx, size, 0.12, 708);
  return canvas;
}

// 8. Wrought Iron Portcullis / Grate (solid metallic texture for pillars/bars)
function texIron() {
  const { canvas, ctx, size } = makeCanvas(256);
  ctx.fillStyle = '#25282c';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#3b4048';
  for (let i = 0; i < size; i += 32) {
    ctx.fillRect(i, 0, 8, size);
    ctx.fillRect(0, i, size, 8);
  }
  addNoise(ctx, size, 0.14, 808);
  return canvas;
}

// 9. Abbey Bookshelf / Scriptorium Wall
function texBookshelf() {
  const { canvas, ctx, size } = makeCanvas(512);
  const rand = seededRand(909);
  ctx.fillStyle = '#2d1c11';
  ctx.fillRect(0, 0, size, size);
  const shelves = 5;
  const sh = size / shelves;
  const colors = ['#6b2424', '#2c422c', '#263859', '#6e4e27', '#4f2847', '#826438', '#3e2d23'];
  for (let s = 0; s < shelves; s++) {
    const y = s * sh;
    ctx.fillStyle = '#472c18';
    ctx.fillRect(0, y + sh - 12, size, 12);
    let x = 8;
    while (x < size - 16) {
      const bw = 12 + Math.floor(rand() * 18);
      const bh = sh - 22 - Math.floor(rand() * 18);
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.fillRect(x, y + sh - 12 - bh, bw - 2, bh);
      // Gold spine band
      ctx.fillStyle = 'rgba(218, 185, 102, 0.65)';
      ctx.fillRect(x + 1, y + sh - 12 - bh + 10, bw - 4, 3);
      x += bw;
    }
  }
  addNoise(ctx, size, 0.08, 910);
  return canvas;
}

// 10. British SOE Radio & Military Crate
function texRadio() {
  const { canvas, ctx, size } = makeCanvas(256);
  ctx.fillStyle = '#2f3a2e';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#1b211a';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, size - 10, size - 10);
  // Glowing green tuning dial
  ctx.fillStyle = '#14261a';
  ctx.fillRect(28, 32, 130, 62);
  ctx.fillStyle = '#6cf09c';
  ctx.fillRect(36, 56, 114, 4);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(88, 42, 4, 38);
  // Bakelite knobs
  ctx.fillStyle = '#151515';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(54 + i * 50, 154, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c8a962';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Speaker grille
  ctx.fillStyle = '#1c241b';
  for (let y = 36; y < 180; y += 12) {
    ctx.fillRect(174, y, 56, 6);
  }
  addNoise(ctx, size, 0.06, 950);
  return canvas;
}

// 11. Earth / Misty Cliffside Grass & Mud
function texGround() {
  const { canvas, ctx, size } = makeCanvas(512);
  const rand = seededRand(1111);
  ctx.fillStyle = '#2d3324';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = rand() < 0.5
      ? `rgba(68, 56, 40, ${0.2 + rand() * 0.25})`
      : `rgba(42, 58, 32, ${0.2 + rand() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(rand() * size, rand() * size, 12 + rand() * 44, 8 + rand() * 30, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  addNoise(ctx, size, 0.14, 1112);
  return canvas;
}

// 12. Flat white utility texture (tinted by vertex/material color for characters, crates, sky objects)
function texWhite() {
  const { canvas, ctx, size } = makeCanvas(64);
  ctx.fillStyle = '#e8e4dc';
  ctx.fillRect(0, 0, size, size);
  addNoise(ctx, size, 0.05, 1212);
  return canvas;
}

export function createTextureAtlas(gl) {
  const generators = {
    limestone: texLimestone,
    cobble: texCobble,
    flagstone: texFlagstone,
    stainedGlass: texStainedGlass,
    wood: texWood,
    cliff: texCliffRock,
    sandbag: texSandbag,
    iron: texIron,
    bookshelf: texBookshelf,
    radio: texRadio,
    ground: texGround,
    white: texWhite,
  };

  const textures = {};
  const maxAnisoExt = gl.getExtension('EXT_texture_filter_anisotropic');
  const maxAniso = maxAnisoExt ? gl.getParameter(maxAnisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;

  for (const [name, fn] of Object.entries(generators)) {
    const canvas = fn();
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    if (maxAnisoExt) {
      gl.texParameterf(gl.TEXTURE_2D, maxAnisoExt.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAniso));
    }
    textures[name] = tex;
  }

  return textures;
}
