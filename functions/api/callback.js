import {handleBkAdminCallback} from '../_lib/bk-admin-callback.js';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    // New custom admin uses its own state, PKCE and HttpOnly session.
    // Every original Decap OAuth popup flow continues down the legacy path below.
    if ((url.searchParams.get('state')||'').startsWith('bk1.')) {
        return handleBkAdminCallback(context);
    }
    const code = url.searchParams.get("code");

    if (!code) {
        return new Response("Kein Autorisierungscode von GitHub erhalten.", {
            status: 400
        });
    }

    const response = await fetch(
        "https://github.com/login/oauth/access_token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code: code
            })
        }
    );

    const data = await response.json();

    if (!response.ok || !data.access_token) {
        return new Response(
            "GitHub Anmeldung fehlgeschlagen: " +
            (data.error_description || data.error || "Unbekannter Fehler"),
            { status: 400 }
        );
    }

    const message = JSON.stringify(
        "authorization:github:success:" +
        JSON.stringify({
            token: data.access_token,
            provider: "github"
        })
    );

    const html = `<!DOCTYPE html>
<html>
<body>
<script>
    const successMessage = ${message};

    function receiveMessage(event) {
        if (
            typeof event.data === "string" &&
            event.data.startsWith("authorizing:github")
        ) {
            window.opener.postMessage(successMessage, event.origin);
            window.removeEventListener("message", receiveMessage);
            setTimeout(() => window.close(), 300);
        }
    }

    window.addEventListener("message", receiveMessage, false);

    if (window.opener) {
        window.opener.postMessage("authorizing:github", "*");
    } else {
        document.body.textContent =
            "Das ursprüngliche Anmeldefenster wurde nicht gefunden.";
    }
</script>
</body>
</html>`;

    return new Response(html, {
        headers: {
            "Content-Type": "text/html;charset=UTF-8"
        }
    });
}
