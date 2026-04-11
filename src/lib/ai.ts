import { z } from "zod";
import { createOpenAIClient } from "@/lib/openai-client";

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const aiTaskSchema = z.object({
  title: z.string().min(1),
  workloadPoints: z.number().int().positive(),
  deadlineOffsetHours: z.number().int().min(1).max(240)
});

const aiResultSchema = z.object({
  contextSummary: z.string().min(10),
  keyDeliverables: z.array(z.string().min(1)).min(1).max(20),
  tasks: z.array(aiTaskSchema).min(1).max(20)
});

export type ParsedAiResult = z.infer<typeof aiResultSchema>;

function parseJsonFromModelContent(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const body = fence ? fence[1].trim() : trimmed;
  return JSON.parse(body);
}

export async function parseRequirementWithAI(rawInput: string): Promise<ParsedAiResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = createOpenAIClient();

  const system =
    "You are a PM assistant. Output a single JSON object with keys: contextSummary (string), keyDeliverables (string[]), tasks (array). " +
    "keyDeliverables: short labels for required deliverables, prefer zh-CN (e.g. 调研报告, Figma原型). " +
    "Each task: title (string), workloadPoints (positive integer), deadlineOffsetHours (integer 1-240). No markdown, no extra text.";

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Analyze this assignment. keyDeliverables: distinct names only.\n\n${rawInput}`
      }
    ],
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  const outputText = response.choices[0]?.message?.content;
  if (!outputText) {
    throw new Error("AI response is empty");
  }

  const parsed = parseJsonFromModelContent(outputText);
  return aiResultSchema.parse(parsed);
}
