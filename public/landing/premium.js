/* ═══════════════════════════════════════════
   NFsTay Premium Animations — JS
   Line draw, ripples, morph cards, word stagger
   ═══════════════════════════════════════════ */
(function () {
  'use strict';

  // ── WORD STAGGER ──
  document.querySelectorAll('.word-stagger').forEach(function (el) {
    var text = el.textContent.trim();
    var words = text.split(/\s+/);
    el.innerHTML = words.map(function (w) { return '<span class="word">' + w + '</span>'; }).join(' ');
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          el.querySelectorAll('.word').forEach(function (word, i) {
            word.style.transitionDelay = (i * 80) + 'ms';
          });
          el.classList.add('animate');
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.3 });
    obs.observe(el);
  });

  // ── MORPHING CARD EXPAND ──
  var morphObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('entered');
        morphObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.morph-card').forEach(function (el, i) {
    el.style.transitionDelay = (i * 100) + 'ms';
    morphObs.observe(el);
  });

  // ── EXPANDING GLOW RIPPLE (on journey nodes) ──
  var rippleObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        fireRipple(e.target);
        rippleObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.ripple-container').forEach(function (el) {
    rippleObs.observe(el);
  });

  function fireRipple(node) {
    for (var i = 0; i < 2; i++) {
      var ring = document.createElement('div');
      ring.className = 'ripple-ring ' + (i === 0 ? 'fire' : 'fire-delay');
      node.appendChild(ring);
      setTimeout(function () { ring.remove(); }, 1200);
    }
    // Also add glow breathe to the parent card
    var step = node.closest('.prem-step');
    if (step) {
      var card = step.querySelector('.prem-step-card');
      if (card) card.classList.add('glow-breathe');
    }
  }

  // ── LINE DRAW (scroll-driven) ──
  var journeySection = document.querySelector('.prem-journey-grid');
  var journeyLine = document.querySelector('.journey-line');
  if (journeySection && journeyLine) {
    function updateLine() {
      var rect = journeySection.getBoundingClientRect();
      var viewH = window.innerHeight;
      var sectionTop = rect.top;
      var sectionH = rect.height;
      var scrollDist = sectionH + viewH * 0.5;
      var progress = Math.max(0, Math.min(1, (viewH * 0.4 - sectionTop) / scrollDist));
      journeyLine.style.transform = 'translateX(-50%) scaleY(' + progress + ')';
    }
    window.addEventListener('scroll', updateLine, { passive: true });
    updateLine();
  }

  // ── FLOATING PARTICLES ──
  document.querySelectorAll('.particles').forEach(function (container) {
    var count = 6 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) {
      var dot = document.createElement('div');
      dot.className = 'particle';
      var size = 4 + Math.random() * 4;
      var opacity = 0.06 + Math.random() * 0.08;
      dot.style.cssText =
        'width:' + size + 'px;height:' + size + 'px;' +
        'background:rgba(30,154,128,' + opacity + ');' +
        'left:' + (Math.random() * 100) + '%;' +
        'top:' + (Math.random() * 100) + '%;' +
        '--dur:' + (6 + Math.random() * 4) + 's;' +
        '--dy:' + (-15 - Math.random() * 15) + 'px;' +
        '--dx:' + (-10 + Math.random() * 20) + 'px;' +
        'animation-delay:' + (Math.random() * 4) + 's;';
      container.appendChild(dot);
    }
  });

  // ── COUNTER ROLL-UP with end pulse ──
  var counterObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        rollCounter(e.target);
        counterObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('[data-roll]').forEach(function (el) {
    counterObs.observe(el);
  });

  function rollCounter(el) {
    var target = parseFloat(el.getAttribute('data-roll'));
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var dec = el.getAttribute('data-decimals') ? parseInt(el.getAttribute('data-decimals')) : 0;
    var dur = 1400;
    var start = performance.now();
    function step(now) {
      var elapsed = now - start;
      var p = Math.min(elapsed / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = eased * target;
      el.textContent = prefix + (dec > 0 ? val.toFixed(dec) : Math.round(val).toLocaleString()) + suffix;
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        // End pulse
        el.style.transition = 'transform 200ms ease-out';
        el.style.transform = 'scale(1.08)';
        setTimeout(function () { el.style.transform = 'scale(1)'; }, 200);
      }
    }
    requestAnimationFrame(step);
  }

  // ── HOVER GLOW on academy cards ──
  document.querySelectorAll('.prem-course').forEach(function (card) {
    card.addEventListener('mouseenter', function () {
      card.classList.add('glow-breathe');
    });
    card.addEventListener('mouseleave', function () {
      card.classList.remove('glow-breathe');
    });
  });

  })();
