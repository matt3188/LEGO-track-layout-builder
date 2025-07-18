import type { TrackPiece } from './types';

export interface ConnectionPoint {
  x: number;
  y: number;
  angle: number; // Direction the track is facing at this point
  type: 'male' | 'female'; // Connection type for compatibility
}

export interface SnapResult {
  position: { x: number; y: number };
  rotation: number;
  flipped?: boolean;
}

/**
 * Get connection points for a track piece in world coordinates
 */
export function getConnectionPoints(piece: TrackPiece): ConnectionPoint[] {
  const points: ConnectionPoint[] = [];
  
  if (piece.type === 'straight') {
    // Straight track has connections at both ends
    const length = 4; // Grid units (128 pixels / 32 pixels per grid unit)
    
    // Calculate actual end positions considering rotation
    const cos = Math.cos(piece.rotation);
    const sin = Math.sin(piece.rotation);
    
    // Start point (back end) - relative to piece center
    const startX = piece.x - (length / 2) * cos;
    const startY = piece.y - (length / 2) * sin;
    points.push({
      x: startX,
      y: startY,
      angle: piece.rotation + Math.PI, // Facing backwards
      type: 'male'
    });
    
    // End point (front end) - relative to piece center
    const endX = piece.x + (length / 2) * cos;
    const endY = piece.y + (length / 2) * sin;
    points.push({
      x: endX,
      y: endY,
      angle: piece.rotation, // Facing forwards
      type: 'female'
    });
    
  } else if (piece.type === 'curve') {
    // Curve track - must match the visual rendering exactly
    // Visual rendering uses: radius = 320 * zoom, angleSpan = Math.PI / 8 (22.5°)
    // Center offset: -radius in X direction
    
    const radius = 10; // Grid units (320 pixels / 32 pixels per grid unit)
    const angleSpan = Math.PI / 8; // 22.5 degrees - must match visual
    const isFlipped = piece.flipped || false;
    const curveDirection = isFlipped ? -1 : 1;
    
    // The curve center is offset from the piece position
    const centerOffsetX = -radius * Math.cos(piece.rotation);
    const centerOffsetY = -radius * Math.sin(piece.rotation);
    const centerX = piece.x + centerOffsetX;
    const centerY = piece.y + centerOffsetY;
    
    // Start point: at the piece position (entry to curve)
    points.push({
      x: piece.x,
      y: piece.y,
      angle: piece.rotation + Math.PI, // Facing backwards (into curve)
      type: 'male'
    });
    
    // End point: calculate where the curve actually ends
    const endAngle = angleSpan * curveDirection;
    const endX = centerX + radius * Math.cos(piece.rotation + endAngle);
    const endY = centerY + radius * Math.sin(piece.rotation + endAngle);
    
    points.push({
      x: endX,
      y: endY,
      angle: piece.rotation + endAngle, // Facing outward at final angle
      type: 'female'
    });
  }
  
  return points;
}

/**
 * Check if two connection points can connect
 */
export function canConnect(point1: ConnectionPoint, point2: ConnectionPoint): boolean {
  const distance = Math.sqrt(
    Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
  );
  
  // Points must be very close (within 0.3 grid units for precise snapping)
  if (distance > 0.3) return false;
  
  // Angles must be opposite (within 30 degrees tolerance)
  const angleDiff = Math.abs(point1.angle - point2.angle - Math.PI);
  const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
  if (normalizedAngleDiff > Math.PI / 6) return false; // 30 degrees tolerance
  
  return true;
}

/**
 * Find the best snap position for a piece near existing pieces
 */
