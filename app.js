const SUPABASE_URL='https://bfrofclxcjpufqpfyqiz.supabase.co';
const SUPABASE_KEY='sb_publishable_oXyVQBSbjW64hotxW2G-BA_akx34fk1';
const CATEGORIES=['Agricultura','Alimentação','Comércio','Construção','Educação','Eventos','Finanças','Saúde','Serviços','Tecnologia','Transporte','Turismo'];
const state={session:null,user:null,profile:null,profileEditing:false,opportunities:[],ads:[],favorites:new Set(),likes:[],comments:[],likedOpportunities:new Set(),proposals:[],messages:[],unreadMessages:0,notificationTimer:null,deferredInstallPrompt:null,news:[],newsCategory:'',market:[],trendingMode:'all',adClicks:[],notifications:[],discoverProfiles:[],discoverFollows:[],discoverFollowing:new Set(),discoverFilter:'all',jobs:[],jobType:''};
const $=id=>document.getElementById(id);
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);
const sessionKey='link_direto_session_v2';

document.addEventListener('DOMContentLoaded',async()=>{
  fillCategories();
  updatePublishPreview();
  initTechInteractions();
  initInstallApp();
  const recoveryHandled=await handlePasswordRecoveryLink();
  if(!recoveryHandled){
    try{state.session=JSON.parse(localStorage.getItem(sessionKey)||'null')}catch{}
    if(state.session?.access_token){await restoreSession();if(state.user)startNotificationPolling()}
  }
  setInterval(()=>{if(state.session?.refresh_token)refreshSession()},40*60*1000);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');
});

function initTechInteractions(){
  const updateNetwork=()=>{const subtitle=$('headerSubtitle');if(!subtitle)return;subtitle.textContent=navigator.onLine?'Sistema online • oportunidades perto de ti':'Sem ligação • tenta novamente';document.body.classList.toggle('is-offline',!navigator.onLine)};
  updateNetwork();window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);
  document.addEventListener('click',event=>{const button=event.target.closest('button,.btn');if(!button||button.disabled)return;if(navigator.vibrate)navigator.vibrate(8);if(!button.matches('.btn,.choice,.account,.tabs button,.icon-btn,.notification-panel button'))return;const rect=button.getBoundingClientRect(),size=Math.max(rect.width,rect.height)*1.8,ripple=document.createElement('i');ripple.className='tech-ripple';ripple.style.width=ripple.style.height=`${size}px`;ripple.style.left=`${event.clientX-rect.left}px`;ripple.style.top=`${event.clientY-rect.top}px`;button.appendChild(ripple);setTimeout(()=>ripple.remove(),550)});
}

function isIosDevice(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function isStandaloneApp(){return window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true}
function initInstallApp(){
  const button=$('installAppButton');
  if(!button)return;
  if(isStandaloneApp()){button.classList.add('hidden');return}
  button.classList.remove('hidden');
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();state.deferredInstallPrompt=event;button.classList.remove('hidden')});
  window.addEventListener('appinstalled',()=>{
    state.deferredInstallPrompt=null;
    button.classList.add('hidden');
    toast('Link Direto instalado com sucesso.');
    continueWithoutInstall();
  });
}
async function installLinkDireto(){
  if(isStandaloneApp()){toast('O Link Direto já está instalado.');return}
  if(state.deferredInstallPrompt){
    state.deferredInstallPrompt.prompt();
    try{await state.deferredInstallPrompt.userChoice}catch{}
    state.deferredInstallPrompt=null;
    return;
  }
  if(isIosDevice()){
    openModal('<div class="install-guide"><span class="install-phone">📲</span><h2>Instalar Link Direto</h2><p>No iPhone/iPad:</p><ol><li>Abre esta página no <b>Safari</b>.</li><li>Toca em <b>Partilhar ⬆️</b>.</li><li>Escolhe <b>Adicionar à Tela de Início</b>.</li><li>Toca em <b>Adicionar</b>.</li></ol><button class="btn primary" onclick="closeModal()">Entendido</button></div>');
    return;
  }
  openModal('<div class="install-guide"><span class="install-phone">📲</span><h2>Instalar Link Direto</h2><p>Abre o menu do navegador e escolhe <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p><button class="btn primary" onclick="closeModal()">Entendido</button></div>');
}

function fillCategories(){
  const options=CATEGORIES.map(c=>`<option>${c}</option>`).join('');
  $('pCategory').innerHTML=options;$('businessCategory').innerHTML=options;
  $('searchCategory').innerHTML='<option value="">Todas categorias</option>'+options;
}
function enterApp(){
  $('splash').classList.add('hidden');
  if(isStandaloneApp()){openMainApp();return}
  $('installGate')?.classList.remove('hidden');
}
function continueWithoutInstall(){
  $('installGate')?.classList.add('hidden');
  openMainApp();
}
function openMainApp(){
  $('app').classList.remove('hidden');
  loadPublicData();
}

