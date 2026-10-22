/**
 * Extra words a food search should also look for. Each key is a normalized
 * search term (lowercase, single spaces); its values are other spellings,
 * dishes or styles that someone searching for the key would want to see.
 *
 * Groups listed in SAME_MEANING apply in every direction ("bbq" finds
 * "barbecue" and "barbecue" finds "bbq"). RELATED applies one way only:
 * "noodles" finds ramen, but "ramen" should not find every noodle shop.
 */
const SAME_MEANING: string[][] = [
  ["filipino", "pinoy", "filipina"],
  ["bbq", "barbecue", "barbeque", "bar b q"],
  ["donut", "doughnut"],
  ["boba", "bubble tea", "milk tea"],
  ["kebab", "kabob", "kebob", "kabab", "kebap"],
  ["shawarma", "shwarma", "shawerma"],
  ["gyro", "gyros"],
  ["sichuan", "szechuan", "szechwan"],
  ["omelet", "omelette"],
  ["ice cream", "gelato", "soft serve", "creamery"],
  ["vegetarian", "veggie", "meatless"],
  ["gluten free", "gluten friendly", "celiac"],
  ["breakfast", "brunch"],
  ["korean bbq", "kbbq"],
  ["hot pot", "hotpot", "shabu shabu"],
  ["bagel", "bagels"],
  ["taqueria", "taco", "tacos"],
  ["pizzeria", "pizza"],
  ["steakhouse", "steak"],
  ["dumpling", "dumplings", "potsticker", "potstickers", "gyoza", "momo", "momos", "xiao long bao"],
  ["mezze", "mezza", "meze"],
];

