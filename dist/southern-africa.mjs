import {addRegionalCountry} from './regional-country.mjs';
import {southernAfricaFlags} from './southern-africa-flags.mjs';

const definitions={
 'south-africa':{name:'South Africa',prefix:'za',lang:'en',firstLabel:'Provinces',secondLabel:'Districts & metros',thirdLabel:'Municipalities',loadAllSubdivisions:true,center:[25,-29],zoom:4,bounds:[[16.4,-35],[33.1,-22]],fill:'#e6eedc',selected:'#c7dbb2',line:'#577148'},
 eswatini:{name:'Eswatini',prefix:'sz',lang:'ss',firstLabel:'Regions',secondLabel:'Tinkhundla',center:[31.5,-26.55],zoom:7,bounds:[[30.75,-27.35],[32.15,-25.7]],fill:'#f4e8d9',selected:'#e8cfac',line:'#986e36'},
 lesotho:{name:'Lesotho',prefix:'ls',lang:'st',firstLabel:'Districts',secondLabel:'Councils',center:[28.25,-29.6],zoom:6,bounds:[[27,-30.7],[29.5,-28.5]],fill:'#e3eef1',selected:'#bfdce4',line:'#477585'}
};
export const configurations=Object.fromEntries(Object.entries(definitions).map(([country,definition])=>[country,{country,...definition,base:`data/southern-africa/${country}/`,nationalFlag:`vendor/flag-${definition.prefix}.svg`,contextLabels:true,flags:southernAfricaFlags[country]?.firstFlags||{},detailFlags:southernAfricaFlags[country]?.detailFlags||{},hasStatistics:()=>true,attribution:`${definition.name}: <a href="data/southern-africa/${country}/sources.json">Boundary sources & coverage</a>`}]));
export async function addSouthernAfrica(map,host){
 const portals={};
 for(const [country,c] of Object.entries(configurations))portals[country]=await addRegionalCountry(map,host,c);
 return {portals,syncDeveloper(){for(const portal of Object.values(portals))portal.sync();}};
}
