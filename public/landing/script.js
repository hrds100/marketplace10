/* ============================================
   NFsTay Hero — Complete Animation System v3
   Slow, smooth story with animated cursor
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ========================================
  // 1. ELEMENTS
  // ========================================
  const tabs = document.querySelectorAll('.chat-tab');
  const previews = {
    deals:      document.getElementById('previewDeals'),
    crm:        document.getElementById('previewCrm'),
    inbox:      document.getElementById('previewInbox'),
    finale:     document.getElementById('previewFinale'),
  };
  const typewriterEl   = document.getElementById('chatTypewriter');
  const cursorEl       = document.getElementById('typewriterCursor');
  const tooltipEl      = document.getElementById('clickHereTooltip');
  const sendBtn        = document.getElementById('chatSendBtn');
  const messagesArea   = document.getElementById('chatMessagesArea');
  const progressFill   = document.getElementById('chatProgressFill');
  const earningsBanner = document.getElementById('chatEarningsBanner');
  const animCursor     = document.getElementById('animatedCursor');
  const demoComponent  = document.getElementById('heroDemoComponent');

  // Deal elements (dealDetail panel removed — no calculator)
  const nfsCard1       = document.getElementById('nfsCard1');
  const pipeColNewLead = document.getElementById('pipeColNewLead');

  let currentPreview = 'deals';
  let storyActive = false;
  let typewriterInterval = null;
  let autoCycleTimer = null;

  // ========================================
  // 2. GSAP ENTRANCE
  // ========================================
  const heroTL = gsap.timeline({ defaults: { ease: 'power3.out', clearProps: 'all' } });
  heroTL
    .from('.nav_fixed', { y: -30, opacity: 0, duration: 0.5 })
    .from('.hero-heading', { y: 20, opacity: 0, duration: 0.6 }, '-=0.2')
    .from('.hero-buttons', { y: 15, opacity: 0, duration: 0.4 }, '-=0.3')
    .from('#heroDemoComponent', { y: 40, opacity: 0, duration: 0.7, scale: 0.98 }, '-=0.2')
    .from('.chat-tab', { y: 8, opacity: 0, duration: 0.3, stagger: 0.08 }, '-=0.4');

  // ========================================
  // 3. PREVIEW SWITCHING (GSAP slide + fade)
  // ========================================
  function switchPreview(newKey, instant) {
    const outEl = previews[currentPreview];
    const inEl = previews[newKey];
    if (!outEl || !inEl) return;
    if (newKey === currentPreview && !instant) return;

    // Update tab pills (only for tabbed previews)
    tabs.forEach(t => t.classList.remove('active'));
    const tabBtn = document.querySelector(`.chat-tab[data-tab="${newKey}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    // Hide ALL panels first, then show only the target
    Object.values(previews).forEach(p => {
      if (p) {
        p.classList.remove('active');
        gsap.killTweensOf(p);
        p.style.opacity = '0';
        p.style.visibility = 'hidden';
      }
    });

    if (instant) {
      inEl.classList.add('active');
      inEl.style.opacity = '1';
      inEl.style.visibility = 'visible';
      currentPreview = newKey;
      return;
    }

    // Animate in the new panel (450ms slide from right)
    inEl.classList.add('active');
    inEl.style.visibility = 'visible';
    gsap.fromTo(inEl,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out' }
    );
    currentPreview = newKey;
  }

  // Tab click handler
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (storyActive) return;
      const key = tab.dataset.tab;
      switchPreview(key);
      stopAutoCycle();
      startAutoCycle();
    });
  });

  // ========================================
  // 4. AUTO-CYCLE TABS (5s)
  // ========================================
  const cycleOrder = ['deals', 'crm', 'inbox'];
  let cycleIdx = 0;

  function startAutoCycle() {
    if (storyActive) return;
    autoCycleTimer = setInterval(() => {
      cycleIdx = (cycleIdx + 1) % cycleOrder.length;
      switchPreview(cycleOrder[cycleIdx]);
    }, 5000);
  }
  function stopAutoCycle() {
    if (autoCycleTimer) { clearInterval(autoCycleTimer); autoCycleTimer = null; }
  }

  // ========================================
  // 5. TYPEWRITER
  // ========================================
  const IDLE_PLACEHOLDERS = [
    'Ask the landlord about viewings…',
    'Ask the landlord about monthly rent…',
    'Ask the landlord about move-in dates…',
    'Ask the landlord about serviced accommodation terms…',
  ];
  let placeholderIdx = 0;

  function typeText(text, speed = 40) {
    return new Promise(resolve => {
      if (typewriterInterval) clearInterval(typewriterInterval);
      typewriterEl.textContent = '';
      cursorEl.style.display = 'inline';
      let i = 0;
      typewriterInterval = setInterval(() => {
        if (i < text.length) {
          typewriterEl.textContent = text.slice(0, i + 1);
          i++;
        } else {
          clearInterval(typewriterInterval);
          typewriterInterval = null;
          resolve();
        }
      }, speed);
    });
  }

  function clearTypewriter() {
    if (typewriterInterval) clearInterval(typewriterInterval);
    typewriterEl.textContent = '';
  }

  // Idle typewriter loop (cycles through placeholders)
  async function idleTypewriterLoop() {
    if (storyActive) return;
    const text = IDLE_PLACEHOLDERS[placeholderIdx];
    await typeText(text, 40);
    await delay(1200);
    placeholderIdx = (placeholderIdx + 1) % IDLE_PLACEHOLDERS.length;
    clearTypewriter();
    await delay(300);
    if (!storyActive) idleTypewriterLoop();
  }

  // ========================================
  // 6. CHAT MESSAGES + TYPING INDICATOR + SOUND
  // ========================================

  // iPhone message sound (base64 encoded short blip)
  const msgSoundCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playMessageSound() {
    try {
      const osc = msgSoundCtx.createOscillator();
      const gain = msgSoundCtx.createGain();
      osc.connect(gain);
      gain.connect(msgSoundCtx.destination);
      osc.frequency.setValueAtTime(1200, msgSoundCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, msgSoundCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, msgSoundCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, msgSoundCtx.currentTime + 0.15);
      osc.start(msgSoundCtx.currentTime);
      osc.stop(msgSoundCtx.currentTime + 0.15);
    } catch (e) { /* silent fallback */ }
  }

  // Typing indicator (three bouncing dots)
  function showTypingIndicator(from) {
    return new Promise(resolve => {
      const div = document.createElement('div');
      div.className = `story-msg ${from}`;
      div.id = 'typingIndicator';
      div.innerHTML = `<div class="story-msg-bubble typing-dots"><span></span><span></span><span></span></div>`;
      div.style.opacity = '0';
      div.style.transform = 'translateY(6px)';
      messagesArea.appendChild(div);
      gsap.to(div, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out',
        onComplete: () => { messagesArea.scrollTop = messagesArea.scrollHeight; resolve(); }
      });
    });
  }
  function hideTypingIndicator() {
    const ti = document.getElementById('typingIndicator');
    if (ti) ti.remove();
  }

  function addMessage(from, text) {
    return new Promise(resolve => {
      hideTypingIndicator();
      const div = document.createElement('div');
      div.className = `story-msg ${from}`;
      div.innerHTML = `<div class="story-msg-bubble">${text}</div>`;
      div.style.opacity = '0';
      div.style.transform = 'translateY(8px)';
      messagesArea.appendChild(div);
      playMessageSound();
      gsap.to(div, {
        opacity: 1, y: 0, duration: 0.35, ease: 'power2.out',
        onComplete: () => { messagesArea.scrollTop = messagesArea.scrollHeight; resolve(); },
      });
    });
  }
  function clearMessages() { messagesArea.innerHTML = ''; }

  // ========================================
  // 7. PROGRESS BAR
  // ========================================
  function setProgress(pct) {
    gsap.to(progressFill, { width: pct + '%', duration: 0.6, ease: 'power2.out' });
  }

  // ========================================
  // 8. ANIMATED CURSOR
  // ========================================
  function showCursor() { animCursor.style.display = 'block'; gsap.set(animCursor, { opacity: 1 }); }
  function hideCursor() { gsap.to(animCursor, { opacity: 0, duration: 0.3, onComplete: () => { animCursor.style.display = 'none'; } }); }

  function moveCursorTo(targetEl, duration = 1.2) {
    return new Promise(resolve => {
      const containerRect = demoComponent.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const x = targetRect.left - containerRect.left + targetRect.width / 2;
      const y = targetRect.top - containerRect.top + targetRect.height / 2;
      gsap.to(animCursor, { left: x, top: y, duration, ease: 'power2.inOut', onComplete: resolve });
    });
  }

  function clickCursorOn(targetEl) {
    return new Promise(async resolve => {
      await moveCursorTo(targetEl, 1.0);
      // Click feedback: scale down then up
      gsap.timeline()
        .to(animCursor, { scale: 0.8, duration: 0.1 })
        .to(animCursor, { scale: 1, duration: 0.15, ease: 'back.out(2)' });
      // Green ring flash on target
      targetEl.style.boxShadow = '0 0 0 3px rgba(30,154,128,0.4)';
      setTimeout(() => { targetEl.style.boxShadow = ''; }, 600);
      await delay(300);
      resolve();
    });
  }

  // ========================================
  // 9. SLIDER & COUNTER HELPERS
  // ========================================
  // ========================================
  // 10. IDLE STATE
  // ========================================
  function showBanner() {
    if (earningsBanner) { earningsBanner.style.display = 'flex'; gsap.fromTo(earningsBanner, { opacity: 0 }, { opacity: 1, duration: 0.4 }); }
    if (messagesArea) { messagesArea.style.display = 'none'; }
  }
  function hideBanner() {
    if (earningsBanner) gsap.to(earningsBanner, { opacity: 0, duration: 0.3, onComplete: () => { earningsBanner.style.display = 'none'; } });
    if (messagesArea) { messagesArea.style.display = 'block'; }
  }
  function showTooltip() { if (tooltipEl) { tooltipEl.style.display = 'block'; gsap.fromTo(tooltipEl, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3 }); } }
  function hideTooltip() { if (tooltipEl) { gsap.to(tooltipEl, { opacity: 0, duration: 0.2, onComplete: () => { tooltipEl.style.display = 'none'; } }); } }

  async function startIdleState() {
    clearMessages();
    clearTypewriter();
    showBanner();
    setProgress(65);
    switchPreview('deals', true);
    cycleIdx = 0;

    // Start typewriter after brief pause
    await delay(600);
    idleTypewriterLoop();

    // Show tooltip after 2s
    await delay(1400);
    if (!storyActive) showTooltip();
  }

  // Initial startup
  setTimeout(() => {
    startIdleState();
    setTimeout(startAutoCycle, 2000);
  }, 1500);

  // ========================================
  // 11. STORY SEQUENCE — 25 seconds
  // ========================================
  const inquireBtn1 = document.getElementById('inquireBtn1');

  const isMobile = () => window.innerWidth <= 991;

  async function runStory() {
    storyActive = true;
    stopAutoCycle();
    hideTooltip();
    hideBanner();
    clearMessages();
    clearTypewriter();
    setProgress(0);

    if (isMobile()) {
      // MOBILE STORY: chat-only, no preview panels
      return runMobileStory();
    }

    // --- DESKTOP STEP 1: FIND A DEAL (0-4s) ---
    switchPreview('deals', true);
    setProgress(10);
    await delay(1000);

    showCursor();
    gsap.set(animCursor, { left: demoComponent.offsetWidth - 60, top: demoComponent.offsetHeight - 60 });
    await delay(500);

    if (nfsCard1) {
      await moveCursorTo(nfsCard1, 1.5);
      nfsCard1.classList.add('highlighted');
      setProgress(20);
      await delay(2000);
    }

    // --- DESKTOP STEP 2: CLICK "INQUIRE NOW" (4-7s) ---
    if (inquireBtn1) {
      await clickCursorOn(inquireBtn1);
      inquireBtn1.textContent = '✓ Inquiry Sent';
      inquireBtn1.style.background = '#1e9a80';
      inquireBtn1.style.color = 'white';
      inquireBtn1.style.borderColor = '#1e9a80';
    }
    setProgress(30);
    await delay(1500);

    hideCursor();

    // --- DESKTOP STEP 3: START CHATTING ---
    switchPreview('inbox');
    setProgress(40);
    await delay(800);

    // Type inquiry
    await typeText('Is this property available for Airbnb?', 50);
    await delay(400);
    await addMessage('me', 'Is this property available for Airbnb?');
    clearTypewriter();
    setProgress(50);
    await delay(1500);

    // Landlord typing...
    await showTypingIndicator('them');
    await delay(1500);
    await addMessage('them', 'Yes it is! The landlord has approved it for short-term lets. Would you like to arrange a viewing?');
    setProgress(60);
    await delay(2000);

    // Type viewing request
    await typeText('Tomorrow at 5pm works for me!', 50);
    await delay(400);
    await addMessage('me', 'Tomorrow at 5pm works for me!');
    clearTypewriter();
    setProgress(70);
    await delay(1000);

    // Landlord typing...
    await showTypingIndicator('them');
    await delay(1200);
    await addMessage('them', 'Perfect! You\'re booked in for 5pm tomorrow. See you then! 🎉');
    setProgress(80);
    await delay(2000);

    // --- STEP 4: SHOW PIPELINE + DRAG DEAL (16-24s) ---
    switchPreview('crm');
    setProgress(85);
    await delay(500);

    const pipeColContacted = document.getElementById('pipeColContacted');

    // Insert new deal card into New Lead column
    if (pipeColNewLead) {
      const newCard = document.createElement('div');
      newCard.className = 'nfs-pipe-card new-deal-glow';
      newCard.id = 'storyNewCard';
      newCard.innerHTML = '<strong>2-Bed, Ancoats</strong><span>Manchester · £850/mo</span><span class="nfs-pipe-profit">+£1,200</span>';
      newCard.style.opacity = '0';
      newCard.style.transform = 'translateY(-8px)';
      pipeColNewLead.appendChild(newCard);
      gsap.to(newCard, { opacity: 1, y: 0, duration: 0.4, delay: 0.3, ease: 'power2.out' });
      await delay(1500);

      // Show cursor and drag the card to Contacted column
      if (pipeColContacted) {
        showCursor();
        await moveCursorTo(newCard, 0.8);
        await delay(300);

        // Pick up — card lifts slightly and gets shadow
        newCard.style.transition = 'box-shadow 0.2s, transform 0.2s';
        newCard.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        newCard.style.transform = 'scale(1.04)';
        newCard.style.zIndex = '10';
        newCard.style.position = 'relative';
        await delay(400);

        // Calculate drag destination
        const srcRect = newCard.getBoundingClientRect();
        const destRect = pipeColContacted.getBoundingClientRect();
        const dragX = destRect.left - srcRect.left + 10;
        const dragY = destRect.top - srcRect.top + destRect.height - 40;

        // Drag card + cursor together to the Contacted column
        gsap.to(newCard, { x: dragX, y: dragY, duration: 1.2, ease: 'power2.inOut' });
        gsap.to(animCursor, {
          left: '+=' + dragX, top: '+=' + dragY,
          duration: 1.2, ease: 'power2.inOut',
        });
        await delay(1400);

        // Drop — move card into the Contacted column DOM, reset transform
        newCard.style.boxShadow = '';
        newCard.style.transform = '';
        newCard.style.zIndex = '';
        newCard.style.position = '';
        newCard.style.transition = '';
        gsap.set(newCard, { x: 0, y: 0 });
        pipeColContacted.appendChild(newCard);

        // Settle glow
        newCard.classList.remove('new-deal-glow');
        newCard.classList.add('new-deal-glow');
        await delay(300);

        hideCursor();
      }
    }
    setProgress(92);
    await delay(2000);

    // --- STEP 5: THE PAYOFF (22-27s) ---
    setProgress(100);
    switchPreview('finale');
    await delay(4500);

    // --- RESET ---
    resetStory();
  }

  // ── MOBILE STORY (chat-only, no preview panels) ──
  async function runMobileStory() {
    setProgress(10);

    // Step 1: System message about finding a deal
    await addMessage('them', '📍 Found: 2-Bed Flat, Ancoats, Manchester');
    await delay(500);
    await addMessage('them', '💰 Rent: £850/mo · Est. profit: £1,200/mo');
    setProgress(20);
    await delay(1500);

    // Step 2: User inquires
    await typeText('Is this available for Airbnb?', 50);
    await delay(400);
    await addMessage('me', 'Is this available for Airbnb?');
    clearTypewriter();
    setProgress(35);
    await delay(1000);

    // Step 3: Landlord typing + reply
    await showTypingIndicator('them');
    await delay(1200);
    await addMessage('them', 'Yes! Landlord approved for short-term lets. Would you like to view it?');
    setProgress(50);
    await delay(1500);

    // Step 4: User confirms viewing
    await typeText('Tomorrow at 5pm works!', 50);
    await delay(400);
    await addMessage('me', 'Tomorrow at 5pm works!');
    clearTypewriter();
    setProgress(65);
    await delay(1000);

    // Step 5: Landlord confirms
    await showTypingIndicator('them');
    await delay(1000);
    await addMessage('them', 'Booked! See you at 5pm tomorrow. 🎉');
    setProgress(75);
    await delay(1500);

    // Step 6: Pipeline update
    await addMessage('them', '📊 Deal moved to "Viewing" in your pipeline');
    setProgress(90);
    await delay(2000);

    // Step 7: Success
    await addMessage('them', '✅ This is how easy it is to grow your Airbnb portfolio.');
    setProgress(100);
    await delay(3000);

    // Reset
    resetStory();
  }

  function resetStory() {
    storyActive = false;
    hideCursor();

    // Clean up story artifacts
    if (nfsCard1) nfsCard1.classList.remove('highlighted');
    if (inquireBtn1) { inquireBtn1.textContent = 'Inquire Now'; inquireBtn1.style.background = ''; inquireBtn1.style.color = ''; inquireBtn1.style.borderColor = ''; }
    const storyCard = document.getElementById('storyNewCard');
    if (storyCard) storyCard.remove();

    clearMessages();
    startIdleState();
    setTimeout(startAutoCycle, 2000);
  }

  // Click handlers
  if (tooltipEl) tooltipEl.addEventListener('click', runStory);
  if (sendBtn) sendBtn.addEventListener('click', () => { if (!storyActive) runStory(); });

  // ========================================
  // 12. UTILITY
  // ========================================
  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ========================================
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

  // ========================================
  // 15. MOBILE MENU
  // ========================================
  const navBtn = document.querySelector('.nav_button');
  const mobileMenu = document.getElementById('mobileMenu');
  if (navBtn && mobileMenu) {
    navBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  }

  // ========================================
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
