import { GAME_CONFIG } from "../core/config.js";

const RARITY_COLORS = {
  common: "#b0bec5",
  rare: "#59d8ff",
  epic: "#b388ff",
  legendary: "#ffd166"
};

const TYPE_ICONS = {
  camo: "paint",
  charm: "link",
  emblem: "shield",
  banner: "flag",
  card: "id",
  attachment: "crosshair",
  title: "award"
};

export class Lobby {
  constructor(root, state, callbacks) {
    this.root = root;
    this.state = state;
    this.callbacks = callbacks;
    this.activeTab = "play";
    this.lockerFilter = "all";
    this.build();
  }

  build() {
    this.container = document.createElement("div");
    this.container.className = "lobby-screen";
    this.root.appendChild(this.container);
    this.render();
  }

  show() {
    this.state.lobby.open = true;
    this.container.classList.add("visible");
    this.render();
  }

  hide() {
    this.state.lobby.open = false;
    this.container.classList.remove("visible");
  }

  get isVisible() {
    return this.container.classList.contains("visible");
  }

  render() {
    const modeOptions = GAME_CONFIG.modes.map((mode) =>
      `<button class="lobby-mode-btn ${this.state.mode === mode.id ? "active" : ""}" data-mode="${mode.id}">${mode.label}</button>`
    ).join("");

    this.container.innerHTML = `
      <nav class="lobby-nav">
        <div class="lobby-brand">
          <span class="brand-mark"></span>
          <span>${GAME_CONFIG.title}</span>
        </div>
        <div class="lobby-tabs">
          ${this.tabButton("play", "Play")}
          ${this.tabButton("locker", "Locker")}
          ${this.tabButton("battlepass", "Battle Pass")}
        </div>
      </nav>
      <div class="lobby-content">${this.renderTab()}</div>
    `;

    this.container.querySelectorAll("[data-lobby-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.dataset.lobbyTab;
        this.render();
      });
    });

    if (this.activeTab === "play") {
      this.bindPlayTab();
    } else if (this.activeTab === "locker") {
      this.bindLockerTab();
    }
  }

  tabButton(id, label) {
    return `<button data-lobby-tab="${id}" class="lobby-tab-btn ${this.activeTab === id ? "active" : ""}">${label}</button>`;
  }

  renderTab() {
    if (this.activeTab === "locker") return this.renderLocker();
    if (this.activeTab === "battlepass") return this.renderBattlePass();
    return this.renderPlay();
  }

  renderPlay() {
    const modes = GAME_CONFIG.modes.map((mode) =>
      `<button class="lobby-mode-card ${this.state.mode === mode.id ? "selected" : ""}" data-mode="${mode.id}">
        <strong>${mode.label}</strong>
        <span>${this.modeDescription(mode.id)}</span>
      </button>`
    ).join("");

    return `
      <div class="lobby-play">
        <section class="lobby-section">
          <h2>Select Mode</h2>
          <div class="lobby-mode-grid">${modes}</div>
        </section>
        <section class="lobby-section lobby-player-card">
          <h3>Operator</h3>
          <div class="lobby-stats">
            <div><span>Level</span><strong>${this.state.progression.level}</strong></div>
            <div><span>BP Tier</span><strong>${this.state.progression.battlePassTier}</strong></div>
            <div><span>Items</span><strong>${this.state.progression.unlockedRewards.length}</strong></div>
          </div>
        </section>
        <button class="lobby-deploy-btn" data-action="deploy">Deploy</button>
      </div>
    `;
  }

  renderLocker() {
    const unlocked = this.state.progression.unlockedRewards;
    const allRewards = GAME_CONFIG.battlePass.rewards;
    const types = ["all", ...new Set(allRewards.map((r) => r.type))];
    const filterBtns = types.map((t) =>
      `<button class="locker-filter-btn ${this.lockerFilter === t ? "active" : ""}" data-filter="${t}">${t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}</button>`
    ).join("");

    const items = allRewards.map((reward, index) => {
      const owned = unlocked.some((u) => (typeof u === "string" ? u === reward.name : u.name === reward.name));
      if (this.lockerFilter !== "all" && reward.type !== this.lockerFilter) return "";
      const color = RARITY_COLORS[reward.rarity] || "#b0bec5";
      return `
        <div class="locker-item ${owned ? "owned" : "locked"}" style="--rarity-color: ${color}">
          <div class="locker-item-icon">${(TYPE_ICONS[reward.type] || "gift").toUpperCase().charAt(0)}</div>
          <strong>${reward.name}</strong>
          <span class="locker-item-type">${reward.type}</span>
          <span class="locker-item-rarity" style="color: ${color}">${reward.rarity}</span>
          ${!owned ? `<span class="locker-item-lock">Tier ${index + 1}</span>` : ""}
        </div>
      `;
    }).join("");

    return `
      <div class="lobby-locker">
        <section class="lobby-section">
          <h2>Locker</h2>
          <p class="locker-subtitle">${unlocked.length} / ${allRewards.length} items unlocked</p>
          <div class="locker-filters">${filterBtns}</div>
        </section>
        <div class="locker-grid">${items}</div>
      </div>
    `;
  }

  renderBattlePass() {
    const progression = this.state.progression;
    const rewards = GAME_CONFIG.battlePass.rewards;
    const tiers = rewards.map((reward, index) => {
      const tier = index + 1;
      const unlocked = tier <= progression.battlePassTier;
      const current = tier === progression.battlePassTier;
      const color = RARITY_COLORS[reward.rarity] || "#b0bec5";
      return `
        <div class="bp-tier ${unlocked ? "unlocked" : ""} ${current ? "current" : ""}" style="--rarity-color: ${color}">
          <div class="bp-tier-num">${tier}</div>
          <div class="bp-tier-reward">
            <strong>${reward.name}</strong>
            <span style="color: ${color}">${reward.rarity}</span>
          </div>
          <div class="bp-tier-status">${unlocked ? "Claimed" : "Locked"}</div>
        </div>
      `;
    }).join("");

    const progressPct = Math.min(100, (progression.currentTierXp / progression.nextTierXp) * 100);

    return `
      <div class="lobby-battlepass">
        <section class="lobby-section">
          <h2>Battle Pass</h2>
          <div class="bp-header">
            <div class="bp-level">
              <span>Current Tier</span>
              <strong>${progression.battlePassTier}</strong>
            </div>
            <div class="bp-xp">
              <span>Tier Progress</span>
              <div class="bp-bar"><span style="width: ${progressPct}%"></span></div>
              <small>${progression.currentTierXp} / ${progression.nextTierXp} XP</small>
            </div>
          </div>
        </section>
        <div class="bp-tier-list">${tiers}</div>
      </div>
    `;
  }

  modeDescription(id) {
    const descriptions = {
      gunGame: "Progress through weapons. Knife kill to win.",
      ffa: "Free-for-all. Highest kills wins.",
      tdm: "Team vs team. First to score limit wins.",
      survival: "Survive waves of enemies."
    };
    return descriptions[id] || "";
  }

  bindPlayTab() {
    this.container.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.state.mode = btn.dataset.mode;
        this.render();
      });
    });
    const deployBtn = this.container.querySelector('[data-action="deploy"]');
    if (deployBtn) {
      deployBtn.addEventListener("click", () => {
        this.hide();
        this.callbacks.onDeploy();
      });
    }
  }

  bindLockerTab() {
    this.container.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.lockerFilter = btn.dataset.filter;
        this.render();
      });
    });
  }
}
