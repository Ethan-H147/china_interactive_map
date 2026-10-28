// Original sculptural studies for the atlas collection. No third-party mesh or
// photographic texture is embedded. Front is +Z and the pedestal top is -0.9925.
export async function createSouthAmericanCollectibles(api){
 const {tri,quad,plinth,box,beam,cylinder,lathe,palette,getParts}=api;
 Object.assign(palette,{
  moaiTuff:{color:'#99846c',metal:0,rough:.91},moaiLight:{color:'#a28d76',metal:0,rough:.91},moaiCut:{color:'#786956',metal:0,rough:.94},
  ahuBasalt:{color:'#655f55',metal:0,rough:.95},ahuJoint:{color:'#524e47',metal:0,rough:.97},
  cristoStone:{color:'#b5c1b8',metal:.015,rough:.76},cristoShade:{color:'#94a79c',metal:.01,rough:.8},cristoHair:{color:'#9eafa3',metal:.01,rough:.83},
  cristoPedestal:{color:'#677b72',metal:.015,rough:.8},cristoInset:{color:'#425a4f',metal:.02,rough:.85}
 });
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],normal=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
 function refined(stations,steps=5){const result=[];for(let j=0;j<stations.length-1;j++)for(let k=0;k<steps;k++){
  const a=stations[Math.max(0,j-1)],b=stations[j],c=stations[j+1],d=stations[Math.min(stations.length-1,j+2)],t=k/steps,t2=t*t,t3=t2*t;
  result.push(b.map((v,i)=>i===0?v+(c[i]-v)*t:.5*(2*v+(-a[i]+c[i])*t+(2*a[i]-5*v+4*c[i]-d[i])*t2+(-a[i]+3*v-3*c[i]+d[i])*t3)));
 }result.push(stations.at(-1));return result;}
 function smoothTri(a,b,c,na,nb,nc,mat){const before=getParts()[mat]?.p.length||0;tri(a,b,c,mat);const part=getParts()[mat];if(part&&part.p.length>before)part.n.splice(part.n.length-9,9,...na,...nb,...nc);}
 // Stations: [height, half width, front depth, back depth, center Z].
 function loft(stations,mat,{segments=40,smooth=true,shape=p=>p,centerX=0}={}){
  const at=(j,i)=>{const s=stations[Math.max(0,Math.min(stations.length-1,j))],a=i/segments*Math.PI*2,co=Math.cos(a);return shape([centerX+s[1]*Math.sin(a),s[0],(s[4]||0)+(co>=0?s[2]:s[3])*co],a,j);};
  const ns=(j,i)=>normal(cross(sub(at(j,i+1),at(j,i-1)),sub(at(Math.min(stations.length-1,j+1),i),at(Math.max(0,j-1),i))));
  for(let j=0;j<stations.length-1;j++)for(let i=0;i<segments;i++){
   const a=at(j,i),b=at(j,i+1),c=at(j+1,i+1),d=at(j+1,i),m=typeof mat==='function'?mat(j,i):mat;
   if(smooth){smoothTri(a,b,c,ns(j,i),ns(j,i+1),ns(j+1,i+1),m);smoothTri(a,c,d,ns(j,i),ns(j+1,i+1),ns(j+1,i),m);}else quad(a,b,c,d,m);
  }
  for(const j of [0,stations.length-1]){const mid=[0,0,0];for(let i=0;i<segments;i++){const p=at(j,i);for(let k=0;k<3;k++)mid[k]+=p[k]/segments;}const m=typeof mat==='function'?mat(j,0):mat;for(let i=0;i<segments;i++)if(j===0)tri(mid,at(j,i+1),at(j,i),m);else tri(mid,at(j,i),at(j,i+1),m);}
 }
 function ellipsoid(center,radii,mat,{segments=28,rings=16,smooth=true}={}){
  const stations=[];for(let j=0;j<=rings;j++){const a=-Math.PI/2+(j+.015)/(rings+.03)*Math.PI,r=Math.cos(a);stations.push([center[1]+radii[1]*Math.sin(a),radii[0]*r,radii[2]*r,radii[2]*r,center[2]]);}loft(stations,mat,{segments,smooth,centerX:center[0]});
 }
 function wedge(points,front,back,mat){
  const a=points.map(([x,y],i)=>[x,y,typeof front==='function'?front(x,y,i):front]),b=points.map(([x,y],i)=>[x,y,typeof back==='function'?back(x,y,i):back]);
  const centroid=vertices=>vertices.reduce((s,p)=>s.map((v,i)=>v+p[i]/vertices.length),[0,0,0]);
  const af=centroid(a),bf=centroid(b);for(let i=0;i<a.length;i++){const j=(i+1)%a.length;tri(af,a[i],a[j],mat);tri(bf,b[j],b[i],mat);quad(a[i],b[i],b[j],a[j],mat);}
 }
 function tube(path,radius,mat,segments=12){
  const frames=path.map((p,k)=>{const axis=normal(sub(path[Math.min(path.length-1,k+1)],path[Math.max(0,k-1)])),u=normal(cross(axis,Math.abs(axis[2])<.9?[0,0,1]:[0,1,0]));return {axis,u,v:cross(axis,u)};});
  const radial=(k,i)=>frames[k].u.map((u,j)=>u*Math.cos(i/segments*Math.PI*2)+frames[k].v[j]*Math.sin(i/segments*Math.PI*2));
  const point=(k,i)=>path[k].map((p,j)=>p+radius*radial(k,i)[j]);
  for(let k=0;k<path.length-1;k++)for(let i=0;i<segments;i++){
   smoothTri(point(k,i),point(k,i+1),point(k+1,i+1),radial(k,i),radial(k,i+1),radial(k+1,i+1),mat);
   smoothTri(point(k,i),point(k+1,i+1),point(k+1,i),radial(k,i),radial(k+1,i+1),radial(k+1,i),mat);
  }
  for(let i=0;i<segments;i++){tri(path[0],point(0,i+1),point(0,i),mat);const k=path.length-1;tri(path[k],point(k,i),point(k,i+1),mat);}
 }
 function moai(){
  plinth(.94);
  // A compact ceremonial platform, with modeled ashlar joints around its sides.
  box(0,-.9125,0,1.28,.16,.88,'ahuJoint');
  for(const z of [-.446,.446])for(let i=0;i<5;i++)box(-.51+i*.255,-.908,z,.244,.137,.018,'ahuBasalt');
  for(const x of [-.646,.646])for(let i=0;i<3;i++)box(x,-.908,-.29+i*.29,.018,.137,.278,'ahuBasalt');
  box(0,-.819,0,1.30,.027,.90,'ahuBasalt');
  loft(refined([[-.8055,.285,.235,.22,0],[-.69,.30,.245,.23,0],[-.46,.305,.235,.22,0],[-.22,.315,.23,.21,0],[.17,.37,.235,.205,0],[.25,.32,.22,.195,0],[.36,.205,.19,.16,0],[.48,.195,.19,.16,0]],5),'moaiTuff',{segments:64,smooth:true});
  // Facial landmarks are relief in a continuous stone surface.
  const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  const faceShape=(p,a)=>{const [x,y]=p,front=smoothstep(.05,.5,Math.cos(a));
   const g=(xx,yy,wx,wy)=>Math.exp(-(((x-xx)/wx)**2)-(((y-yy)/wy)**2));
   const browY=1.18-.045*Math.exp(-((x/.09)**2));
   let relief=-.057*(g(.164,1.025,.083,.078)+g(-.164,1.025,.083,.078));
   relief+=.016*(g(.20,.82,.075,.13)+g(-.20,.82,.075,.13));
   relief+=.059*Math.exp(-(((y-browY)/.043)**2))*Math.exp(-((x/.34)**8));
   const progress=1-smoothstep(.66,1.19,y),width=.052+.035*progress;
   relief+=(.105+.10*progress)*Math.exp(-((x/width)**4))*smoothstep(.61,.69,y)*(1-smoothstep(1.17,1.25,y));
   relief+=.062*g(0,.696,.107,.051)-.028*(g(.075,.655,.023,.017)+g(-.075,.655,.023,.017));
   relief+=.037*g(0,.501,.135,.023)+.034*g(0,.456,.13,.023)-.009*g(0,.479,.13,.008)+.042*g(0,.30,.17,.07);
   p[2]+=front*relief;
   const grain=.00018*Math.sin(x*113+y*59)*Math.sin(p[2]*83-y*47);p[0]+=grain*Math.sin(a);p[2]+=grain*Math.cos(a);
   p[1]=.40+(y-.14)*.8;return p;};
  loft(refined([[.14,.205,.285,.205,.015],[.25,.245,.355,.235,.015],[.43,.27,.365,.25,.015],[.63,.285,.325,.275,.015],[.83,.305,.305,.285,.015],[1.03,.322,.292,.285,.015],[1.20,.327,.295,.285,.015],[1.37,.31,.27,.27,.015],[1.49,.26,.225,.23,.015],[1.535,.16,.15,.16,.015],[1.56,.035,.035,.035,.015]],12),'moaiTuff',{segments:144,smooth:true,shape:faceShape});
  for(const sign of [-1,1]){
   loft(refined([[.48,.031,.048,.048,.005],[.54,.052,.073,.073,.005],[.83,.053,.078,.078,.005],[1.115,.047,.07,.07,.005],[1.19,.025,.045,.045,.005]],7),'moaiTuff',{segments:40,smooth:true,centerX:sign*.324,shape:(p,a)=>{p[2]-=.033*Math.max(0,Math.cos(a))**8*Math.exp(-(((p[1]-.82)/.29)**4));p[1]=.40+(p[1]-.14)*.8;return p;}});
   // Arms remain carved into the torso; fingertips turn inward below the belly.
   tube([[sign*.315,.17,.12],[sign*.28,-.20,.16],[sign*.235,-.56,.19],[sign*.13,-.66,.253],[sign*.055,-.65,.255]],.034,'moaiTuff',16);
   for(let j=0;j<4;j++)tube([[sign*(.21-j*.012),-.60-j*.016,.214+j*.005],[sign*(.11-j*.008),-.63-j*.018,.23+j*.003],[sign*.055,-.632-j*.018,.25]],.0085,'moaiTuff',10);
  }
 }
 function cristo(){
  plinth(1.02);
  // Faceted Art Deco pedestal, separate from the collection's common base.
  cylinder(0,-.9375,0,.53,.11,'cristoPedestal');
  lathe([[0,-.8825],[.39,-.8825],[.39,-.80],[.33,-.73],[.30,-.50],[.36,-.475],[.36,-.445],[0,-.445]],'cristoPedestal',8);
  for(const z of [-.285,.285])box(0,-.69,z,.23,.20,.012,'cristoInset');
  // Small feet emerge beneath a single folded robe rather than floating above it.
  for(const x of [-.105,.105])ellipsoid([x,-.414,.125],[.094,.032,.17],'cristoStone',{segments:20,rings:10});
  const stations=[[-.405,.33,.205,.18,0],[-.18,.31,.205,.18,0],[.08,.29,.20,.175,0],[.34,.26,.18,.155,0],[.57,.235,.16,.145,0],[.79,.25,.16,.15,0],[1.00,.30,.175,.16,0],[1.19,.335,.17,.16,0],[1.275,.285,.14,.13,0],[1.36,.102,.095,.095,0]];
  const folds=(p,a)=>{const front=Math.max(0,Math.cos(a)),y=p[1],amount=.014+.014*Math.max(0,1-(y+.4)/1.8),fold=Math.cos((p[0]+.025*Math.sin(y*3))*34);p[2]+=(front-.72*Math.max(0,-Math.cos(a)))*amount*fold;
   if(y>.15&&y<1.24){const t=(y-.15)/1.09,fall=Math.sin(t*Math.PI);for(const sign of [-1,1]){const d=p[0]-sign*(.07+.16*t);p[2]+=front*fall*(.014*Math.exp(-((d/.026)**2))-.008*Math.exp(-(((d-sign*.034)/.016)**2)));}}
   return p;};
  loft(refined(stations,7),'cristoStone',{segments:112,smooth:true,shape:folds});
  // Diagonal folds describe the wrap across the chest and fall into the hem.
  for(const sign of [-1,1]){
   const arm=refined([[.14,1.19,.13,.15],[.42,1.205,.135,.14],[.65,1.23,.12,.12],[.86,1.25,.09,.09],[1.035,1.27,.065,.063]],8).map(([x,y,h,d])=>({x,y,h,d}));
   // Sleeves are closed lofts around each arm's longitudinal axis.
   const rings=64,at=(j,i)=>{const s=arm[Math.max(0,Math.min(arm.length-1,j))],a=i/rings*Math.PI*2,fold=.008*Math.cos(a*7+s.x*3);return[sign*s.x,s.y+(s.h+fold)*Math.cos(a),(s.d+fold*.5)*Math.sin(a)];},ns=(j,i)=>normal(cross(sub(at(j,i+1),at(j,i-1)),sub(at(j+1,i),at(j-1,i)))).map(v=>v*sign);
   for(let j=0;j<arm.length-1;j++)for(let i=0;i<rings;i++){const a=at(j,i),b=at(j,i+1),c=at(j+1,i+1),d=at(j+1,i),an=ns(j,i),bn=ns(j,i+1),cn=ns(j+1,i+1),dn=ns(j+1,i);if(sign>0){smoothTri(a,b,c,an,bn,cn,'cristoStone');smoothTri(a,c,d,an,cn,dn,'cristoStone');}else{smoothTri(a,d,c,an,dn,cn,'cristoStone');smoothTri(a,c,b,an,cn,bn,'cristoStone');}}
   // Cuffs meet wrists; palms, four fingers and the downturned thumb are modeled.
   ellipsoid([sign*1.095,1.267,.006],[.10,.057,.048],'cristoStone',{segments:24,rings:12});
   wedge([[sign*1.075,1.31],[sign*1.19,1.318],[sign*1.235,1.293],[sign*1.23,1.235],[sign*1.09,1.228]],.041,-.038,'cristoStone');
   for(let j=0;j<4;j++){
    const y=1.305-j*.021,x=1.205+[.038,.055,.052,.036][j];
    tube([[sign*1.185,y,.009],[sign*(x-.012),y+.001,.015],[sign*x,y-.006,.013]],.0095,'cristoStone',10);
   }
   tube([[sign*1.12,1.232,.015],[sign*1.17,1.193,.029],[sign*1.204,1.186,.026]],.015,'cristoStone',10);
   // Forearm drapery converges toward the upper hand without dangling pieces.
   tube([[sign*.39,1.07,.116],[sign*.62,1.135,.101],[sign*.86,1.185,.071],[sign*1.018,1.235,.044]],.007,'cristoStone',12);
  }
  loft([[1.31,.092,.085,.082,0],[1.40,.095,.085,.085,0]],'cristoStone',{segments:28});
  // Long hair forms the sides/rear of the head. The geometric face remains stone.
  loft(refined([[1.365,.07,.082,.105,0],[1.40,.12,.105,.135,0],[1.51,.135,.125,.14,0],[1.65,.132,.12,.14,0],[1.76,.105,.09,.115,0],[1.795,.057,.05,.061,0]],7),'cristoHair',{segments:80,smooth:true,shape:(p,a)=>{const wave=.0038*Math.cos(a*20+p[1]*4);p[0]+=wave*Math.sin(a);p[2]+=wave*Math.cos(a);return p;}});
  const face=[[1.385,.046,.107,.04,.034],[1.43,.087,.126,.04,.034],[1.53,.101,.13,.05,.034],[1.65,.104,.119,.055,.034],[1.71,.083,.098,.05,.034],[1.745,.06,.07,.04,.034],[1.77,.02,.027,.02,.034]],faceShape=(p,a)=>{const [x,y]=p;
   if(Math.cos(a)>0){const g=(xx,yy,wx,wy)=>Math.exp(-(((x-xx)/wx)**2)-(((y-yy)/wy)**2)),front=Math.max(0,Math.cos(a));
    p[2]+=front*(-.012*(g(.054,1.603,.031,.021)+g(-.054,1.603,.031,.021))+.008*(g(.05,1.635,.045,.015)+g(-.05,1.635,.045,.015))+.019*g(0,1.582,.019,.066)+.023*g(0,1.531,.032,.024)+.006*(g(.07,1.53,.03,.045)+g(-.07,1.53,.03,.045))+.006*g(0,1.467,.039,.01)+.005*g(0,1.448,.035,.009)-.004*g(0,1.457,.037,.004)+.008*g(0,1.418,.04,.024));
   }return p;};
  loft(refined(face,12),'cristoStone',{segments:128,smooth:true,shape:faceShape});
  for(const sign of [-1,1]){
   ellipsoid([sign*.113,1.558,.019],[.021,.049,.026],'cristoStone',{segments:16,rings:10});
   // Hair locks touch the back and shoulder collar, with shallow carved channels.
   tube([[sign*.102,1.70,-.069],[sign*.124,1.59,-.056],[sign*.112,1.45,-.061],[sign*.135,1.367,-.035]],.022,'cristoHair',10);
   for(let j=0;j<5;j++){const x=.025+j*.017;tube([[sign*x,1.765-j*.006,-.055],[sign*(x+.01),1.68,-.128+j*.004],[sign*(x+.011),1.53,-.147+j*.006],[sign*(x+.004),1.40,-.10+j*.008]],.006,'cristoHair',10);}
  }

 }
 return {chile:{title:'Moai on an ahu',build:moai},brazil:{title:'Christ the Redeemer',build:cristo}};
}
