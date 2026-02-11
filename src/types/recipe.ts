import { DifficultyLevel, CookingMethod } from './database'

export interface RecipeFilters {
  search: string
  sauceType: string
  doughStyle: string
  cookingMethod: string
  difficulty: string
  isDietary: boolean
  sort: 'newest' | 'popular'
}

export interface RecipeSubmissionFormData {
  title: string
  description: string
  sauce_type: string
  cheese_types: string[]
  toppings: string[]
  dough_style: string
  cooking_method: CookingMethod
  difficulty: DifficultyLevel
  prep_notes: string
  image_url: string
  tags: string[]
  is_vegetarian: boolean
  is_vegan: boolean
  creator: string
}

export const SAUCE_TYPES = [
  'Tomato',
  'White / Bechamel',
  'Pesto',
  'BBQ',
  'Buffalo',
  'Garlic Butter',
  'Olive Oil',
  'Ranch',
  'Alfredo',
  'Hot Honey',
  'Vodka',
  'No Sauce',
  'Other',
]

export const DOUGH_STYLES = [
  'Neapolitan',
  'New York',
  'Detroit',
  'Chicago Deep Dish',
  'Sicilian',
  'Thin Crust',
  'Stuffed Crust',
  'Cauliflower',
  'Gluten-Free',
  'Sourdough',
  'Focaccia',
  'Flatbread',
  'Dessert / Sweet',
  'Other',
]

export const COMMON_CHEESES = [
  'Mozzarella',
  'Burrata',
  'Ricotta',
  'Parmesan',
  'Pecorino',
  'Gouda',
  'Cheddar',
  'Gorgonzola',
  'Fontina',
  'Provolone',
  'Goat Cheese',
  'Cream Cheese',
  'Vegan Cheese',
]

export const POPULAR_TOPPINGS = [
  'Pepperoni',
  'Mushrooms',
  'Onions',
  'Sausage',
  'Bacon',
  'Prosciutto',
  'Bell Peppers',
  'Olives',
  'Jalape\u00f1os',
  'Basil',
  'Arugula',
  'Spinach',
  'Pineapple',
  'Anchovies',
  'Artichoke Hearts',
  'Sun-dried Tomatoes',
  'Caramelized Onions',
  'Roasted Garlic',
  'Fresh Tomatoes',
  'Hot Honey',
  'Truffle Oil',
  'Nduja',
  'Pickles',
  'Corn',
  'Egg',
]

export const COOKING_METHOD_LABELS: Record<CookingMethod, string> = {
  oven: 'Oven',
  wood_fired: 'Wood Fired',
  grill: 'Grill',
  skillet: 'Skillet',
  deep_fried: 'Deep Fried',
  air_fryer: 'Air Fryer',
  no_bake: 'No Bake',
  other: 'Other',
}

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
}
