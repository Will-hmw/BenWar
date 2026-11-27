// Couleurs de chaque équipe (le foulard, le gilet, etc.)
const PALETTES = {
  red: {
    scarf: 0xb3261e, knot: 0x8f1d17,
    vest: 0x3d4a2e, pants: 0x4a5636, arms: 0x6b7a4a,
  },
  blue: {
    scarf: 0x1f5fbf, knot: 0x163f80,
    vest: 0x2e3d4a, pants: 0x36465a, arms: 0x4a6b7a,
  },
};

class Character {
  constructor(x, y, angle = 0) {
    this.x = x;
    this.y = y;
    this.angle = angle;

    // NOUVEAU : la vie
    this.maxHp = 100;
    this.hp = this.maxHp;

    // NOUVEAU : petit flash rouge quand on est touché (en nombre d'images)
    this.hitFlash = 0;
    this.materials = []; // rempli par toMesh()
  }

  get alive() {
    return this.hp > 0;
  }

  // NOUVEAU : recevoir des dégâts (la vie ne descend jamais sous 0)
  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 8;
  }

  // NOUVEAU : à appeler à chaque image. Allume le personnage en rouge
  // tant que hitFlash > 0, puis le remet normal.
  refreshFlash() {
    const color = this.hitFlash > 0 ? 0x772222 : 0x000000;
    if (this.hitFlash > 0) this.hitFlash--;
    this.materials.forEach((m) => m.emissive.setHex(color));
  }

  // Fabrique la guerrière en 3D. Elle regarde vers +x, comme en 2D.
  // Unités : le personnage fait environ 64 de haut (le sol est à y = 0).
  // NOUVEAU : on peut choisir la palette (équipe rouge ou bleue).
  toMesh(palette = PALETTES.red) {
    const group = new THREE.Group();
    this.materials = [];

    // Crée une forme, la colore, la place, l'ajoute au groupe.
    // On garde aussi le matériau pour le flash de dégât, et on active l'ombre.
    const add = (geometry, color, x, y, z) => {
      const material = new THREE.MeshStandardMaterial({ color });
      this.materials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); // (avant/arrière, hauteur, gauche/droite)
      mesh.castShadow = true;
      group.add(mesh);
      return mesh;
    };

    // Les jambes
    add(new THREE.BoxGeometry(9, 22, 9), palette.pants, 0, 11, -6);
    add(new THREE.BoxGeometry(9, 22, 9), palette.pants, 0, 11, 6);

    // Le torse avec le gilet
    add(new THREE.BoxGeometry(16, 24, 30), palette.vest, 0, 34, 0);

    // Les bras
    add(new THREE.BoxGeometry(18, 6, 6), palette.arms, 10, 38, 14);
    add(new THREE.BoxGeometry(14, 6, 6), palette.arms, 8, 36, -14);

    // Le fusil
    add(new THREE.BoxGeometry(34, 5, 5), 0x222222, 24, 36, 8);
    add(new THREE.BoxGeometry(14, 3, 3), 0x222222, 48, 36, 8);

    // Les mains
    add(new THREE.SphereGeometry(3.5, 8, 8), 0x6b3f24, 22, 36, 11);
    add(new THREE.SphereGeometry(3.5, 8, 8), 0x6b3f24, 12, 36, 8);

    // L'écusson du Bénin : vert, jaune, rouge
    add(new THREE.BoxGeometry(3, 3, 0.5), 0x008751, -3, 42, -15.3);
    add(new THREE.BoxGeometry(3, 3, 0.5), 0xfcd116, 0, 42, -15.3);
    add(new THREE.BoxGeometry(3, 3, 0.5), 0xe8112d, 3, 42, -15.3);

    // La tête
    add(new THREE.SphereGeometry(9, 16, 16), 0x6b3f24, 0, 55, 0);

    // Le foulard (demi-sphère)
    add(
      new THREE.SphereGeometry(10, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      palette.scarf, 0, 55.5, 0
    );

    // Le bandeau jaune
    const band = add(new THREE.TorusGeometry(9.5, 1.4, 8, 24), 0xfcd116, 0, 56, 0);
    band.rotation.x = Math.PI / 2;

    // Le nœud derrière la tête et les deux pans
    add(new THREE.SphereGeometry(4, 8, 8), palette.knot, -10, 56, 0);
    const tailA = add(new THREE.BoxGeometry(14, 2, 4), palette.knot, -17, 54, -4);
    tailA.rotation.y = 0.4;
    const tailB = add(new THREE.BoxGeometry(14, 2, 4), palette.knot, -17, 54, 4);
    tailB.rotation.y = -0.4;

    // Les lunettes tactiques
    add(new THREE.BoxGeometry(3, 4, 13), 0x111111, 8.5, 56, 0);

    return group;
  }
}
