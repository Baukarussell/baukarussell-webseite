// Private event draft storage. No GitHub commits, publishing or personal guest data.
// Requires a Cloudflare Pages KV binding: BK_ADMIN_DRAFTS.
// The test repository is PUBLIC: never place drafts in the GitHub repository.
import {
  openSession,getAuthorizedIdentity,requireCsrf,json
} from '../../src/admin/bk-admin-auth.js';

const MAX_BYTES=80000;
function validSlug(s){return typeof s==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,119}$/.test(s)&&!s.includes('..');}
function fileImage(s){
  if(typeof s!=='string')return '';
  if(!/^\/(?:logos|events|uploads)\/[a-zA-Z0-9_.\/%-]+$/.test(s)||s.includes('..')||s.length>300)return '';
  return s;
}
function short(s,limit){
  if(typeof s!=='string')return null;
  return s.length<=limit?s:null;
}
function normalizedDraft(input,slug){
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  if(input.slug!==slug)return null;
  const fields={};
  for(const [k,max] of Object.entries({title:200,slogan:300,date:24,time:12,location:280,text:45000,textAlign:16,sourceSha:100})){
    const value=short(input[k]??'',max);
    if(value===null)return null;
    fields[k]=value;
  }
  if(!fields.title.trim())return null;
  if(fields.date&&!/^\d{4}-\d{2}-\d{2}$/.test(fields.date))return null;
  if(fields.time&&!/^\d{2}:\d{2}$/.test(fields.time))return null;
  if(fields.textAlign&&!['left','center','justify'].includes(fields.textAlign))return null;
  if(fields.sourceSha&&!/^[a-f0-9]{40}$/.test(fields.sourceSha))return null;
  if(!Array.isArray(input.images)||input.images.length>120)return null;
  fields.cover=fileImage(input.cover);
  if(input.cover&&!fields.cover)return null;
  fields.images=[];
  for(const item of input.images){const clean=fileImage(item);if(!clean)return null;fields.images.push(clean);}
  if(!Array.isArray(input.partners)||input.partners.length>50)return null;
  fields.partners=[];
  for(const p of input.partners){
    if(!p||typeof p!=='object'||Array.isArray(p))return null;
    const role=short(p.role||'partner',30),name=short(p.name||'',200),url=short(p.url||'',700);
    if(role===null||name===null||url===null)return null;
    if(url){try{const obj=new URL(url);if(!['https:','http:'].includes(obj.protocol))return null;}catch(_){return null;}}
    fields.partners.push({role,name,url});
  }
  return {slug,...fields};
}
async function authorize(request,env){
  const s=await openSession(request,env);
  if(!s)return {response:json({error:'GitHub Anmeldung erforderlich.'},401)};
  const i=await getAuthorizedIdentity(s.token);
  if(!i||i.user!==s.user)return {response:json({error:'Keine Berechtigung.'},403)};
  return {session:s,login:i.user.toLowerCase()};
}
function store(env){return env.BK_ADMIN_DRAFTS&&typeof env.BK_ADMIN_DRAFTS.get==='function'&&typeof env.BK_ADMIN_DRAFTS.put==='function'?env.BK_ADMIN_DRAFTS:null;}
function draftKey(login,slug){return 'bk:test:v1:event:'+login+':'+slug;}
function failure(error){
  return json({error},503);
}
export async function onRequestGet({request,env}){
  try{
    const auth=await authorize(request,env);if(auth.response)return auth.response;
    const kv=store(env);if(!kv)return failure('Privater Entwurfsspeicher noch nicht eingerichtet. Cloudflare KV Binding BK_ADMIN_DRAFTS fehlt.');
    const slug=new URL(request.url).searchParams.get('slug');
    if(!validSlug(slug))return json({error:'Ungültiger Eventname.'},400);
    const saved=await kv.get(draftKey(auth.login,slug),'json');
    return json({configured:true,slug,found:!!saved,draft:saved||null});
  }catch(_){return failure('Der Entwurf konnte nicht geladen werden.');}
}
export async function onRequestPut({request,env}){
  try{
    const auth=await authorize(request,env);if(auth.response)return auth.response;
    if(!requireCsrf(request,auth.session))return json({error:'Sicherheitsprüfung fehlgeschlagen.'},403);
    const kv=store(env);if(!kv)return failure('Privater Entwurfsspeicher noch nicht eingerichtet. Cloudflare KV Binding BK_ADMIN_DRAFTS fehlt.');
    const slug=new URL(request.url).searchParams.get('slug');
    if(!validSlug(slug))return json({error:'Ungültiger Eventname.'},400);
    if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'JSON erforderlich.'},415);
    const body=await request.text();
    if(new TextEncoder().encode(body).length>MAX_BYTES)return json({error:'Entwurf ist zu gross.'},413);
    let input;try{input=JSON.parse(body)}catch(_){return json({error:'Ungültige Entwurfsdaten.'},400);}
    const fields=normalizedDraft(input,slug);
    if(!fields)return json({error:'Ungültige Felder oder Bilder. Neue Fotos müssen zuerst dauerhaft hochgeladen werden.'},400);
    const now=new Date().toISOString();
    const draft={...fields,savedAt:now,editor:auth.login,repository:'Baukarussell/baukarussell-webseite',branch:'presentation-recovery-2026-11-10'};
    await kv.put(draftKey(auth.login,slug),JSON.stringify(draft));
    return json({saved:true,slug,savedAt:now,storage:'private Cloudflare KV',published:false});
  }catch(_){return failure('Speichern fehlgeschlagen. Bitte erneut versuchen.');}
}
