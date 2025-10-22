import { MongoClient } from "mongodb";
import { RecipeGenerator } from "../gateways/recipe-generator";
import {
  RecipeVersion,
  RecipeVersionRepository,
} from "../repos/recipe-versions";
import { Recipe, RecipeRepository } from "../repos/recipes";
import { SharedRecipeRepository } from "../repos/shared-recipes";
import { UserRepository } from "../repos/users";
import { ServiceContext } from "./service-context";
import { Result } from "./result";
import { getRecipeAccessInfo } from "./recipes.access";

type CreateRecipeArgs = {
  prompt: string;
  userId?: string;
  visibility?: "public" | "private";
  customDietaryRestrictions?: string;
  includeDietaryRestrictions?: boolean;
};

type CreateRecipeError = "NO_ACCESS" | "USER_NOT_FOUND";

type ForkRecipeArgs = {
  userId?: string;
  sourceRecipeVersionId: string;
  prompt: string;
  visibility: "public" | "private";
  customDietaryRestrictions?: string;
  includeDietaryRestrictions?: boolean;
};

type ForkRecipeError =
  | "NO_ACCESS"
  | "USER_NOT_FOUND"
  | "SOURCE_RECIPE_VERSION_NOT_FOUND"
  | "SOURCE_RECIPE_NOT_FOUND";

type CreateRecipeVersionArgs = {
  recipeId: string;
  prompt: string;
};

type CreateRecipeVersionError =
  | "NO_ACCESS"
  | "USER_NOT_FOUND"
  | "RECIPE_NOT_FOUND";

type ShareRecipeArgs = {
  recipeId: string;
  sharedWithEmail: string;
};

type ShareRecipeError = "NO_ACCESS" | "USER_NOT_FOUND" | "RECIPE_NOT_FOUND";

export class RecipesService {
  constructor(
    private readonly mongoClient: MongoClient,
    private readonly recipeRepo: RecipeRepository,
    private readonly recipeVersionRepo: RecipeVersionRepository,
    private readonly sharedRecipeRepo: SharedRecipeRepository,
    private readonly recipeGenerator: RecipeGenerator,
    private readonly userRepo: UserRepository
  ) {}

  async createRecipe(
    ctx: ServiceContext,
    args: CreateRecipeArgs
  ): Promise<Result<Recipe, CreateRecipeError>> {
    if (ctx.actor.type === "user" && ctx.actor.id !== args.userId) {
      ctx.logger.error(
        `User ${ctx.actor.id} is not authorized to create recipe for user ${args.userId}`
      );

      return {
        ok: false,
        error: "NO_ACCESS",
      };
    }

    if (ctx.actor.type !== "user" && !args.userId) {
      ctx.logger.error("Anonymous user must provide a userId");

      return {
        ok: false,
        error: "NO_ACCESS",
      };
    }

    const user = args.userId
      ? await this.userRepo.getById(args.userId)
      : await this.userRepo.getById(ctx.actor.id);

    if (!user) {
      ctx.logger.error(`User ${args.userId} not found`);
      return {
        ok: false,
        error: "USER_NOT_FOUND",
      };
    }

    const dietaryRestrictions =
      args.customDietaryRestrictions ||
      (args.includeDietaryRestrictions ? user?.dietaryRestrictions : undefined);

    const generatedRecipe = await this.recipeGenerator.create(
      args.prompt,
      dietaryRestrictions
    );

    const session = this.mongoClient.startSession();

    const createdRecipe = await session.withTransaction(async (session) => {
      const recipeId = this.recipeRepo.uid("recipe");
      const recipeVersionId = this.recipeVersionRepo.uid("recipe_ver");
      const now = new Date();

      const recipe: Recipe = {
        id: recipeId,
        userId: user.id,
        recentVersions: [
          {
            id: recipeVersionId,
            recipeId: recipeId,
            userId: user.id,
            generatedName: generatedRecipe.generatedName,
            description: generatedRecipe.description,
            prepTime: generatedRecipe.prepTime,
            cookTime: generatedRecipe.cookTime,
            servings: generatedRecipe.servings,
            ingredients: generatedRecipe.ingredients,
            instructions: generatedRecipe.instructions,
            version: 1,
            message: args.prompt,
            createdAt: now,
          },
        ],
        generatedName: generatedRecipe.generatedName,
        visibility: args.visibility || "private",
        dietaryRestrictions: dietaryRestrictions,
        createdAt: now,
        updatedAt: now,
      };

      const createdRecipe = await this.recipeRepo.create(recipe, session);

      await this.recipeVersionRepo.create(
        {
          id: recipeVersionId,
          recipeId: recipeId,
          userId: user.id,
          generatedName: generatedRecipe.generatedName,
          version: 1,
          description: generatedRecipe.description,
          prepTime: generatedRecipe.prepTime,
          cookTime: generatedRecipe.cookTime,
          servings: generatedRecipe.servings,
          ingredients: generatedRecipe.ingredients,
          instructions: generatedRecipe.instructions,
          message: args.prompt,
          createdAt: now,
        },
        session
      );

      return createdRecipe;
    });

    return {
      ok: true,
      value: createdRecipe,
    };
  }

