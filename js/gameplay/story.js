// 5-Act Interactive Story Director for ABBAYE DE MORT (Abbey of Death)
// Drives all dialogue, radio intercepts, tactical map interludes, ammo tension,
// Resistance 100m cliffside flank, 48-hour airborne countdown, and Intelligence Dossier.

import { distXZ } from '../engine/math.js';

export const SPEAKERS = {
  finch: {
    name: 'Agent Alistair Finch',
    role: 'British SOE — Intelligence Courier',
    accent: '#d4af5f',
    code: 'SOE-44',
  },
  abbot: {
    name: 'Abbot Henri',
    role: 'Last Monk of Abbaye de Mort',
    accent: '#e39c4f',
    code: 'ABBEY',
  },
  vogel: {
    name: 'Oberst Vogel',
    role: 'Wehrmacht Border Pursuit Unit',
    accent: '#d9534f',
    code: 'INTERCEPT',
  },
  colette: {
    name: 'Colette & The Maquis',
    role: 'French Resistance — Cliff Flankers',
    accent: '#5ea4f0',
    code: 'MAQUIS',
  },
  london: {
    name: 'London SOE ("Nightingale")',
    role: 'Shortwave Wireless — 7.42 MHz',
    accent: '#63d991',
    code: 'WIRELESS',
  },
};

export const LORE_ENTRIES = {
  german_order: {
    title: 'Captured Wehrmacht Breach Order',
    subtitle: 'Recovered in Abbey Courtyard',
    body: 'SECRET DIRECTIVE 14-B: Cross the Free France Demarcation Line under nightfall. Recover the stolen rail & Panzer movement charts from British agent "Finch". Leave no witnesses at Abbaye de Mort. Berlin will deny our presence across the border.',
  },
  abbey_chronicle: {
    title: 'Chronicle of Abbaye de Mort (1412)',
    subtitle: 'Found at the Shattered Nave Altar',
    body: '"Built upon the hundred-meter needle of limestone above the Cher valley. No army hath climbed its eastern rock face in five centuries—only goats, ghosts, and desperate men."',
  },
  maquis_chart: {
    title: 'Abbot Henri\'s Maquis Signal Ledger',
    subtitle: 'Hidden in the West Cloister',
    body: 'Three crimson flares from the chasm mean the villagers are climbing the eastern cliff face. Abbot Henri sheltered twelve downed Allied airmen in these very corridors before the occupation.',
  },
};

export const ACT_CARDS = {
  1: {
    numeral: 'ACT I',
    title: 'THE OUTCROP OF DEATH',
    location: 'Central France — Border of Free France • 21:40',
    summary: 'Pursued across the Demarcation Line by German troops who have no legal right to be in Free France, you clutch stolen Wehrmacht troop charts. Ahead rises Abbaye de Mort on its sheer 100-meter stone needle. Fight through the vanguard and reach the ruined Gatehouse.',
    mapNote: 'Approach Ridge → Gatehouse',
    sketchType: 'cliff',
  },
  2: {
    numeral: 'ACT II',
    title: 'THE LAST MONK & THE WIRELESS',
    location: 'Grand Nave & Scriptorium • 22:15',
    summary: 'Inside the rain-lashed ruins awaits Abbot Henri—the last soul left in the Abbey, keeping a hidden British B2 wireless alive. Reach his Sanctum, transmit the troop charts to London, and brace as the Germans intercept your broadcast.',
    mapNote: 'Courtyard → Nave → Radio Sanctum',
    sketchType: 'radio',
  },
  3: {
    numeral: 'ACT III',
    title: 'ROOM BY ROOM',
    location: 'Abbey Courtyard, Nave & Cloister • 23:05',
    summary: 'Now Oberst Vogel knows the Abbot works for Britain. Overwhelming German forces storm the Gatehouse. Fight room by room, falling back as the portcullis slams shut—and watch every bullet as your ammunition runs dangerously low.',
    mapNote: 'Fighting Retreat — Hold the Corridors',
    sketchType: 'retreat',
  },
  4: {
    numeral: 'ACT IV',
    title: 'THE HUNDRED-METER FLANK',
    location: 'East Cliffside Terrace • 00:40',
    summary: 'Word has reached the village that their beloved Abbot is trapped. Down to your final rounds, rush to the East Cliffside Terrace! French Resistance fighters are scaling the sheer 100-meter rock face to ambush the Germans from behind and bring ammunition.',
    mapNote: 'Maquis Climb the 100m Sheer Rock Face!',
    sketchType: 'climb',
  },
  5: {
    numeral: 'ACT V',
    title: 'FORTY-EIGHT HOURS TO DAWN',
    location: 'Abbaye de Mort — The Last Stand • T-48:00',
    summary: 'London has decoded your charts—the intelligence could turn the war. British 1st Airborne paratroopers have been scrambled, ETA 48 hours. Survive the relentless siege with Abbot Henri and the Maquis as night burns into French dawn. Will the paratroopers arrive in time?',
    mapNote: 'Hold Until the Airborne Drop at Dawn',
    sketchType: 'paratroopers',
  },
};

