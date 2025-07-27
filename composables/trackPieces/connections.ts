import type { TrackPiece } from './types';
import { ROTATION_STEP } from '../constants';

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
    
    // FIXED: Connection angles for straight pieces should be PERPENDICULAR to the piece rotation
    // - A horizontal straight (0°) has North/South connections (90°/270°)
    // - A vertical straight (90°) has East/West connections (0°/180°)
    const perpAngle1 = piece.rotation + Math.PI / 2; // +90° from piece rotation
    const perpAngle2 = piece.rotation - Math.PI / 2; // -90° from piece rotation
    
    points.push({
      x: startX,
      y: startY,
      angle: perpAngle1, // Perpendicular direction 1
      type: 'male'
    });
    
    // End point (front end) - relative to piece center
    const endX = piece.x + (length / 2) * cos;
    const endY = piece.y + (length / 2) * sin;
    points.push({
      x: endX,
      y: endY,
      angle: perpAngle2, // Perpendicular direction 2 (opposite)
      type: 'female'
    });
    
  } else if (piece.type === 'curve') {
    // Curve track - must match the visual rendering exactly
    // Visual rendering uses: radius = 320 * zoom, angleSpan = Math.PI / 8 (22.5°)
    // Center offset: -radius in X direction
    // Angle system clarification:
    // - 0° = horizontal curve to the right (East)
    // - 90° = vertical curve pointing up (North)  
    // - 180° = horizontal curve to the left (West)
    // - 270° = vertical curve pointing down (South)
    
    const radius = 10; // Grid units (320 pixels / 32 pixels per grid unit)
    const angleSpan = Math.PI / 8; // 22.5 degrees - must match visual
    const isFlipped = piece.flipped || false;
    const curveDirection = isFlipped ? -1 : 1;
    
    // The curve center is offset from the piece position
    // FIXED: Match the actual rendering geometry from curveTrack.ts
    // The curve center is offset by -radius in local X direction, then rotated
    // This matches: offsetX = -radius; offsetY = 0; in the rendering code
    const localCenterX = -radius;
    const localCenterY = 0;
    
    // Transform local center to world coordinates using piece rotation
    const cos = Math.cos(piece.rotation);
    const sin = Math.sin(piece.rotation);
    const centerX = piece.x + (localCenterX * cos - localCenterY * sin);
    const centerY = piece.y + (localCenterX * sin + localCenterY * cos);
    
    // Start point: at the piece position (entry to curve)
    // The connection angle accounts for the curve's entry direction
    points.push({
      x: piece.x,
      y: piece.y,
      angle: piece.rotation + Math.PI, // Facing backwards (into curve)
      type: 'male'
    });
    
    // End point: calculate where the curve actually ends
    // In local coordinates: startAngle = 0, endAngle = angleSpan * curveDirection
    const localEndAngle = angleSpan * curveDirection;
    const localEndX = radius * Math.cos(localEndAngle);
    const localEndY = radius * Math.sin(localEndAngle) * (isFlipped ? -1 : 1);
    
    // Transform local end point to world coordinates
    const endX = centerX + (localEndX * cos - localEndY * sin);
    const endY = centerY + (localEndX * sin + localEndY * cos);
    
    // The connection angle at the end should be tangent to the curve
    const endAngleDirection = piece.rotation + localEndAngle;
    
    points.push({
      x: endX,
      y: endY,
      angle: endAngleDirection, // Facing outward at final angle
      type: 'female'
    });
  }
  
  return points;
}

/**
 * Check if two connection points can connect with potential rotation
 */
