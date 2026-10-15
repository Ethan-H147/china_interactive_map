import assert from 'node:assert/strict';
export default [
 ...[['korea','k','Busan'],['mongolia','m','Ulaanbaatar']].map(([country,prefix,query])=>({
  name:country+': Enter selects and Escape dismisses search',options:{width:1280,height:820},async run(page,base){
   await page.open(base,'#'+country);
   await page.tap('#'+prefix+'-search');await page.type(query);
   await page.waitFor(`!!document.querySelector('#${prefix}-search-results button')`,{label:'search results'});
   await page.key('Escape');
   assert(await page.evaluate(`document.getElementById('${prefix}-search-results').hidden`));
   await page.key('Enter');
   assert(await page.evaluate(`document.getElementById('breadcrumb-region').hidden`),'Enter does not choose a dismissed result');
   // A space refreshes the existing query if native Escape kept it; otherwise retype it.
   const value=await page.evaluate(`document.getElementById('${prefix}-search').value`);
   await page.type(value?' ':query);
   await page.waitFor(`!document.getElementById('${prefix}-search-results').hidden&&!!document.querySelector('#${prefix}-search-results button')`,{label:'visible search results'});
   await page.key('Enter');await page.settle();
   assert(await page.evaluate(`document.getElementById('breadcrumb-region').textContent.includes('${query}')`),'Enter selects '+query);
  }
 }))
];
