// Original architectural miniature of Geunjeongjeon. Five bays on each side,
// double roof, dancheong bracket sets and two stone woldae terraces.
// References: Korea Heritage Service digital inventory (1111102230000),
// and the Royal Palaces and Tombs Center's Gyeongbokgung building guide.
import sharp from 'sharp';
export async function createPalaceCollectible(api){
 const {tri,quad,plinth,box,beam,cylinder,lathe,palette,masks,getParts}=api;
 Object.assign(palette,{
  palaceStone:{color:'#c9c5b6',metal:0,rough:.82},palaceStoneLight:{color:'#e0d9c7',metal:0,rough:.73},palaceMortar:{color:'#a39e90',metal:0,rough:.88},
  palaceRed:{color:'#853c32',metal:0,rough:.65},palaceRedLight:{color:'#a25341',metal:0,rough:.61},palaceGreen:{color:'#3d6b57',metal:0,rough:.61},palaceTeal:{color:'#497b72',metal:0,rough:.6},palaceBlue:{color:'#3d6376',metal:0,rough:.62},palaceOchre:{color:'#bd9e61',metal:.08,rough:.59},
  palaceTile:{color:'#58615e',metal:.03,rough:.72},palaceTileDark:{color:'#4e5654',metal:.03,rough:.74},palaceTileLight:{color:'#69716a',metal:.03,rough:.7},palaceEave:{color:'#d2c9af',metal:0,rough:.68},palaceRecess:{color:'#2b3530',metal:0,rough:.91},palacePaper:{color:'#d5cdb6',metal:0,rough:.89},palaceBronze:{color:'#5b6550',metal:.52,rough:.52},palaceSign:{color:'#ffffff',metal:.05,rough:.6}
 });
 const sign=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="768" height="256"><rect width="768" height="256" rx="5" fill="#243630"/><rect x="13" y="13" width="742" height="230" fill="none" stroke="#b79c61" stroke-width="6"/><text x="402" y="194" text-anchor="middle" letter-spacing="36" font-family="SimSun, Batang, serif" font-size="182" fill="#d7b578">勤政殿</text></svg>')).png().toBuffer();
 masks.set('palaceSign',sign);
 const TAU=Math.PI*2,lerp=(a,b,t)=>a+(b-a)*t,sub=(a,b)=>a.map((v,i)=>v-b[i]),norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
 const turn=(p,a)=>[Math.cos(a)*p[0]+Math.sin(a)*p[2],p[1],-Math.sin(a)*p[0]+Math.cos(a)*p[2]];
 function faceBox(a,x,y,z,w,h,d,mat){
  const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>turn([x+v[0]*w/2,y+v[1]*h/2,z+v[2]*d/2],a));
  for(const [i,j,k,l]of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])quad(p[i],p[j],p[k],p[l],mat);
 }
 const faceBeam=(a,p,q,w,d,mat)=>beam(turn(p,a),turn(q,a),w,d,mat);
 function stoneBall(x,y,z,r){lathe([[0,y-r],[r*.7,y-r*.7],[r,y],[r*.7,y+r*.7],[0,y+r]],'palaceStoneLight',8,p=>[p[0]+x,p[1],p[2]+z]);}
 function roundColumn(x,y,z,r,h,material,r2=r){lathe([[0,-h/2],[r,-h/2],[r2,h/2],[0,h/2]],material,20,p=>[p[0]+x,p[1]+y,p[2]+z]);}
 function post(x,z,y,h=.20){
  box(x,y+h*.43,z,.034,h*.86,.034,'palaceStoneLight');box(x,y+.018,z,.060,.036,.060,'palaceStone');box(x,y+h-.015,z,.047,.032,.047,'palaceStoneLight');stoneBall(x,y+h+.012,z,.024);
 }
 function railing(a,start,end,y,spacing=.18){
  const n=Math.ceil((end-start)/spacing),z=a%Math.PI===0?.93:1.16;
  const gap=x=>[-.72,0,.72].some(c=>Math.abs(x-c)<(c===0?.28:.18));
  for(let i=0;i<=n;i++){const x=start+(end-start)*i/n,p=turn([x,y,z],a);if(a===0&&gap(x))continue;post(p[0],p[2],y);}
  for(let i=0;i<n;i++){
   const l=start+(end-start)*i/n,r=start+(end-start)*(i+1)/n;if(a===0&&[-.72,0,.72].some(c=>l<c+(c===0?.28:.18)&&r>c-(c===0?.28:.18)))continue;
   faceBox(a,(l+r)/2,y+.16,z,r-l,.031,.034,'palaceStoneLight');faceBox(a,(l+r)/2,y+.045,z,r-l,.027,.031,'palaceStone');
   faceBox(a,(l+r)/2,y+.097,z,.028,.086,.022,'palaceStoneLight');
  }
 }
 function terrace(){
  plinth(1.48);
  box(0,-.945,0,2.52,.095,2.13,'palaceMortar');box(0,-.885,0,2.58,.032,2.17,'palaceStoneLight');
  box(0,-.775,0,2.37,.19,1.96,'palaceStone');box(0,-.67,0,2.43,.035,2.02,'palaceStoneLight');
  box(0,-.555,0,2.17,.19,1.73,'palaceStone');box(0,-.445,0,2.23,.035,1.79,'palaceStoneLight');
  // Individual ashlar courses, tightly backed by solid terrace masonry.
  for(let side=0;side<4;side++){
   const a=side*Math.PI/2,w=side%2?1.96:2.37,z=side%2?1.186:.981;
   for(let row=0;row<3;row++)for(let col=0;col<14;col++){
    const sw=w/14,x=-w/2+(col+.5)*sw;faceBox(a,x,-.845+row*.061,z,sw-.004,.057,.009,(row+col)%5?'palaceStone':'palaceStoneLight');
   }
   const w2=side%2?1.73:2.17,z2=side%2?1.087:.867;
   for(let row=0;row<3;row++)for(let col=0;col<12;col++){const sw=w2/12;faceBox(a,-w2/2+(col+.5)*sw,-.618+row*.061,z2,sw-.004,.057,.008,(row+col)%4?'palaceStone':'palaceStoneLight');}
  }
  // Central royal stair and the two flanking stairs on the front terrace.
  for(const x of [-.72,0,.72]){
   const width=x===0?.47:.32;
   for(let i=0;i<8;i++){const h=(i+1)*.513/8;box(x,-.94+h/2,1.155-i*.052,width,h,.088,'palaceStoneLight');}
   for(const sign of [-1,1]){
    const a=[x+sign*(width/2+.018),-.895,1.18],b=[x+sign*(width/2+.018),-.444,.80];beam(a,b,.045,.045,'palaceStoneLight');
    for(let i=0;i<5;i++){const t=i/4;post(a[0],a[2]+(b[2]-a[2])*t,a[1]+(b[1]-a[1])*t-.02,.11);}
   }
  }
  for(let side=0;side<4;side++)railing(side*Math.PI/2,side%2?-.89:-1.16,side%2?.89:1.16,-.653);
  // Upper terrace balustrade with gaps at the side and central stairs.
  for(const z of [-.84,.84])for(const side of [-1,1]){
   for(let i=0;i<4;i++){const x=side*(.40+i*.205);if(z>0&&Math.abs(Math.abs(x)-.72)<.22)continue;post(x,z,-.427,.15);if(i<3&&z<0){box(x+side*.1025,-.305,z,.205,.025,.027,'palaceStoneLight');box(x+side*.1025,-.383,z,.205,.020,.024,'palaceStone');}}
  }
  for(const x of [-1.07,1.07])for(let i=0;i<9;i++){const z=-.82+i*.205;post(x,z,-.427,.15);if(i<8){box(x,-.305,z+.1025,.027,.025,.205,'palaceStoneLight');box(x,-.383,z+.1025,.024,.020,.205,'palaceStone');}}
  // Small carved guard animals at the terrace corners, interpreted as stone relief.
  for(const x of [-1.155,1.155])for(const z of [-.94,.94]){
   box(x,-.355,z,.075,.065,.11,'palaceStone');stoneBall(x,-.30,z+.025,.037);for(const s of [-1,1])box(x+s*.024,-.384,z+.028,.023,.055,.03,'palaceStoneLight');
  }
 }
 function bracket(a,x,y,z,small=false){
  const s=small?.77:1;
  for(let j=0;j<(small?2:3);j++){
   const yy=y+j*.032*s,extent=(.055+j*.022)*s;
   faceBox(a,x,yy,z+.017*j,extent*2,.024*s,.042*s,j%2?'palaceRedLight':'palaceGreen');
   for(const sign of [-1,1]){
    faceBeam(a,[x+sign*extent,yy,z+.017*j],[x+sign*(extent+.018*s),yy+.018*s,z+.017*j],.017*s,.030*s,'palaceTeal');
    faceBox(a,x+sign*(extent-.008*s),yy+.014*s,z+.017*j,.013*s,.014*s,.044*s,'palaceOchre');
   }
  }
  faceBox(a,x,y+.090*s,z+.033,.026*s,.022*s,.165*s,'palaceGreen');
  faceBox(a,x,y+.102*s,z+.070,.014*s,.014*s,.045*s,'palaceBlue');
 }
 function door(a,x,y,z,w,h){
  // Dark jambs, inset paper panels and physical lattice strips.
  faceBox(a,x,y+h/2,z,w,h,.025,'palaceRecess');
  for(const sign of [-1,1])faceBox(a,x+sign*w*.485,y+h/2,z+.018,.013,h+.015,.018,'palaceRed');
  faceBox(a,x,y+.022,z+.023,w-.012,.042,.019,'palaceRed');faceBox(a,x,y+h-.015,z+.023,w-.012,.031,.019,'palaceGreen');
  for(let p=0;p<3;p++){
   const left=x-w/2+.018+p*(w-.036)/3,sw=(w-.036)/3;
   faceBox(a,left+sw/2,y+h*.51,z+.015,sw-.005,h*.78,.009,'palacePaper');
   for(let i=0;i<4;i++)faceBox(a,left+(i+.5)*sw/4,y+h*.51,z+.024,.004,h*.79,.007,'palaceGreen');
   for(let i=0;i<7;i++)faceBox(a,left+sw/2,y+.064+i*(h-.105)/6,z+.025,sw-.003,.004,.008,'palaceGreen');
   faceBox(a,left+sw/2,y+.064,z+.029,.018,.014,.012,'palaceOchre');
  }
 }
 function body(){
  box(0,-.405,0,1.81,.042,1.37,'palaceStoneLight');box(0,-.370,0,1.75,.03,1.32,'palaceRed');
  for(let side=0;side<4;side++){
   const a=side*Math.PI/2,half=side%2?.625:.82,z=side%2?.82:.625,step=half*2/5;
   for(let i=0;i<=5;i++){
    const x=-half+i*step,p=turn([x,-.089,z],a);
    roundColumn(p[0],p[1],p[2],.026,.55,'palaceRed',.024);roundColumn(p[0],-.365,p[2],.039,.045,'palaceStoneLight');
    bracket(a,x,.175,z);
    if(i<5){door(a,x+step/2,-.35,z-.004,step-.055,.45);bracket(a,x+step/2,.175,z,true);}
   }
   for(const [y,h,mat]of [[.123,.037,'palaceGreen'],[.159,.027,'palaceRedLight'],[.270,.025,'palaceTeal']])faceBox(a,0,y,z,half*2+.07,h,.055,mat);
   for(let i=0;i<30;i++)faceBox(a,-half+half*2*i/29,.142,z+.032,.021,.007,.008,i%2?'palaceOchre':'palaceBlue');
  }
  // The lower storey is closed behind its doors, so nothing shows through between bays.
  box(0,-.035,0,1.58,.67,1.19,'palaceRecess');
  // Bracket-tier beams fill the space between the bracket sets and the roof above them.
  box(0,.3195,0,1.62,.071,1.23,'palaceGreen');
  // Upper storey, standing on the lower roof. Its brackets carry the upper roof directly.
  const U={half:.68,depth:.485,base:.48,doorY:.51,doorH:.17,bracketY:.754};
  box(0,.69,0,2*U.half-.06,.42,2*U.depth-.06,'palaceRecess');box(0,.865,0,2*U.half-.02,.052,2*U.depth-.02,'palaceGreen');
  for(let side=0;side<4;side++){
   const a=side*Math.PI/2,half=side%2?U.depth:U.half,z=side%2?U.half:U.depth,step=half*2/5;
   for(let i=0;i<=5;i++){
    const x=-half+i*step,p=turn([x,.615,z],a);roundColumn(p[0],p[1],p[2],.021,.27,'palaceRed',.019);bracket(a,x,U.bracketY,z,true);
    if(i<5){door(a,x+step/2,U.doorY,z+.004,step-.04,U.doorH);bracket(a,x+step/2,U.bracketY,z,true);}
   }
   faceBox(a,0,U.base+.02,z,half*2+.05,.03,.05,'palaceGreen');
   for(const [y,h,mat]of [[.697,.03,'palaceGreen'],[.723,.022,'palaceRedLight']])faceBox(a,0,y,z,half*2+.055,h,.052,mat);
   for(let i=0;i<26;i++)faceBox(a,-half+half*2*i/25,.710,z+.029,.018,.006,.007,i%2?'palaceOchre':'palaceBlue');
  }
  // Name board on the upper storey, centred on the front.
  box(0,.595,U.depth+.034,.33,.122,.018,'palaceRed');
  const p=[[-.157,.542,U.depth+.045],[.157,.542,U.depth+.045],[.157,.647,U.depth+.045],[-.157,.647,U.depth+.045]],emit=(a,b,c,uv)=>{
   const before=getParts().palaceSign?.p.length||0;tri(a,b,c,'palaceSign');const part=getParts().palaceSign;
   if(part.p.length>before){part.uv??=[];part.uv.push(...uv.flat());}
  };
  emit(p[0],p[1],p[2],[[0,1],[1,1],[1,0]]);emit(p[0],p[2],p[3],[[0,1],[1,0],[0,0]]);
 }
 // Roof shells. Each slope is a tiled surface with real thickness, curved Korean profile
 // (flat at the eaves, steepening upward), lifted and slightly swept-out corners, barrel
 // tile ribs, painted rafters below and white-mortared ridges. The lower roof is a skirt
 // that rises into the upper storey; the upper roof is a hip-and-gable (paljak) roof.
 function roofShell({Wo,Do,ye,rise,lift,sweep,thick,split=null,Wi,Di,nx,nt}){
  const paljak=split!==null,g=paljak?Wo-Do*split:0,tl=paljak?split:1;
  const halfW=t=>paljak?(t<split?Wo-Do*t:g):lerp(Wo,Wi,t),depth=t=>paljak?Do*(1-t):lerp(Do,Di,t);
  const corner=(t,a)=>Math.pow(a,6)*Math.pow(1-Math.min(1,t/tl),2.4),y=(t,a)=>ye+rise*Math.pow(t,1.5)+lift*corner(t,a);
  const bulge=(t,a)=>sweep*Math.pow(a,4)*Math.pow(1-Math.min(1,t/tl),2);
  // Front/back slopes run along x; side slopes along z. Both share the hip corners.
  const front=(sign,u,t,dy=0)=>{const a=Math.abs(2*u-1),b=bulge(t,a);return[(2*u-1)*(halfW(t)+(t<tl?b:0)),y(t,a)+dy,sign*(depth(t)+b)];};
  const side=(sign,u,t,dy=0)=>{const a=Math.abs(2*u-1),b=bulge(t,a);return[sign*(halfW(t)+b),y(t,a)+dy,(2*u-1)*(depth(t)+b)];};
  function slope(at,tMax,columns){
   const rows=Math.max(2,Math.round(nt*tMax));
   for(let i=0;i<columns;i++)for(let j=0;j<rows;j++){
    const u=i/columns,v=(i+1)/columns,t=j/rows*tMax,s=(j+1)/rows*tMax;
    quad(at(u,t),at(v,t),at(v,s),at(u,s),(i*3+j)%11?'palaceTile':'palaceTileDark');
    quad(at(u,t,-thick),at(u,s,-thick),at(v,s,-thick),at(v,t,-thick),t<.2?'palaceGreen':'palaceRecess');
    if(j===0){quad(at(u,0),at(v,0),at(v,0,-thick),at(u,0,-thick),'palaceTileLight');}
   }
   // Barrel tile ribs follow every column from the eave upward.
   for(let i=1;i<columns;i++){const u=i/columns;for(let j=0;j<rows;j++){
    const t=j/rows*tMax,s=(j+1)/rows*tMax,p=at(u,t),q=at(u,s),across=norm(sub(at(Math.min(1,u+.01),t),at(Math.max(0,u-.01),t))),r=.0085;
    const ring=(c,k)=>{const ang=k/3*Math.PI;return[c[0]+across[0]*r*Math.cos(ang),c[1]+r*Math.sin(ang)+.002,c[2]+across[2]*r*Math.cos(ang)];};
    for(let k=0;k<3;k++)quad(ring(p,k),ring(q,k),ring(q,k+1),ring(p,k+1),'palaceTileLight');
   }}
   // Painted round rafters under the eave, with ochre ends.
   for(let i=0;i<columns;i+=2){const u=(i+1)/columns,a=at(u,0,-thick-.006),b=at(u,.16,-thick-.006);beam(a,b,.014,.014,'palaceGreen');const e=at(u,0,-thick-.004);box(e[0],e[1],e[2],.016,.016,.016,'palaceOchre');}
  }
  for(const sign of [-1,1]){slope((u,t,dy)=>front(sign,u,t,dy),1,nx);slope((u,t,dy)=>side(sign,u,t,dy),tl,Math.round(nx*Do/Wo));}
  // Hip ridges along each corner, with small clay guardians on the upper part.
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const edge=[];for(let j=0;j<=20;j++){const t=j/20*tl,p=side(sx,sz>0?1:0,t);edge.push([p[0],p[1]+.014,p[2]]);}
   for(let j=1;j<edge.length;j++)beam(edge[j-1],edge[j],.032,.03,'palaceEave');
   for(let k=0;k<(paljak?5:3);k++){const p=edge[Math.round(6+k*(paljak?2.4:3.4))];box(p[0],p[1]+.02,p[2],.024,.026,.03,'palaceTileLight');lathe([[0,0],[.012,0],[.016,.012],[.01,.026],[0,.029]],'palaceTileLight',8,v=>[v[0]+p[0],v[1]+p[1]+.03,v[2]+p[2]]);}
  }
  if(!paljak){
   // Flashing where the skirt roof meets the upper storey wall.
   const top=y(1,0)+.004,X=Wi+.026,Z=Di+.026;for(const [a,b]of [[[-X,top,Z],[X,top,Z]],[[-X,top,-Z],[X,top,-Z]],[[X,top,-Z],[X,top,Z]],[[-X,top,-Z],[-X,top,Z]]])beam(a,b,.034,.03,'palaceEave');
   return;
  }
  // Gables: a painted triangle under each verge, closed to the roof's own curve.
  const ys=y(split,0),ridgeY=y(1,0);
  for(const sx of [-1,1]){
   const x=sx*(g-.012),outline=[];for(let j=0;j<=16;j++){const t=split+(1-split)*j/16;outline.push([x,y(t,0)-thick-.002,depth(t)]);}
   const full=[...outline.map(p=>[p[0],p[1],-p[2]]).reverse(),...outline.slice(1)],base=[x,ys-thick,0];
   for(let k=0;k<full.length-1;k++)tri(base,full[k],full[k+1],'palaceGreen');
   for(let k=-7;k<=7;k++){const zz=k/8*depth(split)*.92,t=1-Math.abs(zz)/Do,top=y(Math.max(split,t),0)-thick-.006;if(top-ys<.01)continue;box(x+sx*.006,(ys-thick+top)/2,zz,.008,top-ys+thick,.008,'palaceRedLight');}
   for(const sz of [-1,1]){const edge=[];for(let j=0;j<=14;j++){const t=split+(1-split)*j/14;const p=front(sz,sx>0?1:0,t);edge.push([sx*g,p[1]+.013,p[2]]);}for(let j=1;j<edge.length;j++)beam(edge[j-1],edge[j],.03,.028,'palaceEave');}
   beam([x+sx*.004,ys-thick+.004,-depth(split)],[x+sx*.004,ys-thick+.004,depth(split)],.026,.02,'palaceEave');
  }
  // Main ridge with plastered sides and dragon-head finials.
  const ridge=[];for(let i=0;i<=24;i++){const x=-g-.02+i/24*(2*g+.04);ridge.push([x,ridgeY+.01+.018*Math.pow(Math.abs(x)/g,4),0]);}
  for(let i=1;i<ridge.length;i++)beam(ridge[i-1],ridge[i],.07,.046,'palaceEave');
  for(let i=1;i<ridge.length;i++)beam(ridge[i-1].map((v,k)=>k===1?v+.045:v),ridge[i].map((v,k)=>k===1?v+.045:v),.022,.06,'palaceTileLight');
  for(const sx of [-1,1]){
   const x=sx*(g+.01),yy=ridgeY+.05;lathe([[0,0],[.03,0],[.036,.028],[.03,.075],[.022,.1],[0,.118]],'palaceTileLight',14,p=>[p[0]+x,p[1]+yy,p[2]]);
   beam([x,yy+.07,0],[x-sx*.04,yy+.12,0],.02,.028,'palaceTileLight');
  }
 }
 return {korea:{title:'Gyeongbokgung throne hall',build(){
  terrace();body();
  roofShell({Wo:1.12,Do:.925,ye:.252,rise:.25,lift:.07,sweep:.035,thick:.028,Wi:.668,Di:.473,nx:46,nt:10});
  roofShell({Wo:1.0,Do:.805,ye:.803,rise:.48,lift:.075,sweep:.03,thick:.03,split:.5,nx:42,nt:13});
  // Bronze water vessels on the stone platform, with open bowls and tripod feet.
  for(const x of [-.91,.91]){
   for(let i=0;i<3;i++){const a=i/3*TAU;beam([x+.038*Math.cos(a),-.427,.66+.038*Math.sin(a)],[x+.031*Math.cos(a),-.335,.66+.031*Math.sin(a)],.015,.015,'palaceBronze');}
   lathe([[.028,-.35],[.055,-.328],[.068,-.283],[.061,-.277],[.054,-.302],[.024,-.326],[.028,-.35]],'palaceBronze',24,p=>[p[0]+x,p[1],p[2]+.66]);
  }
 }}};
}