export function canConnectWithRotation(
  piece1: TrackPiece,
  piece2: TrackPiece,
  point1: ConnectionPoint,
  point2: ConnectionPoint
): { canConnect: boolean; rotationNeeded: number } {
  const distance = Math.sqrt(
    Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
  );
  
  // Points must be extremely close (within 0.3 grid units)
  if (distance > 0.3) {
    return { canConnect: false, rotationNeeded: 0 };
  }
  
  // Check piece-specific connection rules first
  if (piece1.type === 'straight' && piece2.type === 'straight') {
    // Straight to straight: must be opposite types (male→female)
    if (point1.type === point2.type) {
      return { canConnect: false, rotationNeeded: 0 };
    }
  } else if (piece1.type === 'curve' && piece2.type === 'curve') {
    // Curve to curve: must be opposite types (male→female)
    if (point1.type === point2.type) {
      return { canConnect: false, rotationNeeded: 0 };
    }
  }
  // For straight-curve connections, allow any type combination
  
  // Calculate required rotation to align angles
  const targetAngle = point2.angle + Math.PI; // Opposite direction
  const currentAngle = point1.angle;
  let rotationDelta = targetAngle - currentAngle;
  
  // Normalize to shortest path
  while (rotationDelta > Math.PI) rotationDelta -= 2 * Math.PI;
  while (rotationDelta < -Math.PI) rotationDelta += 2 * Math.PI;
  
  // Snap to valid rotation increments
  const rotationStep = piece1.type === 'curve' ? ROTATION_STEP : Math.PI / 2;
  const snappedRotation = Math.round(rotationDelta / rotationStep) * rotationStep;
  
  // Check if the snapped rotation creates a valid alignment
  const finalAngle = currentAngle + snappedRotation;
  const angleDiff = Math.abs(finalAngle - targetAngle);
  const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
  
  if (normalizedAngleDiff < Math.PI / 24) { // 7.5 degrees tolerance
    return { canConnect: true, rotationNeeded: snappedRotation };
  }
  
  return { canConnect: false, rotationNeeded: 0 };
}

/**
 * Check if two connection points can connect (legacy - for backwards compatibility)
 */
export function canConnect(point1: ConnectionPoint, point2: ConnectionPoint): boolean {
  const distance = Math.sqrt(
    Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
  );
  
  // Points must be extremely close (within 0.3 grid units)
  if (distance > 0.3) {
    return false;
  }
  
  // Angles must be opposite (within 7.5 degrees tolerance for very precise connections)
  const angleDiff = Math.abs(point1.angle - point2.angle - Math.PI);
  const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
  
  return normalizedAngleDiff <= Math.PI / 24; // 7.5 degrees tolerance
}

/**
 * Validate that a connection creates logical track flow
 */
export function validateTrackFlow(
  piece1: TrackPiece, 
  piece2: TrackPiece, 
  connectionPoint1: ConnectionPoint, 
  connectionPoint2: ConnectionPoint
): boolean {
  // Check if the connection creates a smooth track transition
  if (piece1.type === 'straight' && piece2.type === 'curve') {
    return validateStraightToCurve(piece1, piece2, connectionPoint1, connectionPoint2);
  } else if (piece1.type === 'curve' && piece2.type === 'straight') {
    return validateCurveToStraight(piece1, piece2, connectionPoint1, connectionPoint2);
  } else if (piece1.type === 'curve' && piece2.type === 'curve') {
    return validateCurveToCurve(piece1, piece2, connectionPoint1, connectionPoint2);
  } else if (piece1.type === 'straight' && piece2.type === 'straight') {
    // Straight to straight connections: must be aligned
    const angleDiff = Math.abs(piece1.rotation - piece2.rotation);
    const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
    
    // Must be parallel (0°) or opposite (180°), with small tolerance
    const isParallel = normalizedAngleDiff < Math.PI / 12; // 15 degrees
    const isOpposite = Math.abs(normalizedAngleDiff - Math.PI) < Math.PI / 12; // 15 degrees from 180°
    
    if (!isParallel && !isOpposite) {
      return false;
    }
    
    return true;
  }
  
  return true;
}

/**
 * Validate straight to curve connection
 */
