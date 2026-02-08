// Menu Scene

const idleStarDims = {
  width: 3,
  height: 3,
};

const movingStarDims = {
  width: 3,
  height: 12,
};

class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  preload() {
    this.load.image("logo", "assets/logo.png");
  }

  create() {
    this.cameras.main.setBackgroundColor("#001133");

    // Stars
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      const star = this.add.rectangle(
        Phaser.Math.Between(0, 600),
        Phaser.Math.Between(0, 800),
        idleStarDims.width * Math.random(),
        idleStarDims.height * Math.random(),
        0xffffff,
      );
      this.stars.push(star);
    }

    // Logo with float animation
    const logo = this.add.image(300, 200, "logo");
    const scale = Math.min(400 / logo.width, 300 / logo.height);
    logo.setScale(scale);
    this.tweens.add({
      targets: logo,
      y: 210,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Title
    this.add
      .text(300, 350, "SPACE SHOOTER", {
        fontSize: "32px",
        fill: "#ffffff",
        fontWeight: 700,
        fontStyle: "normal",
        fontFamily: "Pixelify Sans",
      })
      .setOrigin(0.5);

    // Start button
    const buttonBg = this.add.rectangle(300, 500, 250, 80, 0x8b5cf6);
    const startButton = this.add
      .text(300, 500, "START", {
        fontSize: "48px",
        fill: "#ffffff",
        fontStyle: "bold",
        fontWeight: 700,
        fontFamily: "Pixelify Sans",
      })
      .setOrigin(0.5);

    buttonBg.setInteractive();
    buttonBg.on("pointerover", () => buttonBg.setFillStyle(0x3b82f6));
    buttonBg.on("pointerout", () => buttonBg.setFillStyle(0x8b5cf6));
    buttonBg.on("pointerdown", () => {
      this.startGame();
    });
  }

  update() {
    // Slow star movement
    this.stars.forEach((star) => {
      star.y += 3;
      if (star.y > 800) star.y = 0;
    });
  }

  startGame() {
    // Accelerate stars
    this.stars.forEach((star) => {
      this.tweens.add({
        targets: star,
        y: "+=1000",
        duration: 300,
        ease: "Power2",
      });
    });
    this.time.delayedCall(300, () => this.scene.start("GameScene"));
  }
}

