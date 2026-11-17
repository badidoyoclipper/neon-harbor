// Neon Harbor — wanted level and police pursuit.
// More stars = more patrol cars, faster and more aggressive. Police ram
// the player; if they touch the player on foot, the player is busted.
import { Car } from './vehicles.js';
import { WANTED_MAX } from './config.js';

export class Police {
  constructor(scene, colliders, audio) {
    this.scene = scene;
    this.colliders = colliders;
    this.audio = audio;
    this.wanted = 0;
    this.cars = [];
    this.coolTimer = 0; // seconds since last crime: wanted cools down
    this.spawnTimer = 0;
    this.bustedTimer = 0;
  }

  setWanted(level, reason) {
    const next = Math.max(0, Math.min(WANTED_MAX, level));
    if (next > this.wanted) this.coolTimer = 0;
    this.wanted = next;
    return this.wanted;
  }

  addHeat(amount) {
    this.setWanted(this.wanted + amount);
    this.coolTimer = 0;
  }

  targetCount() {
    return this.wanted * 2;
  }

  update(dt, t, player, allCars) {
    this.coolTimer += dt;
    // Wanted cools down slowly when the player stays out of trouble.
    if (this.wanted > 0 && this.coolTimer > 25) {
      this.setWanted(this.wanted - 1);
      this.coolTimer = 0;
    }
    // Spawn / remove patrol cars to match the wanted level.
    this.spawnTimer -= dt;
    if (this.cars.length < this.targetCount() && this.spawnTimer <= 0) {
      this.spawnTimer = 1.2;
      const angle = Math.random() * Math.PI * 2;
      const dist = 55 + Math.random() * 25;
      const x = Math.max(-170, Math.min(170, player.x + Math.cos(angle) * dist));
      const z = Math.max(-170, Math.min(170, player.z + Math.sin(angle) * dist));
      const car = new Car(this.scene, x, z, 0, 0x1a1a2e, { police: true, ai: 'police' });
      this.cars.push(car);
    }
    while (this.cars.length > this.targetCount()) {
      const c = this.cars.pop();
      if (c) c.remove();
    }
    if (this.audio) this.audio.setSiren(this.wanted > 0);

    // Chase: steer toward the player, ram on foot, push the player's car.
    // A car with a holdOffset instead holds formation at that offset from
    // the player (used by the cover screenshot: police stay in frame).
    for (const car of this.cars) {
      if (car.dead) continue;
      const pHeading = player.inCar ? player.inCar.heading : player.heading;
      let tx = player.x, tz = player.z;
      let topSpeed = 24 + this.wanted * 3.2;
      if (car.holdOffset) {
        const fx = Math.sin(pHeading), fz = Math.cos(pHeading);
        const rx = Math.cos(pHeading), rz = -Math.sin(pHeading);
        tx = player.x + fx * car.holdOffset.along + rx * car.holdOffset.side;
        tz = player.z + fz * car.holdOffset.along + rz * car.holdOffset.side;
        topSpeed = player.inCar ? Math.abs(player.inCar.speed) + 2 : 12;
      }
      const dx = tx - car.x, dz = tz - car.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const turn = Math.max(-2.6 * dt, Math.min(2.6 * dt, dh));
      car.heading += turn;
      const want = dist > 6 ? topSpeed : topSpeed * 0.4;
      car.speed += Math.max(-26 * dt, Math.min(18 * dt, want - car.speed));
      car.move(dt, this.colliders, allCars);
      car.update(dt, t);
      // Busted: a police car touches the player on foot.
      const pdist = Math.hypot(player.x - car.x, player.z - car.z);
      if (!player.inCar && pdist < 3.2) {
        this.bustedTimer += dt;
        if (this.bustedTimer > 1.2) {
          player.busted = true;
          this.bustedTimer = 0;
        }
      } else {
        this.bustedTimer = 0;
      }
    }
  }

  clear() {
    for (const c of this.cars) c.remove();
    this.cars = [];
    this.wanted = 0;
  }
}
