// Runs before styles and map imports, so a returning visitor never sees the
// wrong country's title or loading screen while boundaries are downloaded.
(()=>{
 const registry=window.AtlasCountries,countries=registry.countries;
 const storageKey='boundary-atlas-country-v1';
 const fromHash=hash=>registry.route.exec(hash)?.[1].toLowerCase()||(hash.startsWith('#place=')?'china':null);
 let saved;try{saved=localStorage.getItem(storageKey);}catch{}
 const allowed=country=>window.AtlasDev.allows(country);
 const requested=fromHash(location.hash)||(countries[saved]?saved:registry.fallback);
 const initial=allowed(requested)?requested:registry.fallback;
 // China's packed boundaries are the largest startup download; begin before styles
 // and modules. app.js takes these responses instead of requesting the files again.
 const early={};
 if(initial==='china')for(const [key,url] of [['chinaPack','data/china-boundaries.pack.bin'],['chinaRegions','data/china-regions.json']]){early[key]=fetch(url);early[key].catch(()=>{});}
 let current=initial;
 const root=document.documentElement;root.dataset.atlas=initial;root.dataset.starting='true';
 function persist(country){try{localStorage.setItem(storageKey,country);}catch{}}
 function setUrl(country,preservePlace=true){
  if(preservePlace&&location.hash.startsWith('#'+country+'/view='))return;
  const place=country==='china'&&preservePlace?(/^#(?:china\/)?place=(.*)$/.exec(location.hash)?.[1]??null):null;
  history.replaceState(null,'',location.pathname+location.search+'#'+country+(place!==null?'/place='+place:''));
 }
 if(initial){persist(initial);setUrl(initial);document.title=countries[initial].en+(countries[initial].local?' · '+countries[initial].local:'');}
 function paint(){
  const info=countries[current];root.dataset.atlas=current;document.body.dataset.atlas=current;
  const $=id=>document.getElementById(id);
  if($('atlas-title-english')){$('atlas-title-english').textContent=info?.en||'Atlas';$('atlas-title-english').className=(info?.titleClasses?.[0]||'korea-english')+' title-english';}
  if($('atlas-title-local')){$('atlas-title-local').textContent=info?.local||'';$('atlas-title-local').className=(info?.titleClasses?.[1]||'mongolia-title')+' title-local';$('atlas-title-local').lang=info?.lang||'en';}
  for(const id of new Set(Object.values(countries).flatMap(c=>c.extraTitles||[])))if($(id))$(id).hidden=!info?.extraTitles?.includes(id);
  document.title=info.en+(info.local?' · '+info.local:'');
  document.querySelectorAll('[data-country-symbol]').forEach(el=>{el.innerHTML=info?AtlasSymbols.markup(current):'';});
  if($('loading-label'))$('loading-label').textContent=info?'Loading '+info.en+' map…':'Loading atlas…';
  if($('home'))$('home').textContent='All '+(info?.en||'countries');
  if($('map')&&info)$('map').setAttribute('aria-label',info.mapLabel||'Interactive '+info.en+' administrative boundary and island map');
 }
 window.AtlasEntry={initial,countries,fromHash,mount:paint,takeEarly(key){const response=early[key];delete early[key];return response;},remember(country,{preservePlace=true}={}){if(!countries[country]||!allowed(country))return;current=country;persist(country);setUrl(country,preservePlace);paint();},ready(){delete root.dataset.starting;},get current(){return current;}};
 // Title spans for a country, as the header draws them (country-menu.js reuses them).
 window.AtlasEntry.titleParts=country=>{const info=countries[country];return [{text:info.en,lang:'en',className:(info.titleClasses?.[0]||'korea-english')+' title-english'},{text:info.local||'',lang:info.lang||'en',className:(info.titleClasses?.[1]||'mongolia-title')+' title-local'},...(info.extraTitles||[]).map(id=>{const el=document.getElementById(id);return {text:el?.textContent||'',lang:el?.lang||'',className:id.replace('atlas-','')};})];};
 window.addEventListener('hashchange',()=>{const country=fromHash(location.hash);if(root.dataset.starting&&country)window.AtlasEntry.remember(country);});
})();