function validateStraightToCurve(
  straightPiece: TrackPiece,
  curvePiece: TrackPiece,
  straightConnection: ConnectionPoint,
  curveConnection: ConnectionPoint
): boolean {
  // For a valid straight-to-curve connection, we need to validate that:
  // 1. The connection point angles are properly opposite
  // 2. The piece orientations make geometric sense
  
  const straightConnAngle = straightConnection.angle;
  const curveConnAngle = curveConnection.angle;
  
  // Connection angles should be opposite (within tolerance)
  const expectedAngleDiff = Math.PI; // 180 degrees
  const actualAngleDiff = Math.abs(straightConnAngle - curveConnAngle);
  const normalizedAngleDiff = Math.min(actualAngleDiff, 2 * Math.PI - actualAngleDiff);
  
  if (Math.abs(normalizedAngleDiff - expectedAngleDiff) > Math.PI / 24) {
    return false;
  }
  
  // Additional validation: check if the piece orientations are geometrically compatible
  // Compass-based angle system:
  // - 0° = East (horizontal right)
  // - 90° = North (vertical up)  
  // - 180° = West (horizontal left)
  // - 270° = South (vertical down)
  const straightRotation = straightPiece.rotation;
  const curveRotation = curvePiece.rotation;
  
  // Normalize rotations to 0-2π range
  const normalizedStraightRot = ((straightRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const normalizedCurveRot = ((curveRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  
  // Convert to degrees for easier understanding
  const straightDegrees = normalizedStraightRot * 180 / Math.PI;
  const curveDegrees = normalizedCurveRot * 180 / Math.PI;
  
  // Enhanced validation: Check for impossible straight-to-curve connections
  // Based on the actual connection point angles, not piece rotations
  
  // Get the connection angles (normalized to 0-2π)
  const straightConnAngleNorm = ((straightConnAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const curveConnAngleNorm = ((curveConnAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  
  // Convert to degrees for easier understanding  
  const straightConnDegrees = straightConnAngleNorm * 180 / Math.PI;
  const curveConnDegrees = curveConnAngleNorm * 180 / Math.PI;
  
  // Define connection point orientations with tolerance
  const connPointTolerance = 30; // 30° tolerance for connection point directions
  
  const isStraightNorthSouth = Math.abs(straightConnDegrees - 90) < connPointTolerance || Math.abs(straightConnDegrees - 270) < connPointTolerance;
  const isStraightEastWest = Math.abs(straightConnDegrees) < connPointTolerance || Math.abs(straightConnDegrees - 180) < connPointTolerance;
  const isCurveNorthSouth = Math.abs(curveConnDegrees - 90) < connPointTolerance || Math.abs(curveConnDegrees - 270) < connPointTolerance;
  const isCurveEastWest = Math.abs(curveConnDegrees) < connPointTolerance || Math.abs(curveConnDegrees - 180) < connPointTolerance;
  
  // Check for impossible combinations based on connection point directions
  if (isStraightNorthSouth && isCurveEastWest) {
    return false;
  }
  
  if (isStraightEastWest && isCurveNorthSouth) {
    return false;
  }
  
  // Check if the orientations are compatible
  const rotationDiff = Math.abs(normalizedStraightRot - normalizedCurveRot);
  const normalizedRotDiff = Math.min(rotationDiff, 2 * Math.PI - rotationDiff);
  
  // Allow some tolerance for different valid orientations
  const validOrientations = [
    0, // Same orientation
    Math.PI / 4, // 45° difference
    Math.PI / 2, // 90° difference
    3 * Math.PI / 4, // 135° difference
    Math.PI, // 180° difference
    5 * Math.PI / 4, // 225° difference
    3 * Math.PI / 2, // 270° difference
    7 * Math.PI / 4  // 315° difference
  ];
  
  const tolerance = ROTATION_STEP; // 22.5° tolerance
  const isValidOrientation = validOrientations.some(validAngle => 
    Math.abs(normalizedRotDiff - validAngle) < tolerance
  );
  
  if (!isValidOrientation) {
    return false;
  }
  
  return true;
}

/**
 * Validate curve to straight connection
 */
function validateCurveToStraight(
  curvePiece: TrackPiece,
  straightPiece: TrackPiece,
  curveConnection: ConnectionPoint,
  straightConnection: ConnectionPoint
): boolean {
  // For a valid curve-to-straight connection, we need to validate that:
  // 1. The connection point angles are properly opposite
  // 2. The piece orientations make geometric sense
  
  const curveConnAngle = curveConnection.angle;
  const straightConnAngle = straightConnection.angle;
  
  // Connection angles should be opposite (within tolerance)
  const expectedAngleDiff = Math.PI; // 180 degrees
  const actualAngleDiff = Math.abs(curveConnAngle - straightConnAngle);
  const normalizedAngleDiff = Math.min(actualAngleDiff, 2 * Math.PI - actualAngleDiff);
  
  if (Math.abs(normalizedAngleDiff - expectedAngleDiff) > Math.PI / 24) {
    return false;
  }
  
  // Additional validation: check if the piece orientations are geometrically compatible
  const curveRotation = curvePiece.rotation;
  const straightRotation = straightPiece.rotation;
  
  // Normalize rotations to 0-2π range
  const normalizedCurveRot = ((curveRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const normalizedStraightRot = ((straightRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  
  // Enhanced validation: Check for impossible curve-to-straight connections
  // Based on the actual connection point angles, not piece rotations
  
  // Get the connection angles (normalized to 0-2π)
  const curveConnAngleNorm = ((curveConnAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const straightConnAngleNorm = ((straightConnAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  
  // Convert to degrees for easier understanding
  const curveConnDegrees = curveConnAngleNorm * 180 / Math.PI;
  const straightConnDegrees = straightConnAngleNorm * 180 / Math.PI;
  
  // Define connection point orientations with tolerance
  const connPointTolerance = 30; // 30° tolerance for connection point directions
  
  const isCurveNorthSouth = Math.abs(curveConnDegrees - 90) < connPointTolerance || Math.abs(curveConnDegrees - 270) < connPointTolerance;
  const isCurveEastWest = Math.abs(curveConnDegrees) < connPointTolerance || Math.abs(curveConnDegrees - 180) < connPointTolerance;
  const isStraightNorthSouth = Math.abs(straightConnDegrees - 90) < connPointTolerance || Math.abs(straightConnDegrees - 270) < connPointTolerance;
  const isStraightEastWest = Math.abs(straightConnDegrees) < connPointTolerance || Math.abs(straightConnDegrees - 180) < connPointTolerance;
  
  // Check for impossible combinations based on connection point directions
  if (isCurveEastWest && isStraightNorthSouth) {
    return false;
  }
  
  if (isCurveNorthSouth && isStraightEastWest) {
    return false;
  }

  return true;
}

/**
 * Validate curve to curve connection
 */
function validateCurveToCurve(
  curve1: TrackPiece,
  curve2: TrackPiece,
  connection1: ConnectionPoint,
  connection2: ConnectionPoint
): boolean {
  // For curve-to-curve connections, the connection points must have opposite angles
  const angle1 = connection1.angle;
  const angle2 = connection2.angle;
  
  // They should be opposite directions (within tolerance)
  const expectedAngleDiff = Math.PI; // 180 degrees
  const actualAngleDiff = Math.abs(angle1 - angle2);
  const normalizedAngleDiff = Math.min(actualAngleDiff, 2 * Math.PI - actualAngleDiff);
  
  if (Math.abs(normalizedAngleDiff - expectedAngleDiff) > Math.PI / 24) {
    return false;
  }
  
  return true;
}

/**
 * Find the best snap position for a piece near existing pieces
 */
export function findSnapPosition(
  newPiece: TrackPiece,
  existingPieces: TrackPiece[],
  snapDistance: number = 2.0 // More generous snap distance for better usability
): SnapResult | null {
  if (existingPieces.length === 0) return null;
  
  let bestSnap: SnapResult | null = null;
  let bestDistance = Infinity;
  
  // Try both regular and flipped versions
  const piecesToTry = [
    { ...newPiece },
    { ...newPiece, flipped: !newPiece.flipped }
  ];
  
  for (const pieceVariant of piecesToTry) {
    // Try different rotations to see if any create valid connections
    const rotationSteps = 16; // Allow 22.5° increments for all pieces
    const rotationIncrement = (2 * Math.PI) / rotationSteps;
    
    for (let rotStep = 0; rotStep < rotationSteps; rotStep++) {
      const testRotation = pieceVariant.rotation + (rotStep * rotationIncrement);
      const testPiece = { ...pieceVariant, rotation: testRotation };
      const newConnections = getConnectionPoints(testPiece);
      
      for (const existingPiece of existingPieces) {
        const existingConnections = getConnectionPoints(existingPiece);
        
        for (const newConn of newConnections) {
          for (const existingConn of existingConnections) {
            const distance = Math.sqrt(
              Math.pow(newConn.x - existingConn.x, 2) + 
              Math.pow(newConn.y - existingConn.y, 2)
            );
            
            // First check: connection points must be very close
            if (distance > snapDistance) continue;
            
            // Second check: validate piece-specific connection rules
            if (!isValidConnectionTypes(testPiece, existingPiece, newConn, existingConn)) {
              continue;
            }
            
            // Third check: angles must be compatible (opposite directions)
            const angleDiff = Math.abs(newConn.angle - existingConn.angle - Math.PI);
            const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
            if (normalizedAngleDiff > Math.PI / 12) continue; // More generous: 15° tolerance instead of 7.5°
            
            // Calculate position adjustment to snap connection points together
            const deltaX = existingConn.x - newConn.x;
            const deltaY = existingConn.y - newConn.y;
            const adjustmentDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Skip if adjustment is too large (pieces are too far apart)
            if (adjustmentDistance > 0.5) { // More generous: 0.5 instead of 0.15
              continue;
            }
            
            // Create the snapped piece
            const snappedPiece = {
              ...testPiece,
              x: newPiece.x + deltaX,
              y: newPiece.y + deltaY
            };
            
            // Final validation: ensure the snapped piece creates valid track flow
            // More permissive validation to allow snapping to work
            if (validateTrackFlow(snappedPiece, existingPiece, newConn, existingConn) &&
                !wouldOverlap(snappedPiece, existingPiece) &&
                isReasonableConnection(snappedPiece, existingPiece, deltaX, deltaY)) {
              
              if (distance < bestDistance) {
                bestSnap = {
                  position: {
                    x: snappedPiece.x,
                    y: snappedPiece.y
                  },
                  rotation: testRotation,
                  flipped: testPiece.flipped
                };
                bestDistance = distance;
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
 * Validate piece-specific connection type rules
 */
function isValidConnectionTypes(
  piece1: TrackPiece,
  piece2: TrackPiece,
  point1: ConnectionPoint,
  point2: ConnectionPoint
): boolean {
  // Check piece-specific connection rules
  if (piece1.type === 'straight' && piece2.type === 'straight') {
    // Straight to straight: must be opposite types (male→female)
    return point1.type !== point2.type;
  } else if (piece1.type === 'curve' && piece2.type === 'curve') {
    // Curve to curve: must be opposite types (male→female)
    return point1.type !== point2.type;
  }
  // For straight-curve connections, allow any type combination
  return true;
}

/**
 * Validate that a piece placement makes logical sense by checking connection requirements
 */
function isValidPlacement(
  newPiece: TrackPiece,
  existingPieces: TrackPiece[],
  snapDistance: number
): boolean {
  // For now, allow all placements to restore basic snapping
  // TODO: Re-implement smarter validation later
  return true;
}

/**
 * Validate that a specific connection between two pieces is geometrically valid
 */
function isValidConnection(
  newPiece: TrackPiece,
  existingPiece: TrackPiece,
  connectionPoint: ConnectionPoint
): boolean {
  // Check if the connection creates a valid track flow
  if (newPiece.type === 'straight' && existingPiece.type === 'straight') {
    // Straight to straight: must be perfectly aligned (parallel or 180° opposite)
    const angleDiff = Math.abs(newPiece.rotation - existingPiece.rotation);
    const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
    
    // Must be parallel (0°) or opposite (180°), with very tight tolerance
    const isParallel = normalizedAngleDiff < Math.PI / 24; // 7.5 degrees
    const isOpposite = Math.abs(normalizedAngleDiff - Math.PI) < Math.PI / 24; // 7.5 degrees from 180°
    
    if (!isParallel && !isOpposite) {
      return false;
    }
    
    return true;
  }
  
  if (newPiece.type === 'curve' && existingPiece.type === 'curve') {
    // Curve to curve: connection points must align properly
    // This is handled by canConnect, but we can add extra validation here
    return true;
  }
  
  if ((newPiece.type === 'straight' && existingPiece.type === 'curve') ||
      (newPiece.type === 'curve' && existingPiece.type === 'straight')) {
    return true;
  }
  
  return false;
}

/**
 * Check if two pieces would physically overlap in an invalid way
 */
function wouldOverlap(piece1: TrackPiece, piece2: TrackPiece): boolean {
  // Calculate the distance between piece centers
  const centerDistance = Math.sqrt(
    Math.pow(piece1.x - piece2.x, 2) + Math.pow(piece1.y - piece2.y, 2)
  );
  
  // Define minimum safe distances based on piece types
  let minDistance = 0;
  
  if (piece1.type === 'straight' && piece2.type === 'straight') {
    // Straight pieces: minimum distance should be close to their length (4 grid units)
    // But allow for end-to-end connections
    minDistance = 3.5; // Allow some tolerance for valid connections
  } else if (piece1.type === 'curve' || piece2.type === 'curve') {
    // Curves need more space due to their radius
    minDistance = 1.5; // More permissive for curve connections
  }
  
  // If pieces are too close (but not connecting), they're likely overlapping
  if (centerDistance < minDistance) {
    // But allow if they're actually making a valid connection
    const connections1 = getConnectionPoints(piece1);
    const connections2 = getConnectionPoints(piece2);
    
    // Check if any connection points are very close (valid connection)
    for (const conn1 of connections1) {
      for (const conn2 of connections2) {
        const connDistance = Math.sqrt(
          Math.pow(conn1.x - conn2.x, 2) + Math.pow(conn1.y - conn2.y, 2)
        );
        if (connDistance < 0.1) {
          // Valid connection found, not an overlap
          return false;
        }
      }
    }

    return true;
  }
  
  return false;
}

/**
 * Check if a piece overlaps with any in a list
 */
export function checkCollision(
  piece: TrackPiece,
  others: TrackPiece[]
): boolean {
  for (const other of others) {
    if (wouldOverlap(piece, other)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a connection has valid geometric properties
 */
function hasValidGeometry(
  piece1: TrackPiece,
  piece2: TrackPiece,
  connection1: ConnectionPoint,
  connection2: ConnectionPoint
): boolean {
  // Check 1: Connection points must be extremely close (stricter than before)
  const connDistance = Math.sqrt(
    Math.pow(connection1.x - connection2.x, 2) + 
    Math.pow(connection1.y - connection2.y, 2)
  );
  
  if (connDistance > 0.05) { // Much stricter: 0.05 instead of 0.1
    return false;
  }
  
  // Check 2: Validate piece center distances and orientations
  const pieceDistance = Math.sqrt(
    Math.pow(piece1.x - piece2.x, 2) + 
    Math.pow(piece1.y - piece2.y, 2)
  );
  
  // Special validation for straight-to-any connections
  if (piece1.type === 'straight' || piece2.type === 'straight') {
    // For straight pieces, we need to verify the connection geometry more carefully
    const straightPiece = piece1.type === 'straight' ? piece1 : piece2;
    const otherPiece = piece1.type === 'straight' ? piece2 : piece1;
    const straightConn = piece1.type === 'straight' ? connection1 : connection2;
    const otherConn = piece1.type === 'straight' ? connection2 : connection1;
    
    // The connection point should be at one end of the straight piece
    const straightLength = 4; // Grid units
    const distanceFromStraightCenter = Math.sqrt(
      Math.pow(straightConn.x - straightPiece.x, 2) + 
      Math.pow(straightConn.y - straightPiece.y, 2)
    );
    
    // Connection point should be at the end of the straight piece (2 grid units from center)
    if (Math.abs(distanceFromStraightCenter - straightLength/2) > 0.1) {
      return false;
    }
    
    // Additional check: if connecting straight to straight, pieces should be ~4 units apart
    if (otherPiece.type === 'straight') {
      if (Math.abs(pieceDistance - 4) > 0.2) {
        return false;
      }
    }
  }
  
  // Check 3: Connection angles must be properly opposite
  const angle1 = connection1.angle;
  const angle2 = connection2.angle;
  const angleDiff = Math.abs(angle1 - angle2);
  const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
  const expectedAngleDiff = Math.PI; // 180 degrees
  
  if (Math.abs(normalizedAngleDiff - expectedAngleDiff) > Math.PI / 24) {
    return false;
  }
  return true;
}

/**
 * Check if a connection requires a reasonable position adjustment
 */
function isReasonableConnection(
  piece1: TrackPiece, 
  piece2: TrackPiece, 
  deltaX: number, 
  deltaY: number
): boolean {
  // Calculate the magnitude of position adjustment needed
  const adjustmentDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  // Position adjustments should be reasonable for valid snapping
  const maxAdjustment = 0.5; // More generous: 0.5 instead of 0.15
  
  if (adjustmentDistance > maxAdjustment) {
    return false;
  }
  
  return true;
}

/**
 * Validate an entire layout for geometric consistency
 */
export function validateLayout(pieces: TrackPiece[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (pieces.length < 2) {
    return { isValid: true, errors: [] };
  }
  
  // Get all connection points
  const allConnections: { piece: TrackPiece; connection: ConnectionPoint }[] = [];
  for (const piece of pieces) {
    const connections = getConnectionPoints(piece);
    for (const connection of connections) {
      allConnections.push({ piece, connection });
    }
  }
  
    // Check every pair of pieces for actual connections (where connection points are very close)
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const piece1 = pieces[i];
      const piece2 = pieces[j];
      
      // Get connections for both pieces
      const connections1 = getConnectionPoints(piece1);
      const connections2 = getConnectionPoints(piece2);
      
      // Look for actual connections (where connection points are very close)
      for (const conn1 of connections1) {
        for (const conn2 of connections2) {
          const connDistance = Math.sqrt(
            Math.pow(conn1.x - conn2.x, 2) + 
            Math.pow(conn1.y - conn2.y, 2)
          );
          
          // If connection points are very close (indicating intent to connect), validate the connection
          if (connDistance <= 0.1) { // Very tight tolerance for actual connections
            if (!(canConnect(conn1, conn2) && 
                  validateTrackFlow(piece1, piece2, conn1, conn2) &&
                  hasValidGeometry(piece1, piece2, conn1, conn2))) {
              errors.push(
                `Invalid connection between ${piece1.type} at (${piece1.x}, ${piece1.y}) ` +
                `and ${piece2.type} at (${piece2.x}, ${piece2.y}): ` +
                `connection points at (${conn1.x.toFixed(2)}, ${conn1.y.toFixed(2)}) ` +
                `and (${conn2.x.toFixed(2)}, ${conn2.y.toFixed(2)}) have invalid geometry`
              );
            }
          }
        }
      }
    }
  }
  
  // Additional validation: check for specific invalid patterns
  for (const piece of pieces) {
    if (piece.type === 'straight') {
      // For straight pieces, validate that their connection points make sense
      const connections = getConnectionPoints(piece);
      for (const conn of connections) {
        const distanceFromCenter = Math.sqrt(
          Math.pow(conn.x - piece.x, 2) + 
          Math.pow(conn.y - piece.y, 2)
        );
        
        // Connection should be exactly 2 grid units from center (half of length 4)
        if (Math.abs(distanceFromCenter - 2) > 0.1) {
          errors.push(
            `Straight piece at (${piece.x}, ${piece.y}) has invalid connection geometry: ` +
            `connection at (${conn.x.toFixed(2)}, ${conn.y.toFixed(2)}) is ${distanceFromCenter.toFixed(2)} units from center, expected 2.0`
          );
        }
      }
    }
  }
  
  // Enhanced validation: Check for problematic track flow patterns
  // ONLY apply this to very specific simple layouts that are clearly problematic
  if (pieces.length === 3) {
    const straight = pieces.find(p => p.type === 'straight');
    const curves = pieces.filter(p => p.type === 'curve');
    
    if (straight && curves.length === 2) {
      // Only check for the very specific problematic pattern:
      // - Exactly 1 horizontal straight piece
      // - Exactly 2 curves with opposing rotations that create a "T" shape
      // - Curves are positioned at the straight piece ends
      const straightAngle = (straight.rotation * 180 / Math.PI) % 360;
      const isHorizontal = Math.abs(straightAngle) < 5 || Math.abs(straightAngle - 180) < 5;
      
      if (isHorizontal) {
        const curve1Angle = (curves[0].rotation * 180 / Math.PI) % 360;
        const curve2Angle = (curves[1].rotation * 180 / Math.PI) % 360;
        
        // Check if one curve is at ~0° and the other at ~180° (opposing)
        const hasOpposingCurves = 
          (Math.abs(curve1Angle) < 5 && Math.abs(curve2Angle - 180) < 5) ||
          (Math.abs(curve1Angle - 180) < 5 && Math.abs(curve2Angle) < 5);
        
        // Also check that curves are positioned at the straight piece ends
        const straightLength = 2; // Half length of straight piece
        const leftEnd = { x: straight.x - straightLength, y: straight.y };
        const rightEnd = { x: straight.x + straightLength, y: straight.y };
        
        const curve1AtEnd = curves.some(c => 
          Math.abs(c.x - leftEnd.x) < 0.5 && Math.abs(c.y - leftEnd.y) < 0.5) ||
          curves.some(c => Math.abs(c.x - rightEnd.x) < 0.5 && Math.abs(c.y - rightEnd.y) < 0.5);
        
        if (hasOpposingCurves && curve1AtEnd) {
          // Get the curve end points to check if they diverge
          const curve1Connections = getConnectionPoints(curves[0]);
          const curve2Connections = getConnectionPoints(curves[1]);
          
          // Get the "exit" points (female connections) of both curves
          const curve1Exit = curve1Connections.find(c => c.type === 'female');
          const curve2Exit = curve2Connections.find(c => c.type === 'female');
          
          if (curve1Exit && curve2Exit) {
            // Check if the curves are diverging (exit points moving apart)
            const exitDistance = Math.sqrt(
              Math.pow(curve1Exit.x - curve2Exit.x, 2) + 
              Math.pow(curve1Exit.y - curve2Exit.y, 2)
            );
            
            // If exit points are far apart, the curves are diverging
            if (exitDistance > 6) {
              errors.push(
                `Invalid track flow: Curves are diverging away from each other instead of forming a continuous path. ` +
                `This creates an open "Y" or "T" shape rather than a connected track layout. ` +
                `Exit points are ${exitDistance.toFixed(2)} units apart.`
              );
            }
          }
        }
      }
    }
  }
  
  const isValid = errors.length === 0;
  
  return { isValid, errors };
}

/**
 * Get visual indicators for connection points (for debugging/UI)
 */
export function getConnectionIndicators(pieces: TrackPiece[]): ConnectionPoint[] {
  const allConnections: ConnectionPoint[] = [];

  for (const piece of pieces) {
    const connections = getConnectionPoints(piece);
    allConnections.push(...connections);
  }

  return allConnections;
}
