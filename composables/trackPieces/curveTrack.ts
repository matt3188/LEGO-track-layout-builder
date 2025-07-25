import type { TrackPiece, TrackRenderingContext } from './types';

export function drawCurveTrack(
  piece: TrackPiece,
  context: TrackRenderingContext
): void {
  const {
    ctx,
    zoom,
    isGhost = false,
    isHovered = false,
    isDeleteMode = false,
    isInvalidPlacement = false
  } = context;
  
  // Set colors - red for hovered pieces in delete mode, grey otherwise
  const isHighlighted = (isHovered && isDeleteMode) || isInvalidPlacement;
  const railColor = isHighlighted ? '#ff0000' : '#666666';
  const tieColor = isHighlighted ? '#ff6b6b' : '#888888';
  const ballastColor = isHighlighted ? '#ffcccc' : '#aaaaaa';

  const radius = 320 * zoom;
  const trackWidth = 20 * zoom;
  const innerRadius = radius - trackWidth / 2;
  const outerRadius = radius + trackWidth / 2;
  
  // Determine curve direction based on whether it's flipped
  const isFlipped = piece.flipped || false;
  const curveDirection = isFlipped ? -1 : 1;
  
  const startAngle = 0;
  const endAngle = (Math.PI / 8) * curveDirection;
  
  // The offset is always -radius in the x direction for the base curve
  // Canvas rotation will handle the actual orientation
  const offsetX = -radius;
  const offsetY = 0;
  
  ctx.save();
  ctx.translate(offsetX, offsetY);
  
  // For flipped curves, we need to flip the Y axis
  if (isFlipped) {
    ctx.scale(1, -1);
  }
  
  // Draw the curved track base (hotdog shape)
  ctx.fillStyle = ballastColor;
  ctx.beginPath();
  if (curveDirection > 0) {
    ctx.arc(0, 0, outerRadius, startAngle, endAngle);
    ctx.arc(0, 0, innerRadius, endAngle, startAngle, true);
  } else {
    ctx.arc(0, 0, outerRadius, startAngle, endAngle, true);
    ctx.arc(0, 0, innerRadius, endAngle, startAngle);
  }
  ctx.closePath();
  ctx.fill();
  
  // Draw railroad ties (curved, more realistic spacing)
  ctx.fillStyle = tieColor;
  const tieCount = 6;
  const tieWidth = 6 * zoom;
  const tieLength = 28 * zoom;
  
  for (let i = 0; i <= tieCount; i++) {
    const angle = startAngle + (i / tieCount) * (endAngle - startAngle);
    const tieX = Math.cos(angle) * radius;
    const tieY = Math.sin(angle) * radius;
    
    ctx.save();
    ctx.translate(tieX, tieY);
    ctx.rotate(angle + Math.PI / 2); // Perpendicular to track
    ctx.fillRect(-tieWidth / 2, -tieLength / 2, tieWidth, tieLength);
    ctx.restore();
  }
  
  // Draw rails (curved)
  ctx.strokeStyle = railColor;
  ctx.lineWidth = 4 * zoom;
  ctx.lineCap = 'round';
  
  // Inner rail
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius + 4 * zoom, startAngle, endAngle, curveDirection < 0);
  ctx.stroke();
  
  // Outer rail
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius - 4 * zoom, startAngle, endAngle, curveDirection < 0);
  ctx.stroke();
  
  ctx.restore();
}
