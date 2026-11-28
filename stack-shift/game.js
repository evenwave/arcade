const board = document.querySelector('#board');
const context = board.getContext('2d');
const action = document.querySelector('#action');
const status = document.querySelector('#status');
const scoreLabel = document.querySelector('#score');
const perfectLabel = document.querySelector('#perfect');
const bestLabel = document.querySelector('#best');
const startMenu = document.querySelector('#start-menu');
const playContent = document.querySelector('#play-content');
const begin = document.querySelector('#begin');

function refreshBest() {
  bestLabel.textContent = (loadScores()[0]?.blocks || 0).toLocaleString();
}
refreshBest();
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
  startMenu.hidden = true;
  playContent.inert = false;
  if (document.activeElement === begin) action.focus({ preventScroll: true });
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
  refreshBest();
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

// Straight-on leather spine, with depth from bevels and curved lighting.
// Narrow books lose ornamentation, not their playable width.
function drawBlock(block, y) {
  const x = block.x, w = block.width, h = blockHeight - 2;
  if (w <= 0) return;
  const c = context;
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();

  // Keep extremely narrow books visibly solid instead of drawing tiny details.
  if (w < 10) {
    c.fillStyle = block.color; c.fillRect(x, y, w, h);
    c.fillStyle = '#e7c68a'; c.fillRect(x, y + 2, w, 1);
    c.fillStyle = '#17120f'; c.fillRect(x, y + h - 2, w, 2);
    c.restore(); return;
  }

  // Full-width spine: no perspective offset or exposed page edges.
  const front = w, right = x + w, bottom = y + h;
  const top = y, faceH = h;
  // A dark binding silhouette keeps the playable edges easy to align.
  c.fillStyle = block.color;
  c.fillRect(x, y, w, h);
  // Convex spine: rounded ends, darker shoulders and a soft highlight.
  const radius = Math.min(2.7, front * .12);
  c.beginPath();
  c.moveTo(x + radius, top);
  c.quadraticCurveTo(x, top, x, top + radius);
  c.lineTo(x, bottom - radius);
  c.quadraticCurveTo(x, bottom, x + radius, bottom);
  c.lineTo(right - radius, bottom);
  c.quadraticCurveTo(right, bottom, right, bottom - radius);
  c.lineTo(right, top + radius);
  c.quadraticCurveTo(right, top, right - radius, top);
  c.closePath();
  c.fillStyle = block.color; c.fill();
  c.save(); c.clip();
  const leather = c.createLinearGradient(0, top, 0, bottom);
  leather.addColorStop(0, '#00000078');
  leather.addColorStop(.055, '#fff3d244');
  leather.addColorStop(.14, '#ffffff24');
  leather.addColorStop(.32, '#f9d5a150');
  leather.addColorStop(.57, '#ffffff06');
  leather.addColorStop(.79, '#00000030');
  leather.addColorStop(.93, '#00000078');
  leather.addColorStop(1, '#00000088');
  c.fillStyle = leather; c.fillRect(x, top, front, faceH);
  const shoulders = c.createLinearGradient(x, 0, right, 0);
  shoulders.addColorStop(0, '#00000055');
  shoulders.addColorStop(.1, '#ffffff0a');
  shoulders.addColorStop(.8, '#ffffff00');
  shoulders.addColorStop(1, '#00000060');
  c.fillStyle = shoulders; c.fillRect(x, top, front, faceH);
  // Tiny straight bevels, not visible top or side planes.
  c.fillStyle = '#f6dfb44f'; c.fillRect(x + 2, top + .5, front - 4, .8);
  c.fillStyle = '#110b0966'; c.fillRect(x, top + 3, 1.2, faceH - 6);
  c.fillStyle = '#110b0988'; c.fillRect(right - 1.2, top + 3, 1.2, faceH - 6);
  // Thin tooling lines wrap the curved spine.
  c.fillStyle = '#d6b578bb'; c.fillRect(x + 1, top + 2, front - 2, .8);
  c.fillStyle = '#af8b54'; c.fillRect(x + 1, bottom - 3, front - 2, .8);
  if (front >= 25) {
    const band = Math.min(10, front * .15);
    for (const bx of [x + band, right - band - 3]) {
      const raised = c.createLinearGradient(bx - 1, 0, bx + 4, 0);
      raised.addColorStop(0, '#00000070');
      raised.addColorStop(.35, '#e8c58b99');
      raised.addColorStop(.65, '#a77b4788');
      raised.addColorStop(1, '#00000055');
      c.fillStyle = raised; c.fillRect(bx - 1, top + 2, 5, faceH - 4);
      c.fillStyle = '#e1bc7e'; c.fillRect(bx + .4, top + 4, .8, faceH - 8);
    }
    const cx = x + front / 2, cy = top + faceH / 2;
    if (front >= 54) {
      const labelW = Math.min(45, front * .44);
      c.fillStyle = '#100d0b66'; c.fillRect(cx - labelW/2, cy - 5, labelW, 10);
      c.strokeStyle = '#c9a56e'; c.lineWidth = .65;
      c.strokeRect(cx - labelW/2, cy - 5, labelW, 10);
      c.fillStyle = '#e4c58b99';
      c.fillRect(cx-labelW/2+3, cy-.5, labelW/2-9, .8);
      c.fillRect(cx+6, cy-.5, labelW/2-9, .8);
    }
    c.strokeStyle = '#e4c58b'; c.lineWidth = .9;
    c.beginPath(); c.moveTo(cx, cy - 3.5); c.lineTo(cx + 3.5, cy);
    c.lineTo(cx, cy + 3.5); c.lineTo(cx - 3.5, cy); c.closePath(); c.stroke();
  }
  // Stable fine leather grain.
  if (front >= 20) {
    c.fillStyle = '#ffffff12';
    for (let i = 3; i < front - 2; i += 7)
      c.fillRect(x + i, top + 4 + (i * 11 % 12), .8, .8);
  }
  c.restore();
  // Tight contact shadow along the bottom of each book.
  c.fillStyle = '#08070565'; c.fillRect(x + 1, bottom - 1.1, front - 2, 1.1);
  c.restore();
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

begin.addEventListener('click', play);
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
