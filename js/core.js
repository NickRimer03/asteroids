const {
  Game,
  AUTO,
  Timer,
  Point,
  Physics,
  Keyboard
} = Phaser;

const game = new Game(800, 600, AUTO, "", { preload: preload, create: create, update: update });

let spaceship, bullet, bullets, asteroids = [];
let bulletTime = 0;
let level = 1;
let textAcc = null;
let gameOverObj = {
  mode: "disabled",
  text: null
};
const destroyed = { huge: 0, big: 0, middle: 0, small: 0 };

let blaster, spaceship_explosion, asteroid_explosion;

const $VELOCITY_BULLET = 700,
      $VELOCITY_SPACESHIP = 300,
      $VELOCITY_ANGULAR = 200,
      $VELOCITY_ASTEROID = 50;

const $BULLET_LIFESPAN = 1000,
      $BULLET_DELAY = 300;

var WebFontConfig = {
  active: function () {
    game.time.events.add(Timer.HALF, createText, this);
  },
  google: {
    families: ["Revalia"]
  }
}

function preload () {
  game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
  game.scale.pageAlignHorizontally = true;
  game.scale.pageAlignVertically = true;

  game.load.atlas("spaceships", "img/spaceships.png", "img/spaceships.json");
  game.load.audio("blaster", "snd/sfx/blaster.mp3");
  game.load.audio("spaceship_explosion", "snd/sfx/spaceship_explosion.mp3");
  game.load.audio("asteroid_explosion", "snd/sfx/asteroid_explosion.mp3");
  game.load.script("webfont", "//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js");
}

function create () {
  spaceship = game.add.sprite(game.width / 2, game.height / 2, "spaceships", "teal.png");
  game.physics.enable(spaceship, Physics.ARCADE);
  spaceship.anchor.setTo(0.5);
  spaceship.angle = -90;

  bullets = game.add.group();
  [bullets.enableBody, bullets.physicsBodyType] = [true, Physics.ARCADE];
  bullets.createMultiple(5, "spaceships", "bullet.png");
  bullets.setAll("anchor.x", 0.5)
  bullets.setAll("anchor.y", 0.5);

  blaster = game.add.audio("blaster");
  spaceship_explosion = game.add.audio("spaceship_explosion");
  asteroid_explosion = game.add.audio("asteroid_explosion");

  start_game();
}

function update () {
  [spaceship.body.velocity.x, spaceship.body.velocity.y, spaceship.body.angularVelocity] = [0, 0, 0];

  if (game.input.keyboard.isDown(Keyboard.LEFT))
    spaceship.body.angularVelocity = -$VELOCITY_ANGULAR;
  else if (game.input.keyboard.isDown(Keyboard.RIGHT))
    spaceship.body.angularVelocity = $VELOCITY_ANGULAR;

  if (game.input.keyboard.isDown(Keyboard.UP))
    game.physics.arcade.velocityFromAngle(spaceship.angle, $VELOCITY_SPACESHIP, spaceship.body.velocity);

  if (game.input.keyboard.isDown(Keyboard.SPACEBAR)) {
    fireBullet();

    if (gameOverObj.mode == "enabled") {
      gameOverObj.text.kill();
      textAcc = null;
      [gameOverObj.mode, gameOverObj.text] = ["disabled", null];
      restart_game();
    }
  }

  screenWrap(spaceship);
  asteroids.forEach((asteroid) => {
    screenWrap(asteroid);
  });
  game.physics.arcade.overlap(bullets, asteroids, collisionHandler);
  game.physics.arcade.overlap(spaceship, asteroids, gameOver);

  if (asteroids.length == 0 && spaceship.alive) {
    level++;
    start_game();
    createText();
  }
}

function createText(mode = "new") {
  const textMode = {};

  switch (mode) {
    case "new":
      [textMode.text, textMode.color] = [`Level ${level}`, "#ff00ff"];
      break;

    case "gameover":
      [textMode.text, textMode.color] = ["Game Over", "#ff0000"];
      break;

    case "stat":
      [textMode.text, textMode.color] = [`Уничтожено астероидов\nОгромных: ${destroyed.huge}\nБольших: ${destroyed.big}\nСредних: ${destroyed.middle}\nМаленьких: ${destroyed.small}\n'Space' - продолжить`, "#ffff00"];
      break;
  }

  let text = game.add.text(game.world.centerX, game.world.centerY, textMode.text);
  text.anchor.setTo(0.5);

  [text.font, text.fontSize, text.fill] = ["Revalia", 60, textMode.color];
  [text.align, text.stroke, text.strokeThickness] = ["center", "#00aaff", 3];

  textAcc = text;

  if (mode != "stat")
    game.time.events.add(Timer.SECOND * 2, function() { text.kill(); textAcc = null; }, this);
  else
    [gameOverObj.mode, gameOverObj.text] = ["enabled", text];
}

