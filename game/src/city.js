// Neon Harbor — the city itself: golden-hour port town built from boxes,
// procedural canvas textures and neon signs. All geometry is generated
// here, so the whole city is original art, no loaded assets.
import * as THREE from 'three';
import { CITY, SIGNS } from './config.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Facade texture: lit windows on a coloured wall.
function facadeTexture(base, lit, seed) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  const cols = 4, rows = 10;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const on = r() < lit;
      g.fillStyle = on ? (r() < 0.7 ? '#ffd27a' : '#7ee7ff') : '#1c2436';
      g.fillRect(10 + x * 30, 12 + y * 24, 18, 13);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roadTexture(horizontal) {
  // Canvas is 256 long (along the road) x 64 across; the yellow centre
  // line runs along the road's length. `horizontal` flips the canvas so
  // the line lies along U for east-west roads and along V for north-south.
  const c = document.createElement('canvas');
  c.width = horizontal ? 256 : 64;
  c.height = horizontal ? 64 : 256;
  const g = c.getContext('2d');
  g.fillStyle = '#23262e';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#c9a227';
  if (horizontal) g.fillRect(0, 30, 256, 4);
  else g.fillRect(30, 0, 4, 256);
  g.fillStyle = '#3a3f4a';
  if (horizontal) { for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 2, 64); }
  else { for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 64, 2); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function signTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0a12';
  g.fillRect(0, 0, 512, 96);
  g.font = 'bold 54px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 26;
  g.fillStyle = color;
  g.fillText(text, 256, 50);
  g.shadowBlur = 0;
  g.fillStyle = '#ffffff';
  g.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene) {
  const colliders = []; // {x, z, hx, hz}
  const animated = []; // {mesh, phase, kind}
  const rand = rng(1337);
  const group = new THREE.Group();
  scene.add(group);

  // Golden-hour sky: warm gradient dome + haze.
  const skyGeo = new THREE.SphereGeometry(900, 24, 12);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 top = vec3(0.16, 0.12, 0.38); vec3 mid = vec3(0.98, 0.55, 0.28); vec3 low = vec3(1.0, 0.75, 0.45); vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.8, h)) : mix(low, mid, smoothstep(-0.05, 0.25, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  group.add(new THREE.Mesh(skyGeo, skyMat));
  scene.fog = new THREE.Fog(0xe8906a, 180, 700);

  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x2a1e33, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb36b, 1.6);
  sun.position.set(-180, 120, 220);
  scene.add(sun);

  // Ground: grass-ish dark base for the whole island.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x2e4a2f })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  group.add(ground);

  // City slab (concrete) under the street grid.
  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(372, 372),
    new THREE.MeshLambertMaterial({ color: 0x555a63 })
  );
  slab.rotation.x = -Math.PI / 2;
  slab.position.set(0, 0, 0);
  group.add(slab);

  // Roads: one asphalt strip per street, both directions.
  const roadTexX = roadTexture(true);
  const roadTexZ = roadTexture(false);
  const roadMatX = new THREE.MeshLambertMaterial({ map: roadTexX });
  const roadMatZ = new THREE.MeshLambertMaterial({ map: roadTexZ });
  roadTexX.repeat.set(14, 1);
  roadTexZ.repeat.set(1, 14);
  for (const s of CITY.streets) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(372, 12), roadMatX);
    v.rotation.x = -Math.PI / 2;
    v.position.set(0, 0.02, s);
    group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(12, 372), roadMatZ);
    h.rotation.x = -Math.PI / 2;
    h.position.set(s, 0.02, 0);
    group.add(h);
  }

  // Harbour: sea plane south of the city + wooden pier + ferry.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 200),
    new THREE.MeshLambertMaterial({ color: 0x14486b, transparent: true, opacity: 0.94 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.1, 284);
  group.add(sea);
  animated.push({ mesh: sea, phase: 0, kind: 'sea' });
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(70, 1.2, 26), pierMat);
  pier.position.set(0, 0.6, 196);
  group.add(pier);
  colliders.push({ x: 0, z: 196, hx: 35, hz: 13 });
  // Ferry (white + teal boat) moored at the pier end.
  const ferry = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 26), new THREE.MeshLambertMaterial({ color: 0xf2f2ea }));
  hull.position.y = 1.5;
  ferry.add(hull);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(11, 4, 16), new THREE.MeshLambertMaterial({ color: 0x0fb5ae }));
  cabin.position.y = 5;
  ferry.add(cabin);
  const funnel = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 3), new THREE.MeshLambertMaterial({ color: 0xff5e3a }));
  funnel.position.set(0, 7, -5);
  ferry.add(funnel);
  ferry.position.set(0, 0.4, 224);
  group.add(ferry);
  animated.push({ mesh: ferry, phase: 1.3, kind: 'bob' });

  // Container yard (east) + market plaza (centre) are special blocks.
  const special = new Set(['140,-20', '140,20', '20,20', '100,100', '-20,-20']);
  const centers = [];
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) centers.push({ x: -140 + i * 40, z: -140 + j * 40 });

  const wallColors = ['#7a5c8a', '#4a6b8a', '#8a6b4a', '#5c7a5c', '#8a4a5c', '#4a4a6b'];
  let signIdx = 0;
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (const c of centers) {
    const key = `${c.x},${c.z}`;
    if (special.has(key)) continue;
    // 1–3 buildings per block, taller toward the centre.
    const dist = Math.hypot(c.x, c.z);
    const count = dist < 70 ? 2 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 2);
    for (let b = 0; b < count; b++) {
      const w = 9 + rand() * 8;
      const d = 9 + rand() * 8;
      const h = (dist < 70 ? 16 : 8) + rand() * (dist < 70 ? 26 : 12);
      const ox = (rand() - 0.5) * (26 - w);
      const oz = (rand() - 0.5) * (26 - d);
      const tex = facadeTexture(wallColors[Math.floor(rand() * wallColors.length)], 0.45, Math.floor(rand() * 1e9));
      const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ map: tex, emissive: 0x332211, emissiveIntensity: 0.35 }));
      m.scale.set(w, h, d);
      m.position.set(c.x + ox, h / 2, c.z + oz);
      group.add(m);
      colliders.push({ x: c.x + ox, z: c.z + oz, hx: w / 2 + 0.3, hz: d / 2 + 0.3 });
      // Neon sign on some taller buildings.
      if (h > 24 && rand() < 0.55) {
        const sign = SIGNS[signIdx % SIGNS.length];
        signIdx += 1;
        const sm = new THREE.Mesh(
          new THREE.PlaneGeometry(14, 2.6),
          new THREE.MeshBasicMaterial({ map: signTexture(sign.text, sign.color), transparent: true })
        );
        sm.position.set(c.x + ox, h - 2, c.z + oz + d / 2 + 0.15);
        group.add(sm);
        animated.push({ mesh: sm, phase: rand() * 6, kind: 'flicker' });
      }
    }
  }

  // Market plaza: stalls with striped awnings + crates.
  const stallCols = [0xff2e88, 0x22e6ff, 0xffb347, 0x7CFC00];
  for (let i = 0; i < 8; i++) {
    const sx = 6 + (i % 4) * 10;
    const sz = 8 + Math.floor(i / 4) * 12;
    const stall = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 5), new THREE.MeshLambertMaterial({ color: stallCols[i % 4] }));
    top.position.y = 3.2;
    stall.add(top);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.4, 4.4), new THREE.MeshLambertMaterial({ color: 0x6b4a2b }));
    counter.position.y = 0.7;
    stall.add(counter);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    for (const [px, pz] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 6), poleMat);
      pole.position.set(px, 1.6, pz);
      stall.add(pole);
    }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    bulb.position.y = 2.9;
    stall.add(bulb);
    stall.position.set(sx, 0, sz);
    group.add(stall);
    colliders.push({ x: sx, z: sz, hx: 3.4, hz: 2.6 });
  }

  // Container yard: stacked shipping containers.
  const contCols = [0xd21f3c, 0x1f6fd2, 0xf2a007, 0x22b573, 0x7a3fd2];
  for (let i = 0; i < 14; i++) {
    const bx = 128 + (i % 3) * 13;
    const bz = -28 + Math.floor(i / 3) * 13;
    const h = 2.6 * (1 + (i % 3 === 0 ? 1 : 0));
    const cont = new THREE.Mesh(
      new THREE.BoxGeometry(11, h, 5.5),
      new THREE.MeshLambertMaterial({ color: contCols[i % contCols.length] })
    );
    cont.position.set(bx, h / 2, bz);
    group.add(cont);
    colliders.push({ x: bx, z: bz, hx: 5.8, hz: 3 });
  }

  // Palm trees along the harbour road and the plaza.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f7a3d });
  function palm(x, z) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.y = 3.5;
    t.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 4), leafMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.6, 7.2, Math.sin(a) * 1.6);
      leaf.rotation.z = Math.cos(a) * 1.1;
      leaf.rotation.x = -Math.sin(a) * 1.1;
      t.add(leaf);
    }
    t.position.set(x, 0, z);
    group.add(t);
    colliders.push({ x, z, hx: 0.6, hz: 0.6 });
  }
  for (let x = -160; x <= 160; x += 40) { palm(x + 10, 172); palm(x - 10, -168); }
  palm(34, 34); palm(6, 34); palm(34, 6); palm(6, 6);

  // Street lamps: pole + glowing head (emissive, no extra lights).
  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x222831 });
  for (let x = -160; x <= 160; x += 40) {
    for (const z of [-160, 0, 160]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 6), lampPoleMat);
      pole.position.set(x + 8, 3, z + 8);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), lampHeadMat);
      head.position.set(x + 8, 6.2, z + 8);
      group.add(head);
    }
  }

  // Boss office (harbour) + garage (north-west) as marked landmarks.
  function landmark(x, z, w, h, d, color, label, labelColor) {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color }));
    m.scale.set(w, h, d);
    m.position.set(x, h / 2, z);
    group.add(m);
    colliders.push({ x, z, hx: w / 2 + 0.3, hz: d / 2 + 0.3 });
    const sm = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 3),
      new THREE.MeshBasicMaterial({ map: signTexture(label, labelColor), transparent: true })
    );
    sm.position.set(x, h + 1.5, z + d / 2 + 0.2);
    group.add(sm);
    animated.push({ mesh: sm, phase: rand() * 6, kind: 'flicker' });
  }
  landmark(-40, 152, 18, 14, 12, 0x3a2a4a, 'KANTOR DARA', '#ff2e88');
  landmark(-120, -80, 20, 9, 14, 0x4a4a55, "RENO'S GARAGE", '#ffe600');

  // Parked cars the player can steal, at fixed spots around town.
  const parkedSpots = [
    { x: 8, z: 44, heading: 0 },
    { x: -48, z: 8, heading: Math.PI / 2 },
    { x: 88, z: -8, heading: -Math.PI / 2 },
    { x: -8, z: -48, heading: Math.PI },
    { x: 48, z: 128, heading: 0 },
    { x: -128, z: 48, heading: Math.PI / 2 },
    { x: 128, z: 88, heading: 0 },
    { x: 8, z: -128, heading: Math.PI },
  ];

  // Cash pickups scattered on sidewalks.
  const cashSpots = [
    { x: 30, z: 46 }, { x: -70, z: 10 }, { x: 110, z: -30 }, { x: -30, z: -110 },
    { x: 70, z: 90 }, { x: -110, z: 130 }, { x: 150, z: 50 }, { x: -150, z: -50 },
  ];

  return {
    colliders,
    parkedSpots,
    cashSpots,
    update(dt, t) {
      for (const a of animated) {
        if (a.kind === 'sea') {
          a.mesh.position.y = 0.1 + Math.sin(t * 0.5 + a.phase) * 0.08;
        } else if (a.kind === 'bob') {
          a.mesh.position.y = 0.4 + Math.sin(t * 0.7 + a.phase) * 0.25;
          a.mesh.rotation.z = Math.sin(t * 0.5) * 0.01;
        } else if (a.kind === 'flicker') {
          a.mesh.visible = Math.sin(t * 7 + a.phase) > -0.92;
        }
      }
    },
  };
}

// Circle (player / car) vs axis-aligned box colliders: push out, report hit.
export function collideCircle(pos, radius, colliders) {
  let hit = false;
  for (const c of colliders) {
    const dx = pos.x - Math.max(c.x - c.hx, Math.min(pos.x, c.x + c.hx));
    const dz = pos.z - Math.max(c.z - c.hz, Math.min(pos.z, c.z + c.hz));
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = (radius - d) / d;
        pos.x += dx * push;
        pos.z += dz * push;
      } else {
        pos.x += radius;
      }
    }
  }
  return hit;
}

export function insideCity(x, z) {
  return x > -178 && x < 178 && z > -178 && z < CITY.waterZ - 2;
}
