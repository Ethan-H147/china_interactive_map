// An original moai on its ahu, on a grassy Rapa Nui shore with the sea behind it.
// The figure is one continuous carved surface: rounded-rectangle sections from base to
// crown, with brow, eye sockets, long nose, pursed lips, jutting chin, long ears, arms
// and long-fingered hands carved as relief. A painted texture adds weathered tuff,
// lichen and darkened hollows.
import sharp from 'sharp';
import {clamp,lerp,smooth,hex,mixColor,createNoise,createLandscape} from './collectible-landscape.mjs';
export async function createMoaiCollectible(api){
 const {quad,plinth,lathe,palette,masks,getParts}=api;
 Object.assign(palette,{
  moaiStone:{color:'#ffffff',metal:0,rough:.93},
  ahuBasalt:{color:'#5d5a54',metal:0,rough:.95},ahuBasaltB:{color:'#6a665e',metal:0,rough:.93},ahuBasaltC:{color:'#514e49',metal:0,rough:.96},ahuJoint:{color:'#2f2d2a',metal:0,rough:1},ahuSlab:{color:'#77726a',metal:0,rough:.92},
  poro:{color:'#8e8a82',metal:0,rough:.8},poroDark:{color:'#6b6862',metal:0,rough:.85},shoreRock:{color:'#3f3d3a',metal:0,rough:.9},
  rnGround:{color:'#ffffff',metal:0,rough:.92},rnSoil:{color:'#5b4433',metal:0,rough:1},rnRock:{color:'#4a4743',metal:0,rough:.95}
 });
 const root=-.9925,R=.90,G=.95,TAU=Math.PI*2,noise=createNoise(1722),{random,fbm}=noise;
 const sea=.02,ahu={x:.74,z0:-.27,z1:.27,top:-.74},shore=x=>-.50+.07*Math.sin(x*3.1+.6)+.035*fbm(x*4,7);
 function heightAt(x,z){
  let h=.062+.022*fbm(x*2.5+4,z*2.5)+.008*fbm(x*9,z*9);
  const s=shore(x),drop=smooth(s+.16,s-.06,z);h=lerp(h,sea-.07+.04*fbm(x*6,z*6),drop);
  h+=drop*(1-smooth(s-.02,s-.14,z))*.07*Math.max(0,fbm(x*11+3,z*11));
  const pad=smooth(.12,.0,Math.max(Math.abs(x)-ahu.x-.04,ahu.z0-.04-z,z-ahu.z1-.42));h=lerp(h,.062,pad);
  return Math.max(h,sea);
 }
 const land=createLandscape(api,{root,radius:R,extent:G,heightAt,noise}),{ground,smoothTri}=land;
 const raw=(x,z)=>{let h=.062+.022*fbm(x*2.5+4,z*2.5)+.008*fbm(x*9,z*9);const s=shore(x),drop=smooth(s+.16,s-.06,z);return lerp(h,sea-.07+.04*fbm(x*6,z*6),drop);};
 {
  const grass=hex('#7d8a45'),grassDry=hex('#a39a5c'),grassDeep=hex('#5f7238'),gravel=hex('#9b9384'),rock=hex('#4f4b45'),foam=hex('#d9e3df'),shallow=hex('#3f939a'),deep=hex('#1f5a72');
  await land.paint('rnGround',(x,z,{slope})=>{
   const h=raw(x,z);
   if(h<sea+.004){const depth=sea-h,c=mixColor(shallow,deep,smooth(0,.07,depth));return mixColor(c,foam,(1-smooth(.0,.012,depth))*.85+.15*Math.max(0,fbm(x*30,z*30,2))*(1-smooth(0,.03,depth)));}
   let c=mixColor(grass,grassDry,smooth(-.2,.4,fbm(x*3,z*3+5,3)));c=mixColor(c,grassDeep,smooth(.1,.5,fbm(x*8+2,z*8,3))*.6);
   c=mixColor(c,rock,smooth(.5,1.1,slope+.25*fbm(x*10,z*10,2)));
   const apron=Math.abs(x)<ahu.x+.02&&z>ahu.z1&&z<ahu.z1+.42?smooth(.0,.05,Math.min(ahu.x+.02-Math.abs(x),z-ahu.z1,ahu.z1+.42-z)):0;
   return mixColor(c,gravel,apron*.85);
  },{hollow:.012});
 }

 // ---- The moai ----
 const y0=ahu.top-.004,H=1.92;
 const table=(points,h)=>{for(let i=1;i<points.length;i++)if(h<=points[i][0]){const [a,va]=points[i-1],[b,vb]=points[i],t=smooth(0,1,(h-a)/(b-a));return lerp(va,vb,t);}return points.at(-1)[1];};
 const widthAt=h=>table([[0,.30],[.5,.315],[.98,.335],[1.12,.318],[1.4,.31],[1.75,.302],[1.88,.29],[1.92,.28]],h);
 const depthAt=h=>table([[0,.21],[.98,.226],[1.19,.272],[1.4,.296],[1.75,.302],[1.92,.288]],h);
 const centerAt=h=>table([[0,0],[1.05,0],[1.19,.052],[1.92,.034]],h);
 const powerAt=h=>table([[0,2.6],[1.0,2.7],[1.2,3.4],[1.92,3.4]],h);
 const crown=h=>h<1.86?1:Math.pow(Math.max(0,1-((h-1.86)/.06)**4),.25);
 const band=(v,a,b,s)=>smooth(a-s,a+s,v)*(1-smooth(b-s,b+s,v)),g=(v,c,w)=>Math.exp(-(((v-c)/w)**2));
 const oval=(v,c,r,w,cw,rw,p=3)=>Math.max(0,1-(Math.abs((v-c)/r)**p+Math.abs((w-cw)/rw)**p));
 // Relief in metres along the surface normal; front, side and back are weighted by the
 // direction the surface faces.
 function relief(x,z,h,nx,nz){
  const front=smooth(.25,.7,nz),sideW=smooth(.55,.9,Math.abs(nx)),back=smooth(.25,.7,-nz),u=x,au=Math.abs(u),zz=z-centerAt(h);
  let d=0;
  if(front>0){
   const hb=1.79,hn=1.42;
   const round=(w)=>Math.max(0,1-(u/w)**2);
   let f=.048*band(h,hb-.022,hb+.02,.015)*(1-smooth(.17,.25,au));
   f-=.062*Math.exp(-(((au-.105)/.066)**2)-(((h-1.722)/.05)**2));
   if(h>hn-.03&&h<hb+.03){const t=clamp((hb-.01-h)/(hb-.01-hn)),p=.012+.112*Math.pow(t,1.5),w=.028+.05*t;f+=p*Math.exp(-((u/w)**4))*smooth(hn-.016,hn+.014,h)*(1-smooth(hb-.03,hb+.01,h));}
   f+=.05*Math.exp(-(((au-.066)/.032)**2)-(((h-hn-.026)/.035)**2))-.018*Math.exp(-(((au-.04)/.013)**2)-(((h-hn-.006)/.011)**2));
   const mouth=1.34-.022*(u/.12)**2;
   f+=.05*band(h,mouth,hn-.004,.014)*Math.sqrt(round(.15))-.012*Math.exp(-((u/.02)**2))*band(h,mouth+.02,hn-.01,.01);
   f-=.026*g(h,mouth,.0075)*round(.135);
   f+=.04*band(h,mouth-.054,mouth,.014)*Math.sqrt(round(.13));
   f+=.078*band(h,1.15,1.262,.03)*Math.pow(round(.21),.6);
   f-=.024*band(h,1.02,1.13,.03);
   f-=.05*smooth(hb+.03,1.93,h);
   f-=.012*Math.exp(-((u/.016)**2)-(((h-.66)/.016)**2));
   d+=front*f;
  }
  if(sideW>0){
   const ear=smooth(0,.12,oval(h,1.59,.19,zz,.045,.07)),groove=smooth(0,.15,oval(h,1.6,.15,zz,.05,.04)),lobe=Math.exp(-(((h-1.43)/.03)**2)-(((zz-.05)/.03)**2));
   let s=.028*ear-.016*groove+.014*lobe;
   s+=.02*smooth(0,.25,oval(h,.84,.24,zz,.02,.042,4));
   d+=sideW*s;
  }
  // Forearms cross the lower belly from the sides; long fingers point toward the navel.
  const phi=Math.atan2(zz,Math.max(1e-4,Math.abs(x)));
  if(zz>-.06){
   const hf=.585-.022*phi,arm=band(phi,-.1,.95,.07)*band(h,hf-.034,hf+.034,.012),palm=band(phi,.85,1.02,.04)*band(h,.522,.618,.01);
   let fingers=0;for(let k=0;k<4;k++){const c=.531+k*.024,tip=1.27+.05*Math.sin((k+.5)/4*Math.PI);fingers=Math.max(fingers,band(phi,.95,tip,.035)*Math.max(0,1-((h-c)/.0105)**2));}
   d+=.021*Math.max(arm,palm,fingers);
  }
  if(back>0)d+=back*.012*band(h,.44,.47,.006);
  return d;
 }
 // Section outline: a superellipse sampled densely, then spaced by arc length with extra
 // density across the face.
 function section(h,count){
  const a=widthAt(h)*crown(h),b=depthAt(h)*crown(h),n=powerAt(h),zc=centerAt(h),K=900,pts=[];
  for(let i=0;i<K;i++){const t=i/K*TAU,c=Math.cos(t),s=Math.sin(t);pts.push([a*Math.sign(c)*Math.abs(c)**(2/n),zc+b*Math.sign(s)*Math.abs(s)**(2/n)]);}
  const normals=pts.map((p,i)=>{const q=pts[(i+1)%K],r=pts[(i-1+K)%K],tx=q[0]-r[0],tz=q[1]-r[1],l=Math.hypot(tx,tz)||1;return[tz/l,-tx/l];});
  const weight=i=>1+1.6*smooth(.3,.8,normals[i][1]),acc=[0];for(let i=0;i<K;i++)acc.push(acc[i]+Math.hypot(pts[(i+1)%K][0]-pts[i][0],pts[(i+1)%K][1]-pts[i][1])*weight(i));
  const total=acc[K],out=[];let k=0;
  for(let j=0;j<count;j++){const target=j/count*total;while(acc[k+1]<target)k++;const t=(target-acc[k])/(acc[k+1]-acc[k]||1),p=pts[k],q=pts[(k+1)%K],nA=normals[k],nB=normals[(k+1)%K];const x=lerp(p[0],q[0],t),z=lerp(p[1],q[1],t),nx=lerp(nA[0],nB[0],t),nz=lerp(nA[1],nB[1],t),l=Math.hypot(nx,nz)||1;out.push({x,z,nx:nx/l,nz:nz/l});}
  return out;
 }
 const rowsH=[];for(let h=0;h<1.919;){rowsH.push(h);h+=h<.4?.03:h<.7?.008:h<1.1?.015:h<1.82?.0056:.006;}rowsH.push(1.919);
 const M=104,grid=rowsH.map(h=>section(h,M).map(p=>{const d=relief(p.x,p.z,h,p.nx,p.nz);return{v:[p.x+p.nx*d,y0+h,p.z+p.nz*d],d};}));
 // Painted stone: weathered tuff, vertical streaks, lichen on upward faces, dark hollows.
 {
  const W=512,T=1024,pixels=Buffer.alloc(W*T*3),tuff=hex('#8e7b64'),tuffLight=hex('#a08d74'),tuffDark=hex('#6e5f4d'),lichen=hex('#b49c58'),lichenPale=hex('#c9c3ae'),moss=hex('#5f6440');
  const rowsD=[];for(let j=0;j<T;j++){const h=(j+.5)/T*1.919;rowsD.push(section(h,W).map(p=>relief(p.x,p.z,h,p.nx,p.nz)));}
  for(let j=0;j<T;j++)for(let i=0;i<W;i++){
   const h=(j+.5)/T*1.919,u=i/W,d=rowsD[j][i],lap=(rowsD[Math.max(0,j-3)][i]+rowsD[Math.min(T-1,j+3)][i]+rowsD[j][(i+3)%W]+rowsD[j][(i-3+W)%W]-4*d);
   let c=mixColor(tuff,tuffLight,smooth(-.2,.4,fbm(u*14,h*6,4)));c=mixColor(c,tuffDark,smooth(.1,.6,fbm(u*26,h*10,3))*.35);c=mixColor(c,tuffDark,smooth(.55,.75,fbm(u*180,h*90,2))*.5);
   c=mixColor(c,lichen,smooth(.42,.62,fbm(u*38+5,h*22,3))*(.35+.65*smooth(1.3,1.9,h)));c=mixColor(c,lichenPale,smooth(.48,.66,fbm(u*52-3,h*30+2,3))*.7);
   c=mixColor(c,moss,(1-smooth(0,.14,h))*.5);
   const shade=clamp(1+lap*26-Math.max(0,-d)*3.2,.5,1.12)*(.94+.06*fbm(u*120,h*60,2)),k=(j*W+i)*3;for(let n=0;n<3;n++)pixels[k+n]=clamp(Math.round(c[n]*shade),0,255);
  }
  masks.set('moaiStone',await sharp(pixels,{raw:{width:W,height:T,channels:3}}).png({palette:true,colours:256,dither:.5,compressionLevel:9}).toBuffer());
 }
 function figure(){
  const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const at=(j,i)=>grid[Math.max(0,Math.min(grid.length-1,j))][(i+M)%M].v;
  const normalAt=(j,i)=>{const n=cross(sub(at(j+1,i),at(j-1,i)),sub(at(j,i+1),at(j,i-1)));return n;};
  const top=[0,y0+1.919+.004,centerAt(1.919)];
  for(let j=0;j<grid.length-1;j++)for(let i=0;i<M;i++){
   const uv=(jj,ii)=>[ii/M,rowsH[jj]/1.919],a=at(j,i),b=at(j,i+1),c=at(j+1,i+1),d=at(j+1,i);
   smoothTri([a,b,c],[normalAt(j,i),normalAt(j,i+1),normalAt(j+1,i+1)],'moaiStone',[uv(j,i),uv(j,i+1),uv(j+1,i+1)]);
   smoothTri([a,c,d],[normalAt(j,i),normalAt(j+1,i+1),normalAt(j+1,i)],'moaiStone',[uv(j,i),uv(j+1,i+1),uv(j+1,i)]);
  }
  const last=grid.length-1;for(let i=0;i<M;i++)smoothTri([top,at(last,i),at(last,i+1)],[[0,1,0],normalAt(last,i),normalAt(last,i+1)],'moaiStone',[[(i+.5)/M,1],[i/M,1],[(i+1)/M,1]]);
 }
 // ---- The ahu: fitted basalt facing stones, a paved top and a pebble apron. ----
 function block(x0,x1,y0b,y1,z0,z1,mat){const p=[[x0,y0b,z0],[x1,y0b,z0],[x1,y0b,z1],[x0,y0b,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];for(const [i,j,k,l]of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])quad(p[i],p[j],p[k],p[l],mat);}
 function platform(){
  const base=root+.03,{x,z0,z1,top}=ahu,mats=['ahuBasalt','ahuBasaltB','ahuBasaltC'];
  block(-x+.01,x-.01,base,top-.012,z0+.012,z1-.012,'ahuJoint');
  const courses=[[base,base+.105],[base+.105,top-.03]];
  for(const [face,zf,zb]of [[1,z1-.018,z1],[-1,z0,z0+.018]])for(const [k,[ya,yb]]of courses.entries()){let px=-x;while(px<x-.001){const w=Math.min(x-px,.17+.13*random());block(px+.003,px+w-.003,ya+.003,yb-.003,zf,zb,mats[Math.floor(random()*3)]);px+=w;}}
  for(const sx of [-1,1])for(const [ya,yb]of courses){let pz=z0;while(pz<z1-.001){const w=Math.min(z1-pz,.16+.1*random());block(sx>0?x-.018:-x,sx>0?x:-x+.018,ya+.003,yb-.003,pz+.003,pz+w-.003,mats[Math.floor(random()*3)]);pz+=w;}}
  // Capping course and paving slabs.
  block(-x-.008,x+.008,top-.03,top-.012,z0-.008,z1+.008,'ahuBasaltC');
  for(let i=0;i<8;i++)for(let k=0;k<3;k++){const xa=-x+i*(2*x/8),za=z0+k*((z1-z0)/3);block(xa+.004,xa+2*x/8-.004,top-.014,top+.004*random()-.002,za+.004,za+(z1-z0)/3-.004,'ahuSlab');}
  // Rounded beach stones (poro) paving the apron in front of the platform.
  for(let n=0;n<190;n++){
   const px=(random()*2-1)*(x-.02),pz=z1+.03+random()*.32,r=.018+.016*random(),gy=ground(px,pz);
   const rot=random()*Math.PI,profile=[];for(let k=0;k<=4;k++){const a=-Math.PI/2+k/4*Math.PI;profile.push([r*Math.cos(a),r*.55*Math.sin(a)]);}
   lathe(profile,random()<.4?'poroDark':'poro',7,p=>{const c=Math.cos(rot),s=Math.sin(rot);return[px+p[0]*c*1.3-p[2]*s,gy+r*.25+p[1],pz+p[0]*s*1.3+p[2]*c];});
  }
 }
 function shoreRocks(){
  for(let n=0;n<26;n++){
   const px=(random()*2-1)*.82,s=shore(px),pz=s-.02-random()*.1;if(Math.hypot(px,pz)>R-.05)continue;
   const r=.03+.04*random(),gy=Math.max(ground(px,pz),root+sea),profile=[];for(let k=0;k<=5;k++){const a=-Math.PI/2+k/5*Math.PI;profile.push([r*Math.cos(a)*(1+.15*Math.sin(k*2.1)),r*.7*Math.sin(a)]);}
   lathe(profile,'shoreRock',8,p=>[px+p[0],gy+p[1]*1.0+r*.2,pz+p[2]*.8]);
  }
 }
 return{chile:{title:'Moai on an ahu',build(){
  plinth(1.0);land.terrain('rnGround',{rings:40,spacing:.022,soil:'rnSoil',bedrock:'rnRock',soilDepth:.05});
  platform();shoreRocks();figure();
 }}};
}
