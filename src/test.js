const fs = require('fs')
const z = require('zod')
const {pick, duplicates} = require('@devoxa/flocky')
const crypto = require('crypto')

// This script ensures that all recipes have a valid data structure
// Run: `npm run recipes:test`

const IngredientTypeSchema = z.enum(['Item', 'GuildUpgrade', 'Currency'])

const OFFICIAL_DISCIPLINES = [
  'Armorsmith',
  'Artificer',
  'Chef',
  'Huntsman',
  'Jeweler',
  'Leatherworker',
  'Scribe',
  'Tailor',
  'Weaponsmith',
  'Handiworker'
]

const DisciplineSchema = z.enum([
  ...OFFICIAL_DISCIPLINES,
  'Achievement',
  'Mystic Forge',
  'Merchant',
  'Double Click',
  'Charge',
  'Salvage',
  'Growing'
])

const RecipeSchema = z
  .object({
    $$hash: z.string(),
    $$duplicate: z.literal(false),

    id: z.number().int().min(1).optional(),
    name: z.string().min(1),
    output_item_id: z.number().int().min(1),
    output_item_count: z.number().min(0.1), // Allow RNG recipes with output < 1
    ingredients: z
      .array(
        z
          .object({
            count: z.number().int().min(1),
            type: IngredientTypeSchema,
            id: z.number().int().min(1),
            achievement_id: z.number().int().min(1).optional(),
            achievement_bit: z.number().int().min(0).optional()
          })
          .strict()
      )
      .min(1),
    disciplines: z.array(DisciplineSchema).min(1),
    min_rating: z.number().int().min(1).optional(),

    achievement_id: z.number().int().min(1).optional(),

    merchant: z
      .object({
        name: z.string().min(1),
        locations: z.array(z.string().min(1)).min(1)
      })
      .strict()
      .optional(),
    merchant_data_hash: z.string().optional(),

    decoration_data_hash: z.string().optional()
  })
  .strict()
  // When a recipe has an official discipline, it must have a min_rating
  .refine(
    data => {
      const hasOfficialDiscipline = data.disciplines.some(x =>
        OFFICIAL_DISCIPLINES.includes(x)
      )

      return (
        !hasOfficialDiscipline ||
        (hasOfficialDiscipline && data.min_rating !== undefined)
      )
    },
    {
      path: ['min_rating'],
      message: 'Required (because of disciplines)'
    }
  )
  // When a recipe has the Achievement discipline, it must have an achievement_id
  .refine(
    data => {
      return (
        !data.disciplines.includes('Achievement') ||
        data.achievement_id !== undefined
      )
    },
    {
      path: ['achievement_id'],
      message: 'Required (because of disciplines)'
    }
  )

main()
async function main() {
  console.log('Testing...')

  // Remove previous test errors
  if (fs.existsSync('./recipes.errors.json')) {
    fs.unlinkSync('./recipes.errors.json')
  }

  // Read the recipes file
  const fileContent = fs.readFileSync('./recipes.json', 'utf-8')
  let input = JSON.parse(fileContent)

  // Generate a unique hash for each recipe
  input = input.map(recipe => ({$$hash: generateRecipeHash(recipe), ...recipe}))
  const _duplicates = duplicates(input.map(recipe => recipe.$$hash))

  // Validate the recipe schemas
  const errors = []
  for (const _recipe of input) {
    const recipe = {
      $$hash: _recipe.$$hash,
      $$duplicate: _duplicates.includes(_recipe.$$hash),
      ..._recipe
    }

    const {error} = RecipeSchema.safeParse(recipe)

    if (error) {
      errors.push({
        $$errors: flattenErrors(error.format()),
        ...recipe
      })
    }
  }

  // Write the errors to a file
  if (errors.length > 0) {
    errors.sort((a, b) => a.$$hash.localeCompare(b.$$hash))
    fs.writeFileSync('./recipes.errors.json', JSON.stringify(errors, null, 2))

    console.log(`Found ${errors.length} errors in ${input.length} recipes`)
    console.log('Errors saved to recipes.errors.json')
    process.exit(1)
  } else {
    console.log(`No errors found in ${input.length} recipes`)
  }
}

function generateRecipeHash(_recipe) {
  // Simplify the recipe to only the keys that are needed to uniquely identify it
  const recipe = {
    ...pick(_recipe, ['id', 'output_item_id', 'output_item_count']),
    ingredients: _recipe.ingredients
      .map(ingredient => pick(ingredient, ['count', 'type', 'id']))
      .sort((a, b) => a.id - b.id),

    // These _are_ technically not part of the unique identifier, but it's not a big deal
    // because we just pick the first available merchant of the duplicates.
    merchant: _recipe.merchant
      ? {
          ...pick(_recipe.merchant, ['name']),
          locations: _recipe.merchant.locations.sort()
        }
      : null
  }

  // Hash the recipe
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(recipe))
    .digest('hex')
}

function flattenErrors(_errors, path = '') {
  const errors = []

  for (const key in _errors) {
    if (key === '_errors') {
      errors.push(..._errors._errors.map(error => `[${path}] ${error}`))
      continue
    }

    errors.push(...flattenErrors(_errors[key], `${path}.${key}`))
  }

  return errors
}
