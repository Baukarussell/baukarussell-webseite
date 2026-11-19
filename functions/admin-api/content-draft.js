// Private Baukarussell members and projects drafts, test environment only.
// Protected by the existing GitHub OAuth session and Cloudflare KV binding.
// Shared by authorized GitHub editors for handover. Never publishes site content or stores access tokens in KV.
import {openSession,getAuthorizedIdentity,requireCsrf,json} from '../../src/admin/bk-admin-auth.js';

const MAX_BYTES=160000;
const kinds=new Set(['members','projects']);
const str=(v,max)=>typeof v==='string'&&v.length<=max?v:null;
function validPicture(v){
 if(v==='')return true;
 if(typeof v!=='string'||v.length>320||!/^\/(?:logos|events|mitglieder|uploads)\//.test(v))return false;
 if(!/^\/(?:logos|events|mitglieder|uploads)\/(?:[A-Za-z0-9_.\/()-]|%[A-Fa-f0-9]{2})+$/.test(v)||/%(?:2f|5c)/i.test(v))return false;
 let d;try{d=decodeURIComponent(v)}catch(_){return false}
 return !d.includes('\\')&&!d.includes('//')&&!d.includes('?')&&!d.includes('#')
   &&d.split('/').every(p=>p!=='.'&&p!=='..');
}
function validLink(raw,internal=false){
 if(raw==='')return true;
 if(typeof raw!=='string'||raw.length>700)return false;
 if(internal&&/^mitglieder\/[a-zA-Z0-9_.-]+\.html$/.test(raw))return true;
 try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)}catch(_){return false}
}
function cleanItem(item,kind){
 if(!item||typeof item!=='object'||Array.isArray(item))return null;
 const id=str(item.id,100);
 if(!id||!/^[a-zA-Z0-9_.-]+$/.test(id))return null;
 if(kind==='projects'){
  const title=str(item.title||'',250),date=str(item.date||'',24),location=str(item.location||'',300),description=str(item.description||'',25000);
  if([title,date,location,description].includes(null)||date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  return {id,title,date,location,description};
 }
 const fields={};
 const limits={name:240,person:200,role:180,phone:100,email:250,url:700,description:16000,logo:320,photo:320,street:240,postalCode:30,city:150,country:150,photoFit:12,descriptionAlign:12,descriptionLineHeight:5,descriptionParagraphGap:4};
 for(const [key,limit] of Object.entries(limits)){
  const defaults={photoFit:'contain',descriptionAlign:'left',descriptionLineHeight:'1.6',descriptionParagraphGap:'16'};
  const val=str(item[key]??defaults[key]??'',limit);if(val===null)return null;fields[key]=val;
 }
 if(!['contain','cover'].includes(fields.photoFit))return null;
 const photoZoom=item.photoZoom??100,photoPositionX=item.photoPositionX??50,photoPositionY=item.photoPositionY??50;
 if(![photoZoom,photoPositionX,photoPositionY].every(n=>typeof n==='number'&&Number.isInteger(n)))return null;
 if(photoZoom<80||photoZoom>160||photoPositionX<0||photoPositionX>100||photoPositionY<0||photoPositionY>100)return null;
 if(!['left','justify','center'].includes(fields.descriptionAlign))return null;
 if(!['1.4','1.6','1.8','2'].includes(fields.descriptionLineHeight))return null;
 if(!['0','8','16','24'].includes(fields.descriptionParagraphGap))return null;
 if(!validPicture(fields.logo)||!validPicture(fields.photo)||!validLink(fields.url,true))return null;
 if(fields.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))return null;
 const rawParagraphStyles=item.descriptionParagraphStyles??[];
 if(!Array.isArray(rawParagraphStyles)||rawParagraphStyles.length>120)return null;
 const descriptionParagraphStyles=[];
 for(const value of rawParagraphStyles){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const align=str(value.align??'',12),line=str(value.line??'',5),gap=str(value.gap??'',4);
  if(align===null||line===null||gap===null)return null;
  if(!['','left','justify','center'].includes(align)
    ||!['','1.2','1.4','1.6','1.8','2'].includes(line)
    ||!['','0','8','16','24','32','48'].includes(gap)
    ||(value.heading!==undefined&&typeof value.heading!=='boolean'))return null;
  descriptionParagraphStyles.push({align,line,gap,heading:value.heading===true});
 }
 const social=Array.isArray(item.socials)?item.socials:[];
 if(social.length>24)return null;
 const socials=[];
 for(const row of social){
  if(!row||typeof row!=='object')return null;
  const platform=str(row.platform||'website',30),url=str(row.url||'',700);
  if(platform===null||url===null||!validLink(url)||!/^[a-z0-9_-]+$/.test(platform))return null;
  socials.push({platform,url});
 }
 return {id,...fields,photoZoom,photoPositionX,photoPositionY,descriptionParagraphStyles,public:item.public!==false,socials};
}
function normalized(data,kind){
 if(!Array.isArray(data)||data.length>(kind==='members'?90:100))return null;
 const seen=new Set(),output=[];
 for(const item of data){
  const cleaned=cleanItem(item,kind);
  if(!cleaned||seen.has(cleaned.id))return null;
  seen.add(cleaned.id);output.push(cleaned);
 }
 return output;
}
async function authorize(request,env){
 const session=await openSession(request,env);
 if(!session)return {error:json({error:'Bitte auf Übersicht mit GitHub anmelden.'},401)};
 const identity=await getAuthorizedIdentity(session.token);
 if(!identity||identity.user!==session.user)return {error:json({error:'Keine GitHub Berechtigung.'},403)};
 const kv=env.BK_ADMIN_DRAFTS;
 if(!kv||typeof kv.get!=='function'||typeof kv.put!=='function')return {error:json({error:'Cloudflare KV Speicher ist nicht verbunden.'},503)};
 const kind=new URL(request.url).searchParams.get('kind');
 if(!kinds.has(kind))return {error:json({error:'Ungültiger Bereich.'},400)};
 return {session,kv,kind,key:'bk:test:v1:content:shared:'+kind};
}
export async function onRequestGet({request,env}){
 try{
  const a=await authorize(request,env);
  if(a.error)return a.error;
  const saved=await a.kv.get(a.key,'json');
  return json({kind:a.kind,found:!!saved,items:saved?.items||[],savedAt:saved?.savedAt||null,published:false});
 }catch(_){return json({error:'Entwurf konnte nicht geladen werden.'},503)}
}
export async function onRequestPut({request,env}){
 try{
  const a=await authorize(request,env);
  if(a.error)return a.error;
  if(!requireCsrf(request,a.session))return json({error:'Sicherheitsprüfung fehlgeschlagen.'},403);
  if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'JSON erforderlich.'},415);
  const body=await request.text();
  if(new TextEncoder().encode(body).length>MAX_BYTES)return json({error:'Zu grosse Datenmenge.'},413);
  let data;try{data=JSON.parse(body)}catch(_){return json({error:'Ungültiges JSON.'},400)}
  const items=normalized(data.items,a.kind);
  if(!items)return json({error:'Einige Felder oder Bildpfade sind ungültig. Fotos müssen zuerst dauerhaft gespeichert sein.'},400);
  const savedAt=new Date().toISOString();
  await a.kv.put(a.key,JSON.stringify({kind:a.kind,items,savedAt,editor:a.session.user}));
  return json({saved:true,kind:a.kind,count:items.length,savedAt,published:false});
 }catch(_){return json({error:'Entwurf konnte nicht gespeichert werden.'},503)}
}
