/* Domino Drop — pure, deterministic game rules. */
const DominoEngine=(()=>{
"use strict";
const W=6,H=12, COLORS=["red","blue","green","yellow"];
const OFFSETS=[[1,0],[0,1],[-1,0],[0,-1]];
const empty=()=>Array.from({length:H},()=>Array(W).fill(null));
const copy=b=>b.map(r=>r.slice());
const tile=(rng=Math.random)=>({color:COLORS[Math.floor(rng()*4)],pips:1+Math.floor(rng()*5)});
const pair=(rng=Math.random)=>[tile(rng),tile(rng)];
const cells=p=>[{x:p.x,y:p.y,t:p.tiles[0]},{x:p.x+OFFSETS[p.rot][0],y:p.y+OFFSETS[p.rot][1],t:p.tiles[1]}];
const fits=(b,p)=>cells(p).every(({x,y})=>x>=0&&x<W&&y>=0&&y<H&&!b[y][x]);
const spawn=tiles=>({x:2,y:0,rot:0,tiles});
const move=(b,p,dx,dy)=>{const n={...p,x:p.x+dx,y:p.y+dy};return fits(b,n)?n:p;};
function rotate(b,p){
 const rot=(p.rot+1)%4;
 // Prefer no displacement; try a one-cell wall kick, then a vertical kick near floor/spawn.
 for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){
  const n={...p,rot,x:p.x+dx,y:p.y+dy};if(fits(b,n))return n;
 }
 return p;
}
function settle(b){
 const n=empty();for(let x=0;x<W;x++){let y=H-1;for(let r=H-1;r>=0;r--)if(b[r][x])n[y--][x]=b[r][x];}return n;
}
function drop(b,p){let n=p;for(;;){const q=move(b,n,0,1);if(q===n)return n;n=q;}}
function lock(b,p){const n=copy(b);for(const {x,y,t} of cells(p))n[y][x]=t;return settle(n);}
function ghost(b,p){
 const landed=lock(b,drop(b,p)), result=[];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(p.tiles.includes(landed[y][x]))result.push({x,y,t:landed[y][x]});
 return result;
}
function findMatches(b){
 const lines=[];
 for(let y=0;y<H;y++)lines.push(Array.from({length:W},(_,x)=>({x,y,t:b[y][x]})));
 for(let x=0;x<W;x++)lines.push(Array.from({length:H},(_,y)=>({x,y,t:b[y][x]})));
 const removed=new Map(), groups=[];
 const add=(kind,arr,points)=>{groups.push({kind,cells:arr,points});for(const c of arr)removed.set(c.y*W+c.x,c);};
 for(const line of lines){
  // Score each sum-to-ten triple once; each maximal color run once unless a
  // double in that run already includes its color reward.
  const doubles=new Set();
  for(let i=0;i<=line.length-3;i++){
   const a=line.slice(i,i+3);if(!a.every(c=>c.t)||a.reduce((s,c)=>s+c.t.pips,0)!==10)continue;
   const double=a.every(c=>c.t.color===a[0].t.color);
   if(double)doubles.add(i);
   add(double?"double":"math",a,double?250:100);
  }
  for(let i=0;i<line.length;){
   if(!line[i].t){i++;continue;}
   let j=i+1;while(j<line.length&&line[j].t&&line[j].t.color===line[i].t.color)j++;
   if(j-i>=3){
    const covered=[...doubles].some(k=>k>=i&&k+3<=j);
    add("color",line.slice(i,j),covered?0:25);
   }
   i=j;
  }
 }
 const scored=groups.filter(g=>g.points>0);
 return {cells:[...removed.values()],groups,base:scored.reduce((s,g)=>s+g.points,0),count:scored.length,double:scored.some(g=>g.kind==="double"),math:scored.some(g=>g.kind==="math"||g.kind==="double")};
}
function clear(b,m){const n=copy(b);for(const {x,y} of m.cells)n[y][x]=null;return settle(n);}
const speed=placed=>Math.max(150,1000*Math.pow(.9,Math.floor(placed/20)));
return {W,H,COLORS,empty,copy,tile,pair,cells,fits,spawn,move,rotate,settle,drop,lock,ghost,findMatches,clear,speed};
})();
