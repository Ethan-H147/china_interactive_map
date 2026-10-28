import sharp from 'sharp';

// Original architectural interpretations, drawn from the buildings' published
// structural descriptions. No photographs or third-party meshes are embedded.
export async function createUkSpainCollectibles(api){
 const {tri,quad,plinth,box,beam,cylinder,lathe,palette,masks,getParts}=api;
 Object.assign(palette,{
  ukLimestone:{color:'#cbbb96',metal:0,rough:.71},ukAshlar:{color:'#d7c9a7',metal:0,rough:.69},ukCarving:{color:'#e6d6ae',metal:0,rough:.61},ukRecess:{color:'#25343c',metal:.08,rough:.64},ukRoof:{color:'#354b4c',metal:.55,rough:.48},ukBlue:{color:'#173f67',metal:.45,rough:.3},ukDial:{color:'#ffffff',metal:0,rough:.42},
  sfStone:{color:'#d6c3a0',metal:0,rough:.76},sfCarving:{color:'#bfa983',metal:0,rough:.78},sfLight:{color:'#e8dcc3',metal:0,rough:.67},sfInner:{color:'#847b68',metal:0,rough:.85},sfRoof:{color:'#a99d83',metal:.02,rough:.72},sfCeramic:{color:'#6c9e89',metal:.12,rough:.32},sfOchre:{color:'#c5a05d',metal:.18,rough:.4},sfCross:{color:'#e6eeea',metal:.1,rough:.28}
 });
 const numerals=['XII','I','II','III','IIII','V','VI','VII','VIII','IX','X','XI'];
 const dial=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#f1ecda"/><circle cx="512" cy="512" r="492" fill="#f4f0df" stroke="#bda05b" stroke-width="13"/><circle cx="512" cy="512" r="380" fill="none" stroke="#bda05b" stroke-width="4"/><circle cx="512" cy="512" r="315" fill="none" stroke="#bda05b" stroke-width="3"/>${Array.from({length:60},(_,i)=>`<path d="M512 30V${i%5?55:76}" transform="rotate(${i*6} 512 512)" stroke="#173f67" stroke-width="${i%5?3:7}"/>`).join('')}${numerals.map((s,i)=>{const a=i*Math.PI/6;return `<text x="${512+Math.sin(a)*421}" y="${512-Math.cos(a)*421+19}" fill="#173f67" font-size="${s.length>3?48:55}" font-family="serif" font-weight="bold" text-anchor="middle">${s}</text>`;}).join('')}<g fill="none" stroke="#d6bc79" stroke-width="4">${Array.from({length:12},(_,i)=>`<path d="M512 203Q542 248 512 285Q482 248 512 203Z" transform="rotate(${i*30} 512 512)"/>`).join('')}</g><circle cx="512" cy="512" r="45" fill="#173f67" stroke="#bd9251" stroke-width="8"/></svg>`;
 masks.set('ukDial',await sharp(Buffer.from(dial)).png().toBuffer());
 const point=(angle,x,y,z)=>[Math.cos(angle)*x+Math.sin(angle)*z,y,-Math.sin(angle)*x+Math.cos(angle)*z];
 const offset=(p,c)=>p.map((v,i)=>v+c[i]);
 function faceBeam(angle,a,b,w,depth,material){beam(point(angle,...a),point(angle,...b),w,depth,material);}
 function faceBox(angle,x,y,z,w,h,d,material){
  const p=[[x-w/2,y-h/2,z-d/2],[x+w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z-d/2],[x-w/2,y+h/2,z-d/2],[x-w/2,y-h/2,z+d/2],[x+w/2,y-h/2,z+d/2],[x+w/2,y+h/2,z+d/2],[x-w/2,y+h/2,z+d/2]].map(p=>point(angle,...p));
  for(const [a,b,c,d]of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])quad(p[a],p[b],p[c],p[d],material);
 }
 function faceTorus(angle,c,r,t,material,segments=48,sides=8){
  const at=(i,j)=>{const a=i/segments*Math.PI*2,b=j/sides*Math.PI*2;return point(angle,c[0]+(r+t*Math.cos(b))*Math.cos(a),c[1]+(r+t*Math.cos(b))*Math.sin(a),c[2]+t*Math.sin(b));};
  for(let i=0;i<segments;i++)for(let j=0;j<sides;j++)quad(at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1),material);
 }
 function pointedPath(w,h,steps=12){const p=[[-w/2,0],[-w/2,h*.58]];for(let i=1;i<=steps;i++){const t=i/steps;p.push([-w/2*(1-t*t),h*.58+h*.42*t]);}for(let i=steps-1;i>=0;i--){const t=i/steps;p.push([w/2*(1-t*t),h*.58+h*.42*t]);}p.push([w/2,0]);return p;}
 function lancet(angle,x,y,z,w,h,material='ukCarving'){
  const path=pointedPath(w,h),center=point(angle,x,y+h*.38,z-.007);
  for(let i=0;i<path.length;i++)tri(center,point(angle,x+path[i][0],y+path[i][1],z-.007),point(angle,x+path[(i+1)%path.length][0],y+path[(i+1)%path.length][1],z-.007),'ukRecess');
  for(let i=1;i<path.length;i++)faceBeam(angle,[x+path[i-1][0],y+path[i-1][1],z],[x+path[i][0],y+path[i][1],z],.009,.014,material);
  faceBeam(angle,[x,y+.012,z],[x,y+h-.016,z],.007,.014,material);
  for(const sign of [-1,1])faceBeam(angle,[x,y+h*.52,z],[x+sign*w*.27,y+h*.75,z],.006,.014,material);
  faceBox(angle,x,y-.006,z,w+.018,.014,.025,material);
 }
 function clockFace(angle){
  const cy=.945,depth=.302,r=.186,c=point(angle,0,cy,depth);
  for(let i=0;i<96;i++){
   const a=i/96*Math.PI*2,b=(i+1)/96*Math.PI*2,p=point(angle,r*Math.cos(a),cy+r*Math.sin(a),depth),q=point(angle,r*Math.cos(b),cy+r*Math.sin(b),depth),before=getParts().ukDial?.p.length||0;
   tri(c,p,q,'ukDial');const part=getParts().ukDial;if(part.p.length>before){part.uv??=[];part.uv.push(.5,.5,.5+.5*Math.cos(a),.5-.5*Math.sin(a),.5+.5*Math.cos(b),.5-.5*Math.sin(b));}
  }
  faceTorus(angle,[0,cy,depth+.002],.194,.009,'gold',64,10);faceTorus(angle,[0,cy,depth],.209,.005,'ukCarving',64,8);
  for(const [a,len,w]of [[Math.PI*2/3,.107,.011],[Math.PI*.267,.146,.007]]){
   const end=[Math.sin(a)*len,cy+Math.cos(a)*len,depth+.013],tail=[-Math.sin(a)*.023,cy-Math.cos(a)*.023,depth+.013];faceBeam(angle,tail,end,w,.008,'ukBlue');
   const tangent=[Math.cos(a)*w*.8,-Math.sin(a)*w*.8],tip=[Math.sin(a)*(len+.012),cy+Math.cos(a)*(len+.012),depth+.014];
   tri(point(angle,end[0]+tangent[0],end[1]+tangent[1],end[2]),point(angle,...tip),point(angle,end[0]-tangent[0],end[1]-tangent[1],end[2]),'ukBlue');
  }
  faceTorus(angle,[0,cy,depth+.018],.012,.005,'gold',20,6);
  for(const x of [-.226,.226])for(const yy of [cy-.217,cy+.217])for(const [dx,dy]of [[-.008,0],[.008,0],[0,-.008],[0,.008]])faceTorus(angle,[x+dx,yy+dy,.304],.009,.0027,'gold',12,6);
  for(const x of [-.255,.255]){faceBox(angle,x,cy,.294,.023,.51,.027,'ukCarving');for(let i=0;i<7;i++)faceBox(angle,x,cy-.22+i*.072,.314,.034,.011,.018,'ukCarving');}
 }
 function pyramid(cx,y,cz,w,d,height,material){const p=[[cx-w/2,y,cz-d/2],[cx+w/2,y,cz-d/2],[cx+w/2,y,cz+d/2],[cx-w/2,y,cz+d/2]],top=[cx,y+height,cz];for(let i=0;i<4;i++)tri(p[i],p[(i+1)%4],top,material);quad(...p.slice().reverse(),material);}
 function ukPinnacle(x,z){
  box(x,1.31,z,.045,.25,.045,'ukCarving');box(x,1.44,z,.064,.032,.064,'ukCarving');lathe([[0,1.455],[.032,1.455],[.028,1.50],[.018,1.54],[.012,1.61],[0,1.67]],'ukCarving',12,p=>[p[0]+x,p[1],p[2]+z]);
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2;beam([x+Math.sin(a)*.024,1.54,z+Math.cos(a)*.024],[x+Math.sin(a)*.04,1.56,z+Math.cos(a)*.04],.009,.009,'gold');}
 }
 function elizabethTower(){
  plinth(.83);box(0,-.9425,0,.64,.10,.64,'ukLimestone');box(0,-.86,0,.55,.065,.55,'ukCarving');box(0,-.0675,0,.48,1.52,.48,'ukLimestone');
  for(let side=0;side<4;side++){const a=side*Math.PI/2;
   for(let row=0;row<33;row++)for(let col=0;col<4;col++){const width=.118,x=-.18+col*.12+(row%2?.06:0);if(x>.235)continue;const left=Math.max(-.24,x-width/2),right=Math.min(.24,x+width/2);faceBox(a,(left+right)/2,-.805+row*.044,.241,right-left-.0025,.041,.004,row%5===0?'ukLimestone':'ukAshlar');}
   for(const y of [-.72,-.23,.26])for(const x of [-.078,.078])lancet(a,x,y,.254,.060,.31);
   for(const y of [-.81,-.32,.17,.64])faceBox(a,0,y,.252,.516,.025,.027,'ukCarving');
   for(const x of [-.224,.224]){faceBox(a,x,-.07,.254,.031,1.54,.034,'ukCarving');for(const y of [-.66,-.17,.32])faceBox(a,x,y,.268,.044,.025,.035,'ukCarving');}
  }
  box(0,.676,0,.58,.055,.58,'ukCarving');box(0,.94,0,.57,.48,.57,'ukLimestone');box(0,1.205,0,.62,.047,.62,'ukCarving');
  for(let side=0;side<4;side++){const a=side*Math.PI/2;clockFace(a);for(let i=0;i<11;i++)faceBox(a,-.26+i*.052,1.238,.301,.021,.031,.025,'gold');}
  box(0,1.273,0,.56,.045,.56,'ukCarving');
  // Open bell chamber, with paired Gothic arcades and actual internal bell.
  for(const x of [-.205,.205])for(const z of [-.205,.205])box(x,1.455,z,.055,.32,.055,'ukCarving');
  for(let side=0;side<4;side++){const a=side*Math.PI/2;faceBox(a,0,1.47,.224,.027,.29,.028,'ukCarving');for(const x of [-.115,.115]){const path=pointedPath(.17,.20);for(let i=1;i<path.length;i++)faceBeam(a,[x+path[i-1][0],1.36+path[i-1][1],.224],[x+path[i][0],1.36+path[i][1],.224],.017,.031,'ukCarving');for(let j=0;j<5;j++)faceBox(a,x,1.372+j*.032,.229,.14,.009,.026,'ukRoof');}}
  lathe([[0,1.34],[.06,1.34],[.069,1.36],[.055,1.37],[.038,1.44],[.028,1.47],[0,1.47]],'gold',32);beam([0,1.47,0],[0,1.60,0],.016,.016,'black');
  box(0,1.615,0,.575,.048,.575,'ukCarving');pyramid(0,1.642,0,.53,.53,.465,'ukRoof');
  for(const sx of [-1,1])for(const sz of [-1,1]){beam([sx*.263,1.645,sz*.263],[0,2.108,0],.016,.016,'gold');ukPinnacle(sx*.286,sz*.286);}
  for(const y of [1.73,1.84,1.95]){const w=.53*(1-(y-1.642)/.465);for(let side=0;side<4;side++)faceBox(side*Math.PI/2,0,y,w/2,w,.009,.012,'ukRoof');}
  box(0,2.11,0,.058,.053,.058,'gold');lathe([[0,2.13],[.027,2.13],[.022,2.18],[.008,2.22],[0,2.25]],'gold',16);
 }
 // Thin masonry shells with true apertures, including the interior reveals.
 function piercedTower(cx,cz,y0,top,radius,material='sfStone',segments=24,rows=26){
  const thickness=Math.max(.012,radius*.16),height=top-y0;
  const radiusAt=t=>radius*(1-.43*t-.12*t*t)+radius*.045*Math.sin(t*Math.PI*8),at=(j,i,inner=false)=>{const t=j/rows,a=i/segments*Math.PI*2,r=Math.max(.012,radiusAt(t)-(inner?thickness:0));return[cx+r*Math.cos(a),y0+t*height,cz+r*Math.sin(a)];};
  const filled=(j,i)=>j<0||j>=rows?false:!(j>=Math.floor(rows*.28)&&j<rows-3&&j%5!==0&&((i%6+6)%6>=1&&(i%6+6)%6<=3));
  for(let j=0;j<rows;j++)for(let i=0;i<segments;i++)if(filled(j,i)){
   quad(at(j,i),at(j,i+1),at(j+1,i+1),at(j+1,i),j%5===0?'sfCarving':material);quad(at(j,i,true),at(j+1,i,true),at(j+1,i+1,true),at(j,i+1,true),'sfInner');
   if(!filled(j,i-1))quad(at(j,i,true),at(j,i),at(j+1,i),at(j+1,i,true),material);
   if(!filled(j,i+1))quad(at(j,i+1),at(j,i+1,true),at(j+1,i+1,true),at(j+1,i+1),material);
   if(!filled(j-1,i))quad(at(j,i,true),at(j,i+1,true),at(j,i+1),at(j,i),material);
   if(!filled(j+1,i))quad(at(j+1,i),at(j+1,i+1),at(j+1,i+1,true),at(j+1,i,true),material);
  }
  cylinder(cx,y0+.025,cz,radius*1.15,.05,material);cylinder(cx,top+.006,cz,radiusAt(1)+.012,.026,'sfLight');
 }
 function berry(x,y,z,r,material){lathe([[0,-r],[r*.7,-r*.65],[r,0],[r*.7,r*.65],[0,r]],material,16,p=>[p[0]+x,p[1]+y,p[2]+z]);}
 function apostle(cx,cz,h,mat='sfStone'){
  piercedTower(cx,cz,-.86,h,.105,mat,24,28);
  lathe([[.057,h+.019],[.064,h+.045],[.058,h+.075],[.039,h+.11],[.025,h+.135],[0,h+.16]],'sfLight',24,p=>[p[0]+cx,p[1],p[2]+cz]);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;berry(cx+.035*Math.cos(a),h+.105,cz+.035*Math.sin(a),.016,i%2?'sfOchre':'sfCeramic');}
  beam([cx,h+.15,cz],[cx,h+.205,cz],.011,.011,'sfOchre');beam([cx-.022,h+.185,cz],[cx+.022,h+.185,cz],.009,.009,'sfOchre');
 }
 function openArch(a,b,height,w=.025,depth=.05,mat='sfStone'){
  const mid=a.map((v,i)=>(v+b[i])/2),length=Math.hypot(b[0]-a[0],b[2]-a[2]),u=[(b[0]-a[0])/length,0,(b[2]-a[2])/length],path=pointedPath(length,height,10);
  const at=p=>[mid[0]+p[0]*u[0],a[1]+p[1],mid[2]+p[0]*u[2]];for(let i=1;i<path.length;i++)beam(at(path[i-1]),at(path[i]),w,depth,mat);
 }
 function gableRoof(x,z,w,d,y,rise,mat='sfRoof'){
  quad([x-w/2,y,z-d/2],[x,y+rise,z-d/2],[x,y+rise,z+d/2],[x-w/2,y,z+d/2],mat);quad([x,y+rise,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x,y+rise,z+d/2],mat);
  tri([x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x,y+rise,z-d/2],'sfStone');tri([x+w/2,y,z+d/2],[x-w/2,y,z+d/2],[x,y+rise,z+d/2],'sfStone');
  beam([x,y+rise+.005,z-d/2],[x,y+rise+.005,z+d/2],.018,.018,'sfLight');
 }
 function star(x,y,z,r){const phi=(1+Math.sqrt(5))/2,v=[];for(const a of [-1,1])for(const b of [-1,1]){v.push([0,a,b*phi],[a,b*phi,0],[b*phi,0,a]);}for(const p of v){const n=Math.hypot(...p);beam([x,y,z],[x+p[0]/n*r,y+p[1]/n*r,z+p[2]/n*r],.018,.018,'sfCross');}berry(x,y,z,r*.28,'sfCross');}
 function sagradaFamilia(){
  plinth(1.47);box(0,-.955,0,2.16,.075,2.12,'sfCarving');box(0,-.901,0,2.03,.04,1.98,'sfStone');
  // Latin-cross nave and crossing, with exterior galleries and visible supports.
  box(0,-.722,-.02,.61,.31,1.52,'sfCarving');box(0,-.704,-.11,1.45,.35,.43,'sfStone');box(0,-.84,.83,1.24,.10,.22,'sfStone');
  gableRoof(0,-.02,.72,1.55,-.438,.20);gableRoof(0,-.13,1.48,.45,-.423,.24);
  for(const side of [-1,1])for(let j=0;j<8;j++){
   const z=-.70+j*.19,x=side*.405;box(x,-.65,z,.035,.43,.035,'sfStone');
   if(j<7)openArch([x,-.68,z],[x,-.68,z+.19],.26,.024,.055);
   beam([x,-.75,z],[side*.28,-.36,z],.025,.025,'sfCarving');
   for(const dz of [-.025,.025])beam([x,-.52,z],[side*.33,-.39,z+dz],.013,.014,'sfLight');
   box(side*.45,-.80,z,.08,.14,.065,'sfCarving');
   cylinder(side*.40,-.26,z,.024,.22,'sfStone');for(let k=0;k<3;k++)berry(side*.40+(k-1)*.021,-.115+(k===1?.016:0),z,.019,k%2?'sfCeramic':'sfOchre');
  }
  // Apse: seven shallow chapels with stone lancets and conical gables.
  for(let i=0;i<7;i++){
   const a=i/6*Math.PI,x=.40*Math.cos(a),z=-.65-.31*Math.sin(a);cylinder(x,-.70,z,.118,.31,'sfStone');
   lathe([[.126,-.54],[.11,-.52],[.04,-.29],[0,-.255]],'sfRoof',24,p=>[p[0]+x,p[1],p[2]+z]);
   beam([x,-.26,z],[x,-.18,z],.013,.013,'sfLight');
   for(const da of [-.3,0,.3]){const n=a+Math.PI+da,xx=x+.115*Math.cos(n),zz=z+.115*Math.sin(n);beam([xx,-.79,zz],[xx,-.62,zz],.008,.008,'sfCarving');}
  }
  // Three distinct four-tower facades; the completed eighteen-tower hierarchy.
  for(let i=0;i<4;i++){const x=-.49+i*.327;apostle(x,.82,1.02+(i===1||i===2?.15:0));}
  for(let side=0;side<2;side++)for(let i=0;i<4;i++)apostle(side?-.75:.75,-.56+i*.31,1.10+(i===1||i===2?.15:0)+(side?.04:0),side?'sfLight':'sfCarving');
  // Glory entrance: open pointed portals, dense tracery and relief buttresses.
  for(let i=0;i<3;i++){
   const x=-.33+i*.33;openArch([x-.12,-.84,.875],[x+.12,-.84,.875],.49,.033,.07,'sfLight');
   openArch([x-.09,-.82,.914],[x+.09,-.82,.914],.38,.012,.02,'sfCarving');
   for(let j=0;j<5;j++){const xx=x-.10+j*.05;beam([xx,-.34,.89],[x,-.16,.87],.011,.014,'sfCarving');}
   for(const dx of [-.14,.14])box(x+dx,-.58,.89,.042,.49,.06,'sfCarving');
  }
  for(const side of [-1,1]){
   const x=side*.78;
   for(let i=0;i<3;i++){
    const z=-.405+i*.31;openArch([x,-.84,z-.12],[x,-.84,z+.12],.48,.03,.06,side<0?'sfLight':'sfCarving');
    // Passion's raked supports contrast with Nativity's branching masonry.
    if(side<0){beam([x-.15,-.87,z],[x,-.41,z-.05],.042,.047,'sfLight');beam([x-.15,-.87,z+.10],[x,-.41,z+.05],.035,.04,'sfLight');}
    else{beam([x+.05,-.86,z],[x,-.45,z],.037,.04,'sfCarving');for(const dz of [-.10,.10])beam([x,-.57,z],[x,-.28,z+dz],.022,.025,'sfCarving');}
   }
  }
  // Carved rose windows have open radial tracery rather than opaque pictures.
  for(const side of [-1,1]){
   const x=side*.795,cy=-.23,z=-.10,r=.105;
   for(let i=0;i<24;i++){const a=i/24*Math.PI*2,b=(i+1)/24*Math.PI*2;beam([x,cy+r*Math.cos(a),z+r*Math.sin(a)],[x,cy+r*Math.cos(b),z+r*Math.sin(b)],.012,.012,'sfLight');if(i%2===0)beam([x,cy,z],[x,cy+r*.91*Math.cos(a),z+r*.91*Math.sin(a)],.007,.007,'sfLight');}
  }
  box(0,-.30,-.12,.62,.12,.67,'sfLight');
  for(const x of [-.255,.255])for(const z of [-.40,.13]){piercedTower(x,z,-.245,1.36,.115,'sfLight',24,24);lathe([[.075,1.38],[.083,1.41],[.04,1.47],[0,1.51]],'sfOchre',24,p=>[p[0]+x,p[1],p[2]+z]);star(x,1.535,z,.035);}
  piercedTower(0,-.68,-.37,1.50,.15,'sfLight',28,28);lathe([[.077,1.52],[.045,1.61],[.025,1.65],[0,1.65]],'sfCross',24,p=>[p[0],p[1],p[2]-.68]);star(0,1.72,-.68,.11);
  piercedTower(0,-.10,-.24,1.85,.21,'sfLight',36,32);
  lathe([[.09,1.87],[.065,1.91],[.048,1.96],[0,1.96]],'sfCross',24,p=>[p[0],p[1],p[2]-.10]);
  beam([0,1.91,-.10],[0,2.24,-.10],.061,.061,'sfCross');beam([-.15,2.13,-.10],[.15,2.13,-.10],.060,.060,'sfCross');beam([0,2.13,-.25],[0,2.13,.05],.060,.060,'sfCross');
 }
 return {'united-kingdom':{title:'Elizabeth Tower',build:elizabethTower},spain:{title:'Sagrada Família',build:sagradaFamilia}};
}
