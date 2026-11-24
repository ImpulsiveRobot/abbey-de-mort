// WWII First-Person Weapons & Stylized Painterly Canvas Viewmodel Renderer
// Arsenal tied to story beats:
// 1. Webley Mk IV Revolver (Act I - English Spy's sidearm)
// 2. MAS-36 French Rifle (Act II - Abbot Henri's hidden sanctuary rifle)
// 3. Sten Mk II SMG (Act IV - Delivered by French Resistance over the 100m cliff)

export const WEAPON_DEFS = {
  revolver: {
    id: 'revolver',
    slot: 1,
    name: 'Webley Mk IV',
    subtitle: 'SOE Service Revolver (.38)',
    magSize: 6,
    damage: 42,
    headshotMult: 2.3,
    fireRate: 0.34,
    reloadTime: 1.35,
    spread: 0.011,
    adsSpread: 0.0025,
    adsFov: 58,
    recoilPitch: 0.048,
    auto: false,
    range: 75,
  },
  rifle: {
    id: 'rifle',
    slot: 2,
    name: 'MAS-36 Rifle',
    subtitle: 'Abbot\'s Sanctuary Bolt-Action (7.5mm)',
    magSize: 5,
    damage: 86,
    headshotMult: 2.4,
    fireRate: 0.82,
    reloadTime: 1.75,
    spread: 0.008,
    adsSpread: 0.001,
    adsFov: 44,
    recoilPitch: 0.075,
    auto: false,
    range: 140,
  },
  smg: {
    id: 'smg',
    slot: 3,
    name: 'Sten Mk II',
    subtitle: 'Maquis Resistance Submachine Gun (9mm)',
    magSize: 32,
    damage: 27,
    headshotMult: 2.0,
    fireRate: 0.105,
    reloadTime: 1.55,
    spread: 0.026,
    adsSpread: 0.011,
    adsFov: 56,
    recoilPitch: 0.024,
    auto: true,
    range: 65,
  },
};

