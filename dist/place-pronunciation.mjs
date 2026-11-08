import {createPronunciationPlayer} from './pronunciation.mjs';
import {getPlacePronunciations} from './pronunciation-names.mjs';
export {hasPlacePronunciations} from './pronunciation-names.mjs';

const icon='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const languages={mn:'Mongolian','en-PH':'Philippine English',th:'Thai',bg:'Bulgarian',rm:'Romansh','de-AT':'Austrian German','de-CH':'Swiss Standard German','fr-CH':'Swiss French','it-CH':'Swiss Italian',da:'Danish',fi:'Finnish',sv:'Swedish',no:'Norwegian',is:'Icelandic','da-DK':'Danish','fi-FI':'Finnish','sv-FI':'Finland Swedish','sv-SE':'Swedish','nb-NO':'Norwegian','is-IS':'Icelandic',nl:'Dutch',ar:'Arabic',cy:'Welsh',ga:'Irish',hi:'Hindi',bn:'Bengali',ta:'Tamil',te:'Telugu',mr:'Marathi',gu:'Gujarati',kn:'Kannada',ml:'Malayalam',pa:'Punjabi',as:'Assamese',or:'Odia',ne:'Nepali',ur:'Urdu',sd:'Sindhi',pl:'Polish',hu:'Hungarian',uk:'Ukrainian',ro:'Romanian',cs:'Czech',sk:'Slovak',vi:'Vietnamese',ja:'Japanese',tr:'Turkish',zh:'Mandarin',fr:'French',es:'Spanish',ko:'Korean',ru:'Russian',de:'German',it:'Italian',en:'English',pt:'Portuguese','en-GB':'British English','en-ZA':'South African English','en-IN':'Indian English','nl-BE':'Belgian Dutch','fr-BE':'Belgian French','ar-SA':'Saudi Arabic','fr-CA':'Canadian French','en-CA':'Canadian English','en-US':'English','es-AR':'Argentine Spanish','es-UY':'Uruguayan Spanish','es-CL':'Chilean Spanish','es-CR':'Costa Rican Spanish','es-419':'Latin American Spanish','es-MX':'Spanish','pt-BR':'Brazilian Portuguese','pt-PT':'European Portuguese'};
let active;
const player=createPronunciationPlayer({onState:state=>active?.render(state)});
export function stopPlacePronunciation(){player.stop();active=null;}
globalThis.document?.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlacePronunciation();});
globalThis.window?.addEventListener('pagehide',stopPlacePronunciation);

// A card may have several languages, but the whole atlas has one lazy player.
export function createPlacePronunciation({country,id,heading,local,button,status}){
 if(!status){status=document.createElement('span');status.className='pronunciation-status';status.setAttribute('role','status');heading.parentElement.append(status);}
 const controls=[];
 function createControl(index){
  const element=index===0&&button?button:document.createElement('button');
  element.id=index===0?(element.id||id):id+'-variant-'+index;
  element.type='button';element.lang='en';element.className='pronunciation-button';element.innerHTML=icon;element.hidden=true;
  const control={button:element,entry:null,render(state){
   element.dataset.state=state;const playing=state==='playing'||state==='loading';
   element.setAttribute('aria-pressed',String(playing));
   const entry=control.entry,language=languages[entry?.locale]||languages[entry?.language]||'local';
   element.title=state==='error'?'Audio unavailable. Press to try again.':(playing?'Stop':'Play')+' '+language+' pronunciation (AI-generated)';
   element.setAttribute('aria-label',(playing?'Stop':'Play')+' '+language+' pronunciation'+(entry?' of '+entry.text:'')+' (AI-generated)');
   status.textContent=state==='error'?'Audio unavailable. Try again.':'';
  }};
  element.addEventListener('click',()=>{
   if(!control.entry)return;
   if(active===control&&['playing','loading'].includes(player.state)){stopPlacePronunciation();return;}
   stopPlacePronunciation();active=control;void player.play(control.entry.src);
  });
  control.render('idle');controls.push(control);return control;
 }
 createControl(0);
 const controller={
  stop(){if(controls.includes(active))stopPlacePronunciation();},
  clear(){controller.stop();for(const control of controls){control.entry=null;control.button.hidden=true;control.render('idle');}},
  set(placeId){
   controller.clear();const entries=getPlacePronunciations(country,placeId);
   entries.forEach((entry,index)=>{
    const control=controls[index]||createControl(index),element=control.button;
    control.entry=entry;const visibleLocal=local&&!local.hidden&&local.textContent.trim();
    const normalized=value=>String(value||'').normalize('NFC').trim();
    const regional=Array.from(heading.parentElement.querySelectorAll('.regional-name-row bdi[lang]')).find(node=>node.lang===entry.language&&normalized(node.textContent)===normalized(entry.text));
    const variant=Array.from(heading.parentElement.querySelectorAll('.place-name-variants p[lang]')).find(row=>row.lang===entry.language&&normalized(row.querySelector('.name-primary')?.textContent||row.textContent)===normalized(entry.text));
    const anchor=entry.language==='en'&&entries.length>1?heading:regional?regional.parentElement:variant|| (visibleLocal?local:heading);
    if(entries.length>1)element.dataset.languageLabel=entry.language.toUpperCase();else delete element.dataset.languageLabel;
    element.dataset.pronunciationLanguage=entry.language;element.dataset.pronunciationLocale=entry.locale||entry.language;
    anchor.append(element);element.hidden=false;control.render('idle');
   });
  }
 };
 return controller;
}
