import assert from 'node:assert/strict';
import {alignCountry,polygons} from './international-topology.mjs';

// IGN's generalized Salta/Formosa polygons leave a narrow gap along their nearly
// straight shared edge. Cleaning their union intersects those long edges far
// inland, turning the gap into a 129 km notch in the Pilcomayo frontier.
// Align that shared edge before dissolving; its northern junction is Salta's
// existing river vertex, never a computed intersection of near-parallel lines.
export function argentinaBorderTopology(features){
 const code=f=>String(f.properties.IN1??f.properties.in1??f.properties.id?.replace('AR-',''));
 const salta=features.find(f=>code(f)==='66'),formosa=features.find(f=>code(f)==='34');
 assert(salta&&formosa,'Salta and Formosa must be present for shared-border reconciliation');
 const shared=(a,b)=>[a,b].every(p=>p[0]>-62.345&&p[0]<-62.339&&p[1]>-24.5&&p[1]<-22.4)&&Math.abs(a[1]-b[1])>1;
 const tips=f=>polygons(f.geometry).flatMap(p=>p).flatMap(r=>r.slice(1).flatMap((b,i)=>shared(r[i],b)?[r[i],b]:[])).sort((a,b)=>b[1]-a[1]);
 const reference=tips(salta)[0],tip=tips(formosa)[0];
 assert(reference&&tip,'Expected the shared Salta/Formosa meridian edge');
 const {features:fixed,report}=alignCountry([formosa],structuredClone(salta),shared,500,shared,{anchors:new Map([[tip.join(','),reference]])});
 assert.equal(report.changedEdges,1,'Reconcile only the single shared meridian edge');
 return features.map(f=>f===formosa?fixed[0]:f);
}
