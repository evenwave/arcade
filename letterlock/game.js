"use strict";
// Browser interface. Game rules live in engine.js.
const $=id=>document.getElementById(id);
const boardEl=$("board"), layer=$("tiles"), input=$("word-input");
const nodes=new Map(), dictionary=new Set();
let trie;
const storageKey="letterlock-best-v2";
const arrows={up:"↑",down:"↓",left:"←",right:"→"};
let grid=blank(), nextId=0, score=0, best=0, moves=0, words=0, longest="", parity=0, busy=false, ended=false, ready=false, selection=[], gesture=null;
try{best=Math.max(0,Number(localStorage.getItem(storageKey))||0);}catch{}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,matchMedia("(prefers-reduced-motion: reduce)").matches?0:ms));
const format=n=>n.toLocaleString();
const status=t=>{$("status").textContent=t;};
const makeLetter=()=>({id:++nextId,kind:"letter",letter:randomLetter()});
for(let i=0;i<CONFIG.size**2;i++){const cell=document.createElement("div");cell.className="cell";$("cells").append(cell);}
function stats(){
  const count=grid.flat().filter(Boolean).length, max=CONFIG.size**2;
  $("score").textContent=format(score);$("best").textContent=format(best);$("moves").textContent=format(moves);$("words").textContent=format(words);
  $("longest").textContent=longest||"—";
  $("occupancy").textContent=count+" / "+max+" blocks";$("fill").style.width=(count/max*100)+"%";$("fill").style.background=count/max>.8?"#ee7988":count/max>.6?"#f1c66c":"var(--accent)";
  document.querySelector(".meter").setAttribute("aria-valuenow",count);
}
function render(animateNew=true){
  const present=new Set();
  grid.forEach((row,r)=>row.forEach((tile,c)=>{
    if(!tile)return;present.add(tile.id);let node=nodes.get(tile.id);
    if(!node){
      node=document.createElement("div");node.className="tile letter"+(animateNew?" spawn":"");
      const face=document.createElement("div");face.className="face";face.textContent=tile.letter;node.append(face);layer.append(node);nodes.set(tile.id,node);
    }
    node.style.transform="translate("+(c*100)+"%, "+(r*100)+"%)";
    node.setAttribute("aria-label",tile.letter+", row "+(r+1)+", column "+(c+1));
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
  $("path-line").setAttribute("points",selection.map(([r,c])=>(c+.5)+","+(r+.5)).join(" "));
}
function preview(){
  const n=input.value.length;
  $("word-preview").textContent=CONFIG.points[n]?n+" letters · "+format(CONFIG.points[n])+" possible points":"3–8 letters · Connect touching tiles";
}
function setSelection(path){selection=path||[];input.value=selection.length?wordAt(grid,selection):"";paintSelection();preview();}
function resetSelection(){gesture=null;setSelection([]);}
function updateBest(){if(score<=best)return;best=score;try{localStorage.setItem(storageKey,String(best));}catch{}}
function start(){
  if(!ready||busy)return;
  ended=false;nextId=score=moves=words=parity=0;longest="";grid=blank();layer.replaceChildren();nodes.clear();resetSelection();
  const positions=shuffle(Array.from({length:CONFIG.size**2},(_,i)=>[Math.floor(i/CONFIG.size),i%CONFIG.size]));
  for(const [r,c] of positions.slice(0,CONFIG.startingLetters))grid[r][c]=makeLetter();
  $("over").hidden=true;$("gravity").textContent="Choose a direction";status("Look for a word or shift to arrange the letters.");render(false);controls();
}
function checkEnd(){
  if(!gameOver(grid,trie))return;
  ended=true;resetSelection();$("summary").textContent=format(score)+" points · "+moves+" shifts · "+words+" words";
  $("round-longest").textContent="Longest word: "+(longest||"—");
  $("over").hidden=false;status("No valid words or shifts remaining.");controls();$("again").focus();
}
async function flash(ids){
  for(const id of ids)nodes.get(id)?.classList.add("matched");
  await wait(CONFIG.clearMs);grid=removeIds(grid,ids);render(false);
}
async function shift(dir){
  if(!ready||busy||ended||!DIRECTIONS.includes(dir))return;
  const next=slide(grid,dir);
  if(!changed(grid,next)){status("No movement in that direction. No letters added.");return;}
  busy=true;controls();resetSelection();
  try{
    moves++;$("gravity").textContent=arrows[dir]+" Shift "+dir;grid=next;render(false);await wait(CONFIG.slideMs);
    const plan=spawnPlan(grid,dir,parity);parity=1-parity;
    for(const {r,c} of plan)grid[r][c]=makeLetter();
    render();await wait(CONFIG.spawnMs);
    status(plan.length+" letter"+(plan.length===1?"":"s")+" added. Find a connected word.");
    checkEnd();
  }finally{busy=false;controls();}
}
async function submitWord(){
  if(!ready||busy||ended)return;
  const word=input.value.trim().toUpperCase();
  if(!/^[A-Z]{3,8}$/.test(word)){status("Choose a word of 3–8 letters.");return;}
  if(!dictionary.has(word)){status(word+" is not in the prototype dictionary.");return;}
  const path=selection.length&&wordAt(grid,selection)===word?selection:findWord(grid,trie,word);
  const result=clearWord(grid,path,dictionary);
  if(!result){status(word+" must follow a connected path without reusing tiles.");return;}
  busy=true;controls();const ids=new Set(path.map(([r,c])=>grid[r][c].id));resetSelection();
  try{
    score+=result.points;words++;if(word.length>longest.length)longest=word;updateBest();stats();
    status(word+" · +"+format(result.points)+" points! No new blocks added.");
    await flash(ids); // Word clearing leaves all other letters in place.
    checkEnd();
  }finally{busy=false;controls();}
}
function atPointer(e,inner=false){
  const rect=boardEl.getBoundingClientRect(),y=(e.clientY-rect.top)/rect.height*CONFIG.size,x=(e.clientX-rect.left)/rect.width*CONFIG.size,r=Math.floor(y),c=Math.floor(x);
  if(r<0||r>=CONFIG.size||c<0||c>=CONFIG.size)return null;
  // A small inner hit area avoids selecting a side cell while crossing a diagonal corner.
  if(inner&&(Math.abs(x-c-.5)>.38||Math.abs(y-r-.5)>.38))return null;
  return [r,c];
}
boardEl.addEventListener("pointerdown",e=>{
  if(!ready||busy||ended||!e.isPrimary||e.button!==0)return;
  const at=atPointer(e);if(!at||grid[at[0]][at[1]]?.kind!=="letter"){resetSelection();return;}
  e.preventDefault();gesture={id:e.pointerId,start:at,previous:selection.slice(),moved:false,x:e.clientX,y:e.clientY};
  boardEl.setPointerCapture(e.pointerId);
});
boardEl.addEventListener("pointermove",e=>{
  if(!gesture||gesture.id!==e.pointerId)return;
  if(!gesture.moved){
    if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<6)return;
    gesture.moved=true;setSelection([gesture.start]);
  }
  const events=e.getCoalescedEvents?.()||[];
  for(const event of events.length?events:[e]){
    const at=atPointer(event,true);if(!at)continue;
    const next=extendPath(grid,selection,at);if(next!==selection)setSelection(next);
  }
});
boardEl.addEventListener("pointerup",e=>{
  if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;
  const at=atPointer(e,true);
  if(g.moved){
    const next=extendPath(grid,selection,at);if(next!==selection)setSelection(next);
    if(selection.length>=CONFIG.minWord)void submitWord();
    else status("Connect at least three touching letters.");
    return;
  }
  const next=extendPath(grid,g.previous,g.start);
  if(next===g.previous&&!same(g.previous[g.previous.length-1],g.start)){status("Choose a touching unused letter, or clear your selection.");return;}
  setSelection(next);
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
    trie=buildTrie(dictionary);
    ready=true;start();
  }catch(error){status("Could not load the dictionary. Reload this page to try again.");console.error(error);}
}
void load();
