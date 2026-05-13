import "./styles.css";
import * as THREE from "three";
import { GAME_CONFIG } from "./core/config.js";
import { Input } from "./core/Input.js";
import { createInitialState, resetPlayerState } from "./core/state.js";
import { AudioSystem } from "./systems/AudioSystem.js";
import { BotManager } from "./systems/BotManager.js";
import { Effects } from "./systems/Effects.js";
import { PlayerController } from "./systems/PlayerController.js";
import { ProgressionSystem } from "./systems/ProgressionSystem.js";
import { WeaponSystem } from "./systems/WeaponSystem.js";
import { World } from "./systems/World.js";
import { AdminMenu } from "./ui/AdminMenu.js";
import { HUD } from "./ui/HUD.js";

const root = document.querySelector("#app");
const state = createInitialState();
const input = new Input(window);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.className = "game-canvas";
root.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.08, 280);
scene.add(camera);

const audio = new AudioSystem();
const world = new World(scene);
const effects = new Effects(scene, camera);
const player = new PlayerController(camera, renderer.domElement, input, world, state, audio);
const progression = new ProgressionSystem(state);
const weapons = new WeaponSystem(camera, state, input, world, effects, audio, player);
const bots = new BotManager(scene, world, state, audio, effects);
bots.setPlayer(player);
weapons.setBotManager(bots);
player.setCurrentWeapon(weapons.currentWeapon);
state.events.on("weapon-changed", ({ weapon }) => {
  player.setCurrentWeapon(weapon);
});

const match = {
  restart() {
    state.status = "running";
    state.elapsed = 0;
    state.match.timeRemaining = state.match.duration;
    state.match.endedReason = "";
    state.player.kills = 0;
    state.player.deaths = 0;
    state.player.score = 0;
    state.killFeed = [];
    state.match.teamScores[GAME_CONFIG.teams.player.id] = 0;
    state.match.teamScores[GAME_CONFIG.teams.enemy.id] = 0;
    state.match.teamScores[GAME_CONFIG.teams.neutral.id] = 0;
    resetPlayerState(state);
    weapons.resetAmmo();
    weapons.setupForMode(state.mode);
    player.currentHeight = GAME_CONFIG.player.height;
    player.setPosition(world.getRandomSpawn("player"));
    bots.restart(state.mode);
    state.events.emit("system-message", { text: "Match live" });
    window.setTimeout(() => player.lock(), 50);
  },
  end(reason = "Match ended") {
    state.status = "ended";
    state.match.endedReason = reason;
    player.unlock();
    state.events.emit("system-message", { text: reason });
  },
  pause() {
    if (state.status !== "running" || state.admin.open || !state.player.alive) return;
    state.status = "paused";
    player.unlock();
    state.events.emit("system-message", { text: "Paused" });
  },
  resume() {
    if (state.status !== "paused") return;
    state.status = "running";
    state.events.emit("system-message", { text: "Resumed" });
    window.setTimeout(() => player.lock(), 30);
  },
  deploy() {
    if (state.status === "paused") {
      this.resume();
      return;
    }
    if (state.status === "running") {
      player.lock();
      return;
    }
    this.restart();
  }
};

const hud = new HUD(root, state, camera, {
  onDeploy: () => match.deploy(),
  onPause: () => match.pause(),
  onResume: () => match.resume(),
  onRestart: () => match.restart(),
  onEnd: () => match.end("Ended from pause menu"),
  onAudio: (enabled) => {
    audio.enabled = enabled;
  }
});

const admin = new AdminMenu(root, state, {
  player,
  weapons,
  bots,
  world,
  match
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || state.admin.open) return;
  if (state.status === "running") {
    event.preventDefault();
    match.pause();
  } else if (state.status === "paused") {
    event.preventDefault();
    match.resume();
  }
});

state.events.on("pointer-lock", ({ locked }) => {
  if (locked) {
    state.events.emit("system-message", { text: "Mouse captured" });
  }
});

state.events.on("player-died", ({ cause }) => {
  if (state.status === "running") {
    state.match.teamScores[GAME_CONFIG.teams.enemy.id] += 1;

    if (state.mode === "gunGame" && (cause === "melee" || cause === "suicide")) {
      weapons.demoteGunGame();
    }
  }
});

state.events.on("player-kill", ({ weapon }) => {
  const gunGameBonus = state.mode === "gunGame" ? 45 : 0;
  progression.awardXp(120 + gunGameBonus, `Kill with ${weapon?.name || "weapon"}`);

  if (state.mode === "gunGame") {
    const completed = weapons.advanceGunGame();
    if (completed) {
      progression.awardXp(500, "Gun Game complete");
      match.end("Gun Game cleared");
    }
  }
});

const clock = new THREE.Clock();
let fpsAverage = 60;

function updateMatch(delta) {
  if (state.status !== "running") return;
  state.elapsed += delta;
  state.match.timeRemaining = Math.max(0, state.match.duration - state.elapsed);

  if (state.match.timeRemaining <= 0) {
    match.end("Time expired");
    return;
  }

  const scores = state.match.teamScores;
  if (scores[GAME_CONFIG.teams.player.id] >= state.match.scoreLimit) {
    match.end("Aegis wins");
  } else if (scores[GAME_CONFIG.teams.enemy.id] >= state.match.scoreLimit) {
    match.end("Wraith wins");
  } else if (state.mode === "gunGame" && state.gunGame.ladderComplete) {
    match.end("Gun Game cleared");
  } else if (state.mode === "ffa" && state.player.kills >= state.match.scoreLimit) {
    match.end("Score limit reached");
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const now = clock.elapsedTime;

  updateMatch(delta);
  player.update(delta, now);
  if (state.status === "running") {
    weapons.update(delta);
    bots.update(delta);
  }
  effects.setAds(state.player.aiming);
  effects.update(delta);

  fpsAverage = fpsAverage * 0.92 + (1 / Math.max(0.0001, delta)) * 0.08;
  state.stats.fps = fpsAverage;
  state.stats.frameTime = delta * 1000;

  hud.update(delta, weapons.currentWeapon, input, weapons.reloading, weapons.getEffectiveSpread(), state.player.aiming);
  world.setDebugColliders(state.admin.debugColliders);
  renderer.render(scene, camera);
  input.endFrame();
}

animate();
