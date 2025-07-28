<script setup lang="ts">
interface Props {
  copyStatus?: string;
  isDeleteMode?: boolean;
  pieceCounts?: Record<string, number>;
  onAddStraight?: () => void;
  onAddCurve?: () => void;
  onEnableDeleteMode?: () => void;
  onUndo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onClear?: () => void;
  onShowAutoLayout?: () => void;
}

const props = defineProps<Props>();

type ButtonClass = 'button-default' | 'button-delete-active' | 'button-primary';

interface ControlButton {
  label: string;
  action?: () => void;
  class: ButtonClass;
}

// Define control buttons configuration
const controlButtons = computed((): ControlButton[] => [
  {
    label: '➕ Add Straight',
    action: props.onAddStraight,
    class: 'button-default'
  },
  {
    label: '➕ Add Curve',
    action: props.onAddCurve,
    class: 'button-default'
  },
  {
    label: '🗑️ Delete Mode',
    action: props.onEnableDeleteMode,
    class: props.isDeleteMode ? 'button-delete-active' : 'button-default'
  },
  {
    label: '↩️ Undo',
    action: props.onUndo,
    class: 'button-default'
  },
  {
    label: '📋 Copy schema',
    action: props.onCopy,
    class: 'button-default'
  },
  {
    label: '📄 Paste schema',
    action: props.onPaste,
    class: 'button-default'
  },
  {
    label: '❌ Clear',
    action: props.onClear,
    class: 'button-default'
  },
  {
    label: '🤖 Auto Layout',
    action: props.onShowAutoLayout,
    class: 'button-primary'
  }
]);

// Button style classes
const buttonClasses: Record<ButtonClass, string> = {
  'button-default': 'px-4 py-2 border border-gray-300 rounded bg-white cursor-pointer transition-colors duration-200 hover:bg-gray-100',
  'button-delete-active': 'px-4 py-2 border rounded cursor-pointer transition-colors duration-200 bg-red-500 text-white border-red-600',
  'button-primary': 'px-4 py-2 border border-gray-300 rounded bg-blue-500 text-white cursor-pointer transition-colors duration-200 hover:bg-blue-600'
};
</script>

<template>
  <div class="fixed top-4 left-4 flex flex-col gap-2">
    <button
      v-for="button in controlButtons"
      :key="button.label"
      @click="button.action"
      :class="buttonClasses[button.class]"
    >
      {{ button.label }}
    </button>
    <span class="text-sm text-gray-600">{{ copyStatus }}</span>
    <div v-if="pieceCounts" class="text-sm text-gray-600">
      Straights: {{ pieceCounts.straight }} | Curves: {{ pieceCounts.curve }}
    </div>
  </div>
</template>
