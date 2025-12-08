import { OpenAI } from "openai";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
  }

  try {
    // We get the user's message AND the list of current emails on screen
    const { message, emailContext } = await req.json();

    // Create a simplified view of the inbox for the AI (to save tokens)
    const contextString = emailContext.map(e => 
      `ID: ${e.id} | From: ${e.sender.name} (${e.sender.email}) | Subject: "${e.subject}" | Date: ${e.date}`
    ).join("\n");

    const systemPrompt = `
    You are MailSage, an intelligent email assistant.
    
    You have read-access to the user's current inbox view:
    ---
    ${contextString}
    ---

    CAPABILITIES:
    1. Answer questions about the emails (e.g., "Who emailed me about the outage?").
    2. Perform actions on emails using specific command codes.

    COMMANDS:
    If the user asks to PIN an email, find the matching ID from the list above and append this exact code to the end of your response: 
    [ACTION:PIN:email_id]

    EXAMPLE:
    User: "Pin the email from Capcom."
    You: "I've pinned the Capcom newsletter for you. [ACTION:PIN:184392]"

    RULES:
    - Be concise and helpful.
    - If you can't find an email matching the user's description, ask for clarification.
    - Only use the [ACTION] code if the user explicitly asks to perform that action.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0].message.content;
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: "Failed to chat" }, { status: 500 });
  }
}