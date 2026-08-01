import { CREW, DINOSAURS, LEVELS, VEHICLES, hexCss, dinoHabitat } from './data.js';
import { isVehicleUnlocked } from './Save.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.selectedPickVehicle = null;
    this.pendingLevel = null;
    this.stampFilter = 'all';

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
    this.$('btn-restart')?.addEventListener('click', () => this.game.restartMission());
    this.$('btn-quit').onclick = () => this.game.quitToHub();
    this.$('btn-result-continue').onclick = () => this.showHub();
    this.$('btn-result-next')?.addEventListener('click', () => this.game.startNextMission());
    this.$('btn-result-retry')?.addEventListener('click', () => this.game.restartMission());
    this.$('btn-mute').onclick = () => {
      const on = this.game.audio.toggle();
      this.$('btn-mute').textContent = on ? 'VOL' : 'OFF';
      this.toast(on ? 'Sound on' : 'Sound muted');
    };
    this.$('btn-skip-countdown')?.addEventListener('click', () => this.game.skipCountdown());
    this.$('btn-stamp-detail-close')?.addEventListener('click', () => this.hideStampDetail());
    document.querySelectorAll('#stamp-filters .stamp-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stampFilter = btn.dataset.filter || 'all';
        document.querySelectorAll('#stamp-filters .stamp-filter').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        this.showStamps();
      });
    });

    document.querySelectorAll('#weapon-modes .mode').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('#weapon-modes .mode').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.game.setWeaponMode(btn.dataset.mode);
      };
    });
  }

  hideAll() {
    [
      'screen-title',
      'screen-hub',
      'screen-garage',
      'screen-stamps',
      'screen-vehicle-pick',
      'screen-pause',
      'screen-result',
      'stamp-detail',
      'hud',
    ].forEach((id) => this.$(id)?.classList.add('hidden'));
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
    const rescuedEl = this.$('hub-rescued');
    if (rescuedEl) {
      const n = save.cleared?.length || 0;
      rescuedEl.textContent = `Saved ${n}`;
      rescuedEl.title = `${n} baby dinosaur${n === 1 ? '' : 's'} rescued`;
    }
    const grid = this.$('level-grid');
    grid.innerHTML = '';
    // Highlight the next unlocked uncleared mission (kids' "play here" cue)
    const nextIdx = LEVELS.findIndex(
      (level, i) =>
        !save.cleared.includes(level.id) && (i === 0 || save.cleared.includes(LEVELS[i - 1].id)),
    );
    LEVELS.forEach((level, i) => {
      const unlocked = i === 0 || save.cleared.includes(LEVELS[i - 1].id);
      const cleared = save.cleared.includes(level.id);
      const nextUp = i === nextIdx;
      const btn = document.createElement('button');
      btn.className = `level-card${cleared ? ' cleared' : ''}${unlocked ? '' : ' locked'}${nextUp ? ' next-up' : ''}`;
      const best = save.bestStars?.[level.id] || 0;
      const babyName = DINOSAURS[level.baby]?.name?.replace(/^Baby\s+/, '') || 'Dino';
      const predName = DINOSAURS[level.predator]?.name || 'Predator';
      const badges = [
        nextUp ? '<span class="lvl-badge next">NEXT</span>' : '',
        level.water ? '<span class="lvl-badge water">SUB</span>' : '',
        level.boss ? '<span class="lvl-badge boss">BOSS</span>' : '',
        cleared ? '<span class="lvl-badge clear">✓</span>' : '',
      ].join('');
      const starRow =
        best > 0
          ? `<div class="lvl-stars" aria-label="${best} stars">${'★'.repeat(best)}${'☆'.repeat(3 - best)}</div>`
          : '<div class="lvl-stars empty">☆☆☆</div>';
      const medal = cleared
        ? `<div class="biome-medal" aria-label="Biome cleared medal"><i></i><span>CLEARED</span></div>`
        : '';
      btn.innerHTML = `
        <div class="swatch" style="background:linear-gradient(135deg,${hexCss(level.colors.sky)},${hexCss(level.colors.ground)})">${badges}${medal}</div>
        <h3>${i + 1}. ${level.name}</h3>
        ${starRow}
        <p class="lvl-roster">${unlocked ? `Save ${babyName} · stop ${predName}` : 'Clear previous mission to unlock'}</p>
        <p>${unlocked ? level.desc : ''}</p>
      `;
      btn.onclick = () => {
        if (!unlocked) {
          this.toast('Complete the earlier mission first!');
          // Locked padlock shake — kids get clear locked feedback
          btn.classList.remove('padlock-shake');
          void btn.offsetWidth;
          btn.classList.add('padlock-shake');
          this.game.audio.ui?.();
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
    const baby = DINOSAURS[level.baby];
    const predator = DINOSAURS[level.predator];
    const factEl = this.$('pick-level-fact');
    if (factEl) {
      factEl.textContent = baby
        ? `Learn: ${baby.name} — ${baby.facts}`
        : 'Protect the baby dinosaur and escort them home!';
    }
    // Animated baby vs predator silhouette briefing
    const silBaby = this.$('pick-sil-baby');
    const silPred = this.$('pick-sil-predator');
    if (silBaby) {
      silBaby.style.background = `linear-gradient(160deg, ${hexCss(baby?.color || 0x8be09a)}, ${hexCss(baby?.accent || 0xfff3a0)})`;
      silBaby.title = baby?.name || 'Baby';
      silBaby.classList.remove('sil-hop');
      void silBaby.offsetWidth;
      silBaby.classList.add('sil-hop');
    }
    if (silPred) {
      silPred.style.background = `linear-gradient(160deg, ${hexCss(predator?.color || 0xc45c26)}, ${hexCss(predator?.accent || 0x8b2e14)})`;
      silPred.title = predator?.name || 'Predator';
      silPred.classList.remove('sil-lunge');
      void silPred.offsetWidth;
      silPred.classList.add('sil-lunge');
    }
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
        this.game.showGaragePreview(v.id);
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
    // 3D turntable preview of selected / first unlocked vehicle
    const previewId =
      this.game.save.selectedVehicle ||
      VEHICLES.find((v) => isVehicleUnlocked(v, clearedCount))?.id ||
      VEHICLES[0].id;
    this.game.showGaragePreview(previewId);
  }

  showStamps() {
    this.hideAll();
    const screen = this.$('screen-stamps');
    screen.classList.remove('hidden');
    // Stamp book page-flip animation on open
    const panel = screen.querySelector('.stamp-book-panel');
    if (panel) {
      panel.classList.remove('page-flip');
      void panel.offsetWidth;
      panel.classList.add('page-flip');
    }
    this.game.audio.pageFlip?.();
    const stamps = this.game.save.stamps;
    const total = Object.keys(DINOSAURS).length;
    const pct = Math.round((stamps.length / Math.max(1, total)) * 100);
    this.$('stamp-count').textContent = `${stamps.length}/${total} stamps`;
    const bar = this.$('master-bar');
    const pctEl = this.$('master-pct');
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, stamps.length / total))})`;
    if (pctEl) pctEl.textContent = `${pct}% · ${pct >= 100 ? 'Dinosaur Master!' : 'Collect stamps'}`;
    // Collection progress tip (store: compete with friends on stamp progress)
    const meter = this.$('master-meter');
    if (meter && !meter.dataset.tipBound) {
      meter.dataset.tipBound = '1';
      meter.title = 'Tap to share your Dinosaur Master progress';
      meter.style.cursor = 'pointer';
      meter.addEventListener('click', () => {
        const s = this.game.save.stamps.length;
        const t = Object.keys(DINOSAURS).length;
        const p = Math.round((s / Math.max(1, t)) * 100);
        const line = `I'm ${p}% Dinosaur Master (${s}/${t} stamps) in Dinosaur Guard 2!`;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(line).then(
            () => this.toast('Progress copied — share with a friend!'),
            () => this.toast(line),
          );
        } else {
          this.toast(line);
        }
      });
    }
    // Friends compare card — compete on stamp collection progress
    this._renderFriendsCompare(stamps.length, total, pct);
    const filter = this.stampFilter || 'all';
    document.querySelectorAll('#stamp-filters .stamp-filter').forEach((b) => {
      b.classList.toggle('active', (b.dataset.filter || 'all') === filter);
    });
    const grid = this.$('stamp-grid');
    grid.innerHTML = '';
    Object.values(DINOSAURS).forEach((d) => {
      const habitat = dinoHabitat(d);
      if (filter !== 'all' && habitat !== filter) return;
      const have = stamps.includes(d.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `item-card stamp-card${have ? '' : ' locked'}`;
      card.dataset.habitat = habitat;
      card.innerHTML = `
        <div class="dino-swatch" style="background:linear-gradient(135deg,${hexCss(d.color)},${hexCss(d.accent)});opacity:${have ? 1 : 0.35}"></div>
        <h3>${have ? d.name : '???'}</h3>
        <p>${have ? d.facts : 'Rescue to collect this stamp'}</p>
        <span class="habitat-chip">${habitat}</span>
      `;
      card.onclick = () => {
        if (!have) {
          this.toast('Rescue this dinosaur to unlock the stamp!');
          return;
        }
        this.showStampDetail(d);
      };
      grid.appendChild(card);
    });
  }

  showStampDetail(d) {
    const overlay = this.$('stamp-detail');
    if (!overlay) return;
    this.$('stamp-detail-name').textContent = d.name;
    this.$('stamp-detail-role').textContent = (d.role || 'dinosaur').toUpperCase();
    this.$('stamp-detail-fact').textContent = d.facts;
    const swatch = this.$('stamp-detail-swatch');
    if (swatch) {
      swatch.style.background = `linear-gradient(135deg,${hexCss(d.color)},${hexCss(d.accent)})`;
    }
    overlay.classList.remove('hidden');
  }

  hideStampDetail() {
    this.$('stamp-detail')?.classList.add('hidden');
  }

  showHud(missionText) {
    this.hideAll();
    this.$('hud').classList.remove('hidden');
    this.$('mission-text').textContent = missionText;
    this.$('score').textContent = String(this.game.missionScore || 0);
    this.updateHp(1);
    this.flashRoar(false);
    this.hidePaleoTip();
  }

  /** Chase-start roar screen flash */
  flashRoar(on) {
    const el = this.$('roar-flash');
    if (!el) return;
    el.classList.toggle('hidden', !on);
    el.classList.toggle('on', !!on);
  }

  /** Guard radio chatter strip during phase changes */
  showRadioChatter(line) {
    const el = this.$('radio-chatter');
    if (!el) return;
    el.innerHTML = `<strong>RADIO</strong><span>${line}</span>`;
    el.classList.remove('hidden');
    clearTimeout(this._radioTimer);
    this._radioTimer = setTimeout(() => el.classList.add('hidden'), 2800);
  }

  /** Perfect rescue / milestone achievement burst */
  showAchievementToast(title, detail = '') {
    const el = this.$('achievement-toast');
    if (!el) {
      this.toast(title);
      return;
    }
    el.innerHTML = `<strong>${title}</strong>${detail ? `<span>${detail}</span>` : ''}`;
    el.classList.remove('hidden');
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    clearTimeout(this._achieveTimer);
    this._achieveTimer = setTimeout(() => el.classList.add('hidden'), 4200);
  }

  /** In-mission paleontology educational tip */
  showPaleoTip(text) {
    const el = this.$('paleo-tip');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(this._paleoTipTimer);
    this._paleoTipTimer = setTimeout(() => this.hidePaleoTip(), 5200);
  }

  hidePaleoTip() {
    this.$('paleo-tip')?.classList.add('hidden');
  }

  /** Friends compete card for stamp collection progress */
  _renderFriendsCompare(have, total, pct) {
    let card = this.$('friends-compare');
    const host = this.$('screen-stamps')?.querySelector('.panel');
    if (!host) return;
    if (!card) {
      card = document.createElement('div');
      card.id = 'friends-compare';
      card.className = 'friends-compare';
      card.setAttribute('aria-label', 'Compete with friends on stamp progress');
      const meter = this.$('master-meter');
      if (meter?.nextSibling) host.insertBefore(card, meter.nextSibling);
      else host.appendChild(card);
    }
    // Friendly rival targets so kids can “race” collection progress
    const rivalA = Math.min(total, Math.max(have + 2, Math.round(total * 0.35)));
    const rivalB = Math.min(total, Math.max(3, Math.round(total * 0.55)));
    const youLead = have >= rivalA;
    card.innerHTML = `
      <div class="friends-head">
        <strong>Compete with Friends</strong>
        <button type="button" class="btn small" id="btn-share-stamps">Share</button>
      </div>
      <div class="friends-rows">
        <div class="friend-row you">
          <span>You</span>
          <div class="friend-bar"><i style="transform:scaleX(${have / Math.max(1, total)})"></i></div>
          <em>${have}/${total}</em>
        </div>
        <div class="friend-row">
          <span>Mina</span>
          <div class="friend-bar"><i style="transform:scaleX(${rivalA / Math.max(1, total)})"></i></div>
          <em>${rivalA}/${total}</em>
        </div>
        <div class="friend-row">
          <span>Kai</span>
          <div class="friend-bar"><i style="transform:scaleX(${rivalB / Math.max(1, total)})"></i></div>
          <em>${rivalB}/${total}</em>
        </div>
      </div>
      <p class="friends-note">${youLead ? `You're ahead of Mina at ${pct}% — keep collecting!` : `Catch Mina — ${rivalA - have} more stamps to pull ahead!`}</p>
    `;
    const shareBtn = card.querySelector('#btn-share-stamps');
    if (shareBtn) {
      shareBtn.onclick = () => {
        const line = `I'm ${pct}% Dinosaur Master (${have}/${total} stamps) in Dinosaur Guard 2 — can you beat me?`;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(line).then(
            () => this.toast('Challenge copied — send it to a friend!'),
            () => this.toast(line),
          );
        } else {
          this.toast(line);
        }
      };
    }
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

  showResult({
    win,
    message,
    stampName,
    stampColor,
    fact,
    stars = 0,
    perfect = false,
    unlockText = '',
    hasNext = false,
    timeText = '',
  }) {
    this.$('hud').classList.add('hidden');
    this.$('nest-compass')?.classList.add('hidden');
    this.setCombo(0);
    this.setHpVignette(0);
    this.setAimLock(false);
    this.setRadarDanger(false);
    this.hideCountdown();
    this.hideCrewCallout();
    this.showCrewIntro(false);
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
    const perfectEl = this.$('result-perfect');
    if (perfectEl) {
      perfectEl.classList.toggle('hidden', !(win && perfect));
    }
    const timeEl = this.$('result-time');
    if (timeEl) {
      if (timeText) {
        timeEl.textContent = timeText;
        timeEl.classList.remove('hidden');
      } else {
        timeEl.classList.add('hidden');
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
      stamp.classList.remove('hidden', 'stamp-pop', 'stamp-fanfare', 'ink-splash');
      stamp.style.background = stampColor || '#3f9d5a';
      stamp.textContent = stampName;
      void stamp.offsetWidth;
      stamp.classList.add('stamp-pop', 'stamp-fanfare', 'ink-splash');
      this.game.audio.inkStamp?.();
    } else {
      stamp.classList.add('hidden');
      stamp.classList.remove('ink-splash');
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
    const retryBtn = this.$('btn-result-retry');
    if (retryBtn) {
      retryBtn.classList.toggle('hidden', !!win);
    }
    const cont = this.$('btn-result-continue');
    if (cont) cont.className = win && hasNext ? 'btn' : win ? 'btn primary' : 'btn';
  }

  updateMissionClock(secs = 0) {
    const el = this.$('mission-clock');
    if (!el) return;
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    el.textContent = `${mins}:${String(rem).padStart(2, '0')}`;
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

  setCombo(n) {
    const el = this.$('combo-hud');
    if (!el) return;
    if (n >= 2) {
      el.classList.remove('hidden');
      const count = this.$('combo-count');
      if (count) count.textContent = `x${n}`;
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    } else {
      el.classList.add('hidden');
      el.classList.remove('combo-milestone');
    }
  }

  /** Bigger combo HUD pop on x5 / x10 milestones */
  flashComboMilestone(n) {
    const el = this.$('combo-hud');
    if (!el) return;
    el.classList.remove('hidden', 'combo-milestone');
    void el.offsetWidth;
    el.classList.add('combo-milestone');
    const count = this.$('combo-count');
    if (count) count.textContent = `x${n}`;
    clearTimeout(this._comboMilestoneTimer);
    this._comboMilestoneTimer = setTimeout(() => el.classList.remove('combo-milestone'), 900);
  }

  setHpVignette(amount) {
    const el = this.$('hp-vignette');
    if (!el) return;
    const a = Math.max(0, Math.min(1, amount));
    el.style.opacity = String(a * 0.85);
    el.classList.toggle('critical', a > 0.55);
  }

  showSkipCountdown(show) {
    this.$('btn-skip-countdown')?.classList.toggle('hidden', !show);
  }

  setPhaseRibbon(show, text = '', kind = '') {
    const el = this.$('phase-ribbon');
    if (!el) return;
    el.classList.toggle('hidden', !show);
    el.classList.remove('chase', 'combat', 'mother', 'escort', 'headbutt');
    if (kind) el.classList.add(kind);
    if (text) el.textContent = text;
  }

  updateBabyHp(ratio, critical = false) {
    const bar = this.$('baby-bar');
    const hud = this.$('baby-hud');
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
    hud?.classList.toggle('critical', !!critical);
  }

  setAimLock(show, x = 0, y = 0, zoom = false) {
    const el = this.$('aim-lock');
    if (!el) return;
    el.classList.toggle('hidden', !show);
    el.classList.toggle('zoom', !!zoom);
    if (show) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }

  setRadarDanger(on) {
    this.$('mini-map')?.classList.toggle('danger-pulse', !!on);
  }

  showCrewIntro(show, names = '') {
    const el = this.$('crew-intro');
    if (!el) return;
    el.classList.toggle('hidden', !show);
    const nameEl = this.$('crew-intro-names');
    if (nameEl && names) nameEl.textContent = names;
  }

  setBoostHud(active, fuel = 1) {
    const btn = this.$('btn-boost');
    if (!btn) return;
    btn.classList.toggle('active', !!active);
    btn.style.setProperty('--boost-fuel', String(Math.max(0, Math.min(1, fuel))));
  }

  setSosBanner(show) {
    this.$('sos-banner')?.classList.toggle('hidden', !show);
  }

  setSonarHud(show) {
    this.$('sonar-hud')?.classList.toggle('hidden', !show);
  }

  pulseSonarHud() {
    const el = this.$('sonar-hud');
    if (!el || el.classList.contains('hidden')) return;
    el.classList.remove('ping');
    void el.offsetWidth;
    el.classList.add('ping');
  }

  setZoomScope(show) {
    this.$('zoom-scope')?.classList.toggle('hidden', !show);
  }

  setDepthGauge(show, norm = 0.35) {
    const el = this.$('depth-gauge');
    if (!el) return;
    el.classList.toggle('hidden', !show);
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (!show) return;
    const bar = this.$('depth-bar');
    const val = this.$('depth-value');
    const clamped = Math.max(0.08, Math.min(1, norm));
    if (bar) bar.style.transform = `scaleY(${clamped})`;
    if (val) val.textContent = `${Math.round(8 + clamped * 42)}m`;
  }
}
