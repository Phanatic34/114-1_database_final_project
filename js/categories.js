/**
 * Centralized Category Definitions
 * This is the single source of truth for all categories in the marketplace
 */

const CATEGORIES = [
  "課本／學習用品",
  "筆電／3C",
  "手機／平板",
  "遊戲與主機",
  "宿舍家電與家具",
  "服飾／生活用品",
  "運動／興趣嗜好",
  "其他"
];

// Category mapping for backward compatibility (old category values -> new category names)
const CATEGORY_MAP = {
  // Old category values from data
  'games': '遊戲與主機',
  'game_console': '遊戲與主機',
  'console': '遊戲與主機',
  'electronics': '筆電／3C',
  'laptop_3c': '筆電／3C',
  'computer': '筆電／3C',
  'phone': '手機／平板',
  'phone_tablet': '手機／平板',
  'camera': '筆電／3C',
  'appliance': '宿舍家電與家具',
  'dorm_furniture': '宿舍家電與家具',
  'books': '課本／學習用品',
  'textbooks': '課本／學習用品',
  'clothing_life': '服飾／生活用品',
  'sports_hobby': '運動／興趣嗜好',
  'other': '其他',
  'others': '其他'
};

/**
 * Normalize category name to one of the 8 official categories
 * @param {string} category - Old or new category name
 * @returns {string} - Official category name
 */
function normalizeCategory(category) {
  if (!category) return '其他';
  
  // If already one of the official categories, return as-is
  if (CATEGORIES.includes(category)) {
    return category;
  }
  
  // Map old category values to new ones
  return CATEGORY_MAP[category] || '其他';
}

