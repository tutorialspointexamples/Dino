const KEY = 'dino-guard-2-save-v2';

const defaultSave = () => ({
  cleared: [],
  stamps: [],
  selectedVehicle: 'police_scout',
  score: 0,
  bestStars: {},
});

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const data = { ...defaultSave(), ...JSON.parse(raw) };
    if (!data.bestStars || typeof data.bestStars !== 'object') data.bestStars = {};
    return data;
  } catch {
    return defaultSave();
  }
}

export function writeSave(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function isVehicleUnlocked(vehicle, clearedCount) {
  if (vehicle.unlocked) return true;
  return clearedCount >= (vehicle.unlockAt || 99);
}

export function markCleared(save, levelId, stampId, points) {
  if (!save.cleared.includes(levelId)) save.cleared.push(levelId);
  if (stampId && !save.stamps.includes(stampId)) save.stamps.push(stampId);
  save.score += points;
  writeSave(save);
  return save;
}

/** Persist best star rating per level (1–3). */
export function recordBestStars(save, levelId, stars) {
  if (!save.bestStars) save.bestStars = {};
  const prev = save.bestStars[levelId] || 0;
  if (stars > prev) {
    save.bestStars[levelId] = stars;
    writeSave(save);
  }
  return save.bestStars[levelId] || 0;
}
