// An original interpretation of the Sagrada Família as planned: eighteen towers on a
// Latin-cross church. Twelve spindle-shaped apostle towers with spiralling louvres and
// mosaic pinnacles stand over the Nativity, Passion and Glory facades; the Evangelist,
// Mary and Jesus Christ towers rise from the crossing. The church sits on an
// octagonal Eixample city block. Not a survey reconstruction.
import sharp from 'sharp';
import {clamp,lerp,smooth,hex,mixColor,createNoise,smoothTriangle} from './collectible-landscape.mjs';
export async function createSagradaCollectible(api){
 const {tri,quad,plinth,box,beam,palette,masks,getParts}=api;
 Object.assign(palette,{
  sfTower:{color:'#ffffff',metal:0,rough:.8},sfCentral:{color:'#ffffff',metal:0,rough:.72},sfFacade:{color:'#ffffff',metal:0,rough:.82},
  sfStone:{color:'#cbb690',metal:0,rough:.8},sfStoneDark:{color:'#a38f6e',metal:0,rough:.84},sfLight:{color:'#e3d8c0',metal:0,rough:.72},sfRecess:{color:'#352f28',metal:0,rough:.95},sfRoof:{color:'#b6a585',metal:0,rough:.78},
  sfCeramic:{color:'#f1eee6',metal:.08,rough:.26},sfGlass:{color:'#f3f6f4',metal:.15,rough:.14},
  sfMosaicRed:{color:'#b23a2d',metal:.12,rough:.3},sfMosaicGold:{color:'#d4a63a',metal:.55,rough:.3},sfMosaicWhite:{color:'#eee8da',metal:.05,rough:.3},sfMosaicGreen:{color:'#3d8a62',metal:.1,rough:.3},
  sfCypress:{color:'#3d6638',metal:0,rough:.8},sfDove:{color:'#f4f1ea',metal:0,rough:.6},
  sfPaving:{color:'#c4bcab',metal:0,rough:.85},sfPavingEdge:{color:'#9d9584',metal:0,rough:.88},sfTree:{color:'#4f7034',metal:0,rough:.85},sfTreeB:{color:'#5f8240',metal:0,rough:.85}
 });
 const TAU=Math.PI*2,noise=createNoise(1882),{random,fbm,hash}=noise,yg=-.93,xc=-.12;
 const st=(v,n,mat,uv)=>smoothTriangle(getParts,v,n,mat,uv);
 // Surface of revolution with smooth normals and optional texture coordinates.
 function revolve(cx,cz,profile,segments,mat,uvAt=null,phase=0){
  const normals=profile.map((p,j)=>{const a=profile[Math.max(0,j-1)],b=profile[Math.min(profile.length-1,j+1)],dr=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dr,dy)||1;return[dy/l,-dr/l];});
  const P=(i,j)=>{const a=i/segments*TAU+phase,[r,y]=profile[j];return[cx+r*Math.cos(a),y,cz+r*Math.sin(a)];},N=(i,j)=>{const a=i/segments*TAU+phase,[nr,ny]=normals[j];return[nr*Math.cos(a),ny,nr*Math.sin(a)];};
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){
   const m=typeof mat==='function'?mat(i,j):mat,uv=uvAt?[uvAt(i,j),uvAt(i+1,j),uvAt(i+1,j+1),uvAt(i,j+1)]:null;
   st([P(i,j),P(i+1,j),P(i+1,j+1)],[N(i,j),N(i+1,j),N(i+1,j+1)],m,uv&&[uv[0],uv[1],uv[2]]);
   st([P(i,j),P(i+1,j+1),P(i,j+1)],[N(i,j),N(i+1,j+1),N(i,j+1)],m,uv&&[uv[0],uv[2],uv[3]]);
  }
 }
 const sphere=(x,y,z,r,mat,seg=10)=>{const profile=[];for(let k=0;k<=6;k++){const a=-Math.PI/2+k/6*Math.PI;profile.push([r*Math.cos(a),y+r*Math.sin(a)]);}revolve(x,z,profile,seg,mat);};
 // A textured planar quad: corners in order with their UVs.
 function texQuad(p,uv,mat){const n=[0,1,2].map(k=>{const a=p[1].map((v,i)=>v-p[0][i]),b=p[2].map((v,i)=>v-p[0][i]);return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]][k];});st([p[0],p[1],p[2]],[n,n,n],mat,[uv[0],uv[1],uv[2]]);st([p[0],p[2],p[3]],[n,n,n],mat,[uv[0],uv[2],uv[3]]);}

 // ---- Painted textures ----
 const raw=(W,H,fn)=>{const px=Buffer.alloc(W*H*3);for(let j=0;j<H;j++)for(let i=0;i<W;i++){const c=fn(i/W,j/H),k=(j*W+i)*3;for(let n=0;n<3;n++)px[k+n]=clamp(Math.round(c[n]),0,255);}return sharp(px,{raw:{width:W,height:H,channels:3}}).png({palette:true,colours:128,dither:.4,compressionLevel:9}).toBuffer();};
 const sand=hex('#cdb791'),sandLight=hex('#e0d0ae'),sandDark=hex('#9c8565'),grime=hex('#7e6c55'),dark=hex('#2c2620'),pale=hex('#e6dcc6'),ceramic=hex('#f2efe7');
 // Apostle tower: v runs up the shaft. Fluted lower stage, then six helical columns of
 // dark louvres between pale rings, and a lettered band below the pinnacle.
 masks.set('sfTower',await raw(256,1024,(u,v)=>{
  let c=mixColor(sand,sandLight,smooth(-.2,.4,fbm(u*8,v*30,3)));c=mixColor(c,grime,(1-smooth(.0,.3,v))*.45*smooth(-.2,.5,fbm(u*20,v*6,2)));
  if(v<.3)c=mixColor(c,sandDark,.25*(.5+.5*Math.cos(u*TAU*18)));
  if(v>.32&&v<.86){for(let k=0;k<6;k++){const cu=((k/6+v*.55)%1+1)%1,d=Math.min(Math.abs(u-cu),1-Math.abs(u-cu));if(d<.04){const slat=(v*110)%1<.5;c=d>.032?pale:slat?mixColor(dark,sandDark,.35):mixColor(sandDark,sand,.3);}}}
  for(const ring of [.32,.55,.74,.86])if(Math.abs(v-ring)<.007)c=pale;
  if(v>.88&&v<.93){c=pale;if(v>.893&&v<.92&&hash(Math.floor(u*48),Math.floor(v*400))>.45&&(u*48)%1<.7)c=dark;}
  return c;
 }));
 // Central towers: pale ribbed stone with a grid of small windows.
 masks.set('sfCentral',await raw(256,1024,(u,v)=>{
  let c=mixColor(pale,sandLight,smooth(-.3,.4,fbm(u*6,v*20,2)));c=mixColor(c,sandDark,.18*(.5+.5*Math.cos(u*TAU*24)));
  const gu=(u*24)%1,gv=(v*70)%1;if(v>.12&&v<.97&&gu>.38&&gu<.62&&gv>.25&&gv<.7&&Math.floor(v*70)%2===0)c=mixColor(dark,sandDark,.25);
  return mixColor(c,ceramic,smooth(.82,.97,v));
 }));
 // Facades: dripping, sculpted stone with dark hollows, darker toward the ground.
 masks.set('sfFacade',await raw(512,512,(u,v)=>{
  const drip=fbm(u*34,v*3.5,3),blob=fbm(u*14+3,v*14,3),e=.004,gx=fbm((u+e)*14+3,v*14,3)-fbm((u-e)*14+3,v*14,3),gy=fbm(u*14+3,(v+e)*14,3)-fbm(u*14+3,(v-e)*14,3);
  let c=mixColor(sand,sandLight,smooth(.0,.45,blob));c=mixColor(c,sandDark,smooth(.15,.55,drip)*.5);
  c=mixColor(c,dark,clamp(Math.hypot(gx,gy)*9-.15)*.55*smooth(-.1,.2,-blob));
  return mixColor(c,grime,smooth(.55,1,v)*.35);
 }));

 // ---- Towers ----
 function finial(x,z,y,rt,scale){
  // Gaudí's apostle pinnacle: gold collar, a red-and-white mosaic mitre and a small white cross.
  const s=scale;revolve(x,z,[[rt*1.05,y],[rt*.9,y+.012*s],[rt*.62,y+.03*s],[rt*.66,y+.04*s]],12,'sfMosaicGold');
  const prof=[];for(let k=0;k<=10;k++){const t=k/10;prof.push([rt*(.66+.62*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.15)),.85))*(1-.55*t)+.0005,y+.04*s+t*.11*s]);}
  revolve(x,z,prof,12,(i,j)=>j===3||j===7?'sfMosaicGold':i%2?'sfMosaicRed':'sfMosaicWhite');
  const top=y+.15*s,arm=rt*.42,w=rt*.2;revolve(x,z,[[rt*.32,top-.002*s],[rt*.2,top+.012*s],[0,top+.02*s]],10,'sfMosaicWhite');
  beam([x,top+.008*s,z],[x,top+.07*s,z],w,w,'sfMosaicWhite');beam([x-arm,top+.045*s,z],[x+arm,top+.045*s,z],w,w,'sfMosaicWhite');beam([x,top+.045*s,z-arm],[x,top+.045*s,z+arm],w,w,'sfMosaicWhite');
 }
 function apostle(x,z,h){
  const r0=.05,shaft=h*.85,rows=30,R=t=>t<.38?r0*(1-.2*t):r0*.924*(1-.64*Math.pow((t-.38)/.62,1.7));
  const profile=[[r0*1.18,yg],...Array.from({length:rows+1},(_,j)=>{const t=j/rows;return[R(t),yg+.02+t*(shaft-.02)];})];
  revolve(x,z,profile,20,'sfTower',(i,j)=>[i/20,j===0?0:(j-1)/rows]);
  finial(x,z,yg+shaft,R(1),h/1.05);
 }
 function central(x,z,h,r0,crown){
  const shaft=h*.84,rows=36,R=t=>r0*(1-.6*Math.pow(t,1.35)),profile=Array.from({length:rows+1},(_,j)=>{const t=j/rows;return[R(t),yg+t*shaft];});
  revolve(x,z,profile,24,'sfCentral',(i,j)=>[i/24,j/rows]);
  const rt=R(1),y=yg+shaft;revolve(x,z,[[rt,y],[rt*.92,y+.03],[rt*.55,y+.09],[rt*.25,y+.13],[0,y+.15]],16,'sfCeramic');
  if(crown==='jesus'){
   // The Jesus Christ tower's four-armed cross of white glass.
   const cy=y+.19,arm=.075;beam([x,y+.12,z],[x,cy+arm,z],.026,.026,'sfGlass');
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])beam([x,cy,z],[x+dx*arm,cy,z+dz*arm],.026,.026,'sfGlass');
   for(const p of [[x+arm,cy,z],[x-arm,cy,z],[x,cy,z+arm],[x,cy,z-arm],[x,cy+arm,z]])sphere(...p,.017,'sfGlass',10);
  }else if(crown==='mary'){
   // Mary's twelve-pointed star.
   const phi=(1+Math.sqrt(5))/2,cy=y+.19;for(const a of [-1,1])for(const b of [-1,1])for(const v of [[0,a,b*phi],[a,b*phi,0],[b*phi,0,a]]){const n=Math.hypot(...v);beam([x,cy,z],[x+v[0]/n*.06,cy+v[1]/n*.06,z+v[2]/n*.06],.014,.014,'sfGlass');}sphere(x,cy,z,.022,'sfGlass',10);
  }else{
   // Evangelist towers: a white crown of four upturned horns around a pointed tip.
   revolve(x,z,[[.02,y+.13],[.012,y+.19],[0,y+.24]],12,'sfMosaicWhite');
   for(let k=0;k<4;k++){const a=k/4*TAU+Math.PI/4;beam([x+Math.cos(a)*.012,y+.14,z+Math.sin(a)*.012],[x+Math.cos(a)*.034,y+.2,z+Math.sin(a)*.034],.011,.011,'sfMosaicWhite');}
  }
 }

 // ---- Church body ----
 function prism(points,y0,y1,mat,topMat=mat){
  const c=points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]);
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];quad([a[0],y0,a[1]],[b[0],y0,b[1]],[b[0],y1,b[1]],[a[0],y1,a[1]],mat);tri([c[0],y1,c[1]],[a[0],y1,a[1]],[b[0],y1,b[1]],topMat);}
 }
 function gable(x0,x1,z0,z1,y,rise,alongX,mat='sfRoof'){
  if(alongX){const zm=(z0+z1)/2;quad([x0,y,z0],[x1,y,z0],[x1,y+rise,zm],[x0,y+rise,zm],mat);quad([x0,y+rise,zm],[x1,y+rise,zm],[x1,y,z1],[x0,y,z1],mat);tri([x0,y,z0],[x0,y+rise,zm],[x0,y,z1],'sfStone');tri([x1,y,z0],[x1,y,z1],[x1,y+rise,zm],'sfStone');}
  else{const xm=(x0+x1)/2;quad([x0,y,z0],[x0,y,z1],[xm,y+rise,z1],[xm,y+rise,z0],mat);quad([xm,y+rise,z0],[xm,y+rise,z1],[x1,y,z1],[x1,y,z0],mat);tri([x0,y,z0],[xm,y+rise,z0],[x1,y,z0],'sfStone');tri([x0,y,z1],[x1,y,z1],[xm,y+rise,z1],'sfStone');}
 }
 // Facade face: textured, with recessed pointed portals.
 function facadeFace(axis,fixed,a0,a1,y0,y1,out,portals){
  const P=(a,y,d=0)=>axis==='z'?[a,y,fixed+out*d]:[fixed+out*d,y,a];
  texQuad([P(a0,y0),P(a1,y0),P(a1,y1),P(a0,y1)],[[0,1],[1,1],[1,0],[0,0]],'sfFacade');
  for(const [c,w,hgt]of portals){
   const pts=[];for(let k=0;k<=12;k++){const t=k/12,x=-w/2*(1-t*t),yy=hgt*.58+hgt*.42*t;pts.push([x,yy]);}const outline=[[-w/2,0],...pts,...pts.slice(0,-1).reverse().map(([x,yy])=>[-x,yy]),[w/2,0]];
   const center=P(c,y0+hgt*.4,.003);for(let k=0;k<outline.length-1;k++)tri(center,P(c+outline[k][0],y0+outline[k][1],.003),P(c+outline[k+1][0],y0+outline[k+1][1],.003),'sfRecess');
   for(let k=0;k<outline.length-1;k++)beam(P(c+outline[k][0]*1.12,y0+outline[k][1]*1.04,.007),P(c+outline[k+1][0]*1.12,y0+outline[k+1][1]*1.04,.007),.012,.012,'sfLight');
  }
 }
 // Aisle pinnacles: a stone plinth under a pale pointed tip.
 function fruit(x,y,z,s=1){
  box(x,y+.012*s,z,.022*s,.024*s,.022*s,'sfStone');revolve(x,z,[[.012*s,y+.024*s],[.009*s,y+.045*s],[0,y+.075*s]],8,'sfLight');
 }
 function church(){
  // Nave and aisles toward the Glory facade (+x), transept to Nativity (+z) and Passion (-z).
  const naveX0=xc+.12,naveX1=.5,hn=.52,ha=.3;
  box((naveX0+naveX1)/2,yg+hn/2,0,naveX1-naveX0,hn,.26,'sfStone');gable(naveX0,naveX1,-.13,.13,yg+hn,.12,true);
  for(const s of [-1,1]){box((naveX0+naveX1)/2,yg+ha/2,s*.19,naveX1-naveX0,ha,.12,'sfStone');
   facadeFace('z',s*.25,naveX0,naveX1,yg,yg+ha,s,[...Array.from({length:4},(_,k)=>[naveX0+.06+k*.09,.045,.18])]);
   facadeFace('z',s*.13,naveX0,naveX1,yg+ha,yg+hn,s,Array.from({length:5},(_,k)=>[naveX0+.045+k*.085,.032,.17]));
   for(let k=0;k<6;k++)fruit(naveX0+.02+k*.074,yg+ha,s*.25,1);
  }
  box(xc,yg+hn/2,0,.24,hn,.6,'sfStone');gable(xc-.12,xc+.12,-.3,.3,yg+hn,.12,false);
  for(const sx of [-1,1])facadeFace('x',xc+sx*.12,-.28,-.13,yg+ha,yg+hn,sx,[[-.205,.04,.17]]),facadeFace('x',xc+sx*.12,.13,.28,yg+ha,yg+hn,sx,[[.205,.04,.17]]);
  for(let k=0;k<6;k++){const x=naveX0+.03+k*(naveX1-naveX0-.06)/5;revolve(x,0,[[.014,yg+hn+.1],[.01,yg+hn+.15],[0,yg+hn+.19]],8,'sfLight');}
  // Apse: a half-round of chapels with pointed pinnacles.
  const ax=xc-.12;revolve(ax,0,[[.22,yg],[.22,yg+.36],[.2,yg+.38],[.1,yg+.56],[0,yg+.66]],28,(i,j)=>j<1?'sfStone':'sfRoof',null,Math.PI/2);
  for(let k=0;k<7;k++){const a=Math.PI/2+k/6*Math.PI,x=ax+.24*Math.cos(a),z=.24*Math.sin(a);revolve(x,z,[[.045,yg],[.045,yg+.24],[.03,yg+.33],[0,yg+.4]],10,'sfStoneDark');}
  box(ax,yg+.2,0,.01,.4,.44,'sfStone');
 }
 function nativity(){
  const z=.33,x0=xc-.3,x1=xc+.3,top=yg+.46;box(xc,yg+.23,z,x1-x0,.46,.1,'sfStoneDark');
  facadeFace('z',z+.05,x0,x1,yg,top,1,[[xc,.13,.27],[xc-.18,.085,.2],[xc+.18,.085,.2]]);
  for(const [c,w,ht]of [[xc,.16,.14],[xc-.18,.12,.1],[xc+.18,.12,.1]]){gable(c-w/2,c+w/2,z-.04,z+.05,top,ht,false,'sfStone');for(const d of [-1,1])revolve(c+d*w/2,z+.04,[[.012,top],[.008,top+ht*.9],[0,top+ht*1.15]],8,'sfLight');}
  for(const [c,w,ht]of [[xc,.16,.14],[xc-.18,.12,.1],[xc+.18,.12,.1]]){for(const d of [-1,1])for(let k=1;k<8;k++){const t=k/8;sphere(c+d*(w/2)*(1-t),top+ht*t+.006,z+.05,.007,'sfLight',6);}}
  for(const [c,w]of [[xc,.13],[xc-.18,.085],[xc+.18,.085]])for(const d of [-1,1])revolve(c+d*(w/2+.018),z+.06,[[.012,yg],[.01,yg+.2],[.016,yg+.215],[0,yg+.24]],8,'sfLight');
  for(let k=0;k<=14;k++){const x=x0+k*(x1-x0)/14;if([xc,xc-.18,xc+.18].some(c=>Math.abs(x-c)<.07))continue;revolve(x,z+.04,[[.009,top],[.006,top+.04],[0,top+.06]],6,'sfStone');}
  // The cypress of the Tree of Life, with white doves and a red cross.
  revolve(xc,z+.03,[[.05,top+.08],[.048,top+.15],[.032,top+.26],[0,top+.34]],14,'sfCypress');
  for(let k=0;k<14;k++){const t=random(),a=random()*TAU,r=lerp(.048,.012,t);sphere(xc+Math.cos(a)*r,top+.1+t*.22,z+.03+Math.sin(a)*r,.008,'sfDove',6);}
  beam([xc,top+.33,z+.03],[xc,top+.4,z+.03],.012,.012,'sfMosaicRed');beam([xc-.025,top+.38,z+.03],[xc+.025,top+.38,z+.03],.011,.011,'sfMosaicRed');
  for(let k=0;k<26;k++){const x=lerp(x0+.02,x1-.02,random()),y=yg+.24+random()*.2;sphere(x,y,z+.052,.008+.006*random(),random()<.6?'sfStone':'sfLight',6);}
  [.98,1.07,1.07,.98].forEach((h,i)=>apostle(xc-.225+i*.15,z+.02,h));
 }
 function passion(){
  const z=-.33,x0=xc-.3,x1=xc+.3,top=yg+.44;box(xc,yg+.22,z,x1-x0,.44,.1,'sfStone');
  facadeFace('z',z-.05,x0,x1,yg,top,-1,[[xc,.12,.24],[xc-.17,.08,.18],[xc+.17,.08,.18]]);
  // A portico of six raked, bone-like columns under a plain frieze.
  for(let k=0;k<6;k++){const x=x0+.06+k*.096,lean=(k-2.5)*.012;beam([x,yg,z-.13],[x+lean,yg+.3,z-.11],.03,.03,'sfLight');}
  box(xc,yg+.315,z-.1,x1-x0,.04,.09,'sfLight');gable(x0,x1,z-.14,z-.06,yg+.335,.06,true,'sfStone');
  [1.05,1.12,1.12,1.05].forEach((h,i)=>apostle(xc-.225+i*.15,z-.02,h));
 }
 function glory(){
  const x=.53,top=yg+.48;box(x,yg+.24,0,.1,.48,.62,'sfStone');
  facadeFace('x',x+.05,-.31,.31,yg,top,1,[[0,.14,.3],[-.17,.09,.22],[.17,.09,.22]]);
  // The planned porch: a row of columns carrying a cornice of small lanterns.
  for(let k=0;k<7;k++){const z=-.27+k*.09;revolve(x+.13,z,[[.016,yg],[.013,yg+.26],[.02,yg+.28]],10,'sfLight');}
  box(x+.13,yg+.295,0,.06,.03,.62,'sfLight');for(let k=0;k<7;k++)revolve(x+.13,-.27+k*.09,[[.014,yg+.31],[.009,yg+.35],[0,yg+.38]],8,'sfMosaicGold');
  [1.08,1.12,1.12,1.08].forEach((h,i)=>apostle(x+.02,-.225+i*.15,h));
 }
 function block(){
  // Octagonal Eixample block: paving, kerb and street trees.
  const half=.73,ch=.22,pts=[[half,half-ch],[half-ch,half],[-half+ch,half],[-half,half-ch],[-half,-half+ch],[-half+ch,-half],[half-ch,-half],[half,-half+ch]];
  prism(pts,-.9925,yg-.006,'sfPavingEdge','sfPaving');prism(pts.map(([a,b])=>[a*.985,b*.985]),yg-.006,yg,'sfPaving');
  for(let k=0;k<pts.length;k++){const a=pts[k],b=pts[(k+1)%pts.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.floor(len/.17);for(let i=1;i<n;i++){const t=i/n,x=lerp(a[0],b[0],t)*.93,z=lerp(a[1],b[1],t)*.93;if(Math.abs(x)<.6&&Math.abs(z)<.5)continue;beam([x,yg,z],[x,yg+.05,z],.008,.008,'sfStoneDark');sphere(x,yg+.075,z,.038,random()<.5?'sfTree':'sfTreeB',9);}}
 }
 return{spain:{title:'Sagrada Família',build(){
  plinth(1.0);block();church();nativity();passion();glory();
  central(xc,0,1.73,.088,'jesus');central(xc-.24,0,1.39,.066,'mary');
  for(const [dx,dz]of [[1,1],[1,-1],[-1,1],[-1,-1]])central(xc+dx*.12,dz*.12,1.36,.058,'evangelist');
 }}};
}
