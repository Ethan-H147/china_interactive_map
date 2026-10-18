// Country differences belong in data declarations, not in the renderer or UI.
import './countries.js';
const {ids,countries}=globalThis.AtlasCountries;
// Statistics paths, colour levels and level names are declared per country in countries.js.
export const countryColorData=Object.fromEntries(ids.map(id=>[id,{statistics:countries[id].statistics,...countries[id].colors}]));
export const colorMetrics = ['population','populationDensity','gdp','gdpPerCapita'];
export const colorLabels = {none:'None',population:'Population',populationDensity:'Population density',gdp:'GDP',gdpPerCapita:'GDP per capita'};
export const subdivisionColorLabels=Object.fromEntries(ids.filter(id=>countries[id].levelNames).map(id=>[id,countries[id].levelNames]));
export function colorLayerProfile(layer,country){
 const c=countryColorData[country];if(!c||layer.type!=='fill'||layer.metadata?.atlas?.thematic)return null;
 const id=layer.id.replace(/-motion$/,'');
 const layers=c.layers||new RegExp('^'+country+'-(?!portal|international).*-fill$');
 if(!layers.test(id)||/(?:city|settlement)-(?:hit|fill)$/.test(id))return null;
 const primary=(c.primary||new RegExp('^'+country+'-(?:.*-)?first(?:-coastal)?-fill$')).test(id);
 const level=primary?1:/city-district|third|wards/.test(id)?3:2;
 return {...(c.geography||{id:'id',parent:'parent'}),...(id.startsWith('city-district')?{parent:'parentCity'}:{}),primary,level,inheritOpacity:country==='china'||id==='japan-local-wards-fill'};
}
