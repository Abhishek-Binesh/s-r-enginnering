export default {
  async fetch(request, env) {
    // 1. Handle CORS for frontend requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Or replace * with your exact domain
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Preflight request handling
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      // 2. Parse incoming form data
      const { name, email, phone, message } = await request.json();

      // Basic validation
      if (!name || !email || !message) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // 3. Call Resend API to send the email
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Website Enquiry <onboarding@resend.dev>", // Resend's default free-tier sender
          to: "srengineering503@gmail.com", // The destination email
          reply_to: email, // Allows you to hit "Reply" in Gmail and reply to the customer
          subject: `New Website Enquiry from ${name}`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <h2>New Business Enquiry</h2>
              <table style="width: 100%; max-width: 600px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Name:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${phone || "Not provided"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Requirement:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${message.replace(/\n/g, "<br>")}</td>
                </tr>
              </table>
            </div>
          `,
        }),
      });

      if (resendResponse.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Email sent successfully!",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } else {
        const errorData = await resendResponse.json();
        return new Response(
          JSON.stringify({ error: "Failed to send email", details: errorData }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};