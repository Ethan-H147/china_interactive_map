import sharp from 'sharp';

// Original architectural interpretation, drawn from the building's published
// structural description. No photographs or third-party meshes are embedded.
export async function createUkSpainCollectibles(api){
 const {tri,quad,plinth,box,beam,cylinder,lathe,palette,masks,getParts}=api;
 Object.assign(palette,{
  ukLimestone:{color:'#cbbb96',metal:0,rough:.71},ukAshlar:{color:'#d7c9a7',metal:0,rough:.69},ukCarving:{color:'#e6d6ae',metal:0,rough:.61},ukRecess:{color:'#25343c',metal:.08,rough:.64},ukRoof:{color:'#354b4c',metal:.55,rough:.48},ukBlue:{color:'#173f67',metal:.45,rough:.3},ukDial:{color:'#ffffff',metal:0,rough:.42}
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
 return {'united-kingdom':{title:'Elizabeth Tower',build:elizabethTower}};
}
