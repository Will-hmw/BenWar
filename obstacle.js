class Obstacle {
  // NOUVEAU : chaque obstacle a sa hauteur et sa couleur
  // (un mur est haut et clair, un meuble est bas et coloré)
  constructor(x, y, w, h, height = 60, color = 0x5a4630) {
    this.x = x; // coin haut-gauche du rectangle au sol
    this.y = y;
    this.w = w;
    this.h = h;
    this.height = height;
    this.color = color;
  }

  // Inchangé : la collision se passe toujours sur le sol, en 2D
  collidesWith(cx, cy, half) {
    return (
      cx + half > this.x &&
      cx - half < this.x + this.w &&
      cy + half > this.y &&
      cy - half < this.y + this.h
    );
  }

  toMesh() {
    const geometry = new THREE.BoxGeometry(this.w, this.height, this.h);
    const material = new THREE.MeshStandardMaterial({ color: this.color });
    const mesh = new THREE.Mesh(geometry, material);

    // Three.js place un objet par son CENTRE, pas par son coin haut-gauche
    mesh.position.set(
      this.x + this.w / 2,
      this.height / 2,
      this.y + this.h / 2
    );

    // NOUVEAU : les obstacles projettent et reçoivent des ombres
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
