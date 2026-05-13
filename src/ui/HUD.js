import * as THREE from "three";
import { GAME_CONFIG } from "../core/config.js";
import { formatClock } from "../core/math.js";

export class HUD {
  constructor(root, state, camera, callbacks) {
    this.root = root;
    this.state = state;
    this.camera = camera;
    this.callbacks = callbacks;
    this.hitMarkerTimer = 0;
    this.damageTimer = 0;
    this.messageTimer = 0;
    this.message = "";
    this.locked = false;
    this.build();
    this.bindEvents();
  }

  build() {
    this.container = document.createElement("div");
    this.container.className = "hud";
    this.container.innerHTML = `
      <div class="brand-lockup">
        <span class="brand-mark"></span>
        <span>${GAME_CONFIG.title}</span>
      </div>
      <div class="match-strip">
        <span data-hud="mode"></span>
        <strong data-hud="timer"></strong>
        <span data-hud="wave"></span>
      </div>
      <div class="crosshair">
        <span class="crosshair-line top"></span>
        <span class="crosshair-line right"></span>
        <span class="crosshair-line bottom"></span>
        <span class="crosshair-line left"></span>
        <span class="crosshair-dot"></span>
      </div>
      <div class="hit-marker"></div>
      <div class="damage-indicator"></div>
      <section class="vitals-panel">
        <div class="metric-row">
          <span>Health</span>
          <strong data-hud="health"></strong>
        </div>
        <div class="bar"><span data-hud="healthBar"></span></div>
        <div class="metric-row">
          <span>Armor</span>
          <strong data-hud="armor"></strong>
        </div>
        <div class="bar armor"><span data-hud="armorBar"></span></div>
      </section>
      <section class="weapon-panel">
        <span data-hud="weaponRole"></span>
        <strong data-hud="weaponName"></strong>
        <div class="ammo-line">
          <span data-hud="ammo"></span>
          <small data-hud="reserve"></small>
        </div>
        <div class="reload-pill" data-hud="reload">Reloading</div>
      </section>
      <section class="score-panel">
        <div><span>K</span><strong data-hud="kills"></strong></div>
        <div><span>D</span><strong data-hud="deaths"></strong></div>
        <div><span>Score</span><strong data-hud="score"></strong></div>
        <div><span>Bots</span><strong data-hud="bots"></strong></div>
      </section>
      <section class="team-panel">
        <div><span>Aegis</span><strong data-hud="aegisScore"></strong></div>
        <div><span>Wraith</span><strong data-hud="wraithScore"></strong></div>
      </section>
      <section class="progress-panel">
        <div class="progress-head">
          <span>Level</span>
          <strong data-hud="level"></strong>
        </div>
        <div class="bar level"><span data-hud="levelBar"></span></div>
        <div class="progress-head">
          <span>Battle Pass</span>
          <strong data-hud="battlePassTier"></strong>
        </div>
        <div class="bar battle-pass"><span data-hud="battlePassBar"></span></div>
        <small data-hud="battlePassReward"></small>
      </section>
      <section class="kill-feed" data-hud="killFeed"></section>
      <section class="scoreboard" data-hud="scoreboard"></section>
      <div class="toast" data-hud="toast"></div>
      <div class="fps-counter" data-hud="fps"></div>
      <button type="button" class="pause-toggle" data-hud="pauseToggle" data-action="pause">Pause</button>
      <div class="deploy-overlay" data-hud="overlay">
        <div class="deploy-title">
          <span class="brand-mark large"></span>
          <h1>${GAME_CONFIG.title}</h1>
          <p>Near-future urban combat simulator</p>
        </div>
        <button class="deploy-button" data-action="deploy">Deploy</button>
      </div>
      <div class="pause-menu" data-hud="pause">
        <header>
          <strong>Paused</strong>
          <span>Simulation settings</span>
        </header>
        <button type="button" data-action="resume">Resume</button>
        <button type="button" data-action="restart">Restart</button>
        <button type="button" data-action="end">End match</button>
        <label>
          <span>Audio</span>
          <input type="checkbox" data-action="audio" checked>
        </label>
      </div>
      <div class="respawn-overlay" data-hud="respawn"></div>
    `;
    this.root.appendChild(this.container);
    this.refs = {};
    this.container.querySelectorAll("[data-hud]").forEach((element) => {
      this.refs[element.dataset.hud] = element;
    });
    this.container.querySelector('[data-action="deploy"]').addEventListener("click", () => {
      this.callbacks.onDeploy();
    });
    this.container.querySelector('[data-action="resume"]').addEventListener("click", () => {
      this.callbacks.onResume();
    });
    this.container.querySelector('[data-action="pause"]').addEventListener("click", () => {
      this.callbacks.onPause();
    });
    this.container.querySelector('[data-action="restart"]').addEventListener("click", () => {
      this.callbacks.onRestart();
    });
    this.container.querySelector('[data-action="end"]').addEventListener("click", () => {
      this.callbacks.onEnd();
    });
    this.container.querySelector('[data-action="audio"]').addEventListener("change", (event) => {
      this.callbacks.onAudio(Boolean(event.target.checked));
    });
    this.container.addEventListener("click", (event) => {
      if (event.target === this.refs.pause) {
        this.callbacks.onResume();
      }
    });
  }

