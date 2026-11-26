"use strict";
// Browser interface. Game rules live in engine.js.
const $=id=>document.getElementById(id);
const boardEl=$("board"), layer=$("tiles"), input=$("word-input");
const nodes=new Map(), dictionary=new Set();
const storageKey="letterlock-best-v1";
const symbols=["","●","◆","▲"], colors=["","red","blue","green"], arrows={up:"↑",down:"↓",left:"←",right:"→"};
let grid=blank(), nextId=0, score=0, best=0, moves=0, words=0, longest="", obstacles=0, bestChain=0, parity=0, busy=false, ended=false, ready=false, selection=[], gesture=null;
try{best=Math.max(0,Number(localStorage.getItem(storageKey))||0);}catch{}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,matchMedia("(prefers-reduced-motion: reduce)").matches?0:ms));
const format=n=>n.toLocaleString();
const status=t=>{$("status").textContent=t;};
const makeLetter=()=>({id:++nextId,kind:"letter",letter:randomLetter()});
const makeObstacle=()=>({id:++nextId,kind:"obstacle",color:1+Math.floor(Math.random()*CONFIG.obstacleColors)});
for(let i=0;i<CONFIG.size**2;i++){const cell=document.createElement("div");cell.className="cell";$("cells").append(cell);}
function stats(){
  const count=grid.flat().filter(Boolean).length, max=CONFIG.size**2;
  $("score").textContent=format(score);$("best").textContent=format(best);$("moves").textContent=format(moves);$("words").textContent=format(words);
  $("longest").textContent=longest||"—";$("obstacles").textContent=format(obstacles);$("chain").textContent=bestChain?"×"+bestChain:"—";
  $("occupancy").textContent=count+" / "+max+" blocks";$("fill").style.width=(count/max*100)+"%";$("fill").style.background=count/max>.8?"#ee7988":count/max>.6?"#f1c66c":"var(--accent)";
  document.querySelector(".meter").setAttribute("aria-valuenow",count);
}
function render(animateNew=true){
  const present=new Set();
  grid.forEach((row,r)=>row.forEach((tile,c)=>{
    if(!tile)return;present.add(tile.id);let node=nodes.get(tile.id);
    if(!node){
      node=document.createElement("div");node.className="tile "+tile.kind+(tile.kind==="obstacle"?" color-"+tile.color:"")+(animateNew?" spawn":"");
      const face=document.createElement("div");face.className="face";face.textContent=tile.kind==="letter"?tile.letter:symbols[tile.color];node.append(face);layer.append(node);nodes.set(tile.id,node);
    }
    node.style.transform="translate("+(c*100)+"%, "+(r*100)+"%)";
    node.setAttribute("aria-label",(tile.kind==="letter"?tile.letter:colors[tile.color]+" obstacle")+", row "+(r+1)+", column "+(c+1));
  }));
  for(const [id,node] of nodes)if(!present.has(id)){node.remove();nodes.delete(id);}
  paintSelection();stats();
}
function controls(){
  const disabled=!ready||busy||ended;
  document.querySelectorAll("[data-dir]").forEach(b=>b.disabled=disabled);
  input.disabled=disabled;$("submit").disabled=disabled;$("clear").disabled=disabled;
  $("restart").disabled=!ready||busy;
}
function paintSelection(){
  for(const node of nodes.values())node.classList.remove("selected");
  for(const [r,c] of selection){const tile=grid[r]?.[c];if(tile)nodes.get(tile.id)?.classList.add("selected");}
}
function preview(){
  const n=input.value.length;
  $("word-preview").textContent=CONFIG.points[n]?n+" letters · "+format(CONFIG.points[n])+" possible points":"3–8 letters · Straight line";
}
function setSelection(path){selection=path||[];input.value=selection.length?wordAt(grid,selection):"";paintSelection();preview();}
function resetSelection(){gesture=null;setSelection([]);}
function updateBest(){if(score<=best)return;best=score;try{localStorage.setItem(storageKey,String(best));}catch{}}
function start(){
  if(!ready||busy)return;
  ended=false;nextId=score=moves=words=obstacles=bestChain=parity=0;longest="";grid=blank();layer.replaceChildren();nodes.clear();resetSelection();
  const positions=shuffle(Array.from({length:CONFIG.size**2},(_,i)=>[Math.floor(i/CONFIG.size),i%CONFIG.size]));
  for(const [r,c] of positions.slice(0,CONFIG.startingLetters))grid[r][c]=makeLetter();
  $("over").hidden=true;$("gravity").textContent="Choose a direction";status("Look for a word or shift to arrange the letters.");render(false);controls();
}
function checkEnd(){
  if(!gameOver(grid,dictionary))return;
  ended=true;resetSelection();$("summary").textContent=format(score)+" points · "+moves+" shifts · "+words+" words";
  $("round-longest").textContent="Longest word: "+(longest||"—")+" · "+obstacles+" obstacles cleared";
  $("over").hidden=false;status("No valid words or shifts remaining.");controls();$("again").focus();
}
async function flash(ids){
  for(const id of ids)nodes.get(id)?.classList.add("matched");
  await wait(CONFIG.clearMs);grid=removeIds(grid,ids);render(false);
}
async function resolveColors(dir,turn){
  let ids=colorMatches(grid);
  while(ids.size){
    turn.waves++;turn.cleared+=ids.size;obstacles+=ids.size;bestChain=Math.max(bestChain,turn.waves);
    status((turn.waves>1?"Color cascade ×"+turn.waves:"Color match")+" · "+ids.size+" obstacles cleared · no points");
    await flash(ids);
    const next=slide(grid,dir);if(changed(grid,next)){grid=next;render(false);await wait(CONFIG.slideMs);}
    ids=colorMatches(grid);
  }
}
async function shift(dir){
  if(!ready||busy||ended||!DIRECTIONS.includes(dir))return;
  const next=slide(grid,dir);
  if(!changed(grid,next)&&!colorMatches(next).size){status("No movement in that direction. No blocks added.");return;}
  busy=true;controls();resetSelection();const turn={waves:0,cleared:0};
  try{
    moves++;$("gravity").textContent=arrows[dir]+" Shift "+dir;grid=next;render(false);await wait(CONFIG.slideMs);
    await resolveColors(dir,turn);
    const plan=spawnPlan(grid,dir,parity);parity=1-parity;
    for(const {r,c,kind} of plan)grid[r][c]=kind==="letter"?makeLetter():makeObstacle();
    render();await wait(CONFIG.spawnMs);await resolveColors(dir,turn);
    const letters=plan.filter(p=>p.kind==="letter").length,blocks=plan.length-letters;
    status(letters+" letter"+(letters===1?"":"s")+" + "+blocks+" obstacle"+(blocks===1?"":"s")+" added"+(turn.cleared?" · "+turn.cleared+" obstacles cleared"+(turn.waves>1?" (×"+turn.waves+" chain)":""):"")+".");
    checkEnd();
  }finally{busy=false;controls();}
}
async function submitWord(){
  if(!ready||busy||ended)return;
  const word=input.value.trim().toUpperCase();
  if(!/^[A-Z]{3,8}$/.test(word)){status("Choose a word of 3–8 letters.");return;}
  if(!dictionary.has(word)){status(word+" is not in the prototype dictionary.");return;}
  const path=selection.length&&wordAt(grid,selection)===word?selection:findWord(grid,dictionary,word);
  const result=clearWord(grid,path,dictionary);
  if(!result){status(word+" must appear in one uninterrupted horizontal or vertical line.");return;}
  busy=true;controls();const ids=new Set(path.map(([r,c])=>grid[r][c].id));resetSelection();
  try{
    score+=result.points;words++;if(word.length>longest.length)longest=word;updateBest();stats();
    status(word+" · +"+format(result.points)+" points! No new blocks added.");
    await flash(ids); // Important: do not slide, spawn, or resolve colors here.
    checkEnd();
  }finally{busy=false;controls();}
}
function atPointer(e){
  const rect=boardEl.getBoundingClientRect(),r=Math.floor((e.clientY-rect.top)/rect.height*CONFIG.size),c=Math.floor((e.clientX-rect.left)/rect.width*CONFIG.size);
  return r>=0&&r<CONFIG.size&&c>=0&&c<CONFIG.size?[r,c]:null;
}
const same=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
boardEl.addEventListener("pointerdown",e=>{
  if(!ready||busy||ended||!e.isPrimary||e.button!==0)return;
  const at=atPointer(e);if(!at||grid[at[0]][at[1]]?.kind!=="letter"){resetSelection();return;}
  e.preventDefault();gesture={id:e.pointerId,start:at,last:at,moved:false,previous:selection.slice(),valid:true};
  boardEl.setPointerCapture(e.pointerId);
});
boardEl.addEventListener("pointermove",e=>{
  if(!gesture||gesture.id!==e.pointerId)return;const at=atPointer(e);if(!at){gesture.valid=false;return;}
  if(same(at,gesture.last))return;
  gesture.moved=true;gesture.last=at;const path=lineBetween(grid,gesture.start,at);gesture.valid=!!path;
  if(path)setSelection(path);
});
boardEl.addEventListener("pointerup",e=>{
  if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;
  const at=atPointer(e);
  if(g.moved||!same(at,g.start)){
    const path=lineBetween(grid,g.start,at);if(path&&path.length>=CONFIG.minWord){setSelection(path);void submitWord();}else{resetSelection();status("Drag across at least three consecutive letters in a straight line.");}return;
  }
  if(g.previous.length&&same(g.previous[0],g.start)){resetSelection();return;}
  const path=g.previous.length?lineBetween(grid,g.previous[0],g.start):null;
  setSelection(path||[g.start]);
});
boardEl.addEventListener("pointercancel",()=>resetSelection());
input.addEventListener("input",()=>{selection=[];paintSelection();input.value=input.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,CONFIG.maxWord);preview();});
$("word-form").addEventListener("submit",e=>{e.preventDefault();void submitWord();});
$("clear").addEventListener("click",()=>{resetSelection();input.focus();});
document.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("click",()=>void shift(b.dataset.dir)));
document.addEventListener("keydown",e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;
  const dirs={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
  if(dirs[e.key]){e.preventDefault();if(!e.repeat)void shift(dirs[e.key]);return;}
  if(!ready||busy||ended)return;
  if(e.key==="Escape"){resetSelection();return;}
  if(e.target===input)return;
  if(e.key==="Enter"&&selection.length){e.preventDefault();void submitWord();return;}
  if(/^[a-zA-Z]$/.test(e.key)){e.preventDefault();if(selection.length)resetSelection();input.focus();input.value=(input.value+e.key.toUpperCase()).slice(0,CONFIG.maxWord);preview();}
});
$("restart").addEventListener("click",start);$("again").addEventListener("click",start);
async function load(){
  try{
    const response=await fetch("words.txt?v=1");if(!response.ok)throw Error("Dictionary unavailable");
    for(const word of (await response.text()).toUpperCase().split(/\s+/))if(/^[A-Z]{3,8}$/.test(word))dictionary.add(word);
    if(dictionary.size<10000)throw Error("Incomplete dictionary");
    ready=true;start();
  }catch(error){status("Could not load the dictionary. Reload this page to try again.");console.error(error);}
}
void load();
