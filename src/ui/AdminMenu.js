import { GAME_CONFIG } from "../core/config.js";

export class AdminMenu {
  constructor(root, state, systems) {
    this.root = root;
    this.state = state;
    this.systems = systems;
    this.activeTab = "player";
    this.build();
    this.bindKeys();
  }

  build() {
    this.button = document.createElement("button");
    this.button.className = "admin-toggle";
    this.button.textContent = "Admin";
    this.button.type = "button";
    this.button.addEventListener("click", () => this.toggle());
    this.root.appendChild(this.button);

    this.panel = document.createElement("aside");
    this.panel.className = "admin-panel";
    this.root.appendChild(this.panel);
    this.render();
  }

  bindKeys() {
    window.addEventListener("keydown", (event) => {
      if (event.code === "Backquote") {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  toggle(force = null) {
    if (!GAME_CONFIG.isAdmin) return;
    this.state.admin.open = force === null ? !this.state.admin.open : force;
    if (this.state.admin.open) {
      this.systems.player.unlock();
    }
    this.render();
  }

  render() {
    this.button.classList.toggle("hidden", !GAME_CONFIG.isAdmin);
    this.panel.classList.toggle("open", this.state.admin.open);
    if (!GAME_CONFIG.isAdmin) {
      this.panel.innerHTML = "";
      return;
    }

    this.panel.innerHTML = `
      <header class="admin-header">
        <div>
          <strong>Admin Console</strong>
          <span>Development build</span>
        </div>
        <button type="button" data-action="close" aria-label="Close admin">x</button>
      </header>
      <nav class="admin-tabs">
        ${this.tabButton("player", "Player")}
        ${this.tabButton("weapons", "Weapons")}
        ${this.tabButton("bots", "Bots")}
        ${this.tabButton("match", "Match")}
        ${this.tabButton("debug", "Debug")}
      </nav>
      <div class="admin-content">${this.renderTab()}</div>
    `;

    this.panel.querySelector('[data-action="close"]').addEventListener("click", () => this.toggle(false));
    this.panel.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        this.activeTab = button.dataset.tab;
        this.render();
      });
    });
    this.bindCurrentTab();
  }

  tabButton(id, label) {
    return `<button type="button" data-tab="${id}" class="${this.activeTab === id ? "active" : ""}">${label}</button>`;
  }

  renderTab() {
    if (this.activeTab === "weapons") return this.renderWeapons();
    if (this.activeTab === "bots") return this.renderBots();
    if (this.activeTab === "match") return this.renderMatch();
    if (this.activeTab === "debug") return this.renderDebug();
    return this.renderPlayer();
  }

  renderPlayer() {
    const player = this.state.player;
    return `
      <div class="admin-grid">
        ${this.toggleRow("godMode", "God mode", player.godMode)}
        ${this.toggleRow("noClip", "No-clip", player.noClip)}
        <label>
          <span>Speed</span>
          <input data-control="speed" type="range" min="0.4" max="3" step="0.05" value="${player.speedMultiplier}">
          <output>${player.speedMultiplier.toFixed(2)}x</output>
        </label>
        <label>
          <span>Gravity</span>
          <input data-control="gravity" type="range" min="4" max="42" step="1" value="${GAME_CONFIG.gravity}">
          <output>${GAME_CONFIG.gravity}</output>
        </label>
        <label>
          <span>Teleport</span>
          <select data-control="teleport">
            ${GAME_CONFIG.teleportPoints
              .map((point) => `<option value="${point.id}" ${this.state.admin.selectedTeleport === point.id ? "selected" : ""}>${point.label}</option>`)
              .join("")}
          </select>
        </label>
      </div>
      <div class="admin-actions">
        <button type="button" data-action="heal">Heal</button>
        <button type="button" data-action="ammo">Give ammo</button>
        <button type="button" data-action="teleport">Teleport</button>
      </div>
    `;
  }

