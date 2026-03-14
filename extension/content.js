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
  '.d2l-page-main', '.d2l-content-wrapper',
  // Generic
  'main', 'article', '.content', '#main-content'
];

/**
 * Sleep utility for async operations
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Find the next slide button
 */
function findNextButton() {
  for (const selector of SLIDESHOW_NAV_SELECTORS.next) {
    const btn = document.querySelector(selector);
    if (btn && btn.offsetParent !== null) { // Check if visible
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
    if (btn && btn.offsetParent !== null) {
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
async function captureAllSlides(statusCallback) {
  const slides = [];
  const nextBtn = findNextButton();
  const prevBtn = findPrevButton();

  if (!nextBtn) {
    return {
      success: false,
      error: 'No slideshow navigation found',
      slides: []
    };
  }

  // Detect total slides
  let totalSlides = detectTotalSlides();
  const maxSlides = totalSlides || 50; // Default max if we can't detect

  console.log(`AutoStudyAI: Detected ${totalSlides || 'unknown'} total slides, will capture up to ${maxSlides}`);

  // First, go to the beginning if we can
  if (prevBtn) {
    let prevClicks = 0;
    while (prevClicks < maxSlides) {
      try {
        prevBtn.click();
        await sleep(300);
        prevClicks++;

        // Check if we're at the start (button disabled or no change)
        if (prevBtn.disabled || prevBtn.classList.contains('disabled')) {
          break;
        }
      } catch (e) {
        break;
      }
    }
    await sleep(500); // Wait for first slide to fully load
  }

  // Now capture all slides by clicking next
  let slideIndex = 0;
  let lastContent = '';
  let noChangeCount = 0;

  while (slideIndex < maxSlides) {
    // Capture current slide content
    const content = getCurrentSlideContent();

    // Check if content changed (to detect end of slideshow)
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
      await sleep(600); // Wait for slide transition
    } catch (e) {
      console.log('AutoStudyAI: Error clicking next button', e);
      break;
    }
  }

  console.log(`AutoStudyAI: Captured ${slides.length} slides total`);

  return {
    success: slides.length > 0,
    totalCaptured: slides.length,
    detectedTotal: totalSlides,
    slides: slides
  };
}

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

  // Get main page content
  const container = findContentContainer();
  const mainContent = container.innerText;

  // Combine slideshow content with page content
  if (content) {
    content += '\n\n--- Page Content ---\n\n';
  }
  content += mainContent;

  // Extract image alt text (often contains important info)
  const images = Array.from(container.querySelectorAll('img[alt]'));
  const imageDescriptions = images
    .map(img => img.alt)
    .filter(alt => alt && alt.length > 5);

  if (imageDescriptions.length > 0) {
    content += '\n\n--- Image Descriptions ---\n';
    content += imageDescriptions.map(d => `[Image] ${d}`).join('\n');
  }

  return { content, contentType, hasSlideshow: slideshowInfo.hasSlideshow };
}

/**
 * Find PowerPoint download links
 */
function findPptxLinks() {
  const links = [];
  // Page title contains filename on Canvas file preview pages (e.g. "file.pptx: Course...")
  const isOnPptxPage = /\.pptx?:/i.test(document.title);

  // Direct .pptx/.ppt href links
  document.querySelectorAll('a[href$=".pptx"], a[href$=".ppt"]').forEach(a => {
    if (!links.find(l => l.url === a.href))
      links.push({ url: a.href, text: a.innerText || 'PowerPoint file' });
  });

  // All Canvas /files/ links — check link text, href, OR page title for PPTX
  document.querySelectorAll('a[href*="/files/"]').forEach(a => {
    const href = a.href || '';
    const text = (a.innerText || a.textContent || '').toLowerCase();
    if (!href.match(/\/files\/\d+/)) return;
    const downloadUrl = href.includes('download_frd') ? href : href.split('?')[0] + '?download_frd=1';
    if (links.find(l => l.url === downloadUrl || l.url === href)) return;
    const isPptx = text.includes('.pptx') || text.includes('.ppt') || text.includes('powerpoint')
                || href.toLowerCase().includes('.pptx') || href.toLowerCase().includes('.ppt')
                || isOnPptxPage;
    if (isPptx) links.push({ url: downloadUrl, text: a.innerText || 'PowerPoint file' });
  });

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
    '[data-page-number]'
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

  // Handle async operations
  if (request.action === 'captureSlideshow' || request.action === 'captureSlides') {
    // Async slideshow capture - click through all slides
    captureAllSlides().then(result => {
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
    return true; // Keep channel open for async
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

    default:
      sendResponse({ error: 'Unknown action' });
  }

  return true; // Keep message channel open for async response
});
