// pptxParser.js — Extract text from PPTX using JSZip + XML parsing
// Replaces pptx-parser library which skips many shape types.
// PPTX files are ZIP archives; all text lives in <a:t> XML tags.

async function extractPptxText(fileBlob) {
  if (typeof JSZip === 'undefined') {
    console.error('[PPTX] JSZip not loaded');
    return 'PPTX parser library not loaded';
  }

  try {
    console.log('[PPTX] Loading ZIP, blob size:', fileBlob.size);
    const zip = await JSZip.loadAsync(fileBlob);

    // Find slide XML files: ppt/slides/slide1.xml, slide2.xml, etc.
    const slideFiles = Object.keys(zip.files)
      .filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/i)[1]);
        const numB = parseInt(b.match(/slide(\d+)/i)[1]);
        return numA - numB;
      });

    console.log('[PPTX] Found', slideFiles.length, 'slide files');

    if (slideFiles.length === 0) {
      return 'No slides found in PPTX';
    }

    const slides = [];
    const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';

    for (const fileName of slideFiles) {
      const xml = await zip.file(fileName).async('text');
      const doc = new DOMParser().parseFromString(xml, 'application/xml');

      // <a:t> tags contain ALL text in PowerPoint, regardless of shape type
      const textNodes = doc.getElementsByTagNameNS(NS_A, 't');
      const paragraphs = [];
      let currentParagraph = [];

      // Group text runs by their parent <a:p> (paragraph) element
      for (const node of textNodes) {
        const text = node.textContent;
        if (!text) continue;

        // Check if this <a:t> starts a new paragraph
        const pElement = node.parentElement;
        let isNewParagraph = false;

        if (pElement) {
          // Each <a:r> (run) is inside an <a:p> (paragraph)
          // Walk up to find <a:p> and check if it's a new one
          let p = pElement;
          while (p && p.localName !== 'p') p = p.parentElement;
          if (p && p !== currentParagraph._pNode) {
            isNewParagraph = true;
            currentParagraph._pNode = p;
          }
        }

        if (isNewParagraph && currentParagraph.length > 0) {
          paragraphs.push(currentParagraph.join(''));
          currentParagraph = [];
          currentParagraph._pNode = null;
        }
        currentParagraph.push(text);
      }

      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(''));
      }

      const slideText = paragraphs.filter(p => p.trim()).join('\n');
      slides.push(slideText);
    }

    const allText = slides.map((text, i) => {
      return `--- Slide ${i + 1} ---\n${text}`;
    }).join('\n\n');

    const output = `[Slideshow Captured: ${slides.length} slides]\n\n${allText}`;
    console.log('[PPTX] Success:', slides.length, 'slides, output length:', output.length);
    return output;
  } catch (err) {
    console.error('[PPTX] Error:', err);
    return 'Failed to parse pptx: ' + err.message;
  }
}

window.extractPptxText = extractPptxText;
