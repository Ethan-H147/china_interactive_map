// The country name in the header opens a menu of every country the visitor can open, each
// written as its own header writes it: the same names, scripts, fonts and colours
// (country-menu.css; each option carries data-atlas, which the country themes also match).
// Choosing one follows the country's link, as a shared link or the back button would.
(()=>{
 const registry=window.AtlasCountries;
 function mount(){
  const toggle=document.getElementById('country-switch'),menu=document.getElementById('country-menu');
  if(!toggle||!menu||toggle.dataset.mounted)return;toggle.dataset.mounted='true';
  const options=()=>[...menu.querySelectorAll('[role=menuitem]')];
  function render(){
   const current=window.AtlasEntry.current;
   menu.replaceChildren(...registry.ids.filter(id=>!registry.countries[id].parent&&window.AtlasDev.allows(id)).map(id=>{
    const option=document.createElement('button');option.type='button';option.setAttribute('role','menuitem');option.className='country-option';option.dataset.atlas=id;option.tabIndex=-1;
    if(id===(registry.countries[current].parent||current))option.setAttribute('aria-current','true');
    const title=document.createElement('span');title.className='country-option-title';
    for(const part of window.AtlasEntry.titleParts(id)){if(!part.text)continue;const span=document.createElement('span');span.className=part.className;span.lang=part.lang;span.textContent=part.text;title.append(span);}
    option.append(title);option.addEventListener('click',()=>choose(id));return option;
   }));
  }
  function open(){
   render();menu.hidden=false;toggle.setAttribute('aria-expanded','true');
   (menu.querySelector('[aria-current=true]')||options()[0])?.focus();
   document.addEventListener('pointerdown',outside,true);
  }
  function close(focus=false){
   if(menu.hidden)return;menu.hidden=true;toggle.setAttribute('aria-expanded','false');
   document.removeEventListener('pointerdown',outside,true);if(focus)toggle.focus();
  }
  function outside(event){if(!menu.contains(event.target)&&!toggle.contains(event.target))close();}
  function choose(id){
   close(true);
   if(id!==window.AtlasEntry.current)location.hash='#'+id;
  }
  toggle.addEventListener('click',()=>menu.hidden?open():close());
  toggle.addEventListener('keydown',event=>{if(['ArrowDown','Enter',' '].includes(event.key)&&menu.hidden){event.preventDefault();open();}});
  menu.addEventListener('keydown',event=>{
   const list=options(),index=list.indexOf(document.activeElement);
   const move=to=>{event.preventDefault();list[(to+list.length)%list.length]?.focus();};
   if(event.key==='Escape'){event.preventDefault();close(true);}
   else if(event.key==='ArrowDown'||event.key==='ArrowRight')move(index+1);
   else if(event.key==='ArrowUp'||event.key==='ArrowLeft')move(index-1);
   else if(event.key==='Home')move(0);
   else if(event.key==='End')move(list.length-1);
   else if(event.key==='Tab')close();
  });
  // A country opened another way (a map click, a link) closes the menu.
  window.addEventListener('hashchange',()=>close());
 }
 window.AtlasCountryMenu={mount};
})();
