import { DINOSAURS, LEVELS, VEHICLES, hexCss } from './data.js';
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
      btn.innerHTML = `
        <div class="swatch" style="background:linear-gradient(135deg,${hexCss(level.colors.sky)},${hexCss(level.colors.ground)})"></div>
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

    VEHICLES.forEach((v) => {
      const unlocked = isVehicleUnlocked(v, clearedCount);
      // land missions: jeep/police; water: submarine
      const fit = level.water ? v.type === 'submarine' : v.type !== 'submarine';
      const card = document.createElement('button');
      card.className = `item-card${!unlocked || !fit ? ' locked' : ''}`;
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
    });
  }

  showGarage() {
    this.hideAll();
    this.$('screen-garage').classList.remove('hidden');
    const grid = this.$('vehicle-grid');
    grid.innerHTML = '';
    const clearedCount = this.game.save.cleared.length;
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
  }

  showStamps() {
    this.hideAll();
    this.$('screen-stamps').classList.remove('hidden');
    const stamps = this.game.save.stamps;
    this.$('stamp-count').textContent = `${stamps.length} stamps`;
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

  showResult({ win, message, stampName, stampColor }) {
    this.$('hud').classList.add('hidden');
    this.$('screen-result').classList.remove('hidden');
    this.$('result-title').textContent = win ? 'Rescue Complete!' : 'Mission Failed';
    this.$('result-msg').textContent = message;
    const stamp = this.$('result-stamp');
    if (win && stampName) {
      stamp.classList.remove('hidden');
      stamp.style.background = stampColor || '#3f9d5a';
      stamp.textContent = stampName;
    } else {
      stamp.classList.add('hidden');
    }
  }

  toast(msg) {
    const el = this.$('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), 1800);
  }
}
