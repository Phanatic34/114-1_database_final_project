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
    : (itemOrName?.title || itemOrName?.product_name || itemOrName?.name || "商品");

  // 1) If item has an explicit image URL or array, use that first
  if (typeof itemOrName === "object" && itemOrName) {
    // 檢查 imageUrl 屬性
    if (itemOrName.imageUrl) {
      // 檢查是否為 placeholder URL 或空字串
      if (itemOrName.imageUrl.includes('via.placeholder.com') || 
          itemOrName.imageUrl.includes('FFFFFF') ||
          itemOrName.imageUrl.includes('9c3aaf7') ||
          itemOrName.imageUrl.trim() === '') {
        // 如果是 placeholder 或空字串，使用 AI 生成圖片
        const encodedName = encodeURIComponent(name);
        return `https://image.pollinations.ai/prompt/${encodedName}?width=400&height=400&nologo=true`;
      }
      return itemOrName.imageUrl;
    }
    
    // 檢查 image_url 屬性（後端 API 返回的格式）
    if (itemOrName.image_url) {
      if (itemOrName.image_url.includes('via.placeholder.com') || 
          itemOrName.image_url.includes('FFFFFF') ||
          itemOrName.image_url.includes('9c3aaf7') ||
          itemOrName.image_url.trim() === '') {
        const encodedName = encodeURIComponent(name);
        return `https://image.pollinations.ai/prompt/${encodedName}?width=400&height=400&nologo=true`;
      }
      return itemOrName.image_url;
    }
    
    // 檢查 images 數組
    if (Array.isArray(itemOrName.images) && itemOrName.images.length > 0) {
      // Find first non-placeholder image, or use first image if none found
      const validImage = itemOrName.images.find(img => 
        img && 
        img.trim() !== '' &&
        !img.includes('via.placeholder.com') && 
        !img.includes('FFFFFF') &&
        !img.includes('9c3aaf7') &&
        !img.startsWith('FFFFFF')
      );
      if (validImage) {
        return validImage;
      }
      // If all images are placeholders or empty, fall through to generate AI image
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
    // Avoid infinite loop if fallback also fails
    if (imgElement.dataset.fallbackApplied === "true") {
      // 如果已經嘗試過 fallback，嘗試使用 AI 生成圖片
      if (imgElement.dataset.aiImageTried !== "true") {
        imgElement.dataset.aiImageTried = "true";
        const altText = imgElement.alt || '商品';
        const encodedName = encodeURIComponent(altText);
        imgElement.src = `https://image.pollinations.ai/prompt/${encodedName}?width=400&height=400&nologo=true`;
        return;
      }
      // 如果 AI 圖片也失敗，隱藏圖片
      imgElement.onerror = null;
      imgElement.style.display = 'none';
      return;
    }
    
    // 第一次失敗，嘗試使用預設圖片或 AI 生成圖片
    imgElement.dataset.fallbackApplied = "true";
    
    // 如果原始圖片是空的或無效的，直接使用 AI 生成圖片
    const originalSrc = imgElement.dataset.originalSrc || '';
    if (!originalSrc || originalSrc.trim() === '' || originalSrc.includes('no-image.png')) {
      const altText = imgElement.alt || '商品';
      const encodedName = encodeURIComponent(altText);
      imgElement.src = `https://image.pollinations.ai/prompt/${encodedName}?width=400&height=400&nologo=true`;
    } else {
      imgElement.src = DEFAULT_IMAGE_URL;
    }
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

