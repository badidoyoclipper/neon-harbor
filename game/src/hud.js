// Neon Harbor — HUD, minimap, menus and messages.
// All DOM lives in index.html; this module wires it up and draws the
// top-down minimap (streets, player, police, mission target) each frame.

export class HUD {
  constructor(world) {
    this.world = world;
    const $ = (id) => document.getElementById(id);
    this.el = {
      hud: $('hud'), money: $('money'), healthFill: $('health-fill'), healthText: $('health-text'),
      stars: $('stars'), objective: $('objective'), timer: $('timer'),
      minimap: $('minimap'), toast: $('toast'), dialogue: $('dialogue'),
      hint: $('hint'), crosshair: $('crosshair'), speed: $('speed'),
      interact: $('interact'), title: $('title-screen'), pause: $('pause-screen'),
      end: $('end-screen'), dead: $('dead-screen'),
    };
    this.mapCtx = this.el.minimap.getContext('2d');
    this.dialogueTimer = 0;
    this.toastTimer = 0;
    // Title screen buttons.
    $('btn-new').addEventListener('click', () => this.world.newGame());
    $('btn-continue').addEventListener('click', () => this.world.continueGame());
    $('btn-how').addEventListener('click', () => {
      $('howto').style.display = $('howto').style.display === 'block' ? 'none' : 'block';
    });
    // Pause buttons.
    $('btn-resume').addEventListener('click', () => this.world.togglePause(false));
    $('btn-save').addEventListener('click', () => { this.world.saveGame(); this.toast('Game disimpan.'); });
    $('btn-quit').addEventListener('click', () => this.world.toTitle());
    $('btn-restart').addEventListener('click', () => this.world.newGame());
    // Dead / end buttons.
    $('btn-retry').addEventListener('click', () => this.world.retryMission());
    $('btn-again').addEventListener('click', () => this.world.newGame());
    $('btn-end-title').addEventListener('click', () => this.world.toTitle());
    this.updateContinueButton();
  }

  updateContinueButton() {
    const has = !!localStorage.getItem('neon-harbor-save');
    document.getElementById('btn-continue').style.display = has ? 'inline-block' : 'none';
    const info = document.getElementById('save-info');
    if (has) {
      try {
        const s = JSON.parse(localStorage.getItem('neon-harbor-save'));
        info.textContent = `Save terakhir: Misi ${s.missionIndex + 1}/7 — $${(s.money || 0).toLocaleString('en-US')}`;
      } catch { info.textContent = ''; }
    } else info.textContent = '';
  }

  showTitle() {
    this.el.title.style.display = 'flex';
    this.el.hud.style.display = 'none';
    this.el.pause.style.display = 'none';
    this.el.end.style.display = 'none';
    this.el.dead.style.display = 'none';
    this.updateContinueButton();
  }

  hideTitle() {
    this.el.title.style.display = 'none';
    this.el.hud.style.display = 'block';
  }

  showPause(show) { this.el.pause.style.display = show ? 'flex' : 'none'; }
  showDead(show) { this.el.dead.style.display = show ? 'flex' : 'none'; }
  showEndScreen() { this.el.end.style.display = 'flex'; }

  toast(text) {
    this.el.toast.textContent = text;
    this.el.toast.style.opacity = '1';
    this.toastTimer = 3.2;
  }

  dialogue(text) {
    this.el.dialogue.textContent = text;
    this.el.dialogue.style.opacity = '1';
    this.dialogueTimer = 6;
  }

