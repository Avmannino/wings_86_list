/**
 * WINGS ARENA - 86 LIST INVENTORY
 *
 * Each category holds items, or \`sections\` (titled sub-groups such as
 * Chips / Bars / Candy) that each hold items. An item is either:
 *
 *   STANDALONE  { id, label, note?, image?, icon? }
 *     → shown with its own Low / Out checkboxes.
 *
 *   PRODUCT WITH FLAVORS  group(id, label, [flavors], { note?, image?, icon? })
 *     → shown as a dropdown; only the flavors have checkboxes.
 *
 * id    = unique identifier used to save stock status
 * label = visible name (for flavors, just the flavor: "Red", "Orange")
 * note  = optional smaller text under the name
 * image = optional photo in public/items/ (see public/items/CREDITS.md)
 * icon  = emoji shown when there is no photo
 *
 * IMPORTANT:
 * Keep an item's ID the same after it has been created.
 * You can change its label without losing its saved status.
 */

// Shorthand for a photo stored in public/items/<id>.jpg
const photo = (id) => `items/${id}.jpg`;

// Build a product with flavors. Flavors without their own photo or emoji
// reuse the product photo; the product uses its first flavor photo if it
// has none of its own.
function group(id, label, flavors, extra = {}) {
  const image = extra.image ?? flavors.find((f) => f.image)?.image;

  return {
    id,
    label,
    ...extra,
    image,
    variants: flavors.map((flavor) => ({
      ...flavor,
      fullLabel: `${label} – ${flavor.label}`,
      image: flavor.image ?? (flavor.icon ? undefined : image),
      icon: flavor.icon ?? extra.icon,
    })),
  };
}

