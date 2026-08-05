import { OCRWord, findNearbyLabel, labelToFieldName } from './ocr';

export interface DetectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  confidence: number;
  kind?: 'text' | 'checkbox' | 'boxedText';
  boxCount?: number;
}

interface Line { at: number; from: number; to: number; }

const mergeLines = (lines: Line[], tolerance = 3): Line[] => {
  const result: Line[] = [];
  for (const line of lines.sort((a, b) => a.at - b.at || a.from - b.from)) {
    const previous = result[result.length - 1];
    if (previous && Math.abs(previous.at - line.at) <= tolerance &&
        line.from <= previous.to + tolerance) {
      previous.at = Math.round((previous.at + line.at) / 2);
      previous.from = Math.min(previous.from, line.from);
      previous.to = Math.max(previous.to, line.to);
    } else result.push({ ...line });
  }
  return result;
};

function runs(bits: Uint8Array, width: number, height: number, horizontal: boolean): Line[] {
  const major = horizontal ? height : width;
  const minor = horizontal ? width : height;
  // Keep this low enough for standalone checkbox borders while the later
  // closed-cell checks filter ordinary text strokes.
  const minimum = Math.max(8, Math.round(minor * 0.006));
  const found: Line[] = [];
  for (let a = 0; a < major; a++) {
    let start = -1;
    for (let b = 0; b <= minor; b++) {
      const dark = b < minor && bits[horizontal ? a * width + b : b * width + a] === 1;
      if (dark && start < 0) start = b;
      if (!dark && start >= 0) {
        if (b - start >= minimum) found.push({ at: a, from: start, to: b - 1 });
        start = -1;
      }
    }
  }
  return mergeLines(found);
}

const covers = (line: Line, from: number, to: number, slack = 5) =>
  line.from <= from + slack && line.to >= to - slack;

/** Detect empty, ruled form cells in a rendered page. Pixel coordinates use a
 * top-left origin. OCR is optional; Tesseract.js supplies the WASM OCR engine. */
