// Combat, Enemy/Ally AI, Bullet Tracers, Particles, Flares & Act V Airborne Drop

import { distXZ, rayAABB, resolveCircleAABB, hasLineOfSight, clamp } from '../engine/math.js';

// Connected tactical navigation graph across Abbaye de Mort so enemies & allies
// navigate cleanly through all doorways without snagging on walls.
const NAV_NODES = [
  { id: 'app_s',  x: 0,    z: 39 },
  { id: 'app_n',  x: 0,    z: 27 },
  { id: 'gate',   x: 0,    z: 22.8 },
  { id: 'cy_c',   x: 0,    z: 16 },
  { id: 'cy_w',   x: -9,   z: 13 },
  { id: 'cy_e',   x: 9,    z: 13 },
  { id: 'cy_n',   x: 0,    z: 7.5 },
  { id: 'nave_g', x: 0,    z: 4.0 },
  { id: 'nave_s', x: 0,    z: -0.5 },
  { id: 'nave_m', x: 0,    z: -6.0 },
  { id: 'nave_n', x: 0,    z: -14.0 },
  { id: 'sanc_d', x: 0,    z: -16.0 },
  { id: 'sanc_c', x: 0,    z: -21.5 },
  { id: 'clo_s',  x: -17,  z: 13 },
  { id: 'clo_m',  x: -17,  z: -6 },
  { id: 'clo_n',  x: -17,  z: -22 },
  { id: 'ter_s',  x: 18,   z: 13 },
  { id: 'ter_m',  x: 18,   z: -6 },
  { id: 'ter_n',  x: 18,   z: -22 },
];

const NAV_EDGES = [
  ['app_s', 'app_n'], ['app_n', 'gate'], ['gate', 'cy_c'],
  ['cy_c', 'cy_w'], ['cy_c', 'cy_e'], ['cy_c', 'cy_n'],
  ['cy_w', 'clo_s'], ['cy_e', 'ter_s'],
  ['cy_n', 'nave_g'], ['nave_g', 'nave_s'], ['nave_s', 'nave_m'],
  ['nave_m', 'nave_n'], ['nave_n', 'sanc_d'], ['sanc_d', 'sanc_c'],
  ['nave_m', 'clo_m'], ['nave_m', 'ter_m'],
  ['clo_s', 'clo_m'], ['clo_m', 'clo_n'], ['clo_n', 'sanc_c'],
  ['ter_s', 'ter_m'], ['ter_m', 'ter_n'], ['ter_n', 'sanc_c'],
];

const NAV_MAP = new Map(NAV_NODES.map((n) => [n.id, { ...n, neighbors: [] }]));
for (const [a, b] of NAV_EDGES) {
  NAV_MAP.get(a).neighbors.push(b);
  NAV_MAP.get(b).neighbors.push(a);
}

function nearestNode(x, z) {
  let best = null, bestD = 1e9;
  for (const n of NAV_NODES) {
    const d = Math.hypot(n.x - x, n.z - z);
    if (d < bestD) { bestD = d; best = n.id; }
  }
  return best;
}

function findNextWaypoint(ax, az, bx, bz, gateClosed) {
  const start = nearestNode(ax, az);
  const goal = nearestNode(bx, bz);
  if (start === goal) return { x: bx, z: bz };

  const q = [start];
  const prev = new Map([[start, null]]);
  while (q.length > 0) {
    const cur = q.shift();
    if (cur === goal) break;
    for (const nb of NAV_MAP.get(cur).neighbors) {
      if (gateClosed && ((cur === 'cy_n' && nb === 'nave_g') || (cur === 'nave_g' && nb === 'cy_n'))) continue;
      if (!prev.has(nb)) {
        prev.set(nb, cur);
        q.push(nb);
      }
    }
  }
  if (!prev.has(goal)) return { x: bx, z: bz };
  let step = goal;
  while (prev.get(step) && prev.get(step) !== start) {
    step = prev.get(step);
  }
  const node = NAV_MAP.get(step);
  return { x: node.x, z: node.z };
}

