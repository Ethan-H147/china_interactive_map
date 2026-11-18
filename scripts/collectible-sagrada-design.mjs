import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {MeshoptSimplifier} from 'meshoptimizer';
import * as T from 'three';

// The long axis runs from the apse (-X) to the Glory entrance (+X).
// Local facade coordinates are horizontal, vertical and distance out of the wall.
export function buildBasilica(){
 const colors={base:'#263c3a',brass:'#bd9251',pave:'#b4aa97',sand:'#c4a077',ochre:'#af8663',shade:'#83664f',honey:'#d5b38a',chalk:'#ded0af',pink:'#c69e91',gray:'#a99b89',dark:'#514637',glass:'#465f64',amber:'#bf8d42',ruby:'#944a39',jade:'#668976',blue:'#79939b',white:'#f0e9d8',leaf:'#415d47'};
 const pieces=new Map(),cache=new Map(),tau=Math.PI*2;
 const group=new T.Group(),matrix=new T.Matrix4(),normalMatrix=new T.Matrix3(),point=new T.Vector3(),normal=new T.Vector3(),up=new T.Vector3(0,1,0);
 const v=p=>new T.Vector3(...p),qEuler=r=>new T.Quaternion().setFromEuler(new T.Euler(...r));
 let frame=new T.Matrix4();
 function cached(key,make){if(!cache.has(key))cache.set(key,make());return cache.get(key);}
 function put(geo,p,scale,mat,q=new T.Quaternion()){
  if(!pieces.has(mat))pieces.set(mat,{pos:[],norm:[],idx:[]});
  const dst=pieces.get(mat),start=dst.pos.length/3;
  matrix.compose(v(p),q,v(scale)).premultiply(frame);normalMatrix.getNormalMatrix(matrix);
  const {position,normal:n}=geo.attributes;
  for(let i=0;i<position.count;i++){point.fromBufferAttribute(position,i).applyMatrix4(matrix);normal.fromBufferAttribute(n,i).applyNormalMatrix(normalMatrix);dst.pos.push(point.x,point.y,point.z);dst.norm.push(normal.x,normal.y,normal.z);}
  const ix=geo.index;for(let i=0;i<(ix?.count??position.count);i++)dst.idx.push(start+(ix?ix.getX(i):i));
 }
 const box=(x,y,z,w,h,d,m)=>put(cached('box',()=>new T.BoxGeometry(1,1,1)),[x,y,z],[w,h,d],m);
 const orb=(x,y,z,rx,ry,rz,m,r=[0,0,0])=>put(cached('orb',()=>new T.SphereGeometry(1,10,7)),[x,y,z],[rx,ry,rz],m,qEuler(r));
 function rod(a,b,r,s,m,n=8){
  const dir=v(b).sub(v(a)),h=dir.length();if(h<.001)return;
  const ratio=Math.round(s/r*100)/100;
  const g=cached('rod'+n+'/'+ratio,()=>new T.CylinderGeometry(ratio,1,1,n));
  put(g,v(a).lerp(v(b),.5).toArray(),[r,h,r],m,new T.Quaternion().setFromUnitVectors(up,dir.normalize()));
 }
 function profile(x,z,rows,m,n=32){
  const geo=new T.LatheGeometry(rows.map(([y,r])=>new T.Vector2(r,y)),n);
  put(geo,[x,0,z],[1,1,1],m);geo.dispose();
 }
 function ring(x,y,z,r,t,m){put(cached('ring',()=>new T.TorusGeometry(1,.065,6,40)),[x,y,z],[r,r,t/.065],m,qEuler([Math.PI/2,0,0]));}
 function panel(points,z,d,m){
  const shape=new T.Shape(points.map(([x,y])=>new T.Vector2(x,y)));shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});put(geo,[0,0,z],[1,1,1],m);geo.dispose();
 }
 const local=(x,z,angle,fn)=>{const old=frame;frame=old.clone().multiply(new T.Matrix4().makeTranslation(x,0,z)).multiply(new T.Matrix4().makeRotationY(angle));fn();frame=old;};
 // Nested pointed openings. The jambs have depth and a continuous pointed archivolt.
 function arch(x,y,z,w,h,depth,face,back){
  const spring=h*.49,pts=[[-w/2,0],[-w/2,spring]];
  for(let i=1;i<=7;i++){const a=i/7;pts.push([-w/2*(1-a*a),spring+(h-spring)*a]);}
  for(let i=6;i>=0;i--){const a=i/7;pts.push([w/2*(1-a*a),spring+(h-spring)*a]);}pts.push([w/2,0]);
  const path=pts.map(([u,v])=>[x+u,y+v]);
  panel(path,z,.13,back);
  for(let i=1;i<path.length;i++)rod([...path[i-1],z+depth],[...path[i],z+depth],Math.min(w*.065,.46),Math.min(w*.065,.46),face,7);
 }
 // Common collectible pedestal, including the inset brass ring and curved plaque.
 profile(0,0,[[-9.8,0],[-9.8,54],[-8.1,60],[-3.3,60],[-1.5,57],[-1.5,0]],'base',512);
 profile(0,0,[[-1.5,0],[-1.5,55.6],[-.55,55.6],[-.55,0]],'base',512);
 profile(0,0,[[-4.3,60.02],[-4.18,60.16],[-3.95,60.16],[-3.8,60.02]],'brass',512);
 put(new T.CylinderGeometry(60.1,60.1,2.5,48,1,true,-.167,.334),[0,-6.05,0],[1,1,1],'brass');
 put(new T.CylinderGeometry(52.8,53.6,.70,8),[0,-.20,0],[1,1,.82],'pave',qEuler([0,Math.PI/8,0]));
 // Spindle bell towers: eight coiling stone ribs surround a hollow belfry.
 function apostle(x,z,top,variant,stone){
  const shoulder=top*.40,neck=top-9,R=t=>3.72*(1-.63*Math.pow(t,1.52));
  profile(x,z,[[0,4.35],[4,4.25],[shoulder*.53,4.08],[shoulder,3.72]],stone,36);
  // Long paired slits cut the transition between the lower piers and the belfry.
  for(let j=0;j<8;j++){const a=j*tau/8;
   local(x+3.94*Math.sin(a),z+3.94*Math.cos(a),a,()=>{
    arch(0,shoulder*.48,-.08,1.66,shoulder*.47,.16,'honey','shade');
    rod([0,shoulder*.48,.06],[0,shoulder*.83,.08],.13,.10,stone);
    rod([-1.45,4,.05],[-1.24,shoulder*.94,-.04],.30,.21,stone);
   });
  }
  for(let row=0;row<17;row++){
   const t=row/17,u=(row+1)/17,y=shoulder+(neck-shoulder)*t,yn=shoulder+(neck-shoulder)*u;
   const at=(a,f)=>[x+R(f)*Math.cos(a+.42*f),shoulder+(neck-shoulder)*f,z+R(f)*Math.sin(a+.42*f)];
   for(let j=0;j<8;j++){
    const a=tau*j/8;rod(at(a,t),at(a,u),R(t)*.18,R(u)*.18,stone,7);
    const p=at(a+.12,t),q=at(a+.12,u);rod(p,q,R(t)*.105,R(u)*.105,stone,7);
   }
   // Outward-sloping belfry louvres leave a dark open slot between courses.
   profile(x,z,[[y+.04,R(t)*.80],[y+.22,R(t)*1.03],[y+(yn-y)*.43,R(t)*.98],[y+(yn-y)*.44,R(t)*.77]],row%5===0?'honey':stone,32);
  }
  profile(x,z,[[neck-1,1.58],[neck,1.86],[neck+.8,1.90],[neck+1.0,1.48],[neck+2.1,1.39],[neck+2.3,1.66]],'chalk');
  // Broken-colour ceramic mitres, with four lobes and a faceted gilded collar.
  const mosaic=['white','amber','jade','ruby','blue'];
  for(let j=0;j<4;j++){
   const a=j*tau/4;orb(x+.84*Math.cos(a),neck+4.0,z+.84*Math.sin(a),.86,1.8,.86,mosaic[(variant+j)%5]);
  }
  rod([x,neck+4,z],[x,top-.9,z],1.26,.7,'amber',8);
  for(let j=0;j<8;j++){const a=j*tau/8;rod([x+Math.cos(a)*.81,top-2.6,z+Math.sin(a)*.81],[x+Math.cos(a)*1.07,top-.75,z+Math.sin(a)*1.07],.27,.32,mosaic[(j+variant)%5],5);}
  orb(x,top-.35,z,.62,.83,.62,'white');
 }
 function cross(x,y,z,k){
  rod([x,y-1.4*k,z],[x,y+1.55*k,z],.46*k,.34*k,'white',8);
  for(let i=0;i<4;i++){const a=tau*i/4;rod([x,y,z],[x+Math.cos(a)*1.18*k,y,z+Math.sin(a)*1.18*k],.31*k,.37*k,'white',8);}
 }
 function star(x,y,z){
  const phi=(1+Math.sqrt(5))/2;
  for(const a of [-1,1])for(const b of [-1,1])for(const d of [[0,a,b*phi],[a,b*phi,0],[a*phi,0,b]]){
   const vec=v(d).normalize().multiplyScalar(3.4);rod([x,y,z],[x+vec.x,y+vec.y,z+vec.z],1.1,.025,'white',5);
  }
 }
 function crown(x,y,z,type){
  const bird=type==='eagle',ox=type==='ox';
  orb(x,y+.75,z,1.12,1.6,1.08,'chalk');
  for(const s of [-1,1])for(let j=0;j<3;j++)
   rod([x+s*.58,y+1.2,z],[x+s*(1.85+.27*j),y+2.25+j*.71,z-.64],.53,.065,'white',6);
  orb(x,y+2.55,z+.63,ox?1:.75,bird?.72:.88,.83,'white');
  if(type==='lion')orb(x,y+2.43,z+.28,1.10,1.14,.9,'chalk');
  if(ox)for(const s of [-1,1])rod([x+s*.6,y+2.8,z+.6],[x+s*1.45,y+3.7,z+.55],.33,.045,'chalk');
  if(bird)rod([x,y+2.6,z+1.2],[x,y+2.25,z+1.99],.36,.03,'chalk');
  if(type==='angel')ring(x,y+3.65,z+.6,.72,.13,'brass');
 }
 // Pale lantern towers with crossed seams and recessed fields between the ribs.
 function lantern(x,z,top,r,type){
  const bottom=41,end=type==='cross'?top-18:top-10,len=end-bottom;
  const R=t=>r*(1-.78*Math.pow(t,1.26)),mat=type==='cross'?'pink':'chalk';
  profile(x,z,[[12,r*1.11],[25,r*1.11],[31,r*1.06],[34,r*1.12],[39,r*1.03],[bottom+.12,r]],'sand',24);
  const at=(a,t,offset=0)=>[x+(R(t)+offset)*Math.cos(a),bottom+t*len,z+(R(t)+offset)*Math.sin(a)];
  profile(x,z,Array.from({length:21},(_,i)=>[bottom+i*len/20,R(i/20)]),mat,48);
  const n=type==='cross'?12:8;
  for(let j=0;j<n;j++)for(let i=0;i<10;i++){
   const a=j*tau/n,t=i/10,u=(i+1)/10,mid=(t+u)/2,b=a+tau/n;
   const thick=(1-t*.72)*(type==='cross'?.42:.29);
   rod(at(a,t,.08),at(a,u,.08),thick,thick*.92,'honey',6);
   for(const aa of [a,b]){
    rod(at(aa,t,.08),at((a+b)/2,mid,.15),thick*.78,thick*.63,'chalk',5);
    rod(at((a+b)/2,mid,.15),at(aa,u,.08),thick*.63,thick*.73,'chalk',5);
   }
   if(i%2===0){const an=(a+b)/2;orb(...at(an,mid,.06),.32,(1-t)*1+.45,.33,'shade');}
  }
  const tip=R(1);
  profile(x,z,[[end-.5,tip],[end,tip*1.32],[end+1.2,tip*1.26],[end+2.2,tip*.87],[end+3,tip*.79]],'white');
  if(type==='cross'){profile(x,z,[[end+2,tip],[end+5,tip*1.27],[end+7.2,tip*.8],[end+10,tip*.63]],'chalk');cross(x,top-5,z,3.4);}
  else if(type==='star'){rod([x,end+2,z],[x,top-3.5,z],.85,.43,'chalk');star(x,top-3.4,z);}
  else{put(new T.IcosahedronGeometry(1,0),[x,end+4,z],[1.95,1.8,1.95],'white');crown(x,end+5.6,z,type);}
 }
 function windowBay(x,y,z,w,h){
  arch(x,y,z,w,h,.30,'honey','glass');
  for(const s of [-1,1])arch(x+s*w*.21,y+.22,z+.14,w*.37,h*.75,.22,'chalk','glass');
  for(const s of [-1,1])rod([x,y+h*.65,z+.43],[x+s*w*.22,y+h*.82,z+.43],.14,.10,'chalk');
 }
 function fruit(x,y,z,k){
  profile(x,z,[[y,.82],[y+1.7,.60],[y+2.2,.24]],'chalk',10);
  for(let i=0;i<6;i++){const a=i*2.4;orb(x+.45*Math.cos(a),y+2.55+.27*i,z+.45*Math.sin(a),.55,.60,.55,['amber','ruby','jade'][k%3]);}
 }
 // Nave, apse and their stepping roofs. Each clerestory bay has its own tracery.
 box(1,14,0,73,28,24,'sand');
 for(const s of [-1,1]){
  box(1,8.1,s*15,72,16.2,7,'ochre');
  local(0,s*18.53,s>0?0:Math.PI,()=>{
   for(let i=-4;i<=4;i++){const x=i*7.65;windowBay(x,2,0,5.7,12.1);
    rod([x+3.6,.6,.5],[x+3.6,19,-.12],.91,.55,'honey');
    fruit(x+3.62,18.7,-.12,i+4);}
  });
  local(0,s*12.03,s>0?0:Math.PI,()=>{
   for(let i=-4;i<=4;i++){const x=i*7.65;windowBay(x,17.3,0,5.82,9.9);fruit(x+3.58,28.1,0,i+6);}
  });
 }
 for(let i=-4;i<=4;i++){
  const x=i*7.68;
  local(x,0,Math.PI/2,()=>panel([[-12,27.8],[0,35.3],[12,27.8]],-3.85,7.7,'gray'));
  for(const s of [-1,1])rod([x,34.8,0],[x,27.8,s*11.8],.36,.40,'chalk');
  fruit(x,35.1,0,i+5);
 }
 profile(-29,0,[[0,12.6],[17,12.6],[21,11.8],[30,5.3],[36,1.3]],'sand',24);
 for(let i=0;i<7;i++){const a=(i/6-.5)*Math.PI,x=-29-12*Math.cos(a),z=12*Math.sin(a);
  profile(x,z,[[0,3.5],[11.5,3.5],[15,2.6],[21,.4]],i%2?'sand':'honey',12);fruit(x,20.7,z,i);}
 // A sculpted group uses a deep niche, separate drapery and a head in silhouette.
 function figure(x,y,z,s,angular=false){
  rod([x,y,z],[x+.08*s,y+1.4*s,z],.44*s,.26*s,angular?'gray':'sand',angular?5:9);
  orb(x+.08*s,y+1.75*s,z,.30*s,.36*s,.27*s,'chalk');
  for(const d of [-1,1])rod([x+d*.18*s,y+1.38*s,z],[x+d*.42*s,y+(.87+d*.18)*s,z+.20*s],.16*s,.10*s,'honey');
  if(!angular)for(let j=-1;j<=1;j++)rod([x+j*.27*s,y+.08*s,z+.23*s],[x+.05*s+j*.15*s,y+1.1*s,z+.24*s],.09*s,.056*s,'honey',6);
 }
 function flower(x,y,z,r){
  for(let j=0;j<5;j++){const a=j*tau/5;orb(x+Math.sin(a)*r*.51,y+Math.cos(a)*r*.51,z,r*.29,r*.48,r*.27,'honey',[0,0,-a]);}
  orb(x,y,z+.12*r,r*.27,r*.27,r*.27,'ochre');
 }
 function nativity(){
  box(0,12,-2,39,24,6,'ochre');
  for(const side of [-1,0,1]){
   const x=side*12.2,h=side?26.5:39,w=side?11.5:14.3;
   panel([[x-w*.64,0],[x-w*.63,h*.53],[x-w*.43,h*.69],[x,h],[x+w*.43,h*.69],[x+w*.63,h*.53],[x+w*.64,0]],.8,2,'ochre');
   arch(x,0,3.02,w*.82,h*.48,.75,'honey','dark');
   // The bronze doors sit back inside a deeper arch. Branchwork and leaves
   // interrupt the green patina, leaving the stone canopy clear in silhouette.
   const doorW=w*.70,doorH=h*.27;
   panel([[x-doorW/2,.24],[x+doorW/2,.24],[x+doorW/2,doorH*.69],[x+doorW*.32,doorH*.90],[x,doorH],[x-doorW*.32,doorH*.90],[x-doorW/2,doorH*.69]],3.19,.1,'leaf');
   for(let j=-3;j<=3;j++){
    const u=j/3,xx=x+u*doorW*.41,hh=doorH*(.89-.22*Math.abs(u));
    rod([xx,.28,3.34],[xx+.12,hh,3.34],.085,.055,'shade',5);
    for(let k=0;k<7;k++){const yy=1+k*(hh-1)/7,sg=(j+k)%2?1:-1;
     rod([xx,yy,3.37],[xx+sg*.48,yy+.72,3.38],.12,.055,'jade',5);
    }
   }
   rod([x,.2,3.38],[x,doorH,3.38],.10,.07,'dark');
   for(const s of [-1,1]){
    // Paired spiral colonnettes at each jamb, under figural capitals.
    const bx=x+s*w*.46;
    for(let j=0;j<3;j++)for(let k=0;k<12;k++){
     const p=t=>[bx+.35*Math.cos(j*tau/3+t*4.8),.35+t*h*.30,4.13+.35*Math.sin(j*tau/3+t*4.8)];
     rod(p(k/12),p((k+1)/12),.25,.24,'sand',7);
    }
    for(let k=0;k<4;k++){const yy=h*(.24+k*.062);flower(bx+s*.24,yy,4.35,.51);figure(bx+s*.54,yy+.40,4.13,.64);}
   }
   for(const sign of [-1,1]){
    for(let k=0;k<3;k++){
     let prev;
     for(let j=0;j<=20;j++){const t=j/20,xx=x+sign*(w*.55+k*.46)*(1-Math.pow(t,1.55)),yy=.5+(h-1-k*1.23)*t,zz=3.45+k*.38+Math.sin(t*Math.PI)*1.2;
      if(prev)rod(prev,[xx,yy,zz],.55-.19*t,.56-.22*t,k===1?'honey':'sand',7);
      if(j>3&&j%2===k%2){
       const reach=.6+.46*Math.sin(j*2+k);rod([xx,yy,zz],[xx+sign*reach,yy+1.04,zz+.38],.51,.05,'honey',6);
      }
      if(j>3&&k===1){flower(xx+sign*.34,yy,zz+.29,.49+(j%3)*.13);}
      prev=[xx,yy,zz];
     }
    }
   }
   for(let j=0;j<3;j++){
    const yy=h*(.49+j*.115),sc=1.2-j*.18;
    arch(x,yy-.1,3.05,w*(.43-j*.07),3.35-j*.4,.45,'honey','shade');
    for(let f=-1;f<=1;f++)figure(x+f*sc*.77,yy,3.63,sc*(f===0?1:.83));
   }
   // Small baldachins shade the three groups; each has a ribbed stone hood.
   for(let j=0;j<3;j++){
    const yy=h*(.49+j*.115)+2.95-j*.22,ww=w*(.24-j*.029);
    for(let k=-2;k<=2;k++){
     const u=k/2;rod([x+ww*u,yy,3.84+.56*(1-u*u)],[x,yy+1.6-j*.22,3.28],.26,.13,'honey',6);
    }
   }
  }
  for(const s of [-1,1])for(let k=0;k<4;k++){const yy=2+k*3.15;figure(s*(7.4+.32*Math.sin(k)),yy,4.15,1.3);}
  profile(0,3.6,[[38,1.45],[40.3,1.65],[42.4,1.18],[43,.5]],'honey',16);
  for(let k=0;k<15;k++){const t=k/14;rod([0,42+9*t,3.6],[0,44.3+9*t,3.6],1.85*(1-.85*t),.48*(1-t)+.08,'leaf',9);
   const a=k*2.4;orb(1.53*(1-t)*Math.cos(a),43+9*t,3.6+1.53*(1-t)*Math.sin(a),.33,.23,.37,'white');}
  cross(0,52.6,3.6,.73);
 }
 function passion(){
  box(0,12,-2.4,40,24,5.5,'sand');
  for(const x of [-12,0,12]){arch(x,0,.45,8.2,14.6,.35,'gray','dark');for(let j=-1;j<=1;j++)figure(x+j*1.50,15.25,.95,1.39,true);}
  const peak=31;
  for(let k=0;k<6;k++){const x=(k-2.5)*6.8,xt=x*.65,h=peak-Math.abs(xt)*.54;
   rod([x,.3,7.9],[xt,h,2.0],1.39,.57,'chalk',9);}
  for(const s of [-1,1]){
   rod([0,peak,2],[s*20,20.3,2],.88,.67,'chalk',8);
   rod([0,peak+6.8,2.2],[s*20,20.3,2],.63,.32,'honey',8);
   for(let j=0;j<11;j++){const x=s*(.55+j*1.73);rod([x,peak-Math.abs(x)*.54,2.35],[x*.95,peak+6.8-Math.abs(x)*.83,2.36],.27,.22,'chalk');}
  }
  rod([0,16,2],[0,24,2],.28,.25,'dark');rod([-2.2,22,2],[2.2,22,2],.24,.24,'dark');figure(0,19.3,2.32,1.34,true);
 }
 function glory(){
  box(0,10,-2,36,20,5,'sand');
  for(let i=-3;i<=3;i++){const x=i*4.8,h=14-Math.abs(i)*1.1;arch(x,0,.55,4.35,h,.5,'chalk','dark');
   rod([x-2.2,0,2.8],[x-1.7,h+4,1.6],.68,.38,'honey');fruit(x,h+7.1,1.6,i+3);}
  for(let j=0;j<5;j++)box(0,.18+j*.53,6.2-j*.54,37-j*.34,.45,4.3,'pave');
 }
 for(const [cx,cz,rotation,style] of [[-9,23,0,'nativity'],[-9,-23,Math.PI,'passion'],[36,0,Math.PI/2,'glory']]){
  local(cx,cz,rotation,()=>{
   [-15.8,-5.4,5.4,15.8].forEach((x,i)=>apostle(x,-2.1,(style==='glory'?99:style==='passion'?94:91)+(i===1||i===2?7:0),i+(style==='passion'?1:0),style==='nativity'?'ochre':'sand'));
   if(style==='nativity')nativity();else if(style==='passion')passion();else glory();
  });
 }
 // Crossing drum ties the six lanterns into the nave.
 profile(-9,0,[[20,13.7],[34,13.7],[42,12],[48,10.2]],'honey',24);
 lantern(-9,0,155,8.65,'cross');lantern(-29.4,0,123,6.42,'star');
 for(const [i,[dx,dz]] of [[-9,9],[9,9],[9,-9],[-9,-9]].entries())lantern(-9+dx,dz,119,4.78,['angel','lion','ox','eagle'][i]);
 for(const [name,data] of pieces){
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(data.pos,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(data.norm,3));geometry.setIndex(data.idx);
  const metal=name==='brass',glaze=['jade','white','ruby','amber','blue','glass'].includes(name);
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({name,color:colors[name],roughness:metal?.37:glaze?.43:.87,metalness:metal?.55:glaze?.10:0}));
  mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 }
 return group;
}

