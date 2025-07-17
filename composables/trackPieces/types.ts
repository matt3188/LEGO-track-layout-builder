export type TrackPieceType = 'straight' | 'curve' | null;

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
}
