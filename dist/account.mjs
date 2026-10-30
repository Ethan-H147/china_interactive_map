import {requestSupabaseQuizRecords} from './quiz-supabase.mjs';
import {supabaseUrl,supabasePublishableKey,sessionKey,quizRecordsUrl} from './account-config.mjs';
import {mountQuizDashboard} from './quiz-dashboard.mjs';
const trigger=document.getElementById('account-open');
const headerName=document.getElementById('account-header-name');
const dialog=document.createElement('dialog');
dialog.id='atlas-account';dialog.setAttribute('aria-labelledby','account-title');
dialog.innerHTML=`<header class="account-heading"><div><h2 id="account-title">Sign in</h2></div><button type="button" id="account-close" aria-label="Close account"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
<div class="account-content"><div class="account-tabs" aria-label="Account action"><button type="button" data-account-mode="signin" aria-pressed="true">Sign in</button><button type="button" data-account-mode="signup" aria-pressed="false">Create account</button></div>
<div id="account-social"><button type="button" id="account-google" class="account-google"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.97-3.39.97-2.6 0-4.81-1.76-5.6-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.93A6 6 0 0 1 6.09 12c0-.67.11-1.32.31-1.93V7.48H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.52l3.33-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.33 2.59c.79-2.36 3-4.12 5.6-4.12Z"/></svg><span>Continue with Google</span></button><div class="account-divider" aria-hidden="true">or</div></div>
<form id="account-form"><label id="account-signup-name-label" for="account-signup-name" hidden>Account name<input id="account-signup-name" name="display-name" type="text" autocomplete="nickname" maxlength="40"></label><label id="account-email-label" for="account-email">Email<input id="account-email" name="email" type="email" autocomplete="username" required maxlength="254"></label><label id="account-password-label" for="account-password">Password<input id="account-password" name="password" type="password" autocomplete="current-password" required maxlength="128"></label><label id="account-confirm-label" for="account-confirm" hidden>Confirm password<input id="account-confirm" name="confirm-password" type="password" autocomplete="new-password" maxlength="128"></label><button class="account-primary" id="account-submit" type="submit">Sign in</button></form>
<div id="account-signed-in" hidden><div class="account-sections" aria-label="Your account"><button type="button" data-account-section="quizzes" aria-pressed="true">Quiz dashboard</button><button type="button" data-account-section="profile" aria-pressed="false">Profile</button></div><section id="account-quizzes"></section><section id="account-profile-section" hidden><p class="account-caption">Signed in as</p><p id="account-identity"></p><form id="account-profile"><label for="account-name">Account name<input id="account-name" name="display-name" type="text" autocomplete="nickname" required maxlength="40" placeholder="Choose an account name"></label><button class="account-primary" id="account-save-name" type="submit">Save name</button></form><button class="account-secondary" type="button" id="account-signout">Sign out</button></section></div>
<p id="account-message" role="status" aria-live="polite" hidden></p><div class="account-links"><button type="button" id="account-forgot">Forgot password?</button><button type="button" id="account-back" hidden>Back to sign in</button><button type="button" id="account-resend" hidden>Resend confirmation email</button></div>
<p class="account-local-note">Settings and quiz records sync when signed in. Unfinished rounds are saved on this device.</p></div>`;
document.body.append(dialog);
const $=id=>dialog.querySelector('#account-'+id),form=$('form');
const dashboard=mountQuizDashboard($('quizzes'),{play:detail=>{dialog.close();globalThis.dispatchEvent(new CustomEvent('atlas-quiz-open',{detail}));}});
for(const tab of dialog.querySelectorAll('[data-account-section]'))tab.onclick=()=>{const quizzes=tab.dataset.accountSection==='quizzes';$('quizzes').hidden=!quizzes;$('profile-section').hidden=quizzes;for(const other of dialog.querySelectorAll('[data-account-section]'))other.setAttribute('aria-pressed',String(other===tab));};
let clientPromise,session=null,mode='signin',busy=false,pendingEmail='',nameDirty=false;
const oauthKey='boundary-atlas-google-signin';
const rememberOAuth=value=>{try{if(value)sessionStorage.setItem(oauthKey,JSON.stringify(value));else sessionStorage.removeItem(oauthKey);}catch{}};
function pendingOAuth(){try{const value=JSON.parse(sessionStorage.getItem(oauthKey));if(value?.provider==='google'&&typeof value.hash==='string'&&(!value.hash||value.hash.startsWith('#'))&&value.hash.length<8192&&Number.isFinite(value.startedAt)&&Date.now()-value.startedAt>=0&&Date.now()-value.startedAt<15*60*1000&&(!value.flowId||typeof value.flowId==='string'))return value;}catch{}rememberOAuth(null);return null;}
const recoveryKey='boundary-atlas-account-recovery';
const rememberRecovery=id=>{try{if(id)sessionStorage.setItem(recoveryKey,id);else sessionStorage.removeItem(recoveryKey);}catch{}};
const recovering=()=>{try{return session?.user?.id&&sessionStorage.getItem(recoveryKey)===session.user.id;}catch{return false;}};
const redirectUrl=()=>new URL('.',location.href).href;
function message(text='',error=false){$('message').textContent=text;$('message').hidden=!text;$('message').dataset.error=String(error);$('message').setAttribute('role',error?'alert':'status');}
function accountName(){const metadata=session?.user?.user_metadata;for(const field of ['display_name','full_name','name']){const name=metadata?.[field];if(typeof name==='string'&&name.trim())return name.trim().slice(0,40);}return '';}
function validName(input){const name=input.value.normalize('NFC').trim();input.setCustomValidity(!name?'Enter an account name.':name.length>40?'Use 40 characters or fewer.':/[\u0000-\u001f\u007f-\u009f]/u.test(name)?'Use a name without control characters.':'');if(!input.reportValidity())return null;return name;}
function render(){
 const signed=!!session?.user&&mode!=='update',reset=mode==='reset',update=mode==='update',signup=mode==='signup';
 dialog.dataset.signedIn=String(signed);dashboard.setUser(session?.user?.id||null);
 $('title').textContent=signed?'Your account':update?'Choose a new password':reset?'Reset password':signup?'Create account':'Sign in';
 dialog.querySelector('.account-tabs').hidden=signed||reset||update;$('social').hidden=signed||reset||update;form.hidden=signed;$('signed-in').hidden=!signed;
 $('signup-name-label').hidden=!signup||signed;$('signup-name').disabled=!signup||signed;$('signup-name').required=signup&&!signed;
 $('email-label').hidden=update;$('email').disabled=update;$('email').required=!update;
 $('password-label').hidden=reset;$('password').disabled=reset;$('password').required=!reset;
 $('password').autocomplete=signup||update?'new-password':'current-password';$('password').minLength=signup||update?8:1;
 $('confirm-label').hidden=!(signup||update);$('confirm').disabled=!(signup||update);$('confirm').required=signup||update;
 $('submit').textContent=update?'Save password':reset?'Send reset email':signup?'Create account':'Sign in';
 $('forgot').hidden=signed||mode!=='signin';$('back').hidden=signed||!(reset||signup);$('resend').hidden=!pendingEmail||signed||reset||update;
 for(const tab of dialog.querySelectorAll('[data-account-mode]'))tab.setAttribute('aria-pressed',String(tab.dataset.accountMode===mode));
 $('identity').textContent=session?.user?.email||'';
 const name=accountName();dashboard.setOwner(session?.user?name:'');headerName.textContent=name;headerName.title=name;headerName.hidden=!session?.user||!name;
 if(!nameDirty)$('name').value=name;
 trigger.dataset.signedIn=String(!!session?.user);trigger.title=session?.user?(name?'Your account: '+name:'Your account'):'Sign in';trigger.setAttribute('aria-label',trigger.title);
}
function setBusy(value,working='default'){busy=value;form.setAttribute('aria-busy',String(value));$('profile').setAttribute('aria-busy',String(value));for(const e of dialog.querySelectorAll('button:not(#account-close)'))e.disabled=value;$('submit').classList.toggle('account-working',value&&working!=='google');$('save-name').classList.toggle('account-working',value&&working!=='google');$('google').classList.toggle('account-working',value&&working==='google');}
function open(){if(dialog.open)return;const settings=document.getElementById('atlas-settings');if(settings?.open)settings.close();if(document.getElementById('country-menu')?.hidden===false)document.getElementById('country-switch').click();(document.fullscreenElement||document.body).append(dialog);dialog.showModal();trigger.setAttribute('aria-expanded','true');if(mode==='update')$('password').focus();else if(session?.user){dashboard.refresh();if(!$('quizzes').hidden)dashboard.focus();else $('name').focus();}else $('email').focus();}
function changeMode(next){if(busy)return;mode=next;form.reset();$('signup-name').setCustomValidity('');$('confirm').setCustomValidity('');message();render();(mode==='update'?$('password'):$('email')).focus();}
function friendly(error){
 if(error?.code==='invalid_credentials')return 'Email or password is incorrect.';
 if(error?.code==='email_not_confirmed')return 'Confirm your email before signing in.';
 if(error?.code==='over_email_send_rate_limit'||error?.status===429)return 'Too many attempts. Please wait before trying again.';
 if(error?.code==='email_address_not_authorized')return 'This project can currently send email only to its Supabase team. An email service needs to be configured for other addresses.';
 if(error?.code==='signup_disabled')return 'New accounts are currently disabled.';
 if(error?.name==='AuthPKCECodeVerifierMissingError'||error?.code==='flow_state_expired'||error?.code==='flow_state_not_found')return 'This link has expired or was opened in a different browser. Request a new link and open it in this browser.';
 if(error instanceof TypeError||/fetch|network|timeout/i.test(error?.message||''))return 'Cannot reach the account service. Check your connection and try again.';
 return error?.message||'The account request could not be completed. Please try again.';
}
async function client(){
 if(!clientPromise)clientPromise=import('./vendor/supabase.mjs').then(({createClient})=>{
  const c=createClient(supabaseUrl,supabasePublishableKey,{auth:{storageKey:sessionKey,flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true},global:{fetch:async(input,init={})=>fetch(input,{...init,signal:init.signal||AbortSignal.timeout(20000)})}});
  c.auth.onAuthStateChange((event,next)=>{
   if(session?.user?.id!==next?.user?.id)nameDirty=false;
   session=next;setTimeout(()=>globalThis.dispatchEvent(new CustomEvent('atlas-account-change',{detail:{userId:next?.user?.id||null}})),0);
   if(event==='PASSWORD_RECOVERY'){rememberRecovery(next?.user.id);mode='update';message();}
   if(event==='SIGNED_OUT'){rememberRecovery(null);mode='signin';form.reset();}
   if(!busy){if(recovering())mode='update';render();if(event==='PASSWORD_RECOVERY')open();}
  });return c;
 }).catch(error=>{clientPromise=null;throw error;});
 return clientPromise;
}
async function attempt(action,working='default'){if(busy)return;setBusy(true,working);message();try{await action(await client());}catch(error){message(friendly(error),true);}finally{setBusy(false,working);render();}}
$('google').onclick=()=>void attempt(async c=>{
 const response=await fetch(supabaseUrl+'/auth/v1/settings',{cache:'no-store',headers:{apikey:supabasePublishableKey},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Google sign-in is unavailable. Please try again later.');
 if(!(await response.json()).external?.google)throw Error('Google sign-in is not available yet. Please use email and password.');
 const {data,error}=await c.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirectUrl(),skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}});if(error)throw error;
 if(!data.url)throw Error('Google sign-in could not start. Please try again.');
 rememberOAuth({provider:'google',hash:location.hash,flowId:data.flowId,startedAt:Date.now()});pendingEmail='';location.assign(data.url);
},'google');
form.onsubmit=event=>{event.preventDefault();if(busy)return;rememberOAuth(null);const operation=mode,email=$('email').value.trim(),password=$('password').value;
 if((operation==='signup'||operation==='update')&&password!==$('confirm').value){$('confirm').setCustomValidity('Passwords do not match.');$('confirm').reportValidity();return;}
 const name=operation==='signup'?validName($('signup-name')):null;if(operation==='signup'&&name===null)return;
 void attempt(async c=>{
  if(operation==='signin'){const {data,error}=await c.auth.signInWithPassword({email,password});if(error){if(error.code==='email_not_confirmed')pendingEmail=email;throw error;}session=data.session;pendingEmail='';form.reset();message();}
  if(operation==='signup'){const {data,error}=await c.auth.signUp({email,password,options:{emailRedirectTo:redirectUrl(),data:{display_name:name}}});if(error)throw error;session=data.session;pendingEmail=session?'':email;form.reset();message(session?'Account created. You are signed in.':'Check your email for a confirmation link. Open it in this browser to finish signing up.');}
  if(operation==='reset'){const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl()});if(error)throw error;form.reset();message('If an account exists for that email, a reset link will be sent. Open it in this browser.');}
  if(operation==='update'){const {error}=await c.auth.updateUser({password});if(error)throw error;rememberRecovery(null);mode='signin';form.reset();message('Your password has been updated.');}
 });
};
$('profile').onsubmit=event=>{event.preventDefault();if(busy||!session?.user)return;const name=validName($('name'));if(name===null)return;
 void attempt(async c=>{const userId=session.user.id;const {data,error}=await c.auth.updateUser({data:{display_name:name}});if(error)throw error;if(session?.user?.id!==userId)throw Error('Your signed-in account changed. Open your account and try again.');session={...session,user:data.user};nameDirty=false;message('Account name saved.');});
};
$('name').oninput=()=>{nameDirty=true;$('name').setCustomValidity('');};$('signup-name').oninput=()=>{$('signup-name').setCustomValidity('');};
$('confirm').oninput=()=>{ $('confirm').setCustomValidity(''); };$('password').oninput=()=>{ $('confirm').setCustomValidity(''); };
for(const tab of dialog.querySelectorAll('[data-account-mode]'))tab.onclick=()=>changeMode(tab.dataset.accountMode);
$('forgot').onclick=()=>changeMode('reset');$('back').onclick=()=>changeMode('signin');
$('resend').onclick=()=>void attempt(async c=>{const {error}=await c.auth.resend({type:'signup',email:pendingEmail,options:{emailRedirectTo:redirectUrl()}});if(error)throw error;message('Confirmation email requested. Check your inbox.');});
$('signout').onclick=()=>void attempt(async c=>{const {error}=await c.auth.signOut({scope:'local'});if(error)throw error;session=null;mode='signin';pendingEmail='';rememberRecovery(null);form.reset();message('Signed out on this device.');});
trigger.onclick=()=>{render();open();void attempt(async c=>{const {data,error}=await c.auth.getSession();if(error)throw error;session=data.session;if(recovering())mode='update';});};
$('close').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{ $('password').value='';$('confirm').value='';trigger.setAttribute('aria-expanded','false');trigger.focus({preventScroll:true}); });
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button,input,select,a[href]')].filter(e=>!e.disabled&&e.getClientRects().length),first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
render();
// PKCE uses a query code, leaving the atlas's country/view fragment intact.
const query=new URLSearchParams(location.search),code=query.get('code'),linkError=query.has('error')||query.has('error_description')||query.has('error_code');
if(code||linkError){
 const oauth=pendingOAuth(),previous=location.href,clean=new URL(location.href);rememberOAuth(null);for(const key of ['code','sb_flow_id','error','error_description','error_code'])clean.searchParams.delete(key);if(oauth)clean.hash=oauth.hash;history.replaceState(history.state,'',clean);
 if(new URL(previous).hash!==clean.hash)globalThis.dispatchEvent(new HashChangeEvent('hashchange',{oldURL:previous,newURL:clean.href}));
 open();void attempt(async c=>{
  if(linkError)throw Error(oauth?(query.get('error')==='access_denied'?'Google sign-in was canceled. You can try again or use email and password.':'Google sign-in could not be completed. Please try again.'):'This account link is invalid or has expired. Request a new confirmation or reset email.');
  const {data,error}=await c.auth.exchangeCodeForSession(code,query.has('sb_flow_id')?{flowId:query.get('sb_flow_id')}:oauth?.flowId?{flowId:oauth.flowId}:undefined);if(error)throw error;session=data.session;
  if(data.redirectType==='recovery'||recovering()){rememberRecovery(session?.user.id);mode='update';}else message(oauth?'You are signed in.':'Email confirmed. You are signed in.');
 });
}else{
 let saved=false;try{saved=!!localStorage.getItem(sessionKey);}catch{}
 if(saved)void client().then(async c=>{const {data,error}=await c.auth.getSession();if(error)throw error;session=data.session;if(recovering())mode='update';render();}).catch(()=>{message('Your session could not be restored. Sign in again.',true);});
}

// Each settings request captures a token for its intended account, so a delayed
// save cannot write to another account after a sign-out or account switch.
export async function requestAccountSettings(userId,metadata=null){
 const {data,error}=await (await client()).auth.getSession();if(error)throw error;const current=data.session;
 if(!current||current.user.id!==userId||session?.user?.id!==userId)throw Error('Account changed');
 const response=await fetch(supabaseUrl+'/auth/v1/user',{method:metadata?'PUT':'GET',headers:{apikey:supabasePublishableKey,Authorization:'Bearer '+current.access_token,'Content-Type':'application/json'},...(metadata?{body:JSON.stringify({data:metadata})}:{}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Settings sync unavailable');const user=await response.json();if(user.id!==userId)throw Error('Account changed');return user.user_metadata||{};
}
export function currentAccountId(){return session?.user?.id||null;}
export async function requestAccountQuizRecords(userId,method='GET',body=null,cursor=null){
 const {data,error}=await(await client()).auth.getSession();if(error)throw error;const current=data.session;
 if(!current||current.user.id!==userId||session?.user?.id!==userId)throw Error('Account changed');
 return requestSupabaseQuizRecords({url:quizRecordsUrl,key:supabasePublishableKey,token:current.access_token,userId,method,body,cursor});
}
