interface TrackPiece {
  x: number;
  y: number;
  type: 'straight' | 'curve';
  rotation: number;
  flipped?: boolean;
}

export function useAutoLayout() {
  function generateAutoLayout(straightCount: number, curveCount: number): TrackPiece[] {
    const pieces: TrackPiece[] = [];
    
    // Strategy 1: If we have exactly 16 curves (or close), make a circle
    if (curveCount >= 12 && curveCount <= 20 && straightCount <= 4) {
      generateCircleLayout(pieces, curveCount, straightCount);
    }
    // Strategy 2: Create a simple oval/loop layout
    else if (straightCount >= 2 && curveCount >= 4) {
      generateOvalLayout(pieces, straightCount, curveCount);
    }
    // Strategy 3: Create a simple connected sequence
    else {
      generateSequenceLayout(pieces, straightCount, curveCount);
    }
    
    return pieces;
  }
  
  function generateCircleLayout(pieces: TrackPiece[], curveCount: number, straightCount: number): void {
    const totalCurves = Math.min(curveCount, 16); // Max 16 curves for perfect circle
    
    // All pieces should be at the same center position
    const centerX = -1;
    const centerY = 2;
    const rotationStep = Math.PI / 8; // 22.5 degrees per piece
    
    // Place curves all at the same position with incremental rotations
    for (let i = 0; i < totalCurves; i++) {
      const rotation = i * rotationStep;
      
      pieces.push({
        x: centerX,
        y: centerY,
        type: 'curve',
        rotation: rotation,
        flipped: false
      });
    }
    
    // Place any straights and extra curves to the side
    placePiecesToSide(pieces, 0, straightCount, totalCurves, curveCount);
  }
  
  function generateOvalLayout(pieces: TrackPiece[], straightCount: number, curveCount: number): void {
    let usedStraights = 0;
    let usedCurves = 0;
    
    // Calculate how many straights per side (minimum 1 per side)
    const straightsPerSide = Math.max(1, Math.floor(straightCount / 2));
    
    // For curves, use exactly 8 curves per 180° turn (16 total for oval)
    const curvesPerTurn = Math.min(8, Math.floor(curveCount / 2));
    
    // Calculate proper spacing for oval layout
    const straightSpacing = 4; // Proper spacing between straights
    const ovalWidth = (straightsPerSide - 1) * straightSpacing;
    
    // Bottom straight section (left to right)
    const bottomY = -8;
    const startX = -ovalWidth / 2;
    for (let i = 0; i < straightsPerSide && usedStraights < straightCount; i++) {
      pieces.push({
        x: startX + (i * straightSpacing),
        y: bottomY,
        type: 'straight',
        rotation: 0, // Horizontal - pointing right
        flipped: false
      });
      usedStraights++;
    }
    
    // Right turn curves (270° to 90° - bottom to top turn)
    const rightCurveX = startX + ovalWidth + 2;
    const rightCurveY = 2; // Center between top and bottom
    for (let i = 0; i < curvesPerTurn && usedCurves < curveCount; i++) {
      // Start from 270° (pointing up) and go to 90° (8 curves × 22.5° = 180°)
      const rotation = (3 * Math.PI / 2) + (i * (Math.PI / 8)); // 270° + increments
      
      pieces.push({
        x: rightCurveX,
        y: rightCurveY,
        type: 'curve',
        rotation: rotation,
        flipped: false
      });
      usedCurves++;
    }
    
    // Top straight section (right to left)
    const topY = 12;
    for (let i = 0; i < straightsPerSide && usedStraights < straightCount; i++) {
      pieces.push({
        x: startX + ovalWidth - (i * straightSpacing),
        y: topY,
        type: 'straight',
        rotation: 0, // Keep horizontal (same as bottom)
        flipped: false
      });
      usedStraights++;
    }
    
    // Left turn curves (90° to 270° - top to bottom turn)
    const leftCurveX = startX - 2;
    const leftCurveY = 2; // Center between top and bottom
    for (let i = 0; i < curvesPerTurn && usedCurves < curveCount; i++) {
      // Start from 90° (pointing up) and go to 270° (8 curves × 22.5° = 180°)
      const rotation = (Math.PI / 2) + (i * (Math.PI / 8)); // 90° + increments
      
      pieces.push({
        x: leftCurveX,
        y: leftCurveY,
        type: 'curve',
        rotation: rotation,
        flipped: false
      });
      usedCurves++;
    }
    
    // Place remaining pieces to the side
    placePiecesToSide(pieces, usedStraights, straightCount, usedCurves, curveCount);
  }
  
  function generateSequenceLayout(pieces: TrackPiece[], straightCount: number, curveCount: number): void {
    let x = 0, y = 0, rotation = 0;
    let usedStraights = 0, usedCurves = 0;
    
    // Simple alternating pattern with tight connections
    const totalPieces = straightCount + curveCount;
    
    for (let i = 0; i < totalPieces; i++) {
      let pieceType: 'straight' | 'curve';
      
      // Alternate between types, but respect limits
      if (usedStraights >= straightCount) {
        pieceType = 'curve';
      } else if (usedCurves >= curveCount) {
        pieceType = 'straight';
      } else {
        // Alternate with slight preference for variety
        pieceType = (i % 3 === 0 && usedCurves < curveCount) ? 'curve' : 'straight';
      }
      
      pieces.push({
        x: Math.round(x),
        y: Math.round(y),
        type: pieceType,
        rotation: rotation,
        flipped: false
      });
      
      // Advance position with tight spacing
      if (pieceType === 'straight') {
        // Straight pieces: advance just 2 grid units
        x += Math.cos(rotation) * 2;
        y += Math.sin(rotation) * 2;
        usedStraights++;
      } else {
        // Curve pieces: small advancement and rotate
        rotation += Math.PI / 8; // 22.5 degrees
        x += Math.cos(rotation) * 1.5;
        y += Math.sin(rotation) * 1.5;
        usedCurves++;
      }
    }
  }
  
  function placePiecesToSide(pieces: TrackPiece[], usedStraights: number, totalStraights: number, usedCurves: number, totalCurves: number): void {
    let sideX = 15;
    let sideY = 0;
    
    // Add remaining straights
    for (let i = usedStraights; i < totalStraights; i++) {
      pieces.push({
        x: sideX,
        y: sideY,
        type: 'straight',
        rotation: 0,
        flipped: false
      });
      sideY += 2;
      if (sideY > 8) {
        sideY = 0;
        sideX += 4;
      }
    }
    
    // Add remaining curves
    for (let i = usedCurves; i < totalCurves; i++) {
      pieces.push({
        x: sideX,
        y: sideY,
        type: 'curve',
        rotation: 0,
        flipped: false
      });
      sideY += 2;
      if (sideY > 8) {
        sideY = 0;
        sideX += 4;
      }
    }
  }

  return {
    generateAutoLayout
  };
}
