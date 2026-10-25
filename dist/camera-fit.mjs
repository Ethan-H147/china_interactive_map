// Fit wide globe views using their projected footprint, not the Mercator latitude midpoint.
// The pinned renderer exposes its camera transform; clone it so fitting never moves the live map.
export function cameraForBounds(map,bounds,options={}){
 const fallback=()=>map.cameraForBounds(bounds,options);
 if(map.getProjection?.()?.type!=='globe')return fallback();
 const original=map._camera?.transform||map.transform;
 if(!original?.clone)return fallback();
 const b=globalThis.maplibregl.LngLatBounds.convert(bounds).adjustAntiMeridian(),west=b.getWest(),east=b.getEast(),south=b.getSouth(),north=b.getNorth();
 const phone=globalThis.matchMedia?.('(max-width:760px)').matches;
 if(!phone&&Math.max(east-west,north-south)<30||east-west>180)return fallback();
 const tr=original.clone(),LngLat=globalThis.maplibregl.LngLat,points=[],padding={top:0,right:0,bottom:0,left:0,...options.padding};
 tr.setTransitionState?.(1);tr.setMinZoom(Math.min(0,map.getMinZoom()));tr.setPadding({top:0,right:0,bottom:0,left:0});tr.setPitch(0);tr.setRoll(0);tr.setBearing(options.bearing||0);
 const steps=Math.max(16,Math.ceil(Math.max(east-west,north-south)/2));
 for(let i=0;i<=steps;i++){const t=i/steps,x=west+(east-west)*t,y=south+(north-south)*t;points.push(new LngLat(x,south),new LngLat(x,north),new LngLat(west,y),new LngLat(east,y));}
 const left=padding.left,right=tr.width-padding.right,top=padding.top,bottom=tr.height-padding.bottom,target={x:(left+right)/2,y:(top+bottom)/2};
 if(right-left<40||bottom-top<40)return fallback();
 const extent=()=>{let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity,visible=true;for(const p of points){const q=tr.locationToScreenPoint(p);visible&&=!tr.isLocationOccluded(p);x0=Math.min(x0,q.x);x1=Math.max(x1,q.x);y0=Math.min(y0,q.y);y1=Math.max(y1,q.y);}return{x0,x1,y0,y1,visible};};
 function evaluate(zoom){tr.setCenter(new LngLat((west+east)/2,(south+north)/2));tr.setZoom(zoom);let box;
  for(let i=0;i<6;i++){box=extent();const dx=(box.x0+box.x1)/2-target.x,dy=(box.y0+box.y1)/2-target.y;if(Math.hypot(dx,dy)<.2)break;const point=tr.centerPoint.add({x:dx,y:dy}),center=tr.screenPointToLocation(point);if(!Number.isFinite(center.lng)||!Number.isFinite(center.lat))return false;tr.setCenter(center);}
  box=extent();return box.visible&&box.x0>=left&&box.x1<=right&&box.y0>=top&&box.y1<=bottom;
 }
 // Close-up views keep the renderer’s normal projection and fit behavior.
 let lo=Math.min(.5,map.getMinZoom()),hi=Math.min(phone?10:4.4,options.maxZoom??map.getMaxZoom());if(!evaluate(lo))return fallback();
 for(let i=0;i<16;i++){const mid=(lo+hi)/2;if(evaluate(mid))lo=mid;else hi=mid;}
 if(lo>(phone?9.95:4.35))return fallback();evaluate(Math.max(map.getMinZoom(),lo-.015));return{center:tr.center,zoom:tr.zoom,bearing:options.bearing||0};
}
