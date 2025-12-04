/**
 * Image URL Helper Module
 * Provides dynamic image URL generation with fallback support
 */

// Default fallback image path (relative to project root)
const DEFAULT_IMAGE_URL = "images/no-image.png";

/**
 * Get product image URL for an item
 * Priority: 1) Explicit imageUrl/image array, 2) Pollinations.ai generated URL
 * @param {Object|string} itemOrName - Item object or product name string
 * @returns {string} Image URL
 */
function getProductImageUrl(itemOrName) {
  const name = typeof itemOrName === "string" 
    ? itemOrName 
    : (itemOrName?.title || itemOrName?.name || "商品");

  // 1) If item has an explicit image URL or array, use that first
  if (typeof itemOrName === "object" && itemOrName) {
    if (itemOrName.imageUrl) {
      return itemOrName.imageUrl;
    }
    if (Array.isArray(itemOrName.images) && itemOrName.images.length > 0) {
      // Find first non-placeholder image, or use first image if none found
      const validImage = itemOrName.images.find(img => 
        img && !img.includes('via.placeholder.com') && !img.includes('9c3aaf7')
      );
      if (validImage) {
        return validImage;
      }
      // If all images are placeholders, fall through to generate AI image
    }
  }

  // 2) Otherwise build a Pollinations URL based on the name
  const encodedName = encodeURIComponent(name);
  return `https://image.pollinations.ai/prompt/${encodedName}?width=400&height=400&nologo=true`;
}

/**
 * Attach fallback handler to an image element
 * Prevents infinite loops by tracking if fallback has been applied
 * @param {HTMLImageElement} imgElement - The image element to attach fallback to
 */
function attachImageFallback(imgElement) {
  if (!imgElement) return;
  
  // Store original src before any changes
  if (!imgElement.dataset.originalSrc) {
    imgElement.dataset.originalSrc = imgElement.src || '';
  }
  
  imgElement.onerror = function() {
    // Avoid infinite loop if DEFAULT_IMAGE_URL also fails
    if (imgElement.dataset.fallbackApplied === "true") {
      // If default image also fails, stop trying
      imgElement.onerror = null;
      imgElement.style.display = 'none';
      return;
    }
    
    imgElement.dataset.fallbackApplied = "true";
    imgElement.src = DEFAULT_IMAGE_URL;
  };
}

/**
 * Set image source with automatic fallback
 * Convenience function that combines getProductImageUrl and attachImageFallback
 * @param {HTMLImageElement} imgElement - The image element
 * @param {Object|string} itemOrName - Item object or product name string
 */
function setProductImage(imgElement, itemOrName) {
  if (!imgElement) return;
  
  imgElement.src = getProductImageUrl(itemOrName);
  attachImageFallback(imgElement);
}

