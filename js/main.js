// Abbaye de Mort — Main Game Controller & Loop

import {
  mat4Perspective,
  mat4FPSView,
  resolveCircleAABB,
  distXZ,
  clamp,
  lerp,
} from './engine/math.js';
import { Renderer } from './engine/renderer.js';
import { SoundEngine } from './engine/audio.js';
import { buildAbbeyWorld, getZoneAt } from './world/abbeyMap.js';
import { renderCharacter, renderAirborneDrop } from './world/characters.js';
import { WeaponSystem } from './gameplay/weapons.js';
import { CombatSystem } from './gameplay/combat.js';
import { StoryDirector, ACT_CARDS, LORE_ENTRIES } from './gameplay/story.js';
import { drawActVignette, drawTroopMovementChart, drawAbbeyMap } from './ui/dossier.js';

// Progressive fallback for <dialog closedby="any"> on browsers without native support (e.g., Safari)
function installClosedByFallback() {
  if ('closedBy' in HTMLDialogElement.prototype) return;
  const outside = (e, dialog) => {
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = outside(e, dialog);
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && outside(e, dialog)) dialog.close();
    });
  }
}

class AbbayeGame {
  constructor() {
    this.glCanvas = document.getElementById('gl-canvas');
    this.weaponCanvas = document.getElementById('weapon-canvas');
    this.weaponCtx = this.weaponCanvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap-canvas');

    this.ui = {
      titleScreen: document.getElementById('title-screen'),
      titleVignette: document.getElementById('title-vignette'),
      hud: document.getElementById('hud'),
      srAnnouncer: document.getElementById('sr-announcer'),
      act: document.getElementById('hud-act'),
      zone: document.getElementById('hud-zone'),
      objective: document.getElementById('hud-objective'),
      countdown: document.getElementById('hud-countdown'),
      hours: document.getElementById('hud-hours'),
      interactPrompt: document.getElementById('interact-prompt'),
      interactLabel: document.getElementById('interact-label'),
      clickToAim: document.getElementById('click-to-aim'),
      dialogueBox: document.getElementById('dialogue-box'),
      dialogueCode: document.getElementById('dialogue-code'),
      dialogueSpeaker: document.getElementById('dialogue-speaker'),
      dialogueText: document.getElementById('dialogue-text'),
      healthNum: document.getElementById('hud-health-num'),
      healthBar: document.getElementById('hud-health-bar'),
      enemies: document.getElementById('hud-enemies'),
      lore: document.getElementById('hud-lore'),
      mag: document.getElementById('hud-mag'),
      reserve: document.getElementById('hud-reserve'),
      weaponName: document.getElementById('hud-weapon-name'),
      ammoWarn: document.getElementById('hud-ammo-warn'),
      slot1: document.getElementById('slot-1'),
      slot2: document.getElementById('slot-2'),
      slot3: document.getElementById('slot-3'),
      // Dialogs
      actDialog: document.getElementById('act-dialog'),
      actNumeral: document.getElementById('act-dialog-numeral'),
      actTitle: document.getElementById('act-dialog-title'),
      actLocation: document.getElementById('act-dialog-location'),
      actVignette: document.getElementById('act-vignette-canvas'),
      actSummary: document.getElementById('act-dialog-summary'),
      actNote: document.getElementById('act-dialog-note'),
      dossierDialog: document.getElementById('dossier-dialog'),
      troopChart: document.getElementById('troop-chart-canvas'),
      dossierMap: document.getElementById('dossier-map-canvas'),
      dossierLoreCount: document.getElementById('dossier-lore-count'),
      dossierLoreList: document.getElementById('dossier-lore-list'),
      dossierTranscript: document.getElementById('dossier-transcript'),
      pauseDialog: document.getElementById('pause-dialog'),
      endingDialog: document.getElementById('ending-dialog'),
      endingEyebrow: document.getElementById('ending-eyebrow'),
      endingTitle: document.getElementById('ending-title'),
      endingVignette: document.getElementById('ending-vignette-canvas'),
      endingSummary: document.getElementById('ending-summary'),
      endingStats: document.getElementById('ending-stats'),
      // Settings controls
      optSensitivity: document.getElementById('opt-sensitivity'),
      optVolume: document.getElementById('opt-volume'),
      optMute: document.getElementById('opt-mute'),
      optAimAssist: document.getElementById('opt-aim-assist'),
    };

    this.renderer = new Renderer(this.glCanvas);
    this.sound = new SoundEngine();
    this.world = buildAbbeyWorld(this.renderer.gl);
    this.weapons = new WeaponSystem();
    this.combat = new CombatSystem();
    this.story = new StoryDirector();

    this.story.onAnnouncement = (msg) => {
      this.ui.srAnnouncer.textContent = '';
      setTimeout(() => { this.ui.srAnnouncer.textContent = msg; }, 30);
    };

    this.settings = {
      sensitivity: 1.0,
      aimAssist: true,
    };

    this.keys = new Set();
    this.mouseDown = false;
    this.rightMouseDown = false;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.pointerLocked = false;
    this.started = false;
    this.paused = true;
    this.time = 0;
    this.lightning = 0;
    this.nextLightning = 6;
    this.nearInteractable = null;

    this.player = {
      x: 0, y: 0, z: 45,
      yaw: 0, pitch: 0.04,
      hp: 100, maxHp: 100,
      speed: 6.4,
      damageFlash: 0,
      regenDelay: 0,
      bobTime: 0,
    };

    this.viewMat = new Float32Array(16);
    this.projMat = new Float32Array(16);

    installClosedByFallback();
    drawActVignette(this.ui.titleVignette, 'cliff');
    this._bindEvents();
    this._resize();
    this._lastTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._resize());

