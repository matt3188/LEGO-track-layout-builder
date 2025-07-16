import { type Ref } from 'vue';

export function useClipboard(copyStatus: Ref<string>) {
  async function handlePaste(loadLayout: (data: string) => void) {
    try {
      let clipboardText = '';
      
      // Try to read from clipboard
      if (navigator.clipboard && navigator.clipboard.readText) {
        clipboardText = await navigator.clipboard.readText();
      } else {
        // Fallback: prompt user to paste manually
        clipboardText = prompt('Paste the layout JSON data:') || '';
      }
      
      if (clipboardText.trim()) {
        loadLayout(clipboardText);
      } else {
        copyStatus.value = 'No data to paste';
        setTimeout(() => (copyStatus.value = ''), 2000);
      }
    } catch (err) {
      console.error('Failed to paste:', err);
      // Fallback: prompt user to paste manually
      const clipboardText = prompt('Paste the layout JSON data:') || '';
      if (clipboardText.trim()) {
        loadLayout(clipboardText);
      }
    }
  }

  return {
    handlePaste
  };
}