  update(dt) {
    const w = this.world;
    const p = w.player;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.style.opacity = '0';
    }
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.el.dialogue.style.opacity = '0';
    }
    this.el.money.textContent = '$' + w.money.toLocaleString('en-US');
    const hp = Math.max(0, Math.round(p.health));
    this.el.healthFill.style.width = hp + '%';
    this.el.healthFill.style.background = hp > 50 ? '#22b573' : hp > 25 ? '#f2a007' : '#d21f3c';
    this.el.healthText.textContent = hp;
    const stars = '★'.repeat(w.police.wanted) + '☆'.repeat(5 - w.police.wanted);
    this.el.stars.textContent = stars;
    this.el.stars.style.color = w.police.wanted > 0 ? '#ffd21f' : '#ffffff88';
    this.el.objective.textContent = w.missions.finished
      ? 'TAMAT — terima kasih sudah bermain!'
      : '▶ ' + w.missions.objectiveText();
    const m = w.missions.current;
    this.el.timer.textContent = (m && m.timeLimit && !w.missions.finished)
      ? '⏱ ' + Math.max(0, Math.ceil(w.missions.timeLeft)) + ' dtk'
      : '';
    const inCar = !!p.inCar;
    this.el.speed.textContent = inCar ? Math.round(Math.abs(p.inCar.speed) * 3.6) + ' km/j' : '';
    this.el.crosshair.style.display = (!inCar && w.state === 'play') ? 'block' : 'none';
    this.el.hint.innerHTML = inCar
      ? 'W/S gas & rem &nbsp;·&nbsp; A/D belok &nbsp;·&nbsp; Spasi rem tangan &nbsp;·&nbsp; E keluar mobil &nbsp;·&nbsp; P jeda &nbsp;·&nbsp; M suara'
      : 'WASD jalan &nbsp;·&nbsp; Shift lari &nbsp;·&nbsp; E masuk mobil &nbsp;·&nbsp; Klik tembak &nbsp;·&nbsp; F pukul &nbsp;·&nbsp; P jeda &nbsp;·&nbsp; M suara';
    // Interact prompt when a stealable car is near.
    const near = !inCar && w.nearestStealableCar();
    this.el.interact.style.display = near ? 'block' : 'none';
    if (near) this.el.interact.textContent = near === w.missions.targetCar ? 'E — Curi mobil sport merah' : 'E — Masuk mobil';
    this.drawMinimap();
  }

  drawMinimap() {
    const w = this.world;
    const ctx = this.mapCtx;
    const S = 180, scale = S / 400, ox = S / 2, oz = S / 2;
    const X = (x) => ox + x * scale;
    const Z = (z) => oz + z * scale;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(10, 14, 24, 0.82)';
    ctx.fillRect(0, 0, S, S);
    // Sea.
    ctx.fillStyle = '#14486b';
    ctx.fillRect(0, Z(184), S, S - Z(184));
    // Streets.
    ctx.strokeStyle = '#8a8f9a';
    ctx.lineWidth = 5;
    for (const s of [-160, -120, -80, -40, 0, 40, 80, 120, 160]) {
      ctx.beginPath(); ctx.moveTo(X(s), 0); ctx.lineTo(X(s), S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, Z(s)); ctx.lineTo(S, Z(s)); ctx.stroke();
    }
    // Buildings as faint blocks.
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      ctx.fillRect(X(-140 + i * 40) - 11, Z(-140 + j * 40) - 11, 22, 22);
    }
    // Mission target: pulsing yellow diamond.
    const tp = w.missions.targetPos();
    if (tp && !w.missions.finished) {
      const pulse = 6 + Math.sin(performance.now() / 200) * 2;
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.moveTo(X(tp.x), Z(tp.z) - pulse);
      ctx.lineTo(X(tp.x) + pulse, Z(tp.z));
      ctx.lineTo(X(tp.x), Z(tp.z) + pulse);
      ctx.lineTo(X(tp.x) - pulse, Z(tp.z));
      ctx.fill();
    }
    // Police: blue dots.
    ctx.fillStyle = '#4da3ff';
    for (const c of w.police.cars) {
      ctx.beginPath(); ctx.arc(X(c.x), Z(c.z), 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Player: white arrow.
    const p = w.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const pz = p.inCar ? p.inCar.z : p.z;
    const heading = p.inCar ? p.inCar.heading : p.heading;
    ctx.save();
    ctx.translate(X(px), Z(pz));
    ctx.rotate(heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, S - 2, S - 2);
  }
}
