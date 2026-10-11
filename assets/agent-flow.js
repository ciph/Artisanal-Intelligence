(() => {
  'use strict';
  const region = document.querySelector('.agent-comparison');
  if (!region) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const tracks = [...region.querySelectorAll('.flow-pulse')].map(path => {
    const length = path.getTotalLength();
    // Cache the curve once; animation frames only interpolate coordinates.
    const points = Array.from({ length: 241 }, (_, i) => path.getPointAtLength(length * i / 240));
    const group = document.createElementNS(ns, 'g');
    group.setAttribute('class', 'flow-particles');
    group.setAttribute('aria-hidden', 'true');
    group.setAttribute('opacity', '0');
    const dots = Array.from({ length: 9 }, (_, i) => {
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('r', i === 8 ? '2.1' : String(0.5 + i * 0.13));
      group.append(dot);
      return dot;
    });
    path.after(group);
    return { points, group, dots, length };
  });
  let frame = null;
  let visible = true;
  let elapsed = 0;
  let previous = null;
  function draw(now) {
    if (previous !== null) elapsed += Math.min(now - previous, 80);
    previous = now;
    const phase = (elapsed % 4800) / 4800;
    const travel = Math.max(0, Math.min(1, (phase - 0.06) / 0.82));
    const progress = travel * travel * (3 - 2 * travel);
    tracks.forEach(({ points, dots, group, length }) => {
      group.setAttribute('opacity', '1');
      dots.forEach((dot, i) => {
        const position = progress - (8 - i) * 2.5 / length;
        if (position <= 0 || position >= 1) { dot.setAttribute('opacity', '0'); return; }
        const index = position * 240;
        const lo = Math.floor(index), mix = index - lo;
        const a = points[lo], b = points[Math.min(lo + 1, 240)];
        dot.setAttribute('cx', String(a.x + (b.x - a.x) * mix));
        dot.setAttribute('cy', String(a.y + (b.y - a.y) * mix));
        const fade = Math.max(0, Math.min(1, travel / 0.1, (1 - travel) / 0.12));
        dot.setAttribute('opacity', String(fade * (i === 8 ? 0.82 : 0.03 + i * 0.04)));
      });
    });
    frame = requestAnimationFrame(draw);
  }
  function sync() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previous = null;
    tracks.forEach(({ group }) => { group.style.display = reduced.matches ? 'none' : ''; });
    if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(draw);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(region);
  }
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
})();
