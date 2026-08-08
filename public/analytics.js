/* WePlay Analytics — anonymous, client-side, no personal/account data.
   Stores events in localStorage under WP_ANALYTICS_KEY.
   Never logs the WePlay ID value itself — only the fact that an action happened. */
(function () {
  const KEY = 'wp_analytics_events_v1';
  const MAX_EVENTS = 8000;

  function safeParse(raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function getEvents() {
    return safeParse(localStorage.getItem(KEY));
  }

  function saveEvents(events) {
    if (events.length > MAX_EVENTS) {
      events = events.slice(events.length - MAX_EVENTS);
    }
    localStorage.setItem(KEY, JSON.stringify(events));
  }

  function deviceType() {
    const ua = navigator.userAgent || '';
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    if (/mobi|android|iphone/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function logEvent(type, data) {
    const events = getEvents();
    events.push({
      type: type,
      data: data || {},
      ts: Date.now(),
      page: (location.pathname.split('/').pop() || 'index.html'),
      device: deviceType(),
      ref: document.referrer || ''
    });
    saveEvents(events);
  }

  function clearEvents() {
    localStorage.removeItem(KEY);
  }

  window.WPAnalytics = { logEvent: logEvent, getEvents: getEvents, clearEvents: clearEvents, KEY: KEY };

  // fire a page_view automatically on every load
  logEvent('page_view');
})();