  renderWeapons() {
    const active = this.systems.weapons.currentWeapon;
    return `
      <div class="admin-grid">
        <label>
          <span>Weapon</span>
          <select data-control="weapon">
            ${this.state.weapons
              .map((weapon) => `<option value="${weapon.id}" ${weapon.id === active.id ? "selected" : ""}>${weapon.name}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          <span>Damage</span>
          <input data-tune="damage" type="range" min="4" max="140" step="1" value="${active.damage}">
          <output>${active.damage}</output>
        </label>
        <label>
          <span>Fire delay</span>
          <input data-tune="fireRate" type="range" min="70" max="1100" step="10" value="${active.fireRate}">
          <output>${active.fireRate} ms</output>
        </label>
        <label>
          <span>Recoil</span>
          <input data-tune="recoil" type="range" min="0" max="0.09" step="0.001" value="${active.recoil}">
          <output>${active.recoil.toFixed(3)}</output>
        </label>
      </div>
      <div class="admin-actions">
        <button type="button" data-action="switchWeapon">Equip</button>
        <button type="button" data-action="unlock">Unlock all</button>
        <button type="button" data-action="ammo">Fill ammo</button>
      </div>
    `;
  }

  renderBots() {
    return `
      <div class="admin-grid">
        <label>
          <span>Difficulty</span>
          <select data-control="difficulty">
            ${Object.entries(GAME_CONFIG.bots.difficulties)
              .map(([id, difficulty]) => `<option value="${id}" ${this.state.bots.difficulty === id ? "selected" : ""}>${difficulty.label}</option>`)
              .join("")}
          </select>
        </label>
        <div class="admin-readout">
          <span>Alive</span>
          <strong>${this.state.bots.alive}/${this.state.bots.active}</strong>
        </div>
      </div>
      <div class="admin-actions">
        <button type="button" data-action="spawnEnemy">Spawn enemy</button>
        <button type="button" data-action="spawnFriendly">Spawn ally</button>
        <button type="button" data-action="clearBots">Remove bots</button>
      </div>
    `;
  }

  renderMatch() {
    return `
      <div class="admin-grid">
        <label>
          <span>Mode</span>
          <select data-control="mode">
            ${GAME_CONFIG.modes
              .map((mode) => `<option value="${mode.id}" ${this.state.mode === mode.id ? "selected" : ""}>${mode.label}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          <span>Timer</span>
          <input data-control="timer" type="number" min="60" max="1800" step="30" value="${this.state.match.duration}">
        </label>
        <div class="admin-readout">
          <span>Status</span>
          <strong>${this.state.status}</strong>
        </div>
      </div>
      <div class="admin-actions">
        <button type="button" data-action="restart">Restart match</button>
        <button type="button" data-action="end">End match</button>
      </div>
    `;
  }

  renderDebug() {
    return `
      <div class="admin-grid">
        ${this.toggleRow("fpsVisible", "FPS stats", this.state.admin.fpsVisible)}
        ${this.toggleRow("debugColliders", "Collision boxes", this.state.admin.debugColliders)}
        <div class="admin-readout">
          <span>Frame</span>
          <strong>${this.state.stats.frameTime.toFixed(1)} ms</strong>
        </div>
      </div>
      <div class="admin-actions">
        <button type="button" data-action="restart">Restart match</button>
      </div>
    `;
  }

  toggleRow(id, label, checked) {
    return `
      <label class="toggle-row">
        <span>${label}</span>
        <input data-toggle="${id}" type="checkbox" ${checked ? "checked" : ""}>
      </label>
    `;
  }

  bindCurrentTab() {
    this.panel.querySelectorAll("[data-toggle]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.dataset.toggle;
        if (key in this.state.player) {
          this.state.player[key] = input.checked;
        } else if (key in this.state.admin) {
          this.state.admin[key] = input.checked;
          if (key === "debugColliders") {
            this.systems.world.setDebugColliders(input.checked);
          }
        }
        this.render();
      });
    });

    this.panel.querySelectorAll("input[type='range']").forEach((input) => {
      input.addEventListener("input", () => {
        const output = input.parentElement.querySelector("output");
        if (input.dataset.control === "speed") {
          this.state.player.speedMultiplier = Number(input.value);
          output.textContent = `${Number(input.value).toFixed(2)}x`;
        } else if (input.dataset.control === "gravity") {
          GAME_CONFIG.gravity = Number(input.value);
          output.textContent = input.value;
        } else if (input.dataset.tune) {
          this.systems.weapons.updateWeaponTuning(this.systems.weapons.currentWeapon.id, input.dataset.tune, input.value);
          output.textContent = input.dataset.tune === "recoil" ? Number(input.value).toFixed(3) : input.dataset.tune === "fireRate" ? `${input.value} ms` : input.value;
        }
      });
    });

    const teleport = this.panel.querySelector('[data-control="teleport"]');
    teleport?.addEventListener("change", () => {
      this.state.admin.selectedTeleport = teleport.value;
    });

    const weapon = this.panel.querySelector('[data-control="weapon"]');
    weapon?.addEventListener("change", () => {
      this.systems.weapons.switchTo(weapon.value);
      this.render();
    });

    const difficulty = this.panel.querySelector('[data-control="difficulty"]');
    difficulty?.addEventListener("change", () => {
      this.systems.bots.setDifficulty(difficulty.value);
      this.render();
    });

    const mode = this.panel.querySelector('[data-control="mode"]');
    mode?.addEventListener("change", () => {
      this.state.mode = mode.value;
    });

    const timer = this.panel.querySelector('[data-control="timer"]');
    timer?.addEventListener("change", () => {
      const value = Math.max(60, Number(timer.value) || GAME_CONFIG.matchDuration);
      this.state.match.duration = value;
      this.state.match.timeRemaining = Math.min(this.state.match.timeRemaining, value);
    });

    this.panel.querySelectorAll("[data-action]").forEach((button) => {
      const action = button.dataset.action;
      if (action === "close") return;
      button.addEventListener("click", () => this.runAction(action));
    });
  }

  runAction(action) {
    if (action === "heal") this.systems.player.heal();
    if (action === "ammo") this.systems.weapons.giveAmmo();
    if (action === "teleport") {
      this.systems.player.teleportTo(this.systems.world.getTeleportPoint(this.state.admin.selectedTeleport));
    }
    if (action === "switchWeapon") {
      const select = this.panel.querySelector('[data-control="weapon"]');
      this.systems.weapons.switchTo(select.value);
    }
    if (action === "unlock") this.systems.weapons.unlockAll();
    if (action === "spawnEnemy") this.systems.bots.spawnBot(GAME_CONFIG.teams.enemy.id);
    if (action === "spawnFriendly") this.systems.bots.spawnBot(GAME_CONFIG.teams.player.id);
    if (action === "clearBots") this.systems.bots.removeAll();
    if (action === "restart") this.systems.match.restart();
    if (action === "end") this.systems.match.end("Ended by admin");
    this.render();
  }
}