export class StoryDirector {
  constructor() {
    this.reset();
  }

  reset() {
    this.act = 1;
    this.stage = 'act1_approach';
    this.stageTimer = 0;
    this.objective = 'Fight along the cliffside approach and enter Abbaye de Mort';
    this.waypoint = { x: 0, z: 18, label: 'Abbey Gatehouse' };
    this.dialogueQueue = [];
    this.currentDialogue = null;
    this.dialogueTimer = 0;
    this.transcript = [];
    this.foundLore = [];
    this.ciphersSent = 0;
    this.hoursRemaining = 48.0;
    this.dawnProgress = 0; // 0 = stormy dusk/night, 1 = golden dawn
    this.rainIntensity = 1.0;
    this.radioTransmitting = false;
    this.radioProgress = 0;
    this.abbotEmergencyTosses = 0;
    this.ended = false;
    this.victory = false;
    this.pendingCard = null;
    this.onAnnouncement = null; // accessible live region hook
  }

  say(speakerKey, text, duration = 5.4, sound = null) {
    const sp = SPEAKERS[speakerKey] || SPEAKERS.finch;
    this.dialogueQueue.push({ speakerKey, speaker: sp, text, duration });
    this.transcript.push({
      act: this.act,
      speaker: sp.name,
      code: sp.code,
      text,
    });
    if (speakerKey === 'london' || speakerKey === 'vogel') {
      sound?.playRadioChirp();
    }
  }

  startAct1(combat, world, sound) {
    this.act = 1;
    this.stage = 'act1_approach';
    this.objective = 'Fight past the German vanguard and breach the Abbey Gatehouse';
    this.waypoint = { x: 0, z: 20, label: 'Gatehouse' };

    // Spawn Abbot Henri waiting safely inside the Nave/Sanctum
    combat.spawnAlly('abbot', 'Abbot Henri', 0, -19.5, { targetPos: { x: 0, z: -21.5 } });

    // Spawn Act I German pursuit patrol along approach & gatehouse
    combat.spawnEnemy('german_rifle', -2.5, 31.5, { holdPos: { x: -2.5, z: 31.5 } });
    combat.spawnEnemy('german_rifle',  2.6, 27.0, { holdPos: { x: 2.6, z: 27.0 } });
    combat.spawnEnemy('german_rifle', -1.8, 22.0, { holdPos: { x: -1.8, z: 22.0 } });
    combat.spawnEnemy('german_smg',    2.8, 17.5, { holdPos: { x: 2.8, z: 17.5 } });

    this.say('finch', 'German pursuit across the Free France border... They must never recover these troop charts.', 5.0);
    this.say('vogel', 'Halt, Engländer! You are trapped on that rock. Surrender the dispatch—now!', 5.2, sound);
    this.say('abbot', 'Quickly, my son! Through the Gatehouse! I have kept the sanctuary lantern lit for you.', 5.4);
  }

  collectLore(loreId, sound) {
    if (this.foundLore.includes(loreId)) return;
    this.foundLore.push(loreId);
    const entry = LORE_ENTRIES[loreId];
    sound?.playRadioChirp();
    this.say('finch', `Intelligence logged in Dossier: "${entry.title}". Press [TAB] anytime to inspect.`, 4.6);
  }

