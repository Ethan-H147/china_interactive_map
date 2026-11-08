// An original diorama of a Ming-era Great Wall section on an autumn mountain ridge.
// The wall follows the crest with stepped walkways, an outer battlement and a low inner
// parapet; four two-level watchtowers stand on the high points, the summit tower with a
// tiled lookout. The landscape is a smooth heightfield with a painted ground texture and
// individual pines and broadleaf trees.
import {clamp,lerp,smooth,smax,hex,mixColor,createNoise,createLandscape} from './collectible-landscape.mjs';
export async function createGreatWallCollectible(api){
 const {tri,quad,plinth,palette,masks,getParts}=api;
 Object.assign(palette,{
  gwGround:{color:'#ffffff',metal:0,rough:.95},gwSoil:{color:'#5a4634',metal:0,rough:1},gwBedrock:{color:'#77705f',metal:0,rough:.95},
  gwBrick:{color:'#8f8778',metal:0,rough:.88},gwBrickB:{color:'#867e70',metal:0,rough:.9},gwBrickC:{color:'#9a9283',metal:0,rough:.86},
  gwStone:{color:'#a59d8a',metal:0,rough:.85},gwStoneB:{color:'#998f7c',metal:0,rough:.88},gwCap:{color:'#bab19d',metal:0,rough:.8},
  gwPaver:{color:'#aaa18c',metal:0,rough:.86},gwPaverB:{color:'#9e9480',metal:0,rough:.88},gwRiser:{color:'#7c7465',metal:0,rough:.92},
  gwOpening:{color:'#1f1d1a',metal:0,rough:1},gwTile:{color:'#4b4f4d',metal:.04,rough:.7},gwTileB:{color:'#5a5f5b',metal:.04,rough:.68},gwTimber:{color:'#7a3324',metal:0,rough:.66},
  gwPine:{color:'#2f4a2d',metal:0,rough:.9},gwPineB:{color:'#3b5532',metal:0,rough:.9},gwLeafGreen:{color:'#566e2e',metal:0,rough:.88},
  gwLeafGold:{color:'#b08a35',metal:0,rough:.86},gwLeafOrange:{color:'#a65c2b',metal:0,rough:.86},gwLeafRed:{color:'#873425',metal:0,rough:.88},gwTrunk:{color:'#4a3527',metal:0,rough:.95}
 });
 const root=-.9925,R=1.40,G=1.45,TAU=Math.PI*2;
 // Deterministic noise, so every build produces the same landscape.
 const noise=createNoise(20261105),{random,fbm}=noise;
 // The crest: x, z and height above the plinth, as a smooth Catmull-Rom curve.
 const control=[[-1.75,-.10,.10],[-1.25,.06,.36],[-.92,.30,.72],[-.55,.14,.50],[-.20,-.20,.76],[.10,-.30,.92],[.46,-.06,.64],[.80,.24,.47],[1.12,.38,.60],[1.48,.46,.26],[1.85,.50,.08]];
 const spline=t=>{const n=control.length-1,f=clamp(t)*n,i=Math.min(n-1,Math.floor(f)),u=f-i,p0=control[Math.max(0,i-1)],p1=control[i],p2=control[i+1],p3=control[Math.min(n,i+2)];return p1.map((_,k)=>.5*(2*p1[k]+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u*u+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u*u*u));};
 const crest=[];{let length=0,previous=null;for(let i=0;i<=1600;i++){const p=spline(i/1600);if(previous)length+=Math.hypot(p[0]-previous[0],p[1]-previous[1]);crest.push({x:p[0],z:p[1],h:p[2],s:length});previous=p;}}
 const coarse=crest.filter((_,i)=>i%8===0);
 function nearest(x,z){let best=Infinity,h=0,s=0;for(let i=1;i<coarse.length;i++){const a=coarse[i-1],b=coarse[i],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/l),px=a.x+dx*t,pz=a.z+dz*t,d=(x-px)**2+(z-pz)**2;if(d<best){best=d;h=lerp(a.h,b.h,t);s=lerp(a.s,b.s,t);}}return{d:Math.sqrt(best),h,s};}
 const hills=[[-.95,-.78,.58,.42],[-.25,-.95,.62,.40],[.55,-.85,.60,.45],[1.0,-.42,.44,.34],[-1.12,.82,.28,.34],[.35,.88,.24,.36],[1.0,.95,.20,.30],[-.45,.62,.30,.26]];
 function heightAt(x,z){
  const {d,h}=nearest(x,z),ridge=h*Math.exp(-Math.pow(Math.max(0,d-.055)/.6,1.3));let height=ridge;
  for(const [hx,hz,hh,hr]of hills)height=smax(height,hh*Math.exp(-((x-hx)**2+(z-hz)**2)/(hr*hr)));
  const rough=smooth(.07,.26,d),r=Math.hypot(x,z);height=lerp(height,.08+(height-.08)*.3,smooth(.7*R,R+.03,r));
  return .045+height+rough*(.055*fbm(x*2.6+3,z*2.6-1)+.016*fbm(x*9,z*9))+rough*.03*Math.max(0,fbm(x*5.5-7,z*5.5+2));
 }
 // One heightfield grid serves the mesh, the painted texture and every placement.
 const land=createLandscape(api,{root,radius:R,extent:G,heightAt,noise}),{sample,ground,gradient,smoothTri,canopy}=land;
 const forest=(x,z)=>smooth(-.05,.35,fbm(x*1.7+11,z*1.7-4,3))*(1-smooth(.85,1.3,Math.hypot(...gradient(x,z))));
 const autumn=(x,z)=>fbm(x*2.2-5,z*2.2+8,3);

 // Painted ground: grass and scrub, forest floor under the trees, rock on steep faces,
 // a worn path along the wall foot, and baked hollows and crests for depth.
 {
  const grass=hex('#6f803f'),grassWarm=hex('#8c8445'),scrub=hex('#566b34'),orange=hex('#99602d'),red=hex('#7a3826'),floor=hex('#3c4a28'),rock=hex('#8a7f6a'),rockDark=hex('#615a4b'),path=hex('#9f927a'),mix=mixColor;
  await land.paint('gwGround',(x,z,{slope})=>{
   const {d}=nearest(x,z),tone=autumn(x,z);let c=mix(grass,grassWarm,smooth(-.2,.35,tone));c=mix(c,scrub,smooth(.1,.5,fbm(x*6,z*6,3)));
   c=mix(c,orange,smooth(.18,.5,tone)*.55);c=mix(c,red,smooth(.35,.62,tone)*.45);
   c=mix(c,floor,forest(x,z)*.7);
   c=mix(c,mix(rock,rockDark,smooth(-.3,.3,fbm(x*14,z*14,2))),smooth(.95,1.4,slope+.3*fbm(x*8,z*8,2))*.85);
   return mix(c,path,(1-smooth(.065,.11,d))*.85);
  });
 }

 function terrain(){land.terrain('gwGround',{rings:52,spacing:.027,soil:'gwSoil',bedrock:'gwBedrock'});}

 // Wall samples along the crest, trimmed to the landscape.
 const W=.13,outerT=.017,innerT=.013,wallRise=.085,ds=.0105;
 const total=crest.at(-1).s,at=s=>{let lo=0,hi=crest.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(crest[m].s<s)lo=m;else hi=m;}const a=crest[lo],b=crest[hi],t=(s-a.s)/(b.s-a.s||1);return[lerp(a.x,b.x,t),lerp(a.z,b.z,t)];};
 const towers=[{s:0,pavilion:false},{s:0,pavilion:false},{s:0,pavilion:true},{s:0,pavilion:false}];
 {const peak=(a,b)=>{let best=a,top=-Infinity;for(let s=a;s<=b;s+=.005){const [x,z]=at(s),g=sample(x,z);if(g>top){top=g;best=s;}}return best;};const s0=crest.find(c=>Math.hypot(c.x,c.z)<R).s;towers[0].s=peak(s0+.35,s0+.9);towers[2].s=peak(towers[0].s+.8,towers[0].s+1.6);towers[1].s=(towers[0].s+towers[2].s)/2+.08;towers[3].s=peak(towers[2].s+.7,towers[2].s+1.4);}
 const TH=.105;
 function wall(){
  const boundaries=[];for(let s=0;s<=total;s+=ds){const [x,z]=at(s);if(Math.hypot(x,z)<R-.035)boundaries.push(s);}
  const frame=s=>{const [x,z]=at(s),[x2,z2]=at(Math.min(total,s+.004)),[x1,z1]=at(Math.max(0,s-.004)),l=Math.hypot(x2-x1,z2-z1)||1;return{x,z,tx:(x2-x1)/l,tz:(z2-z1)/l,nx:-(z2-z1)/l,nz:(x2-x1)/l};};
  const pos=(f,a,y)=>[f.x+f.nx*a,y,f.z+f.nz*a];
  // Walkway elevation: the ground eased along the wall, held level through each tower.
  const raw=s=>{const [x,z]=at(s);return ground(x,z)+wallRise;};
  const level=s=>{let y=0,w=0;for(let k=-4;k<=4;k++){const g=Math.exp(-k*k/8);y+=raw(s+k*ds*.8)*g;w+=g;}y/=w;for(const t of towers){const tf=raw(t.s),d=Math.abs(s-t.s),blend=1-smooth(TH+.005,TH+.06,d);y=lerp(y,tf,blend);}return y;};
  const bands=[0,.012,.024,.036,.048,.06];
  function face(f0,f1,a,bottom0,bottom1,top,tread,material){
   // A vertical wall face split into masonry courses that step with the walkway.
   let lo=-Infinity;const marks=[...bands.map(b=>tread-b),tread-.075].filter(y=>y<top).sort((x,y)=>x-y);
   const levels=[-Infinity,...marks,top];
   for(let k=0;k<levels.length-1;k++){
    const hi=levels[k+1];lo=levels[k];const y0a=Math.max(lo,bottom0),y0b=Math.max(lo,bottom1);if(hi<=Math.min(y0a,y0b))continue;
    const depth=tread-hi,mat=depth>.07?(k%2?'gwStone':'gwStoneB'):['gwBrick','gwBrickB','gwBrickC'][k%3];
    quad(pos(f0,a,Math.min(y0a,hi)),pos(f1,a,Math.min(y0b,hi)),pos(f1,a,hi),pos(f0,a,hi),material||mat);
   }
  }
  const frames=boundaries.map(frame),levels=boundaries.slice(0,-1).map((s,i)=>level(s+ds/2));
  const inTower=s=>towers.some(t=>Math.abs(s-t.s)<TH-.004);
  for(let i=0;i<levels.length;i++){
   const s=boundaries[i]+ds/2;if(inTower(s))continue;
   const f0=frames[i],f1=frames[i+1],y=levels[i],merlon=Math.floor((s+.004)/.034)%3!==2,outerTop=y+(merlon?.056:.026),innerTop=y+.026;
   const gO0=ground(...[pos(f0,-W/2,0)[0],pos(f0,-W/2,0)[2]])-.035,gO1=ground(pos(f1,-W/2,0)[0],pos(f1,-W/2,0)[2])-.035,gI0=ground(pos(f0,W/2,0)[0],pos(f0,W/2,0)[2])-.035,gI1=ground(pos(f1,W/2,0)[0],pos(f1,W/2,0)[2])-.035;
   face(f0,f1,-W/2,gO0,gO1,outerTop,y);face(f0,f1,W/2,gI0,gI1,innerTop,y);
   // Walkway treads alternate stone tones; risers close each change of level.
   quad(pos(f0,-W/2+outerT,y),pos(f1,-W/2+outerT,y),pos(f1,W/2-innerT,y),pos(f0,W/2-innerT,y),i%2?'gwPaver':'gwPaverB');
   // Outer battlement: a solid breastwork with merlons, each capped in pale stone.
   quad(pos(f0,-W/2+outerT,y),pos(f1,-W/2+outerT,y),pos(f1,-W/2+outerT,outerTop),pos(f0,-W/2+outerT,outerTop),merlon?'gwBrickC':'gwBrick');
   quad(pos(f0,-W/2-.002,outerTop),pos(f1,-W/2-.002,outerTop),pos(f1,-W/2+outerT+.002,outerTop),pos(f0,-W/2+outerT+.002,outerTop),'gwCap');
   quad(pos(f0,W/2-innerT,y),pos(f1,W/2-innerT,y),pos(f1,W/2-innerT,innerTop),pos(f0,W/2-innerT,innerTop),'gwBrickB');
   quad(pos(f0,W/2-innerT-.002,innerTop),pos(f1,W/2-innerT-.002,innerTop),pos(f1,W/2+.002,innerTop),pos(f0,W/2+.002,innerTop),'gwCap');
   if(i+1<levels.length&&!inTower(s+ds)){
    const next=levels[i+1],nextS=s+ds,nextMerlon=Math.floor((nextS+.004)/.034)%3!==2,nextOuter=next+(nextMerlon?.056:.026),f=frames[i+1];
    if(Math.abs(next-y)>1e-5)quad(pos(f,-W/2+outerT,y),pos(f,W/2-innerT,y),pos(f,W/2-innerT,next),pos(f,-W/2+outerT,next),'gwRiser');
    if(Math.abs(nextOuter-outerTop)>1e-5)quad(pos(f,-W/2,outerTop),pos(f,-W/2+outerT,outerTop),pos(f,-W/2+outerT,nextOuter),pos(f,-W/2,nextOuter),'gwBrick');
    if(Math.abs(next-y)>1e-5)quad(pos(f,W/2-innerT,y+.026),pos(f,W/2,y+.026),pos(f,W/2,next+.026),pos(f,W/2-innerT,next+.026),'gwBrickB');
   }
   // Cut ends at the edge of the landscape show the wall in section.
   for(const [end,f,g0,g1]of [[i===0,f0,gO0,gI0],[i===levels.length-1,f1,gO1,gI1]])if(end){
    quad(pos(f,-W/2,g0),pos(f,W/2,g1),pos(f,W/2,y),pos(f,-W/2,y),'gwStoneB');
    quad(pos(f,-W/2,y),pos(f,-W/2+outerT,y),pos(f,-W/2+outerT,outerTop),pos(f,-W/2,outerTop),'gwBrick');
    quad(pos(f,W/2-innerT,y),pos(f,W/2,y),pos(f,W/2,innerTop),pos(f,W/2-innerT,innerTop),'gwBrick');
   }
  }
  return {frame,level};
 }

 // Box helper in a local frame (u along the wall, a across it).
 function framed(f,u,a,y){return[f.x+f.tx*u+f.nx*a,y,f.z+f.tz*u+f.nz*a];}
 function block(f,u0,u1,a0,a1,y0,y1,mat,top=mat){
  const p=[framed(f,u0,a0,y0),framed(f,u1,a0,y0),framed(f,u1,a1,y0),framed(f,u0,a1,y0),framed(f,u0,a0,y1),framed(f,u1,a0,y1),framed(f,u1,a1,y1),framed(f,u0,a1,y1)];
  for(const [i,j,k,l]of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])quad(p[i],p[j],p[k],p[l],i===4?top:mat);
 }
 // An arched opening drawn on a tower face: dark void, stone arch ring and sill.
 function arch(f,side,offset,sill,width,straight,door=false){
  const half=width/2,r=half,depth=.0016;
  const point=(x,y,d)=>{const h=TH+d;return side===0?framed(f,x,h,y):side===1?framed(f,h,-x,y):side===2?framed(f,-x,-h,y):framed(f,-h,x,y);};
  const outline=[[offset-half,sill],[offset+half,sill]];for(let k=0;k<=12;k++){const t=k/12*Math.PI;outline.push([offset+r*Math.cos(t),sill+straight+r*Math.sin(t)]);}
  const center=[offset,sill+straight*.6];
  for(let k=0;k<outline.length;k++){const a=outline[k],b=outline[(k+1)%outline.length];tri(point(...center,depth),point(...a,depth),point(...b,depth),'gwOpening');}
  for(let k=0;k<12;k++){const t0=k/12*Math.PI,t1=(k+1)/12*Math.PI,ring=(t,rr)=>[offset+rr*Math.cos(t),sill+straight+rr*Math.sin(t)];quad(point(...ring(t0,r),depth*2),point(...ring(t1,r),depth*2),point(...ring(t1,r+.009),depth*2),point(...ring(t0,r+.009),depth*2),'gwCap');}
  for(const x of [offset-half-.009,offset+half])quad(point(x,sill,depth*1.5),point(x+.009,sill,depth*1.5),point(x+.009,sill+straight,depth*1.5),point(x,sill+straight,depth*1.5),'gwStone');
  if(!door)quad(point(offset-half-.012,sill-.008,depth*2),point(offset+half+.012,sill-.008,depth*2),point(offset+half+.012,sill,depth*2),point(offset-half-.012,sill,depth*2),'gwCap');
 }
 function tower(t,level){
  const [x,z]=at(t.s),[x2,z2]=at(t.s+.01),l=Math.hypot(x2-x,z2-z),f={x,z,tx:(x2-x)/l,tz:(z2-z)/l,nx:-(z2-z)/l,nz:(x2-x)/l},floor=level(t.s),h=TH;
  let base=Infinity;for(const u of [-h,0,h])for(const a of [-h,0,h]){const p=framed(f,u,a,0);base=Math.min(base,ground(p[0],p[2]));}base-=.04;
  // Granite base courses, then the brick chamber.
  for(let y=base,k=0;y<floor-.001;y+=.022,k++)block(f,-h,h,-h,h,y,Math.min(floor,y+.022),k%2?'gwStone':'gwStoneB');
  block(f,-h-.004,h+.004,-h-.004,h+.004,floor-.006,floor+.006,'gwCap');
  const chamber=.15;for(let k=0;k<5;k++)block(f,-h,h,-h,h,floor+.006+k*chamber/5,floor+.006+(k+1)*chamber/5,['gwBrick','gwBrickB','gwBrickC'][k%3]);
  const top=floor+.006+chamber;
  for(const side of [0,2])for(const o of [-.06,0,.06])arch(f,side,o,floor+.045,.032,.038);
  for(const side of [1,3]){arch(f,side,0,floor+.006,.046,.062,true);for(const o of [-.068,.068])arch(f,side,o,floor+.06,.022,.026);}
  // Corbelled cornice and the roof platform with its own battlements.
  block(f,-h-.006,h+.006,-h-.006,h+.006,top,top+.009,'gwStone');block(f,-h-.013,h+.013,-h-.013,h+.013,top+.009,top+.02,'gwCap','gwPaver');
  const roof=top+.02,ring=h+.013;
  for(let side=0;side<4;side++)for(let k=0;k<5;k++){
   const c=-ring+(k+.5)*ring*2/5,w=ring*2/5,tall=k%2===0;
   const span=[c-w/2+(tall?0:.001),c+w/2-(tall?0:.001)],hgt=tall?.048:.024;
   const piece=(u0,u1,a0,a1)=>{block(f,u0,u1,a0,a1,roof,roof+hgt,'gwBrickC','gwCap');};
   if(side===0)piece(span[0],span[1],ring-.016,ring);else if(side===2)piece(span[0],span[1],-ring,-ring+.016);else if(side===1)piece(ring-.016,ring,span[0],span[1]);else piece(-ring,-ring+.016,span[0],span[1]);
  }
  if(t.pavilion)pavilion(f,roof);
 }
 // A small lookout on the summit tower: brick walls, timber door and a hipped tile roof
 // with upturned corners and a ridge.
 function pavilion(f,y0){
  const h=.066,wallTop=y0+.064;
  block(f,-h,h,-h,h,y0,wallTop,'gwBrickB');block(f,-h-.003,h+.003,-h-.003,h+.003,wallTop-.006,wallTop,'gwTimber');
  block(f,-.016,.016,h,h+.002,y0,y0+.04,'gwTimber');block(f,-.016,.016,-h-.002,-h,y0,y0+.04,'gwTimber');
  const e=h+.036,ridge=.044,rise=.072,lift=.018,nx=18,ny=8;
  const point=(side,u,v)=>{const half=lerp(e,ridge*(side%2?0:1),v),across=lerp(e,side%2?ridge:0,v),c=Math.abs(2*u-1),y=wallTop+rise*(1-Math.pow(1-v,1.6))+lift*Math.pow(c,5)*(1-v)**2-.004;const along=(2*u-1)*half;return side===0?framed(f,along,across,y):side===1?framed(f,across,-along,y):side===2?framed(f,-along,-across,y):framed(f,-across,along,y);};
  for(let side=0;side<4;side++)for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
   quad(point(side,i/nx,j/ny),point(side,(i+1)/nx,j/ny),point(side,(i+1)/nx,(j+1)/ny),point(side,i/nx,(j+1)/ny),i%2?'gwTile':'gwTileB');
   if(j===0)quad(point(side,i/nx,0),point(side,(i+1)/nx,0),[point(side,(i+1)/nx,0)[0],point(side,(i+1)/nx,0)[1]-.006,point(side,(i+1)/nx,0)[2]],[point(side,i/nx,0)[0],point(side,i/nx,0)[1]-.006,point(side,i/nx,0)[2]],'gwTimber');
  }
  const ry=wallTop+rise-.004;block(f,-ridge-.008,ridge+.008,-.006,.006,ry,ry+.012,'gwTile');for(const s of [-1,1])block(f,s*(ridge+.004)-.006,s*(ridge+.004)+.006,-.006,.006,ry+.008,ry+.026,'gwTile');
 }
 // Trees, placed by the same forest density that darkens the painted ground.
 function trees(path){
  const placed=[];let tries=0;
  while(placed.length<440&&tries<30000){
   tries++;const r=Math.sqrt(random())*(R-.05),a=random()*TAU,x=r*Math.cos(a),z=r*Math.sin(a),{d}=nearest(x,z),slope=Math.hypot(...gradient(x,z));
   if(d<.115||slope>1.25||random()>.3+.7*forest(x,z))continue;
   if(towers.some(t=>{const [tx,tz]=at(t.s);return Math.hypot(x-tx,z-tz)<.2;}))continue;
   const size=.75+.5*random();if(placed.some(p=>Math.hypot(p[0]-x,p[1]-z)<.034*(size+p[2])))continue;placed.push([x,z,size]);
   const y=ground(x,z)-.006,tone=autumn(x,z)+.35*(random()-.5),pine=random()<.4-.22*smooth(0,.4,tone);
   if(pine){canopy(x,y+.012,z,.026*size,.075*size,random()<.5?'gwPine':'gwPineB',true);canopy(x,y+.045*size,z,.019*size,.06*size,'gwPine',true);
    smoothTri([[x-.003,y,z],[x+.003,y,z],[x,y+.03,z]],[[0,0,1],[0,0,1],[0,0,1]],'gwTrunk');}
   else{const mat=tone>.34?'gwLeafRed':tone>.12?'gwLeafOrange':tone>-.1?'gwLeafGold':'gwLeafGreen',turn=random()*TAU;canopy(x,y+.006,z,.024*size,.05*size,mat,false);for(let k=0;k<2;k++){const a=turn+k*2.4,o=.017*size;canopy(x+o*Math.cos(a),y+.004+.008*k,z+o*Math.sin(a),(.017-.003*k)*size,(.038-.006*k)*size,k&&random()<.5?'gwLeafGreen':mat,false);}}
  }
  return placed.length;
 }
 return{china:{title:'Great Wall',build(){
  plinth(1.56);terrain();const path=wall();for(const t of towers)tower(t,path.level);trees(path);
 }}};
}
