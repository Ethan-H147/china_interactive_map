import assert from 'node:assert/strict';
import {fixtureImagery} from './atlas-audit-helpers.mjs';
export default [1280,390].map(width=>({name:'Report current map view and support creator '+width,options:{width,height:960,mobile:width===390},async run(p,base){
 await fixtureImagery(p);await p.open(base,'#china');await p.evaluate('AtlasSettings.setSettings({motion:"reduce"})');
 await p.evaluate('selectRegion(regionByCode.get(140500),140000,false)');await p.settle();
 await p.evaluate('void map.jumpTo({center:[112.65,35.24],zoom:10.5})');await p.settle();
 const footer=await p.evaluate('(()=>{const sidebar=document.querySelector("#china-sidebar"),nav=sidebar.querySelector(".atlas-community"),a=nav.querySelector("a");return {report:nav.querySelector("button").textContent,support:a.textContent,href:a.href,target:a.target,credit:sidebar.textContent.includes("Created by Ethan Hu")}})()');
 assert.equal(footer.report,'Report a problem');assert.equal(footer.support,'Support creator');assert.equal(footer.href,'https://buymeacoffee.com/ethanhu147');assert.equal(footer.target,'_blank');assert.equal(footer.credit,false);
 await p.evaluate('document.querySelector("#china-sidebar [data-report-problem]").click()');
 assert.equal(await p.evaluate('document.activeElement.id'),'report-description');
 assert(await p.evaluate('document.querySelector("#atlas-report .report-location").textContent.includes("Jincheng")'));
 // Prevent external submission: inspect the prepared report without sending it.
 await p.evaluate('document.querySelector("#atlas-report form").addEventListener("submit",e=>e.preventDefault());document.querySelector("#report-description").value="Missing outline near Jiyuan";document.querySelector("#atlas-report form").requestSubmit()');
 const report=await p.evaluate('(()=>{const f=document.querySelector("#atlas-report form");return {action:f.action,title:f.elements.title.value,body:f.elements.body.value}})()');
 assert.equal(report.action,'https://github.com/Ethan-H147/china_interactive_map/issues/new');assert(report.title.includes('Jincheng'));assert(report.body.includes('Place ID: 140500'));assert(report.body.includes('Zoom: 10.5'));assert(report.body.includes('Missing outline near Jiyuan'));
 const view=await p.evaluate('AtlasView.fromHash(new URL('+JSON.stringify(report.body.split('Map view: ')[1])+').hash)');assert.equal(view.country,'china');assert.equal(view.selection,'140500');assert.deepEqual(view.center,[112.65,35.24]);assert.equal(view.zoom,10.5);
 await p.screenshot('report-problem-'+width);await p.key('Escape');assert.equal(await p.evaluate('document.querySelector("#atlas-report").open'),false);
 await p.evaluate('changeAtlas("canada",false)');await p.settle();
 await p.evaluate('document.querySelector("#canada-sidebar [data-report-problem]").click()');
 assert.equal(await p.evaluate('document.querySelector("#report-description").value'),'');assert((await p.evaluate('document.querySelector("#atlas-report .report-location").textContent')).startsWith('Canada'));
 assert.equal(await p.evaluate('document.querySelectorAll("#atlas-report").length'),1);await p.key('Escape');
}}));
