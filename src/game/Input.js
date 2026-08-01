export class Input {
  constructor() {
    this.keys = new Set();
    this.move = { x: 0, y: 0 };
    this.firePressed = false;
    this.fireHeld = false;
    this._stickActive = false;

    this.weaponHotkey = null;
    this.pausePressed = false;
    this.boostHeld = false;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        this.firePressed = true;
        this.fireHeld = true;
      }
      if (e.code === 'Digit1' || e.code === 'Numpad1') this.weaponHotkey = 'auto';
      if (e.code === 'Digit2' || e.code === 'Numpad2') this.weaponHotkey = 'zoom';
      if (e.code === 'Digit3' || e.code === 'Numpad3') this.weaponHotkey = 'scatter';
      if (e.code === 'Escape' || e.code === 'KeyP') this.pausePressed = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.boostHeld = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.fireHeld = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.boostHeld = false;
    });

    this._bindStick();
    const fireBtn = document.getElementById('btn-fire');
    if (fireBtn) {
      const down = (e) => {
        e.preventDefault();
        this.firePressed = true;
        this.fireHeld = true;
      };
      const up = () => {
        this.fireHeld = false;
      };
      fireBtn.addEventListener('pointerdown', down);
      fireBtn.addEventListener('pointerup', up);
      fireBtn.addEventListener('pointerleave', up);
    }
    const boostBtn = document.getElementById('btn-boost');
    if (boostBtn) {
      const down = (e) => {
        e.preventDefault();
        this.boostHeld = true;
      };
      const up = () => {
        this.boostHeld = false;
      };
      boostBtn.addEventListener('pointerdown', down);
      boostBtn.addEventListener('pointerup', up);
      boostBtn.addEventListener('pointerleave', up);
      boostBtn.addEventListener('pointercancel', up);
    }
  }

  _bindStick() {
    const zone = document.getElementById('stick-zone');
    const knob = document.getElementById('stick-knob');
    if (!zone || !knob) return;

    const max = 42;
    const update = (clientX, clientY) => {
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.move.x = dx / max;
      this.move.y = dy / max;
    };

    const end = () => {
      this._stickActive = false;
      this.move.x = 0;
      this.move.y = 0;
      knob.style.transform = 'translate(-50%, -50%)';
    };

    zone.addEventListener('pointerdown', (e) => {
      this._stickActive = true;
      zone.setPointerCapture(e.pointerId);
      update(e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', (e) => {
      if (!this._stickActive) return;
      update(e.clientX, e.clientY);
    });
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  getAxis() {
    let x = this.move.x;
    let y = this.move.y;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  consumeFire() {
    const v = this.firePressed;
    this.firePressed = false;
    return v || this.fireHeld;
  }

  consumeWeaponHotkey() {
    const mode = this.weaponHotkey;
    this.weaponHotkey = null;
    return mode;
  }

  consumePause() {
    const v = this.pausePressed;
    this.pausePressed = false;
    return v;
  }

  isBoosting() {
    return this.boostHeld || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }
}
