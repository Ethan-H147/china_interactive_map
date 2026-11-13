// Device preferences deliberately stay independent of account/database rollout.
(()=>{
 const key='boundary-atlas-comfort-v1',root=document.documentElement,media=matchMedia('(prefers-color-scheme: dark)');
 const clean=v=>({appearance:['system','light','dark'].includes(v?.appearance)?v.appearance:'system',palette:v?.palette==='accessible'?'accessible':'standard',shortcuts:v?.shortcuts!==false});
 let value;try{value=clean(JSON.parse(localStorage.getItem(key)));}catch{value=clean();}
 function apply(){root.dataset.colorMode=value.appearance==='system'?(media.matches?'dark':'light'):value.appearance;root.dataset.quizPalette=value.palette;root.style.colorScheme=root.dataset.colorMode;}
 globalThis.AtlasComfort={get:()=>({...value}),clear(){value=clean();try{localStorage.removeItem(key);}catch{}apply();dispatchEvent(new Event('atlas-appearance-change'));},set(patch){value=clean({...value,...patch});try{localStorage.setItem(key,JSON.stringify(value));}catch{}apply();dispatchEvent(new Event('atlas-appearance-change'));}};
 media.addEventListener('change',()=>{apply();dispatchEvent(new Event('atlas-appearance-change'));});
 addEventListener('storage',e=>{if(e.key===key){try{value=clean(JSON.parse(e.newValue));}catch{value=clean();}apply();dispatchEvent(new Event('atlas-appearance-change'));}});apply();
})();
