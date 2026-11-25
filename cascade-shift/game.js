'use strict';

// Balance knobs: adjust these without changing the game engine.
const CONFIG = {
  "boardSize": 8,
  "blockTypes": 5,
  "startingBlocks": 20,
  "incomingBlocks": 2,
  "minimumMatch": 3,
  "pointsPerBlock": 100,
  "slideMs": 170,
  "matchMs": 180,
  "cascadeMs": 480,
  "spawnMs": 180
};

function blank(){return Array.from({length:CONFIG.boardSize},()=>Array(CONFIG.boardSize).fill(null));}

function slide(board,dir){
  const n=board.length, next=blank(), vertical=dir==="up"||dir==="down", reverse=dir==="right"||dir==="down";
  for(let i=0;i<n;i++){
    const coords=Array.from({length:n},(_,j)=>vertical?[j,i]:[i,j]);
    if(reverse) coords.reverse();
    const packed=coords.map(([r,c])=>board[r][c]).filter(Boolean);
    packed.forEach((tile,j)=>{const [r,c]=coords[j]; next[r][c]=tile;});
  }
  return next;
}

function changed(a,b){return a.some((row,r)=>row.some((tile,c)=>tile!==b[r][c]));}

function matches(board){
  const n=board.length, found=new Set();
  for(const vertical of [false,true]){
    for(let i=0;i<n;i++){
      let j=0;
      while(j<n){
        const at=k=>vertical?board[k][i]:board[i][k];
        const tile=at(j);
        if(!tile){j++;continue;}
        let end=j+1;
        while(end<n&&at(end)?.type===tile.type)end++;
        if(end-j>=CONFIG.minimumMatch)for(let k=j;k<end;k++)found.add(at(k).id);
        j=end;
      }
    }
  }
  return found;
}

function removeMatches(board,ids){return board.map(row=>row.map(tile=>tile&&ids.has(tile.id)?null:tile));}

function canMove(board,dir){const next=slide(board,dir);return changed(board,next)||matches(next).size>0;}

function entryCandidates(board,dir,parity){
  const n=board.length, out=[];
  for(let i=parity;i<n;i+=2){
    const [r,c]=dir==="right"?[i,0]:dir==="left"?[i,n-1]:dir==="down"?[0,i]:[n-1,i];
    if(!board[r][c])out.push([r,c]);
  }
  return out;
}

