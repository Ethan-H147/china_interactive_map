import assert from 'node:assert/strict';
import {fixtureImagery} from './atlas-audit-helpers.mjs';
import {nationalCountryPalettes} from '../national-country-palettes.mjs';
const phone={width:390,height:844,mobile:true};
const active="[...document.querySelectorAll('aside.sidebar')].find(a=>!a.hidden&&getComputedStyle(a).display!=='none')";
async function handle(p){return p.evaluate(`(()=>{const b=${active}.querySelector('.sheet-handle').getBoundingClientRect();return[b.x+b.width/2,b.y+b.height/2]})()`);}
const frame=`(()=>{const box=e=>{const b=e.getBoundingClientRect();return{top:b.top,bottom:b.bottom,left:b.left,right:b.right,height:b.height,width:b.width}},a=${active};return{header:box(document.querySelector('.site-header')),map:box(document.getElementById('map')),canvas:box(map.getCanvas()),tools:box(a.querySelector('.sidebar-tools')),input:box(a.querySelector('.sidebar-tools input')),sheet:box(a),padding:AtlasSheet.navigationPadding(),viewport:document.querySelector('meta[name=viewport]').content}})()`;
export default [
 {name:'portrait map bleeds behind the status bar while header and sheet clear safe areas',options:phone,async run(p,base){
  await p.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:59,left:0,right:0,bottom:34}});
  await fixtureImagery(p);await p.open(base,'#united-kingdom');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");
  let f=await p.evaluate(frame);assert(f.viewport.includes('viewport-fit=cover'));assert.equal(f.canvas.top,0);assert.equal(f.canvas.left,0);assert.equal(f.canvas.width,390);assert(f.header.top>=59+12);assert(f.tools.bottom<=844-34);
  await p.tap(await handle(p));await p.tap(await handle(p));await p.settle();assert.equal(await p.evaluate('document.documentElement.dataset.sheet'),'full');f=await p.evaluate(frame);assert(f.sheet.top>=f.header.bottom+10,'Full sheet clears the status bar and title');
  await p.tap(await handle(p));await p.settle();await p.evaluate("document.getElementById('satellite-layer').click()");await p.waitFor('satelliteDisplay.state.hasTile');f=await p.evaluate(frame);assert.equal(f.canvas.top,0);assert.equal(f.canvas.height,844);await p.screenshot('mobile-polish-status-bar-imagery');
 }},
 {name:'country title pills contain the ink of descenders in platform fonts',options:phone,async run(p,base){
  await p.open(base,'#united-kingdom');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");
  for(const country of ['united-kingdom','egypt','fiji','equatorial-guinea']){
   if(country!=='united-kingdom'){await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)');await p.settle();}
   for(const family of ['Arial','Segoe UI']){
    const ink=await p.evaluate(`(()=>{const e=document.getElementById('atlas-title-english');e.style.fontFamily=${JSON.stringify(family)};const s=getComputedStyle(e),r=e.getBoundingClientRect(),c=document.createElement('canvas').getContext('2d');c.font=s.font;const m=c.measureText(e.textContent),baseline=(parseFloat(s.lineHeight)-m.fontBoundingBoxAscent-m.fontBoundingBoxDescent)/2+m.fontBoundingBoxAscent;return{top:baseline-m.actualBoundingBoxAscent,bottom:baseline+m.actualBoundingBoxDescent,height:r.height,pill:document.querySelector('.site-header h1').getBoundingClientRect().height}})()`);
    assert(ink.top>=0,country+' '+family+' ascenders');assert(ink.bottom<=ink.height-.4,country+' '+family+' descenders');assert(ink.height<ink.pill-8);
   }
   await p.screenshot('mobile-polish-title-'+country);
  }
 }},
 {name:'landscape map fills side cutouts while controls and country menu stay safe',options:{width:740,height:390,mobile:true},async run(p,base){
  await p.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,left:44,right:44,bottom:21}});await p.open(base,'#egypt');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");
  const f=await p.evaluate(frame);assert.equal(f.canvas.left,0);assert.equal(f.canvas.width,740);assert(f.header.left>=56&&f.header.right<=684);assert(f.padding.left>=62&&f.padding.right>=62);assert(f.input.left>=44&&f.input.right<=696);assert(f.tools.bottom<=369);
  await p.tap('#country-switch');const menu=await p.evaluate("(()=>{const b=document.getElementById('country-menu').getBoundingClientRect();return{left:b.left,right:b.right,bottom:b.bottom}})()");assert(menu.left>=44&&menu.right<=696);assert(menu.bottom<=369);assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));await p.screenshot('mobile-polish-landscape-safe-area');
 }},
 {name:'flag themes update map fill, selection and interface together during country switches',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#egypt');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");
  for(const country of ['egypt','senegal','fiji','tonga','palau','seychelles']){
   if(country!=='egypt'){await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)');await p.settle();}
   const theme=await p.evaluate(`(()=>{const s=getComputedStyle(document.documentElement);return{accent:s.getPropertyValue('--red').trim(),stripe:s.getPropertyValue('--header-stripe').trim(),background:map.getPaintProperty('background','background-color'),fills:JSON.stringify(map.getStyle().layers.filter(l=>l.type==='fill'&&l.id.startsWith(${JSON.stringify(country)})).map(l=>l.paint['fill-color']))}})()`),expected=nationalCountryPalettes[country];
   assert.equal(theme.accent,expected.accent);assert.equal(theme.stripe,expected.stripe);assert.equal(theme.background,expected.background);assert(theme.fills.includes(expected.fill));assert(theme.fills.includes(expected.selected));await p.screenshot('flag-theme-'+country);
  }
 }}
];