export function findSnapPosition(
  newPiece: TrackPiece,
  existingPieces: TrackPiece[],
  snapDistance: number = 0.8
): SnapResult | null {
  let bestSnap: SnapResult | null = null;
  let bestDistance = Infinity;
  
  // Prioritize the user's current settings, but also try alternatives
  const piecesToTry = [
    // First try with user's current settings (highest priority)
    { ...newPiece },
    // Then try with flipped version (lower priority)
    { ...newPiece, flipped: !newPiece.flipped }
  ];
  
  for (let pieceIndex = 0; pieceIndex < piecesToTry.length; pieceIndex++) {
    const pieceVariant = piecesToTry[pieceIndex];
    const newConnections = getConnectionPoints(pieceVariant);
    
    for (const existingPiece of existingPieces) {
      const existingConnections = getConnectionPoints(existingPiece);
      
      for (const newConn of newConnections) {
        for (const existingConn of existingConnections) {
          const distance = Math.sqrt(
            Math.pow(newConn.x - existingConn.x, 2) + 
            Math.pow(newConn.y - existingConn.y, 2)
          );
          
          if (distance <= snapDistance) {
            // Calculate the position adjustment needed
            const deltaX = existingConn.x - newConn.x;
            const deltaY = existingConn.y - newConn.y;
            
            // Calculate the rotation adjustment needed for proper alignment
            const targetAngle = existingConn.angle + Math.PI; // Opposite direction
            const currentAngle = newConn.angle;
            let rotationDelta = targetAngle - currentAngle;
            
            // Normalize rotation delta to the shortest path
            while (rotationDelta > Math.PI) rotationDelta -= 2 * Math.PI;
            while (rotationDelta < -Math.PI) rotationDelta += 2 * Math.PI;
            
            // Snap to nearest valid rotation increment
            if (newPiece.type === 'curve') {
              const rotationStep = Math.PI / 8; // 22.5 degrees for curves
              rotationDelta = Math.round(rotationDelta / rotationStep) * rotationStep;
            } else {
              const rotationStep = Math.PI / 2; // 90 degrees for straight tracks
              rotationDelta = Math.round(rotationDelta / rotationStep) * rotationStep;
            }
            
            // Check if the connection would be valid after adjustment
            const finalAngle = currentAngle + rotationDelta;
            const angleDiff = Math.abs(finalAngle - targetAngle);
            const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
            
            // Accept connections that align reasonably well (within 45 degrees for better curve support)
            if (normalizedAngleDiff < Math.PI / 4) {
              // Create the adjusted piece to validate all connections
              const adjustedPiece = {
                ...pieceVariant,
                x: newPiece.x + deltaX,
                y: newPiece.y + deltaY,
                rotation: newPiece.rotation + rotationDelta
              };
              
              // Validate that this placement makes sense by checking all connection points
              if (isValidPlacement(adjustedPiece, existingPieces, snapDistance)) {
                // Calculate a preference score based on user's current settings
                let preferenceScore = 0;
                
                // Prioritize user's original settings over flipped alternatives
                if (pieceIndex > 0) {
                  preferenceScore += 1000; // Heavy penalty for flipped version
                }
                
                // Add penalty for large rotation changes (encourage smaller adjustments)
                const rotationPenalty = Math.abs(rotationDelta) * 100;
                preferenceScore += rotationPenalty;
                
                const adjustedDistance = distance + preferenceScore;
                
                if (adjustedDistance < bestDistance) {
                  bestSnap = {
                    position: {
                      x: adjustedPiece.x,
                      y: adjustedPiece.y
                    },
                    rotation: adjustedPiece.rotation,
                    flipped: pieceVariant.flipped
                  };
                  bestDistance = adjustedDistance;
                }
              }
            }
          }
        }
      }
    }
  }
  
  return bestSnap;
}

/**
 * Validate that a piece placement makes logical sense by checking connection requirements
 */
function isValidPlacement(
  newPiece: TrackPiece,
  existingPieces: TrackPiece[],
  snapDistance: number
): boolean {
  // First, check for collisions with existing pieces
  for (const existingPiece of existingPieces) {
    const distance = Math.sqrt(
      Math.pow(newPiece.x - existingPiece.x, 2) + 
      Math.pow(newPiece.y - existingPiece.y, 2)
    );
    
    // If pieces are too close (but not connecting), it's a collision
    if (distance < 0.5) {
      // Check if they're actually trying to connect
      const newConnections = getConnectionPoints(newPiece);
      const existingConnections = getConnectionPoints(existingPiece);
      
      let hasValidConnection = false;
      for (const newConn of newConnections) {
        for (const existingConn of existingConnections) {
          if (canConnect(newConn, existingConn)) {
            hasValidConnection = true;
            break;
          }
        }
        if (hasValidConnection) break;
      }
      
      // If no valid connection but pieces are close, it's a collision
      if (!hasValidConnection) {
        return false;
      }
    }
  }
  
  const newConnections = getConnectionPoints(newPiece);
  const allExistingConnections: ConnectionPoint[] = [];
  
  // Collect all existing connection points
  for (const existingPiece of existingPieces) {
    allExistingConnections.push(...getConnectionPoints(existingPiece));
  }
  
  let connectionsFound = 0;
  
  // Check each connection point of the new piece
  for (const newConn of newConnections) {
    for (const existingConn of allExistingConnections) {
      const distance = Math.sqrt(
        Math.pow(newConn.x - existingConn.x, 2) + 
        Math.pow(newConn.y - existingConn.y, 2)
      );
      
      if (distance <= snapDistance && canConnect(newConn, existingConn)) {
        connectionsFound++;
        break; // Only count one connection per connection point
      }
    }
  }
  
  // Simply require at least one valid connection when snapping
  return connectionsFound >= 1;
}

/**
 * Get visual indicators for connection points (for debugging/UI)
 */
export function getConnectionIndicators(pieces: TrackPiece[]): ConnectionPoint[] {
  const allConnections: ConnectionPoint[] = [];
  
  for (const piece of pieces) {
    allConnections.push(...getConnectionPoints(piece));
  }
  
  return allConnections;
}
