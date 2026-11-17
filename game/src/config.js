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
    title: 'Misi 1 — Paket Pertama',
    briefing: 'Dara: "Ambil paket di kios pasar malam. Jangan telat, Saka."',
    objective: 'Ambil paket di Pasar Malam',
    target: { x: 20, z: 20 },
    reward: 500,
    wanted: 0,
    hint: 'Ikuti penanda kuning. Jalan kaki atau curi mobil — terserah kamu.',
  },
  {
    id: 'm2-kabur',
    title: 'Misi 2 — Kabur dari Razia',
    briefing: 'Polisi menggerebek pasar! Bawa paketnya ke tempat aman di barat laut.',
    objective: 'Kabur ke tempat aman (penanda kuning)',
    target: { x: -140, z: -140 },
    reward: 800,
    wanted: 2,
    hint: 'Polisi mengejarmu. Naik mobil lebih cepat. Hindari tabrakan.',
  },
  {
    id: 'm3-balapan',
    title: 'Misi 3 — Balapan Liar',
    briefing: 'Reno menantangmu balapan keliling kota. Menang, dan utangmu berkurang.',
    objective: 'Lewati 5 pos balapan sebelum waktu habis',
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
    hint: 'Naik mobil! Ikuti penanda kuning dari pos ke pos.',
  },
  {
    id: 'm4-curi-mobil',
    title: 'Misi 4 — Mobil Pesanan',
    briefing: 'Dara mau mobil sport merah di dermaga. Ambil, antar ke bengkel.',
    objective: 'Curi mobil sport merah di dermaga',
    target: { x: 120, z: 168 },
    reward: 2000,
    wanted: 1,
    hint: 'Dekati mobil merah, tekan E untuk masuk. Lalu antar ke bengkel.',
    deliver: { x: -120, z: -80 },
    deliverText: 'Antar mobil ke bengkel (penanda kuning)',
  },
  {
    id: 'm5-baku-tembak',
    title: 'Misi 5 — Baku Tembak di Kontainer',
    briefing: 'Anak buah geng Pelabuhan mengadang di kawasan kontainer. Habisi mereka.',
    objective: 'Kalahkan 6 penjaga kontainer',
    target: { x: 140, z: 0 },
    reward: 2500,
    wanted: 3,
    enemies: 6,
    hint: 'Klik mouse untuk menembak. F untuk memukul dari dekat.',
  },
  {
    id: 'm6-utang',
    title: 'Misi 6 — Bayar Utang',
    briefing: 'Bawa uangnya ke kantor Dara di dermaga. Jangan sampai ketangkap.',
    objective: 'Antar uang ke kantor Dara di dermaga',
    target: { x: -40, z: 152 },
    reward: 3000,
    wanted: 3,
    hint: 'Polisi mengawasimu. Pakai jalan kecil kalau perlu.',
  },
  {
    id: 'm7-kabur-kota',
    title: 'Misi 7 — Kabur dari Kota',
    briefing: 'Dara mengkhianatimu! Ambil uangnya dan kabur naik feri terakhir.',
    objective: 'Sampai ke feri di dermaga — HIDUP-HIDUP',
    target: { x: 0, z: 174 },
    reward: 5000,
    wanted: 5,
    hint: 'Semua polisi mengejarmu. Terus bergerak, jangan berhenti!',
  },
];

export const STORY_END =
  'Saka naik feri terakhir keluar dari Neon Harbor — bebas, dengan uangnya. TAMAT. Terima kasih sudah bermain!';

// Neon signs and shop names around the city (all invented).
export const SIGNS = [
  { text: 'PASAR MALAM', color: '#ff2e88' },
  { text: 'NEON HARBOR', color: '#22e6ff' },
  { text: 'KOPI SENJA', color: '#ffb347' },
  { text: 'DERMAGA 7', color: '#7CFC00' },
  { text: 'HOTEL OMBAK', color: '#ff5e3a' },
  { text: 'BENGKEL RENO', color: '#ffe600' },
  { text: 'IKAN BAKAR', color: '#ff8c42' },
  { text: 'KAFE PELITA', color: '#c77dff' },
];

export const CAR_COLORS = [0xd21f3c, 0x1f6fd2, 0xf2a007, 0x22b573, 0xe8e8e8, 0x222831, 0x7a3fd2, 0x0fb5ae];
