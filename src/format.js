const fs = require('fs')
const {pick} = require('@devoxa/flocky')

// This script ensures that all recipes are following a consistent key order
// Run: `npm run format`

const KEY_ORDER = [
  'id',
  'name',
  'output_item_id',
  'output_item_count',
  'ingredients',

  'disciplines',
  'min_rating',

  'achievement_id',

  'merchant',
  'merchant_data_hash',

  'decoration_data_hash'
]

const INGREDIENT_KEY_ORDER = [
  'count',
  'type',
  'id',

  'achievement_id',
  'achievement_bit'
]

const MERCHANT_KEY_ORDER = ['name', 'locations']

main()
async function main() {
  console.log('Formatting...')

  const fileContent = fs.readFileSync('./recipes.json', 'utf-8')

  const input = JSON.parse(fileContent)
  const output = input.map(formatRecipe)

  fs.writeFileSync('./recipes.json', JSON.stringify(output, null, 2), 'utf-8')
}

function formatRecipe(input) {
  const recipe = pick(input, KEY_ORDER)

  recipe.ingredients = recipe.ingredients.map(ingredient =>
    pick(ingredient, INGREDIENT_KEY_ORDER)
  )

  recipe.disciplines = recipe.disciplines.sort()

  if (input.merchant) {
    recipe.merchant = pick(input.merchant, MERCHANT_KEY_ORDER)
  }

  return recipe
}
