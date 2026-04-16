export async function onRequest({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await request.json();
    const userHistory = body.history || [];

    // Use the official system_instruction field instead of prepending to contents
    const systemPrompt =
      "You are a helpful AI assistant for S R Engineering...";

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

    const geminiRequest = {
      system_instruction: {
        parts: { text: systemPrompt },
      },
      contents: userHistory, // Ensure your frontend sends alternating user/model roles
    };

    const apiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiRequest),
    });

    const data = await apiResponse.json();

    // DEBUG: This will show in your Cloudflare dashboard logs
    if (data.error) {
      console.error("Gemini API Error:", data.error.message);
      return new Response(
        JSON.stringify({ reply: `API Error: ${data.error.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let replyText = "Sorry, no response.";

    // Check if the response was blocked by safety filters
    if (data.candidates?.[0]?.finishReason === "SAFETY") {
      replyText = "I cannot answer that for safety reasons.";
    } else if (data.candidates?.length) {
      const parts = data.candidates[0]?.content?.parts;
      if (parts && parts.length > 0) {
        replyText = parts.map((p) => p.text || "").join("");
      }
    }

    return new Response(JSON.stringify({ reply: replyText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
