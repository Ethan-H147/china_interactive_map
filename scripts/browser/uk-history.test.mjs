import assert from 'node:assert/strict';
import scenarios from './atlantic-history.test.mjs';
const enter=async p=>{await p.evaluate('document.getElementById("historical-snapshot").click()');await p.waitFor('map.getSource("united-kingdom-first")?.type==="vector"');await p.settle();};
const year=async(p,y)=>{await p.evaluate('document.querySelector('+JSON.stringify('#united-kingdom-history-dock [data-year="'+y+'"]')+').click()');await p.waitFor('currentAtlas().historicalYear==='+y);await p.settle();};
export default [scenarios.find(s=>s.name.startsWith('UK native history')),  {
    name: 'UK history keeps unrelated world frontiers through the zoom handoff',
    options: {width: 1280, height: 900},
    async run(p, base) {
      await p.send('Page.addScriptToEvaluateOnNewDocument', {source: "localStorage.setItem('boundary-atlas-globe-v1','true');"});
      await p.open(base, '#united-kingdom');
      await p.waitFor('AtlasGlobeOverviewController.snapshot().ready');
      const jump = async (point, zoom) => {
        await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:'+zoom+'})');
        await p.settle();
      };
      const frontiers = point => p.evaluate('(()=>{const p=map.project('+JSON.stringify(point)+
        ');return map.queryRenderedFeatures([[p.x-6,p.y-6],[p.x+6,p.y+6]]).filter(f=>f.layer.metadata?.atlasInternationalBorder).map(f=>({source:f.source,...f.properties}));})()');
      const rhine = [7.800197,48.581223], mongolia = [113.704781,44.786558];
      const probes = [
        ['France–Germany', rhine, f=>f.overviewOwner==='france', f=>f.previewLayer==='france-international'],
        ['China–Mongolia', mongolia, f=>f.neighbor==='mongolia', f=>f.neighbor==='mongolia'&&f.source==='shared-context-borders']
      ];
      const checkBorders = async stage => {
        for (const [name, point, coarse, precise] of probes) for (const zoom of [3.2,4.5,9]) {
          await jump(point, zoom);
          assert((await frontiers(point)).some(zoom<4?coarse:precise), name+' at zoom '+zoom+' '+stage);
        }
      };
      await checkBorders('in the modern map');
      await enter(p);
      await checkBorders('in the historical map');
      const ireland = [-7.18883,54.337649];
      for (const zoom of [3.2,7]) {
        await jump(ireland, zoom);
        assert(!(await frontiers(ireland)).some(f=>f.overviewOwner==='united-kingdom'||f.previewLayer==='united-kingdom-international'),
          'The modern Irish frontier stays hidden before partition');
      }
      const punjab = [74.580869,31.594254];
      await year(p, 1946);
      await jump(punjab, 7);
      assert(!(await frontiers(punjab)).some(f=>f.resolvedFrontier==='IND-PAK'), 'British India omits the modern Pakistan frontier');
      await year(p, 1947);
      assert((await frontiers(punjab)).some(f=>f.resolvedFrontier==='IND-PAK'), 'The Pakistan frontier returns after partition');
      await p.evaluate('void document.querySelector("#historical-snapshot").click()');
      await p.waitFor('map.getSource("united-kingdom-first")?.type==="geojson"');
      await jump(ireland, 7);
      assert((await frontiers(ireland)).some(f=>f.previewLayer==='united-kingdom-international'), 'Leaving history restores the original UK frontier');
    }
  }];
