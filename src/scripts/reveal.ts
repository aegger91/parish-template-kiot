/* Gentle fade-and-rise for elements marked data-reveal. Content stays visible without JS or with reduced motion. */
const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduce || !('IntersectionObserver' in window)) {
  els.forEach((el) => el.classList.add('is-revealed'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-revealed');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  els.forEach((el, i) => {
    if (el.dataset.revealDelay === undefined && el.parentElement?.hasAttribute('data-reveal-group')) {
      el.style.setProperty('--reveal-delay', `${Math.min(i % 6, 5) * 70}ms`);
    }
    io.observe(el);
  });
}
