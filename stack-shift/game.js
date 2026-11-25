const board = document.querySelector('#board');
const context = board.getContext('2d');
const action = document.querySelector('#action');
const status = document.querySelector('#status');
const scoreLabel = document.querySelector('#score');
const perfectLabel = document.querySelector('#perfect');
const blockHeight = 30;
const baseY = board.height - 32;
const palette = ['#b7f477', '#79e3c4', '#6dcaf1', '#aab5ff', '#f4a6d8', '#ffce79'];

let phase = 'ready';
let stack = [baseBlock()];
let moving;
let perfectDrops = 0;
let lastFrame;

function baseBlock() {
  return { x: 160, width: 160, color: '#677d98' };
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
  status.textContent = 'Line up the block and drop it.';
  action.textContent = 'Drop block';
  spawnBlock();
  draw();
}

function finish() {
  phase = 'ended';
  moving = undefined;
  const blocks = stack.length - 1;
  if (blocks > 0) saveScore({ blocks, perfect: perfectDrops });
  action.textContent = 'Play again';
  status.textContent = 'Run over. ' + blocks + ' stacked, ' + perfectDrops + ' perfect.';
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

function drawBlock(block, y) {
  context.fillStyle = block.color;
  context.fillRect(block.x, y, block.width, blockHeight - 2);
  context.fillStyle = '#ffffff40';
  context.fillRect(block.x, y, block.width, 3);
}

function draw() {
  context.clearRect(0, 0, board.width, board.height);
  context.strokeStyle = '#25354a';
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
