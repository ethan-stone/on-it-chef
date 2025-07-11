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
  ingredients: z.array(
    z.object({
      description: z.string(),
      name: z.string(),
      quantity: z.number(),
      unit: z.string().nullish(),
    })
  ),
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
  "ingredients": [
    {
      "description": "string - A full description of the ingredient. For example, '1 lb fettuccine pasta' or '4 cloves garlic, minced'. This is used for search and display purposes.",
      "name": "string - The name of the ingredient. For example, 'fettuccine pasta' or 'garlic cloves'. This should be the raw ingredient name. Do not include any preparation instructions or quantities. For example 'garlic cloves minced' should just be 'garlic cloves' and 'celery stalks chopped' should just be 'celery stalks'.",
      "quantity": number - The quantity of the ingredient. For example, 1 or 4.,
      "unit": "string - The unit of the ingredient. This should strictly be a unit of measurement. For example 'lb' or 'liters'. This shouldn't be an abstract thing like 'cloves' or 'stalks'. That should be in the name and description."
    }
  ] - Array of ingredients with measurements and preparation notes,
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
    {
      "description": "1 lb fettuccine pasta",
      "name": "fettuccine pasta",
      "quantity": 1,
      "unit": "lb"
    },
    {
      "description": "4 tbsp butter",
      "name": "butter",
      "quantity": 4,
      "unit": "tbsp"
    },
    {
      "description": "4 cloves garlic, minced",
      "name": "garlic cloves",
      "quantity": 4,
    },
    {
      "description": "1 cup heavy cream",
      "name": "heavy cream",
      "quantity": 1,
      "unit": "cup"
    },
    {
      "description": "1/4 cup fresh parsley, chopped",
      "name": "fresh parsley",
      "quantity": 1/4,
      "unit": "cup"
    },
    {
      "description": "1 cup grated parmesan cheese",
      "name": "parmesan cheese",
      "quantity": 1,
      "unit": "cup"
    },
    {
      "description": "Salt and pepper to taste",
      "name": "salt",
      "quantity": 1,
      "unit": "tsp"
    },
  ,
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
  "ingredients": [
    {
      "description": "string - A full description of the ingredient. For example, '1 lb fettuccine pasta' or '4 cloves garlic, minced'. This is used for search and display purposes.",
      "name": "string - The name of the ingredient. For example, 'fettuccine pasta' or 'garlic cloves'. This should be the raw ingredient name. Do not include any preparation instructions or quantities. For example 'garlic cloves minced' should just be 'garlic cloves' and 'celery stalks chopped' should just be 'celery stalks'.",
      "quantity": number - The quantity of the ingredient. For example, 1 or 4.,
      "unit": "string - The unit of the ingredient. This should strictly be a unit of measurement. For example 'lb' or 'liters'. This shouldn't be an abstract thing like 'cloves' or 'stalks'. That should be in the name and description."
    }
  ] - Array of ingredients with measurements and preparation notes,
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
      model: "gemini-2.5-flash",
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
  dietaryRestrictions?: string | null
): Promise<AIRecipeResponse> {
  // Build context from previous versions
  const versionContext = previousVersions
    .map((version) => {
      return `
Version ${version.version} (${version.message}):
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
      model: "gemini-2.5-flash",
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

const FORK_RECIPE_PROMPT = `You are a professional chef and recipe creator. Your task is to create a new recipe based on an existing recipe and the user's specific request for adaptation.

IMPORTANT: You must respond with ONLY valid JSON that exactly matches this schema:
{
  "generatedName": "string - A catchy, descriptive name for the new recipe",
  "version": 1,
  "description": "string - A brief, appetizing description of the new dish",
  "prepTime": number - Preparation time in minutes,
  "cookTime": number - Cooking time in minutes,
  "servings": number - Number of servings this recipe makes,
  "ingredients": [
    {
      "description": "string - A full description of the ingredient. For example, '1 lb fettuccine pasta' or '4 cloves garlic, minced'. This is used for search and display purposes.",
      "name": "string - The name of the ingredient. For example, 'fettuccine pasta' or 'garlic cloves'. This should be the raw ingredient name. Do not include any preparation instructions or quantities. For example 'garlic cloves minced' should just be 'garlic cloves' and 'celery stalks chopped' should just be 'celery stalks'.",
      "quantity": number - The quantity of the ingredient. For example, 1 or 4.,
      "unit": "string - The unit of the ingredient. This should strictly be a unit of measurement. For example 'lb' or 'liters'. This shouldn't be an abstract thing like 'cloves' or 'stalks'. That should be in the name and description."
    }
  ] - Array of ingredients with measurements and preparation notes,
  "instructions": ["string"] - Array of step-by-step cooking instructions
}

Guidelines:
- Use the source recipe as inspiration but create a distinct new recipe
- Incorporate the user's adaptation request while maintaining the essence of the original
- Be creative but practical with recipe names
- Write clear, detailed descriptions that make the dish sound appealing
- Provide accurate prep and cook times
- Include all necessary ingredients with proper measurements
- Write step-by-step instructions that are easy to follow
- Ensure the recipe is realistic and achievable for home cooks
- Make sure all times are in minutes
- Keep ingredient lists and instructions concise but complete
- Do not include any text outside the JSON structure

DIETARY RESTRICTIONS: If dietary restrictions are provided, you MUST strictly adhere to them. Do not include any ingredients or cooking methods that violate these restrictions.

Source Recipe Context:
`;

export async function generateForkedRecipe(
  userPrompt: string,
  sourceRecipeVersion: RecipeVersion,
  dietaryRestrictions?: string | null
): Promise<AIRecipeResponse> {
  const sourceContext = `
Source Recipe: ${sourceRecipeVersion.generatedName}
Description: ${sourceRecipeVersion.description}
Prep Time: ${sourceRecipeVersion.prepTime} minutes
Cook Time: ${sourceRecipeVersion.cookTime} minutes
Servings: ${sourceRecipeVersion.servings}
Ingredients: ${sourceRecipeVersion.ingredients.join(", ")}
Instructions: ${sourceRecipeVersion.instructions.join(" | ")}

User Adaptation Request: ${userPrompt}
`;

  const dietaryContext = dietaryRestrictions
    ? `\n\nIMPORTANT: The user has the following dietary restrictions: ${dietaryRestrictions}. Please ensure the new recipe strictly adheres to these restrictions.`
    : "";

  const fullPrompt = `${FORK_RECIPE_PROMPT}${sourceContext}${dietaryContext}

Create a new recipe based on the source recipe and the user's adaptation request. Respond with ONLY the JSON object:`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    console.error("Error generating forked recipe:", error);
    throw new Error(
      `Failed to generate forked recipe: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
