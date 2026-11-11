import {
  STATE_COOKIE, VERIFIER_COOKIE, cookie, randomString, redirect, json
} from '../_lib/bk-admin-auth.js';

export async function onRequestGet({request,env}) {
  if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET) {
    return json({error:'GitHub OAuth ist noch nicht konfiguriert.'},503);
  }
  const origin=new URL(request.url).origin;
  const state='bk1.'+randomString(24);
  const verifier=randomString(32); // OAuth PKCE S256, 43-character verifier
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
  const base64=btoa(String.fromCharCode(...hash)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const url=new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id',env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri',origin+'/api/callback');
  url.searchParams.set('scope','repo');
  url.searchParams.set('state',state);
  url.searchParams.set('code_challenge',base64);
  url.searchParams.set('code_challenge_method','S256');
  url.searchParams.set('allow_signup','false');
  const response=redirect(url.toString());
  response.headers.append('Set-Cookie',cookie(STATE_COOKIE,state,{sameSite:'Lax',maxAge:600}));
  response.headers.append('Set-Cookie',cookie(VERIFIER_COOKIE,verifier,{sameSite:'Lax',maxAge:600}));
  return response;
}
