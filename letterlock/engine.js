"use strict";
// Letterlock pure game rules; kept separate from the browser interface.
const CONFIG = {
  "size": 8,
  "startingLetters": 24,
  "obstacleColors": 3,
  "incomingLetters": 1,
  "incomingObstacles": 2,
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
    "3": 100,
    "4": 250,
    "5": 600,
    "6": 1200,
    "7": 2500,
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

function colorMatches(grid){const ids=new Set(),n=grid.length;for(const vertical of [false,true])for(let i=0;i<n;i++){const at=j=>vertical?grid[j][i]:grid[i][j];for(let j=0;j<n;){const t=at(j);if(t?.kind!=="obstacle"){j++;continue;}let end=j+1;while(end<n&&at(end)?.kind==="obstacle"&&at(end).color===t.color)end++;if(end-j>=3)for(let k=j;k<end;k++)ids.add(at(k).id);j=end;}}return ids;}

function removeIds(grid,ids){return grid.map(row=>row.map(t=>t&&ids.has(t.id)?null:t));}

function canShift(grid,dir){const next=slide(grid,dir);return changed(grid,next)||colorMatches(next).size>0;}

function entrySlots(grid,dir,parity){const n=grid.length,out=[];for(let i=parity;i<n;i+=2){const [r,c]=dir==="right"?[i,0]:dir==="left"?[i,n-1]:dir==="down"?[0,i]:[n-1,i];if(!grid[r][c])out.push([r,c]);}return out;}

function spawnPlan(grid,dir,parity,rng=Math.random){const slots=shuffle(entrySlots(grid,dir,parity),rng).slice(0,CONFIG.incomingLetters+CONFIG.incomingObstacles);const types=shuffle(Array.from({length:slots.length},(_,i)=>i<CONFIG.incomingLetters?"letter":"obstacle"),rng);return slots.map(([r,c],i)=>({r,c,kind:types[i]}));}

function lineBetween(grid,a,b){if(!a||!b||a[0]!==b[0]&&a[1]!==b[1])return null;const dr=Math.sign(b[0]-a[0]),dc=Math.sign(b[1]-a[1]),len=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))+1;const path=Array.from({length:len},(_,i)=>[a[0]+dr*i,a[1]+dc*i]);return path.every(([r,c])=>grid[r]?.[c]?.kind==="letter")?path:null;}

function wordAt(grid,path){return path.map(([r,c])=>grid[r][c].letter).join("");}

function findWord(grid,dictionary,target=null){const n=grid.length;for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(grid[r][c]?.kind!=="letter")continue;for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]){let word="",path=[];for(let i=0;i<CONFIG.maxWord;i++){const rr=r+dr*i,cc=c+dc*i,t=grid[rr]?.[cc];if(t?.kind!=="letter")break;word+=t.letter;path.push([rr,cc]);if(target&&!target.startsWith(word))break;if(word.length>=CONFIG.minWord&&(target?word===target:dictionary.has(word)))return path;}}}return null;}

function clearWord(grid,path,dictionary){if(!path||path.length<CONFIG.minWord||path.length>CONFIG.maxWord)return null;const exact=lineBetween(grid,path[0],path[path.length-1]);if(!exact||exact.length!==path.length||!exact.every((p,i)=>p[0]===path[i][0]&&p[1]===path[i][1]))return null;const word=wordAt(grid,exact);if(!dictionary.has(word))return null;return {word,points:CONFIG.points[word.length],grid:removeIds(grid,new Set(exact.map(([r,c])=>grid[r][c].id)))};}

function gameOver(grid,dictionary){return !DIRECTIONS.some(d=>canShift(grid,d))&&!findWord(grid,dictionary);}
