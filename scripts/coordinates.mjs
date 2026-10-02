import coordtransform from './vendor/coordtransform.cjs';

// DataV/AreaCity use GCJ-02; government SAR and NLSC sources use WGS84.
// Numerically invert the DataV-recommended transform. Retain every vertex.
export function gcjToWgs84(point) {
  const [x,y]=point;
  let [lng,lat]=coordtransform.gcj02towgs84(x,y);
  for(let i=0;i<10;i++) {
    const projected=coordtransform.wgs84togcj02(lng,lat);
    const dx=projected[0]-x,dy=projected[1]-y;
    if(Math.max(Math.abs(dx),Math.abs(dy))<1e-11)break;
    lng-=dx;lat-=dy;
  }
  return [lng,lat,...point.slice(2)];
}
export function wgsToGcj02(point){return coordtransform.wgs84togcj02(...point);}
export function transformGeometry(geometry) {
  const coordinates=c=>typeof c[0]==='number'?gcjToWgs84(c):c.map(coordinates);
  return {...geometry,coordinates:coordinates(geometry.coordinates)};
}
export function transformFeature(feature) {
  const properties={...feature.properties};
  for(const key of ['center','centroid'])if(properties[key])properties[key]=gcjToWgs84(properties[key]);
  return {...feature,properties,geometry:transformGeometry(feature.geometry)};
}
