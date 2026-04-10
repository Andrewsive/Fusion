import OpenAI from "openai";
import { z } from "zod";

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const aiTaskSchema = z.object({
  title: z.string().min(1),
  workloadPoints: z.number().int().positive(),
  deadlineOffsetHours: z.number().int().min(1).max(240)
});

const aiResultSchema = z.object({
  contextSummary: z.string().min(10),
  tasks: z.array(aiTaskSchema).min(1).max(20)
});

export type ParsedAiResult = z.infer<typeof aiResultSchema>;

export async function parseRequirementWithAI(rawInput: string): Promise<ParsedAiResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: "You are a PM assistant. Return strict JSON only with keys: contextSummary, tasks[]."
      },
      {
        role: "user",
        content:
          `Analyze this assignment and output JSON. Each task needs title, workloadPoints(positive int), deadlineOffsetHours(1-240). Input:\n${rawInput}`
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "fusion_space_ai",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            contextSummary: { type: "string" },
            tasks: {
              type: "array",
              minItems: 1,
              maxItems: 20,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  workloadPoints: { type: "integer", minimum: 1 },
                  deadlineOffsetHours: { type: "integer", minimum: 1, maximum: 240 }
                },
                required: ["title", "workloadPoints", "deadlineOffsetHours"]
              }
            }
          },
          required: ["contextSummary", "tasks"]
        },
        strict: true
      }
    }
  });

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("AI response is empty");
  }

  const parsed = JSON.parse(outputText);
  return aiResultSchema.parse(parsed);
}
