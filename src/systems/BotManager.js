import * as THREE from "three";
import { GAME_CONFIG } from "../core/config.js";
import { chance, flatDistance, randRange, randomItem } from "../core/math.js";

let botId = 1;

class Bot {
  constructor(manager, team, spawnPosition) {
    this.manager = manager;
    this.world = manager.world;
    this.state = manager.state;
    this.team = team;
    this.id = `bot-${botId++}`;
    this.name = team === GAME_CONFIG.teams.player.id ? `Aegis ${botId}` : team === GAME_CONFIG.teams.enemy.id ? `Wraith ${botId}` : `Rogue ${botId}`;
    this.group = new THREE.Group();
    this.group.name = this.name;
    this.group.position.copy(spawnPosition);
    this.health = this.difficulty.health;
    this.maxHealth = this.difficulty.health;
    this.fireTimer = randRange(0.1, 0.8);
    this.reactionTimer = this.difficulty.reaction;
    this.rethinkTimer = randRange(0.2, 0.7);
    this.coverTimer = 0;
    this.target = null;
    this.pathTarget = randomItem(this.world.patrolPoints).clone();
    this.alive = true;
    this.hitFlash = 0;
    this.buildMesh();
    this.manager.scene.add(this.group);
  }

  get difficulty() {
    return GAME_CONFIG.bots.difficulties[this.state.bots.difficulty];
  }

