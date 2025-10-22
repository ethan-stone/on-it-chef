import { ClientSession, Collection, MongoClient } from "mongodb";
import { ulid } from "ulid";
import { z } from "zod";
import { withQueryLogging } from "./utils";

export const Ingredient = z
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

export const RecipeVersion = z.object({
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

export const MongoRecipeVersion = RecipeVersion.omit({
  id: true,
}).extend({
  _id: z.string(),
});

export type MongoRecipeVersion = z.infer<typeof MongoRecipeVersion>;

export const toMongo = {
  recipeVersion: (recipeVersion: RecipeVersion): MongoRecipeVersion => {
    return MongoRecipeVersion.parse({
      ...recipeVersion,
      _id: recipeVersion.id,
    });
  },
};

export const fromMongo = {
  recipeVersion: (mongoRecipeVersion: MongoRecipeVersion): RecipeVersion => {
    return RecipeVersion.parse({
      ...mongoRecipeVersion,
      id: mongoRecipeVersion._id,
    });
  },
};

type ListRecipeVersionsFilter = {
  userId?: string;
  recipeId?: string;
};

export class RecipeVersionRepository {
  private dbName = "onItChef";
  private recipeVersionsColl: Collection<MongoRecipeVersion>;

  constructor(private readonly client: MongoClient) {
    this.recipeVersionsColl = this.client
      .db(this.dbName)
      .collection<MongoRecipeVersion>("recipeVersions");
  }

  public uid(prefix: "recipe_ver") {
    return `${prefix}_${ulid()}`;
  }

  async create(
    recipeVersion: RecipeVersion,
    session?: ClientSession
  ): Promise<RecipeVersion> {
    return withQueryLogging(
      "create",
      this.recipeVersionsColl.collectionName,
      async () => {
        const mongoRecipeVersion = toMongo.recipeVersion(recipeVersion);
        await this.recipeVersionsColl.insertOne(mongoRecipeVersion, {
          session,
        });
        return fromMongo.recipeVersion(mongoRecipeVersion);
      }
    );
  }

  async list(
    filter: ListRecipeVersionsFilter,
    page: number,
    limit: number
  ): Promise<{
    hasMore: boolean;
    versions: RecipeVersion[];
  }> {
    return withQueryLogging(
      "list",
      this.recipeVersionsColl.collectionName,
      async () => {
        const mongoRecipeVersions = await this.recipeVersionsColl
          .find(filter)
          .sort({ version: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        return {
          hasMore: mongoRecipeVersions.length === limit,
          versions: mongoRecipeVersions.map(fromMongo.recipeVersion),
        };
      }
    );
  }

  async getById(id: string): Promise<RecipeVersion | null> {
    return withQueryLogging(
      "getById",
      this.recipeVersionsColl.collectionName,
      async () => {
        const mongoRecipeVersion = await this.recipeVersionsColl.findOne({
          _id: id,
        });
        return mongoRecipeVersion
          ? fromMongo.recipeVersion(mongoRecipeVersion)
          : null;
      }
    );
  }

  async deleteMany(
    filter: ListRecipeVersionsFilter,
    session?: ClientSession
  ): Promise<void> {
    return withQueryLogging(
      "deleteMany",
      this.recipeVersionsColl.collectionName,
      async () => {
        await this.recipeVersionsColl.deleteMany(filter, { session });
      }
    );
  }
}