// Simplify joined positions so the sides and caps of small carvings can share an
// edge. Recover their original corner normals to keep the stonework's hard edges.
function atlasGeometry(mesh){
 const source=mesh.geometry;
 if(mesh.name==='base'||mesh.name==='brass')return source.toNonIndexed();
 const surface=source.clone();
 surface.deleteAttribute('normal');
 const joined=mergeVertices(surface,1e-5);
 const indices=Uint32Array.from(joined.index.array),positions=joined.attributes.position;
 const tolerance=.40/MeshoptSimplifier.getScale(positions.array,3);
 const [reduced]=MeshoptSimplifier.simplify(indices,positions.array,3,3*Math.floor(indices.length*.14/3),tolerance);
 const originalFaces=new Float32Array(indices.length);
 const corners=Array.from({length:positions.count},()=>[]);
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 function faceNormal(triangles,i){
  a.fromBufferAttribute(positions,triangles[i]);
  b.fromBufferAttribute(positions,triangles[i+1]).sub(a);
  c.fromBufferAttribute(positions,triangles[i+2]).sub(a);
  return b.cross(c).normalize();
 }
 for(let i=0;i<indices.length;i+=3){
  const n=faceNormal(indices,i);
  if(!n.lengthSq())continue;
  n.toArray(originalFaces,i);
  for(let k=i;k<i+3;k++)corners[indices[k]].push(k);
 }
 const points=[],normals=[],originalNormal=new T.Vector3(),incident=new T.Vector3();
 for(let i=0;i<reduced.length;i+=3){
  const n=faceNormal(reduced,i);
  if(!n.lengthSq())continue;
  for(let k=i;k<i+3;k++){
   const vertex=reduced[k];let best=-Infinity;
   originalNormal.copy(n);
   for(const corner of corners[vertex]){
    const score=incident.fromArray(originalFaces,corner-corner%3).dot(n);
    if(score<=best)continue;
    best=score;originalNormal.fromBufferAttribute(source.attributes.normal,source.index.getX(corner));
   }
   const p=a.fromBufferAttribute(positions,vertex);
   points.push(p.x,p.y,p.z);normals.push(originalNormal.x,originalNormal.y,originalNormal.z);
  }
 }
 const out=new T.BufferGeometry();
 out.setAttribute('position',new T.Float32BufferAttribute(points,3));
 out.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
 return out;
}

export async function createSagradaCollectible({palette,getParts}){
 await MeshoptSimplifier.ready;
 return {spain:{title:'Sagrada Família',build(){
  for(const mesh of buildBasilica().children){
   const key='sagrada-'+mesh.name, material=mesh.material;
   palette[key]={color:'#'+material.color.getHexString(),metal:material.metalness,rough:material.roughness};
   const geometry=atlasGeometry(mesh);
   getParts()[key]={p:Array.from(geometry.attributes.position.array),n:Array.from(geometry.attributes.normal.array)};
  }
 }}};
}
