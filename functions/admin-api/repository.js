import {
  openSession,getAuthorizedIdentity,github,BK_REPO,BK_BRANCH,json
} from '../../src/admin/bk-admin-auth.js';

export async function onRequestGet({request,env}) {
  const session=await openSession(request,env);
  if(!session)return json({error:'Anmeldung erforderlich.'},401);
  try{
    const identity=await getAuthorizedIdentity(session.token);
    if(!identity||identity.user!==session.user)return json({error:'Keine Schreibberechtigung.'},403);
    const result=await github(session.token,
      '/repos/'+BK_REPO+'/branches/'+encodeURIComponent(BK_BRANCH));
    if(!result.ok)return json({error:'Testbranch nicht verfügbar.'},result.status===404?404:502);
    return json({
      repository:BK_REPO,
      branch:BK_BRANCH,
      accessible:true,
      branchSha:result.data.commit?.sha||null,
      writeMode:'disabled',
      message:'Verbindung geprüft. Noch keine Speicherung oder Veröffentlichung.'
    });
  }catch(_){return json({error:'Repositoryprüfung fehlgeschlagen.'},503);}
}
