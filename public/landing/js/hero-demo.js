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
    booking:    document.getElementById('previewBooking'),
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
  const cycleOrder = ['deals', 'crm', 'inbox', 'booking'];
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
    setProgress(88);
    await delay(1500);

    // --- STEP 5: BOOKING SITE CUSTOMISATION ---
    switchPreview('booking');
    setProgress(92);
    await delay(600);

    // Animate: change brand name, then colour, then show result
    var bookingLogo = document.getElementById('demoBookingLogo');
    var bookingUrl = document.getElementById('demoBookingUrl');
    var bookingBtn = document.getElementById('demoBookingBtn');
    var bookingPrices = document.querySelectorAll('.demo-booking-price');

    if (bookingLogo) {
      // Step A: Type a brand name
      var brandName = 'Luxe Stays Manchester';
      bookingLogo.textContent = '';
      for (var ci = 0; ci < brandName.length; ci++) {
        bookingLogo.textContent += brandName[ci];
        await delay(40);
      }
      if (bookingUrl) bookingUrl.textContent = 'luxestaysmanchester.nfstay.app';
      await delay(800);

      // Step B: Change accent colour (green → blue → purple → back to green)
      var demoColors = ['#3b82f6', '#8b5cf6', '#10b981'];
      for (var di = 0; di < demoColors.length; di++) {
        var col = demoColors[di];
        if (bookingBtn) bookingBtn.style.background = col;
        bookingPrices.forEach(function(p) { p.style.color = col; });
        await delay(600);
      }
      await delay(800);
    }
    setProgress(96);
    await delay(1000);

    // --- STEP 6: THE PAYOFF ---
    setProgress(100);
    switchPreview('finale');
    await delay(4500);

    // --- RESET ---
    resetStory();
  }

  // ── MOBILE STORY (full-screen panels, one at a time) ──

  function showMobileScreen(html) {
    return new Promise(resolve => {
      // Create overlay inside chat panel (covers earnings banner + messages but keeps tabs + input visible)
      const screen = document.createElement('div');
      screen.className = 'mobile-story-screen';

      // Calculate offsets to keep tabs and input area visible
      const panel = document.querySelector('.chat-panel');
      panel.style.position = 'relative';
      const tabsEl = panel.querySelector('.chat-tabs');
      const inputEl = panel.querySelector('.chat-input-area');
      const topOffset = tabsEl ? tabsEl.offsetHeight + (panel.querySelector('.chat-progress-bar') ? panel.querySelector('.chat-progress-bar').offsetHeight : 0) : 0;
      const bottomOffset = inputEl ? inputEl.offsetHeight : 0;

      screen.style.cssText = 'position:absolute;left:0;right:0;top:' + topOffset + 'px;bottom:' + bottomOffset + 'px;z-index:20;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 20px;opacity:0;transform:scale(0.96);transition:opacity 400ms ease,transform 400ms ease;overflow-y:auto;';
      screen.innerHTML = html;

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

    // Click the button
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
        <div style="border:1px solid #e8e5df;border-radius:16px;background:#fafafa;padding:16px;display:flex;flex-direction:column;gap:10px;flex:1;" id="mobileChatArea">
          <div style="padding:10px;font-size:13px;font-weight:600;color:#1a1a1a;border-bottom:1px solid #f3f4f6;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
            <div style="width:28px;height:28px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="https://i.pravatar.cc/56?img=12" style="width:100%;height:100%;object-fit:cover;" alt=""></div>
            James Thornton <span style="font-size:9px;font-weight:600;color:#1e9a80;background:rgba(30,154,128,0.1);padding:2px 6px;border-radius:100px;margin-left:auto;">2-Bed, Ancoats</span>
          </div>
        </div>
      </div>
    `);
    setProgress(40);

    // Type messages one by one into the chat area
    const chatArea = document.getElementById('mobileChatArea');
    async function addMobileBubble(from, text, delayMs) {
      const bubble = document.createElement('div');
      const isMe = from === 'me';
      bubble.style.cssText = 'max-width:85%;padding:8px 12px;border-radius:12px;font-size:12px;line-height:1.5;opacity:0;transform:translateY(6px);transition:opacity 300ms,transform 300ms;' +
        (isMe ? 'background:#1e9a80;color:#fff;border-bottom-right-radius:4px;align-self:flex-end;margin-left:auto;' : 'background:#fff;border:1px solid #e8e5df;border-bottom-left-radius:4px;color:#1a1a1a;');
      bubble.textContent = text;
      chatArea.appendChild(bubble);
      requestAnimationFrame(() => { bubble.style.opacity = '1'; bubble.style.transform = 'translateY(0)'; });
      playMessageSound();
      await delay(delayMs);
    }

    // Type in the real input area, then show as bubble
    await typeText('Is this available for Airbnb?', 45);
    await delay(300);
    clearTypewriter();
    await addMobileBubble('me', 'Is this available for Airbnb?', 1200);
    setProgress(50);

    // Typing dots
    const dots = document.createElement('div');
    dots.style.cssText = 'display:flex;gap:3px;padding:8px 12px;align-self:flex-start;';
    dots.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:typingBounce 1.4s ease-in-out infinite;"></span><span style="width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:typingBounce 1.4s ease-in-out infinite 0.15s;"></span><span style="width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:typingBounce 1.4s ease-in-out infinite 0.3s;"></span>';
    chatArea.appendChild(dots);
    await delay(1200);
    dots.remove();

    await addMobileBubble('them', 'Yes! Landlord approved. Would you like to arrange a viewing?', 1500);
    setProgress(60);

    await typeText('Tomorrow at 5pm works!', 45);
    await delay(300);
    clearTypewriter();
    await addMobileBubble('me', 'Tomorrow at 5pm works!', 1000);
    setProgress(70);

    const dots2 = dots.cloneNode(true);
    chatArea.appendChild(dots2);
    await delay(1000);
    dots2.remove();

    await addMobileBubble('them', 'Booked! See you at 5pm tomorrow. 🎉', 2000);
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
    setProgress(88);
    await delay(1500);

    // SCREEN 4: Booking site customisation
    hideMobileScreens();
    await delay(500);
    await showMobileScreen(`
      <div style="width:100%;max-width:320px;">
        <div style="font-size:10px;font-weight:600;color:#1e9a80;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;text-align:center;">Your Booking Site</div>
        <div style="border:1px solid #e8e5df;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          <div style="background:#f8f9fa;border-bottom:1px solid rgba(0,0,0,0.06);padding:6px 10px;display:flex;align-items:center;gap:5px;">
            <span style="width:6px;height:6px;border-radius:50%;background:#ff5f57;"></span>
            <span style="width:6px;height:6px;border-radius:50%;background:#ffbd2e;"></span>
            <span style="width:6px;height:6px;border-radius:50%;background:#28c840;"></span>
            <div id="mobileBookingUrl" style="flex:1;background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:5px;padding:3px 8px;font-size:9px;color:#6b7280;margin-left:6px;">yourbrand.nfstay.app</div>
          </div>
          <div style="padding:10px 14px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between;">
            <span id="mobileBookingLogo" style="font-size:13px;font-weight:700;">Your Brand</span>
            <div style="display:flex;gap:10px;font-size:9px;color:#6b7280;"><span>Properties</span><span>Contact</span></div>
          </div>
          <div style="height:100px;background:url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80') center/cover;position:relative;">
            <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.5),transparent);"></div>
            <div style="position:absolute;bottom:8px;left:10px;"><div style="font-size:13px;font-weight:700;color:#fff;">Find Your Perfect Stay</div></div>
          </div>
          <div style="padding:10px 14px;">
            <div style="background:#fff;border:1px solid #f3f4f6;border-radius:6px;padding:6px 10px;display:flex;align-items:center;">
              <span style="font-size:9px;color:#6b7280;flex:1;">Where are you going?</span>
              <button id="mobileBookingSearchBtn" style="padding:4px 12px;border-radius:6px;color:#fff;font-size:9px;font-weight:600;border:none;background:#10b981;">Search</button>
            </div>
          </div>
          <div style="padding:4px 14px 10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
            <div style="border:1px solid #f3f4f6;border-radius:6px;overflow:hidden;"><img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=150&q=80" style="width:100%;height:36px;object-fit:cover;" alt=""><div style="padding:4px;"><span style="font-size:8px;font-weight:600;display:block;">City Apt</span><span class="m-booking-price" style="font-size:8px;font-weight:700;color:#10b981;">&pound;120</span></div></div>
            <div style="border:1px solid #f3f4f6;border-radius:6px;overflow:hidden;"><img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=150&q=80" style="width:100%;height:36px;object-fit:cover;" alt=""><div style="padding:4px;"><span style="font-size:8px;font-weight:600;display:block;">Penthouse</span><span class="m-booking-price" style="font-size:8px;font-weight:700;color:#10b981;">&pound;185</span></div></div>
            <div style="border:1px solid #f3f4f6;border-radius:6px;overflow:hidden;"><img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=150&q=80" style="width:100%;height:36px;object-fit:cover;" alt=""><div style="padding:4px;"><span style="font-size:8px;font-weight:600;display:block;">Studio</span><span class="m-booking-price" style="font-size:8px;font-weight:700;color:#10b981;">&pound;85</span></div></div>
          </div>
        </div>
      </div>
    `);
    setProgress(92);

    // Animate: type brand name + cycle colours
    var mbLogo = document.getElementById('mobileBookingLogo');
    var mbUrl = document.getElementById('mobileBookingUrl');
    var mbBtn = document.getElementById('mobileBookingSearchBtn');
    var mbPrices = document.querySelectorAll('.m-booking-price');
    if (mbLogo) {
      mbLogo.textContent = '';
      var mbName = 'Luxe Stays';
      for (var mi = 0; mi < mbName.length; mi++) {
        mbLogo.textContent += mbName[mi];
        await delay(50);
      }
      if (mbUrl) mbUrl.textContent = 'luxestays.nfstay.app';
      await delay(600);
      var mbColors = ['#3b82f6', '#8b5cf6', '#10b981'];
      for (var mc = 0; mc < mbColors.length; mc++) {
        if (mbBtn) mbBtn.style.background = mbColors[mc];
        mbPrices.forEach(function(p) { p.style.color = mbColors[mc]; });
        await delay(500);
      }
    }
    await delay(1500);

    // SCREEN 5: Finale
    hideMobileScreens();
    await delay(500);
    await showMobileScreen(`
      <div style="text-align:center;padding:24px;">
        <div style="font-size:36px;margin-bottom:12px;">🏡</div>
        <h3 style="font-size:18px;font-weight:700;color:#1a1a1a;line-height:1.3;margin-bottom:8px;">This is how easy it is to grow your Airbnb portfolio.</h3>
        <p style="font-size:13px;color:#6b7280;margin-bottom:16px;">From deal to doorstep — powered by NFsTay</p>
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


});