  bindEvents() {
    this.state.events.on("hit-marker", () => {
      this.hitMarkerTimer = 0.12;
      this.container.querySelector(".hit-marker").classList.add("active");
    });
    this.state.events.on("player-damaged", ({ fromPosition }) => {
      this.damageTimer = 0.42;
      this.showDamageDirection(fromPosition);
    });
    this.state.events.on("system-message", ({ text }) => {
      this.message = text;
      this.messageTimer = 1.6;
    });
    this.state.events.on("pointer-lock", ({ locked }) => {
      this.locked = locked;
    });
  }

  showDamageDirection(fromPosition) {
    const indicator = this.container.querySelector(".damage-indicator");
    if (fromPosition) {
      const forward = this.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const incoming = fromPosition.clone().sub(this.camera.position).setY(0).normalize();
      const angle = Math.atan2(incoming.dot(right), incoming.dot(forward));
      indicator.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
    }
    indicator.classList.add("active");
  }

  update(delta, weapon, input, reloading) {
    const player = this.state.player;
    const match = this.state.match;
    const modeLabel = GAME_CONFIG.modes.find((mode) => mode.id === this.state.mode)?.label || this.state.mode;

    this.refs.mode.textContent = modeLabel;
    this.refs.timer.textContent = formatClock(match.timeRemaining);
    this.refs.wave.textContent =
      this.state.mode === "survival"
        ? `Wave ${this.state.wave}`
        : this.state.mode === "gunGame"
          ? `Gun ${this.state.gunGame.weaponIndex + 1}/${this.state.weapons.length}`
          : "";
    this.refs.health.textContent = Math.ceil(player.health).toString();
    this.refs.armor.textContent = Math.ceil(player.armor).toString();
    this.refs.healthBar.style.width = `${Math.max(0, player.health)}%`;
    this.refs.armorBar.style.width = `${Math.max(0, (player.armor / GAME_CONFIG.player.maxArmor) * 100)}%`;
    this.refs.weaponRole.textContent = weapon.role;
    this.refs.weaponName.textContent = weapon.name;
    this.refs.ammo.textContent = weapon.currentAmmo.toString().padStart(2, "0");
    this.refs.reserve.textContent = `/ ${weapon.reserveAmmo}`;
    this.refs.reload.classList.toggle("visible", reloading);
    this.refs.kills.textContent = player.kills.toString();
    this.refs.deaths.textContent = player.deaths.toString();
    this.refs.score.textContent = player.score.toString();
    this.refs.bots.textContent = `${this.state.bots.alive}/${this.state.bots.active}`;
    this.refs.aegisScore.textContent = match.teamScores[GAME_CONFIG.teams.player.id].toString();
    this.refs.wraithScore.textContent = match.teamScores[GAME_CONFIG.teams.enemy.id].toString();
    this.refs.fps.textContent = this.state.admin.fpsVisible ? `${Math.round(this.state.stats.fps)} FPS` : "";
    this.updateProgress();

    this.updateKillFeed();
    this.updateScoreboard(input);
    this.updateOverlay();
    this.updateTransient(delta);
  }

