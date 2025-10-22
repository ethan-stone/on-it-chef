import { ClientSession, Collection, MongoClient } from "mongodb";
import { ulid } from "ulid";
import { z } from "zod";
import { withQueryLogging } from "./utils";
import { fromMongo as fromMongoRecipes, Recipe } from "./recipes";

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
  sharedRecipe: (sharedRecipe: SharedRecipe): MongoSharedRecipe => {
    return MongoSharedRecipe.parse({
      ...sharedRecipe,
      _id: sharedRecipe.id,
    });
  },
};

const fromMongo = {
  sharedRecipe: (mongoSharedRecipe: MongoSharedRecipe): SharedRecipe => {
    return SharedRecipe.parse({
      ...mongoSharedRecipe,
      id: mongoSharedRecipe._id,
    });
  },
};

type ListSharedRecipesFilter = {
  sharedWith?: string;
};

export class SharedRecipeRepository {
  private dbName = "onItChef";
  private sharedRecipesColl: Collection<MongoSharedRecipe>;

  constructor(private readonly client: MongoClient) {
    this.sharedRecipesColl = this.client
      .db(this.dbName)
      .collection<MongoSharedRecipe>("sharedRecipes");
  }

  public uid(prefix: "shared_recipe") {
    return `${prefix}_${ulid()}`;
  }

  async create(
    sharedRecipe: SharedRecipe,
    session?: ClientSession
  ): Promise<SharedRecipe> {
    return withQueryLogging(
      "create",
      this.sharedRecipesColl.collectionName,
      async () => {
        const mongoSharedRecipe = toMongo.sharedRecipe(sharedRecipe);
        await this.sharedRecipesColl.insertOne(mongoSharedRecipe, { session });
        return fromMongo.sharedRecipe(mongoSharedRecipe);
      }
    );
  }

  async listBySharedWithWithDetails(
    sharedWith: string,
    page: number,
    limit: number
  ): Promise<{
    hasMore: boolean;
    recipes: (Recipe & { sharedBy: string; sharedAt: Date })[];
  }> {
    return withQueryLogging(
      "listBySharedWith",
      this.sharedRecipesColl.collectionName,
      async () => {
        const mongoSharedRecipes = this.sharedRecipesColl.aggregate([
          { $match: { sharedWith } },
          { $sort: { sharedAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $lookup: {
              from: "recipes",
              localField: "recipeId",
              foreignField: "_id",
              as: "recipe",
            },
          },
          { $unwind: "$recipe" },
          {
            $replaceRoot: {
              newRoot: {
                $mergeObjects: ["$recipe", "$$ROOT"],
              },
            },
          },
          {
            $project: {
              recipe: 0,
            },
          },
        ]);

        const recipes = await mongoSharedRecipes.toArray();

        return {
          hasMore: recipes.length === limit,
          recipes: recipes.map((recipe) => ({
            ...fromMongoRecipes.recipe(recipe.recipe),
            sharedBy: recipe.sharedBy,
            sharedAt: recipe.sharedAt,
          })),
        };
      }
    );
  }

  async getRecipeSharedWith(
    recipeId: string,
    sharedWith: string
  ): Promise<SharedRecipe | null> {
    return withQueryLogging(
      "getRecipeSharedWith",
      this.sharedRecipesColl.collectionName,
      async () => {
        const mongoSharedRecipe = await this.sharedRecipesColl.findOne({
          recipeId,
          sharedWith,
        });
        return mongoSharedRecipe
          ? fromMongo.sharedRecipe(mongoSharedRecipe)
          : null;
      }
    );
  }
}
