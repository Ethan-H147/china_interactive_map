// This is a local preview preference. No typed characters are stored or sent.
(()=>{
 const key='boundary-atlas-developer-v1';
 let enabled=false;try{enabled=sessionStorage.getItem(key)==='true';}catch{}
 function createSequence(){
  const phrase='dev mode';let buffer='',last=0;
  return {reset(){buffer='';last=0;},push(event,eligible,now=Date.now()){
   if(!eligible||event.ctrlKey||event.metaKey||event.altKey||event.isComposing){this.reset();return false;}
   if(event.repeat)return false;
   if(event.key==='Backspace'){buffer=buffer.slice(0,-1);return false;}
   if(event.key.length!==1){this.reset();return false;}
   if(now-last>5000)buffer='';last=now;
   const char=event.key.toLowerCase();
   if(char===' '&&buffer==='dev')event.preventDefault?.();
   buffer=(buffer+char).slice(-phrase.length);
   if(buffer===phrase){this.reset();return true;}
   return false;
  }};
 }
 const sequence=createSequence();let dialog,exit,eligible=()=>false;
 function paint(){if(enabled)document.documentElement.dataset.developer='true';else delete document.documentElement.dataset.developer;if(exit)exit.hidden=!enabled;}
 function setEnabled(value){enabled=!!value;sequence.reset();try{sessionStorage.setItem(key,String(enabled));}catch{}paint();window.dispatchEvent(new CustomEvent('atlas-developer-change',{detail:{enabled}}));}
 paint();
 window.AtlasDev={get enabled(){return enabled;},allows:()=>true,createSequence,resetSequence:()=>sequence.reset(),mount(host){
  eligible=host.eligible;
  dialog=document.createElement('dialog');dialog.id='developer-dialog';dialog.setAttribute('aria-labelledby','developer-title');
  dialog.innerHTML='<span class="section-kicker">长宁 · CHANGNING</span><h2 id="developer-title">Developer mode</h2><p>A little door from Changning to the workshop.</p><p>This mode stays on until you exit or close this tab.</p><div class="developer-actions"><button type="button" class="quiet-button" data-cancel>Cancel</button><button type="button" class="developer-continue">Continue</button></div>';
  document.body.append(dialog);
  exit=document.createElement('button');exit.type='button';exit.className='developer-exit';exit.textContent='Developer mode · Exit';exit.setAttribute('aria-label','Exit developer mode');exit.onclick=()=>setEnabled(false);document.querySelector('.site-header').append(exit);paint();
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  dialog.querySelector('.developer-continue').onclick=()=>{if(!eligible()){dialog.close();return;}dialog.close();setEnabled(true);};
  window.addEventListener('keydown',event=>{
   const editing=event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
   if(enabled||dialog.open||editing){sequence.reset();return;}
   if(sequence.push(event,eligible())){dialog.showModal();dialog.querySelector('.developer-continue').focus();}
  });
 }};
})();
