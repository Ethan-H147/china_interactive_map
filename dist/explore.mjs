export const landmarksFor=(data,code)=>data.landmarks.filter(place=>place.city===Number(code)||place.district===Number(code));

export function createExplorer(articles,landmarks){
 const links=document.getElementById('region-articles'),gallery=document.getElementById('landmark-gallery');
 const dialog=document.getElementById('photo-viewer'),photo=document.getElementById('viewer-image');
 const link=(label,url)=>{const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
 document.getElementById('viewer-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 function open(place){
  const p=place.photo;photo.src=p.src;photo.alt=place.en;photo.width=p.width;photo.height=p.height;
  document.getElementById('viewer-title').textContent=place.en+' · '+place.zh;
  const credits=document.getElementById('viewer-credit');credits.replaceChildren();
  credits.append(document.createTextNode(p.author+' · '),link(p.license,p.licenseUrl),document.createTextNode(' · '),link('Wikimedia Commons',p.source),document.createTextNode(' · '),link('Original image',p.original));
  document.getElementById('viewer-resolution').textContent=`${p.width.toLocaleString()} × ${p.height.toLocaleString()} pixels · Converted to WebP, original dimensions retained`;
  dialog.showModal();
 }
 return {render(code){
  links.replaceChildren();const record=articles.regions[code];links.hidden=!record;
  if(record){const label=document.createElement('span');label.textContent='Wikipedia';links.append(label);for(const lang of ['en','zh'])if(record[lang])links.append(link(lang==='en'?'English ↗':'中文 ↗',record[lang].url));}
  gallery.replaceChildren();const places=landmarksFor(landmarks,code);gallery.hidden=!places.length;if(!places.length)return;
  const heading=document.createElement('h3');heading.textContent='Landmarks';gallery.append(heading);
  for(const place of places){
   const card=document.createElement('figure'),button=document.createElement('button');button.type='button';button.className='landmark-photo';button.setAttribute('aria-label','View full-resolution photo of '+place.en);
   const image=document.createElement('img');image.src=place.photo.src;image.width=place.photo.width;image.height=place.photo.height;image.alt=place.en;image.loading='lazy';image.decoding='async';
   const expand=document.createElement('span');expand.className='photo-expand';expand.textContent='↗';expand.setAttribute('aria-hidden','true');button.append(image,expand);button.onclick=()=>open(place);
   const caption=document.createElement('figcaption'),name=document.createElement('strong'),chinese=document.createElement('span');name.textContent=place.en;chinese.textContent=place.zh;chinese.lang='zh-Hans';caption.append(name,chinese);
   const credit=document.createElement('small');credit.append(link(place.photo.author+' · '+place.photo.license,place.photo.source));
   card.append(button,caption,credit);gallery.append(card);
  }
 }};
}
