// Neon Harbor — bootstrap, game loop, input, state machine and save/load.
// The whole game is plain ES modules under game/; three.js is the only
// library, vendored as game/vendor/three.module.min.js.
import * as THREE from 'three';
import { buildCity } from './city.js';
import { Car } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Player } from './player.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { AudioEngine } from './audio.js';
import { saveGameData, loadGameData, clearSave } from './save.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 40, 140);

const city = buildCity(scene);
const audio = new AudioEngine();
const player = new Player(scene);
const police = new Police(scene, city.colliders, audio);
const combat = new Combat(scene, audio);

const errBox = document.getElementById('err');
window.addEventListener('error', (e) => {
  errBox.style.display = 'block';
  errBox.textContent = 'ERROR: ' + (e.message || e.error);
});

const world = {
  scene, camera, player, police, combat, audio,
  money: 0,
  state: 'title', // title | play | pause | dead | end
  cars: [],
  traffic: null,
  missions: null,
  hud: null,
  deps: { Car },
  shotOrbit: false,
  shotAutoFire: 0,
};

world.saveGame = () => {
  saveGameData({
    money: world.money,
    missionIndex: world.missions ? world.missions.index : 0,
    x: player.x, z: player.z,
    health: player.health,
    wanted: police.wanted,
  });
};

world.nearestStealableCar = () => {
  if (player.inCar) return null;
  let best = null, bestD = 4.5;
  for (const c of world.cars) {
    if (c.dead || c.police || c.ai === 'traffic' || c.ai === 'police') continue;
    const d = Math.hypot(c.x - player.x, c.z - player.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
};

world.newGame = () => {
  clearSave();
  world.money = 0;
  if (player.inCar) player.inCar = null;
  player.health = 100;
  player.dead = false;
  player.busted = false;
  player.teleport(0, 80);
  player.camYaw = Math.PI;
  police.clear();
  combat.clearEnemies();
  if (world.missions.targetCar) {
    world.missions.targetCar.remove();
    world.cars = world.cars.filter((c) => c !== world.missions.targetCar);
    world.missions.targetCar = null;
  }
  for (const c of world.cars) c.stolen = false;
  for (const cp of cashPickups) cp.taken = false, cp.mesh.visible = true;
  world.missions.finished = false;
  world.missions.setMission(0);
  world.state = 'play';
  world.hud.hideTitle();
  world.hud.showDead(false);
  world.hud.showPause(false);
  world.hud.toast('Misi 1 — ambil paket di Pasar Malam.');
};

world.continueGame = () => {
  const s = loadGameData();
  if (!s) { world.newGame(); return; }
  world.money = s.money || 0;
  player.health = s.health || 100;
  player.dead = false;
  player.busted = false;
  if (player.inCar) player.inCar = null;
  police.clear();
  combat.clearEnemies();
  world.missions.finished = false;
  world.missions.setMission(Math.min(s.missionIndex || 0, 6));
  player.teleport(s.x ?? 0, s.z ?? 80);
  world.state = 'play';
  world.hud.hideTitle();
  world.hud.toast('Selamat datang kembali, Saka.');
};

world.retryMission = () => {
  player.busted = false;
  player.dead = false;
  if (player.inCar) player.inCar = null;
  world.hud.showDead(false);
  world.state = 'play';
  world.missions.failMission('Coba lagi!');
};

world.toTitle = () => {
  world.saveGame();
  world.state = 'title';
  world.hud.showTitle();
  world.hud.showPause(false);
  world.hud.showDead(false);
};

world.togglePause = (force) => {
  if (world.state === 'play' || (world.state === 'pause' && force === false)) {
    const pausing = force !== false;
    world.state = pausing ? 'pause' : 'play';
    world.hud.showPause(pausing);
  }
};

// Build HUD + missions (missions announce mission 1 on creation).
world.hud = new HUD(world);
world.missions = new Missions(scene, world);
world.traffic = new Traffic(scene, city.colliders);

// Parked, stealable cars.
for (const s of city.parkedSpots) {
  const color = [0xd21f3c, 0x1f6fd2, 0xf2a007, 0x22b573, 0xe8e8e8, 0x222831][world.cars.length % 6];
  const car = new Car(scene, s.x, s.z, s.heading, color, {});
  car.parked = true;
  world.cars.push(car);
}
world.cars.push(...world.traffic.cars);

// Cash pickups: spinning green bills on the sidewalks.
const cashPickups = [];
{
  const geo = new THREE.BoxGeometry(1.4, 0.08, 0.7);
  const mat = new THREE.MeshBasicMaterial({ color: 0x22e680 });
  for (const s of city.cashSpots) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(s.x, 1, s.z);
    scene.add(mesh);
    cashPickups.push({ mesh, x: s.x, z: s.z, taken: false });
  }
}

// ---- Input ----
const input = { forward: false, back: false, left: false, right: false, run: false, handbrake: false };
const keyMap = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'handbrake',
};
addEventListener('keydown', (e) => {
  audio.init();
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = true;
  if (keyMap[e.code]) { input[keyMap[e.code]] = true; e.preventDefault(); }
  if (e.code === 'KeyE') tryEnterExitCar();
  if (e.code === 'KeyF') tryPunch();
  if (e.code === 'KeyM') { const m = audio.toggleMute(); world.hud.toast(m ? 'Suara mati.' : 'Suara hidup.'); }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (world.state === 'play' || world.state === 'pause') world.togglePause();
  }
  if (e.code === 'Enter' && world.state === 'title') world.newGame();
});
addEventListener('keyup', (e) => {
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = false;
  if (keyMap[e.code]) input[keyMap[e.code]] = false;
});

