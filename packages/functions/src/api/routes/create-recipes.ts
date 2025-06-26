import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";

const route = createRoute({
  operationId: "createRecipe",
  method: "post" as const,
  path: "/v1/recipes.createRecipe",
  summary: "Create a new recipe",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            userGivenName: z.string().optional(),
            visibility: z.enum(["public", "private"]).default("private"),
            dietaryRestrictions: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Recipe created",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            userGivenName: z.string().nullish(),
            generatedName: z.string(),
            recentVersions: z.array(
              z.object({
                id: z.string(),
                recipeId: z.string(),
                userId: z.string(),
                generatedName: z.string(),
                version: z.number(),
                description: z.string(),
                prepTime: z.number(),
                cookTime: z.number(),
                servings: z.number(),
                ingredients: z.array(z.string()),
                instructions: z.array(z.string()),
                createdAt: z.string().datetime(),
              })
            ),
            userId: z.string(),
            visibility: z.enum(["public", "private"]),
            dietaryRestrictions: z.string().nullish(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          }),
        },
      },
    },
    ...errorResponseSchemas,
  },
});

export const handler: RouteHandler<typeof route, HonoEnv> = async (c) => {
  const logger = c.get("logger");
  const user = c.get("user");
  const root = c.get("root");

  if (!user) {
    logger.info("User is not logged in.");

    throw new HTTPException({
      reason: "UNAUTHORIZED",
      message: "User is not logged in.",
    });
  }

  const { userGivenName, visibility, dietaryRestrictions } =
    c.req.valid("json");

  // Generate random recipe data for the initial version
  const randomRecipes = [
    {
      name: "Classic Margherita Pizza",
      description:
        "A traditional Italian pizza with fresh mozzarella, basil, and tomato sauce on a crispy crust.",
      prepTime: 20,
      cookTime: 15,
      servings: 4,
      ingredients: [
        "2 cups all-purpose flour",
        "1 cup warm water",
        "2 1/4 tsp active dry yeast",
        "1 tsp salt",
        "1 tbsp olive oil",
        "1/2 cup tomato sauce",
        "8 oz fresh mozzarella",
        "Fresh basil leaves",
        "Salt and pepper to taste",
      ],
      instructions: [
        "Mix flour, yeast, and salt in a large bowl",
        "Add warm water and olive oil, knead until smooth",
        "Let dough rise for 1 hour",
        "Roll out dough and add toppings",
        "Bake at 450°F for 15 minutes",
      ],
    },
    {
      name: "Chicken Tikka Masala",
      description:
        "Creamy, spiced chicken in a rich tomato-based sauce with aromatic spices.",
      prepTime: 30,
      cookTime: 45,
      servings: 6,
      ingredients: [
        "2 lbs chicken breast, cubed",
        "1 cup yogurt",
        "2 tbsp tikka masala paste",
        "1 onion, diced",
        "3 cloves garlic, minced",
        "1 can coconut milk",
        "1 can diced tomatoes",
        "2 tbsp heavy cream",
        "Fresh cilantro",
      ],
      instructions: [
        "Marinate chicken in yogurt and spices for 30 minutes",
        "Cook chicken until browned",
        "Sauté onions and garlic",
        "Add tomatoes and coconut milk",
        "Simmer until sauce thickens",
      ],
    },
    {
      name: "Chocolate Chip Cookies",
      description:
        "Soft and chewy cookies loaded with chocolate chips and a hint of vanilla.",
      prepTime: 15,
      cookTime: 12,
      servings: 24,
      ingredients: [
        "2 1/4 cups all-purpose flour",
        "1 cup butter, softened",
        "3/4 cup granulated sugar",
        "3/4 cup brown sugar",
        "2 large eggs",
        "1 tsp vanilla extract",
        "1 tsp baking soda",
        "1/2 tsp salt",
        "2 cups chocolate chips",
      ],
      instructions: [
        "Cream butter and sugars until fluffy",
        "Add eggs and vanilla, mix well",
        "Combine dry ingredients",
        "Fold in chocolate chips",
        "Drop spoonfuls onto baking sheet",
        "Bake at 375°F for 10-12 minutes",
      ],
    },
    {
      name: "Beef Stir Fry",
      description:
        "Quick and flavorful beef with colorful vegetables in a savory sauce.",
      prepTime: 20,
      cookTime: 10,
      servings: 4,
      ingredients: [
        "1 lb beef sirloin, sliced",
        "2 cups mixed vegetables",
        "3 tbsp soy sauce",
        "2 tbsp oyster sauce",
        "1 tbsp cornstarch",
        "2 cloves garlic, minced",
        "1 tbsp ginger, minced",
        "2 tbsp vegetable oil",
      ],
      instructions: [
        "Slice beef thinly against the grain",
        "Prepare sauce mixture",
        "Stir-fry beef until browned",
        "Add vegetables and stir-fry",
        "Pour in sauce and thicken",
      ],
    },
    {
      name: "Caesar Salad",
      description:
        "Fresh romaine lettuce with classic Caesar dressing, croutons, and parmesan cheese.",
      prepTime: 10,
      cookTime: 5,
      servings: 4,
      ingredients: [
        "2 heads romaine lettuce",
        "1/2 cup parmesan cheese",
        "1 cup croutons",
        "2 tbsp lemon juice",
        "1 tbsp Dijon mustard",
        "1 clove garlic, minced",
        "1/4 cup olive oil",
        "Salt and pepper to taste",
      ],
      instructions: [
        "Wash and chop romaine lettuce",
        "Make dressing with lemon, mustard, and garlic",
        "Toss lettuce with dressing",
        "Add croutons and parmesan",
        "Season with salt and pepper",
      ],
    },
  ];

  // Pick a random recipe
  const randomRecipe =
    randomRecipes[Math.floor(Math.random() * randomRecipes.length)];

  try {
    const recipe = await root.services.recipesService.createRecipe({
      dietaryRestrictions: dietaryRestrictions || null,
      visibility: visibility,
      initialRecipeVersion: {
        userId: user.id,
        generatedName: randomRecipe.name,
        version: 1,
        description: randomRecipe.description,
        prepTime: randomRecipe.prepTime,
        cookTime: randomRecipe.cookTime,
        servings: randomRecipe.servings,
        ingredients: randomRecipe.ingredients,
        instructions: randomRecipe.instructions,
        createdAt: new Date(),
      },
      initialRecipePrompt: {
        userId: user.id,
        message: "Create a recipe",
        createdAt: new Date(),
      },
    });

    logger.info(`Created recipe ${recipe.id} for user ${user.id}`);

    return c.json(recipe, 200);
  } catch (error) {
    logger.error("Error creating recipe", { error });
    throw new HTTPException({
      reason: "INTERNAL_SERVER_ERROR",
      message: "Failed to create recipe",
    });
  }
};

export const CreateRecipe = {
  route,
  handler,
};
