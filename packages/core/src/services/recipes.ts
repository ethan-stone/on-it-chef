import { Collection, MongoClient } from "mongodb";
import { ulid } from "ulid";
import { z } from "zod";

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
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  createdAt: z.date(),
});

export type RecipeVersion = z.infer<typeof RecipeVersion>;

const MongoRecipeVersion = RecipeVersion.omit({
  id: true,
}).extend({
  _id: z.string(),
});

type MongoRecipeVersion = z.infer<typeof MongoRecipeVersion>;

const RecipePrompt = z.object({
  id: z.string(),
  recipeId: z.string(),
  userId: z.string(),
  message: z.string(), // The message that the user provided to generate the recipe version.
  generatedVersion: z.string(), // The ID of the generated recipe version from this prompt.
  createdAt: z.date(),
});

export type RecipePrompt = z.infer<typeof RecipePrompt>;

const MongoRecipePrompt = RecipePrompt.omit({
  id: true,
}).extend({
  _id: z.string(),
});

type MongoRecipePrompt = z.infer<typeof MongoRecipePrompt>;

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

type MongoRecipe = z.infer<typeof MongoRecipe>;

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
  recipePrompt: (recipePrompt: RecipePrompt): MongoRecipePrompt => {
    return MongoRecipePrompt.parse({
      ...recipePrompt,
      _id: recipePrompt.id,
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
  recipePrompt: (mongoRecipePrompt: MongoRecipePrompt): RecipePrompt => {
    return RecipePrompt.parse({
      ...mongoRecipePrompt,
      id: mongoRecipePrompt._id,
    });
  },
};

export class RecipeService {
  private dbName = "onItChef";
  private recipesColl: Collection<MongoRecipe>;
  private recipeVersionsColl: Collection<MongoRecipeVersion>;
  private recipePromptsColl: Collection<MongoRecipePrompt>;

  constructor(private readonly client: MongoClient) {
    this.recipesColl = this.client
      .db(this.dbName)
      .collection<MongoRecipe>("recipes");
    this.recipeVersionsColl = this.client
      .db(this.dbName)
      .collection<MongoRecipeVersion>("recipeVersions");
    this.recipePromptsColl = this.client
      .db(this.dbName)
      .collection<MongoRecipePrompt>("recipePrompts");
  }

  private uid(prefix: "recipe" | "recipe_ver" | "recipe_prompt") {
    return `${prefix}_${ulid()}`;
  }

  async createRecipe(recipe: {
    dietaryRestrictions: Recipe["dietaryRestrictions"];
    visibility: Recipe["visibility"];
    initialRecipeVersion: Omit<RecipeVersion, "id" | "recipeId">;
    initialRecipePrompt: Omit<
      RecipePrompt,
      "id" | "recipeId" | "generatedVersion"
    >;
  }): Promise<Recipe> {
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
      createdAt: now,
    };

    const mongoRecipePrompt: MongoRecipePrompt = {
      _id: this.uid("recipe_prompt"),
      recipeId,
      userId: recipe.initialRecipeVersion.userId,
      message: recipe.initialRecipePrompt.message,
      generatedVersion: mongoRecipeVersion._id,
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
      await session.withTransaction(async () => {
        await this.recipesColl.insertOne(mongoRecipe);
        await this.recipeVersionsColl.insertOne(mongoRecipeVersion);
        await this.recipePromptsColl.insertOne(mongoRecipePrompt);
      });

      return fromMongo.recipe(mongoRecipe);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getRecipe(recipeId: string): Promise<Recipe | null> {
    const mongoRecipe = await this.recipesColl.findOne({ _id: recipeId });

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
    const mongoRecipes = await this.recipesColl
      .find({ userId })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await this.recipesColl.countDocuments({ userId });

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
    message: string
  ): Promise<Recipe> {
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
      createdAt: now,
    };

    const mongoRecipePrompt: MongoRecipePrompt = {
      _id: this.uid("recipe_prompt"),
      recipeId,
      userId,
      message,
      generatedVersion: mongoRecipeVersion._id,
      createdAt: now,
    };

    const session = this.client.startSession();
    try {
      await session.withTransaction(async () => {
        // Insert the new recipe version
        await this.recipeVersionsColl.insertOne(mongoRecipeVersion);

        // Insert the new recipe prompt
        await this.recipePromptsColl.insertOne(mongoRecipePrompt);

        // Update the recipe with the new version
        await this.recipesColl.updateOne(
          { _id: recipeId },
          {
            $push: { recentVersions: mongoRecipeVersion },
            $set: { updatedAt: now },
          }
        );
      });

      // Return the updated recipe
      return (await this.getRecipe(recipeId)) as Recipe;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getRecipePrompts(recipeId: string): Promise<RecipePrompt[]> {
    const mongoPrompts = await this.recipePromptsColl
      .find({ recipeId })
      .sort({ createdAt: 1 }) // Sort by creation date ascending
      .toArray();

    return mongoPrompts.map(fromMongo.recipePrompt);
  }

  async listRecipeVersions(
    recipeId: string,
    page: number,
    limit: number
  ): Promise<{
    hasMore: boolean;
    versions: RecipeVersion[];
  }> {
    const mongoVersions = await this.recipeVersionsColl
      .find({ recipeId })
      .sort({ version: -1 }) // Sort by version descending (newest first)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await this.recipeVersionsColl.countDocuments({ recipeId });

    return {
      hasMore: total > page * limit,
      versions: mongoVersions.map(fromMongo.recipeVersion),
    };
  }
}
