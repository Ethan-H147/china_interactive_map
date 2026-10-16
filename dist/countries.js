// The atlas's countries, each declared once: names, theme, route, release, map adapter,
// data paths and per-country view options. Every other file reads this list instead of
// naming countries. It runs first as a plain script (the entry screen needs it before any
// module loads); modules and Node scripts import it for the same global.
(()=>{
 if(globalThis.AtlasCountries)return;
 // ownFrontier: its own lines draw its frontiers while open, so the shared frontier layer
 // (data/atlas-frontiers.bin) hides them then.
 // motionLayers: drawn by the shared motion renderer (motion.mjs); motionData: has data/<id>-motion.bin.
 // Regional countries share one adapter (regional-country.mjs); their map settings live here,
 // and their statistics card adds density and shows only the economy figures a place has.
 const regional=(adapter,prefix,map,extra)=>({adapter,prefix,symbol:'ring',regionalStatistics:true,map,...extra});
 const countries={
  china:{en:'China',local:'中国',lang:'zh',background:'#f4f0e7',adapter:'china',prefix:'',symbol:'taiji',ownFrontier:true,motionLayers:true,motionData:true,
   titleClasses:['china-english','china-chinese'],mapLabel:'Interactive China administrative boundary map',
   statistics:'data/region-statistics.json',colors:{population:'china',levels:'Provinces & territories',geography:{id:'adcode',parent:'provinceCode'},layers:/^(province|prefecture|other|city-district)(-fragment)?-fill$/,primary:/^province(-fragment)?-fill$/},
   levelNames:['Provinces & territories','Subdivisions','City districts'],
   portal:{layer:'china-context',fill:'#e9dfc9'},hitLayers:['province-fill','province-fragment-fill','china-context'],home:{maxZoom:12},
   controls:['province-layer','prefecture-layer','other-layer','label-layer','satellite-layer','satellite-opacity','capital-layer','water-layer']},
  korea:{en:'Korea',local:'한반도',lang:'ko',background:'#edf1f6',adapter:'korea',prefix:'k',symbol:'taegeuk',motionLayers:true,motionData:true,satelliteFills:true,
   titleClasses:['korea-english','korean-title'],mapLabel:'Interactive map of North and South Korea',
   statistics:'data/region-statistics.json',colors:{catalogue:'data/korea-boundaries.bin',population:'korea',levels:'Provinces & special cities'},
   levelNames:['Provinces & special cities','Districts'],portal:{fill:'#e7edf5'},home:{bounds:[[124,33],[131.9,43.1]],maxZoom:9},
   controls:['k-province-layer','k-prefecture-layer','k-label-layer','k-capital-layer'],view:{scopes:['KP','KR']}},
  mongolia:{en:'Mongolia',local:'Монгол',lang:'mn-Cyrl',background:'#eaf1f5',adapter:'mongolia',prefix:'m',symbol:'soyombo',motionLayers:true,motionData:true,satelliteFills:true,
   mapLabel:'Interactive Mongolia province and district map',
   statistics:'data/region-statistics.json',colors:{catalogue:'data/mongolia-boundaries.bin',population:'mongolia',levels:'Provinces & capital'},
   levelNames:['Provinces & capital','Districts'],portal:{fill:'#d9e7ee'},home:{bounds:[[87.7,41.5],[120,52.2]]},
   controls:['m-province-layer','m-district-layer','m-label-layer','m-capital-layer']},
  japan:{en:'Japan',local:'日本',lang:'ja',background:'#f5f5f5',adapter:'japan',prefix:'j',symbol:'vendor/japan-chrysanthemum.png',motionData:true,satelliteFills:true,
   titleClasses:['korea-english','japanese-title'],mapLabel:'Interactive Japan prefecture and municipality map',
   statistics:'data/region-statistics.json',colors:{catalogue:'data/japan-boundaries.bin',extraCatalogue:'data/japan-local/catalogue.bin',population:'japan',levels:'Prefectures'},
   levelNames:['Prefectures','Municipalities','Municipalities & city wards'],portal:{fill:'#fffdfd'},home:{bounds:[[122.8,24],[146.2,45.7]]},
   controls:['j-province-layer','j-second-layer','j-label-layer']},
  philippines:{en:'Philippines',local:'Pilipinas',lang:'fil',background:'#edf2f8',adapter:'archipelago',prefix:'ph',symbol:'philippine-sun',
   statistics:'data/archipelago/philippines-statistics.json',colors:{catalogue:'data/archipelago/philippines-catalogue.bin',population:'philippines',levels:'Regions'},
   levelNames:['Regions','Provinces'],portal:{fill:'#e7edf6'},controls:['ph-province-layer','ph-second-layer','ph-label-layer']},
  indonesia:{en:'Indonesia',local:'',lang:'id',background:'#faf1ef',adapter:'archipelago',prefix:'id',symbol:'compass',ownFrontier:true,
   statistics:'data/archipelago/indonesia-statistics.json',colors:{catalogue:'data/archipelago/indonesia-catalogue.bin',levels:'Provinces'},
   levelNames:['Provinces','Regencies & cities'],portal:{fill:'#fff5f3'},controls:['id-province-layer','id-second-layer','id-label-layer']},
  malaysia:{en:'Malaysia',local:'',lang:'ms',background:'#f1f1e9',adapter:'southeast-asia',prefix:'my',symbol:'compass',ownFrontier:true,
   mapLabel:'Interactive Malaysia state and district map',
   statistics:'data/southeast-asia/malaysia-statistics.json',colors:{catalogue:'data/southeast-asia/malaysia-catalogue.bin',levels:'States & federal territories'},
   levelNames:['States & federal territories','Districts'],controls:['my-province-layer','my-second-layer','my-label-layer'],naturalEarth:'MYS',
   map:{flag:'my',center:[109,4],zoom:4,bounds:[[99.5,.8],[119.5,7.5]],fill:'#f5f0dd',selected:'#e7dca8',line:'#817244'}},
  singapore:{en:'Singapore',local:'新加坡',lang:'zh',background:'#f7f2f1',adapter:'southeast-asia',prefix:'sg',symbol:'compass',
   mapLabel:'Interactive Singapore country map',extraTitles:['atlas-title-malay','atlas-title-tamil'],
   statistics:'data/southeast-asia/singapore-statistics.json',colors:{catalogue:'data/southeast-asia/singapore-catalogue.bin',levels:'Regions',economy:false},
   levelNames:['Regions','Planning areas'],home:{maxZoom:12},controls:['sg-province-layer','sg-second-layer','sg-label-layer'],naturalEarth:'SGP',
   view:{languages:['zh','ms','en','ta'],language:'en'},
   map:{flag:'sg',center:[103.83,1.33],zoom:10,bounds:[[103.58,1.14],[104.12,1.49]],fill:'#fff6f5',selected:'#efcbc8',line:'#ad534e'}},
  brazil:{en:'Brazil',local:'Brasil',lang:'pt',background:'#eef3e9',adapter:'south-america',prefix:'south',symbol:'vendor/brazil-globe.svg',
   statistics:'data/south-america/brazil-statistics.json',colors:{levels:'States & Federal District',layers:/^south-brazil-fill$/,primary:/^south-brazil-fill$/},
   controls:['south-outlines','south-names','south-city-dots'],view:{scopes:['states','ddd','cep']},naturalEarth:'BRA',
   map:{flag:'br',center:[-52,-13],bounds:[[-74,-34],[-34,6]],color:'#dcebd9',line:'#527b59',selected:'#b9d6b2'}},
  uruguay:{en:'Uruguay',local:'',lang:'es',background:'#edf3f7',adapter:'south-america',prefix:'south',symbol:'vendor/uruguay-sun.svg',
   statistics:'data/south-america/uruguay-statistics.json',colors:{levels:'Departments',layers:/^south-uruguay-fill$/,primary:/^south-uruguay-fill$/,economy:false},
   controls:['south-outlines','south-names','south-city-dots'],naturalEarth:'URY',
   map:{flag:'uy',center:[-56,-33],bounds:[[-59,-35.5],[-53,-30]],color:'#e0edf4',line:'#5883a0',selected:'#bcd9ec'}},
  argentina:{en:'Argentina',local:'',lang:'es',background:'#edf3f7',adapter:'south-america',prefix:'south',symbol:'vendor/argentina-sun.svg',
   statistics:'data/south-america/argentina-statistics.json',colors:{levels:'Provinces & autonomous city',layers:/^south-argentina-fill$/,primary:/^south-argentina-fill$/,economy:false},
   controls:['south-outlines','south-names','south-city-dots'],view:{scopes:['cities']},naturalEarth:'ARG',
   map:{flag:'ar',center:[-65,-39],bounds:[[-74,-56],[-53,-21]],color:'#dfebf3',line:'#5883a0',selected:'#bcd9ec'}},
  russia:{en:'Russia',local:'Россия',lang:'ru',background:'#edf0f6',adapter:'russia',prefix:'ru',symbol:'matryoshka',worldCopies:true,
   statistics:'data/russia/statistics.json',colors:{catalogue:'data/russia/catalogue.bin',levels:'Federal subjects'},
   levelNames:['Federal subjects','Districts & cities'],hitLayers:['russia-first-fill','russia-portal-fill'],controls:['ru-province-layer','ru-second-layer','ru-label-layer'],
   map:{firstLabel:'Regions',secondLabel:'Districts',center:[100,61],zoom:2,bounds:[[19,41],[191,79]],fill:'#d8e2f0',selected:'#c5d2ed',line:'#5d7196'}},
  'south-africa':{en:'South Africa',local:'',lang:'en',background:'#eef2e9',...regional('southern-africa','za',
   {settlements:true,settlementBoundaries:true,phoneCodes:true,searchLabel:'Find a region, city or town',labelLanguages:[['both','Bilingual'],['en','English'],['af','Afrikaans'],['zu','isiZulu'],['xh','isiXhosa'],['ss','siSwati'],['st','Sesotho'],['tn','Setswana'],['nso','Sepedi'],['ts','Tsonga'],['ve','Tshivenda'],['nr','isiNdebele']],firstLabel:'Provinces',secondLabel:'Districts & metros',thirdLabel:'Municipalities',loadAllSubdivisions:true,lineTolerance:1.5,center:[25,-29],zoom:4,bounds:[[16.4,-35],[33.1,-22]],fill:'#e6eedc',selected:'#c7dbb2',line:'#577148'},
   {colors:{levels:'Provinces',economy:true},levelNames:['Provinces','Districts & metros','Municipalities & metros'],naturalEarth:'ZAF'})},
  botswana:{en:'Botswana',local:'',lang:'tn',background:'#edf3f6',...regional('southern-africa','bw',
   {settlements:true,searchLabel:'Find a district, city or village',firstLabel:'Districts',secondLabel:'Census subdistricts',thirdLabel:'Localities',loadAllSubdivisions:true,lineTolerance:1,center:[24,-22],zoom:4,bounds:[[19.8,-26.95],[29.5,-17.7]],fill:'#deecf2',selected:'#bad7e5',line:'#4a778e'},
   {colors:{levels:'Districts',economy:false},levelNames:['Districts','Census subdistricts','Localities'],naturalEarth:'BWA'})},
  namibia:{en:'Namibia',local:'',lang:'en',background:'#f5efe6',...regional('southern-africa','na',
   {settlements:true,searchLabel:'Find a region, constituency or town',firstLabel:'Regions',secondLabel:'Constituencies',loadAllSubdivisions:true,lineTolerance:1,center:[17.5,-22],zoom:4,bounds:[[11.6,-29],[25.4,-16.9]],fill:'#f1e7d6',selected:'#e1c99f',line:'#8e7044'},
   {colors:{levels:'Regions',economy:false},levelNames:['Regions','Constituencies'],naturalEarth:'NAM'})},
  eswatini:{en:'Eswatini',local:'eSwatini',lang:'ss',background:'#f5eee4',...regional('southern-africa','sz',
   {firstLabel:'Regions',secondLabel:'Tinkhundla',loadAllSubdivisions:true,center:[31.5,-26.55],zoom:7,bounds:[[30.75,-27.35],[32.15,-25.7]],fill:'#f4e8d9',selected:'#e8cfac',line:'#986e36'},
   {colors:{levels:'Regions',economy:false},levelNames:['Regions','Tinkhundla'],naturalEarth:'SWZ'})},
  lesotho:{en:'Lesotho',local:'',lang:'st',background:'#ecf3f5',...regional('southern-africa','ls',
   {firstLabel:'Districts',secondLabel:'Councils',loadAllSubdivisions:true,center:[28.25,-29.6],zoom:6,bounds:[[27,-30.7],[29.5,-28.5]],fill:'#e3eef1',selected:'#bfdce4',line:'#477585'},
   {colors:{levels:'Districts',economy:false},levelNames:['Districts','Community councils'],naturalEarth:'LSO'})},
  'united-kingdom':{en:'United Kingdom',local:'',lang:'en',background:'#eef1f6',...regional('europe','gb',
   {firstLabel:'Nations & regions',secondLabel:'Counties & unitaries',thirdLabel:'Districts',loadAllSubdivisions:true,settlements:true,labelLanguages:[['both','Bilingual'],['en','English'],['cy','Welsh']],searchLabel:'Find a region, council, city or town',statistics:true,center:[-3.2,54.6],zoom:4.6,bounds:[[-8.7,49.85],[1.8,60.9]],fill:'#e4e9f2',selected:'#c4d0e5',line:'#3d5683'},
   {colors:{levels:'Nations & regions'},levelNames:['Nations & regions','Counties & unitary authorities','Districts & unitaries'],naturalEarth:['GBR','FLK']})},
  spain:{en:'Spain',local:'España',lang:'es',background:'#f7f1e6',...regional('europe','es',
   {firstLabel:'Communities',secondLabel:'Provinces',thirdLabel:'Municipalities',bundledLevels:2,searchLabel:'Find a community, province or municipality',statistics:true,center:[-3.6,40.2],zoom:4.9,bounds:[[-9.4,35.9],[4.4,43.8]],fill:'#f4e7cb',selected:'#ebd09d',line:'#9c4a2f'},
   {colors:{levels:'Autonomous communities & cities'},levelNames:['Communities & autonomous cities','Provinces','Municipalities'],naturalEarth:'ESP'})},
  france:{en:'France',local:'',lang:'fr',background:'#eff1f7',...regional('europe','fr',
   {firstLabel:'Regions',secondLabel:'Departments',thirdLabel:'Communes',bundledLevels:2,neighbours:true,searchLabel:'Find a region, department or commune',statistics:true,center:[2.4,46.6],zoom:4.9,bounds:[[-5.2,41.3],[9.6,51.1]],fill:'#e3e8f4',selected:'#c3cce7',line:'#35508b'},
   {colors:{levels:'Regions'},levelNames:['Regions','Departments','Communes'],naturalEarth:['FRA','NCL','ATF']})},
  italy:{en:'Italy',local:'Italia',lang:'it',background:'#eef4ee',...regional('europe','it',
   {firstLabel:'Regions',secondLabel:'Provinces',thirdLabel:'Comuni',bundledLevels:2,searchLabel:'Find a region, province or comune',statistics:true,center:[12.6,42.2],zoom:4.8,bounds:[[6.6,35.5],[18.6,47.1]],fill:'#e3eedf',selected:'#c3dcbd',line:'#3e7845'},
   {colors:{levels:'Regions'},levelNames:['Regions','Provinces','Comuni'],naturalEarth:'ITA'})},
  iceland:{en:'Iceland',local:'Ísland',lang:'is',background:'#eef3f7',release:'developer',...regional('europe','is',
   {firstLabel:'Regions',secondLabel:'Municipalities',loadAllSubdivisions:true,settlements:true,searchLabel:'Find a region, municipality or town',statistics:true,center:[-18.6,64.95],zoom:5.6,bounds:[[-24.6,63.2],[-13.4,66.6]],fill:'#e2eaf3',selected:'#c2d3e8',line:'#2f5d8c'},
   {colors:{levels:'Regions'},levelNames:['Regions','Municipalities'],naturalEarth:'ISL'})},
  india:{en:'India',local:'भारत',lang:'hi',background:'#f8f2ea',release:'developer',...regional('europe','in',
   {firstLabel:'States',neighbours:true,searchLabel:'Find a state or union territory',statistics:true,center:[80.5,22.5],zoom:4.3,bounds:[[68,6.5],[97.5,37.1]],fill:'#f5e7d6',selected:'#ecc9a0',line:'#b5651d'},
   {colors:{levels:'States & union territories',economy:false},levelNames:['States & union territories'],naturalEarth:'IND'})},
  turkey:{en:'Turkey',local:'Türkiye',lang:'tr',background:'#f7efee',release:'developer',...regional('europe','tr',
   {firstLabel:'Regions',secondLabel:'Provinces',thirdLabel:'Districts',bundledLevels:2,settlements:true,searchLabel:'Find a region, province, district or city',statistics:true,center:[35.2,39.1],zoom:5.3,bounds:[[25.6,35.8],[44.9,42.2]],fill:'#f3e4e2',selected:'#e8c5c0',line:'#a8362c'},
   {colors:{levels:'Statistical regions'},levelNames:['Statistical regions','Provinces','Districts'],naturalEarth:'TUR'})}
 };
 const fallback='china',defaultLanguages=['en','local','both'];
 for(const [id,c] of Object.entries(countries)){
  c.id=id;
  if(c.adapter==='southern-africa'||c.adapter==='europe'){
   const base=`data/${c.adapter}/${id}/`,m=c.map;
   Object.assign(c,{base,statistics:base+'statistics.json',colors:{catalogue:base+'catalogue.bin',...c.colors}});
   c.hitLayers=[id+'-portal-fill',...['first','second','third'].map(level=>id+'-'+level+'-fill')];
   c.controls=[c.prefix+'-province-layer',...(m.secondLabel?[c.prefix+'-second-layer']:[]),...(m.thirdLabel?[c.prefix+'-third-layer']:[]),c.prefix+'-label-layer',...(m.settlements?[c.prefix+'-settlement-layer']:[])];
  }
  // The faded fill shown while another country is open; regional countries use their map fill.
  if(!c.portal&&c.map?.fill)c.portal={fill:c.map.fill};
  if(c.portal)c.portal.layer??=id+'-portal-fill';
  c.hitLayers??=c.portal?[id+'-first-fill',c.portal.layer]:[];
  c.panel=(c.prefix?c.prefix+'-':'')+'layers-panel';
  c.home??={};
  const languages=c.view?.languages||c.map?.labelLanguages?.map(([code])=>code)||defaultLanguages;
  c.view={scopes:[],...c.view,languages,language:c.view?.language||(languages.includes('both')?'both':languages[0]),maxMode:c.map?.thirdLabel?3:2};
 }
 const ids=Object.keys(countries);
 globalThis.AtlasCountries=Object.freeze({
  ids,countries,fallback,
  // Country routes: #<country>, #<country>/place=… and #<country>/view=….
  route:new RegExp('^#('+ids.join('|')+')(?:\\/(?:place|view)=.*)?$','i'),
  viewRoute:new RegExp('^#('+ids.join('|')+')\\/view=(.*)$','i'),
  byAdapter:adapter=>ids.filter(id=>countries[id].adapter===adapter)
 });
})();
