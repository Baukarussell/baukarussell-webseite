import {
  openSession,getAuthorizedIdentity,json,SESSION_COOKIE,clearCookie
} from '../_lib/bk-admin-auth.js';

export async function onRequestGet({request,env}) {
  const session=await openSession(request,env);
  if(!session)return json({authenticated:false,mode:'test',canPublish:false});
  try{
    // Permissions are checked again when the status is requested.
    const identity=await getAuthorizedIdentity(session.token);
    if(!identity||identity.user!==session.user) {
      const response=json({authenticated:false,mode:'test',canPublish:false});
      response.headers.append('Set-Cookie',clearCookie(SESSION_COOKIE));
      return response;
    }
    return json({
      authenticated:true,
      user:identity.user,
      avatar:identity.avatar,
      csrf:session.csrf,
      mode:'test',
      canPublish:false
    });
  }catch(_){return json({authenticated:false,error:'GitHub derzeit nicht erreichbar.',mode:'test',canPublish:false},503);}
}