export class CombatSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.entities = [];
    this.particles = [];
    this.tracers = [];
    this.flares = [];
    this.planes = [];
    this.paratroopers = [];
    this.rain = [];
    this.kills = 0;
    this.headshots = 0;
    this.nextId = 1;

    // Seed atmospheric rain streaks around camera
    for (let i = 0; i < 240; i++) {
      this.rain.push({
        ox: (Math.random() - 0.5) * 44,
        oy: Math.random() * 18,
        oz: (Math.random() - 0.5) * 44,
        speed: 17 + Math.random() * 7,
      });
    }
  }

  spawnEnemy(role, x, z, opts = {}) {
    const stats = {
      german_rifle:   { hp: 62,  speed: 3.0, fireInt: 1.85, dmg: 6,  acc: 0.09,  range: 32 },
      german_smg:     { hp: 78,  speed: 3.6, fireInt: 0.62, dmg: 4,  acc: 0.13,  range: 23 },
      german_officer: { hp: 120, speed: 3.3, fireInt: 1.25, dmg: 9,  acc: 0.075, range: 34 },
    }[role] || { hp: 62, speed: 3.0, fireInt: 1.8, dmg: 6, acc: 0.09, range: 32 };

    const ent = {
      id: this.nextId++,
      team: 'enemy',
      role,
      x, y: 0, z,
      yaw: 0,
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      fireInt: stats.fireInt,
      dmg: stats.dmg,
      acc: stats.acc,
      range: stats.range,
      fireCd: 1.5 + Math.random() * 1.4,
      state: 'moving',
      hitFlash: 0,
      muzzleTimer: 0,
      animPhase: Math.random() * 6,
      deathTime: 0,
      holdPos: opts.holdPos || null,
      dropAmmo: opts.dropAmmo !== undefined ? opts.dropAmmo : true,
    };
    this.entities.push(ent);
    return ent;
  }

  spawnAlly(role, name, x, z, opts = {}) {
    const ent = {
      id: this.nextId++,
      team: 'ally',
      role,
      name,
      x,
      y: opts.startY ?? 0,
      z,
      yaw: opts.yaw ?? 0,
      hp: role === 'abbot' ? 240 : 190,
      maxHp: role === 'abbot' ? 240 : 190,
      speed: role === 'abbot' ? 3.5 : 4.2,
      fireInt: role === 'abbot' ? 99 : 0.42,
      dmg: 18,
      range: 34,
      fireCd: 0.4 + Math.random() * 0.6,
      state: opts.climbing ? 'climbing' : 'idle',
      climbTargetX: opts.climbTargetX ?? 21.5,
      targetPos: opts.targetPos || { x, z },
      hitFlash: 0,
      muzzleTimer: 0,
      animPhase: Math.random() * 6,
      deathTime: 0,
    };
    this.entities.push(ent);
    return ent;
  }

  getLivingEnemies() {
    return this.entities.filter((e) => e.team === 'enemy' && e.state !== 'dead');
  }

  getAbbot() {
    return this.entities.find((e) => e.role === 'abbot');
  }

  launchResistanceFlare(x, y, z) {
    this.flares.push({
      x, y, z,
      vx: -0.6 + (Math.random() - 0.5) * 1.2,
      vy: 15.5 + Math.random() * 3.5,
      vz: (Math.random() - 0.5) * 2.0,
      life: 6.5,
    });
  }

  triggerAirborneDrop() {
    if (this.planes.length > 0) return;
    // Three British C-47 Dakota transport planes sweeping over the Abbey at dawn!
    this.planes = [
      { x: -95, y: 42, z: -18, vx: 11.5, vz: 2.2, yaw: Math.atan2(11.5, 2.2) },
      { x: -118, y: 46, z: 6,  vx: 11.5, vz: 2.2, yaw: Math.atan2(11.5, 2.2) },
      { x: -125, y: 44, z: -40, vx: 11.5, vz: 2.2, yaw: Math.atan2(11.5, 2.2) },
    ];
    for (let i = 0; i < 22; i++) {
      this.paratroopers.push({
        x: -22 + (Math.random() - 0.5) * 78,
        y: 26 + Math.random() * 34,
        z: -12 + (Math.random() - 0.5) * 72,
        vy: -(1.8 + Math.random() * 0.9),
        vx: 0.9 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  spawnImpactParticles(x, y, z, isBlood = false) {
    const count = isBlood ? 11 : 9;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y, z,
        vx: (Math.random() - 0.5) * (isBlood ? 3.2 : 4.6),
        vy: Math.random() * (isBlood ? 2.6 : 3.8) + 0.5,
        vz: (Math.random() - 0.5) * (isBlood ? 3.2 : 4.6),
        r: isBlood ? 0.68 : 0.92,
        g: isBlood ? 0.09 : 0.82,
        b: isBlood ? 0.09 : 0.62,
        a: 0.95,
        size: isBlood ? 0.16 : 0.12,
        life: isBlood ? 0.42 : 0.35,
        maxLife: isBlood ? 0.42 : 0.35,
        gravity: 9.5,
      });
    }
  }

  // Player hitscan shot with optional gentle aim-assist cone for trackpad accessibility
  firePlayerShot(camPos, aimDir, shotInfo, world, weapons, sound, aimAssist = true) {
    const def = shotInfo.def;
    const sp = shotInfo.spread;
    let dx = aimDir.x + (Math.random() - 0.5) * sp;
    let dy = aimDir.y + (Math.random() - 0.5) * sp;
    let dz = aimDir.z + (Math.random() - 0.5) * sp;
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl; dy /= dl; dz /= dl;

    // Wall intersection distance
    let wallDist = def.range;
    for (const c of world.colliders) {
      if (c.bulletsPass) continue;
      const t = rayAABB(camPos.x, camPos.y, camPos.z, dx, dy, dz, c, wallDist);
      if (t > 0.05 && t < wallDist) wallDist = t;
    }

    // Check enemy hitboxes (head & torso)
    let hitEnt = null;
    let hitDist = wallDist;
    let isHead = false;
    const pad = aimAssist ? 0.16 : 0.05;

    for (const e of this.entities) {
      if (e.team !== 'enemy' || e.state === 'dead') continue;
      // Head box
      const headBox = {
        minX: e.x - (0.24 + pad * 0.65), maxX: e.x + (0.24 + pad * 0.65),
        minY: e.y + 1.48, maxY: e.y + 1.98,
        minZ: e.z - (0.24 + pad * 0.65), maxZ: e.z + (0.24 + pad * 0.65),
      };
      const th = rayAABB(camPos.x, camPos.y, camPos.z, dx, dy, dz, headBox, hitDist);
      if (th > 0.1 && th < hitDist) {
        hitDist = th;
        hitEnt = e;
        isHead = true;
        continue;
      }
      // Torso & legs box
      const bodyBox = {
        minX: e.x - (0.38 + pad), maxX: e.x + (0.38 + pad),
        minY: e.y + 0.05, maxY: e.y + 1.52,
        minZ: e.z - (0.38 + pad), maxZ: e.z + (0.38 + pad),
      };
      const tb = rayAABB(camPos.x, camPos.y, camPos.z, dx, dy, dz, bodyBox, hitDist);
      if (tb > 0.1 && tb < hitDist) {
        hitDist = tb;
        hitEnt = e;
        isHead = false;
      }
    }

    const endX = camPos.x + dx * hitDist;
    const endY = camPos.y + dy * hitDist;
    const endZ = camPos.z + dz * hitDist;

    // Visible bright bullet tracer
    this.tracers.push({
      x1: camPos.x + dx * 0.65,
      y1: camPos.y - 0.12 + dy * 0.65,
      z1: camPos.z + dz * 0.65,
      x2: endX, y2: endY, z2: endZ,
      r: 1.0, g: 0.9, b: 0.55, a: 0.9,
      life: 0.085,
    });

    if (hitEnt) {
      const dmg = Math.round(def.damage * (isHead ? def.headshotMult : 1.0));
      hitEnt.hp -= dmg;
      hitEnt.hitFlash = 0.14;
      weapons.triggerHitMarker(isHead);
      sound?.playHitMarker(isHead);
      this.spawnImpactParticles(endX, endY, endZ, true);

      if (hitEnt.hp <= 0) {
        hitEnt.state = 'dead';
        hitEnt.deathTime = 0;
        this.kills++;
        if (isHead) this.headshots++;
        return { hit: true, killed: true, headshot: isHead, ent: hitEnt };
      }
      return { hit: true, killed: false, headshot: isHead, ent: hitEnt };
    } else if (wallDist < def.range) {
      this.spawnImpactParticles(endX, endY, endZ, false);
    }
    return { hit: false, killed: false };
  }

  update(dt, player, world, sound, storyState, onPlayerDamage) {
    const gateClosed = world.naveGate.closedAmount > 0.4;
    const enemies = this.entities.filter((e) => e.team === 'enemy' && e.state !== 'dead');
    const allies = this.entities.filter((e) => e.team === 'ally' && e.state !== 'dead');

    // Update entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.muzzleTimer > 0) e.muzzleTimer = Math.max(0, e.muzzleTimer - dt);

      if (e.state === 'dead') {
        e.deathTime += dt;
        if (e.deathTime > 12) this.entities.splice(i, 1);
        continue;
      }

      if (e.team === 'enemy') {
        this._updateEnemy(e, dt, player, allies, world, gateClosed, sound, onPlayerDamage);
      } else {
        this._updateAlly(e, dt, player, enemies, world, gateClosed, sound);
      }
    }

    // Update tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].life -= dt;
      this.tracers[i].a = Math.max(0, this.tracers[i].life * 10);
      if (this.tracers[i].life <= 0) this.tracers.splice(i, 1);
    }

    // Update crimson Resistance flares rising from the 100m cliff face
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.z += f.vz * dt;
      f.vy -= 4.2 * dt;
      f.life -= dt;

      // Trail embers
      if (Math.random() < 0.75) {
        this.particles.push({
          x: f.x, y: f.y, z: f.z,
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7,
          vz: (Math.random() - 0.5) * 0.7,
          r: 1.0, g: 0.22, b: 0.16, a: 0.9,
          size: 0.28, life: 0.65, maxLife: 0.65, gravity: 0.4,
        });
      }
      if (f.life <= 0) this.flares.splice(i, 1);
    }

    // Spawn warm fire embers from nearby braziers
    if (this.particles.length < 700) {
      for (const b of world.braziers) {
        if (b.steady) continue;
        if (Math.random() < 0.14 && distXZ(player, b) < 35) {
          this.particles.push({
            x: b.x + (Math.random() - 0.5) * 0.35,
            y: b.y,
            z: b.z + (Math.random() - 0.5) * 0.35,
            vx: (Math.random() - 0.5) * 0.55,
            vy: 1.1 + Math.random() * 1.4,
            vz: (Math.random() - 0.5) * 0.55,
            r: 1.0, g: 0.58 + Math.random() * 0.3, b: 0.16, a: 0.85,
            size: 0.11, life: 0.9 + Math.random() * 0.6, maxLife: 1.5, gravity: -0.25,
          });
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= p.gravity * dt;
      p.life -= dt;
      p.a = Math.max(0, (p.life / p.maxLife) * 0.9);
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update rain streaks
    for (const r of this.rain) {
      r.oy -= r.speed * dt;
      r.ox += 2.2 * dt;
      if (r.oy < -1.5) {
        r.oy = 14 + Math.random() * 6;
        r.ox = (Math.random() - 0.5) * 44;
        r.oz = (Math.random() - 0.5) * 44;
      }
    }

    // Update Act V C-47 planes & descending British paratroopers
    for (const pl of this.planes) {
      pl.x += pl.vx * dt;
      pl.z += pl.vz * dt;
      if (pl.x > 130) pl.x = -130;
    }
    for (const pt of this.paratroopers) {
      if (pt.y > 0.2) {
        pt.y += pt.vy * dt;
        pt.x += pt.vx * dt;
      }
    }
  }

  _updateEnemy(e, dt, player, allies, world, gateClosed, sound, onPlayerDamage) {
    // Pick nearest visible target (player or nearby Resistance fighter)
    let target = { x: player.x, y: player.y + 1.45, z: player.z, isPlayer: true };
    let targetDist = distXZ(e, player);

    for (const a of allies) {
      if (a.role === 'abbot') continue;
      const d = distXZ(e, a);
      if (d < targetDist * 0.85) {
        targetDist = d;
        target = { x: a.x, y: a.y + 1.3, z: a.z, isPlayer: false, ent: a };
      }
    }

    const canSee = targetDist < e.range && hasLineOfSight(
      e.x, e.y + 1.5, e.z,
      target.x, target.y, target.z,
      world.colliders
    );

    if (canSee && targetDist < e.range * 0.82) {
      e.state = 'firing';
      e.yaw = Math.atan2(target.x - e.x, target.z - e.z);
      e.fireCd -= dt;
      // Slight tactical strafe so firefights feel dynamic
      if (targetDist > 6.5) {
        const strafe = Math.sin(e.id * 2.1 + e.animPhase) * 0.9 * dt;
        e.x += Math.cos(e.yaw) * strafe;
        e.z -= Math.sin(e.yaw) * strafe;
        e.animPhase += dt * 0.9;
      }

      if (e.fireCd <= 0) {
        e.fireCd = e.fireInt * (0.78 + Math.random() * 0.45);
        e.muzzleTimer = 0.09;
        sound?.playGunshot('enemy', targetDist);

        // Tracer + probabilistic hit check (fair, tense FPS feel)
        const miss = (Math.random() - 0.5) * e.acc * targetDist;
        const tx = target.x + miss;
        const ty = target.y + (Math.random() - 0.5) * 0.45;
        const tz = target.z + (Math.random() - 0.5) * e.acc * targetDist;
        this.tracers.push({
          x1: e.x + Math.sin(e.yaw) * 0.55, y1: e.y + 1.32, z1: e.z + Math.cos(e.yaw) * 0.55,
          x2: tx, y2: ty, z2: tz,
          r: 1.0, g: 0.45, b: 0.22, a: 0.85, life: 0.09,
        });

        const hitChance = clamp(0.46 - targetDist * 0.0085, 0.12, 0.48);
        if (Math.random() < hitChance) {
          if (target.isPlayer) {
            onPlayerDamage(e.dmg, e.x, e.z);
          } else if (target.ent) {
            target.ent.hitFlash = 0.14;
            target.ent.hp = Math.max(25, target.ent.hp - e.dmg * 0.45); // Allies are resilient story heroes
          }
        }
      }
    } else {
      // Advance along nav graph toward player or hold position
      e.state = 'moving';
      const goalX = e.holdPos ? e.holdPos.x : target.x;
      const goalZ = e.holdPos ? e.holdPos.z : target.z;
      const wp = findNextWaypoint(e.x, e.z, goalX, goalZ, gateClosed);
      const dx = wp.x - e.x;
      const dz = wp.z - e.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.35) {
        e.yaw = Math.atan2(dx, dz);
        e.x += (dx / d) * e.speed * dt;
        e.z += (dz / d) * e.speed * dt;
        e.animPhase += dt;
      }
    }

    // Keep out of walls
    for (const c of world.colliders) {
      resolveCircleAABB(e, 0.4, e.y, e.y + 1.8, c);
    }
  }

  _updateAlly(e, dt, player, enemies, world, gateClosed, sound) {
    // Special Act IV animation: French Resistance climbing the sheer 100m cliff face!
    if (e.state === 'climbing') {
      e.animPhase += dt * 1.4;
      e.yaw = -Math.PI * 0.5; // facing west onto the terrace
      if (e.y < 0.0) {
        e.y = Math.min(0, e.y + 4.4 * dt);
      } else {
        // Vault over the low stone parapet onto the East Terrace!
        e.x = Math.max(e.climbTargetX, e.x - 4.8 * dt);
        if (e.x <= e.climbTargetX + 0.1) {
          e.state = 'moving';
        }
      }
      return;
    }

    // Abbot Henri stays at his story waypoint (Sanctum / Nave / Terrace) and faces the player
    if (e.role === 'abbot') {
      const tp = e.targetPos || { x: 0, z: -22 };
      const dx = tp.x - e.x, dz = tp.z - e.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.8) {
        e.state = 'moving';
        const wp = findNextWaypoint(e.x, e.z, tp.x, tp.z, gateClosed);
        const wx = wp.x - e.x, wz = wp.z - e.z;
        const wd = Math.hypot(wx, wz) || 1;
        e.yaw = Math.atan2(wx, wz);
        e.x += (wx / wd) * e.speed * dt;
        e.z += (wz / wd) * e.speed * dt;
        e.animPhase += dt;
        for (const c of world.colliders) resolveCircleAABB(e, 0.4, 0, 1.8, c);
      } else {
        e.state = 'idle';
        e.yaw = Math.atan2(player.x - e.x, player.z - e.z);
      }
      return;
    }

    // French Resistance Maquis Fighter AI — hunts and flanks German forces!
    let bestEnemy = null, bestD = 1e9;
    for (const en of enemies) {
      const d = distXZ(e, en);
      if (d < bestD) { bestD = d; bestEnemy = en; }
    }

    if (bestEnemy) {
      const canSee = bestD < e.range && hasLineOfSight(e.x, 1.4, e.z, bestEnemy.x, 1.3, bestEnemy.z, world.colliders);
      if (canSee && bestD < 26) {
        e.state = 'firing';
        e.yaw = Math.atan2(bestEnemy.x - e.x, bestEnemy.z - e.z);
        e.fireCd -= dt;
        if (e.fireCd <= 0) {
          e.fireCd = e.fireInt * (0.8 + Math.random() * 0.5);
          e.muzzleTimer = 0.08;
          sound?.playGunshot('smg', distXZ(player, e));
          this.tracers.push({
            x1: e.x + Math.sin(e.yaw) * 0.5, y1: 1.3, z1: e.z + Math.cos(e.yaw) * 0.5,
            x2: bestEnemy.x, y2: 1.25, z2: bestEnemy.z,
            r: 0.45, g: 0.85, b: 1.0, a: 0.85, life: 0.085,
          });
          if (Math.random() < 0.52) {
            bestEnemy.hp -= e.dmg;
            bestEnemy.hitFlash = 0.12;
            this.spawnImpactParticles(bestEnemy.x, 1.25, bestEnemy.z, true);
            if (bestEnemy.hp <= 0) {
              bestEnemy.state = 'dead';
              bestEnemy.deathTime = 0;
            }
          }
        }
      } else {
        e.state = 'moving';
        const wp = findNextWaypoint(e.x, e.z, bestEnemy.x, bestEnemy.z, gateClosed);
        const dx = wp.x - e.x, dz = wp.z - e.z;
        const d = Math.hypot(dx, dz) || 1;
        e.yaw = Math.atan2(dx, dz);
        e.x += (dx / d) * e.speed * dt;
        e.z += (dz / d) * e.speed * dt;
        e.animPhase += dt;
      }
    } else {
      // Patrol/escort near player or courtyard
      const tp = e.targetPos || { x: player.x + 2, z: player.z + 2 };
      const d = distXZ(e, tp);
      if (d > 2.5) {
        e.state = 'moving';
        const wp = findNextWaypoint(e.x, e.z, tp.x, tp.z, gateClosed);
        const dx = wp.x - e.x, dz = wp.z - e.z;
        const wd = Math.hypot(dx, dz) || 1;
        e.yaw = Math.atan2(dx, dz);
        e.x += (dx / wd) * e.speed * dt;
        e.z += (dz / wd) * e.speed * dt;
        e.animPhase += dt;
      } else {
        e.state = 'idle';
      }
    }
    for (const c of world.colliders) resolveCircleAABB(e, 0.4, 0, 1.8, c);
  }

  buildLineSegments(player, rainIntensity) {
    const segs = [];
    // Bullet tracers
    for (const t of this.tracers) segs.push(t);

    // Rain streaks around player (fades as golden dawn breaks in Act V)
    if (rainIntensity > 0.05) {
      for (const r of this.rain) {
        const x = player.x + r.ox;
        const y = player.y + r.oy;
        const z = player.z + r.oz;
        // Skip interior rain inside covered Sanctum/Cloister
        if (z < -16 && x > -12 && x < 12 && y < 7.6) continue;
        if (x < -12 && x > -22 && y < 6.8) continue;
        segs.push({
          x1: x, y1: y, z1: z,
          x2: x - 0.14, y2: y + 0.85, z2: z - 0.08,
          r: 0.68, g: 0.78, b: 0.9, a: 0.28 * rainIntensity,
        });
      }
    }
    return segs;
  }
}
