/**
 * Prediction market categories and grouping.
 * Kalshi only provides flat category names per series (no hierarchy).
 * We define a small set of "category groups" and map Kalshi categories into them.
 */

/** Display order for our top-level groups (fewer, clearer sections) */
export const CATEGORY_GROUPS = [
  {
    id: "sports",
    label: "Sports",
    description: "Pro and college sports, leagues, awards",
    kalshiCategories: ["Sports"],
  },
  {
    id: "politics-elections",
    label: "Politics & Elections",
    description: "Elections, government, policy",
    kalshiCategories: ["Politics", "Elections"],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    description: "Music, TV, awards, pop culture",
    kalshiCategories: ["Entertainment"],
  },
  {
    id: "finance",
    label: "Finance & Crypto",
    description: "Economics, markets, crypto",
    kalshiCategories: ["Economics", "Crypto"],
  },
  {
    id: "science-world",
    label: "Science & World",
    description: "Climate, weather, world events",
    kalshiCategories: ["Climate and Weather", "Science", "World"],
  },
  {
    id: "other",
    label: "Other",
    description: "Mentions and other topics",
    kalshiCategories: ["Mentions", "Other"],
  },
] as const;

/** All Kalshi category names we know about (for ordering and slug lookup) */
export const CATEGORY_ORDER = [
  "Sports",
  "Politics",
  "Elections",
  "Entertainment",
  "Economics",
  "Climate and Weather",
  "Crypto",
  "Science",
  "World",
  "Mentions",
  "Other",
] as const;

/** Map Kalshi category name → our group id */
const KALSHI_CATEGORY_TO_GROUP = new Map<string, string>();
for (const group of CATEGORY_GROUPS) {
  for (const cat of group.kalshiCategories) {
    KALSHI_CATEGORY_TO_GROUP.set(cat, group.id);
  }
}

export function getGroupForKalshiCategory(kalshiCategory: string): string {
  const normalized = kalshiCategory?.trim() || "Other";
  return KALSHI_CATEGORY_TO_GROUP.get(normalized) ?? "other";
}

export function getGroupById(id: string) {
  return CATEGORY_GROUPS.find((g) => g.id === id);
}

/** Kalshi categories that belong to a group (for display) */
export function getKalshiCategoriesInGroup(groupId: string): string[] {
  const group = CATEGORY_GROUPS.find((g) => g.id === groupId);
  return group ? [...group.kalshiCategories] : [];
}

/** "Climate and Weather" -> "climate-and-weather" */
export function categoryToSlug(categoryName: string): string {
  return categoryName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** "climate-and-weather" -> "Climate and Weather" (best-effort) */
export function slugToCategoryName(slug: string): string {
  const decoded = slug.replace(/-/g, " ");
  const match = CATEGORY_ORDER.find(
    (c) => categoryToSlug(c) === slug || categoryToSlug(c) === decoded.toLowerCase()
  );
  if (match) return match;
  return decoded.replace(/\b\w/g, (c) => c.toUpperCase());
}
