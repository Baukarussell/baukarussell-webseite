import {
  STATE_COOKIE,VERIFIER_COOKIE,SESSION_COOKIE,
  readCookie,clearCookie,redirect,json,sessionCookie,sealSession,
  newSession,getAuthorizedIdentity,adminLanding
} from './bk-admin-auth.js';

function finish(status,origin) {
  const response=redirect(new URL(adminLanding(status),origin).toString());
  response.headers.append('Set-Cookie',clearCookie(STATE_COOKIE,'Lax'));
  response.headers.append('Set-Cookie',clearCookie(VERIFIER_COOKIE,'Lax'));
  if(status!=='ok')response.headers.append('Set-Cookie',clearCookie(SESSION_COOKIE));
  return response;
}

// Deliberately used only when callback state begins with the new bk1. prefix.
// The existing Decap callback remains untouched for every other OAuth flow.
export async function handleBkAdminCallback({request,env}) {
  const url=new URL(request.url);
  const origin=url.origin;
  const state=url.searchParams.get('state');
  const expected=readCookie(request,STATE_COOKIE);
  const verifier=readCookie(request,VERIFIER_COOKIE);
  const code=url.searchParams.get('code');
  if(!state||!expected||state!==expected||!state.startsWith('bk1.')||
     !verifier||!code||url.searchParams.has('error'))return finish('denied',origin);
  if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET)return finish('config',origin);
  try {
    const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{
      method:'POST',
      headers:{'Accept':'application/json','Content-Type':'application/json'},
      body:JSON.stringify({
        client_id:env.GITHUB_CLIENT_ID,
        client_secret:env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:url.origin+'/api/callback',
        code_verifier:verifier
      }),
      redirect:'error'
    });
    if(!tokenResponse.ok)return finish('denied',origin);
    const data=await tokenResponse.json();
    const token=typeof data.access_token==='string'?data.access_token:null;
    if(!token)return finish('denied',origin);
    const identity=await getAuthorizedIdentity(token);
    if(!identity)return finish('forbidden',origin);
    const sealed=await sealSession(env,newSession(identity,token));
    const response=finish('ok',origin);
    response.headers.append('Set-Cookie',sessionCookie(sealed));
    return response;
  }catch(_){return finish('error',origin);}
}
