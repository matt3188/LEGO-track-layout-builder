import { getConnectionPoints, canConnect, findSnapPosition, type ConnectionPoint } from './trackPieces/connections';

interface TrackPiece {
  x: number;
  y: number;
  type: 'straight' | 'curve';
  rotation: number;
  flipped?: boolean;
}

interface LayoutStrategy {
  name: string;
  priority: number;
  canBuild: (straights: number, curves: number) => boolean;
  build: (straights: number, curves: number) => TrackPiece[];
}

export function useAutoLayout() {
  function generateAutoLayout(straightCount: number, curveCount: number): TrackPiece[] {
    // Define intelligent layout strategies in order of preference
    const strategies: LayoutStrategy[] = [
      {
        name: 'Perfect Circle',
        priority: 1,
        canBuild: (s, c) => c === 16 && s === 0,
        build: (s, c) => buildPerfectCircle()
      },
      {
        name: 'Oval Loop',
        priority: 2,
        canBuild: (s, c) => c === 16 && s === 8,
        build: (s, c) => buildOvalLoop()
      },
      {
        name: 'Connected Loop',
        priority: 3,
        canBuild: (s, c) => c >= 4 && (s + c) >= 6,
        build: (s, c) => buildConnectedLoop(s, c)
      },
      {
        name: 'Linear Chain',
        priority: 4,
        canBuild: (s, c) => (s + c) >= 2,
        build: (s, c) => buildLinearChain(s, c)
      },
      {
        name: 'Scattered Placement',
        priority: 5,
        canBuild: (s, c) => true,
        build: (s, c) => buildScatteredLayout(s, c)
      }
    ];

    // Find the best strategy that can handle the given pieces
    for (const strategy of strategies) {
      if (strategy.canBuild(straightCount, curveCount)) {
        return strategy.build(straightCount, curveCount);
      }
    }

    // Fallback (should never reach here)
    return [];
  }

  /**
   * Build a perfect circle with 16 curves using working geometry
   */
  function buildPerfectCircle(): TrackPiece[] {
    const pieces: TrackPiece[] = [];
    const totalCurves = 16;
    const angleStep = Math.PI / 8; // 22.5 degrees per curve
    
    // Based on your working example, the circle has radius ~12 and is offset
    // Start with the first curve at (4, 2) like in your example
    const startX = 4;
    const startY = 2;
    
    // Calculate the center of the circle from the first piece
    const centerX = startX - 10; // Offset by curve radius
    const centerY = startY;
    
    // Place each curve using the actual geometry from your working example
    for (let i = 0; i < totalCurves; i++) {
      const angle = i * angleStep;
      
      // Calculate position relative to circle center
      const radius = 10; // Internal curve radius
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      // Set rotation to match connection requirements
      let rotation = angle;
      
      // For the second half of the circle, use negative rotations (like your example)
      if (i >= 8) {
        rotation = angle - 2 * Math.PI;
      }
      
      pieces.push({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        type: 'curve',
        rotation: rotation,
        flipped: false
      });
    }
    
    return pieces;
  }

  /**
   * Build known working oval loop (for 8 straights + 16 curves)
   */
  function buildOvalLoop(): TrackPiece[] {
    const originalPieces = [
      { x: 1, y: 4, type: 'straight', rotation: 0, flipped: false },
      { x: 1, y: -16, type: 'straight', rotation: 0, flipped: false },
      { x: 13, y: -6, type: 'curve', rotation: 6.2831853071795924, flipped: false },
      { x: 12.238795325112847, y: -2.1731656763491105, type: 'curve', rotation: 0.39269908169872414, flipped: false },
      { x: 10.071067811865454, y: 1.0710678118654657, type: 'curve', rotation: 0.7853981633974483, flipped: false },
      { x: 6.826834323650877, y: 3.238795325112859, type: 'curve', rotation: 1.1780972450961724, flipped: false },
      { x: 12.238795325112864, y: -9.826834323650901, type: 'curve', rotation: 5.890486225480862, flipped: false },
      { x: 10.071067811865468, y: -13.07106781186548, type: 'curve', rotation: 5.497787143782137, flipped: false },
      { x: 6.826834323650884, y: -15.23879532511287, type: 'curve', rotation: 5.1050880620834125, flipped: false },
      { x: 2.9999999999999805, y: -15.999999999999996, type: 'curve', rotation: 4.712388980384688, flipped: false },
      { x: -3, y: 4, type: 'straight', rotation: 0, flipped: false },
      { x: -3, y: -16, type: 'straight', rotation: 0, flipped: false },
      { x: -7, y: -16, type: 'straight', rotation: 0, flipped: false },
      { x: -7, y: 4, type: 'straight', rotation: 0, flipped: false },
      { x: -13, y: 4, type: 'curve', rotation: 1.5707963267948983, flipped: false },
      { x: -11, y: 4, type: 'straight', rotation: 0, flipped: false },
      { x: -11, y: -16, type: 'straight', rotation: 0, flipped: false },
      { x: -16.826834323650896, y: 3.2387953251128607, type: 'curve', rotation: 1.9634954084936207, flipped: false },
      { x: -20.071067811865476, y: 1.0710678118654684, type: 'curve', rotation: 2.356194490192345, flipped: false },
      { x: -22.238795325112868, y: -2.1731656763491083, type: 'curve', rotation: 2.748893571891069, flipped: false },
      { x: -23, y: -6.000000000000006, type: 'curve', rotation: 3.141592653589793, flipped: false },
      { x: -22.238795325112868, y: -9.826834323650903, type: 'curve', rotation: -2.748893571891069, flipped: false },
      { x: -20.071067811865476, y: -13.071067811865479, type: 'curve', rotation: -2.356194490192345, flipped: false },
      { x: -16.826834323650896, y: -15.238795325112871, type: 'curve', rotation: -1.9634954084936207, flipped: false }
    ];
    
    // Calculate the center of the original oval to offset it
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const piece of originalPieces) {
      minX = Math.min(minX, piece.x);
      maxX = Math.max(maxX, piece.x);
      minY = Math.min(minY, piece.y);
      maxY = Math.max(maxY, piece.y);
    }
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Offset all pieces to center the oval at (0, 0)
    return originalPieces.map(piece => ({
      x: Math.round((piece.x - centerX) * 100) / 100,
      y: Math.round((piece.y - centerY) * 100) / 100,
      type: piece.type as 'straight' | 'curve',
      rotation: piece.rotation,
      flipped: piece.flipped
    }));
  }

  /**
   * Build a connected loop using intelligent connection logic
   */
  function buildConnectedLoop(straightCount: number, curveCount: number): TrackPiece[] {
    const pieces: TrackPiece[] = [];
    const totalPieces = straightCount + curveCount;
    
    // Start with first piece at origin
    const firstPiece: TrackPiece = {
      x: 0,
      y: 0,
      type: curveCount > 0 ? 'curve' : 'straight',
      rotation: 0,
      flipped: false
    };
    pieces.push(firstPiece);
    
    let remainingStraights = straightCount - (firstPiece.type === 'straight' ? 1 : 0);
    let remainingCurves = curveCount - (firstPiece.type === 'curve' ? 1 : 0);
    
    // Build the rest of the track by connecting pieces intelligently
    for (let i = 1; i < totalPieces; i++) {
      const nextPiece = findNextConnectedPiece(pieces, remainingStraights, remainingCurves);
      
      if (nextPiece) {
        pieces.push(nextPiece);
        
        if (nextPiece.type === 'straight') {
          remainingStraights--;
        } else {
          remainingCurves--;
        }
      } else {
        // If we can't connect, place remaining pieces to the side
        break;
      }
    }
    
    // Place any remaining pieces
    placeRemainingPieces(pieces, remainingStraights, remainingCurves);
    
    return pieces;
  }

  /**
   * Find the next piece that can connect to the existing layout
   */
  function findNextConnectedPiece(
    existingPieces: TrackPiece[],
    remainingStraights: number,
    remainingCurves: number
  ): TrackPiece | null {
    // Get all open connection points
    const openConnections = findOpenConnections(existingPieces);
    
    if (openConnections.length === 0) return null;
    
    // Try to connect to the first open connection point
    const targetConnection = openConnections[0];
    
    // Determine which piece type to try first based on what's available
    const pieceTypes: ('straight' | 'curve')[] = [];
    if (remainingCurves > 0) pieceTypes.push('curve');
    if (remainingStraights > 0) pieceTypes.push('straight');
    
    for (const pieceType of pieceTypes) {
      const newPiece = createConnectingPiece(targetConnection, pieceType);
      
      if (newPiece && !wouldCollide(newPiece, existingPieces)) {
        return newPiece;
      }
    }
    
    return null;
  }

  /**
   * Find all open (unconnected) connection points in the layout
   */
  function findOpenConnections(pieces: TrackPiece[]): ConnectionPoint[] {
    const allConnections: ConnectionPoint[] = [];
    
    // Get all connection points
    for (const piece of pieces) {
      allConnections.push(...getConnectionPoints(piece));
    }
    
    // Find connections that aren't paired with another connection
    const openConnections: ConnectionPoint[] = [];
    
    for (let i = 0; i < allConnections.length; i++) {
      const connection = allConnections[i];
      let hasPartner = false;
      
      for (let j = 0; j < allConnections.length; j++) {
        if (i !== j && canConnect(connection, allConnections[j])) {
          hasPartner = true;
          break;
        }
      }
      
      if (!hasPartner) {
        openConnections.push(connection);
      }
    }
    
    return openConnections;
  }

  /**
   * Create a piece that connects to a specific connection point
   */
  function createConnectingPiece(
    targetConnection: ConnectionPoint,
    pieceType: 'straight' | 'curve'
  ): TrackPiece | null {
    // Calculate where to place the new piece
    const connectingAngle = targetConnection.angle + Math.PI; // Opposite direction
    
    if (pieceType === 'straight') {
      // For straight pieces, place it aligned with the connection
      const length = 4; // Grid units
      const cos = Math.cos(connectingAngle);
      const sin = Math.sin(connectingAngle);
      
      return {
        x: targetConnection.x + (length / 2) * cos,
        y: targetConnection.y + (length / 2) * sin,
        type: 'straight',
        rotation: connectingAngle,
        flipped: false
      };
    } else {
      // For curve pieces, this is more complex due to the arc
      // We'll use a simplified approach - place it at the connection point
      // and let the snap system handle the precise positioning
      return {
        x: targetConnection.x,
        y: targetConnection.y,
        type: 'curve',
        rotation: connectingAngle,
        flipped: false
      };
    }
  }

  /**
   * Check if a piece would collide with existing pieces
   */
  function wouldCollide(newPiece: TrackPiece, existingPieces: TrackPiece[]): boolean {
    for (const existingPiece of existingPieces) {
      const distance = Math.sqrt(
        Math.pow(newPiece.x - existingPiece.x, 2) + 
        Math.pow(newPiece.y - existingPiece.y, 2)
      );
      
      // Too close without proper connection
      if (distance < 1.0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Build a linear chain of connected pieces
   */
  function buildLinearChain(straightCount: number, curveCount: number): TrackPiece[] {
    const pieces: TrackPiece[] = [];
    let currentX = 0;
    let currentY = 0;
    let currentRotation = 0;
    
    let remainingStraights = straightCount;
    let remainingCurves = curveCount;
    
    // Alternate between piece types for variety
    while (remainingStraights > 0 || remainingCurves > 0) {
      let pieceType: 'straight' | 'curve';
      
      // Choose piece type based on availability and variety
      if (remainingStraights === 0) {
        pieceType = 'curve';
      } else if (remainingCurves === 0) {
        pieceType = 'straight';
      } else {
        // Alternate with slight preference for curves for interesting shapes
        pieceType = (pieces.length % 3 === 0) ? 'curve' : 'straight';
      }
      
      const piece: TrackPiece = {
        x: Math.round(currentX),
        y: Math.round(currentY),
        type: pieceType,
        rotation: currentRotation,
        flipped: false
      };
      
      pieces.push(piece);
      
      // Update position for next piece
      if (pieceType === 'straight') {
        remainingStraights--;
        // Move forward by the length of the straight piece
        currentX += Math.cos(currentRotation) * 4;
        currentY += Math.sin(currentRotation) * 4;
      } else {
        remainingCurves--;
        // For curves, rotate and move to approximate end position
        currentRotation += Math.PI / 8; // 22.5 degrees
        currentX += Math.cos(currentRotation) * 3;
        currentY += Math.sin(currentRotation) * 3;
      }
    }
    
    return pieces;
  }

  /**
   * Place remaining pieces to the side
   */
  function placeRemainingPieces(
    pieces: TrackPiece[],
    remainingStraights: number,
    remainingCurves: number
  ): void {
    let sideX = 15;
    let sideY = 0;
    
    // Add remaining straights
    for (let i = 0; i < remainingStraights; i++) {
      pieces.push({
        x: sideX,
        y: sideY,
        type: 'straight',
        rotation: 0,
        flipped: false
      });
      sideY += 3;
      if (sideY > 10) {
        sideY = 0;
        sideX += 6;
      }
    }
    
    // Add remaining curves
    for (let i = 0; i < remainingCurves; i++) {
      pieces.push({
        x: sideX,
        y: sideY,
        type: 'curve',
        rotation: 0,
        flipped: false
      });
      sideY += 3;
      if (sideY > 10) {
        sideY = 0;
        sideX += 6;
      }
    }
  }

  /**
   * Fallback: scatter pieces in a grid
   */
  function buildScatteredLayout(straightCount: number, curveCount: number): TrackPiece[] {
    const pieces: TrackPiece[] = [];
    let x = 0;
    let y = 0;
    
    // Place straights
    for (let i = 0; i < straightCount; i++) {
      pieces.push({
        x: x,
        y: y,
        type: 'straight',
        rotation: 0,
        flipped: false
      });
      x += 6;
      if (x > 20) {
        x = 0;
        y += 4;
      }
    }
    
    // Place curves
    for (let i = 0; i < curveCount; i++) {
      pieces.push({
        x: x,
        y: y,
        type: 'curve',
        rotation: 0,
        flipped: false
      });
      x += 6;
      if (x > 20) {
        x = 0;
        y += 4;
      }
    }
    
    return pieces;
  }
  return {
    generateAutoLayout
  };
}
