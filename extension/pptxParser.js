// pptxParser.js
// This file will use pptx-parser to extract text from a .pptx file blob
// You must install pptx-parser via npm and bundle it for use in the extension, or use a CDN version if available.

// Example function to parse pptx file from a Blob
// (In a real extension, you may need to use a bundler or inject the library via CDN)

async function extractPptxText(fileBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;
      // pptxParser is a global from pptx-parser.min.js
      PptxParser.parse(arrayBuffer).then(result => {
        // result.slides is an array of slide objects
        // Each slide has .text property (array of text blocks)
        const allText = result.slides.map(slide => slide.text.join('\n')).join('\n\n---\n\n');
        resolve(allText);
      }).catch(err => {
        resolve('Failed to parse pptx: ' + err);
      });
    };
    reader.onerror = function(e) {
      reject('FileReader error');
    };
    reader.readAsArrayBuffer(fileBlob);
  });
}
// Make available globally
window.extractPptxText = extractPptxText;
