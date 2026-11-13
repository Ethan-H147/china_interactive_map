const cyrillicNames={"150000":"Өвөр Монголын Өөртөө Засах Орон","150100":"Хөх хот","150200":"Бугат хот","150300":"Үхай","150400":"Улаанхад","150500":"Тонляо хот","150600":"Ордос хот","150700":"Хөлөнбуйр","150800":"Баяннуур хот","150900":"Улаанцав","152200":"Хянган аймаг","152500":"Шилийн Гол аймаг","152900":"Алшаа аймаг","632800":"Хайши - Монгол-Төвөдийн өөртөө засах тойрог","652700":"Бортал - Монголын өөртөө засах аймаг","652800":"Баянгол - монгол өөртөө засах тойрог"};
export async function addChinaMongolianPronunciations(read,add){
 const data=JSON.parse(await read('data/region-names.json'));const regions=JSON.parse(await read('data/china-regions.json'));
 const levels=new Map([...regions.provinces,...regions.subdivisions].map(x=>[String(x.properties.adcode),x.properties.level==='province'?1:2]));
 for(const [id,record]of Object.entries(data.regions))for(const n of (record.regional||[]).filter(x=>x.lang==='mn-Mong')){
  if(!levels.has(id))continue;add('china',id,levels.get(id),record.en,n.text,'mn',{variant:'mn',locale:'mn',src:`audio/pronunciation/china/mn/${id}.mp3`,synthesisText:cyrillicNames[id],nameSource:'Mongolian Cyrillic Wikidata labels retained in scripts/name-sources/wikidata.json',context:'Монгол хэлээр газрын нэрийг нэг удаа тодорхой, байгалийн жамаар дуудна уу.',voiceSettings:{stability:1,similarity_boost:.75,speed:1}});
 }
}
