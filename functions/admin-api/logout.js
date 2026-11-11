import {
  openSession,requireCsrf,SESSION_COOKIE,clearCookie,json
} from '../_lib/bk-admin-auth.js';

export async function onRequestPost({request,env}) {
  const session=await openSession(request,env);
  if(!session)return json({error:'Nicht angemeldet.'},401);
  if(!requireCsrf(request,session))return json({error:'Sicherheitsprüfung fehlgeschlagen.'},403);
  const response=json({authenticated:false,loggedOut:true});
  response.headers.append('Set-Cookie',clearCookie(SESSION_COOKIE));
  return response;
}
