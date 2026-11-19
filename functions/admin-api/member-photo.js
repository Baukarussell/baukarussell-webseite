// Store member profile pictures in the public GitHub TEST branch.
// Private admin authentication protects the write operation; media files are publicly accessible.
import {openSession,getAuthorizedIdentity,requireCsrf,BK_REPO,BK_BRANCH,json} from '../../src/admin/bk-admin-auth.js';

const MAX_FILE_BYTES=4*1024*1024;
function fileExt(bytes){
 if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return '.jpg';
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))return '.png';
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return '.webp';
 return null;
}
function base64Encode(bytes){
 let out='';
 for(let i=0;i<bytes.length;i+=8192){
  out+=String.fromCharCode(...bytes.subarray(i,i+8192));
 }
 return btoa(out);
}
export async function onRequestPost({request,env}){
 try{
  const session=await openSession(request,env);
  if(!session)return json({error:'Bitte mit GitHub anmelden.'},401);
  if(!requireCsrf(request,session))return json({error:'Sicherheitsprüfung fehlgeschlagen.'},403);
  const identity=await getAuthorizedIdentity(session.token);
  if(!identity||identity.user!==session.user)return json({error:'Keine GitHub Schreibberechtigung.'},403);
  const contentType=request.headers.get('Content-Type')||'';
  if(!contentType.startsWith('multipart/form-data'))return json({error:'Foto Upload erforderlich.'},415);
  const raw=await request.formData();
  const file=raw.get('file');
  const kind=raw.get('kind');
  if(kind!=='mitglied'||!(file instanceof File))return json({error:'Bitte ein Mitgliedsfoto wählen.'},400);
  if(file.size<100||file.size>MAX_FILE_BYTES)return json({error:'Foto zu gross. Bitte unter 4 MB verkleinern.'},413);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const ext=fileExt(bytes);
  if(!ext)return json({error:'Bitte ein echtes JPG, PNG oder WebP Foto wählen.'},400);
  const clean=String(file.name||'bild').replace(/\.[^.]+$/,'').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42)||'bild';
  const suffix=crypto.randomUUID().slice(0,12);
  const filename='mitglied-'+clean+'-'+suffix+ext;
  const path='mitglieder/'+filename;
  const response=await fetch('https://api.github.com/repos/'+BK_REPO+'/contents/'+path,{
   method:'PUT',
   headers:{
    Authorization:'Bearer '+session.token,
    Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28',
    'User-Agent':'Baukarussell-Test-Admin',
    'Content-Type':'application/json'
   },
   body:JSON.stringify({message:'Add member photo to website test branch',content:base64Encode(bytes),branch:BK_BRANCH})
  });
  if(!response.ok)return json({error:'GitHub konnte das Foto nicht speichern ('+response.status+').'},502);
  const saved=await response.json();
  if(!saved?.content?.sha)return json({error:'GitHub hat das Foto nicht bestätigt.'},502);
  return json({saved:true,url:'/'+path,filename,branch:BK_BRANCH,publicRepository:true,publishedOnWebsite:false});
 }catch(_){return json({error:'Foto konnte nicht hochgeladen werden.'},503)}
}