    document.getElementById('btn-start').addEventListener('click', () => this.startNewGame());
    document.getElementById('btn-controls').addEventListener('click', () => this.openPauseDialog());
    document.getElementById('btn-hud-dossier').addEventListener('click', () => this.openDossier());
    document.getElementById('btn-hud-pause').addEventListener('click', () => this.openPauseDialog());

    // Settings inputs
    this.ui.optSensitivity.addEventListener('input', (e) => {
      this.settings.sensitivity = parseFloat(e.target.value);
    });
    this.ui.optVolume.addEventListener('input', (e) => {
      this.sound.setVolume(parseFloat(e.target.value));
    });
    this.ui.optMute.addEventListener('change', (e) => {
      this.sound.setMuted(e.target.checked);
    });
    this.ui.optAimAssist.addEventListener('change', (e) => {
      this.settings.aimAssist = e.target.checked;
    });

    // Dialog close handlers (always read & reset returnValue per modern-web-guidance)
    this.ui.actDialog.addEventListener('close', () => {
      this.ui.actDialog.returnValue = '';
      if (this.started && !this.story.ended) {
        this.paused = false;
        this._requestPointerLock();
      }
    });

    this.ui.dossierDialog.addEventListener('close', () => {
      this.ui.dossierDialog.returnValue = '';
      if (this.started && !this.story.ended) {
        this.paused = false;
        this._requestPointerLock();
      }
    });

    this.ui.pauseDialog.addEventListener('close', () => {
      const choice = this.ui.pauseDialog.returnValue;
      this.ui.pauseDialog.returnValue = '';
      if (choice === 'restart') {
        this.startNewGame();
      } else if (choice === 'dossier' && this.started) {
        this.openDossier();
      } else if (this.started && !this.story.ended) {
        this.paused = false;
        this._requestPointerLock();
      }
    });

    this.ui.endingDialog.addEventListener('close', () => {
      const choice = this.ui.endingDialog.returnValue;
      this.ui.endingDialog.returnValue = '';
      if (choice === 'replay') {
        this.startNewGame();
      }
    });

