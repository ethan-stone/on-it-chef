import { GoogleGenAI } from "@google/genai";
import { Resource } from "sst";
import { z } from "zod";
import { RecipeVersion, RecipePrompt } from "@on-it-chef/core/services/recipes";

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

DIETARY RESTRICTIONS: If dietary restrictions are provided, you MUST strictly adhere to them. Do not include any ingredients or cooking methods that violate these restrictions. If the user's request conflicts with their dietary restrictions, prioritize the dietary restrictions and suggest alternatives that fit within those constraints.

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

const VERSION_UPDATE_PROMPT = `You are a professional chef and recipe creator. Your task is to generate an updated version of an existing recipe based on user feedback and previous versions.

IMPORTANT: You must respond with ONLY valid JSON that exactly matches this schema:
{
  "generatedName": "string - A catchy, descriptive name for the updated recipe",
  "version": number - The next version number,
  "description": "string - A brief, appetizing description of the updated dish",
  "prepTime": number - Preparation time in minutes,
  "cookTime": number - Cooking time in minutes,
  "servings": number - Number of servings this recipe makes,
  "ingredients": ["string"] - Array of ingredients with measurements and preparation notes,
  "instructions": ["string"] - Array of step-by-step cooking instructions
}

Guidelines:
- Consider the user's feedback and previous versions when creating the new version
- Maintain the core essence of the recipe while incorporating the requested changes
- Be creative but practical with recipe names
- Write clear, detailed descriptions that make the dish sound appealing
- Provide accurate prep and cook times
- Include all necessary ingredients with proper measurements
- Write step-by-step instructions that are easy to follow
- Ensure the recipe is realistic and achievable for home cooks
- Make sure all times are in minutes
- Keep ingredient lists and instructions concise but complete
- Do not include any text outside the JSON structure

DIETARY RESTRICTIONS: If dietary restrictions are provided, you MUST strictly adhere to them. Do not include any ingredients or cooking methods that violate these restrictions. If the user's request conflicts with their dietary restrictions, prioritize the dietary restrictions and suggest alternatives that fit within those constraints.

Previous Recipe Versions Context:
`;

export async function generateRecipe(
  userPrompt: string,
  dietaryRestrictions?: string | null
): Promise<AIRecipeResponse> {
  const dietaryContext = dietaryRestrictions
    ? `\n\nIMPORTANT: The user has the following dietary restrictions: ${dietaryRestrictions}. Please ensure the recipe strictly adheres to these restrictions.`
    : "";

  const fullPrompt = `${SYSTEM_PROMPT}${dietaryContext}

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

export async function generateRecipeVersion(
  userPrompt: string,
  previousVersions: RecipeVersion[],
  previousPrompts: RecipePrompt[],
  dietaryRestrictions?: string | null
): Promise<AIRecipeResponse> {
  // Build context from previous versions
  const versionContext = previousVersions
    .map((version, index) => {
      const prompt = previousPrompts.find(
        (p) => p.generatedVersion === version.id
      );
      return `
Version ${version.version} (${
        prompt ? `Prompt: "${prompt.message}"` : "No prompt available"
      }):
- Name: ${version.generatedName}
- Description: ${version.description}
- Prep Time: ${version.prepTime} minutes
- Cook Time: ${version.cookTime} minutes
- Servings: ${version.servings}
- Ingredients: ${version.ingredients.join(", ")}
- Instructions: ${version.instructions.join(" | ")}
`;
    })
    .join("\n");

  const nextVersion = previousVersions.length + 1;
  const dietaryContext = dietaryRestrictions
    ? `\n\nIMPORTANT: The user has the following dietary restrictions: ${dietaryRestrictions}. Please ensure the updated recipe strictly adheres to these restrictions.`
    : "";

  const fullPrompt = `${VERSION_UPDATE_PROMPT}${versionContext}${dietaryContext}

Current User Request: ${userPrompt}

Generate version ${nextVersion} of this recipe based on the user's request and previous versions. Respond with ONLY the JSON object:`;

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
    console.error("Error generating recipe version:", error);
    throw new Error(
      `Failed to generate recipe version: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
