/*
  Add this near the end of <body> on every page you want tracked
  (index.html, recharge page, login page, etc):

  <script src="/track-snippet.js"></script>

  It fires one lightweight POST per page load. No cookies, no
  personal data beyond IP/user-agent, which are captured server-side
  regardless (standard for any web request).
*/
(function () {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: window.location.pathname,
        referrer: document.referrer || '',
      }),
      keepalive: true,
    }).catch(function () {
      /* silently ignore — never block the page on analytics */
    });
  } catch (e) {
    /* no-op */
  }
})();
