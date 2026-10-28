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
  palaceTile:{color:'#58615e',metal:.03,rough:.72},palaceTileLight:{color:'#69716a',metal:.03,rough:.7},palaceEave:{color:'#d2c9af',metal:0,rough:.68},palaceRecess:{color:'#2b3530',metal:0,rough:.91},palacePaper:{color:'#d5cdb6',metal:0,rough:.89},palaceBronze:{color:'#5b6550',metal:.52,rough:.52},palaceSign:{color:'#ffffff',metal:.05,rough:.6}
 });
 const sign=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="768" height="256"><rect width="768" height="256" rx="5" fill="#243630"/><rect x="13" y="13" width="742" height="230" fill="none" stroke="#b79c61" stroke-width="6"/><text x="402" y="194" text-anchor="middle" letter-spacing="36" font-family="SimSun, Batang, serif" font-size="182" fill="#d7b578">勤政殿</text></svg>')).png().toBuffer();
 masks.set('palaceSign',sign);
 const TAU=Math.PI*2;
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
  // Upper register remains an exterior storey; the actual hall has one tall room.
  box(0,.467,0,1.38,.315,1.02,'palaceRecess');
  for(let side=0;side<4;side++){
   const a=side*Math.PI/2,half=side%2?.49:.67,z=side%2?.69:.51,step=half*2/5;
   for(let i=0;i<=5;i++){
    const x=-half+i*step,p=turn([x,.477,z],a);roundColumn(p[0],p[1],p[2],.020,.286,'palaceRed');bracket(a,x,.615,z,true);
    if(i<5){door(a,x+step/2,.354,z+.005,step-.038,.240);bracket(a,x+step/2,.615,z,true);}
   }
   faceBox(a,0,.324,z,half*2+.055,.032,.050,'palaceGreen');faceBox(a,0,.591,z,half*2+.055,.033,.05,'palaceTeal');
  }
  box(0,.642,.555,.365,.126,.020,'palaceRed');
  const p=[[-.175,.588,.568],[.175,.588,.568],[.175,.696,.568],[-.175,.696,.568]],emit=(a,b,c,uv)=>{
   const before=getParts().palaceSign?.p.length||0;tri(a,b,c,'palaceSign');const part=getParts().palaceSign;
   if(part.p.length>before){part.uv??=[];part.uv.push(...uv.flat());}
  };
  emit(p[0],p[1],p[2],[[0,1],[1,1],[1,0]]);emit(p[0],p[2],p[3],[[0,1],[1,0],[0,0]]);
 }
 function roof(w,d,eave,height,upper){
  const g=w*.72;
  const point=(u,t,sign,lower=0)=>{
   const half=w-(w-g)*Math.min(1,t/.48),x=(2*u-1)*half,z=sign*d*(1-t),y=eave+height*(1-Math.pow(1-t,.72))+.038*(1-t)**8+.070*Math.abs(2*u-1)**8*(1-t)**4-lower;
   return[x,y,z];
  };
  const nx=40,nt=14;
  for(const sign of [-1,1]){
   for(let i=0;i<nx;i++)for(let j=0;j<nt;j++){
    const u=i/nx,v=(i+1)/nx,t=j/nt,s=(j+1)/nt;
    quad(point(u,t,sign),point(v,t,sign),point(v,s,sign),point(u,s,sign),(i+j)%6?'palaceTile':'palaceTileLight');
    if(j===0){const p=point(u,t,sign),q=point(v,t,sign);quad(p,q,point(v,t,sign,.023),point(u,t,sign,.023),'palaceEave');}
   }
   // Overlapping barrel tile ribs follow the curved roof surface.
   for(let i=0;i<=nx;i++)for(let j=0;j<nt;j++){
    const u=i/nx,t=j/nt,s=(j+1)/nt,p=point(u,t,sign),q=point(u,s,sign),r=.009,at=(v,a)=>[v[0]+r*Math.cos(a),v[1]+r*Math.sin(a)+.002,v[2]];
    for(let k=0;k<4;k++){const a=k/4*Math.PI,b=(k+1)/4*Math.PI;quad(at(p,a),at(q,a),at(q,b),at(p,b),'palaceTileLight');}
   }
   // Two rows of visible rafters under the curved eave.
   for(let i=0;i<32;i++){
    const u=(i+.5)/32,a=point(u,0,sign,.035),b=point(u,.13,sign,.040);beam(a,b,.016,.016,'palaceGreen');
    const c=point(u,0,sign,.047);beam([c[0],c[1]-.008,c[2]-sign*.008],[c[0],c[1]-.008,c[2]+sign*.024],.017,.017,'palaceOchre');
   }
  }
  // Lower hipped ends meet a genuine triangular gable on each short side.
  const split=.48,baseY=point(1,split,1)[1],topY=eave+height;
  for(const sx of [-1,1]){
   for(let j=0;j<10;j++)for(let k=0;k<24;k++){
    const at=(jj,kk)=>{const t=jj/10*split,v=kk/24*2-1,halfZ=d*(1-t);return[sx*(w-(w-g)*t/split),eave+height*(1-Math.pow(1-t,.72))+.038*(1-t)**8+.070*Math.abs(v)**8*(1-t)**4,v*halfZ];};
    quad(at(j,k),at(j,k+1),at(j+1,k+1),at(j+1,k),'palaceTile');
   }
   const x=sx*g,z=d*(1-split);tri([x,baseY,-z],[x,baseY,z],[x,topY,0],'palaceGreen');
   for(let i=-6;i<=6;i++){
    const zz=i/6*z*.88,h=(topY-baseY)*(1-Math.abs(zz)/z);box(x+sx*.008,baseY+h/2,zz,.014,h,.007,'palaceRedLight');
   }
   beam([x,baseY,-z],[x,topY,0],.027,.027,'palaceEave');beam([x,topY,0],[x,baseY,z],.027,.027,'palaceEave');
   for(const sz of [-1,1]){
    const edge=[];for(let j=0;j<=18;j++)edge.push(point(sx===1?1:0,j/18*split,sz));
    for(let j=1;j<edge.length;j++)beam(edge[j-1].map((v,i)=>v+(i===1?.012:0)),edge[j].map((v,i)=>v+(i===1?.012:0)),.027,.027,'palaceEave');
    // Original small roof guardians interpreted in clay, seated on the hip ridge.
    for(let j=1;j<=5;j++){
     const p=point(sx===1?1:0,.035+j*.063,sz);box(p[0],p[1]+.018,p[2],.027,.035,.035,'palaceTileLight');
     lathe([[0,0],[.014,0],[.018,.014],[.011,.029],[0,.032]],'palaceTileLight',10,v=>[v[0]+p[0],v[1]+p[1]+.027,v[2]+p[2]]);
    }
   }
  }
  const ridge=[];for(let i=0;i<=32;i++){const x=-g+i/32*g*2;ridge.push([x,eave+height+.019+.027*(Math.abs(x)/g)**4,0]);}
  for(let i=1;i<ridge.length;i++)beam(ridge[i-1],ridge[i],.028,.035,'palaceEave');
  for(const sx of [-1,1]){
   const x=sx*g,yy=eave+height+.04;lathe([[0,0],[.027,0],[.033,.024],[.028,.065],[.022,.089],[0,.105]],'palaceTileLight',14,p=>[p[0]+x,p[1]+yy,p[2]]);
   beam([x,yy+.065,0],[x+sx*.035,yy+.109,0],.018,.025,'palaceTileLight');
  }
 }
 return {korea:{title:'Gyeongbokgung throne hall',build(){
  terrace();body();roof(1.145,.875,.276,.315,false);roof(1.00,.745,.725,.435,true);
  // Bronze water vessels on the stone platform, with open bowls and tripod feet.
  for(const x of [-.91,.91]){
   for(let i=0;i<3;i++){const a=i/3*TAU;beam([x+.038*Math.cos(a),-.427,.66+.038*Math.sin(a)],[x+.031*Math.cos(a),-.335,.66+.031*Math.sin(a)],.015,.015,'palaceBronze');}
   lathe([[.028,-.35],[.055,-.328],[.068,-.283],[.061,-.277],[.054,-.302],[.024,-.326],[.028,-.35]],'palaceBronze',24,p=>[p[0]+x,p[1],p[2]+.66]);
  }
 }}};
}