// Game Scene
class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("player", "assets/ship.png");
    this.load.image("alien", "assets/alien.png");
    this.load.image("bullet", "assets/bullet.png");
  }

  create() {
    this.cameras.main.setBackgroundColor("#001133");

    // Stars
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      const star = this.add.rectangle(
        Phaser.Math.Between(0, 600),
        Phaser.Math.Between(0, 800),
        movingStarDims.width * Math.random(),
        movingStarDims.height * Math.random(),
        0xffffff,
      );
      this.stars.push(star);
    }

    this.playerHealth = 100;
    this.alienHealth = 500;

    // Player - start below screen
    this.player = this.physics.add.sprite(300, 900, "player");
    const playerScale = Math.min(
      60 / this.player.width,
      60 / this.player.height,
    );
    this.player.setScale(playerScale);
    this.player.setCollideWorldBounds(true);
    this.tweens.add({
      targets: this.player,
      y: 750,
      duration: 1500,
      ease: "Power2",
    });

    // Alien boss - start above screen
    this.alien = this.add.sprite(300, -100, "alien"); // Use add.sprite instead of physics sprite
    const alienScale = Math.min(
      150 / this.alien.width,
      150 / this.alien.height,
    );
    this.alien.setScale(alienScale);
    this.alienDirection = 1;
    this.tweens.add({
      targets: this.alien,
      y: 150,
      duration: 1500,
      ease: "Power2",
    });

    // Invisible hitbox for alien
    this.alienHitbox = this.physics.add.sprite(300, -100, "alien");
    this.alienHitbox.setScale(alienScale);
    this.alienHitbox.setAlpha(0);
    this.alienHitbox.body.setImmovable(true);
    this.alienHitbox.body.setAllowGravity(false);
    this.tweens.add({
      targets: this.alienHitbox,
      y: 150,
      duration: 1500,
      ease: "Power2",
    });

    // Bullets
    this.playerBullets = this.physics.add.group();
    this.alienBullets = this.physics.add.group();

    // Health bars
    this.playerHealthBar = this.add.graphics();
    this.alienHealthBar = this.add.graphics();
    this.updateHealthBars();

    // Mouse/touch controls
    this.input.on("pointermove", (pointer) => {
      this.player.x = Phaser.Math.Clamp(pointer.x, 30, 570);
    });

    // Auto shoot
    this.time.addEvent({
      delay: 300,
      callback: this.shootPlayer,
      callbackScope: this,
      loop: true,
    });

    // Alien shoot - dynamic frequency based on health
    this.alienShootTimer = this.time.addEvent({
      delay: 1000,
      callback: this.shootAlien,
      callbackScope: this,
      loop: true,
    });

    // Collisions - use invisible hitbox
    this.physics.add.overlap(
      this.playerBullets,
      this.alienHitbox,
      this.hitAlien,
      null,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.alienBullets,
      this.hitPlayer,
      null,
      this,
    );
  }

  update() {
    // Fast stars
    this.stars.forEach((star) => {
      star.y += 10;
      if (star.y > 800) star.y = 0;
    });

    // Move alien left-right and sync hitbox
    this.alien.x += this.alienDirection * 3;
    if (this.alienHitbox && this.alienHitbox.body) {
      this.alienHitbox.x = this.alien.x;
      this.alienHitbox.y = this.alien.y;
    }
    if (this.alien.x >= 520 || this.alien.x <= 80) {
      this.alienDirection *= -1;
    }

    // Clean up bullets
    this.playerBullets.children.entries.forEach((bullet) => {
      if (bullet.y < 0) bullet.destroy();
    });
    this.alienBullets.children.entries.forEach((bullet) => {
      if (bullet.y > 800) bullet.destroy();
    });
  }

  shootPlayer() {
    const bullet = this.playerBullets.create(
      this.player.x,
      this.player.y - 30,
      "bullet",
    );
    bullet.setVelocityY(-600);
    const bulletScale = Math.min(10 / bullet.width, 20 / bullet.height);
    bullet.setScale(bulletScale);
  }

  shootAlien() {
    const bullet = this.alienBullets.create(
      this.alien.x,
      this.alien.y + 30,
      "bullet",
    );
    bullet.setVelocityY(400);
    const bulletScale = Math.min(15 / bullet.width, 30 / bullet.height);
    bullet.setScale(bulletScale);
    bullet.setTint(0xff0000);
  }

  hitAlien(bullet, alienHitbox) {
    if (!bullet || !bullet.active) return;

    bullet.destroy();
    alienHitbox.destroy();

    this.alienHealth -= 10;
    this.updateHealthBars();

    // Flash alien white
    if (this.alien) {
      this.alien.setTint(0xffffff);
      this.time.delayedCall(100, () => {
        if (this.alien) this.alien.clearTint();
      });
    }

    if (this.alienHealth <= 0) {
      this.scene.start("GameOverScene", { win: true });
    } else {
      // Update shoot frequency based on health (1000ms at full health, 300ms at low health)
      const newDelay = 1000 - (1 - this.alienHealth / 500) * 700;
      this.alienShootTimer.delay = newDelay;

      // Recreate hitbox at current position
      const alienScale = Math.min(
        150 / this.alien.width,
        150 / this.alien.height,
      );
      this.alienHitbox = this.physics.add.sprite(
        this.alien.x,
        this.alien.y,
        "alien",
      );
      this.alienHitbox.setScale(alienScale);
      this.alienHitbox.setAlpha(0);
      this.alienHitbox.body.setImmovable(true);
      this.alienHitbox.body.setAllowGravity(false);

      // Re-add collision
      this.physics.add.overlap(
        this.playerBullets,
        this.alienHitbox,
        this.hitAlien,
        null,
        this,
      );
    }
  }

  hitPlayer(player, bullet) {
    bullet.destroy();
    this.playerHealth -= 20;
    this.updateHealthBars();

    if (this.playerHealth <= 0) {
      this.scene.start("GameOverScene", { win: false });
    }
  }

  updateHealthBars() {
    // Player health bar
    this.playerHealthBar.clear();
    this.playerHealthBar.fillStyle(0x00ff00);
    this.playerHealthBar.fillRect(50, 770, this.playerHealth * 2, 20);
    this.playerHealthBar.lineStyle(2, 0xffffff);
    this.playerHealthBar.strokeRect(50, 770, 200, 20);

    // Alien health bar
    this.alienHealthBar.clear();
    this.alienHealthBar.fillStyle(0xff0000);
    this.alienHealthBar.fillRect(200, 50, (this.alienHealth / 500) * 200, 20);
    this.alienHealthBar.lineStyle(2, 0xffffff);
    this.alienHealthBar.strokeRect(200, 50, 200, 20);
  }
}

// Game Over Scene
class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data) {
    this.cameras.main.setBackgroundColor("#001133");

    const message = data.win ? "VICTORY!" : "GAME\nOVER";
    const color = data.win ? "#00ff00" : "#ff0000";

    const text = this.add
      .text(300, 300, message, {
        fontSize: "64px",
        fill: color,
        fontStyle: "bold",
        fontWeight: 700,
        fontFamily: "Pixelify Sans",
      })
      .setOrigin(0.5);

    // Blink effect
    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 400,
      yoyo: true,
      repeat: 4,
    });

    this.time.delayedCall(1000, () => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage("game-end", "*");
      } else {
        window.location.href = "/#merch";
      }
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 600,
  height: 800,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [MenuScene, GameScene, GameOverScene],
};

const game = new Phaser.Game(config);
