import { RecipeRepository } from "../repos/recipes";
import { SharedRecipeRepository } from "../repos/shared-recipes";
import { Recipe } from "./recipes";
import { ServiceContext } from "./service-context";

interface RecipeAccessDeps {
  recipeRepo: RecipeRepository;
  sharedRecipeRepo: SharedRecipeRepository;
}

export type RecipeAccessInfo = {
  canView: boolean;
  canEdit: boolean; // create new recipe versions, edit name, etc.
  canFork: boolean;
};

export type RecipeAccessRule = (
  ctx: ServiceContext,
  recipe: Recipe,
  deps: RecipeAccessDeps
) => Promise<RecipeAccessInfo>;

export const RecipeAccessRules: Record<string, RecipeAccessRule> = {
  user: async (ctx: ServiceContext, recipe: Recipe, deps: RecipeAccessDeps) => {
    if (ctx.actor.type !== "user") {
      throw new Error("Predicate failed: Actor is not a user");
    }

    if (recipe.userId === ctx.actor.id) {
      return {
        canView: true,
        canEdit: true,
        canFork: true,
      };
    }

    const sharedRecipe = await deps.sharedRecipeRepo.getRecipeSharedWith(
      recipe.id,
      ctx.actor.id
    );

    if (sharedRecipe) {
      return {
        canView: true,
        canEdit: false,
        canFork: true,
      };
    }

    return {
      canView: false,
      canEdit: false,
      canFork: false,
    };
  },
};

export async function getRecipeAccessInfo(
  ctx: ServiceContext,
  recipe: Recipe,
  deps: RecipeAccessDeps
): Promise<RecipeAccessInfo> {
  const rule = RecipeAccessRules[ctx.actor.type];

  if (!rule) {
    throw new Error(`No access rule found for actor type: ${ctx.actor.type}`);
  }

  return rule(ctx, recipe, deps);
}
