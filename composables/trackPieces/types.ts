export type TrackPieceType =
  | 'straight'
  | 'curve'
  | 'switchLeft'
  | 'switchRight'
  | null;

export interface TrackPiece {
  x: number;
  y: number;
  type: TrackPieceType;
  rotation: number;
  flipped?: boolean;
}

export interface GhostPiece extends TrackPiece {}

export interface TrackRenderingContext {
  ctx: CanvasRenderingContext2D;
  zoom: number;
  isGhost?: boolean;
  isHovered?: boolean;
  isDeleteMode?: boolean;
  /** Whether this piece is being rendered in a location that isn't valid */
  isInvalidPlacement?: boolean;
}