export const INVENTORY = [
  {
    id: 'drinks',
    title: 'Drinks',
    icon: '🥤',
    sections: [
      {
        id: 'cold-drinks',
        title: 'Cold Drinks',
        items: [
          group('celsius', 'Celsius', [
            { id: 'celsius-peach', label: 'Peach' },
            { id: 'celsius-arctic-vibe', label: 'Arctic Vibe', image: photo('celsius-arctic-vibe') },
            { id: 'celsius-tropical-vibe', label: 'Tropical Vibe' },
          ], { image: photo('celsius') }),

          group('pure-leaf', 'Pure Leaf', [
            { id: 'pure-leaf-sweet', label: 'Sweet Tea', image: photo('pure-leaf-sweet') },
            { id: 'pure-leaf-lemon', label: 'Tea & Lemon', image: photo('pure-leaf-lemon') },
            { id: 'pure-leaf-unsweetened', label: 'Unsweetened', image: photo('pure-leaf-unsweetened') },
          ]),

          group('gatorade', 'Gatorade', [
            { id: 'gatorade-red', label: 'Red', image: photo('gatorade-red') },
            { id: 'gatorade-blue', label: 'Blue', image: photo('gatorade-blue') },
            { id: 'gatorade-yellow', label: 'Yellow', image: photo('gatorade-yellow') },
            { id: 'gatorade-zero-orange', label: 'Zero – Orange', image: photo('gatorade-zero-orange') },
            { id: 'gatorade-zero-white', label: 'Zero – White', image: photo('gatorade-zero-white') },
            { id: 'gatorade-zero-blue', label: 'Zero – Blue', image: photo('gatorade-zero-blue') },
            { id: 'gatorade-zero-glacier-freeze', label: 'Zero – Glacier Freeze', image: photo('gatorade-zero-glacier-freeze') },
            { id: 'gatorade-zero-purple', label: 'Zero – Purple' },
          ], { image: photo('gatorade-blue') }),

          group('gatorlyte', 'Gatorlyte', [
            { id: 'gatorlyte-strawberry-kiwi', label: 'Strawberry Kiwi', image: photo('gatorlyte-strawberry-kiwi') },
            { id: 'gatorlyte-orange', label: 'Orange', image: photo('gatorlyte-orange') },
            { id: 'gatorlyte-mixed-berry', label: 'Mixed Berry', image: photo('gatorlyte-mixed-berry') },
            { id: 'gatorlyte-white', label: 'White' },
            { id: 'gatorlyte-glacier-freeze', label: 'Glacier Freeze' },
          ]),

          { id: 'aquafina', label: 'Aquafina Water', image: photo('aquafina') },

          group('muscle-milk', 'Muscle Milk', [
            { id: 'muscle-milk-vanilla', label: 'Vanilla', icon: '🥛' },
            { id: 'muscle-milk-chocolate', label: 'Chocolate', image: photo('muscle-milk-chocolate') },
          ]),

          group('tropicana', 'Tropicana', [
            { id: 'tropicana-orange', label: 'Orange', image: photo('tropicana-orange') },
            { id: 'tropicana-apple', label: 'Apple', image: photo('tropicana-apple') },
          ]),

          group('natalies', 'Natalie’s Juices', [
            { id: 'natalies-orange', label: 'Orange', icon: '🍊' },
            { id: 'natalies-tangerine', label: 'Tangerine', icon: '🍊' },
            { id: 'natalies-strawberry-lemonade', label: 'Strawberry Lemonade', icon: '🍓' },
          ], { icon: '🧃' }),

          group('bubly', 'bubly', [
            { id: 'bubly-lime', label: 'Lime', image: photo('bubly-lime') },
            { id: 'bubly-blackberry', label: 'Blackberry', image: photo('bubly-blackberry') },
          ]),

          { id: 'naked-green-machine', label: 'Naked – Green Machine', image: photo('naked-green-machine') },

          group('propel', 'Propel', [
            { id: 'propel-grape', label: 'Grape', image: photo('propel-grape') },
            { id: 'propel-kiwi-strawberry', label: 'Kiwi Strawberry', image: photo('propel-kiwi-strawberry') },
            { id: 'propel-watermelon', label: 'Watermelon', image: photo('propel-watermelon') },
            { id: 'propel-strawberry-lemonade', label: 'Strawberry Lemonade', image: photo('propel-strawberry-lemonade') },
            { id: 'propel-berry', label: 'Berry', image: photo('propel-berry') },
          ]),
        ],
      },

      {
        id: 'coffee-hot-chocolate',
        title: 'Coffee & Hot Chocolate',
        items: [
          group('bonjo', 'Bonjo', [
            { id: 'bonjo-coffee', label: 'Coffee', icon: '☕' },
            { id: 'bonjo-hot-chocolate', label: 'Hot Chocolate', icon: '🍫' },
          ], { icon: '☕' }),

          group('califia', 'Califia', [
            { id: 'califia-oat-milk', label: 'Oat Milk' },
            { id: 'califia-almond-milk', label: 'Almond Milk' },
          ], { icon: '🥛' }),

          { id: 'half-and-half', label: 'Half & Half', icon: '🥛' },
          { id: 'whole-milk', label: 'Whole Milk', icon: '🥛' },
        ],
      },
    ],
  },

  {
    id: 'food',
    title: 'Food & Snacks',
    icon: '🍪',
    sections: [
      {
        id: 'fresh',
        title: 'Fresh',
        items: [
          group('yogurt-cups', 'Yogurt Cups', [
            { id: 'yogurt-greek-blueberry', label: 'Blueberry Greek', icon: '🫐' },
            { id: 'yogurt-greek-vanilla', label: 'Vanilla Greek', image: photo('yogurt-greek-vanilla') },
            { id: 'yogurt-lowfat-strawberry', label: 'Strawberry Low-Fat', image: photo('yogurt-lowfat-strawberry') },
          ]),

          group('dilly-bites', 'Dilly Bites', [
            { id: 'dilly-bites-plain', label: 'Plain' },
            { id: 'dilly-bites-medium', label: 'Medium' },
            { id: 'dilly-bites-hot', label: 'Hot' },
          ], { note: 'Fresh-cut pickle snacking bites', image: photo('dilly-bites') }),

          group('hummus-pretzels', 'Hummus with Pretzels', [
            { id: 'hummus-classic-pretzels', label: 'Classic' },
            { id: 'hummus-red-pepper-pretzels', label: 'Roasted Red Pepper', icon: '🫑' },
          ], { icon: '🥨' }),

          { id: 'string-cheese', label: 'String Cheese', icon: '🧀' },

          group('olli', 'Olli Snack Packs', [
            { id: 'olli-pepperoni-cheese', label: 'Pepperoni & Cheese', icon: '🍕' },
            { id: 'olli-salami-cheese', label: 'Salami & Cheese' },
          ], { icon: '🧀' }),

          group('yoggies', 'Yoggies', [
            { id: 'yoggies-strawberry', label: 'Strawberry' },
            { id: 'yoggies-mixed-berry', label: 'Mixed Berry' },
          ], { image: photo('yoggies') }),
        ],
      },

      {
        id: 'breakfast',
        title: 'Breakfast',
        items: [
          group('oatmeal', 'Oatmeal', [
            { id: 'oatmeal-apple', label: 'Apple', icon: '🍎' },
            { id: 'oatmeal-maple-brown-sugar', label: 'Maple Brown Sugar' },
          ], { icon: '🥣' }),

          group('crumb-cake', 'Crumb Cake', [
            { id: 'crumb-cake-cinnamon', label: 'Cinnamon' },
            { id: 'crumb-cake-almond', label: 'Almond' },
            { id: 'crumb-cake-lemon', label: 'Lemon', icon: '🍋' },
          ], { icon: '🍰' }),
        ],
      },

      {
        id: 'chips',
        title: 'Chips & Bites',
        items: [
          group('doritos', 'Doritos', [
            { id: 'doritos-cool-ranch', label: 'Cool Ranch', image: photo('doritos-cool-ranch') },
            { id: 'doritos-nacho-cheese', label: 'Nacho Cheese', image: photo('doritos-nacho-cheese') },
          ]),

          { id: 'baked-lays', label: 'Baked Lay’s', image: photo('baked-lays') },
          { id: 'sunchips', label: 'SunChips', image: photo('sunchips') },
          { id: 'veggie-chips', label: 'Veggie Chips', image: photo('veggie-chips') },

          group('popcorners', 'PopCorners', [
            { id: 'popcorners-kettle-corn', label: 'Kettle Corn', image: photo('popcorners-kettle-corn') },
            { id: 'popcorners-spicy-queso', label: 'Spicy Queso', image: photo('popcorners-spicy-queso') },
          ]),

          { id: 'pirates-booty', label: 'Pirate’s Booty', image: photo('pirates-booty') },
          { id: 'smartfood-white-cheddar', label: 'Smartfood Popcorn', note: 'White Cheddar', image: photo('smartfood-white-cheddar') },
          { id: 'goldfish', label: 'Goldfish', note: 'Single', image: photo('goldfish') },
          { id: 'cheez-it', label: 'Cheez-It', image: photo('cheez-it') },
          { id: 'ritz-bits', label: 'Ritz Bits Minis', icon: '🧀' },
          { id: 'annies-bunnies', label: 'Annie’s Bunny Snacks', image: photo('annies-bunnies') },
          { id: 'animal-crackers', label: 'Animal Crackers', icon: '🦁' },
          { id: 'rold-gold-pretzels', label: 'Rold Gold Pretzel Bags', image: photo('rold-gold-pretzels') },
          { id: 'chex-mix', label: 'Chex Mix', image: photo('chex-mix') },
          { id: 'planters-peanuts-salted', label: 'Planters Peanuts', note: 'Salted', image: photo('planters-peanuts-salted') },
          { id: 'planters-trail-mix', label: 'Planters Trail Mix', image: photo('planters-trail-mix') },
          { id: 'oreos', label: 'Oreos', image: photo('oreos') },
          { id: 'little-bites', label: 'Little Bites', image: photo('little-bites') },
        ],
      },

      {
        id: 'bars',
        title: 'Bars',
        items: [
          group('kind-bars', 'KIND Bar', [
            { id: 'kind-dark-chocolate-sea-salt', label: 'Dark Chocolate Sea Salt', image: photo('kind-dark-chocolate-sea-salt') },
            { id: 'kind-caramel-almond', label: 'Caramel & Almond', image: photo('kind-caramel-almond') },
          ]),

          group('rxbar', 'RXBar', [
            { id: 'rxbar-blueberry', label: 'Blueberry', image: photo('rxbar-blueberry') },
            { id: 'rxbar-pb-chocolate', label: 'Peanut Butter Chocolate', image: photo('rxbar-pb-chocolate') },
          ]),

          { id: 'gatorade-protein-bar', label: 'Gatorade Protein Bars', image: photo('gatorade-protein-bar') },
          { id: 'aloha-bars', label: 'Aloha Bars', image: photo('aloha-bars') },
          { id: 'oats-honey-bars', label: 'Crunchy Oats & Honey Bars', image: photo('oats-honey-bars') },
          { id: 'rice-krispies-treats', label: 'Rice Krispies Treats', icon: '🍚' },
        ],
      },

      {
        id: 'candy',
        title: 'Candy',
        items: [
          { id: 'twix', label: 'Twix', image: photo('twix') },
          { id: 'snickers', label: 'Snickers', image: photo('snickers') },
          { id: 'reeses', label: 'Reese’s', image: photo('reeses') },
          { id: 'kit-kat', label: 'Kit Kat', image: photo('kit-kat') },

          group('mms', 'M&M’s', [
            { id: 'mms-peanut', label: 'Peanut', image: photo('mms') },
            { id: 'mms-original', label: 'Original', icon: '🍬' },
          ]),
        ],
      },

      {
        id: 'other-snacks',
        title: 'Other Snacks',
        items: [
          { id: 'motts-applesauce', label: 'Mott’s Applesauce', image: photo('motts-applesauce') },
          { id: 'nutella-and-go', label: 'Nutella & GO!', image: photo('nutella-and-go') },
        ],
      },
    ],
  },

  {
    id: 'smoothies',
    title: 'Smoothies',
    icon: '🥤',
    items: [
      { id: 'smoothie-strawberries', label: 'Strawberries', icon: '🍓' },
      { id: 'smoothie-bananas', label: 'Bananas', icon: '🍌' },
      { id: 'smoothie-mangos', label: 'Mangos', icon: '🥭' },
      { id: 'smoothie-pineapples', label: 'Pineapples', icon: '🍍' },
      { id: 'smoothie-mixed-berries', label: 'Mixed Berries', icon: '🫐' },
      { id: 'smoothie-apple-juice', label: 'Apple Juice', icon: '🍎' },
      { id: 'smoothie-orange-juice', label: 'Orange Juice', icon: '🍊' },
    ],
  },

  {
    id: 'supplies',
    title: 'Supplies',
    variantWord: 'types', // dropdowns say "3 types" instead of "3 flavors"
    icon: '📦',
    sections: [
      {
        id: 'supplies-general',
        title: null,
        items: [
          { id: 'paper-goods', label: 'Paper Goods', note: 'cups, plates, bowls, towels', icon: '🍽️' },
          { id: 'napkins', label: 'Napkins', icon: '🧻' },
          group('cups', 'Cups', [
            { id: 'cups-smoothie', label: 'Smoothie Cups', icon: '🥤' },
            { id: 'cups-coffee', label: 'Coffee Cups', icon: '☕' },
            { id: 'cups-soup', label: 'Soup Cups', icon: '🍲' },
          ], { icon: '🥤' }),

          group('lids', 'Lids', [
            { id: 'lids-coffee', label: 'Coffee Lids', icon: '☕' },
            { id: 'lids-smoothie', label: 'Smoothie Lids', icon: '🥤' },
            { id: 'lids-pasta', label: 'Pasta Lids', icon: '🍝' },
            { id: 'lids-soup', label: 'Soup Lids', icon: '🍲' },
          ], { icon: '🫙' }),
          { id: 'straws', label: 'Straws', icon: '🥢' },
        ],
      },

      {
        id: 'food-beverage-supplies',
        title: 'Food & Beverage',
        items: [
          { id: 'coffee-stir-sticks', label: 'Coffee Stir Sticks', icon: '🪵' },
          { id: 'coffee-sleeves', label: 'Coffee Sleeves', icon: '☕' },
          { id: 'forks', label: 'Forks', icon: '🍴' },
          { id: 'spoons', label: 'Spoons', icon: '🥄' },
          { id: 'knives', label: 'Knives', icon: '🔪' },
          { id: 'latex-gloves', label: 'Latex Gloves', icon: '🧤' },
        ],
      },
    ],
  },

  {
    id: 'misc',
    title: 'Misc.',
    variantWord: 'types',
    icon: '🏷️',
    items: [
      { id: 'skate-rental-tags', label: 'Skate Rental Tags', icon: '🏷️' },
      { id: 'raffle-tickets', label: 'Raffle Tickets', icon: '🎟️' },
      { id: 'markers', label: 'Markers', note: 'Sharpies', icon: '🖊️' },
      { id: 'tape', label: 'Tape', icon: '🩹' },
    ],
  },
];

// Categories without sub-groups get a single untitled section, and every
// category gets a flat \`items\` list built from its sections.
for (const category of INVENTORY) {
  category.sections ??= [
    { id: `${category.id}-all`, title: null, items: category.items },
  ];
  category.items = category.sections.flatMap((section) => section.items);
}

// Every checkable entry (standalone items and flavors).
export const ALL_ITEMS = INVENTORY.flatMap((category) =>
  category.items.flatMap((item) => item.variants ?? [item])
);

// Prevent duplicate IDs (checkable items and product groups).
const ids = [
  ...ALL_ITEMS.map((item) => item.id),
  ...INVENTORY.flatMap((category) =>
    category.items.filter((item) => item.variants).map((item) => item.id)
  ),
];

if (new Set(ids).size !== ids.length) {
  throw new Error(
    'Duplicate inventory IDs found in src/data/inventory.js'
  );
}
