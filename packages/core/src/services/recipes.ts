import { Collection, MongoClient } from "mongodb";
import { ulid } from "ulid";
import { z } from "zod";
import { Events } from "./events";
import { GenerateContentUsageMetadata } from "./ai";

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

type AIRecipeResponse = z.infer<typeof AIRecipeResponse>;

const Ingredient = z
  .object({
    description: z
      .string()
      .describe(
        "A full description of the ingredient. For example, '1 lb fettuccine pasta' or '4 cloves garlic, minced'. This is used for search and display purposes."
      ),
    name: z
      .string()
      .describe(
        "The name of the ingredient. For example, 'fettuccine pasta' or 'garlic cloves'. This should be the raw ingredient name. Do not include any preparation instructions or quantities. For example 'garlic cloves minced' should just be 'garlic cloves' and 'celery stalks chopped' should just be 'celery stalks'."
      ),
    quantity: z
      .number()
      .describe("The quantity of the ingredient. For example, 1 or 4."),
    unit: z
      .string()
      .nullish()
      .describe(
        "The unit of the ingredient. This should strictly be a unit of measurement. For example 'lb' or 'liters'. This shouldn't be an abstract thing like 'cloves' or 'stalks'. That should be in the name and description."
      ),
  })
  .describe(
    "An ingredient in a recipe. The description is used for search and display purposes. The name, quantity, and unit are used for integration purposes that require more detail."
  );

export type Ingredient = z.infer<typeof Ingredient>;

const RecipeVersion = z.object({
  id: z.string(),
  recipeId: z.string(),
  userId: z.string(),
  generatedName: z.string(),
  version: z.number(),
  description: z.string(),
  prepTime: z.number(), // in minutes
  cookTime: z.number(), // in minutes
  servings: z.number(),
  ingredients: z.array(Ingredient),
  instructions: z.array(z.string()),
  message: z.string(),
  createdAt: z.date(),
});

export type RecipeVersion = z.infer<typeof RecipeVersion>;

const MongoRecipeVersion = RecipeVersion.omit({
  id: true,
}).extend({
  _id: z.string(),
});

export type MongoRecipeVersion = z.infer<typeof MongoRecipeVersion>;

