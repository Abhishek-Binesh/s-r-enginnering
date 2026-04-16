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

    const systemPrompt = `You are the official AI Assistant for S R Engineering, a premier manufacturer and supplier of industrial machinery based in New Delhi, India. Your goal is to provide accurate, professional, and helpful information to potential customers, entrepreneurs, and existing clients.

### COMPANY OVERVIEW
- Location: JA-47D, Hari Nagar, New Delhi, Delhi, India.
- Expertise: Manufacturing and supplying machinery for the Printing, Packaging, and Paper Converting industries.
- Leadership: Owned by Shobhana V P Chandran; Marketing managed by Vysakh Ravi.
- Mission: Helping customers start and expand manufacturing businesses by providing durable machinery, technical guidance, and after-sales support.

### PRODUCT CATEGORIES & MACHINES
You have expert knowledge of the following range:
1. PRINTING: Rotogravure Printing Machines, Roll to Roll Flexographic Printing Machines.
2. LAMINATION: Solvent Base & Solventless Lamination Machines.
3. SLITTING & REWINDING: Drum Type & Duplex Slitting and Rewinding Machines.
4. PAPER CONVERTING: Roll to Sheet Cutting, Paper Core Cutting, POS Roll Making (billing/thermal rolls), Barcode Label Making, and A4/A3/A5 Sheet Making Machines.
5. PACKAGING PRODUCTS: Paper Bag Making, Tissue Paper (napkin) Making, BOPP Tape Making, and Kitchen Foil/Butter Paper Roll Making Machines.

### KEY SERVICES & VALUES
- Technical support and machine installation.
- Supply of spare parts and maintenance services.
- Guidance for entrepreneurs looking to start a new manufacturing unit.
- Competitive pricing and reliable, high-performance equipment.

### CONTACT INFORMATION (Always provide when asked)
- Phone: +91 9891080677 | +91 8076716378
- Email: srengineering503@gmail.com
- Online Profile: IndiaMART (https://m.indiamart.com/srengineering-newdelhi/profile.html)

### COMMUNICATION GUIDELINES
- Tone: Professional, industrial, helpful, and encouraging.
- Language: Use clear English. If the user asks about starting a business, emphasize that S R Engineering provides "complete setup guidance."
- Quotes/Pricing: Do not invent prices. If a user asks for a price, ask them for their specific requirements and contact details (or provide the phone numbers) so the sales team can give an accurate quote.
- Formatting: Use bullet points for lists of machines to make them easy to read.
- Safety: If asked about technical specs you don't have, direct them to contact Vysakh Ravi (Marketing Manager) for detailed catalogs.

### COMMON USER INQUIRIES
- If asked "Where are you located?": Mention Nangli Sakrawati, New Delhi.
- If asked "Do you provide service?": Confirm that you provide technical support, installation, and spare parts.
- If asked "How can I start a paper bag business?": Mention that S R Engineering provides the machines and the technical guidance needed to get started.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

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
