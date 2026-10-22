import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
// Preserve parentCity on each line feature so selecting a city can filter its borders.
export function countyBoundaries(regions){
 const groups=new Map();for(const f of regions.features){const id=f.properties.parentCity;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(f);}
 return {type:'FeatureCollection',features:[...groups].map(([parentCity,features])=>{const t=topology({regions:{type:'FeatureCollection',features}});return {type:'Feature',properties:{parentCity},geometry:mesh(t,t.objects.regions,(a,b)=>a!==b)};})};
}
