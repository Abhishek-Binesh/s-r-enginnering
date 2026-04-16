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

    const systemPrompt =
      "You are a helpful AI assistant for S R Engineering...";

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

    const geminiRequest = {
      // FIX: 'parts' MUST be an array [ { text: "..." } ]
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: userHistory,
    };

    const apiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiRequest),
    });

    const data = await apiResponse.json();

    // If Google returns an error (400, 403, 429, etc.)
    if (data.error) {
      return new Response(
        JSON.stringify({ reply: `Gemini Error: ${data.error.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let replyText = "";

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];

      // Check for safety blocks
      if (candidate.finishReason === "SAFETY") {
        replyText = "I cannot answer that for safety reasons.";
      } else {
        replyText = candidate.content.parts.map((p) => p.text).join("");
      }
    } else {
      // This helps you debug if candidates is missing for another reason
      replyText =
        "Debug: API returned 200 but no candidates. Raw: " +
        JSON.stringify(data).substring(0, 100);
    }

    return new Response(JSON.stringify({ reply: replyText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ reply: "Worker Error: " + error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}
