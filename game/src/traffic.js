// Neon Harbor — traffic cars looping the street grid and pedestrians
// strolling the sidewalks. Simple, cheap, and always moving so the city
// feels alive in every screenshot.
import * as THREE from 'three';
import { CITY, CAR_COLORS } from './config.js';
import { Car } from './vehicles.js';

function loopRoute(streetA, streetB, dir) {
  // A rectangle of streets: (A,A) -> (B,A) -> (B,B) -> (A,B) -> back.
  const pts = [
    { x: streetA, z: streetA }, { x: streetB, z: streetA },
    { x: streetB, z: streetB }, { x: streetA, z: streetB },
  ];
  return dir < 0 ? pts.reverse() : pts;
}

export class Traffic {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.cars = [];
    this.peds = [];
    this.pedGroup = new THREE.Group();
    scene.add(this.pedGroup);

    const routes = [
      loopRoute(-120, 120, 1), loopRoute(-80, 80, -1), loopRoute(-160, 160, 1),
      loopRoute(-40, 120, -1), loopRoute(-120, 40, 1), loopRoute(0, 160, -1),
    ];
    for (let i = 0; i < 14; i++) {
      const route = routes[i % routes.length];
      const wp = Math.floor(Math.random() * 4);
      const p = route[wp];
      const color = CAR_COLORS[i % CAR_COLORS.length];
      const car = new Car(scene, p.x + (Math.random() - 0.5) * 4, p.z + (Math.random() - 0.5) * 4, 0, color, { ai: 'traffic' });
      car.route = route;
      car.wp = (wp + 1) % 4;
      car.cruise = 9 + Math.random() * 5;
      this.cars.push(car);
    }

    // Pedestrians: little capsule people in bright clothes.
    const pedColors = [0xff8c42, 0x22e6ff, 0xff2e88, 0xffe600, 0x7CFC00, 0xc77dff, 0xf2f2ea];
    const bodyGeo = new THREE.CylinderGeometry(0.32, 0.38, 1.1, 8);
    const headGeo = new THREE.SphereGeometry(0.28, 10, 8);
    for (let i = 0; i < 36; i++) {
      const color = pedColors[i % pedColors.length];
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color }));
      body.position.y = 0.95;
      g.add(body);
      const head = new THREE.Mesh(headGeo, new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
      head.position.y = 1.75;
      g.add(head);
      this.pedGroup.add(g);
      const street = CITY.streets[Math.floor(Math.random() * CITY.streets.length)];
      const along = -160 + Math.random() * 320;
      const horiz = Math.random() < 0.5;
      this.peds.push({
        mesh: g,
        x: horiz ? along : street + 8.5,
        z: horiz ? street + 8.5 : along,
        horiz,
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: 1.2 + Math.random() * 1.4,
        phase: Math.random() * 6,
        flee: 0,
      });
    }
  }

  // Traffic cars drive their rectangle, slowing for the car ahead.
  update(dt, t, allCars, playerPos) {
    for (const car of this.cars) {
      if (car.dead) continue;
      const target = car.route[car.wp];
      const dx = target.x - car.x, dz = target.z - car.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3) { car.wp = (car.wp + 1) % 4; continue; }
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      // Slow down if another car is right ahead.
      let slow = false;
      for (const o of allCars) {
        if (o === car || o.dead) continue;
        const ox = o.x - car.x, oz = o.z - car.z;
        const ahead = ox * Math.sin(car.heading) + oz * Math.cos(car.heading);
        const side = Math.abs(ox * Math.cos(car.heading) - oz * Math.sin(car.heading));
        if (ahead > 0 && ahead < 11 && side < 3) { slow = true; break; }
      }
      const want = slow ? 0 : car.cruise;
      car.speed += Math.max(-18 * dt, Math.min(12 * dt, want - car.speed));
      car.move(dt, this.colliders, allCars);
      car.update(dt, t);
    }
    // Pedestrians walk their sidewalk line; they run away from gunfire.
    for (const p of this.peds) {
      if (p.flee > 0) {
        p.flee -= dt;
        const dx = p.x - playerPos.x, dz = p.z - playerPos.z;
        const d = Math.hypot(dx, dz) || 1;
        p.x += (dx / d) * 6 * dt;
        p.z += (dz / d) * 6 * dt;
      } else {
        const step = p.dir * p.speed * dt;
        if (p.horiz) p.x += step; else p.z += step;
        const v = p.horiz ? p.x : p.z;
        if (v > 168 || v < -168) p.dir *= -1;
      }
      p.mesh.position.set(p.x, Math.abs(Math.sin(t * 6 + p.phase)) * 0.12, p.z);
      p.mesh.rotation.y = p.horiz ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (p.dir > 0 ? 0 : Math.PI);
    }
  }

  scarePeds(x, z) {
    for (const p of this.peds) {
      if (Math.hypot(p.x - x, p.z - z) < 26) p.flee = 3;
    }
  }

  // Nearest pedestrian to a point (for punching / shooting checks).
  nearestPed(x, z, maxDist) {
    let best = null, bestD = maxDist;
    for (const p of this.peds) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }
}
