/**
 * AutoStudyAI Content Script
 * Extracts educational content from web pages including slideshows, PDFs, and LMS pages.
 */

console.log("AutoStudyAI content script loaded");

// Slideshow selectors for various platforms
const SLIDESHOW_SELECTORS = {
  // Canvas LMS
  canvas: [
    '.slide-container',
    '.module-item-content',
    '[data-testid="slide"]',
    '.canvas-slideshow'
  ],
  // Google Slides (embedded)
  googleSlides: [
    'iframe[src*="docs.google.com/presentation"]',
    '.punch-viewer-content',
    '.slide-content'
  ],
  // PowerPoint Online
  powerpoint: [
    'iframe[src*="powerpoint"]',
    'iframe[src*="onedrive"]',
    '.pptx-viewer'
  ],
  // Prezi
  prezi: [
    'iframe[src*="prezi.com"]'
  ],
  // Generic slideshow indicators
  generic: [
    '.slideshow',
    '.slides',
    '.carousel',
    '.presentation',
    '[class*="slide"]',
    '[data-slide]'
  ]
};

// Navigation button selectors for slideshows
const SLIDESHOW_NAV_SELECTORS = {
  next: [
    // Common patterns
    '[aria-label*="Next"]',
    '[aria-label*="next"]',
    '[title*="Next"]',
    '[title*="next"]',
    'button.next',
    '.next-slide',
    '.slide-next',
    '[data-action="next"]',
    '[data-slide="next"]',
    '.slick-next',
    '.carousel-control-next',
    '.swiper-button-next',
    // Canvas specific
    '.slide-nav-next',
    '#next-slide',
    // Icons/arrows
    'button[class*="right"]',
    'button[class*="forward"]',
    '[class*="arrow-right"]',
    '[class*="chevron-right"]',
    // Generic
    'a.next',
    'span.next',
    'div.next'
  ],
  prev: [
    '[aria-label*="Previous"]',
    '[aria-label*="previous"]',
    '[aria-label*="Prev"]',
    '[title*="Previous"]',
    'button.prev',
    '.prev-slide',
    '.slide-prev',
    '[data-action="prev"]',
    '[data-slide="prev"]',
    '.slick-prev',
    '.carousel-control-prev',
    '.swiper-button-prev',
    '.slide-nav-prev',
    '#prev-slide'
  ]
};

// Slide counter patterns (to detect total slides)
const SLIDE_COUNTER_SELECTORS = [
  '.slide-counter',
  '.slide-number',
  '.slide-indicator',
  '[class*="slide-count"]',
  '[class*="page-count"]',
  '.pagination',
  '.carousel-indicators',
  '.slick-dots'
];

// LMS content selectors
const LMS_CONTENT_SELECTORS = [
  // Canvas
  '#content', '.ic-Layout-contentMain', '.module-item-content',
  // Blackboard
  '#contentPanel', '.vtbegenerated', '#content_listContainer',
  // Moodle
  '#region-main', '.course-content', '#page-content',
  // D2L Brightspace
  '.d2l-page-main', '.d2l-content-wrapper', '.d2l-htmlblock',
  // Schoology
  '.content-body', '.s-page-content', '.submitted-content',
  // Google Classroom
  '.Aopndd', '.tLDEHd', '.YVvGBb',
  // Generic
  'main', 'article', '[role="main"]', '.content', '#main-content'
];

/**
 * Sleep utility for async operations
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Containers that hold LMS page navigation (NOT slideshow controls)
// Buttons inside these should be ignored by slideshow detection
const LMS_NAV_EXCLUSIONS = [
  '.module-sequence-footer',      // Canvas module next/prev
  '.assignment-group-header',     // Canvas assignment nav
  '.student-assignment-overview', // Canvas assignment overview
  '#sequence_footer',             // Canvas sequence footer
  '.ic-app-nav-toggle-and-crumbs', // Canvas breadcrumb nav
  '.pagination',                  // Generic pagination
  '[role="navigation"]',          // Semantic nav regions
  'nav',                          // Nav elements
  '.course-nav',                  // Generic course nav
  '.module-navigation',           // Module navigation
];

/**
 * Check if an element is inside an LMS navigation container (not a slideshow)
 */
