// An original scenic miniature of Ming wall architecture. The winding wall,
// stair treads, embrasures, arched tower tunnels and ashlar joints are geometry.
export async function createGreatWallCollectible(api){
 const {tri,quad,plinth,box,palette}=api;
 Object.assign(palette,{
  gwBrick:{color:'#9c9381',metal:0,rough:.87},gwLight:{color:'#a79d88',metal:0,rough:.82},gwPale:{color:'#b9af9b',metal:0,rough:.85},gwDark:{color:'#938a79',metal:0,rough:.9},gwMortar:{color:'#777463',metal:0,rough:.95},gwPaver:{color:'#b4ac96',metal:0,rough:.9},gwEarth:{color:'#626c52',metal:0,rough:.97},gwRock:{color:'#70765d',metal:0,rough:.98},gwEarthDark:{color:'#5d674e',metal:0,rough:1}
 });
 const TAU=Math.PI*2,root=-.9925,N=96;
 const stone=(i,j=0)=>['gwBrick','gwBrick','gwLight','gwBrick','gwBrick','gwDark','gwBrick'][((i*43+j*71)^(i*j*17))%7];
 const ridge=x=>-.82+.68*Math.sin(Math.PI*Math.max(0,Math.min(1,(x+1.2)/2.4)))+.025*Math.sin(Math.PI*3*(x+1.2)/2.4);
 const center=t=>{const x=-1.2+2.4*t;return[x,.35*Math.sin(TAU*t)];};
 const frame=t=>{const [x,z]=center(t),dx=2.4,dz=.35*TAU*Math.cos(TAU*t),d=Math.hypot(dx,dz);return{x,z,nx:-dz/d,nz:dx/d,angle:Math.atan2(-dz,dx)};};
 const track=(t,offset,y)=>{const a=frame(t);return[a.x+a.nx*offset*.78,y,a.z+a.nz*offset*.78];};
 const walk=t=>Math.round((ridge(center(t)[0])+.34)/.015)*.015;
 function solid(p,mat,top=mat){
  for(const [i,j,k,l]of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])quad(p[i],p[j],p[k],p[l],i===4?top:mat);
 }
 function trackBlock(a,b,left,right,lowA,lowB,topA,topB,mat,top=mat){
  solid([track(a,left,lowA),track(b,left,lowB),track(b,right,lowB),track(a,right,lowA),track(a,left,topA),track(b,left,topB),track(b,right,topB),track(a,right,topA)],mat,top);
 }
 function terrain(){
  const at=(r,a)=>{const x=1.43*r*Math.cos(a),z=1.43*r*Math.sin(a),t=(x+1.2)/2.4,pathZ=.35*Math.sin(TAU*t),d=Math.abs(z-pathZ),body=Math.max(0,1-Math.pow(d/.83,1.2)),edge=Math.min(1,Math.max(0,(1-r)*7));
   const relief=(ridge(Math.max(-1.2,Math.min(1.2,x)))-root-.012)*body*edge,crag=.025*Math.sin(a*9+r*19)*Math.sin(a*4-r*11)*Math.min(r*3,1)*edge*body;
   let height=root+.008+Math.max(0,relief+crag);
   // Keep a shoulder of solid mountain beneath every tower corner. These
   // terraces merge gradually into the ridge instead of cantilevering.
   for(const at of [.13,.50,.87]){const f=frame(at),c=Math.cos(f.angle),s=Math.sin(f.angle),dx=x-f.x,dz=z-f.z,dist=Math.max(Math.abs(dx*c-dz*s),Math.abs(dx*s+dz*c)),weight=Math.max(0,Math.min(1,(.56-dist)/.22)),minimum=walk(at)-.54;
    if(minimum>height)height+=(minimum-height)*weight;
   }
   return[x,height,z];};
  const rings=22,angles=112;
  for(let r=0;r<rings;r++)for(let i=0;i<angles;i++){
   const a=i/angles*TAU,b=(i+1)/angles*TAU,p=at(r/rings,a),q=at((r+1)/rings,a),s=at(r/rings,b),v=at((r+1)/rings,b),patch=Math.sin(q[0]*8+q[2]*4)+Math.cos(q[2]*6-q[0]*2),mat=patch>1.2?'gwRock':'gwEarth';
   if((i+r)%2){tri(p,q,s,mat);tri(q,v,s,mat);}else{tri(p,q,v,mat);tri(p,v,s,mat);}
  }
  for(let i=0;i<angles;i++){const a=i/angles*TAU,b=(i+1)/angles*TAU,p=at(1,a),q=at(1,b);quad([p[0],root,p[2]],[q[0],root,q[2]],q,p,'gwRock');}
 }
 function wall(){
  for(let i=0;i<N;i++){
   const a=i/N,b=(i+1)/N,h=walk((a+b)/2),loA=ridge(center(a)[0])-.015,loB=ridge(center(b)[0])-.015;
   trackBlock(a,b,-.226,.226,loA,loB,h-.015,h-.015,'gwMortar');
   // Five brick courses follow the ridge, with shallow bed and perp joints.
   for(const sign of [-1,1])for(let row=0;row<5;row++){
    const u=a+.0002,v=b-.0002,t0=row/5,t1=(row+1)/5,ya=loA+(h-loA)*t0+.0007,yb=loB+(h-loB)*t0+.0007,za=loA+(h-loA)*t1-.0007,zb=loB+(h-loB)*t1-.0007;
    trackBlock(u,v,sign<0?-.232:.215,sign<0?-.215:.232,ya,yb,za,zb,stone(i,row));
   }
   // Real horizontal pavers and vertical risers form the uphill staircase.
   for(let k=0;k<3;k++)trackBlock(a+.00015,b-.00015,-.169+k*.112,-.059+k*.112,h-.017,h-.017,h,h,stone(i,k+2),'gwPaver');
   for(const sign of [-1,1]){
    const left=sign<0?-.232:.177,right=sign<0?-.177:.232;
    trackBlock(a,b,left,right,h-.015,h-.015,h+.125,h+.125,'gwMortar');
    for(let row=0;row<2;row++)trackBlock(a+.00025,b-.00025,left-.002,right+.002,h+row*.062+.001,h+row*.062+.001,h+(row+1)*.062-.001,h+(row+1)*.062-.001,stone(i+row,2));
    trackBlock(a,b,left-.005,right+.005,h+.121,h+.121,h+.134,h+.134,'gwPale');
   }
  }
  for(let i=0;i<36;i++){
   const a=(i+.12)/36,b=(i+.73)/36,low=Math.min(walk(a),walk(b),walk((a+b)/2))+.118,high=Math.max(walk(a),walk(b),walk((a+b)/2))+.225;
   for(const sign of [-1,1]){
    const left=sign<0?-.240:.174,right=sign<0?-.174:.240;
    trackBlock(a,b,left,right,low,low,high-.013,high-.013,stone(i,2));
    trackBlock(a-.0007,b+.0007,left-.004,right+.004,high-.014,high-.014,high,high,'gwPale');
   }
  }
 }
 function tower(t,extra=0){
  const f=frame(t),floor=walk(t)+.015,top=floor+.47+extra,half=.256,thick=.060,c=Math.cos(f.angle),s=Math.sin(f.angle),place=p=>[f.x+p[0]*c+p[2]*s,p[1],f.z-p[0]*s+p[2]*c];
  function block(x,y,z,w,h,d,mat){
   const p=[[-w/2,-h/2,-d/2],[w/2,-h/2,-d/2],[w/2,-h/2,d/2],[-w/2,-h/2,d/2],[-w/2,h/2,-d/2],[w/2,h/2,-d/2],[w/2,h/2,d/2],[-w/2,h/2,d/2]].map(p=>place([p[0]+x,p[1]+y,p[2]+z]));solid(p,mat);
  }
  block(0,floor-.285,0,.56,.60,.56,'gwMortar');
  for(let side=0;side<4;side++)for(let row=0;row<8;row++)for(let col=0;col<5;col++){
   const v=-.224+col*.112,y=floor-.547+row*.074;
   if(side%2===0)block(v,y,side===0?.282:-.282,.109,.071,.014,stone(col+side,row));
   else block(side===1?.282:-.282,y,v,.014,.071,.109,stone(col+side,row));
  }
  block(0,floor+.014,0,.534,.028,.534,'gwPale');
  function face(side){
   const a=side*Math.PI/2,ca=Math.cos(a),sa=Math.sin(a),p=(x,y,z)=>place([x*ca+z*sa,y,-x*sa+z*ca]);
   function section(l,r,lowL,lowR,highL,highR,mat){
    solid([p(l,lowL,half),p(r,lowR,half),p(r,lowR,half-thick),p(l,lowL,half-thick),p(l,highL,half),p(r,highR,half),p(r,highR,half-thick),p(l,highL,half-thick)],mat);
   }
   const door=side%2,windows=door?[{x:0,w:.15,sill:floor+.028,spring:floor+.25}]:[{x:-.124,w:.119,sill:floor+.155,spring:floor+.30},{x:.124,w:.119,sill:floor+.155,spring:floor+.30}],outer=.5/2;
   const openings=windows.map(w=>({...w,left:w.x-w.w/2,right:w.x+w.w/2}));
   const gaps=[[-outer,openings[0].left],...openings.slice(1).map((w,i)=>[openings[i].right,w.left]),[openings.at(-1).right,outer]];
   for(const [j,[l,r]]of gaps.entries())for(let course=0;course<7;course++)section(l+.0005,r-.0005,floor+course*(top-floor)/7+.0008,floor+course*(top-floor)/7+.0008,floor+(course+1)*(top-floor)/7-.0008,floor+(course+1)*(top-floor)/7-.0008,stone(j+side,course));
   for(const [j,w]of openings.entries()){
    if(w.sill>floor+.03)for(let course=0;course<2;course++)section(w.left,w.right,floor+course*(w.sill-floor)/2,floor+course*(w.sill-floor)/2,floor+(course+1)*(w.sill-floor)/2-.001,floor+(course+1)*(w.sill-floor)/2-.001,stone(j+side,course));
    const radius=w.w/2,outerR=radius+.018,steps=12;
    for(let k=0;k<steps;k++){
     const a=Math.PI*k/steps,b=Math.PI*(k+1)/steps,il=w.x-radius*Math.cos(a),ir=w.x-radius*Math.cos(b),ol=w.x-outerR*Math.cos(a),or=w.x-outerR*Math.cos(b),iy=w.spring+radius*Math.sin(a),jy=w.spring+radius*Math.sin(b),oy=w.spring+outerR*Math.sin(a),py=w.spring+outerR*Math.sin(b);
     const u=Math.max(w.left,ol),v=Math.min(w.right,or);if(v>u)section(u,v,oy,py,top,top,stone(k+side,j));
     // Voussoir ring, arch soffit and back ring are physically thick stone.
     quad(p(il,iy,half+.004),p(ol,oy,half+.004),p(or,py,half+.004),p(ir,jy,half+.004),stone(k,j));
     quad(p(il,iy,half-thick),p(ir,jy,half-thick),p(or,py,half-thick),p(ol,oy,half-thick),'gwDark');
     quad(p(il,iy,half+.004),p(ir,jy,half+.004),p(ir,jy,half-thick),p(il,iy,half-thick),'gwDark');
    }
    for(const x of [w.left,w.right]){
     quad(p(x,w.sill,half+.002),p(x,w.spring,half+.002),p(x,w.spring,half-thick),p(x,w.sill,half-thick),'gwDark');
     section(x-.009,x+.009,w.sill,w.sill,w.spring,w.spring,'gwLight');
    }
    section(w.left-.010,w.right+.010,w.sill-.008,w.sill-.008,w.sill+.004,w.sill+.004,'gwPale');
   }
   section(-.265,.265,top-.004,top-.004,top+.021,top+.021,'gwPale');
   section(-.267,.267,top+.020,top+.020,top+.050,top+.050,'gwLight');
  }
  for(let i=0;i<4;i++)face(i);
  block(0,top+.008,0,.41,.017,.41,'gwPaver');
  // Crenellated fighting platform. The lower ring is continuous, its merlons
  // are separate stones with full openings between them.
  for(let side=0;side<4;side++)for(let i=0;i<5;i++){
   const pos=-.223+i*.112;
   if(side%2===0){block(pos,top+.088,side===0?.252:-.252,.069,.083,.061,stone(i,side));block(pos,top+.134,side===0?.252:-.252,.078,.014,.073,'gwPale');}
   else{block(side===1?.252:-.252,top+.088,pos,.061,.083,.069,stone(i,side));block(side===1?.252:-.252,top+.134,pos,.073,.014,.078,'gwPale');}
  }
  for(let row=0;row<4;row++)for(let col=0;col<4;col++)block(-.145+col*.097,top+.019,-.145+row*.097,.094,.009,.094,stone(row,col));
 }
 return{china:{title:'Great Wall',build(){
  plinth(1.58);terrain();wall();tower(.13);tower(.50,.07);tower(.87);
 }}};
}
