const board = document.querySelector('#board');
const context = board.getContext('2d');
const action = document.querySelector('#action');
const status = document.querySelector('#status');
const scoreLabel = document.querySelector('#score');
const perfectLabel = document.querySelector('#perfect');
const blockHeight = 30;
const baseY = board.height - 32;
// Original, procedurally drawn leather bindings; no imported artwork.
const palette = ['#254c3b', '#652e35', '#263c54', '#69452d', '#3d334a', '#315553'];

let phase = 'ready';
let stack = [baseBlock()];
let moving;
let perfectDrops = 0;
let lastFrame;

function baseBlock() {
  return { x: 160, width: 160, color: '#493727' };
}

function spawnBlock() {
  const width = stack.at(-1).width;
  const direction = stack.length % 2 === 1 ? 1 : -1;
  moving = {
    x: direction === 1 ? 0 : board.width - width,
    width,
    direction,
    color: palette[(stack.length - 1) % palette.length]
  };
}

function start() {
  stack = [baseBlock()];
  perfectDrops = 0;
  lastFrame = undefined;
  phase = 'playing';
  scoreLabel.textContent = '0';
  perfectLabel.textContent = '0';
  status.textContent = 'Line up the book and drop it.';
  action.textContent = 'Drop book';
  spawnBlock();
  draw();
}

function finish() {
  phase = 'ended';
  moving = undefined;
  const blocks = stack.length - 1;
  if (blocks > 0) saveScore({ blocks, perfect: perfectDrops });
  action.textContent = 'Play again';
  status.textContent = 'Run over. ' + blocks + ' books stacked, ' + perfectDrops + ' perfect.';
  draw();
}

function drop() {
  const top = stack.at(-1);
  const left = Math.max(top.x, moving.x);
  const right = Math.min(top.x + top.width, moving.x + moving.width);
  if (right <= left) {
    finish();
    return;
  }

  const perfect = Math.abs(top.x - moving.x) <= Math.min(5, top.width / 5);
  if (perfect) perfectDrops += 1;
  stack.push({
    x: perfect ? top.x : left,
    width: perfect ? top.width : right - left,
    color: moving.color
  });
  scoreLabel.textContent = stack.length - 1;
  perfectLabel.textContent = perfectDrops;
  status.textContent = perfect ? 'Perfect drop.' : 'Overhang trimmed.';
  spawnBlock();
  draw();
}

function play() {
  if (phase === 'playing') drop();
  else start();
}

// The book artwork is clipped to the exact original collision rectangle.
// Ornamentation scales down safely as the stack becomes narrower.
function drawBlock(block, y) {
  const x = block.x, w = block.width, h = blockHeight - 2;
  if (w <= 0) return;
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  const leather = context.createLinearGradient(0, y, 0, y + h);
  leather.addColorStop(0, '#ffffff28');
  leather.addColorStop(.16, '#ffffff0c');
  leather.addColorStop(.65, '#00000000');
  leather.addColorStop(1, '#00000065');
  context.fillStyle = block.color;
  context.fillRect(x, y, w, h);
  context.fillStyle = leather;
  context.fillRect(x, y, w, h);
  // Raised cover edges and a warm brass outline.
  context.fillStyle = '#100e0b';
  context.fillRect(x, y + h - 2, w, 2);
  context.fillStyle = '#d0af75';
  context.fillRect(x, y + 2, w, 1);
  context.fillStyle = '#a17e4c';
  context.fillRect(x, y + h - 4, w, 1);
  if (w >= 12) {
    const inset = Math.min(5, w * .12);
    context.strokeStyle = '#d3b47c88';
    context.lineWidth = .8;
    context.strokeRect(x + inset, y + 5, w - inset * 2, h - 10);
  }
  if (w >= 32) {
    // Gilt raised bands and an embossed central diamond on the spine.
    const band = Math.min(9, w * .12);
    for (const bx of [x + band, x + w - band - 2]) {
      context.fillStyle = '#110c0a70';
      context.fillRect(bx - 1, y + 4, 4, h - 8);
      context.fillStyle = '#c7a36a';
      context.fillRect(bx, y + 5, 1.5, h - 10);
    }
    const cx = x + w / 2, cy = y + h / 2;
    context.strokeStyle = '#e4c58b';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(cx, cy - 4); context.lineTo(cx + 4, cy);
    context.lineTo(cx, cy + 4); context.lineTo(cx - 4, cy);
    context.closePath(); context.stroke();
    if (w >= 60) {
      const line = Math.min(18, w * .16);
      context.fillStyle = '#bfa16d9c';
      context.fillRect(cx - 8 - line, cy - .5, line, 1);
      context.fillRect(cx + 8, cy - .5, line, 1);
    }
  }
  // Fine, fixed leather grain; no random flicker during motion.
  if (w >= 20) {
    context.fillStyle = '#ffffff0c';
    for (let i = 3; i < w - 2; i += 7) {
      context.fillRect(x + i, y + 7 + (i * 11 % 13), 1, 1);
      context.fillRect(x + i + 1, y + 8 + (i * 7 % 12), 1, 1);
    }
  }
  context.restore();
}

function draw() {
  context.clearRect(0, 0, board.width, board.height);
  const backdrop = context.createRadialGradient(240, 130, 15, 240, 180, 320);
  backdrop.addColorStop(0, '#30382e');
  backdrop.addColorStop(.6, '#222622');
  backdrop.addColorStop(1, '#141617');
  context.fillStyle = backdrop;
  context.fillRect(0, 0, board.width, board.height);
  // Restrained library panelling, rather than a busy scene behind the books.
  context.strokeStyle = '#bca26e15';
  context.lineWidth = 1;
  context.beginPath();
  for (let x = 0; x <= board.width; x += 24) {
    context.moveTo(x, 0);
    context.lineTo(x, board.height);
  }
  for (let y = 8; y <= board.height; y += 24) {
    context.moveTo(0, y);
    context.lineTo(board.width, y);
  }
  context.stroke();
  context.fillStyle = '#513521';
  context.fillRect(0, baseY + blockHeight - 1, board.width, 3);
  context.fillStyle = '#b48a55';
  context.fillRect(0, baseY + blockHeight - 1, board.width, 1);

  const movingY = baseY - Math.min(stack.length, 9) * blockHeight;
  const topY = movingY + blockHeight;
  for (let index = Math.max(0, stack.length - 12); index < stack.length; index += 1) {
    drawBlock(stack[index], topY + (stack.length - 1 - index) * blockHeight);
  }
  if (moving) drawBlock(moving, movingY);
}

function animate(time) {
  if (phase === 'playing') {
    const elapsed = lastFrame === undefined ? 0 : Math.min(50, time - lastFrame) / 1000;
    const limit = board.width - moving.width;
    const speed = Math.min(500, 155 + (stack.length - 1) * 12);
    moving.x += moving.direction * speed * elapsed;
    if (moving.x > limit || moving.x < 0) {
      moving.x = moving.x > limit ? 2 * limit - moving.x : -moving.x;
      moving.direction *= -1;
    }
    draw();
  }
  lastFrame = time;
  requestAnimationFrame(animate);
}

action.addEventListener('click', play);
board.addEventListener('click', play);
document.addEventListener('keydown', event => {
  if (event.code !== 'Space') return;
  event.preventDefault();
  if (!event.repeat) play();
});
document.addEventListener('visibilitychange', () => { lastFrame = undefined; });

draw();
requestAnimationFrame(animate);
