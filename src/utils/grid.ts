/**
 * Snap coordinates to a grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a rectangle to grid
 */
export function snapRectToGrid(
  x: number,
  y: number,
  width: number,
  height: number,
  gridSize: number
): { x: number; y: number; width: number; height: number } {
  const snappedX = snapToGrid(x, gridSize);
  const snappedY = snapToGrid(y, gridSize);
  const snappedWidth = snapToGrid(width, gridSize);
  const snappedHeight = snapToGrid(height, gridSize);
  
  return {
    x: snappedX,
    y: snappedY,
    width: Math.max(snappedWidth, gridSize), // Minimum size
    height: Math.max(snappedHeight, gridSize),
  };
}
