import { CREW, DINOSAURS, LEVELS, VEHICLES, hexCss } from './data.js';
import { isVehicleUnlocked } from './Save.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.selectedPickVehicle = null;
    this.pendingLevel = null;

    this.$ = (id) => document.getElementById(id);
    this.bind();
  }

  bind() {
    this.$('btn-play').onclick = () => this.showHub();
    this.$('btn-garage').onclick = () => this.showGarage();
    this.$('btn-stamps').onclick = () => this.showStamps();
    this.$('btn-hub-back').onclick = () => this.showTitle();
    this.$('btn-garage-back').onclick = () => this.showTitle();
    this.$('btn-stamps-back').onclick = () => this.showTitle();
    this.$('btn-pick-back').onclick = () => this.showHub();
    this.$('btn-launch').onclick = () => {
      if (!this.pendingLevel || !this.selectedPickVehicle) return;
      this.game.startMission(this.pendingLevel, this.selectedPickVehicle);
    };
    this.$('btn-pause').onclick = () => this.game.pause();
    this.$('btn-resume').onclick = () => this.game.resume();
    this.$('btn-quit').onclick = () => this.game.quitToHub();
    this.$('btn-result-continue').onclick = () => this.showHub();
    this.$('btn-result-next')?.addEventListener('click', () => this.game.startNextMission());
    this.$('btn-mute').onclick = () => {
      const on = this.game.audio.toggle();
      this.$('btn-mute').textContent = on ? 'SND' : 'OFF';
      this.toast(on ? 'Sound on' : 'Sound muted');
    };

    document.querySelectorAll('#weapon-modes .mode').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('#weapon-modes .mode').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.game.setWeaponMode(btn.dataset.mode);
      };
    });
  }

  hideAll() {
    ['screen-title', 'screen-hub', 'screen-garage', 'screen-stamps', 'screen-vehicle-pick', 'screen-pause', 'screen-result', 'hud'].forEach(
      (id) => this.$(id).classList.add('hidden'),
    );
  }

  showTitle() {
    this.hideAll();
    this.$('screen-title').classList.remove('hidden');
    this.game.showTitleScene();
  }

  showHub() {
    this.hideAll();
    this.$('screen-hub').classList.remove('hidden');
    const save = this.game.save;
    this.$('hub-progress').textContent = `${save.cleared.length}/${LEVELS.length}`;
    const grid = this.$('level-grid');
    grid.innerHTML = '';
    LEVELS.forEach((level, i) => {
      const unlocked = i === 0 || save.cleared.includes(LEVELS[i - 1].id);
      const cleared = save.cleared.includes(level.id);
      const btn = document.createElement('button');
      btn.className = `level-card${cleared ? ' cleared' : ''}${unlocked ? '' : ' locked'}`;
      const badges = [
        level.water ? '<span class="lvl-badge water">SUB</span>' : '',
        level.boss ? '<span class="lvl-badge boss">BOSS</span>' : '',
        cleared ? '<span class="lvl-badge clear">✓</span>' : '',
      ].join('');
      btn.innerHTML = `
        <div class="swatch" style="background:linear-gradient(135deg,${hexCss(level.colors.sky)},${hexCss(level.colors.ground)})">${badges}</div>
        <h3>${i + 1}. ${level.name}</h3>
        <p>${unlocked ? level.desc : 'Clear previous mission to unlock'}</p>
      `;
      btn.onclick = () => {
        if (!unlocked) {
          this.toast('Complete the earlier mission first!');
          return;
        }
        this.openVehiclePick(level);
      };
      grid.appendChild(btn);
    });
    this.game.showHubScene();
  }

  openVehiclePick(level) {
    this.pendingLevel = level;
    this.selectedPickVehicle = null;
    this.hideAll();
    this.$('screen-vehicle-pick').classList.remove('hidden');
    this.$('pick-level-name').textContent = level.name;
    this.$('pick-level-desc').textContent = level.desc + (level.water ? ' (Water mission — pick a submarine!)' : '');
    const grid = this.$('pick-vehicle-grid');
    grid.innerHTML = '';
    const clearedCount = this.game.save.cleared.length;
    const launch = this.$('btn-launch');
    launch.disabled = true;

    let firstFit = null;
    VEHICLES.forEach((v) => {
      const unlocked = isVehicleUnlocked(v, clearedCount);
      // land missions: jeep/police; water: submarine
      const fit = level.water ? v.type === 'submarine' : v.type !== 'submarine';
      const card = document.createElement('button');
      card.className = `item-card${!unlocked || !fit ? ' locked' : ''}`;
      card.dataset.vid = v.id;
      card.innerHTML = `
        <div class="dino-swatch" style="background:linear-gradient(135deg,${hexCss(v.color)},${hexCss(v.accent)})"></div>
        <h3>${v.name}</h3>
        <p>${!unlocked ? `Unlock at ${v.unlockAt} clears` : !fit ? (level.water ? 'Needs submarine' : 'Land vehicle only') : v.desc}</p>
      `;
      card.onclick = () => {
        if (!unlocked || !fit) {
          this.toast(!unlocked ? 'Vehicle locked!' : 'Wrong vehicle type for this biome');
          return;
        }
        grid.querySelectorAll('.item-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedPickVehicle = v.id;
        this.game.save.selectedVehicle = v.id;
        launch.disabled = false;
      };
      grid.appendChild(card);
      if (!firstFit && unlocked && fit) firstFit = card;
    });
    // Auto-select first usable vehicle (or last selected if still valid)
    const preferred =
      grid.querySelector(`.item-card[data-vid="${this.game.save.selectedVehicle}"]:not(.locked)`) || firstFit;
    if (preferred) preferred.click();
  }

  showGarage() {
    this.hideAll();
    this.$('screen-garage').classList.remove('hidden');
    const grid = this.$('vehicle-grid');
    grid.innerHTML = '';
    const clearedCount = this.game.save.cleared.length;
    const police = VEHICLES.filter((v) => v.type === 'police').length;
    const subs = VEHICLES.filter((v) => v.type === 'submarine').length;
    VEHICLES.forEach((v) => {
      const unlocked = isVehicleUnlocked(v, clearedCount);
      const card = document.createElement('button');
      card.className = `item-card${unlocked ? '' : ' locked'}${this.game.save.selectedVehicle === v.id ? ' selected' : ''}`;
      card.innerHTML = `
        <div class="dino-swatch" style="background:linear-gradient(135deg,${hexCss(v.color)},${hexCss(v.accent)})"></div>
        <h3>${v.name}</h3>
        <p>${unlocked ? `${v.type} · spd ${v.speed} · armor ${v.armor}` : `Locked · clear ${v.unlockAt} missions`}</p>
      `;
      card.onclick = () => {
        if (!unlocked) return this.toast('Keep rescuing to unlock!');
        this.game.save.selectedVehicle = v.id;
        this.showGarage();
        this.toast(`${v.name} ready!`);
      };
      grid.appendChild(card);
    });
    let crewNote = this.$('crew-note');
    if (!crewNote) {
      crewNote = document.createElement('p');
      crewNote.id = 'crew-note';
      crewNote.className = 'muted';
      grid.parentElement.appendChild(crewNote);
    }
    crewNote.textContent = `Fleet: ${police} police cars · ${subs} submarines · Crew: ${CREW.map((c) => c.name).join(', ')}`;
  }

  showStamps() {
    this.hideAll();
    this.$('screen-stamps').classList.remove('hidden');
    const stamps = this.game.save.stamps;
    const total = Object.keys(DINOSAURS).length;
    const pct = Math.round((stamps.length / Math.max(1, total)) * 100);
    this.$('stamp-count').textContent = `${stamps.length}/${total} stamps`;
    const bar = this.$('master-bar');
    const pctEl = this.$('master-pct');
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, stamps.length / total))})`;
    if (pctEl) pctEl.textContent = `${pct}% · ${pct >= 100 ? 'Dinosaur Master!' : 'Collect stamps'}`;
    const grid = this.$('stamp-grid');
    grid.innerHTML = '';
    Object.values(DINOSAURS).forEach((d) => {
      const have = stamps.includes(d.id);
      const card = document.createElement('div');
      card.className = `item-card${have ? '' : ' locked'}`;
      card.innerHTML = `
        <div class="dino-swatch" style="background:linear-gradient(135deg,${hexCss(d.color)},${hexCss(d.accent)});opacity:${have ? 1 : 0.35}"></div>
        <h3>${have ? d.name : '???'}</h3>
        <p>${have ? d.facts : 'Rescue to collect this stamp'}</p>
      `;
      grid.appendChild(card);
    });
  }

  showHud(missionText) {
    this.hideAll();
    this.$('hud').classList.remove('hidden');
    this.$('mission-text').textContent = missionText;
    this.$('score').textContent = String(this.game.missionScore || 0);
    this.updateHp(1);
  }

  updateHp(ratio) {
    this.$('hp-bar').style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  }

  updateScore(n) {
    this.$('score').textContent = String(n);
  }

  setMission(text) {
    this.$('mission-text').textContent = text;
  }

  showAim(show) {
    this.$('aim-hint').classList.toggle('hidden', !show);
  }

  showPause() {
    this.$('screen-pause').classList.remove('hidden');
  }

  hidePause() {
    this.$('screen-pause').classList.add('hidden');
  }

  showResult({ win, message, stampName, stampColor, fact, stars = 0, unlockText = '', hasNext = false }) {
    this.$('hud').classList.add('hidden');
    this.$('nest-compass')?.classList.add('hidden');
    this.hideCountdown();
    this.hideCrewCallout();
    this.setAlarmRing(false);
    this.$('screen-result').classList.remove('hidden');
    this.$('result-title').textContent = win ? 'Rescue Complete!' : 'Mission Failed';
    this.$('result-msg').textContent = message;
    const starsEl = this.$('result-stars');
    if (starsEl) {
      if (win && stars > 0) {
        starsEl.classList.remove('hidden');
        starsEl.querySelectorAll('[data-star]').forEach((s) => {
          s.classList.toggle('lit', Number(s.dataset.star) <= stars);
        });
      } else {
        starsEl.classList.add('hidden');
      }
    }
    const factEl = this.$('result-fact');
    if (win && fact) {
      factEl.textContent = fact;
      factEl.classList.remove('hidden');
    } else {
      factEl.classList.add('hidden');
    }
    const stamp = this.$('result-stamp');
    if (win && stampName) {
      stamp.classList.remove('hidden', 'stamp-pop');
      stamp.style.background = stampColor || '#3f9d5a';
      stamp.textContent = stampName;
      void stamp.offsetWidth;
      stamp.classList.add('stamp-pop');
    } else {
      stamp.classList.add('hidden');
    }
    const unlockEl = this.$('result-unlock');
    if (unlockEl) {
      if (win && unlockText) {
        unlockEl.textContent = unlockText;
        unlockEl.classList.remove('hidden');
      } else {
        unlockEl.classList.add('hidden');
      }
    }
    const nextBtn = this.$('btn-result-next');
    if (nextBtn) {
      nextBtn.classList.toggle('hidden', !(win && hasNext));
    }
    const cont = this.$('btn-result-continue');
    if (cont) cont.className = win && hasNext ? 'btn' : 'btn primary';
  }

  updateNestCompass(show, angleRad = 0) {
    const el = this.$('nest-compass');
    if (!el) return;
    el.classList.toggle('hidden', !show);
    const arrow = this.$('compass-arrow');
    if (arrow) arrow.style.transform = `rotate(${angleRad}rad)`;
  }

  setWeaponModeUI(mode) {
    document.querySelectorAll('#weapon-modes .mode').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
  }

  showTutorial(text, ms = 4200) {
    const tip = this.$('tutorial-tip');
    if (!tip) return;
    tip.textContent = text;
    tip.classList.remove('hidden');
    clearTimeout(this._tutorialTimer);
    this._tutorialTimer = setTimeout(() => tip.classList.add('hidden'), ms);
  }

  setDanger(show) {
    this.$('danger-banner')?.classList.toggle('hidden', !show);
  }

  setHeadbuttAlarm(on) {
    this.$('hud')?.classList.toggle('headbutt-alarm', !!on);
  }

  setAlarmRing(on) {
    this.$('alarm-ring')?.classList.toggle('hidden', !on);
    this.$('hud')?.classList.toggle('alarm-active', !!on);
  }

  showCountdown(text) {
    const el = this.$('mission-countdown');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden', 'pop');
    // Retrigger CSS pop
    void el.offsetWidth;
    el.classList.add('pop');
  }

  hideCountdown() {
    this.$('mission-countdown')?.classList.add('hidden');
  }

  crewCallout(name, text, ms = 2800) {
    const el = this.$('crew-callout');
    if (!el) return;
    this.$('crew-callout-name').textContent = name;
    this.$('crew-callout-text').textContent = text;
    el.classList.remove('hidden');
    clearTimeout(this._crewTimer);
    this._crewTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }

  hideCrewCallout() {
    this.$('crew-callout')?.classList.add('hidden');
  }

  toast(msg) {
    const el = this.$('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), 1800);
  }
}
