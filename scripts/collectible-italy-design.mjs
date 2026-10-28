// Original miniature of the Colosseum. Its arches, wall thickness, stepped cavea
// and hypogeum are mesh geometry; no photographs, external meshes or opacity cuts.
export async function createItalyCollectible(api){
 const {tri,quad,plinth,box,beam,palette}=api;
 Object.assign(palette,{
  itTravertine:{color:'#d6c7aa',metal:0,rough:.72},
  itLightStone:{color:'#e4d7bd',metal:0,rough:.70},
  itWarmStone:{color:'#c6b18f',metal:0,rough:.76},
  itTufa:{color:'#96816a',metal:0,rough:.83},
  itMortar:{color:'#ad987b',metal:0,rough:.83},
  itBrick:{color:'#b28c70',metal:0,rough:.86},
  itSand:{color:'#c1aa83',metal:0,rough:.91},
  itDeck:{color:'#93704e',metal:0,rough:.79}
 });
 const TAU=Math.PI*2,N=80,A=1.30,B=1.08,Y=-.955,H=.255,HALF=Math.PI/N;
 const stone=(i,j=0)=>['itTravertine','itTravertine','itLightStone','itWarmStone'][(i*7+j*3)%4];
 const point=(a,y,r=1)=>[A*r*Math.cos(a),y,B*r*Math.sin(a)];
 const caveaPoint=(a,y,r)=>{const t=Math.max(0,Math.min(1,(r-.515)/(.825-.515)));return[A*r*Math.cos(a),y,B*r*(.72+.28*t)*Math.sin(a)];};
 function strip(a,b,l0,l1,t0,t1,outer,inner,mat='itTravertine',side='itTufa',caps=true,map=point){
  const p=map(a,l0,outer),q=map(a,t0,outer),r=map(b,t1,outer),s=map(b,l1,outer);
  const v=map(a,l0,inner),w=map(a,t0,inner),x=map(b,t1,inner),z=map(b,l1,inner);
  quad(p,q,r,s,mat);quad(v,z,x,w,side);quad(q,w,x,r,mat);quad(p,s,z,v,side);if(caps){quad(v,w,q,p,mat);quad(s,r,x,z,mat);}
 }
 function arcBand(a,b,r0,r1,y0,y1,mat,segments=2,map=point){
  for(let i=0;i<segments;i++){const u=a+(b-a)*i/segments,v=a+(b-a)*(i+1)/segments;strip(u,v,y0,y0,y1,y1,r1,r0,mat,mat,true,map);}
 }
 function slabEllipse(r0,r1,y0,y1,mat,segments=160){
  for(let i=0;i<segments;i++)arcBand(i/segments*TAU,(i+1)/segments*TAU,r0,r1,y0,y1,mat,1);
 }
 function ellipseDisc(rx,rz,y0,y1,mat,segments=128){
  for(let i=0;i<segments;i++){
   const a=i/segments*TAU,b=(i+1)/segments*TAU,p=[rx*Math.cos(a),y0,rz*Math.sin(a)],q=[rx*Math.cos(b),y0,rz*Math.sin(b)],r=[q[0],y1,q[2]],s=[p[0],y1,p[2]];
   tri([0,y1,0],s,r,mat);tri([0,y0,0],q,p,mat);quad(p,q,r,s,mat);
  }
 }
 function archBay(i,row,{radius=1,thickness=.065,height=H,detail=true}={}){
  const center=(i+.5)/N*TAU,y=Y+row*height,half=HALF*.96,opening=HALF*.64,frame=HALF*.11,spring=y+height*.43,rise=height*.22,top=y+height-.016;
  const outside=radius,inside=radius-thickness;
  // Four ashlar courses on each substantial pier: fine recessed horizontal beds
  // remain tangible shallow grooves rather than lines painted over a flat wall.
  for(const sign of [-1,1]){
   const a=center+(sign<0?-half:opening+frame),b=center+(sign<0?-opening-frame:half);
   if(detail)strip(a,b,y+.002,y+.002,top-.002,top-.002,outside-.004,inside+.002,'itMortar','itMortar');
   const courses=detail?4:1;for(let c=0;c<courses;c++){const low=y+c*(top-y)/courses,high=y+(c+1)*(top-y)/courses-.0013;strip(a,b,low,low,high,high,outside,inside,stone(i+c,row),'itTufa');}
  }
  // The spandrel begins above the outer arch. The opening is genuinely empty
  // below the intrados and remains visible from the back and through the wall.
  const segments=detail?10:7;
  for(let k=0;k<segments;k++){
   const p0=Math.PI*k/segments,p1=Math.PI*(k+1)/segments;
   const u0=-(opening+frame)*Math.cos(p0),u1=-(opening+frame)*Math.cos(p1),l0=spring+(rise+.015)*Math.sin(p0),l1=spring+(rise+.015)*Math.sin(p1);
   strip(center+u0,center+u1,l0,l1,top,top,outside,inside,stone(i+k,row),'itTufa',false);
   const ai=center-opening*Math.cos(p0),bi=center-opening*Math.cos(p1),ao=center+u0,bo=center+u1,il=spring+rise*Math.sin(p0),ir=spring+rise*Math.sin(p1);
   const front=outside+.0035;
   quad(point(ai,il,front),point(ao,l0,front),point(bo,l1,front),point(bi,ir,front),stone(i+k+1,row));
   quad(point(ai,il,inside),point(bi,ir,inside),point(bo,l1,inside),point(ao,l0,inside),'itTufa');
   quad(point(ai,il,front),point(bi,ir,front),point(bi,ir,inside),point(ai,il,inside),'itWarmStone');
   // The outward top of the voussoir is embedded in its spandrel. Keeping this
   // small shared edge closed also makes the original GLB useful when rotated.
   quad(point(ao,l0,inside),point(bo,l1,inside),point(bo,l1,front),point(ao,l0,front),stone(i+k,row));
  }
  if(detail)halfColumn(i/N*TAU,y,height,row,radius);
  arcBand(center-half,center+half,radius+.013,radius-.014,y+height-.015,y+height+.009,'itLightStone',2);
 }
 function halfColumn(a,y,h,row,radius){
  const center=point(a,y,radius+.003),normal=[Math.cos(a),0,Math.sin(a)],tangent=[-Math.sin(a),0,Math.cos(a)],r=.0112,low=y+.018,high=y+h-.038;
  const at=(v,yy)=>[center[0]+normal[0]*Math.cos(v)*r+tangent[0]*Math.sin(v)*r,yy,center[2]+normal[2]*Math.cos(v)*r+tangent[2]*Math.sin(v)*r];
  for(let i=0;i<10;i++){const u=-Math.PI/2+i/10*Math.PI,v=-Math.PI/2+(i+1)/10*Math.PI;quad(at(u,low),at(u,high),at(v,high),at(v,low),'itLightStone');}
  // Bases, echinus and abacus vary by order, without fragile floating ornaments.
  arcBand(a-.013,a+.013,radius+.020,radius-.004,y+.009,y+.027,'itTravertine',1);
  arcBand(a-.015,a+.015,radius+.024,radius-.005,high,high+.012,'itWarmStone',1);
  arcBand(a-.0175,a+.0175,radius+.028,radius-.006,high+.012,high+.023,'itLightStone',1);
  if(row===1){
   for(const sign of [-1,1]){const c=point(a+sign*.0125,high+.005,radius+.027);smallRosette(c,normal,tangent,.007,'itLightStone');}
  }else if(row===2){
   for(const sign of [-1,0,1]){const c=point(a+sign*.010,high-.002,radius+.023);const tip=[c[0]+normal[0]*.004,c[1]+.017,c[2]+normal[2]*.004],l=[c[0]-tangent[0]*.004,c[1]-.006,c[2]-tangent[2]*.004],r=[c[0]+tangent[0]*.004,c[1]-.006,c[2]+tangent[2]*.004];tri(l,tip,r,'itLightStone');}
  }
 }
 function smallRosette(c,n,t,r,mat){
  const middle=[c[0]+n[0]*.0015,c[1],c[2]+n[2]*.0015];
  for(let i=0;i<8;i++){const a=i/8*TAU,b=(i+1)/8*TAU;tri(middle,[c[0]+t[0]*r*Math.cos(a),c[1]+r*Math.sin(a),c[2]+t[2]*r*Math.cos(a)],[c[0]+t[0]*r*Math.cos(b),c[1]+r*Math.sin(b),c[2]+t[2]*r*Math.cos(b)],mat);}
 }
 function atticBay(i,height){
  const a=i/N*TAU,b=(i+1)/N*TAU,m=(a+b)/2,low=Y+H*3+.012,high=low+height,outer=1,inner=.942;
  if(i%2===0&&height>.14){
   const half=HALF*.27,bottom=low+.066,top=low+.13;
   strip(a,m-half,low,low,high,high,outer,inner,stone(i,4));strip(m+half,b,low,low,high,high,outer,inner,stone(i+1,4));
   strip(m-half,m+half,low,low,bottom,bottom,outer,inner,'itTravertine');strip(m-half,m+half,top,top,high,high,outer,inner,'itTravertine');
  }else strip(a,b,low,low,high,high,outer,inner,stone(i,4));
  arcBand(a,b,1.024,.936,high,high+.022,'itLightStone',2);
  arcBand(a-.009,a+.009,1.020,.994,low+.016,Math.max(low+.017,high-.018),'itLightStone',1);
  // The projecting corbels once supported the awning mast system.
  if(i%2===0&&height>.16)arcBand(m-.008,m+.008,1.038,1.001,high-.045,high-.026,'itWarmStone',1);
 }
 function ruinStone(a,r,y,scale,seed){
  const n=6,center=point(a,y,r),verts=[];
  for(let j=0;j<n;j++){const angle=j/n*TAU,rough=1+.14*Math.sin(seed*11+j*7);verts.push([center[0]+Math.cos(angle)*scale*rough,center[1],center[2]+Math.sin(angle)*scale*.72*rough]);}
  const top=verts.map((p,j)=>[p[0]*.999+center[0]*.001,p[1]+scale*(.5+.16*Math.sin(seed+j*3)),p[2]]);
  for(let j=0;j<n;j++){const k=(j+1)%n;quad(verts[j],top[j],top[k],verts[k],stone(seed+j));tri([center[0],center[1]+scale*.52,center[2]],top[j],top[k],stone(seed+j+1));}
 }
 function cavea(){
  const steps=18,inner=.515,outer=.825;
  for(let j=0;j<steps;j++){
   const r0=inner+(outer-inner)*j/steps,r1=inner+(outer-inner)*(j+1)/steps,y=-.80+j*.0302;
   for(let i=0;i<N;i++){
    const a=i/N*TAU,b=(i+1)/N*TAU;
    // The collapsed southern cavea leaves a clear view into the hypogeum even
    // at the collection viewer's modest default elevation.
    const south=Math.sin((a+b)/2);if(south>.72&&j>=3||south>.56&&j>=8)continue;
    // Four upper vomitoria interrupt the seating and expose real corridors.
    const entrance=(i%20===0||i%20===19)&&j>=12;
    if(entrance)continue;
    const aisle=i%10===0,mat=aisle?'itWarmStone':(j%4===0?'itLightStone':'itTravertine');
    arcBand(a,b,r0,r1,y-.018,y,mat,1,caveaPoint);
   }
  }
  // The low arena parapet is interrupted by the four axial entrances.
  for(let i=0;i<N;i++)if(i%20>1&&i%20<19)arcBand(i/N*TAU,(i+1)/N*TAU,.486,.509,-.9475,-.793,'itTravertine',1,caveaPoint);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   for(let j=0;j<7;j++)arcBand(a-.033,a+.033,.47+j*.007,.477+j*.007,-.936+j*.019,-.917+j*.019,'itWarmStone',1,caveaPoint);
  }
 }
 function hypogeum(){
  ellipseDisc(.626,.390,-.957,-.951,'itSand',96);
  const bottom=-.951,top=-.826;
  for(const z of [-.065,.065])box(0,(bottom+top)/2,z,1.05,top-bottom,.018,'itTufa');
  for(const x of [-.43,-.285,-.14,.14,.285,.43]){
   const extent=.31*Math.sqrt(Math.max(0,1-(x/.59)**2));
   for(const sign of [-1,1]){
    const start=sign*.07,end=sign*extent;
    beam([x,top,(start+end)/2],[x,bottom,(start+end)/2],.018,Math.abs(end-start),'itWarmStone');
    for(const z of [sign*.19,sign*.29])if(Math.abs(z)<extent)box(x+.045,(bottom+top)/2,z,.09,top-bottom,.015,'itTufa');
   }
  }
  // A restrained partial arena deck leaves the masonry hypogeum exposed.
  const deckY=-.795;
  for(let i=0;i<32;i++){
   const x=-.604+i*.0128,halfZ=.38*Math.sqrt(Math.max(0,1-(x/.626)**2));
   if(x>-.194)break;box(x,deckY,0,.0117,.020,halfZ*2,'itDeck');
  }
  for(const x of [-.48,-.30])for(const z of [-.22,.22])box(x,(-.951+deckY-.01)/2,z,.021,deckY-.01+.951,.021,'itTufa');
  for(const z of [-.22,.22])box(-.394,deckY-.020,z,.392,.020,.022,'itDeck');
 }
 return {italy:{title:'Colosseum',build(){
  plinth(1.47);ellipseDisc(1.337,1.115,-.9925,Y,'itTravertine',160);
  // Eighty-bay rhythm, with a surviving north wall and uneven broken south side.
  const levels=[];
  for(let i=0;i<N;i++){
   const a=(i+.5)/N*TAU,s=Math.sin(a),c=Math.cos(a),rows=s<-.075?3:c<-.66?3:c>.72?2:s>.73?0:1;levels.push(rows);
   for(let j=0;j<rows;j++)archBay(i,j);
   if(rows===0){arcBand(i/N*TAU,(i+1)/N*TAU,.949,1.006,Y,Y+.047+(i%3)*.008,'itWarmStone',2);if(i%2===0)ruinStone(a,.99,Y+.052,.025+(i%3)*.004,i);}
   if(rows===3&&s<-.12){let attic=.211;if(i===41||i===78)attic=.11;else if(i===42||i===77)attic=.16;atticBay(i,attic);}
   // Incomplete upper stones articulate the missing wall's exposed cut profile.
   if(rows>0&&s>-.12){const top=Y+rows*H+.01;arcBand(i/N*TAU,(i+1)/N*TAU,.936,1.021,top,top+.022+(i%4)*.005,stone(i,5),2);if(i%3===0)ruinStone(a,.978,top+.023,.016,i+41);}
  }
  // A separate inner structural ring can be seen through the outer portals.
  for(let i=0;i<N;i++){
   const a=(i+.5)/N*TAU,s=Math.sin(a),rows=s>.72?0:s<-.1?2:1;
   for(let j=0;j<rows;j++)archBay(i,j,{radius:.868,thickness:.045,height:.235,detail:false});
   if(!rows)arcBand(i/N*TAU,(i+1)/N*TAU,.824,.874,Y,Y+.030,stone(i,7),1);
  }
  cavea();hypogeum();
  // Surviving radial support walls in the open southern ruin connect the rings.
  for(let i=5;i<36;i+=3){const a=i/N*TAU,low=Y+.017,high=Y+.17+(i%4)*.014;const p=point(a,low,.865),q=point(a,high,.865),r=point(a,high,.944),s=point(a,low,.944);const off=.008;quad([p[0]-off,p[1],p[2]],[q[0]-off,q[1],q[2]],[r[0]-off,r[1],r[2]],[s[0]-off,s[1],s[2]],'itBrick');quad([s[0]+off,s[1],s[2]],[r[0]+off,r[1],r[2]],[q[0]+off,q[1],q[2]],[p[0]+off,p[1],p[2]],'itBrick');quad([q[0]-off,q[1],q[2]],[q[0]+off,q[1],q[2]],[r[0]+off,r[1],r[2]],[r[0]-off,r[1],r[2]],'itWarmStone');}
 }}};
}
