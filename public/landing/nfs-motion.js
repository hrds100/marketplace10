/* ═══════════════════════════════════════════
   NFsTay Motion System
   Scroll reveals, counters, hover interactions
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  // 1. SCROLL-TRIGGERED ENTRANCES
  var srObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Stagger children
        var children = entry.target.querySelectorAll('.sr-child');
        children.forEach(function (child, i) {
          setTimeout(function () {
            child.classList.add('visible');
          }, 80 * i);
        });
        srObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.sr').forEach(function (el) {
    srObserver.observe(el);
  });

  // 2. NUMBER COUNTERS
  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('[data-count]').forEach(function (el) {
    counterObserver.observe(el);
  });

  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var decimals = el.getAttribute('data-decimals') ? parseInt(el.getAttribute('data-decimals')) : 0;
    var duration = 1200;
    var start = performance.now();

    function step(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      // Ease out
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = eased * target;

      if (decimals > 0) {
        el.textContent = prefix + current.toFixed(decimals) + suffix;
      } else {
        el.textContent = prefix + Math.round(current).toLocaleString() + suffix;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // 3. TAB SWITCHING (for variant 01)
  document.querySelectorAll('[data-tab-group]').forEach(function (group) {
    var btns = group.querySelectorAll('[data-tab-target]');
    var panes = group.querySelectorAll('[data-tab-pane]');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('active'); });
        panes.forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var target = group.querySelector('[data-tab-pane="' + btn.getAttribute('data-tab-target') + '"]');
        if (target) target.classList.add('active');
      });
    });
  });

  // 4. PERSONA SWITCHING (for variant 08)
  document.querySelectorAll('[data-persona-group]').forEach(function (group) {
    var pills = group.querySelectorAll('[data-persona]');
    var contents = group.querySelectorAll('[data-persona-content]');
    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        pills.forEach(function (p) { p.classList.remove('active'); });
        contents.forEach(function (c) { c.classList.remove('active'); });
        pill.classList.add('active');
        var target = group.querySelector('[data-persona-content="' + pill.getAttribute('data-persona') + '"]');
        if (target) target.classList.add('active');
      });
    });
  });

  // 5. PLAYGROUND CALCULATOR (for variant 05)
  var playSlider = document.getElementById('playSlider');
  var playRent = document.getElementById('playRent');
  var playNights = document.getElementById('playNights');
  var playProfit = document.getElementById('playProfit');

  if (playSlider && playRent && playProfit) {
    function calcPlayground() {
      var n = parseInt(playSlider.value);
      var r = parseInt(playRent.value) || 850;
      var nightlyRate = Math.round(r * 1.2 / 20);
      var revenue = n * nightlyRate;
      var profit = revenue - r;
      if (playNights) playNights.textContent = n;
      playProfit.textContent = (profit >= 0 ? '' : '-') + '\u00A3' + Math.abs(profit).toLocaleString();
      playProfit.style.color = profit >= 0 ? '#1e9a80' : '#dc2626';
    }
    playSlider.addEventListener('input', calcPlayground);
    playRent.addEventListener('input', calcPlayground);
  }

  // 6. GALLERY CLICK (for variant 03)
  document.querySelectorAll('[data-gallery]').forEach(function (gallery) {
    var cards = gallery.querySelectorAll('[data-deal]');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        cards.forEach(function (c) { c.classList.remove('active'); });
        card.classList.add('active');
        var nameEl = gallery.querySelector('[data-gal-name]');
        var cityEl = gallery.querySelector('[data-gal-city]');
        var rentEl = gallery.querySelector('[data-gal-rent]');
        var profitEl = gallery.querySelector('[data-gal-profit]');
        if (nameEl) nameEl.textContent = card.getAttribute('data-deal-name');
        if (cityEl) cityEl.textContent = card.getAttribute('data-deal-city');
        if (rentEl) rentEl.textContent = '\u00A3' + parseInt(card.getAttribute('data-deal-rent')).toLocaleString();
        if (profitEl) profitEl.textContent = '\u00A3' + parseInt(card.getAttribute('data-deal-profit')).toLocaleString() + '/mo';
      });
    });
  });

  // 7. HUB IFRAME SWITCHER
  var hubIframe = document.getElementById('hubIframe');
  if (hubIframe) {
    document.querySelectorAll('[data-hub-target]').forEach(function (pill) {
      pill.addEventListener('click', function () {
        document.querySelectorAll('[data-hub-target]').forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');
        hubIframe.src = pill.getAttribute('data-hub-target');
      });
    });
  }

  // 8. KPI DASHBOARD TOGGLE (for variant 09)
  document.querySelectorAll('[data-kpi-toggle]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('[data-kpi-toggle]').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
    });
  });

})();
