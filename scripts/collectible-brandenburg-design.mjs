import * as T from 'three';
import {MeshoptSimplifier} from 'meshoptimizer';
await MeshoptSimplifier.ready;
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// A collectible-scale architectural interpretation, in a local Y-up frame.
export function buildGate(){
 const group=new T.Group(), parts=new Map(), mats={};
 const tau=Math.PI*2, V=p=>new T.Vector3(...p);
 function material(name,color,roughness=.88,metalness=0){
  mats[name]=new T.MeshStandardMaterial({name,color,roughness,metalness});
  parts.set(name,[]);
 }
 material('Limestone','#ccab80');material('Sunlit stone','#dfc199');material('Cut stone','#bb9870');material('Recess','#a38465');
 material('Copper roof','#66665a',.82,.15);material('Patinated bronze','#497568',.62,.46);
 material('Bronze highlights','#678a77',.58,.40);material('Dark bronze','#33544d',.65,.35);material('Paving','#c5b394');
 const stone='Limestone',light='Sunlit stone',dark='Cut stone',copper='Copper roof',bronze='Patinated bronze',patina='Bronze highlights',deep='Dark bronze';
 function put(g,p,mat,rotation=null,scale=null){
  const mesh=new T.Mesh(g);mesh.position.copy(V(p));if(rotation)mesh.rotation.set(...rotation);if(scale)mesh.scale.copy(V(scale));mesh.updateMatrix();
  g.applyMatrix4(mesh.matrix);g.deleteAttribute('uv');parts.get(mat).push(g.index?g.toNonIndexed():g);
 }
 function box(x,y,z,w,h,d,m=stone){put(new T.BoxGeometry(w,h,d),[x,y,z],m);}
 function orb(p,s,m=bronze,tilt=0){put(new T.SphereGeometry(1,16,12),p,m,[tilt,0,0],s);}
 function rod(a,b,r1,r2=r1,m=bronze,n=10){
  const start=V(a),end=V(b),axis=end.clone().sub(start),g=new T.CylinderGeometry(r2,r1,axis.length(),n);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),axis.normalize()));put(g,start.lerp(end,.5).toArray(),m);
 }
 function tube(points,r,m=bronze){const curve=new T.CatmullRomCurve3(points.map(V));put(new T.TubeGeometry(curve,Math.max(12,points.length*4),r,6,false),[0,0,0],m);}
 function revolved(x,z,rings,m,flutes=0){
  const steps=flutes?flutes*6:48,vs=[],ix=[];
  for(const [y,r,depth=0] of rings)for(let j=0;j<steps;j++){const t=j*tau/steps,rad=r-depth*Math.pow(Math.abs(Math.sin(flutes*t/2)),.8);vs.push(x+rad*Math.cos(t),y,z+rad*Math.sin(t));}
  for(let i=1;i<rings.length;i++)for(let j=0;j<steps;j++){const a=(i-1)*steps+j,b=(i-1)*steps+(j+1)%steps;ix.push(a,a+steps,b,b,a+steps,b+steps);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vs,3));g.setIndex(ix);g.computeVertexNormals();put(g,[0,0,0],m);
 }
 function column(x,z,h,r,y=0){
  box(x,y+.12,z,2.28*r,.24,2.28*r,dark);
  revolved(x,z,[[y+.23,r*1.04],[y+.32,r*1.04],[y+.42,r],[y+h*.22,r*.98,r*.068],[y+h*.50,r*.94,r*.067],[y+h*.91,r*.82,r*.054],[y+h*.925,r*.82]],stone,20);
  for(let j=0;j<3;j++)revolved(x,z,[[y+h*(.919+j*.009),r*.855],[y+h*(.924+j*.009),r*.855]],light);
  revolved(x,z,[[y+h*.945,r*.84],[y+h*.955,r*.93],[y+h*.966,r*1.035],[y+h*.976,r*1.08]],light);
  box(x,y+h*.988,z,2.24*r,h*.024,2.24*r,light);
 }
 function roof(x,y,z,w,d,rise){
  const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(0,rise);shape.closePath();
  const recess=.34;
  put(new T.ExtrudeGeometry(shape,{depth:d-2*recess,bevelEnabled:false}),[x,y,z-d/2+recess],copper);
  // Project the stone moulding past the tympanum so the recess casts a real shadow.
  for(const side of [-1,1]){
   const face=z+side*(d/2-recess),lip=z+side*(d/2-recess/2);
   put(new T.ExtrudeGeometry(shape,{depth:.04,bevelEnabled:false}),[x,y,face+(side<0?-.04:0)],dark);
   box(x,y+.075,lip,w,.15,recess,light);
   for(const sign of [-1,1]){
    put(new T.BoxGeometry(Math.hypot(w/2,rise),.18,recess+.08),
     [x+sign*w/4,y+rise/2+.03,lip],light,[0,0,-sign*Math.atan2(rise,w/2)]);
    for(let i=0;i<5;i++){
     const px=x+sign*(.43+i*.64),py=y+.44-i*.035;
     put(new T.SphereGeometry(1,16,10),[px,py,face+side*.06],stone,[0,0,sign*.30],[.36,.10,.09]);
    }
   }
   put(new T.TorusGeometry(.25,.072,8,32),[x,y+.55,face+side*.09],light);
  }
 }
 const xs=[-12.6,-7.75,-2.9,2.9,7.75,12.6];
 const radius=33, unit=radius/1.48, height=y=>-.62+(y+.9925)*unit;
 material('Pedestal stone','#263c3a',.5,.15);
 material('Pedestal brass','#bd9251',.25,.86);
 function tier(bottom,top,lower,upper){
  put(new T.CylinderGeometry(upper*radius,lower*radius,height(top)-height(bottom),512),
   [0,(height(bottom)+height(top))/2,0],'Pedestal stone');
 }
 tier(-1.25,-1.2,.88,1);tier(-1.2,-1.07,1,1);tier(-1.07,-1.02,1,.94);
 tier(-1.02,-.9925,.91,.91);
 put(new T.TorusGeometry(radius*.97,.018*unit,12,512),[0,height(-1.08),0],'Pedestal brass',[Math.PI/2,0,0]);
 const halfAngle=.26/1.48;
 put(new T.CylinderGeometry(radius+.008*unit,radius+.008*unit,.09*unit,48,1,true,-halfAngle,2*halfAngle),
  [0,height(-1.15),0],'Pedestal brass');
 box(0,-.39,0,57,.46,16.4,'Paving');box(0,-.10,0,56.5,.15,15.85,light);
 for(const x of xs){
  for(const z of [-5,5])column(x,z,12.1,1.01);
  // Screen walls separating the five deep carriage passages.
  box(x,5.86,0,1.08,11.72,9.9,dark);
  for(const z of [-2.8,0,2.8])for(const s of [-1,1]){
   box(x+s*.55,5.65,z,.10,9.5,2.42,stone);
   box(x+s*.62,7.7,z,.045,1.65,1.94,light);
  }
 }
 for(const [y,w,h,d,m] of [[12.29,28.2,.38,12.5,light],[12.82,28.05,.68,12.35,stone],[13.27,28.36,.19,12.56,light],[14.03,28.0,1.34,12.29,dark],[14.78,28.45,.16,12.68,light],[15.00,29,.27,13.04,stone],[15.29,29.6,.32,13.42,light],[15.52,29.4,.13,13.30,stone]])box(0,y,0,w,h,d,m);
 for(const s of [-1,1]){
  for(let j=-11;j<=11;j++){
   const x=j*1.19;box(x,14.02,s*6.17,.47,1.10,.14,stone);
   for(const dx of [-.145,0,.145])box(x+dx,14.04,s*6.27,.068,1.04,.09,light);
   if(j<11){const cx=x+.59;orb([cx,14.25,s*6.18],[.115,.13,.095],light);rod([cx-.12,13.72,s*6.19],[cx+.06,14.15,s*6.20],.13,.085,stone);}
  }
  for(let j=-32;j<=32;j++)box(j*.442,14.76,s*6.34,.23,.22,.33,light);
 }
 // Attic and a continuous, shallow sculptural procession on the parapet.
 box(0,15.95,0,27.8,.77,11.95,stone);box(0,16.44,0,28.15,.20,12.18,light);
 box(0,17.31,0,15.2,1.62,8.95,stone);box(0,18.23,0,15.65,.25,9.35,light);
 for(const s of [-1,1]){
  box(0,17.32,s*4.51,14.34,1.29,.13,'Recess');
  for(let i=0;i<19;i++){
   const x=(i-9)*.735,k=Math.sin(i*2.31),z=s*4.64;
   orb([x+.08*k,17.70,z],[.12,.15,.09],light);rod([x-.055*k,17.08,z],[x+.06*k,17.55,z],.155,.124,stone);
   for(const side of [-1,1]){rod([x,17.46,z],[x+side*.29,17.4+side*.14*k,z],.082,.048,light);rod([x,17.14,z],[x+side*.22,16.82,z],.098,.065,stone);}
  }
 }
 // Two lower guardhouses with recessed masonry and a projecting portico.
 for(const side of [-1,1]){
  const x=side*20.5;
  box(x,3.72,-1.6,11.9,7.44,7.6,stone);
  for(let i=-2;i<=2;i++)for(const z of [2.24,-5.45]){
   box(x+i*2.18,3.65,z,1.39,4.16,.10,'Recess');box(x+i*2.18,5.83,z,1.60,.18,.26,light);
  }
  for(const z of [-6.1,4.40])for(let i=0;i<6;i++)column(x+(i-2.5)*2.25,z,7.20,.56);
  for(const [h,w,ht,dep,mat] of [[7.38,13.3,.38,12.2,light],[7.83,13.46,.50,12.4,stone],[8.18,13.86,.2,12.8,light]])box(x,h,-.75,w,ht,dep,mat);
  roof(x,8.28,-.75,13.6,12.45,1.28);
 }
 // Four horses, built from cross sections with jointed limbs and separate tack.
 function loft(sections,m){
  const v=[],ix=[],n=20;
  for(const [x,y,z,rx,ry] of sections)for(let j=0;j<n;j++){const a=j*tau/n;v.push(x+rx*Math.cos(a),y+ry*Math.sin(a),z);}
  for(let i=1;i<sections.length;i++)for(let j=0;j<n;j++){let a=(i-1)*n+j,b=(i-1)*n+(j+1)%n;ix.push(a,b,a+n,b,b+n,a+n);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();put(g,[0,0,0],m);
 }
 box(0,18.54,0,9.8,.34,5.1,dark);box(0,18.79,0,9.48,.16,4.96,light);
 function horse(x,k){
  const y=18.91,stagger=[-.16,.19,.03,-.10][k],p=(a,b,c)=>[x+a,y+b,c+stagger],phase=[.31,-.24,.17,-.36][k];
  loft([[-1.18,2.16,.12,.19],[-.91,2.17,.43,.55],[-.54,2.13,.50,.61],[.1,2.13,.47,.52],[.56,2.20,.49,.64],[.83,2.35,.37,.48],[.93,2.43,.21,.26]].map(([z,h,rx,ry])=>[...p(0,h,z),rx,ry]),bronze);
  orb(p(0,2.86,.72),[.33,.84,.45],bronze,.32);
  orb(p(0,3.62,1.03),[.30,.42,.36],bronze,-.30);
  orb(p(0,3.48,1.37),[.235,.245,.49],bronze,.23);
  orb(p(0,3.36,1.74),[.215,.18,.18],deep);
  for(const s of [-1,1]){
   rod(p(.16*s,3.88,.95),p(.23*s,4.22,.91+.03*s),.12,.018,bronze);
   orb(p(.27*s,3.72,1.17),[.045,.055,.06],deep);
   for(const front of [true,false]){
    const z=front?.56:-.77,step=phase*s*(front?1:-1),lift=front&&s===(k%2?1:-1)?.22:0;
    const joints=[p(.29*s,2.06,z),p(.33*s,1.37,z+(front?.05:.30)),p(.34*s,.85+lift,z+(front?.12:-.17)+step),p(.34*s,.20+lift,z+step*1.8),p(.34*s,.11+lift,z+step*1.8+.10)];
    const radii=[.235,.155,.10,.075,.125];for(let j=1;j<joints.length;j++)rod(joints[j-1],joints[j],radii[j-1],radii[j],bronze);
    orb(joints.at(-1),[.125,.115,.18],deep);
   }
   tube([p(.2*s,3.40,1.60),p(.34*s,3.57,1.27),p(.27*s,3.83,.97)],.033,patina);
   tube([p(.22*s,3.4,1.58),p(.52*s,2.58,.1),[s*.52,21.05,-1.8]],.025,deep);
  }
  tube([p(0,3.93,.86),p(0,3.62,.59),p(0,3.20,.40),p(0,2.81,.20)],.13,deep);
  tube([p(0,2.48,-.97),p(.09,2.31,-1.29),p(.14,1.77,-1.47),p(.15,1.20,-1.65)],.14,deep);
 }
 [-2.82,-.94,.94,2.82].forEach(horse);
 // Chariot, open spoked wheels and Victoria holding the eagle standard.
 for(const x of [-1.16,1.16]){
  put(new T.TorusGeometry(.86,.075,10,48),[x,19.86,-2.25],bronze,[0,Math.PI/2,0]);
  for(let i=0;i<12;i++)rod([x,19.86,-2.25],[x,19.86+.82*Math.cos(i*tau/12),-2.25+.82*Math.sin(i*tau/12)],.045,.032,patina);
 }
 box(0,19.83,-2.20,2.24,.16,1.89,bronze);orb([0,20.19,-1.55],[1.06,.64,.29],patina);
 revolved(0,-2.34,[[19.9,.61],[20.45,.52],[21.13,.36],[21.55,.33],[21.83,.39],[22.14,.30]],patina);
 orb([0,22.54,-2.31],[.265,.33,.25],bronze);orb([0,22.73,-2.40],[.29,.22,.24],deep);
 for(const s of [-1,1]){
  const hand=[s*.72,21.9+(s>0?.42:0),-1.84];rod([s*.31,22.09,-2.3],[s*.59,21.78,-2.12],.135,.10,patina);rod([s*.59,21.78,-2.12],hand,.115,.075,bronze);
  for(let j=0;j<7;j++){let end=[s*(.65+j*.13),22.6+j*.10,-2.8-j*.065];rod([s*.20,21.86,-2.48],end,.145,.025,patina);}
 }
 rod([.74,20.02,-1.83],[.74,24.22,-1.83],.065,.052,bronze);
 put(new T.TorusGeometry(.49,.082,10,48),[.74,23.67,-1.83],patina);
 rod([.74,23.35,-1.82],[.74,24.05,-1.82],.067,.07,bronze);rod([.49,23.80,-1.82],[.99,23.80,-1.82],.061,.061,bronze);
 orb([.74,24.36,-1.82],[.16,.24,.14],bronze);orb([.75,24.57,-1.78],[.12,.12,.14],patina);
 for(const s of [-1,1])for(let j=0;j<5;j++)rod([.74+s*.07,24.40,-1.82],[.74+s*(.48+j*.08),24.48+j*.058,-1.85],.095,.018,bronze);
 for(const [name,geos] of parts){const mesh=new T.Mesh(mergeGeometries(geos),mats[name]);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
 return group;
}

export function buildAtlasGate(){
 const group=buildGate();
 for(const mesh of group.children){
  if(mesh.name.startsWith('Pedestal'))continue;
  const geometry=mergeVertices(mesh.geometry,1e-5);
  const positions=geometry.attributes.position.array, normals=geometry.attributes.normal.array;
  const indices=Uint32Array.from(geometry.index.array);
  // Cap the positional error in model units so small relief and horses survive reduction.
  const error=.065/MeshoptSimplifier.getScale(positions,3);
  const target=3*Math.floor(indices.length*.23/3);
  const [reduced]=MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,normals,3,[.004,.004,.004],null,target,error);
  geometry.setIndex(Array.from(reduced));
  mesh.geometry=geometry.toNonIndexed();
 }
 return group;
}
