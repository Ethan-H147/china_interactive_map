import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createCountryPage} from '../dist/country-page.mjs';
import {mountChinaPage} from '../dist/china-page.mjs';
import {koreaPanel} from '../dist/korea-panel.mjs';
import {mongoliaPanel} from '../dist/mongolia-panel.mjs';

class Element{constructor(){this.dataset={};}setAttribute(){}insertBefore(){}addEventListener(){}querySelectorAll(){return [];}}
globalThis.document={body:{insertAdjacentHTML(){}},createElement:()=>new Element(),querySelector:()=>new Element(),getElementById:()=>new Element()};
const pages=[['china',mountChinaPage().innerHTML],['korea',koreaPanel],['mongolia',mongoliaPanel]];
function adapter(file,context){
 const source=fs.readFileSync('dist/'+file,'utf8'),assignment=/(?:const )?sidebar=createCountryPage\(/.exec(source);
 assert(assignment,file+' uses the common page');
 const start=assignment.index+assignment[0].indexOf('createCountryPage(');
 const end=source.indexOf(');',start)+1;
 return vm.runInNewContext(source.slice(start,end),{createCountryPage,hasViews:false,hasCountryProfile:false,viewDefinitions:[],firstControls:context.maxLevel>1||!!context.c?.firstLabel&&context.c.firstLabel!=='Country',...context}).innerHTML;
}
pages.push(['japan',adapter('japan.mjs',{})]);
for(const [country,prefix,name,first,second] of [['philippines','ph','Philippines','Regions','Provinces'],['indonesia','id','Indonesia','Provinces','Regencies & cities']])pages.push([country,adapter('archipelago.mjs',{country,prefix,name,config:{first,second}})]);
for(const [country,prefix,name] of [['malaysia','my','Malaysia'],['singapore','sg','Singapore']])pages.push([country,adapter('southeast-asia.mjs',{country,prefix,c:{name},isMalaysia:country==='malaysia',base:'data/southeast-asia/'})]);
for(const country of ['brazil','argentina','uruguay'])pages.push([country,adapter('south-america.mjs',{})]);

pages.push(['russia',adapter('regional-country.mjs',{maxLevel:2,country:'russia',prefix:'ru',base:'data/russia/',c:{name:'Russia',lang:'ru',nationalFlag:'vendor/flag-ru.svg',secondLabel:'Districts'}})]);
for(const [country,prefix,name,firstLabel,secondLabel,thirdLabel] of [['south-africa','za','South Africa','Provinces','Districts & metros','Municipalities'],['eswatini','sz','Eswatini','Regions','Tinkhundla'],['lesotho','ls','Lesotho','Districts','Councils']])pages.push([country,adapter('regional-country.mjs',{maxLevel:thirdLabel?3:2,country,prefix,base:`data/southern-africa/${country}/`,c:{name,lang:'en',nationalFlag:`vendor/flag-${prefix}.svg`,firstLabel,secondLabel,thirdLabel}})]);
// Outline-only countries have one level: its selector and outline toggle stay in the page, hidden.
for(const [country,prefix,name] of [['united-kingdom','gb','United Kingdom'],['spain','es','Spain'],['france','fr','France'],['italy','it','Italy']]){
 const html=adapter('regional-country.mjs',{maxLevel:1,country,prefix,base:`data/europe/${country}/`,c:{name,lang:'en',nationalFlag:`vendor/flag-${prefix}.svg`,firstLabel:'Country'}});
 assert(new RegExp(`<select id="${prefix}-province" data-nav hidden>`).test(html)&&!html.includes(prefix+'-second-layer')&&!html.includes('undefined'),name+' has a single hidden level');
 pages.push([country,html]);
}

for(const [country,prefix,label]of [['united-states','us','States'],['canada','ca','Provinces'],['mexico','mx','States']]){
 const html=adapter('regional-country.mjs',{maxLevel:1,country,prefix,base:'data/europe/'+country+'/',c:{name:country,lang:'en',nationalFlag:'vendor/flag-'+prefix+'.svg',firstLabel:label}});
 assert(html.includes('<select id="'+prefix+'-province" data-nav>'),'A single subdivision level retains its selector');
 assert(!html.includes('<label hidden><span>'+label+' outlines'),'A single subdivision level retains its outline toggle');
 pages.push([country,html]);
}

// Read actual generated markup, rather than asserting the configuration shape.
function tree(html){
 const root={tag:'root',children:[]},stack=[root],nodes=[];
 for(const match of html.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)){
  const raw=match[0],tag=match[1];
  if(raw.startsWith('</')){assert.equal(stack.at(-1).tag,tag,'Balanced markup: '+raw);stack.pop();continue;}
  const attributes=Object.fromEntries([...raw.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  const node={tag,attributes,parent:stack.at(-1),children:[],raw};stack.at(-1).children.push(node);nodes.push(node);
  if(!raw.endsWith('/>')&&!['input','img','br','hr','meta','link'].includes(tag))stack.push(node);
 }
 assert.equal(stack.length,1,'Every page is complete');return nodes;
}
const descends=(node,parent)=>{for(let p=node.parent;p;p=p.parent)if(p===parent)return true;return false;};
for(const [country,html] of pages){
 const nodes=tree(html),byClass=value=>nodes.filter(n=>n.attributes.class?.split(' ').includes(value));
 const ids=nodes.map(n=>n.attributes.id).filter(Boolean);assert.equal(ids.length,new Set(ids).size,country+' retains unique element IDs');
 const selection=byClass('country-selection')[0],heading=byClass('country-selection-heading')[0],cards=byClass('country-info-cards')[0],subdivisions=byClass('country-subdivisions')[0],actions=byClass('country-place-actions')[0];
 assert.deepEqual(selection.children,[heading,cards,subdivisions,actions],country+' has the universal detail order');
 assert.equal(byClass('sidebar-tools').length,1);assert.equal(byClass('sidebar-scroll').length,1);assert.equal(byClass('sidebar-footer').length,1);
 assert.equal(byClass('search-wrap').length,1,country+' uses the universal search field');
 assert.equal(heading.children.filter(n=>n.tag==='h2').length,1,country+' uses the universal selected-place heading');
 assert.equal(byClass('country-card-anchor').length,1);assert(descends(byClass('country-card-anchor')[0],cards));assert(/\bhidden\b/.test(byClass('country-card-anchor')[0].raw),'No descriptive paragraph under the heading');
 for(const card of byClass('population'))assert(descends(card,cards),country+' population is an optional info card');
 for(const list of nodes.filter(n=>n.attributes.id?.endsWith('subdivisions')||n.attributes.id?.endsWith('code-details')||n.attributes.id?.endsWith('children')))assert(descends(list,subdivisions),country+' subdivisions use their shared slot');
 assert(!html.includes('Detailed borders load only for this state'));assert(!html.includes('Municipal boundaries appear only within the selected prefecture'));
}
console.log(`All ${pages.length} countries share one page structure, with unique IDs, optional info cards, subdivision slots, preserved controls, and no redundant heading prose.`);
