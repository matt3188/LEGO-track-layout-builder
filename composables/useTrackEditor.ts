import { ref, computed, type Ref } from '#imports';
import { ROTATION_STEP } from './constants';

import { 
  renderTrackPiece, 
  findSnapPosition, 
  getConnectionIndicators,
  validateLayout,
  wouldOverlap,
  getConnectedPieces,
  checkCollision,
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
  const pieceCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const p of pieces.value) {
      if (!p.type) continue;
      counts[p.type] = (counts[p.type] || 0) + 1;
    }
    return counts;
  });
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
  const draggingGroup = ref<TrackPiece[] | null>(null);
  let dragGroupAnchor: TrackPiece | null = null;
  const groupRelativeOffsets = new Map<TrackPiece, { dx: number; dy: number }>();
  const groupStartPositions = new Map<TrackPiece, TrackPiece>();
  let groupOffsetX = 0;
  let groupOffsetY = 0;
  let groupHoldTimeout: ReturnType<typeof setTimeout> | null = null;
  let dragStartPiece: TrackPiece | null = null;
  const hoveredPiece = ref<TrackPiece | null>(null);
  const isDeleteMode = ref(false);
  const showConnectionPoints = ref(false); // Debug: show connection points
  const showInvalidZones = ref(false); // Debug: show invalid placement zones
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
          normalizedAngle <= ROTATION_STEP
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

  function drawTrackPiece(
    piece: TrackPiece,
    isGhost = false,
    isHovered = false,
    isInvalid = false
  ): void {
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
      isDeleteMode: isDeleteMode.value,
      isInvalidPlacement: isInvalid
    });

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawGhostPiece(): void {
    if (!ghostPiece.value) return;

    // Draw the snapped version if available, otherwise the regular ghost
    const pieceToRender = snappedGhostPiece.value || ghostPiece.value;
    const overlaps = pieces.value.some((p) => wouldOverlap(pieceToRender, p));
    drawTrackPiece(pieceToRender, true, false, overlaps);
  }

  function drawInvalidZones(): void {
    if (!ctx || !ghostPiece.value) return;
    const gridSize = getGridSize();
    // Draw zone around the ghost piece itself using a consistent radius
    const ghostRadius = 3.5;
    const [gx, gy] = toCanvasCoords(ghostPiece.value.x, ghostPiece.value.y);
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = 'rgba(0,0,255,0.2)';
    ctx.beginPath();
    ctx.arc(gx, gy, ghostRadius * gridSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (const p of pieces.value) {
      let radius = 3.5;
      const [cx, cy] = toCanvasCoords(p.x, p.y);
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = 'rgba(0,0,255,0.3)';
      ctx.beginPath();
      ctx.arc(cx, cy, radius * gridSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawConnectionPoints(): void {
    if (!ctx) return;
    
    // Get all connection points from all pieces
    const allConnections = getConnectionIndicators(pieces.value);
    
    // Draw each connection point
    for (const connection of allConnections) {
      const [canvasX, canvasY] = toCanvasCoords(connection.x, connection.y);
      
      ctx.save();
      
      // Draw connection point as a colored circle
      ctx.fillStyle = connection.type === 'male' ? '#ff0000' : '#0000ff'; // Red for male, blue for female
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw angle indicator as a line
      ctx.strokeStyle = connection.type === 'male' ? '#ff0000' : '#0000ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvasX, canvasY);
      ctx.lineTo(
        canvasX + Math.cos(connection.angle) * 20,
        canvasY + Math.sin(connection.angle) * 20
      );
      ctx.stroke();
      
      // Draw connection info text
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText(
        `${connection.type}`, 
        canvasX + 10, 
        canvasY - 10
      );
      
      ctx.restore();
    }
  }

  function startGroupDrag(anchor: TrackPiece, mouseX: number, mouseY: number): void {
    const connected = getConnectedPieces(anchor, pieces.value);
    if (connected.length <= 1) return;
    draggingGroup.value = connected;
    dragGroupAnchor = anchor;
    groupRelativeOffsets.clear();
    groupStartPositions.clear();
    const gridSize = getGridSize();
    const [px, py] = toCanvasCoords(anchor.x, anchor.y);
    groupOffsetX = (mouseX - px) / gridSize;
    groupOffsetY = (mouseY - py) / gridSize;
    for (const p of connected) {
      groupRelativeOffsets.set(p, { dx: p.x - anchor.x, dy: p.y - anchor.y });
      groupStartPositions.set(p, { ...p });
    }
    draggingPiece.value = null;
    groupHoldTimeout = null;
    redraw();
  }

  function redraw(): void {
    if (!ctx || !canvas.value) return;
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
    drawGrid();
    drawGhostPiece();
    if (showInvalidZones.value) {
      drawInvalidZones();
    }
    pieces.value.forEach((p) => {
      const isHovered = hoveredPiece.value === p;
      const inGroup = draggingGroup.value?.includes(p) ?? false;
      drawTrackPiece(p, inGroup, isHovered && !inGroup);
    });
    
    // Draw connection points for debugging
    if (showConnectionPoints.value) {
      drawConnectionPoints();
    }
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
      setTimeout(() => (copyStatus.value = ''), 3000);
    }
  }

  function addStraight(): void {
    selectedPieceType.value = 'straight';
    
    // Use current mouse position without grid snapping
    const gridSize = getGridSize();
    const [canvasCenterX, canvasCenterY] = toCanvasCoords(0, 0);
    const mouseX = (lastMouseX.value - canvasCenterX) / gridSize;
    const mouseY = (lastMouseY.value - canvasCenterY) / gridSize;
    
    ghostPiece.value = { 
      x: mouseX, 
      y: mouseY, 
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
    
    // Use current mouse position without grid snapping
    const gridSize = getGridSize();
    const [canvasCenterX, canvasCenterY] = toCanvasCoords(0, 0);
    const mouseX = (lastMouseX.value - canvasCenterX) / gridSize;
    const mouseY = (lastMouseY.value - canvasCenterY) / gridSize;
    
    ghostPiece.value = { 
      x: mouseX, 
      y: mouseY, 
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
    if (draggingPiece.value) {
      draggingPiece.value = null;
    }
    if (draggingGroup.value) {
      draggingGroup.value = null;
      dragGroupAnchor = null;
      groupRelativeOffsets.clear();
      groupStartPositions.clear();
    }
    if (groupHoldTimeout) {
      clearTimeout(groupHoldTimeout);
      groupHoldTimeout = null;
    }
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
      dragStartPiece = { ...pieceAtPosition };
      const [px, py] = toCanvasCoords(pieceAtPosition.x, pieceAtPosition.y);
      offsetX = (mouseX - px) / gridSize;
      offsetY = (mouseY - py) / gridSize;
      isPanning.value = false;

      groupHoldTimeout = setTimeout(() => {
        startGroupDrag(pieceAtPosition, mouseX, mouseY);
      }, 300);
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
    if (isPanning.value || draggingPiece.value || draggingGroup.value) {
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
      canvas.value.style.cursor = (draggingPiece.value || draggingGroup.value) ? 'grabbing' : 'default';
    }

    if (!draggingGroup.value && groupHoldTimeout) {
      clearTimeout(groupHoldTimeout);
      groupHoldTimeout = null;
    }

    if (ghostPiece.value && !isDeleteMode.value) {
      updateGhostPiecePosition(mouseX, mouseY);
      redraw();
    }

    if (draggingGroup.value && !isDeleteMode.value) {
      const [px, py] = toCanvasCoords(0, 0);
      const anchorX = (mouseX - px) / gridSize - groupOffsetX;
      const anchorY = (mouseY - py) / gridSize - groupOffsetY;
      for (const p of draggingGroup.value) {
        const rel = groupRelativeOffsets.get(p)!;
        p.x = anchorX + rel.dx;
        p.y = anchorY + rel.dy;
      }
      redraw();
    } else if (draggingPiece.value && !isDeleteMode.value) {
      const [px, py] = toCanvasCoords(0, 0);
      // Remove grid snapping for dragged pieces - use exact mouse coordinates
      const exactX = (mouseX - px) / gridSize - offsetX;
      const exactY = (mouseY - py) / gridSize - offsetY;
      draggingPiece.value.x = exactX;
      draggingPiece.value.y = exactY;

      // Attempt piece-to-piece snapping while dragging
      if (!isShiftPressed.value) {
        const others = pieces.value.filter(p => p !== draggingPiece.value);
        const snapDist = 20 / getGridSize();
        const snap = findSnapPosition(draggingPiece.value, others, snapDist);
        if (snap) {
          const candidate = {
            ...draggingPiece.value,
            x: snap.position.x,
            y: snap.position.y,
            rotation: snap.rotation,
            flipped:
              snap.flipped !== undefined
                ? snap.flipped
                : draggingPiece.value.flipped,
          } as TrackPiece;

          if (!checkCollision(candidate, others)) {
            Object.assign(draggingPiece.value, candidate);
          }
        }
      }

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
    if (groupHoldTimeout) {
      clearTimeout(groupHoldTimeout);
      groupHoldTimeout = null;
    }
    if (draggingGroup.value) {
      const overlap = pieces.value.some((p) => {
        if (draggingGroup.value!.includes(p)) return false;
        return draggingGroup.value!.some(g => wouldOverlap(g, p));
      });
      if (overlap) {
        for (const piece of draggingGroup.value) {
          const orig = groupStartPositions.get(piece);
          if (orig) {
            piece.x = orig.x;
            piece.y = orig.y;
            piece.rotation = orig.rotation;
            piece.flipped = orig.flipped;
          }
        }
      }
      draggingGroup.value = null;
      dragGroupAnchor = null;
      groupRelativeOffsets.clear();
      groupStartPositions.clear();
      saveHistoryIfChanged();
    }

    if (draggingPiece.value) {
      const overlap = pieces.value.some(
        (p) => p !== draggingPiece.value && wouldOverlap(draggingPiece.value!, p)
      );
      if (overlap && dragStartPiece) {
        draggingPiece.value.x = dragStartPiece.x;
        draggingPiece.value.y = dragStartPiece.y;
        draggingPiece.value.rotation = dragStartPiece.rotation;
        draggingPiece.value.flipped = dragStartPiece.flipped;
      }
      draggingPiece.value = null;
      dragStartPiece = null;
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
    
    // Prevent placing pieces on top of existing ones
    const overlaps = pieces.value.some(p => wouldOverlap(pieceToPlace, p));
    if (overlaps) {
      console.warn('Piece overlaps with an existing piece, placement aborted');
      return;
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
    // Handle view controls (zoom reset, undo)
    if (handleViewControls(e)) return;
    
    // Handle piece placement (S, C, D keys)
    if (handlePiecePlacement(e)) return;
    
    // Handle piece rotation
    if (handleGhostPieceRotation(e)) return;
    if (handleDraggedPieceRotation(e)) return;
    
    // Handle piece flipping
    if (handleGhostPieceFlip(e)) return;
    if (handleDraggedPieceFlip(e)) return;
    
    // Handle escape key for dragged pieces
    if (handleDraggedPieceEscape(e)) return;
    
    // Handle clear selection
    if (e.key === 'Escape') {
      clearSelection();
      return;
    }
    
    // Handle debug connection points toggle
    if (e.key === 'q' || e.key === 'Q') {
      showConnectionPoints.value = !showConnectionPoints.value;
      redraw();
      return;
    }

    // Handle invalid zone debug toggle
    if (e.key === 'b' || e.key === 'B') {
      showInvalidZones.value = !showInvalidZones.value;
      redraw();
      return;
    }
    
    // Handle shift key for disabling snapping
    if (e.key === 'Shift') {
      isShiftPressed.value = true;
    }
  }

  function handleDraggedPieceRotation(e: KeyboardEvent): boolean {
    if (!draggingPiece.value || (e.key !== 'r' && e.key !== 'R')) {
      return false;
    }
    
    draggingPiece.value.rotation =
      (draggingPiece.value.rotation + ROTATION_STEP) % (2 * Math.PI);
    const originalRotation = draggingPiece.value.rotation;
    const overlap = pieces.value.some(
      (p) => p !== draggingPiece.value && wouldOverlap(draggingPiece.value!, p)
    );
    if (overlap) {
      draggingPiece.value.rotation = originalRotation;
    }
    redraw();
    return true;
  }

  function handleDraggedPieceEscape(e: KeyboardEvent): boolean {
    if (!(draggingPiece.value || draggingGroup.value) || e.key !== 'Escape') {
      return false;
    }

    clearSelection();
    return true;
  }

  function handleGhostPieceRotation(e: KeyboardEvent): boolean {
    if (!ghostPiece.value || (e.key !== 'r' && e.key !== 'R')) {
      return false;
    }
    
    const direction = e.shiftKey ? -1 : 1;

    ghostPiece.value.rotation =
      (ghostPiece.value.rotation + direction * ROTATION_STEP + 2 * Math.PI) % (2 * Math.PI);
    redraw();
    return true;
  }

  function handleDraggedPieceFlip(e: KeyboardEvent): boolean {
    if (!draggingPiece.value || (e.key !== 'f' && e.key !== 'F')) {
      return false;
    }

    const originalFlipped = draggingPiece.value.flipped;
    draggingPiece.value.flipped = !draggingPiece.value.flipped;
    const overlap = pieces.value.some(
      (p) => p !== draggingPiece.value && wouldOverlap(draggingPiece.value!, p)
    );
    if (overlap) {
      draggingPiece.value.flipped = originalFlipped;
    }
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
      'S': 'straight',
      'c': 'curve',
      'C': 'curve',
      'd': null, // Delete mode
      'D': null, // Delete mode
      'Escape': null
    };
    
    const newPieceType = pieceTypeMap[e.key];
    if (newPieceType === undefined) {
      return false;
    }
    
    // Handle delete mode
    if (e.key === 'd' || e.key === 'D') {
      enableDeleteMode();
      return true;
    }
    
    // Use current mouse position without grid snapping
    const gridSize = getGridSize();
    const [canvasCenterX, canvasCenterY] = toCanvasCoords(0, 0);
    const mouseX = (lastMouseX.value - canvasCenterX) / gridSize;
    const mouseY = (lastMouseY.value - canvasCenterY) / gridSize;
    
    // Update selection and ghost piece
    selectedPieceType.value = newPieceType;
    isDeleteMode.value = false;
    hoveredPiece.value = null;
    ghostPiece.value = {
      x: mouseX,
      y: mouseY,
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

  function handleViewControls(e: KeyboardEvent): boolean {
    const isMac = navigator.userAgent.toLowerCase().indexOf('mac') !== -1;
    const isMetaOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    
    // Handle zoom reset (Cmd/Ctrl + 0)
    if (isMetaOrCtrl && e.key === '0') {
      e.preventDefault();
      zoom.value = 1;
      offsetPanX.value = 0;
      offsetPanY.value = 0;
      redraw();
      return true;
    }
    
    // Handle undo (Cmd/Ctrl + Z)
    if (isMetaOrCtrl && e.key === 'z') {
      e.preventDefault();
      undoLastAction();
      return true;
    }
    
    return false;
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
      
      // Validate the loaded layout
      const validation = validateLayout(pieces.value);
      if (!validation.isValid) {
        console.error('⚠️ Loaded layout has validation errors:', validation.errors);
        copyStatus.value = `Layout loaded with ${validation.errors.length} validation errors - check console`;
        setTimeout(() => (copyStatus.value = ''), 4000);
      } else {
        copyStatus.value = 'Layout loaded and validated!';
        setTimeout(() => (copyStatus.value = ''), 2000);
      }
      
      // Center the view on the loaded layout
      offsetPanX.value = 0;
      offsetPanY.value = 0;
      
      redraw();
      
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
    // Direct mouse position conversion to grid coordinates (no grid snapping)
    const newX = (mouseX - px) / gridSize;
    const newY = (mouseY - py) / gridSize;
    
    // Update the base ghost piece position with exact mouse coordinates
    ghostPiece.value.x = newX;
    ghostPiece.value.y = newY;
    
    // Check for piece-to-piece snapping (independent of grid)
    // Use a more generous snap distance to make snapping actually work
    const snapResult = !isShiftPressed.value ? findSnapPosition(ghostPiece.value, pieces.value, 2.0) : null;
    
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
    showInvalidZones,
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
    pieceCounts,
  };
}
