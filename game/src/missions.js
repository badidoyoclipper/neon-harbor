// Neon Harbor — the 7-mission story chain: objectives, beacons, timers,
// checkpoints, the target car, the shootout and the final escape.
import * as THREE from 'three';
import { MISSIONS, STORY_END } from './config.js';

export class Missions {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world; // { player, police, combat, audio, hud, cars, ... }
    this.index = 0;
    this.phase = 'go'; // go | deliver | done
    this.checkpoint = 0;
    this.timeLeft = 0;
    this.finished = false;
    this.targetCar = null;
    // Golden beacon: a light pillar + floating marker at the objective.
    const beaconGeo = new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true);
    this.beacon = new THREE.Mesh(
      beaconGeo,
      new THREE.MeshBasicMaterial({ color: 0xffe600, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
    );
    this.beacon.position.y = 30;
    scene.add(this.beacon);
    const ringGeo = new THREE.TorusGeometry(3, 0.3, 8, 32);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffe600 }));
    this.ring.rotation.x = Math.PI / 2;
    scene.add(this.ring);
    this.setMission(0);
  }

  get current() { return MISSIONS[this.index]; }

  objectiveText() {
    const m = this.current;
    if (!m) return '';
    if (this.phase === 'deliver' && m.deliverText) return m.deliverText;
    if (m.checkpoints) return `${m.objective} — checkpoint ${this.checkpoint + 1}/5`;
    if (m.enemies) return `${m.objective} — tersisa ${this.world.combat.aliveCount}`;
    return m.objective;
  }

  targetPos() {
    const m = this.current;
    if (!m) return null;
    if (this.phase === 'deliver' && m.deliver) return m.deliver;
    if (m.checkpoints) return m.checkpoints[this.checkpoint];
    return m.target;
  }

  setMission(i) {
    this.index = i;
    this.phase = 'go';
    this.checkpoint = 0;
    const m = this.current;
    if (!m) { this.finished = true; return; }
    this.timeLeft = m.timeLimit || 0;
    this.world.police.setWanted(m.wanted, 'mission');
    this.world.hud.toast(m.title);
    this.world.hud.dialogue(m.briefing);
    this.world.audio.missionDone();
    if (m.enemies) {
      // Thugs stand in the open lanes between container rows.
      const spots = [];
      for (let k = 0; k < m.enemies; k++) {
        spots.push({ x: 134 + (k % 3) * 13, z: k < 3 ? -21.5 : -8.5 });
      }
      this.world.combat.spawnEnemies(spots);
    }
    if (m.id === 'm4-curi-mobil') this.spawnTargetCar();
    this.world.saveGame();
  }

  spawnTargetCar() {
    const { Car } = this.world.deps;
    const m = this.current;
    this.targetCar = new Car(this.scene, m.target.x, m.target.z, Math.PI / 2, 0xd21f3c, { sport: true });
    this.world.cars.push(this.targetCar);
  }

  completeMission() {
    const m = this.current;
    this.world.money += m.reward;
    this.world.hud.toast(`Mission complete! +$${m.reward.toLocaleString('en-US')}`);
    this.world.audio.missionDone();
    this.world.combat.clearEnemies();
    if (this.targetCar && this.phase === 'go') {
      // keep the car in the world for the delivery leg
    }
    if (this.index + 1 >= MISSIONS.length) {
      this.finished = true;
      this.beacon.visible = false;
      this.ring.visible = false;
      this.world.hud.dialogue(STORY_END);
      this.world.hud.showEndScreen();
      this.world.saveGame();
      return;
    }
    this.setMission(this.index + 1);
  }

  failMission(reason) {
    this.world.hud.toast(reason);
    this.world.hud.dialogue('Mission failed — try again from the mission start.');
    const m = this.current;
    this.world.player.teleport(m.target.x + 6, m.target.z + 6);
    this.world.player.health = 100;
    this.world.player.dead = false;
    if (m.enemies) {
      const spots = [];
      for (let k = 0; k < m.enemies; k++) spots.push({ x: 134 + (k % 3) * 13, z: k < 3 ? -21.5 : -8.5 });
      this.world.combat.spawnEnemies(spots);
    }
    this.checkpoint = 0;
    this.timeLeft = m.timeLimit || 0;
    this.world.police.setWanted(m.wanted, 'mission');
  }

  update(dt, t) {
    if (this.finished || !this.current) return;
    const m = this.current;
    const p = this.world.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const pz = p.inCar ? p.inCar.z : p.z;
    // Beacon follows the current target.
    const tp = this.targetPos();
    if (tp) {
      this.beacon.position.set(tp.x, 30, tp.z);
      this.ring.position.set(tp.x, 0.3 + Math.sin(t * 2) * 0.15, tp.z);
      this.beacon.visible = true;
      this.ring.visible = true;
    }
    if (m.timeLimit) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.failMission('Time up!'); return; }
    }
    const dist = (a) => Math.hypot(px - a.x, pz - a.z);

    if (m.id === 'm3-balapan') {
      if (dist(m.checkpoints[this.checkpoint]) < 9) {
        this.checkpoint += 1;
        this.world.audio.chime();
        if (this.checkpoint >= m.checkpoints.length) this.completeMission();
      }
      return;
    }
    if (m.id === 'm4-curi-mobil') {
      if (this.phase === 'go') {
        if (this.targetCar && p.inCar === this.targetCar) {
          this.phase = 'deliver';
          this.world.hud.toast('Car acquired! Deliver it to the garage.');
          this.world.hud.dialogue('Reno: "Nice. Bring it to my garage, not a scratch on it."');
        }
        return;
      }
      if (dist(m.deliver) < 15 && p.inCar === this.targetCar) {
        this.world.hud.toast('Car delivered. Reno is pleased.');
        this.completeMission();
      }
      return;
    }
    if (m.enemies) {
      if (this.world.combat.aliveCount === 0) this.completeMission();
      return;
    }
    if (dist(m.target) < 9) {
      if (m.id === 'm1-paket') this.world.hud.toast('Package picked up!');
      this.completeMission();
    }
  }
}
