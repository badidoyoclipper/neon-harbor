// Neon Harbor — shared tuning, city layout and mission story data.
// Everything here is original: a fictional tropical port city, its people
// and its story. No names, places or assets from any commercial game.

export const CITY = {
  // Streets run along both axes at these coordinates; blocks sit between them.
  streets: [-160, -120, -80, -40, 0, 40, 80, 120, 160],
  roadHalf: 6, // half-width of the asphalt
  bounds: 176, // playable edge before the harbour water (south, +z)
  waterZ: 184, // where the sea starts
};

export const PLAYER = {
  walkSpeed: 7,
  runSpeed: 12,
  radius: 0.7,
  health: 100,
};

export const CAR = {
  accel: 22,
  brake: 34,
  maxSpeed: 42,
  maxReverse: 12,
  steer: 1.9,
  radius: 2.3,
};

export const WANTED_MAX = 5;

// Story: Saka, a freelance courier in debt to the harbour boss, Dara.
// Seven missions, one chain. Rewards in dollars.
export const MISSIONS = [
  {
    id: 'm1-paket',
    title: 'Mission 1 — The First Package',
    briefing: 'Dara: "Pick up the package at the night market stall. Do not be late, Saka."',
    objective: 'Pick up the package at the Night Market',
    target: { x: 20, z: 20 },
    reward: 500,
    wanted: 0,
    hint: 'Follow the yellow marker. Walk or steal a car — your call.',
  },
  {
    id: 'm2-kabur',
    title: 'Mission 2 — Escape the Raid',
    briefing: 'The cops are raiding the market! Get the package to the safe spot in the northwest.',
    objective: 'Escape to the safe spot (yellow marker)',
    target: { x: -140, z: -140 },
    reward: 800,
    wanted: 2,
    hint: 'The cops are after you. A car is faster. Avoid crashes.',
  },
  {
    id: 'm3-balapan',
    title: 'Mission 3 — Street Race',
    briefing: 'Reno challenges you to a race around the city. Win, and your debt shrinks.',
    objective: 'Hit 5 race checkpoints before time runs out',
    target: { x: 160, z: 0 },
    reward: 1500,
    wanted: 1,
    timeLimit: 100,
    checkpoints: [
      { x: 160, z: 0 },
      { x: 160, z: 160 },
      { x: 0, z: 160 },
      { x: -160, z: 160 },
      { x: -160, z: 0 },
    ],
    hint: 'Get a car! Follow the yellow markers from checkpoint to checkpoint.',
  },
  {
    id: 'm4-curi-mobil',
    title: 'Mission 4 — The Ordered Car',
    briefing: 'Dara wants the red sports car at the pier. Take it, deliver it to the garage.',
    objective: 'Steal the red sports car at the pier',
    target: { x: 120, z: 168 },
    reward: 2000,
    wanted: 1,
    hint: 'Walk up to the red car, press E to get in. Then deliver it to the garage.',
    deliver: { x: -120, z: -80 },
    deliverText: 'Deliver the car to the garage (yellow marker)',
  },
  {
    id: 'm5-baku-tembak',
    title: 'Mission 5 — Container Yard Shootout',
    briefing: 'Harbor gang thugs are waiting in the container yard. Take them out.',
    objective: 'Defeat 6 container yard guards',
    target: { x: 140, z: 0 },
    reward: 2500,
    wanted: 3,
    enemies: 6,
    hint: 'Click the mouse to shoot. F to punch up close.',
  },
  {
    id: 'm6-utang',
    title: 'Mission 6 — Pay the Debt',
    briefing: 'Take the money to Dara\'s office at the pier. Do not get caught.',
    objective: 'Deliver the money to Dara\'s office at the pier',
    target: { x: -40, z: 152 },
    reward: 3000,
    wanted: 3,
    hint: 'The cops are watching you. Use the side streets if you need to.',
  },
  {
    id: 'm7-kabur-kota',
    title: 'Mission 7 — Escape the City',
    briefing: 'Dara betrayed you! Grab the money and escape on the last ferry.',
    objective: 'Reach the ferry at the pier — ALIVE',
    target: { x: 0, z: 174 },
    reward: 5000,
    wanted: 5,
    hint: 'Every cop in the city is after you. Keep moving, do not stop!',
  },
];

export const STORY_END =
  'Saka rides the last ferry out of Neon Harbor — free, with his money. THE END. Thanks for playing!';

// Neon signs and shop names around the city (all invented).
export const SIGNS = [
  { text: 'NIGHT MARKET', color: '#ff2e88' },
  { text: 'NEON HARBOR', color: '#22e6ff' },
  { text: 'DUSK COFFEE', color: '#ffb347' },
  { text: 'PIER 7', color: '#7CFC00' },
  { text: 'WAVE HOTEL', color: '#ff5e3a' },
  { text: "RENO'S GARAGE", color: '#ffe600' },
  { text: 'GRILLED FISH', color: '#ff8c42' },
  { text: 'PELITA CAFE', color: '#c77dff' },
];

export const CAR_COLORS = [0xd21f3c, 0x1f6fd2, 0xf2a007, 0x22b573, 0xe8e8e8, 0x222831, 0x7a3fd2, 0x0fb5ae];