function isInsideLmsNav(el) {
  for (const sel of LMS_NAV_EXCLUSIONS) {
    if (el.closest(sel)) return true;
  }
  // Also check aria-label for LMS-specific patterns
  const label = (el.getAttribute('aria-label') || '').toLowerCase();
  if (label.includes('module') || label.includes('assignment') || label.includes('page')) {
    return true;
  }
  return false;
}

/**
 * Find the next slide button
 */
function findNextButton() {
  for (const selector of SLIDESHOW_NAV_SELECTORS.next) {
    const btn = document.querySelector(selector);
    if (btn && btn.offsetParent !== null && !isInsideLmsNav(btn)) {
      return btn;
    }
  }
  return null;
}

/**
 * Find the previous slide button
 */
function findPrevButton() {
  for (const selector of SLIDESHOW_NAV_SELECTORS.prev) {
    const btn = document.querySelector(selector);
    if (btn && btn.offsetParent !== null && !isInsideLmsNav(btn)) {
      return btn;
    }
  }
  return null;
}

/**
 * Detect total number of slides from various indicators
 */
function detectTotalSlides() {
  // Try to find "X of Y" or "X / Y" pattern in page text
  const pageText = document.body.innerText;

  // Pattern: "Slide 3 of 10", "3 of 10", "3/10", "Page 3 of 10"
  const patterns = [
    /(?:slide|page)?\s*(\d+)\s*(?:of|\/)\s*(\d+)/i,
    /(\d+)\s*\/\s*(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (match && match[2]) {
      const total = parseInt(match[2], 10);
      if (total > 0 && total < 200) { // Sanity check
        return total;
      }
    }
  }

  // Try counting slide indicators (dots, thumbnails)
  for (const selector of SLIDE_COUNTER_SELECTORS) {
    const counter = document.querySelector(selector);
    if (counter) {
      const dots = counter.querySelectorAll('li, button, span, div');
      if (dots.length > 1 && dots.length < 200) {
        return dots.length;
      }
    }
  }

  // Check for numbered elements
  const slideElements = document.querySelectorAll('[class*="slide"]:not([class*="slider"])');
  if (slideElements.length > 1 && slideElements.length < 50) {
    return slideElements.length;
  }

  return null; // Unknown
}

/**
 * Get current visible slide content
 */
function getCurrentSlideContent() {
  // Try various selectors for current/active slide
  const activeSelectors = [
    '.slide.active',
    '.slide.current',
    '.carousel-item.active',
    '.slick-current',
    '.swiper-slide-active',
    '[data-slide].active',
    '[class*="slide"][class*="active"]',
    '[class*="slide"][class*="current"]',
    '.slide-content',
    '.slide-body'
  ];

  for (const selector of activeSelectors) {
    const slide = document.querySelector(selector);
    if (slide && slide.innerText.trim().length > 10) {
      return slide.innerText.trim();
    }
  }

  // Fallback: find the main content area and get its text
  const container = findContentContainer();
  if (container) {
    // Try to isolate just the slide content (not navigation)
    const mainContent = container.querySelector('.slide, [class*="slide-content"], .presentation-content');
    if (mainContent) {
      return mainContent.innerText.trim();
    }
  }

  return '';
}

/**
 * Navigate through all slides and capture content
 * This is the main function for auto-capturing slideshows
 */
/**
 * Request a screenshot from the background service worker.
 * Returns base64 data URL or null.
 */
function requestScreenshot() {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ action: 'screenshotTab' }, response => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(response?.screenshot || null);
      });
    } catch (e) { resolve(null); }
  });
}

/**
 * Navigate to the first slide by clicking Previous until disabled.
 * Optimized: checks disabled state first, caps clicks at totalSlides, uses shorter sleep.
 */
