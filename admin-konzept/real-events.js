/* Read-only listing of event files in the GitHub TEST branch.
   Existing design/demo editors remain completely independent and cannot overwrite source files. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const root=$('real-events-panel');
 if(!root)return;
 const status=$('real-events-state');
 const list=$('real-events-list');
 const refresh=$('real-events-refresh');
 let busy=false, loaded=false;
 const repo='Baukarussell/baukarussell-webseite';
 const branch='presentation-recovery-2026-11-10';
 function message(value,kind=''){
   status.textContent=value;status.className='real-events-state'+(kind?' '+kind:'');
 }
 function img(src,title){
   const wrap=document.createElement('div');wrap.className='real-event-photo';
   if(typeof src==='string'&&/^\/(?:logos|events|uploads)\//.test(src)&&!src.includes('..')){
     const pic=document.createElement('img');pic.src=src;pic.alt=title||'Eventbild';
     pic.onerror=()=>wrap.replaceChildren(document.createTextNode('▧'));
     wrap.append(pic);
   }else wrap.textContent='▧';
   return wrap;
 }
 function createCard(event){
   const row=document.createElement('article');row.className='real-event-row';
   const info=document.createElement('div');info.className='real-event-content';
   const title=document.createElement('strong');title.textContent=String(event.title||'Ohne Titel');
   const meta=document.createElement('span');meta.textContent=[event.date,event.location].filter(Boolean).join(' · ')||'Ohne Datum';
   const link=document.createElement('a');link.textContent='Quelldatei ansehen ↗';
   const file=encodeURIComponent(String(event.slug||''))+'.md';
   link.href='https://github.com/'+repo+'/blob/'+encodeURIComponent(branch)+'/events/'+file;
   link.target='_blank';link.rel='noopener noreferrer';
   const open=document.createElement('button');
   open.type='button';open.className='real-event-open';
   open.textContent='Details & Galerie ansehen ↗';
   open.style.cssText='border:0;background:transparent;padding:4px 0;margin-right:13px;font-size:11px;cursor:pointer;';
   open.addEventListener('click',()=>showDetails(event));
   info.append(title,meta,open,link);row.append(img(event.image,title.textContent),info);
   return row;
 }
 function showDetails(event){
   const pane=$('real-event-detail');
   if(!pane)return;
   $('real-detail-title').textContent=event.title||'Event';
   $('real-detail-subtitle').textContent=event.subtitle||'';
   const photo=$('real-detail-cover');
   const sourceImage=typeof event.image==='string'&&/^\/(?:logos|events|uploads)\//.test(event.image)&&!event.image.includes('..')?event.image:'';
   if(sourceImage){photo.src=sourceImage;photo.style.display='block';}
   else {photo.removeAttribute('src');photo.style.display='none';}
   $('real-detail-date').textContent=[event.date,event.time].filter(Boolean).join(' · ')||'Noch keine Angabe';
   $('real-detail-location').textContent=event.location||'Noch keine Angabe';
   $('real-detail-description').textContent=event.body||'Keine Beschreibung in der Quelldatei vorhanden.';
   const filename=encodeURIComponent(String(event.slug||''))+'.md';
   $('real-detail-source').href='https://github.com/'+repo+'/blob/'+encodeURIComponent(branch)+'/events/'+filename;
   const gallery=$('real-detail-gallery');gallery.replaceChildren();
   const photos=Array.isArray(event.gallery)?event.gallery:[];
   $('real-detail-gallery-count').textContent='('+photos.length+')';
   if(!photos.length){const empty=document.createElement('div');empty.className='real-event-empty';empty.textContent='In der Quelldatei sind keine Galeriefotos hinterlegt.';gallery.append(empty);}
   for(const item of photos){
     if(typeof item!=='string'||!/^\/(?:logos|events|uploads)\//.test(item)||item.includes('..'))continue;
     const photo=document.createElement('img');photo.src=item;photo.alt='Eventgalerie';photo.loading='lazy';gallery.append(photo);
   }
   pane.classList.remove('hidden');
   pane.scrollIntoView({behavior:'smooth',block:'start'});
 }
 $('real-detail-close').addEventListener('click',()=>{
   $('real-event-detail').classList.add('hidden');
   root.scrollIntoView({behavior:'smooth',block:'start'});
 });
 async function get(url){
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),15000);
   try {
     const response=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
     let data={};try{data=await response.json()}catch(_){}
     return {status:response.status,ok:response.ok,data};
   }finally{clearTimeout(timeout);}
 }
 async function load(){
   if(busy)return;busy=true;refresh.disabled=true;
   list.replaceChildren();
   $('real-event-detail').classList.add('hidden');
   message('GitHub Verbindung und Zugriffsrechte werden geprüft ...');
   try{
     const session=await get('/admin-api/session');
     if(!session.ok){message('Die sichere Verbindung ist noch nicht verfügbar. Die Beispielkarten bleiben nutzbar.','error');return;}
     if(!session.data.authenticated){
       message('Bitte zuerst auf Übersicht mit GitHub anmelden. Danach werden hier die echten Eventdateien aus dem Testbranch angezeigt.','auth-required');
       return;
     }
     message('Eventdateien werden aus dem Testbranch geladen ...');
     const result=await get('/admin-api/events');
     if(!result.ok){
       message(result.status===403?'Dein Konto besitzt keine erforderliche GitHub Berechtigung.':
         result.status===404?'Im Testbranch wurde kein Eventordner gefunden.':
         'Die Eventdateien konnten nicht geladen werden. Versuche die Prüfung erneut.','error');
       return;
     }
     if(!Array.isArray(result.data.events)){message('Die Datenquelle hat ein unerwartetes Format geliefert.','error');return;}
     loaded=true;
     message(result.data.events.length+' Eventdatei(en) im Testbranch gefunden. Nur Lesezugriff.','success');
     if(result.data.events.length===0){
       const info=document.createElement('p');info.className='real-events-hint';info.textContent='Noch keine lesbaren Eventdateien im Testbranch.';list.append(info);
     }
     for(const event of result.data.events)list.append(createCard(event));
   }catch(_){
     message('Die GitHub Datenquelle ist momentan nicht erreichbar.','error');
   }finally{busy=false;refresh.disabled=false;}
 }
 refresh.onclick=()=>load();
 // Load only when someone opens the Events area. Nothing changes in the editable demo.
 document.querySelectorAll('[data-page="events"],[data-hub-target="events"]').forEach(
   element=>element.addEventListener('click',()=>{if(!loaded)load();})
 );
 // On in-app return from an edit page, fetch when the Events view becomes visible.
 const observer=new MutationObserver(()=>{
   const page=$('events');
   if(page&&!page.classList.contains('hidden')&&!loaded&&!busy)load();
 });
 observer.observe($('events'),{attributes:true,attributeFilter:['class']});
})();