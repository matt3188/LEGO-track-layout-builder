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

  // Draw ballast (gravel bed) - sized to match curve track proportions
  ctx.fillStyle = ballastColor;
  ctx.fillRect(-68 * zoom, -10 * zoom, 136 * zoom, 20 * zoom);
  
  // Draw railroad ties - extend beyond ballast like the curve track
  ctx.fillStyle = tieColor;
  const tieWidth = 8 * zoom;
  const tieHeight = 28 * zoom; // Longer ties that extend beyond ballast
  const tieSpacing = 21.33 * zoom; // Spacing for exactly 7 ties
  
  // Draw exactly 7 ties evenly spaced
  for (let i = 0; i < 7; i++) {
    const x = -64 * zoom + (i * tieSpacing);
    ctx.fillRect(x - tieWidth / 2, -tieHeight / 2, tieWidth, tieHeight);
  }
  
  // Draw rails as stroked lines (like the curve track) - extend beyond ballast
  ctx.strokeStyle = railColor;
  ctx.lineWidth = 4 * zoom;
  ctx.lineCap = 'round';
  
  const railGap = 12 * zoom;
  
  // Left rail - draw as a line extending beyond the ballast
  ctx.beginPath();
  ctx.moveTo(-72 * zoom, -railGap / 2);
  ctx.lineTo(72 * zoom, -railGap / 2);
  ctx.stroke();
  
  // Right rail - draw as a line extending beyond the ballast
  ctx.beginPath();
  ctx.moveTo(-72 * zoom, railGap / 2);
  ctx.lineTo(72 * zoom, railGap / 2);
  ctx.stroke();
  
  // Draw very subtle rail details (minimal, like the curve track)
  ctx.strokeStyle = railColor;
  ctx.lineWidth = 0.5 * zoom;
  ctx.lineCap = 'round';
  
  const spurSpacing = 32 * zoom; // Less frequent spurs for cleaner look
  
  // Draw minimal rail details, only at select points
  for (let x = -48 * zoom; x <= 48 * zoom; x += spurSpacing) {
    // Very subtle rail fasteners (tiny horizontal lines)
    const leftRailY = -railGap / 2;
    const rightRailY = railGap / 2;
    
    ctx.beginPath();
    ctx.moveTo(x - 0.5 * zoom, leftRailY);
    ctx.lineTo(x + 0.5 * zoom, leftRailY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x - 0.5 * zoom, rightRailY);
    ctx.lineTo(x + 0.5 * zoom, rightRailY);
    ctx.stroke();
  }
}
