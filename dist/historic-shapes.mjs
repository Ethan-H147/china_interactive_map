// Each shape keeps its rings as one flat coordinate array; a point is inside when it crosses an
// odd number of ring edges, which covers holes and multipolygons alike. Picking tests these
// polygons because rendered-feature queries skip layers the map's motion handling has not
// registered, which these layers are not.
export function packShapes(features){
 return features.filter(f=>f.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type)&&!f.properties.outline).map(f=>{
  const rings=(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).flat();
  const starts=new Int32Array(rings.length+1),xy=new Float64Array(rings.reduce((n,r)=>n+(ArrayBuffer.isView(r)?r.length:2*r.length),0));
  let k=0,w=180,s=90,e=-180,n=-90;
  rings.forEach((ring,i)=>{
   starts[i]=k/2;
   if(ArrayBuffer.isView(ring)){xy.set(ring,k);k+=ring.length;}
   else for(const [x,y] of ring){xy[k++]=x;xy[k++]=y;}
  });
  starts[rings.length]=k/2;
  for(let i=0;i<k;i+=2){const x=xy[i],y=xy[i+1];if(x<w)w=x;if(x>e)e=x;if(y<s)s=y;if(y>n)n=y;}
  return {properties:f.properties,xy,starts,box:[w,s,e,n]};
 });
}
function inside({xy,starts},x,y){
 let odd=false;
 for(let r=0;r+1<starts.length;r++)for(let i=starts[r],j=starts[r+1]-1;i<starts[r+1];j=i++){const xi=xy[2*i],yi=xy[2*i+1],xj=xy[2*j],yj=xy[2*j+1];if(yi>y!==yj>y&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)odd=!odd;}
 return odd;
}
export function shapeAt(map,shapes,point,accept){
 return shapeAtLocation(shapes,map.unproject(point),accept);
}
export function shapeAtLocation(shapes,{lng,lat},accept){
 const x=((lng+540)%360+360)%360-180;
 return shapes.find(shape=>{
  const [w,s,e,n]=shape.box;
  if(lat<s||lat>n||accept&&!accept(shape.properties))return false;
  if(x>=w&&x<=e&&inside(shape,x,lat))return true;
  return e>180&&x+360>=w&&x+360<=e&&inside(shape,x+360,lat)
   ||w< -180&&x-360>=w&&x-360<=e&&inside(shape,x-360,lat);
 });
}

