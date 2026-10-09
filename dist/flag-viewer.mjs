const selector='img[alt^="Flag of"],.division-flags img,.japan-flags img,.south-flags img,#selection-flag,#k-selection-flag';

export function flagImageSize(width,height,viewportWidth,viewportHeight){
 const shortest=Math.min(viewportWidth,viewportHeight),frame=Math.max(24,Math.min(56,shortest*.055)),margin=Math.max(12,Math.min(32,shortest*.03));
 const scale=Math.min((viewportWidth-2*(frame+margin))/width,(viewportHeight-2*(frame+margin))/height);
 return {width:Math.max(1,width*scale),height:Math.max(1,height*scale),frame};
}

export function createFlagViewer(){
 const dialog=document.createElement('dialog');dialog.id='flag-viewer';dialog.setAttribute('aria-label','Flag');
 dialog.innerHTML='<button type="button" class="flag-viewer-close" aria-label="Close flag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button><img id="flag-viewer-image" alt=""><p id="flag-viewer-credit" class="sr-only"></p>';
 dialog.setAttribute('aria-describedby','flag-viewer-credit');document.body.append(dialog);
 const image=dialog.querySelector('img'),closeButton=dialog.querySelector('button'),credit=dialog.querySelector('p');
 let trigger,epoch=0,dimensions=[3,2],catalogue;
 const key=src=>{const url=new URL(src,document.baseURI);return url.origin===location.origin?decodeURI(url.pathname.slice(new URL('.',document.baseURI).pathname.length)):url.href;};
 function resize(){if(!dialog.open)return;const size=flagImageSize(...dimensions,innerWidth,innerHeight);dialog.style.setProperty('--flag-frame',size.frame+'px');image.style.width=size.width+'px';image.style.height=size.height+'px';}
 function enhance(flag){
  if(flag.closest('#flag-viewer'))return;
  const anchor=flag.closest('a'),target=anchor||flag;
  if(anchor?.hasAttribute('href')){anchor.dataset.flagSource=anchor.getAttribute('href');anchor.removeAttribute('href');anchor.removeAttribute('target');}
  target.dataset.flagTrigger='';target.setAttribute('role','button');target.setAttribute('tabindex','0');target.setAttribute('aria-haspopup','dialog');target.setAttribute('aria-label','Enlarge '+(flag.alt||'flag').replace(/^Flag/, 'flag'));
 }
 function scan(root){if(root.matches?.(selector))enhance(root);root.querySelectorAll?.(selector).forEach(enhance);}
 scan(document.body);
 const observer=new MutationObserver(changes=>{for(const change of changes){if(change.type==='childList')change.addedNodes.forEach(scan);else{const target=change.target;if(target.matches?.(selector))enhance(target);else if(target.matches?.('a'))scan(target);}}});
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','alt','href']});
 async function open(flag,target,keyboard){
  const src=flag.currentSrc||flag.getAttribute('src');if(!src)return;
  const token=++epoch;trigger=target;dimensions=[flag.naturalWidth||3,flag.naturalHeight||2];
  dialog.dataset.keyboard=String(keyboard);dialog.setAttribute('aria-label',flag.alt||'Flag');
  credit.textContent=target.title||'';image.alt=flag.alt||'Flag';image.title=credit.textContent;image.src=src;
  (document.fullscreenElement||document.body).append(dialog);dialog.showModal();resize();closeButton.focus({preventScroll:true});
  const sources=await(catalogue??=fetch('data/flag-images.json').then(r=>r.ok?r.json():{}).catch(()=>({})));if(token!==epoch||!dialog.open)return;
  const source=sources[key(src)];if(!source)return;
  credit.textContent=[source.credit,source.license].filter(Boolean).join(' · ');image.title=credit.textContent;
  const full=flag.dataset.flagFullSrc||source.full;if(!full||new URL(full,document.baseURI).href===new URL(src,document.baseURI).href)return;
  const original=new Image();original.src=full;
  try{await original.decode();if(token!==epoch||!dialog.open)return;dimensions=[original.naturalWidth,original.naturalHeight];image.src=full;resize();}catch{/* Retain the locally cached official artwork if its original is unavailable. */}
 }
 function close(){if(dialog.open)dialog.close();}
 dialog.addEventListener('close',()=>{epoch++;image.removeAttribute('src');trigger?.focus({preventScroll:true});trigger=null;});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 closeButton.addEventListener('click',close);
 dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();}});
 document.addEventListener('keydown',event=>{
  if(dialog.open){if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}return;}
  if(!['Enter',' '].includes(event.key))return;
  const target=event.target.closest?.('[data-flag-trigger]');if(!target)return;
  const flag=target.matches('img')?target:target.querySelector('img');if(!flag)return;
  event.preventDefault();event.stopImmediatePropagation();open(flag,target,true);
 },true);
 document.addEventListener('click',event=>{
  const flag=event.target.matches?.(selector)?event.target:event.target.closest?.('[data-flag-trigger]')?.querySelector('img');
  if(!flag||flag.closest('#flag-viewer'))return;
  enhance(flag);const target=flag.closest('[data-flag-trigger]');event.preventDefault();event.stopImmediatePropagation();open(flag,target,event.detail===0);
 },true);
 window.addEventListener('resize',resize);
 return {dialog,close};
}
