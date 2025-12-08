import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// robust body extractor that handles nested multipart emails
const getBody = (payload) => {
  if (!payload) return "";

  // 1. If the body is right there (simple text/html emails)
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  // 2. If it's multipart, look for the HTML part
  if (payload.parts) {
    let htmlPart = payload.parts.find((p) => p.mimeType === "text/html");
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      return Buffer.from(htmlPart.body.data, "base64").toString("utf-8");
    }
    
    // Fallback to text/plain if no HTML
    let textPart = payload.parts.find((p) => p.mimeType === "text/plain");
    if (textPart && textPart.body && textPart.body.data) {
      return Buffer.from(textPart.body.data, "base64").toString("utf-8");
    }

    // Deep recursion for complex nested parts
    for (const part of payload.parts) {
      const deepBody = getBody(part);
      if (deepBody) return deepBody;
    }
  }

  return "";
};

const getHeader = (headers, name) => {
  const header = headers.find((h) => h.name === name);
  return header ? header.value : "";
};

export async function GET(req) {
  const session = await getServerSession({
    callbacks: {
      session: ({ token }) => ({ accessToken: token?.accessToken }),
    },
  });

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    const gmail = google.gmail({ version: "v1", auth });

    // 1. Fetch more emails (50) to ensure we populate the 30d view
    const response = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 50, 
    });

    const messages = response.data.messages;
    if (!messages) return NextResponse.json({ emails: [] });

    // 2. Fetch details
    const fullEmails = await Promise.all(
      messages.map(async (msg) => {
        try {
          const detail = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "full",
          });

          const payload = detail.data.payload;
          const headers = payload.headers;
          
          const fromRaw = getHeader(headers, "From");
          const nameMatch = fromRaw.match(/(^[^<]+)/);
          const emailMatch = fromRaw.match(/<([^>]+)>/);
          const internalDate = parseInt(detail.data.internalDate); // Raw timestamp

          return {
            id: msg.id,
            sender: {
              name: nameMatch ? nameMatch[1].trim().replace(/"/g, "") : fromRaw,
              email: emailMatch ? emailMatch[1] : "",
              color: "#" + Math.floor(Math.random()*16777215).toString(16), 
            },
            subject: getHeader(headers, "Subject"),
            // Format date nicely: "Dec 8, 2025"
            date: new Date(internalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            timestamp: internalDate, // Crucial for sorting/filtering
            snippet: detail.data.snippet,
            body: getBody(payload),
            isPinned: false,
            hasSummary: false,
          };
        } catch (err) {
          return null; 
        }
      })
    );

    // Filter out any failed fetches and Sort by newest first
    const validEmails = fullEmails
      .filter(e => e !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ emails: validEmails });
  } catch (error) {
    console.error("Gmail Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}