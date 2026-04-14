export default {
  async fetch(request, env) {
    // 1. Handle CORS preflight requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      // 2. Extract chat history from the request
      const body = await request.json();
      const userHistory = body.history || [];

      // 3. System Prompt with all S R Engineering details
      const systemPrompt = `You are a helpful, professional, and knowledgeable AI assistant for S R Engineering. 
      S R Engineering is a manufacturer and supplier of industrial machinery for the printing, packaging, and paper converting industries.
      
      Company Information:
      - Location: JA-47D, Hari Nagar, New Delhi, Delhi, India
      - Owner: Shobhana V P Chandran
      - Marketing Manager: Vysakh Ravi
      - Phone: +91 9891080677, +91 8076716378
      - Email: srengineering503@gmail.com
      
      Products Available:
      1. Printing Machines: Rotogravure Printing Machine, Roll to Roll Flexographic Printing Machine.
      2. Lamination Machines: Solvent Base Lamination Machine, Solventless Lamination Machine.
      3. Slitting & Rewinding: Drum Type Slitting and Rewinding, Duplex Type Slitting and Rewinding.
      4. Paper Converting: Roll to Sheet Cutting, Paper Core Cutting, POS Roll Making, Barcode Label Making, A4 / A3 / A5 Sheet Making.
      5. Packaging Products: Paper Bag Making, Tissue Paper Making, BOPP Tape Making, Kitchen Foil & Butter Paper Roll Making.
      
      Your goal is to assist customers, provide machine details, and guide them to contact the company for quotes, spare parts, and business setup guidance. Always be polite and concise. If you don't know the answer, politely ask them to contact via phone or email.`;

      // 4. Call Google Gemini API (gemini-1.5-flash is fast and cheap/free)
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

      const geminiRequest = {
        systemInstruction: {
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

      // Extract response text
      const replyText = data.candidates[0].content.parts[0].text;

      // 5. Send response back to frontend
      return new Response(JSON.stringify({ reply: replyText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
