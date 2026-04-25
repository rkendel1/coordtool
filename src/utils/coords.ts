/**
 * Convert canvas/screen coordinates to PDF coordinate space.
 * PDF space has origin at bottom-left; canvas has origin at top-left.
 */
export function toPdfCoords(
  x: number,
  y: number,
  viewport: { scale: number; height: number }
): { x: number; y: number } {
  return {
    x: x / viewport.scale,
    y: (viewport.height - y) / viewport.scale,
  };
}
