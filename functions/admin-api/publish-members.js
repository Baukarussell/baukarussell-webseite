// Publishes an explicit, administrator-approved snapshot of public MEMBER profiles
// only to the GitHub TEST branch. Never writes drafts or guest records to main.
// The published snapshot is committed as a static JSON file for public website use.
import {openSession,getAuthorizedIdentity,requireCsrf,BK_REPO,BK_BRANCH,json} from '../../src/admin/bk-admin-auth.js';
import {normalized} from './content-draft.js';

const MAX_BYTES=160000;
const OUT='members-data.json';

function base64Utf8(value){
 const bytes=new TextEncoder().encode(value);let binary='';
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
export async function onRequestPost({request,env}){
 try{
  const session=await openSession(request,env);
  if(!session)return json({error:'Bitte zuerst auf Übersicht mit GitHub anmelden.'},401);
  if(!requireCsrf(request,session))return json({error:'Sicherheitsprüfung fehlgeschlagen.'},403);
  const identity=await getAuthorizedIdentity(session.token);
  if(!identity||identity.user!==session.user)return json({error:'Keine Schreibberechtigung.'},403);
  if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'JSON erforderlich.'},415);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).length>MAX_BYTES)return json({error:'Zu viele Daten.'},413);
  let body;try{body=JSON.parse(raw)}catch(_){return json({error:'Ungültige Daten.'},400)}
  if(body?.confirm!=='test-members-only')return json({error:'Bitte die Veröffentlichung ausdrücklich bestätigen.'},400);
  const items=normalized(body.items,'members');
  if(!items||!items.length)return json({error:'Keine gültigen Mitglieder vorhanden. Entwurf bleibt unverändert.'},400);
  const publicItems=items.filter(item=>item.public!==false);
  if(!publicItems.length)return json({error:'Kein Mitglied für die Webseite freigegeben.'},400);
  const contents=JSON.stringify(publicItems,null,2)+'\n';
  const url='https://api.github.com/repos/'+BK_REPO+'/contents/'+OUT;
  const headers={
   Authorization:'Bearer '+session.token,
   Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28',
   'Content-Type':'application/json',
   'User-Agent':'Baukarussell-Test-Publisher'
  };
  const current=await fetch(url+'?ref='+encodeURIComponent(BK_BRANCH),{headers,redirect:'manual'});
  if(current.status!==404&&!current.ok)return json({error:'GitHub Dateistand konnte nicht geprüft werden.'},502);
  let sha;
  if(current.ok){const found=await current.json();sha=found.sha;}
  const result=await fetch(url,{
   method:'PUT',headers,redirect:'manual',
   body:JSON.stringify({
    message:'Prepare '+publicItems.length+' approved member profiles for website test',
    content:base64Utf8(contents),branch:BK_BRANCH,...(sha?{sha}:{})
   })
  });
  if(result.status===409||result.status===422)return json({error:'Der Testbranch wurde inzwischen geändert. Bitte erneut versuchen.'},409);
  if(!result.ok)return json({error:'GitHub hat die Testveröffentlichung nicht bestätigt ('+result.status+').'},502);
  const confirmed=await result.json();
  if(!confirmed?.commit?.sha||!confirmed?.content?.sha)return json({error:'GitHub Rückmeldung unvollständig.'},502);
  return json({success:true,count:publicItems.length,total:items.length,branch:BK_BRANCH,
   commit:confirmed.commit.sha,testOnly:true,livePublished:false});
 }catch(_){return json({error:'Mitglieder konnten nicht für den Website Test vorbereitet werden.'},503)}
}
