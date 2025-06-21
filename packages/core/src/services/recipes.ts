import { Collection, MongoClient, ObjectId } from "mongodb";
import { ulid } from "ulid";
import { z } from "zod";

const RecipeVersion = z.object({
  id: z.string(),
  recipeId: z.string(),
  userId: z.string(),
  generatedName: z.string(),
  description: z.string(),
  prepTime: z.number(), // in minutes
  cookTime: z.number(), // in minutes
  servings: z.number(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  createdAt: z.date(),
});

export type RecipeVersion = z.infer<typeof RecipeVersion>;

const Recipe = z.object({
  id: z.string(),
  userGivenName: z.string().nullish(), // A user specified name for the recipe.
  generatedName: z.string(), // This is an auto-generated name for the recipe given by the first recipe version.
  recentVersions: z.array(RecipeVersion),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Recipe = z.infer<typeof Recipe>;

type MongoRecipe = Omit<Recipe, "id" | "recentVersions"> & {
  _id: string;
  recentVersions: MongoRecipeVersion[];
};

type MongoRecipeVersion = Omit<RecipeVersion, "id"> & {
  _id: string;
};

const toMongo = {
  recipe: (recipe: Recipe): MongoRecipe => {
    return {
      ...recipe,
      recentVersions: recipe.recentVersions.map(toMongo.recipeVersion),
      _id: recipe.id,
    };
  },
  recipeVersion: (recipeVersion: RecipeVersion): MongoRecipeVersion => {
    return {
      ...recipeVersion,
      _id: recipeVersion.id,
    };
  },
};

const fromMongo = {
  recipe: (mongoRecipe: MongoRecipe): Recipe => {
    return {
      ...mongoRecipe,
      recentVersions: mongoRecipe.recentVersions.map(fromMongo.recipeVersion),
      id: mongoRecipe._id,
    };
  },
  recipeVersion: (mongoRecipeVersion: MongoRecipeVersion): RecipeVersion => {
    return {
      ...mongoRecipeVersion,
      id: mongoRecipeVersion._id,
    };
  },
};

export class RecipeService {
  private dbName = "onItChef";
  private recipesColl: Collection<MongoRecipe>;
  private recipeVersionsColl: Collection<MongoRecipeVersion>;

  constructor(private readonly client: MongoClient) {
    this.recipesColl = this.client
      .db(this.dbName)
      .collection<MongoRecipe>("recipes");
    this.recipeVersionsColl = this.client
      .db(this.dbName)
      .collection<MongoRecipeVersion>("recipeVersions");
  }

  private uid(prefix: "recipe" | "recipe_ver") {
    return `${prefix}_${ulid()}`;
  }

  async createRecipe(
    initialRecipeVersion: Omit<RecipeVersion, "id">
  ): Promise<Recipe> {
    const recipeId = this.uid("recipe");
    const recipeVersionId = this.uid("recipe_ver");

    const now = new Date();

    const mongoRecipeVersion: MongoRecipeVersion = {
      _id: recipeVersionId,
      ...initialRecipeVersion,
      createdAt: now,
    };

    const mongoRecipe: MongoRecipe = {
      _id: recipeId,
      userId: initialRecipeVersion.userId,
      generatedName: initialRecipeVersion.generatedName,
      recentVersions: [
        {
          _id: recipeVersionId,
          ...initialRecipeVersion,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const session = this.client.startSession();
    try {
      await session.withTransaction(async () => {
        await this.recipesColl.insertOne(mongoRecipe);
        await this.recipeVersionsColl.insertOne(mongoRecipeVersion);
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
}
