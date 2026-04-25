import Tesseract from 'tesseract.js';

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
  canvas: HTMLCanvasElement
): Promise<OCRWord[]> {
  const result = await Tesseract.recognize(canvas, 'eng', {
    logger: (m) => {
      // Optional: log progress
      if (m.status === 'recognizing text') {
        console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  const words: OCRWord[] = [];
  const data = result.data as any;
  
  // Extract word-level bounding boxes
  if (data.words && Array.isArray(data.words)) {
    for (const word of data.words) {
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

  return words;
}

/**
 * Convert a label like "Insured Name:" to camelCase field name "insuredName"
 */
export function labelToFieldName(label: string): string {
  // Remove punctuation, split by spaces/special chars
  const cleaned = label
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
