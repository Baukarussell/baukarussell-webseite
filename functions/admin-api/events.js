// Read-only GitHub source for the TEST administration UI.
// Does not write to GitHub or expose OAuth tokens to the browser.
import {
  openSession,getAuthorizedIdentity,github,BK_REPO,BK_BRANCH,json
} from '../../src/admin/bk-admin-auth.js';

function decodeBase64(value) {
  const bytes=Uint8Array.from(atob(String(value).replace(/\s+/g,'')),v=>v.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function unquote(raw) {
  const v=String(raw||'').trim();
  if(v.startsWith('"')&&v.endsWith('"')) {
    try{return JSON.parse(v);}catch(_){return v.slice(1,-1);}
  }
  if(v.startsWith("'")&&v.endsWith("'"))return v.slice(1,-1).replace(/''/g,"'");
  return v;
}
function parseEvent(raw,filename,sha) {
  const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if(!match)return null;
  const data={},gallery=[];
  let galleryMode=false;
  let galleryIndent=0;
  for(const line of match[1].split(/\r?\n/)) {
    const key=/^([A-Za-z][A-Za-z_]*):\s*(.*)$/.exec(line);
    if(key) {
      const name=key[1],value=key[2];
      if(name==='galerie'||name==='gallery') {
        galleryMode=true;galleryIndent=0;
        if(value.trim().startsWith('[')) {
          try {const arr=JSON.parse(value.trim());if(Array.isArray(arr))gallery.push(...arr.map(x=>typeof x==='string'?x:(x?.image||'')));}
          catch(_){}
        }
        continue;
      }
      galleryMode=false;
      if(['title','subtitle','location','date','image','time'].includes(name))data[name]=unquote(value);
      continue;
    }
    if(galleryMode) {
      if(!line.trim())continue;
      const indent=(line.match(/^\s*/)||[''])[0].length;
      if(galleryIndent===0)galleryIndent=indent;
      if(indent<galleryIndent){galleryMode=false;continue;}
      const entry=/^\s*-\s*(?:image:\s*)?(.+)$/.exec(line) ||
                  /^\s*image:\s*(.+)$/.exec(line);
      if(entry)gallery.push(unquote(entry[1]));
    }
  }
  if(!data.title)return null;
  const normalizeAsset=(value)=>{
    const v=String(value||'').trim();
    if(!v||v.startsWith('data:')||v.startsWith('blob:'))return '';
    const normalized=v.startsWith('/')?v:'/'+v;
    return /^\/(?:logos|uploads|events)\/[a-zA-Z0-9_\-./%]+$/.test(normalized)
      && !normalized.includes('..') ? normalized : '';
  };
  return {
    slug:filename.slice(0,-3),
    sha, title:String(data.title).slice(0,180),
    subtitle:String(data.subtitle||'').slice(0,280),
    location:String(data.location||'').slice(0,200),
    date:String(data.date||'').slice(0,45),
    time:String(data.time||'').slice(0,20),
    image:normalizeAsset(data.image),
    gallery:gallery.map(normalizeAsset).filter(Boolean).slice(0,100),
    body:match[2].trim().slice(0,24000),
    source:'GitHub Testbranch'
  };
}
export async function onRequestGet({request,env}) {
  const session=await openSession(request,env);
  if(!session)return json({error:'Anmeldung erforderlich.',authenticated:false},401);
  try {
    const identity=await getAuthorizedIdentity(session.token);
    if(!identity||identity.user!==session.user)return json({error:'Keine Berechtigung.',authenticated:false},403);
    const listing=await github(session.token,
      '/repos/'+BK_REPO+'/contents/events?ref='+encodeURIComponent(BK_BRANCH));
    if(!listing.ok) {
      return json({error:listing.status===404?'Eventordner nicht vorhanden.':'GitHub Events derzeit nicht verfügbar.'},listing.status===404?404:502);
    }
    if(!Array.isArray(listing.data))return json({error:'Unerwartete Antwort von GitHub.'},502);
    const files=listing.data.filter(x=>x.type==='file'&&/^[a-zA-Z0-9_.-]+\.md$/.test(x.name)).slice(0,80);
    const results=[];
    for(let i=0;i<files.length;i+=5) {
      const batch=files.slice(i,i+5);
      const fetched=await Promise.all(batch.map(file=>github(session.token,
        '/repos/'+BK_REPO+'/contents/events/'+encodeURIComponent(file.name)+'?ref='+encodeURIComponent(BK_BRANCH))));
      fetched.forEach((result,index)=>{
        if(!result.ok||typeof result.data.content!=='string')return;
        try{
          const evt=parseEvent(decodeBase64(result.data.content),batch[index].name,result.data.sha||batch[index].sha);
          if(evt)results.push(evt);
        }catch(_){ /* Skip malformed individual source files. */ }
      });
    }
    results.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return json({readOnly:true,repository:BK_REPO,branch:BK_BRANCH,events:results,count:results.length});
  } catch(_){
    return json({error:'Eventdateien konnten nicht geladen werden.'},503);
  }
}
