const KEY = 'dino-guard-2-save-v1';

const defaultSave = () => ({
  cleared: [],
  stamps: [],
  selectedVehicle: 'jeep_scout',
  score: 0,
});

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
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
