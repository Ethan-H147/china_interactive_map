const issueUrl='https://github.com/Ethan-H147/china_interactive_map/issues/new';
let contextProvider=()=>({}),dialog,snapshot,listening=false;
export const communityFooter='<nav class="atlas-community" aria-label="Community"><button type="button" data-report-problem aria-haspopup="dialog" aria-controls="atlas-report">Report a problem</button><a href="https://buymeacoffee.com/ethanhu147" target="_blank" rel="noopener noreferrer">Support creator</a></nav>';
export function configureReports(provider){contextProvider=provider;if(!listening){document.addEventListener('click',event=>{if(event.target.closest?.('[data-report-problem]'))openReport();});listening=true;}}
function createDialog(){
 const node=document.createElement('dialog');node.id='atlas-report';node.className='atlas-report';node.setAttribute('aria-labelledby','atlas-report-title');
 node.innerHTML='<form method="get" action="'+issueUrl+'" target="_blank" rel="noopener noreferrer"><header><h2 id="atlas-report-title">Report a problem</h2><button type="button" class="report-close" aria-label="Close report">×</button></header><p class="report-location"></p><label for="report-description">What needs fixing?</label><textarea id="report-description" rows="5" maxlength="3000" required placeholder="Describe the problem and what you expected to see."></textarea><p class="report-note">Your current place and map view are included. Continue to GitHub to review and submit your report.</p><input type="hidden" name="title"><input type="hidden" name="body"><button type="submit" class="report-submit">Continue on GitHub</button></form>';
 node.querySelector('.report-close').onclick=()=>node.close();
 node.querySelector('form').addEventListener('submit',event=>{
  const description=node.querySelector('textarea').value.trim();
  if(!description){node.querySelector('textarea').setCustomValidity('Describe the problem first.');event.preventDefault();node.querySelector('textarea').reportValidity();return;}
  node.querySelector('[name=title]').value=('Map problem: '+(snapshot.place||snapshot.country||'Boundary Atlas')).slice(0,180);
  node.querySelector('[name=body]').value=description+'\n\n---\n'+[
   ['Country',snapshot.country],['Place',snapshot.place],['Place ID',snapshot.selection],
   ['Map center',snapshot.center?.join(', ')],['Zoom',snapshot.zoom],['Map view',snapshot.url],
  ].filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([key,value])=>key+': '+value).join('\n');
 });
 node.querySelector('textarea').addEventListener('input',event=>event.target.setCustomValidity(''));
 document.body.append(node);return node;
}
export function openReport(){
 dialog??=createDialog();snapshot=contextProvider();
 dialog.querySelector('.report-location').textContent=[snapshot.country,snapshot.place].filter(Boolean).join(' / ');
 dialog.querySelector('textarea').value='';dialog.querySelector('textarea').setCustomValidity('');
 if(!dialog.open)dialog.showModal();dialog.querySelector('textarea').focus();
}