function start_game () {
  while (asteroids.length < level) {
    let x, y;
    const [x1_1, x2_1] = [game.rnd.between(100, game.width / 2 - 100), game.rnd.between(game.width / 2 + 100, game.width - 100), ];
    const [x1, y1] = [game.rnd.pick([x1_1, x2_1]), game.rnd.between(80, game.height - 80)];
    const [y1_2, y2_2] = [game.rnd.between(80, 120), game.rnd.between(400, 520)];
    const [x2, y2] = [game.rnd.between(300, 500), game.rnd.pick([y1_2, y2_2])];
    if (game.rnd.pick([0, 1]) == 0)
      [x, y] = [x1, y1];
    else
      [x, y] = [x2, y2];
    if (!((x >= spaceship.x - 100 && x <= spaceship.x + 100) && (y >= spaceship.y - 100 && y <= spaceship.y + 100))) {
      const asteroid = game.add.sprite(x, y, "spaceships", "huge.png");
      asteroid.data.size = 0;
      game.physics.enable(asteroid, Physics.ARCADE);
      asteroid.anchor.setTo(0.5);
      game.physics.arcade.velocityFromAngle(game.rnd.angle(), $VELOCITY_ASTEROID, asteroid.body.velocity);
      asteroids.push(asteroid);
    }
  }
}

function restart_game () {
  level = 1;
  asteroids.length = 0;
  for (let prop in destroyed)
    if (destroyed.hasOwnProperty(prop))
      destroyed[prop] = 0;
  game.state.restart();
}

function screenWrap (sprite) {
  if (sprite.x < 0) {
    sprite.x = game.width;
  } else if (sprite.x > game.width) {
    sprite.x = 0;
  }

  if (sprite.y < 0) {
    sprite.y = game.height;
  } else if (sprite.y > game.height) {
    sprite.y = 0;
  }
}

function fireBullet () {
  if ((game.time.now > bulletTime) && (spaceship.alive)) {
    bullet = bullets.getFirstExists(false);

    if (bullet) {
      const bulletFirePoint = new Point(spaceship.x + spaceship.width / 2 + 5, spaceship.y);
      bulletFirePoint.rotate(spaceship.x, spaceship.y, spaceship.rotation);

      bullet.reset(bulletFirePoint.x, bulletFirePoint.y);
      [bullet.lifespan, bullet.rotation] = [$BULLET_LIFESPAN, spaceship.rotation];
      game.physics.arcade.velocityFromRotation(spaceship.rotation, $VELOCITY_BULLET, bullet.body.velocity);
      bulletTime = game.time.now + $BULLET_DELAY;

      blaster.play();
    }
  }
}

function collisionHandler (asteroid, bullet) {
  bullet.kill();
  asteroids.splice(asteroids.indexOf(asteroid), 1);
  //
  const size = ["huge", "big", "middle", "small"];
  const new_size = asteroid.data.size + 1;
  const new_angle = [asteroid.body.angle + game.math.degToRad(game.rnd.between(5, 20)), asteroid.body.angle - game.math.degToRad(game.rnd.between(5, 20))];
  if (new_size < size.length) {
    for (let i = 0; i < 2; i++) {
      const new_asteroid = game.add.sprite(asteroid.x, asteroid.y, "spaceships", `${size[new_size]}.png`);
      new_asteroid.data.size = new_size;
      game.physics.enable(new_asteroid, Physics.ARCADE);
      new_asteroid.anchor.setTo(0.5);
      game.physics.arcade.velocityFromAngle(game.math.radToDeg(new_angle[i]), asteroid.body.speed + $VELOCITY_ASTEROID * 0.25, new_asteroid.body.velocity);
      asteroids.push(new_asteroid);
    }
  }
  //
  destroyed[size[asteroid.data.size]]++;
  asteroid.kill();
  asteroid_explosion.play();
}

function gameOver (spaceship, asteroid) {
  spaceship.kill();
  if (textAcc != null)
    textAcc.kill();
  createText("gameover");
  spaceship_explosion.play();
  game.time.events.add(Timer.SECOND * 2, createText.bind(null, "stat"), this);
}
