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
    label: 'Add Straight',
    icon: 'mdi:plus-thick',
    action: props.onAddStraight,
    color: 'neutral',
    variant: 'outline'
  },
  {
    label: 'Add Curve',
    icon: 'mdi:plus-thick',
    action: props.onAddCurve,
    color: 'neutral',
    variant: 'outline'
  },
  {
    label: 'Undo',
    icon: 'mdi:undo-variant',
    action: props.onUndo,
    color: 'neutral',
    variant: 'outline'
  },
  {
    label: 'Copy schema',
    icon: 'mdi:content-copy',
    action: props.onCopy,
    color: 'neutral',
    variant: 'outline'
  },
  {
    label: 'Paste schema',
    icon: 'mdi:content-paste',
    action: props.onPaste,
    color: 'neutral',
    variant: 'outline'
  },
  {
    label: 'Delete Mode',
    icon: 'mdi:delete',
    disabled: !props.pieceCounts.straight && !props.pieceCounts.curve,
    action: props.onEnableDeleteMode,
    color: props.isDeleteMode ? 'error' : 'neutral',
    variant: props.isDeleteMode ? 'solid' : 'outline',
  },
  {
    label: 'Clear layout',
    icon: 'mdi:clear-bold',
    disabled: !props.pieceCounts.straight && !props.pieceCounts.curve,
    action: props.onClear,
    color: 'neutral',
    variant: 'outline'
  },
  {
    label: '🤖 Auto Layout',
    action: props.onShowAutoLayout,
    color: 'primary',
    variant: 'solid'
  }
]);
</script>

<template>
    <div class="fixed top-4 left-4 flex flex-col gap-2">
    <UButton
      v-for="button in controlButtons"
      :key="button.label"
      :color="button.color"
      :disabled="button.disabled"
      :variant="button.variant"
      :icon="button.icon"
      :label="button.label"
      class="cursor-pointer"
      @click="button.action"
    />
    <span class="text-sm text-gray-600">{{ copyStatus }}</span>
    <div v-if="pieceCounts" class="text-sm text-gray-600">
      Straights: {{ pieceCounts.straight }} | Curves: {{ pieceCounts.curve }}
    </div>
  </div>
</template>
