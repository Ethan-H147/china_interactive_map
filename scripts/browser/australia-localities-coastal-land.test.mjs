import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {searchAndSelect} from './countries.test.mjs';
const catalogue=JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/australia/catalogue.bin')));
// Fixed regression locations, independent of the cleanup report. These were
// incorrectly owned by the selected suburb on the opposite bank of the water.
const cases=[
 {name:'Brooklyn',fringe:[151.24921922300487,-33.58996589566601]},
 {name:'Box Head',fringe:[151.3206709574302,-33.52542740062781],anchors:[[151.31794180859376,-33.55716994140625]]},
 {name:'Patonga',fringe:[151.30509415160893,-33.574999348307124]},
 {name:'Narrabeen',fringe:[151.30601850145564,-33.702897699537814]},
 {name:'Dee Why',fringe:[151.298790072246,-33.74541382494316]},
 {name:'Berowra Waters',fringe:[151.12433211792663,-33.543343094387666],anchors:[[151.10985834958706,-33.58603145530181],[151.1113759649672,-33.50640538516054],[151.16959722404454,-33.53918180475705]]},
 {name:'Mooney Mooney',fringe:[151.19338312736394,-33.51172428936271],anchors:[[151.21196038671874,-33.53100331640625],[151.21234100488286,-33.512438620117194]]},
 {name:'Woy Woy',fringe:[151.3028822576635,-33.494463169542314]},
 {name:'Berowra',fringe:[151.17438669322863,-33.626273455185334]},
 {name:'Fullerton Cove',fringe:[151.80768578792222,-32.820298324563055]},
 {name:'Kooragang',fringe:[151.7685381572671,-32.895886859376084],anchors:[[151.7909112757361,-32.88351237034403]]}
];
export default cases.map(({name,fringe,anchors=[]})=>({name:'Coastal suburb selection without remote slivers: '+name,options:{width:1500,height:1050},async run(p,base){
 const r=catalogue.records.find(r=>r.level===3&&r.parent==='AU-NSW'&&r.en===name);assert(r);
 await p.open(base,'#australia');await p.evaluate('AtlasComfort.set({appearance:"light"})');
 assert(await p.evaluate('!!document.getElementById("mode-third")?.getClientRects().length'),'Third level remains visible');
 await searchAndSelect(p,name+' NSW',name,'Suburb / locality');await p.waitFor('document.getElementById("australia-sidebar").getAttribute("aria-busy")!=="true"',{timeout:60000});await p.settle();
 assert.equal(await p.evaluate('currentAtlas().getSelection()'),r.id);assert.equal(await p.evaluate('currentAtlas().getMode()'),3);
 await p.screenshot('coastal-suburbs-after-'+name.replaceAll(' ','-'));
 for(const q of [r.center,...anchors]){await p.evaluate('void map.jumpTo({center:'+JSON.stringify(q)+',zoom:15})');await p.settle();assert.equal(await p.evaluate('currentAtlas().hoverAt(map.project('+JSON.stringify(q)+'))?.id'),r.id,'Real mainland and island components remain selectable');assert(await p.evaluate('map.queryRenderedFeatures(map.project('+JSON.stringify(q)+'),{layers:["australia-third-selection-fill"]}).some(f=>f.properties.id==='+JSON.stringify(r.id)+')'),'Retained component still highlights');}
 for(const zoom of [12,15]){await p.evaluate('void map.jumpTo({center:'+JSON.stringify(fringe)+',zoom:'+zoom+'})');await p.settle();assert.notEqual(await p.evaluate('currentAtlas().hoverAt(map.project('+JSON.stringify(fringe)+'))?.id'),r.id,'Former sliver does not hover as a distant suburb');assert(!await p.evaluate('map.queryRenderedFeatures(map.project('+JSON.stringify(fringe)+'),{layers:["australia-third-selection-fill","australia-third-selected"]}).some(f=>f.properties.id==='+JSON.stringify(r.id)+')'),'No selected fill or outline at former sliver');}
 await p.key('Escape');await p.settle();const xy=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(fringe)+'),b=map.getCanvas().getBoundingClientRect();return[q.x+b.x,q.y+b.y]})()');await p.tap(xy);await p.settle();assert.notEqual(await p.evaluate('currentAtlas().getSelection()'),r.id,'Click cannot select the distant suburb');assert(!await p.evaluate('!!map.getSource("australia-second")'),'Existing single detail source');assert.equal(await p.evaluate('mapScene.assertOrder()'),true);
}}));
