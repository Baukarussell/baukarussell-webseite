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
const memberPhotoLocal=new Map();

let dragAbout=null,temporaryUploads=false;
const cloudKinds={members:'bk-demo-members-v1',projects:'bk-demo-projects-v1'};
function hasSessionDraft(key){try{return sessionStorage.getItem(key)!==null;}catch(_){return false;}}
const hasPreviousLocal={members:hasSessionDraft(cloudKinds.members),projects:hasSessionDraft(cloudKinds.projects)};
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
function memberMediaStatus(field,message,kind='info'){
 const node=$(field==='logo'?'member-logo-upload-status':'member-photo-upload-status');
 if(node){node.textContent=message;node.dataset.kind=kind;}
}
async function optimizeProfilePhoto(file){
 if(file.size<=3.5*1024*1024)return file;
 if(typeof createImageBitmap!=='function')return file;
 const source=await createImageBitmap(file);
 try{
  const canvas=document.createElement('canvas');
  const scale=Math.min(1,1800/Math.max(source.width,source.height));
  canvas.width=Math.round(source.width*scale);canvas.height=Math.round(source.height*scale);
  const ctx=canvas.getContext('2d');
  if(!ctx)return file;
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(source,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.84));
  return blob&&blob.size<file.size?new File([blob],file.name.replace(/\.[^.]+$/,'')+'-web.jpg',{type:'image/jpeg'}):file;
 }finally{source.close?.();}
}
async function uploadMemberImage(field,originalFile){
 if(!originalFile)return false;
 const isPhoto=field==='photo',label=isPhoto?'Foto':'Logo';
 if(!['image/jpeg','image/png','image/webp'].includes(originalFile.type)){
  memberMediaStatus(field,'Bitte JPG, PNG oder WebP auswählen.','error');return false;
 }
 const member=memberItem();if(!member)return false;
 const targetId=member.id,btn=isPhoto?$('member-photo-button'):$('member-logo-button');
 btn.disabled=true;btn.textContent=label+' wird gespeichert ...';
 memberMediaStatus(field,'Bild wird vorbereitet und in GitHub gespeichert ...');
 try{
  let file=originalFile;
  if(isPhoto&&file.size>3.5*1024*1024){
   file=await optimizeProfilePhoto(file);
  }
  if(file.size>4*1024*1024)throw Error('Dieses Bild ist über 4 MB gross. Bitte vorher verkleinern oder ein kleineres Bild wählen.');
  const csrf=await getCloudSession(),data=new FormData();
  data.append('kind','mitglied');data.append('file',file);
  const response=await fetch('/admin-api/member-photo',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'X-BK-CSRF':csrf},body:data});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.saved||!result.url)throw Error(result.error||'GitHub hat das Bild nicht gespeichert.');
  const found=members.find(x=>x.id===targetId);
  const local=URL.createObjectURL(file);
  if(isPhoto){
   const previous=memberPhotoLocal.get(targetId);
   if(previous)URL.revokeObjectURL(previous.url);
   memberPhotoLocal.set(targetId,{path:result.url,url:local});
  }
  if(found){found[field]=result.url;save(cloudKinds.members,members);}
  if(chosenMember===targetId){
   $(isPhoto?'member-photo-path':'member-logo-path').value=result.url;
   memberPreview();
   if(isPhoto){$('member-photo-thumb').src=local;$('member-preview-photo').src=local;$('member-photo-direct').classList.remove('hidden');}
   else $('member-logo-thumb').src=local;
  }else if(!isPhoto)URL.revokeObjectURL(local);
  memberMediaStatus(field,label+' auf GitHub gespeichert. Bitte jetzt oben «Entwurf speichern» wählen.','success');
  return true;
 }catch(error){
  memberMediaStatus(field,error.message||'Bild konnte nicht gespeichert werden.','error');
  cloudStatus('members','Das Bild konnte nicht hochgeladen werden. Deine bisherigen Angaben und das Logo bleiben unverändert.','error');
  return false;
 }finally{btn.disabled=false;btn.textContent=isPhoto?'Foto hochladen':'Logo hochladen';}
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
 const item={id:id(),name:'',person:'',role:'',street:'',postalCode:'',city:'',country:'',phone:'',email:'',url:'',description:'',logo:'',photo:'',photoFit:'contain',photoZoom:100,photoPositionX:50,photoPositionY:50,socials:[],public:true};
 members.push(item);save('bk-demo-members-v1',members);editMember(item.id);
}
function editMember(memberId){
 chosenMember=memberId;
 $('member-editor').dataset.historyKey='member:'+memberId;
 const m=memberItem();if(!m)return;
 $('member-editor-title').textContent=m.name||'Neues Mitglied';
 $('member-name').value=m.name;$('member-url').value=m.url;
 $('member-description').value=m.description||'';$('member-public').checked=m.public!==false;
 $('member-description-align').value=m.descriptionAlign||'left';
 $('member-description-line').value=m.descriptionLineHeight||'1.6';

 memberMediaStatus('photo',m.photo?'Gespeichertes Foto vorhanden.':'Noch kein Foto hochgeladen.');
 memberMediaStatus('logo','Das bestehende Logo wird nur bei einem neuen Upload ersetzt.');
 $('member-person').value=m.person||'';$('member-role').value=m.role||'';
 $('member-street').value=m.street||'';
 $('member-postal').value=m.postalCode||'';
 $('member-city').value=m.city||'';
 $('member-country').value=m.country||'';
 $('member-address-company').value=addressCompanyName(m);
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
const MEMBER_TEXT_FONTS={
 inter:"'Inter', Arial, sans-serif",
 cormorant:"'Cormorant Garamond', Georgia, serif",
 georgia:"Georgia, serif"
};
const MEMBER_TEXT_COLORS={
 gold:'#b8945f',
 lightgold:'#d4b483',
 anthracite:'#30332f',
 slate:'#74776f'
};
function renderMemberInline(parent,plain){
 // Render only approved styles as DOM nodes. Never interpret arbitrary HTML.
 const re=/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\[pt=(10|11|12|14|16|18|20|24)\]([\s\S]*?)\[\/pt\]|\[font=(inter|cormorant|georgia)\]([\s\S]*?)\[\/font\]|\[color=(gold|lightgold|anthracite|slate)\]([\s\S]*?)\[\/color\]|\*\*\*([\s\S]+?)\*\*\*|\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*/g;
 let from=0,match;
 while((match=re.exec(plain))!==null){
  if(match.index>from)parent.append(document.createTextNode(plain.slice(from,match.index)));
  if(match[1]!==undefined){
   const href=safeHref(match[2]);
   if(href){const link=make('a','',match[1]);link.href=href;link.target='_blank';link.rel='noopener noreferrer';parent.append(link);}
   else parent.append(document.createTextNode(match[0]));
  }else if(match[3]!==undefined){
   const span=make('span');span.style.fontSize=match[3]+'pt';renderMemberInline(span,match[4]);parent.append(span);
  }else if(match[5]!==undefined){
   const span=make('span');span.style.fontFamily=MEMBER_TEXT_FONTS[match[5]];renderMemberInline(span,match[6]);parent.append(span);
  }else if(match[7]!==undefined){
   const span=make('span');span.style.color=MEMBER_TEXT_COLORS[match[7]];renderMemberInline(span,match[8]);parent.append(span);
  }else if(match[9]!==undefined){
   const strong=make('strong'),em=make('em');renderMemberInline(em,match[9]);strong.append(em);parent.append(strong);
  }else if(match[10]!==undefined){
   const strong=make('strong');renderMemberInline(strong,match[10]);parent.append(strong);
  }else{
   const em=make('em');renderMemberInline(em,match[11]);parent.append(em);
  }
  from=re.lastIndex;
 }
 if(from<plain.length)parent.append(document.createTextNode(plain.slice(from)));
}
const MEMBER_LINE_GAPS={'1.4':8,'1.6':12,'1.8':18,'2':24};
function memberLineIndex(text,position){
 return text.slice(0,Math.max(0,position)).split('\n').length-1;
}
function rebaseMemberLineStyles(before,after,original){
 const oldLines=String(before||'').replace(/\r\n?/g,'\n').split('\n');
 const newLines=String(after||'').replace(/\r\n?/g,'\n').split('\n');
 const src=Array.isArray(original)?original:[];
 if(oldLines.length===newLines.length)return src;
 const next=new Array(newLines.length);
 let head=0;
 while(head<oldLines.length&&head<newLines.length&&oldLines[head]===newLines[head]){
  next[head]=src[head]||{};head++;
 }
 let tailOld=oldLines.length-1,tailNew=newLines.length-1;
 while(tailOld>=head&&tailNew>=head&&oldLines[tailOld]===newLines[tailNew]){
  next[tailNew]=src[tailOld]||{};tailOld--;tailNew--;
 }
 for(let i=head;i<=tailNew;i++){
  next[i]=i-head<=tailOld-head?src[i]||{}:{};
 }
 return next.map(value=>value||{});
}
function applyMemberLineHeight(){
 const m=memberItem();if(!m)return;
 const field=$('member-description'),lineSelect=$('member-description-line');
 const value=lineSelect.value;
 const text=field.value.replace(/\r\n?/g,'\n'),start=field.selectionStart,end=field.selectionEnd;
 const first=memberLineIndex(text,start);
 // End exactly at the start of another line does not include that next line.
 const last=memberLineIndex(text,end>start?end-1:end);
 const styles=Array.isArray(m.descriptionParagraphStyles)?m.descriptionParagraphStyles.slice():[];
 while(styles.length<text.split('\n').length)styles.push({});
 const whole=text.length>0&&start===0&&end===text.length;
 if(whole){
  m.descriptionLineHeight=value;
  for(let i=0;i<styles.length;i++){styles[i]={...styles[i],line:'',gap:''};}
 }else{
  for(let i=first;i<=last;i++)styles[i]={...styles[i],line:value,gap:''};
 }
 m.descriptionParagraphStyles=styles;
 // Keep the cursor and any text selection so the next adjustment remains easy.
 field.focus();
 field.setSelectionRange(start,end);
 memberPreview();save(cloudKinds.members,members);
}
function showMemberCurrentLineHeight(){
 const m=memberItem();if(!m)return;
 const field=$('member-description'),text=field.value.replace(/\r\n?/g,'\n');
 const selectedAll=text.length>0&&field.selectionStart===0&&field.selectionEnd===text.length;
 const lineIndex=memberLineIndex(text,field.selectionStart);
 const individual=Array.isArray(m.descriptionParagraphStyles)?m.descriptionParagraphStyles[lineIndex]:null;
 $('member-description-line').value=!selectedAll&&individual?.line?individual.line:(m.descriptionLineHeight||'1.6');
}
function renderMemberDescription(member){
 const root=$('member-preview-description');
 root.replaceChildren();
 // Match the visitor preview: a single Enter breaks a line, while an empty
 // line separates paragraphs. Empty lines do not create stacked blank blocks.
 const rows=String(member.description||'Firmenbeschreibung').replace(/\r\n?/g,'\n').split('\n');
 const overrides=Array.isArray(member.descriptionParagraphStyles)?member.descriptionParagraphStyles:[];
 let para=null;
 rows.forEach((line,index)=>{
  if(!line.trim()){para=null;return;}
  if(!para){para=make('p');para.style.marginBottom='12px';root.append(para);}
  const span=make('span');
  span.style.display='block';
  span.style.whiteSpace='pre-wrap';
  span.style.textAlign=member.descriptionAlign||'left';
  span.style.lineHeight=overrides[index]?.line||member.descriptionLineHeight||'1.6';
  renderMemberInline(span,line);
  para.append(span);
 });
 const last=root.lastElementChild;
 if(last)last.style.marginBottom='0';
}
function changeMemberTextSelection(replacement){
 const field=$('member-description'),start=field.selectionStart,end=field.selectionEnd;
 field.setRangeText(replacement,start,end,'select');
 field.setSelectionRange(start,start+replacement.length);
 changeMember();field.focus();
}
function transformMemberCase(text,toUpper){
 // Preserve formatting markers and links when converting selected text.
 const untouched=/https?:\/\/[^\s)]+|\[\/?(?:pt(?:=(?:10|11|12|14|16|18|20|24))?|font(?:=(?:inter|cormorant|georgia))?|color(?:=(?:gold|lightgold|anthracite|slate))?)\]/gi;
 let out='',last=0,m;
 while((m=untouched.exec(text))!==null){
  const segment=text.slice(last,m.index);
  out+=toUpper?segment.toLocaleUpperCase('de-CH'):segment.toLocaleLowerCase('de-CH');
  out+=m[0];last=untouched.lastIndex;
 }
 const rest=text.slice(last);
 return out+(toUpper?rest.toLocaleUpperCase('de-CH'):rest.toLocaleLowerCase('de-CH'));
}
function formatMemberSelection(kind){
 const field=$('member-description'),start=field.selectionStart,end=field.selectionEnd;
 const selected=field.value.slice(start,end);
 if(kind==='uppercase'||kind==='lowercase'){
  if(!selected){api.toast('Bitte zuerst den Text markieren.');field.focus();return;}
  changeMemberTextSelection(transformMemberCase(selected,kind==='uppercase'));return;
 }
 field.focus();
 let before='',after='',content=selected;
 if(kind==='bold'){before='**';after='**';if(!content)content='Text';}
 else if(kind==='italic'){before='*';after='*';if(!content)content='Text';}
 else if(kind==='link'){
  const address=window.prompt('Linkadresse eingeben (https://...)','https://');
  if(!address)return;
  const href=safeHref(address);
  if(!href||!href.startsWith('http')){api.toast('Bitte eine gültige Linkadresse mit https:// eingeben.');return;}
  before='[';content=content||'Linktext';after=']('+href+')';
 }else return;
 field.setRangeText(before+content+after,start,end,'select');
 field.setSelectionRange(start+before.length,start+before.length+content.length);
 changeMember();field.focus();
}
function applyMemberFontSize(){
 const selector=$('member-font-size'),size=selector.value;
 if(!size)return;
 selector.value='';
 const field=$('member-description'),start=field.selectionStart,end=field.selectionEnd;
 if(start===end){api.toast('Bitte zuerst den Text markieren.');field.focus();return;}
 const selected=field.value.slice(start,end);
 const changed=selected.split('\n').map(line=>{
  if(!line.trim())return line;
  const prior=line.match(/^\[pt=(?:10|11|12|14|16|18|20|24)\]([\s\S]*)\[\/pt\]$/);
  return '[pt='+size+']'+(prior?prior[1]:line)+'[/pt]';
 }).join('\n');
 changeMemberTextSelection(changed);
}
$('member-font-size').addEventListener('change',applyMemberFontSize);
function applyMemberStyle(kind,value){
 const options={
  font:{inter:true,cormorant:true,georgia:true},
  color:{gold:true,lightgold:true,anthracite:true,slate:true}
 };
 if(!options[kind]?.[value])return;
 const field=$('member-description'),start=field.selectionStart,end=field.selectionEnd;
 if(start===end){api.toast('Bitte zuerst den Text markieren.');field.focus();return;}
 const selection=field.value.slice(start,end);
 // One formatted wrapper per line preserves existing paragraph and line spacing.
 const changed=selection.split('\n').map(line=>{
  if(!line.trim())return line;
  const re=kind==='font'
   ?/^\[font=(?:inter|cormorant|georgia)\]([\s\S]*)\[\/font\]$/
   :/^\[color=(?:gold|lightgold|anthracite|slate)\]([\s\S]*)\[\/color\]$/;
  const previous=line.match(re);
  return '['+kind+'='+value+']'+(previous?previous[1]:line)+'[/'+kind+']';
 }).join('\n');
 changeMemberTextSelection(changed);
}
$('member-font-family').addEventListener('change',()=>{
 const el=$('member-font-family'),value=el.value;el.value='';
 if(value)applyMemberStyle('font',value);
});
$('member-text-color').addEventListener('change',()=>{
 const el=$('member-text-color'),value=el.value;el.value='';
 if(value)applyMemberStyle('color',value);
});
const MEMBER_SYMBOLS={check:'✓',bullet:'•',diamond:'◆',arrow:'→'};
$('member-symbol').addEventListener('change',()=>{
 const el=$('member-symbol'),symbol=MEMBER_SYMBOLS[el.value];el.value='';
 if(!symbol)return;
 const field=$('member-description'),start=field.selectionStart;
 field.setRangeText(symbol+' ',start,start,'end');
 changeMember();field.focus();
});

