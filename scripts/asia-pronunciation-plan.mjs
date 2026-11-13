import {gunzipSync} from 'node:zlib';
export async function addAsiaPronunciations(read,add){
 const china=JSON.parse(await read('data/china-regions.json'));
 for(const {properties:p} of china.subdivisions.filter(x=>['city','taiwan-region'].includes(x.properties.level)))
  add('china',p.adcode,2,p.englishName||p.name,p.name,'zh',{locale:'zh',context:'请用自然清晰的普通话读一次这个行政区名称，不要添加介绍或音乐。'});
 for(const [country,file,language] of [['indonesia','archipelago/indonesia','id'],['malaysia','southeast-asia/malaysia','ms']]){
  const {records}=JSON.parse(gunzipSync(await read('data/'+file+'-catalogue.bin')));
  for(const r of records.filter(x=>x.level===1)){
   const name=country==='indonesia'&&r.id==='ID31'?'Jakarta':r.local||r.en;
   add(country,r.id,1,r.en,name,language,{locale:language,context:country==='indonesia'?'Ucapkan nama tempat di Indonesia dengan jelas dan alami dalam bahasa Indonesia, sekali saja.':'Sebut nama tempat di Malaysia dengan jelas dan semula jadi dalam bahasa Melayu, sekali sahaja.'});
  }
 }
}
