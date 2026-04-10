import { NextResponse } from "next/server";
import OpenAI from "openai";
import pdfParse from "pdf-parse";

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

async function extractFromImage(file: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  const mime = file.type || "image/png";

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.responses.create({
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Extract all meaningful text from this image. Return plain text only."
          },
          {
            type: "input_image",
            image_url: `data:${mime};base64,${base64}`,
            detail: "auto"
          }
        ]
      }
    ]
  });

  return res.output_text || "";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const type = file.type;
    let text = "";

    if (type === "text/plain" || type === "text/markdown") {
      text = await file.text();
    } else if (type === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else if (type.startsWith("image/")) {
      text = await extractFromImage(file);
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