function addressCompanyName(member){
 // The postal address uses its own editable company name, independent from the member heading.
 if(typeof member.addressCompany==='string'&&member.addressCompany.trim())return member.addressCompany.trim();
 // Legacy member drafts may not have this field yet.
 if(member.id==='member-8'||/\/logos\/onur\./i.test(member.logo||''))return 'ONUR Projects GmbH';
 if(member.id==='member-1'||/\/logos\/akkaya\./i.test(member.logo||''))return 'C. Akkaya Lösungen aus Edelstahl';
 return String(member.name||'').trim();
}
function memberPreview(){
 const m=memberItem();if(!m)return;
 $('member-preview-name').textContent=m.name||'Firmenname';
 $('member-editor-title').textContent=m.name||'Neues Mitglied';
 renderMemberDescription(m);
 for(const elem of [$('member-preview-logo'),$('member-logo-thumb')]){elem.src=m.logo||'/admin/brand.svg';}
 const recent=memberPhotoLocal.get(m.id);
 const photoSrc=recent?.path===m.photo?recent.url:(m.photo||'/admin/brand.svg');
 $('member-photo-thumb').src=photoSrc;
 $('member-photo-direct').classList.toggle('hidden',!m.photo);
 $('member-photo-crop').disabled=!m.photo;
 if(m.photo)$('member-preview-photo').src=photoSrc;
 for(const el of [$('member-photo-thumb'),$('member-preview-photo')]){
  el.style.objectFit='contain';
  el.style.objectPosition='center';
  el.style.transform='none';
  el.style.transformOrigin='center';
 }
 $('member-preview-person').textContent=[m.person,m.role].filter(Boolean).join(' · ');
 const contact=$('member-preview-contacts');contact.replaceChildren();
 function contactLink(text,href){
  if(!text)return;
  if(href){const a=make('a','',text);a.href=href;a.target=href.startsWith('http')?'_blank':'_self';if(a.target==='_blank')a.rel='noopener noreferrer';contact.append(a);}
  else contact.append(make('span','',text));
 }
 // Always display the company name, even if the other address fields are empty.
 const addressLines=[addressCompanyName(m),m.street,[m.postalCode,m.city].filter(Boolean).join(' '),m.country].filter(Boolean);
 if(addressLines.length)contact.append(make('span','member-address',addressLines.join('\n')));
 if(m.phone)contactLink('☎ '+m.phone,'tel:'+String(m.phone).replace(/[^+\d]/g,''));
 if(m.email)contactLink('✉ '+m.email,'mailto:'+String(m.email).trim());
 if(m.url)contactLink('↗ Webseite ansehen',safeHref(m.url));
 const socials=$('member-preview-social');socials.replaceChildren();
 for(const social of m.socials||[]){
  const href=safeHref(social.url);
  if(!href)continue;
  const platform=socialPlatforms[social.platform]||socialPlatforms.website;
  const sameLink=(a,b)=>{try{return new URL(a).href.replace(/\/$/,'')===new URL(b).href.replace(/\/$/,'');}catch(_){return a===b;}};
  if(platform===socialPlatforms.website && m.url && sameLink(social.url,m.url))continue;
  const a=make('a','',platform.icon);a.href=href;a.target='_blank';a.rel='noopener noreferrer';
  a.title=platform.name;a.setAttribute('aria-label',platform.name+' öffnen');socials.append(a);
 }
}
function changeMember(){
 const m=memberItem();if(!m)return;
 m.name=$('member-name').value;m.url=$('member-url').value;
 m.person=$('member-person').value;m.role=$('member-role').value;
 m.street=$('member-street').value;
 m.postalCode=$('member-postal').value;
 m.city=$('member-city').value;
 m.country=$('member-country').value;
 m.addressCompany=$('member-address-company').value.trim();
 m.phone=$('member-phone').value;m.email=$('member-email').value;
 const newDescription=$('member-description').value;
 if(newDescription!==m.description){
  m.descriptionParagraphStyles=rebaseMemberLineStyles(m.description||'',newDescription,m.descriptionParagraphStyles);
  m.description=newDescription;
 }
 m.public=$('member-public').checked;
 m.descriptionAlign=$('member-description-align').value;
 memberPreview();save('bk-demo-members-v1',members);
}
$('member-add').onclick=newMember;
$('member-back').onclick=()=>{renderMembers();api.page('members')};
['member-name','member-url','member-person','member-role','member-street','member-postal','member-city','member-country','member-address-company','member-phone','member-email','member-description','member-public','member-description-align'].forEach(x=>$(x).addEventListener('input',changeMember));
$('member-description-line').addEventListener('change',applyMemberLineHeight);
$('member-description').addEventListener('click',showMemberCurrentLineHeight);
$('member-description').addEventListener('keyup',showMemberCurrentLineHeight);
$('member-description').addEventListener('select',showMemberCurrentLineHeight);
document.querySelectorAll('[data-member-format]').forEach(button=>button.onclick=()=>formatMemberSelection(button.dataset.memberFormat));
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

