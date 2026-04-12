import { NextResponse } from "next/server";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { createOpenAIClient } from "@/lib/openai-client";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const maxDuration = 300;

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMarkdownName(lowerName: string): boolean {
  return /\.(md|markdown|mdown|mkd)$/i.test(lowerName);
}

async function extractFromImage(file: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  const mime = file.type || "image/png";
  const visionModel = process.env.OPENAI_VISION_MODEL?.trim() || model;

  const client = createOpenAIClient();
  const res = await client.chat.completions.create({
    model: visionModel,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Extract all meaningful text from this image. Return plain text only." },
          { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } }
        ]
      }
    ],
    temperature: 0.2,
    max_tokens: 4096
  });

  return res.choices[0]?.message?.content?.trim() || "";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const type = file.type || "";
    const lowerName = file.name.toLowerCase();
    let text = "";

    const markdownMime =
      type === "text/markdown" ||
      type === "text/x-markdown" ||
      type.startsWith("text/markdown;") ||
      type.startsWith("text/x-markdown;");

    if (type.startsWith("image/")) {
      text = await extractFromImage(file);
    } else if (type === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else if (type === DOCX_MIME || lowerName.endsWith(".docx")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (type === "text/plain" || markdownMime || isMarkdownName(lowerName)) {
      text = await file.text();
    } else if (type === "text/html" || lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
      const raw = await file.text();
      text = stripHtml(raw);
    } else if (!type || type === "application/octet-stream") {
      if (lowerName.endsWith(".txt") || isMarkdownName(lowerName)) {
        text = await file.text();
      } else if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
        text = stripHtml(await file.text());
      } else if (lowerName.endsWith(".pdf")) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed = await pdfParse(buffer);
        text = parsed.text;
      } else if (lowerName.endsWith(".docx")) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else {
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    return NextResponse.json({ text: text.slice(0, 20000) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Text extraction failed" },
      { status: 400 }
    );
  }
}
