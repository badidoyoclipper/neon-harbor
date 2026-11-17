// Neon Harbor — deterministic screenshot scenes behind ?shot=<name>.
// Each scene plays the real game forward from a fixed setup (same seed,
// same positions), steered by a tiny autopilot, so the frame is what a
// real session looks like — never a composed image.
import { Car } from './vehicles.js';
import { CAR_COLORS } from './config.js';

// Put the player in a car at (x, z) facing `heading`, engine running.
function putPlayerInCar(world, x, z, heading, color, sport) {
  const car = new Car(world.scene, x, z, heading, color || 0xd21f3c, { sport: !!sport });
  world.cars.push(car);
  world.player.inCar = car;
  world.player.x = x;
  world.player.z = z;
  car.speed = 14;
  return car;
}

function addPoliceChase(world, around, count, heading) {
  // Patrol cars in formation around the player: two ahead (visible in the
  // chase frame), one alongside, one behind — they hold their offsets and
  // match the player's speed instead of piling onto one point.
  world.police.setWanted(4, 'shot');
  const offsets = [
    { along: 30, side: -7 }, { along: 38, side: 7 }, { along: 22, side: 9 },
  ];
  for (let i = 0; i < count; i++) {
    const o = offsets[i % offsets.length];
    const car = new Car(world.scene,
      around.x + Math.sin(heading) * o.along + Math.cos(heading) * o.side,
      around.z + Math.cos(heading) * o.along - Math.sin(heading) * o.side,
      heading, 0x1a1a2e, { police: true, ai: 'police' });
    car.holdOffset = o;
    world.police.cars.push(car);
    world.cars.push(car);
  }
  // One more patrol car behind, so the minimap shows the chase closing in.
  const back = new Car(world.scene, around.x - Math.sin(heading) * 26, around.z - Math.cos(heading) * 26, heading, 0x1a1a2e, { police: true, ai: 'police' });
  back.holdOffset = { along: -30, side: -10 };
  world.police.cars.push(back);
  world.cars.push(back);
}

function addTrafficAhead(world, x, z, heading, n) {
  // Traffic in the neighbouring lane (offset sideways) so the player's car
  // cruises past instead of rear-ending the car ahead.
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? 4.4 : -4.4;
    const along = 26 + i * 18;
    const car = new Car(world.scene, x + Math.sin(heading) * along + rx * side, z + Math.cos(heading) * along + rz * side, heading, CAR_COLORS[(i + 2) % CAR_COLORS.length], { ai: 'traffic' });
    car.cruise = 10;
    car.route = [{ x: x + Math.sin(heading) * 300, z: z + Math.cos(heading) * 300 }, { x, z }];
    car.wp = 0;
    car.speed = 10;
    world.cars.push(car);
    world.traffic.cars.push(car);
  }
}

export function applyShot(world, name) {
  const p = world.player;
  if (name === 'start') {
    // Title screen over a slow orbit of the city at golden hour.
    world.state = 'title';
    world.shotOrbit = true;
    return { autopilot: null };
  }
  world.state = 'play';
  world.hud.hideTitle();
  if (name === 'cover') {
    // Police chase: wanted 4, mission marker ahead, minimap busy.
    world.missions.setMission(1);
    world.money = 1250;
    const car = putPlayerInCar(world, -30, 0, Math.PI / 2, 0xf2a007, false);
    car.speed = 22;
    car.topSpeedFactor = 0.55; // a tired getaway car: police can keep up
    addPoliceChase(world, { x: -30, z: 0 }, 3, Math.PI / 2);
    addTrafficAhead(world, -30, 0, Math.PI / 2, 3);
    p.camYaw = Math.PI / 2;
    p.camPitch = 0.3;
    world.missions.beacon.position.set(-140, 30, -140);
    world.missions.ring.position.set(-140, 0.3, -140);
    return { autopilot: 'drive' };
  }
  if (name === 'drive') {
    // Cruising the main avenue with traffic ahead, market behind.
    world.missions.index = 0;
    world.money = 500;
    const car = putPlayerInCar(world, -60, 40, Math.PI / 2, 0xf2a007, false);
    car.speed = 18;
    addTrafficAhead(world, -60, 40, Math.PI / 2, 4);
    p.camYaw = Math.PI / 2;
    p.camPitch = 0.28;
    return { autopilot: 'drive' };
  }
  if (name === 'market') {
    // On foot in the night market: stalls, pedestrians, mission beacon.
    // The player stands still, looking into the plaza, so the mission
    // target stays ahead and the frame keeps its market feel.
    world.missions.index = 0;
    world.money = 500;
    p.teleport(20, 48);
    p.heading = Math.PI;
    p.camYaw = Math.PI;
    p.camPitch = 0.3;
    return { autopilot: null };
  }
  if (name === 'shootout') {
    // Container-yard shootout: thugs ahead, wanted 3, health chipped.
    world.missions.setMission(4);
    world.money = 4800;
    p.teleport(128, -21.5);
    p.health = 78;
    p.heading = Math.PI / 2;
    p.camYaw = Math.PI / 2;
    p.camPitch = 0.22;
    p.camDist = 7;
    world.police.setWanted(3, 'shot');
    return { autopilot: 'aim' };
  }
  return { autopilot: null };
}
