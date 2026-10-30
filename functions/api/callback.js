export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Kein Code von GitHub erhalten", { status: 400 });
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code,
    }),
  });

  const data = await response.json();
  const token = data.access_token;

  if (!token) {
    return new Response("Fehler beim Abrufen des Tokens", { status: 400 });
  }

  // Dieses Skript schickt den Token zurück an das CMS-Fenster
  const script = `
    <script>
      window.opener.postMessage(
        'authorization:github:success:{"token":"${token}","provider":"github"}',
        '*'
      );
      window.close();
    </script>
  `;

  return new Response(script, {
    headers: { "Content-Type": "text/html" },
  });
}
