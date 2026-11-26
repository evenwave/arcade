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
  "spawnMs": 160
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
