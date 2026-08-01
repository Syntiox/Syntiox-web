export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // 1. Verify Firebase Auth Token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing or invalid token" }), {
        status: 401, headers: { "Content-Type": "application/json" }
      });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const firebaseApiKey = "AIzaSyDCQ1yq4ySr0HC4j1ksSWR7lUdPHvD1UCI";

    let verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });

    let verifyData = await verifyRes.json();
    if (verifyData.error) {
      // Fallback: If it fails, it might be a Custom Token from the SSO client. Let's try to exchange it.
      const exchangeRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken, returnSecureToken: true })
      });
      const exchangeData = await exchangeRes.json();
      if (exchangeData.error) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
          status: 401, headers: { "Content-Type": "application/json" }
        });
      }
    }

    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) {
      return new Response(JSON.stringify({ error: 'Internal Server Configuration Error: HF_TOKEN missing.' }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    const payload = await request.json();
    payload.system_prompt = "You are Syntiox AI, the official assistant for Syntiox Services. You are helpful, friendly, and concise.";

    // Proxy request to Hugging Face Space
    const response = await fetch('https://kakavindu16-md.hf.space/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hfToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API Error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `AI Error: Space returned status ${response.status}. Please check if the space is awake and the token is valid.` }), {
        status: response.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Stream the response back exactly as received using Edge runtime
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    console.error('AI Chat Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
