const canvas = document.getElementById("game");

// ---------- Rendu : le canvas prend toute la fenêtre ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141a14);

const camera = new THREE.PerspectiveCamera(60, 1, 1, 4000);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ---------- Lumières ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const sun = new THREE.DirectionalLight(0xffffff, 0.85);
sun.position.set(1200, 1400, 400);
sun.target.position.set(WORLD / 2, 0, WORLD / 2); // le soleil vise le centre de la maison
scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
const sc = sun.shadow.camera;
sc.left = -1100; sc.right = 1100; sc.top = 1100; sc.bottom = -1100;
sc.near = 100; sc.far = 3500;
scene.add(sun);

// ---------- Décor et obstacles ----------
buildScenery(scene);

const obstacles = buildObstacles();
obstacles.forEach((o) => scene.add(o.toMesh()));

// ---------- Les deux joueurs ----------
// Positions symétriques : chacun dans une pièce opposée, face à l'autre.
const hero = new Player(250, 420, {
  controls: CONTROLS_P1,
  palette: PALETTES.red,
  bulletColor: 0xff9a3c,
  angle: 0.6,
});
const enemy = new Player(WORLD - 250, WORLD - 420, {
  controls: CONTROLS_P2,
  palette: PALETTES.blue,
  bulletColor: 0x6fd3ff,
  angle: 0.6 + Math.PI,
});
const players = [hero, enemy];

const heroMesh = hero.toMesh(hero.palette);
const enemyMesh = enemy.toMesh(enemy.palette);
scene.add(heroMesh);
scene.add(enemyMesh);

let bullets = [];
let gameOver = false;
let frame = 0;

// ---------- Interface (barres de vie, bannière) ----------
const ui = {
  hp1: document.getElementById("hp1"),
  hp2: document.getElementById("hp2"),
  txt1: document.getElementById("hpText1"),
  txt2: document.getElementById("hpText2"),
  name2: document.getElementById("name2"),
  banner: document.getElementById("banner"),
  bannerTitle: document.getElementById("bannerTitle"),
};

function updateBar(fillEl, textEl, player) {
  const pct = (player.hp / player.maxHp) * 100;
  fillEl.style.width = pct + "%";
  fillEl.className = "fill " + (pct > 50 ? "ok" : pct > 25 ? "mid" : "low");
  textEl.textContent = player.hp;
}

function updateHud() {
  updateBar(ui.hp1, ui.txt1, hero);
  updateBar(ui.hp2, ui.txt2, enemy);
}

// ---------- Tir ----------
function tryFire(player) {
  const bullet = player.shoot(); // null si pas encore rechargé
  if (!bullet) return;
  scene.add(bullet.toMesh());
  bullets.push(bullet);
}

// ---------- Fin de partie / rejouer ----------
function endGame() {
  gameOver = true;
  let text;
  if (!hero.alive && !enemy.alive) text = "Égalité !";
  else if (!enemy.alive) text = "Le joueur 1 gagne !";
  else text = (botMode ? "Le bot" : "Le joueur 2") + " gagne !";
  ui.bannerTitle.textContent = text;
  ui.banner.hidden = false;
}

function resetGame() {
  bullets.forEach((b) => scene.remove(b.mesh));
  bullets = [];
  players.forEach((p) => p.respawn());
  heroMesh.visible = true;
  enemyMesh.visible = true;
  gameOver = false;
  ui.banner.hidden = true;
}

// ---------- Clavier et souris ----------
const keys = {};
let mouseDown = false;
let botMode = false;

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "KeyR") resetGame();
  if (e.code === "KeyB" && !e.repeat) {
    botMode = !botMode;
    ui.name2.textContent = botMode ? "Bot" : "Joueur 2";
    resetGame();
  }
  if (["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => (keys[e.code] = false));

const mouseNDC = new THREE.Vector2(0, 0);
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
});
canvas.addEventListener("mousedown", () => (mouseDown = true));
window.addEventListener("mouseup", () => (mouseDown = false));