  interact(item, combat, world, weapons, sound) {
    if (item.type === 'lore' && !item.collected) {
      item.collected = true;
      this.collectLore(item.loreId, sound);
      return true;
    }

    if (item.type === 'weapon' && !item.collected) {
      item.collected = true;
      weapons.unlock('rifle', 15);
      sound?.playReload();
      this.say('abbot', 'An old MAS-36 rifle hidden behind the Psalms. Forgive me, Lord—aim true, Alistair.', 5.0);
      return true;
    }

    if (item.type === 'radio' && item.active) {
      this.ciphersSent++;
      sound?.playMorseBurst();
      item.active = false;

      if (this.stage === 'act2_radio') {
        this.stage = 'act2_intercepted';
        this.stageTimer = 0;
        this.objective = 'The Germans pinpointed the wireless! Prepare to defend the Abbey!';
        this.say('london', 'Nightingale receiving loud and clear! Troop charts confirmed—stand by for relay...', 5.0, sound);
        this.say('vogel', 'Radio triangulation locked! So the monk of Abbaye de Mort spies for London! Storm every room!', 6.0, sound);
        this.say('abbot', 'They know! Come to the Courtyard, Alistair—bar the arches and hold them as long as we can!', 5.6);
        return true;
      }

      if (this.stage === 'act4_radio_london') {
        this.stage = 'act5_intro';
        this.stageTimer = 0;
        this.say('london', 'Final troop dispositions decoded! British 1st Airborne paratroopers are scrambling now—ETA 48 HOURS! Hold Abbaye de Mort!', 6.8, sound);
        this.say('colette', 'Forty-eight hours?! Then we hold this stone needle for forty-eight hours! Vive la France!', 5.4);
        return true;
      }
    }

    if (item.type === 'resupply' && !item.collected) {
      item.collected = true;
      weapons.refillAllResistance();
      sound?.playReload();
      this.say('colette', 'British Sten Mk II and fresh 9mm crates—straight off the cliff ropes! Now push them out of the corridors!', 5.8);
      if (this.stage === 'act4_resupply') {
        this.stage = 'act4_counterattack';
        this.stageTimer = 0;
        this.objective = 'Counterattack with the Maquis! Clear the German squads from the Abbey!';
        this.waypoint = { x: 0, z: 12, label: 'Counterattack Courtyard' };
        world.naveGate.targetClosed = 0; // Re-open Nave portcullis for the fierce counterattack!
        sound?.playIronGateSlam();
        // Spawn fierce German counter-wave across corridors, nave, and courtyard
        combat.spawnEnemy('german_smg', -17, 4);
        combat.spawnEnemy('german_rifle', -17, -10);
        combat.spawnEnemy('german_smg', -5, 13);
        combat.spawnEnemy('german_rifle', 6, 15);
        combat.spawnEnemy('german_officer', 0, 19);
        combat.spawnEnemy('german_rifle', 0, 8);
      }
      return true;
    }

    return false;
  }

  update(dt, player, combat, world, weapons, sound, onShowActCard, onGameEnd) {
    this.stageTimer += dt;

    // Advance dialogue queue
    if (this.currentDialogue) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.currentDialogue = null;
    }
    if (!this.currentDialogue && this.dialogueQueue.length > 0) {
      this.currentDialogue = this.dialogueQueue.shift();
      this.dialogueTimer = this.currentDialogue.duration;
      if (this.onAnnouncement) {
        this.onAnnouncement(`${this.currentDialogue.speaker.name}: ${this.currentDialogue.text}`);
      }
    }

    const livingEnemies = combat.getLivingEnemies().length;
    const abbot = combat.getAbbot();

    // Emergency ammo compassion during Act III (keeps tension sky-high without ever soft-locking)
    if (this.act === 3 && weapons.totalAmmo === 0 && this.abbotEmergencyTosses < 3) {
      this.abbotEmergencyTosses++;
      weapons.addAmmo('revolver', 6);
      this.say('abbot', 'Catch! My last six cartridges—make every shot count, Alistair!', 4.2);
      sound?.playReload();
    }