    // Pointer lock & mouse controls
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.glCanvas;
      this._updateClickToAimBanner();
    });

    this.glCanvas.addEventListener('mousedown', (e) => {
      if (!this.started || this.paused) return;
      this.sound.init();
      if (!this.pointerLocked) {
        this._requestPointerLock();
      }
      if (e.button === 0) {
        this.mouseDown = true;
        this._handleFire();
      } else if (e.button === 2) {
        this.rightMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });

    window.addEventListener('contextmenu', (e) => {
      if (this.started && !this.paused) e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.started || this.paused) return;
      if (this.pointerLocked) {
        const s = 0.0022 * this.settings.sensitivity;
        this.player.yaw -= e.movementX * s;
        this.player.pitch = clamp(this.player.pitch - e.movementY * s, -1.25, 1.32);
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });

    window.addEventListener('wheel', (e) => {
      if (!this.started || this.paused) return;
      if (Math.abs(e.deltaY) > 4) {
        this.weapons.cycle(e.deltaY > 0 ? 1 : -1);
      }
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' && this.started) {
        e.preventDefault();
        if (this.ui.dossierDialog.open) this.ui.dossierDialog.close();
        else if (!this._anyDialogOpen()) this.openDossier();
        return;
      }
      if (e.code === 'KeyM' && this.started && !this._anyDialogOpen()) {
        this.openDossier();
        return;
      }
      if (e.code === 'KeyP' && this.started && !this._anyDialogOpen()) {
        this.openPauseDialog();
        return;
      }

      if (!this.started || this.paused) return;
      this.keys.add(e.code);

      if (e.code === 'KeyR') this.weapons.startReload(this.sound);
      if (e.code === 'Digit1') this.weapons.switchTo('revolver');
      if (e.code === 'Digit2') this.weapons.switchTo('rifle');
      if (e.code === 'Digit3') this.weapons.switchTo('smg');
      if (e.code === 'KeyE' || e.code === 'KeyF') this._tryInteract();
      if (e.code === 'Space') {
        e.preventDefault();
        this.mouseDown = true;
        this._handleFire();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.mouseDown = false;
    });
  }

  _anyDialogOpen() {
    return this.ui.actDialog.open || this.ui.dossierDialog.open || this.ui.pauseDialog.open || this.ui.endingDialog.open;
  }

  _requestPointerLock() {
    try {
      const res = this.glCanvas.requestPointerLock?.();
      if (res && typeof res.catch === 'function') res.catch(() => {});
    } catch {}
  }

  _releasePointerLock() {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch {}
  }

  _updateClickToAimBanner() {
    this.ui.clickToAim.hidden = !(this.started && !this.paused && !this.pointerLocked);
  }

  _resize() {
    this.renderer.resize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.weaponCanvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    this.weaponCanvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  }

  startNewGame() {
    this.sound.init();
    this.sound.stopAirbornePropellers();
    this.sound.setTension(0.25);

    this.world = buildAbbeyWorld(this.renderer.gl);
    this.weapons.reset();
    this.combat.reset();
    this.story.reset();

    this.player = {
      x: 0, y: 0, z: 45.0,
      yaw: 0, pitch: 0.03,
      hp: 100, maxHp: 100,
      speed: 6.4,
      damageFlash: 0,
      regenDelay: 0,
      bobTime: 0,
    };

    this.started = true;
    this.paused = true;
    this.ui.titleScreen.hidden = true;
    this.ui.hud.hidden = false;

    this.story.startAct1(this.combat, this.world, this.sound);
    this.showActCard(ACT_CARDS[1]);
  }

  showActCard(card) {
    this.paused = true;
    this.mouseDown = false;
    this.keys.clear();
    this._releasePointerLock();

    this.ui.actNumeral.textContent = card.numeral;
    this.ui.actTitle.textContent = card.title;
    this.ui.actLocation.textContent = card.location;
    this.ui.actSummary.textContent = card.summary;
    this.ui.actNote.textContent = `OBJECTIVE VECTOR: ${card.mapNote}`;
    drawActVignette(this.ui.actVignette, card.sketchType);
    if (!this.ui.actDialog.open) this.ui.actDialog.showModal();
  }

  openDossier() {
    this.paused = true;
    this.mouseDown = false;
    this.keys.clear();
    this._releasePointerLock();

    drawTroopMovementChart(this.ui.troopChart, this.story.act);
    drawAbbeyMap(this.ui.dossierMap, this.player, this.combat, this.story, this.world);

    this.ui.dossierLoreCount.textContent = String(this.story.foundLore.length);
    this.ui.dossierLoreList.innerHTML = '';
    if (this.story.foundLore.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Explore the Courtyard, Altar, and West Cloister to recover hidden field dispatches.';
      this.ui.dossierLoreList.appendChild(li);
    } else {
      for (const id of this.story.foundLore) {
        const entry = LORE_ENTRIES[id];
        const li = document.createElement('li');
        const st = document.createElement('strong');
        st.textContent = entry.title;
        li.appendChild(st);
        li.appendChild(document.createTextNode(entry.body));
        this.ui.dossierLoreList.appendChild(li);
      }
    }

    this.ui.dossierTranscript.innerHTML = '';
    const recent = this.story.transcript.slice(-14).reverse();
    for (const item of recent) {
      const li = document.createElement('li');
      const meta = document.createElement('span');
      meta.className = 'tx-meta';
      meta.textContent = `ACT ${item.act} • [${item.code}] ${item.speaker}`;
      li.appendChild(meta);
      li.appendChild(document.createTextNode(item.text));
      this.ui.dossierTranscript.appendChild(li);
    }

    if (!this.ui.dossierDialog.open) this.ui.dossierDialog.showModal();
  }

  openPauseDialog() {
    this.paused = true;
    this.mouseDown = false;
    this.keys.clear();
    this._releasePointerLock();
    if (!this.ui.pauseDialog.open) this.ui.pauseDialog.showModal();
  }

  showEnding(victory) {
    this.paused = true;
    this.mouseDown = false;
    this.keys.clear();
    this._releasePointerLock();

    if (victory) {
      this.ui.endingEyebrow.textContent = 'MISSION ACCOMPLISHED • DAWN OVER CENTRAL FRANCE';
      this.ui.endingTitle.textContent = 'THE PARATROOPERS MADE IT IN TIME';
      this.ui.endingSummary.textContent =
        'As golden dawn breaks over the hundred-meter outcrop of Abbaye de Mort, dozens of British 1st Airborne silk parachutes fill the sky. The German assault collapses under combined Maquis and Airborne fire. Abbot Henri rings the shattered abbey bell, and your stolen troop charts reach Allied High Command in time to reshape the liberation of France.';
      drawActVignette(this.ui.endingVignette, 'paratroopers');
    } else {
      this.ui.endingEyebrow.textContent = 'MISSION FAILED • ABBAYE DE MORT FALLEN';
      this.ui.endingTitle.textContent = 'THE CHARTS WERE LOST IN THE RUINS';
      this.ui.endingSummary.textContent =
        'Overwhelmed in the rain-swept stone corridors of Abbaye de Mort, Agent Alistair Finch fell before British paratroopers could reach the outcrop. Yet Abbot Henri\'s wireless still crackles in the darkness—rise again and hold the line.';
      drawActVignette(this.ui.endingVignette, 'retreat');
    }

    this.ui.endingStats.innerHTML = `
      <div><dt>Enemies Defeated</dt><dd>${this.combat.kills}</dd></div>
      <div><dt>Headshots</dt><dd>${this.combat.headshots}</dd></div>
      <div><dt>Field Lore Found</dt><dd>${this.story.foundLore.length} / 3</dd></div>
    `;
    if (!this.ui.endingDialog.open) this.ui.endingDialog.showModal();
  }

  _tryInteract() {
    if (!this.nearInteractable) return;
    this.story.interact(this.nearInteractable, this.combat, this.world, this.weapons, this.sound);
  }

  _handleFire() {
    const res = this.weapons.tryFire(this.sound);
    if (!res || !res.fired) return;

    const cp = Math.cos(this.player.pitch);
    const aimDir = {
      x: -Math.sin(this.player.yaw) * cp,
      y: Math.sin(this.player.pitch),
      z: -Math.cos(this.player.yaw) * cp,
    };
    const camPos = { x: this.player.x, y: this.player.y + 1.66, z: this.player.z };

    // Kick pitch up realistically
    this.player.pitch = clamp(this.player.pitch + res.def.recoilPitch * (1 - this.weapons.ads * 0.4), -1.25, 1.32);

    this.combat.firePlayerShot(
      camPos,
      aimDir,
      res,
      this.world,
      this.weapons,
      this.sound,
      this.settings.aimAssist
    );
  }

  _updatePlayer(dt) {
    // Keyboard look fallback (Arrow keys or Q/E for laptop trackpad players!)
    const turnSpeed = 2.05;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyQ')) this.player.yaw += turnSpeed * dt;
    if (this.keys.has('ArrowRight')) this.player.yaw -= turnSpeed * dt;
    if (this.keys.has('ArrowUp')) this.player.pitch = clamp(this.player.pitch + 1.3 * dt, -1.2, 1.25);
    if (this.keys.has('ArrowDown')) this.player.pitch = clamp(this.player.pitch - 1.3 * dt, -1.2, 1.25);

    const sinY = Math.sin(this.player.yaw);
    const cosY = Math.cos(this.player.yaw);
    let mx = 0, mz = 0;

    if (this.keys.has('KeyW')) { mx -= sinY; mz -= cosY; }
    if (this.keys.has('KeyS')) { mx += sinY; mz += cosY; }
    if (this.keys.has('KeyA')) { mx -= cosY; mz += sinY; }
    if (this.keys.has('KeyD')) { mx += cosY; mz -= sinY; }

    const ml = Math.hypot(mx, mz);
    const isMoving = ml > 0.01;
    const isAiming = this.rightMouseDown || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    if (isMoving) {
      const spd = this.player.speed * (isAiming ? 0.62 : 1.0);
      this.player.x += (mx / ml) * spd * dt;
      this.player.z += (mz / ml) * spd * dt;
      this.player.bobTime += dt * (isAiming ? 6.0 : 9.4);
    }

    // Resolve wall collisions cleanly
    for (let pass = 0; pass < 2; pass++) {
      for (const c of this.world.colliders) {
        resolveCircleAABB(this.player, 0.44, 0, 1.8, c);
      }
    }

    // Continuous fire for automatic Sten Mk II SMG
    if (this.mouseDown && this.weapons.currentDef.auto) {
      this._handleFire();
    }

    this.weapons.update(dt, isMoving, isAiming, this.mouseDX, this.mouseDY);
    this.mouseDX = 0;
    this.mouseDY = 0;

    // Gentle combat health recovery after staying behind cover
    if (this.player.damageFlash > 0) this.player.damageFlash = Math.max(0, this.player.damageFlash - dt * 2.4);
    if (this.player.regenDelay > 0) {
      this.player.regenDelay -= dt;
    } else if (this.player.hp < this.player.maxHp && this.player.hp > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + dt * 7.5);
    }

    // Find closest active interactable prop
    this.nearInteractable = null;
    let bestD = 999;
    for (const it of this.world.interactables) {
      if (!it.active || it.collected) continue;
      const d = distXZ(this.player, it);
      if (d <= it.radius && d < bestD) {
        bestD = d;
        this.nearInteractable = it;
      }
    }
  }

  _buildAtmosphere(dt) {
    // Occasional atmospheric storm lightning during Acts I-IV
    const dawn = this.story.dawnProgress;
    this.nextLightning -= dt;
    if (this.nextLightning <= 0 && dawn < 0.45) {
      this.lightning = 0.95;
      this.nextLightning = 11 + Math.random() * 14;
      if (this.started && !this.paused) this.sound.playThunder();
    }
    this.lightning = Math.max(0, this.lightning - dt * 2.8);

    // Smooth atmospheric color shift from Stormy Dusk/Night -> Burning Crimson Siege -> Golden French Dawn!
    return {
      dawn,
      lightning: this.lightning,
      skyZenith: [
        lerp(0.05, 0.19, dawn),
        lerp(0.08, 0.25, dawn),
        lerp(0.15, 0.42, dawn),
      ],
      skyHorizon: [
        lerp(0.14, 0.88, dawn),
        lerp(0.17, 0.48, dawn),
        lerp(0.24, 0.28, dawn),
      ],
      fogColor: [
        lerp(0.11, 0.56, dawn),
        lerp(0.14, 0.38, dawn),
        lerp(0.20, 0.30, dawn),
      ],
      fogDensity: lerp(0.0155, 0.0095, dawn),
      sunDir: [
        lerp(-0.45, 0.78, dawn),
        lerp(0.55, 0.32, dawn),
        lerp(-0.52, -0.25, dawn),
      ],
      sunColor: [
        lerp(0.32, 1.05, dawn),
        lerp(0.38, 0.72, dawn),
        lerp(0.52, 0.45, dawn),
      ],
      ambientSky: [
        lerp(0.2, 0.48, dawn),
        lerp(0.24, 0.42, dawn),
        lerp(0.33, 0.45, dawn),
      ],
      ambientGround: [
        lerp(0.12, 0.25, dawn),
        lerp(0.11, 0.2, dawn),
        lerp(0.13, 0.18, dawn),
      ],
    };
  }

  _collectDynamicLights() {
    const lights = [];

    // 1. Player muzzle flash illuminates nearby Abbey stone walls!
    if (this.weapons.muzzleFlash > 0) {
      lights.push({
        x: this.player.x - Math.sin(this.player.yaw) * 0.8,
        y: this.player.y + 1.55,
        z: this.player.z - Math.cos(this.player.yaw) * 0.8,
        radius: 13,
        color: [1.0, 0.76, 0.36],
        intensity: 2.3,
      });
    }

    // 2. Crimson Resistance Flares soaring up the 100m cliff face!
    for (const f of this.combat.flares) {
      lights.push({
        x: f.x, y: f.y, z: f.z,
        radius: 36,
        color: [1.0, 0.18, 0.14],
        intensity: 2.4,
      });
    }

    // 3. Abbot Henri's warm oil lantern
    const abbot = this.combat.getAbbot();
    if (abbot && abbot.state !== 'dead') {
      lights.push({
        x: abbot.x, y: abbot.y + 1.35, z: abbot.z,
        radius: 11,
        color: [1.0, 0.72, 0.3],
        intensity: 1.45,
      });
    }

    // 4. Nearest flickering Abbey braziers & glowing green SOE wireless tube
    const sortedBraziers = [...this.world.braziers].sort(
      (a, b) => distXZ(this.player, a) - distXZ(this.player, b)
    );
    for (const b of sortedBraziers) {
      if (lights.length >= 10) break;
      const flick = b.steady ? 1.0 : (0.86 + Math.sin(this.time * 9.5 + b.phase) * 0.14);
      lights.push({
        x: b.x, y: b.y, z: b.z,
        radius: b.radius,
        color: b.color,
        intensity: b.intensity * flick,
      });
    }
    return lights;
  }

  _updateHUD() {
    const zone = getZoneAt(this.player.x, this.player.z);
    this.ui.act.textContent = `ACT ${['I', 'II', 'III', 'IV', 'V'][this.story.act - 1] || this.story.act}`;
    this.ui.zone.textContent = zone.name;
    this.ui.objective.textContent = this.story.objective;

    if (this.story.act === 5 && this.story.stage === 'act5_siege') {
      this.ui.countdown.hidden = false;
      const hrs = Math.floor(this.story.hoursRemaining);
      const mins = Math.floor((this.story.hoursRemaining - hrs) * 60);
      this.ui.hours.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    } else {
      this.ui.countdown.hidden = true;
    }

    // Health via CSS custom properties (per modern-web-guidance: html)
    const hp = Math.max(0, Math.ceil(this.player.hp));
    const pct = `${hp}%`;
    const hue = Math.round(lerp(6, 125, hp / 100));
    this.ui.healthNum.textContent = String(hp);
    this.ui.healthBar.style.setProperty('--health-pct', pct);
    this.ui.healthBar.style.setProperty('--health-hue', String(hue));

    this.ui.enemies.textContent = String(this.combat.getLivingEnemies().length);
    this.ui.lore.textContent = `${this.story.foundLore.length}/3`;

    // Weapons & ammo
    const def = this.weapons.currentDef;
    const st = this.weapons.currentState;
    this.ui.mag.textContent = this.weapons.reloading ? '...' : String(st.mag);
    this.ui.reserve.textContent = String(st.reserve);
    this.ui.weaponName.textContent = this.weapons.reloading ? `Reloading ${def.name}...` : def.name;
    this.ui.ammoWarn.hidden = this.weapons.totalAmmo > 10;

    const slots = [
      [this.ui.slot1, 'revolver'],
      [this.ui.slot2, 'rifle'],
      [this.ui.slot3, 'smg'],
    ];
    for (const [el, id] of slots) {
      el.classList.toggle('active', this.weapons.currentId === id);
      el.classList.toggle('locked', !this.weapons.weapons[id].unlocked);
    }

    // Interact prompt
    if (this.nearInteractable) {
      this.ui.interactPrompt.hidden = false;
      this.ui.interactLabel.textContent = this.nearInteractable.label;
    } else {
      this.ui.interactPrompt.hidden = true;
    }

    // Dialogue / Wireless overlay
    if (this.story.currentDialogue) {
      const d = this.story.currentDialogue;
      this.ui.dialogueBox.hidden = false;
      this.ui.dialogueBox.style.setProperty('--speaker-accent', d.speaker.accent);
      this.ui.dialogueCode.textContent = d.speaker.code;
      this.ui.dialogueSpeaker.textContent = d.speaker.name;
      this.ui.dialogueText.textContent = d.text;
    } else {
      this.ui.dialogueBox.hidden = true;
    }

    this._updateClickToAimBanner();
    drawAbbeyMap(this.minimapCanvas, this.player, this.combat, this.story, this.world);
  }

  _loop(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - this._lastTime) / 1000));
    this._lastTime = now;
    this.time += dt;

    if (this.started && !this.paused && !this._anyDialogOpen() && !this.story.ended) {
      this._updatePlayer(dt);
      this.world.updateDynamic(dt);
      this.combat.update(dt, this.player, this.world, this.sound, this.story, (dmg) => {
        this.player.hp -= dmg;
        this.player.damageFlash = 1.0;
        this.player.regenDelay = 4.2;
        this.sound.playPlayerHurt();
        if (this.player.hp <= 0 && !this.story.ended) {
          this.player.hp = 0;
          this.story.ended = true;
          this.showEnding(false);
        }
      });
      this.story.update(
        dt,
        this.player,
        this.combat,
        this.world,
        this.weapons,
        this.sound,
        (card) => this.showActCard(card),
        (win) => this.showEnding(win)
      );
      this._updateHUD();
    }

    // Render 3D scene (even on title screen as a dramatic live orbit preview of Abbaye de Mort!)
    const atmosphere = this._buildAtmosphere(dt);
    const aspect = this.renderer.canvas.width / Math.max(1, this.renderer.canvas.height);

    let camX, camY, camZ, yaw, pitch;
    const baseFov = this.started
      ? lerp(68, this.weapons.currentDef.adsFov, this.weapons.ads)
      : 62;
    const fovRad = (baseFov * Math.PI) / 180;

    if (this.started) {
      const bobY = Math.sin(this.player.bobTime * 2) * 0.042 * (1 - this.weapons.ads * 0.7);
      camX = this.player.x;
      camY = this.player.y + 1.66 + bobY;
      camZ = this.player.z;
      yaw = this.player.yaw;
      pitch = this.player.pitch;
    } else {
      // Sweeping cinematic title camera overlooking the 100m cliff & stormy Abbey silhouette
      const ang = Math.sin(this.time * 0.14) * 0.42;
      camX = 16 + Math.sin(ang) * 14;
      camY = 7.5;
      camZ = 38;
      yaw = 0.42 + ang * 0.55;
      pitch = -0.06;
    }

    mat4Perspective(fovRad, aspect, 0.12, 340, this.projMat);
    mat4FPSView(camX, camY, camZ, yaw, pitch, 0, this.viewMat);

    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const forward = [-sy * cp, sp, -cy * cp];
    const right = [cy, 0, -sy];
    const up = [
      right[1] * forward[2] - right[2] * forward[1],
      right[2] * forward[0] - right[0] * forward[2],
      right[0] * forward[1] - right[1] * forward[0],
    ];

    const lights = this._collectDynamicLights();
    this.renderer.beginFrame(
      this.viewMat,
      this.projMat,
      { pos: [camX, camY, camZ], forward, right, up, fov: fovRad },
      atmosphere,
      lights,
      this.time
    );

    // Draw Abbey static world geometry
    for (const m of this.world.meshes) {
      this.renderer.drawMesh(m.mesh, m.texName, this.renderer.identity, [1, 1, 1], m.emissive);
    }

    // Draw dynamic world props (portcullis, braziers, crates, lore folders)
    this.world.renderDynamic(this.renderer, this.time);

    // Draw characters (German troops, Abbot Henri, French Resistance)
    for (const ent of this.combat.entities) {
      renderCharacter(this.renderer, ent, this.time);
    }

    // Draw crimson flares as bright 3D glowing beacons
    for (const f of this.combat.flares) {
      this.renderer.drawBox(f.x, f.y, f.z, 0.4, 0.4, 0.4, this.time * 6, [1.0, 0.25, 0.2], 'white', 2.0);
    }

    // Draw Act V British C-47 planes & descending paratroopers!
    if (this.combat.planes.length > 0 || this.combat.paratroopers.length > 0) {
      renderAirborneDrop(this.renderer, this.combat.planes, this.combat.paratroopers, this.time);
    }

    // Draw bullet tracers, rain streaks & volumetric particles
    const lines = this.combat.buildLineSegments({ x: camX, y: camY, z: camZ }, this.story.rainIntensity);
    this.renderer.drawLines(lines);
    this.renderer.drawParticles(this.combat.particles);

    // Render 1st-person weapon viewmodel & atmospheric vignette overlay
    if (this.started) {
      const lowHealth = clamp((38 - this.player.hp) / 38, 0, 1);
      this.weapons.renderOverlay(
        this.weaponCtx,
        this.weaponCanvas.width,
        this.weaponCanvas.height,
        '#d9c5a6',
        this.player.damageFlash,
        lowHealth
      );
    } else {
      this.weaponCtx.clearRect(0, 0, this.weaponCanvas.width, this.weaponCanvas.height);
    }

    requestAnimationFrame((t) => this._loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AbbayeGame();
});
