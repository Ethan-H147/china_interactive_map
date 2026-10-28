import sharp from 'sharp';

export async function createArgentinaCollectible(api){
 const {tri,quad,plinth,box,beam,cylinder,torus,lathe,palette,masks,getParts}=api;
 Object.assign(palette,{argIvory:{color:'#dcd3bb',metal:0,rough:.62},argEdge:{color:'#c9bfa7',metal:0,rough:.7},argEnamel:{color:'#559ebd',metal:.08,rough:.22},argGold:{color:'#caa14f',metal:.8,rough:.28},argGoldDark:{color:'#80602a',metal:.72,rough:.38},argWindow:{color:'#282e2d',metal:.1,rough:.8},argLetters:{color:'#85744f',metal:.25,rough:.56}});
 const inscription=`<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1536"><g fill="white" font-family="serif" text-anchor="middle"><text x="384" y="230" font-size="78" letter-spacing="7">BUENOS</text><text x="384" y="335" font-size="78" letter-spacing="7">AIRES</text><text x="384" y="620" font-size="55" letter-spacing="5">A LA REPÚBLICA</text><text x="384" y="860" font-size="50" letter-spacing="4">IV CENTENARIO</text><text x="384" y="1090" font-size="80" letter-spacing="7">1536</text><text x="384" y="1280" font-size="80" letter-spacing="7">1936</text><path d="M130 418H638M160 720H608M185 1390H583" stroke="white" stroke-width="3"/></g></svg>`;
 masks.set('argLetters',await sharp(Buffer.from(inscription)).png().toBuffer());
 const rotate=(p,side)=>{const a=side*Math.PI/2;return[p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],p[2]*Math.cos(a)-p[0]*Math.sin(a)];};
 const badge=p=>[p[0],-.82+p[1]*.66+p[2]*.75,.49-p[1]*.75+p[2]*.66];
 const disk=(profile,material)=>lathe(profile,material,112,p=>badge([p[0],p[2],p[1]]));
 const line=(path,width,material,transform=p=>p)=>{for(let i=1;i<path.length;i++)beam(transform(path[i-1]),transform(path[i]),width,width,material);};
 function bead(point,r,material){const profile=[];for(let i=0;i<=12;i++){const a=-Math.PI/2+i/12*Math.PI;profile.push([r*Math.cos(a),r*Math.sin(a)]);}lathe(profile,material,20,p=>p.map((v,i)=>v+point[i]));}
 function sun(){
  disk([[0,0],[.335,0],[.348,.008],[.348,.018],[.338,.027],[0,.027]],'argGoldDark');
  disk([[.324,.025],[.332,.025],[.337,.031],[.332,.037],[.324,.037],[.324,.025]],'argGold');
  for(let i=0;i<64;i++){const a=i/64*Math.PI*2;bead(badge([.322*Math.cos(a),.322*Math.sin(a),.038]),.0055,'argGold');}
  // Thirty-two alternating straight and flame rays, each with a raised ridge.
  for(let i=0;i<32;i++){
   const a=i/32*Math.PI*2,flame=i%2,rows=[];
   for(let j=0;j<=14;j++){const t=j/14,r=.135+.169*t,angle=a+(flame?.047*Math.sin(t*Math.PI*3)*Math.sin(t*Math.PI):0),w=.010*Math.pow(Math.sin(Math.PI*t),.65),center=[r*Math.cos(angle),r*Math.sin(angle)],tangent=[-Math.sin(angle),Math.cos(angle)],h=.032+.014*Math.sin(Math.PI*t);
    rows.push([badge([center[0]-tangent[0]*w,center[1]-tangent[1]*w,.028]),badge([center[0],center[1],h]),badge([center[0]+tangent[0]*w,center[1]+tangent[1]*w,.028])]);
   }
   for(let j=1;j<rows.length;j++)for(let k=0;k<2;k++)quad(rows[j-1][k],rows[j][k],rows[j][k+1],rows[j-1][k+1],i%2?'argGold':'argGoldDark');
  }
  const face=[];for(let i=0;i<=28;i++){const r=.142*i/28;face.push([r,.036+.037*Math.sqrt(Math.max(0,1-(r/.142)**2))]);}face.push([.142,.027],[0,.027]);disk(face,'argGold');
  const surface=(x,y,extra=0)=>[x,y,.036+.037*Math.sqrt(Math.max(0,1-(x*x+y*y)/(.142*.142)))+extra];
  for(const sign of [-1,1]){
   const eye=Array.from({length:25},(_,i)=>{const t=i/24*Math.PI*2;return surface(sign*.047+.025*Math.cos(t),.024+.010*Math.sin(t),.001);});line(eye,.0028,'argGoldDark',badge);
   const brow=Array.from({length:18},(_,i)=>{const t=i/17;return surface(sign*.047+(t-.5)*.060,.047+.009*Math.sin(Math.PI*t),.001);});line(brow,.0037,'argGoldDark',badge);
   bead(badge(surface(sign*.047,.024,.003)),.0042,'argGoldDark');
   const cheek=Array.from({length:12},(_,i)=>surface(sign*(.069+.017*i/11),-.005-.014*i/11,.0005));line(cheek,.0015,'argGoldDark',badge);
  }
  const nose=[surface(-.010,.040),surface(.010,.040),[.012,-.015,.088],[0,-.026,.094],[-.012,-.015,.088]];
  for(let i=1;i<nose.length-1;i++)tri(badge(nose[0]),badge(nose[i]),badge(nose[i+1]),'argGold');
  line([surface(-.017,-.018,.001),surface(-.010,-.025,.003),surface(0,-.022,.004),surface(.010,-.025,.003),surface(.017,-.018,.001)],.0023,'argGoldDark',badge);
  const mouth=Array.from({length:25},(_,i)=>{const x=-.035+i/24*.070;return surface(x,-.053+.006*Math.cos(x/.035*Math.PI),.001);});line(mouth,.003,'argGoldDark',badge);
  const lip=Array.from({length:20},(_,i)=>{const x=-.027+i/19*.054;return surface(x,-.062-.004*Math.cos(x/.027*Math.PI),.002);});line(lip,.0025,'argGold',badge);
 }
 const bottom=-.8725,shoulder=1.66,tip=1.80,width=y=>.149-(y-bottom)/(shoulder-bottom)*.064;
 function wall(side){
  const rows=[bottom,-.65,-.35,0,.35,.70,1.05,1.38,1.46,1.53,shoulder],columns=[-1,-.19,.19,1],at=(s,y,depth=0)=>rotate([s*(width(y)-.008),y,width(y)-depth],side);
  for(let j=1;j<rows.length;j++)for(let i=1;i<columns.length;i++){
   if(rows[j-1]===1.46&&rows[j]===1.53&&i===2)continue;
   quad(at(columns[i-1],rows[j-1]),at(columns[i],rows[j-1]),at(columns[i],rows[j]),at(columns[i-1],rows[j]),'argIvory');
  }
  const a=at(-.19,1.46),b=at(.19,1.46),c=at(.19,1.53),d=at(-.19,1.53),e=at(-.19,1.46,.024),f=at(.19,1.46,.024),g=at(.19,1.53,.024),h=at(-.19,1.53,.024);
  quad(a,b,f,e,'argEdge');quad(d,h,g,c,'argEdge');quad(a,e,h,d,'argEdge');quad(b,c,g,f,'argEdge');quad(e,f,g,h,'argWindow');
  for(const y of [1.448,1.54]){const w=width(y);const p=rotate([0,y,w+.0025],side);box(p[0],p[1],p[2],side%2?.010:.054,.008,side%2?.054:.010,'argEdge');}
  const v=[at(-.74,-.65,-.001),at(.74,-.65,-.001),at(.74,.18,-.001),at(-.74,.18,-.001)];
  const emit=(a,b,c,uv)=>{const part=getParts().argLetters,before=part?.p.length||0;tri(a,b,c,'argLetters');const p=getParts().argLetters;if(p.p.length>before){p.uv??=[];p.uv.push(...uv.flat());}};
  emit(v[0],v[1],v[2],[[0,1],[1,1],[1,0]]);emit(v[0],v[2],v[3],[[0,1],[1,0],[0,0]]);
 }
 return{argentina:{title:'Obelisco medallion',build(){
  plinth(.92);
  lathe([[.918,-1.181],[.923,-1.181],[.923,-1.102],[.918,-1.102],[.918,-1.181]],'argEnamel',128);
  for(const y of [-1.190,-1.094,-1.035])torus([0,y,0],y===-1.035?.86:.922,.009,'argGold');
  for(let i=0;i<96;i++){const a=i/96*Math.PI*2;bead([.888*Math.cos(a),-1.025,.888*Math.sin(a)],.009,'argGold');}
  cylinder(0,-.9775,0,.53,.030,'argEdge');box(0,-.9325,0,.49,.09,.49,'argIvory');box(0,-.885,0,.35,.025,.35,'argEdge');
  for(let side=0;side<4;side++)wall(side);
  for(let side=0;side<4;side++){
   const at=(y,s)=>{const w=width(y);return rotate(s?[w,y,w-.008]:[w-.008,y,w],side);};
   quad(at(bottom,0),at(bottom,1),at(shoulder,1),at(shoulder,0),'argEdge');
   tri(rotate([-width(shoulder)+.008,shoulder,width(shoulder)],side),rotate([width(shoulder)-.008,shoulder,width(shoulder)],side),[0,tip,0],'argIvory');
   tri(at(shoulder,0),at(shoulder,1),[0,tip,0],'argEdge');
  }
  // The small jewel-like medallion is mounted into the plinth, clear of the shaft.
  sun();
  for(const sign of [-1,1]){
   const path=Array.from({length:24},(_,i)=>{const a=-Math.PI*.32+i/23*Math.PI*.8;return[sign*(.40+.16*Math.cos(a)),-.991,.26+.18*Math.sin(a)];});line(path,.012,'argGold');
   for(let i=2;i<22;i+=3){const p=path[i],q=[p[0]+sign*.045,p[1]+.018,p[2]+.018];beam(p,q,.020,.008,'argGold');}
  }
 }}};
}
