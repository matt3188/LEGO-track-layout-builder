import type { TrackPiece, TrackRenderingContext } from './types';
import { ROTATION_STEP } from '../constants';

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

  const mainLength = 256 * zoom; // 32 studs
  const branchStart = 128 * zoom; // 16 studs before curve
  const radius = 320 * zoom; // 40 stud radius
  const dir = piece.type === 'switchLeft' ? 1 : -1;

  // Draw main straight section
  ctx.fillStyle = ballastColor;
  ctx.fillRect(0, -10 * zoom, mainLength, 20 * zoom);

  ctx.fillStyle = tieColor;
  const tieCount = 13;
  const tieSpacing = mainLength / tieCount;
  const tieWidth = 8 * zoom;
  const tieHeight = 28 * zoom;
  for (let i = 0; i <= tieCount; i++) {
    const x = i * tieSpacing;
    ctx.fillRect(x - tieWidth / 2, -tieHeight / 2, tieWidth, tieHeight);
  }

  ctx.strokeStyle = railColor;
  ctx.lineWidth = 4 * zoom;
  ctx.lineCap = 'round';
  const railGap = 12 * zoom;
  ctx.beginPath();
  ctx.moveTo(0, -railGap / 2);
  ctx.lineTo(mainLength, -railGap / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, railGap / 2);
  ctx.lineTo(mainLength, railGap / 2);
  ctx.stroke();

  // Draw curved branch
  ctx.save();
  ctx.translate(branchStart, 0);
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + dir * ROTATION_STEP;

  // Ballast for branch
  const trackWidth = 20 * zoom;
  const innerRadius = radius - trackWidth / 2;
  const outerRadius = radius + trackWidth / 2;

  ctx.fillStyle = ballastColor;
  ctx.beginPath();
  ctx.arc(0, dir * 0, outerRadius, startAngle, endAngle, dir < 0);
  ctx.arc(0, dir * 0, innerRadius, endAngle, startAngle, dir >= 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = railColor;
  ctx.lineWidth = 4 * zoom;
  ctx.beginPath();
  ctx.arc(0, dir * radius, innerRadius + 4 * zoom, startAngle, endAngle, dir < 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, dir * radius, outerRadius - 4 * zoom, startAngle, endAngle, dir < 0);
  ctx.stroke();
  ctx.restore();
}
