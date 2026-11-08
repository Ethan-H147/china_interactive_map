import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {clamp,lerp,smooth,smax,hex,mixColor,createNoise,createLandscape} from './collectible-landscape.mjs';

// JuanG3D's authored Art Deco sculpture, adapted under CC BY 4.0, on an original diorama
// of the Corcovado summit: a sheer, streaked granite peak under dense Atlantic forest, the
// summit terraces with balustrades and stairs, and an Art Deco pedestal. The original
// tall signed print base is not used.
export async function createChristCollectible(api){
 const {tri,quad,plinth,palette,getParts}=api;
 const source=JSON.parse(fs.readFileSync(new URL('trophy-sources/christ-juan.json',import.meta.url),'utf8'));
 const bytes=fs.readFileSync(new URL('trophy-sources/christ-juan-prepared.glb',import.meta.url));
 if(createHash('sha256').update(bytes).digest('hex')!==source.preparedSha256)throw Error('Prepared Christ model checksum differs from its recorded provenance');
 const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12))),offset=28+bytes.readUInt32LE(12),primitive=json.meshes[0].primitives[0];
 function attribute(id){const a=json.accessors[id],v=json.bufferViews[a.bufferView],start=bytes.byteOffset+offset+(v.byteOffset||0)+(a.byteOffset||0),count=a.count*(a.type==='VEC3'?3:1);return a.componentType===5126?new Float32Array(bytes.buffer,start,count):a.componentType===5123?new Uint16Array(bytes.buffer,start,count):new Uint32Array(bytes.buffer,start,count);}
 const positions=attribute(primitive.attributes.POSITION),indices=attribute(primitive.indices),normals=attribute(primitive.attributes.NORMAL);
 Object.assign(palette,{
  christSoapstone:{color:'#d4d5c9',metal:.01,rough:.8},christPedestal:{color:'#5f5851',metal:0,rough:.88},christPedestalEdge:{color:'#716960',metal:0,rough:.85},christDoor:{color:'#2a2622',metal:0,rough:.9},
  corcovadoGround:{color:'#ffffff',metal:0,rough:.93},corcovadoSoil:{color:'#3e3024',metal:0,rough:1},corcovadoRock:{color:'#3c3936',metal:0,rough:.95},
  terraceStone:{color:'#c3bcaf',metal:0,rough:.84},terraceWall:{color:'#8c8478',metal:0,rough:.88},terraceRail:{color:'#d8d2c6',metal:0,rough:.8},
  forestDeep:{color:'#284620',metal:0,rough:.9},forestMid:{color:'#335a25',metal:0,rough:.88},forestLight:{color:'#3e6828',metal:0,rough:.86},forestSun:{color:'#527d2e',metal:0,rough:.84}
 });
 const root=-.9925,R=1.0,G=1.05,noise=createNoise(1931),{random,fbm}=noise;
 const summit={x:-.05,z:-.12,h:1.12},sea=.018;
 const upper={hx:.24,hz:.22},lower={hx:.35,hz:.30,drop:.07},cliffDir=Math.atan2(1,1.2);
 const cliffAt=(x,z)=>smooth(.25,.95,Math.cos(Math.atan2(z-summit.z,x-summit.x)-cliffDir));
 function heightAt(x,z){
  const dx=x-summit.x,dz=z-summit.z,c=.1,p=2.4;
  // Rounded-rectangle distance from the summit terrace. Toward the front right the peak
  // falls away as a sheer granite face; elsewhere forested shoulders run down.
  const rr=Math.pow(Math.max(0,Math.abs(dx)-lower.hx+c)**p+Math.max(0,Math.abs(dz)-lower.hz+c)**p,1/p)-c;
  const cliff=cliffAt(x,z),w=lerp(.58,.2,cliff);
  let h=(summit.h-lower.drop-.04)*Math.exp(-Math.pow(Math.max(0,rr+.025*fbm(x*7,z*7,2))/w,lerp(1.25,1.1,cliff)));
  h=smax(h,.42*Math.exp(-((x+.62)**2/.2+(z+.2)**2/.12)));h=smax(h,.3*Math.exp(-((x-.62)**2+(z+.5)**2)/.12));h=smax(h,.2*Math.exp(-((x+.3)**2+(z-.65)**2)/.1));
  h+=(.045*fbm(x*3+2,z*3)+.018*fbm(x*9,z*9))*smooth(.15,.35,rr)*(1-cliff*.6);
  const rim=smooth(.7,.98,Math.hypot(x,z));h=lerp(h,.06+h*.25,rim*(1-cliff));
  h=lerp(h,sea-.04,smooth(.68,.96,Math.hypot(x,z))*smooth(.25,.7,x*.6+z*.8));
  // Rock is cut flat for the two summit terraces.
  const terrace=(t,y)=>{const e=Math.max(Math.abs(dx)-t.hx,Math.abs(dz)-t.hz);return lerp(h,y,smooth(.06,0,e));};
  h=terrace(lower,summit.h-lower.drop-.03);h=Math.min(h,lerp(h,summit.h-.03,smooth(.05,0,Math.max(Math.abs(dx)-upper.hx,Math.abs(dz)-upper.hz))));
  return Math.max(h,sea);
 }
 const land=createLandscape(api,{root,radius:R,extent:G,heightAt,noise}),{ground,gradient,canopy}=land;
 const forestAt=(x,z)=>{const slope=Math.hypot(...gradient(x,z)),e=Math.max(Math.abs(x-summit.x)-lower.hx,Math.abs(z-summit.z)-lower.hz);const limit=lerp(3.2,1.25,smooth(.35,.8,cliffAt(x,z)+.25*fbm(x*6,z*6,2)));return(1-smooth(limit-.3,limit,slope+.2*fbm(x*7,z*7,2)))*smooth(.015,.04,e)*(ground(x,z)>root+sea+.012?1:0);};
 {
  const floor=hex('#1b2d17'),floorB=hex('#263f1f'),granite=hex('#4b4743'),graniteDark=hex('#2f2c2a'),graniteLight=hex('#7a736b'),lichen=hex('#56603f'),paving=hex('#bdb6a8'),shallow=hex('#4a9aa0'),deep=hex('#245f78'),foam=hex('#dfe8e4');
  await land.paint('corcovadoGround',(x,z,{slope,height})=>{
   if(height<=sea+.0005){const c=mixColor(shallow,deep,smooth(.0,.6,1.05-Math.hypot(x,z)+.3*fbm(x*3,z*3)));return mixColor(c,foam,.25*Math.max(0,fbm(x*40,z*40,2)));}
   const dx=x-summit.x,dz=z-summit.z;if(Math.abs(dx)<lower.hx+.005&&Math.abs(dz)<lower.hz+.005)return paving;
   const c=mixColor(floor,floorB,smooth(-.3,.4,fbm(x*5,z*5,3)));
   // Granite streaks run down the slope: fine across it, long along it.
   const ang=Math.atan2(dz,dx),rad=Math.hypot(dx,dz);let g=mixColor(granite,graniteDark,smooth(-.25,.35,fbm(ang*16,rad*2.2,3)));
   g=mixColor(g,graniteLight,smooth(.3,.6,fbm(ang*42+3,rad*5,2))*.55);g=mixColor(g,lichen,smooth(.2,.6,fbm(x*9,z*9,2))*.3);
   const limit=lerp(3.4,1.3,smooth(.35,.8,cliffAt(x,z)+.25*fbm(x*6,z*6,2)));return mixColor(c,g,smooth(limit-.35,limit,slope+.3*fbm(x*8,z*8,2)));
  },{hollow:.012});
 }
 const top=root+summit.h,lowY=top-lower.drop;
 function block(x0,x1,y0,y1,z0,z1,mat,topMat=mat){const p=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];for(const [i,j,k,l]of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])quad(p[i],p[j],p[k],p[l],i===4?topMat:mat);}
 // Balustrade along a straight run: posts, rail and a low plinth, with optional gaps.
 function balustrade(a,b,y,gaps=[]){
  const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(2,Math.round(len/.06)),at=t=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t)],skip=t=>gaps.some(([c,w])=>Math.abs(t*len-c)<w);
  for(let i=0;i<=n;i++){const t=i/n;if(skip(t))continue;const [x,z]=at(t);block(x-.007,x+.007,y,y+.04,z-.007,z+.007,'terraceRail');}
  for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n;if(skip(t0)||skip(t1))continue;const [x0,z0]=at(t0),[x1,z1]=at(t1),w=.006;const along=Math.abs(x1-x0)>Math.abs(z1-z0);block(Math.min(x0,x1)-(along?0:w),Math.max(x0,x1)+(along?0:w),y+.04,y+.05,Math.min(z0,z1)-(along?w:0),Math.max(z0,z1)+(along?w:0),'terraceRail');block(Math.min(x0,x1)-(along?0:w),Math.max(x0,x1)+(along?0:w),y,y+.008,Math.min(z0,z1)-(along?w:0),Math.max(z0,z1)+(along?w:0),'terraceWall');}
 }
 function terraces(){
  const {x:cx,z:cz}=summit;
  // Retaining walls drop to the rock; each terrace is paved and railed.
  const rock=(x,z)=>ground(x,z);
  for(const [t,y]of [[lower,lowY],[upper,top]]){
   let bottom=Infinity;for(const sx of [-1,0,1])for(const sz of [-1,0,1])bottom=Math.min(bottom,rock(cx+sx*(t.hx+.03),cz+sz*(t.hz+.03)));
   block(cx-t.hx,cx+t.hx,Math.min(bottom,y)-.05,y-.012,cz-t.hz,cz+t.hz,'terraceWall');
   block(cx-t.hx-.006,cx+t.hx+.006,y-.012,y,cz-t.hz-.006,cz+t.hz+.006,'terraceWall','terraceStone');
  }
  const stairW=.13,front=cz+upper.hz,steps=6;
  for(let i=0;i<steps;i++){const y=top-(i+1)*lower.drop/steps;block(cx-stairW/2,cx+stairW/2,lowY-.01,y+.0001,front+i*.013,front+(i+1)*.013,'terraceStone');}
  const yU=top,yL=lowY,U=upper,L=lower;
  balustrade([cx-U.hx,cz+U.hz],[cx+U.hx,cz+U.hz],yU,[[U.hx,stairW/2+.012]]);balustrade([cx-U.hx,cz-U.hz],[cx+U.hx,cz-U.hz],yU);balustrade([cx-U.hx,cz-U.hz],[cx-U.hx,cz+U.hz],yU);balustrade([cx+U.hx,cz-U.hz],[cx+U.hx,cz+U.hz],yU);
  balustrade([cx-L.hx,cz+L.hz],[cx+L.hx,cz+L.hz],yL);balustrade([cx-L.hx,cz-L.hz],[cx+L.hx,cz-L.hz],yL);balustrade([cx-L.hx,cz-L.hz],[cx-L.hx,cz+L.hz],yL);balustrade([cx+L.hx,cz-L.hz],[cx+L.hx,cz+L.hz],yL);
 }
 // Art Deco pedestal: stepped base, slightly tapering shaft with a chapel door, cornice.
 const pedestalTop=top+.25;
 function pedestal(){
  const {x:cx,z:cz}=summit;
  block(cx-.17,cx+.17,top,top+.03,cz-.17,cz+.17,'christPedestalEdge');block(cx-.15,cx+.15,top+.03,top+.05,cz-.15,cz+.15,'christPedestal');
  const y0=top+.05,y1=top+.215,w0=.13,w1=.118;
  for(let side=0;side<4;side++){const a=side*Math.PI/2,rot=(x,y,w,zz)=>{const c=Math.cos(a),s=Math.sin(a);return[cx+x*c+zz*s,y,cz-x*s+zz*c];};
   quad(rot(-w0,y0,0,w0),rot(w0,y0,0,w0),rot(w1,y1,0,w1),rot(-w1,y1,0,w1),'christPedestal');
   for(const k of [-1,1])quad(rot(k*w0*.55,y0,0,w0+.003),rot(k*w0*.55+.012*k,y0,0,w0+.003),rot(k*w1*.55+.012*k,y1,0,w1+.003),rot(k*w1*.55,y1,0,w1+.003),'christPedestalEdge');
  }
  block(cx-.03,cx+.03,y0,y0+.075,cz+w0-.002,cz+w0+.004,'christDoor');
  block(cx-.135,cx+.135,y1,y1+.018,cz-.135,cz+.135,'christPedestalEdge');block(cx-.122,cx+.122,y1+.018,pedestalTop,cz-.122,cz+.122,'christPedestal');
 }
 function forest(){
  let placed=[],tries=0;
  while(placed.length<820&&tries<60000){
   tries++;const r=Math.sqrt(random())*(R-.04),a=random()*Math.PI*2,x=r*Math.cos(a),z=r*Math.sin(a);if(random()>forestAt(x,z))continue;
   const size=.8+.45*random();if(placed.some(p=>Math.hypot(p[0]-x,p[1]-z)<.03*(size+p[2])))continue;placed.push([x,z,size]);
   // Dense canopy in deep to sunlit greens, brighter toward the summit.
   const y=ground(x,z)-.008,lift=smooth(.2,.7,y-root),roll=random()+.35*lift,mat=roll<.3?'forestDeep':roll<.65?'forestMid':roll<.98?'forestLight':'forestSun';
   canopy(x,y+.004,z,.04*size,.062*size,mat,false);const t=random()*Math.PI*2,o=.026*size;canopy(x+o*Math.cos(t),y+.008,z+o*Math.sin(t),.03*size,.05*size,roll<.5?'forestMid':'forestLight',false);
  }
 }
 return{brazil:{title:'Christ the Redeemer',source:{title:source.title,author:source.author,license:source.license,url:source.source,licenseUrl:source.licenseUrl},build(){
  plinth(1.12);land.terrain('corcovadoGround',{rings:40,spacing:.025,soil:'corcovadoSoil',bedrock:'corcovadoRock',soilDepth:.05});
  terraces();pedestal();forest();
  // The sculpture, uniformly scaled onto the pedestal; its own normals are kept.
  const k=.56,place=p=>[summit.x+p[0]*k,pedestalTop+(p[1]+.4225)*k,summit.z+p[2]*k];
  for(let i=0;i<indices.length;i+=3){const ids=[indices[i],indices[i+1],indices[i+2]],vs=ids.map(id=>place(Array.from(positions.subarray(id*3,id*3+3)))),before=getParts().christSoapstone?.p.length||0;tri(...vs,'christSoapstone');const part=getParts().christSoapstone;if(part&&part.p.length>before)part.n.splice(part.n.length-9,9,...ids.flatMap(id=>Array.from(normals.subarray(id*3,id*3+3))));}
 }}};
}
