import { GAME_CONFIG, WEAPON_BLUEPRINTS } from "./config.js";

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.off(type, callback);
  }

  off(type, callback) {
    this.listeners.get(type)?.delete(callback);
  }

  emit(type, payload = {}) {
    this.listeners.get(type)?.forEach((callback) => callback(payload));
  }
}

export function createInitialState() {
  return {
    events: new EventBus(),
    status: "idle",
    mode: "gunGame",
    wave: 1,
    elapsed: 0,
    player: {
      team: GAME_CONFIG.teams.player.id,
      health: GAME_CONFIG.player.maxHealth,
      armor: GAME_CONFIG.player.maxArmor,
      alive: true,
      kills: 0,
      deaths: 0,
      score: 0,
      godMode: false,
      noClip: false,
      speedMultiplier: 1,
      spawnShield: 0
    },
    gunGame: {
      weaponIndex: 0,
      ladderComplete: false,
      lastPromotion: ""
    },
    match: {
      duration: GAME_CONFIG.matchDuration,
      timeRemaining: GAME_CONFIG.matchDuration,
      scoreLimit: GAME_CONFIG.scoreLimit,
      endedReason: "",
      teamScores: {
        [GAME_CONFIG.teams.player.id]: 0,
        [GAME_CONFIG.teams.enemy.id]: 0,
        [GAME_CONFIG.teams.neutral.id]: 0
      }
    },
    admin: {
      open: false,
      fpsVisible: true,
      debugColliders: false,
      selectedTeleport: GAME_CONFIG.teleportPoints[0].id
    },
    bots: {
      difficulty: GAME_CONFIG.bots.defaultDifficulty,
      active: 0,
      alive: 0
    },
    progression: {
      totalXp: 0,
      level: 1,
      currentLevelXp: 0,
      nextLevelXp: GAME_CONFIG.battlePass.baseLevelXp,
      battlePassTier: 1,
      currentTierXp: 0,
      nextTierXp: GAME_CONFIG.battlePass.tierXp,
      unlockedRewards: [GAME_CONFIG.battlePass.rewards[0]],
      lastReward: GAME_CONFIG.battlePass.rewards[0]
    },
    weapons: WEAPON_BLUEPRINTS.map((weapon) => ({
      ...weapon,
      currentAmmo: weapon.magazineSize,
      reserveAmmo: weapon.magazineSize * weapon.reserveMags,
      unlocked: true
    })),
    stats: {
      fps: 0,
      frameTime: 0
    },
    killFeed: []
  };
}

export function resetPlayerState(state) {
  state.player.health = GAME_CONFIG.player.maxHealth;
  state.player.armor = GAME_CONFIG.player.maxArmor;
  state.player.alive = true;
  state.player.spawnShield = 1.4;
}

export function resetWeaponAmmo(state) {
  for (const weapon of state.weapons) {
    weapon.currentAmmo = weapon.magazineSize;
    weapon.reserveAmmo = weapon.magazineSize * weapon.reserveMags;
  }
}
