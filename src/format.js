const fs = require('fs')
const {pick} = require('@devoxa/flocky')

// This script ensures that all recipes are following a consistent key order
// Run: `yarn recipes:format` (or `yarn recipes:format --check` to fail when re-formatting is required)

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

  'decoration_data_hash',

  'force_use_recipe'
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
  const WRITE = !process.argv.includes('--check')
  console.log(WRITE ? 'Formatting...' : 'Checking formatting...')

  const fileContent = fs.readFileSync('./recipes.json', 'utf-8')
  const input = JSON.parse(fileContent)

  const output = input.map(formatRecipe)

  if (WRITE) {
    fs.writeFileSync('./recipes.json', JSON.stringify(output, null, 2), 'utf-8')
    return
  }

  if (fileContent !== JSON.stringify(output, null, 2)) {
    console.log('Formatting issues found. Run `yarn recipes:format` to fix.')
    console.log('ADD NEW KEYS TO THE FORMATTER FIRST - THEY WILL GET DELETED.')
    process.exit(1)
  } else {
    console.log('File uses correct formatting!')
  }
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
