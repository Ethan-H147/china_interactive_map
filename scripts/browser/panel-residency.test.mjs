import assert from 'node:assert/strict';
export default [{name:'inactive regional panels retain exact nodes and controls through country switches',options:{width:1300,height:820},async run(p,base){
 await p.open(base,'#china');await p.waitFor('atlasesReady&&europe.status("norway")==="ready"');await p.settle();
 assert(await p.evaluate('document.querySelectorAll("input,select,textarea").length')<250,'Unopened country controls stay out of native browser scans');
 await p.evaluate('changeAtlas("norway",false)');await p.settle();
 await p.evaluate('window.savedRegionalPage=document.getElementById("norway-sidebar");window.savedRegionalControl=savedRegionalPage.querySelector("input[id$=label-layer]");savedRegionalControl.checked=false;savedRegionalControl.dispatchEvent(new Event("change",{bubbles:true}));void 0');
 assert(await p.evaluate('savedRegionalPage.isConnected&&savedRegionalPage.querySelectorAll(".view-preferences").length===1'),'View controls mount with the page');
 await p.evaluate('changeAtlas("canada",false)');await p.settle();
 assert(await p.evaluate('!savedRegionalPage.isConnected&&!document.getElementById("norway-sidebar")'),'Leaving parks the hidden panel');
 assert(await p.evaluate('!savedRegionalControl.checked&&savedRegionalPage.contains(savedRegionalControl)'),'Parking retains control state and identity');
 await p.evaluate('changeAtlas("china",false)');await p.settle();await p.evaluate('changeAtlas("norway",false)');await p.settle();
 assert(await p.evaluate('document.getElementById("norway-sidebar")===savedRegionalPage&&savedRegionalPage.querySelector("input[id$=label-layer]")===savedRegionalControl'),'Returning restores the original nodes');
 assert(await p.evaluate('!savedRegionalControl.checked'),'The saved layer preference is restored');
 await p.evaluate('savedRegionalControl.click();void 0');await p.settle();assert(await p.evaluate('savedRegionalControl.checked'),'The original event handler remains attached');
 assert.equal(await p.evaluate('savedRegionalPage.querySelectorAll(".view-preferences").length'),1,'Shared view controls are never duplicated');
 assert(await p.evaluate('mapScene.assertOrder()'));assert(await p.evaluate('document.querySelectorAll("input,select,textarea").length')<275,'Visits do not accumulate inactive controls');
 }}];