// Mouse: drag orbits the camera, a quick click shoots (on foot).
let dragging = false, downX = 0, downY = 0, downT = 0, lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  audio.init();
  dragging = true;
  downX = lastX = e.clientX; downY = lastY = e.clientY; downT = performance.now();
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  player.camYaw -= dx * 0.005;
  player.camPitch = Math.max(0.08, Math.min(1.1, player.camPitch + dy * 0.004));
});
canvas.addEventListener('pointerup', (e) => {
  dragging = false;
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
  if (moved < 6 && performance.now() - downT < 350 && world.state === 'play' && !player.inCar) {
    tryShoot();
  }
});
canvas.addEventListener('wheel', (e) => {
  player.camDist = Math.max(6, Math.min(18, player.camDist + Math.sign(e.deltaY)));
}, { passive: true });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function tryEnterExitCar() {
  if (world.state !== 'play') return;
  if (player.inCar) {
    const car = player.inCar;
    player.inCar = null;
    player.teleport(car.x - Math.cos(car.heading) * 3, car.z + Math.sin(car.heading) * 3);
    player.heading = car.heading;
    return;
  }
  const car = world.nearestStealableCar();
  if (car) {
    player.inCar = car;
    player.x = car.x; player.z = car.z;
    if (!car.stolen) {
      car.stolen = true;
      police.addHeat(1);
      world.hud.toast('Mobil dicuri! Polisi mengawasimu.');
      audio.chime();
    }
  }
}

function tryPunch() {
  if (world.state !== 'play' || player.inCar) return;
  combat.playerPunch(player, player.heading);
}

function tryShoot() {
  if (world.state !== 'play' || player.inCar) return;
  combat.playerShoot(camera, player, world.traffic, police, () => police.addHeat(2));
}

// ---- Screenshot scenes ----
let shot = null;
if (shotName) {
  shot = applyShot(world, shotName);
  if (shotName === 'shootout') world.shotAutoFire = 2.0;
  if (shot && shot.autopilot === 'drive') input.forward = true;
  if (shot && shot.autopilot === 'walk') input.forward = true;
}
if (!shotName) {
  world.hud.showTitle();
}

// ---- Main loop ----
const clock = new THREE.Clock();
let elapsed = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  city.update(dt, elapsed);

  if (world.state === 'title') {
    // Slow cinematic orbit over the city behind the title screen.
    const a = elapsed * 0.05;
    camera.position.set(Math.sin(a) * 150, 70, Math.cos(a) * 150);
    camera.lookAt(0, 0, 20);
    world.traffic.update(dt, elapsed, world.cars, player);
    renderer.render(scene, camera);
    return;
  }
  if (world.state !== 'play') {
    renderer.render(scene, camera);
    return;
  }

  const allCars = world.cars.concat(police.cars);
  if (player.inCar) {
    player.inCar.drive(input, dt, city.colliders, allCars);
    player.x = player.inCar.x;
    player.z = player.inCar.z;
    if (player.inCar.crashed) { audio.crash(); player.inCar.crashed = false; }
    audio.setEngine(Math.abs(player.inCar.speed) / 50);
  } else {
    player.updateOnFoot(input, dt, city.colliders, elapsed);
    audio.setEngine(0);
  }
  world.traffic.update(dt, elapsed, allCars, player);
  police.update(dt, elapsed, player, allCars);
  combat.update(dt, elapsed, player, !!player.inCar);
  world.missions.update(dt, elapsed);

  // Cash pickups.
  for (const cp of cashPickups) {
    if (cp.taken) continue;
    cp.mesh.rotation.y += dt * 2;
    cp.mesh.position.y = 1 + Math.sin(elapsed * 3 + cp.x) * 0.2;
    if (Math.hypot(cp.x - player.x, cp.z - player.z) < 3) {
      cp.taken = true;
      cp.mesh.visible = false;
      world.money += 100;
      audio.pickup();
      world.hud.toast('+$100 uang jalanan.');
    }
  }

  // Screenshot mode: scripted shots for the shootout frame, every 1.5s.
  if (world.shotAutoFire > 0) {
    world.shotAutoFire -= dt;
    if (world.shotAutoFire <= 0) { tryShoot(); world.shotAutoFire = 1.5; }
  }

  // Busted / dead.
  if (player.busted) {
    player.busted = false;
    world.state = 'dead';
    document.getElementById('dead-title').textContent = 'TERTANGKAP!';
    document.getElementById('dead-text').textContent = 'Polisi menangkap Saka. Misi diulang dari awal misi ini.';
    world.hud.showDead(true);
  } else if (player.dead) {
    world.state = 'dead';
    document.getElementById('dead-title').textContent = 'KAMU MATI';
    document.getElementById('dead-text').textContent = 'Saka tumbang. Misi diulang dari awal misi ini.';
    world.hud.showDead(true);
  }

  player.updateCamera(camera, dt);
  world.hud.update(dt);
  renderer.render(scene, camera);
}
animate();

// Expose a tiny handle for headless smoke tests.
window.__neonHarbor = { world, version: 1 };
