import {reservedCollectibles} from './dev-collectibles-core.mjs';
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
export function mountReservedCollectibles(host){
 if(!globalThis.AtlasDev?.enabled)return null;
 let viewer,version=0,destroyed=false;
 const details=node('details'),summary=node('summary','Reserved collectibles'),note=node('p','Saved for future quiz rewards.','quiz-collection-note'),grid=node('div',null,'quiz-trophy-grid'),preview=node('section');
 details.dataset.reservedCollectibles='';preview.dataset.reservedPreview='';preview.hidden=true;
 const title=node('h4'),stage=node('div',null,'quiz-trophy-stage'),poster=node('img'),canvasHost=node('div'),description=node('p'),reset=node('button','Reset view','quiet-button'),download=node('a','Download 3D model','quiz-trophy-download'),status=node('p');
 poster.alt='';title.tabIndex=-1;canvasHost.dataset.reservedCanvas='';stage.append(poster,canvasHost);reset.type='button';reset.onclick=()=>viewer?.reset();download.download='';status.setAttribute('role','status');status.hidden=true;preview.append(title,stage,description,reset,download,status);
 function dispose(){version++;viewer?.dispose();viewer=null;canvasHost.replaceChildren();poster.hidden=false;}
 async function open(model){
  if(!globalThis.AtlasDev?.enabled||destroyed)return;dispose();const token=version;preview.hidden=false;title.textContent=model.name;description.textContent=model.description;poster.src=model.poster;download.href=model.file;reset.hidden=true;status.hidden=true;title.focus({preventScroll:true});preview.scrollIntoView({block:'start',behavior:'instant'});
  const canvas=node('canvas');canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Reserved '+model.name+'. Drag or use arrow keys to rotate.');canvasHost.append(canvas);
  try{const {createTrophyViewer}=await import('./trophy-viewer.mjs');if(destroyed||token!==version||!globalThis.AtlasDev?.enabled)return;
   const current=await createTrophyViewer(canvas,model.file,{onError(){dispose();status.textContent='3D preview is unavailable. The model thumbnail is shown.';status.hidden=false;reset.hidden=true;}});
   if(destroyed||token!==version||!globalThis.AtlasDev?.enabled){current.dispose();return;}viewer=current;poster.hidden=true;reset.hidden=false;canvas.dataset.ready='true';
  }catch{if(token===version&&!destroyed){canvas.remove();status.textContent='3D preview is unavailable. The model thumbnail is shown.';status.hidden=false;}}
 }
 for(const model of reservedCollectibles){const card=node('button',null,'quiz-trophy-card'),art=node('span',null,'quiz-trophy-art'),image=node('img'),body=node('span',null,'quiz-trophy-card-body');card.type='button';card.dataset.reservedCollectible=model.id;card.setAttribute('aria-label',model.name+' · Reserved');image.alt='';image.loading='lazy';image.src=model.poster;art.append(image);body.append(node('strong',model.name),node('span',model.material,'quiz-trophy-material'));card.append(art,body);card.onclick=()=>void open(model);grid.append(card);}
 details.append(summary,note,grid,preview);host.replaceChildren(details);
 details.addEventListener('toggle',()=>{if(!details.open){dispose();preview.hidden=true;poster.removeAttribute('src');download.removeAttribute('href');}});
 return{dispose, destroy(){destroyed=true;dispose();host.replaceChildren();}};
}
