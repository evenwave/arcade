"use strict";
// Letterlock pure game rules.
const CONFIG = {
  "size": 8,
  "startingLetters": 24,
  "incomingLetters": 4,
  "minWord": 3,
  "maxWord": 8,
  "letterWeights": {
    "A": 9,
    "B": 2,
    "C": 2,
    "D": 4,
    "E": 12,
    "F": 2,
    "G": 3,
    "H": 2,
    "I": 9,
    "J": 1,
    "K": 1,
    "L": 4,
    "M": 2,
    "N": 6,
    "O": 8,
    "P": 2,
    "Q": 1,
    "R": 6,
    "S": 4,
    "T": 6,
    "U": 4,
    "V": 2,
    "W": 2,
    "X": 1,
    "Y": 2,
    "Z": 1
  },
  "points": {
    "3": 10,
    "4": 50,
    "5": 300,
    "6": 750,
    "7": 2000,
    "8": 5000
  },
  "slideMs": 165,
  "clearMs": 180,
  "spawnMs": 160,
  "assistedChance": 0.4,
  "assistedCandidates": 8,
  "searchBudget": 40000,
  "minOpportunityLength": 5
};
const DIRECTIONS = ["up","down","left","right"];
function blank(){return Array.from({length:CONFIG.size},()=>Array(CONFIG.size).fill(null));}

function shuffle(list,rng=Math.random){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function randomLetter(rng=Math.random){const pairs=Object.entries(CONFIG.letterWeights);let n=rng()*pairs.reduce((sum,p)=>sum+p[1],0);for(const [l,w] of pairs){n-=w;if(n<0)return l;}return "E";}

function slide(grid,dir){const n=grid.length,out=blank(),vertical=dir==="up"||dir==="down",reverse=dir==="down"||dir==="right";for(let i=0;i<n;i++){const cells=Array.from({length:n},(_,j)=>vertical?[j,i]:[i,j]);if(reverse)cells.reverse();const tiles=cells.map(([r,c])=>grid[r][c]).filter(Boolean);tiles.forEach((t,j)=>{const [r,c]=cells[j];out[r][c]=t;});}return out;}

function changed(a,b){return a.some((row,r)=>row.some((t,c)=>t!==b[r][c]));}

function removeIds(grid,ids){return grid.map(row=>row.map(t=>t&&ids.has(t.id)?null:t));}

function canShift(grid,dir){return changed(grid,slide(grid,dir));}

function entrySlots(grid,dir,parity){const n=grid.length,out=[];for(let i=parity;i<n;i+=2){const [r,c]=dir==="right"?[i,0]:dir==="left"?[i,n-1]:dir==="down"?[0,i]:[n-1,i];if(!grid[r][c])out.push([r,c]);}return out;}

function emptySlots(grid){const out=[];for(let r=0;r<grid.length;r++)for(let c=0;c<grid.length;c++)if(!grid[r][c])out.push([r,c]);return out;}

function selectSlots(grid,groups,rng=Math.random){const selected=[],seen=new Set();for(const {cells,limit} of groups){let taken=0;for(const [r,c] of shuffle(cells,rng)){if(selected.length>=CONFIG.incomingLetters||taken>=limit)break;const key=r*grid.length+c;if(grid[r]?.[c]!==null||seen.has(key))continue;seen.add(key);selected.push({r,c,kind:"letter"});taken++;}}return selected;}

function spawnPlan(grid,dir,parity,rng=Math.random){return selectSlots(grid,[{cells:entrySlots(grid,dir,parity),limit:4},{cells:entrySlots(grid,dir,1-parity),limit:4},{cells:emptySlots(grid),limit:4}],rng);}

function wordSpawnPlan(grid,clearedPath,rng=Math.random){const n=grid.length,empty=emptySlots(grid),perimeter=empty.filter(([r,c])=>r===0||c===0||r===n-1||c===n-1),outside=perimeter.filter(([r,c])=>!clearedPath.some(p=>p[0]===r&&p[1]===c));return selectSlots(grid,[{cells:clearedPath,limit:2},{cells:outside,limit:2},{cells:perimeter,limit:4},{cells:empty,limit:4}],rng);}

function invalidSpawnPlan(grid,rng=Math.random){return selectSlots(grid,[{cells:emptySlots(grid),limit:4}],rng);}

function same(a,b){return !!a&&!!b&&a[0]===b[0]&&a[1]===b[1];}

function adjacent(a,b){return !!a&&!!b&&!same(a,b)&&Math.abs(a[0]-b[0])<=1&&Math.abs(a[1]-b[1])<=1;}

function extendPath(grid,path,at){if(!at||grid[at[0]]?.[at[1]]?.kind!=="letter")return path;const n=path.length;if(!n)return [at];if(same(path[n-1],at))return path;if(n>1&&same(path[n-2],at))return path.slice(0,-1);if(n>=CONFIG.maxWord||!adjacent(path[n-1],at)||path.some(p=>same(p,at)))return path;return [...path,at];}

function wordAt(grid,path){return path.map(([r,c])=>grid[r][c].letter).join("");}

function clearWord(grid,path,dictionary){if(!path||path.length<CONFIG.minWord||path.length>CONFIG.maxWord)return null;const seen=new Set();for(let i=0;i<path.length;i++){const [r,c]=path[i],t=grid[r]?.[c];if(t?.kind!=="letter"||seen.has(t.id)||(i&&!adjacent(path[i-1],path[i])))return null;seen.add(t.id);}const word=wordAt(grid,path);if(!dictionary.has(word))return null;return {word,points:CONFIG.points[word.length],grid:removeIds(grid,seen)};}

function gameOver(grid){return emptySlots(grid).length===0;}

// Context-aware generation: evaluate only distinct words that use at least one newly placed tile.
function buildGenerationTrie(words){const root={children:Object.create(null),word:null};for(const word of words){if(word.length<CONFIG.minOpportunityLength||word.length>CONFIG.maxWord)continue;let node=root;for(const c of word){node.children[c]??={children:Object.create(null),word:null};node=node.children[c];}node.word=word;}return root;}

function opportunityWords(grid,trie,newCells=null,budget=CONFIG.searchBudget){
  const n=grid.length,used=new Uint8Array(n*n),fresh=new Uint8Array(n*n),found=new Set();
  if(newCells)for(const {r,c} of newCells)fresh[r*n+c]=1;
  let visits=0;
  function visit(r,c,node,depth,touchesNew){
    if(visits>=budget||r<0||c<0||r>=n||c>=n)return;
    const i=r*n+c,t=grid[r][c];if(!t||used[i])return;
    const child=node.children[t.letter];if(!child)return;
    visits++;used[i]=1;const touches=touchesNew||!!fresh[i];
    if(child.word&&touches)found.add(child.word);
    if(depth<CONFIG.maxWord)for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)visit(r+dr,c+dc,child,depth+1,touches);
    used[i]=0;
  }
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)visit(r,c,trie,1,!newCells);
  return found;
}

