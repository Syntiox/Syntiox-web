export async function onRequest(context) {
  // We only accept POST requests
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // 1. Verify Firebase Auth Token
    const authHeader = context.request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing or invalid token" }), { 
        status: 401, headers: { "Content-Type": "application/json" } 
      });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const firebaseApiKey = "AIzaSyDCQ1yq4ySr0HC4j1ksSWR7lUdPHvD1UCI";

    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
    
    const verifyData = await verifyRes.json();
    if (verifyData.error) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), { 
        status: 401, headers: { "Content-Type": "application/json" } 
      });
    }

    const body = await context.request.json();
    body.system_prompt = "You are Syntiox AI, the official assistant for Syntiox Services. You are helpful, friendly, and concise.";
    
    // Get HF_TOKEN from Cloudflare Environment Variables
    const hfToken = context.env.HF_TOKEN;

    if (!hfToken) {
      return new Response(JSON.stringify({ error: "HF_TOKEN environment variable is not set in Cloudflare." }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy the request to Hugging Face Space securely
    const response = await fetch("https://kakavindu16-md.hf.space/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${hfToken}`
      },
      body: JSON.stringify(body)
    });

    // Stream the response back exactly as received
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
