// Géométrie partagée par toutes les balles (créée une seule fois)
const bulletGeometry = new THREE.SphereGeometry(3, 8, 8);

// NOUVEAU : un matériau par couleur, partagé aussi (une couleur par joueur)
const bulletMaterials = {};
function bulletMaterialFor(color) {
  if (!bulletMaterials[color]) {
    bulletMaterials[color] = new THREE.MeshBasicMaterial({ color });
  }
  return bulletMaterials[color];
}

class Bullet {
  // NOUVEAU : on reçoit le propriétaire (owner) et la couleur
  constructor(x, y, angle, owner, color = 0xffd54a) {
    this.x = x;
    this.y = y; // toujours en 2D : ce y devient z dans le monde 3D
    this.speed = 10;
    this.radius = 3;
    this.mesh = null;

    this.owner = owner;
    this.color = color;
    this.damage = 10; // NOUVEAU : points de vie retirés à la cible

    // Vitesse par axe : un rebond = changer le signe de vx ou de vy
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    this.bounces = 0;
    this.maxBounces = 3;
    this.dead = false;
  }

  hitsAny(obstacles) {
    return obstacles.some((o) => o.collidesWith(this.x, this.y, this.radius));
  }

  update(obstacles) {
    this.x += this.vx;
    if (this.hitsAny(obstacles)) {
      this.x -= this.vx;
      this.vx = -this.vx;
      this.bounces++;
    }

    this.y += this.vy;
    if (this.hitsAny(obstacles)) {
      this.y -= this.vy;
      this.vy = -this.vy;
      this.bounces++;
    }

    if (this.bounces > this.maxBounces) this.dead = true;
  }

  // NOUVEAU : vrai si la balle touche ce personnage (cercle contre cercle).
  // Marche pour TOUS les personnages, y compris celui qui a tiré.
  hits(character) {
    const dx = this.x - character.x;
    const dy = this.y - character.y;
    const r = this.radius + character.hitRadius;
    return dx * dx + dy * dy < r * r;
  }

  toMesh() {
    this.mesh = new THREE.Mesh(bulletGeometry, bulletMaterialFor(this.color));
    this.syncMesh();
    return this.mesh;
  }

  syncMesh() {
    this.mesh.position.set(this.x, 36, this.y);
  }

  // NOUVEAU : le terrain, c'est maintenant toute la maison (WORLD x WORLD)
  isOutside() {
    return this.x < 0 || this.x > WORLD || this.y < 0 || this.y > WORLD;
  }
}
