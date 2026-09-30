(() => {
  "use strict";

  // ---------- Config ----------
  const CANVAS_W = 800;
  const CANVAS_H = 500;
  const PADDLE_W = 12;
  const PADDLE_H = 80;
  const BALL_SIZE = 12;
  const WIN_SCORE = 7;
  const PLAYER_PADDLE_SPEED = 6.5;
  const BALL_SPEEDUP_ON_HIT = 1.05;
  const BALL_MAX_SPEED = 13;
  const LEVEL_UP_EVERY = 2; // pontos do jogador 1 para subir de nível no modo CPU
  const MAX_LEVEL = 6;

  const DIFFICULTY = {
    easy: { cpuSpeed: 3.4, error: 55, ballSpeed: 4.4 },
    medium: { cpuSpeed: 4.8, error: 30, ballSpeed: 5.4 },
    hard: { cpuSpeed: 6.4, error: 10, ballSpeed: 6.4 },
  };

  // ---------- DOM ----------
  const screens = {
    menu: document.getElementById("screen-menu"),
    setup: document.getElementById("screen-setup"),
    game: document.getElementById("screen-game"),
    gameover: document.getElementById("screen-gameover"),
  };

  const setupTitle = document.getElementById("setup-title");
  const p1Input = document.getElementById("p1-name");
  const p2Input = document.getElementById("p2-name");
  const p2Field = document.getElementById("p2-field");
  const difficultyField = document.getElementById("difficulty-field");
  const difficultyButtons = Array.from(document.querySelectorAll("[data-difficulty]"));

  const hudP1Name = document.getElementById("hud-p1-name");
  const hudP2Name = document.getElementById("hud-p2-name");
  const hudP1Score = document.getElementById("hud-p1-score");
  const hudP2Score = document.getElementById("hud-p2-score");
  const hudLevel = document.getElementById("hud-level");

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const pauseOverlay = document.getElementById("pause-overlay");
  const winnerText = document.getElementById("winner-text");
  const finalScore = document.getElementById("final-score");

  // ---------- App state ----------
  let mode = "cpu"; // 'cpu' | '2p'
  let difficultyKey = "medium";
  let level = 0;

  const match = {
    p1Name: "Jogador 1",
    p2Name: "Jogador 2",
    score1: 0,
    score2: 0,
  };

  let running = false;
  let paused = false;
  let animationId = null;
  let lastTime = 0;

  const keys = new Set();

  const paddle1 = { x: 24, y: CANVAS_H / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H };
  const paddle2 = { x: CANVAS_W - 24 - PADDLE_W, y: CANVAS_H / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H };
  const ball = { x: CANVAS_W / 2, y: CANVAS_H / 2, vx: 0, vy: 0, size: BALL_SIZE };

  let cpuTargetY = CANVAS_H / 2;
  let cpuRetargetTimer = 0;

  // ---------- Screen navigation ----------
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  document.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      openSetup();
    });
  });

  function openSetup() {
    if (mode === "cpu") {
      setupTitle.textContent = "Configurar partida — 1 Jogador";
      p2Field.style.display = "none";
      difficultyField.style.display = "flex";
    } else {
      setupTitle.textContent = "Configurar partida — 2 Jogadores";
      p2Field.style.display = "flex";
      difficultyField.style.display = "none";
    }
    showScreen("setup");
    p1Input.focus();
  }

  document.getElementById("btn-back-menu").addEventListener("click", () => {
    showScreen("menu");
  });

  difficultyButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      difficultyButtons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      difficultyKey = btn.dataset.difficulty;
    });
  });

  document.getElementById("setup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    match.p1Name = (p1Input.value || "Jogador 1").trim().slice(0, 12) || "Jogador 1";
    match.p2Name = mode === "cpu" ? "CPU" : (p2Input.value || "Jogador 2").trim().slice(0, 12) || "Jogador 2";
    startMatch();
  });

  document.getElementById("btn-gameover-menu").addEventListener("click", () => {
    showScreen("menu");
  });

  document.getElementById("btn-gameover-again").addEventListener("click", () => {
    startMatch();
  });

  document.getElementById("btn-resume").addEventListener("click", togglePause);
  document.getElementById("btn-quit").addEventListener("click", quitToMenu);

  // ---------- Match lifecycle ----------
  function startMatch() {
    match.score1 = 0;
    match.score2 = 0;
    level = 0;
    hudP1Name.textContent = match.p1Name.toUpperCase();
    hudP2Name.textContent = match.p2Name.toUpperCase();
    hudP1Score.textContent = "0";
    hudP2Score.textContent = "0";
    updateLevelDisplay();

    paddle1.y = CANVAS_H / 2 - PADDLE_H / 2;
    paddle2.y = CANVAS_H / 2 - PADDLE_H / 2;

    resetBall(Math.random() < 0.5 ? -1 : 1);

    running = true;
    paused = false;
    pauseOverlay.classList.add("hidden");
    showScreen("game");
    lastTime = performance.now();
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
  }

  function quitToMenu() {
    running = false;
    paused = false;
    pauseOverlay.classList.add("hidden");
    if (animationId) cancelAnimationFrame(animationId);
    showScreen("menu");
  }

  function endMatch() {
    running = false;
    if (animationId) cancelAnimationFrame(animationId);
    const p1Won = match.score1 > match.score2;
    winnerText.textContent = `${(p1Won ? match.p1Name : match.p2Name).toUpperCase()} VENCEU!`;
    finalScore.textContent = `${match.score1} x ${match.score2}`;
    showScreen("gameover");
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseOverlay.classList.toggle("hidden", !paused);
    if (!paused) {
      lastTime = performance.now();
      animationId = requestAnimationFrame(loop);
    }
  }

  // ---------- Input ----------
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === "Escape" && screens.game.classList.contains("active")) {
      togglePause();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
  });

  // ---------- Difficulty / level helpers ----------
  function currentCpuStats() {
    const base = DIFFICULTY[difficultyKey];
    const speed = Math.min(base.cpuSpeed + level * 0.45, 9.5);
    const error = Math.max(base.error - level * 6, 2);
    return { speed, error };
  }

  function currentBaseBallSpeed() {
    const base = mode === "cpu" ? DIFFICULTY[difficultyKey].ballSpeed : DIFFICULTY.medium.ballSpeed;
    return Math.min(base + level * 0.3, BALL_MAX_SPEED - 2);
  }

  function updateLevelDisplay() {
    hudLevel.textContent = mode === "cpu" ? `NÍVEL ${level + 1}` : "";
  }

  function maybeLevelUp() {
    if (mode !== "cpu") return;
    const targetLevel = Math.min(Math.floor(match.score1 / LEVEL_UP_EVERY), MAX_LEVEL);
    if (targetLevel !== level) {
      level = targetLevel;
      updateLevelDisplay();
    }
  }

  // ---------- Ball / physics ----------
  function resetBall(direction) {
    ball.x = CANVAS_W / 2;
    ball.y = CANVAS_H / 2;
    const speed = currentBaseBallSpeed();
    const angle = (Math.random() * 0.5 - 0.25) * Math.PI; // -45deg .. 45deg
    ball.vx = Math.cos(angle) * speed * direction;
    ball.vy = Math.sin(angle) * speed;
    cpuRetargetTimer = 0;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // ---------- Update ----------
  function update(dt) {
    const step = dt / (1000 / 60); // normaliza para ~60fps

    // Paddle 1 (sempre humano): W / S
    if (keys.has("KeyW")) paddle1.y -= PLAYER_PADDLE_SPEED * step;
    if (keys.has("KeyS")) paddle1.y += PLAYER_PADDLE_SPEED * step;
    paddle1.y = clamp(paddle1.y, 0, CANVAS_H - PADDLE_H);

    // Paddle 2: humano (2P) ou CPU
    if (mode === "2p") {
      if (keys.has("ArrowUp")) paddle2.y -= PLAYER_PADDLE_SPEED * step;
      if (keys.has("ArrowDown")) paddle2.y += PLAYER_PADDLE_SPEED * step;
      paddle2.y = clamp(paddle2.y, 0, CANVAS_H - PADDLE_H);
    } else {
      updateCpu(step);
    }

    // Bola
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;

    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy *= -1;
    } else if (ball.y + ball.size >= CANVAS_H) {
      ball.y = CANVAS_H - ball.size;
      ball.vy *= -1;
    }

    // Colisão paddle 1 (esquerda)
    if (
      ball.vx < 0 &&
      ball.x <= paddle1.x + paddle1.w &&
      ball.x + ball.size >= paddle1.x &&
      ball.y + ball.size >= paddle1.y &&
      ball.y <= paddle1.y + paddle1.h
    ) {
      ball.x = paddle1.x + paddle1.w;
      bounceOffPaddle(paddle1, 1);
    }

    // Colisão paddle 2 (direita)
    if (
      ball.vx > 0 &&
      ball.x + ball.size >= paddle2.x &&
      ball.x <= paddle2.x + paddle2.w &&
      ball.y + ball.size >= paddle2.y &&
      ball.y <= paddle2.y + paddle2.h
    ) {
      ball.x = paddle2.x - ball.size;
      bounceOffPaddle(paddle2, -1);
    }

    // Ponto
    if (ball.x + ball.size < 0) {
      match.score2 += 1;
      hudP2Score.textContent = String(match.score2);
      if (checkWin()) return;
      resetBall(1);
    } else if (ball.x > CANVAS_W) {
      match.score1 += 1;
      hudP1Score.textContent = String(match.score1);
      maybeLevelUp();
      if (checkWin()) return;
      resetBall(-1);
    }
  }

  function bounceOffPaddle(paddle, direction) {
    const relativeHit = (ball.y + ball.size / 2 - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
    const speed = clamp(Math.hypot(ball.vx, ball.vy) * BALL_SPEEDUP_ON_HIT, 0, BALL_MAX_SPEED);
    const angle = clamp(relativeHit, -1, 1) * (Math.PI / 3); // até 60 graus
    ball.vx = Math.cos(angle) * speed * direction;
    ball.vy = Math.sin(angle) * speed;
  }

  function updateCpu(step) {
    const { speed, error } = currentCpuStats();

    cpuRetargetTimer -= step;
    if (cpuRetargetTimer <= 0) {
      cpuRetargetTimer = 18 + Math.random() * 10;
      const noise = (Math.random() * 2 - 1) * error;
      cpuTargetY = ball.vx > 0 ? ball.y + noise : CANVAS_H / 2 + noise * 0.3;
    }

    const paddleCenter = paddle2.y + paddle2.h / 2;
    const diff = cpuTargetY - paddleCenter;
    const move = clamp(diff, -speed * step, speed * step);
    paddle2.y = clamp(paddle2.y + move, 0, CANVAS_H - PADDLE_H);
  }

  function checkWin() {
    if (match.score1 >= WIN_SCORE || match.score2 >= WIN_SCORE) {
      endMatch();
      return true;
    }
    return false;
  }

  // ---------- Render ----------
  function render() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Net
    ctx.strokeStyle = "#333";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2, 0);
    ctx.lineTo(CANVAS_W / 2, CANVAS_H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#f4f4f4";
    ctx.fillRect(paddle1.x, paddle1.y, paddle1.w, paddle1.h);
    ctx.fillRect(paddle2.x, paddle2.y, paddle2.w, paddle2.h);

    ctx.fillStyle = "#39ff88";
    ctx.fillRect(ball.x, ball.y, ball.size, ball.size);
  }

  // ---------- Loop ----------
  function loop(now) {
    if (!running || paused) return;
    const dt = Math.min(now - lastTime, 40);
    lastTime = now;

    update(dt);
    if (running) {
      render();
      animationId = requestAnimationFrame(loop);
    }
  }

  // Estado inicial
  showScreen("menu");
  render();
})();
