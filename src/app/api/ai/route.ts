import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { z } from "zod";

const aiSchema = z.object({
  prompt: z.string().min(1).max(2000),
  context: z.string().max(5000).optional(),
  action: z.enum(["complete", "summarize", "improve", "explain_conflict", "grammar"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = aiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { prompt, context, action } = parsed.data;

  const systemPrompts: Record<string, string> = {
    complete: "You are a writing assistant. Continue the provided text naturally and coherently. Be concise.",
    summarize: "Summarize the document content in 2-3 sentences. Be clear and informative.",
    improve: "Improve the writing quality of the provided text. Fix grammar, clarity, and style. Return only the improved text.",
    explain_conflict: "Explain in plain language what changes were merged in this collaborative document. Be brief and helpful.",
    grammar: "Fix grammar and spelling errors in the text. Return only the corrected text.",
  };

  try {
    // Use Groq for fast inference (fallback to OpenAI)
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    const isGroq = !!process.env.GROQ_API_KEY;

    const apiUrl = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const model = isGroq ? "llama-3.1-8b-instant" : "gpt-4o-mini";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompts[action] },
          {
            role: "user",
            content: context ? `Context:\n${context}\n\n---\n\n${prompt}` : prompt,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[AI] API error:", err);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[AI] Error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
