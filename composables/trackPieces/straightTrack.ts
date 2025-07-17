import type { TrackPiece, TrackRenderingContext } from './types';

export function drawStraightTrack(
  piece: TrackPiece,
  context: TrackRenderingContext
): void {
  const { ctx, zoom, isGhost = false, isHovered = false, isDeleteMode = false } = context;
  
  // Set colors - red for hovered pieces in delete mode, grey otherwise
  const isHighlighted = isHovered && isDeleteMode;
  const railColor = isHighlighted ? '#ff0000' : '#666666';
  const tieColor = isHighlighted ? '#ff6b6b' : '#888888';
  const ballastColor = isHighlighted ? '#ffcccc' : '#aaaaaa';

  // Draw ballast (gravel bed)
  ctx.fillStyle = ballastColor;
  ctx.fillRect(-68 * zoom, -12 * zoom, 136 * zoom, 24 * zoom);
  
  // Draw railroad ties
  ctx.fillStyle = tieColor;
  const tieWidth = 8 * zoom;
  const tieHeight = 20 * zoom;
  const tieSpacing = 16 * zoom;
  
  for (let x = -64 * zoom; x <= 64 * zoom; x += tieSpacing) {
    ctx.fillRect(x - tieWidth / 2, -tieHeight / 2, tieWidth, tieHeight);
  }
  
  // Draw rails
  ctx.fillStyle = railColor;
  const railWidth = 4 * zoom;
  const railGap = 12 * zoom;
  
  // Left rail
  ctx.fillRect(-64 * zoom, -railGap / 2 - railWidth, 128 * zoom, railWidth);
  // Right rail
  ctx.fillRect(-64 * zoom, railGap / 2, 128 * zoom, railWidth);
}
