import { ref, type Ref } from '#imports';

type TrackPieceType = 'straight' | 'curve' | null;

interface TrackPiece {
  x: number;
  y: number;
  type: TrackPieceType;
  rotation: number;
}

interface GhostPiece extends TrackPiece {}

interface UseTrackEditorOptions {
  canvas: Ref<HTMLCanvasElement | null>;
  copyStatus: Ref<string>;
}

export function useTrackEditor({ canvas, copyStatus }: UseTrackEditorOptions) {
  const pieces = ref<TrackPiece[]>([]);
  const zoom = ref(1);
  const rotationDisplay = ref('');
  let offsetX = 0;
  let offsetY = 0;
  const offsetPanX = ref(0);
  const offsetPanY = ref(0);
  const isPanning = ref(false);
  const panStartX = ref(0);
  const panStartY = ref(0);
  const selectedPieceType = ref<TrackPieceType>(null);
  const ghostPiece = ref<GhostPiece | null>(null);
  const draggingPiece = ref<TrackPiece | null>(null);
  const hoveredPiece = ref<TrackPiece | null>(null);
  const isDeleteMode = ref(false);
  const lastMouseX = ref(0);
  const lastMouseY = ref(0);
  const historyStack = ref<TrackPiece[][]>([]);
  const baseGridSize = 32;
  let ctx: CanvasRenderingContext2D | null = null;

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
        const dist = Math.sqrt(localX ** 2 + localY ** 2);
        const angle = Math.atan2(localY, localX);
        if (
          dist >= 312 * zoom.value &&
          dist <= 328 * zoom.value &&
          angle >= 0 &&
          angle <= Math.PI / 8
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

    // Set alpha and color based on state
    if (isGhost) {
      ctx.globalAlpha = 0.4;
    } else if (isHovered && isDeleteMode.value) {
      ctx.globalAlpha = 0.7;
    } else {
      ctx.globalAlpha = 1;
    }

    // Set color - red for hovered pieces in delete mode, black otherwise
    const pieceColor = (isHovered && isDeleteMode.value) ? '#ff0000' : '#000';
    ctx.fillStyle = pieceColor;
    ctx.strokeStyle = pieceColor;
    ctx.lineWidth = 8 * zoom.value;

    if (piece.type === 'straight') {
      ctx.fillRect(
        -64 * zoom.value,
        -8 * zoom.value,
        128 * zoom.value,
        16 * zoom.value
      );
    } else if (piece.type === 'curve') {
      ctx.beginPath();
      ctx.arc(0, 0, 320 * zoom.value, 0, Math.PI / 8);
      if (isGhost) ctx.translate(-160 * zoom.value, 0);
      ctx.lineWidth = 16 * zoom.value;
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawGhostPiece(): void {
    if (!ghostPiece.value) return;
    drawTrackPiece(ghostPiece.value, true);
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
    navigator.clipboard
      .writeText(json)
      .then(() => {
        copyStatus.value = 'Copied!';
        setTimeout(() => (copyStatus.value = ''), 2000);
      })
      .catch((err) => {
        copyStatus.value = 'Failed to copy';
        console.error('Copy failed:', err);
      });
  }

  function updateRotationDisplay(): void {
    if (draggingPiece.value) {
      const degrees = ((draggingPiece.value.rotation * 180) / Math.PI).toFixed(
        1
      );
      rotationDisplay.value = `Rotation: ${degrees}°`;
    } else {
      rotationDisplay.value = '';
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
      rotation: 0 
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
      rotation: 0 
    };
    isDeleteMode.value = false;
    hoveredPiece.value = null;
    redraw();
  }

  function clearSelection(): void {
    selectedPieceType.value = null;
    ghostPiece.value = null;
    isDeleteMode.value = false;
    hoveredPiece.value = null;
  }

  function enableDeleteMode(): void {
    isDeleteMode.value = true;
    selectedPieceType.value = null;
    ghostPiece.value = null;
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

  function handleClick(e: MouseEvent): void {
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
    if (!ghostPiece.value) return;
    
    const gridSize = getGridSize();
    const [centerX, centerY] = toCanvasCoords(0, 0);

    const x = Math.round((mouseX - centerX) / gridSize);
    const y = Math.round((mouseY - centerY) / gridSize);

    pieces.value.push({ ...ghostPiece.value, x, y });
    ghostPiece.value = {
      x,
      y,
      type: selectedPieceType.value as Exclude<TrackPieceType, null>,
      rotation: ghostPiece.value.rotation,
    };
    redraw();
  }

  function handleMouseDown(e: MouseEvent): void {
    if (!canvas.value) return;
    const rect = canvas.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const gridSize = getGridSize();

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
      const [px, py] = toCanvasCoords(0, 0);
      ghostPiece.value.x = Math.round((mouseX - px) / gridSize);
      ghostPiece.value.y = Math.round((mouseY - py) / gridSize);
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

  function handleMouseUp(): void {
    if (draggingPiece.value) {
      draggingPiece.value = null;
      saveHistoryIfChanged();
    }
    isPanning.value = false;
    updateRotationDisplay();
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
    // Handle rotation for dragged pieces
    if (handleDraggedPieceRotation(e)) return;
    
    // Handle escape key for dragged pieces
    if (handleDraggedPieceEscape(e)) return;
    
    // Handle rotation for ghost pieces
    if (handleGhostPieceRotation(e)) return;
    
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
    };
    
    redraw();
    return true;
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
    el.addEventListener('click', handleClick);
    el.addEventListener('wheel', handleWheel, { passive: false });
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
    el.removeEventListener('click', handleClick);
    el.removeEventListener('wheel', handleWheel);
    window.removeEventListener('resize', resizeCanvas);
  }

  return {
    pieces,
    ghostPiece,
    draggingPiece,
    hoveredPiece,
    selectedPieceType,
    isDeleteMode,
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
    updateRotationDisplay,
    handleKeyDown,
    initCanvas,
    cleanup,
  };
}