async function goToFirstSlide(prevBtn, maxClicks) {
  if (!prevBtn) return;
  // Already at the beginning?
  if (prevBtn.disabled || prevBtn.classList.contains('disabled')) return;

  let clicks = 0;
  let lastContent = getCurrentSlideContent();
  while (clicks < maxClicks) {
    try {
      prevBtn.click();
      await sleep(200);
      clicks++;
      if (prevBtn.disabled || prevBtn.classList.contains('disabled')) break;
      // Also stop if content stopped changing (some slideshows don't disable buttons)
      const content = getCurrentSlideContent();
      if (content === lastContent && clicks > 1) break;
      lastContent = content;
    } catch (e) { break; }
  }
  await sleep(400); // Let first slide fully render
}

/**
 * Capture all slides in a single pass.
 * If withImages=true, takes screenshots of slides that have visual content
 * by messaging background.js directly (no popup round-trip per slide).
 */
async function captureAllSlides(withImages = false) {
  const slides = [];
  const images = [];
  const nextBtn = findNextButton();
  const prevBtn = findPrevButton();

  if (!nextBtn) {
    return {
      success: false,
      error: 'No slideshow navigation found',
      slides: [],
      images: []
    };
  }

  // Detect total slides
  let totalSlides = detectTotalSlides();
  const maxSlides = totalSlides || 50;

  console.log(`AutoStudyAI: Detected ${totalSlides || 'unknown'} total slides, will capture up to ${maxSlides}`);

  // Navigate to beginning (optimized — shorter sleeps, content-change detection)
  await goToFirstSlide(prevBtn, maxSlides);

  // Capture all slides by clicking next
  let slideIndex = 0;
  let lastContent = '';
  let noChangeCount = 0;

  while (slideIndex < maxSlides) {
    const content = getCurrentSlideContent();

    // Detect end of slideshow via content not changing
    if (content === lastContent) {
      noChangeCount++;
      if (noChangeCount >= 2) {
        console.log('AutoStudyAI: No content change detected, stopping capture');
        break;
      }
    } else {
      noChangeCount = 0;
    }

    if (content && content.length > 10) {
      slides.push({
        index: slideIndex + 1,
        content: content
      });
      console.log(`AutoStudyAI: Captured slide ${slideIndex + 1}`);

      // Screenshot if this slide has visual content (diagrams, charts, etc.)
      if (withImages && hasVisualContent()) {
        const screenshot = await requestScreenshot();
        if (screenshot) {
          images.push({ slide_index: slideIndex, data: screenshot });
          console.log(`AutoStudyAI: Screenshot slide ${slideIndex + 1}`);
        }
      }
    }

    lastContent = content;
    slideIndex++;

    // Try to go to next slide
    const currentNextBtn = findNextButton();
    if (!currentNextBtn || currentNextBtn.disabled || currentNextBtn.classList.contains('disabled')) {
      console.log('AutoStudyAI: Reached end of slideshow (next button disabled)');
      break;
    }

    try {
      currentNextBtn.click();
      await sleep(500); // Wait for slide transition
    } catch (e) {
      console.log('AutoStudyAI: Error clicking next button', e);
      break;
    }
  }

  console.log(`AutoStudyAI: Captured ${slides.length} slides` + (images.length ? ` + ${images.length} screenshots` : ''));

  return {
    success: slides.length > 0,
    totalCaptured: slides.length,
    detectedTotal: totalSlides,
    slides: slides,
    images: images
  };
}

/**
 * Check if current slide/page area has meaningful visual content
 * (diagrams, charts, tables, large images — not icons or decoration)
 */
function hasVisualContent() {
  // Try to find the active slide container first
  const activeSelectors = [
    '.slide.active', '.slide.current', '.carousel-item.active',
    '.slick-current', '.swiper-slide-active',
    '[class*="slide"][class*="active"]', '[class*="slide"][class*="current"]',
    '.slide-content', '.slide-body'
  ];

  let container = null;
  for (const sel of activeSelectors) {
    const el = document.querySelector(sel);
    if (el) { container = el; break; }
  }
  if (!container) container = findContentContainer();

  // Check for meaningful images (not tiny icons)
  const imgs = container.querySelectorAll('img');
  for (const img of imgs) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w > 80 && h > 80) return true;
  }

  // Check for canvas elements (rendered charts/diagrams)
  if (container.querySelector('canvas')) return true;

  // Check for SVGs that aren't tiny icons
  const svgs = container.querySelectorAll('svg');
  for (const svg of svgs) {
    const rect = svg.getBoundingClientRect();
    if (rect.width > 50 && rect.height > 50) return true;
  }

  // Check for data tables (at least header + one data row)
  const tables = container.querySelectorAll('table');
  for (const table of tables) {
    if (table.querySelectorAll('tr').length > 1) return true;
  }

  return false;
}

