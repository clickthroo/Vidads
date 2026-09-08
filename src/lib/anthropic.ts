import Anthropic from "@anthropic-ai/sdk";
import type { Product } from "./types";
import { getFormatDef, type ScriptFormat } from "./formats";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GeneratedScript {
  hook_text: string;
  full_script: string;
}

function buildSystemPrompt(format: ScriptFormat): string {
  const { promptGuidance } = getFormatDef(format);
  return `You are a direct-response copywriter who writes high-converting TikTok UGC ad scripts.

Every script MUST follow this exact proven structure, with timestamps:
${promptGuidance}

Write in a casual, authentic, first-person UGC voice, not corporate ad copy. TikTok rewards native, slightly unpolished energy over anything that sounds rehearsed or like marketing copy.

Respond with ONLY a JSON array (no markdown fences, no commentary) of exactly 3 objects, each shaped as:
{
  "hook_text": "<just the hook line>",
  "full_script": "<the full script with each labeled section on its own line, e.g. 'Hook (0-3s): ...\\nContext (3-7s): ...\\n...'>"
}`;
}

export async function generateScripts(
  product: Product,
  angle: string,
  format: ScriptFormat
): Promise<GeneratedScript[]> {
  const message = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: buildSystemPrompt(format),
    messages: [
      {
        role: "user",
        content: `Product: ${product.name}\nProduct description: ${product.description}\nAngle: ${angle}\n\nGenerate 3 distinct script variants for this angle.`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic response did not contain text content");
  }

  const raw = textBlock.text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Could not find JSON array in Anthropic response: ${raw}`);
  }

  const parsed = JSON.parse(jsonMatch[0]) as GeneratedScript[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Anthropic response JSON was not a non-empty array");
  }

  return parsed.map((item) => ({
    hook_text: String(item.hook_text ?? ""),
    full_script: String(item.full_script ?? ""),
  }));
}
