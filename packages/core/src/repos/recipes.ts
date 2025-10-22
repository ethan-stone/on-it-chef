import { ClientSession, Collection, MongoClient } from "mongodb";
import { z } from "zod";
import {
  RecipeVersion,
  MongoRecipeVersion,
  toMongo as toMongoRecipeVersion,
  fromMongo as fromMongoRecipeVersion,
} from "./recipe-versions";
import { ulid } from "ulid";
import { withQueryLogging } from "./utils";

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

export const toMongo = {
  recipe: (recipe: Recipe): MongoRecipe => {
    return MongoRecipe.parse({
      ...recipe,
      recentVersions: recipe.recentVersions.map(
        toMongoRecipeVersion.recipeVersion
      ),
      _id: recipe.id,
    });
  },
};

export const fromMongo = {
  recipe: (mongoRecipe: MongoRecipe): Recipe => {
    return Recipe.parse({
      ...mongoRecipe,
      recentVersions: mongoRecipe.recentVersions.map(
        fromMongoRecipeVersion.recipeVersion
      ),
      id: mongoRecipe._id,
    });
  },
};

type ListRecipesFilter = {
  userId?: string;
};

type SearchRecipesFilter = {
  userId?: string;
  query: string;
};

export class RecipeRepository {
  private dbName = "onItChef";
  private recipesColl: Collection<MongoRecipe>;

  constructor(private readonly client: MongoClient) {
    this.recipesColl = this.client
      .db(this.dbName)
      .collection<MongoRecipe>("recipes");
  }

  public uid(prefix: "recipe") {
    return `${prefix}_${ulid()}`;
  }

  async create(recipe: Recipe, session?: ClientSession): Promise<Recipe> {
    return withQueryLogging(
      "create",
      this.recipesColl.collectionName,
      async () => {
        const mongoRecipe = toMongo.recipe(recipe);

        await this.recipesColl.insertOne(mongoRecipe, {
          session,
        });

        return fromMongo.recipe(mongoRecipe);
      }
    );
  }

  async getById(
    recipeId: string,
    session?: ClientSession
  ): Promise<Recipe | null> {
    return withQueryLogging(
      "getById",
      this.recipesColl.collectionName,
      async () => {
        const result = await this.recipesColl.findOne(
          { _id: recipeId },
          { session }
        );
        if (!result) {
          return null;
        }
        return fromMongo.recipe(result);
      }
    );
  }

  async pushRecipeVersion(
    recipeId: string,
    recipeVersion: RecipeVersion,
    session?: ClientSession
  ): Promise<Recipe> {
    return withQueryLogging(
      "pushRecipeVersion",
      this.recipesColl.collectionName,
      async () => {
        const result = await this.recipesColl.findOneAndUpdate(
          { _id: recipeId },
          {
            $push: {
              recentVersions: {
                $each: [toMongoRecipeVersion.recipeVersion(recipeVersion)],
                $sort: { createdAt: -1 },
                $slice: 10, // Keep only the last 10 elements (most recent)
              },
            },
            $set: { updatedAt: new Date() },
          },
          { session, returnDocument: "after" }
        );

        if (!result) {
          throw new Error("Recipe not found");
        }

        return fromMongo.recipe(result);
      }
    );
  }

  async list(
    filter: ListRecipesFilter,
    page: number,
    limit: number
  ): Promise<{
    hasMore: boolean;
    recipes: Recipe[];
  }> {
    return withQueryLogging(
      "list",
      this.recipesColl.collectionName,
      async () => {
        const result = await this.recipesColl
          .find(filter)
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        return {
          hasMore: result.length === limit,
          recipes: result.map(fromMongo.recipe),
        };
      }
    );
  }

  async deleteById(recipeId: string, session?: ClientSession): Promise<void> {
    return withQueryLogging(
      "delete",
      this.recipesColl.collectionName,
      async () => {
        await this.recipesColl.deleteOne({ _id: recipeId }, { session });
      }
    );
  }

  async search(filter: SearchRecipesFilter): Promise<Recipe[]> {
    return withQueryLogging(
      "search",
      this.recipesColl.collectionName,
      async () => {
        const filterStage = [];

        if (filter.userId) {
          filterStage.push({
            equals: {
              path: "userId",
              value: filter.userId,
            },
          });
        }

        const mongoRecipes = this.recipesColl.aggregate([
          {
            $search: {
              index: "recipesTextSearchIndex",
              compound: {
                must: [
                  {
                    text: {
                      query: filter.query,
                      path: [
                        "userGivenName",
                        "recentVersions.generatedName",
                        "recentVersions.ingredients.description",
                      ],
                    },
                  },
                ],
                filter: filterStage,
              },
            },
          },
          {
            $limit: 10,
          },
        ]);

        const mongoRecipesArray =
          (await mongoRecipes.toArray()) as MongoRecipe[];

        return mongoRecipesArray.map(fromMongo.recipe);
      }
    );
  }
}