export function detectFieldRegions(
  image: ImageData,
  words: OCRWord[] = [],
  threshold = 185
): DetectedRegion[] {
  const { width, height, data } = image;
  const dark = new Uint8Array(width * height);
  for (let p = 0, i = 0; p < dark.length; p++, i += 4) {
    dark[p] = data[i + 3] > 32 &&
      (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000 < threshold ? 1 : 0;
  }
  const horizontal = runs(dark, width, height, true);
  const vertical = runs(dark, width, height, false);
  const output: DetectedRegion[] = [];

  for (let topIndex = 0; topIndex < horizontal.length; topIndex++) {
    const top = horizontal[topIndex];
    for (let bottomIndex = topIndex + 1; bottomIndex < horizontal.length; bottomIndex++) {
      const bottom = horizontal[bottomIndex];
      const cellHeight = bottom.at - top.at;
      if (cellHeight < 8) continue;
      if (cellHeight > Math.max(40, Math.min(130, height * 0.16))) break;
      const left = Math.max(top.from, bottom.from);
      const right = Math.min(top.to, bottom.to);
      const sides = vertical.filter(v => v.at >= left - 4 && v.at <= right + 4 && covers(v, top.at, bottom.at));
      let addedForPair = false;
      const consumedSides = new Set<number>();
      for (let runStart = 0; runStart + 1 < sides.length;) {
        let runEnd = runStart;
        while (runEnd + 1 < sides.length) {
          const cellLeft = sides[runEnd].at;
          const cellRight = sides[runEnd + 1].at;
          const cellWidth = cellRight - cellLeft;
          const hasText = words.some(word =>
            word.x + word.width / 2 > cellLeft && word.x + word.width / 2 < cellRight &&
            word.y + word.height / 2 > top.at && word.y + word.height / 2 < bottom.at);
          // Tolerate a missing divider in a character-box run. That produces
          // one interval roughly twice as wide as its neighbors.
          if (hasText || cellWidth < 7 || cellWidth > Math.max(44, cellHeight * 3)) break;
          runEnd++;
        }
        const boxCount = runEnd - runStart;
        if (boxCount >= 2) {
          const groupLeft = sides[runStart].at;
          const groupRight = sides[runEnd].at;
          const nearby = findNearbyLabel(groupLeft, top.at, groupRight - groupLeft, cellHeight, words, 140);
          output.push({
            x: groupLeft + 1, y: top.at + 2,
            width: groupRight - groupLeft - 2, height: cellHeight - 3,
            label: nearby ? labelToFieldName(nearby) : undefined,
            confidence: 0.9, kind: 'boxedText', boxCount,
          });
          for (let index = runStart; index < runEnd; index++) consumedSides.add(index);
          addedForPair = true;
          runStart = runEnd;
        } else {
          runStart++;
        }
      }
      for (let sideIndex = 0; sideIndex + 1 < sides.length; sideIndex++) {
        if (consumedSides.has(sideIndex)) continue;
        const x1 = sides[sideIndex].at;
        const x2 = sides[sideIndex + 1].at;
        const cellWidth = x2 - x1;
        if (cellWidth < 12 || cellWidth > width * 0.96) continue;
        const insideWords = words.filter(w =>
          w.x + w.width / 2 > x1 && w.x + w.width / 2 < x2 &&
          w.y + w.height / 2 > top.at && w.y + w.height / 2 < bottom.at);
        const textBottom = insideWords.reduce((max, w) => Math.max(max, w.y + w.height), top.at);
        const textRight = insideWords.reduce((max, w) => Math.max(max, w.x + w.width), x1);
        const typicalWordHeight = insideWords.length
          ? insideWords.reduce((sum, word) => sum + word.height, 0) / insideWords.length
          : 0;
        const cellText = insideWords.map(word => word.text).join(' ').trim();
        if (/^(?:section\b|part\b|note\b|important\b|penalty\b|i certify\b)/i.test(cellText)) continue;
        if (cellText.length > 60 || cellText.split(/\s+/).filter(Boolean).length > 8) continue;
        const contentTop = Math.max(top.at + 2, textBottom + 2);
        const belowHeight = bottom.at - contentTop - 1;
        const rightLeft = textRight + 3;
        const rightWidth = x2 - rightLeft - 1;
        let regionX = x1 + 1;
        let regionY = top.at + 2;
        let regionWidth = cellWidth - 2;
        let regionHeight = cellHeight - 3;
        if (!insideWords.length && cellWidth > Math.max(28, cellHeight * 1.6)) {
          // Large empty table cells are layout, not evidence of an input.
          continue;
        } else if (insideWords.length &&
                   belowHeight >= Math.max(10, typicalWordHeight * 1.1) &&
                   cellHeight >= typicalWordHeight * 2.2) {
          regionY = contentTop;
          regionHeight = belowHeight;
        } else if (insideWords.length && /^(?:[$€£¥]|code\s*:|subcode\s*:)$/i.test(cellText) &&
                   textRight < x1 + cellWidth * 0.55 &&
                   rightWidth >= Math.max(12, cellWidth * 0.2)) {
          regionX = rightLeft;
          regionWidth = rightWidth;
        } else if (insideWords.length) {
          continue;
        }
        const label = cellText ||
          findNearbyLabel(x1, top.at, cellWidth, cellHeight, words, 120) || undefined;
        output.push({
          x: regionX, y: regionY, width: regionWidth, height: regionHeight,
          label: label ? labelToFieldName(label) : undefined,
          confidence: Math.min(0.99, 0.65 + (insideWords.length ? 0.2 : 0)),
          kind: !insideWords.length && cellWidth <= Math.max(28, cellHeight * 1.6)
            ? 'checkbox'
            : 'text',
        });
        addedForPair = true;
      }
      // The nearest closed baseline defines the cell. Looking through later
      // baselines creates large duplicates spanning several table rows.
      if (addedForPair) break;
    }
  }

  return output.filter((region, index) => !output.some((other, otherIndex) =>
    otherIndex < index && Math.abs(other.x - region.x) < 4 && Math.abs(other.y - region.y) < 4 &&
    Math.abs(other.width - region.width) < 6 && Math.abs(other.height - region.height) < 6));
}
