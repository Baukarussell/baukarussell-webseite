/* Baukarussell custom admin design concept.
   Works only inside the preview page, never calls GitHub or publishes. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const api=window.BKAdmin;
if(!api)return;
const base='/logos/';
const originals=[
 ['Akkaya','akkaya.jpg','https://www.akkaya.ch/'],
 ['Annexy Group','annexy.jpg','https://annexy.ch/'],
 ['Doma Projects','doma.jpg','https://domaprojects.com/'],
 ['Fischer','fischer.jpg','https://www.fischer97.ch/'],
 ['Gricu','gricu.jpg','https://www.gricu.ch/'],
 ['GS Bauphysik & Akustik','gs.jpg','https://gs-bauphysik.com/'],
 ['Konstantin Architektur','konstantin.jpg','https://www.konstantin-architektur.com/'],
 ['Onur Projects','onur.jpg','mitglieder/onur.html'],
 ['Solvo','solvo.jpg','https://solvo-gmbh.ch/uber-uns'],
 ['Walde Immobilien','walde.jpg','https://www.walde.ch/'],
 ['Wärmebau','waermebau.jpg','https://waermebau.ch/']
];
const defaultMembers=originals.map((r,i)=>({id:'member-'+(i+1),name:r[0],logo:base+r[1],url:r[2],description:'',public:true}));
function getSaved(key,fallback){
 try{const v=JSON.parse(sessionStorage.getItem(key)||'null');return Array.isArray(v)?v:fallback;}
 catch(_){return fallback;}
}
let members=getSaved('bk-demo-members-v1',defaultMembers);
let projects=getSaved('bk-demo-projects-v1',[]);
let registrations=getSaved('bk-demo-registrations-v1',[]);
let aboutPhotos=getSaved('bk-demo-about-photos-v1',['/mitglieder.jpg']);
let chosenMember=null,chosenProject=null,chosenRegistration=null;
let dragAbout=null,temporaryUploads=false;
const cloudKinds={members:'bk-demo-members-v1',projects:'bk-demo-projects-v1'};
const hasPreviousLocal={members:sessionStorage.getItem(cloudKinds.members)!==null,projects:sessionStorage.getItem(cloudKinds.projects)!==null};
const cloudLoaded={members:false,projects:false},cloudLoading={members:false,projects:false},cloudDirty={members:false,projects:false};
let restoringCloud=false;
function cloudStatus(kind,message,status){
 const prefix=kind==='members'?'member':'project';
 for(const suffix of ['list','editor']){
  const node=$(prefix+'-save-status-'+suffix);
  if(node){node.textContent=message;node.dataset.kind=status||'info';}
 }
}
function localTouched(kind){
 if(restoringCloud||!cloudKinds[kind])return;
 cloudDirty[kind]=true;
 cloudStatus(kind,'Änderungen nur im Browser. Bitte «Entwurf speichern» klicken.','info');
}
async function getCloudSession(){
 const response=await fetch('/admin-api/session',{credentials:'same-origin',cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.authenticated||!data.csrf)throw Error('Bitte zuerst auf «Übersicht» mit GitHub anmelden.');
 return data.csrf;
}
async function loadCloudCollection(kind){
 if(cloudLoaded[kind]||cloudLoading[kind]||cloudDirty[kind])return;
 if(hasPreviousLocal[kind]){
  cloudLoaded[kind]=true;
  cloudStatus(kind,'Vorhandenen lokalen Zwischenstand geöffnet. Bitte als privaten Entwurf speichern.','info');
  return;
 }
 cloudLoading[kind]=true;
 try{
  const response=await fetch('/admin-api/content-draft?kind='+kind,{credentials:'same-origin',cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Gespeicherte Daten können derzeit nicht geladen werden.');
  if(cloudDirty[kind])return;
  if(data.found&&Array.isArray(data.items)){
   restoringCloud=true;
   if(kind==='members'){members=data.items;save(cloudKinds.members,members);renderMembers();}
   else{projects=data.items;save(cloudKinds.projects,projects);renderProjects();}
   restoringCloud=false;
   cloudStatus(kind,'Privater Entwurf geladen ('+new Date(data.savedAt).toLocaleString('de-CH')+'). Nicht veröffentlicht.','ok');
  }else{
   cloudStatus(kind,'Noch kein privater Entwurf vorhanden. Änderungen bitte speichern.','info');
  }
  cloudLoaded[kind]=true;
 }catch(error){
  restoringCloud=false;
  cloudStatus(kind,error.message||'Cloudflare Verbindung nicht erreichbar.','error');
 }finally{cloudLoading[kind]=false;}
}
async function saveCloudCollection(kind){
 const list=kind==='members'?members:projects;
 const btns=kind==='members'?[$('member-save-cloud'),$('member-save-demo')]:[$('project-save-cloud'),$('project-save-demo')];
 const invalid=kind==='members'&&list.some(item=>[item.logo,item.photo].some(v=>typeof v==='string'&&v.startsWith('blob:')));
 if(invalid){cloudStatus(kind,'Fotos müssen zuerst über «Foto hochladen» oder einen gespeicherten GitHub Bildpfad hinterlegt werden.','error');return;}
 const snapshot=JSON.parse(JSON.stringify(list));
 const fingerprint=JSON.stringify(snapshot);
 btns.forEach(btn=>{btn.disabled=true;});
 cloudStatus(kind,'Privater Entwurf wird gespeichert ...','info');
 try{
  const csrf=await getCloudSession();
  const response=await fetch('/admin-api/content-draft?kind='+kind,{
   method:'PUT',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json','X-BK-CSRF':csrf},
   body:JSON.stringify({items:snapshot})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.saved)throw Error(result.error||'Speichern fehlgeschlagen.');
  const unchanged=JSON.stringify(kind==='members'?members:projects)===fingerprint;
  cloudDirty[kind]=!unchanged;
  hasPreviousLocal[kind]=true;
  cloudLoaded[kind]=true;
  if(unchanged)cloudStatus(kind,result.count+' '+(kind==='members'?'Mitglieder':'Projekte')+' privat gespeichert ('+new Date(result.savedAt).toLocaleString('de-CH')+'). Nicht veröffentlicht.','ok');
  else cloudStatus(kind,'Zwischenzeitlich weitere Änderungen gemacht. Bitte erneut speichern.','info');
 }catch(error){
  cloudStatus(kind,error.message||'Speichern nicht möglich. Browserdaten bleiben erhalten.','error');
 }finally{btns.forEach(btn=>{btn.disabled=false;});}
}
async function uploadMemberImage(field,file){
 if(!file||!file.type.startsWith('image/'))return;
 if(file.size>4*1024*1024){cloudStatus('members','Foto ist zu gross. Bitte zuerst auf weniger als 4 MB verkleinern.','error');return;}
 const member=memberItem();if(!member)return;
 const targetId=member.id,btn=field==='logo'?$('member-logo-button'):$('member-photo-button');
 btn.disabled=true;cloudStatus('members','Foto wird im GitHub Testbranch gespeichert ...','info');
 try{
  const csrf=await getCloudSession(),data=new FormData();
  data.append('kind','mitglied');data.append('file',file);
  const response=await fetch('/admin-api/member-photo',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'X-BK-CSRF':csrf},body:data});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.saved||!result.url)throw Error(result.error||'GitHub hat das Bild nicht gespeichert.');
  const found=members.find(x=>x.id===targetId);
  if(found){found[field]=result.url;save(cloudKinds.members,members);}
  if(chosenMember===targetId){$(field==='logo'?'member-logo-path':'member-photo-path').value=result.url;memberPreview();}
  cloudStatus('members','Foto im GitHub Testbranch gespeichert. Das GitHub Repository ist öffentlich. Bitte jetzt «Entwurf speichern» klicken.','info');
 }catch(error){cloudStatus('members',error.message||'Foto konnte nicht gespeichert werden.','error');}
 finally{btn.disabled=false;}
}
function save(key,items){
 if(key===cloudKinds.members)localTouched('members');
 if(key===cloudKinds.projects)localTouched('projects');
 try{sessionStorage.setItem(key,JSON.stringify(items,function(prop,val){
  if((prop==='logo'||prop==='photo')&&typeof val==='string'&&val.startsWith('blob:'))return '';
  if(prop==='flyer'&&typeof val==='string'&&val.startsWith('blob:'))return '';
  if(prop==='images'&&Array.isArray(val))return val.filter(s=>typeof s==='string'&&!s.startsWith('blob:'));
  return val;
 }))}catch(_){/* Storage may be unavailable; memory still works. */}
}
function saveAbout(){
 try{sessionStorage.setItem('bk-demo-about-photos-v1',JSON.stringify(aboutPhotos.filter(s=>!s.startsWith('blob:'))));}catch(_){}
}
function make(type,className,text){
 const x=document.createElement(type);
 if(className)x.className=className;
 if(text!==undefined)x.textContent=String(text);
 return x;
}
function safeHref(raw){
 if(!raw)return '';
 if(String(raw).startsWith('mitglieder/'))return '/'+raw;
 try{const u=new URL(String(raw));return ['https:','http:'].includes(u.protocol)?u.href:'';}catch(_){return ''}
}
function button(text,fn,kind=''){
 const b=make('button','btn small '+kind,text);b.type='button';b.addEventListener('click',fn);return b;
}
function alertDemo(){api.toast('Diese Änderungen gelten nur in der Designvorschau, nicht auf der echten Webseite.');}
function safeImage(file){return !!file&&file.type.startsWith('image/');}
function id(){return 'demo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);}
function appendImage(holder,src,alt){
 const img=make('img');img.alt=alt||'';img.src=src;img.onerror=()=>{img.style.display='none';};holder.append(img);return img;
}
function removeWithConfirm(type,label,cb){
 if(window.confirm(type+' «'+label+'» aus dem Designentwurf entfernen? Die bestehende Webseite bleibt unverändert.'))cb();
}
// -- Members --
function renderMembers(){
 const holder=$('member-cards');holder.replaceChildren();
 $('member-count').textContent=members.length;
 if(!members.length){
  const empty=make('div','entity-empty');empty.append(make('h3','', 'Noch keine Mitglieder'),make('p','', 'Mit «Neues Mitglied» kannst du eine Firma hinzufügen.'));
  holder.append(empty);return;
 }
 members.forEach((m)=>{
  const card=make('article','entity-card');const imgBox=make('div','entity-icon');
  if(m.logo)appendImage(imgBox,m.logo,'Logo '+m.name);else imgBox.append(make('span','', 'Logo hinzufügen'));
  const info=make('div','entity-identity');info.append(make('h3','',m.name||'Neues Mitglied'),make('p','',m.public===false?'Auf der Webseite verborgen':'Mitgliedsprofil'));
  const controls=make('div','entity-controls');
  controls.append(button('Bearbeiten ↗',()=>editMember(m.id)),button('Entfernen',()=>removeWithConfirm('Mitglied',m.name||'Neues Mitglied',()=>{members=members.filter(x=>x.id!==m.id);save('bk-demo-members-v1',members);renderMembers();api.toast('Mitglied nur aus dem Demoentwurf entfernt.');})));
  card.append(imgBox,info,controls);holder.append(card);
 });
}
function memberItem(){return members.find(x=>x.id===chosenMember)}
function newMember(){
 const item={id:id(),name:'',person:'',role:'',phone:'',email:'',url:'',description:'',logo:'',photo:'',socials:[],public:true};
 members.push(item);save('bk-demo-members-v1',members);editMember(item.id);
}
function editMember(memberId){
 chosenMember=memberId;
 $('member-editor').dataset.historyKey='member:'+memberId;
 const m=memberItem();if(!m)return;
 $('member-editor-title').textContent=m.name||'Neues Mitglied';
 $('member-name').value=m.name;$('member-url').value=m.url;
 $('member-description').value=m.description||'';$('member-public').checked=m.public!==false;
 $('member-person').value=m.person||'';$('member-role').value=m.role||'';
 $('member-phone').value=m.phone||'';$('member-email').value=m.email||'';
 if(!Array.isArray(m.socials))m.socials=[];
 $('member-logo-path').value=m.logo||'';
 $('member-photo-path').value=m.photo||'';
 renderMemberSocials();memberPreview();api.page('member-editor');
}
const socialPlatforms={
 linkedin:{name:'LinkedIn',icon:'in'},
 youtube:{name:'YouTube',icon:'▶'},
 instagram:{name:'Instagram',icon:'◎'},
 facebook:{name:'Facebook',icon:'f'},
 tiktok:{name:'TikTok',icon:'♪'},
 x:{name:'X',icon:'𝕏'},
 pinterest:{name:'Pinterest',icon:'P'},
 website:{name:'Webseite',icon:'↗'}
};
function renderMemberSocials(){
 const m=memberItem();if(!m)return;
 if(!Array.isArray(m.socials))m.socials=[];
 const root=$('member-social-rows');root.replaceChildren();
 m.socials.forEach((link,i)=>{
  const row=make('div','member-social-row');
  const dropdown=make('select');dropdown.setAttribute('aria-label','Plattform auswählen');
  for(const [value,platform] of Object.entries(socialPlatforms)){
    const option=make('option','',platform.name);option.value=value;dropdown.append(option);
  }
  dropdown.value=socialPlatforms[link.platform]?link.platform:'website';
  dropdown.onchange=()=>{link.platform=dropdown.value;save('bk-demo-members-v1',members);memberPreview();};
  const url=make('input');url.type='url';url.placeholder='https://...';url.value=link.url||'';
  url.setAttribute('aria-label','Profiladresse');
  url.oninput=()=>{link.url=url.value;save('bk-demo-members-v1',members);memberPreview();};
  const up=make('button','', '↑');up.type='button';up.title='Nach oben';up.disabled=i===0;
  up.onclick=()=>{if(i<1)return;[m.socials[i-1],m.socials[i]]=[m.socials[i],m.socials[i-1]];save('bk-demo-members-v1',members);renderMemberSocials();memberPreview();};
  const down=make('button','', '↓');down.type='button';down.title='Nach unten';down.disabled=i===m.socials.length-1;
  down.onclick=()=>{if(i===m.socials.length-1)return;[m.socials[i+1],m.socials[i]]=[m.socials[i],m.socials[i+1]];save('bk-demo-members-v1',members);renderMemberSocials();memberPreview();};
  const del=make('button','', '×');del.type='button';del.title='Link entfernen';
  del.onclick=()=>{m.socials.splice(i,1);save('bk-demo-members-v1',members);renderMemberSocials();memberPreview();};
  row.append(dropdown,url,up,down,del);root.append(row);
 });
}
function memberPreview(){
 const m=memberItem();if(!m)return;
 $('member-preview-name').textContent=m.name||'Firmenname';
 $('member-editor-title').textContent=m.name||'Neues Mitglied';
 $('member-preview-description').textContent=m.description||'Firmenbeschreibung';
 for(const elem of [$('member-preview-logo'),$('member-logo-thumb')]){elem.src=m.logo||'/admin/brand.svg';}
 $('member-photo-thumb').src=m.photo||'/admin/brand.svg';
 $('member-preview-photo-wrap').classList.toggle('hidden',!m.photo);
 if(m.photo)$('member-preview-photo').src=m.photo;
 $('member-preview-person').textContent=[m.person,m.role].filter(Boolean).join(' · ');
 const contact=$('member-preview-contacts');contact.replaceChildren();
 function contactLink(text,href){
  if(!text)return;
  if(href){const a=make('a','',text);a.href=href;a.target=href.startsWith('http')?'_blank':'_self';if(a.target==='_blank')a.rel='noopener noreferrer';contact.append(a);}
  else contact.append(make('span','',text));
 }
 if(m.phone)contactLink('☎ '+m.phone,'tel:'+String(m.phone).replace(/[^+\d]/g,''));
 if(m.email)contactLink('✉ '+m.email,'mailto:'+String(m.email).trim());
 if(m.url)contactLink('↗ '+m.url,safeHref(m.url));
 const socials=$('member-preview-social');socials.replaceChildren();
 for(const social of m.socials||[]){
  const href=safeHref(social.url);
  if(!href)continue;
  const platform=socialPlatforms[social.platform]||socialPlatforms.website;
  const a=make('a','',platform.icon);a.href=href;a.target='_blank';a.rel='noopener noreferrer';
  a.title=platform.name;a.setAttribute('aria-label',platform.name+' öffnen');socials.append(a);
 }
}
function changeMember(){
 const m=memberItem();if(!m)return;
 m.name=$('member-name').value;m.url=$('member-url').value;
 m.person=$('member-person').value;m.role=$('member-role').value;
 m.phone=$('member-phone').value;m.email=$('member-email').value;
 m.description=$('member-description').value;m.public=$('member-public').checked;
 memberPreview();save('bk-demo-members-v1',members);
}
$('member-add').onclick=newMember;
$('member-back').onclick=()=>{renderMembers();api.page('members')};
$('member-remove').onclick=()=>{const m=memberItem();if(!m)return;
 removeWithConfirm('Mitglied',m.name||'Neues Mitglied',()=>{
 members=members.filter(x=>x.id!==m.id);chosenMember=null;save('bk-demo-members-v1',members);renderMembers();api.page('members');
 });};
['member-name','member-url','member-person','member-role','member-phone','member-email','member-description','member-public'].forEach(x=>$(x).addEventListener('input',changeMember));
$('member-save-demo').onclick=()=>{changeMember();renderMembers();saveCloudCollection('members');};
$('member-save-cloud').onclick=()=>saveCloudCollection('members');
$('member-social-add').onclick=()=>{
 const m=memberItem();if(!m)return;
 if(!Array.isArray(m.socials))m.socials=[];
 m.socials.push({platform:'linkedin',url:''});save('bk-demo-members-v1',members);renderMemberSocials();
 const last=$('member-social-rows').lastElementChild;if(last)last.querySelector('input')?.focus();
};
$('member-photo-button').onclick=()=>$('member-photo-input').click();
$('member-photo-input').onchange=e=>{const file=e.target.files?.[0];e.target.value='';if(file)uploadMemberImage('photo',file);};
$('member-logo-button').onclick=()=>$('member-logo-input').click();
$('member-logo-input').onchange=e=>{const file=e.target.files?.[0];e.target.value='';if(file)uploadMemberImage('logo',file);};
for(const [field,elem] of [['logo','member-logo-path'],['photo','member-photo-path']]){
 $(elem).addEventListener('input',()=>{
  const m=memberItem();if(!m)return;
  m[field]=$(elem).value.trim();save(cloudKinds.members,members);memberPreview();
 });
}
document.querySelectorAll('[data-page="members"],[data-hub-target="members"]').forEach(node=>node.addEventListener('click',()=>loadCloudCollection('members')));
loadCloudCollection('members');
renderMembers();
// -- Projects (empty by default, never published) --
function renderProjects(){
 const holder=$('project-cards');holder.replaceChildren();$('project-empty').classList.toggle('hidden',projects.length!==0);
 projects.forEach(p=>{
  const card=make('article','entity-card');
  const visual=make('div','entity-icon');visual.append(make('span','', '▤'));
  const info=make('div','entity-identity');info.append(make('h3','',p.title||'Neues Projekt'),make('p','', 'Interner Entwurf · nicht veröffentlicht'));
  const controls=make('div','entity-controls');
  controls.append(button('Bearbeiten ↗',()=>editProject(p.id)),button('Entfernen',()=>removeWithConfirm('Projekt',p.title||'Neues Projekt',()=>{projects=projects.filter(x=>x.id!==p.id);save('bk-demo-projects-v1',projects);renderProjects()})));
  card.append(visual,info,controls);holder.append(card);
 });
}
function projectItem(){return projects.find(x=>x.id===chosenProject)}
function newProject(){const obj={id:id(),title:'',date:'',location:'',description:''};projects.push(obj);save('bk-demo-projects-v1',projects);editProject(obj.id);}
function editProject(projectId){
 chosenProject=projectId;
 $('project-editor').dataset.historyKey='project:'+projectId;const p=projectItem();if(!p)return;
 $('project-name').value=p.title||'';$('project-date').value=p.date||'';$('project-location').value=p.location||'';$('project-description').value=p.description||'';
 projectPreview();api.page('project-editor');
}
function projectPreview(){
 const p=projectItem();if(!p)return;
 $('project-preview-title').textContent=p.title||'Projekttitel';
 $('project-preview-date').textContent=[p.date,p.location].filter(Boolean).join(' · ');
 $('project-preview-description').textContent=p.description||'Hier könnte eine Projektbeschreibung erscheinen.';
}
function changeProject(){
 const p=projectItem();if(!p)return;
 p.title=$('project-name').value;p.date=$('project-date').value;p.location=$('project-location').value;p.description=$('project-description').value;
 save('bk-demo-projects-v1',projects);projectPreview();
}
for(const key of ['project-name','project-date','project-location','project-description'])$(key).addEventListener('input',changeProject);
$('project-add').onclick=newProject;$('project-empty-add').onclick=newProject;
$('project-back').onclick=()=>{renderProjects();api.page('projects')};
$('project-save-demo').onclick=()=>{changeProject();saveCloudCollection('projects');};
$('project-save-cloud').onclick=()=>saveCloudCollection('projects');
$('project-remove').onclick=()=>{const p=projectItem();if(!p)return;removeWithConfirm('Projekt',p.title||'Neues Projekt',()=>{projects=projects.filter(x=>x.id!==p.id);chosenProject=null;save('bk-demo-projects-v1',projects);renderProjects();api.page('projects');});};
renderProjects();
document.querySelectorAll('[data-page="projects"],[data-hub-target="projects"]').forEach(node=>node.addEventListener('click',()=>loadCloudCollection('projects')));
loadCloudCollection('projects');
// -- Registrations: distinct form and flyer per occasion --
function registrationItem(){return registrations.find(x=>x.id===chosenRegistration)}
function renderRegistrations(){
 const root=$('registration-cards');root.replaceChildren();$('registration-empty').classList.toggle('hidden',registrations.length!==0);
 registrations.forEach(item=>{
  const card=make('article','entity-card');
  const banner=make('div','reg-card-cover');
  if(item.flyer&&item.flyerType!=='pdf')appendImage(banner,item.flyer,'Flyer '+item.title);
  else banner.append(make('span','',item.flyerType==='pdf'?'PDF Flyer':'Flyer hinzufügen'));
  const info=make('div','entity-identity');
  info.append(make('span','reg-status','Entwurf · nicht öffentlich'),make('h3','',item.title||'Neue Eventanmeldung'),make('p','',[item.date,item.location].filter(Boolean).join(' · ')||'Noch keine Eventinformationen'));
  const controls=make('div','entity-controls');
  controls.append(button('Bearbeiten ↗',()=>editRegistration(item.id)),button('Entfernen',()=>removeWithConfirm('Anmeldung',item.title||'Entwurf',()=>{
   registrations=registrations.filter(x=>x.id!==item.id);save('bk-demo-registrations-v1',registrations);renderRegistrations();})));
  card.append(banner,info,controls);root.append(card);
 });
}
function newRegistration(){
 const item={id:id(),title:'',date:'',time:'18:00',location:'',description:'',deadline:'',capacity:'',flyer:'',flyerType:'',flyerName:'',demoGuests:0};
 registrations.push(item);save('bk-demo-registrations-v1',registrations);editRegistration(item.id);
}
function editRegistration(regId){
 chosenRegistration=regId;
 $('registration-editor').dataset.historyKey='registration:'+regId;const reg=registrationItem();if(!reg)return;
 for(const field of ['title','date','time','location','description','deadline','capacity'])$('reg-'+field).value=reg[field]||'';
 renderRegistrationPreview();api.page('registration-editor');
}
function renderRegistrationPreview(){
 const reg=registrationItem();if(!reg)return;
 $('reg-preview-title').textContent=reg.title||'Name der Veranstaltung';
 $('reg-preview-date').textContent=[reg.date,reg.time].filter(Boolean).join(' · ');
 $('reg-preview-location').textContent=reg.location;
 $('reg-preview-description').textContent=reg.description||'Hier erscheint der Einladungstext.';
 $('reg-flyer-name').textContent=reg.flyerName||'Noch kein Flyer ausgewählt';
 const flyer=$('reg-flyer-preview');flyer.replaceChildren();
 if(reg.flyer&&reg.flyerType==='image'){appendImage(flyer,reg.flyer,'Flyer Vorschau');}
 else if(reg.flyer&&reg.flyerType==='pdf'){
  const link=make('a','', 'PDF Flyer ansehen ↗');link.href=reg.flyer;link.target='_blank';link.rel='noopener noreferrer';flyer.append(link);
 }else flyer.append(make('span','',reg.flyerName||'Flyer noch nicht hinzugefügt'));
 $('reg-attendee-counter').textContent=(reg.demoGuests||0)+' Demo Testeinträge · keine echten Anmeldungen';
 $('reg-attendee-empty').classList.toggle('hidden',(reg.demoGuests||0)>0);
 const rows=$('reg-attendees');rows.replaceChildren();
 for(let i=0;i<(reg.demoGuests||0);i++){
  const row=make('div','demo-attendee-row');
  row.append(make('span','', 'Testperson '+(i+1)+' (Demo)'));
  row.append(button('Entfernen',()=>{reg.demoGuests=Math.max(0,reg.demoGuests-1);save('bk-demo-registrations-v1',registrations);renderRegistrationPreview()}));
  rows.append(row);
 }
}
function changeRegistration(){
 const reg=registrationItem();if(!reg)return;
 for(const field of ['title','date','time','location','description','deadline','capacity'])reg[field]=$('reg-'+field).value;
 renderRegistrationPreview();save('bk-demo-registrations-v1',registrations);
}
for(const field of ['title','date','time','location','description','deadline','capacity'])$('reg-'+field).addEventListener('input',changeRegistration);
$('registration-add').onclick=newRegistration;$('registration-empty-add').onclick=newRegistration;
$('registration-back').onclick=()=>{renderRegistrations();api.page('registrations')};
$('registration-save-demo').onclick=()=>{changeRegistration();renderRegistrations();alertDemo()};
$('registration-remove').onclick=()=>{
 const reg=registrationItem();if(!reg)return;
 removeWithConfirm('Anmeldung',reg.title||'Entwurf',()=>{
  registrations=registrations.filter(x=>x.id!==reg.id);
  chosenRegistration=null;save('bk-demo-registrations-v1',registrations);
  renderRegistrations();api.page('registrations');
 });
};
$('reg-add-demo-attendee').onclick=()=>{const reg=registrationItem();if(!reg)return;reg.demoGuests=Math.min(30,1+(reg.demoGuests||0));save('bk-demo-registrations-v1',registrations);renderRegistrationPreview();};
$('reg-flyer-button').onclick=()=>$('reg-flyer-input').click();
$('reg-flyer-input').onchange=e=>{
 const f=e.target.files?.[0],reg=registrationItem();
 if(!f||!reg)return;
 if(!f.type.startsWith('image/')&&f.type!=='application/pdf'&&!f.name.toLowerCase().endsWith('.pdf')){api.toast('Bitte nur Fotos oder PDF Flyer auswählen.');return;}
 reg.flyer=URL.createObjectURL(f);reg.flyerName=f.name;reg.flyerType=f.type.startsWith('image/')?'image':'pdf';
 temporaryUploads=true;save('bk-demo-registrations-v1',registrations);renderRegistrationPreview();e.target.value='';
 api.toast('Flyer nur für diese Sitzung ausgewählt, noch nicht hochgeladen oder veröffentlicht.');
};
renderRegistrations();
// -- Über uns: group photos, bulk upload and sortable gallery --
function renderAbout(){
 const isAbout=$('page-editor').dataset.key==='about';
 $('about-gallery-workspace').classList.toggle('hidden',!isAbout);
 $('about-gallery-preview').classList.toggle('hidden',!isAbout);
 if(!isAbout)return;
 const grid=$('about-gallery-editor'),preview=$('about-gallery-preview-images');
 grid.replaceChildren();preview.replaceChildren();
 aboutPhotos.forEach((src,i)=>{
  const tile=make('div','media-tile');tile.draggable=true;tile.title='Foto verschieben';
  appendImage(tile,src,'Vereinsfoto '+(i+1));
  const remove=make('button','corner','×');remove.type='button';remove.title='Foto entfernen';
  remove.onclick=()=>{aboutPhotos.splice(i,1);saveAbout();renderAbout();};tile.append(remove);
  tile.addEventListener('dragstart',()=>{dragAbout=i;tile.classList.add('dragging')});
  tile.addEventListener('dragend',()=>{tile.classList.remove('dragging');dragAbout=null;});
  tile.addEventListener('dragover',e=>e.preventDefault());
  tile.addEventListener('drop',e=>{e.preventDefault();if(dragAbout===null||dragAbout===i)return;const item=aboutPhotos.splice(dragAbout,1)[0];aboutPhotos.splice(i,0,item);dragAbout=null;saveAbout();renderAbout();});
  grid.append(tile);appendImage(preview,src,'Gruppenfoto '+(i+1));
 });
 if(!aboutPhotos.length){grid.append(make('div','empty','Noch keine Fotos ausgewählt.'));}
}
$('about-photo-upload').onchange=e=>{
 const files=Array.from(e.target.files||[]).filter(safeImage);
 if(!files.length)return;
 files.forEach(file=>aboutPhotos.push(URL.createObjectURL(file)));
 temporaryUploads=true;saveAbout();renderAbout();e.target.value='';
 api.toast(files.length+' Foto(s) zur Vorschau hinzugefügt. Diese Dateien sind noch nicht dauerhaft gespeichert.');
};
window.BKManagement={renderAbout,renderMembers,renderProjects,renderRegistrations};
window.addEventListener('beforeunload',e=>{if(temporaryUploads){e.preventDefault();e.returnValue='';}});
})();