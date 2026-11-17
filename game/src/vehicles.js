// Neon Harbor — cars: boxy original models, arcade driving, stealing.
// A car is a group: body, cabin, wheels, headlights. No imported models.
import * as THREE from 'three';
import { CAR } from './config.js';
import { collideCircle, insideCity } from './city.js';

const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12);
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

export function makeCarMesh(color, police = false, sport = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const len = sport ? 5.0 : 4.4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, len), bodyMat);
  body.position.y = 0.75;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.65, len * 0.45),
    new THREE.MeshLambertMaterial({ color: 0x18202e })
  );
  cabin.position.set(0, 1.4, sport ? 0.2 : -0.2);
  g.add(cabin);
  if (police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    bar.position.set(0, 1.85, -0.2);
    g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.3, 2.0, -0.2);
    g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    blue.position.set(0.3, 2.0, -0.2);
    g.add(blue);
    g.userData.lightRed = red;
    g.userData.lightBlue = blue;
  }
  // Headlights (warm) + taillights (red).
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const sx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), hl);
    h.position.set(sx, 0.8, len / 2 + 0.02);
    g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    t.position.set(sx, 0.8, -len / 2 - 0.02);
    g.add(t);
  }
  g.userData.wheels = [];
  for (const [wx, wz] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.55, wz);
    g.add(w);
    g.userData.wheels.push(w);
  }
  g.userData.length = len;
  return g;
}

export class Car {
  constructor(scene, x, z, heading, color, opts = {}) {
    this.scene = scene;
    this.mesh = makeCarMesh(color, opts.police, opts.sport);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.police = !!opts.police;
    this.sport = !!opts.sport;
    this.stolen = false;
    this.ai = opts.ai || null; // 'traffic' | 'police' | null (player-driven)
    this.color = color;
    this.dead = false;
    this.flash = 0;
  }

  get pos() { return { x: this.x, z: this.z }; }

  // Player driving: arcade model with steering that scales with speed.
  drive(input, dt, colliders, otherCars) {
    const forward = input.forward ? 1 : 0;
    const back = input.back ? 1 : 0;
    if (forward) this.speed += CAR.accel * dt * (this.sport ? 1.25 : 1);
    if (back) this.speed -= (this.speed > 0.5 ? CAR.brake : CAR.accel * 0.6) * dt;
    if (!forward && !back) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 14 * dt);
    if (input.handbrake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 40 * dt);
    const max = (this.sport ? CAR.maxSpeed * 1.2 : CAR.maxSpeed) * (this.topSpeedFactor || 1);
    this.speed = Math.max(-CAR.maxReverse, Math.min(max, this.speed));
    const steerAmount = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const dir = this.speed >= 0 ? 1 : -1;
    this.heading += steerAmount * CAR.steer * dt * Math.min(1, Math.abs(this.speed) / 8) * dir;
    this.move(dt, colliders, otherCars);
  }

  // Move forward along heading, resolve building + car collisions.
  move(dt, colliders, otherCars) {
    const nx = this.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.z + Math.cos(this.heading) * this.speed * dt;
    const p = { x: nx, z: nz };
    const hitWall = collideCircle(p, CAR.radius, colliders);
    if (hitWall) {
      if (Math.abs(this.speed) > 14) this.crashed = true;
      this.speed *= 0.45;
    }
    if (!insideCity(p.x, p.z)) {
      this.speed *= 0.4;
      p.x = Math.max(-176, Math.min(176, p.x));
      p.z = Math.max(-176, Math.min(182, p.z));
    }
    this.x = p.x;
    this.z = p.z;
    if (otherCars) {
      for (const o of otherCars) {
        if (o === this || o.dead) continue;
        const dx = this.x - o.x, dz = this.z - o.z;
        const d = Math.hypot(dx, dz);
        if (d < 3.4 && d > 0.01) {
          const push = (3.4 - d) / 2;
          this.x += (dx / d) * push;
          this.z += (dz / d) * push;
          o.x -= (dx / d) * push;
          o.z -= (dz / d) * push;
          if (Math.abs(this.speed) > 12) this.crashed = true;
          this.speed *= 0.7;
        }
      }
    }
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const spin = this.speed * dt * 1.8;
    for (const w of this.mesh.userData.wheels) w.rotation.x += spin;
  }

  update(dt, t) {
    if (this.police) {
      this.flash += dt;
      const on = Math.floor(this.flash * 6) % 2 === 0;
      if (this.mesh.userData.lightRed) {
        this.mesh.userData.lightRed.material.color.setHex(on ? 0xff2222 : 0x550000);
        this.mesh.userData.lightBlue.material.color.setHex(on ? 0x002266 : 0x2266ff);
      }
    }
  }

  remove() {
    this.dead = true;
    this.scene.remove(this.mesh);
  }
}
