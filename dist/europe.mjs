import {addRegionalCountry} from './regional-country.mjs';

// Countries with subdivisions declare their levels; the others are a single level-1 region.
const definitions={
 'united-kingdom':{name:'United Kingdom',prefix:'gb',lang:'en',firstLabel:'Nations & regions',secondLabel:'Counties & unitaries',thirdLabel:'Districts',loadAllSubdivisions:true,settlements:true,labelLanguages:[['both','Bilingual'],['en','English'],['cy','Welsh']],searchLabel:'Find a region, council, city or town',statistics:true,center:[-3.2,54.6],zoom:4.6,bounds:[[-8.7,49.85],[1.8,60.9]],fill:'#e4e9f2',selected:'#c4d0e5',line:'#3d5683'},
 spain:{name:'Spain',prefix:'es',lang:'es',firstLabel:'Communities',secondLabel:'Provinces',thirdLabel:'Municipalities',bundledLevels:2,searchLabel:'Find a community, province or municipality',statistics:true,center:[-3.6,40.2],zoom:4.9,bounds:[[-9.4,35.9],[4.4,43.8]],fill:'#f4e7cb',selected:'#ebd09d',line:'#9c4a2f'},
 france:{name:'France',prefix:'fr',lang:'fr',firstLabel:'Regions',secondLabel:'Departments',thirdLabel:'Communes',bundledLevels:2,searchLabel:'Find a region, department or commune',statistics:true,center:[2.4,46.6],zoom:4.9,bounds:[[-5.2,41.3],[9.6,51.1]],fill:'#e3e8f4',selected:'#c3cce7',line:'#35508b'},
 italy:{name:'Italy',prefix:'it',lang:'it',firstLabel:'Regions',secondLabel:'Provinces',thirdLabel:'Comuni',bundledLevels:2,searchLabel:'Find a region, province or comune',statistics:true,center:[12.6,42.2],zoom:4.8,bounds:[[6.6,35.5],[18.6,47.1]],fill:'#e3eedf',selected:'#c3dcbd',line:'#3e7845'}
};
export const configurations=Object.fromEntries(Object.entries(definitions).map(([country,definition])=>[country,{country,firstLabel:'Country',searchLabel:'Find a place',...definition,base:`data/europe/${country}/`,nationalFlag:`vendor/flag-${definition.prefix}.svg`,contextLabels:true,flags:{},detailFlags:{},hasStatistics:()=>!!definition.statistics,attribution:`${definition.name}: <a href="data/europe/${country}/sources.json">Boundary sources & coverage</a>`}]));
// Unreleased countries are added only once developer mode allows one, so public
// visitors download none of their geometry.
export function createEurope(map,host){
 const portals={};let adding=null;
 const allowedAny=()=>Object.keys(configurations).some(country=>window.AtlasDev?.allows(country));
 function ensure(){if(!allowedAny())return Promise.resolve();adding??=(async()=>{for(const [country,c] of Object.entries(configurations))portals[country]=await addRegionalCountry(map,host,c);})();return adding;}
 return {portals,ensure,handles:country=>country in configurations,syncDeveloper(){for(const portal of Object.values(portals))portal.sync();}};
}