    // =========================================================================
    // STATE MACHINE DRIVING ALL 5 ACTS
    // =========================================================================
    switch (this.stage) {
      case 'act1_approach': {
        if (player.z < 20.5 && livingEnemies <= 1) {
          this.act = 2;
          this.stage = 'act2_meet_abbot';
          this.stageTimer = 0;
          this.objective = 'Enter the Grand Nave and meet Abbot Henri in the Radio Sanctum';
          this.waypoint = { x: 0, z: -22, label: "Abbot's Sanctum" };
          // Enable Abbot's hidden rifle & radio
          const rifleItem = world.interactables.find((i) => i.id === 'abbot-rifle');
          const radioItem = world.interactables.find((i) => i.id === 'radio');
          if (rifleItem) rifleItem.active = true;
          if (radioItem) radioItem.active = true;
          onShowActCard(ACT_CARDS[2]);
          this.say('abbot', 'You made it inside! Come north through the Nave to my Scriptorium. My British wireless is warmed up.', 5.8);
        }
        break;
      }

      case 'act2_meet_abbot': {
        if (player.z < -15.5) {
          this.stage = 'act2_radio';
          this.stageTimer = 0;
          this.objective = 'Press [E] at the Shortwave Radio to transmit the German troop charts to London';
          this.waypoint = { x: 0, z: -25, label: 'B2 Shortwave Radio [E]' };
          this.say('abbot', 'Thank Heaven you are alive, Alistair. Take the MAS-36 rifle on the rack, and key the wireless to London!', 6.0);
        }
        break;
      }

      case 'act2_intercepted': {
        if (this.stageTimer > 4.2) {
          this.act = 3;
          this.stage = 'act3_courtyard';
          this.stageTimer = 0;
          this.objective = 'ACT III: Defend the Courtyard against the German assault!';
          this.waypoint = { x: 0, z: 12, label: 'Hold Courtyard' };
          if (abbot) abbot.targetPos = { x: 0, z: -8 };
          onShowActCard(ACT_CARDS[3]);
          sound?.setTension(0.65);

          // Act III Wave 1: Courtyard Breach (scarce ammo!)
          combat.spawnEnemy('german_rifle', -3, 25, { dropAmmo: false });
          combat.spawnEnemy('german_rifle',  3, 25, { dropAmmo: false });
          combat.spawnEnemy('german_smg',    0, 28, { dropAmmo: false });
          combat.spawnEnemy('german_rifle', -8, 20, { dropAmmo: false });
          combat.spawnEnemy('german_smg',    8, 20, { dropAmmo: false });
        }
        break;
      }

      case 'act3_courtyard': {
        if (livingEnemies <= 2 || this.stageTimer > 28) {
          this.stage = 'act3_retreat_nave';
          this.stageTimer = 0;
          this.objective = 'OVERWHELMED! Fall back into the Grand Nave—losing ground!';
          this.waypoint = { x: 0, z: -6, label: 'Retreat to Grand Nave' };
          if (abbot) abbot.targetPos = { x: 0, z: -14 };
          this.say('abbot', 'Too many of them! Fall back into the Nave—I am dropping the iron portcullis!', 5.4);
          this.say('vogel', 'Press the breach! Flank through the West Cloister corridors—they are running out of ammunition!', 5.6, sound);

          // Spawn overwhelming flanking wave via Courtyard & West Cloister
          combat.spawnEnemy('german_smg',   -17, 15, { dropAmmo: false });
          combat.spawnEnemy('german_rifle', -17, 7,  { dropAmmo: false });
          combat.spawnEnemy('german_officer', 0, 18, { dropAmmo: false });
          combat.spawnEnemy('german_rifle',  -6, 14, { dropAmmo: false });
          combat.spawnEnemy('german_smg',     6, 14, { dropAmmo: false });
        }
        break;
      }

      case 'act3_retreat_nave': {
        // Once player retreats inside Nave (z < 3), slam the iron gate down!
        if (player.z < 2.8 && world.naveGate.targetClosed === 0) {
          world.naveGate.targetClosed = 1;
          sound?.playIronGateSlam();
          this.say('finch', 'Portcullis is down! They\'re pouring through the Cloister doors—I\'m nearly dry on ammo!', 5.2);
          // Germans flank through West Cloister arches into the Nave
          combat.spawnEnemy('german_smg',   -17, -4, { dropAmmo: false });
          combat.spawnEnemy('german_rifle', -17, -11, { dropAmmo: false });
          combat.spawnEnemy('german_smg',    17, 10, { dropAmmo: false });
        }

        if ((player.z < 3 && livingEnemies <= 3 && this.stageTimer > 10) || this.stageTimer > 34) {
          // Transition to ACT IV — French Resistance climbs the 100-meter sheer rock face!
          this.act = 4;
          this.stage = 'act4_flares';
          this.stageTimer = 0;
          this.objective = 'Rush to the East 100m Cliffside Terrace—crimson flares in the chasm!';
          this.waypoint = { x: 21, z: -6, label: '100m Cliff Edge!' };
          if (abbot) abbot.targetPos = { x: 16, z: -12 };
          onShowActCard(ACT_CARDS[4]);
          sound?.setTension(0.85);
          sound?.playFlareLaunch();

          // Launch 3 vivid red Maquis signal flares soaring up from the 100m cliff face!
          combat.launchResistanceFlare(25.2, -16, -9);
          combat.launchResistanceFlare(25.4, -22, -3);
          combat.launchResistanceFlare(25.0, -18, 2);

          this.say('abbot', 'LOOK EAST! Over the hundred-meter cliff! Crimson flares—the Maquis heard my call!', 6.0);
          this.say('colette', 'Abbot Henri! Hold fast! We are scaling the rock face right behind their flank!', 5.6);
        }
        break;
      }

      case 'act4_flares': {
        if (this.stageTimer > 3.5 && player.x > 8 || this.stageTimer > 12) {
          this.stage = 'act4_resupply';
          this.stageTimer = 0;
          this.objective = 'Claim the Maquis Resupply Crate [E] on the East Cliff Terrace!';
          this.waypoint = { x: 20.5, z: -6, label: 'Maquis Resupply Crate [E]' };

          // Spawn the 3 heroic French Resistance fighters literally climbing up the 100m sheer cliff face!
          combat.spawnAlly('resistance', 'Colette', 24.4, -8.5, { startY: -12, climbing: true, climbTargetX: 20.2, targetPos: { x: 6, z: 10 } });
          combat.spawnAlly('resistance', 'Marcel',  24.4, -3.5, { startY: -16, climbing: true, climbTargetX: 20.2, targetPos: { x: -6, z: 11 } });
          combat.spawnAlly('resistance', 'Jean',    24.4, -13.0, { startY: -20, climbing: true, climbTargetX: 19.8, targetPos: { x: -16, z: -4 } });

          const crate = world.interactables.find((i) => i.id === 'resistance-crate');
          if (crate) crate.active = true;
          sound?.playFlareLaunch();
          combat.launchResistanceFlare(25.0, -10, -6);

          this.say('colette', 'Over the wall, mes amis! Englishman—grab that Sten gun and ammo crate! Let\'s retake the Abbey!', 6.0);
        }
        break;
      }

      case 'act4_counterattack': {
        if (livingEnemies === 0) {
          this.stage = 'act4_radio_london';
          this.stageTimer = 0;
          this.objective = 'Return to the Radio Sanctum [E] to confirm final coordinates with London';
          this.waypoint = { x: 0, z: -25, label: 'Radio London [E]' };
          if (abbot) abbot.targetPos = { x: -2.2, z: -23.5 };
          const radioItem = world.interactables.find((i) => i.id === 'radio');
          if (radioItem) {
            radioItem.active = true;
            radioItem.label = 'Transmit Final Extraction Signal to London [E]';
          }
          this.say('abbot', 'The corridors are ours again! Quickly—London is calling on the wireless!', 5.4);
        }
        break;
      }

      case 'act5_intro': {
        if (this.stageTimer > 4.5) {
          this.act = 5;
          this.stage = 'act5_siege';
          this.stageTimer = 0;
          this.hoursRemaining = 48.0;
          this.objective = 'HOLD ABBAYE DE MORT UNTIL PARATROOPERS ARRIVE (48 HOURS)';
          this.waypoint = { x: 0, z: 12, label: 'Defend the Abbey!' };
          if (abbot) abbot.targetPos = { x: 0, z: -10 };
          onShowActCard(ACT_CARDS[5]);
          sound?.setTension(1.0);

          // Wave 1 of 48-hour siege (Midnight Storm)
          this._spawnAct5Wave(combat, 1);
          this.act5Wave = 1;
        }
        break;
      }

      case 'act5_siege': {
        // Compressed dramatic 48-hour countdown (~85 seconds of intense escalating combat!)
        this.hoursRemaining = Math.max(0, this.hoursRemaining - dt * 0.58);
        const progress = 1 - this.hoursRemaining / 48.0;
        this.dawnProgress = Math.max(0, (progress - 0.32) / 0.68);
        this.rainIntensity = Math.max(0.08, 1.0 - this.dawnProgress * 0.92);

        // Wave 2 at 30 hours remaining
        if (this.act5Wave === 1 && (this.hoursRemaining <= 32 || livingEnemies <= 1)) {
          this.act5Wave = 2;
          this._spawnAct5Wave(combat, 2);
          this.say('vogel', 'Bring up the assault squads! Level this ruined abbey before sunrise!', 5.2, sound);
          this.say('colette', 'Twenty-four hours down! Ammo\'s holding—watch the West Cloister!', 4.8);
          // Top up player ammo slightly from Resistance sharing clips
          weapons.addAmmo('smg', 64);
          weapons.addAmmo('rifle', 10);
        }

        // Wave 3 (Final Dawn Push) at 16 hours remaining
        if (this.act5Wave === 2 && (this.hoursRemaining <= 16 || livingEnemies === 0)) {
          this.act5Wave = 3;
          this._spawnAct5Wave(combat, 3);
          this.say('abbot', 'Look at the eastern horizon—the clouds are turning gold! Hold fast, brothers!', 5.6);
        }

        // Airborne C-47 Dakotas & British Paratroopers arrive in the dawn sky at T-6 hours!
        if (this.hoursRemaining <= 6.5 && combat.planes.length === 0) {
          combat.triggerAirborneDrop();
          sound?.startAirbornePropellers();
          this.say('london', 'Nightingale to Abbaye de Mort—LOOK UP! First Airborne is directly overhead! Chutes away!', 6.5, sound);
          this.say('finch', 'C-47 Dakotas! Dozens of paratroopers filling the dawn sky—we made it!', 5.6);
        }

        // Victory when timer hits 0 and final wave is broken (or timer hits 0 for 4s)
        if (this.hoursRemaining <= 0 && (livingEnemies <= 2 || this.stageTimer > 92)) {
          this.ended = true;
          this.victory = true;
          this.stage = 'victory';
          this.objective = 'LIBERATION — British Paratroopers have secured Abbaye de Mort!';
          sound?.stopAirbornePropellers();
          onGameEnd(true);
        }
        break;
      }
    }
  }

  _spawnAct5Wave(combat, waveNum) {
    if (waveNum === 1) {
      combat.spawnEnemy('german_rifle', -4, 27);
      combat.spawnEnemy('german_smg',    4, 27);
      combat.spawnEnemy('german_rifle', -17, 16);
      combat.spawnEnemy('german_smg',    0, 31);
    } else if (waveNum === 2) {
      combat.spawnEnemy('german_smg',   -17, 14);
      combat.spawnEnemy('german_rifle', -17, -4);
      combat.spawnEnemy('german_officer', 0, 26);
      combat.spawnEnemy('german_smg',     8, 22);
      combat.spawnEnemy('german_rifle',  -7, 22);
    } else {
      combat.spawnEnemy('german_officer', 0, 28);
      combat.spawnEnemy('german_smg',    -5, 25);
      combat.spawnEnemy('german_smg',     5, 25);
      combat.spawnEnemy('german_rifle', -17, 12);
      combat.spawnEnemy('german_rifle', -17, -10);
      combat.spawnEnemy('german_officer', 17, 15);
    }
  }
}