const Recipe = z.object({
  id: z.string(),
  userGivenName: z.string().nullish(), // A user specified name for the recipe.
  generatedName: z.string(), // This is an auto-generated name for the recipe given by the first recipe version.
  recentVersions: z.array(RecipeVersion),
  userId: z.string(),
  visibility: z.enum(["public", "private"]),
  dietaryRestrictions: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Recipe = z.infer<typeof Recipe>;

const MongoRecipe = Recipe.omit({
  id: true,
  recentVersions: true,
}).extend({
  _id: z.string(),
  recentVersions: z.array(MongoRecipeVersion),
});

export type MongoRecipe = z.infer<typeof MongoRecipe>;

export const SharedRecipe = z.object({
  id: z.string(),
  recipeId: z.string(),
  sharedBy: z.string(),
  sharedWith: z.string(),
  sharedAt: z.date(),
});

export type SharedRecipe = z.infer<typeof SharedRecipe>;

const MongoSharedRecipe = SharedRecipe.omit({
  id: true,
}).extend({
  _id: z.string(),
});

export type MongoSharedRecipe = z.infer<typeof MongoSharedRecipe>;

const toMongo = {
  recipe: (recipe: Recipe): MongoRecipe => {
    return MongoRecipe.parse({
      ...recipe,
      recentVersions: recipe.recentVersions.map(toMongo.recipeVersion),
      _id: recipe.id,
    });
  },
  recipeVersion: (recipeVersion: RecipeVersion): MongoRecipeVersion => {
    return MongoRecipeVersion.parse({
      ...recipeVersion,
      _id: recipeVersion.id,
    });
  },
  sharedRecipe: (sharedRecipe: SharedRecipe): MongoSharedRecipe => {
    return MongoSharedRecipe.parse({
      ...sharedRecipe,
      _id: sharedRecipe.id,
    });
  },
};

const fromMongo = {
  recipe: (mongoRecipe: MongoRecipe): Recipe => {
    return Recipe.parse({
      ...mongoRecipe,
      recentVersions: mongoRecipe.recentVersions.map(fromMongo.recipeVersion),
      id: mongoRecipe._id,
    });
  },
  recipeVersion: (mongoRecipeVersion: MongoRecipeVersion): RecipeVersion => {
    return RecipeVersion.parse({
      ...mongoRecipeVersion,
      id: mongoRecipeVersion._id,
    });
  },
  sharedRecipe: (mongoSharedRecipe: MongoSharedRecipe): SharedRecipe => {
    return SharedRecipe.parse({
      ...mongoSharedRecipe,
      id: mongoSharedRecipe._id,
    });
  },
};

export class RecipeService {
  private dbName = "onItChef";
  private recipesColl: Collection<MongoRecipe>;
  private recipeVersionsColl: Collection<MongoRecipeVersion>;
  private sharedRecipesColl: Collection<MongoSharedRecipe>;
  private eventsColl: Collection<Events>;

  constructor(private readonly client: MongoClient) {
    this.recipesColl = this.client
      .db(this.dbName)
      .collection<MongoRecipe>("recipes");
    this.recipeVersionsColl = this.client
      .db(this.dbName)
      .collection<MongoRecipeVersion>("recipeVersions");
    this.sharedRecipesColl = this.client
      .db(this.dbName)
      .collection<MongoSharedRecipe>("sharedRecipes");
    this.eventsColl = this.client.db(this.dbName).collection<Events>("events");
  }

  private uid(
    prefix: "recipe" | "recipe_ver" | "recipe_prompt" | "shared_recipe" | "evt"
  ) {
    return `${prefix}_${ulid()}`;
  }

  formatCreateRecipePrompt(
    userPrompt: string,
    dietaryRestrictions?: string | null
  ) {
    const dietaryContext = dietaryRestrictions
      ? `\n\nIMPORTANT: The user has the following dietary restrictions: ${dietaryRestrictions}. Please ensure the recipe strictly adheres to these restrictions.`
      : "";

    const fullPrompt = `${CREATE_RECIPE_SYSTEM_PROMPT}${dietaryContext}

      User Request: ${userPrompt}
      
      Generate a recipe based on the user's request. Respond with ONLY the JSON object:`;

    return fullPrompt;
  }

  formatCreateRecipeVersionPrompt(
    userPrompt: string,
    previousVersions: RecipeVersion[],
    dietaryRestrictions?: string | null
  ) {
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

    const fullPrompt = `${RECIPE_VERSION_UPDATE_SYSTEM_PROMPT}${versionContext}${dietaryContext}

Current User Request: ${userPrompt}

Generate version ${nextVersion} of this recipe based on the user's request and previous versions. Respond with ONLY the JSON object:`;

    return fullPrompt;
  }

  formatForkRecipePrompt(
    userPrompt: string,
    sourceRecipeVersion: RecipeVersion,
    dietaryRestrictions?: string | null
  ) {
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

    return fullPrompt;
  }

  get structuredAIRecipeResponseSchema() {
    return AIRecipeResponse;
  }

  async createRecipe(recipe: {
    dietaryRestrictions: Recipe["dietaryRestrictions"];
    visibility: Recipe["visibility"];
    initialRecipeVersion: Omit<RecipeVersion, "id" | "recipeId">;
    usageMetadata?: GenerateContentUsageMetadata;
  }): Promise<Recipe> {
    const startTime = Date.now();
    const recipeId = this.uid("recipe");
    const recipeVersionId = this.uid("recipe_ver");

    const now = new Date();

    const mongoRecipeVersion: MongoRecipeVersion = {
      _id: recipeVersionId,
      recipeId,
      userId: recipe.initialRecipeVersion.userId,
      generatedName: recipe.initialRecipeVersion.generatedName,
      description: recipe.initialRecipeVersion.description,
      prepTime: recipe.initialRecipeVersion.prepTime,
      cookTime: recipe.initialRecipeVersion.cookTime,
      servings: recipe.initialRecipeVersion.servings,
      ingredients: recipe.initialRecipeVersion.ingredients,
      instructions: recipe.initialRecipeVersion.instructions,
      version: recipe.initialRecipeVersion.version,
      message: recipe.initialRecipeVersion.message,
      createdAt: now,
    };

    const mongoRecipe: MongoRecipe = {
      _id: recipeId,
      userId: recipe.initialRecipeVersion.userId,
      generatedName: recipe.initialRecipeVersion.generatedName,
      visibility: recipe.visibility,
      dietaryRestrictions: recipe.dietaryRestrictions,
      recentVersions: [mongoRecipeVersion],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const session = this.client.startSession();

    try {
      await session.withTransaction(async (session) => {
        await this.recipesColl.insertOne(mongoRecipe, {
          session,
        });
        await this.recipeVersionsColl.insertOne(mongoRecipeVersion, {
          session,
        });
        await this.eventsColl.insertOne({
          _id: this.uid("evt"),
          timestamp: now,
          type: "recipe_version.created",
          key: recipe.initialRecipeVersion.userId,
          payload: {
            model: recipe.usageMetadata?.model ?? "gemini-2.5-flash",
            userId: recipe.initialRecipeVersion.userId,
            recipeVersionId,
            recipeId,
            durationMs: recipe.usageMetadata?.durationMs ?? 0,
            inputTokens: recipe.usageMetadata?.inputTokens ?? 0,
            outputTokens: recipe.usageMetadata?.outputTokens ?? 0,
          },
        });
      });

      const duration = Date.now() - startTime;
      console.log(`[DB] createRecipe: ${duration}ms`);
      return fromMongo.recipe(mongoRecipe);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getRecipe(recipeId: string): Promise<Recipe | null> {
    const startTime = Date.now();
    const mongoRecipe = await this.recipesColl.findOne({ _id: recipeId });
    const duration = Date.now() - startTime;
    console.log(`[DB] getRecipe: ${duration}ms`);

    if (!mongoRecipe) return null;

    return fromMongo.recipe(mongoRecipe);
  }

  async listRecipes(
    userId: string,
    page: number,
    limit: number
  ): Promise<{
    hasMore: boolean;
    recipes: Recipe[];
  }> {
    const startTime = Date.now();
    const mongoRecipes = await this.recipesColl
      .find({ userId })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await this.recipesColl.countDocuments({ userId });
    const duration = Date.now() - startTime;
    console.log(`[DB] listRecipes: ${duration}ms`);

    return {
      hasMore: total > page * limit,
      recipes: mongoRecipes.map(fromMongo.recipe),
    };
  }

  async createRecipeVersion(
    recipeId: string,
    userId: string,
    newRecipeVersion: Omit<
      RecipeVersion,
      "id" | "recipeId" | "userId" | "version" | "createdAt"
    >,
    message: string,
    usageMetadata?: GenerateContentUsageMetadata
  ): Promise<Recipe> {
    const startTime = Date.now();
    // Get the current recipe to determine the next version number
    const currentRecipe = await this.getRecipe(recipeId);
    if (!currentRecipe) {
      throw new Error("Recipe not found");
    }

    const nextVersion = currentRecipe.recentVersions.length + 1;
    const recipeVersionId = this.uid("recipe_ver");
    const now = new Date();

    const mongoRecipeVersion: MongoRecipeVersion = {
      _id: recipeVersionId,
      recipeId,
      userId,
      generatedName: newRecipeVersion.generatedName,
      description: newRecipeVersion.description,
      prepTime: newRecipeVersion.prepTime,
      cookTime: newRecipeVersion.cookTime,
      servings: newRecipeVersion.servings,
      ingredients: newRecipeVersion.ingredients,
      instructions: newRecipeVersion.instructions,
      version: nextVersion,
      message,
      createdAt: now,
    };

    const session = this.client.startSession();
    try {
      await session.withTransaction(async (session) => {
        // Insert the new recipe version
        await this.recipeVersionsColl.insertOne(mongoRecipeVersion, {
          session,
        });

        // Update the recipe with the new version
        await this.recipesColl.updateOne(
          { _id: recipeId },
          {
            $push: {
              recentVersions: {
                $each: [mongoRecipeVersion],
                $slice: -10, // Keep only the last 10 elements (most recent)
              },
            },
            $set: { updatedAt: now },
          },
          {
            session,
          }
        );

        await this.eventsColl.insertOne({
          _id: this.uid("evt"),
          timestamp: now,
          type: "recipe_version.created",
          key: userId,
          payload: {
            model: usageMetadata?.model ?? "gemini-2.5-flash",
            recipeVersionId,
            recipeId,
            userId,
            durationMs: usageMetadata?.durationMs ?? 0,
            inputTokens: usageMetadata?.inputTokens ?? 0,
            outputTokens: usageMetadata?.outputTokens ?? 0,
          },
        });
      });

      // Return the updated recipe
      const result = (await this.getRecipe(recipeId)) as Recipe;
      const duration = Date.now() - startTime;
      console.log(`[DB] createRecipeVersion: ${duration}ms`);
      return result;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async listRecipeVersions(
    recipeId: string,
    page: number,
    limit: number
  ): Promise<{
    hasMore: boolean;
    versions: RecipeVersion[];
  }> {
    const startTime = Date.now();
    const mongoVersions = await this.recipeVersionsColl
      .find({ recipeId })
      .sort({ version: -1 }) // Sort by version descending (newest first)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await this.recipeVersionsColl.countDocuments({ recipeId });
    const duration = Date.now() - startTime;
    console.log(`[DB] listRecipeVersions: ${duration}ms`);

    return {
      hasMore: total > page * limit,
      versions: mongoVersions.map(fromMongo.recipeVersion),
    };
  }

  async deleteRecipe(recipeId: string): Promise<void> {
    const startTime = Date.now();
    const session = this.client.startSession();
    try {
      await session.withTransaction(async (session) => {
        // Delete the recipe
        await this.recipesColl.deleteOne({ _id: recipeId }, { session });

        // Delete all recipe versions
        await this.recipeVersionsColl.deleteMany({ recipeId }, { session });
      });
      const duration = Date.now() - startTime;
      console.log(`[DB] deleteRecipe: ${duration}ms`);
    } catch (error) {
      console.error("Error deleting recipe:", error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async forkRecipe(
    sourceRecipeId: string,
    sourceVersionId: string,
    userId: string,
    userPrompt: string,
    forkedRecipeData: {
      generatedName: string;
      description: string;
      prepTime: number;
      cookTime: number;
      servings: number;
      ingredients: Ingredient[];
      instructions: string[];
    },
    userGivenName?: string,
    visibility: "public" | "private" = "private",
    dietaryRestrictions?: string,
    usageMetadata?: GenerateContentUsageMetadata
  ): Promise<Recipe> {
    const startTime = Date.now();
    // Get the source recipe and version
    const sourceRecipe = await this.getRecipe(sourceRecipeId);
    if (!sourceRecipe) {
      throw new Error("Source recipe not found");
    }

    const sourceVersion = sourceRecipe.recentVersions.find(
      (v) => v.id === sourceVersionId
    );
    if (!sourceVersion) {
      throw new Error("Source recipe version not found");
    }

    const recipeId = this.uid("recipe");
    const recipeVersionId = this.uid("recipe_ver");
    const now = new Date();

    // Create a new recipe version based on the provided recipe data
    const mongoRecipeVersion: MongoRecipeVersion = {
      _id: recipeVersionId,
      recipeId,
      userId,
      generatedName: forkedRecipeData.generatedName,
      description: forkedRecipeData.description,
      prepTime: forkedRecipeData.prepTime,
      cookTime: forkedRecipeData.cookTime,
      servings: forkedRecipeData.servings,
      ingredients: forkedRecipeData.ingredients,
      instructions: forkedRecipeData.instructions,
      version: 1, // This is version 1 of the new recipe
      message: userPrompt,
      createdAt: now,
    };

    // Create the new recipe
    const mongoRecipe: MongoRecipe = {
      _id: recipeId,
      userId,
      userGivenName: userGivenName || undefined,
      generatedName: forkedRecipeData.generatedName,
      visibility,
      dietaryRestrictions,
      recentVersions: [mongoRecipeVersion],
      createdAt: now,
      updatedAt: now,
    };

    const session = this.client.startSession();
    try {
      await session.withTransaction(async (session) => {
        await this.recipesColl.insertOne(mongoRecipe, {
          session,
        });
        await this.recipeVersionsColl.insertOne(mongoRecipeVersion, {
          session,
        });
        await this.eventsColl.insertOne({
          _id: this.uid("evt"),
          timestamp: now,
          type: "recipe_version.created",
          key: userId,
          payload: {
            model: usageMetadata?.model ?? "gemini-2.5-flash",
            recipeVersionId,
            recipeId,
            userId,
            durationMs: usageMetadata?.durationMs ?? 0,
            inputTokens: usageMetadata?.inputTokens ?? 0,
            outputTokens: usageMetadata?.outputTokens ?? 0,
          },
        });
      });

      const duration = Date.now() - startTime;
      console.log(`[DB] forkRecipe: ${duration}ms`);
      return fromMongo.recipe(mongoRecipe);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async searchRecipes(userId: string, query: string): Promise<Recipe[]> {
    const startTime = Date.now();
    const mongoRecipes = this.recipesColl.aggregate([
      {
        $search: {
          index: "recipesTextSearchIndex",
          compound: {
            must: [
              {
                text: {
                  query: query,
                  path: [
                    "userGivenName",
                    "recentVersions.generatedName",
                    "recentVersions.ingredients.description",
                  ],
                },
              },
            ],
            filter: [
              {
                equals: {
                  path: "userId",
                  value: userId,
                },
              },
            ],
          },
        },
      },
      {
        $limit: 10,
      },
    ]);

    const mongoRecipesArray = (await mongoRecipes.toArray()) as MongoRecipe[];

    const duration = Date.now() - startTime;

    console.log(`[DB] searchRecipes: ${duration}ms`);

    return mongoRecipesArray.map((mongoRecipe) =>
      fromMongo.recipe(mongoRecipe)
    );
  }

  async shareRecipe(recipeId: string, sharedWith: string): Promise<void> {
    const startTime = Date.now();

    const recipe = await this.getRecipe(recipeId);

    if (!recipe) {
      throw new Error("Recipe not found");
    }

    const sharedRecipe: SharedRecipe = {
      id: this.uid("shared_recipe"),
      recipeId: recipe.id,
      sharedBy: recipe.userId,
      sharedWith,
      sharedAt: new Date(),
    };

    const mongoSharedRecipe: MongoSharedRecipe =
      toMongo.sharedRecipe(sharedRecipe);

    const session = this.client.startSession();
    try {
      await session.withTransaction(async (session) => {
        await this.sharedRecipesColl.insertOne(mongoSharedRecipe, {
          session,
        });
      });
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await session.endSession();

      const duration = Date.now() - startTime;

      console.log(`[DB] shareRecipe: ${duration}ms`);
    }
  }

  async getSharedRecipes(
    userId: string,
    page: number,
    limit: number
  ): Promise<{
    hasMore: boolean;
    recipes: (Recipe & { sharedBy: string; sharedAt: Date })[];
  }> {
    const startTime = Date.now();

    // Get shared recipes for this user
    const mongoSharedRecipes = await this.sharedRecipesColl
      .find({ sharedWith: userId })
      .sort({ sharedAt: -1 }) // Sort by most recently shared first
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get the actual recipes for these shared recipe IDs
    const recipeIds = mongoSharedRecipes.map((sr) => sr.recipeId);
    const mongoRecipes = await this.recipesColl
      .find({ _id: { $in: recipeIds } })
      .toArray();

    // Create a map for quick lookup
    const recipeMap = new Map(
      mongoRecipes.map((recipe) => [recipe._id, recipe])
    );

    // Combine shared recipe info with actual recipe data
    const recipesWithSharedInfo = mongoSharedRecipes
      .map((sharedRecipe) => {
        const recipe = recipeMap.get(sharedRecipe.recipeId);
        if (!recipe) return null;

        return {
          ...fromMongo.recipe(recipe),
          sharedBy: sharedRecipe.sharedBy,
          sharedAt: sharedRecipe.sharedAt,
        };
      })
      .filter(
        (recipe): recipe is Recipe & { sharedBy: string; sharedAt: Date } =>
          recipe !== null
      );

    const total = await this.sharedRecipesColl.countDocuments({
      sharedWith: userId,
    });
    const duration = Date.now() - startTime;
    console.log(`[DB] getSharedRecipes: ${duration}ms`);

    return {
      hasMore: total > page * limit,
      recipes: recipesWithSharedInfo,
    };
  }

  async getSharedRecipe(
    recipeId: string,
    sharedWith: string
  ): Promise<SharedRecipe | null> {
    const startTime = Date.now();
    const mongoSharedRecipe = await this.sharedRecipesColl.findOne({
      recipeId,
      sharedWith,
    });
    const duration = Date.now() - startTime;
    console.log(`[DB] getSharedRecipe: ${duration}ms`);
    return mongoSharedRecipe ? fromMongo.sharedRecipe(mongoSharedRecipe) : null;
  }
}
const CREATE_RECIPE_SYSTEM_PROMPT = `You are a professional chef and recipe creator. Your task is to generate detailed, accurate, and delicious recipes based on user requests.

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

const RECIPE_VERSION_UPDATE_SYSTEM_PROMPT = `You are a professional chef and recipe creator. Your task is to generate an updated version of an existing recipe based on user feedback and previous versions.

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
