export async function onRequest(context) {
  // We only accept POST requests
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await context.request.json();
    
    // Get HF_TOKEN from Cloudflare Environment Variables
    const hfToken = context.env.HF_TOKEN;

    if (!hfToken) {
      return new Response(JSON.stringify({ error: "HF_TOKEN environment variable is not set in Cloudflare." }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy the request to Hugging Face Space securely
    const response = await fetch("https://kakavindu16-syntioxai1.hf.space/generate", {
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
