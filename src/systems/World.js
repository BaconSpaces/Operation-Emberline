import * as THREE from "three";
import { GAME_CONFIG } from "../core/config.js";
import { randomItem } from "../core/math.js";

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "Emberline Training District";
    this.colliders = [];
    this.occluderMeshes = [];
    this.debugHelpers = [];
    this.coverPoints = [];
    this.patrolPoints = [];
    this.spawnPoints = {
      player: [],
      enemy: [],
      neutral: []
    };
    this.raycaster = new THREE.Raycaster();
    this.materials = this.createMaterials();
    scene.add(this.group);
    this.build();
  }

  createMaterials() {
    return {
      ground: new THREE.MeshStandardMaterial({ color: "#202624", roughness: 0.92, metalness: 0.06 }),
      concrete: new THREE.MeshStandardMaterial({ color: "#5a6262", roughness: 0.85, metalness: 0.04 }),
      darkConcrete: new THREE.MeshStandardMaterial({ color: "#303638", roughness: 0.88, metalness: 0.08 }),
      metal: new THREE.MeshStandardMaterial({ color: "#32383d", roughness: 0.42, metalness: 0.58 }),
      hazard: new THREE.MeshStandardMaterial({ color: "#d5a336", roughness: 0.6, metalness: 0.22 }),
      glass: new THREE.MeshStandardMaterial({
        color: "#52b4c7",
        roughness: 0.12,
        metalness: 0.02,
        transparent: true,
        opacity: 0.32,
        emissive: "#113a42",
        emissiveIntensity: 0.25
      }),
      enemyAccent: new THREE.MeshStandardMaterial({
        color: "#ff6159",
        roughness: 0.5,
        metalness: 0.35,
        emissive: "#341010",
        emissiveIntensity: 0.45
      }),
      friendlyAccent: new THREE.MeshStandardMaterial({
        color: "#59d8ff",
        roughness: 0.45,
        metalness: 0.35,
        emissive: "#0b303a",
        emissiveIntensity: 0.45
      })
    };
  }

  build() {
    this.scene.background = new THREE.Color("#0d1215");
    this.scene.fog = new THREE.Fog("#0d1215", 34, 150);

    const hemi = new THREE.HemisphereLight("#bbf3ff", "#1c1915", 1.9);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight("#ffe2b0", 2.1);
    sun.position.set(-28, 58, 24);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -75;
    sun.shadow.camera.right = 75;
    sun.shadow.camera.top = 75;
    sun.shadow.camera.bottom = -75;
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(GAME_CONFIG.worldSize, 0.1, GAME_CONFIG.worldSize),
      this.materials.ground
    );
    ground.receiveShadow = true;
    ground.position.y = -0.05;
    this.group.add(ground);

    const grid = new THREE.GridHelper(GAME_CONFIG.worldSize, 42, "#334143", "#273234");
    grid.position.y = 0.01;
    this.group.add(grid);

    this.addBounds();
    this.addBuildings();
    this.addCover();
    this.addRampsAndSignals();
    this.addSpawnAndPatrolPoints();
    this.group.updateMatrixWorld(true);
  }

  addBounds() {
    const half = GAME_CONFIG.worldSize / 2;
    this.addBox("north wall", [0, 3, -half], [GAME_CONFIG.worldSize, 6, 2], this.materials.darkConcrete, true);
    this.addBox("south wall", [0, 3, half], [GAME_CONFIG.worldSize, 6, 2], this.materials.darkConcrete, true);
    this.addBox("west wall", [-half, 3, 0], [2, 6, GAME_CONFIG.worldSize], this.materials.darkConcrete, true);
    this.addBox("east wall", [half, 3, 0], [2, 6, GAME_CONFIG.worldSize], this.materials.darkConcrete, true);
  }

  addBuildings() {
    this.addBox("west apartment block", [-42, 8, -20], [19, 16, 29], this.materials.concrete, true);
    this.addBox("east garage", [39, 6, -24], [21, 12, 24], this.materials.darkConcrete, true);
    this.addBox("low roof warehouse", [12, 3, -43], [21, 6, 17], this.materials.concrete, true);
    this.addBox("market shell", [-36, 5, 20], [20, 10, 16], this.materials.concrete, true);
    this.addBox("relay tower base", [28, 7, 27], [15, 14, 18], this.materials.darkConcrete, true);
    this.addBox("central kiosk", [0, 3, 0], [12, 6, 12], this.materials.metal, true);
    this.addBox("south data hall", [24, 4, 42], [32, 8, 12], this.materials.concrete, true);
    this.addBox("north service hall", [-8, 4, -26], [30, 8, 10], this.materials.concrete, true);

    this.addWindowBand([-42, 12, -34], [15, 1.5, 0.18]);
    this.addWindowBand([39, 8.5, -36.2], [16, 1.4, 0.18]);
    this.addWindowBand([24, 6.7, 48.15], [24, 1.4, 0.18]);
    this.addWindowBand([28, 11, 17.9], [10, 1.3, 0.18]);

    this.addBox("catwalk west", [-16, 4.2, 31], [21, 1.1, 4], this.materials.metal, true);
    this.addBox("catwalk east", [11, 4.2, 31], [21, 1.1, 4], this.materials.metal, true);
    this.addBox("catwalk bridge", [-2.5, 4.2, 31], [7, 1.1, 4], this.materials.hazard, true);
  }

  addCover() {
    const boxes = [
      [[-19, 1, -6], [5, 2, 2.3]],
      [[-23, 1, 7], [2.2, 2, 7]],
      [[16, 1, 9], [7, 2, 2.2]],
      [[31, 1, 4], [2.2, 2, 7]],
      [[-8, 1, 17], [7, 2, 2.2]],
      [[7, 1, -15], [8, 2, 2.3]],
      [[-50, 1, 35], [2.2, 2, 13]],
      [[48, 1, 34], [2.2, 2, 12]],
      [[-30, 1, -43], [10, 2, 2]],
      [[31, 1, -47], [10, 2, 2]],
      [[-3, 1, 50], [13, 2, 2.2]],
      [[41, 1, 18], [2.2, 2, 12]]
    ];

    for (const [position, size] of boxes) {
      this.addBox("cover barrier", position, size, this.materials.metal, true);
      this.coverPoints.push(new THREE.Vector3(position[0] + size[0] * 0.7, 1.8, position[2] + size[2] * 0.7));
      this.coverPoints.push(new THREE.Vector3(position[0] - size[0] * 0.7, 1.8, position[2] - size[2] * 0.7));
    }
  }

  addRampsAndSignals() {
    this.addRamp([20, 1.05, -35], [9, 0.8, 4.5], -0.38);
    this.addRamp([-21, 1.05, 27], [11, 0.8, 4.5], 0.4);
    this.addRamp([4, 1.05, 31], [8, 0.8, 4], 0);

    const beaconGeometry = new THREE.CylinderGeometry(0.18, 0.28, 5.5, 12);
    for (const point of [
      [-52, 2.75, -52],
      [52, 2.75, -52],
      [-52, 2.75, 52],
      [52, 2.75, 52],
      [0, 2.75, 23]
    ]) {
      const beacon = new THREE.Mesh(beaconGeometry, this.materials.hazard);
      beacon.position.set(...point);
      beacon.castShadow = true;
      this.group.add(beacon);

      const light = new THREE.PointLight("#ffce66", 0.7, 12);
      light.position.set(point[0], point[1] + 2.9, point[2]);
      this.group.add(light);
    }
  }

  addSpawnAndPatrolPoints() {
    this.spawnPoints.player = [
      new THREE.Vector3(0, 2, 24),
      new THREE.Vector3(-42, 2, 43),
      new THREE.Vector3(24, 2, 52),
      new THREE.Vector3(12, 8, -43)
    ];
    this.spawnPoints.enemy = [
      new THREE.Vector3(-50, 2, -48),
      new THREE.Vector3(50, 2, -48),
      new THREE.Vector3(49, 2, 30),
      new THREE.Vector3(-44, 2, 4)
    ];
    this.spawnPoints.neutral = [
      new THREE.Vector3(-35, 2, -4),
      new THREE.Vector3(34, 2, -4),
      new THREE.Vector3(-20, 2, 45),
      new THREE.Vector3(19, 2, 18),
      new THREE.Vector3(5, 2, -20)
    ];
    this.patrolPoints = [
      new THREE.Vector3(-45, 1.8, -48),
      new THREE.Vector3(-10, 1.8, -48),
      new THREE.Vector3(43, 1.8, -45),
      new THREE.Vector3(47, 1.8, 5),
      new THREE.Vector3(38, 1.8, 44),
      new THREE.Vector3(-8, 1.8, 49),
      new THREE.Vector3(-48, 1.8, 38),
      new THREE.Vector3(-45, 1.8, -2),
      new THREE.Vector3(0, 1.8, 17),
      new THREE.Vector3(18, 1.8, -12),
      new THREE.Vector3(-17, 1.8, 12)
    ];
  }

  addWindowBand(position, size) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), this.materials.glass);
    mesh.position.set(...position);
    this.group.add(mesh);
  }

  addRamp(position, size, rotationZ) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), this.materials.hazard);
    ramp.position.set(...position);
    ramp.rotation.z = rotationZ;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.group.add(ramp);
  }

  addBox(name, position, size, material, collidable = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);

    if (collidable) {
      const box = new THREE.Box3().setFromObject(mesh);
      this.colliders.push({ box, mesh, name });
      this.occluderMeshes.push(mesh);
    }
    return mesh;
  }

  setDebugColliders(visible) {
    if (!visible) {
      for (const helper of this.debugHelpers) {
        helper.visible = false;
      }
      return;
    }

    while (this.debugHelpers.length < this.colliders.length) {
      const collider = this.colliders[this.debugHelpers.length];
      const helper = new THREE.Box3Helper(collider.box, "#59d8ff");
      this.scene.add(helper);
      this.debugHelpers.push(helper);
    }

    for (const helper of this.debugHelpers) {
      helper.visible = true;
    }
  }

  getGroundY(position, radius = 0.4) {
    let groundY = 0;
    for (const collider of this.colliders) {
      const box = collider.box;
      const withinX = position.x >= box.min.x - radius && position.x <= box.max.x + radius;
      const withinZ = position.z >= box.min.z - radius && position.z <= box.max.z + radius;
      const feet = position.y;
      if (withinX && withinZ && feet >= box.max.y - 0.15 && feet <= box.max.y + 1.2) {
        groundY = Math.max(groundY, box.max.y);
      }
    }
    return groundY;
  }

  isPlayerAreaClear(eyePosition, height, radius) {
    const feetY = eyePosition.y - height;
    const half = GAME_CONFIG.worldSize / 2 - 1.2;
    if (Math.abs(eyePosition.x) > half || Math.abs(eyePosition.z) > half) {
      return false;
    }
    if (feetY < -0.2) {
      return false;
    }

    const playerBox = new THREE.Box3(
      new THREE.Vector3(eyePosition.x - radius, feetY + 0.06, eyePosition.z - radius),
      new THREE.Vector3(eyePosition.x + radius, eyePosition.y - 0.08, eyePosition.z + radius)
    );

    for (const collider of this.colliders) {
      if (playerBox.intersectsBox(collider.box)) {
        return false;
      }
    }
    return true;
  }

  raycastObstacles(ray, maxDistance) {
    this.group.updateMatrixWorld(true);
    this.raycaster.ray.copy(ray);
    this.raycaster.far = maxDistance;
    const hits = this.raycaster.intersectObjects(this.occluderMeshes, false);
    return hits.length ? hits[0] : null;
  }

  hasLineOfSight(from, to) {
    const direction = new THREE.Vector3().subVectors(to, from);
    const distance = direction.length();
    direction.normalize();
    const hit = this.raycastObstacles(new THREE.Ray(from, direction), distance);
    return !hit || hit.distance > distance - 0.55;
  }

  getCoverPoint(from, threatPosition) {
    let best = null;
    let bestScore = -Infinity;
    for (const point of this.coverPoints) {
      const distanceFromBot = from.distanceTo(point);
      if (distanceFromBot > 30) continue;
      const hidden = !this.hasLineOfSight(threatPosition, point.clone().add(new THREE.Vector3(0, 0.8, 0)));
      const score = (hidden ? 100 : 0) - distanceFromBot + Math.random() * 10;
      if (score > bestScore) {
        best = point;
        bestScore = score;
      }
    }
    return best ? best.clone() : randomItem(this.patrolPoints).clone();
  }

  getRandomSpawn(team = "neutral") {
    const points = this.spawnPoints[team] || this.spawnPoints.neutral;
    return randomItem(points).clone();
  }

  getTeleportPoint(id) {
    const config = GAME_CONFIG.teleportPoints.find((point) => point.id === id) || GAME_CONFIG.teleportPoints[0];
    return new THREE.Vector3(...config.position);
  }
}
