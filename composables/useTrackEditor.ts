import { ref, type Ref } from '#imports';
import { 
  renderTrackPiece, 
  findSnapPosition, 
  getConnectionIndicators,
  type TrackPiece, 
  type GhostPiece, 
  type TrackPieceType,
  type ConnectionPoint 
} from './trackPieces';

interface UseTrackEditorOptions {
  canvas: Ref<HTMLCanvasElement | null>;
  copyStatus: Ref<string>;
}

export function useTrackEditor({ canvas, copyStatus }: UseTrackEditorOptions) {
  const pieces = ref<TrackPiece[]>([]);
  const zoom = ref(1);
  let offsetX = 0;
  let offsetY = 0;
  const offsetPanX = ref(0);
  const offsetPanY = ref(0);
  const isPanning = ref(false);
  const panStartX = ref(0);
  const panStartY = ref(0);
  const selectedPieceType = ref<TrackPieceType>(null);
  const ghostPiece = ref<GhostPiece | null>(null);
  const snappedGhostPiece = ref<GhostPiece | null>(null); // Snapped version of ghost piece
  const draggingPiece = ref<TrackPiece | null>(null);
  const hoveredPiece = ref<TrackPiece | null>(null);
  const isDeleteMode = ref(false);
  const showConnectionPoints = ref(false); // Debug: show connection points
  const lastMouseX = ref(0);
  const lastMouseY = ref(0);
  const historyStack = ref<TrackPiece[][]>([]);
  const hasDragged = ref(false); // Track if we've dragged during current mouse operation
  const isShiftPressed = ref(false); // Track if shift is being held
  const baseGridSize = 32;
  let ctx: CanvasRenderingContext2D | null = null;

  // Import auto-layout functionality
  const { generateAutoLayout: generateAutoLayoutPieces } = useAutoLayout();

  function getGridSize(): number {
    return baseGridSize * zoom.value;
  }

  function findPieceAtPosition(mouseX: number, mouseY: number): TrackPiece | null {
    for (const piece of pieces.value) {
      const [px, py] = toCanvasCoords(piece.x, piece.y);
      const dx = mouseX - px;
      const dy = mouseY - py;

      const localX = dx * Math.cos(-piece.rotation) - dy * Math.sin(-piece.rotation);
      const localY = dx * Math.sin(-piece.rotation) + dy * Math.cos(-piece.rotation);

      if (piece.type === 'straight') {
        if (Math.abs(localX) < 64 * zoom.value && Math.abs(localY) < 16 * zoom.value) {
          return piece;
        }
      } else if (piece.type === 'curve') {
        // For curve pieces, we need to check relative to the curve's arc center
        // The curve is offset by -radius from the piece center
        const offsetX = localX + 320 * zoom.value; // Add back the offset
        const offsetY = localY;
        
        const dist = Math.sqrt(offsetX ** 2 + offsetY ** 2);
        const angle = Math.atan2(offsetY, offsetX);
        
        // Normalize angle to 0-2π range
        const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
        
        if (
          dist >= 300 * zoom.value &&  // Inner radius
          dist <= 340 * zoom.value &&  // Outer radius
          normalizedAngle >= 0 &&
          normalizedAngle <= Math.PI / 8
        ) {
          return piece;
        }
      }
    }
    return null;
  }

  function toCanvasCoords(x: number, y: number): [number, number] {
    const gridSize = getGridSize();
    const el = canvas.value!;
    return [
      el.width / 2 + offsetPanX.value + x * gridSize,
      el.height / 2 + offsetPanY.value + y * gridSize,
    ];
  }

  function drawGrid(): void {
    const gridSize = getGridSize();
    if (!ctx || !canvas.value) return;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    for (
      let x = -canvas.value.width;
      x < canvas.value.width * 2;
      x += gridSize
    ) {
      ctx.beginPath();
      ctx.moveTo(x + (offsetPanX.value % gridSize), 0);
      ctx.lineTo(x + (offsetPanX.value % gridSize), canvas.value.height);
      ctx.stroke();
    }

    for (
      let y = -canvas.value.height;
      y < canvas.value.height * 2;
      y += gridSize
    ) {
      ctx.beginPath();
      ctx.moveTo(0, y + (offsetPanY.value % gridSize));
      ctx.lineTo(canvas.value.width, y + (offsetPanY.value % gridSize));
      ctx.stroke();
    }
  }

  function drawTrackPiece(piece: TrackPiece, isGhost = false, isHovered = false): void {
    if (!ctx) return;

    const [posX, posY] = toCanvasCoords(piece.x, piece.y);
    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate(piece.rotation);
    
    // Apply horizontal flip if the piece is flipped
    if (piece.flipped) {
      ctx.scale(-1, 1);
    }

    // Set alpha based on state
    if (isGhost) {
      ctx.globalAlpha = 0.4;
    } else if (isHovered && isDeleteMode.value) {
      ctx.globalAlpha = 0.7;
    } else {
      ctx.globalAlpha = 1;
    }

    // Render the track piece using the modular system
    renderTrackPiece(piece, {
      ctx,
      zoom: zoom.value,
      isGhost,
      isHovered,
      isDeleteMode: isDeleteMode.value
    });

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawGhostPiece(): void {
    if (!ghostPiece.value) return;
    
    // Draw the snapped version if available, otherwise the regular ghost
    const pieceToRender = snappedGhostPiece.value || ghostPiece.value;
    drawTrackPiece(pieceToRender, true);
  }

  function redraw(): void {
    if (!ctx || !canvas.value) return;
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
    drawGrid();
    drawGhostPiece();
    pieces.value.forEach((p) => {
      const isHovered = hoveredPiece.value === p;
      drawTrackPiece(p, false, isHovered);
    });
  }

  function saveHistoryIfChanged(): void {
    const last = historyStack.value[historyStack.value.length - 1];
    const current = JSON.stringify(pieces.value);
    if (!last || JSON.stringify(last) !== current) {
      historyStack.value.push(JSON.parse(current));
    }
  }

  function undoLastAction(): void {
    if (historyStack.value.length > 0) {
      pieces.value = historyStack.value.pop()!;
      redraw();
    }
  }

  function copyLayout(): void {
    const json = JSON.stringify(pieces.value, null, 2);
    
    // Check if clipboard API is available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(json)
        .then(() => {
          copyStatus.value = 'Copied!';
          setTimeout(() => (copyStatus.value = ''), 2000);
        })
        .catch((err) => {
          copyStatus.value = 'Failed to copy';
          console.error('Copy failed:', err);
          fallbackCopy(json);
        });
    } else {
      // Fallback for environments without clipboard API
      fallbackCopy(json);
    }
  }

  function fallbackCopy(text: string): void {
    try {
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      copyStatus.value = 'Copied!';
      setTimeout(() => (copyStatus.value = ''), 2000);
    } catch (err) {
      console.error('Fallback copy failed:', err);
      copyStatus.value = 'Copy failed - please copy manually';
      console.log('Layout JSON:', text);
      setTimeout(() => (copyStatus.value = ''), 3000);
    }
  }

  function addStraight(): void {
    selectedPieceType.value = 'straight';
    
    // Calculate current mouse position on grid
    const gridSize = getGridSize();
    const [canvasCenterX, canvasCenterY] = toCanvasCoords(0, 0);
    const snappedX = Math.round((lastMouseX.value - canvasCenterX) / gridSize);
    const snappedY = Math.round((lastMouseY.value - canvasCenterY) / gridSize);
    
    ghostPiece.value = { 
      x: snappedX, 
      y: snappedY, 
      type: 'straight', 
      rotation: 0,
      flipped: false
    };
    isDeleteMode.value = false;
    hoveredPiece.value = null;
    redraw();
  }

  function addCurve(): void {
    selectedPieceType.value = 'curve';
    
    // Calculate current mouse position on grid
    const gridSize = getGridSize();
    const [canvasCenterX, canvasCenterY] = toCanvasCoords(0, 0);
    const snappedX = Math.round((lastMouseX.value - canvasCenterX) / gridSize);
    const snappedY = Math.round((lastMouseY.value - canvasCenterY) / gridSize);
    
    ghostPiece.value = { 
      x: snappedX, 
      y: snappedY, 
      type: 'curve', 
      rotation: 0,
      flipped: false
    };
    isDeleteMode.value = false;
    hoveredPiece.value = null;
    redraw();
  }

  function clearSelection(): void {
    selectedPieceType.value = null;
    ghostPiece.value = null;
    snappedGhostPiece.value = null;
    isDeleteMode.value = false;
    hoveredPiece.value = null;
  }

  function enableDeleteMode(): void {
    isDeleteMode.value = true;
    selectedPieceType.value = null;
    ghostPiece.value = null;
    snappedGhostPiece.value = null;
    hoveredPiece.value = null;
    redraw();
  }

  function deletePiece(piece: TrackPiece): void {
    const index = pieces.value.indexOf(piece);
    if (index > -1) {
      saveHistoryIfChanged();
      pieces.value.splice(index, 1);
      hoveredPiece.value = null;
      redraw();
    }
  }

  function clearPieces(): void {
    pieces.value = [];
    redraw();
  }

  function resizeCanvas(): void {
    if (!canvas.value) return;
    canvas.value.width = window.innerWidth;
    canvas.value.height = window.innerHeight;
    redraw();
  }

  function handleMouseDown(e: MouseEvent): void {
    if (!canvas.value) return;
    const rect = canvas.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const gridSize = getGridSize();

    // Reset drag tracking
    hasDragged.value = false;

    // Don't allow dragging in delete mode
    if (isDeleteMode.value) return;

    isPanning.value = true;
    panStartX.value = mouseX;
    panStartY.value = mouseY;

    const pieceAtPosition = findPieceAtPosition(mouseX, mouseY);
    if (pieceAtPosition) {
      draggingPiece.value = pieceAtPosition;
      const [px, py] = toCanvasCoords(pieceAtPosition.x, pieceAtPosition.y);
      offsetX = (mouseX - px) / gridSize;
      offsetY = (mouseY - py) / gridSize;
      isPanning.value = false;
    }
    
    saveHistoryIfChanged();
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!canvas.value) return;
    const rect = canvas.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    lastMouseX.value = mouseX;
    lastMouseY.value = mouseY;

    const gridSize = getGridSize();

    // Track if we've moved the mouse (indicating a drag)
    if (isPanning.value || draggingPiece.value) {
      hasDragged.value = true;
    }

    // Update cursor style based on mode
    if (isDeleteMode.value) {
      canvas.value.style.cursor = 'crosshair';
      // Update hovered piece for delete mode
      const pieceUnderMouse = findPieceAtPosition(mouseX, mouseY);
      if (hoveredPiece.value !== pieceUnderMouse) {
        hoveredPiece.value = pieceUnderMouse;
        redraw();
      }
    } else {
      canvas.value.style.cursor = draggingPiece.value ? 'grabbing' : 'default';
    }

    if (ghostPiece.value && !isDeleteMode.value) {
      updateGhostPiecePosition(mouseX, mouseY);
      redraw();
    }

    if (draggingPiece.value && !isDeleteMode.value) {
      const [px, py] = toCanvasCoords(0, 0);
      const snapX = Math.round((mouseX - px) / gridSize - offsetX);
      const snapY = Math.round((mouseY - py) / gridSize - offsetY);
      draggingPiece.value.x = Math.round(snapX);
      draggingPiece.value.y = Math.round(snapY);
      redraw();
    } else if (isPanning.value) {
      offsetPanX.value += mouseX - panStartX.value;
      offsetPanY.value += mouseY - panStartY.value;
      panStartX.value = mouseX;
      panStartY.value = mouseY;
      redraw();
    }
  }

  function handleMouseUp(e: MouseEvent): void {
    if (draggingPiece.value) {
      draggingPiece.value = null;
      saveHistoryIfChanged();
    }
    isPanning.value = false;
    
    // Don't place pieces if we were dragging (panning or moving pieces)
    if (hasDragged.value) return;
    
    if (!canvas.value) return;
    const rect = canvas.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Handle delete mode
    if (isDeleteMode.value) {
      const pieceToDelete = findPieceAtPosition(mouseX, mouseY);
      if (pieceToDelete) {
        deletePiece(pieceToDelete);
      }
      return;
    }

    // Handle normal piece placement
    if (!selectedPieceType.value) return;
    
    // Calculate grid position
    const gridSize = getGridSize();
    const [centerX, centerY] = toCanvasCoords(0, 0);
    const x = Math.round((mouseX - centerX) / gridSize);
    const y = Math.round((mouseY - centerY) / gridSize);
    
    // Create piece to place - use snapped position if available, otherwise use calculated position
    let pieceToPlace: TrackPiece;
    
    if (snappedGhostPiece.value) {
      // Use snapped position
      pieceToPlace = {
        ...snappedGhostPiece.value
      };
    } else if (ghostPiece.value) {
      // Use regular ghost position
      pieceToPlace = {
        ...ghostPiece.value
      };
    } else {
      // Create new piece at cursor position
      pieceToPlace = {
        x,
        y,
        type: selectedPieceType.value,
        rotation: 0,
        flipped: false
      };
    }
    
    pieces.value.push(pieceToPlace);
    
    // Update ghost piece for next placement
    ghostPiece.value = {
      x,
      y,
      type: selectedPieceType.value,
      rotation: ghostPiece.value?.rotation || 0,
      flipped: ghostPiece.value?.flipped || false
    };
    
    // Update ghost piece position and snapping
    updateGhostPiecePosition(mouseX, mouseY);
    redraw();
  }

  function handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
    if (delta < 0) {
      zoom.value = Math.min(zoom.value * 1.1, 4);
    } else {
      zoom.value = Math.max(zoom.value / 1.1, 0.25);
    }
    redraw();
  }

  function handleKeyDown(e: KeyboardEvent): void {
    // Track shift key state
    isShiftPressed.value = e.shiftKey;
    
    // Handle rotation for dragged pieces
    if (handleDraggedPieceRotation(e)) return;
    
    // Handle flip for dragged pieces
    if (handleDraggedPieceFlip(e)) return;
    
    // Handle escape key for dragged pieces
    if (handleDraggedPieceEscape(e)) return;
    
    // Handle rotation for ghost pieces
    if (handleGhostPieceRotation(e)) return;
    
    // Handle flip for ghost pieces
    if (handleGhostPieceFlip(e)) return;
    
    // Handle piece placement shortcuts
    if (handlePiecePlacement(e)) return;
    
    // Handle view controls (zoom reset and undo)
    handleViewControls(e);
  }

  function handleDraggedPieceRotation(e: KeyboardEvent): boolean {
    if (!draggingPiece.value || (e.key !== 'r' && e.key !== 'R')) {
      return false;
    }
    
    const rotationStep = draggingPiece.value.type === 'curve' ? Math.PI / 8 : Math.PI / 2;
    draggingPiece.value.rotation = (draggingPiece.value.rotation + rotationStep) % (2 * Math.PI);
    redraw();
    return true;
  }

  function handleDraggedPieceEscape(e: KeyboardEvent): boolean {
    if (!draggingPiece.value || e.key !== 'Escape') {
      return false;
    }
    
    clearSelection();
    return true;
  }

  function handleGhostPieceRotation(e: KeyboardEvent): boolean {
    if (!ghostPiece.value || (e.key !== 'r' && e.key !== 'R')) {
      return false;
    }
    
    const rotationStep = ghostPiece.value.type === 'curve' ? Math.PI / 8 : Math.PI / 2;
    const direction = e.shiftKey ? -1 : 1;
    
    ghostPiece.value.rotation = 
      (ghostPiece.value.rotation + direction * rotationStep + 2 * Math.PI) % (2 * Math.PI);
    redraw();
    return true;
  }

  function handleDraggedPieceFlip(e: KeyboardEvent): boolean {
    if (!draggingPiece.value || (e.key !== 'f' && e.key !== 'F')) {
      return false;
    }
    
    draggingPiece.value.flipped = !draggingPiece.value.flipped;
    redraw();
    return true;
  }

  function handleGhostPieceFlip(e: KeyboardEvent): boolean {
    if (!ghostPiece.value || (e.key !== 'f' && e.key !== 'F')) {
      return false;
    }
    
    ghostPiece.value.flipped = !ghostPiece.value.flipped;
    redraw();
    return true;
  }

  function handlePiecePlacement(e: KeyboardEvent): boolean {
    const pieceTypeMap: Record<string, TrackPieceType> = {
      's': 'straight',
      'c': 'curve',
      'd': null, // Delete mode
      'Escape': null
    };
    
    const newPieceType = pieceTypeMap[e.key];
    if (newPieceType === undefined) {
      return false;
    }
    
    // Handle delete mode
    if (e.key === 'd') {
      enableDeleteMode();
      return true;
    }
    
    // Calculate current mouse position on grid
    const gridSize = getGridSize();
    const [canvasCenterX, canvasCenterY] = toCanvasCoords(0, 0);
    const snappedX = Math.round((lastMouseX.value - canvasCenterX) / gridSize);
    const snappedY = Math.round((lastMouseY.value - canvasCenterY) / gridSize);
    
    // Update selection and ghost piece
    selectedPieceType.value = newPieceType;
    isDeleteMode.value = false;
    hoveredPiece.value = null;
    ghostPiece.value = {
      x: snappedX,
      y: snappedY,
      type: newPieceType,
      rotation: 0,
      flipped: false,
    };
    
    redraw();
    return true;
  }

  function handleKeyUp(e: KeyboardEvent): void {
    // Track shift key state
    isShiftPressed.value = e.shiftKey;
  }

  function handleViewControls(e: KeyboardEvent): void {
    const isMac = navigator.userAgent.toLowerCase().indexOf('mac') !== -1;
    const isMetaOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    
    // Handle zoom reset (Cmd/Ctrl + 0)
    if (isMetaOrCtrl && e.key === '0') {
      e.preventDefault();
      zoom.value = 1;
      offsetPanX.value = 0;
      offsetPanY.value = 0;
      redraw();
      return;
    }
    
    // Handle undo (Cmd/Ctrl + Z)
    if (isMetaOrCtrl && e.key === 'z') {
      e.preventDefault();
      undoLastAction();
    }
  }

  function initCanvas(): void {
    const el = canvas.value;
    if (!el) return;
    ctx = el.getContext('2d');

    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    redraw();
  }

  function cleanup(): void {
    const el = canvas.value;
    if (!el) return;
    el.removeEventListener('mousedown', handleMouseDown);
    el.removeEventListener('mousemove', handleMouseMove);
    el.removeEventListener('mouseup', handleMouseUp);
    el.removeEventListener('wheel', handleWheel);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('resize', resizeCanvas);
  }

  function generateAutoLayout(straightCount: number, curveCount: number): void {
    // Clear existing pieces and save to history
    saveHistoryIfChanged();
    pieces.value = [];
    
    // Generate new layout using the auto-layout composable
    const newPieces = generateAutoLayoutPieces(straightCount, curveCount);
    pieces.value = newPieces;
    
    // Center the view on the generated layout
    offsetPanX.value = 0;
    offsetPanY.value = 0;
    
    redraw();
  }
  
  function loadLayout(jsonData: string): void {
    try {
      const parsedPieces = JSON.parse(jsonData);
      
      // Validate the data structure
      if (!Array.isArray(parsedPieces)) {
        throw new Error('Invalid layout data: expected an array');
      }
      
      // Validate each piece has required properties
      for (const piece of parsedPieces) {
        if (typeof piece.x !== 'number' || typeof piece.y !== 'number' || 
            !piece.type || typeof piece.rotation !== 'number') {
          throw new Error('Invalid piece data: missing required properties');
        }
        
        if (piece.type !== 'straight' && piece.type !== 'curve') {
          throw new Error(`Invalid piece type: ${piece.type}`);
        }
      }
      
      // Save current state to history before loading
      saveHistoryIfChanged();
      
      // Load the new layout
      pieces.value = parsedPieces.map(piece => ({
        x: piece.x,
        y: piece.y,
        type: piece.type,
        rotation: piece.rotation,
        flipped: piece.flipped || false
      }));
      
      // Center the view on the loaded layout
      offsetPanX.value = 0;
      offsetPanY.value = 0;
      
      redraw();
      copyStatus.value = 'Layout loaded!';
      setTimeout(() => (copyStatus.value = ''), 2000);
      
    } catch (err) {
      console.error('Failed to load layout:', err);
      copyStatus.value = 'Invalid layout data';
      setTimeout(() => (copyStatus.value = ''), 3000);
    }
  }

  function updateGhostPiecePosition(mouseX: number, mouseY: number): void {
    if (!ghostPiece.value || isDeleteMode.value) return;
    
    const gridSize = getGridSize();
    const [px, py] = toCanvasCoords(0, 0);
    const newX = Math.round((mouseX - px) / gridSize);
    const newY = Math.round((mouseY - py) / gridSize);
    
    // Update the base ghost piece position
    ghostPiece.value.x = newX;
    ghostPiece.value.y = newY;
    
    // Only try to snap if we're extremely close to a connection point (within 0.25 grid units)
    // Also check if Shift is held down to disable snapping entirely
    const snapResult = !isShiftPressed.value ? findSnapPosition(ghostPiece.value, pieces.value, 0.25) : null;
    
    if (snapResult) {
      // Create snapped version, preserving user's flip state if snap doesn't require a flip
      snappedGhostPiece.value = {
        ...ghostPiece.value,
        x: snapResult.position.x,
        y: snapResult.position.y,
        rotation: snapResult.rotation,
        flipped: snapResult.flipped !== undefined ? snapResult.flipped : ghostPiece.value.flipped
      };
    } else {
      // No snap found, use regular ghost piece
      snappedGhostPiece.value = null;
    }
  }

  return {
    pieces,
    ghostPiece,
    snappedGhostPiece,
    draggingPiece,
    hoveredPiece,
    selectedPieceType,
    isDeleteMode,
    showConnectionPoints,
    historyStack,
    isPanning,
    panStartX,
    panStartY,
    lastMouseX,
    lastMouseY,
    addStraight,
    addCurve,
    enableDeleteMode,
    clearSelection,
    clearPieces,
    undoLastAction,
    copyLayout,
    handleKeyDown,
    initCanvas,
    cleanup,
    generateAutoLayout,
    loadLayout,
  };
}
