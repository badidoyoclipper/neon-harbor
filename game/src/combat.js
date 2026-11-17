// Neon Harbor — combat: fists up close, pistol at range, enemy thugs.
// Shooting is a crosshair check (angle + distance + line of sight is
// open streets), with tracers and hit flashes for feedback.
import * as THREE from 'three';

function makeThugMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 1.1, 10), new THREE.MeshLambertMaterial({ color: 0x3a3a44 }));
  body.position.y = 1.0;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshLambertMaterial({ color: 0xc98d64 }));
  head.position.y = 1.85;
  g.add(head);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.14, 12), new THREE.MeshLambertMaterial({ color: 0xd21f3c }));
  band.position.y = 2.05;
  g.add(band);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.7), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gun.position.set(0.45, 1.15, 0.4);
  g.add(gun);
  return g;
}

export class Combat {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.enemies = [];
    this.fireCooldown = 0;
    this.tracers = [];
    this.muzzle = null;
    // Muzzle flash light that blinks on shots.
    this.flashLight = new THREE.PointLight(0xffc36b, 0, 18);
    scene.add(this.flashLight);
  }

  spawnEnemies(spots) {
    this.clearEnemies();
    for (const s of spots) {
      const mesh = makeThugMesh();
      mesh.position.set(s.x, 0, s.z);
      this.scene.add(mesh);
      this.enemies.push({
        mesh, x: s.x, z: s.z, health: 100, shootTimer: 1 + Math.random() * 2,
        flash: 0, alive: true,
      });
    }
  }

  clearEnemies() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
  }

  get aliveCount() {
    return this.enemies.filter((e) => e.alive).length;
  }

  // Player shoots: nearest living enemy near the camera crosshair line.
  playerShoot(camera, playerPos, traffic, police, onCrime) {
    if (this.fireCooldown > 0) return null;
    this.fireCooldown = 0.28;
    this.audio.shot();
    // Flash at the gun + a tracer line from the player toward the aim point.
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const from = new THREE.Vector3(playerPos.x, 1.5, playerPos.z);
    const to = from.clone().add(dir.clone().multiplyScalar(46));
    this.addTracer(from, to);
    this.flashLight.position.copy(from);
    this.flashLight.intensity = 60;
    // Find the enemy closest to the aim ray.
    let best = null, bestScore = 1e9;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ex = e.x - from.x, ez = e.z - from.z;
      const along = ex * dir.x + ez * dir.z;
      if (along < 1 || along > 48) continue;
      const perp = Math.abs(ex * dir.z - ez * dir.x);
      const score = perp + along * 0.02;
      if (perp < 2.2 && score < bestScore) { bestScore = score; best = e; }
    }
    if (best) {
      best.health -= 34;
      best.flash = 0.12;
      best.mesh.children[0].material = new THREE.MeshLambertMaterial({ color: 0xffffff });
      setTimeout(() => {
        if (best.mesh.children[0]) best.mesh.children[0].material = new THREE.MeshLambertMaterial({ color: 0x3a3a44 });
      }, 110);
      if (best.health <= 0) {
        best.alive = false;
        best.mesh.visible = false;
        this.audio.chime();
      }
      return { hit: 'enemy', enemy: best };
    }
    // Hitting a pedestrian is a crime.
    const ped = traffic ? traffic.nearestPed(playerPos.x + dir.x * 10, playerPos.z + dir.z * 10, 4) : null;
    if (ped) {
      if (onCrime) onCrime();
      traffic.scarePeds(playerPos.x, playerPos.z);
      return { hit: 'ped' };
    }
    if (traffic) traffic.scarePeds(playerPos.x, playerPos.z);
    return { hit: 'none' };
  }

  // Punch: short range, hurts enemies (and shoves pedestrians away).
  playerPunch(playerPos, heading) {
    this.audio.punch();
    const px = playerPos.x + Math.sin(heading) * 1.6;
    const pz = playerPos.z + Math.cos(heading) * 1.6;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - px, e.z - pz) < 2.2) {
        e.health -= 25;
        e.flash = 0.12;
        if (e.health <= 0) { e.alive = false; e.mesh.visible = false; this.audio.chime(); }
        return { hit: 'enemy' };
      }
    }
    return { hit: 'none' };
  }

  addTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    this.scene.add(line);
    this.tracers.push({ line, life: 0.09 });
  }

  // Enemies shoot back with poor aim; their bullets chip the player's health.
  update(dt, t, player, playerInCar) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 500);
    for (const tr of this.tracers) {
      tr.life -= dt;
      tr.line.material.opacity = Math.max(0, tr.life * 10);
      if (tr.life <= 0) { this.scene.remove(tr.line); }
    }
    this.tracers = this.tracers.filter((tr) => tr.life > 0);
    if (playerInCar || player.dead) return;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.shootTimer -= dt;
      const d = Math.hypot(e.x - player.x, e.z - player.z);
      // Face the player.
      e.mesh.rotation.y = Math.atan2(player.x - e.x, player.z - e.z);
      if (e.shootTimer <= 0 && d < 42) {
        e.shootTimer = 1.4 + Math.random() * 1.2;
        this.audio.enemyShot();
        const from = new THREE.Vector3(e.x, 1.4, e.z);
        const to = new THREE.Vector3(player.x, 1.3, player.z);
        this.addTracer(from, to);
        // Poor aim: hits about half the time at close range.
        if (Math.random() < 0.55 - d * 0.008) {
          player.hurt(6 + Math.random() * 4, t);
        }
      }
    }
  }
}
