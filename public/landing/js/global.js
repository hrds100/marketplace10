/* ============================================
   Global JS — nav, scroll, FAQ, counters,
   persona switching, reviews, booking demo
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // 13. SCROLL REVEAL
  // ========================================
  document.querySelectorAll('.scroll-reveal').forEach(el => {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { e.target.classList.add('visible'); }
    }, { threshold: 0.1 }).observe(el);
  });

  // ========================================
  // 14. CLOUD PARALLAX
  // ========================================
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const c1 = document.querySelector('.cloud-1');
    const c2 = document.querySelector('.cloud-2');
    if (c1) c1.style.transform = `translateY(${y * 0.05}px)`;
    if (c2) c2.style.transform = `translateY(${y * 0.08}px)`;
  });

  // 15. MOBILE MENU (full-screen overlay)
  // ========================================
  const navBtn = document.querySelector('.nav_button');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuClose = document.getElementById('mobileMenuClose');

  function openMobileMenu() { if (mobileMenu) mobileMenu.classList.add('open'); }
  function closeMobileMenu() { if (mobileMenu) mobileMenu.classList.remove('open'); }

  if (navBtn) navBtn.addEventListener('click', () => {
    if (mobileMenu && mobileMenu.classList.contains('open')) closeMobileMenu();
    else openMobileMenu();
  });
  if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMobileMenu);

  // Auto-close on link click
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', () => closeMobileMenu());
    });
  }

  // Mobile language switcher (inside overlay menu)
  const mobileLangSwitcher = document.getElementById('mobileLangSwitcher');
  const mobileLangBtn = document.getElementById('mobileLangBtn');
  if (mobileLangBtn && mobileLangSwitcher) {
    mobileLangBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileLangSwitcher.classList.toggle('open');
    });
  }
  // Mobile lang options: call switchLang and close
  document.querySelectorAll('#mobileLangOptions a[data-lang]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      var lang = a.getAttribute('data-lang');
      if (window.switchLang) window.switchLang(lang);
      var labels = { en:'English', pt:'Português', es:'Español', fr:'Français', ar:'العربية' };
      var labelEl = document.getElementById('mobileLangLabel');
      if (labelEl) labelEl.textContent = labels[lang] || lang;
      if (mobileLangSwitcher) mobileLangSwitcher.classList.remove('open');
    });
  });

  // Mobile globe icon (navbar) opens the mobile menu with lang switcher visible
  const mobileGlobe = document.querySelector('.language-switcher-wrapper.mobile-only');
  if (mobileGlobe) {
    mobileGlobe.addEventListener('click', () => {
      openMobileMenu();
      if (mobileLangSwitcher) mobileLangSwitcher.classList.add('open');
    });
  }

  // 16. SMOOTH SCROLL + FAQ
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = a.getAttribute('href');
      if (t === '#') return;
      const el = document.querySelector(t);
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
  document.querySelectorAll('.faq-wrapper-3-2').forEach(faq => {
    faq.addEventListener('click', () => faq.classList.toggle('open'));
  });

});

/* ═══════════════════════════════════════════
   nfstay Motion System
   Scroll reveals, counters, hover interactions
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  // 1. SCROLL-TRIGGERED ENTRANCES (cascade + re-trigger on scroll up/down)
  var srObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Stagger children with 90ms cascade
        var children = entry.target.querySelectorAll('.sr-child');
        children.forEach(function (child, i) {
          setTimeout(function () {
            child.classList.add('visible');
          }, 90 * i);
        });
      } else {
        // Re-trigger: remove visible when leaving viewport
        entry.target.classList.remove('visible');
        var children = entry.target.querySelectorAll('.sr-child');
        children.forEach(function (child) {
          child.classList.remove('visible');
        });
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.sr').forEach(function (el) {
    srObserver.observe(el);
  });

  // 1b. TIMELINE STEP SCROLL REVEAL (expand on scroll)
  var tlObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        tlObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.tl-step').forEach(function (el, i) {
    el.style.transitionDelay = (i * 80) + 'ms';
    tlObserver.observe(el);
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

  // 4. PERSONA SWITCHING (cascade animation)
  document.querySelectorAll('[data-persona-group]').forEach(function (group) {
    var pills = group.querySelectorAll('[data-persona]');
    var contents = group.querySelectorAll('[data-persona-content]');

    // Initial cascade for active content
    var initialActive = group.querySelector('[data-persona-content].active');
    if (initialActive) {
      var initCards = initialActive.querySelectorAll('.card');
      initCards.forEach(function (card, i) {
        setTimeout(function () { card.classList.add('cascade-in'); }, 100 * i);
      });
    }

    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        pills.forEach(function (p) { p.classList.remove('active'); });
        // Remove cascade from all cards
        contents.forEach(function (c) {
          c.classList.remove('active');
          c.querySelectorAll('.card').forEach(function (card) { card.classList.remove('cascade-in'); });
        });
        pill.classList.add('active');
        var target = group.querySelector('[data-persona-content="' + pill.getAttribute('data-persona') + '"]');
        if (target) {
          target.classList.add('active');
          // Cascade cards in with stagger
          var cards = target.querySelectorAll('.card');
          cards.forEach(function (card, i) {
            setTimeout(function () { card.classList.add('cascade-in'); }, 100 * i);
          });
        }
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
        if (nameEl) nameEl.textContent = card.getAttribute('data-deal-name') || '';
        if (cityEl) cityEl.textContent = card.getAttribute('data-deal-city') || '';
        var rentVal = parseInt(card.getAttribute('data-deal-rent'));
        if (rentEl) rentEl.textContent = isNaN(rentVal) ? '-' : '\u00A3' + rentVal.toLocaleString();
        var profitVal = parseInt(card.getAttribute('data-deal-profit'));
        if (profitEl) profitEl.textContent = isNaN(profitVal) ? '-' : '\u00A3' + profitVal.toLocaleString() + '/mo';
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

// Clone review slides for seamless infinite loop
document.addEventListener('DOMContentLoaded', function() {
  var track = document.querySelector('.review-track');
  if (track) { track.innerHTML = track.innerHTML + track.innerHTML; }
});

/* ── Booking Demo Interactivity ── */
  // Booking demo interactivity
  var demoNameInput = document.getElementById('demoName');
  var demoSubInput = document.getElementById('demoSubdomain');
  var demoLogo = document.getElementById('demoLogo');
  var demoLogoImg = document.getElementById('demoLogoImg');
  var demoFooterLogo = document.getElementById('demoFooterLogo');
  var demoFooter = document.getElementById('demoFooterName');
  var demoUrl = document.getElementById('demoUrlBar');
  var demoSearch = document.getElementById('demoSearchBtn');
  var demoHeroImg = document.getElementById('demoHeroImg');
  var currentColor = '#10b981';

  if (demoNameInput) {
    demoNameInput.addEventListener('input', function() {
      var v = this.value || 'Your Brand';
      demoLogo.textContent = v;
      demoFooter.textContent = v;
      demoLogo.style.color = currentColor;
      demoFooter.style.color = currentColor;
      var sub = v.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourbrand';
      demoSubInput.value = sub;
      demoUrl.textContent = sub + '.nfstay.app';
    });
  }

  function pickColor(btn) {
    currentColor = btn.dataset.color;
    document.querySelectorAll('.demo-color').forEach(function(b) { b.style.borderColor = 'transparent'; });
    btn.style.borderColor = currentColor;
    demoSearch.style.backgroundColor = currentColor;
    demoLogo.style.color = currentColor;
    demoFooter.style.color = currentColor;
    document.querySelectorAll('.demo-price').forEach(function(p) { p.style.color = currentColor; });
  }

  function handleLogoUpload(input) {
    if (input.files && input.files[0]) {
      var reader = new FileReader();
      reader.onload = function(e) {
        demoLogoImg.src = e.target.result;
        demoLogoImg.style.display = 'block';
        demoFooterLogo.src = e.target.result;
        demoFooterLogo.style.display = 'block';
        document.getElementById('logoLabel').textContent = 'Logo uploaded';
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function handleBgUpload(input) {
    if (input.files && input.files[0]) {
      var reader = new FileReader();
      reader.onload = function(e) {
        demoHeroImg.src = e.target.result;
        document.getElementById('bgLabel').textContent = 'Background changed';
      };
      reader.readAsDataURL(input.files[0]);
    }
  }
