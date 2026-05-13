import * as THREE from "three";
import { clamp, randRange } from "../core/math.js";
import { resetWeaponAmmo } from "../core/state.js";

export class WeaponSystem {
  constructor(camera, state, input, world, effects, audio, player) {
    this.camera = camera;
    this.state = state;
    this.input = input;
    this.world = world;
    this.effects = effects;
    this.audio = audio;
    this.player = player;
    this.activeIndex = 0;
    this.fireCooldown = 0;
    this.reloadTimer = 0;
    this.reloading = false;
    this.raycaster = new THREE.Raycaster();
    this.botManager = null;
    this.dynamicSpread = 0;
    this.spreadRecoveryRate = 0.06;
    this.spreadBuildupRate = 0.4;
    this.effects.setWeapon(this.currentWeapon);
  }

  setBotManager(botManager) {
    this.botManager = botManager;
  }

  get currentWeapon() {
    return this.state.weapons[this.activeIndex];
  }

  getEffectiveSpread() {
    const weapon = this.currentWeapon;
    const baseSpread = weapon.spread;
    const aiming = this.state.player.aiming;
    const moving = this.state.player.moving;
    const crouching = this.state.player.crouching;

    let spread = baseSpread + this.dynamicSpread;
    if (aiming) spread *= weapon.adsSpreadMult ?? 0.4;
    if (moving) spread *= 1.3;
    if (crouching) spread *= 0.7;
    return spread;
  }

  update(delta) {
    this.fireCooldown = Math.max(0, this.fireCooldown - delta);

    this.dynamicSpread = Math.max(0, this.dynamicSpread - this.spreadRecoveryRate * delta);

    if (this.reloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.finishReload();
      }
    }

    if (this.state.mode !== "gunGame") {
      for (let i = 0; i < this.state.weapons.length; i += 1) {
        const weapon = this.state.weapons[i];
        if (weapon.slot && this.input.wasPressed(weapon.slot) && weapon.unlocked) {
          this.switchTo(i);
        }
      }
    }

    if (this.input.wasPressed("r")) {
      this.reload();
    }

    this.state.player.aiming = this.input.isMouseDown(2);

    if (!this.state.player.alive || this.state.status !== "running" || this.state.admin.open) return;

