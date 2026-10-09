// Country differences belong in data declarations, not in the renderer or UI.
export const countryColorData = {
 china: {statistics:'data/region-statistics.json', population:'china', levels:'Provinces & territories', geography:{id:'adcode',parent:'provinceCode'}, layers:/^(province|prefecture|other|city-district)(-fragment)?-fill$/, primary:/^province(-fragment)?-fill$/},
 korea: {statistics:'data/region-statistics.json', catalogue:'data/korea-boundaries.bin', population:'korea', levels:'Provinces & special cities'},
 mongolia: {statistics:'data/region-statistics.json', catalogue:'data/mongolia-boundaries.bin', population:'mongolia', levels:'Provinces & capital'},
 japan: {statistics:'data/region-statistics.json', catalogue:'data/japan-boundaries.bin', population:'japan', levels:'Prefectures'},
 indonesia: {statistics:'data/archipelago/indonesia-statistics.json', catalogue:'data/archipelago/indonesia-catalogue.bin', levels:'Provinces'},
 philippines: {statistics:'data/archipelago/philippines-statistics.json', catalogue:'data/archipelago/philippines-catalogue.bin', population:'philippines', levels:'Regions'},
 malaysia: {statistics:'data/southeast-asia/malaysia-statistics.json', catalogue:'data/southeast-asia/malaysia-catalogue.bin', levels:'States & federal territories'},
 singapore: {statistics:'data/southeast-asia/singapore-statistics.json', catalogue:'data/southeast-asia/singapore-catalogue.bin', levels:'Regions', economy:false},
 russia: {statistics:'data/russia/statistics.json', catalogue:'data/russia/catalogue.bin', levels:'Federal subjects'},
 brazil: {statistics:'data/south-america/brazil-statistics.json', levels:'States & Federal District', layers:/^south-brazil-fill$/, primary:/^south-brazil-fill$/},
 uruguay: {statistics:'data/south-america/uruguay-statistics.json', levels:'Departments', layers:/^south-uruguay-fill$/, primary:/^south-uruguay-fill$/, economy:false},
 argentina: {statistics:'data/south-america/argentina-statistics.json', levels:'Provinces & autonomous city', layers:/^south-argentina-fill$/, primary:/^south-argentina-fill$/, economy:false, density:false}
};
export const colorMetrics = ['population','populationDensity','gdp','gdpPerCapita'];
export const colorLabels = {none:'None',population:'Population',populationDensity:'Population density',gdp:'GDP',gdpPerCapita:'GDP per capita'};
export function colorLayerProfile(layer,country){
 const c=countryColorData[country];if(!c||layer.type!=='fill')return null;
 const id=layer.id.replace(/-motion$/,'');
 const layers=c.layers||new RegExp('^'+country+'-(?!portal|international).*-fill$');
 if(!layers.test(id))return null;
 return {...(c.geography||{id:'id',parent:'parent'}),primary:(c.primary||new RegExp('^'+country+'-(?:.*-)?first(?:-coastal)?-fill$')).test(id)};
}