  async forkRecipe(
    ctx: ServiceContext,
    args: ForkRecipeArgs
  ): Promise<Result<Recipe, ForkRecipeError>> {
    if (ctx.actor.type === "user" && ctx.actor.id !== args.userId) {
      ctx.logger.error(
        `User ${ctx.actor.id} is not authorized to fork recipe for user ${args.userId}`
      );

      return {
        ok: false,
        error: "NO_ACCESS",
      };
    }

    if (ctx.actor.type !== "user" && !args.userId) {
      ctx.logger.error("Anonymous user must provide a userId");

      return {
        ok: false,
        error: "NO_ACCESS",
      };
    }

    const user = args.userId
      ? await this.userRepo.getById(args.userId)
      : await this.userRepo.getById(ctx.actor.id);

    if (!user) {
      ctx.logger.error(`User ${args.userId} not found`);
      return {
        ok: false,
        error: "USER_NOT_FOUND",
      };
    }

    const sourceRecipeVersion = await this.recipeVersionRepo.getById(
      args.sourceRecipeVersionId
    );

    if (!sourceRecipeVersion) {
      ctx.logger.error(
        `Source recipe version ${args.sourceRecipeVersionId} not found`
      );
      return {
        ok: false,
        error: "SOURCE_RECIPE_VERSION_NOT_FOUND",
      };
    }

    const sourceRecipe = await this.recipeRepo.getById(
      sourceRecipeVersion.recipeId
    );

    if (!sourceRecipe) {
      ctx.logger.error(
        `Source recipe ${sourceRecipeVersion.recipeId} not found`
      );
      return {
        ok: false,
        error: "SOURCE_RECIPE_NOT_FOUND",
      };
    }

    const accessInfo = await getRecipeAccessInfo(ctx, sourceRecipe, {
      recipeRepo: this.recipeRepo,
      sharedRecipeRepo: this.sharedRecipeRepo,
    });

    if (!accessInfo.canFork) {
      ctx.logger.error(
        `Actor ${ctx.actor.type} ${ctx.actor.id} does not have permission to fork recipe ${sourceRecipe.id}`
      );

      return {
        ok: false,
        error: "NO_ACCESS",
      };
    }

    const dietaryRestrictions =
      args.customDietaryRestrictions ||
      (args.includeDietaryRestrictions ? user.dietaryRestrictions : undefined);

    const generatedRecipe = await this.recipeGenerator.fork(
      args.prompt,
      sourceRecipeVersion,
      dietaryRestrictions
    );

    const session = this.mongoClient.startSession();

    const forkedRecipe = await session.withTransaction(async (session) => {
      const recipeId = this.recipeRepo.uid("recipe");
      const recipeVersionId = this.recipeVersionRepo.uid("recipe_ver");
      const now = new Date();

      const recipe: Recipe = {
        id: recipeId,
        userId: user.id,
        recentVersions: [
          {
            id: recipeVersionId,
            recipeId: recipeId,
            userId: user.id,
            generatedName: generatedRecipe.generatedName,
            description: generatedRecipe.description,
            prepTime: generatedRecipe.prepTime,
            cookTime: generatedRecipe.cookTime,
            servings: generatedRecipe.servings,
            ingredients: generatedRecipe.ingredients,
            instructions: generatedRecipe.instructions,
            version: 1,
            message: args.prompt,
            createdAt: now,
          },
        ],
        generatedName: generatedRecipe.generatedName,
        visibility: args.visibility,
        dietaryRestrictions: dietaryRestrictions,
        createdAt: now,
        updatedAt: now,
      };

      const forkedRecipe = await this.recipeRepo.create(recipe, session);

      await this.recipeVersionRepo.create(
        {
          id: recipeVersionId,
          recipeId: recipeId,
          userId: user.id,
          generatedName: generatedRecipe.generatedName,
          version: 1,
          description: generatedRecipe.description,
          prepTime: generatedRecipe.prepTime,
          cookTime: generatedRecipe.cookTime,
          servings: generatedRecipe.servings,
          ingredients: generatedRecipe.ingredients,
          instructions: generatedRecipe.instructions,
          message: args.prompt,
          createdAt: now,
        },
        session
      );

      return forkedRecipe;
    });

    return {
      ok: true,
      value: forkedRecipe,
    };
  }