  buildMesh() {
    const teamColor =
      this.team === GAME_CONFIG.teams.player.id
        ? GAME_CONFIG.teams.player.color
        : this.team === GAME_CONFIG.teams.enemy.id
          ? GAME_CONFIG.teams.enemy.color
          : GAME_CONFIG.teams.neutral.color;

    const armorMaterial = new THREE.MeshStandardMaterial({
      color: "#283035",
      roughness: 0.58,
      metalness: 0.3
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: teamColor,
      roughness: 0.42,
      metalness: 0.45,
      emissive: teamColor,
      emissiveIntensity: 0.28
    });
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: "#171b1f",
      roughness: 0.72,
      metalness: 0.18
    });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.76, 5, 10), armorMaterial);
    body.position.y = 0.92;
    body.castShadow = true;
    this.group.add(body);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.1), accentMaterial);
    visor.position.set(0, 1.48, -0.34);
    visor.castShadow = true;
    this.group.add(visor);

    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.18), darkMaterial);
    pack.position.set(0, 0.9, 0.38);
    pack.castShadow = true;
    this.group.add(pack);

    const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.62), darkMaterial);
    weapon.position.set(0.32, 1.08, -0.35);
    weapon.rotation.y = -0.12;
    weapon.castShadow = true;
    this.group.add(weapon);
    this.weaponMuzzle = new THREE.Object3D();
    this.weaponMuzzle.position.set(0.32, 1.08, -0.72);
    this.group.add(this.weaponMuzzle);

    const hitMaterial = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.001,
      depthWrite: false
    });
    this.hitMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.82, 1.0), hitMaterial);
    this.hitMesh.position.y = 0.91;
    this.hitMesh.userData.bot = this;
    this.group.add(this.hitMesh);

    this.accentMaterial = accentMaterial;
  }

  update(delta) {
    if (!this.alive) return;

    this.fireTimer -= delta;
    this.rethinkTimer -= delta;
    this.coverTimer = Math.max(0, this.coverTimer - delta);
    this.hitFlash = Math.max(0, this.hitFlash - delta);
    this.accentMaterial.emissiveIntensity = this.hitFlash > 0 ? 1.3 : 0.28;

    if (this.rethinkTimer <= 0) {
      this.target = this.manager.findTarget(this);
      this.rethinkTimer = randRange(0.25, 0.65);
      if (!this.target && flatDistance(this.group.position, this.pathTarget) < 2.1) {
        this.pathTarget = randomItem(this.world.patrolPoints).clone();
      }
    }

    if (!this.target) {
      this.moveToward(this.pathTarget, this.difficulty.speed * 0.68, delta);
      return;
    }

    const targetEye = this.manager.getActorEyePosition(this.target);
    const myEye = this.getEyePosition();
    const distance = myEye.distanceTo(targetEye);
    const hasLos = this.world.hasLineOfSight(myEye, targetEye);

    if ((this.health < this.maxHealth * 0.45 && this.coverTimer <= 0) || (!hasLos && distance < 24 && chance(0.05))) {
      this.pathTarget = this.world.getCoverPoint(this.group.position, targetEye);
      this.coverTimer = randRange(1.2, 2.4);
    }

    if (this.coverTimer > 0) {
      this.moveToward(this.pathTarget, this.difficulty.speed, delta);
      if (hasLos && distance < 38) {
        this.tryShoot(targetEye, distance, delta);
      }
      return;
    }

    if (!hasLos || distance > 24) {
      this.moveToward(targetEye, this.difficulty.speed, delta);
    } else if (distance < 8) {
      const away = new THREE.Vector3().subVectors(this.group.position, targetEye).setY(0).normalize();
      this.moveToward(this.group.position.clone().add(away.multiplyScalar(4)), this.difficulty.speed * 0.9, delta);
    } else {
      this.strafeAround(targetEye, delta);
    }

    if (hasLos && distance < 3) {
      this.tryMelee(delta);
    } else if (hasLos && distance < 44) {
      this.tryShoot(targetEye, distance, delta);
    }
  }

  tryMelee(delta) {
    this.reactionTimer -= delta;
    if (this.reactionTimer > 0 || this.fireTimer > 0) return;

    this.manager.botMelee(this, this.target);
    this.fireTimer = 0.8;
    this.reactionTimer = this.difficulty.reaction * 0.5;
  }

  tryShoot(targetEye, distance, delta) {
    this.reactionTimer -= delta;
    if (this.reactionTimer > 0 || this.fireTimer > 0) return;

    const distancePenalty = Math.max(0.35, 1 - distance / 70);
    const accuracy = this.difficulty.accuracy * distancePenalty;
    this.manager.botShoot(this, this.target, accuracy);
    this.fireTimer = this.difficulty.fireDelay * randRange(0.82, 1.34);
    this.reactionTimer = this.difficulty.reaction * randRange(0.2, 0.65);
  }

  moveToward(target, speed, delta) {
    const direction = new THREE.Vector3().subVectors(target, this.group.position);
    direction.y = 0;
    if (direction.lengthSq() < 0.04) return;
    direction.normalize();

    const yaw = Math.atan2(direction.x, direction.z);
    this.group.rotation.y += normalizeAngle(yaw - this.group.rotation.y) * Math.min(1, delta * 7);

    const step = direction.multiplyScalar(speed * delta);
    this.tryMove(step.x, 0);
    this.tryMove(0, step.z);

    const groundY = this.world.getGroundY(this.group.position, 0.42);
    this.group.position.y = groundY;
  }

  strafeAround(targetEye, delta) {
    const toTarget = new THREE.Vector3().subVectors(targetEye, this.group.position).setY(0).normalize();
    const strafe = new THREE.Vector3(-toTarget.z, 0, toTarget.x);
    if (Number(this.id.replace("bot-", "")) % 2 === 0) {
      strafe.multiplyScalar(-1);
    }
    const destination = this.group.position.clone().add(strafe.multiplyScalar(3.6));
    this.moveToward(destination, this.difficulty.speed * 0.5, delta);
    const yaw = Math.atan2(toTarget.x, toTarget.z);
    this.group.rotation.y += normalizeAngle(yaw - this.group.rotation.y) * Math.min(1, delta * 8);
  }

  tryMove(dx, dz) {
    const candidate = this.group.position.clone();
    candidate.x += dx;
    candidate.z += dz;
    const eye = candidate.clone();
    eye.y += 1.72;
    if (this.world.isPlayerAreaClear(eye, 1.72, 0.42)) {
      this.group.position.copy(candidate);
    }
  }

  getEyePosition() {
    return this.group.position.clone().add(new THREE.Vector3(0, 1.45, 0));
  }

  receiveDamage(amount, source) {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    this.hitFlash = 0.12;
    if (this.health <= 0) {
      this.alive = false;
      this.manager.killBot(this, source);
      return true;
    }
    if (source?.position) {
      this.pathTarget = this.world.getCoverPoint(this.group.position, source.position);
      this.coverTimer = randRange(0.6, 1.6);
    }
    return false;
  }

  dispose() {
    this.manager.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
    });
  }
}

