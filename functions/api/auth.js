export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  if (!env.GITHUB_CLIENT_ID) {
    return new Response("GITHUB_CLIENT_ID fehlt", { status: 500 });
  }

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=repo,user&redirect_uri=${encodeURIComponent(url.origin + '/api/callback')}`;
  
  return Response.redirect(authUrl, 302);
}
