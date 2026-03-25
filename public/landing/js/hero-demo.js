/* ============================================
   nfstay Hero — Complete Animation System v3
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
  let userInitiated = false; // true after user clicks — gates typing sound

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
  // 5. TYPEWRITER + TYPING SOUND
  // ========================================
  const IDLE_PLACEHOLDERS = [
    'Ask the landlord about viewings…',
    'Ask the landlord about monthly rent…',
    'Ask the landlord about move-in dates…',
    'Ask the landlord about serviced accommodation terms…',
  ];
  let placeholderIdx = 0;

  // Subtle keyboard click sound via Web Audio API
  const typingSoundCtx = new (window.AudioContext || window.webkitAudioContext)();
  let lastTypeSoundTime = 0;
  function playTypingSound() {
    try {
      const now = typingSoundCtx.currentTime;
      if (now - lastTypeSoundTime < 0.05) return; // throttle to ~60ms
      lastTypeSoundTime = now;
      // Short noise burst to simulate soft key click
      const bufferSize = typingSoundCtx.sampleRate * 0.012; // 12ms
      const buffer = typingSoundCtx.createBuffer(1, bufferSize, typingSoundCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 8);
      }
      const source = typingSoundCtx.createBufferSource();
      source.buffer = buffer;
      const gain = typingSoundCtx.createGain();
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      const filter = typingSoundCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(typingSoundCtx.destination);
      source.start(now);
      source.stop(now + 0.015);
    } catch (e) { /* silent fallback */ }
  }

  function typeText(text, speed = 40) {
    return new Promise(resolve => {
      if (typewriterInterval) clearInterval(typewriterInterval);
      typewriterEl.textContent = '';
      cursorEl.style.display = 'inline';
      let i = 0;
      typewriterInterval = setInterval(() => {
        if (i < text.length) {
          typewriterEl.textContent = text.slice(0, i + 1);
          if (userInitiated) playTypingSound();
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
  // 8b. CLICK RIPPLE EFFECT
  // ========================================
  function createClickRipple(targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const containerRect = demoComponent.getBoundingClientRect();
    const cx = rect.left - containerRect.left + rect.width / 2;
    const cy = rect.top - containerRect.top + rect.height / 2;

    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('div');
      ring.style.cssText = `
        position:absolute; left:${cx}px; top:${cy}px;
        width:0; height:0; border-radius:50%;
        border:2px solid #1E9A80;
        pointer-events:none; z-index:100;
        transform:translate(-50%,-50%);
        opacity:0.6;
      `;
      demoComponent.appendChild(ring);
      gsap.to(ring, {
        width: 80 + i * 30,
        height: 80 + i * 30,
        opacity: 0,
        duration: 0.8,
        delay: i * 0.15,
        ease: 'power2.out',
        onComplete: () => ring.remove(),
      });
    }
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
    // Stop the pulse rings on send button — user already clicked
    document.querySelectorAll('.send-pulse-ring').forEach(el => { el.style.animation = 'none'; el.style.opacity = '0'; });
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

    // --- DESKTOP STEP 2: CLICK "INQUIRE NOW" with ripple (4-7s) ---
    if (inquireBtn1) {
      await clickCursorOn(inquireBtn1);
      // Ripple effect on button
      createClickRipple(inquireBtn1);
      inquireBtn1.textContent = '✓ Inquiry Sent';
      inquireBtn1.style.background = '#1e9a80';
      inquireBtn1.style.color = 'white';
      inquireBtn1.style.borderColor = '#1e9a80';
    }
    setProgress(30);
    await delay(1500);

    hideCursor();

    // --- DESKTOP STEP 3: START CHATTING (8 messages) ---
    switchPreview('inbox');
    setProgress(35);
    await delay(800);

    // 1. Them: inquiry
    await showTypingIndicator('them');
    await delay(1200);
    await addMessage('them', 'Hi! I saw the 2-bed in Ancoats. Is it available for Airbnb?');
    setProgress(40);
    await delay(1200);

    // 2. Me: response
    await typeText('Yes! Landlord approved. Rent £850, est. profit £1,200/mo.', 45);
    await delay(300);
    await addMessage('me', 'Yes! Landlord approved. Rent £850, est. profit £1,200/mo.');
    clearTypewriter();
    setProgress(45);
    await delay(1200);

    // 3. Them: viewing question
    await showTypingIndicator('them');
    await delay(1200);
    await addMessage('them', 'That sounds great. When can I arrange a viewing?');
    setProgress(50);
    await delay(1000);

    // 4. Me: offer dates
    await typeText('Thursday or Friday - which works for you?', 45);
    await delay(300);
    await addMessage('me', 'Thursday or Friday - which works for you?');
    clearTypewriter();
    setProgress(55);
    await delay(1000);

    // 5. Them: pick time
    await showTypingIndicator('them');
    await delay(1000);
    await addMessage('them', 'Tomorrow 5pm works for me, perfect!');
    setProgress(60);
    await delay(1000);

    // 6. Me: confirm
    await typeText('Tomorrow 5pm confirmed, right?', 45);
    await delay(300);
    await addMessage('me', 'Tomorrow 5pm confirmed, right?');
    clearTypewriter();
    setProgress(65);
    await delay(1000);

    // 7. Them: WhatsApp request
    await showTypingIndicator('them');
    await delay(1400);
    await addMessage('them', 'Yes! Please can you just send me a message on my WhatsApp and I will share the address.');
    setProgress(72);
    await delay(1200);

    // 8. Me: closing
    await typeText('Okay, thank you, I\'ll text you now.', 45);
    await delay(300);
    await addMessage('me', 'Okay, thank you, I\'ll text you now.');
    clearTypewriter();
    setProgress(80);
    await delay(1500);

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

  // ── MOBILE STORY (full-screen panels, one at a time) ──

  function showMobileScreen(html) {
    return new Promise(resolve => {
      // Create overlay inside chat panel (covers earnings banner + messages)
      const screen = document.createElement('div');
      screen.className = 'mobile-story-screen';
      screen.style.cssText = 'position:absolute;inset:0;z-index:20;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 20px;opacity:0;transform:scale(0.96);transition:opacity 400ms ease,transform 400ms ease;overflow-y:auto;';
      screen.innerHTML = html;

      const panel = document.querySelector('.chat-panel');
      panel.style.position = 'relative';
      panel.appendChild(screen);

      // Animate in
      requestAnimationFrame(() => {
        screen.style.opacity = '1';
        screen.style.transform = 'scale(1)';
      });

      setTimeout(resolve, 500);
    });
  }

  function hideMobileScreens() {
    document.querySelectorAll('.mobile-story-screen').forEach(s => {
      s.style.opacity = '0';
      s.style.transform = 'scale(0.96)';
      setTimeout(() => s.remove(), 400);
    });
  }

  async function runMobileStory() {
    setProgress(10);

    // SCREEN 1: Show one deal card (stretched, with mouse cursor)
    await showMobileScreen(`
      <div style="width:100%;max-width:320px;position:relative;">
        <div style="font-size:10px;font-weight:600;color:#1e9a80;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;text-align:center;">Deal Found</div>
        <div style="border:1px solid #e8e5df;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          <div style="height:160px;background:url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=240&fit=crop') center/cover;position:relative;">
            <span style="position:absolute;top:10px;left:10px;background:#fff;font-size:10px;font-weight:600;padding:3px 10px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.1);">Featured</span>
          </div>
          <div style="padding:18px;">
            <div style="font-size:16px;font-weight:700;color:#1a1a1a;">2-Bed Flat, Ancoats</div>
            <div style="font-size:12px;color:#6b7280;margin-top:3px;">Manchester &middot; M4 6BF</div>
            <div style="display:flex;justify-content:space-between;margin-top:14px;padding-top:10px;border-top:1px solid #f3f4f6;">
              <div><div style="font-size:11px;color:#6b7280;">Monthly rent</div><div style="font-size:14px;font-weight:600;color:#1a1a1a;">&pound;850</div></div>
              <div style="text-align:right;"><div style="font-size:11px;color:#6b7280;">Est. profit</div><div style="font-size:14px;font-weight:700;color:#1e9a80;">&pound;1,200/mo</div></div>
            </div>
            <div id="mobileInquireBtn" style="margin-top:16px;width:100%;height:42px;border-radius:10px;background:#1e9a80;color:#fff;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;">Inquire Now</div>
          </div>
        </div>
        <!-- Mobile cursor -->
        <div id="mobileCursor" style="position:absolute;bottom:120px;right:40px;z-index:30;opacity:0;transition:all 1s cubic-bezier(0.22,1,0.36,1);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86h8.14a.5.5 0 00.35-.85L5.85 2.86a.5.5 0 00-.35.35z" fill="#1a1a1a" stroke="#fff" stroke-width="1"/></svg>
        </div>
      </div>
    `);
    setProgress(20);
    await delay(1000);

    // Show cursor and move it toward "Inquire Now" button
    const mobileCur = document.getElementById('mobileCursor');
    if (mobileCur) {
      mobileCur.style.opacity = '1';
      await delay(500);
      // Move cursor to the button
      mobileCur.style.bottom = '28px';
      mobileCur.style.right = '50%';
      mobileCur.style.transform = 'translateX(50%)';
      await delay(1200);
    }

    // Click the button with ripple
    const mBtn = document.getElementById('mobileInquireBtn');
    if (mBtn) {
      // Cursor click animation
      if (mobileCur) { mobileCur.style.transform = 'translateX(50%) scale(0.8)'; }
      mBtn.style.transform = 'scale(0.95)';
      mBtn.style.boxShadow = '0 0 0 3px rgba(30,154,128,0.3)';
      await delay(200);
      if (mobileCur) { mobileCur.style.transform = 'translateX(50%) scale(1)'; }
      mBtn.textContent = 'Inquiry Sent';
      mBtn.style.background = '#178f72';
      mBtn.style.transform = 'scale(1)';
      playMessageSound();
    }
    setProgress(30);
    await delay(1500);

    // SCREEN 2: Chat conversation (stretched)
    hideMobileScreens();
    await delay(500);
    await showMobileScreen(`
      <div style="width:100%;max-width:320px;height:100%;display:flex;flex-direction:column;">
        <div style="font-size:10px;font-weight:600;color:#1e9a80;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;text-align:center;">Conversation</div>
        <div style="border:1px solid #e8e5df;border-radius:16px;background:#fafafa;padding:16px;display:flex;flex-direction:column;gap:10px;flex:1;overflow-y:auto;" id="mobileChatArea">
          <div style="padding:10px;font-size:13px;font-weight:600;color:#1a1a1a;border-bottom:1px solid #f3f4f6;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
            <div style="width:28px;height:28px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="https://i.pravatar.cc/56?img=12" style="width:100%;height:100%;object-fit:cover;" alt=""></div>
            James Thornton <span style="font-size:9px;font-weight:600;color:#1e9a80;background:rgba(30,154,128,0.1);padding:2px 6px;border-radius:100px;margin-left:auto;">2-Bed, Ancoats</span>
          </div>
        </div>
      </div>
    `);
    setProgress(35);

    // Type messages one by one into the chat area
    const chatArea = document.getElementById('mobileChatArea');
    function makeMobileDots() {
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:3px;padding:8px 12px;align-self:flex-start;';
      d.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:typingBounce 1.4s ease-in-out infinite;"></span><span style="width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:typingBounce 1.4s ease-in-out infinite 0.15s;"></span><span style="width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:typingBounce 1.4s ease-in-out infinite 0.3s;"></span>';
      return d;
    }
    async function addMobileBubble(from, text, delayMs) {
      const bubble = document.createElement('div');
      const isMe = from === 'me';
      bubble.style.cssText = 'max-width:85%;padding:8px 12px;border-radius:12px;font-size:12px;line-height:1.5;opacity:0;transform:translateY(6px);transition:opacity 300ms,transform 300ms;' +
        (isMe ? 'background:#1e9a80;color:#fff;border-bottom-right-radius:4px;align-self:flex-end;margin-left:auto;' : 'background:#fff;border:1px solid #e8e5df;border-bottom-left-radius:4px;color:#1a1a1a;');
      bubble.textContent = text;
      chatArea.appendChild(bubble);
      chatArea.scrollTop = chatArea.scrollHeight;
      requestAnimationFrame(() => { bubble.style.opacity = '1'; bubble.style.transform = 'translateY(0)'; });
      playMessageSound();
      await delay(delayMs);
    }

    // 1. Them
    let dots = makeMobileDots(); chatArea.appendChild(dots); await delay(1000); dots.remove();
    await addMobileBubble('them', 'Hi! I saw the 2-bed in Ancoats. Is it available for Airbnb?', 1000);
    setProgress(40);

    // 2. Me
    await addMobileBubble('me', 'Yes! Landlord approved. Rent £850, est. profit £1,200/mo.', 1000);
    setProgress(45);

    // 3. Them
    dots = makeMobileDots(); chatArea.appendChild(dots); await delay(1000); dots.remove();
    await addMobileBubble('them', 'That sounds great. When can I arrange a viewing?', 1000);
    setProgress(50);

    // 4. Me
    await addMobileBubble('me', 'Thursday or Friday - which works for you?', 800);
    setProgress(55);

    // 5. Them
    dots = makeMobileDots(); chatArea.appendChild(dots); await delay(800); dots.remove();
    await addMobileBubble('them', 'Tomorrow 5pm works for me, perfect!', 800);
    setProgress(60);

    // 6. Me
    await addMobileBubble('me', 'Tomorrow 5pm confirmed, right?', 800);
    setProgress(65);

    // 7. Them
    dots = makeMobileDots(); chatArea.appendChild(dots); await delay(1000); dots.remove();
    await addMobileBubble('them', 'Yes! Please can you just send me a message on my WhatsApp and I will share the address.', 1000);
    setProgress(72);

    // 8. Me
    await addMobileBubble('me', 'Okay, thank you, I\'ll text you now.', 1500);
    setProgress(80);

    // SCREEN 3: Full-screen pipeline with deals + drag animation
    hideMobileScreens();
    await delay(500);
    await showMobileScreen(`
      <div style="width:100%;height:100%;display:flex;flex-direction:column;">
        <div style="font-size:10px;font-weight:600;color:#1e9a80;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;text-align:center;">Your Pipeline</div>
        <div id="mobilePipeScroll" style="flex:1;display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;scroll-behavior:smooth;">
          <div style="min-width:200px;flex-shrink:0;background:#f8f9fa;border-radius:12px;padding:10px;">
            <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:#3b82f6;"></span>Spotted <span style="margin-left:auto;background:#fff;padding:1px 6px;border-radius:6px;font-size:9px;border:1px solid #e5e7eb;">3</span></div>
            <div style="background:#fff;border:1px solid #e8e5df;border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #3b82f6;"><strong style="font-size:12px;display:block;">2-Bed, Salford</strong><span style="font-size:10px;color:#6b7280;">Manchester &middot; &pound;820/mo</span><div style="font-size:10px;color:#1e9a80;font-weight:600;margin-top:3px;">+&pound;1,050/mo</div></div>
            <div style="background:#fff;border:1px solid #e8e5df;border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #3b82f6;"><strong style="font-size:12px;display:block;">1-Bed, Hulme</strong><span style="font-size:10px;color:#6b7280;">Manchester &middot; &pound;700/mo</span><div style="font-size:10px;color:#1e9a80;font-weight:600;margin-top:3px;">+&pound;890/mo</div></div>
            <div id="mobileDragCard" style="background:#fff;border:1px solid #1e9a80;border-radius:8px;padding:10px;border-left:3px solid #1e9a80;box-shadow:0 0 0 3px rgba(30,154,128,0.12);transition:all 600ms cubic-bezier(0.22,1,0.36,1);"><strong style="font-size:12px;display:block;color:#1a1a1a;">2-Bed, Ancoats</strong><span style="font-size:10px;color:#6b7280;">Manchester &middot; &pound;850/mo</span><div style="font-size:10px;color:#1e9a80;font-weight:600;margin-top:3px;">+&pound;1,200/mo</div></div>
          </div>
          <div style="min-width:200px;flex-shrink:0;background:#f8f9fa;border-radius:12px;padding:10px;">
            <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:#f59e0b;"></span>Shortlisted <span style="margin-left:auto;background:#fff;padding:1px 6px;border-radius:6px;font-size:9px;border:1px solid #e5e7eb;">2</span></div>
            <div style="background:#fff;border:1px solid #e8e5df;border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #f59e0b;"><strong style="font-size:12px;display:block;">3-Bed, Headingley</strong><span style="font-size:10px;color:#6b7280;">Leeds &middot; &pound;950/mo</span><div style="font-size:10px;color:#1e9a80;font-weight:600;margin-top:3px;">+&pound;1,400/mo</div></div>
            <div style="background:#fff;border:1px solid #e8e5df;border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #f59e0b;"><strong style="font-size:12px;display:block;">1-Bed, Leith</strong><span style="font-size:10px;color:#6b7280;">Edinburgh &middot; &pound;750/mo</span><div style="font-size:10px;color:#1e9a80;font-weight:600;margin-top:3px;">+&pound;1,020/mo</div></div>
          </div>
          <div id="mobilePipeViewingCol" style="min-width:200px;flex-shrink:0;background:#f8f9fa;border-radius:12px;padding:10px;">
            <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:#8b5cf6;"></span>Viewing <span style="margin-left:auto;background:#fff;padding:1px 6px;border-radius:6px;font-size:9px;border:1px solid #e5e7eb;">2</span></div>
            <div style="background:#fff;border:1px solid #e8e5df;border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #8b5cf6;"><strong style="font-size:12px;display:block;">2-Bed, Digbeth</strong><span style="font-size:10px;color:#6b7280;">Birmingham &middot; &pound;780/mo</span><div style="font-size:10px;color:#1e9a80;font-weight:600;margin-top:3px;">+&pound;1,100/mo</div></div>
            <div style="background:#fff;border:1px solid #e8e5df;border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #8b5cf6;"><strong style="font-size:12px;display:block;">3-Bed, Clifton</strong><span style="font-size:10px;color:#6b7280;">Bristol &middot; &pound;1,100/mo</span><div style="font-size:10px;color:#1e9a80;font-weight:600;margin-top:3px;">+&pound;1,650/mo</div></div>
          </div>
          <div style="min-width:200px;flex-shrink:0;background:#f8f9fa;border-radius:12px;padding:10px;">
            <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:#1e9a80;"></span>Signed <span style="margin-left:auto;background:#fff;padding:1px 6px;border-radius:6px;font-size:9px;border:1px solid #e5e7eb;">1</span></div>
            <div style="background:#fff;border:1px solid #e8e5df;border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #1e9a80;"><strong style="font-size:12px;display:block;">1-Bed, Shoreditch</strong><span style="font-size:10px;color:#6b7280;">London &middot; &pound;1,350/mo</span><div style="font-size:10px;color:#1e9a80;font-weight:600;margin-top:3px;">+&pound;1,900/mo</div></div>
          </div>
        </div>
      </div>
    `);
    setProgress(85);
    await delay(1000);

    // Animate: lift the deal card, scroll pipeline right, drop into Viewing column
    const dragCard = document.getElementById('mobileDragCard');
    const pipeScroll = document.getElementById('mobilePipeScroll');
    const viewingCol = document.getElementById('mobilePipeViewingCol');

    if (dragCard && pipeScroll) {
      // Lift card
      dragCard.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
      dragCard.style.transform = 'scale(1.05)';
      dragCard.style.background = '#f0fdf4';
      await delay(600);

      // Scroll pipeline to the right smoothly
      pipeScroll.scrollTo({ left: 200, behavior: 'smooth' });
      await delay(800);

      // Move card out (fade)
      dragCard.style.opacity = '0';
      dragCard.style.transform = 'scale(0.9) translateX(40px)';
      await delay(400);
      dragCard.remove();

      // Scroll to viewing column
      pipeScroll.scrollTo({ left: 400, behavior: 'smooth' });
      await delay(600);

      // Add card to Viewing column
      if (viewingCol) {
        const newCard = document.createElement('div');
        newCard.style.cssText = 'background:#fff;border:1px solid #1e9a80;border-radius:8px;padding:10px;border-left:3px solid #1e9a80;box-shadow:0 0 0 3px rgba(30,154,128,0.15);opacity:0;transform:translateY(-10px);transition:all 400ms cubic-bezier(0.22,1,0.36,1);';
        newCard.innerHTML = '<strong style="font-size:12px;display:block;color:#1a1a1a;">2-Bed, Ancoats</strong><span style="font-size:10px;color:#6b7280;">Manchester &middot; &pound;850/mo</span><div style="font-size:10px;color:#1e9a80;font-weight:600;margin-top:3px;">+&pound;1,200/mo</div>';
        viewingCol.appendChild(newCard);
        playMessageSound();
        await delay(100);
        newCard.style.opacity = '1';
        newCard.style.transform = 'translateY(0)';
      }
    }
    setProgress(92);
    await delay(2500);

    // SCREEN 4: Finale
    hideMobileScreens();
    await delay(500);
    await showMobileScreen(`
      <div style="text-align:center;padding:24px;">
        <div style="font-size:36px;margin-bottom:12px;">🏡</div>
        <h3 style="font-size:18px;font-weight:700;color:#1a1a1a;line-height:1.3;margin-bottom:8px;">This is how easy it is to grow your Airbnb portfolio.</h3>
        <p style="font-size:13px;color:#6b7280;margin-bottom:16px;">From deal to doorstep — powered by nfstay</p>
        <a href="/signup" style="display:inline-block;padding:10px 24px;border-radius:10px;background:#1e9a80;color:#fff;font-size:13px;font-weight:600;text-decoration:none;">Get Started</a>
      </div>
    `);
    setProgress(100);
    await delay(4000);

    // Reset
    hideMobileScreens();
    resetStory();
  }

  function resetStory() {
    storyActive = false;
    userInitiated = false;
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

  // Click handlers — set userInitiated so typing sound only plays on manual interaction
  if (tooltipEl) tooltipEl.addEventListener('click', () => { userInitiated = true; runStory(); });
  if (sendBtn) sendBtn.addEventListener('click', () => { if (!storyActive) { userInitiated = true; runStory(); } });

  // ========================================
  // 12. UTILITY
  // ========================================
  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }


});
