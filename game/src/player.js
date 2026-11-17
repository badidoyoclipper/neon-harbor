// Neon Harbor — Saka on foot: movement, camera, entering cars.
// Third-person camera orbits with the mouse (drag) and follows behind.
import * as THREE from 'three';
import { PLAYER } from './config.js';
import { collideCircle, insideCity } from './city.js';

export function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xffb347 }); // yellow jacket
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.05, 10), jacket);
  body.position.y = 1.0;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
  head.position.y = 1.85;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.12, 12), new THREE.MeshLambertMaterial({ color: 0x222831 }));
  cap.position.y = 2.08;
  g.add(cap);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a3550 });
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.85, 8), legMat);
    leg.position.set(sx, 0.42, 0);
    g.add(leg);
    g.userData['leg' + (sx < 0 ? 'L' : 'R')] = leg;
  }
  const armMat = new THREE.MeshLambertMaterial({ color: 0xffb347 });
  for (const sx of [-0.45, 0.45]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.8, 8), armMat);
    arm.position.set(sx, 1.05, 0);
    g.add(arm);
    g.userData['arm' + (sx < 0 ? 'L' : 'R')] = arm;
  }
  return g;
}

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = makePlayerMesh();
    scene.add(this.mesh);
    this.x = 0;
    this.z = 80;
    this.heading = Math.PI;
    this.health = PLAYER.health;
    this.inCar = null;
    this.busted = false;
    this.walkPhase = 0;
    this.camYaw = Math.PI;
    this.camPitch = 0.32;
    this.camDist = 10;
  }

  get pos() { return { x: this.x, z: this.z }; }

  updateOnFoot(input, dt, colliders, t) {
    const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    // Movement is relative to the camera yaw.
    let mx = 0, mz = 0;
    if (input.forward) { mx += Math.sin(this.camYaw); mz += Math.cos(this.camYaw); }
    if (input.back) { mx -= Math.sin(this.camYaw); mz -= Math.cos(this.camYaw); }
    if (input.left) { mx -= Math.cos(this.camYaw); mz += Math.sin(this.camYaw); }
    if (input.right) { mx += Math.cos(this.camYaw); mz -= Math.sin(this.camYaw); }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len; mz /= len;
      this.x += mx * speed * dt;
      this.z += mz * speed * dt;
      this.heading = Math.atan2(mx, mz);
      this.walkPhase += dt * speed * 1.4;
    }
    const p = { x: this.x, z: this.z };
    collideCircle(p, PLAYER.radius, colliders);
    if (!insideCity(p.x, p.z)) {
      p.x = Math.max(-176, Math.min(176, p.x));
      p.z = Math.max(-176, Math.min(182, p.z));
    }
    this.x = p.x;
    this.z = p.z;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    // Walk swing.
    const swing = len > 0 ? Math.sin(this.walkPhase) * 0.5 : 0;
    const legL = this.mesh.userData.legL, legR = this.mesh.userData.legR;
    const armL = this.mesh.userData.armL, armR = this.mesh.userData.armR;
    if (legL) { legL.rotation.x = swing; legR.rotation.x = -swing; armL.rotation.x = -swing * 0.8; armR.rotation.x = swing * 0.8; }
    // Slow health regen when not in a fight.
    if (this.health < PLAYER.health && t - (this.lastHurt || 0) > 8) {
      this.health = Math.min(PLAYER.health, this.health + 4 * dt);
    }
  }

  hurt(amount, t) {
    this.health -= amount;
    this.lastHurt = t;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  // Camera: behind the player (or car), mouse-drag orbits, wheel zooms.
  updateCamera(camera, dt) {
    const target = this.inCar
      ? { x: this.inCar.x, z: this.inCar.z, y: 1.2, heading: this.inCar.heading }
      : { x: this.x, z: this.z, y: 1.4, heading: this.heading };
    if (this.inCar) this.camYaw += (this.inCar.heading - this.camYaw) * 0.02;
    const d = this.camDist;
    const cx = target.x - Math.sin(this.camYaw) * Math.cos(this.camPitch) * d;
    const cz = target.z - Math.cos(this.camYaw) * Math.cos(this.camPitch) * d;
    const cy = target.y + Math.sin(this.camPitch) * d + 1.6;
    camera.position.lerp(new THREE.Vector3(cx, Math.max(1.2, cy), cz), Math.min(1, dt * 8));
    camera.lookAt(target.x, target.y + 0.6, target.z);
  }

  teleport(x, z) {
    this.x = x;
    this.z = z;
    this.mesh.position.set(x, 0, z);
  }
}
