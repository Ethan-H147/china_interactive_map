// Original architectural miniature of Saint Basil's Cathedral. The composition
// follows the eight chapels around the central tent, with later chapel/belfry.
// References: State Historical Museum and Getty CONA 700008419.
export async function createSaintBasilCollectible(api){
 const {tri,quad,plinth,box,beam,lathe,palette,getParts}=api;
 Object.assign(palette,{
  basilBrick:{color:'#a64e3c',metal:0,rough:.82},basilBrickLight:{color:'#b65e43',metal:0,rough:.8},basilBrickDark:{color:'#853c31',metal:0,rough:.85},
  basilWhite:{color:'#ddcfac',metal:0,rough:.72},basilShadow:{color:'#3e3c33',metal:0,rough:.93},basilMortar:{color:'#c5b28f',metal:0,rough:.83},
  basilGreen:{color:'#3d7358',metal:.08,rough:.47},basilDarkGreen:{color:'#305747',metal:.08,rough:.5},basilRed:{color:'#b44135',metal:.08,rough:.48},basilBlue:{color:'#387391',metal:.08,rough:.48},basilCream:{color:'#e4d6a6',metal:.08,rough:.44},basilYellow:{color:'#d6b25b',metal:.18,rough:.43},basilGold:{color:'#be9950',metal:.77,rough:.29},basilTile:{color:'#345e50',metal:.13,rough:.57},basilPaving:{color:'#b8ad92',metal:0,rough:.87}
 });
 const TAU=Math.PI*2,add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=p=>{const l=Math.hypot(...p)||1;return p.map(v=>v/l);};
 function smoothTri(a,b,c,na,nb,nc,mat){const before=getParts()[mat]?.n.length||0;tri(a,b,c,mat);const part=getParts()[mat];if(part&&part.n.length>before)part.n.splice(part.n.length-9,9,...na,...nb,...nc);}
 function facet(cx,cz,a,x,y,z){return[cx+x*Math.cos(a)+z*Math.sin(a),y,cz-x*Math.sin(a)+z*Math.cos(a)];}
 function faceBox(cx,cz,a,x,y,z,w,h,d,mat){
  const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>facet(cx,cz,a,x+v[0]*w/2,y+v[1]*h/2,z+v[2]*d/2));
  for(const [i,j,k,l]of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])quad(p[i],p[j],p[k],p[l],mat);
 }
 function polyProfile(cx,cz,profile,mat,n=8){
  const p=(r,y,k)=>{const a=(k+.5)/n*TAU;return[cx+r/Math.cos(Math.PI/n)*Math.sin(a),y,cz+r/Math.cos(Math.PI/n)*Math.cos(a)];};
  for(let j=1;j<profile.length;j++)for(let k=0;k<n;k++)quad(p(profile[j-1][0],profile[j-1][1],k),p(profile[j-1][0],profile[j-1][1],k+1),p(profile[j][0],profile[j][1],k+1),p(profile[j][0],profile[j][1],k),mat);
 }
 function crossFinial(x,y,z,s=1){
  beam([x,y,z],[x,y+.17*s,z],.010*s,.010*s,'basilGold');beam([x-.046*s,y+.112*s,z],[x+.046*s,y+.112*s,z],.009*s,.009*s,'basilGold');beam([x-.029*s,y+.147*s,z],[x+.029*s,y+.147*s,z],.007*s,.007*s,'basilGold');beam([x-.027*s,y+.048*s,z],[x+.027*s,y+.025*s,z],.007*s,.007*s,'basilGold');
  lathe([[0,-.011*s],[.018*s,0],[0,.022*s]],'basilGold',12,p=>[p[0]+x,p[1]+y,p[2]+z]);
 }
 // Deep arched recesses: the wall surface is cut out around each opening.
 function windowFace(cx,cz,a,r,y0,y1,half,opening=.050){
  const base=y0+(y1-y0)*.25,top=y0+(y1-y0)*.76,spring=top-opening,depth=.038,F=(x,y,d=0)=>facet(cx,cz,a,x,y,r-d);
  quad(F(-half,y0),F(half,y0),F(half,base),F(-half,base),'basilBrick');
  quad(F(-half,base),F(-opening,base),F(-opening,y1),F(-half,y1),'basilBrick');quad(F(opening,base),F(half,base),F(half,y1),F(opening,y1),'basilBrick');
  for(let i=0;i<10;i++){
   const t0=i/10*Math.PI,t1=(i+1)/10*Math.PI,x0=-opening*Math.cos(t0),x1=-opening*Math.cos(t1),z0=spring+opening*Math.sin(t0),z1=spring+opening*Math.sin(t1);
   quad(F(x0,z0),F(x1,z1),F(x1,y1),F(x0,y1),'basilBrick');quad(F(x0,z0),F(x0,z0,depth),F(x1,z1,depth),F(x1,z1),'basilWhite');tri(F(0,base,depth),F(x1,z1,depth),F(x0,z0,depth),'basilShadow');
   const r0=opening+.012,r1=opening+.027,A0=F(-r0*Math.cos(t0),spring+r0*Math.sin(t0),-.002),A1=F(-r0*Math.cos(t1),spring+r0*Math.sin(t1),-.002),B0=F(-r1*Math.cos(t0),spring+r1*Math.sin(t0),-.003),B1=F(-r1*Math.cos(t1),spring+r1*Math.sin(t1),-.003);quad(A0,A1,B1,B0,'basilWhite');
  }
  quad(F(-opening,base),F(-opening,spring),F(-opening,spring,depth),F(-opening,base,depth),'basilWhite');quad(F(opening,spring),F(opening,base),F(opening,base,depth),F(opening,spring,depth),'basilWhite');
  quad(F(-opening,base,depth),F(opening,base,depth),F(opening,spring,depth),F(-opening,spring,depth),'basilShadow');quad(F(-opening,base),F(-opening,base,depth),F(opening,base,depth),F(opening,base),'basilWhite');
  for(const sign of [-1,1])faceBox(cx,cz,a,sign*(opening+.020),(base+spring)/2,r+.007,.019,spring-base+.02,.019,'basilWhite');
  faceBox(cx,cz,a,0,base-.013,r+.012,opening*2+.075,.028,.043,'basilWhite');
  // Slender bronze grille is seated inside the reveal.
  beam(F(0,base+.01,depth-.004),F(0,spring+.008,depth-.004),.004,.004,'basilGold');
 }
 function kokoshnik(cx,cz,a,y,r,w,h,material='basilWhite'){
  const F=(x,z,d=0)=>facet(cx,cz,a,x,y+z,r+d),steps=w<.18?6:8,path=[];
  for(let i=0;i<=steps;i++){const t=i/steps,x=-w/2+w*t,z=h*Math.pow(Math.sin(Math.PI*t),.72);path.push(F(x,z,.009));}
  for(let i=1;i<path.length;i++){
   tri(F(0,.006,.003),path[i-1],path[i],'basilBrickDark');beam(path[i-1],path[i],.011,.017,material);
   const t=(i-.5)/steps,x=-w/2+w*t,z=h*Math.pow(Math.sin(Math.PI*t),.72);if(i===3||i===6)faceBox(cx,cz,a,x*.68,y+z*.57,r+.018,.010,.020,.010,'basilWhite');
  }
 }
 function tower(cx,cz,r,y0,y1,large=true,variant=0){
  polyProfile(cx,cz,[[0,y0],[r+.035,y0],[r+.035,y0+.037],[r,y0+.050]],'basilWhite');
  for(let k=0;k<8;k++){
   const a=k/8*TAU,half=r*Math.tan(Math.PI/8);windowFace(cx,cz,a,r,y0+.05,y1-.17,half,large?.048:.033);
   for(const sign of [-1,1])faceBox(cx,cz,a,sign*(half-.012),(y0+y1)/2-.04,r+.006,.020,y1-y0-.16,.020,'basilWhite');
   for(let row=0;row<5;row++){const yy=y0+.07+row*.058;if(yy>y1-.21)break;for(const sign of [-1,1])faceBox(cx,cz,a,sign*(half*.72),yy,r+.002,half*.39,.010,.010,row%2?'basilBrickLight':'basilBrickDark');}
   kokoshnik(cx,cz,a,y1-.175,r+.009,half*1.95,.120);
  }
  polyProfile(cx,cz,[[r,y1-.178],[r+.018,y1-.16],[r+.018,y1-.14],[r-.022,y1-.10],[r-.022,y1-.08],[r-.055,y1-.03],[r-.055,y1]],'basilBrick');
  for(let tier=0;tier<2;tier++)for(let k=0;k<8;k++)kokoshnik(cx,cz,(k+(tier?.5:0))/8*TAU,y1-.10+tier*.054,r-.012-tier*.029,r*.66,.066,tier?'basilWhite':'basilMortar');
  const neck=r*.54;polyProfile(cx,cz,[[neck+.014,y1-.004],[neck+.014,y1+.020],[neck,y1+.028],[neck,y1+.16],[neck+.022,y1+.17],[neck+.022,y1+.19]],variant%2?'basilWhite':'basilGreen',16);
  for(let i=0;i<12;i++){const a=i/12*TAU;faceBox(cx,cz,a,0,y1+.098,neck+.004,.013,.105,.013,variant%2?'basilBrickDark':'basilCream');}
  return y1+.19;
 }
 const profile=[[0,.53],[.08,.76],[.23,.98],[.39,1],[.55,.90],[.71,.65],[.86,.31],[.96,.09],[1,0]];
 function radial(t){for(let j=1;j<profile.length;j++)if(t<=profile[j][0]){const [u,a]=profile[j-1],[v,b]=profile[j],f=(t-u)/(v-u),m=f*f*(3-2*f);return a+(b-a)*m;}return 0;}
 function onion(cx,cz,y,r,h,kind,colorA,colorB){
  const n=r>.20?60:40,rows=r>.20?24:20,twist=kind==='spiral'?TAU*.11:kind==='scale'?-.24:0,point=(a,t)=>{const angle=a+twist*t,phase=10*a,bump=kind==='diamond'?.012*Math.cos(8*a+8*Math.PI*t)*Math.cos(8*a-8*Math.PI*t):.020*Math.cos(phase)*Math.sin(Math.PI*t),rr=Math.max(0,r*(radial(t)+bump));return[cx+rr*Math.sin(angle),y+t*h,cz+rr*Math.cos(angle)];};
  const norm=(a,t)=>t>=1-1e-6?[0,1,0]:unit(cross(sub(point(a+.0001,t),point(a-.0001,t)),sub(point(a,Math.min(1,t+.0001)),point(a,Math.max(0,t-.0001)))));
  const mat=(a,t)=>kind==='diamond'?colorA:Math.cos(10*a)>-.03?colorA:colorB;
  for(let j=0;j<rows;j++)for(let i=0;i<n;i++){
   const a=i/n*TAU,b=(i+1)/n*TAU,t=j/rows,u=(j+1)/rows,A=point(a,t),B=point(b,t),C=point(b,u),D=point(a,u),m=mat((a+b)/2,(t+u)/2);smoothTri(A,B,C,norm(a,t),norm(b,t),norm(b,u),m);smoothTri(A,C,D,norm(a,t),norm(b,u),norm(a,u),m);
  }
  // Diamond domes carry continuous intersecting raised ribs over the curved skin.
  if(kind==='diamond')for(const direction of [-1,1])for(let i=0;i<8;i++)for(let j=0;j<18;j++){
   const t=j/18,u=(j+1)/18,A=point(i/8*TAU+direction*t*TAU*.5,t),B=point(i/8*TAU+direction*u*TAU*.5,u);for(const p of [A,B]){const a=Math.atan2(p[0]-cx,p[2]-cz);p[0]+=.003*Math.sin(a);p[2]+=.003*Math.cos(a);}beam(A,B,.008,.005,colorB);
  }
  lathe([[0,y-.015],[r*.55,y-.015],[r*.57,y],[r*.54,y+.015]],'basilGold',32,p=>[p[0]+cx,p[1],p[2]+cz]);crossFinial(cx,y+h,cz,.72);
 }
 function gallery(){
  polyProfile(0,0,[[0,-.99],[1.08,-.99],[1.14,-.95],[1.14,-.91],[1.08,-.88],[1.08,-.60],[1.12,-.57],[1.12,-.535],[0,-.535]],'basilBrick',16);
  for(let k=0;k<16;k++){
   const a=k/16*TAU,r=1.075,w=r*Math.tan(Math.PI/16);windowFace(0,0,a,r,-.878,-.60,w,.044);
   faceBox(0,0,a,0,-.88,r+.005,w*2,.019,.016,'basilWhite');faceBox(0,0,a,0,-.61,r+.008,w*2,.020,.018,'basilWhite');
  }
  // Low connecting galleries and their green pitched coverings.
  for(let k=0;k<8;k++){
   const a=k/8*TAU,cx=.69*Math.sin(a),cz=.69*Math.cos(a);faceBox(cx,cz,a,0,-.48,0,.37,.20,.30,'basilBrick');
   const F=(x,y,z)=>facet(cx,cz,a,x,y,z),p=[F(-.23,-.385,-.18),F(.23,-.385,-.18),F(.23,-.27,0),F(-.23,-.27,0),F(-.23,-.385,.18),F(.23,-.385,.18)],q=p.map(v=>[v[0],v[1]-.015,v[2]]);quad(p[0],p[1],p[2],p[3],'basilTile');quad(p[3],p[2],p[5],p[4],'basilTile');quad(q[3],q[2],q[1],q[0],'basilDarkGreen');quad(q[4],q[5],q[2],q[3],'basilDarkGreen');for(const [i,j]of[[0,1],[1,2],[2,5],[5,4],[4,3],[3,0]])quad(p[i],q[i],q[j],p[j],'basilGreen');
   for(let i=0;i<10;i++){const x=-.22+i/9*.44;beam(F(x,-.385,-.18),F(x,-.27,0),.005,.005,'basilGreen');beam(F(x,-.27,0),F(x,-.385,.18),.005,.005,'basilGreen');}
  }
 }
 function central(){
  const r=.28,y0=-.53,y1=.78;
  tower(0,0,r,y0,y1,true,0);
  // Tall central brick tent, with eight stacked decorative tiers at its foot.
  polyProfile(0,0,[[.227,.72],[.227,.85],[.206,.91],[.206,.98],[.19,1.03],[.19,1.07],[.025,1.86],[0,1.86]],'basilBrick',8);
  for(let k=0;k<8;k++){
   const a=k/8*TAU;for(let tier=0;tier<3;tier++)kokoshnik(0,0,a,.73+tier*.067,.252-tier*.018,.17-tier*.020,.11);
   const F=(x,y,z)=>facet(0,0,a,x,y,z);beam(F(0,1.05,.197),F(0,1.81,.035),.016,.016,'basilWhite');
   for(let j=0;j<7;j++){
    const t=(j+.5)/8,y=1.08+t*.72,rr=.19*(1-t)+.034*t;faceBox(0,0,a,0,y,rr+.003,.028*(1-t)+.008,.043,.009,j%2?'basilWhite':'basilGreen');
   }
  }
  lathe([[0,1.84],[.041,1.84],[.041,1.92],[.055,1.94],[.055,1.95]],'basilWhite',24);
  onion(0,0,1.95,.085,.20,'spiral','basilGold','basilYellow');
 }
 function porch(cx,cz,a){
  const F=(x,y,z)=>facet(cx,cz,a,x,y,z);
  for(let i=0;i<8;i++){const hh=(i+1)*.40/8;faceBox(cx,cz,a,0,-.983+hh/2,.25-i*.043,.37,hh,.073,'basilWhite');}
  for(const x of [-.225,.225]){faceBox(cx,cz,a,x,-.58,-.04,.065,.75,.065,'basilBrick');for(let j=0;j<4;j++)faceBox(cx,cz,a,x,-.84+j*.13,-.04,.083,.024,.083,'basilWhite');}
  const y=-.20;for(let i=0;i<14;i++){const t0=i/14*Math.PI,t1=(i+1)/14*Math.PI,outer=t=>[-.27*Math.cos(t),y+.27*Math.sin(t)],P=outer(t0),Q=outer(t1),ceiling=x=>Math.min(.095,.25-.4*Math.abs(x)/.32);quad(F(-.23*Math.cos(t0),y+.23*Math.sin(t0),-.008),F(-.23*Math.cos(t1),y+.23*Math.sin(t1),-.008),F(...Q,-.008),F(...P,-.008),'basilWhite');quad(F(...P,-.012),F(...Q,-.012),F(Q[0],ceiling(Q[0]),-.012),F(P[0],ceiling(P[0]),-.012),'basilBrick');}
  const roof=[F(-.32,-.13,-.30),F(.32,-.13,-.30),F(.32,-.13,.11),F(-.32,-.13,.11),F(0,.27,-.095)],under=roof.map(p=>[p[0],p[1]-.018,p[2]]);for(let i=0;i<4;i++){tri(roof[i],roof[(i+1)%4],roof[4],'basilTile');tri(under[(i+1)%4],under[i],under[4],'basilDarkGreen');quad(roof[i],under[i],under[(i+1)%4],roof[(i+1)%4],'basilGreen');}
  for(let i=0;i<4;i++)beam(roof[i],roof[4],.013,.013,'basilWhite');
 }
 function belfry(){
  const cx=.96,cz=-.70,r=.175;polyProfile(cx,cz,[[0,-.94],[r+.045,-.94],[r+.045,-.84],[r,-.81],[r,-.18],[r+.025,-.15],[r+.025,-.11],[r,-.08]],'basilBrick',8);
  for(let k=0;k<8;k++){
   const a=k/8*TAU,half=r*Math.tan(Math.PI/8);windowFace(cx,cz,a,r,-.78,-.28,half,.031);
   // Open belfry stage with masonry piers and genuinely open spaces.
   for(const sign of [-1,1])faceBox(cx,cz,a,sign*(half-.012),.075,r,.024,.31,.040,'basilWhite');
   for(let i=0;i<8;i++){const u=i/8*Math.PI,v=(i+1)/8*Math.PI,F=(t,rad)=>facet(cx,cz,a,-rad*Math.cos(t),.12+rad*Math.sin(t),r);quad(F(u,.055),F(v,.055),F(v,.078),F(u,.078),'basilWhite');}
  }
  polyProfile(cx,cz,[[r+.025,.23],[r+.025,.27],[r+.01,.30],[.035,.97],[0,.97]],'basilTile',8);
  for(let k=0;k<8;k++){const a=k/8*TAU;beam(facet(cx,cz,a,0,.30,r+.012),facet(cx,cz,a,0,.96,.034),.010,.010,'basilWhite');for(let j=0;j<4;j++){const t=(j+1)/5;faceBox(cx,cz,a,0,.32+t*.61,(r+.01)*(1-t)+.035*t,.028,.049,.008,'basilWhite');}}
  onion(cx,cz,.98,.052,.13,'spiral','basilGold','basilYellow');
 }
 return{russia:{title:'Saint Basil’s Cathedral',build(){
  plinth(1.47);polyProfile(0,0,[[0,-.9925],[1.35,-.9925],[1.35,-.965],[0,-.965]],'basilPaving',48);gallery();
  const chapels=[
   {x:0,z:.65,r:.245,y:.45,h:.55,kind:'spiral',a:'basilGreen',b:'basilCream'},
   {x:-.65,z:0,r:.25,y:.66,h:.55,kind:'scale',a:'basilBlue',b:'basilCream'},
   {x:.65,z:0,r:.25,y:.58,h:.54,kind:'diamond',a:'basilGreen',b:'basilYellow'},
   {x:0,z:-.65,r:.25,y:.72,h:.52,kind:'spiral',a:'basilGreen',b:'basilRed'},
   {x:-.52,z:.52,r:.18,y:.28,h:.46,kind:'spiral',a:'basilRed',b:'basilCream'},
   {x:.52,z:.52,r:.18,y:.35,h:.43,kind:'spiral',a:'basilRed',b:'basilGreen'},
   {x:-.52,z:-.52,r:.18,y:.45,h:.44,kind:'diamond',a:'basilYellow',b:'basilGreen'},
   {x:.52,z:-.52,r:.18,y:.39,h:.45,kind:'scale',a:'basilGreen',b:'basilCream'}
  ];
  for(const [i,c]of chapels.entries()){const y=tower(c.x,c.z,c.r,-.535,c.y,i<4,i);onion(c.x,c.z,y,c.r*1.16,c.h,c.kind,c.a,c.b);}
  central();
  // The lower later chapel breaks the original eightfold symmetry.
  const y=tower(-.77,.73,.14,-.72,-.10,false,1);onion(-.77,.73,y,.185,.34,'spiral','basilRed','basilGreen');
  porch(-.48,.96,-.18);porch(.51,.96,.18);belfry();
 }}};
}