// State for step-by-step slide capture (persists between messages in content script)
let stepCaptureState = null;

/**
 * Format captured slides into readable content
 */
function formatSlidesContent(slidesData) {
  if (!slidesData.success || slidesData.slides.length === 0) {
    return '';
  }

  let content = `[Slideshow Captured: ${slidesData.totalCaptured} slides]\n\n`;

  for (const slide of slidesData.slides) {
    content += `--- Slide ${slide.index} ---\n`;
    content += slide.content + '\n\n';
  }

  return content;
}

/**
 * Detect if page contains a slideshow
 */
function detectSlideshow() {
  const result = {
    hasSlideshow: false,
    type: null,
    element: null,
    iframeUrl: null,
    hasNavigation: false,
    totalSlides: null
  };

  // Check for navigation buttons first (most reliable indicator)
  const nextBtn = findNextButton();
  const prevBtn = findPrevButton();
  if (nextBtn || prevBtn) {
    result.hasNavigation = true;
  }

  // Check for embedded iframes (Google Slides, PowerPoint, etc.)
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    const src = iframe.src || '';
    if (src.includes('docs.google.com/presentation')) {
      result.hasSlideshow = true;
      result.type = 'google_slides';
      result.iframeUrl = src;
      result.element = iframe;
      return result;
    }
    if (src.includes('powerpoint') || src.includes('onedrive') || src.includes('sharepoint')) {
      result.hasSlideshow = true;
      result.type = 'powerpoint_online';
      result.iframeUrl = src;
      result.element = iframe;
      return result;
    }
    if (src.includes('prezi.com')) {
      result.hasSlideshow = true;
      result.type = 'prezi';
      result.iframeUrl = src;
      result.element = iframe;
      return result;
    }
  }

  // Check for Canvas-specific slideshow
  for (const selector of SLIDESHOW_SELECTORS.canvas) {
    const el = document.querySelector(selector);
    if (el) {
      result.hasSlideshow = true;
      result.type = 'canvas_slideshow';
      result.element = el;
      result.totalSlides = detectTotalSlides();
      return result;
    }
  }

  // Check for generic slideshow elements with navigation
  if (result.hasNavigation) {
    result.hasSlideshow = true;
    result.type = 'navigable_slideshow';
    result.totalSlides = detectTotalSlides();
    return result;
  }

  // Check for generic slideshow elements
  for (const selector of SLIDESHOW_SELECTORS.generic) {
    const el = document.querySelector(selector);
    if (el && el.children.length > 1) {
      result.hasSlideshow = true;
      result.type = 'generic_slideshow';
      result.element = el;
      return result;
    }
  }

  return result;
}

/**
 * Extract text from slideshow element (static extraction)
 */
function extractSlideshowContent(slideshowInfo) {
  let content = '';
  const { type, element, iframeUrl } = slideshowInfo;

  if (type === 'google_slides' || type === 'powerpoint_online' || type === 'prezi') {
    // For iframes, we can't access content directly due to CORS
    content = `[Embedded Slideshow Detected: ${type}]\n`;
    content += `URL: ${iframeUrl}\n`;
    content += `Note: Please open the slideshow directly to capture its content.\n\n`;

    // Try to get any visible text around the iframe
    const parent = element.parentElement;
    if (parent) {
      content += parent.innerText || '';
    }
  } else if (element) {
    // For native slideshows, extract all slide content
    const slides = element.querySelectorAll('[class*="slide"], .carousel-item, [data-slide]');
    if (slides.length > 0) {
      slides.forEach((slide, index) => {
        content += `\n--- Slide ${index + 1} ---\n`;
        content += slide.innerText + '\n';
      });
    } else {
      content = element.innerText;
    }
  }

  return content;
}

/**
 * Find best content container on the page
 */
