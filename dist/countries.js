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
  china:{en:'China',local:'中国',lang:'zh',background:'#f4f0e7',adapter:'china',prefix:'',symbol:'taiji',motionLayers:true,motionData:true,
   titleClasses:['china-english','china-chinese'],mapLabel:'Interactive China administrative boundary map',
   statistics:'data/region-statistics.json',colors:{population:'china',levels:'Provinces & territories',geography:{id:'adcode',parent:'provinceCode'},layers:/^(province|prefecture|other|city-district)(-fragment)?-fill$/,primary:/^province(-fragment)?-fill$/},
   levelNames:['Provinces & territories','Subdivisions','City districts'],
   portal:{layer:'china-context',fill:'#e9dfc9'},hitLayers:['province-fill','province-fragment-fill','china-context'],home:{maxZoom:12},
   controls:['province-layer','prefecture-layer','other-layer','label-layer','satellite-layer','satellite-opacity','capital-layer','water-layer']},
  korea:{en:'Korea',local:'한반도',lang:'ko',background:'#edf1f6',adapter:'korea',prefix:'k',symbol:'taegeuk',motionLayers:true,motionData:true,
   titleClasses:['korea-english','korean-title'],mapLabel:'Interactive map of North and South Korea',
   statistics:'data/region-statistics.json',colors:{catalogue:'data/korea-boundaries.bin',population:'korea',levels:'Provinces & special cities'},
   levelNames:['Provinces & special cities','Districts'],portal:{fill:'#e7edf5'},home:{bounds:[[124,33],[131.9,43.1]],maxZoom:9},
   controls:['k-province-layer','k-prefecture-layer','k-label-layer','k-capital-layer'],view:{scopes:['KP','KR']}},
  mongolia:{en:'Mongolia',local:'Монгол',lang:'mn-Cyrl',background:'#eaf1f5',adapter:'mongolia',prefix:'m',symbol:'soyombo',motionLayers:true,motionData:true,
   mapLabel:'Interactive Mongolia province and district map',
   statistics:'data/region-statistics.json',colors:{catalogue:'data/mongolia-boundaries.bin',population:'mongolia',levels:'Provinces & capital'},
   levelNames:['Provinces & capital','Districts'],portal:{fill:'#d9e7ee'},home:{bounds:[[87.7,41.5],[120,52.2]]},
   controls:['m-province-layer','m-district-layer','m-label-layer','m-capital-layer']},
  japan:{en:'Japan',local:'日本',lang:'ja',background:'#f5f5f5',adapter:'japan',prefix:'j',symbol:'vendor/japan-chrysanthemum.png',motionData:true,
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
  'vatican-city':{parent:'italy',mapLabel:'Interactive map of Vatican City and its landmarks',en:'Vatican City',local:'Città del Vaticano',lang:'it',background:'#f7f3e8',home:{maxZoom:16},...regional('europe','va',
   {firstLabel:'Country',searchLabel:'Find Vatican City',statistics:true,initialSelection:'VA',center:[12.4513,41.9035],zoom:15,bounds:[[12.4457878,41.9002048],[12.4583653,41.9073829]],fill:'#eee3bd',selected:'#eee3bd',line:'#9b792e',boundaryCredit:'© OpenStreetMap contributors · ODbL'},
   {colors:{levels:'Country',economy:false},levelNames:['Country'],symbol:'vendor/vatican-seal.png'})},
  ireland:{flagSet:'atlantic',en:'Ireland',local:'Éire',lang:'ga',background:'#f0f4eb',...regional('europe','ie',
   {boundaryCredit:'© Tailte Éireann · CC BY 4.0',firstLabel:'Regions',secondLabel:'Counties & cities',thirdLabel:'Municipal districts',deferOutlines:true,parallelDetails:true,searchDuration:550,searchLabel:'Find a county, city or district',statistics:true,center:[-8,53.4],zoom:5.6,bounds:[[-10.7,51.35],[-5.9,55.45]],fill:'#e4ecd9',selected:'#c7d9ac',line:'#57793b'},
   {colors:{levels:'Regional assembly areas',economy:true},levelNames:['Regions','Counties & cities','Municipal districts'],naturalEarth:'IRL'})},
  portugal:{flagSet:'atlantic',en:'Portugal',local:'',lang:'pt',background:'#f3f2e9',...regional('europe','pt',
   {boundaryCredit:'© Direção-Geral do Território · CAOP2025',firstLabel:'Districts & islands',secondLabel:'Municipalities',thirdLabel:'Parishes',deferOutlines:true,parallelDetails:true,searchDuration:550,searchLabel:'Find a district, municipality or parish',statistics:true,center:[-8,39.7],zoom:5.4,bounds:[[-9.6,36.9],[-6.1,42.2]],fill:'#e7ecda',selected:'#c5d3a4',line:'#52703b'},
   {colors:{levels:'Districts & autonomous regions',economy:true},levelNames:['Districts & autonomous regions','Municipalities','Civil parishes'],naturalEarth:'PRT'})},
  australia:{flagSet:'oceania',en:'Australia',local:'',lang:'en',background:'#f3f4eb',...regional('europe','au',
   {boundaryCredit:'© Commonwealth of Australia (ABS) · © OpenStreetMap contributors · ODbL',firstLabel:'States & territories',secondLabel:'Local government areas',deferOutlines:true,parallelDetails:true,searchDuration:550,searchLabel:'Find a state, council or territory',statistics:true,center:[134,-25.5],zoom:3.7,bounds:[[112,-44],[154,-10]],fill:'#e8edda',selected:'#d3dba7',line:'#657331'},
   {colors:{levels:'States & territories',economy:true},levelNames:['States & territories','Local government areas'],naturalEarth:['AUS','NFK','HMD','ATC','CXR','CCK']})},
  'new-zealand':{flagSet:'oceania',worldCopies:true,en:'New Zealand',local:'Aotearoa',lang:'mi',background:'#eef1f7',...regional('europe','nz',
   {boundaryCredit:'© Stats NZ · © Toitū Te Whenua LINZ · © OpenStreetMap contributors · ODbL',firstLabel:'Regions & islands',secondLabel:'Local areas',deferOutlines:true,parallelDetails:true,searchDuration:550,searchLabel:'Find a region, district or island',statistics:true,center:[172.5,-40.8],zoom:4.5,bounds:[[165,-47.5],[179.3,-33.8]],fill:'#e2e8f3',selected:'#bccce6',line:'#3e5f91'},
   {colors:{levels:'Regions & islands',economy:true},levelNames:['Regions & islands','Territorial authorities & island groups'],naturalEarth:['NZL','COK','NIU','TKL']})},
  denmark:{flagSet:'europe-expansion',en:'Denmark',local:'Danmark',lang:'da',background:'#f8eeee',...regional('europe','dk',
   {boundaryCredit:'© EuroGeographics · © Umhvørvisstovan · geoBoundaries',firstLabel:'Regions & territories',secondLabel:'Municipalities',bundledLevels:2,settlements:true,searchLabel:'Find a region, municipality or territory',statistics:true,center:[10.2,56.1],zoom:5.5,bounds:[[8.0,54.55],[15.3,57.9]],fill:'#f2e2df',selected:'#e6bbb6',line:'#a33b36'},
   {colors:{levels:'Regions & territories',economy:true},levelNames:['Regions & territories','Municipalities & unincorporated areas'],naturalEarth:['DNK','GRL','FRO']})},
  'germany':{flagSet:'europe-expansion',en:"Germany",local:"Deutschland",lang:"de",background:"#edf0eb",...regional('europe',"de",
   {"boundaryCredit":"© EuroGeographics for the administrative boundaries","firstLabel":"States","secondLabel":"Districts & cities","bundledLevels":2,"thirdLabel":"Municipalities","searchLabel":"Find a region or subdivision","statistics":true,"center":[10.4,51.1],"zoom":5.2,"bounds":[[5.8,47.25],[15.1,55.15]],"fill":"#e4eadc","selected":"#c4d4ac","line":"#5d6f31"},
   {"colors":{"levels":"States","economy":true},"levelNames":["States","Districts & cities","Municipalities"],"naturalEarth":"DEU"})},
  'belgium':{flagSet:'europe-expansion',en:"Belgium",local:"België · Belgique · Belgien",lang:"nl",background:"#f6f0e5",...regional('europe',"be",
   {"boundaryCredit":"© EuroGeographics for the administrative boundaries","firstLabel":"Regions","secondLabel":"Provinces & Brussels","bundledLevels":2,"thirdLabel":"Municipalities","searchLabel":"Find a region or subdivision","statistics":true,"center":[4.7,50.8],"zoom":6.8,"bounds":[[2.5,49.4],[6.5,51.6]],"fill":"#f2e6cf","selected":"#e3cc99","line":"#8c7134"},
   {"colors":{"levels":"Regions","economy":true},"levelNames":["Regions","Provinces & Brussels","Municipalities"],"naturalEarth":"BEL"})},
  'switzerland':{en:"Switzerland",local:"Schweiz · Suisse · Svizzera · Svizra",lang:"de",background:"#f8efef",...regional('europe',"ch",
   {"firstLabel":"Cantons","secondLabel":"Districts & municipalities","bundledLevels":2,"thirdLabel":"Municipalities","searchLabel":"Find a region or subdivision","statistics":true,"center":[8.2,46.8],"zoom":6.5,"bounds":[[5.9,45.8],[10.6,47.85]],"fill":"#f2e1df","selected":"#e6bfba","line":"#a8433b"},
   {"colors":{"levels":"Cantons","economy":true},"levelNames":["Cantons","Districts & municipalities","Municipalities"],"naturalEarth":"CHE"})},
  'netherlands':{additionalFlagSets:['atlantic'],flagSet:'europe-expansion',en:"Netherlands",local:"Nederland",lang:"nl",background:"#f7f1e9",...regional('europe',"nl",
   {"boundaryCredit":"© EuroGeographics for the administrative boundaries","firstLabel":"Provinces & Caribbean","secondLabel":"Municipalities","bundledLevels":2,"searchLabel":"Find a province, municipality or island","statistics":true,"center":[5.3,52.2],"zoom":6.3,"bounds":[[3.3,50.7],[7.25,53.6]],"fill":"#f2e6d8","selected":"#e8c9a4","line":"#a2642a"},
   {"colors":{"levels":"Provinces & Caribbean","economy":true},"levelNames":["Provinces & Caribbean","Municipalities"],"naturalEarth":["NLD","ABW","CUW","SXM","BES"]})},
  'united-states':{flagSet:'north-america',worldCopies:true,en:"United States",local:"",lang:"en",background:"#edf1f7",...regional('europe',"us",
   {"boundaryCredit":"© OpenStreetMap contributors · ODbL (Minor Outlying Islands)","firstLabel":"States & territories","secondLabel":"Counties & equivalents","areaCodes":true,"deferOutlines":true,"parallelDetails":true,"searchDuration":550,"thirdLabel":"Municipalities","thirdScope":"state","censusPlaces":true,"municipalFacts":"municipalities/facts.json","thematicViews":[{"id":"zip-codes","label":"ZIP codes","outlineLabel":"ZIP-area outlines","hint":"Choose a state or territory, or search a ZIP code."}],"searchLabel":"Find a US place or code","statistics":true,"center":[-98.5,38.5],"zoom":3.6,"bounds":[[-125,24.4],[-66.8,49.5]],"fill":"#e1e8f3","selected":"#bccde7","line":"#3f6296"},
   {"colors":{"levels":"States & territories","economy":true},"levelNames":["States & territories","Counties & equivalents","Municipalities"],"view":{"scopes":["area-codes","zip-codes"]},"naturalEarth":["USA","PRI","VIR","ASM","GUM","MNP","UMI"]})},
  'canada':{flagSet:'north-america',en:"Canada",local:"",lang:"en",background:"#f7eeee",...regional('europe',"ca",
   {"firstLabel":"Provinces & territories","secondLabel":"Census divisions","thirdLabel":"Municipalities & equivalents","deferOutlines":true,"parallelDetails":true,"searchDuration":550,"municipalFacts":"municipalities/facts.json","searchLabel":"Find a Canadian municipality or region","statistics":true,"center":[-103,60],"zoom":2.7,"bounds":[[-141.1,41.6],[-52.4,83.2]],"fill":"#f2e1df","selected":"#e4bbb8","line":"#a33d3d"},
   {"colors":{"levels":"Provinces & territories","economy":true},"levelNames":["Provinces & territories","Census divisions","Municipalities & equivalents"],"naturalEarth":"CAN"})},
  'mexico':{en:"Mexico",local:"México",lang:"es",background:"#eef4ed",...regional('europe',"mx",
   {"water":"water.bin","waterAttribution":"Water: <a href=\"data/europe/mexico/water-sources.json\">SEMARNAT / CONAGUA</a>","firstLabel":"States & Mexico City","searchLabel":"Find a state or federal district","statistics":true,"center":[-102.5,23.8],"zoom":4,"bounds":[[-118.5,14.4],[-86.4,32.8]],"fill":"#e1eedd","selected":"#bdd8b5","line":"#477a40"},
   {"colors":{"levels":"States & Mexico City","economy":true},"levelNames":["States & Mexico City"],"naturalEarth":"MEX"})},
  iceland:{en:'Iceland',local:'Ísland',lang:'is',background:'#eef3f7',...regional('europe','is',
   {firstLabel:'Regions',secondLabel:'Municipalities',loadAllSubdivisions:true,settlements:true,searchLabel:'Find a region, municipality or town',statistics:true,center:[-18.6,64.95],zoom:5.6,bounds:[[-24.6,63.2],[-13.4,66.6]],fill:'#e2eaf3',selected:'#c2d3e8',line:'#2f5d8c'},
   {colors:{levels:'Regions'},levelNames:['Regions','Municipalities'],naturalEarth:'ISL'})},
  morocco:{en:'Morocco',local:'المغرب',lang:'ar',background:'#f6efeb',...regional('europe','ma',
   {firstLabel:'Regions',secondLabel:'Provinces & prefectures',thirdLabel:'Communes',deferOutlines:true,parallelDetails:true,searchLabel:'Find a region, province or commune',statistics:true,center:[-8.5,29],zoom:4.5,bounds:[[-17.2,20.7],[-.95,36]],fill:'#f1e4da',selected:'#e5c3ad',line:'#a34b3d',boundaryCredit:'© OpenStreetMap contributors · ODbL 1.0'},
   {colors:{levels:'Regions',economy:false},levelNames:['Regions','Provinces & prefectures','Communes'],naturalEarth:['MAR','SAH']})},
  thailand:{en:'Thailand',local:'ประเทศไทย',lang:'th',background:'#f4f0f6',...regional('europe','th',
   {firstLabel:'Provinces & Bangkok',secondLabel:'Districts',thirdLabel:'Subdistricts & islands',deferOutlines:true,parallelDetails:true,searchLabel:'Find a province, district or subdistrict',statistics:true,center:[101,15],zoom:4.7,bounds:[[97.3,5.5],[105.7,20.6]],fill:'#eee7f1',selected:'#d9c5df',line:'#725286'},
   {colors:{levels:'Provinces & Bangkok',economy:false},levelNames:['Provinces & Bangkok','Districts','Subdistricts & islands'],naturalEarth:'THA'})},
  vietnam:{en:'Vietnam',local:'Việt Nam',lang:'vi',background:'#f8efeb',...regional('europe','vn',
   {firstLabel:'Provinces & cities',secondLabel:'Communes & wards',deferOutlines:true,parallelDetails:true,searchLabel:'Find a province, commune, ward or special zone',statistics:true,center:[107,16],zoom:4.7,bounds:[[102.1,8.1],[109.6,23.5]],fill:'#f3e5dc',selected:'#e8c2ac',line:'#aa5237'},
   {colors:{levels:'Provinces & cities',economy:false},levelNames:['Provinces & cities','Communes, wards & special zones'],naturalEarth:'VNM'})},
  india:{en:'India',local:'भारत',lang:'hi',background:'#f8f2ea',...regional('europe','in',
   {firstLabel:'States & union territories',neighbours:true,nameVariants:{collapseAfter:3},searchLabel:'Find a state or union territory',statistics:true,center:[80.5,22.5],zoom:4.3,bounds:[[68,6.5],[97.5,37.1]],fill:'#f5e7d6',selected:'#ecc9a0',line:'#b5651d'},
   {colors:{levels:'States & union territories',economy:false},levelNames:['States & union territories'],naturalEarth:'IND'})},
  chile:{en:'Chile',local:'',lang:'es',background:'#f0f3f9',...regional('europe','cl',
   {firstLabel:'Regions',secondLabel:'Provinces',thirdLabel:'Communes',bundledLevels:2,neighbours:true,settlements:true,searchLabel:'Find a region, province, commune or city',statistics:true,center:[-71,-37],zoom:3.6,bounds:[[-76,-56],[-66.4,-17.5]],fill:'#e5eaf4',selected:'#c3cfe8',line:'#2b4c9b'},
   {colors:{levels:'Regions',economy:false},levelNames:['Regions','Provinces','Communes'],naturalEarth:'CHL'})},
  paraguay:{en:'Paraguay',local:'',lang:'es',background:'#f1f6f1',...regional('europe','py',
   {firstLabel:'Departments',secondLabel:'Districts',loadAllSubdivisions:true,neighbours:true,searchLabel:'Find a department or district',statistics:true,center:[-58.4,-23.4],zoom:5.6,bounds:[[-62.7,-27.7],[-54.2,-19.2]],fill:'#e5efe6',selected:'#c3dbc6',line:'#3d6b4a'},
   {colors:{levels:'Departments & Asunción',economy:false},levelNames:['Departments','Districts'],naturalEarth:'PRY'})},
  peru:{en:'Peru',local:'Perú',lang:'es',background:'#f9f0ef',...regional('europe','pe',
   {firstLabel:'Departments',secondLabel:'Provinces',thirdLabel:'Districts',bundledLevels:2,neighbours:true,settlements:true,searchLabel:'Find a department, province, district or city',statistics:true,center:[-75,-9.2],zoom:4.6,bounds:[[-81.4,-18.4],[-68.6,-0.03]],fill:'#f6e3e1',selected:'#ebc3bf',line:'#b3262f'},
   {colors:{levels:'Departments & Callao',economy:false},levelNames:['Departments','Provinces','Districts'],naturalEarth:'PER'})},
  turkey:{en:'Turkey',local:'Türkiye',lang:'tr',background:'#f7efee',...regional('europe','tr',
   {firstLabel:'Regions',secondLabel:'Provinces',thirdLabel:'Districts',bundledLevels:2,settlements:true,searchLabel:'Find a region, province, district or city',statistics:true,center:[35.2,39.1],zoom:5.3,bounds:[[25.6,35.8],[44.9,42.2]],fill:'#f3e4e2',selected:'#e8c5c0',line:'#a8362c'},
   {colors:{levels:'Statistical regions'},levelNames:['Statistical regions','Provinces','Districts'],naturalEarth:'TUR'})}
 };
 const fallback='china',defaultLanguages=['en','local','both'];
 for(const [id,c] of Object.entries(countries)){
  c.id=id;
  if(['united-states','canada','spain','france','germany','italy','malaysia','india','morocco'].includes(id))c.quiz={level:1,...(id==='spain'?{exclude:['ES-A-20']}: {}),...(id==='united-states'?{bounds:c.map.bounds,insets:['US-AK','US-HI']}: {})};
  if(c.adapter==='southern-africa'||c.adapter==='europe'){
   const base=`data/${c.adapter}/${id}/`,m=c.map;
   Object.assign(c,{base,statistics:base+'statistics.json',colors:{catalogue:base+'catalogue.bin',...c.colors}});
   c.hitLayers=[id+'-portal-fill',...['first','second','third'].map(level=>id+'-'+level+'-fill')];
   c.controls=[c.prefix+'-province-layer',...(m.secondLabel?[c.prefix+'-second-layer']:[]),...(m.thirdLabel?[c.prefix+'-third-layer']:[]),c.prefix+'-label-layer',...(m.settlements?[c.prefix+'-settlement-layer']:[]),...(m.water?[c.prefix+'-water-layer']:[]),...(m.censusPlaces?[c.prefix+'-census-places']:[])];
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
