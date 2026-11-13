// Fill the land between the sketch and the detailed outline from adjacent departments.
export async function fitImperialMexico(sketchPaths,modern,{command,topology,packShapes,shapeAtLocation}){
 const fc=features=>({type:'FeatureCollection',features}),f=(id,geometry)=>({type:'Feature',properties:{id},geometry});
 // An SVG path can contain several exterior rings as well as holes.
 const raw=await command(sketchPaths,'-polygons from-rings');
 const land=await command(modern,'-dissolve2');land.features.forEach(p=>p.properties={id:'land'});
 const mosaic=await command(fc([...raw.features,...land.features]),'-clean allow-overlaps -mosaic calc="sourceIds=collect(id)" -filter "!!sourceIds && sourceIds.includes(\'land\')" -explode');
 const points=await command(mosaic,'-points inner');
 const sketch=packShapes(raw.features);
 // Classify gaps by polygon coverage. A point near a rounded edge can fall on
 // the wrong side of the original sketch and mislabel an entire coastal gap.
 const faces=fc(mosaic.features.map((face,index)=>{
  const sourceIds=face.properties.sourceIds.filter(id=>id!=='land');
  const point=points.features[index].geometry?.coordinates;
  const sampled=sourceIds.length>1&&point
   ?shapeAtLocation(sketch,{lng:point[0],lat:point[1]})?.properties.id
   :undefined;
  const owner=sourceIds.includes(sampled)?sampled:sourceIds[0];
  return f(owner,face.geometry);
 }));
 const t=topology({faces}),owners=new Map(),arcs=t.objects.faces.geometries.map(g=>[...new Set(g.arcs.flat(Infinity).map(a=>a<0?~a:a))]);
 for(const [i,ids]of arcs.entries())for(const a of ids){if(!owners.has(a))owners.set(a,[]);owners.get(a).push(i);}
 const ids=faces.features.map(p=>p.properties.id);
 const pieces=[],islands=[];
 for(const [i,p]of faces.features.entries()){
  if(ids[i]){pieces.push(f(ids[i],p.geometry));continue;}
  const contacts=new Map();for(const a of arcs[i])for(const neighbor of owners.get(a)){if(neighbor!==i&&ids[neighbor])contacts.set(a,ids[neighbor]);}
  const departments=new Set(contacts.values());
  if(!contacts.size){islands.push(p);continue;}
  if(departments.size===1){pieces.push(f(departments.values().next().value,p.geometry));continue;}
  // A single gap may run past several departments. Cut it into local catchments
  // along the shared frontage instead of awarding the full strip to one unit.
  const sites=[];for(const [a,id]of contacts){const arc=t.arcs[a];for(let j=1;j<arc.length;j++){const [x,y]=arc[j-1],[X,Y]=arc[j],n=Math.max(1,Math.ceil(Math.hypot(X-x,Y-y)/.012));for(let k=0;k<n;k++){const w=(k+.5)/n;sites.push({id,point:[x+(X-x)*w,y+(Y-y)*w]});}}}
  const coords=p.geometry.coordinates.flat(1),box=coords.reduce(([w,s,e,n],[x,y])=>[Math.min(w,x),Math.min(s,y),Math.max(e,x),Math.max(n,y)],[180,90,-180,-90]);
  const cells=voronoi(sites,box).map(({id,ring})=>f(id,{type:'Polygon',coordinates:[[...ring,ring[0]]]}));
  const fitted=await command({'cells.json':fc(cells),'gap.json':fc([p])},'-clip gap.json -dissolve2 id');
  pieces.push(...fitted.features);
 }
 // Disconnected land has no shared edge. Match it to the closest coast after
 // the mainland has been fitted, using distances to segments, not vertices.
 const fitted=await command(fc(pieces),'-dissolve2 id');
 const coasts=fitted.features.map(p=>({id:p.properties.id,rings:p.geometry.type==='Polygon'?p.geometry.coordinates:p.geometry.coordinates.flat(1)}));
 for(const p of islands){const point=p.geometry.coordinates[0][0],scale=Math.cos(point[1]*Math.PI/180);let distance=Infinity,id;
  for(const c of coasts)for(const ring of c.rings)for(let i=1;i<ring.length;i++){
   const x=(ring[i-1][0]-point[0])*scale,y=ring[i-1][1]-point[1],dx=(ring[i][0]-ring[i-1][0])*scale,dy=ring[i][1]-ring[i-1][1],w=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1))),d=(x+w*dx)**2+(y+w*dy)**2;if(d<distance){distance=d;id=c.id;}
  }
  pieces.push(f(id,p.geometry));
 }
 return fc(pieces);
}

function voronoi(sites,[west,south,east,north]){
 const scale=Math.cos((south+north)*Math.PI/360),project=([x,y])=>[(x-west)*scale,y-south];
 const unique=new Map();for(const {id,point}of sites)unique.set(point.join(','),{id,point:project(point)});
 const points=[...unique.values()],e=(east-west)*scale+.01,n=north-south+.01,box=[[-.01,-.01],[e,-.01],[e,n],[-.01,n]];
 return points.flatMap(({id,point:[x,y]},i)=>{
  let ring=box;for(const [j,{point:[X,Y]}]of points.entries()){
   if(i===j||!ring.length)continue;const dx=X-x,dy=Y-y,mx=(x+X)/2,my=(y+Y)/2;
   const d=([px,py])=>(px-mx)*dx+(py-my)*dy,cut=[];
   for(let k=0;k<ring.length;k++){
    const a=ring[k],b=ring[(k+1)%ring.length],u=d(a),v=d(b);
    if(u<=0)cut.push(a);if((u<=0)!==(v<=0)){const w=u/(u-v);cut.push([a[0]+(b[0]-a[0])*w,a[1]+(b[1]-a[1])*w]);}
   }
   ring=cut;
  }
  return ring.length<3?[]:[{id,ring:ring.map(([x,y])=>[x/scale+west,y+south])}];
 });
}