  updateKillFeed() {
    this.refs.killFeed.innerHTML = this.state.killFeed
      .map((entry) => `<div><strong>${entry.killer}</strong><span>${entry.weapon}</span><em>${entry.victim}</em></div>`)
      .join("");
  }

  updateProgress() {
    const progression = this.state.progression;
    this.refs.level.textContent = progression.level.toString();
    this.refs.levelBar.style.width = `${Math.min(100, (progression.currentLevelXp / progression.nextLevelXp) * 100)}%`;
    this.refs.battlePassTier.textContent = `Tier ${progression.battlePassTier}`;
    this.refs.battlePassBar.style.width = `${Math.min(100, (progression.currentTierXp / progression.nextTierXp) * 100)}%`;
    this.refs.battlePassReward.textContent = progression.lastReward || "";
  }

  updateScoreboard(input) {
    const visible = input?.isDown("tab");
    this.refs.scoreboard.classList.toggle("visible", Boolean(visible));
    if (!visible) return;
    this.refs.scoreboard.innerHTML = `
      <header>
        <strong>Scoreboard</strong>
        <span>${GAME_CONFIG.title}</span>
      </header>
      <div class="score-grid">
        <span>Kills</span><strong>${this.state.player.kills}</strong>
        <span>Deaths</span><strong>${this.state.player.deaths}</strong>
        <span>Score</span><strong>${this.state.player.score}</strong>
        <span>Level</span><strong>${this.state.progression.level}</strong>
        <span>Battle Pass</span><strong>Tier ${this.state.progression.battlePassTier}</strong>
        <span>Aegis</span><strong>${this.state.match.teamScores[GAME_CONFIG.teams.player.id]}</strong>
        <span>Wraith</span><strong>${this.state.match.teamScores[GAME_CONFIG.teams.enemy.id]}</strong>
        <span>Active bots</span><strong>${this.state.bots.alive}</strong>
      </div>
    `;
  }

  updateOverlay() {
    const overlay = this.refs.overlay;
    const respawn = this.refs.respawn;
    const showDeploy = (this.state.status === "idle" || this.state.status === "ended") && !this.state.admin.open;
    overlay.classList.toggle("hidden", !showDeploy);
    overlay.classList.toggle("compact", this.state.status === "ended");

    const showPause = this.state.status === "paused" && !this.state.admin.open && this.state.player.alive;
    this.refs.pause.classList.toggle("visible", showPause);
    this.refs.pauseToggle.classList.toggle("visible", this.state.status === "running" && !this.state.admin.open);

    if (!this.state.player.alive) {
      respawn.classList.add("visible");
      respawn.textContent = "Respawning";
    } else {
      respawn.classList.remove("visible");
      respawn.textContent = "";
    }
  }

  updateTransient(delta) {
    this.hitMarkerTimer -= delta;
    this.damageTimer -= delta;
    this.messageTimer -= delta;

    if (this.hitMarkerTimer <= 0) {
      this.container.querySelector(".hit-marker").classList.remove("active");
    }
    if (this.damageTimer <= 0) {
      this.container.querySelector(".damage-indicator").classList.remove("active");
    }

    if (this.messageTimer > 0) {
      this.refs.toast.textContent = this.message;
      this.refs.toast.classList.add("visible");
    } else {
      this.refs.toast.classList.remove("visible");
    }
  }
}
