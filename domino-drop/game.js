(()=>{
"use strict";
const E=DominoEngine,$=id=>document.getElementById(id);
const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8]};
const boardEl=$("board"),queueEl=$("queue"),overlay=$("overlay"),startBtn=$("start");
const grid=Array.from({length:E.W*E.H},()=>{const n=document.createElement("div");n.className="cell";boardEl.append(n);return n;});
let board=E.empty(),active=null,queue=[],score=0,placed=0,best=0,wave=0,state="idle",resumeState="falling",fall=0,ground=0,phaseTime=0,last=0,match=null;
const held=new Map(),KEY="domino-drop-best-v1";
try{best=Math.max(0,Number(localStorage.getItem(KEY))||0);}catch{}
$("best").textContent=best.toLocaleString();
function tileEl(t,extra=""){const el=document.createElement("div");el.className="tile "+t.color+" "+extra;el.setAttribute("aria-label",t.color+" "+t.pips);for(const pos of PIPS[t.pips]){const dot=document.createElement("i");dot.className="pip";dot.style.gridColumn=pos%3+1;dot.style.gridRow=Math.floor(pos/3)+1;el.append(dot);}return el;}
function renderQueue(){queueEl.replaceChildren(...queue.map((pair,i)=>{const el=document.createElement("div");el.className="preview";el.setAttribute("aria-label","Upcoming "+(i+1));el.append(...pair.map(t=>tileEl(t)));return el;}));}
function render(){
 const ghosts=active?E.ghost(board,active):[],live=active?E.cells(active):[];
 const marked=new Set(match?match.cells.map(c=>c.y*E.W+c.x):[]);
 const doubles=new Set(match?match.groups.filter(g=>g.kind==="double").flatMap(g=>g.cells.map(c=>c.y*E.W+c.x)):[]);
 const maths=new Set(match?match.groups.filter(g=>g.kind==="math").flatMap(g=>g.cells.map(c=>c.y*E.W+c.x)):[]);
 for(let i=0;i<grid.length;i++){const x=i%E.W,y=Math.floor(i/E.W),n=grid[i];n.replaceChildren();const t=board[y][x],a=live.find(c=>c.x===x&&c.y===y),g=ghosts.find(c=>c.x===x&&c.y===y);
  if(t)n.append(tileEl(t,marked.has(i)?"flash "+(doubles.has(i)?"double":maths.has(i)?"math":""):""));
  else if(a)n.append(tileEl(a.t,"active "+(a.t===active.tiles[0]?"first":"")));
  else if(g)n.append(tileEl(g.t,"ghost"));
 }
 $("score").textContent=score.toLocaleString();$("best").textContent=best.toLocaleString();$("pieces").textContent=placed;$("level").textContent=1+Math.floor(placed/20);
}
function feedback(s){$("feedback").textContent=s;}
function clearHeld(){held.clear();document.querySelectorAll(".controls button").forEach(b=>b.classList.remove("held"));}
function show(title,body,button){$("overlay-title").textContent=title;$("overlay-text").textContent=body;startBtn.textContent=button;overlay.hidden=false;}
function save(){if(score>best){best=score;try{localStorage.setItem(KEY,String(best));}catch{}}}
function end(){active=null;state="over";clearHeld();$("pause").disabled=true;save();render();show("Game over",score.toLocaleString()+" points · "+placed+" dominoes placed","Play again");feedback("Board full — round over.");}
function spawn(){wave=0;match=null;active=E.spawn(queue.shift());queue.push(E.pair());renderQueue();fall=0;ground=0;if(!E.fits(board,active)){end();return;}state="falling";render();}
function start(){board=E.empty();queue=[E.pair(),E.pair(),E.pair(),E.pair()];score=0;placed=0;match=null;clearHeld();overlay.hidden=true;$("pause").disabled=false;$("pause").textContent="Pause";feedback("Match colors or make 10.");spawn();}
function nextWave(){match=E.findMatches(board);if(!match.cells.length){match=null;spawn();return;}wave++;const gain=match.base*wave;score+=gain;save();const parts=[];if(wave>1)parts.push("CASCADE ×"+wave);if(match.count>1)parts.push(match.count+"-MATCH COMBO");if(match.double)parts.push("DOUBLE MATCH");else if(match.math)parts.push("10!");else parts.push("COLOR MATCH");feedback(parts.join(" · ")+"  +"+gain.toLocaleString());state="clearing";phaseTime=300;render();}
function land(){board=E.lock(board,active);active=null;placed++;clearHeld();state="settling";phaseTime=110;render();}
function grounded(){return active&&E.move(board,active,0,1)===active;}
function act(action){if(state!=="falling"||!active)return;const prev=active;if(action==="left")active=E.move(board,active,-1,0);if(action==="right")active=E.move(board,active,1,0);if(action==="rotate")active=E.rotate(board,active);if(action==="down"){active=E.move(board,active,0,1);fall=0;}if(active!==prev){if(!grounded())ground=0;render();}}
function press(action,source){if(state!=="falling"||held.has(source))return;held.set(source,{action,repeat:performance.now()+150});act(action);document.querySelector('[data-action="'+action+'"]').classList.add("held");}
function release(source){const h=held.get(source);if(!h)return;held.delete(source);if(![...held.values()].some(v=>v.action===h.action))document.querySelector('[data-action="'+h.action+'"]').classList.remove("held");}
function pause(){if(state==="paused"){state=resumeState;overlay.hidden=true;$("pause").textContent="Pause";return;}if(!["falling","settling","clearing"].includes(state))return;resumeState=state;state="paused";clearHeld();$("pause").textContent="Resume";show("Paused","Take your time.","Resume");}
startBtn.addEventListener("click",()=>{if(state==="paused")pause();else if(state==="idle"||state==="over")start();});
$("pause").addEventListener("click",pause);
const keys={a:"left",d:"right",w:"rotate",s:"down",ArrowLeft:"left",ArrowRight:"right",ArrowUp:"rotate",ArrowDown:"down"};
document.addEventListener("keydown",e=>{if(e.ctrlKey||e.altKey||e.metaKey)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(k==="p"||k==="Escape"){if(!e.repeat){e.preventDefault();pause();}return;}if(keys[k]){e.preventDefault();if(!e.repeat)press(keys[k],"key:"+e.code);}if(state==="over"&&(k==="Enter"||k===" "))e.preventDefault();});
document.addEventListener("keyup",e=>{release("key:"+e.code);if(state==="over"&&(e.key==="Enter"||e.key===" "))e.preventDefault();});
document.querySelectorAll(".controls button").forEach(btn=>{
 btn.addEventListener("pointerdown",e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);press(btn.dataset.action,"pointer:"+e.pointerId);});
 for(const type of ["pointerup","pointercancel","lostpointercapture"])btn.addEventListener(type,e=>release("pointer:"+e.pointerId));
 btn.addEventListener("click",e=>{if(e.detail===0)act(btn.dataset.action);});
});
window.addEventListener("blur",()=>{clearHeld();if(["falling","settling","clearing"].includes(state))pause();});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&["falling","settling","clearing"].includes(state))pause();});
function frame(now){
 const dt=last?Math.min(50,now-last):0;last=now;
 if(state==="falling"){
  for(const h of held.values())if((h.action==="left"||h.action==="right")&&now>=h.repeat){act(h.action);h.repeat=now+85;}
  const fast=[...held.values()].some(h=>h.action==="down"),interval=fast?1000/15:E.speed(placed);
  fall+=dt;
  if(fall>=interval){fall%=interval;act("down");}
  if(grounded()){ground+=dt;if(ground>=500)land();}else ground=0;
 }else if(state==="settling"||state==="clearing"){
  phaseTime-=dt;if(phaseTime<=0){if(state==="clearing"){board=E.clear(board,match);match=null;state="settling";phaseTime=110;render();}else nextWave();}
 }
 requestAnimationFrame(frame);
}
render();requestAnimationFrame(frame);
})();