import Tesseract from 'tesseract.js';

let workerPromise: ReturnType<typeof Tesseract.createWorker> | null = null;

function getOCRWorker() {
  if (!workerPromise) {
    const publicRoot = process.env.PUBLIC_URL || '';
    workerPromise = Tesseract.createWorker('eng', undefined, {
      // Keep every OCR runtime asset same-origin. Using the explicit loader
      // (rather than the *.wasm.js single-file build) makes the browser fetch
      // and instantiate the compiled .wasm binary in public/tesseract/core.
      corePath: `${publicRoot}/tesseract/core/tesseract-core-simd-lstm.js`,
      workerPath: `${publicRoot}/tesseract/worker/worker.min.js`,
      langPath: `${publicRoot}/tesseract/lang`,
      gzip: true,
      workerBlobURL: false,
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
  }
  return workerPromise;
}

/**
 * Extract text from a PDF page using OCR.
 * Returns bounding boxes with text content.
 */
export interface OCRWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export async function extractTextWithOCR(
  canvas: HTMLCanvasElement,
  timeoutMs = 30000
): Promise<OCRWord[]> {
  const worker = await getOCRWorker();
  // Tesseract 6+ disables granular output unless explicitly requested.
  const result = await Promise.race([
    worker.recognize(canvas, {}, { text: true, blocks: true }),
    new Promise<never>((_, reject) => window.setTimeout(
      () => reject(new Error('WASM OCR timed out')), timeoutMs
    )),
  ]);

  const words: OCRWord[] = [];
  const blocks = result.data.blocks || [];
  for (const block of blocks) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        for (const word of line.words || []) {
      if (word.text && word.text.trim().length > 0 && word.bbox) {
        words.push({
          text: word.text.trim(),
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
          confidence: word.confidence || 0,
        });
      }
        }
      }
    }
  }

  return words;
}

/**
 * Convert a label like "Insured Name:" to camelCase field name "insuredName"
 */
export function labelToFieldName(label: string): string {
  const meaningfulLabel = label
    .replace(/^\s*\d+[A-Z]?\.\s*/i, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:do not write in this space|type or print|if applicable|optional)\b/gi, ' ');
  // Remove punctuation, split by spaces/special chars
  const cleaned = meaningfulLabel
    .replace(/[^\w\s]/g, '')
    .trim()
    .toLowerCase();
  
  if (!cleaned) return '';
  
  const words = cleaned.split(/\s+/);
  if (words.length === 0) return '';
  
  // camelCase: first word lowercase, rest capitalized
  return words[0] + words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

/**
 * Find the nearest text label to a given box position.
 * Looks left and above within a reasonable distance.
 */
export function findNearbyLabel(
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
  words: OCRWord[],
  maxDistance: number = 100
): string | null {
  let bestLabel: string | null = null;
  let bestScore = Infinity;

  for (const word of words) {
    // Check if word ends with common label indicators
    const isLabel = /[:：]$/.test(word.text) || word.text.toLowerCase().includes('name') || word.text.toLowerCase().includes('date');
    
    // Calculate distance from word to box
    // Prefer words to the left or above
    const wordRight = word.x + word.width;
    const wordBottom = word.y + word.height;
    
    // Distance to left edge of box
    const distX = boxX - wordRight;
    // Distance above box
    const distY = boxY - wordBottom;
    
    // Only consider words that are to the left or above (not far away)
    if (distX < -50 || distY < -50) continue;
    if (distX > maxDistance || distY > maxDistance) continue;
    
    // Score: closer is better
    const score = Math.sqrt(distX * distX + distY * distY);
    
    if (score < bestScore && (isLabel || score < 50)) {
      bestScore = score;
      bestLabel = word.text;
    }
  }

  return bestLabel;
}
