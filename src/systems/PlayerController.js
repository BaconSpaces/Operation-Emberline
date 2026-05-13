import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { GAME_CONFIG } from "../core/config.js";
import { clamp } from "../core/math.js";
import { resetPlayerState } from "../core/state.js";

export class PlayerController {
  constructor(camera, domElement, input, world, state, audio) {
    this.camera = camera;
    this.domElement = domElement;
    this.input = input;
    this.world = world;
    this.state = state;
    this.audio = audio;
    this.controls = new PointerLockControls(camera, domElement);
    this.velocityY = 0;
    this.currentHeight = GAME_CONFIG.player.height;
    this.respawnTimer = 0;
    this.fallbackAimEnabled = false;
    this.fallbackLookActive = false;
    this.fallbackMouseHasMoved = false;
    this.lookSensitivity = 0.0022;
    this.lookEuler = new THREE.Euler(0, 0, 0, "YXZ");
    this.lastSafePosition = world.getRandomSpawn("player");
    this.camera.position.copy(this.lastSafePosition);

    this.controls.addEventListener("lock", () => {
      this.state.events.emit("pointer-lock", { locked: true });
    });
    this.controls.addEventListener("unlock", () => {
      this.state.events.emit("pointer-lock", { locked: false });
    });

    domElement.addEventListener("click", () => {
      if (!this.state.admin.open && this.state.status !== "ended") {
        this.lock();
      }
    });

    domElement.addEventListener("pointerdown", (event) => {
      if (this.controls.isLocked || !this.canUseFallbackLook()) return;
      if (this.fallbackAimEnabled || !this.canAttemptPointerLock()) {
        this.fallbackAimEnabled = true;
        this.fallbackLookActive = true;
        try {
          this.domElement.setPointerCapture?.(event.pointerId);
        } catch {
          // Pointer capture can fail in embedded browsers; drag look still works while events arrive.
        }
        this.state.events.emit("system-message", { text: "Mouse aim active" });
      }
    });

    domElement.addEventListener("pointermove", (event) => {
      if (!this.fallbackLookActive || this.controls.isLocked || !this.canUseFallbackLook()) return;
      this.rotateCamera(event.movementX || 0, event.movementY || 0);
      event.preventDefault();
    });

    window.addEventListener("mousemove", (event) => {
      if (!this.fallbackAimEnabled || this.controls.isLocked || !this.canUseFallbackLook()) return;
      this.rotateCamera(event.movementX || 0, event.movementY || 0);
      if (!this.fallbackMouseHasMoved && (event.movementX !== 0 || event.movementY !== 0)) {
        this.fallbackMouseHasMoved = true;
        this.state.events.emit("system-message", { text: "Mouse aim active" });
      }
    });

    window.addEventListener("pointerup", (event) => {
      this.fallbackLookActive = false;
      try {
        this.domElement.releasePointerCapture?.(event.pointerId);
      } catch {
        // No active capture to release.
      }
    });

    window.addEventListener("pointercancel", () => {
      this.fallbackLookActive = false;
    });
  }

  lock() {
    if (this.controls.isLocked || this.state.admin.open) return;
    if (!this.canAttemptPointerLock()) {
      this.fallbackAimEnabled = true;
      this.state.events.emit("pointer-lock", { locked: false });
      this.state.events.emit("system-message", { text: "Mouse aim active" });
      return;
    }

    try {
      const lockRequest = this.domElement.requestPointerLock({ unadjustedMovement: false });
      if (lockRequest?.catch) {
        lockRequest.catch(() => {
          this.fallbackAimEnabled = true;
          this.state.events.emit("pointer-lock", { locked: false });
          this.state.events.emit("system-message", { text: "Mouse aim active" });
        });
      }
    } catch {
      this.fallbackAimEnabled = true;
      this.state.events.emit("pointer-lock", { locked: false });
      this.state.events.emit("system-message", { text: "Mouse aim active" });
    }
  }

  unlock() {
    if (this.controls.isLocked && this.domElement.ownerDocument.exitPointerLock) {
      this.controls.unlock();
    }
  }

