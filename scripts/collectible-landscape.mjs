// Shared landscape tools for diorama collectibles: deterministic noise, a heightfield
// sampled once on a grid, a smooth-shaded ring mesh cut cleanly at the plinth edge, a
// painted ground texture with baked hollows, and simple smooth-shaded tree canopies.
import sharp from 'sharp';
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export const smax=(a,b,k=.09)=>{const h=clamp(.5+.5*(b-a)/k);return lerp(a,b,h)+k*h*(1-h);};
export const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),mixColor=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const TAU=Math.PI*2;
export function createNoise(seed){
 const random=()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 const hash=(x,y)=>{let h=Math.imul(x,374761393)+Math.imul(y,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
 const value=(x,y)=>{const i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j,a=hash(i,j),b=hash(i+1,j),c=hash(i,j+1),d=hash(i+1,j+1),s=u*u*(3-2*u),t=v*v*(3-2*v);return lerp(lerp(a,b,s),lerp(c,d,s),t)*2-1;};
 const fbm=(x,y,o=4)=>{let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*value(x*f+i*17.3,y*f-i*9.1);f*=2.03;a*=.5;}return s;};
 return{random,hash,value,fbm};
}
const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
// Smooth-shaded triangle with per-vertex normals (and UVs for textured parts). The winding
// follows the normals, so the viewer lights the visible side.
export function smoothTriangle(getParts,v,n,mat,uv){
 const face=cross(sub(v[1],v[0]),sub(v[2],v[0]));if(Math.hypot(...face)<1e-11)return;
 if(face[0]*n[0][0]+face[1]*n[0][1]+face[2]*n[0][2]<0){v=[v[0],v[2],v[1]];n=[n[0],n[2],n[1]];if(uv)uv=[uv[0],uv[2],uv[1]];}
 const parts=getParts(),p=parts[mat]??={p:[],n:[]};for(let i=0;i<3;i++){p.p.push(...v[i]);p.n.push(...norm(n[i]));}if(uv){p.uv??=[];for(const t of uv)p.uv.push(...t);}
}
export function createLandscape(api,{root,radius,extent,heightAt,resolution=512,noise}){
 const {quad,masks,getParts}=api,G=extent,N=resolution,step=2*G/(N-1),field=new Float32Array(N*N);
 for(let j=0;j<N;j++)for(let i=0;i<N;i++)field[j*N+i]=heightAt(-G+i*step,-G+j*step);
 const sample=(x,z)=>{const fx=clamp((x+G)/step,0,N-1.001),fz=clamp((z+G)/step,0,N-1.001),i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j,k=j*N+i;return lerp(lerp(field[k],field[k+1],u),lerp(field[k+N],field[k+N+1],u),v);};
 const ground=(x,z)=>root+sample(x,z);
 const gradient=(x,z,e=.012)=>[(sample(x+e,z)-sample(x-e,z))/(2*e),(sample(x,z+e)-sample(x,z-e))/(2*e)];
 const surfaceNormal=(x,z)=>{const [gx,gz]=gradient(x,z),l=Math.hypot(gx,1,gz);return[-gx/l,1/l,-gz/l];};
 const smoothTri=(v,n,mat,uv)=>smoothTriangle(getParts,v,n,mat,uv);
 // Paint the ground texture: color(x,z,info) gives the base color; hollows darken and
 // crests lighten, with a faint grain.
 async function paint(material,color,{size=1024,hollow=.018}={}){
  const T=size,pixels=Buffer.alloc(T*T*3);
  for(let j=0;j<T;j++)for(let i=0;i<T;i++){
   const x=-G+(i+.5)/T*2*G,z=-G+(j+.5)/T*2*G,[gx,gz]=gradient(x,z),slope=Math.hypot(gx,gz),e=.03,lap=(sample(x+e,z)+sample(x-e,z)+sample(x,z+e)+sample(x,z-e)-4*sample(x,z))/(e*e);
   const c=color(x,z,{slope,lap,height:sample(x,z)}),shade=clamp(1-lap*hollow,.62,1.12)*(.93+.07*noise.fbm(x*24,z*24,2));
   const k=(j*T+i)*3;for(let n=0;n<3;n++)pixels[k+n]=clamp(Math.round(c[n]*shade),0,255);
  }
  masks.set(material,await sharp(pixels,{raw:{width:T,height:T,channels:3}}).png({palette:true,colours:256,dither:.6,compressionLevel:9}).toBuffer());
 }
 // Ring mesh out to the landscape radius, with a cut edge of topsoil over bedrock.
 function terrain(material,{rings=52,spacing=.027,soil,bedrock,soilDepth=.07}={}){
  const point=(r,a)=>{const x=r*Math.cos(a),z=r*Math.sin(a);return{v:[x,ground(x,z),z],n:surfaceNormal(x,z),uv:[(x+G)/(2*G),(z+G)/(2*G)]};};
  const ring=k=>{if(k===0)return[point(0,0)];const r=radius*k/rings,count=Math.max(8,Math.round(TAU*r/spacing));return Array.from({length:count},(_,i)=>point(r,i/count*TAU));};
  const emit=(a,b,c)=>smoothTri([a.v,b.v,c.v],[a.n,b.n,c.n],material,[a.uv,b.uv,c.uv]);
  let inner=ring(0);
  for(let k=1;k<=rings;k++){
   const outer=ring(k);
   if(inner.length===1){for(let i=0;i<outer.length;i++)emit(inner[0],outer[i],outer[(i+1)%outer.length]);}
   else{let i=0,j=0;while(i<inner.length||j<outer.length){const ai=(i+1)/inner.length,aj=(j+1)/outer.length;if(j<outer.length&&(i>=inner.length||aj<=ai)){emit(inner[i%inner.length],outer[j%outer.length],outer[(j+1)%outer.length]);j++;}else{emit(inner[i%inner.length],outer[j%outer.length],inner[(i+1)%inner.length]);i++;}}}
   inner=outer;
  }
  for(let i=0;i<inner.length;i++){
   const a=inner[i].v,b=inner[(i+1)%inner.length].v,split=y=>Math.max(root,y-soilDepth);
   quad([a[0],split(a[1]),a[2]],[b[0],split(b[1]),b[2]],b,a,soil);
   quad([a[0],root,a[2]],[b[0],root,b[2]],[b[0],split(b[1]),b[2]],[a[0],split(a[1]),a[2]],bedrock);
  }
 }
 // A rounded or conical canopy with soft normals and a slightly irregular outline.
 function canopy(cx,cy,cz,r,height,mat,cone){
  const segments=cone?6:7,rows=3,pts=[];
  for(let j=0;j<=rows;j++){const v=j/rows,rr=cone?r*(1-v)*(1-.12*Math.sin(v*Math.PI)):r*Math.sin(Math.PI*Math.min(.999,.08+v*.92))*(1-.12*v),y=cy+height*(cone?v:(.5-.5*Math.cos(Math.PI*v)));const row=[];for(let i=0;i<segments;i++){const a=i/segments*TAU+j*.35,wob=1+.13*noise.hash(Math.round(cx*1e4)+i,j);row.push([cx+rr*wob*Math.cos(a),y,cz+rr*wob*Math.sin(a)]);}pts.push(row);}
  const normal=p=>[p[0]-cx,(p[1]-(cy+height*.35))*(cone?.6:1.1)+(cone?r*.9:0),p[2]-cz];
  for(let j=0;j<rows;j++)for(let i=0;i<segments;i++){const a=pts[j][i],b=pts[j][(i+1)%segments],c=pts[j+1][(i+1)%segments],d=pts[j+1][i];smoothTri([a,b,c],[normal(a),normal(b),normal(c)],mat);smoothTri([a,c,d],[normal(a),normal(c),normal(d)],mat);}
 }
 return{sample,ground,gradient,surfaceNormal,smoothTri,paint,terrain,canopy};
}