function shuffled(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// Browser interface and turn lifecycle.
const DIRECTIONS = ["up","down","left","right"];
const ARROWS = {up:"↑",down:"↓",left:"←",right:"→"};
const SHAPES = ["","●","◆","▲","■","✦","⬟"];
const NAMES = ["","red circle","blue diamond","green triangle","yellow square","purple star","orange hexagon"];
const $ = id => document.getElementById(id);
const boardEl = $("board");
const tileLayer = $("tiles");
const tileNodes = new Map();
const storageKey = "cascade-shift-best-v1";
let board, nextId, score, moves, cleared, bestCombo, parity, busy, ended, comboTurns;
let best = 0;
try { best = Math.max(0, Number(localStorage.getItem(storageKey)) || 0); } catch {}
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = ms => new Promise(resolve => setTimeout(resolve, reducedMotion ? 0 : ms));
const format = n => n.toLocaleString();
const setStatus = text => { $("status").textContent = text; };
function showCombo(wave, points, count){
  const banner = $("combo-banner");
  banner.textContent = "CASCADE ×"+wave+"! · +"+format(points)+" points · "+count+" cleared";
  banner.hidden = false;
  banner.classList.remove("pop");
  // Restart the visual pulse for every new cascade wave.
  void banner.offsetWidth;
  banner.classList.add("pop");
}
function resetCombo(){ $("combo-banner").hidden = true; }
document.documentElement.style.setProperty("--size",CONFIG.boardSize);
for(let i=0;i<CONFIG.boardSize**2;i++){
  const cell=document.createElement("div");cell.className="cell";$("cells").append(cell);
}

function newTile(type = 1 + Math.floor(Math.random()*CONFIG.blockTypes)){
  return {id:++nextId,type};
}
function startingBoard(){
  const grid=blank(), n=grid.length;
  const positions=shuffled(Array.from({length:n*n},(_,i)=>[Math.floor(i/n),i%n]));
  for(const [r,c] of positions.slice(0,CONFIG.startingBlocks)){
    const options=shuffled(Array.from({length:CONFIG.blockTypes},(_,i)=>i+1));
    for(const type of options){
      grid[r][c]=newTile(type);
      if(!matches(grid).size)break;
      grid[r][c]=null;
    }
  }
  return grid;
}
function render(animateNew=true){
  const present=new Set();
  board.forEach((row,r)=>row.forEach((tile,c)=>{
    if(!tile)return;
    present.add(tile.id);
    let node=tileNodes.get(tile.id);
    if(!node){
      node=document.createElement("div");
      node.className="tile"+(animateNew?" spawn":"");
      const gem=document.createElement("div");
      gem.className="gem type-"+tile.type;
      gem.textContent=SHAPES[tile.type];
      node.append(gem);
      node.style.transform="translate("+(c*100)+"%, "+(r*100)+"%)";
      tileNodes.set(tile.id,node);tileLayer.append(node);
    }else node.style.transform="translate("+(c*100)+"%, "+(r*100)+"%)";
  }));
  for(const [id,node] of tileNodes){
    if(!present.has(id)){node.remove();tileNodes.delete(id);}
  }
  boardEl.setAttribute("aria-label",board.map((row,r)=>"Row "+(r+1)+": "+row.map(tile=>tile?NAMES[tile.type]:"empty").join(", ")).join(". "));
  updateStats();
}
function updateStats(){
  const count=board.flat().filter(Boolean).length, capacity=CONFIG.boardSize**2;
  $("score").textContent=format(score);
  $("best").textContent=format(best);
  $("moves").textContent=format(moves);
  $("combo").textContent=bestCombo?"×"+bestCombo:"—";
  $("cleared").textContent=format(cleared);
  $("combo-turns").textContent=format(comboTurns);
  $("efficiency").textContent=moves?(cleared/moves).toFixed(2):"0.00";
  $("occupancy").textContent=count+" / "+capacity+" blocks";
  $("fill").style.width=(count/capacity*100)+"%";
  $("fill").style.background=count/capacity>.8?"#f47986":count/capacity>.6?"#f7cf71":"var(--accent)";
  const meter=document.querySelector(".meter");
  meter.setAttribute("aria-valuemax",capacity);
  meter.setAttribute("aria-valuenow",count);
}
function updateBest(){
  if(score<=best)return;
  best=score;
  try{localStorage.setItem(storageKey,String(best));}catch{}
}
function setBusy(value){
  busy=value;
  $("restart").disabled=value;
  document.querySelectorAll("[data-dir]").forEach(button=>button.disabled=value||ended);
}
function start(){
  if(busy)return;
  nextId=score=moves=cleared=bestCombo=parity=comboTurns=0;
  resetCombo();
  ended=false;
  tileLayer.replaceChildren();tileNodes.clear();
  board=startingBoard();
  $("over").hidden=true;
  $("gravity").textContent="Choose a direction";
  setStatus("Use the arrows to shift all blocks.");
  setBusy(false);render(false);
}
async function resolveMatches(dir,turn){
  let ids=matches(board);
  while(ids.size){
    turn.wave++;
    const points=ids.size*CONFIG.pointsPerBlock*turn.wave;
    score+=points;cleared+=ids.size;turn.cleared+=ids.size;turn.points+=points;
    bestCombo=Math.max(bestCombo,turn.wave);
    updateBest();updateStats();
    setStatus("×"+turn.wave+" · "+ids.size+" blocks cleared · +"+format(points));
    if(turn.wave>1){
      if(turn.wave===2)comboTurns++;
      showCombo(turn.wave,turn.points,turn.cleared);
      updateStats();
    }
    for(const id of ids){
      const node=tileNodes.get(id);
      if(node)node.classList.add("matched", ...(turn.wave>1?["cascade-match"]:[]));
    }
    await wait(turn.wave>1?CONFIG.cascadeMs:CONFIG.matchMs);
    board=removeMatches(board,ids);render(false);
    const next=slide(board,dir);
    if(changed(board,next)){board=next;render(false);await wait(CONFIG.slideMs);}
    ids=matches(board);
  }
}
function introduce(dir){
  // Alternate odd/even lanes each valid turn. Randomly sample available
  // lanes within the active pattern; never overwrite an occupied cell.
  const slots=shuffled(entryCandidates(board,dir,parity)).slice(0,CONFIG.incomingBlocks);
  for(const [r,c] of slots)board[r][c]=newTile();
  parity=1-parity;
  return slots.length;
}
function finish(){
  ended=true;
  $("summary").textContent=format(score)+" points · "+moves+" moves · "+cleared+" blocks cleared";
  $("over").hidden=false;
  setStatus("No valid shifts remaining.");
  $("again").focus();
}
async function move(dir){
  if(busy||ended||!DIRECTIONS.includes(dir))return;
  const next=slide(board,dir);
  if(!changed(board,next)&&!matches(next).size){
    setStatus("No movement in that direction. No blocks added.");
    return;
  }
  setBusy(true);
  const turn={wave:0,cleared:0,points:0};
  try{
    moves++;
    resetCombo();
    $("gravity").textContent=ARROWS[dir]+" Shift "+dir;
    board=next;render(false);await wait(CONFIG.slideMs);
    await resolveMatches(dir,turn);
    const added=introduce(dir);render();await wait(CONFIG.spawnMs);
    // Incoming tiles stay at the edge unless they make a match.
    await resolveMatches(dir,turn);
    setStatus(turn.cleared
      ? "+"+format(turn.points)+" points · "+turn.cleared+" cleared · "+added+" added"+(turn.wave>1?" · ×"+turn.wave+" combo":"")
      : added+" blocks added · No match. Plan your next shift.");
    if(!DIRECTIONS.some(d=>canMove(board,d)))finish();
  }finally{setBusy(false);}
}
document.querySelectorAll("[data-dir]").forEach(button=>button.addEventListener("click",()=>move(button.dataset.dir)));
const keys={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",a:"left",s:"down",d:"right"};
document.addEventListener("keydown",event=>{
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  const dir=keys[event.key]||keys[event.key.toLowerCase()];
  if(!dir)return;
  event.preventDefault();
  if(!event.repeat)move(dir);
});
let touch=null;
boardEl.addEventListener("pointerdown",event=>{
  if(event.pointerType==="mouse"||ended||busy)return;
  touch={x:event.clientX,y:event.clientY,id:event.pointerId};
  boardEl.setPointerCapture(event.pointerId);
});
boardEl.addEventListener("pointercancel",()=>{touch=null;});
boardEl.addEventListener("pointerup",event=>{
  if(!touch||touch.id!==event.pointerId)return;
  const dx=event.clientX-touch.x,dy=event.clientY-touch.y;touch=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;
  move(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));
});
$("restart").addEventListener("click",start);
$("again").addEventListener("click",start);
start();