  canAttemptPointerLock() {
    if (!this.domElement.requestPointerLock) return false;
    try {
      if (window.self !== window.top) return false;
    } catch {
      return false;
    }
    const policy = document.featurePolicy || document.permissionsPolicy;
    if (policy?.allowsFeature && !policy.allowsFeature("pointer-lock")) return false;
    return true;
  }

  canUseFallbackLook() {
    return this.state.status === "running" && this.state.player.alive && !this.state.admin.open;
  }

  rotateCamera(movementX, movementY) {
    if (movementX === 0 && movementY === 0) return;
    this.lookEuler.setFromQuaternion(this.camera.quaternion);
    this.lookEuler.y -= movementX * this.lookSensitivity;
    this.lookEuler.x -= movementY * this.lookSensitivity;
    this.lookEuler.x = clamp(this.lookEuler.x, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
    this.camera.quaternion.setFromEuler(this.lookEuler);
  }

  setPosition(position) {
    this.camera.position.copy(position);
    this.velocityY = 0;
    this.lastSafePosition.copy(position);
  }

  teleportTo(position) {
    this.setPosition(position);
    this.state.events.emit("system-message", { text: "Teleported" });
  }

  update(delta, now) {
    if (this.state.status === "paused") {
      return;
    }

    if (this.state.player.spawnShield > 0) {
      this.state.player.spawnShield = Math.max(0, this.state.player.spawnShield - delta);
    }

    if (!this.state.player.alive) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    if (!this.controls.isLocked && !this.state.player.noClip && !this.fallbackAimEnabled) {
      this.updateVerticalOnly(delta);
      return;
    }

    if (this.state.player.noClip) {
      this.updateNoClip(delta);
      return;
    }

    this.updateMovement(delta, now);
  }

  updateNoClip(delta) {
    const speed = GAME_CONFIG.player.walkSpeed * 2.3 * this.state.player.speedMultiplier;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const forward = new THREE.Vector3(direction.x, 0, direction.z).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
    const movement = new THREE.Vector3();

    if (this.input.isDown("w")) movement.add(forward);
    if (this.input.isDown("s")) movement.sub(forward);
    if (this.input.isDown("d")) movement.add(right);
    if (this.input.isDown("a")) movement.sub(right);
    if (this.input.isDown("space")) movement.y += 1;
    if (this.input.isDown("control") || this.input.isDown("c")) movement.y -= 1;

    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(speed * delta);
      this.camera.position.add(movement);
    }
  }

  updateVerticalOnly(delta) {
    const radius = GAME_CONFIG.player.radius;
    const feet = new THREE.Vector3(
      this.camera.position.x,
      this.camera.position.y - this.currentHeight,
      this.camera.position.z
    );
    const groundY = this.world.getGroundY(feet, radius);
    this.velocityY -= GAME_CONFIG.gravity * delta;
    this.camera.position.y += this.velocityY * delta;
    if (this.camera.position.y - this.currentHeight <= groundY) {
      this.camera.position.y = groundY + this.currentHeight;
      this.velocityY = 0;
    }
  }