function opportunityScore(words){const counts=[0,0,0,0,0,0,0,0,0],weights=[0,0,0,0,0,1,3,6,10];for(const word of words)counts[word.length]++;return counts.reduce((sum,count,len)=>sum+Math.min(count,8)*weights[len],0);}

function simulatedBoard(grid,plan,letters){const copy=grid.map(row=>row.slice());for(let i=0;i<plan.length;i++){const {r,c}=plan[i];copy[r][c]={kind:"letter",letter:letters[i]};}return copy;}

function chooseSpawnLetters(grid,plan,trie,rng=Math.random,chance=CONFIG.assistedChance){
  const assisted=!!trie&&plan.length>0&&rng()<chance;
  const sample=()=>plan.map(()=>randomLetter(rng));
  let best=sample();if(!assisted||emptySlots(grid).length<=plan.length)return best;
  let score=opportunityScore(opportunityWords(simulatedBoard(grid,plan,best),trie,plan));
  for(let i=1;i<CONFIG.assistedCandidates;i++){
    const candidate=sample(),value=opportunityScore(opportunityWords(simulatedBoard(grid,plan,candidate),trie,plan));
    if(value>score){best=candidate;score=value;}
  }
  return best;
}

const STARTER_WORDS = ["APPLE","BEACH","BREAD","BRICK","CHAIR","CLOUD","DREAM","EARTH","FLAME","FLOOR","FRUIT","GLASS","GRASS","GREEN","HEART","HORSE","HOUSE","LIGHT","MONEY","MUSIC","OCEAN","PAINT","PAPER","PEACE","PLANT","RIVER","ROUND","SHEEP","SHIRT","SMILE","SPACE","STONE","STORM","SUGAR","TABLE","TIGER","TRAIN","WATER","WORLD","YOUTH","BASKET","BRIDGE","BUTTER","CAMERA","CANDLE","CASTLE","COFFEE","DANGER","FOREST","FRIEND","GARDEN","GOLDEN","GUITAR","HAMMER","ISLAND","JACKET","LETTER","MARKET","MONKEY","ORANGE","PENCIL","PLANET","POCKET","PURPLE","RABBIT","ROCKET","SILVER","SUMMER","SUNSET","THINGS","TICKET","TOMATO","TRAVEL","TURTLE","WINDOW","WINTER","WONDER"];
function starterPath(grid,length,rng=Math.random){
  const n=grid.length,used=new Uint8Array(n*n),path=[];
  function walk(r,c){
    const idx=r*n+c;if(grid[r][c]||used[idx])return false;
    used[idx]=1;path.push([r,c]);if(path.length===length)return true;
    const neighbors=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if((dr||dc)&&rr>=0&&cc>=0&&rr<n&&cc<n&&!grid[rr][cc]&&!used[rr*n+cc])neighbors.push([rr,cc]);}
    for(const [rr,cc] of shuffle(neighbors,rng))if(walk(rr,cc))return true;
    path.pop();used[idx]=0;return false;
  }
  for(const [r,c] of shuffle(emptySlots(grid),rng))if(walk(r,c))return path.slice();return null;
}

function startingLayout(dictionary,rng=Math.random){
  const options=shuffle(STARTER_WORDS.filter(w=>dictionary.has(w)),rng);
  if(options.length<2)throw Error("Starter vocabulary unavailable");
  const grid=blank(),placements=[];
  for(const word of options.slice(0,2)){
    const path=starterPath(grid,word.length,rng);
    if(!path)throw Error("Unable to place opening word");
    path.forEach(([r,c],i)=>{const letter=word[i];grid[r][c]={kind:"letter",letter};placements.push({r,c,letter});});
  }
  for(const [r,c] of shuffle(emptySlots(grid),rng).slice(0,CONFIG.startingLetters-placements.length))placements.push({r,c,letter:randomLetter(rng)});
  return placements;
}