export class BotManager {
  constructor(scene, world, state, audio, effects) {
    this.scene = scene;
    this.world = world;
    this.state = state;
    this.audio = audio;
    this.effects = effects;
    this.bots = [];
    this.player = null;
    this.raycaster = new THREE.Raycaster();
    this.waveCooldown = 0;
  }

  setPlayer(player) {
    this.player = player;
  }

  restart(mode = this.state.mode) {
    this.removeAll();
    this.state.mode = mode;
    this.state.wave = 1;
    this.waveCooldown = 0;

    if (mode === "tdm") {
      const enemyCount = Math.ceil(GAME_CONFIG.bots.teamCount / 2);
      const friendlyCount = Math.max(3, Math.floor(GAME_CONFIG.bots.teamCount / 2) - 1);
      for (let i = 0; i < enemyCount; i += 1) this.spawnBot(GAME_CONFIG.teams.enemy.id);
      for (let i = 0; i < friendlyCount; i += 1) this.spawnBot(GAME_CONFIG.teams.player.id);
    } else if (mode === "gunGame") {
      for (let i = 0; i < GAME_CONFIG.bots.startingCount + 3; i += 1) this.spawnBot(GAME_CONFIG.teams.neutral.id);
    } else if (mode === "survival") {
      for (let i = 0; i < GAME_CONFIG.bots.survivalStart; i += 1) this.spawnBot(GAME_CONFIG.teams.enemy.id);
    } else {
      for (let i = 0; i < GAME_CONFIG.bots.startingCount; i += 1) this.spawnBot(GAME_CONFIG.teams.neutral.id);
    }

    this.updateCounts();
  }

  update(delta) {
    for (const bot of this.bots) {
      bot.update(delta);
    }

    if (this.state.mode === "survival" && this.state.status === "running") {
      const hostiles = this.bots.filter((bot) => bot.alive && bot.team === GAME_CONFIG.teams.enemy.id).length;
      if (hostiles === 0) {
        this.waveCooldown -= delta;
        if (this.waveCooldown <= 0) {
          this.state.wave += 1;
          const count = GAME_CONFIG.bots.survivalStart + this.state.wave * 2;
          for (let i = 0; i < count; i += 1) this.spawnBot(GAME_CONFIG.teams.enemy.id);
          this.state.events.emit("system-message", { text: `Wave ${this.state.wave}` });
          this.waveCooldown = 2;
        }
      } else {
        this.waveCooldown = 1.2;
      }
    }

    if (this.state.mode === "gunGame" && this.state.status === "running") {
      const hostiles = this.bots.filter((bot) => bot.alive && bot.team === GAME_CONFIG.teams.neutral.id).length;
      if (hostiles < 5) {
        for (let i = hostiles; i < 8; i += 1) {
          this.spawnBot(GAME_CONFIG.teams.neutral.id);
        }
      }
    }

    this.updateCounts();
  }

  spawnBot(team = GAME_CONFIG.teams.enemy.id) {
    const spawnKey =
      team === GAME_CONFIG.teams.player.id ? "player" : team === GAME_CONFIG.teams.enemy.id ? "enemy" : "neutral";
    const spawn = this.world.getRandomSpawn(spawnKey);
    const bot = new Bot(this, team, spawn);
    this.bots.push(bot);
    this.updateCounts();
    return bot;
  }

  removeAll() {
    for (const bot of this.bots) {
      bot.dispose();
    }
    this.bots = [];
    this.updateCounts();
  }

  updateCounts() {
    this.state.bots.active = this.bots.length;
    this.state.bots.alive = this.bots.filter((bot) => bot.alive).length;
  }

  damageBot(bot, amount, source) {
    return bot.receiveDamage(amount, source);
  }

  killBot(bot, source = {}) {
    bot.group.visible = false;
    this.effects.spawnImpact(bot.getEyePosition(), "#ff6159");

    const killerName = source.name || "Unknown";
    this.state.killFeed.unshift({
      killer: killerName,
      victim: bot.name,
      weapon: source.weapon?.name || "rifle",
      time: performance.now()
    });
    this.state.killFeed = this.state.killFeed.slice(0, 6);

    if (source.type === "player") {
      this.state.player.kills += 1;
      this.state.player.score += 100;
      this.state.match.teamScores[this.state.player.team] += 1;
      this.state.events.emit("player-kill", {
        victim: bot,
        weapon: source.weapon,
        source
      });
    } else if (source.team) {
      this.state.match.teamScores[source.team] = (this.state.match.teamScores[source.team] || 0) + 1;
    }

    this.state.events.emit("kill-feed", {});
    this.updateCounts();
  }