const RELATED: Record<string, string[]> = {
  // Dishes and formats
  noodles: ["ramen", "pho", "udon", "soba", "lo mein", "chow mein", "pad thai", "khao soi",
    "hand pulled", "knife cut", "dan dan", "vermicelli", "rice noodle", "noodle"],
  soup: ["pho", "ramen", "stew", "gumbo", "hot pot", "noodle soup", "pozole", "menudo", "soups"],
  curry: ["masala", "tikka", "vindaloo", "korma", "massaman", "panang", "khao soi", "curries"],
  seafood: ["fish", "oyster", "shrimp", "prawn", "crab", "lobster", "sushi", "poke", "ceviche",
    "crudo", "clam", "mussel", "seafood boil", "calamari"],
  fish: ["seafood", "sushi", "poke", "ceviche"],
  sushi: ["nigiri", "sashimi", "maki", "omakase", "chirashi"],
  sandwich: ["sandwiches", "banh mi", "torta", "hoagie", "panini", "reuben", "deli"],
  burger: ["burgers", "hamburger", "cheeseburger", "smashburger"],
  chicken: ["wings", "rotisserie", "yakitori"],
  "fried chicken": ["chicken and waffles", "chicken sandwich", "korean fried chicken"],
  wings: ["chicken wings"],
  dumpling: ["dim sum", "har gow", "siu mai", "bao"],
  pasta: ["spaghetti", "lasagna", "ravioli", "gnocchi", "tagliatelle", "pappardelle", "pastas"],
  salad: ["salads", "bowls"],
  dessert: ["desserts", "bakery", "pastry", "pastries", "ice cream", "gelato", "donut",
    "doughnut", "cookie", "tiramisu", "churro", "shave ice", "nata", "crepe", "sweets", "treats"],
  sweets: ["dessert", "bakery", "pastry", "pastries", "ice cream", "donut", "doughnut", "treats"],
  bakery: ["bakeries", "pastry", "pastries", "bread", "croissant", "bakesale"],
  pastry: ["pastries", "bakery", "croissant", "nata"],
  breakfast: ["pancake", "waffle", "eggs", "omelet", "omelette", "benedict", "bagel", "french toast",
    "chilaquiles", "diner"],
  coffee: ["cafe", "espresso", "latte", "cappuccino", "roaster"],
  cafe: ["coffee", "espresso", "latte"],
  tea: ["matcha", "chai", "boba"],
  drinks: ["bar", "cocktail", "wine", "beer", "brewery", "pub", "taproom", "lounge"],
  bar: ["cocktail", "wine bar", "pub", "brewpub", "taproom", "lounge", "tiki"],
  cocktails: ["cocktail", "bar", "lounge", "tiki"],
  beer: ["brewery", "brewpub", "taproom", "beer garden", "pub", "brews"],
  wine: ["wine bar", "natural wine"],
  vegan: ["plant based"],
  vegetarian: ["vegan", "plant based", "falafel"],
  healthy: ["salad", "bowls", "juice", "organic", "vegan", "poke"],
  "late night": ["late-night", "open late"],
  spicy: ["sichuan", "szechuan", "chili", "chile", "hot pot"],
  // Cuisines → signature dishes and regional styles
  italian: ["pizza", "pasta", "trattoria", "osteria", "pizzeria", "tuscan", "sicilian"],
  mexican: ["taco", "taqueria", "burrito", "tamale", "mole", "quesadilla", "enchilada",
    "masa", "carnitas", "birria", "torta"],
  japanese: ["sushi", "ramen", "izakaya", "yakitori", "udon", "tempura", "teriyaki", "donburi",
    "omakase", "robata"],
  chinese: ["dim sum", "sichuan", "szechuan", "cantonese", "peking duck", "hand pulled",
    "dan dan", "mapo", "hunan", "guilin", "lanzhou"],
  indian: ["tandoori", "naan", "biryani", "masala", "dosa", "chaat", "tikka", "samosa"],
  thai: ["pad thai", "larb", "khao soi", "isaan", "tom yum"],
  korean: ["bibimbap", "bulgogi", "tteokbokki", "kimchi", "galbi", "kbbq", "korean bbq"],
  vietnamese: ["pho", "banh mi", "hu tieu"],
  greek: ["gyro", "souvlaki", "mediterranean"],
  "middle eastern": ["mediterranean", "lebanese", "persian", "palestinian", "turkish", "falafel",
    "shawarma", "hummus", "kebab", "afghan", "mezze"],
  mediterranean: ["greek", "lebanese", "middle eastern", "falafel", "hummus", "mezze", "turkish"],
  latin: ["latin american", "peruvian", "colombian", "cuban", "puerto rican", "salvadoran",
    "venezuelan", "guatemalan", "chapin", "arepa", "empanada", "pupusa"],
  "latin american": ["peruvian", "colombian", "cuban", "puerto rican", "salvadoran", "venezuelan",
    "guatemalan", "arepa", "empanada", "pupusa"],
  caribbean: ["haitian", "jamaican", "cuban", "puerto rican", "trinidadian", "tiki"],
  african: ["ethiopian", "eritrean", "algerian", "moroccan", "nigerian", "senegalese"],
  "soul food": ["southern", "creole", "cajun", "fried chicken", "chicken and waffles"],
  southern: ["soul food", "cajun", "creole", "louisiana", "fried chicken", "biscuit"],
  cajun: ["creole", "louisiana", "gumbo", "jambalaya", "seafood boil", "boil"],
  creole: ["cajun", "louisiana", "gumbo", "jambalaya"],
  hawaiian: ["poke", "loco moco", "musubi", "shave ice"],
  himalayan: ["nepali", "tibetan", "momo"],
  nepali: ["momo"],
  "food truck": ["food trucks", "truck"],
};

const TERMS = new Map<string, Set<string>>();

function addTerms(key: string, values: string[]) {
  const set = TERMS.get(key) ?? new Set<string>();
  for (const value of values) if (value !== key) set.add(value);
  TERMS.set(key, set);
}

for (const group of SAME_MEANING) {
  for (const term of group) addTerms(term, group);
}
for (const [term, values] of Object.entries(RELATED)) addTerms(term, values);

/** Known search terms, longest first, for spotting phrases like "dim sum". */
export const KNOWN_PHRASES = [...TERMS.keys()]
  .filter((term) => term.includes(" "))
  .sort((a, b) => b.length - a.length);

export function relatedTerms(term: string): readonly string[] {
  return [...(TERMS.get(term) ?? [])];
}

export function knownSingleWordTerms(): string[] {
  return [...TERMS.keys()].filter((term) => !term.includes(" "));
}
