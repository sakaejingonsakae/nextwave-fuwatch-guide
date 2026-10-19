/* Copy the complete template, with a selectable fallback for local-file previews. */
(() => {
  'use strict';
  async function copy(text, field, beforeSelect = () => {}) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return 'copied';
      }
    } catch (_) { /* Try the user-initiated local-file fallback below. */ }
    beforeSelect();
    field.focus({ preventScroll: true });
    field.select();
    field.setSelectionRange(0, text.length);
    try {
      if (document.execCommand?.('copy')) return 'copied';
    } catch (_) { /* Leave the full text selected for manual copying. */ }
    return 'selected';
  }
  window.NEXTWAVE_CLIPBOARD = { copy };
})();
