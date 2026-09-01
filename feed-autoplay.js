(function () {
  'use strict';

  const observed = new WeakSet();

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
        video.muted = true;
        video.defaultMuted = true;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('autoplay', '');
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: [0, 0.55, 1] });

  function prepare(video) {
    if (!video || observed.has(video)) return;
    observed.add(video);
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('autoplay', '');
    io.observe(video);
  }

  function scan(root) {
    if (!root) return;
    if (root.matches && root.matches('video')) prepare(root);
    if (root.querySelectorAll) root.querySelectorAll('video').forEach(prepare);
  }

  document.addEventListener('DOMContentLoaded', () => scan(document));

  const mo = new MutationObserver((mutations) => {
    mutations.forEach((m) => m.addedNodes.forEach((node) => {
      if (node.nodeType === 1) scan(node);
    }));
  });

  mo.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.querySelectorAll('video').forEach(v => v.pause());
    else scan(document);
  });
})();
