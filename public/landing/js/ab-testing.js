/**
 * A/B Testing — Event Tracker
 *
 * Tracks: page_view, button_click, section_view, signup_page, time_on_page
 * Sends events to the ab-track edge function.
 */
(function () {
  'use strict';

  var COOKIE_NAME = 'nfs_ab';
  var SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function getVisitorId() {
    return localStorage.getItem('nfs_visitor_id') || 'unknown';
  }

  var variant = getCookie(COOKIE_NAME) || 'a';
  var visitorId = getVisitorId();
  var pageLoadTime = Date.now();

  // ── Send event to edge function ────────────────────────────────────
  function trackEvent(eventType, metadata) {
    var payload = {
      visitor_id: visitorId,
      variant: variant,
      event_type: eventType,
      page_url: window.location.pathname,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    // Use sendBeacon for reliability (survives page unload)
    var url = SUPABASE_URL + '/functions/v1/ab-track';
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, JSON.stringify(payload));
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    }
  }

  // ── Track page view ────────────────────────────────────────────────
  trackEvent('page_view', {
    referrer: document.referrer || 'direct',
    screen_width: window.innerWidth,
    user_agent: navigator.userAgent
  });

  // ── Track button clicks ────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var target = e.target.closest('a, button');
    if (!target) return;

    var href = target.getAttribute('href') || '';
    var text = (target.textContent || '').trim().substring(0, 50);
    var feature = target.getAttribute('data-feature') || '';

    // Track CTA clicks (signup, signin, pricing anchors)
    if (href === '/signup' || href === '/signin' || href.indexOf('#') === 0 ||
        target.classList.contains('nav-btn') || feature.indexOf('CTA') !== -1) {
      trackEvent('button_click', {
        text: text,
        href: href,
        feature: feature,
        position: target.getBoundingClientRect().top + window.scrollY
      });
    }

    // Track if they navigate to signup
    if (href === '/signup') {
      trackEvent('signup_page', { source: text });
    }
  });

  // ── Track section views via IntersectionObserver ───────────────────
  var observedSections = {};

  function observeSections() {
    var sections = document.querySelectorAll('[id]');
    if (!sections.length || !window.IntersectionObserver) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !observedSections[entry.target.id]) {
          observedSections[entry.target.id] = true;
          trackEvent('section_view', {
            section_id: entry.target.id,
            time_elapsed_ms: Date.now() - pageLoadTime
          });
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(function (section) {
      // Only observe major sections
      if (['hero', 'deals', 'how-it-works', 'pricing', 'university', 'cta'].indexOf(section.id) !== -1) {
        observer.observe(section);
      }
    });
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeSections);
  } else {
    observeSections();
  }

  // ── Track time on page ─────────────────────────────────────────────
  window.addEventListener('beforeunload', function () {
    var timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000);
    trackEvent('time_on_page', { seconds: timeOnPage });
  });

  // ── Track scroll depth ─────────────────────────────────────────────
  var maxScroll = 0;
  var scrollMilestones = { 25: false, 50: false, 75: false, 100: false };

  window.addEventListener('scroll', function () {
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    var percent = Math.round((scrollTop / docHeight) * 100);

    if (percent > maxScroll) {
      maxScroll = percent;
      [25, 50, 75, 100].forEach(function (milestone) {
        if (percent >= milestone && !scrollMilestones[milestone]) {
          scrollMilestones[milestone] = true;
          trackEvent('scroll_depth', { percent: milestone });
        }
      });
    }
  }, { passive: true });

  // Expose variant info for other scripts
  window.__nfsAB = {
    variant: variant,
    visitorId: visitorId,
    trackEvent: trackEvent
  };
})();
