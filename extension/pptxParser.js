// pptxParser.js — wrapper around pptx-parser library

async function extractPptxText(fileBlob) {
  return new Promise((resolve, reject) => {
    let parser = window["pptx-parser"];

    // === DIAGNOSTIC ===
    console.log('[PPTX-DIAG] window["pptx-parser"] =', parser);
    console.log('[PPTX-DIAG] typeof =', typeof parser);
    if (parser) console.log('[PPTX-DIAG] keys =', Object.keys(parser));

    // Unwrap ES module default export: { __esModule: true, default: actualLib }
    if (parser && parser.__esModule && parser.default) {
      console.log('[PPTX-DIAG] Unwrapping .default export');
      parser = parser.default;
      console.log('[PPTX-DIAG] unwrapped =', parser, 'typeof =', typeof parser);
      if (parser && typeof parser === 'object') console.log('[PPTX-DIAG] unwrapped keys =', Object.keys(parser));
    }

    if (!parser) {
      console.error('[PPTX-DIAG] FAIL: parser is falsy');
      resolve('PPTX parser library not loaded');
      return;
    }

    // Find parse function: parser.parse, or parser itself if it's a function
    const parseFn = typeof parser.parse === 'function' ? parser.parse.bind(parser)
                  : typeof parser === 'function' ? parser
                  : null;

    if (!parseFn) {
      console.error('[PPTX-DIAG] FAIL: No .parse method found. typeof parser =', typeof parser);
      resolve('PPTX parser library not loaded');
      return;
    }

    console.log('[PPTX-DIAG] fileBlob size =', fileBlob.size, 'type =', fileBlob.type);

    const reader = new FileReader();
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;
      console.log('[PPTX-DIAG] ArrayBuffer byteLength =', arrayBuffer.byteLength);

      parseFn(arrayBuffer).then(result => {
        console.log('[PPTX-DIAG] parse result =', result);
        console.log('[PPTX-DIAG] result type =', typeof result);
        if (result) console.log('[PPTX-DIAG] result keys =', Object.keys(result));

        if (!result || !result.slides) {
          console.error('[PPTX-DIAG] FAIL: No slides in parse result');
          resolve('No slides found in PPTX');
          return;
        }

        console.log('[PPTX-DIAG] slides count =', result.slides.length);
        if (result.slides[0]) {
          console.log('[PPTX-DIAG] slide[0] =', JSON.stringify(result.slides[0]).substring(0, 500));
        }

        const allText = result.slides.map((slide, i) => {
          const text = Array.isArray(slide.text) ? slide.text.join('\n') : (slide.text || '');
          return `--- Slide ${i + 1} ---\n${text}`;
        }).join('\n\n');

        const output = `[Slideshow Captured: ${result.slides.length} slides]\n\n${allText}`;
        console.log('[PPTX-DIAG] SUCCESS: output length =', output.length, 'first 300 chars:', output.substring(0, 300));
        resolve(output);
      }).catch(err => {
        console.error('[PPTX-DIAG] FAIL: parse threw error:', err);
        resolve('Failed to parse pptx: ' + err);
      });
    };
    reader.onerror = function(e) {
      console.error('[PPTX-DIAG] FAIL: FileReader error', e);
      reject('FileReader error');
    };
    reader.readAsArrayBuffer(fileBlob);
  });
}

window.extractPptxText = extractPptxText;