// ---------- Bot simple (touche B) : il suit, vise et tire sur le joueur 1 ----------
const botKeys = {};
function botThink() {
  botKeys.ArrowUp = botKeys.ArrowDown = botKeys.ArrowLeft = botKeys.ArrowRight = false;
  botKeys.Enter = false;
  if (!hero.alive) return;

  const dx = hero.x - enemy.x;
  const dy = hero.y - enemy.y;
  const d = Math.hypot(dx, dy);

  // Il vise le joueur 1, avec un petit balancement pour ne pas être parfait
  enemy.angle = Math.atan2(dy, dx) + Math.sin(frame * 0.05) * 0.12;

  // Trop loin : il approche. Trop près : il recule. Sinon : il se déplace de côté.
  const dir = d > 350 ? 1 : d < 180 ? -1 : 0;
  if (dir) {
    if (dx * dir > 20) botKeys.ArrowRight = true;
    if (dx * dir < -20) botKeys.ArrowLeft = true;
    if (dy * dir > 20) botKeys.ArrowDown = true;
    if (dy * dir < -20) botKeys.ArrowUp = true;
  } else if (Math.sin(frame * 0.02) > 0) botKeys.ArrowUp = true;
  else botKeys.ArrowDown = true;

  botKeys.Enter = d < 700 && Math.random() < 0.06;
}

// ---------- Visée à la souris ----------
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const aimPoint = new THREE.Vector3();

// ---------- Caméra : elle garde les DEUX joueurs dans le cadre ----------
const focus = new THREE.Vector3(hero.x, 0, hero.y);
let camH = 600;

function updateCamera() {
  const mx = (hero.x + enemy.x) / 2;
  const my = (hero.y + enemy.y) / 2;
  const dist = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);

  // Plus les joueurs sont loin l'un de l'autre, plus la caméra monte
  const targetH = Math.min(1300, Math.max(480, 420 + dist * 0.9));

  // Déplacement doux (lerp) pour éviter les à-coups
  focus.x += (mx - focus.x) * 0.1;
  focus.z += (my - focus.z) * 0.1;
  camH += (targetH - camH) * 0.05;

  camera.position.set(focus.x, camH, focus.z + camH * 0.55);
  camera.lookAt(focus.x, 0, focus.z);
  camera.updateMatrixWorld();
}

// ---------- Boucle principale ----------
function loop() {
  frame++;

  // 1. Logique des joueurs
  if (!gameOver) {
    if (botMode) botThink();
    const enemyKeys = botMode ? botKeys : keys;

    // Chaque joueur est un obstacle pour l'autre
    hero.update(keys, obstacles.concat([enemy]));
    enemy.update(enemyKeys, obstacles.concat([hero]));

    if (keys["Space"] || mouseDown) tryFire(hero);
    if (enemyKeys["Enter"]) tryFire(enemy);
  }

  // 2. Balles : déplacement, puis dégâts
  bullets.forEach((b) => {
    b.update(obstacles);
    b.syncMesh();

    // NOUVEAU : une balle blesse le premier joueur qu'elle touche.
    // Pas de test "ce n'est pas ton tir" : tes propres balles te blessent aussi.
    for (const p of players) {
      if (p.alive && !b.dead && b.hits(p)) {
        p.takeDamage(b.damage);
        b.dead = true;
      }
    }
  });

  // Retirer de la scène et de la liste les balles mortes ou sorties
  const alive = [];
  for (const b of bullets) {
    if (b.dead || b.isOutside()) scene.remove(b.mesh);
    else alive.push(b);
  }
  bullets = alive;

  // 3. Fin de partie ?
  if (!gameOver && (!hero.alive || !enemy.alive)) endGame();

  // 4. Caméra, puis visée (la visée a besoin de la caméra à jour)
  updateCamera();
  if (!gameOver && hero.alive) {
    raycaster.setFromCamera(mouseNDC, camera);
    if (raycaster.ray.intersectPlane(groundPlane, aimPoint)) {
      hero.aimAt(aimPoint.x, aimPoint.z);
    }
  }

  // 5. Synchroniser les personnages (un personnage à 0 vie disparaît)
  players.forEach((p) => p.refreshFlash());
  heroMesh.visible = hero.alive;
  enemyMesh.visible = enemy.alive;
  heroMesh.position.set(hero.x, 0, hero.y);
  heroMesh.rotation.y = -hero.angle;
  enemyMesh.position.set(enemy.x, 0, enemy.y);
  enemyMesh.rotation.y = -enemy.angle;

  // 6. Barres de vie et dessin
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

updateHud();
loop();