export class WeaponSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.weapons = {
      revolver: { unlocked: true,  mag: 6,  reserve: 24 },
      rifle:    { unlocked: false, mag: 5,  reserve: 15 },
      smg:      { unlocked: false, mag: 32, reserve: 96 },
    };
    this.currentId = 'revolver';
    this.cooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.recoil = 0;
    this.muzzleFlash = 0;
    this.ads = 0; // 0..1 smooth aim down sights
    this.swayX = 0;
    this.swayY = 0;
    this.bobPhase = 0;
    this.hitMarkerTimer = 0;
    this.hitMarkerHead = false;
    this.shells = [];
  }

  get currentDef() {
    return WEAPON_DEFS[this.currentId];
  }

  get currentState() {
    return this.weapons[this.currentId];
  }

  get totalAmmo() {
    let total = 0;
    for (const w of Object.values(this.weapons)) {
      if (w.unlocked) total += w.mag + w.reserve;
    }
    return total;
  }

  unlock(id, extraReserve = 0) {
    const w = this.weapons[id];
    if (!w) return;
    w.unlocked = true;
    w.mag = WEAPON_DEFS[id].magSize;
    w.reserve += extraReserve;
    this.switchTo(id);
  }

  addAmmo(id, amount) {
    const w = this.weapons[id];
    if (!w) return;
    w.reserve += amount;
  }

  refillAllResistance() {
    this.weapons.revolver.reserve = Math.max(this.weapons.revolver.reserve, 36);
    if (this.weapons.rifle.unlocked) {
      this.weapons.rifle.reserve = Math.max(this.weapons.rifle.reserve, 30);
    } else {
      this.weapons.rifle.unlocked = true;
      this.weapons.rifle.mag = 5;
      this.weapons.rifle.reserve = 25;
    }
    this.weapons.smg.unlocked = true;
    this.weapons.smg.mag = 32;
    this.weapons.smg.reserve = 160;
    this.reloading = false;
    this.currentId = 'smg';
  }

  switchTo(id) {
    if (!this.weapons[id] || !this.weapons[id].unlocked) return false;
    if (this.currentId === id) return false;
    this.currentId = id;
    this.reloading = false;
    this.reloadTimer = 0;
    this.cooldown = 0.25;
    return true;
  }

  cycle(dir) {
    const order = ['revolver', 'rifle', 'smg'].filter((id) => this.weapons[id].unlocked);
    if (order.length <= 1) return;
    const idx = order.indexOf(this.currentId);
    const next = order[(idx + dir + order.length) % order.length];
    this.switchTo(next);
  }

  startReload(sound) {
    const def = this.currentDef;
    const st = this.currentState;
    if (this.reloading || st.mag >= def.magSize || st.reserve <= 0) return false;
    this.reloading = true;
    this.reloadTimer = def.reloadTime;
    sound?.playReload();
    return true;
  }

  tryFire(sound) {
    if (this.cooldown > 0 || this.reloading) return null;
    const def = this.currentDef;
    const st = this.currentState;

    if (st.mag <= 0) {
      if (st.reserve > 0) {
        this.startReload(sound);
      } else {
        this.cooldown = 0.35;
        sound?.playEmptyClick();
      }
      return { empty: true };
    }

    st.mag--;
    this.cooldown = def.fireRate;
    this.recoil = 1.0;
    this.muzzleFlash = 0.085;
    sound?.playGunshot(def.id, 0);

    // Eject brass shell animation on 2D overlay
    if (def.id !== 'revolver') {
      this.shells.push({
        x: 0.62,
        y: 0.72,
        vx: 0.32 + Math.random() * 0.18,
        vy: -0.45 - Math.random() * 0.2,
        rot: Math.random() * 6,
        vrot: 10 + Math.random() * 8,
        life: 0.7,
      });
    }

    // Auto-start reload if magazine just emptied and reserve exists
    if (st.mag === 0 && st.reserve > 0) {
      setTimeout(() => {
        if (this.currentId === def.id && this.currentState.mag === 0 && !this.reloading) {
          this.startReload(sound);
        }
      }, 190);
    }

    return {
      fired: true,
      def,
      spread: def.spread + (def.adsSpread - def.spread) * this.ads,
    };
  }

  triggerHitMarker(headshot = false) {
    this.hitMarkerTimer = headshot ? 0.26 : 0.18;
    this.hitMarkerHead = headshot;
  }

  update(dt, isMoving, isAiming, mouseDX, mouseDY) {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.muzzleFlash > 0) this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);
    if (this.hitMarkerTimer > 0) this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - dt);

    this.recoil = Math.max(0, this.recoil - dt * 5.8);
    const targetAds = (isAiming && !this.reloading) ? 1 : 0;
    this.ads += (targetAds - this.ads) * Math.min(1, dt * 13);

    // Smooth viewmodel inertia
    this.swayX += (Math.max(-24, Math.min(24, -mouseDX * 0.45)) - this.swayX) * Math.min(1, dt * 10);
    this.swayY += (Math.max(-18, Math.min(18, -mouseDY * 0.35)) - this.swayY) * Math.min(1, dt * 10);
    if (isMoving) this.bobPhase += dt * (isAiming ? 6.0 : 9.2);

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const def = this.currentDef;
        const st = this.currentState;
        const needed = def.magSize - st.mag;
        const take = Math.min(needed, st.reserve);
        st.mag += take;
        st.reserve -= take;
        this.reloading = false;
      }
    }

    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 1.8 * dt;
      s.rot += s.vrot * dt;
      s.life -= dt;
      if (s.life <= 0) this.shells.splice(i, 1);
    }
  }

  renderOverlay(ctx, w, h, lightTint = '#d9c5a6', damageFlash = 0, lowHealth = 0) {
    ctx.clearRect(0, 0, w, h);

    // Subtle dark atmospheric vignette + low-health crimson edge
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.34, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(${Math.round(8 + lowHealth * 115)}, ${Math.round(8 - lowHealth * 4)}, ${Math.round(12 - lowHealth * 6)}, ${0.46 + lowHealth * 0.3})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    if (damageFlash > 0) {
      ctx.fillStyle = `rgba(170, 22, 24, ${damageFlash * 0.42})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Ejected brass shell casings
    for (const s of this.shells) {
      ctx.save();
      ctx.translate(s.x * w, s.y * h);
      ctx.rotate(s.rot);
      ctx.fillStyle = '#d9b152';
      ctx.fillRect(-5, -2, 10, 4);
      ctx.restore();
    }

    // Weapon Viewmodel Transform
    const scale = Math.min(w, h) / 720;
    const bobX = Math.cos(this.bobPhase) * 9 * (1 - this.ads * 0.72) * scale;
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 10 * (1 - this.ads * 0.72) * scale;
    const reloadDip = this.reloading ? Math.sin((1 - this.reloadTimer / this.currentDef.reloadTime) * Math.PI) * 140 * scale : 0;
    const kickY = this.recoil * 26 * scale;
    const kickRot = -this.recoil * 0.12;

    const baseX = w * (0.69 - this.ads * 0.19) + bobX + this.swayX * scale;
    const baseY = h * (0.86 - this.ads * 0.06) + bobY + this.swayY * scale + reloadDip + kickY;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate(kickRot);
    ctx.scale(scale, scale);

    // Muzzle flash behind sightline
    if (this.muzzleFlash > 0) {
      const fy = this.currentId === 'rifle' ? -250 : (this.currentId === 'smg' ? -225 : -210);
      const fx = this.currentId === 'revolver' ? -10 : -14;
      const r = 74 + Math.random() * 28;
      const g = ctx.createRadialGradient(fx, fy, 4, fx, fy, r);
      g.addColorStop(0, 'rgba(255, 250, 220, 0.96)');
      g.addColorStop(0.35, 'rgba(255, 190, 70, 0.78)');
      g.addColorStop(1, 'rgba(255, 95, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.currentId === 'revolver') {
      this._drawWebley(ctx);
    } else if (this.currentId === 'rifle') {
      this._drawMAS36(ctx);
    } else {
      this._drawSten(ctx);
    }

    // Warm rim highlight from world torches/muzzle flash
    if (this.muzzleFlash > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255, 200, 110, 0.25)';
      ctx.fillRect(-200, -320, 400, 480);
    }
    ctx.restore();

    // Crisp tactical crosshair (fades smoothly during ADS)
    const cx = w * 0.5;
    const cy = h * 0.5;
    const chAlpha = Math.max(0.18, 0.82 - this.ads * 0.65);
    const gap = 8 + this.recoil * 16 - this.ads * 4;
    const arm = 9;

    ctx.strokeStyle = `rgba(242, 232, 208, ${chAlpha})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - gap - arm, cy); ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy);       ctx.lineTo(cx + gap + arm, cy);
    ctx.moveTo(cx, cy - gap - arm); ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap);       ctx.lineTo(cx, cy + gap + arm);
    ctx.stroke();

    // Center pip
    ctx.fillStyle = `rgba(242, 232, 208, ${0.85})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 1.7, 0, Math.PI * 2);
    ctx.fill();

    // Hit confirmation X marker
    if (this.hitMarkerTimer > 0) {
      const a = Math.min(1, this.hitMarkerTimer * 5);
      ctx.strokeStyle = this.hitMarkerHead ? `rgba(255, 198, 72, ${a})` : `rgba(235, 68, 58, ${a})`;
      ctx.lineWidth = this.hitMarkerHead ? 2.8 : 2.1;
      const d1 = 6, d2 = 15;
      ctx.beginPath();
      ctx.moveTo(cx - d2, cy - d2); ctx.lineTo(cx - d1, cy - d1);
      ctx.moveTo(cx + d2, cy - d2); ctx.lineTo(cx + d1, cy - d1);
      ctx.moveTo(cx - d2, cy + d2); ctx.lineTo(cx - d1, cy + d1);
      ctx.moveTo(cx + d2, cy + d2); ctx.lineTo(cx + d1, cy + d1);
      ctx.stroke();
    }
  }

  _drawWebley(ctx) {
    // Gloved spy hand & trench coat cuff
    ctx.fillStyle = '#2d2823';
    ctx.beginPath();
    ctx.roundRect(-22, 18, 96, 175, 14);
    ctx.fill();
    ctx.fillStyle = '#4a3829'; // leather glove
    ctx.beginPath();
    ctx.roundRect(-34, -42, 74, 92, 16);
    ctx.fill();

    // Revolver barrel & top-break rib
    const steel = ctx.createLinearGradient(-32, -210, 26, -210);
    steel.addColorStop(0, '#2a2e33');
    steel.addColorStop(0.45, '#59616b');
    steel.addColorStop(1, '#1e2126');
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.roundRect(-24, -208, 28, 128, 5);
    ctx.fill();

    // Front blade sight
    ctx.fillStyle = '#181a1d';
    ctx.fillRect(-13, -220, 6, 16);

    // Fluted 6-shot cylinder
    ctx.fillStyle = '#363b42';
    ctx.beginPath();
    ctx.roundRect(-34, -124, 48, 54, 10);
    ctx.fill();
    ctx.fillStyle = '#1d2024';
    ctx.fillRect(-26, -118, 6, 40);
    ctx.fillRect(-13, -118, 6, 40);
    ctx.fillRect(0, -118, 6, 40);

    // Brass hammer spur & walnut grip peeking through glove
    ctx.fillStyle = '#6b4425';
    ctx.beginPath();
    ctx.roundRect(-22, -62, 34, 72, 8);
    ctx.fill();
    ctx.fillStyle = '#8b7346';
    ctx.fillRect(-14, -76, 8, 16);
  }

  _drawMAS36(ctx) {
    // Trench coat sleeve + leather gloved support hand
    ctx.fillStyle = '#2b2622';
    ctx.beginPath();
    ctx.roundRect(-18, 25, 120, 170, 16);
    ctx.fill();

    // Long oiled walnut rifle stock
    const wood = ctx.createLinearGradient(-44, -180, 40, 40);
    wood.addColorStop(0, '#5a361d');
    wood.addColorStop(0.5, '#7a4d2c');
    wood.addColorStop(1, '#3d2312');
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.moveTo(-26, -188);
    ctx.lineTo(14, -188);
    ctx.lineTo(48, 110);
    ctx.lineTo(-22, 110);
    ctx.closePath();
    ctx.fill();

    // Heavy blued steel barrel & hooded front sight
    ctx.fillStyle = '#2e3338';
    ctx.fillRect(-16, -264, 18, 130);
    ctx.fillStyle = '#4e565e';
    ctx.fillRect(-12, -264, 5, 125);
    // Sight hood ears
    ctx.fillStyle = '#1a1d20';
    ctx.fillRect(-22, -258, 5, 18);
    ctx.fillRect(3, -258, 5, 18);
    ctx.fillRect(-9, -262, 4, 14);

    // Steel receiver & curved bolt handle
    ctx.fillStyle = '#3b4148';
    ctx.fillRect(-22, -135, 34, 64);
    ctx.fillStyle = '#68717a';
    ctx.beginPath();
    ctx.roundRect(10, -108, 36, 11, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(46, -102, 10, 0, Math.PI * 2);
    ctx.fill();

    // Leather-gloved trigger hand
    ctx.fillStyle = '#4a3829';
    ctx.beginPath();
    ctx.roundRect(-24, -22, 68, 72, 16);
    ctx.fill();
  }

  _drawSten(ctx) {
    // Tubular WWII Sten Mk II SMG — iconic side-mounted magazine & perforated shroud!
    // Left-mounted horizontal 32-round magazine
    ctx.fillStyle = '#272b30';
    ctx.beginPath();
    ctx.roundRect(-165, -138, 138, 26, 4);
    ctx.fill();
    ctx.fillStyle = '#444b52';
    ctx.fillRect(-155, -134, 118, 5);

    // Barrel & perforated cooling shroud
    const metal = ctx.createLinearGradient(-32, -230, 24, -230);
    metal.addColorStop(0, '#22262a');
    metal.addColorStop(0.5, '#4b525a');
    metal.addColorStop(1, '#1b1e22');
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.roundRect(-24, -228, 32, 230, 12);
    ctx.fill();

    // Shroud cooling holes
    ctx.fillStyle = '#111315';
    for (let y = -205; y <= -150; y += 18) {
      ctx.beginPath();
      ctx.arc(-8, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Front iron sight & cocking handle
    ctx.fillStyle = '#181b1e';
    ctx.fillRect(-11, -238, 6, 14);
    ctx.fillStyle = '#5c646d';
    ctx.fillRect(6, -108, 28, 9);

    // Wire skeleton stock & gloved hands
    ctx.strokeStyle = '#393f46';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(18, 120);
    ctx.stroke();

    ctx.fillStyle = '#473628';
    ctx.beginPath();
    ctx.roundRect(-34, -46, 72, 82, 16);
    ctx.fill();
    // Support hand gripping magazine housing
    ctx.beginPath();
    ctx.roundRect(-84, -148, 54, 48, 14);
    ctx.fill();
  }
}
