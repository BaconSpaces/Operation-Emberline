export const GAME_CONFIG = {
  title: "Operation Emberline",
  isAdmin: true,
  worldSize: 126,
  matchDuration: 360,
  scoreLimit: 45,
  gravity: 24,
  battlePass: {
    maxLevel: 50,
    baseLevelXp: 160,
    levelXpStep: 45,
    tierXp: 300,
    rewards: [
      "Emberline Patch",
      "Aegis Steel Camo",
      "Neon Sight Housing",
      "Wraithbreaker Charm",
      "Command Yard Banner",
      "Hazard Stripe Wrap",
      "Transit Ghost Calling Card",
      "Bluefire Muzzle Skin",
      "Veteran Operator Badge",
      "Emberline Master Title"
    ]
  },
  player: {
    height: 1.75,
    crouchHeight: 1.05,
    radius: 0.42,
    walkSpeed: 7,
    sprintMultiplier: 1.55,
    crouchMultiplier: 0.48,
    jumpImpulse: 8.4,
    maxHealth: 100,
    maxArmor: 75,
    respawnDelay: 2.25
  },
  bots: {
    defaultDifficulty: "regular",
    startingCount: 10,
    teamCount: 12,
    survivalStart: 5,
    difficulties: {
      recruit: {
        label: "Recruit",
        health: 80,
        speed: 3.6,
        accuracy: 0.36,
        reaction: 0.78,
        fireDelay: 0.72,
        damage: 8
      },
      regular: {
        label: "Regular",
        health: 100,
        speed: 4.4,
        accuracy: 0.52,
        reaction: 0.55,
        fireDelay: 0.5,
        damage: 12
      },
      veteran: {
        label: "Veteran",
        health: 120,
        speed: 5.1,
        accuracy: 0.68,
        reaction: 0.34,
        fireDelay: 0.34,
        damage: 16
      }
    }
  },
  teams: {
    player: {
      id: "aegis",
      name: "Aegis",
      color: "#59d8ff"
    },
    enemy: {
      id: "wraith",
      name: "Wraith",
      color: "#ff6159"
    },
    neutral: {
      id: "rogue",
      name: "Rogue",
      color: "#ffd166"
    }
  },
  modes: [
    { id: "gunGame", label: "Gun Game" },
    { id: "ffa", label: "Free-for-All" },
    { id: "tdm", label: "Team Skirmish" },
    { id: "survival", label: "Wave Survival" }
  ],
  teleportPoints: [
    { id: "command", label: "Command Yard", position: [0, 2, 24] },
    { id: "market", label: "Neon Market", position: [-36, 2, -18] },
    { id: "garage", label: "Transit Garage", position: [37, 2, -25] },
    { id: "roof", label: "Low Roof", position: [12, 8, -43] },
    { id: "alley", label: "West Alley", position: [-48, 2, 38] }
  ]
};

export const WEAPON_BLUEPRINTS = [
  {
    id: "sparrow",
    name: "Sparrow PDW",
    slot: "1",
    role: "compact smg",
    damage: 17,
    fireRate: 68,
    reloadTime: 1.35,
    magazineSize: 36,
    reserveMags: 5,
    pellets: 1,
    spread: 0.017,
    recoil: 0.012,
    range: 95,
    automatic: true,
    color: "#68e39f",
    muzzleColor: "#68e39f"
  },
  {
    id: "vx9",
    name: "VX-9 Carbine",
    slot: "2",
    role: "assault rifle",
    damage: 22,
    fireRate: 96,
    reloadTime: 1.75,
    magazineSize: 30,
    reserveMags: 5,
    pellets: 1,
    spread: 0.012,
    recoil: 0.018,
    range: 150,
    automatic: true,
    color: "#8be9fd",
    muzzleColor: "#8be9fd"
  },
  {
    id: "longwatch",
    name: "Longwatch M32",
    slot: "6",
    role: "sniper rifle",
    damage: 88,
    fireRate: 680,
    reloadTime: 2.4,
    magazineSize: 6,
    reserveMags: 5,
    pellets: 1,
    spread: 0.0025,
    recoil: 0.056,
    range: 260,
    automatic: false,
    color: "#f4d35e",
    muzzleColor: "#f4d35e"
  },
  {
    id: "hushbreaker",
    name: "Hushbreaker SG",
    slot: "3",
    role: "shotgun",
    damage: 12,
    fireRate: 780,
    reloadTime: 2.05,
    magazineSize: 8,
    reserveMags: 5,
    pellets: 9,
    spread: 0.055,
    recoil: 0.045,
    range: 72,
    automatic: false,
    color: "#ffb86c",
    muzzleColor: "#ffb86c"
  },
  {
    id: "kestrel",
    name: "Kestrel B3",
    slot: "4",
    role: "burst rifle",
    damage: 28,
    fireRate: 135,
    reloadTime: 1.85,
    magazineSize: 24,
    reserveMags: 5,
    pellets: 1,
    spread: 0.009,
    recoil: 0.022,
    range: 160,
    automatic: true,
    burstCount: 3,
    color: "#b4f1ff",
    muzzleColor: "#b4f1ff"
  },
  {
    id: "bulwark",
    name: "Bulwark LMG",
    slot: "5",
    role: "light machine gun",
    damage: 24,
    fireRate: 112,
    reloadTime: 3.2,
    magazineSize: 60,
    reserveMags: 3,
    pellets: 1,
    spread: 0.019,
    recoil: 0.026,
    range: 145,
    automatic: true,
    color: "#9aa7ff",
    muzzleColor: "#9aa7ff"
  },
  {
    id: "arcbolt",
    name: "Arcbolt DMR",
    slot: "7",
    role: "marksman rifle",
    damage: 48,
    fireRate: 310,
    reloadTime: 2.05,
    magazineSize: 12,
    reserveMags: 5,
    pellets: 1,
    spread: 0.005,
    recoil: 0.034,
    range: 220,
    automatic: false,
    color: "#c8ff7a",
    muzzleColor: "#c8ff7a"
  },
  {
    id: "sidewinder",
    name: "Sidewinder X2",
    slot: "8",
    role: "final sidearm",
    damage: 36,
    fireRate: 210,
    reloadTime: 1.25,
    magazineSize: 10,
    reserveMags: 6,
    pellets: 1,
    spread: 0.011,
    recoil: 0.03,
    range: 120,
    automatic: false,
    color: "#ff6f91",
    muzzleColor: "#ff6f91"
  }
];
