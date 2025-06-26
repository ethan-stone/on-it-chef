import { GoogleGenAI } from "@google/genai";
import { Resource } from "sst";
import { z } from "zod";

const ai = new GoogleGenAI({ apiKey: Resource.GeminiApiKey.value });

// Schema for the AI response (matches RecipeVersion without id, recipeId, userId, createdAt)
const AIRecipeResponse = z.object({
  generatedName: z.string(),
  version: z.number(),
  description: z.string(),
  prepTime: z.number(), // in minutes
  cookTime: z.number(), // in minutes
  servings: z.number(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
});

export type AIRecipeResponse = z.infer<typeof AIRecipeResponse>;

const SYSTEM_PROMPT = `You are a professional chef and recipe creator. Your task is to generate detailed, accurate, and delicious recipes based on user requests.

IMPORTANT: You must respond with ONLY valid JSON that exactly matches this schema:
{
  "generatedName": "string - A catchy, descriptive name for the recipe",
  "version": 1,
  "description": "string - A brief, appetizing description of the dish",
  "prepTime": number - Preparation time in minutes,
  "cookTime": number - Cooking time in minutes,
  "servings": number - Number of servings this recipe makes,
  "ingredients": ["string"] - Array of ingredients with measurements and preparation notes,
  "instructions": ["string"] - Array of step-by-step cooking instructions
}

Guidelines:
- Be creative but practical with recipe names
- Write clear, detailed descriptions that make the dish sound appealing
- Provide accurate prep and cook times
- Include all necessary ingredients with proper measurements
- Write step-by-step instructions that are easy to follow
- Ensure the recipe is realistic and achievable for home cooks
- Make sure all times are in minutes
- Keep ingredient lists and instructions concise but complete
- Do not include any text outside the JSON structure

Example response format:
{
  "generatedName": "Creamy Garlic Parmesan Pasta",
  "version": 1,
  "description": "A rich and creamy pasta dish with roasted garlic, parmesan cheese, and fresh herbs.",
  "prepTime": 15,
  "cookTime": 20,
  "servings": 4,
  "ingredients": [
    "1 lb fettuccine pasta",
    "4 tbsp butter",
    "4 cloves garlic, minced",
    "1 cup heavy cream",
    "1 cup grated parmesan cheese",
    "1/4 cup fresh parsley, chopped",
    "Salt and pepper to taste"
  ],
  "instructions": [
    "Bring a large pot of salted water to boil and cook pasta according to package directions",
    "In a large skillet, melt butter over medium heat",
    "Add minced garlic and sauté until fragrant, about 1 minute",
    "Pour in heavy cream and bring to a simmer",
    "Gradually add parmesan cheese, stirring until melted and smooth",
    "Add cooked pasta to the sauce and toss to coat",
    "Season with salt and pepper to taste",
    "Garnish with fresh parsley and serve immediately"
  ]
}`;

export async function generateRecipe(
  userPrompt: string
): Promise<AIRecipeResponse> {
  const fullPrompt = `${SYSTEM_PROMPT}

User Request: ${userPrompt}

Generate a recipe based on the user's request. Respond with ONLY the JSON object:`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: fullPrompt,
    });
    const text = result.text;

    if (!text) {
      throw new Error("No response from AI");
    }

    // Clean the response - remove any markdown formatting if present
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    // Parse and validate the JSON response
    const parsed = JSON.parse(jsonText);
    const validated = AIRecipeResponse.parse(parsed);

    return validated;
  } catch (error) {
    console.error("Error generating recipe:", error);
    throw new Error(
      `Failed to generate recipe: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
