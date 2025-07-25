import type { TrackPiece, TrackRenderingContext } from './types';
import { drawStraightTrack } from './straightTrack';
import { drawCurveTrack } from './curveTrack';

export function renderTrackPiece(
  piece: TrackPiece,
  context: TrackRenderingContext
): void {
  const { ctx } = context;
  
  ctx.save();
  
  try {
    switch (piece.type) {
      case 'straight':
        drawStraightTrack(piece, context);
        break;
      case 'curve':
        drawCurveTrack(piece, context);
        break;
      default:
        console.warn(`Unknown track piece type: ${piece.type}`);
    }
  } finally {
    ctx.restore();
  }
}

// Export individual track renderers
export { drawStraightTrack } from './straightTrack';
export { drawCurveTrack } from './curveTrack';
export type { TrackPiece, GhostPiece, TrackPieceType, TrackRenderingContext } from './types';
export { ROTATION_STEP } from '../constants';

// Export connection system
export {
  getConnectionPoints,
  canConnect,
  findSnapPosition,
  checkCollision,
  getConnectionIndicators,
  validateLayout
} from './connections';
export type { ConnectionPoint, SnapResult } from './connections';