  async createRecipeVersion(
    ctx: ServiceContext,
    args: CreateRecipeVersionArgs
  ): Promise<Result<Recipe, CreateRecipeVersionError>> {
    if (ctx.actor.type === "user") {
      const user = await this.userRepo.getById(ctx.actor.id);

      if (!user) {
        ctx.logger.error(`User ${ctx.actor.id} not found`);
        return {
          ok: false,
          error: "USER_NOT_FOUND",
        };
      }
    }

    const recipe = await this.recipeRepo.getById(args.recipeId);

    if (!recipe) {
      ctx.logger.error(`Recipe ${args.recipeId} not found`);

      return {
        ok: false,
        error: "RECIPE_NOT_FOUND",
      };
    }

    const accessInfo = await getRecipeAccessInfo(ctx, recipe, {
      recipeRepo: this.recipeRepo,
      sharedRecipeRepo: this.sharedRecipeRepo,
    });

    if (!accessInfo.canEdit) {
      ctx.logger.error(
        `Actor ${ctx.actor.type} ${ctx.actor.id} does not have permission to create recipe version for recipe ${args.recipeId}`
      );

      return {
        ok: false,
        error: "NO_ACCESS",
      };
    }

    const generatedRecipeVersion = await this.recipeGenerator.newVersion(
      args.prompt,
      recipe.recentVersions,
      recipe.dietaryRestrictions
    );

    const session = this.mongoClient.startSession();

    const updatedRecipe = await session.withTransaction(async (session) => {
      const recipeVersionId = this.recipeVersionRepo.uid("recipe_ver");
      const now = new Date();

      const recipeVersion: RecipeVersion = {
        id: recipeVersionId,
        recipeId: args.recipeId,
        userId: recipe.userId,
        generatedName: generatedRecipeVersion.generatedName,
        version: recipe.recentVersions.length + 1,
        description: generatedRecipeVersion.description,
        prepTime: generatedRecipeVersion.prepTime,
        cookTime: generatedRecipeVersion.cookTime,
        servings: generatedRecipeVersion.servings,
        ingredients: generatedRecipeVersion.ingredients,
        instructions: generatedRecipeVersion.instructions,
        message: args.prompt,
        createdAt: now,
      };

      const createdRecipeVersion = await this.recipeVersionRepo.create(
        recipeVersion,
        session
      );

      const updatedRecipe = await this.recipeRepo.pushRecipeVersion(
        args.recipeId,
        createdRecipeVersion,
        session
      );

      return updatedRecipe;
    });

    return {
      ok: true,
      value: updatedRecipe,
    };
  }

  async shareRecipe(
    ctx: ServiceContext,
    args: ShareRecipeArgs
  ): Promise<Result<void, ShareRecipeError>> {
    if (ctx.actor.type === "user") {
      const user = await this.userRepo.getById(ctx.actor.id);

      if (!user) {
        ctx.logger.error(`User ${ctx.actor.id} not found`);

        return {
          ok: false,
          error: "USER_NOT_FOUND",
        };
      }
    }

    const recipe = await this.recipeRepo.getById(args.recipeId);

    if (!recipe) {
      ctx.logger.error(`Recipe ${args.recipeId} not found`);

      return {
        ok: false,
        error: "RECIPE_NOT_FOUND",
      };
    }

    const accessInfo = await getRecipeAccessInfo(ctx, recipe, {
      recipeRepo: this.recipeRepo,
      sharedRecipeRepo: this.sharedRecipeRepo,
    });

    if (!accessInfo.canEdit) {
      ctx.logger.error(
        `Actor ${ctx.actor.type} ${ctx.actor.id} does not have permission to share recipe ${args.recipeId}`
      );

      return {
        ok: false,
        error: "NO_ACCESS",
      };
    }

    const sharedWithUser = await this.userRepo.getByEmail(args.sharedWithEmail);

    // If the user does not exist consider it a success and continue.
    // We don't to expose the user's existence to the caller.
    // We just say "if the user has an account with this email address, they will receive an email with the recipe."
    if (!sharedWithUser) {
      ctx.logger.info(`User ${args.sharedWithEmail} not found`);

      return {
        ok: true,
        value: undefined,
      };
    }

    await this.sharedRecipeRepo.create({
      id: this.sharedRecipeRepo.uid("shared_recipe"),
      recipeId: recipe.id,
      sharedBy: recipe.userId,
      sharedWith: sharedWithUser.id,
      sharedAt: new Date(),
    });

    // TODO: Send email and/or push notification to the shared user.

    return {
      ok: true,
      value: undefined,
    };
  }
}
