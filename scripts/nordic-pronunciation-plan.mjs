import {gunzipSync} from 'node:zlib';

export const nordicPronunciationCountries=['denmark','finland','iceland','norway','sweden'];
const language={denmark:'da',finland:'fi',iceland:'is',norway:'no',sweden:'sv'};
const contexts={
 da:'Danske stednavne, udtalt naturligt og tydeligt på dansk. Læs hvert navn én gang, uden indledning eller musik.',
 fi:'Suomalaisia paikannimiä, luontevasti ja selkeästi suomeksi. Lue nimi vain kerran ilman johdantoa tai musiikkia.',
 is:'Íslensk örnefni, borin skýrt og eðlilega fram á íslensku. Lestu nafnið aðeins einu sinni, án inngangs eða tónlistar.',
 no:'Norske stedsnavn, uttalt naturlig og tydelig på norsk bokmål. Les navnet bare én gang, uten innledning eller musikk.',
 sv:'Svenska ortnamn, naturligt och tydligt uttalade på svenska. Läs namnet en gång utan inledning eller musik.',
 'sv-FI':'Finländska ortnamn, naturligt och tydligt uttalade på finlandssvenska. Läs namnet en gång utan inledning eller musik.'
};
const name=(record,lang)=>{const value=record.names?.[lang];return typeof value==='string'?value:value?.name;};

export async function addNordicPronunciations(read,add){
 for(const country of nordicPronunciationCountries){
  const base='data/europe/'+country+'/',{records}=JSON.parse(gunzipSync(await read(base+'catalogue.bin')));
  const cities=JSON.parse(await read(base+'settlements.json')).records.slice().sort((a,b)=>(b.population?.value||0)-(a.population?.value||0)||a.id.localeCompare(b.id)).slice(0,5);
  for(const record of [...records.filter(r=>r.level===1),...cities]){
   const city=cities.includes(record),primary=country==='finland'&&record.id==='FI-21'?'sv':language[country];
   const forms=country==='finland'?[primary,primary==='fi'?'sv':'fi']:[primary];
   forms.forEach((lang,index)=>{
    const fallback=country==='denmark'?{'DK-GL':'Grønland','DK-FO':'Færøerne'}[record.id]:null;
    const text=fallback||name(record,lang)||record.local||record.name||record.en;
    if(country==='finland'&&!name(record,lang))throw Error('Missing attested '+lang+' name: '+record.id);
    const locale=country==='finland'?lang+'-FI':{da:'da-DK',is:'is-IS',no:'nb-NO',sv:'sv-SE'}[lang];
    add(country,record.id,city?4:record.level,record.en,text.replaceAll('/',' og '),lang,{
     locale,context:contexts[locale]||contexts[lang],nordicScope:city?'city':'first',
     ...(index?{variant:lang}:{}),...(fallback?{nameSource:'Danish name; Greenlandic/Faroese synthesis unsupported'}:{}),
     ...(city?{cityRank:cities.indexOf(record)+1,populationYear:record.population.year}:{}),
    });
   });
  }
 }
}
