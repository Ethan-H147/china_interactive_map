import assert from 'node:assert/strict';
const artwork={mexico:'mexico-sun-stone.webp',canada:'canada-maple-leaf.svg',ireland:'ireland-shamrock.svg',india:'india-chakra.svg'};
export default [{name:'Country startup and movement icons share exact artwork and respect reduced motion',options:{width:1150,height:800},async run(p,base){
 for(const [country,file]of Object.entries(artwork)){
  await p.open(base,'#'+country);
  const icons=await p.evaluate(`Array.from(document.querySelectorAll('[data-country-symbol] img')).map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0,rotates:i.classList.contains('symbol-rotor')}))`);
  assert(icons.length>=2,country+' has both startup and camera indicators');assert(icons.every(i=>i.src==='vendor/'+file&&i.loaded&&i.rotates),country+' indicators use the same loaded spinning artwork');
 }
 await p.evaluate(`(()=>{const d=document.createElement('dialog');d.className='country-icon-preview';d.style.cssText='width:880px;max-width:95vw;padding:30px;border:1px solid #e7dfd1;border-radius:14px;background:#fffdf8;color:#302c27;font:15px Segoe UI,sans-serif';d.innerHTML='<style>.country-icon-preview .icons{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.country-icon-preview .cell{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px 10px;border-radius:8px;min-height:128px;border:1px solid #e7dfd1}.country-icon-preview .dark{background:#17212a;color:#f4eee6;border-color:#344650}.country-icon-preview .country-symbol{width:84px;height:84px}.country-icon-preview h2{font:32px Georgia,serif;margin:0 0 24px}.country-icon-preview small{display:block;color:#787166;margin-top:18px}</style><h2>Country loading symbols</h2><div class="icons">'+['','dark'].map(theme=>['mexico','canada','ireland','india'].map(c=>'<div class="cell '+theme+'">'+AtlasSymbols.markup(c)+'<span>'+AtlasCountries.countries[c].en+'</span></div>').join('')).join('')+'</div><small>Mexico · Aztec Sun Stone &nbsp;&nbsp; Canada · flag maple leaf &nbsp;&nbsp; Ireland · shamrock &nbsp;&nbsp; India · flag Ashoka Chakra</small>';document.body.append(d);d.showModal();})()`);
 await p.waitFor(`Array.from(document.querySelectorAll('.country-icon-preview img')).every(i=>i.complete&&i.naturalWidth>0)`);
 assert(await p.evaluate(`Array.from(document.querySelectorAll('.country-icon-preview img')).every(i=>i.getAnimations().some(a=>a.playState==='running'))`));
 await p.screenshot('country-loading-symbols');
 await p.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await p.waitFor(`Array.from(document.querySelectorAll('.country-icon-preview img')).every(i=>getComputedStyle(i).animationName==='none')`);
 await p.send('Emulation.setEmulatedMedia',{features:[]});
}}];
