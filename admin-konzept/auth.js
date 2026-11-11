/* Baukarussell test CMS: only authentication + read-only repository permission check.
   No GitHub token or secret is exposed to frontend JavaScript.
   Publishing and saving are intentionally NOT enabled in this version. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const box=$('github-connection');
 if(!box)return;
 let csrf='';
 let loggedIn=false;
 const title=$('connection-title');
 const detail=$('connection-detail');
 const extra=$('connection-extra');
 const login=$('connection-login');
 const test=$('connection-test');
 const logout=$('connection-logout');
 function display(state,message,hint){
   loggedIn=state==='connected';
   box.classList.toggle('is-connected',loggedIn);
   box.classList.toggle('is-error',state==='error');
   title.textContent=message;
   detail.textContent=hint||'';
   login.classList.toggle('hidden',loggedIn);
   test.classList.toggle('hidden',!loggedIn);
   logout.classList.toggle('hidden',!loggedIn);
   extra.textContent=loggedIn?
     'Sicher verbunden. Entwürfe bleiben vorerst weiterhin lokale Designvorschauen.' :
     'Die Verbindung ändert noch keine Inhalte auf der Webseite.';
 }
 async function responseData(url,options={}){
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),12000);
   try{
     const res=await fetch(url,{
       credentials:'same-origin',
       cache:'no-store',
       signal:controller.signal,
       ...options
     });
     const data=await res.json().catch(()=>({}));
     return {ok:res.ok,status:res.status,data};
   }finally{clearTimeout(timeout);}
 }
 async function checkSession(){
   try{
     const result=await responseData('/admin-api/session');
     if(!result.ok){
       display('error','Verbindung derzeit nicht verfügbar',
         'Der neue sichere Login wird noch bereitgestellt. Das Design kannst du weiter verwenden.');
       return;
     }
     if(!result.data.authenticated){
       csrf='';
       display('offline','Noch nicht mit GitHub verbunden',
         'Zum Prüfen der Testumgebung kannst du dich mit deinem berechtigten GitHub Konto anmelden.');
       return;
     }
     csrf=result.data.csrf||'';
     display('connected','Mit GitHub verbunden: '+result.data.user,
       'Berechtigung zum Bearbeiten des Testrepositories bestätigt.');
   }catch(_){
     display('error','Verbindung konnte nicht geprüft werden',
       'Bitte kontrolliere später den Testlogin. Alle bisherigen Designfunktionen bleiben erhalten.');
   }
 }
 test.onclick=async()=>{
   if(!loggedIn)return;
   test.disabled=true;
   title.textContent='Testrepository wird geprüft ...';
   try{
     const result=await responseData('/admin-api/repository');
     if(result.ok&&result.data.accessible){
       display('connected','GitHub Testverbindung bestätigt',
         result.data.repository+' · '+result.data.branch);
     }else{
       display('error','Testzugriff konnte nicht bestätigt werden',
         'Bitte prüfe deine GitHub Berechtigung.');
     }
   }catch(_){display('error','Testverbindung fehlgeschlagen','GitHub konnte nicht erreicht werden.');}
   finally{test.disabled=false;}
 };
 logout.onclick=async()=>{
   if(!csrf)return;
   logout.disabled=true;
   try{
     const result=await responseData('/admin-api/logout',{
       method:'POST',
       headers:{'X-BK-CSRF':csrf,'Content-Type':'application/json'},
       body:'{}'
     });
     if(result.ok){csrf='';display('offline','Von GitHub abgemeldet','Du kannst den Designentwurf weiterhin ohne Anmeldung ansehen.');}
     else display('error','Abmeldung fehlgeschlagen','Bitte überprüfe die Verbindung.');
   }catch(_){display('error','Abmeldung nicht möglich','Das Netzwerk ist derzeit nicht erreichbar.');}
   finally{logout.disabled=false;}
 };
 const params=new URLSearchParams(location.search);
 const status=params.get('connection');
 if(status==='denied'||status==='forbidden'){
   display('error',status==='forbidden'?'Kein Schreibzugriff auf das Repository':'GitHub Anmeldung nicht abgeschlossen',
     status==='forbidden'?'Ein berechtigtes GitHub Konto ist für die Verwaltung erforderlich.':'Du kannst es über den GitHub Login erneut versuchen.');
 }
 // Clear callback status from URL without causing a reload.
 if(status){params.delete('connection');history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);}
 checkSession();
})();