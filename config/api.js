const STATUS_FAILED = 0
const STATUS_SUCCESS = 1
const NO_MATCH_FOUND = 0
const MAX_TRANSACTION_LIMIT = 10
const MAX_TRANSACTION_20 = 20
const SORT_DESCENDING = -1
const UNAUTHORIZED = 401


const SUBSCRIPTION_DURATIONS = ["1M", "3M", "6M", "1Y", "2Y"];   // 1 Month, 3 Months, 6 Months, 1 Year
const MEMBERSHIP_TYPES = ["SILVER", "GOLD", "PLATINUM", "DIAMOND"];  // You can add more



const METRIC_UNITS = [
  "piece", "pieces",
  "gram", "grams",
  "kilogram", "kilograms",
  "ton", "tons",
  "milliliter", "milliliters",
  "liter", "liters",
  "meter", "meters",
  "centimeter", "centimeters",
  "square meter", "square meters",
  "cubic meter", "cubic meters",
  "cubic foot", "cubic feet",
  "roll", "rolls",
  "bag", "bags",
  "bag (bulk)", "bags (bulk)",
  "bale", "bales",
  "bamboo", "bamboo",
  "block carton", "block cartons",
  "box", "boxes",
  "bundle", "bundles",
  "bundle of paper", "bundles of paper",
  "bottle", "bottles",
  "bunch", "bunches",
  "carton", "cartons",
  "cup", "cups",
  "dozen", "dozens",
  "drum", "drums",
  "packet", "packets",
  "package", "packages",
  "pallet", "pallets",
  "pair", "pairs",
  "pouch", "pouches",
  "set", "sets",
  "sheet", "sheets",
  "table", "tables",
  "trolley", "trolleys",
  "foot", "feet",
  "yard", "yards",
  "fathom", "fathoms",
  "gallon", "gallons",
  "litre", "litres",
  "hour", "hours",
  "day", "days",
  "number", "numbers",
  "quintal", "quintals",
  "tonne", "tonnes",
  "metric ton", "metric tons",
  "air freight ton", "air freight tons",
  "ampere", "amperes",
  "amplitude", "amplitudes",
  "barometric", "barometric units",
  "indian rupee", "indian rupees"
];

MEDIA_TYPE = ["product", "banner", "licence", 'logo']

APPROVAL_STATUS = ["approved", "rejected", "pending", "blocked"]


module.exports = {
  STATUS_FAILED,
  STATUS_SUCCESS,
  NO_MATCH_FOUND,
  MAX_TRANSACTION_20,
  MAX_TRANSACTION_LIMIT,
  SORT_DESCENDING,
  UNAUTHORIZED,
  METRIC_UNITS,
  MEDIA_TYPE,
  APPROVAL_STATUS,
  SUBSCRIPTION_DURATIONS,
  MEMBERSHIP_TYPES
}
