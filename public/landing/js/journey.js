/* ============================================
   Journey Section JS — IntersectionObserver
   heading animation, step card expand/collapse,
   floating dots
   ============================================ */

  (function(){
    // Heading word entrance via IntersectionObserver
    var headingObs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          var words = document.querySelectorAll('.jword');
          words.forEach(function(w,i){
            setTimeout(function(){ w.classList.add('jword-visible'); }, i * 70);
          });
          var underline = document.querySelector('.profit-underline');
          if(underline) setTimeout(function(){ underline.classList.add('underline-visible'); }, 600);
          headingObs.unobserve(e.target);
        }
      });
    }, {threshold:0.2});
    var jh = document.querySelector('.journey-heading');
    if(jh) headingObs.observe(jh);

    // Cards
    var cards = document.querySelectorAll('.step-card');
    var currentCard = null;

    function expandCard(card) {
      card.style.height = 'auto';
      card.style.overflow = 'hidden';
      var fullHeight = card.scrollHeight;
      card.style.height = (window.innerWidth <= 768 ? '64px' : '72px');
      card.offsetHeight;
      card.classList.add('active');
      card.style.height = fullHeight + 'px';
      card.addEventListener('transitionend', function handler(e) {
        if (e.propertyName === 'height') {
          card.style.height = 'auto';
          card.removeEventListener('transitionend', handler);
        }
      });

      var bar = card.querySelector('.accent-bar');
      if (bar) setTimeout(function(){ bar.classList.add('bar-visible'); }, 100);

      var rows = card.querySelectorAll('.card-body-row');
      rows.forEach(function(row, i){
        setTimeout(function(){ row.classList.add('row-visible'); }, 150 + i * 80);
      });

      var fill = card.querySelector('.progress-fill');
      if (fill) setTimeout(function(){ fill.classList.add('fill-visible'); }, 300);

      var shimmer = card.querySelector('.shimmer-layer');
      if (shimmer) setTimeout(function(){ shimmer.classList.add('shimmer-go'); }, 500);

      for (var r = 0; r < 2; r++) {
        (function(delay){
          var ripple = document.createElement('span');
          ripple.className = 'journey-sonar';
          card.appendChild(ripple);
          setTimeout(function(){ ripple.classList.add('sonar-go'); }, delay);
          setTimeout(function(){ ripple.remove(); }, delay + 1000);
        })(r * 200);
      }
    }

    function collapseCard(card) {
      card.classList.remove('active');
      card.style.height = card.scrollHeight + 'px';
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          card.style.height = (window.innerWidth <= 768 ? '64px' : '72px');
        });
      });
      var bar = card.querySelector('.accent-bar');
      if(bar) bar.classList.remove('bar-visible');
      card.querySelectorAll('.card-body-row').forEach(function(r){ r.classList.remove('row-visible'); });
      var fill = card.querySelector('.progress-fill');
      if(fill) fill.classList.remove('fill-visible');
      var shimmer = card.querySelector('.shimmer-layer');
      if(shimmer) shimmer.classList.remove('shimmer-go');
    }

    function updateCounter(n) {
      var el = document.getElementById('counterNum');
      if (!el) return;
      el.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
      el.style.transform = 'translateY(-24px)';
      el.style.opacity = '0';
      setTimeout(function(){
        el.textContent = (n < 10 ? '0' : '') + n;
        el.style.transform = 'translateY(24px)';
        requestAnimationFrame(function(){
          el.style.transform = 'translateY(0)';
          el.style.opacity = '1';
        });
      }, 250);
    }

    var cardObs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          var card = e.target;
          var i = Array.prototype.indexOf.call(cards, card);
          if (currentCard && currentCard !== card) collapseCard(currentCard);
          expandCard(card);
          currentCard = card;
          updateCounter(i + 1);
        }
      });
    }, {threshold:0.3, rootMargin:'0px 0px -20% 0px'});

    cards.forEach(function(card){ cardObs.observe(card); });

    cards.forEach(function(card, i){
      card.addEventListener('click', function(){
        if(card.classList.contains('active')){
          collapseCard(card);
          currentCard = null;
        } else {
          if(currentCard && currentCard !== card) collapseCard(currentCard);
          expandCard(card);
          currentCard = card;
          updateCounter(i + 1);
        }
      });
    });

    // Floating dots (CSS animations)
    var dotsContainer = document.getElementById('journeyDots');
    if (dotsContainer) {
      var durations = [7,9,11,8,10,6];
      for (var d = 0; d < 6; d++) {
        var dot = document.createElement('div');
        var sz = 5 + Math.random() * 5;
        dot.style.cssText = 'position:absolute;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:rgba(30,154,128,'+(0.05+Math.random()*0.05)+');left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;animation:floatDot'+d+' '+durations[d]+'s ease-in-out infinite;';
        dotsContainer.appendChild(dot);
      }
      var style = document.createElement('style');
      var kf = '';
      for (var k = 0; k < 6; k++) {
        var dx = -10 + Math.random()*20, dy = -15 - Math.random()*15;
        kf += '@keyframes floatDot'+k+'{0%,100%{transform:translate(0,0);}33%{transform:translate('+Math.round(dx)+'px,'+Math.round(dy)+'px);}66%{transform:translate('+Math.round(-dx*0.6)+'px,'+Math.round(-dy*0.4)+'px);}}';
      }
      style.textContent = kf;
      document.head.appendChild(style);
    }
  })();
