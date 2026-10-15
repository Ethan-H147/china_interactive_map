// Tile rounding can reverse a tiny island's winding. If it is the first ring
// in a MultiPolygon, the renderer can then misclassify the mainland as a hole.
// Keep each polygon (with its holes) in its own feature, sharing the region ID.
export function polygonParts(collection){
 return {...collection,features:collection.features.flatMap(feature=>feature.geometry?.type==='MultiPolygon'
  ?feature.geometry.coordinates.map(coordinates=>({...feature,geometry:{type:'Polygon',coordinates}}))
  :[feature])};
}