// One-step non-destructive cropping: the original image remains in GitHub.
// Cropping creates a separate new file only after explicit confirmation.
const cropDialog=$('member-crop-dialog');
const cropImage=$('member-crop-image');
const cropStage=$('member-crop-stage');
const cropSelection=$('member-crop-selection');
let cropData=null,cropGesture=null;
const clampCrop=(value,min,max)=>Math.max(min,Math.min(max,value));
function drawMemberCrop(){
 if(!cropData)return;
 const r=cropData.rect;
 cropSelection.style.left=(r.x*100)+'%';
 cropSelection.style.top=(r.y*100)+'%';
 cropSelection.style.width=(r.w*100)+'%';
 cropSelection.style.height=(r.h*100)+'%';
}
function closeMemberCrop(){
 if(cropDialog.classList.contains('hidden'))return;
 if($('member-crop-apply').disabled)return;
 cropDialog.classList.add('hidden');
 cropImage.removeAttribute('src');
 cropImage.onload=null;cropImage.onerror=null;
 cropData=null;cropGesture=null;
 $('member-crop-status').textContent='';
}
$('member-photo-crop').onclick=()=>{
 const member=memberItem();if(!member?.photo)return;
 const recent=memberPhotoLocal.get(member.id);
 const src=recent?.path===member.photo?recent.url:member.photo;
 cropData={memberId:member.id,rect:{x:.08,y:.08,w:.84,h:.84}};
 cropGesture=null;
 $('member-crop-status').textContent='Foto wird geladen ...';
 cropSelection.style.visibility='hidden';
 cropDialog.classList.remove('hidden');
 cropImage.onload=()=>{
  if(!cropData)return;
  $('member-crop-status').textContent='Wähle den Ausschnitt direkt auf dem Foto.';
  drawMemberCrop();cropSelection.style.visibility='visible';
 };
 cropImage.onerror=()=>{$('member-crop-status').textContent='Foto ist noch nicht verfügbar. Bitte nach dem Hochladen und Speichern erneut versuchen.';cropSelection.style.visibility='hidden';};
 cropImage.src=src;
};
$('member-crop-cancel').onclick=closeMemberCrop;
cropDialog.addEventListener('pointerdown',e=>{if(e.target===cropDialog)closeMemberCrop();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!cropDialog.classList.contains('hidden'))closeMemberCrop();});
cropStage.addEventListener('pointerdown',ev=>{
 if(!cropData||!cropImage.naturalWidth||ev.button!==0)return;
 ev.preventDefault();
 const bounds=cropStage.getBoundingClientRect();
 const px=clampCrop((ev.clientX-bounds.left)/bounds.width,0,1);
 const py=clampCrop((ev.clientY-bounds.top)/bounds.height,0,1);
 const handle=ev.target?.dataset?.cropHandle||'';
 const inside=cropSelection.contains(ev.target);
 cropGesture={pointerId:ev.pointerId,mode:handle||(inside?'move':'new'),
  x:px,y:py,rect:{...cropData.rect}};
 if(!inside){
  cropData.rect={x:Math.min(px,.95),y:Math.min(py,.95),w:.05,h:.05};
  cropGesture.rect={...cropData.rect};
  cropGesture.x=px;cropGesture.y=py;
 }
 cropStage.setPointerCapture(ev.pointerId);
 drawMemberCrop();
});
cropStage.addEventListener('pointermove',ev=>{
 const g=cropGesture;if(!cropData||!g||g.pointerId!==ev.pointerId)return;
 ev.preventDefault();
 const bounds=cropStage.getBoundingClientRect();
 const px=clampCrop((ev.clientX-bounds.left)/bounds.width,0,1);
 const py=clampCrop((ev.clientY-bounds.top)/bounds.height,0,1);
 const dx=px-g.x,dy=py-g.y,r=g.rect,min=.05;
 let result;
 if(g.mode==='move'){
  result={...r,x:clampCrop(r.x+dx,0,1-r.w),y:clampCrop(r.y+dy,0,1-r.h)};
 }else if(g.mode==='new'){
  const x=clampCrop(Math.min(g.x,px),0,1-min),y=clampCrop(Math.min(g.y,py),0,1-min);
  result={x,y,w:clampCrop(Math.abs(px-g.x),min,1-x),h:clampCrop(Math.abs(py-g.y),min,1-y)};
 }else{
  const left=r.x,top=r.y,right=r.x+r.w,bottom=r.y+r.h;
  const l=g.mode.includes('w')?clampCrop(left+dx,0,right-min):left;
  const t=g.mode.includes('n')?clampCrop(top+dy,0,bottom-min):top;
  const rr=g.mode.includes('e')?clampCrop(right+dx,l+min,1):right;
  const bb=g.mode.includes('s')?clampCrop(bottom+dy,t+min,1):bottom;
  result={x:l,y:t,w:rr-l,h:bb-t};
 }
 cropData.rect=result;drawMemberCrop();
});
function endMemberCropDrag(ev){
 if(cropGesture&&ev.pointerId===cropGesture.pointerId){
  cropGesture=null;
  if(cropStage.hasPointerCapture(ev.pointerId))cropStage.releasePointerCapture(ev.pointerId);
 }
}
cropStage.addEventListener('pointerup',endMemberCropDrag);
cropStage.addEventListener('pointercancel',endMemberCropDrag);
$('member-crop-apply').onclick=async()=>{
 if(!cropData||!cropImage.naturalWidth)return;
 const memberId=cropData.memberId;
 if(chosenMember!==memberId){$('member-crop-status').textContent='Bitte das Mitglied erneut öffnen.';return;}
 const button=$('member-crop-apply');button.disabled=true;
 $('member-crop-status').textContent='Foto wird zugeschnitten und gespeichert ...';
 try{
  const {x,y,w,h}=cropData.rect;
  const sourceWidth=cropImage.naturalWidth,sourceHeight=cropImage.naturalHeight;
  const sx=Math.round(x*sourceWidth),sy=Math.round(y*sourceHeight);
  const sw=Math.max(1,Math.min(sourceWidth-sx,Math.round(w*sourceWidth)));
  const sh=Math.max(1,Math.min(sourceHeight-sy,Math.round(h*sourceHeight)));
  const scale=Math.min(1,1800/Math.max(sw,sh));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Bildbearbeitung wird in diesem Browser nicht unterstützt.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(cropImage,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Foto konnte nicht zugeschnitten werden.')),'image/jpeg',.88));
  const file=new File([blob],'mitglied-zuschnitt-'+Date.now()+'.jpg',{type:'image/jpeg'});
  const success=await uploadMemberImage('photo',file);
  if(!success)throw Error('Zuschneiden konnte nicht gespeichert werden. Das bestehende Foto bleibt erhalten.');
  button.disabled=false;
  closeMemberCrop();
 }catch(error){
  $('member-crop-status').textContent=error.message||'Foto konnte nicht gespeichert werden.';
 }finally{button.disabled=false;}
};

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