  findTarget(bot) {
    const candidates = [];
    const playerActor = this.player?.getActor();
    if (playerActor?.alive() && this.canDamage(bot, playerActor)) {
      candidates.push(playerActor);
    }

    for (const other of this.bots) {
      if (other === bot || !other.alive) continue;
      if (this.canDamage(bot, other)) {
        candidates.push(other);
      }
    }

    if (!candidates.length) return null;

    let best = null;
    let bestScore = Infinity;
    const botEye = bot.getEyePosition();
    for (const candidate of candidates) {
      const targetEye = this.getActorEyePosition(candidate);
      const distance = botEye.distanceTo(targetEye);
      const visibleBonus = this.world.hasLineOfSight(botEye, targetEye) ? -10 : 0;
      const playerBias = candidate.isPlayer ? -5 : 0;
      const score = distance + visibleBonus + playerBias + Math.random() * 4;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }

  canDamage(shooter, target) {
    const shooterTeam = shooter.team;
    const targetTeam = target.team;
    if (this.state.mode === "ffa" || this.state.mode === "gunGame") {
      return shooter.id !== target.id;
    }
    return shooterTeam !== targetTeam;
  }

  getActorEyePosition(actor) {
    if (actor.isPlayer) return actor.getEyePosition();
    return actor.getEyePosition();
  }

  botMelee(bot, target) {
    const amount = bot.difficulty.damage * 3;
    if (target.isPlayer) {
      target.receiveDamage(amount, bot.group.position.clone(), true);
    } else {
      target.receiveDamage(amount, {
        type: "bot",
        name: bot.name,
        team: bot.team,
        position: bot.group.position.clone(),
        melee: true
      });
    }
  }

  botShoot(bot, target, accuracy) {
    const origin = bot.getEyePosition();
    const targetEye = this.getActorEyePosition(target);
    const direction = new THREE.Vector3().subVectors(targetEye, origin).normalize();
    const miss = (1 - accuracy) * randRange(0.15, 1.1);
    direction.x += randRange(-miss, miss) * 0.08;
    direction.y += randRange(-miss, miss) * 0.04;
    direction.z += randRange(-miss, miss) * 0.08;
    direction.normalize();

    const maxDistance = origin.distanceTo(targetEye) + 1.2;
    const obstacle = this.world.raycastObstacles(new THREE.Ray(origin, direction), maxDistance);
    const hitPoint = obstacle?.point || origin.clone().add(direction.multiplyScalar(maxDistance));
    this.effects.spawnTracer(origin, hitPoint, bot.team === GAME_CONFIG.teams.player.id ? GAME_CONFIG.teams.player.color : GAME_CONFIG.teams.enemy.color);
    this.audio.botShoot();

    if (obstacle && obstacle.distance < maxDistance - 1) return;
    if (Math.random() > accuracy + 0.18) return;

    const amount = bot.difficulty.damage * randRange(0.75, 1.25);
    if (target.isPlayer) {
      target.receiveDamage(amount, origin);
    } else {
      target.receiveDamage(amount, {
        type: "bot",
        name: bot.name,
        team: bot.team,
        position: bot.group.position.clone()
      });
    }
  }

  raycastShootable(ray, maxDistance, shooterTeam) {
    this.raycaster.ray.copy(ray);
    this.raycaster.far = maxDistance;
    const meshes = this.bots
      .filter((bot) => bot.alive && this.canPlayerDamageBot(shooterTeam, bot))
      .map((bot) => {
        bot.group.updateMatrixWorld(true);
        return bot.hitMesh;
      });
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const hit = hits[0];
    return {
      bot: hit.object.userData.bot,
      point: hit.point,
      distance: hit.distance
    };
  }

  canPlayerDamageBot(shooterTeam, bot) {
    if (this.state.mode === "ffa" || this.state.mode === "gunGame") return true;
    return shooterTeam !== bot.team;
  }

  setDifficulty(difficulty) {
    if (!GAME_CONFIG.bots.difficulties[difficulty]) return;
    this.state.bots.difficulty = difficulty;
    this.state.events.emit("system-message", {
      text: GAME_CONFIG.bots.difficulties[difficulty].label
    });
  }
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}
