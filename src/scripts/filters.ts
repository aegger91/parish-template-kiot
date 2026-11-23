/* Chip filters: [data-filter-root] holds [data-filter] buttons and items with data-category. */
export function initChipFilter() {
  document.querySelectorAll<HTMLElement>('[data-filter-root]').forEach((root) => {
    if (root.dataset.filterReady) return;
    root.dataset.filterReady = '1';
    const buttons = root.querySelectorAll<HTMLButtonElement>('[data-filter]');
    const items = root.querySelectorAll<HTMLElement>('[data-category]');
    const empty = root.querySelector<HTMLElement>('[data-empty]');
    buttons.forEach((b) =>
      b.addEventListener('click', () => {
        const f = b.dataset.filter!;
        buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        let shown = 0;
        items.forEach((it) => {
          const on = !f || it.dataset.category === f;
          it.hidden = !on;
          if (on) {
            shown++;
            it.classList.add('is-revealed');
          }
        });
        if (empty) empty.hidden = shown > 0;
      }),
    );
  });
}
