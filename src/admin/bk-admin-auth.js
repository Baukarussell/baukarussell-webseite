// Shared helpers for Baukarussell's TEST admin only.
// The OAuth access token never appears in client JavaScript or a query parameter.
export const BK_REPO = 'Baukarussell/baukarussell-webseite';
export const BK_BRANCH = 'presentation-recovery-2026-11-10';
export const SESSION_COOKIE = '__Host-bk_admin_session';
export const STATE_COOKIE = '__Host-bk_admin_oauth_state';
export const VERIFIER_COOKIE = '__Host-bk_admin_oauth_verifier';
const SESSION_MS = 90 * 60 * 1000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export function noStore(response) {
  response.headers.set('Cache-Control', 'no-store, private');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
export function json(data, status=200) {
  return noStore(new Response(JSON.stringify(data), {
    status,
    headers: {'Content-Type':'application/json; charset=utf-8'}
  }));
}
export function randomString(size=32) {
  const bytes=new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}
function base64url(bytes) {
  let str='';
  for(const value of bytes)str+=String.fromCharCode(value);
  return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unbase64url(value) {
  if(!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Invalid base64url');
  const binary=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
export function readCookie(request,name) {
  const cookie=request.headers.get('Cookie')||'';
  const match=cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='));
  return match?match.slice(name.length+1):null;
}
export function cookie(name,value,options={}) {
  const maxAge=Number.isFinite(options.maxAge)?options.maxAge:600;
  const sameSite=options.sameSite==='Lax'?'Lax':'Strict';
  return name+'='+value+'; Path=/; Secure; HttpOnly; SameSite='+sameSite+'; Max-Age='+maxAge;
}
export function clearCookie(name,sameSite='Strict') {
  return cookie(name,'',{maxAge:0,sameSite});
}
export function redirect(url) { return noStore(Response.redirect(url,303)); }

async function sessionKey(env) {
  // The OAuth secret is already configured in the existing test Cloudflare project.
  // Dedicated ADMIN_SESSION_SECRET may optionally override it later.
  const secret=env.ADMIN_SESSION_SECRET||env.GITHUB_CLIENT_SECRET;
  if(typeof secret!=='string'||secret.length<24)throw new Error('Admin session secret is missing');
  const digest=await crypto.subtle.digest('SHA-256',enc.encode('BK:admin:test:session:v1:'+secret));
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
export async function sealSession(env,session) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await sessionKey(env);
  const bytes=enc.encode(JSON.stringify(session));
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes);
  return base64url(iv)+'.'+base64url(new Uint8Array(data));
}
export async function openSession(request,env) {
  const raw=readCookie(request,SESSION_COOKIE);
  if(!raw||raw.length>5000)return null;
  try {
    const parts=raw.split('.');
    if(parts.length!==2)return null;
    const iv=unbase64url(parts[0]),cipher=unbase64url(parts[1]);
    if(iv.length!==12||cipher.length<16)return null;
    const key=await sessionKey(env);
    const payload=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
    const s=JSON.parse(dec.decode(payload));
    if(s.version!==1||typeof s.token!=='string'||typeof s.csrf!=='string')return null;
    if(s.exp<Date.now()||s.exp>Date.now()+SESSION_MS+60000)return null;
    if(typeof s.user!=='string'||!s.user)return null;
    return s;
  }catch(_){return null;}
}
export function sameOrigin(request) {
  const url=new URL(request.url);
  if(url.protocol!=='https:')return false;
  const origin=request.headers.get('Origin');
  const site=request.headers.get('Sec-Fetch-Site');
  return origin===url.origin && (!site||['same-origin','none'].includes(site));
}
export function requireCsrf(request,session) {
  const header=request.headers.get('X-BK-CSRF');
  return Boolean(sameOrigin(request)&&header&&session&&header===session.csrf);
}
export async function github(token,path) {
  const response=await fetch('https://api.github.com'+path,{
    headers:{
      'Authorization':'Bearer '+token,
      'Accept':'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
      'User-Agent':'Baukarussell-Test-Admin'
    },
    redirect:'error'
  });
  if(!response.ok)return {ok:false,status:response.status};
  return {ok:true,status:response.status,data:await response.json()};
}
export async function getAuthorizedIdentity(token) {
  const [user,repository]=await Promise.all([
    github(token,'/user'),github(token,'/repos/'+BK_REPO)
  ]);
  if(!user.ok||!repository.ok)return null;
  const permission=repository.data.permissions||{};
  if(permission.push!==true && permission.admin!==true && permission.maintain!==true)return null;
  if(!user.data.login)return null;
  return {user:user.data.login,avatar:user.data.avatar_url||''};
}
export function newSession(identity,token) {
  return {
    version:1,
    user:identity.user,
    token,
    csrf:randomString(24),
    iat:Date.now(),
    exp:Date.now()+SESSION_MS
  };
}
export function sessionCookie(value) {
  return cookie(SESSION_COOKIE,value,{maxAge:Math.floor(SESSION_MS/1000)});
}
export function adminLanding(status) {
  return '/admin-konzept/?connection='+encodeURIComponent(status);
}
