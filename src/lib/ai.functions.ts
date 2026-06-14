import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  question: z.string().min(1).max(2000),
  context: z.string().max(20000).optional(),
  system: z.string().max(4000).optional(),
});

export const askAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("AI is not configured (missing GEMINI_API_KEY).");

    const system =
      data.system ??
      "You are a senior credit-risk analyst assistant inside CreditRisk Pro. Answer concisely (3–6 sentences), reference the borrower data provided, and use plain language. If asked something outside the provided context, say so.";

    const contextBlock = data.context ? `\n\nBORROWER & MODEL CONTEXT:\n${data.context}` : "";

    const body = {
      systemInstruction: { parts: [{ text: system + contextBlock }] },
      contents: [{ role: "user", parts: [{ text: data.question }] }],
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Rate limit reached. Please retry in a moment.");
      throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const answer =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
    return { answer };
  });
