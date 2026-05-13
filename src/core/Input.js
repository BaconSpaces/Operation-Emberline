export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouseButtons = new Set();
    this.mousePressed = new Set();
    this.target = target;
    this.enabled = true;

    target.addEventListener("keydown", (event) => {
      if (!this.enabled) return;
      const key = this.normalizeKey(event);
      if (!this.keys.has(key)) {
        this.pressed.add(key);
      }
      this.keys.add(key);
    });

    target.addEventListener("keyup", (event) => {
      const key = this.normalizeKey(event);
      this.keys.delete(key);
      this.released.add(key);
    });

    target.addEventListener("mousedown", (event) => {
      if (!this.enabled) return;
      this.pressMouse(event.button);
    });

    target.addEventListener("mouseup", (event) => {
      this.releaseMouse(event.button);
    });

    target.addEventListener("pointerdown", (event) => {
      if (!this.enabled) return;
      this.pressMouse(0);
    });

    target.addEventListener("pointerup", () => {
      this.releaseMouse(0);
    });

    target.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  pressMouse(button = 0) {
    this.mouseButtons.add(button);
    this.mousePressed.add(button);
  }

  releaseMouse(button = 0) {
    this.mouseButtons.delete(button);
  }

  normalizeKey(event) {
    if (event.code?.startsWith("Digit")) {
      return event.code.replace("Digit", "");
    }
    if (event.code === "Backquote") {
      return "`";
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      return "shift";
    }
    if (event.code === "ControlLeft" || event.code === "ControlRight") {
      return "control";
    }
    if (event.code === "Space") {
      return "space";
    }
    return event.key.toLowerCase();
  }

  isDown(key) {
    return this.keys.has(key);
  }

  wasPressed(key) {
    return this.pressed.has(key);
  }

  wasReleased(key) {
    return this.released.has(key);
  }

  isMouseDown(button = 0) {
    return this.mouseButtons.has(button);
  }

  wasMousePressed(button = 0) {
    return this.mousePressed.has(button);
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mousePressed.clear();
  }
}
