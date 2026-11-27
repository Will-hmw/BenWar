// La maison est un grand carré de WORLD x WORLD.
const WORLD = 1600;
const OUTER = 40; // épaisseur des murs extérieurs
const WALL = 24;  // épaisseur des murs intérieurs

// Construit tous les obstacles : murs + meubles.
// La carte est symétrique par rapport au centre : chaque meuble a son jumeau
// de l'autre côté, donc aucun joueur n'est avantagé.
function buildObstacles() {
  const list = [];

  const wall = (x, y, w, h, height = 80) =>
    list.push(new Obstacle(x, y, w, h, height, 0xd8cfc0));

  // Un meuble + son symétrique
  const furniture = (x, y, w, h, height, color) => {
    list.push(new Obstacle(x, y, w, h, height, color));
    list.push(new Obstacle(WORLD - x - w, WORLD - y - h, w, h, height, color));
  };

  // --- Murs extérieurs (plus hauts, plus sombres) ---
  const outer = 0xb9ad98;
  list.push(new Obstacle(0, 0, WORLD, OUTER, 110, outer));
  list.push(new Obstacle(0, WORLD - OUTER, WORLD, OUTER, 110, outer));
  list.push(new Obstacle(0, 0, OUTER, WORLD, 110, outer));
  list.push(new Obstacle(WORLD - OUTER, 0, OUTER, WORLD, 110, outer));

  // --- Deux grands murs verticaux : ils séparent 3 zones
  // (pièce gauche, grand salon au centre, pièce droite). Chaque trou est une porte.
  [[40, 400], [540, 1060], [1200, 1560]].forEach(([a, b]) => {
    wall(520, a, WALL, b - a);
    wall(1056, a, WALL, b - a);
  });

  // --- Murs horizontaux : coupent chaque pièce latérale en deux ---
  [[40, 200], [340, 544]].forEach(([a, b]) => wall(a, 788, b - a, WALL));
  [[1056, 1260], [1400, 1560]].forEach(([a, b]) => wall(a, 788, b - a, WALL));

  // --- Meubles : (x, y, largeur, profondeur, hauteur, couleur) ---
  // Pièce en haut à gauche (et sa jumelle en bas à droite)
  furniture(70, 70, 170, 50, 32, 0x8a3b3b);    // canapé
  furniture(190, 230, 130, 90, 36, 0x7a5a38);  // table
  furniture(440, 150, 40, 160, 90, 0x3e2f20);  // bibliothèque
  furniture(80, 480, 60, 60, 50, 0x6b5a3a);    // caisse
  furniture(300, 620, 90, 50, 34, 0x4f6b55);   // pouf

  // Pièce en bas à gauche (et sa jumelle en haut à droite)
  furniture(80, 900, 140, 60, 34, 0x3f5b7a);   // lit
  furniture(300, 950, 60, 160, 70, 0x4a3a2a);  // armoire
  furniture(120, 1200, 120, 120, 40, 0x7a5a38); // grande table
  furniture(380, 1300, 100, 100, 50, 0x6b5a3a); // caisse
  furniture(70, 1470, 200, 50, 30, 0x8a3b3b);  // banc

  // Grand salon central
  furniture(600, 150, 60, 60, 60, 0x77777f);   // pilier
  furniture(640, 430, 120, 50, 34, 0x3f5b7a);  // banquette
  furniture(640, 600, 50, 50, 50, 0x6b5a3a);   // caisse
  furniture(580, 900, 60, 160, 60, 0x4a3a2a);  // meuble long
  furniture(650, 1150, 100, 60, 34, 0x8a3b3b); // banquette
  furniture(600, 1420, 60, 60, 60, 0x77777f);  // pilier

  // Table centrale (unique, elle est déjà symétrique)
  list.push(new Obstacle(740, 740, 120, 120, 50, 0x5b4636));

  return list;
}

// Crée une texture de carrelage en damier avec le canvas 2D du navigateur
function makeFloorTexture(colorA, colorB, lineColor, repeatX, repeatY) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");

  g.fillStyle = colorA;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = colorB;
  g.fillRect(0, 0, 64, 64);
  g.fillRect(64, 64, 64, 64);

  g.strokeStyle = lineColor;
  g.lineWidth = 2;
  for (const [x, y] of [[0, 0], [64, 0], [0, 64], [64, 64]]) {
    g.strokeRect(x + 1, y + 1, 62, 62);
  }

  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

// Le décor : herbe autour, parquet dans la maison, tapis dans le salon
function buildScenery(scene) {
  // L'herbe autour de la maison
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000),
    new THREE.MeshStandardMaterial({ color: 0x233323 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(WORLD / 2, -1, WORLD / 2);
  grass.receiveShadow = true;
  scene.add(grass);

  // Le sol de la maison (un carreau = 80 unités)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD, WORLD),
    new THREE.MeshStandardMaterial({
      map: makeFloorTexture("#8b6b45", "#7e5f3c", "#5e4529", WORLD / 160, WORLD / 160),
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(WORLD / 2, 0, WORLD / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  // Le tapis du grand salon (entre les deux murs verticaux)
  const carpetW = 1056 - 544;
  const carpetH = WORLD - 2 * OUTER;
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(carpetW, carpetH),
    new THREE.MeshStandardMaterial({
      map: makeFloorTexture("#6d2a2f", "#5f2429", "#4a1c20", carpetW / 160, carpetH / 160),
    })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(544 + carpetW / 2, 0.5, OUTER + carpetH / 2);
  carpet.receiveShadow = true;
  scene.add(carpet);
}