    const weapon = this.currentWeapon;
    const keyboardFire = this.input.isDown("f") || this.input.wasPressed("f");
    const wantsFire = weapon.automatic
      ? this.input.isMouseDown(0) || this.input.wasMousePressed(0) || keyboardFire
      : this.input.wasMousePressed(0) || this.input.wasPressed("f");
    if (wantsFire) {
      this.fire();
    }
  }

  switchTo(indexOrId) {
    const index =
      typeof indexOrId === "string"
        ? this.state.weapons.findIndex((weapon) => weapon.id === indexOrId)
        : indexOrId;
    if (index < 0 || !this.state.weapons[index]?.unlocked) return;
    this.activeIndex = index;
    this.reloading = false;
    this.fireCooldown = 0.12;
    this.dynamicSpread = 0;
    this.effects.setWeapon(this.currentWeapon);
    this.state.events.emit("weapon-changed", { weapon: this.currentWeapon });
  }

  setupForMode(mode) {
    this.reloading = false;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.dynamicSpread = 0;

    if (mode === "gunGame") {
      this.state.gunGame.weaponIndex = 0;
      this.state.gunGame.ladderComplete = false;
      this.state.gunGame.lastPromotion = "";
      this.switchTo(0);
      this.refillCurrentWeapon();
      this.state.events.emit("gun-game-advanced", {
        weapon: this.currentWeapon,
        index: 0,
        total: this.state.weapons.length
      });
      return;
    }

    this.switchTo(0);
  }

  advanceGunGame() {
    if (this.state.mode !== "gunGame") return false;

    const nextIndex = this.state.gunGame.weaponIndex + 1;
    if (nextIndex >= this.state.weapons.length) {
      this.state.gunGame.ladderComplete = true;
      this.state.gunGame.lastPromotion = "Ladder complete";
      return true;
    }

    this.state.gunGame.weaponIndex = nextIndex;
    this.switchTo(nextIndex);
    this.refillCurrentWeapon();
    this.state.gunGame.lastPromotion = this.currentWeapon.name;
    this.state.events.emit("gun-game-advanced", {
      weapon: this.currentWeapon,
      index: nextIndex,
      total: this.state.weapons.length
    });
    this.state.events.emit("system-message", {
      text: `Gun Game: ${this.currentWeapon.name}`
    });
    return false;
  }

  refillCurrentWeapon() {
    const weapon = this.currentWeapon;
    weapon.currentAmmo = weapon.magazineSize;
    weapon.reserveAmmo = Math.max(weapon.reserveAmmo, weapon.magazineSize * Math.max(2, weapon.reserveMags));
  }

  fire() {
    const weapon = this.currentWeapon;
    if (this.reloading || this.fireCooldown > 0) return;

    if (weapon.currentAmmo <= 0) {
      this.reload();
      return;
    }

    weapon.currentAmmo -= 1;
    this.fireCooldown = weapon.fireRate / 1000;
    this.audio.shoot(weapon);
    this.effects.muzzleFlash(weapon);

    const recoilMult = this.state.player.aiming ? 0.6 : 1;
    this.player.addCameraKick(weapon.recoil * recoilMult);

    this.dynamicSpread = clamp(
      this.dynamicSpread + weapon.spread * this.spreadBuildupRate,
      0,
      weapon.spread * 2.5
    );

    const effectiveSpread = this.getEffectiveSpread();

    let didHitBot = false;
    for (let i = 0; i < weapon.pellets; i += 1) {
      const ray = this.createShotRay(effectiveSpread);
      const hit = this.resolveRaycast(ray, weapon);
      if (hit?.botHit) {
        didHitBot = true;
      }
    }

    if (didHitBot) {
      this.audio.hit();
      this.state.events.emit("hit-marker", {});
    }
  }

  createShotRay(spread) {
    const origin = this.camera.position.clone();
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    direction
      .addScaledVector(right, randRange(-spread, spread))
      .addScaledVector(up, randRange(-spread, spread))
      .normalize();
    return new THREE.Ray(origin, direction);
  }

  resolveRaycast(ray, weapon) {
    const obstacle = this.world.raycastObstacles(ray, weapon.range);
    const botHit = this.botManager?.raycastShootable(ray, weapon.range, this.state.player.team);
    const obstacleDistance = obstacle?.distance ?? Infinity;
    const botDistance = botHit?.distance ?? Infinity;
    const endDistance = Math.min(obstacleDistance, botDistance, weapon.range);
    const endPoint = ray.at(endDistance, new THREE.Vector3());
    this.effects.spawnTracer(ray.origin.clone(), endPoint, weapon.muzzleColor);

    if (botHit && botDistance <= obstacleDistance + 0.05) {
      this.effects.spawnImpact(botHit.point, "#ffb3a8");
      this.botManager.damageBot(botHit.bot, weapon.damage, {
        type: "player",
        name: "You",
        team: this.state.player.team,
        position: this.camera.position.clone(),
        weapon
      });
      return { botHit };
    }

    if (obstacle) {
      this.effects.spawnImpact(obstacle.point, "#d7e4e8");
    }

    return null;
  }

  reload() {
    const weapon = this.currentWeapon;
    if (this.reloading || weapon.currentAmmo >= weapon.magazineSize || weapon.reserveAmmo <= 0) return;
    this.reloading = true;
    this.reloadTimer = weapon.reloadTime;
    this.audio.reload();
    this.state.events.emit("reload-started", { weapon });
  }

  finishReload() {
    const weapon = this.currentWeapon;
    const needed = weapon.magazineSize - weapon.currentAmmo;
    const moved = Math.min(needed, weapon.reserveAmmo);
    weapon.currentAmmo += moved;
    weapon.reserveAmmo -= moved;
    this.reloading = false;
    this.state.events.emit("reload-finished", { weapon });
  }

  giveAmmo() {
    for (const weapon of this.state.weapons) {
      weapon.reserveAmmo = Math.max(weapon.reserveAmmo, weapon.magazineSize * weapon.reserveMags);
      weapon.currentAmmo = weapon.magazineSize;
    }
    this.state.events.emit("system-message", { text: "Ammo stocked" });
  }

  resetAmmo() {
    resetWeaponAmmo(this.state);
  }

  updateWeaponTuning(id, field, value) {
    const weapon = this.state.weapons.find((entry) => entry.id === id);
    if (!weapon) return;
    weapon[field] = Number(value);
    if (field === "magazineSize") {
      weapon.currentAmmo = Math.min(weapon.currentAmmo, weapon.magazineSize);
    }
    if (weapon.id === this.currentWeapon.id) {
      this.effects.setWeapon(weapon);
    }
  }

  unlockAll() {
    for (const weapon of this.state.weapons) {
      weapon.unlocked = true;
    }
    this.state.events.emit("system-message", { text: "Weapons unlocked" });
  }
}
