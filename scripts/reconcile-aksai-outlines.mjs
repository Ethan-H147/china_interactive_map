// Keep the atlas's existing claim policy, but restore whole survey arcs rather
// than classifying isolated pieces by distance to a different country's survey.
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {load,linesOf,lineIndex,metres} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {selectFrontierArc,removeArcSegments,segmentKey} from './frontier-arcs.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {createHash} from 'node:crypto';

export async function reconcileAksaiOutlines(){
 const canonical=load('dist/data/europe/pakistan/resolved-china-frontiers.bin');
 const chinaPakistan=linesOf(fc(canonical.features.filter(f=>f.properties.resolvedFrontier==='CHN-PAK')))[0];
 const chinaIndia=linesOf(fc(canonical.features.filter(f=>f.properties.resolvedFrontier==='CHN-IND-WEST')))[0];
 if(metres(chinaPakistan[0],chinaIndia[0])>1)throw Error('China frontier references must share their retained junction');
 const outline=await command(load('dist/data/europe/india/first.bin').regions,'-dissolve');
 const reference=[...chinaPakistan.slice().reverse(),...chinaIndia.slice(1)];
 const {path,error}=selectFrontierArc(outline,reference,{maximumScoreMetres:100000});
 const keys=new Set(path.slice(1).map((p,i)=>segmentKey(path[i],p))),near=lineIndex([path]);
 // Retain the exact detailed India polygon edge, including all previously
 // omitted bends. It is an alternative claim outline only in India's view.
 const existing=load('dist/data/europe/india/international.bin');
 const without=removeArcSegments(existing,keys),features=[];
 for(const f of without.features){if(f.properties.resolvedFrontier==='IND-CHN-WEST-CLAIM')continue;for(const points of linesOf(fc([f]))){let run;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if([0,.25,.5,.75,1].every(t=>near([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])<1)){run=null;continue;}if(!run){run={...f,geometry:{type:'LineString',coordinates:[a]}};features.push(run);}run.geometry.coordinates.push(b);}}}
 features.push({type:'Feature',properties:{countries:['india'],claimedBy:'china',claimants:'india',disputed:true,resolvedFrontier:'IND-CHN-WEST-CLAIM'},geometry:{type:'LineString',coordinates:path}});
 const result=lineData(fc(features));
 write('europe/india/international.bin',result);
 // Natural Earth's KAS fragments are land inside the atlas's existing disputed
 // region, not a separate coast. Their background fill is retained unchanged.
 const world=load('dist/data/world-country-outlines.bin');
 const background=fc(world.features.filter(f=>!f.properties.countries.split(' ').every(id=>id==='KAS')));
 write('world-country-outlines.bin',background);
 const metaFile='dist/data/world-land-sources.json',meta=load(metaFile);
 meta.topology.delegatedOutlineCodes={...meta.topology.delegatedOutlineCodes,KAS:'Existing India/Pakistan/China atlas outlines cover this inland disputed source entity; its residual background fill is retained without false coastline strokes.'};
 meta.topology.outlineGroups=background.features.length;meta.outlineBytes=fs.statSync('dist/data/world-country-outlines.bin').size;
 fs.writeFileSync(metaFile,JSON.stringify(meta,null,2)+'\n');
 const report={policy:'Existing country fills and claim geometry are unchanged. India draws its complete detailed western China claim arc only in its own view; other views retain the canonical displayed China edge. KAS residual background fill has no coastline.',vertices:path.length,endpoints:[path[0],path.at(-1)],referenceEndpointDisplacementMetres:error,suppressedBackgroundOutlineCodes:['KAS']};
 fs.writeFileSync('dist/data/europe/india/western-frontier-reconciliation.json',JSON.stringify(report,null,2)+'\n');
 console.log('Western India claim arc:',path.length,'vertices;',world.features.length-background.features.length,'false background coast fragments removed');
 return {path,result,background};
}
function write(file,data){const text=JSON.stringify(data);fs.writeFileSync('dist/data/'+file,gzipSync(text,{level:9}));const compact='dist/data/compact/'+file;if(fs.existsSync(compact))fs.writeFileSync(compact,gzipSync(encodeGeo(data,{source:createHash('sha256').update(text).digest('hex')}),{level:9}));}
if(import.meta.url===pathToFileURL(process.argv[1]).href)await reconcileAksaiOutlines();
