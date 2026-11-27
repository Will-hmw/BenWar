// Commandes des deux joueurs (codes physiques des touches).
// KeyW / KeyA / KeyS / KeyD = Z Q S D sur un clavier AZERTY.
const CONTROLS_P1 = {
  up: ["KeyW"], down: ["KeyS"], left: ["KeyA"], right: ["KeyD"],
};
const CONTROLS_P2 = {
  up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"],
  turnLeft: "KeyK", turnRight: "KeyL", // le joueur 2 n'a pas de souris : il tourne au clavier
};

class Player extends Character {
  // NOUVEAU : on reçoit une configuration (commandes, couleurs, position de départ)
  constructor(x, y, config) {
    super(x, y, config.angle);
    this.spawnX = x;
    this.spawnY = y;
    this.spawnAngle = config.angle;

    this.controls = config.controls;
    this.palette = config.palette;
    this.bulletColor = config.bulletColor;

    this.speed = 3;
    this.half = 14;      // demi-côté de la boîte de collision (murs)
    this.hitRadius = 16; // rayon où les balles nous touchent

    this.cooldown = 0;   // images restantes avant le prochain tir
    this.fireDelay = 14;
  }

  // NOUVEAU : remettre le joueur au départ pour une nouvelle partie
  respawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.angle = this.spawnAngle;
    this.hp = this.maxHp;
    this.hitFlash = 0;
    this.cooldown = 0;
  }

  // NOUVEAU : un joueur est aussi un obstacle pour l'autre joueur
  // (même interface que Obstacle : on ne traverse pas son adversaire)
  collidesWith(cx, cy, half) {
    return (
      cx + half > this.x - this.half &&
      cx - half < this.x + this.half &&
      cy + half > this.y - this.half &&
      cy - half < this.y + this.half
    );
  }

  hitsAny(colliders) {
    return colliders.some((o) => o.collidesWith(this.x, this.y, this.half));
  }

  // Vrai si au moins une des touches de la liste est enfoncée
  pressed(keys, codes) {
    return codes.some((code) => keys[code]);
  }

  update(keys, colliders) {
    if (this.cooldown > 0) this.cooldown--;

    const c = this.controls;
    let dx = 0;
    let dy = 0;

    if (this.pressed(keys, c.up)) dy -= this.speed;
    if (this.pressed(keys, c.down)) dy += this.speed;
    if (this.pressed(keys, c.left)) dx -= this.speed;
    if (this.pressed(keys, c.right)) dx += this.speed;

    // Axe X, puis axe Y séparément pour glisser le long des murs
    this.x += dx;
    if (this.hitsAny(colliders)) this.x -= dx;

    this.y += dy;
    if (this.hitsAny(colliders)) this.y -= dy;

    // Visée au clavier (joueur 2)
    if (c.turnLeft && keys[c.turnLeft]) this.angle -= 0.06;
    if (c.turnRight && keys[c.turnRight]) this.angle += 0.06;
  }

  aimAt(mouseX, mouseY) {
    this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
  }

  // NOUVEAU : renvoie null si le fusil n'est pas encore rechargé
  shoot() {
    if (this.cooldown > 0) return null;
    this.cooldown = this.fireDelay;

    const side = this.angle + Math.PI / 2;
    const bx = this.x + Math.cos(this.angle) * 60 + Math.cos(side) * 7;
    const by = this.y + Math.sin(this.angle) * 60 + Math.sin(side) * 7;
    return new Bullet(bx, by, this.angle, this, this.bulletColor);
  }
}