function findContentContainer() {
  // Try LMS-specific selectors first
  for (const selector of LMS_CONTENT_SELECTORS) {
    const el = document.querySelector(selector);
    if (el && el.innerText.trim().length > 100) {
      return el;
    }
  }
  // Fallback to body
  return document.body;
}

/**
 * Convert an image element to base64 JPEG via canvas.
 * Returns base64 data URL or null on failure.
 */
function imageToBase64(img) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    if (canvas.width === 0 || canvas.height === 0) return null;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch (e) {
    // CORS or tainted canvas — can't convert this image
    return null;
  }
}

/**
 * Collect meaningful images from a container as base64 with context.
 * Filters out icons, logos, tiny images, and decorative elements.
 * Returns at most maxImages, largest first.
 */
function collectPageImages(container, maxImages = 10) {
  const SKIP_ALT_PATTERNS = /logo|icon|avatar|banner|decoration|spacer|pixel|tracking|badge/i;
  const MIN_SIZE = 100; // minimum width AND height in px

  const imgs = Array.from(container.querySelectorAll('img'));

  // Score and filter images
  const candidates = [];
  for (const img of imgs) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w < MIN_SIZE || h < MIN_SIZE) continue;
    if (img.alt && SKIP_ALT_PATTERNS.test(img.alt)) continue;

    // Find nearby text context
    let context = '';
    const figcaption = img.closest('figure')?.querySelector('figcaption');
    if (figcaption) {
      context = figcaption.innerText.trim();
    } else {
      // Look for closest paragraph or heading
      const parent = img.parentElement;
      if (parent) {
        const sibling = parent.querySelector('p, h2, h3, h4, h5');
        if (sibling) context = sibling.innerText.trim().substring(0, 200);
      }
    }

    candidates.push({ img, area: w * h, alt: img.alt || '', context });
  }

  // Sort by area (largest first) and take top N
  candidates.sort((a, b) => b.area - a.area);
  const top = candidates.slice(0, maxImages);

  // Convert to base64
  const results = [];
  for (const c of top) {
    const data = imageToBase64(c.img);
    if (data) {
      results.push({ data, alt: c.alt, context: c.context });
    }
  }
  return results;
}

/**
 * Extract all meaningful content from the page
 */
function extractPageContent() {
  const slideshowInfo = detectSlideshow();
  let content = '';
  let contentType = 'webpage';

  if (slideshowInfo.hasSlideshow) {
    contentType = 'slideshow';
    content += extractSlideshowContent(slideshowInfo);
  }

  // Get main page content — clone and strip non-content elements to avoid nav pollution
  const container = findContentContainer();
  const clone = container.cloneNode(true);
  clone.querySelectorAll(
    'nav, footer, .sidebar, [role="navigation"], [role="banner"], ' +
    '.breadcrumb, .pagination, #header, .nav, .navbar, .footer, ' +
    '[class*="navigation"], [class*="breadcrumb"], [class*="sidebar"]'
  ).forEach(el => el.remove());
  const mainContent = clone.innerText;

  // Combine slideshow content with page content
  if (content) {
    content += '\n\n--- Page Content ---\n\n';
  }
  content += mainContent;

  // Extract image alt text (often contains important info)
  const altImages = Array.from(container.querySelectorAll('img[alt]'));
  const imageDescriptions = altImages
    .map(img => img.alt)
    .filter(alt => alt && alt.length > 5);

  if (imageDescriptions.length > 0) {
    content += '\n\n--- Image Descriptions ---\n';
    content += imageDescriptions.map(d => `[Image] ${d}`).join('\n');
  }

  // Collect actual images as base64 for vision analysis
  const collectedImages = collectPageImages(container);

  return { content, contentType, hasSlideshow: slideshowInfo.hasSlideshow, images: collectedImages };
}

/**
 * Find PowerPoint download links
 */
