// Explicit WGS84-degree input: never infer square metres from a longitude range.
// The spherical model matches the boundary builder’s existing radius convention.
export const areaRadiusMetres=6378137;
export function geographicAreaKm2(geometry){
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
 const rad=Math.PI/180,ringArea=ring=>{let sum=0;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[j],b=ring[i];let delta=(b[0]-a[0])*rad;delta=((delta+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;sum+=delta*(2+Math.sin(a[1]*rad)+Math.sin(b[1]*rad));}return Math.abs(sum)*areaRadiusMetres*areaRadiusMetres/2e6;};
 return polygons.reduce((total,rings)=>total+Math.max(0,ringArea(rings[0])-rings.slice(1).reduce((area,ring)=>area+ringArea(ring),0)),0);
}
