import * as THREE from "three";

export class Effects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.impactPool = [];
    this.tracerPool = [];
    this.activeImpacts = [];
    this.activeTracers = [];
    this.muzzleLight = new THREE.PointLight("#d8f6ff", 0, 4);
    this.weaponGroup = this.createWeaponModel();
    this.camera.add(this.weaponGroup);
    this.weaponGroup.add(this.muzzleLight);
  }

  createWeaponModel() {
    const group = new THREE.Group();
    group.position.set(0.34, -0.32, -0.72);
    group.rotation.set(-0.045, -0.05, 0.02);

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: "#2a2f33",
      roughness: 0.55,
      metalness: 0.38
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: "#8be9fd",
      roughness: 0.35,
      metalness: 0.6,
      emissive: "#0d3540",
      emissiveIntensity: 0.4
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.7), baseMaterial);
    body.castShadow = true;
    group.add(body);

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.42), baseMaterial);
    barrel.position.set(0, 0.012, -0.52);
    barrel.castShadow = true;
    group.add(barrel);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.32), accentMaterial);
    rail.position.set(0, 0.1, -0.08);
    rail.castShadow = true;
    group.add(rail);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.12), baseMaterial);
    grip.position.set(0, -0.18, 0.18);
    grip.rotation.x = 0.28;
    group.add(grip);

    this.muzzleAnchor = new THREE.Object3D();
    this.muzzleAnchor.position.set(0, 0.02, -0.77);
    group.add(this.muzzleAnchor);
    this.weaponAccentMaterial = accentMaterial;

    return group;
  }

  setWeapon(weapon) {
    if (this.weaponAccentMaterial) {
      this.weaponAccentMaterial.color.set(weapon.color);
      this.weaponAccentMaterial.emissive.set(weapon.color);
    }
    const scale = weapon.role.includes("sniper") || weapon.role.includes("machine") ? 1.12 : weapon.role.includes("shotgun") ? 1.06 : weapon.role.includes("sidearm") ? 0.82 : 1;
    this.weaponGroup.scale.set(scale, scale, scale);
  }

  muzzleFlash(weapon) {
    this.muzzleLight.color.set(weapon.muzzleColor);
    this.muzzleLight.intensity = 2.8;
    this.weaponGroup.position.z = -0.68 + weapon.recoil * 1.7;
  }

  spawnImpact(position, color = "#d7e4e8") {
    const mesh = this.impactPool.pop() || new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
    );
    mesh.position.copy(position);
    mesh.material.color.set(color);
    mesh.material.opacity = 1;
    mesh.visible = true;
    this.scene.add(mesh);
    this.activeImpacts.push({ mesh, life: 0.28, maxLife: 0.28 });
  }

  spawnTracer(from, to, color = "#d8f6ff") {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = this.tracerPool.pop() || new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 })
    );
    line.geometry.dispose();
    line.geometry = geometry;
    line.material.color.set(color);
    line.material.opacity = 0.55;
    line.visible = true;
    this.scene.add(line);
    this.activeTracers.push({ line, life: 0.055, maxLife: 0.055 });
  }

  update(delta) {
    this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - delta * 18);
    this.weaponGroup.position.lerp(new THREE.Vector3(0.34, -0.32, -0.72), Math.min(1, delta * 16));

    for (let i = this.activeImpacts.length - 1; i >= 0; i -= 1) {
      const impact = this.activeImpacts[i];
      impact.life -= delta;
      impact.mesh.scale.setScalar(1 + (impact.maxLife - impact.life) * 5);
      impact.mesh.material.opacity = Math.max(0, impact.life / impact.maxLife);
      if (impact.life <= 0) {
        impact.mesh.visible = false;
        this.scene.remove(impact.mesh);
        this.impactPool.push(impact.mesh);
        this.activeImpacts.splice(i, 1);
      }
    }

    for (let i = this.activeTracers.length - 1; i >= 0; i -= 1) {
      const tracer = this.activeTracers[i];
      tracer.life -= delta;
      tracer.line.material.opacity = Math.max(0, 0.55 * (tracer.life / tracer.maxLife));
      if (tracer.life <= 0) {
        tracer.line.visible = false;
        this.scene.remove(tracer.line);
        this.tracerPool.push(tracer.line);
        this.activeTracers.splice(i, 1);
      }
    }
  }
}
