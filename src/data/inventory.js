
/**
 * WINGS ARENA - 86 LIST INVENTORY
 *
 * Edit the categories, groups, and items below.
 *
 * id    = unique identifier used to save stock status
 * title = category or product header
 * label = visible flavor or item name
 *
 * IMPORTANT:
 * Keep an item's ID the same after it has been created.
 * You can change its label without losing its saved status.
 *
 * All items below are temporary placeholders.
 */

export const INVENTORY = [
  {
    id: 'drinks',
    title: 'Drinks',
    groups: [
      {
        id: 'gatorade',
        title: 'Gatorade',
        items: [
          {
            id: 'gatorade-flavor-1',
            label: 'Flavor 1 (replace me)',
          },
          {
            id: 'gatorade-flavor-2',
            label: 'Flavor 2 (replace me)',
          },
          {
            id: 'gatorade-flavor-3',
            label: 'Flavor 3 (replace me)',
          },
        ],
      },
      {
        id: 'other-drinks',
        title: 'Other Drinks',
        items: [
          {
            id: 'drink-item-1',
            label: 'Drink item 1 (replace me)',
          },
        ],
      },
    ],
  },

  {
    id: 'food',
    title: 'Food',
    groups: [
      {
        id: 'snacks',
        title: 'Snacks',
        items: [
          {
            id: 'food-item-1',
            label: 'Food item 1 (replace me)',
          },
          {
            id: 'food-item-2',
            label: 'Food item 2 (replace me)',
          },
        ],
      },
    ],
  },

  {
    id: 'supplies',
    title: 'Supplies',
    groups: [
      {
        id: 'front-desk-supplies',
        title: 'Front Desk Supplies',
        items: [
          {
            id: 'supply-item-1',
            label: 'Supply item 1 (replace me)',
          },
          {
            id: 'supply-item-2',
            label: 'Supply item 2 (replace me)',
          },
        ],
      },
    ],
  },

  {
    id: 'misc',
    title: 'Misc',
    groups: [
      {
        id: 'other-items',
        title: 'Other Items',
        items: [
          {
            id: 'misc-item-1',
            label: 'Misc item 1 (replace me)',
          },
        ],
      },
    ],
  },
];

// Generate a flat list for counting all inventory items.
export const ALL_ITEMS = INVENTORY.flatMap((category) =>
  category.groups.flatMap((group) => group.items)
);

// Prevent duplicate item IDs.
const ids = ALL_ITEMS.map((item) => item.id);

if (new Set(ids).size !== ids.length) {
  throw new Error(
    'Duplicate inventory item IDs found in src/data/inventory.js'
  );
}
