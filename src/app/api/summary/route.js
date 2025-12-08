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
    const { text } = await req.json();

    // Limit text to ~6000 chars
    const truncatedText = text.slice(0, 6000);

    const completion = await openai.chat.completions.create({
        // We use gpt-4o for high intelligence. 
      // If you have access to a 'gpt-5.1', replace this string. Or default to 'gpt-4o', gpt-5-mini', gpt-5-nano' (https://openai.com/api/pricing/)
      model: "gpt-4o", 
      messages: [
        {
          role: "system",
          content: `You are a smart, conversational executive assistant. Your goal is to help the user "get the gist" of the email quickly without sounding robotic. Use natural language.

          Analyze the email context, tone, and intent. Output your response in this EXACT format:

          [Write a conversational summary of what happened. Focus on the story and the outcome. e.g., "Sarah reached out to say the project is delayed because of X, but she's hoping to catch up by Friday."]

          Action Items
          [List specific tasks in bullet points. If none, strictly write: "0 action items"]

          Key Links
          [Identify up to 3 important links. Do NOT paste raw URLs. Instead, write a short, natural description of what the link is (e.g. "Q3 Financial Report" or "Zoom Meeting"). Format them exactly like this: [Link Description](URL)]`
        },
        { role: "user", content: truncatedText },
      ],
    });

    const summary = completion.choices[0].message.content;
    return NextResponse.json({ summary });

  } catch (error) {
    console.error("OpenAI Error:", error);
    return NextResponse.json({ error: "Failed to summarize" }, { status: 500 });
  }
}