  updateMovement(delta, now) {
    const playerConfig = GAME_CONFIG.player;
    const radius = playerConfig.radius;
    const wantCrouch = this.input.isDown("c") || this.input.isDown("control");
    const fullHeight = playerConfig.height;
    const crouchHeight = playerConfig.crouchHeight;
    const targetHeight = wantCrouch ? crouchHeight : fullHeight;

    if (targetHeight > this.currentHeight) {
      const standEye = this.camera.position.clone();
      standEye.y += targetHeight - this.currentHeight;
      if (this.world.isPlayerAreaClear(standEye, targetHeight, radius)) {
        this.currentHeight += (targetHeight - this.currentHeight) * Math.min(1, delta * 12);
      }
    } else {
      this.currentHeight += (targetHeight - this.currentHeight) * Math.min(1, delta * 14);
    }

    const feet = new THREE.Vector3(
      this.camera.position.x,
      this.camera.position.y - this.currentHeight,
      this.camera.position.z
    );
    const groundY = this.world.getGroundY(feet, radius);
    const onGround = this.camera.position.y - this.currentHeight <= groundY + 0.04 && this.velocityY <= 0;
    if (onGround) {
      this.camera.position.y = groundY + this.currentHeight;
      this.velocityY = 0;
      if (this.input.wasPressed("space")) {
        this.velocityY = playerConfig.jumpImpulse;
      }
    }

    this.velocityY -= GAME_CONFIG.gravity * delta;
    const verticalCandidate = this.camera.position.clone();
    verticalCandidate.y += this.velocityY * delta;
    if (this.world.isPlayerAreaClear(verticalCandidate, this.currentHeight, radius)) {
      this.camera.position.y = verticalCandidate.y;
    } else {
      this.velocityY = 0;
    }

    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const forward = new THREE.Vector3(direction.x, 0, direction.z).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
    const movement = new THREE.Vector3();

    if (this.input.isDown("w")) movement.add(forward);
    if (this.input.isDown("s")) movement.sub(forward);
    if (this.input.isDown("d")) movement.add(right);
    if (this.input.isDown("a")) movement.sub(right);

    const moving = movement.lengthSq() > 0;
    if (moving) {
      movement.normalize();
      const sprinting = this.input.isDown("shift") && !wantCrouch && this.input.isDown("w");
      const speed =
        playerConfig.walkSpeed *
        this.state.player.speedMultiplier *
        (sprinting ? playerConfig.sprintMultiplier : 1) *
        (wantCrouch ? playerConfig.crouchMultiplier : 1);
      const step = movement.multiplyScalar(speed * delta);
      this.tryMove(step.x, 0, radius);
      this.tryMove(0, step.z, radius);
      if (onGround) {
        this.audio.footstep(now, sprinting);
      }
    }

    if (this.camera.position.y < -12) {
      this.setPosition(this.lastSafePosition);
    } else if (this.world.isPlayerAreaClear(this.camera.position, this.currentHeight, radius)) {
      this.lastSafePosition.copy(this.camera.position);
    }
  }

  tryMove(dx, dz, radius) {
    if (dx === 0 && dz === 0) return;
    const candidate = this.camera.position.clone();
    candidate.x += dx;
    candidate.z += dz;
    if (this.world.isPlayerAreaClear(candidate, this.currentHeight, radius)) {
      this.camera.position.copy(candidate);
    }
  }

  applyDamage(amount, fromPosition = null) {
    const player = this.state.player;
    if (!player.alive || player.godMode || player.spawnShield > 0) return false;

    const armorHit = Math.min(player.armor, amount * 0.58);
    const healthHit = amount - armorHit * 0.72;
    player.armor = Math.max(0, player.armor - armorHit);
    player.health = Math.max(0, player.health - healthHit);
    this.audio.damage();
    this.state.events.emit("player-damaged", {
      health: player.health,
      armor: player.armor,
      fromPosition
    });

    if (player.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  heal() {
    this.state.player.health = GAME_CONFIG.player.maxHealth;
    this.state.player.armor = GAME_CONFIG.player.maxArmor;
    this.state.events.emit("system-message", { text: "Vitals restored" });
  }

  die() {
    const player = this.state.player;
    player.alive = false;
    player.deaths += 1;
    this.respawnTimer = GAME_CONFIG.player.respawnDelay;
    this.unlock();
    this.state.events.emit("player-died", { delay: this.respawnTimer });
  }

  respawn() {
    resetPlayerState(this.state);
    this.currentHeight = GAME_CONFIG.player.height;
    this.setPosition(this.world.getRandomSpawn("player"));
    this.state.events.emit("player-respawned", {});
  }

  getActor() {
    return {
      id: "player",
      name: "You",
      team: this.state.player.team,
      isPlayer: true,
      alive: () => this.state.player.alive,
      getPosition: () => this.camera.position.clone(),
      getEyePosition: () => this.camera.position.clone(),
      receiveDamage: (amount, sourcePosition) => this.applyDamage(amount, sourcePosition)
    };
  }

  addCameraKick(amount) {
    this.camera.rotation.x = clamp(this.camera.rotation.x - amount, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
  }
}