function showView(name,button){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('view-'+name).classList.add('active');document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active'));(button||document.querySelector(`[data-view="${name}"]`))?.classList.add('active');scrollTo(0,0);if(name==='connect')loadConnect().then(()=>markMessagesSeen());if(name==='profile')renderProfile();if(name==='news')loadNews();if(name==='trending')renderTrending();if(name==='market')loadMarket();if(name==='jobs')loadJobs();if(name==='discover')loadDiscover();if(name==='ads')renderAdvertiserDashboard()}
function openPublish(type='tenho'){showView('publish');document.querySelector(`input[name="ptype"][value="${type}"]`).checked=true;if(!state.user)openAuth()}
function handleAccountClick(){state.user?showView('profile'):openAuth()}
function toast(message,error=false){const t=$('toast');t.textContent=message;t.className='toast show'+(error?' error':'');setTimeout(()=>t.className='toast',3200)}
function openModal(html){$('modalContent').innerHTML=html;$('modal').classList.remove('hidden')}
function closeModal(){$('modal').classList.add('hidden');$('modalContent').innerHTML=''}
function authHeaders(json=true){const h={apikey:SUPABASE_KEY};if(json)h['Content-Type']='application/json';if(state.session?.access_token)h.Authorization=`Bearer ${state.session.access_token}`;return h}
async function api(table,query='',options={}){const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`,{...options,headers:{...authHeaders(options.body instanceof FormData?false:true),...(options.headers||{})}});if(!r.ok)throw new Error(await r.text());if(r.status===204)return null;const text=await r.text();return text?JSON.parse(text):null}

function openAuth(mode='login'){
  openModal(`<div class="auth-intro"><span class="auth-lock">⌾</span><div><h2>Conta empresarial</h2><p>${mode==='login'?'Continua as tuas conexões.':'Cria a identidade digital do teu negócio.'}</p></div></div><div class="tabs"><button class="${mode==='login'?'active':''}" onclick="openAuth('login')">Entrar</button><button class="${mode==='signup'?'active':''}" onclick="openAuth('signup')">Criar conta</button></div><form onsubmit="${mode==='login'?'login':'signup'}(event)">${mode==='signup'?'<label>Nome do negócio<input id="authBusiness" required maxlength="80" placeholder="Ex.: Maputo Soluções"></label>':''}<label>E-mail<input id="authEmail" type="email" required autocomplete="email" placeholder="nome@empresa.com"></label><label>Senha<div class="password-wrap"><input id="authPassword" type="password" required minlength="6" autocomplete="${mode==='login'?'current-password':'new-password'}" placeholder="Mínimo de 6 caracteres"><button type="button" onclick="togglePassword()">MOSTRAR</button></div></label><div class="auth-note"><span>✓</span><span>Os teus dados de conta são protegidos. Nunca partilhamos a tua senha.</span></div><button class="btn primary">${mode==='login'?'Entrar na minha conta':'Criar conta gratuita'}</button>${mode==='login'?'<button class="text-action" type="button" onclick="openPasswordReset()">Esqueci a minha senha</button>':''}</form>`)
}
function togglePassword(){const input=$('authPassword'),button=input?.nextElementSibling;if(!input)return;input.type=input.type==='password'?'text':'password';if(button)button.textContent=input.type==='password'?'MOSTRAR':'OCULTAR'}
function openPasswordReset(){openModal(`<div class="auth-intro"><span class="auth-lock">↺</span><div><h2>Recuperar senha</h2><p>Enviaremos um acesso seguro para o teu e-mail.</p></div></div><form onsubmit="requestPasswordReset(event)"><label>E-mail da conta<input id="resetEmail" type="email" required autocomplete="email" placeholder="nome@empresa.com"></label><button class="btn primary">Enviar acesso</button><button class="text-action" type="button" onclick="openAuth('login')">Voltar para entrar</button></form>`)}
async function requestPasswordReset(e){e.preventDefault();const button=e.submitter;button.disabled=true;button.textContent='A enviar...';try{const redirect=`${location.origin}${location.pathname}`;const r=await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',headers:authHeaders(),body:JSON.stringify({email:$('resetEmail').value.trim()})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.msg||d.message);openModal('<div class="auth-success"><span class="auth-lock">✓</span><h2>Verifica o teu e-mail</h2><p class="muted">Enviámos as instruções para criares uma nova senha.</p><button class="btn primary" onclick="closeModal()">Entendido</button></div>')}catch(err){toast(readableError(err),true);button.disabled=false;button.textContent='Enviar acesso'}}

async function handlePasswordRecoveryLink(){
  const raw=location.hash.startsWith('#')?location.hash.slice(1):'';
  if(!raw)return false;
  const params=new URLSearchParams(raw);
  if(params.get('type')!=='recovery'||!params.get('access_token'))return false;
  state.session={access_token:params.get('access_token'),refresh_token:params.get('refresh_token')||'',token_type:params.get('token_type')||'bearer',expires_in:Number(params.get('expires_in')||3600)};
  localStorage.setItem(sessionKey,JSON.stringify(state.session));
  history.replaceState(null,document.title,location.pathname+location.search);
  openNewPasswordModal();
  return true;
}
function openNewPasswordModal(){
  openModal(`<div class="auth-intro"><span class="auth-lock">🔐</span><div><h2>Criar nova senha</h2><p>Escolhe uma nova senha para a tua conta Link Direto.</p></div></div><form onsubmit="updateRecoveredPassword(event)"><label>Nova senha<div class="password-wrap"><input id="newPassword" type="password" required minlength="6" autocomplete="new-password" placeholder="Mínimo de 6 caracteres"><button type="button" onclick="toggleFieldPassword('newPassword',this)">MOSTRAR</button></div></label><label>Confirmar nova senha<input id="confirmNewPassword" type="password" required minlength="6" autocomplete="new-password" placeholder="Repete a nova senha"></label><button class="btn primary">Guardar nova senha</button></form>`);
}
function toggleFieldPassword(id,button){const input=$(id);if(!input)return;input.type=input.type==='password'?'text':'password';button.textContent=input.type==='password'?'MOSTRAR':'OCULTAR'}
async function updateRecoveredPassword(e){
  e.preventDefault();
  const button=e.submitter,password=$('newPassword').value,confirm=$('confirmNewPassword').value;
  if(password!==confirm){toast('As duas senhas não são iguais.',true);return}
  button.disabled=true;button.textContent='A guardar...';
  try{
    const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{method:'PUT',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${state.session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({password})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.msg||d.message||'PASSWORD_UPDATE');
    state.user=d;
    state.session={...state.session,user:d};
    localStorage.setItem(sessionKey,JSON.stringify(state.session));
    await loadProfile();await loadAdminStatus();updateAccountUI();
    openModal('<div class="auth-success"><span class="auth-lock">✓</span><h2>Senha alterada</h2><p class="muted">A tua nova senha já está ativa. Podes continuar no Link Direto.</p><button class="btn primary" onclick="closeModal(); openMainApp();">Continuar</button></div>');
  }catch(err){toast('Não foi possível alterar a senha. Pede um novo link de recuperação.',true);button.disabled=false;button.textContent='Guardar nova senha'}
}
async function signup(e){e.preventDefault();const button=e.submitter;button.disabled=true;button.textContent='A criar conta...';try{const r=await fetch(`${SUPABASE_URL}/auth/v1/signup`,{method:'POST',headers:authHeaders(),body:JSON.stringify({email:$('authEmail').value.trim(),password:$('authPassword').value,data:{business_name:$('authBusiness').value.trim()}})});const d=await r.json();if(!r.ok)throw new Error(d.msg||d.message);if(d.access_token){setSession(d);await afterLogin();showView('profile');toast('Conta criada com sucesso.')}else{openModal('<div class="auth-success"><span class="auth-lock">✓</span><h2>Conta criada</h2><p class="muted">Confirma o teu e-mail. Depois volta para entrar na conta.</p><button class="btn primary" onclick="openAuth(\'login\')">Ir para entrar</button></div>')}}catch(err){toast(readableError(err),true);button.disabled=false;button.textContent='Criar conta gratuita'}}
async function login(e){e.preventDefault();try{const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:authHeaders(),body:JSON.stringify({email:$('authEmail').value,password:$('authPassword').value})});const d=await r.json();if(!r.ok)throw new Error(d.error_description||d.msg||d.message);setSession(d);await afterLogin();toast('Sessão iniciada com sucesso.')}catch(err){toast(readableError(err),true)}}
function setSession(d){state.session=d;state.user=d.user;localStorage.setItem(sessionKey,JSON.stringify(d))}
async function refreshSession(){if(!state.session?.refresh_token)return false;try{const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:state.session.refresh_token})});const d=await r.json();if(!r.ok)throw new Error();setSession(d);return true}catch{return false}}
async function restoreSession(){try{let r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(false)});if(!r.ok&&await refreshSession())r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(false)});if(!r.ok)throw new Error();state.user=await r.json();await loadProfile();await loadAdminStatus();updateAccountUI()}catch{localStorage.removeItem(sessionKey);state.session=null;state.user=null}}
async function afterLogin(){closeModal();await loadProfile();await loadAdminStatus();await loadFavorites();updateAccountUI();renderProfile();loadPublicData();startNotificationPolling()}
async function logout(){try{await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:authHeaders(false)})}catch{}stopNotificationPolling();localStorage.removeItem(sessionKey);state.session=null;state.user=null;state.profile=null;state.profileEditing=false;state.isAdmin=false;state.adminProfiles=[];state.favorites.clear();state.likedOpportunities.clear();state.unreadMessages=0;updateNotificationBadge();updateAccountUI();renderProfile();showView('home');toast('Sessão terminada.')}
function updateAccountUI(){$('accountButton').textContent=state.profile?.business_name?.split(' ')[0]||'Entrar'}
function readableError(err){const s=String(err.message||err);if(s.includes('Invalid login'))return'E-mail ou senha incorretos.';if(s.includes('already registered'))return'Este e-mail já está registado.';if(s.includes('rate limit'))return'Tentaste muitas vezes. Aguarda alguns minutos.';return'Não foi possível concluir. Confirma os dados e tenta novamente.'}

// ===== ADMIN DE VERIFICACAO LINK DIRETO =====
async function loadAdminStatus(){
  state.isAdmin=false;
  if(!state.user)return false;
  try{
    const rows=await api('link_admins',`?user_id=eq.${state.user.id}&select=user_id&limit=1`);
    state.isAdmin=Boolean(rows?.length);
  }catch(err){console.warn('admin status',err);state.isAdmin=false}
  return state.isAdmin;
}
function injectAdminControl(){
  document.querySelectorAll('.ld-admin-verify-btn').forEach(x=>x.remove());
  if(!state.user||!state.isAdmin)return;
  const make=()=>{const b=document.createElement('button');b.type='button';b.className='btn secondary ld-admin-verify-btn';b.innerHTML='🇲🇿 ✓ Gerir verificados';b.onclick=openVerificationAdmin;return b};
  const summary=$('profileSummary');if(summary&&!summary.classList.contains('hidden'))summary.appendChild(make());
  const form=$('profileForm');if(form&&!form.classList.contains('hidden'))form.appendChild(make());
}
async function openVerificationAdmin(){
  if(!state.isAdmin){toast('Esta área é reservada ao administrador.',true);return}
  openModal(`<div class="ld-admin-head"><span>${verifiedBadge('large')}</span><div><h2>Contas verificadas</h2><p>Escolhe quem recebe o selo oficial do Link Direto.</p></div></div><div class="ld-admin-search"><input id="ldAdminSearch" type="search" placeholder="Pesquisar nome ou localização..." oninput="filterVerificationAdmin(this.value)"></div><div id="verificationAdminList"><div class="loading">A carregar perfis...</div></div>`);
  try{state.adminProfiles=await api('profiles','?select=id,business_name,account_type,location,verified&order=business_name.asc&limit=300')||[];renderVerificationAdmin(state.adminProfiles)}
  catch(err){console.error(err);$('verificationAdminList').innerHTML='<div class="empty">Não foi possível carregar as contas.</div>'}
}
function filterVerificationAdmin(value=''){
  const q=String(value).trim().toLowerCase();
  const rows=(state.adminProfiles||[]).filter(p=>!q||`${p.business_name||''} ${p.location||''}`.toLowerCase().includes(q));
  renderVerificationAdmin(rows);
}
function renderVerificationAdmin(rows=[]){
  const el=$('verificationAdminList');if(!el)return;
  el.innerHTML=rows.map(p=>`<div class="ld-admin-profile"><div class="ld-admin-profile-main"><div class="ld-admin-mini-avatar">${esc(discoverInitials(p.business_name))}</div><div><b>${esc(p.business_name||'Perfil Link Direto')} ${p.verified?verifiedBadge('small'):''}</b><small>${esc(discoverTypeLabel(discoverType(p)))}${p.location?` · ${esc(p.location)}`:''}</small></div></div><button class="${p.verified?'btn ghost':'btn primary'}" onclick="setProfileVerifiedAdmin('${p.id}',${p.verified?'false':'true'})">${p.verified?'Retirar selo':'✓ Verificar'}</button></div>`).join('')||'<div class="empty">Nenhuma conta encontrada.</div>';
}
async function setProfileVerifiedAdmin(profileId,newVerified){
  if(!state.isAdmin)return;
  try{
    await api('rpc/set_profile_verified','',{method:'POST',body:JSON.stringify({target_profile_id:profileId,new_verified:Boolean(newVerified)})});
    const p=(state.adminProfiles||[]).find(x=>String(x.id)===String(profileId));if(p)p.verified=Boolean(newVerified);
    const publicP=state.discoverProfiles.find(x=>String(x.id)===String(profileId));if(publicP)publicP.verified=Boolean(newVerified);
    if(state.profile&&String(state.profile.id)===String(profileId))state.profile.verified=Boolean(newVerified);
    filterVerificationAdmin($('ldAdminSearch')?.value||'');renderDiscover();renderProfile();
    toast(newVerified?'Conta verificada com sucesso.':'Selo retirado da conta.');
  }catch(err){console.error(err);toast('Não foi possível alterar o verificado. Confirma o SQL de administrador.',true)}
}
(function addVerificationAdminStyles(){
  if(document.getElementById('ld-admin-verify-styles'))return;
  const st=document.createElement('style');st.id='ld-admin-verify-styles';st.textContent=`
  .ld-admin-head{display:flex;gap:12px;align-items:center;margin-bottom:14px}.ld-admin-head h2{margin:0 0 4px}.ld-admin-head p{margin:0;color:var(--muted,#8d968f)}
  .ld-admin-search{margin-bottom:12px}.ld-admin-search input{width:100%;box-sizing:border-box;padding:13px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:inherit;font:inherit}
  .ld-admin-profile{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.08)}
  .ld-admin-profile-main{display:flex;align-items:center;gap:10px;min-width:0}.ld-admin-profile-main b{display:flex;align-items:center;gap:5px}.ld-admin-profile-main small{display:block;margin-top:3px;color:var(--muted,#8d968f)}
  .ld-admin-mini-avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#17221b;font-weight:800;flex:none}.ld-admin-verify-btn{margin-top:10px;width:100%}
  `;document.head.appendChild(st);
})();


async function loadProfile(){if(!state.user)return;try{const d=await api('profiles',`?id=eq.${state.user.id}&select=*`);state.profile=d?.[0]||null;if(!state.profile){await api('profiles','',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({id:state.user.id,business_name:state.user.user_metadata?.business_name||'Meu negócio',account_type:'company'})});const p=await api('profiles',`?id=eq.${state.user.id}&select=*`);state.profile=p?.[0]}}catch(err){console.error(err)}}
function setAvatar(element,url,name='LD'){if(!element)return;const initials=(name||'LD').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();element.textContent=initials;if(url){element.style.backgroundImage=`url("${String(url).replace(/["\\]/g,'')}")`;element.classList.add('has-image')}else{element.style.backgroundImage='';element.classList.remove('has-image')}}
function previewBusinessAvatar(e){const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){toast('A imagem deve ter menos de 5 MB.',true);e.target.value='';return}setAvatar($('profileAvatar'),URL.createObjectURL(file),$('businessName').value)}
function profileComplete(p={}){return Boolean(p.business_name&&p.business_name!=='Meu negócio'&&p.category&&p.location&&p.bio)}
function editProfile(){state.profileEditing=true;renderProfile();setTimeout(()=>$('businessName')?.focus(),80)}
function cancelProfileEdit(){if(!profileComplete(state.profile||{})){toast('Preenche os campos obrigatórios e guarda o perfil primeiro.',true);return}state.profileEditing=false;renderProfile()}
function renderProfile(){const logged=!!state.user,p=state.profile||{},complete=profileComplete(p),showSummary=logged&&complete&&!state.profileEditing;$('profileGuest').classList.toggle('hidden',logged);$('profileSummary').classList.toggle('hidden',!showSummary);$('profileForm').classList.toggle('hidden',!logged||showSummary);if(!logged)return;$('businessName').value=p.business_name||'';if($('businessAccountType'))$('businessAccountType').value=p.account_type||'company';$('businessCategory').value=p.category||CATEGORIES[0];$('businessLocation').value=p.location||'';$('businessPhone').value=p.phone||'';$('businessBio').value=p.bio||'';$('profileName').innerHTML=`<span class="${p.verified?'ld-verified-name':''}">${esc(p.business_name||'Meu negócio')}${p.verified?verifiedBadge('small'):''}</span>`;setAvatar($('profileAvatar'),p.avatar_url,p.business_name);setAvatar($('profileSummaryAvatar'),p.avatar_url,p.business_name);if($('profileEmail'))$('profileEmail').textContent=state.user?.email||'Conta empresarial';if($('profileVerified')){$('profileVerified').innerHTML=p.verified?`${verifiedBadge('small')} Verificado`:(state.user?.email_confirmed_at?'✓ E-mail confirmado':'E-mail por confirmar');$('profileVerified').classList.toggle('ld-verified-name',!!p.verified)}if($('cardCategory'))$('cardCategory').textContent=p.category||'Categoria';if($('cardLocation'))$('cardLocation').textContent=p.location||'Moçambique';if($('summaryName'))$('summaryName').innerHTML=`<span class="${p.verified?'ld-verified-name':''}">${esc(p.business_name||'Meu negócio')}${p.verified?verifiedBadge('large'):''}</span>`;if($('summaryCategory'))$('summaryCategory').textContent=p.category||'Categoria';if($('summaryLocation'))$('summaryLocation').textContent=p.location||'Moçambique';if($('summaryBio'))$('summaryBio').textContent=p.bio||'Adiciona uma descrição do teu negócio.';if($('summaryPhone')){$('summaryPhone').textContent=p.phone||'Contacto não informado';$('summaryPhone').classList.toggle('muted',!p.phone)}const score=40+(p.category?10:0)+(p.location?10:0)+(p.phone?10:0)+(p.bio?10:0)+(p.avatar_url?10:0);$('profileScore').textContent=`Link Score ${score}`;if($('profileProgress'))$('profileProgress').style.width=`${score}%`;if($('summaryScore'))$('summaryScore').textContent=`Link Score ${score}`;injectAdminControl()}
async function saveProfile(e){e.preventDefault();if(!requireAuth())return;const button=e.submitter;button.disabled=true;button.textContent='A guardar...';try{let avatar_url=state.profile?.avatar_url||null;const avatarFile=$('businessAvatar').files?.[0];if(avatarFile)avatar_url=await uploadImage(avatarFile);const body={business_name:$('businessName').value.trim(),account_type:$('businessAccountType')?.value||'company',category:$('businessCategory').value,location:$('businessLocation').value.trim(),phone:$('businessPhone').value.trim(),bio:$('businessBio').value.trim(),avatar_url,updated_at:new Date().toISOString()};await api('profiles',`?id=eq.${state.user.id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});state.profile={...state.profile,...body};state.profileEditing=false;$('businessAvatar').value='';updateAccountUI();renderProfile();toast('Perfil concluído e guardado.')}catch(err){console.error(err);toast('Não foi possível guardar o perfil.',true)}finally{button.disabled=false;button.textContent='Concluir e guardar perfil'}}
function requireAuth(){if(state.user)return true;openAuth();toast('Entra primeiro na tua conta.');return false}

async function loadPublicData(){
  const requests=[
    api('opportunities','?select=*&order=created_at.desc&limit=100'),
    api('advertisements','?select=*&status=eq.active&order=created_at.desc&limit=20'),
    api('opportunity_likes','?select=user_id,opportunity_id&limit=5000'),
    api('opportunity_comments','?select=*&order=created_at.asc&limit=5000')
  ];
  const [oppsR,adsR,likesR,commentsR]=await Promise.allSettled(requests);
  state.opportunities=oppsR.status==='fulfilled'?(oppsR.value||[]):[];
  const now=Date.now();
  const ads=adsR.status==='fulfilled'?(adsR.value||[]):[];
  state.ads=ads.filter(a=>!a.expires_at||new Date(a.expires_at).getTime()>now);
  state.likes=likesR.status==='fulfilled'?(likesR.value||[]):[];
  state.comments=commentsR.status==='fulfilled'?(commentsR.value||[]):[];
  state.likedOpportunities=new Set(state.user?state.likes.filter(x=>x.user_id===state.user.id).map(x=>String(x.opportunity_id)):[]);
  if(state.user)await loadFavorites();
  renderHome();renderSearch();renderAds();
  loadDiscover(false);
  loadV16Data();
  if(oppsR.status==='rejected'){
    console.error('opportunities',oppsR.reason);
    if($('homeFeed'))$('homeFeed').innerHTML='<div class="empty">Não foi possível carregar as oportunidades agora.</div>';
  }
}

async function loadFavorites(){if(!state.user)return;try{const d=await api('favorites',`?user_id=eq.${state.user.id}&select=opportunity_id`);state.favorites=new Set((d||[]).map(x=>String(x.opportunity_id)))}catch{}}
function likeCount(id){return state.likes.filter(x=>String(x.opportunity_id)===String(id)).length}
function commentCount(id){return state.comments.filter(x=>String(x.opportunity_id)===String(id)).length}
function shareBaseUrl(){return `${location.origin}${location.pathname}`}
async function shareContent({title,text,url=shareBaseUrl()}){try{if(navigator.share){await navigator.share({title,text,url});return}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(`${text}\n${url}`);toast('Link copiado. Já podes compartilhar.');return}window.prompt('Copia este link para compartilhar:',url)}catch(err){if(err?.name!=='AbortError')toast('Não foi possível abrir a partilha.',true)}}
function shareOpportunity(id){const o=state.opportunities.find(x=>String(x.id)===String(id));if(!o)return;const kind=o.type==='tenho'?'Oferta':'Pedido';const text=`${kind}: ${o.title}${o.location?` — ${o.location}`:''}. Veja no Link Direto.`;shareContent({title:o.title||'Link Direto',text})}
function shareJob(id){const j=state.jobs.find(x=>String(x.id)===String(id));if(!j)return;const text=`Vaga: ${j.title} na ${j.company_name}${j.location?` — ${j.location}`:''}. Veja esta oportunidade no Link Direto.`;shareContent({title:`${j.title} — ${j.company_name}`,text})}
function opportunityMediaItems(o){
  const images=[];
  if(Array.isArray(o.image_urls))o.image_urls.forEach(url=>{if(url&&!images.includes(url))images.push(url)});
  if(o.image_url&&!images.includes(o.image_url))images.unshift(o.image_url);
  const items=images.map(url=>({type:'image',url}));
  if(o.video_url)items.unshift({type:'video',url:o.video_url});
  return items;
}
function opportunityCard(o){
  const saved=state.favorites.has(String(o.id)),liked=state.likedOpportunities.has(String(o.id));
  const mine=state.user&&o.user_id===state.user.id;
  const items=opportunityMediaItems(o),cover=items[0];
  const media=cover?(cover.type==='video'
    ?`<div class="card-media-wrap" onclick="event.stopPropagation();openOpportunityDetail('${o.id}',0)"><video class="card-media" src="${esc(cover.url)}" controls playsinline preload="metadata" onclick="event.stopPropagation()"></video>${items.length>1?`<span class="media-count-badge">1/${items.length}</span>`:''}</div>`
    :`<div class="card-media-wrap" onclick="event.stopPropagation();openOpportunityDetail('${o.id}',0)"><img class="card-media" src="${esc(cover.url)}" alt="Imagem da publicação" loading="lazy">${items.length>1?`<span class="media-count-badge">📷 ${items.length}</span>`:''}</div>`):'';
  return `<article class="card opportunity-clickable" onclick="openOpportunityDetail('${o.id}')">${media}<div class="card-body"><div class="card-top"><span class="tag ${o.type==='tenho'?'green':''}">${esc((o.type||'preciso').toUpperCase())} • ${esc(o.category)}</span>${o.status==='closed'?'<span class="tag">Fechado</span>':''}</div><h3>${esc(o.title)}</h3><p>${esc(o.description)}</p><div class="meta"><span>📍 ${esc(o.location)}</span><span>⏱ ${formatDate(o.created_at)}</span></div><div class="social-actions" onclick="event.stopPropagation()"><button class="social-btn ${liked?'active':''}" onclick="toggleLike('${o.id}')" aria-label="Gostar desta publicação">♥ <span>${likeCount(o.id)}</span></button><button class="social-btn" onclick="openComments('${o.id}')" aria-label="Abrir comentários">◌ <span>${commentCount(o.id)}</span></button><button class="social-btn" onclick="shareOpportunity('${o.id}')" aria-label="Compartilhar esta publicação">↗ <span>Compartilhar</span></button></div><div class="card-actions" onclick="event.stopPropagation()">${mine?`<button class="btn secondary" onclick="manageOpportunity('${o.id}')">Gerir anúncio</button>`:`<button class="btn primary" onclick="openProposal('${o.id}','${o.user_id||''}')">Enviar proposta</button>`}<button class="icon-btn ${saved?'saved':''}" onclick="toggleFavorite('${o.id}')">★</button></div></div></article>`;
}
function openOpportunityDetail(id,index=0){
  const o=state.opportunities.find(x=>String(x.id)===String(id));if(!o)return;
  const items=opportunityMediaItems(o);let i=Math.max(0,Math.min(Number(index)||0,Math.max(0,items.length-1)));
  const mine=state.user&&o.user_id===state.user.id;
  const saved=state.favorites.has(String(o.id)),liked=state.likedOpportunities.has(String(o.id));
  let gallery='';
  if(items.length){
    const m=items[i];
    const main=m.type==='video'?`<video src="${esc(m.url)}" controls autoplay playsinline></video>`:`<img src="${esc(m.url)}" alt="Foto ${i+1} de ${items.length}">`;
    const prev=(i-1+items.length)%items.length,next=(i+1)%items.length;
    const thumbs=items.map((x,n)=>`<button type="button" class="post-detail-thumb ${n===i?'active':''}" onclick="openOpportunityDetail('${o.id}',${n})">${x.type==='video'?'<span>▶</span>':`<img src="${esc(x.url)}" alt="">`}</button>`).join('');
    gallery=`<div class="post-detail-gallery">${main}${items.length>1?`<button class="post-detail-nav prev" type="button" onclick="openOpportunityDetail('${o.id}',${prev})">‹</button><button class="post-detail-nav next" type="button" onclick="openOpportunityDetail('${o.id}',${next})">›</button><span class="post-detail-counter">${i+1} / ${items.length}</span>`:''}</div>${items.length>1?`<div class="post-detail-thumbs">${thumbs}</div>`:''}`;
  }
  openModal(`<div class="post-detail">${gallery}<div class="post-detail-copy"><span class="tag ${o.type==='tenho'?'green':''}">${esc((o.type||'preciso').toUpperCase())} • ${esc(o.category||'')}</span><h2>${esc(o.title||'Publicação')}</h2><div class="post-detail-meta"><span>📍 ${esc(o.location||'Moçambique')}</span><span>⏱ ${formatDate(o.created_at)}</span>${items.length?`<span>📷 ${items.filter(x=>x.type==='image').length} foto(s)${items.some(x=>x.type==='video')?' + vídeo':''}</span>`:''}</div><p>${esc(o.description||'')}</p><div class="post-detail-actions"><button class="btn secondary" onclick="toggleLike('${o.id}');openOpportunityDetail('${o.id}',${i})">♥ ${likeCount(o.id)}</button><button class="btn secondary" onclick="shareOpportunity('${o.id}')">↗ Compartilhar</button>${mine?`<button class="btn primary full" onclick="manageOpportunity('${o.id}')">Gerir anúncio</button>`:`<button class="btn primary full" onclick="openProposal('${o.id}','${o.user_id||''}')">Enviar proposta</button>`}<button class="btn ghost full ${saved?'saved':''}" onclick="toggleFavorite('${o.id}');openOpportunityDetail('${o.id}',${i})">★ ${saved?'Guardado':'Guardar'}</button></div></div></div>`);
}
function renderHome(){$('homeFeed').innerHTML=state.opportunities.slice(0,6).map(opportunityCard).join('')||'<div class="empty">Ainda não existem oportunidades.</div>';$('homeAd').innerHTML=state.ads[0]?adCard(state.ads[0]):'';if($('statOpps'))$('statOpps').textContent=state.opportunities.length;if($('statAds'))$('statAds').textContent=state.discoverProfiles.length||state.ads.length;renderForYou()}
function quickCategory(category){$('searchCategory').value=category;renderSearch()}
function updatePublishPreview(){const type=document.querySelector('input[name="ptype"]:checked')?.value?.toUpperCase()||'TENHO';const title=$('pTitle')?.value?.trim()||'O teu anúncio aparecerá aqui';const category=$('pCategory')?.value||'Categoria';const location=$('pLocation')?.value?.trim()||'Localização';if($('publishPreview'))$('publishPreview').innerHTML=`<small>${esc(type)} • ${esc(category)}</small><b>${esc(title)}</b><span>📍 ${esc(location)}</span>`}
function renderSearch(){const text=($('searchText')?.value||'').toLowerCase(),type=$('searchType')?.value||'',cat=$('searchCategory')?.value||'';const items=state.opportunities.filter(o=>(!type||o.type===type)&&(!cat||o.category===cat)&&(!text||`${o.title} ${o.description} ${o.location}`.toLowerCase().includes(text)));$('searchFeed').innerHTML=items.map(opportunityCard).join('')||'<div class="empty">Nenhuma oportunidade encontrada.</div>'}
function formatDate(v){if(!v)return'Agora';return new Date(v).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}
function mediaMime(file){if(file.type)return file.type;const ext=(file.name.split('.').pop()||'').toLowerCase();return({mov:'video/quicktime',mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'})[ext]||'application/octet-stream'}
async function uploadImage(file,bucket='opportunity-images'){if(!file)return null;if(!requireAuth())return null;const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${state.user.id}/${Date.now()}-${safe}`;const r=await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${state.session.access_token}`,'Content-Type':mediaMime(file),'x-upsert':'false'},body:file});if(!r.ok){const detail=await r.text();if(r.status===413||/too large|maximum|limit/i.test(detail))throw new Error('UPLOAD_SIZE');if(/bucket|not found/i.test(detail))throw new Error('UPLOAD_BUCKET');if(r.status===401||r.status===403)throw new Error('UPLOAD_PERMISSION');throw new Error('UPLOAD_FAILED')}return`${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`}
function getVideoDuration(file){return new Promise((resolve,reject)=>{const video=document.createElement('video'),url=URL.createObjectURL(file);video.preload='metadata';video.onloadedmetadata=()=>{URL.revokeObjectURL(url);resolve(video.duration)};video.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('video inválido'))};video.src=url})}
async function validateOpportunityMedia(file){if(!file)return null;const type=mediaMime(file);if(type.startsWith('image/')){if(file.size>10*1024*1024)throw new Error('IMAGE_SIZE');return'image'}if(type.startsWith('video/')){if(file.size>50*1024*1024)throw new Error('VIDEO_SIZE');const duration=await getVideoDuration(file);if(!Number.isFinite(duration)||duration>60.25)throw new Error('VIDEO_DURATION');return'video'}throw new Error('MEDIA_TYPE')}
async function previewOpportunityMedia(e){
  const files=[...(e.target.files||[])],hint=$('mediaHint');
  if(!files.length){if(hint)hint.textContent='Até 8 fotos + 1 vídeo de até 60 segundos.';return}
  try{
    const images=files.filter(f=>mediaMime(f).startsWith('image/')),videos=files.filter(f=>mediaMime(f).startsWith('video/'));
    if(images.length>8)throw new Error('TOO_MANY_IMAGES');
    if(videos.length>1)throw new Error('TOO_MANY_VIDEOS');
    if(files.length>9)throw new Error('TOO_MANY_FILES');
    for(const f of files)await validateOpportunityMedia(f);
    if(hint)hint.textContent=`✓ ${images.length} foto(s)${videos.length?' + 1 vídeo':''} selecionado(s)`;
  }catch(err){
    e.target.value='';if(hint)hint.textContent='Até 8 fotos + 1 vídeo de até 60 segundos.';
    const messages={TOO_MANY_IMAGES:'Podes publicar no máximo 8 fotos.',TOO_MANY_VIDEOS:'Podes publicar apenas 1 vídeo por post.',TOO_MANY_FILES:'Seleciona no máximo 8 fotos e 1 vídeo.',VIDEO_DURATION:'O vídeo deve ter no máximo 60 segundos.',VIDEO_SIZE:'O vídeo deve ter menos de 50 MB.',IMAGE_SIZE:'Cada fotografia deve ter menos de 10 MB.'};
    toast(messages[err.message]||'Um dos ficheiros não pode ser utilizado.',true);
  }
}
async function submitOpportunity(e){
  e.preventDefault();if(!requireAuth())return;
  const button=e.submitter;button.disabled=true;button.textContent='A preparar ficheiros...';
  try{
    const files=[...($('pMedia').files||[])];
    const images=files.filter(f=>mediaMime(f).startsWith('image/')),videos=files.filter(f=>mediaMime(f).startsWith('video/'));
    if(images.length>8)throw new Error('TOO_MANY_IMAGES');if(videos.length>1)throw new Error('TOO_MANY_VIDEOS');
    for(const f of files)await validateOpportunityMedia(f);
    const image_urls=[];let video_url=null;
    for(let n=0;n<images.length;n++){button.textContent=`A enviar foto ${n+1}/${images.length}...`;image_urls.push(await uploadImage(images[n],'opportunity-images'))}
    if(videos[0]){button.textContent='A enviar vídeo...';video_url=await uploadImage(videos[0],'opportunity-images')}
    button.textContent='A publicar...';
    const body={user_id:state.user.id,type:document.querySelector('input[name="ptype"]:checked').value,title:$('pTitle').value.trim(),category:$('pCategory').value,description:$('pDescription').value.trim(),location:$('pLocation').value.trim(),image_url:image_urls[0]||null,image_urls,video_url,status:'active'};
    await api('opportunities','',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
    e.target.reset();if($('mediaHint'))$('mediaHint').textContent='Até 8 fotos + 1 vídeo de até 60 segundos.';
    toast('Publicação criada com sucesso.');await loadPublicData();showView('home');
  }catch(err){
    console.error(err);
    const messages={TOO_MANY_IMAGES:'Podes publicar no máximo 8 fotos.',TOO_MANY_VIDEOS:'Podes publicar apenas 1 vídeo por post.',VIDEO_DURATION:'O vídeo deve ter no máximo 60 segundos.',VIDEO_SIZE:'O vídeo ultrapassa 50 MB.',IMAGE_SIZE:'Uma fotografia ultrapassa 10 MB.',UPLOAD_SIZE:'Um dos ficheiros é demasiado grande para o Supabase.',UPLOAD_BUCKET:'O espaço de ficheiros ainda não está configurado.',UPLOAD_PERMISSION:'Sem autorização para enviar. Sai e entra novamente na conta.',UPLOAD_FAILED:'Falha ao enviar um ficheiro. Verifica a internet e tenta novamente.',MEDIA_TYPE:'Formato não suportado.'};
    toast(messages[err.message]||'Não foi possível publicar. Confirma se executaste o SQL da galeria no Supabase.',true);
  }finally{button.disabled=false;button.textContent='Publicar agora'}
}
async function toggleFavorite(id){if(!requireAuth())return;try{if(state.favorites.has(String(id))){await api('favorites',`?user_id=eq.${state.user.id}&opportunity_id=eq.${id}`,{method:'DELETE'});state.favorites.delete(String(id))}else{await api('favorites','',{method:'POST',body:JSON.stringify({user_id:state.user.id,opportunity_id:id})});state.favorites.add(String(id))}renderHome();renderSearch()}catch{toast('Não foi possível guardar o favorito.',true)}}
async function toggleLike(id){if(!requireAuth())return;try{if(state.likedOpportunities.has(String(id))){await api('opportunity_likes',`?user_id=eq.${state.user.id}&opportunity_id=eq.${id}`,{method:'DELETE'});state.likes=state.likes.filter(x=>!(x.user_id===state.user.id&&String(x.opportunity_id)===String(id)));state.likedOpportunities.delete(String(id))}else{await api('opportunity_likes','',{method:'POST',body:JSON.stringify({user_id:state.user.id,opportunity_id:id})});state.likes.push({user_id:state.user.id,opportunity_id:id});state.likedOpportunities.add(String(id))}renderHome();renderSearch()}catch{toast('Não foi possível registar o like.',true)}}
function commentsFor(id){return state.comments.filter(x=>String(x.opportunity_id)===String(id))}
function commentsMarkup(id){const items=commentsFor(id);return items.map(c=>`<div class="comment"><div><b>${esc(c.author_name||'Utilizador')}</b><small>${formatDate(c.created_at)}</small></div><p>${esc(c.body)}</p>${state.user?.id===c.user_id?`<button onclick="deleteComment('${c.id}','${id}')">Eliminar</button>`:''}</div>`).join('')||'<div class="empty">Ainda não existem comentários. Sê o primeiro.</div>'}
function openComments(id){const o=state.opportunities.find(x=>String(x.id)===String(id));openModal(`<div class="comments-head"><span>◌</span><div><h2>Comentários</h2><p>${esc(o?.title||'Publicação')}</p></div></div><div class="comments-list">${commentsMarkup(id)}</div>${state.user?`<form class="comment-form" onsubmit="submitComment(event,'${id}')"><label>O teu comentário<textarea id="commentBody" required maxlength="500" placeholder="Escreve algo útil sobre esta oportunidade..."></textarea></label><button class="btn primary">Comentar</button></form>`:'<button class="btn primary" onclick="openAuth(\'login\')">Entrar para comentar</button>'}`)}
async function submitComment(e,id){e.preventDefault();const body=$('commentBody').value.trim();if(!body)return;try{const data={opportunity_id:id,user_id:state.user.id,author_name:state.profile?.business_name||state.user.email?.split('@')[0]||'Utilizador',body};const created=await api('opportunity_comments','',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(data)});state.comments.push(created?.[0]||{...data,id:Date.now(),created_at:new Date().toISOString()});openComments(id);renderHome();renderSearch();toast('Comentário publicado.')}catch{toast('Não foi possível publicar o comentário.',true)}}
async function deleteComment(commentId,opportunityId){if(!confirm('Eliminar este comentário?'))return;try{await api('opportunity_comments',`?id=eq.${commentId}&user_id=eq.${state.user.id}`,{method:'DELETE'});state.comments=state.comments.filter(x=>String(x.id)!==String(commentId));openComments(opportunityId);renderHome();renderSearch()}catch{toast('Não foi possível eliminar o comentário.',true)}}
function manageOpportunity(id){const o=state.opportunities.find(x=>String(x.id)===String(id));openModal(`<h2>Gerir publicação</h2><h3>${esc(o.title)}</h3><p>${esc(o.description)}</p><button class="btn secondary" onclick="setOpportunityStatus('${id}','${o.status==='closed'?'active':'closed'}')">${o.status==='closed'?'Reabrir':'Marcar como concluída'}</button><button class="btn ghost" onclick="deleteOpportunity('${id}')">Eliminar publicação</button>`)}
async function setOpportunityStatus(id,status){try{await api('opportunities',`?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({status})});closeModal();await loadPublicData();toast('Publicação atualizada.')}catch{toast('Não foi possível atualizar.',true)}}
async function deleteOpportunity(id){if(!confirm('Eliminar esta publicação?'))return;try{await api('opportunities',`?id=eq.${id}`,{method:'DELETE'});closeModal();await loadPublicData();toast('Publicação eliminada.')}catch{toast('Não foi possível eliminar.',true)}}

function openProposal(opportunityId,ownerId){if(!requireAuth())return;if(!ownerId){toast('Esta publicação antiga não tem proprietário associado.',true);return}const o=state.opportunities.find(x=>String(x.id)===String(opportunityId));openModal(`<h2>Proposta Direta</h2><p>Para: <b>${esc(o?.title||'Oportunidade')}</b></p><form onsubmit="submitProposal(event,'${opportunityId}','${ownerId}')"><label>Mensagem<textarea id="proposalMessage" required placeholder="Explica o que podes oferecer..."></textarea></label><label>Valor estimado (opcional)<input id="proposalPrice" inputmode="decimal" placeholder="Ex.: 5 000 MZN"></label><label>Prazo (opcional)<input id="proposalDeadline" placeholder="Ex.: Entrega em 3 dias"></label><button class="btn primary">Enviar proposta</button></form>`)}
async function submitProposal(e,opportunityId,ownerId){e.preventDefault();const o=state.opportunities.find(x=>String(x.id)===String(opportunityId));try{await api('proposals','',{method:'POST',body:JSON.stringify({opportunity_id:opportunityId,opportunity_title:o?.title||'Oportunidade',sender_id:state.user.id,owner_id:ownerId,message:$('proposalMessage').value.trim(),price:$('proposalPrice').value.trim(),deadline:$('proposalDeadline').value.trim(),status:'pending'})});closeModal();toast('Proposta enviada.');loadConnect()}catch{toast('Não foi possível enviar a proposta.',true)}}
function seenMessagesKey(){return state.user?`link_direto_messages_seen_${state.user.id}`:'link_direto_messages_seen'}
function checkedMessagesKey(){return state.user?`link_direto_messages_checked_${state.user.id}`:'link_direto_messages_checked'}
function startNotificationPolling(){if(!state.user)return;stopNotificationPolling();const now=new Date().toISOString();if(!localStorage.getItem(seenMessagesKey()))localStorage.setItem(seenMessagesKey(),now);if(!localStorage.getItem(checkedMessagesKey()))localStorage.setItem(checkedMessagesKey(),now);updateNotificationPanel();pollNotifications(true);state.notificationTimer=setInterval(()=>pollNotifications(false),8000)}
function stopNotificationPolling(){if(state.notificationTimer)clearInterval(state.notificationTimer);state.notificationTimer=null}
function updateNotificationBadge(){const badge=$('connectBadge');if(!badge)return;badge.textContent=state.unreadMessages>99?'99+':String(state.unreadMessages);badge.classList.toggle('hidden',!state.unreadMessages)}
function updateNotificationPanel(){const panel=$('notificationPanel'),button=$('notificationButton');if(!panel||!button)return;panel.classList.toggle('hidden',!state.user);const enabled='Notification'in window&&Notification.permission==='granted';panel.classList.toggle('enabled',enabled);button.textContent=enabled?'Ativadas':'Ativar'}
async function enableNotifications(){if(!('Notification'in window)){toast('Este navegador não permite alertas. O contador no Connect continuará ativo.',true);return}try{const permission=await Notification.requestPermission();updateNotificationPanel();toast(permission==='granted'?'Notificações ativadas.':'Permissão de notificações não autorizada.',permission!=='granted')}catch{toast('Não foi possível ativar as notificações.',true)}}
async function showMessageNotification(message){const text=(message.body||'Recebeste uma nova mensagem.').slice(0,100);if(!document.querySelector('#view-connect.active'))toast(`Nova mensagem: ${text}`);if(!('Notification'in window)||Notification.permission!=='granted')return;try{if('serviceWorker'in navigator){const registration=await navigator.serviceWorker.ready;await registration.showNotification('Nova mensagem no Link Direto',{body:text,icon:'./icon-192.png',badge:'./icon-192.png',tag:`message-${message.id}`,data:{url:`${location.pathname}?v=8`}})}else new Notification('Nova mensagem no Link Direto',{body:text,icon:'./icon-192.png'})}catch{}}
async function pollNotifications(silent=false){if(!state.user)return;try{const seen=localStorage.getItem(seenMessagesKey())||new Date().toISOString();const checked=localStorage.getItem(checkedMessagesKey())||seen;const [unread,newItems]=await Promise.all([api('messages',`?receiver_id=eq.${state.user.id}&created_at=gt.${encodeURIComponent(seen)}&select=id&order=created_at.asc&limit=100`),api('messages',`?receiver_id=eq.${state.user.id}&created_at=gt.${encodeURIComponent(checked)}&select=id,body,created_at&order=created_at.asc&limit=20`)]);state.unreadMessages=(unread||[]).length;updateNotificationBadge();if(!silent&&newItems?.length)await showMessageNotification(newItems[newItems.length-1]);localStorage.setItem(checkedMessagesKey(),new Date().toISOString())}catch(err){console.error('notification check',err)}}
function markMessagesSeen(){if(!state.user)return;const now=new Date().toISOString();localStorage.setItem(seenMessagesKey(),now);localStorage.setItem(checkedMessagesKey(),now);state.unreadMessages=0;updateNotificationBadge()}
async function loadConnect(){if(!state.user){$('connectContent').innerHTML='<div class="empty">Entra na tua conta para veres propostas e conversas.</div>';return}try{state.proposals=await api('proposals',`?or=(sender_id.eq.${state.user.id},owner_id.eq.${state.user.id})&order=created_at.desc` )||[];$('pendingCount').textContent=state.proposals.filter(p=>p.status==='pending').length;$('acceptedCount').textContent=state.proposals.filter(p=>p.status==='accepted').length;$('messageCount').textContent=state.proposals.filter(p=>p.status==='accepted').length;$('connectContent').innerHTML=state.proposals.map(proposalCard).join('')||'<div class="empty">Ainda não existem propostas.</div>'}catch(err){console.error(err);$('connectContent').innerHTML='<div class="empty">Não foi possível carregar as propostas.</div>'}}
function proposalCard(p){const incoming=p.owner_id===state.user.id;return `<article class="card"><div class="card-body"><div class="card-top"><span class="tag ${p.status==='accepted'?'green':p.status==='pending'?'yellow':''}">${p.status==='pending'?'PENDENTE':p.status==='accepted'?'ACEITE':'RECUSADA'}</span><small>${incoming?'Recebida':'Enviada'}</small></div><h3>${esc(p.opportunity_title)}</h3><p>${esc(p.message)}</p><div class="meta"><span>${esc(p.price||'Valor a combinar')}</span><span>${esc(p.deadline||'Prazo a combinar')}</span></div><div class="card-actions">${incoming&&p.status==='pending'?`<button class="btn primary" onclick="updateProposal('${p.id}','accepted')">Aceitar</button><button class="icon-btn" onclick="updateProposal('${p.id}','rejected')">×</button>`:p.status==='accepted'?`<button class="btn primary" onclick="openChat('${p.id}','${incoming?p.sender_id:p.owner_id}')">Abrir conversa</button>`:'<button class="btn secondary" disabled>A aguardar resposta</button>'}</div></div></article>`}
async function updateProposal(id,status){try{await api('proposals',`?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({status})});toast(status==='accepted'?'Proposta aceite. Chat aberto.':'Proposta recusada.');loadConnect()}catch{toast('Não foi possível atualizar.',true)}}
async function openChat(proposalId,otherId){const proposal=state.proposals.find(p=>String(p.id)===String(proposalId));try{state.messages=await api('messages',`?proposal_id=eq.${proposalId}&order=created_at.asc`)||[];openModal(`<h2>Sala de Negócio</h2><p>${esc(proposal?.opportunity_title||'Conversa')}</p><div class="chat-note">As mensagens ficam guardadas até serem apagadas.</div><div id="chatMessages" class="chat">${renderMessages(proposalId,otherId)}</div><form onsubmit="sendMessage(event,'${proposalId}','${otherId}')"><label>Mensagem<input id="chatInput" required autocomplete="off" maxlength="2000" placeholder="Escreve uma mensagem..."></label><button class="btn primary">Enviar</button></form>`);setTimeout(()=>{const c=$('chatMessages');if(c)c.scrollTop=c.scrollHeight},0)}catch(err){console.error(err);toast('Não foi possível abrir a conversa. Executa o SQL da V14 no Supabase.',true)}}
function messageVisibleToMe(m){if(m.deleted_for_everyone)return false;if(m.sender_id===state.user.id&&m.deleted_by_sender)return false;if(m.receiver_id===state.user.id&&m.deleted_by_receiver)return false;return true}
function renderMessages(proposalId,otherId){const visible=state.messages.filter(messageVisibleToMe);return visible.map(m=>{const mine=m.sender_id===state.user.id;return `<div class="bubble-wrap ${mine?'mine-wrap':''}"><div class="bubble ${mine?'mine':''} ${m.is_pinned?'pinned':''}">${m.is_pinned?'<span class="pin-label">📌 FIXADA</span>':''}<span class="bubble-text">${esc(m.body)}</span><div class="bubble-meta"><small>${new Date(m.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</small><button class="message-menu" type="button" aria-label="Opções da mensagem" onclick="openMessageActions('${m.id}','${proposalId}','${otherId}')">⋮</button></div></div></div>`}).join('')||'<div class="empty">Inicia a conversa.</div>'}
async function sendMessage(e,proposalId,receiverId){e.preventDefault();const body=$('chatInput').value.trim();if(!body)return;const button=e.submitter;button.disabled=true;try{await api('messages','',{method:'POST',body:JSON.stringify({proposal_id:proposalId,sender_id:state.user.id,receiver_id:receiverId,body})});await openChat(proposalId,receiverId)}catch(err){console.error(err);toast('Não foi possível enviar a mensagem.',true)}finally{button.disabled=false}}
function openMessageActions(messageId,proposalId,otherId){const m=state.messages.find(x=>String(x.id)===String(messageId));if(!m)return;const mine=m.sender_id===state.user.id;openModal(`<h2>Mensagem</h2><div class="message-action-preview">${esc(m.body)}</div><div class="message-actions"><button class="btn secondary" onclick="togglePinMessage('${messageId}','${proposalId}','${otherId}',${m.is_pinned?'false':'true'})">${m.is_pinned?'📌 Desafixar mensagem':'📌 Fixar mensagem'}</button><button class="btn secondary" onclick="deleteMessageForMe('${messageId}','${proposalId}','${otherId}')">🗑️ Apagar para mim</button>${mine?`<button class="btn danger" onclick="deleteMessageForEveryone('${messageId}','${proposalId}','${otherId}')">🗑️ Apagar para todos</button>`:''}<button class="btn ghost" onclick="openChat('${proposalId}','${otherId}')">Cancelar</button></div>`)}
async function togglePinMessage(messageId,proposalId,otherId,pinned){try{await api('messages',`?id=eq.${messageId}`,{method:'PATCH',body:JSON.stringify({is_pinned:pinned})});toast(pinned?'Mensagem fixada.':'Mensagem desafixada.');await openChat(proposalId,otherId)}catch(err){console.error(err);toast('Não foi possível alterar a mensagem. Executa o SQL da V14.',true)}}
async function deleteMessageForMe(messageId,proposalId,otherId){const m=state.messages.find(x=>String(x.id)===String(messageId));if(!m)return;const field=m.sender_id===state.user.id?'deleted_by_sender':'deleted_by_receiver';try{await api('messages',`?id=eq.${messageId}`,{method:'PATCH',body:JSON.stringify({[field]:true})});toast('Mensagem apagada para ti.');await openChat(proposalId,otherId)}catch(err){console.error(err);toast('Não foi possível apagar. Executa o SQL da V14.',true)}}
async function deleteMessageForEveryone(messageId,proposalId,otherId){const m=state.messages.find(x=>String(x.id)===String(messageId));if(!m||m.sender_id!==state.user.id)return;if(!confirm('Apagar esta mensagem para todos?'))return;try{await api('messages',`?id=eq.${messageId}`,{method:'PATCH',body:JSON.stringify({deleted_for_everyone:true})});toast('Mensagem apagada para todos.');await openChat(proposalId,otherId)}catch(err){console.error(err);toast('Não foi possível apagar para todos. Executa o SQL da V14.',true)}}

function adCard(a){return `<article class="ad-card">${a.image_url?`<img src="${esc(a.image_url)}" alt="">`:''}<span class="ad-label">PATROCINADO</span><div class="card-body"><span class="tag yellow">${esc(a.package_name||'VITRINE')}</span><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><div class="meta"><span>📍 ${esc(a.target_location||'Moçambique')}</span><span>◎ ${esc(a.target_category||'Todos os negócios')}</span></div>${a.cta_url?`<a class="btn primary link-btn" href="${safeUrl(a.cta_url)}" target="_blank" rel="noopener" onclick="trackAdClick('${a.id}')">Saber mais</a>`:''}</div></article>`}
function renderAds(){$('adsFeed').innerHTML=state.ads.map(adCard).join('')||'<div class="empty">Ainda não existem campanhas ativas. Sê a primeira empresa em destaque.</div>'}
function safeUrl(v){try{const u=new URL(v);return['http:','https:'].includes(u.protocol)?esc(u.href):'#'}catch{return'#'}}
function openAdForm(){if(!requireAuth())return;openModal(`<h2>Criar Link Ads</h2><p>Escolhe durante quanto tempo a promoção ficará visível.</p><form onsubmit="submitAd(event)"><label>Pacote<select id="adPackage"><option>Impulso</option><option selected>Vitrine</option><option>Campanha</option></select></label><label>Duração<select id="adDuration"><option value="24">24 horas</option><option value="168" selected>7 dias</option><option value="720">30 dias</option></select></label><label>Título<input id="adTitle" required maxlength="100"></label><label>Descrição<textarea id="adDescription" required maxlength="500"></textarea></label><label>Categoria do público<select id="adCategory"><option value="">Todos os negócios</option>${CATEGORIES.map(c=>`<option>${c}</option>`).join('')}</select></label><label>Localização alvo<input id="adLocation" placeholder="Ex.: Maputo"></label><label>Link ou WhatsApp<input id="adUrl" type="url" placeholder="https://..."></label><label>Imagem<input id="adImage" type="file" accept="image/*"></label><button class="btn primary">Criar campanha</button></form>`)}
async function submitAd(e){e.preventDefault();try{const image_url=await uploadImage($('adImage').files[0],'ad-images');const hours=Number($('adDuration').value||168),expires_at=new Date(Date.now()+hours*60*60*1000).toISOString();await api('advertisements','',{method:'POST',body:JSON.stringify({owner_id:state.user.id,package_name:$('adPackage').value,title:$('adTitle').value.trim(),description:$('adDescription').value.trim(),target_category:$('adCategory').value,target_location:$('adLocation').value.trim(),cta_url:$('adUrl').value.trim(),image_url,status:'active',expires_at})});closeModal();toast('Campanha criada com duração definida.');await loadPublicData();showView('ads')}catch(err){console.error(err);toast('Não foi possível criar a campanha. Executa o SQL da V14 no Supabase.',true)}}


// ===== V15 LINK NEWS =====
function newsTimeAgo(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';const sec=Math.floor((Date.now()-d.getTime())/1000);if(sec<60)return 'agora';if(sec<3600)return `${Math.floor(sec/60)} min`;if(sec<86400)return `${Math.floor(sec/3600)} h`;if(sec<604800)return `${Math.floor(sec/86400)} d`;return d.toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}
function newsSafeLink(v){try{const u=new URL(v);return['http:','https:'].includes(u.protocol)?esc(u.href):'#'}catch{return'#'}}
function newsEmoji(category=''){const c=category.toLowerCase();if(c.includes('tecn'))return '📱';if(c.includes('desporto'))return '⚽';if(c.includes('neg'))return '💼';if(c.includes('entre'))return '🎬';if(c.includes('áfrica')||c.includes('africa'))return '🌍';return '🇲🇿'}
function buildDemoNews(){
 const now=Date.now();
 const items=[
  ['Moçambique','O que está a movimentar a economia digital moçambicana','Um resumo demonstrativo sobre inovação, serviços digitais e novas oportunidades para pequenos negócios.','🇲🇿'],
  ['Tecnologia','5 tendências tecnológicas para acompanhar esta semana','Inteligência artificial, pagamentos digitais, vídeo móvel e novas ferramentas para criadores estão entre os temas em destaque.','📱'],
  ['Negócios','Pequenos negócios ganham novas formas de chegar aos clientes','Conteúdo demonstrativo sobre comércio digital, divulgação online e atendimento direto pelo celular.','💼'],
  ['Entretenimento','Criadores locais apostam cada vez mais em formatos curtos','Vídeos rápidos, bastidores e conteúdos verticais continuam a transformar a forma de comunicar com o público.','🎬'],
  ['Desporto','Agenda desportiva: temas para acompanhar nos próximos dias','Uma seleção demonstrativa de assuntos desportivos para dar vida ao protótipo do Link News.','⚽'],
  ['África','Inovação africana ganha espaço em novas plataformas digitais','Startups, criadores e pequenos empreendedores africanos encontram novas formas de alcançar mercados e audiências.','🌍'],
  ['Moçambique','Guia rápido: oportunidades digitais para jovens e empreendedores','Ideias, ferramentas e tendências que podem ajudar a transformar uma presença online em novas oportunidades.','🇲🇿'],
  ['Tecnologia','Celular continua no centro da criação e do comércio digital','Do vídeo à venda de produtos, o smartphone concentra cada vez mais tarefas do dia a dia digital.','📱']
 ];
 // muda a ordem a cada dia para o protótipo parecer sempre atualizado
 const day=Math.floor(now/86400000);
 const rotated=items.slice(day%items.length).concat(items.slice(0,day%items.length));
 return rotated.map((x,i)=>({id:'demo-'+i,category:x[0],title:x[1],summary:x[2],source_name:'Link News · DEMO',original_url:'',image_url:'',published_at:new Date(now-(i*37+8)*60000).toISOString(),status:'published',is_demo:true}));
}
async function loadNews(force=false){const feed=$('newsFeed');if(feed&&(!state.news.length||force))feed.innerHTML='<div class="loading">A atualizar notícias...</div>';try{const rows=await api('news_items','?select=*&status=eq.published&order=published_at.desc&limit=80');state.news=(rows&&rows.length)?rows:buildDemoNews();renderNews();if(force)toast((rows&&rows.length)?'Notícias atualizadas.':'Modo demonstração atualizado.')}catch(err){console.error('news',err);state.news=buildDemoNews();renderNews();if(force)toast('Modo demonstração atualizado.')}}
function filterNews(category,button){state.newsCategory=category;document.querySelectorAll('.news-categories button').forEach(b=>b.classList.remove('active'));button?.classList.add('active');renderNews()}
function smartNewsOpen(n){if(n?.is_demo||!n?.original_url)return;const url=newsSafeLink(n.original_url);if(url&&url!=='#')window.open(url,'_blank','noopener')}
function renderNews(){const filtered=state.newsCategory?state.news.filter(n=>(n.category||'').toLowerCase()===state.newsCategory.toLowerCase()):state.news;const ticker=$('newsTicker');if(ticker)ticker.textContent=state.news.slice(0,3).map(n=>n.title).join('  •  ')||'As principais notícias vão aparecer aqui.';const demoMode=state.news.length&&state.news.every(n=>n.is_demo);const demoBanner=$('newsDemoBanner');if(demoBanner)demoBanner.classList.toggle('hidden',!demoMode);const lead=$('newsLead'),feed=$('newsFeed');if(!lead||!feed)return;if(!filtered.length){lead.innerHTML='';feed.innerHTML='<div class="news-empty"><b>Sem notícias nesta categoria.</b>As novas publicações aparecerão automaticamente.</div>';return}const top=filtered[0];const topMedia=top.image_url?`<img class="smart-lead-media" src="${esc(top.image_url)}" alt="" loading="eager">`:`<div class="smart-lead-placeholder">${newsEmoji(top.category)}</div>`;lead.innerHTML=`<article class="smart-lead" role="button" tabindex="0" onclick='smartNewsOpen(${JSON.stringify(top).replace(/'/g,"&#39;")})'><div class="smart-lead-media-wrap">${topMedia}</div><div class="smart-lead-shade"></div><div class="smart-lead-copy"><div class="smart-lead-topline"><span class="smart-category">${top.is_demo?'DEMO · ':''}${esc(top.category||'Destaque')}</span><span>${esc(top.source_name||'Fonte')}</span><span>·</span><span>${newsTimeAgo(top.published_at)}</span></div><h3>${esc(top.title)}</h3><p>${esc(top.summary||'')}</p></div></article>`;feed.innerHTML=filtered.slice(1).map(newsCard).join('')||'<div class="news-empty">Mais notícias serão adicionadas em breve.</div>'}
function newsCard(n){const media=n.image_url?`<img src="${esc(n.image_url)}" alt="" loading="lazy">`:newsEmoji(n.category);const payload=JSON.stringify(n).replace(/'/g,"&#39;");return `<article class="smart-news-card" role="button" tabindex="0" onclick='smartNewsOpen(${payload})'><div class="smart-news-thumb">${media}</div><div class="smart-news-copy"><div class="smart-news-meta"><span class="smart-category">${n.is_demo?'DEMO · ':''}${esc(n.category||'Notícia')}</span><span>${newsTimeAgo(n.published_at)}</span></div><h3>${esc(n.title)}</h3><p>${esc(n.summary||'')}</p><div class="smart-source">${esc(n.source_name||'Fonte')}${n.is_demo?'':' · Ler na fonte ↗'}</div></div></article>`}
// ===== V19 MATCH DIRETO =====
const MATCH_STOPWORDS=new Set('de da do das dos e em para por com um uma uns umas o a os as que quero preciso tenho procuro procura vender comprar venda compra disponivel disponível oferta pedido'.split(' '));
function matchWords(value=''){return [...new Set(String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2&&!MATCH_STOPWORDS.has(w)))];}
function wordOverlap(a,b){const A=matchWords(a),B=new Set(matchWords(b));if(!A.length||!B.size)return 0;const hits=A.filter(w=>B.has(w)).length;return hits/Math.max(1,Math.min(A.length,B.size));}
function activeOwnOpportunities(){if(!state.user)return [];return state.opportunities.filter(o=>o.user_id===state.user.id&&o.status!=='closed');}
function matchAgainst(candidate,source){
  if(!candidate||!source||String(candidate.id)===String(source.id))return {percent:0,reasons:[]};
  if(candidate.user_id&&source.user_id&&candidate.user_id===source.user_id)return {percent:0,reasons:[]};
  let points=0;const reasons=[];
  const opposite=(source.type==='tenho'&&candidate.type==='preciso')||(source.type==='preciso'&&candidate.type==='tenho');
  if(!opposite)return {percent:0,reasons:[]};
  points+=34;reasons.push(source.type==='tenho'?'Precisa do que tens':'Tem o que precisas');
  if(String(candidate.category||'').toLowerCase()===String(source.category||'').toLowerCase()){points+=28;reasons.push('Mesma categoria')}
  const textA=`${source.title||''} ${source.description||''}`,textB=`${candidate.title||''} ${candidate.description||''}`;
  const overlap=wordOverlap(textA,textB);if(overlap>0){points+=Math.min(22,Math.round(overlap*28));if(overlap>=.18)reasons.push('Interesse semelhante')}
  const locA=String(source.location||'').toLowerCase(),locB=String(candidate.location||'').toLowerCase();
  if(locA&&locB&&(locA.includes(locB)||locB.includes(locA))){points+=10;reasons.push('Mesma localização')}
  const age=Math.max(0,(Date.now()-new Date(candidate.created_at).getTime())/86400000);points+=Math.max(0,6-Math.min(6,age/3));
  return {percent:Math.max(55,Math.min(98,Math.round(points))),reasons:[...new Set(reasons)].slice(0,3)};
}
function smartMatch(candidate){
  const own=activeOwnOpportunities();
  if(own.length){let best={percent:0,reasons:[],source:null};for(const source of own){const r=matchAgainst(candidate,source);if(r.percent>best.percent)best={...r,source}}return best}
  // Sem publicação própria ainda: usa o perfil para ordenar recomendações, sem fingir um match bilateral.
  let percent=58,reasons=[];const cat=String(state.profile?.category||'').toLowerCase(),loc=String(state.profile?.location||'').toLowerCase();
  if(cat&&String(candidate.category||'').toLowerCase()===cat){percent+=18;reasons.push('Categoria do teu perfil')}
  if(loc&&String(candidate.location||'').toLowerCase().includes(loc)){percent+=10;reasons.push('Perto de ti')}
  percent+=Math.min(8,likeCount(candidate.id)*2+commentCount(candidate.id)*2);
  return {percent:Math.min(86,percent),reasons:reasons.slice(0,3),source:null};
}
function recommendationScore(o){const m=smartMatch(o);return m.percent+(likeCount(o.id)*.3)+(commentCount(o.id)*.5)}
function matchCard(o){const m=smartMatch(o),reasonHtml=m.reasons.map(r=>`<span>${esc(r)}</span>`).join('');const sourceLabel=m.source?`Match com o teu anúncio: ${esc(m.source.title||'publicação')}`:'Recomendação baseada no teu perfil e atividade';return `<div class="for-you-item v19-match-card"><div class="match-intelligence"><div class="match-percent"><b>${m.percent}%</b><small>compatível</small></div><div class="match-why"><strong>${m.source?'MATCH ENCONTRADO':'RECOMENDADO PARA TI'}</strong><small>${sourceLabel}</small><div class="match-reasons">${reasonHtml}</div></div></div>${opportunityCard(o)}</div>`}
function renderForYou(){const el=$('forYouFeed');if(!el)return;let items=[...state.opportunities].filter(o=>!state.user||o.user_id!==state.user.id);const own=activeOwnOpportunities();if(own.length)items=items.filter(o=>own.some(source=>matchAgainst(o,source).percent>0));items=items.sort((a,b)=>recommendationScore(b)-recommendationScore(a)).slice(0,6);if(items.length){el.innerHTML=items.map(matchCard).join('');return}el.innerHTML=own.length?'<div class="empty match-empty"><b>A procurar o teu match…</b><span>Ainda não apareceu uma publicação compatível. Quando alguém publicar o oposto do que tens ou precisas, vai surgir aqui.</span></div>':'<div class="empty match-empty"><b>Cria o teu primeiro match</b><span>Publica o que TENS ou PRECISAS. O Link Direto começa a procurar o lado oposto automaticamente.</span><button class="btn primary" onclick="openPublish(\'tenho\')">Publicar agora</button></div>'}
function setTrendingMode(mode,button){state.trendingMode=mode;document.querySelectorAll('.trend-tabs button').forEach(x=>x.classList.remove('active'));button?.classList.add('active');renderTrending()}
function trendingOpportunityScore(o){const hours=Math.max(1,(Date.now()-new Date(o.created_at).getTime())/36e5);return (likeCount(o.id)*5+commentCount(o.id)*8+8)/Math.pow(hours+2,.28)}
function renderTrending(){const el=$('trendingFeed');if(!el)return;let html='';if(state.trendingMode!=='news'){const opps=[...state.opportunities].sort((a,b)=>trendingOpportunityScore(b)-trendingOpportunityScore(a)).slice(0,8);html+=opps.map((o,i)=>`<div class="trend-row"><div class="trend-rank">${i+1}</div><div class="trend-content"><span class="trend-label">🔥 ${likeCount(o.id)} likes · ${commentCount(o.id)} comentários</span>${opportunityCard(o)}</div></div>`).join('')}if(state.trendingMode!=='opportunities'&&state.news.length){const news=state.news.slice(0,6);html+=`<div class="trend-news-title">📰 Agora nas notícias</div>`+news.map((n,i)=>`<article class="trend-news"><b>#${i+1}</b><div><span>${esc(n.category||'Notícia')} · ${esc(n.source_name||'Fonte')}</span>${n.is_demo?`<strong>${esc(n.title)}</strong>`:`<a href="${newsSafeLink(n.original_url)}" target="_blank" rel="noopener">${esc(n.title)}</a>`}</div></article>`).join('')}el.innerHTML=html||'<div class="empty">As tendências aparecerão quando houver atividade no Link Direto.</div>'}

function discoverType(p){const t=String(p.account_type||'company').toLowerCase();return ['person','company','organization'].includes(t)?t:'company'}
function discoverTypeLabel(t){return t==='person'?'Pessoa / Profissional':t==='organization'?'Organização':'Empresa'}
function discoverInitials(name='LD'){return String(name||'LD').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'LD'}
function followerCount(profileId){return state.discoverFollows.filter(x=>String(x.following_id)===String(profileId)).length}
function isFollowing(profileId){return state.discoverFollowing.has(String(profileId))}
function setDiscoverFilter(filter,button){state.discoverFilter=filter;document.querySelectorAll('.discover-tabs button').forEach(x=>x.classList.remove('active'));button?.classList.add('active');renderDiscover()}
async function loadDiscover(showLoading=false){
  const feed=$('discoverFeed');if(showLoading&&feed)feed.innerHTML='<div class="loading">A atualizar comunidade...</div>';
  try{
    const profileReq=api('profiles','?select=id,business_name,account_type,category,bio,location,phone,avatar_url,verified,created_at&order=created_at.desc&limit=200');
    const followsReq=api('follows','?select=follower_id,following_id&limit=5000');
    const [profilesR,followsR]=await Promise.allSettled([profileReq,followsReq]);
    if(profilesR.status==='fulfilled')state.discoverProfiles=profilesR.value||[];
    else throw profilesR.reason;
    state.discoverFollows=followsR.status==='fulfilled'?(followsR.value||[]):[];
    state.discoverFollowing=new Set(state.user?state.discoverFollows.filter(x=>String(x.follower_id)===String(state.user.id)).map(x=>String(x.following_id)):[]);
    if($('statAds'))$('statAds').textContent=state.discoverProfiles.length;
    renderDiscover();
  }catch(err){
    console.error('discover',err);
    if(feed)feed.innerHTML='<div class="discover-empty"><b>Comunidade ainda não disponível.</b><span>Executa o ficheiro ATIVAR_V16_7_DESCOBRIR.sql no Supabase.</span></div>';
  }
}
function renderDiscover(){
  const feed=$('discoverFeed');if(!feed)return;
  const q=($('discoverSearch')?.value||'').trim().toLowerCase();
  const filter=state.discoverFilter||'all';
  const rows=state.discoverProfiles.filter(p=>{
    const t=discoverType(p);
    const hay=`${p.business_name||''} ${p.category||''} ${p.location||''} ${p.bio||''}`.toLowerCase();
    return (filter==='all'||t===filter)&&(!q||hay.includes(q));
  });
  if($('discoverTotal'))$('discoverTotal').textContent=state.discoverProfiles.length;
  if($('discoverHeading'))$('discoverHeading').textContent=filter==='company'?'Empresas no Link Direto':filter==='person'?'Pessoas e profissionais':filter==='organization'?'Organizações':'Novos no Link Direto';
  feed.innerHTML=rows.map(discoverCard).join('')||'<div class="discover-empty"><b>Nenhum perfil encontrado.</b><span>Tenta outro nome, categoria ou localização.</span></div>';
}
function verifiedBadge(size=''){return `<span class="ld-verified-badge${size?` ${size}`:''}" title="Conta verificada pelo Link Direto Connect" aria-label="Conta verificada"></span>`}
function discoverCard(p){
  const type=discoverType(p),mine=state.user&&String(state.user.id)===String(p.id),following=isFollowing(p.id),count=followerCount(p.id);
  const avatar=p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="" loading="lazy">`:`<span>${esc(discoverInitials(p.business_name))}</span>`;
  const contact=String(p.phone||'').replace(/[^+\d]/g,'');const wa=contact?`https://wa.me/${contact.replace('+','')}`:'';
  return `<article class="discover-card"><div class="discover-avatar">${avatar}</div><div class="discover-card-main"><div class="discover-name-row"><h3 class="${p.verified?'ld-verified-name':''}">${esc(p.business_name||'Perfil Link Direto')}${p.verified?verifiedBadge('small'):''}</h3></div><div class="discover-meta"><span>${type==='company'?'🏢':type==='organization'?'◉':'●'} ${esc(discoverTypeLabel(type))}</span>${p.category?`<span>• ${esc(p.category)}</span>`:''}</div>${p.location?`<div class="discover-location">📍 ${esc(p.location)}</div>`:''}${p.bio?`<p>${esc(p.bio)}</p>`:''}<div class="discover-footer"><span><b>${count}</b> seguidores</span><div class="discover-actions">${!mine?`<button class="discover-follow ${following?'following':''}" onclick="toggleDiscoverFollow('${p.id}',this)">${following?'A seguir':'Seguir'}</button>`:'<span class="discover-own">O teu perfil</span>'}${wa?`<a class="discover-contact" href="${wa}" target="_blank" rel="noopener">Contactar</a>`:''}</div></div></div></article>`
}
async function toggleDiscoverFollow(profileId,button){
  if(!requireAuth())return;
  if(String(profileId)===String(state.user.id)){toast('Este é o teu próprio perfil.');return}
  button.disabled=true;
  try{
    if(isFollowing(profileId)){
      await api('follows',`?follower_id=eq.${state.user.id}&following_id=eq.${profileId}`,{method:'DELETE'});
      state.discoverFollows=state.discoverFollows.filter(x=>!(String(x.follower_id)===String(state.user.id)&&String(x.following_id)===String(profileId)));
      state.discoverFollowing.delete(String(profileId));
      toast('Deixaste de seguir este perfil.');
    }else{
      await api('follows','',{method:'POST',body:JSON.stringify({follower_id:state.user.id,following_id:profileId})});
      state.discoverFollows.push({follower_id:state.user.id,following_id:profileId});
      state.discoverFollowing.add(String(profileId));
      toast('Agora estás a seguir este perfil.');
    }
    renderDiscover();
  }catch(err){console.error(err);toast('Não foi possível atualizar o seguimento.',true)}finally{button.disabled=false}
}
async function loadMarket(showLoading=true){const el=$('marketFeed');if(showLoading&&el)el.innerHTML='<div class="loading">A carregar mercado...</div>';try{state.market=await api('market_listings','?select=*&status=eq.active&order=created_at.desc&limit=100')||[];renderMarket()}catch(err){if(el)el.innerHTML='<div class="market-empty"><b>Link Market ainda não está ativado.</b><span>Executa o ficheiro ATIVAR_V16_COMERCIAL.sql no Supabase.</span></div>'}}
function renderMarket(){const el=$('marketFeed');if(!el)return;const q=($('marketSearch')?.value||'').toLowerCase(),cat=$('marketCategory')?.value||'';const rows=state.market.filter(x=>(!cat||x.category===cat)&&(!q||`${x.title} ${x.description} ${x.seller_name} ${x.location}`.toLowerCase().includes(q)));el.innerHTML=rows.map(marketCard).join('')||'<div class="market-empty"><b>Nenhum produto encontrado.</b><span>Os anúncios publicados aparecerão aqui.</span></div>'}
function moneyMzn(v){const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat('pt-MZ',{style:'currency',currency:'MZN',maximumFractionDigits:0}).format(n):esc(v||'Preço sob consulta')}
function marketCard(x){const contact=String(x.contact||'').replace(/[^+\d]/g,'');const wa=contact?`https://wa.me/${contact.replace('+','')}`:'';return `<article class="market-card">${x.image_url?`<img src="${esc(x.image_url)}" alt="">`:`<div class="market-placeholder">▣</div>`}<div class="market-body"><span class="market-cat">${esc(x.category||'Produto')}</span><h3>${esc(x.title)}</h3><b class="market-price">${moneyMzn(x.price)}</b><p>${esc(x.description||'')}</p><div class="market-meta"><span>📍 ${esc(x.location||'Moçambique')}</span><span>${x.is_verified?'✅ Verificado':esc(x.seller_name||'Vendedor')}</span></div>${wa?`<a class="btn primary" href="${wa}" target="_blank" rel="noopener">Falar no WhatsApp</a>`:''}</div></article>`}
function openMarketForm(){if(!requireAuth())return;openModal(`<h2>Vender no Link Market</h2><p>Cria uma montra simples e deixa o cliente falar contigo diretamente.</p><form onsubmit="submitMarketListing(event)"><label>Produto / serviço<input id="marketTitle" required maxlength="100"></label><label>Categoria<select id="marketFormCategory"><option>Tecnologia</option><option>Telefones</option><option>Câmaras e Lentes</option><option>Equipamento</option><option>Serviços</option><option>Outros</option></select></label><label>Preço (MZN)<input id="marketPrice" type="number" min="0" step="1" placeholder="Ex.: 25000"></label><label>Descrição<textarea id="marketDescription" required maxlength="600"></textarea></label><label>Localização<input id="marketLocation" required value="${esc(state.profile?.location||'')}"></label><label>WhatsApp / telefone<input id="marketContact" required value="${esc(state.profile?.phone||'')}"></label><label>Fotografia<input id="marketImage" type="file" accept="image/*"></label><button class="btn primary">Publicar no Mercado</button></form>`)}
async function submitMarketListing(e){e.preventDefault();const b=e.submitter;b.disabled=true;try{const image_url=await uploadImage($('marketImage').files[0],'market-images');const data={owner_id:state.user.id,seller_name:state.profile?.business_name||state.user.email?.split('@')[0]||'Vendedor',title:$('marketTitle').value.trim(),category:$('marketFormCategory').value,price:Number($('marketPrice').value)||null,description:$('marketDescription').value.trim(),location:$('marketLocation').value.trim(),contact:$('marketContact').value.trim(),image_url,status:'active',is_verified:Boolean(state.profile?.is_verified)};await api('market_listings','',{method:'POST',body:JSON.stringify(data)});closeModal();toast('Produto publicado no Link Market.');await loadMarket();showView('market')}catch(err){console.error(err);toast('Não foi possível publicar. Executa o SQL da V16.',true)}finally{b.disabled=false}}
async function trackAdClick(adId){try{await api('ad_clicks','',{method:'POST',body:JSON.stringify({ad_id:adId,user_id:state.user?.id||null})})}catch{}}
async function loadAdAnalytics(){try{state.adClicks=await api('ad_clicks','?select=ad_id,created_at&limit=5000')||[];renderAdvertiserDashboard()}catch{}}
function renderAdvertiserDashboard(){const el=$('advertiserDashboard');if(!el)return;if(!state.user){el.classList.add('hidden');return}const mine=state.ads.filter(a=>a.owner_id===state.user.id);if(!mine.length){el.classList.add('hidden');return}const ids=new Set(mine.map(x=>String(x.id))),clicks=state.adClicks.filter(c=>ids.has(String(c.ad_id))).length;el.classList.remove('hidden');el.innerHTML=`<div class="ad-dash-head"><div><span class="eyebrow">ÁREA DO ANUNCIANTE</span><h3>Desempenho das tuas campanhas</h3></div><span class="verified-chip">${state.profile?.is_verified?'✅ Perfil verificado':'Perfil comercial'}</span></div><div class="ad-dash-grid"><div><b>${mine.length}</b><span>Campanhas</span></div><div><b>${clicks}</b><span>Cliques</span></div><div><b>${mine.filter(a=>!a.expires_at||new Date(a.expires_at)>new Date()).length}</b><span>Ativas</span></div></div>`}
function refreshNotificationCenter(){const list=[];if(state.unreadMessages>0)list.push({icon:'💬',title:`${state.unreadMessages} mensagem(ns) nova(s)`,text:'Abre o Connect para responder.'});if(state.news[0])list.push({icon:'📰',title:'Link News atualizado',text:state.news[0].title});if(state.market[0])list.push({icon:'🛍️',title:'Novidades no Mercado',text:state.market[0].title});state.notifications=list;const badge=$('notificationCenterBadge');if(badge){badge.textContent=list.length;badge.classList.toggle('hidden',!list.length)}}
function openNotificationCenter(){refreshNotificationCenter();const rows=state.notifications.map(n=>`<div class="notification-item"><span>${n.icon}</span><div><b>${esc(n.title)}</b><p>${esc(n.text)}</p></div></div>`).join('')||'<div class="empty">Não tens novas notificações.</div>';openModal(`<h2>🔔 Notificações</h2><div class="notification-center">${rows}</div><button class="btn primary" onclick="closeModal();showView('connect')">Abrir Connect</button>`)}

// ===== LINK DIRETO V17 — EMPREGOS =====
function jobTypeLabel(type){return ({full_time:'Tempo inteiro',part_time:'Part-time',internship:'Estágio',contract:'Contrato',temporary:'Temporário'})[type]||'Emprego'}
function jobInitials(name='LD'){return String(name||'LD').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'LD'}
function jobDateLabel(date){if(!date)return'Prazo não indicado';const d=new Date(date+'T12:00:00');if(Number.isNaN(d.getTime()))return esc(date);return 'Até '+new Intl.DateTimeFormat('pt-MZ',{day:'2-digit',month:'short',year:'numeric'}).format(d)}
function setJobType(type,button){state.jobType=type;document.querySelectorAll('.jobs-chips button').forEach(x=>x.classList.remove('active'));button?.classList.add('active');renderJobs()}
async function loadJobs(showLoading=false){
  const el=$('jobsFeed');if(showLoading&&el)el.innerHTML='<div class="loading">A atualizar vagas...</div>';
  try{state.jobs=await api('jobs','?select=*&status=eq.active&order=featured.desc,created_at.desc&limit=150')||[];renderJobs()}
  catch(err){console.error('jobs',err);if(el)el.innerHTML='<div class="jobs-empty"><b>Empregos ainda não está ativado.</b><span>Executa o ficheiro ATIVAR_V17_EMPREGOS.sql no Supabase e volta a atualizar.</span></div>'}
}
function renderJobs(){
  const el=$('jobsFeed');if(!el)return;
  const q=($('jobSearch')?.value||'').trim().toLowerCase(),cat=$('jobCategory')?.value||'',type=state.jobType||'';
  const rows=(state.jobs||[]).filter(j=>{const hay=`${j.title||''} ${j.company_name||''} ${j.location||''} ${j.category||''} ${j.description||''}`.toLowerCase();return(!q||hay.includes(q))&&(!cat||j.category===cat)&&(!type||j.employment_type===type)});
  el.innerHTML=rows.map(jobCard).join('')||'<div class="jobs-empty"><b>Nenhuma vaga encontrada.</b><span>Tenta outra pesquisa ou categoria.</span></div>';
}
function jobCard(j){
  const featured=j.featured?'<div class="job-featured">★ VAGA EM DESTAQUE</div>':'';
  return `<article class="job-card ${j.featured?'featured':''}">${featured}<div class="job-top"><div class="job-logo">${esc(jobInitials(j.company_name))}</div><div class="job-main"><h3>${esc(j.title)}</h3><div class="job-company">${esc(j.company_name)}</div><div class="job-meta"><span>📍 ${esc(j.location)}</span><span>💼 ${esc(jobTypeLabel(j.employment_type))}</span><span>${esc(j.category||'Outros')}</span></div><p class="job-description">${esc(j.description)}</p></div></div><div class="job-footer"><span class="job-date">${jobDateLabel(j.deadline)}</span><div class="job-actions"><button class="job-share-btn" onclick="shareJob('${j.id}')">↗ Compartilhar</button><button class="job-details-btn" onclick="openJobDetails('${j.id}')">Detalhes</button><button class="job-apply-btn" onclick="openJobApplication('${j.id}')">Candidatar-me</button></div></div></article>`
}
function openJobDetails(id){
  const j=state.jobs.find(x=>String(x.id)===String(id));if(!j)return;
  openModal(`<div class="auth-intro"><span class="auth-lock">💼</span><div><h2>${esc(j.title)}</h2><p>${esc(j.company_name)} · 📍 ${esc(j.location)}</p></div></div><div class="job-detail-list"><div class="job-detail-box"><small>TIPO DE VAGA</small><p>${esc(jobTypeLabel(j.employment_type))} · ${esc(j.category||'Outros')}</p></div><div class="job-detail-box"><small>DESCRIÇÃO</small><p>${esc(j.description)}</p></div>${j.requirements?`<div class="job-detail-box"><small>REQUISITOS</small><p>${esc(j.requirements)}</p></div>`:''}<div class="job-detail-box"><small>PRAZO</small><p>${jobDateLabel(j.deadline)}</p></div></div><div class="job-detail-actions"><button class="btn secondary" onclick="shareJob('${j.id}')">↗ Compartilhar</button><button class="btn primary" onclick="closeModal();openJobApplication('${j.id}')">Candidatar-me</button></div>`)
}
function openJobForm(){
  if(!requireAuth())return;
  const company=state.profile?.business_name||'';
  openModal(`<div class="auth-intro"><span class="auth-lock">＋</span><div><h2>Publicar vaga</h2><p>Encontra candidatos diretamente no Link Direto.</p></div></div><form onsubmit="submitJob(event)"><label>Empresa<input id="jobCompany" required maxlength="100" value="${esc(company)}" placeholder="Nome da empresa"></label><label>Cargo<input id="jobTitle" required maxlength="120" placeholder="Ex.: Assistente Administrativo"></label><div class="job-form-grid"><label>Categoria<select id="jobFormCategory" required><option>Administração</option><option>Atendimento</option><option>Audiovisual</option><option>Comercial e Vendas</option><option>Construção</option><option>Contabilidade e Finanças</option><option>Educação</option><option>Hotelaria e Turismo</option><option>Logística e Transporte</option><option>Marketing</option><option>Saúde</option><option>Tecnologia</option><option>Outros</option></select></label><label>Tipo<select id="jobEmploymentType"><option value="full_time">Tempo inteiro</option><option value="part_time">Part-time</option><option value="internship">Estágio</option><option value="contract">Contrato</option><option value="temporary">Temporário</option></select></label></div><label>Descrição<textarea id="jobDescription" required maxlength="1200" placeholder="Responsabilidades e principais tarefas..."></textarea></label><label>Requisitos<textarea id="jobRequirements" maxlength="1000" placeholder="Experiência, formação, competências..."></textarea></label><div class="job-form-grid"><label>Localização<input id="jobLocation" required maxlength="120" value="${esc(state.profile?.location||'')}" placeholder="Maputo"></label><label>Prazo<input id="jobDeadline" type="date"></label></div><label>Contacto da empresa<input id="jobContact" maxlength="140" value="${esc(state.profile?.phone||'')}" placeholder="Telefone, WhatsApp ou e-mail"></label><button class="btn primary" type="submit">Publicar vaga</button></form>`)
}
async function submitJob(e){
  e.preventDefault();if(!requireAuth())return;const button=e.submitter;button.disabled=true;button.textContent='A publicar...';
  const row={company_id:state.user.id,company_name:$('jobCompany').value.trim(),title:$('jobTitle').value.trim(),category:$('jobFormCategory').value,description:$('jobDescription').value.trim(),requirements:$('jobRequirements').value.trim()||null,location:$('jobLocation').value.trim(),employment_type:$('jobEmploymentType').value,contact:$('jobContact').value.trim()||null,deadline:$('jobDeadline').value||null,status:'active'};
  try{await api('jobs','',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});closeModal();toast('Vaga publicada com sucesso.');await loadJobs(true);showView('jobs')}
  catch(err){console.error(err);toast('Não foi possível publicar. Confirma se ativaste o V17 no Supabase.',true);button.disabled=false;button.textContent='Publicar vaga'}
}
function openJobApplication(id){
  if(!requireAuth())return;const j=state.jobs.find(x=>String(x.id)===String(id));if(!j)return;
  const name=state.profile?.business_name||'',phone=state.profile?.phone||'';
  openModal(`<div class="auth-intro"><span class="auth-lock">✓</span><div><h2>Candidatar-me</h2><p>${esc(j.title)} · ${esc(j.company_name)}</p></div></div><p class="application-note">A candidatura será ligada ao teu perfil Link Direto. A empresa poderá ver o nome e contacto que enviares aqui.</p><form onsubmit="submitJobApplication(event,'${j.id}')"><label>Nome / perfil<input id="candidateName" required maxlength="100" value="${esc(name)}" placeholder="O teu nome"></label><label>Contacto<input id="candidatePhone" required maxlength="120" value="${esc(phone)}" placeholder="Telefone ou WhatsApp"></label><label>Mensagem curta<textarea id="applicationNote" maxlength="600" placeholder="Apresenta-te brevemente e explica por que tens interesse na vaga."></textarea></label><button class="btn primary" type="submit">Enviar candidatura</button></form>`)
}
async function submitJobApplication(e,jobId){
  e.preventDefault();if(!requireAuth())return;const button=e.submitter;button.disabled=true;button.textContent='A enviar...';
  const row={job_id:jobId,candidate_id:state.user.id,candidate_name:$('candidateName').value.trim(),candidate_phone:$('candidatePhone').value.trim(),note:$('applicationNote').value.trim()||null,status:'sent'};
  try{await api('job_applications','',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});openModal('<div class="auth-success"><span class="auth-lock">✓</span><h2>Candidatura enviada</h2><p class="muted">A empresa já pode encontrar a tua candidatura no Link Direto.</p><button class="btn primary" onclick="closeModal()">Concluído</button></div>')}
  catch(err){console.error(err);const msg=String(err?.message||'');if(msg.includes('duplicate')||msg.includes('23505'))toast('Já te candidataste a esta vaga.',true);else toast('Não foi possível enviar a candidatura.',true);button.disabled=false;button.textContent='Enviar candidatura'}
}