function findPptxLinks() {
  const links = [];

  // Direct .pptx links
  document.querySelectorAll('a[href$=".pptx"], a[href$=".ppt"]').forEach(a => {
    links.push({ url: a.href, text: a.innerText || 'PowerPoint file' });
  });

  // Canvas file links with download parameter
  document.querySelectorAll('a[href*="/files/"][href*="download"]').forEach(a => {
    const text = (a.innerText || '').toLowerCase();
    const href = (a.href || '').toLowerCase();
    if (text.includes('powerpoint') || text.includes('.pptx') || text.includes('.ppt') ||
        href.includes('.pptx') || href.includes('.ppt')) {
      links.push({ url: a.href, text: a.innerText });
    }
  });

  // Canvas file preview page: download button on /courses/.../files/... pages
  // The page title often contains the filename (e.g., "Pres_Topic.pptx: CourseTitle")
  const pageTitle = document.title || '';
  const isPptxPage = /\.pptx?\b/i.test(pageTitle) || /\.pptx?\b/i.test(window.location.href);
  if (isPptxPage && links.length === 0) {
    // Look for any download button/link on the page
    const downloadBtns = document.querySelectorAll(
      'a[download], a[href*="download"], a[href*="/files/"], ' +
      'a.btn-download, a[class*="download"], button[class*="download"]'
    );
    for (const btn of downloadBtns) {
      const href = btn.href || btn.getAttribute('data-url') || '';
      if (href) {
        links.push({ url: href, text: btn.innerText || 'Download PPTX' });
        break; // Take the first download link
      }
    }
    // If still no link found, construct one from the current Canvas URL
    // Canvas file URLs: /courses/XXXX/files/YYYYY → append ?download_frd=1
    const urlMatch = window.location.href.match(/\/courses\/\d+\/files\/\d+/);
    if (urlMatch && links.length === 0) {
      links.push({ url: urlMatch[0] + '/download', text: 'Canvas file download' });
    }
  }

  return links;
}

/**
 * Extract PDF content from viewer
 */
function extractPdfContent() {
  const pdfSelectors = [
    '.pdfViewer',
    '.pdf-viewer',
    '.react-pdf__Page',
    '.textLayer',
    '.pdf-content',
    '#viewerContainer',
    '[data-page-number]',
    // Mozilla PDF.js viewer
    '#viewer .page .textLayer',
    // Canvas embedded PDF
    '.canvas-pdf-viewer',
    '#document-content',
    // Generic PDF containers
    '[data-page-number] .textLayer'
  ];

  for (const selector of pdfSelectors) {
    const container = document.querySelector(selector);
    if (container) {
      // Get all text spans from PDF
      const textElements = container.querySelectorAll('span, div.textLine, [role="text"]');
      const text = Array.from(textElements)
        .filter(el => el.offsetParent !== null)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0)
        .join('\n');

      if (text.length > 50) {
        return { success: true, content: text, type: 'pdf' };
      }
    }
  }

  return { success: false, content: '', type: null };
}

