import { z } from "zod";
import { createOpenAIClient } from "@/lib/openai-client";
import { applyHundredPointWorkload } from "@/lib/workload-scale";

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const aiTaskSchema = z.object({
  title: z.string().min(1),
  workloadPoints: z.number().int().positive(),
  deadlineOffsetHours: z.number().int().min(1).max(240)
});

const milestoneSchema = z.object({
  label: z.string().min(1).max(200),
  dueAt: z.union([z.string().max(48), z.null()]).optional(),
  note: z.union([z.string().max(400), z.null()]).optional()
});

const aiResultSchema = z.object({
  contextSummary: z.string().min(10),
  keyDeliverables: z.array(z.string().min(1)).min(1).max(20),
  milestones: z.array(milestoneSchema).max(15).optional(),
  tasks: z.array(aiTaskSchema).min(1).max(20)
});

export type ParsedAiResult = Omit<z.infer<typeof aiResultSchema>, "milestones"> & {
  milestones: z.infer<typeof milestoneSchema>[];
};

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
    "You are a PM assistant. Output a single JSON object with keys: contextSummary (string), keyDeliverables (string[]), milestones (array), tasks (array). " +
    "contextSummary: concise shared consensus in zh-CN (goals, scope, grading hints if any). " +
    "keyDeliverables: distinct deliverable names only, zh-CN. " +
    "milestones: 0-15 items for explicit or implied deadlines from the assignment; each item: label (zh-CN, short), optional dueAt (ISO 8601 date or datetime string if the doc states a concrete date; else null), optional note (zh-CN vague timing e.g. 第4教学周、期末前). Omit milestones array only if truly none; use empty array if no dates found. " +
    "tasks: 4-12 concrete subtasks in zh-CN matching the assignment (e.g. 文献与资料调研、撰写大纲、制作PPT、排版与校对). " +
    "workloadPoints: positive integers that sum to EXACTLY 100 across all tasks — relative team effort / weight (可视化占比). " +
    "deadlineOffsetHours: integer 1-240 for each task. No markdown, no extra text.";

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content:
          `Analyze this assignment. Extract milestones/deadlines; propose a task breakdown whose workloadPoints sum to 100.\n\n${rawInput}`
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
  const raw = aiResultSchema.parse(parsed);
  const tasksScaled = applyHundredPointWorkload(
    raw.tasks as Array<{ title: string; workloadPoints: number; deadlineOffsetHours: number }>
  );
  return {
    ...raw,
    milestones: raw.milestones ?? [],
    tasks: tasksScaled
  };
}
