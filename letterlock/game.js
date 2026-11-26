"use strict";
// Browser interface. Game rules live in engine.js.
const $=id=>document.getElementById(id);
const boardEl=$("board"), layer=$("tiles"), input=$("word-input");
const nodes=new Map(), dictionary=new Set(), generationWords=new Set();
let generationTrie;
const storageKey="letterlock-best-v12";
const arrows={up:"↑",down:"↓",left:"←",right:"→"};
let grid=blank(), nextId=0, score=0, best=0, moves=0, words=0, timeouts=0, longest="", parity=0, busy=false, ended=false, ready=false, active=false, selection=[], gesture=null;
try{best=Math.max(0,Number(localStorage.getItem(storageKey))||0);}catch{}
const clock=newWordClock(),roundClock=newRoundClock();
let notificationHandle=null,selectionDeadline=null,selectionHandle=null;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,matchMedia("(prefers-reduced-motion: reduce)").matches?0:ms));
const format=n=>n.toLocaleString();
const status=t=>{$("status").textContent=t;};
const makeLetter=(letter=randomLetter())=>({id:++nextId,kind:"letter",letter});
function addLetters(plan){
  const letters=chooseSpawnLetters(grid,plan,generationTrie);
  plan.forEach(({r,c},i)=>{grid[r][c]=makeLetter(letters[i]);});
}
for(let i=0;i<CONFIG.size**2;i++){const cell=document.createElement("div");cell.className="cell";$("cells").append(cell);}
function hideDifficulty(){
  if(notificationHandle!==null){clearTimeout(notificationHandle);notificationHandle=null;}
  $("difficulty-notice").hidden=true;
}
function announceDifficulty(duration){
  hideDifficulty();
  $("difficulty-notice").textContent="Difficulty increased to "+duration/1000+" seconds";
  $("difficulty-notice").hidden=false;
  notificationHandle=setTimeout(()=>{$("difficulty-notice").hidden=true;notificationHandle=null;},3000);
}
function paintClock(){
  const now=performance.now(),ms=clockRemaining(clock,now),seconds=Math.ceil(ms/1000);
  $("elapsed-time").textContent=formatElapsed(roundElapsed(roundClock,now));
  $("difficulty-phase").textContent="Phase "+(CONFIG.difficultyStages.findIndex(s=>s.duration===clock.duration)+1)+" / "+CONFIG.difficultyStages.length;
  const phase=!active||ended?"stopped":timerPhase(ms,clock.duration);
  $("word-timer").dataset.phase=phase;
  $("timer-value").textContent=String(seconds).padStart(2,"0")+"s";
  $("timer-fill").style.width=(ms/clock.duration*100)+"%";
  $("timer-meter").setAttribute("aria-valuenow",seconds);
  $("timer-meter").setAttribute("aria-valuemax",clock.duration/1000);
}
function beginAction(){
  if(!ready||!active||busy||ended)return false;
  const now=performance.now();
  if(clockRemaining(clock,now)<=0){void timeout();return false;}
  pauseClock(clock,now);pauseRound(roundClock,now);busy=true;controls();paintClock();return true;
}
function finishAction(reset=false){
  const now=performance.now();
  if(reset&&!ended){
    const duration=difficultyAt(roundElapsed(roundClock,now)).duration,previous=clock.duration;
    resetClock(clock,duration);
    if(duration!==previous)announceDifficulty(duration);
  }
  busy=false;
  if(!ended){resumeClock(clock,now);resumeRound(roundClock,now);}
  paintClock();controls();
}
async function timeout(){
  if(!ready||!active||busy||ended||clockRemaining(clock,performance.now())>0)return;
  const now=performance.now();pauseClock(clock,now);pauseRound(roundClock,now);busy=true;gesture=null;controls();paintClock();
  try{
    timeouts++;const plan=invalidSpawnPlan(grid);addLetters(plan);render();
    status("Time expired · "+plan.length+" penalty letters added.");
    await wait(CONFIG.spawnMs);checkEnd();
  }finally{finishAction(true);}
}
function tickClock(){
  if(!ready||!active||ended)return;
  expireSelection();
  if(busy)return;
  paintClock();
  if(clockRemaining(clock,performance.now())<=0)void timeout();
}
function stats(){
  const count=grid.flat().filter(Boolean).length, max=CONFIG.size**2;
  $("score").textContent=format(score);$("best").textContent=format(best);$("moves").textContent=format(moves);$("words").textContent=format(words);
  $("longest").textContent=longest||"—";$("timeouts").textContent=format(timeouts);
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
  const disabled=!ready||!active||busy||ended;
  document.querySelectorAll("[data-dir]").forEach(b=>b.disabled=disabled);
  input.disabled=disabled;$("submit").disabled=disabled||selection.length<CONFIG.minWord;$("clear").disabled=disabled;
  $("restart").disabled=!ready||!active||busy;
  $("start-game").disabled=!ready||active;
}
function paintSelection(){
  for(const node of nodes.values())node.classList.remove("selected");
  for(const [r,c] of selection){const tile=grid[r]?.[c];if(tile)nodes.get(tile.id)?.classList.add("selected");}
  $("path-line").setAttribute("points",selection.map(([r,c])=>(c+.5)+","+(r+.5)).join(" "));
}
function preview(){
  const n=input.value.length;
  document.querySelectorAll("[data-word-length]").forEach(row=>row.classList.toggle("current",Number(row.dataset.wordLength)===n));
  $("word-preview").textContent=Object.hasOwn(CONFIG.points,n)?n+" letters · "+format(CONFIG.points[n])+" possible points":"3–12 letters · Select touching tiles";
}
function setSelection(path){
  const now=performance.now(),oldDeadline=selectionDeadline;
  selection=path||[];
  selectionDeadline=nextSelectionDeadline(oldDeadline,selection.length,now);
  if(selectionDeadline!==oldDeadline){
    if(selectionHandle!==null){clearTimeout(selectionHandle);selectionHandle=null;}
    if(selectionDeadline!==null)scheduleSelectionExpiry();
  }
  input.value=selection.length?wordAt(grid,selection):"";paintSelection();preview();controls();
}
function scheduleSelectionExpiry(){
  if(selectionDeadline===null)return;
  selectionHandle=setTimeout(()=>{
    selectionHandle=null;
    if(!expireSelection())scheduleSelectionExpiry();
  },Math.max(0,selectionDeadline-performance.now()));
}
function resetSelection(){gesture=null;setSelection([]);}
function expireSelection(now=performance.now()){
  if(!selectionExpired(selectionDeadline,now))return false;
  // Cancelling the gesture prevents held-pointer movement or release from submitting or restarting it.
  resetSelection();status("Selection cleared. Reconnect your word.");return true;
}
function updateBest(){if(score<=best)return;best=score;try{localStorage.setItem(storageKey,String(best));}catch{}}
function start(){
  if(!ready||busy)return;
  hideDifficulty();resetRound(roundClock);resetClock(clock);
  active=true;ended=false;nextId=score=moves=words=timeouts=parity=0;longest="";grid=blank();layer.replaceChildren();nodes.clear();resetSelection();
  for(const {r,c,letter} of startingLayout(generationWords))grid[r][c]=makeLetter(letter);
  if($("start-dialog").open)$("start-dialog").close();
  $("over").hidden=true;$("gravity").textContent="Choose a direction";status("Find a word before the timer expires. Aim for five letters or longer.");render(false);const now=performance.now();resumeClock(clock,now);resumeRound(roundClock,now);paintClock();controls();
}
function checkEnd(){
  if(!gameOver(grid))return;
  ended=true;const now=performance.now();pauseClock(clock,now);pauseRound(roundClock,now);hideDifficulty();paintClock();resetSelection();$("summary").textContent=format(score)+" points · "+moves+" shifts · "+words+" words · "+timeouts+" timeouts";
  $("round-duration").textContent="Round time: "+formatElapsed(roundElapsed(roundClock,now));
  $("round-longest").textContent="Longest word: "+(longest||"—");
  $("over").hidden=false;status("The board is full. Round over.");controls();$("game-over-title").focus();
}
async function flash(ids){
  for(const id of ids)nodes.get(id)?.classList.add("matched");
  await wait(CONFIG.clearMs);grid=removeIds(grid,ids);render(false);
}
async function shift(dir){
  if(!ready||!active||busy||ended||!DIRECTIONS.includes(dir))return;
  const next=slide(grid,dir);
  if(!changed(grid,next)){status("No movement in that direction. No letters added.");return;}
  if(!beginAction())return;
  resetSelection();
  try{
    moves++;$("gravity").textContent=arrows[dir]+" Shift "+dir;grid=next;render(false);await wait(CONFIG.slideMs);
    const plan=spawnPlan(grid,dir,parity);parity=1-parity;
    addLetters(plan);
    render();await wait(CONFIG.spawnMs);
    status(plan.length+" letter"+(plan.length===1?"":"s")+" added. Aim for a long word.");
    checkEnd();
  }finally{finishAction();}
}
async function submitWord(){
  if(!ready||!active||busy||ended||expireSelection()||selection.length<CONFIG.minWord)return;
  // Rejected words do not pause, reset, or otherwise alter the clock or board.
  if(clockRemaining(clock,performance.now())<=0){void timeout();return;}
  const path=selection.slice(),word=wordAt(grid,path);
  const result=clearWord(grid,path,dictionary);
  if(!result){resetSelection();status(word+" · Word not recognized. Keep searching!");return;}
  if(!beginAction())return;
  const ids=new Set(path.map(([r,c])=>grid[r][c].id));
  resetSelection();
  try{
    score+=result.points;words++;if(word.length>longest.length)longest=word;updateBest();stats();
    status(word+" · +"+format(result.points)+" points!");
    await flash(ids);
    const plan=wordSpawnPlan(grid,path);
    addLetters(plan);
    render();await wait(CONFIG.spawnMs);
    const net=plan.length-path.length;
    status(word+" · +"+format(result.points)+" points · "+plan.length+" added · "+(net===0?"space unchanged":net<0?(-net)+" spaces gained":net+" extra occupied spaces")+".");
    checkEnd();
  }finally{finishAction(true);}
}
function atPointer(e,inner=false){
  const rect=boardEl.getBoundingClientRect(),y=(e.clientY-rect.top)/rect.height*CONFIG.size,x=(e.clientX-rect.left)/rect.width*CONFIG.size,r=Math.floor(y),c=Math.floor(x);
  if(r<0||r>=CONFIG.size||c<0||c>=CONFIG.size)return null;
  // A small inner hit area avoids selecting a side cell while crossing a diagonal corner.
  if(inner&&(Math.abs(x-c-.5)>.38||Math.abs(y-r-.5)>.38))return null;
  return [r,c];
}
boardEl.addEventListener("pointerdown",e=>{
  if(!ready||!active||busy||ended||!e.isPrimary||e.button!==0)return;
  expireSelection();
  const at=atPointer(e);if(!at||grid[at[0]][at[1]]?.kind!=="letter"){resetSelection();return;}
  e.preventDefault();gesture={id:e.pointerId,start:at,previous:selection.slice(),moved:false,x:e.clientX,y:e.clientY};
  // Highlight the first letter immediately; the deadline starts on pointerdown, not release.
  if(!selection.length)setSelection([at]);
  boardEl.setPointerCapture(e.pointerId);
});
boardEl.addEventListener("pointermove",e=>{
  if(expireSelection()||!gesture||gesture.id!==e.pointerId)return;
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
  if(expireSelection()||!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;
  const at=atPointer(e,true);
  if(g.moved){
    const next=extendPath(grid,selection,at);if(next!==selection)setSelection(next);
    if(selection.length>=CONFIG.minWord)void submitWord();
    else status("Connect at least three touching letters.");
    return;
  }
  const next=togglePath(grid,g.previous,g.start);
  if(next===g.previous&&!same(g.previous[g.previous.length-1],g.start)){status("Choose a touching unused letter, or clear your selection.");return;}
  setSelection(next);
});
boardEl.addEventListener("pointercancel",()=>resetSelection());
$("word-form").addEventListener("submit",e=>{e.preventDefault();void submitWord();});
$("clear").addEventListener("click",()=>resetSelection());
document.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("click",()=>void shift(b.dataset.dir)));
document.addEventListener("keydown",e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;
  if(!active)return;
  // Late word-submission keys must never activate a restart button after gridlock.
  if(ended){if(e.key==="Enter"||e.key===" ")e.preventDefault();return;}
  const dir=directionForKey(e.key);
  if(dir){e.preventDefault();if(!e.repeat)void shift(dir);return;}
  if(e.key===" "&&!ended)e.preventDefault();
  if(!ready||!active||busy||ended)return;
  if(e.key==="Escape"){resetSelection();return;}
  if((e.key==="Enter"||e.key===" ")&&selection.length>=CONFIG.minWord){e.preventDefault();if(!e.repeat)void submitWord();}
});
document.addEventListener("keyup",e=>{if(active&&ended&&(e.key==="Enter"||e.key===" "))e.preventDefault();});
$("start-game").addEventListener("click",start);
$("start-dialog").addEventListener("cancel",e=>e.preventDefault());
$("restart").addEventListener("click",start);$("again").addEventListener("click",start);
async function load(){
  try{
    const [validation,common,longWords]=await Promise.all([fetch("enable-words.txt?v=4"),fetch("words.txt?v=1"),fetch("enable-long-words.txt?v=7")]);
    if(!validation.ok||!common.ok||!longWords.ok)throw Error("Dictionary unavailable");
    const [validationText,commonText,longText]=await Promise.all([validation.text(),common.text(),longWords.text()]);
    for(const word of validationText.toUpperCase().split(/\s+/))if(/^[A-Z]{3,8}$/.test(word))dictionary.add(word);
    for(const word of longText.toUpperCase().split(/\s+/))if(/^[A-Z]{9,12}$/.test(word))dictionary.add(word);
    for(const word of commonText.toUpperCase().split(/\s+/))if(/^[A-Z]{3,8}$/.test(word)&&dictionary.has(word))generationWords.add(word);
    if(dictionary.size<152637||generationWords.size<17000)throw Error("Incomplete dictionary");
    generationTrie=buildGenerationTrie(generationWords);
    ready=true;controls();$("start-status").textContent="Ready when you are. The timer starts when you press Start Game.";status("Press Start Game to begin.");$("start-game").focus();
  }catch(error){const message="Could not load the dictionary. Reload this page to try again.";status(message);$("start-status").textContent=message;console.error(error);}
}
render(false);paintClock();controls();
$("start-dialog").showModal();
setInterval(tickClock,100);
void load();
