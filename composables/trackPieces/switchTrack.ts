import type { TrackPiece, TrackRenderingContext } from './types';

export function drawSwitchTrack(
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

  const isHighlighted = (isHovered && isDeleteMode) || isInvalidPlacement;
  const railColor = isHighlighted ? '#ff0000' : '#666666';
  const tieColor = isHighlighted ? '#ff6b6b' : '#888888';
  const ballastColor = isHighlighted ? '#ffcccc' : '#aaaaaa';

  // Determine branch direction
  const isLeft = piece.type === 'switch-left';
  const dir = isLeft ? 1 : -1;

  const length = 256 * zoom; // approx 32 stud straight length
  const halfLength = length / 2;
  const radius = 320 * zoom; // 40 stud radius
  const angleSpan = Math.PI / 8; // 22.5 degrees

  // Ballast for straight section
  ctx.fillStyle = ballastColor;
  ctx.fillRect(-halfLength - 8 * zoom, -10 * zoom, length + 16 * zoom, 20 * zoom);

  // Railroad ties along straight section
  ctx.fillStyle = tieColor;
  const tieWidth = 8 * zoom;
  const tieHeight = 28 * zoom;
  const tieSpacing = 21.33 * zoom;
  for (let i = -halfLength; i <= halfLength; i += tieSpacing) {
    ctx.fillRect(i - tieWidth / 2, -tieHeight / 2, tieWidth, tieHeight);
  }

  // Draw straight rails
  ctx.strokeStyle = railColor;
  ctx.lineWidth = 4 * zoom;
  ctx.lineCap = 'round';
  const railGap = 12 * zoom;
  ctx.beginPath();
  ctx.moveTo(-halfLength, -railGap / 2);
  ctx.lineTo(halfLength, -railGap / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-halfLength, railGap / 2);
  ctx.lineTo(halfLength, railGap / 2);
  ctx.stroke();

  // Diverging curved rails
  ctx.beginPath();
  ctx.arc(-radius + 0, 0, radius - railGap / 2, 0, angleSpan * dir, dir < 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-radius + 0, 0, radius + railGap / 2, 0, angleSpan * dir, dir < 0);
  ctx.stroke();
}
