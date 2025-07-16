<template>
  <div v-if="show" class="help-modal-overlay" @click="$emit('close')">
    <div class="help-modal" @click.stop>
      <div class="help-header">
        <h2>Keyboard Shortcuts</h2>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>
      
      <div class="help-content">
        <div class="help-section">
          <h3>Track Pieces</h3>
          <div class="shortcut-item">
            <kbd>S</kbd>
            <span>Add straight track piece</span>
          </div>
          <div class="shortcut-item">
            <kbd>C</kbd>
            <span>Add curved track piece</span>
          </div>
          <div class="shortcut-item">
            <kbd>D</kbd>
            <span>Enter delete mode</span>
          </div>
          <div class="shortcut-item">
            <kbd>Escape</kbd>
            <span>Clear selection / Exit mode</span>
          </div>
        </div>

        <div class="help-section">
          <h3>Rotation</h3>
          <div class="shortcut-item">
            <kbd>R</kbd>
            <span>Rotate piece clockwise</span>
          </div>
          <div class="shortcut-item">
            <kbd>Shift</kbd> + <kbd>R</kbd>
            <span>Rotate piece counter-clockwise</span>
          </div>
        </div>

        <div class="help-section">
          <h3>View Controls</h3>
          <div class="shortcut-item">
            <kbd>Cmd/Ctrl</kbd> + <kbd>0</kbd>
            <span>Reset zoom and center view</span>
          </div>
          <div class="shortcut-item">
            <kbd>Mouse Wheel</kbd>
            <span>Zoom in/out</span>
          </div>
          <div class="shortcut-item">
            <kbd>Click + Drag</kbd>
            <span>Pan the view</span>
          </div>
        </div>

        <div class="help-section">
          <h3>Actions</h3>
          <div class="shortcut-item">
            <kbd>Cmd/Ctrl</kbd> + <kbd>Z</kbd>
            <span>Undo last action</span>
          </div>
          <div class="shortcut-item">
            <kbd>Click</kbd>
            <span>Place piece / Delete piece (in delete mode)</span>
          </div>
          <div class="shortcut-item">
            <kbd>Click + Drag</kbd>
            <span>Move existing piece</span>
          </div>
        </div>

        <div class="help-section">
          <h3>Help</h3>
          <div class="shortcut-item">
            <kbd>?</kbd>
            <span>Show/hide this help dialog</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close']);
</script>

<style scoped>
.help-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.help-modal {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.help-header h2 {
  margin: 0;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-button:hover {
  background: #f0f0f0;
}

.help-content {
  padding: 1.5rem;
}

.help-section {
  margin-bottom: 2rem;
}

.help-section:last-child {
  margin-bottom: 0;
}

.help-section h3 {
  margin: 0 0 1rem 0;
  color: #555;
  font-size: 1.1rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f5f5f5;
}

.shortcut-item:last-child {
  border-bottom: none;
}

kbd {
  background: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0.2rem 0.4rem;
  font-family: monospace;
  font-size: 0.9rem;
  min-width: 2rem;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.shortcut-item span {
  flex: 1;
  color: #666;
}
</style>
