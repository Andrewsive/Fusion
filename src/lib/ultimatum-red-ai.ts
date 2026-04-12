import OpenAI from "openai";

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

type Input = {
  projectTitle: string;
  taskTitle: string;
  assigneeName: string;
  hoursLeft: number;
};

/**
 * 红灯期全员提醒：一句带压力的 AI 文案（可严肃可略带调侃），失败则用固定模板。
 */
export async function generateRedUltimatumLine(input: Input): Promise<string> {
  const fallback = `全队注意：「${input.taskTitle}」仅剩约 ${input.hoursLeft} 小时截止仍未完成，请 ${input.assigneeName} 立刻推进，避免拖累 ${input.projectTitle} 整体进度。`;

  if (!client) return fallback;

  try {
    const res = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      max_tokens: 120,
      temperature: 0.85,
      messages: [
        {
          role: "system",
          content:
            "你是项目协作里的「截止哨兵」。用一句中文（可略带幽默但不得人身攻击），催促未完成任务在 24 小时内收尾。语气偏紧迫，50 字以内，不要 Markdown。"
        },
        {
          role: "user",
          content: `项目《${input.projectTitle}》\n任务：${input.taskTitle}\n负责人：${input.assigneeName}\n剩余约 ${input.hoursLeft} 小时。写一句全员可见的强提醒。`
        }
      ]
    });
    const text = res.choices[0]?.message?.content?.trim();
    if (text && text.length > 0 && text.length <= 200) return text;
  } catch {
    /* use fallback */
  }
  return fallback;
}
