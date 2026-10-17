import './countries.js';

// Country previews and their coarse fallback land must share a color from the first frame.
export const mapPalette=Object.freeze({country:'#d7d7d3',foreign:'#e5e5e1'});
export function backgroundLandColor(allows=id=>globalThis.AtlasDev?.allows(id)??globalThis.AtlasCountries.countries[id].release!=='developer'){
 const ids=globalThis.AtlasCountries.ids.filter(allows);
 return ['case',['in',['get','country'],['literal',ids]],mapPalette.country,mapPalette.foreign];
}
export function syncBackgroundLand(map){
 const color=backgroundLandColor();
 for(const layer of map.getStyle()?.layers||[])if(layer.metadata?.atlas?.landPalette)map.setPaintProperty(layer.id,'fill-color',color);
}
