import { GAME_CONFIG } from "../core/config.js";

export class ProgressionSystem {
  constructor(state) {
    this.state = state;
    this.sync();
  }

  awardXp(amount, reason = "XP") {
    const progression = this.state.progression;
    const previousLevel = progression.level;
    const previousTier = progression.battlePassTier;

    progression.totalXp = Math.max(0, progression.totalXp + Math.round(amount));
    this.sync();

    this.state.events.emit("xp-gained", {
      amount: Math.round(amount),
      reason,
      levelChanged: progression.level > previousLevel,
      tierChanged: progression.battlePassTier > previousTier
    });

    if (progression.level > previousLevel) {
      this.state.events.emit("system-message", { text: `Level ${progression.level}` });
    }

    if (progression.battlePassTier > previousTier) {
      this.unlockBattlePassRewards(previousTier + 1, progression.battlePassTier);
    }
  }

  sync() {
    const progression = this.state.progression;
    const config = GAME_CONFIG.battlePass;
    let remainingXp = progression.totalXp;
    let level = 1;
    let nextLevelXp = config.baseLevelXp;

    while (level < config.maxLevel && remainingXp >= nextLevelXp) {
      remainingXp -= nextLevelXp;
      level += 1;
      nextLevelXp = config.baseLevelXp + (level - 1) * config.levelXpStep;
    }

    progression.level = level;
    progression.currentLevelXp = level >= config.maxLevel ? nextLevelXp : remainingXp;
    progression.nextLevelXp = nextLevelXp;

    const tier = Math.min(config.maxLevel, Math.floor(progression.totalXp / config.tierXp) + 1);
    progression.battlePassTier = tier;
    progression.currentTierXp = progression.totalXp % config.tierXp;
    progression.nextTierXp = config.tierXp;
  }

  unlockBattlePassRewards(fromTier, toTier) {
    const progression = this.state.progression;
    for (let tier = fromTier; tier <= toTier; tier += 1) {
      const reward = this.rewardForTier(tier);
      if (!progression.unlockedRewards.includes(reward)) {
        progression.unlockedRewards.push(reward);
      }
      progression.lastReward = reward;
    }

    this.state.events.emit("battle-pass-reward", {
      tier: progression.battlePassTier,
      reward: progression.lastReward
    });
    this.state.events.emit("system-message", {
      text: `Battle Pass ${progression.battlePassTier}: ${progression.lastReward}`
    });
  }

  rewardForTier(tier) {
    const rewards = GAME_CONFIG.battlePass.rewards;
    return rewards[(tier - 1) % rewards.length];
  }
}