// Message handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received:", request.action);

  // Ping — used by popup.js to check if content script is loaded
  if (request.action === 'ping') {
    sendResponse({ ok: true });
    return;
  }

  // Step-by-step slide capture (for screenshot integration)
  if (request.action === 'initSlideCapture') {
    (async () => {
      try {
        const nextBtn = findNextButton();
        const prevBtn = findPrevButton();
        if (!nextBtn) {
          sendResponse({ success: false, error: 'No slideshow navigation found' });
          return;
        }

        // Navigate to first slide
        if (prevBtn) {
          let clicks = 0;
          while (clicks < 50) {
            try {
              prevBtn.click();
              await sleep(300);
              clicks++;
              if (prevBtn.disabled || prevBtn.classList.contains('disabled')) break;
            } catch (e) { break; }
          }
          await sleep(500);
        }

        const totalSlides = detectTotalSlides();
        const content = getCurrentSlideContent();
        const visuals = hasVisualContent();

        stepCaptureState = { slideIndex: 1, totalSlides: totalSlides || 50, lastContent: content, noChangeCount: 0 };

        sendResponse({
          success: true,
          slideIndex: 1,
          content: content,
          hasVisuals: visuals,
          totalSlides: totalSlides || null,
          done: false
        });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }

  if (request.action === 'nextSlideStep') {
    (async () => {
      try {
        const nextBtn = findNextButton();
        if (!nextBtn || nextBtn.disabled || nextBtn.classList.contains('disabled')) {
          sendResponse({ done: true });
          return;
        }

        nextBtn.click();
        await sleep(600);

        const content = getCurrentSlideContent();
        const visuals = hasVisualContent();

        // Track content changes to detect end of slideshow
        if (stepCaptureState) {
          if (content === stepCaptureState.lastContent) {
            stepCaptureState.noChangeCount++;
            if (stepCaptureState.noChangeCount >= 2) {
              sendResponse({ done: true });
              return;
            }
          } else {
            stepCaptureState.noChangeCount = 0;
          }
          stepCaptureState.lastContent = content;
          stepCaptureState.slideIndex++;
        }

        const slideIndex = stepCaptureState ? stepCaptureState.slideIndex : 0;
        const maxSlides = stepCaptureState ? stepCaptureState.totalSlides : 50;
        const isDone = slideIndex >= maxSlides || nextBtn.disabled || nextBtn.classList.contains('disabled');

        sendResponse({
          success: true,
          slideIndex: slideIndex,
          content: content,
          hasVisuals: visuals,
          done: isDone
        });
      } catch (e) {
        sendResponse({ done: true, error: e.message });
      }
    })();
    return true;
  }

  // Single-pass capture with optional screenshots (preferred — fast)
  if (request.action === 'captureSlideshowWithImages') {
    captureAllSlides(true).then(result => {
      const formattedContent = formatSlidesContent(result);
      sendResponse({
        success: result.success,
        content: formattedContent,
        totalSlides: result.totalCaptured,
        detectedTotal: result.detectedTotal,
        slides: result.slides,
        images: result.images || []
      });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // Text-only capture (no screenshots)
  if (request.action === 'captureSlideshow' || request.action === 'captureSlides') {
    captureAllSlides(false).then(result => {
      const formattedContent = formatSlidesContent(result);
      sendResponse({
        success: result.success,
        content: formattedContent,
        totalSlides: result.totalCaptured,
        detectedTotal: result.detectedTotal,
        slides: result.slides
      });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // Synchronous operations
  switch (request.action) {
    case 'extractContent':
      // Check if there's a navigable slideshow first
      const slideshowInfo = detectSlideshow();
      if (slideshowInfo.hasSlideshow && slideshowInfo.hasNavigation) {
        // Auto-capture all slides
        captureAllSlides().then(result => {
          let content = formatSlidesContent(result);

          // Also include page content
          const container = findContentContainer();
          content += '\n\n--- Additional Page Content ---\n\n';
          content += container.innerText;

          sendResponse({
            content,
            contentType: 'slideshow',
            hasSlideshow: true,
            slidesCaptured: result.totalCaptured
          });
        }).catch(() => {
          // Fallback to regular extraction
          const pageData = extractPageContent();
          sendResponse(pageData);
        });
        return true; // Keep channel open
      } else {
        const pageData = extractPageContent();
        sendResponse(pageData);
      }
      break;

    case 'detectSlideshow':
      const info = detectSlideshow();
      sendResponse(info);
      break;

    case 'downloadPptx':
      const pptxLinks = findPptxLinks();
      if (pptxLinks.length > 0) {
        sendResponse({ success: true, url: pptxLinks[0].url, links: pptxLinks });
      } else {
        sendResponse({ success: false, error: 'No PowerPoint links found' });
      }
      break;

    case 'extractPdfText':
      const pdfResult = extractPdfContent();
      sendResponse(pdfResult);
      break;

    case 'fetchBlob':
      // Fetch a URL as base64 using the page's session cookies (needed for Canvas auth)
      if (request.url) {
        fetch(request.url, { credentials: 'include' })
          .then(r => r.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onload = () => {
              // Strip data URL prefix to get pure base64
              const base64 = reader.result.split(',')[1] || '';
              sendResponse({ data: base64 });
            };
            reader.onerror = () => sendResponse({ data: null });
            reader.readAsDataURL(blob);
          })
          .catch(() => sendResponse({ data: null }));
        return true; // async
      }
      sendResponse({ data: null });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }

  return true; // Keep message channel open for async response
});
