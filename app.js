(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const statusEl = document.getElementById("status");
  const newGameButton = document.getElementById("newGame");
  const motionPermissionButton = document.getElementById("motionPermission");

  const GRID_COLS = 15;
  const GRID_ROWS = 15;
  const BALL_RADIUS_RATIO = 0.28;
  const CELL_WALL_THICKNESS = 3;
  const BALL_SPEED = 8.5;
  const FRICTION = 0.985;
  const ACCELERATION = 0.65;

  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let maze = [];
  let cellSize = 0;
  let offsetX = 0;
  let offsetY = 0;
  let boardSize = 0;
  let isWon = false;
  let lastTimestamp = 0;
  let manualInput = { x: 0, y: 0 };
  let motionInput = { x: 0, y: 0 };
  let hasMotionPermission = false;
  let pointerActive = false;
  let pointerStart = null;
  let ball = { x: 0, y: 0, vx: 0, vy: 0 };

  function randInt(max) {
    return Math.floor(Math.random() * max);
  }

  function createGrid() {
    const grid = [];
    for (let y = 0; y < GRID_ROWS; y += 1) {
      const row = [];
      for (let x = 0; x < GRID_COLS; x += 1) {
        row.push({
          x,
          y,
          visited: false,
          walls: { top: true, right: true, bottom: true, left: true },
        });
      }
      grid.push(row);
    }
    return grid;
  }

  function neighbors(cell) {
    const list = [];
    const { x, y } = cell;
    if (y > 0 && !maze[y - 1][x].visited) list.push({ cell: maze[y - 1][x], dir: "top" });
    if (x < GRID_COLS - 1 && !maze[y][x + 1].visited) list.push({ cell: maze[y][x + 1], dir: "right" });
    if (y < GRID_ROWS - 1 && !maze[y + 1][x].visited) list.push({ cell: maze[y + 1][x], dir: "bottom" });
    if (x > 0 && !maze[y][x - 1].visited) list.push({ cell: maze[y][x - 1], dir: "left" });
    return list;
  }

  function removeWall(a, b, dir) {
    if (dir === "top") {
      a.walls.top = false;
      b.walls.bottom = false;
    } else if (dir === "right") {
      a.walls.right = false;
      b.walls.left = false;
    } else if (dir === "bottom") {
      a.walls.bottom = false;
      b.walls.top = false;
    } else if (dir === "left") {
      a.walls.left = false;
      b.walls.right = false;
    }
  }

  function generateMaze() {
    maze = createGrid();
    const stack = [];
    const start = maze[0][0];
    start.visited = true;
    stack.push(start);

    while (stack.length) {
      const current = stack[stack.length - 1];
      const unvisited = neighbors(current);
      if (!unvisited.length) {
        stack.pop();
        continue;
      }
      const choice = unvisited[randInt(unvisited.length)];
      removeWall(current, choice.cell, choice.dir);
      choice.cell.visited = true;
      stack.push(choice.cell);
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    boardSize = Math.min(rect.width, rect.height);
    cellSize = boardSize / GRID_COLS;
    offsetX = (rect.width - boardSize) / 2;
    offsetY = (rect.height - boardSize) / 2;
  }

  function resetBall() {
    const startCell = maze[0][0];
    ball = {
      x: (startCell.x + 0.5) * cellSize,
      y: (startCell.y + 0.5) * cellSize,
      vx: 0,
      vy: 0,
    };
    isWon = false;
    statusEl.textContent = "箱を傾けて、ボールをゴールへ。";
  }

  function newGame() {
    generateMaze();
    resizeCanvas();
    resetBall();
  }

  function getInputVector() {
    if (Math.abs(manualInput.x) > 0.01 || Math.abs(manualInput.y) > 0.01) {
      return manualInput;
    }
    return motionInput;
  }

  function cellAtPosition(x, y) {
    const cx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(x / cellSize)));
    const cy = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y / cellSize)));
    return maze[cy][cx];
  }

  function resolveCollisions(previousX, previousY) {
    const radius = cellSize * BALL_RADIUS_RATIO;
    const cell = cellAtPosition(ball.x, ball.y);
    const left = cell.x * cellSize;
    const right = left + cellSize;
    const top = cell.y * cellSize;
    const bottom = top + cellSize;

    if (cell.walls.left && ball.x - radius < left) {
      ball.x = left + radius;
      ball.vx = Math.max(0, ball.vx);
    }
    if (cell.walls.right && ball.x + radius > right) {
      ball.x = right - radius;
      ball.vx = Math.min(0, ball.vx);
    }
    if (cell.walls.top && ball.y - radius < top) {
      ball.y = top + radius;
      ball.vy = Math.max(0, ball.vy);
    }
    if (cell.walls.bottom && ball.y + radius > bottom) {
      ball.y = bottom - radius;
      ball.vy = Math.min(0, ball.vy);
    }

    if (ball.x !== previousX || ball.y !== previousY) return;
  }

  function checkGoal() {
    const goalCell = maze[GRID_ROWS - 1][GRID_COLS - 1];
    const goalCenterX = (goalCell.x + 0.5) * cellSize;
    const goalCenterY = (goalCell.y + 0.5) * cellSize;
    const threshold = cellSize * 0.32;
    if (Math.hypot(ball.x - goalCenterX, ball.y - goalCenterY) <= threshold) {
      if (!isWon) {
        isWon = true;
        statusEl.textContent = "クリア！ 新しい迷路で再挑戦できます。";
      }
    }
  }

  function updatePhysics(dt) {
    if (isWon) return;

    const input = getInputVector();
    ball.vx += input.x * ACCELERATION * dt * 60;
    ball.vy += input.y * ACCELERATION * dt * 60;

    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > BALL_SPEED) {
      const scale = BALL_SPEED / speed;
      ball.vx *= scale;
      ball.vy *= scale;
    }

    const prevX = ball.x;
    const prevY = ball.y;
    ball.x += ball.vx * dt * 60;
    ball.y += ball.vy * dt * 60;
    resolveCollisions(prevX, prevY);
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;
    checkGoal();
  }

  function drawMaze() {
    ctx.save();
    ctx.translate(offsetX * dpr, offsetY * dpr);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, boardSize, boardSize);

    const padding = 0;
    ctx.fillStyle = "#151a24";
    ctx.fillRect(padding, padding, boardSize, boardSize);

    for (let y = 0; y < GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        const cell = maze[y][x];
        const px = x * cellSize;
        const py = y * cellSize;

        if (x === 0 && y === 0) {
          ctx.fillStyle = "rgba(114, 240, 184, 0.18)";
          ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
        }

        if (x === GRID_COLS - 1 && y === GRID_ROWS - 1) {
          ctx.fillStyle = "rgba(89, 135, 255, 0.18)";
          ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
        }

        ctx.strokeStyle = "#eef3ff";
        ctx.lineWidth = CELL_WALL_THICKNESS;
        ctx.lineCap = "square";
        ctx.beginPath();
        if (cell.walls.top) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py);
        }
        if (cell.walls.right) {
          ctx.moveTo(px + cellSize, py);
          ctx.lineTo(px + cellSize, py + cellSize);
        }
        if (cell.walls.bottom) {
          ctx.moveTo(px + cellSize, py + cellSize);
          ctx.lineTo(px, py + cellSize);
        }
        if (cell.walls.left) {
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    const goal = maze[GRID_ROWS - 1][GRID_COLS - 1];
    const goalX = goal.x * cellSize + cellSize * 0.22;
    const goalY = goal.y * cellSize + cellSize * 0.22;
    ctx.fillStyle = "rgba(114, 240, 184, 0.34)";
    ctx.beginPath();
    ctx.roundRect(goalX, goalY, cellSize * 0.56, cellSize * 0.56, cellSize * 0.12);
    ctx.fill();

    const start = maze[0][0];
    const startX = start.x * cellSize + cellSize * 0.22;
    const startY = start.y * cellSize + cellSize * 0.22;
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.beginPath();
    ctx.roundRect(startX, startY, cellSize * 0.56, cellSize * 0.56, cellSize * 0.12);
    ctx.fill();

    const radius = cellSize * BALL_RADIUS_RATIO;
    ctx.fillStyle = "#72f0b8";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (isWon) {
      ctx.fillStyle = "rgba(16, 19, 26, 0.55)";
      ctx.fillRect(0, 0, boardSize, boardSize);
      ctx.fillStyle = "#f7f7fb";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 28px system-ui, sans-serif";
      ctx.fillText("CLEAR", boardSize / 2, boardSize / 2 - 16);
      ctx.font = "500 14px system-ui, sans-serif";
      ctx.fillStyle = "#bfc6d6";
      ctx.fillText("新しい迷路で続けよう", boardSize / 2, boardSize / 2 + 18);
    }

    ctx.restore();
  }

  function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min(0.033, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;
    updatePhysics(dt);
    drawMaze();
    requestAnimationFrame(loop);
  }

  function requestMotionPermission() {
    if (typeof DeviceOrientationEvent === "undefined") return;
    const request = DeviceOrientationEvent.requestPermission;
    if (typeof request !== "function") {
      hasMotionPermission = true;
      motionPermissionButton.hidden = true;
      return;
    }
    request()
      .then((result) => {
        hasMotionPermission = result === "granted";
        motionPermissionButton.hidden = true;
        statusEl.textContent = hasMotionPermission
          ? "端末を傾けて操作できます。"
          : "傾き操作は許可されませんでした。ドラッグ操作を使えます。";
      })
      .catch(() => {
        hasMotionPermission = false;
        statusEl.textContent = "傾き操作の許可に失敗しました。ドラッグ操作を使えます。";
      });
  }

  function normalizeTilt(value) {
    return Math.max(-1, Math.min(1, value));
  }

  function supportsMotionPermission() {
    return typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function";
  }

  window.addEventListener("deviceorientation", (event) => {
    if (!hasMotionPermission && supportsMotionPermission()) return;
    const gamma = typeof event.gamma === "number" ? event.gamma : 0;
    const beta = typeof event.beta === "number" ? event.beta : 0;
    motionInput = {
      x: normalizeTilt(gamma / 25),
      y: normalizeTilt(beta / 25),
    };
  });

  canvas.addEventListener("pointerdown", (event) => {
    pointerActive = true;
    pointerStart = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    manualInput = { x: 0, y: 0 };
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointerActive || !pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    manualInput = {
      x: normalizeTilt(dx / 80),
      y: normalizeTilt(dy / 80),
    };
  });

  const endPointer = () => {
    pointerActive = false;
    pointerStart = null;
    manualInput = { x: 0, y: 0 };
  };

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("lostpointercapture", endPointer);

  newGameButton.addEventListener("click", () => {
    motionInput = { x: 0, y: 0 };
    manualInput = { x: 0, y: 0 };
    lastTimestamp = 0;
    newGame();
  });

  if (motionPermissionButton) {
    motionPermissionButton.addEventListener("click", requestMotionPermission);
    if (supportsMotionPermission()) {
      motionPermissionButton.hidden = false;
    }
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
  });

  window.addEventListener("orientationchange", () => {
    resizeCanvas();
  });

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, width, height, radius) {
      const r = typeof radius === "number" ? radius : 0;
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + width, y, x + width, y + height, r);
      this.arcTo(x + width, y + height, x, y + height, r);
      this.arcTo(x, y + height, x, y, r);
      this.arcTo(x, y, x + width, y, r);
      this.closePath();
    };
  }

  newGame();
  requestAnimationFrame(loop);
})();
