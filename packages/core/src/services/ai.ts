import { GoogleGenAI } from "@google/genai";
import z from "zod";

export type GenerateContentOptions<T extends z.ZodTypeAny> = {
  prompt: string;
  schema: T;
};

export type GenerateContentUsageMetadata = {
  model: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
};

export type GenerateContentResult<T> = {
  text: string;
  content: T;
  usageMetadata: GenerateContentUsageMetadata;
};

export class AiService {
  constructor(private readonly googleGenAI: GoogleGenAI) {}

  async generateStructuredContent<T extends z.ZodTypeAny>(
    options: GenerateContentOptions<T>
  ): Promise<GenerateContentResult<z.infer<T>>> {
    const startTime = Date.now();

    const result = await this.googleGenAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: options.prompt,
    });

    if (!result.text || !result.usageMetadata) {
      throw new Error("No response from AI");
    }

    // Clean the response - remove any markdown formatting if present
    let jsonText = result.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    // Parse and validate the JSON response
    const json = JSON.parse(jsonText);
    const parsed = options.schema.parse(json);

    return {
      text: result.text,
      content: parsed,
      usageMetadata: {
        model: "gemini-2.5-flash",
        durationMs: Date.now() - startTime,
        inputTokens: result.usageMetadata.promptTokenCount ?? 0,
        outputTokens: result.usageMetadata.candidatesTokenCount ?? 0,
      },
    };
  }
}
