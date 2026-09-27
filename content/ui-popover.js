/**
 * UIPopover - Isolated Shadow DOM Floating Trigger and Inline Translation Card
 */

window.UIPopover = (function () {
  let hostEl = null;
  let shadowRoot = null;
  let triggerBtn = null;
  let cardEl = null;

  // Stored state for current active translation
  let activeSelectionRange = null;
  let originalSelectedText = '';
  let currentTranslatedText = '';
  let currentSourceLang = 'en';
  let currentTargetLang = 'bn';
  let isReplacedInPage = false;
  let replacedOriginalNode = null;
  let replacedNewNode = null;

  // Settings & Preferences
  let uiSettings = {
    enableTts: false,
    fontSize: 'medium'
  };

  // Dragging State
  let isDraggingCard = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let cardInitialLeft = 0;
  let cardInitialTop = 0;

  // Sync settings directly from storage
  if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
    chrome.storage.sync.get('settings', (res) => {
      if (res && res.settings) {
        updateSettings(res.settings);
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.settings?.newValue) {
        updateSettings(changes.settings.newValue);
      }
    });
  }

  // Audio & TTS State
  let currentAudio = null;
  let isAudioPlaying = false;
  let audioPlaySessionId = 0;
  const audioCache = new Map();

  // Callbacks
  let onTriggerClick = null;

  /**
   * Initializes the Shadow DOM container on the page.
   */
  function init(options = {}) {
    if (hostEl) return;

    onTriggerClick = options.onTriggerClick || null;

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          try { window.speechSynthesis.getVoices(); } catch (e) {}
        };
      } catch (e) {}
    }

    hostEl = document.createElement('div');
    hostEl.id = 'bangla-translator-host';
    hostEl.style.cssText =
      'all: initial; position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';
    document.documentElement.appendChild(hostEl);

    shadowRoot = hostEl.attachShadow({ mode: 'closed' });

    // Inject styles & template
    shadowRoot.innerHTML = `
      <style>
        :host {
          --bt-font: 'SolaimanLipi', 'Kalpurush', 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --bt-bg: rgba(255, 255, 255, 0.98);
          --bt-border: #e2e8f0;
          --bt-text: #0f172a;
          --bt-text-muted: #64748b;
          --bt-primary: #2563eb;
          --bt-primary-hover: #1d4ed8;
          --bt-accent: #10b981;
          --bt-code-bg: #f1f5f9;
          --bt-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        @media (prefers-color-scheme: dark) {
          :host {
            --bt-bg: rgba(15, 23, 42, 0.96);
            --bt-border: #334155;
            --bt-text: #f8fafc;
            --bt-text-muted: #94a3b8;
            --bt-primary: #3b82f6;
            --bt-primary-hover: #60a5fa;
            --bt-accent: #34d399;
            --bt-code-bg: #1e293b;
            --bt-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
          }
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Floating Trigger Button */
        .bt-trigger-btn {
          position: absolute;
          display: none;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: var(--bt-primary);
          color: #ffffff;
          padding: 5px 10px;
          border-radius: 20px;
          font-family: var(--bt-font);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
          pointer-events: auto;
          transition: transform 0.15s ease, background 0.15s ease;
          user-select: none;
          z-index: 2147483647;
          animation: btFadeIn 0.15s ease-out;
        }

        .bt-trigger-btn:hover {
          background: var(--bt-primary-hover);
          transform: translateY(-1px) scale(1.04);
        }

        .bt-trigger-btn svg {
          width: 14px;
          height: 14px;
          fill: currentColor;
        }

        /* Translation Popover Card */
        .bt-card {
          position: absolute;
          display: none;
          flex-direction: column;
          width: 460px;
          max-width: calc(100vw - 32px);
          background: var(--bt-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--bt-border);
          border-radius: 12px;
          box-shadow: var(--bt-shadow);
          font-family: var(--bt-font);
          color: var(--bt-text);
          pointer-events: auto;
          z-index: 2147483647;
          animation: btPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        /* Card Header */
        .bt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.02);
          border-bottom: 1px solid var(--bt-border);
          font-size: 11px;
          color: var(--bt-text-muted);
          user-select: none;
          cursor: grab;
        }

        .bt-header:active {
          cursor: grabbing;
        }

        .bt-drag-icon {
          opacity: 0.4;
          margin-right: 2px;
          flex-shrink: 0;
          transition: opacity 0.15s ease;
        }

        .bt-header:hover .bt-drag-icon {
          opacity: 0.85;
        }

        .bt-card.is-dragging {
          user-select: none !important;
          opacity: 0.94;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.25) !important;
          transition: none !important;
          animation: none !important;
        }

        .bt-card.is-dragging .bt-header {
          cursor: grabbing;
        }

        .bt-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }

        .bt-engine-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          background: rgba(37, 99, 235, 0.1);
          color: var(--bt-primary);
        }

        .bt-engine-badge.native {
          background: rgba(16, 185, 129, 0.12);
          color: var(--bt-accent);
        }

        .bt-close-btn {
          background: transparent;
          border: none;
          color: var(--bt-text-muted);
          cursor: pointer;
          font-size: 14px;
          padding: 2px 4px;
          border-radius: 4px;
          line-height: 1;
        }

        .bt-close-btn:hover {
          color: var(--bt-text);
          background: rgba(0, 0, 0, 0.06);
        }

        /* Progress Bar for model downloads */
        .bt-progress-container {
          display: none;
          height: 3px;
          width: 100%;
          background: var(--bt-border);
          overflow: hidden;
        }

        .bt-progress-bar {
          height: 100%;
          width: 0%;
          background: var(--bt-accent);
          transition: width 0.2s ease;
        }

        /* Content Area */
        .bt-body {
          padding: 14px 16px;
          max-height: 360px;
          overflow-y: auto;
          font-size: 14px;
          line-height: 1.7;
          letter-spacing: 0.15px;
          word-break: break-word;
          white-space: pre-line;
        }

        .bt-para {
          margin-bottom: 12px;
          line-height: 1.7;
          white-space: pre-line;
        }

        .bt-para:last-child {
          margin-bottom: 0;
        }

        .bt-list {
          margin: 6px 0 12px 20px;
          padding: 0;
          list-style-type: disc;
        }

        .bt-list li {
          margin-bottom: 4px;
          line-height: 1.6;
        }

        .bt-list:last-child {
          margin-bottom: 0;
        }

        .bt-loading-skeleton {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 4px 0;
        }

        .bt-skeleton-line {
          height: 14px;
          background: linear-gradient(90deg, var(--bt-border) 25%, rgba(150,150,150,0.15) 50%, var(--bt-border) 75%);
          background-size: 200% 100%;
          animation: btShimmer 1.5s infinite;
          border-radius: 4px;
        }

        .bt-skeleton-line.short {
          width: 60%;
        }

        /* Action Toolbar */
        .bt-toolbar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-top: 1px solid var(--bt-border);
          background: rgba(0, 0, 0, 0.02);
          user-select: none;
          flex-wrap: wrap;
        }

        .bt-tool-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: 1px solid var(--bt-border);
          color: var(--bt-text-muted);
          padding: 4px 8px;
          border-radius: 6px;
          font-family: var(--bt-font);
          font-size: 11.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .bt-tool-btn:hover {
          color: var(--bt-text);
          background: rgba(0, 0, 0, 0.04);
          border-color: var(--bt-text-muted);
        }

        .bt-tool-btn.active {
          color: var(--bt-primary);
          border-color: var(--bt-primary);
          background: rgba(37, 99, 235, 0.08);
        }

        .bt-tool-btn.speaking {
          color: #ffffff !important;
          background: #ef4444 !important;
          border-color: #ef4444 !important;
          animation: btPulse 1.5s infinite;
        }

        @keyframes btPulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .bt-tool-btn svg {
          width: 12px;
          height: 12px;
          fill: currentColor;
        }

        .bt-toast {
          margin-left: auto;
          font-size: 11px;
          color: var(--bt-accent);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .bt-toast.show {
          opacity: 1;
        }

        @keyframes btPopIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes btFadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes btShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>

      <!-- Floating Trigger Button -->
      <button class="bt-trigger-btn" id="bt-trigger" title="বাংলায় অনুবাদ দেখুন">
        <svg viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
        <span id="bt-trigger-text">বাংলা</span>
      </button>

      <!-- Popover Card -->
      <div class="bt-card" id="bt-card">
        <div class="bt-header" title="টেনে যেকোনো জায়গায় সরান (Drag to move)">
          <div class="bt-header-left">
            <svg class="bt-drag-icon" viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
            <span id="bt-lang-direction">English ➔ বাংলা</span>
            <span class="bt-engine-badge" id="bt-engine">⚡ AI</span>
          </div>
          <button class="bt-close-btn" id="bt-close" title="বন্ধ করুন">✕</button>
        </div>

        <div class="bt-progress-container" id="bt-progress-box">
          <div class="bt-progress-bar" id="bt-progress-bar"></div>
        </div>

        <div class="bt-body" id="bt-content">
          <div class="bt-loading-skeleton">
            <div class="bt-skeleton-line"></div>
            <div class="bt-skeleton-line"></div>
            <div class="bt-skeleton-line short"></div>
          </div>
        </div>

        <div class="bt-toolbar">
          <button class="bt-tool-btn" id="bt-copy" title="অনুবাদ কপি করুন">
            <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            <span>কপি</span>
          </button>

          <button class="bt-tool-btn" id="bt-speak" title="অনুবাদ শুনুন" style="display: none;">
            <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            <span>শুনুন</span>
          </button>

          <button class="bt-tool-btn" id="bt-replace" title="পৃষ্ঠায় টেক্সট প্রতিস্থাপন করুন">
            <span>⇄ প্রতিস্থাপন</span>
          </button>

          <span class="bt-toast" id="bt-toast"></span>
        </div>
      </div>
    `;

    triggerBtn = shadowRoot.getElementById('bt-trigger');
    cardEl = shadowRoot.getElementById('bt-card');

    bindEvents();
  }

  function bindEvents() {
    initDraggable();
    applySettingsToUI();

    // Trigger button click
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerBtn.style.display = 'none';
      if (typeof onTriggerClick === 'function') {
        onTriggerClick(originalSelectedText, activeSelectionRange);
      }
    });

    // Close button click
    shadowRoot.getElementById('bt-close').addEventListener('click', (e) => {
      e.stopPropagation();
      hideAll();
    });

    // Copy button
    shadowRoot.getElementById('bt-copy').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!currentTranslatedText) return;

      const isEn = currentTargetLang === 'en';
      try {
        await navigator.clipboard.writeText(currentTranslatedText);
        showToast(isEn ? 'Copied!' : 'কপি হয়েছে!');
      } catch (err) {
        showToast(isEn ? 'Copy failed' : 'কপি ব্যর্থ');
      }
    });

    // Listen / Speak button (Natural Voice TTS)
    shadowRoot.getElementById('bt-speak').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!currentTranslatedText) return;
      playNaturalTTS(currentTranslatedText, currentTargetLang);
    });

    // Replace in page toggle
    shadowRoot.getElementById('bt-replace').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleReplaceInPage();
    });
  }

  /**
   * Initializes mouse drag handling on the card header so users can freely reposition the card.
   */
  function initDraggable() {
    const headerEl = shadowRoot.querySelector('.bt-header');
    if (!headerEl || !cardEl) return;

    headerEl.addEventListener('mousedown', (e) => {
      // Don't drag if clicking close button or not primary mouse button
      if (e.button !== 0 || e.target.closest('#bt-close')) return;

      isDraggingCard = true;
      cardEl.classList.add('is-dragging');

      dragStartX = e.clientX;
      dragStartY = e.clientY;

      const rect = cardEl.getBoundingClientRect();
      cardInitialLeft = rect.left + window.scrollX;
      cardInitialTop = rect.top + window.scrollY;

      e.preventDefault();

      function onMouseMove(ev) {
        if (!isDraggingCard) return;
        const dx = ev.clientX - dragStartX;
        const dy = ev.clientY - dragStartY;

        let newLeft = cardInitialLeft + dx;
        let newTop = cardInitialTop + dy;

        // Keep within viewport boundaries
        const minLeft = window.scrollX + 8;
        const maxLeft = window.scrollX + window.innerWidth - cardEl.offsetWidth - 8;
        const minTop = window.scrollY + 8;

        newLeft = Math.max(minLeft, Math.min(newLeft, Math.max(minLeft, maxLeft)));
        newTop = Math.max(minTop, newTop);

        cardEl.style.left = `${newLeft}px`;
        cardEl.style.top = `${newTop}px`;
      }

      function onMouseUp() {
        if (!isDraggingCard) return;
        cardEl.classList.remove('is-dragging');
        // Keep flag briefly true so document-level mouseup won't trigger re-selection
        setTimeout(() => {
          isDraggingCard = false;
        }, 80);

        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  /**
   * Updates user settings for the UI popover and reflects changes immediately.
   */
  function updateSettings(newSettings) {
    if (!newSettings) return;
    uiSettings = { ...uiSettings, ...newSettings };
    applySettingsToUI();
  }

  /**
   * Applies current settings (such as TTS button visibility & font size) to the UI.
   */
  function applySettingsToUI() {
    if (!shadowRoot) return;
    const speakBtn = shadowRoot.getElementById('bt-speak');
    if (speakBtn) {
      speakBtn.style.display = uiSettings.enableTts ? 'inline-flex' : 'none';
    }
    const contentBox = shadowRoot.getElementById('bt-content');
    if (contentBox && uiSettings.fontSize) {
      if (uiSettings.fontSize === 'small') {
        contentBox.style.fontSize = '12.5px';
      } else if (uiSettings.fontSize === 'large') {
        contentBox.style.fontSize = '16px';
      } else {
        contentBox.style.fontSize = '14px';
      }
    }
  }

  /**
   * Prepares text for speech:
   * Replaces English abbreviations and technical terms with natural Bengali phonemes
   * so the neural voice speaks them naturally like an experienced bilingual speaker.
   */
  function prepareTextForSpeech(text, lang = 'bn') {
    if (!text) return '';
    if (lang === 'en') {
      return text
        .replace(/[`*#_~<>[\]()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return text
      // Frameworks & tech brands (avoid dots like Next.js causing long robotic pauses)
      .replace(/Next\.js/gi, 'নেক্সট জেএস')
      .replace(/Node\.js/gi, 'নোড জেএস')
      .replace(/Vue\.js/gi, 'ভিউ জেএস')
      .replace(/React/gi, 'রিঅ্যাক্ট')
      .replace(/full-stack web applications/gi, 'ফুল স্ট্যাক ওয়েব অ্যাপ্লিকেশন')
      .replace(/full-stack/gi, 'ফুল স্ট্যাক')
      .replace(/web applications/gi, 'ওয়েব অ্যাপ্লিকেশন')
      .replace(/React [cC]omponents/gi, 'রিঅ্যাক্ট কম্পোনেন্টস')
      .replace(/optimizations/gi, 'অপ্টিমাইজেশন')
      .replace(/optimization/gi, 'অপ্টিমাইজেশন')
      .replace(/user interfaces/gi, 'ইউজার ইন্টারফেস')
      .replace(/user interface/gi, 'ইউজার ইন্টারফেস')
      .replace(/lower-level tools/gi, 'লো-লেভেল টুলস')
      .replace(/low-level tools/gi, 'লো-লেভেল টুলস')
      .replace(/bundlers and compilers/gi, 'বান্ডলার এবং কম্পাইলার')
      .replace(/bundlers/gi, 'বান্ডলারস')
      .replace(/bundler/gi, 'বান্ডলার')
      .replace(/compilers/gi, 'কম্পাইলারস')
      .replace(/compiler/gi, 'কম্পাইলার')
      .replace(/individual developer/gi, 'একক ডেভেলপার')
      .replace(/developer/gi, 'ডেভেলপার')
      .replace(/developers/gi, 'ডেভেলপাররা')
      .replace(/applications/gi, 'অ্যাপ্লিকেশন')
      .replace(/application/gi, 'অ্যাপ্লিকেশন')
      .replace(/components/gi, 'কম্পোনেন্টস')
      .replace(/component/gi, 'কম্পোনেন্ট')
      .replace(/tools/gi, 'টুলস')
      .replace(/tool/gi, 'টুল')
      .replace(/frontend/gi, 'ফ্রন্টএন্ড')
      .replace(/backend/gi, 'ব্যাকএন্ড')
      .replace(/API/g, 'এপিআই')
      .replace(/SDK/g, 'এসডিকে')
      .replace(/CLI/g, 'সিএলআই')
      .replace(/HTML/g, 'এইচটিএমএল')
      .replace(/CSS/g, 'সিএসএস')
      .replace(/DOM/g, 'ডম')
      .replace(/JSON/g, 'জেসন')
      .replace(/URL/g, 'ইউআরএল')
      .replace(/CDN/g, 'সিডিএন')
      .replace(/UI/g, 'ইউআই')
      .replace(/server-side/gi, 'সার্ভার সাইড')
      .replace(/client-side/gi, 'ক্লায়েন্ট সাইড')
      .replace(/streaming/gi, 'স্ট্রিমিং')
      .replace(/Suspense/gi, 'সাসপেন্স')
      .replace(/chunked/gi, 'চাঙ্কড')
      .replace(/chunks/gi, 'চাঙ্কস')
      .replace(/chunk/gi, 'চাঙ্ক')
      .replace(/shipping quickly/gi, 'দ্রুত শিপিং')
      .replace(/shipping/gi, 'শিপিং')
      .replace(/ship/gi, 'শিপ')
      .replace(/build/gi, 'বিল্ড')
      .replace(/code/gi, 'কোড')
      .replace(/framework/gi, 'ফ্রেমওয়ার্ক')
      // Remove symbols that sound robotic or confuse TTS
      .replace(/[`*#_~<>[\]]/g, ' ')
      .replace(/[()]/g, ', ')
      .replace(/\s*\/\s*/g, ' বা ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Splits text into smaller sentence- and clause-sized chunks (<160 chars)
   * so Google Neural TTS never exceeds its 200-char limit and speaks smoothly.
   */
  function splitIntoAudioChunks(text, maxLen = 160) {
    if (!text) return [];
    const rawSentences = text.split(/(?<=[।?!\n])/g).map((s) => s.trim()).filter(Boolean);
    const chunks = [];

    for (const s of rawSentences) {
      if (s.length <= maxLen) {
        chunks.push(s);
      } else {
        const clauseParts = s.split(/(?<=[,;]| এবং| বা| কিংবা)/g).map((p) => p.trim()).filter(Boolean);
        let curr = '';
        for (const p of clauseParts) {
          if (curr && (curr + ' ' + p).length > maxLen) {
            chunks.push(curr.trim());
            curr = p;
          } else {
            curr += (curr ? ' ' : '') + p;
          }
        }
        if (curr.trim()) {
          chunks.push(curr.trim());
        }
      }
    }
    return chunks.filter((c) => c.length > 0);
  }

  /**
   * Stops any currently playing audio or speech synthesis immediately.
   */
  function stopAudio() {
    audioPlaySessionId++;
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (e) {}
      currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    isAudioPlaying = false;

    if (!shadowRoot) return;
    const speakBtn = shadowRoot.getElementById('bt-speak');
    if (speakBtn) {
      speakBtn.classList.remove('speaking');
      speakBtn.style.display = uiSettings.enableTts ? 'inline-flex' : 'none';
      const isEn = currentTargetLang === 'en';
      speakBtn.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        <span>${isEn ? 'Listen' : 'শুনুন'}</span>
      `;
      speakBtn.title = isEn ? 'Listen to translation' : 'অনুবাদ শুনুন';
    }
  }

  /**
   * Fetches TTS audio with in-memory caching.
   */
  async function fetchChunkAudio(chunk, lang) {
    const cacheKey = `${lang}:${chunk}`;
    if (audioCache.has(cacheKey)) {
      return audioCache.get(cacheKey);
    }

    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('TTS timeout')), 5000);
      chrome.runtime.sendMessage(
        { action: 'GET_TTS_AUDIO', text: chunk, lang: lang },
        (res) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(res);
          }
        }
      );
    });

    if (response && response.success && response.audioData) {
      if (audioCache.size >= 50) {
        const oldestKey = audioCache.keys().next().value;
        audioCache.delete(oldestKey);
      }
      audioCache.set(cacheKey, response.audioData);
      return response.audioData;
    }
    throw new Error(response?.error || 'TTS fetch failed');
  }

  /**
   * High-fidelity Natural Voice Player (Google Studio Neural Audio with seamless prefetching).
   */
  async function playNaturalTTS(rawText, lang = 'bn') {
    if (!rawText || !rawText.trim()) return;

    // Toggle stop if already playing
    if (isAudioPlaying) {
      stopAudio();
      showToast(lang === 'en' ? 'Stopped' : 'বন্ধ করা হয়েছে');
      return;
    }

    stopAudio();
    isAudioPlaying = true;
    const thisSessionId = ++audioPlaySessionId;

    const speakBtn = shadowRoot.getElementById('bt-speak');
    const isEn = lang === 'en';
    if (speakBtn) {
      speakBtn.classList.add('speaking');
      speakBtn.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
        <span>${isEn ? 'Stop' : 'থামান'}</span>
      `;
      speakBtn.title = isEn ? 'Click to stop' : 'থামাতে ক্লিক করুন';
    }

    showToast(isEn ? 'Playing...' : 'পড়া হচ্ছে...');

    // Prepare speech-optimized text
    const cleanSpeechText = prepareTextForSpeech(rawText, lang);
    const chunks = splitIntoAudioChunks(cleanSpeechText, 160);

    async function playQueue(index) {
      if (thisSessionId !== audioPlaySessionId || !isAudioPlaying) return;

      if (index >= chunks.length) {
        stopAudio();
        return;
      }

      const chunk = chunks[index];

      try {
        const audioData = await fetchChunkAudio(chunk, lang);
        if (thisSessionId !== audioPlaySessionId || !isAudioPlaying) return;

        currentAudio = new Audio(audioData);
        currentAudio.playbackRate = 0.95; // relaxed, natural human speech rate
        currentAudio.onended = () => {
          playQueue(index + 1);
        };
        currentAudio.onerror = (e) => {
          console.warn('Audio playback error, falling back to synthesis:', e);
          fallbackToSpeechSynthesis(chunk, lang, () => playQueue(index + 1), thisSessionId);
        };

        await currentAudio.play();

        // Pre-fetch the next chunk while the current one is playing for zero-lag transitions
        if (index + 1 < chunks.length) {
          fetchChunkAudio(chunks[index + 1], lang).catch(() => {});
        }
      } catch (err) {
        console.warn('Neural TTS failed, falling back to speech synthesis:', err.message);
        if (thisSessionId !== audioPlaySessionId || !isAudioPlaying) return;
        fallbackToSpeechSynthesis(chunk, lang, () => playQueue(index + 1), thisSessionId);
      }
    }

    playQueue(0);
  }

  /**
   * Fallback using browser speechSynthesis with natural voice selection.
   */
  function fallbackToSpeechSynthesis(text, lang, onComplete, sessionId) {
    if (!('speechSynthesis' in window)) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-US' : 'bn-BD';
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (lang === 'en') {
      const enVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online'))
      );
      if (enVoice) utterance.voice = enVoice;
      else {
        const anyEn = voices.find((v) => v.lang.startsWith('en'));
        if (anyEn) utterance.voice = anyEn;
      }
    } else {
      const bnVoice = voices.find(
        (v) =>
          v.lang.startsWith('bn') &&
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online'))
      );
      if (bnVoice) utterance.voice = bnVoice;
      else {
        const anyBn = voices.find((v) => v.lang.startsWith('bn'));
        if (anyBn) utterance.voice = anyBn;
      }
    }

    utterance.onend = () => {
      if (sessionId === audioPlaySessionId && typeof onComplete === 'function') {
        onComplete();
      }
    };

    utterance.onerror = () => {
      if (sessionId === audioPlaySessionId && typeof onComplete === 'function') {
        onComplete();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function showToast(msg) {
    const toast = shadowRoot.getElementById('bt-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  /**
   * Positions and displays the floating trigger button near selection.
   */
  function showTrigger(selectionRange, text) {
    init();
    activeSelectionRange = selectionRange;
    originalSelectedText = text;

    const isBengali = window.TermGuardian?.isBengaliText ? window.TermGuardian.isBengaliText(text) : /[\u0980-\u09FF]/.test(text);
    currentSourceLang = isBengali ? 'bn' : 'en';
    currentTargetLang = isBengali ? 'en' : 'bn';

    const triggerText = shadowRoot.getElementById('bt-trigger-text');
    if (triggerText) {
      triggerText.textContent = isBengali ? 'English' : 'বাংলা';
    }
    triggerBtn.title = isBengali ? 'ইংরেজিতে অনুবাদ দেখুন (Translate to English)' : 'বাংলায় অনুবাদ দেখুন (Translate to Bangla)';

    const rect = selectionRange.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    cardEl.style.display = 'none';

    // Position trigger near the end of selection
    const pageX = window.scrollX + rect.right;
    const pageY = window.scrollY + rect.bottom + 6;

    triggerBtn.style.top = `${pageY}px`;
    triggerBtn.style.left = `${Math.max(10, pageX - 60)}px`;
    triggerBtn.style.display = 'inline-flex';
  }

  /**
   * Shows the translation card and positions it near selection.
   */
  function showCard(selectionRange, text) {
    init();
    stopAudio();
    activeSelectionRange = selectionRange;
    originalSelectedText = text;
    isReplacedInPage = false;

    const isBengali = window.TermGuardian?.isBengaliText ? window.TermGuardian.isBengaliText(text) : /[\u0980-\u09FF]/.test(text);
    currentSourceLang = isBengali ? 'bn' : 'en';
    currentTargetLang = isBengali ? 'en' : 'bn';

    const dirEl = shadowRoot.getElementById('bt-lang-direction');
    if (dirEl) {
      dirEl.textContent = isBengali ? 'বাংলা ➔ English' : 'English ➔ বাংলা';
    }

    const copyBtn = shadowRoot.getElementById('bt-copy');
    if (copyBtn) {
      const copySpan = copyBtn.querySelector('span');
      if (copySpan) copySpan.textContent = isBengali ? 'Copy' : 'কপি';
      copyBtn.title = isBengali ? 'Copy translation' : 'অনুবাদ কপি করুন';
    }

    const speakBtn = shadowRoot.getElementById('bt-speak');
    if (speakBtn) {
      speakBtn.style.display = uiSettings.enableTts ? 'inline-flex' : 'none';
      const speakSpan = speakBtn.querySelector('span');
      if (speakSpan) speakSpan.textContent = isBengali ? 'Listen' : 'শুনুন';
      speakBtn.title = isBengali ? 'Listen to translation' : 'অনুবাদ শুনুন';
    }

    const replaceBtn = shadowRoot.getElementById('bt-replace');
    if (replaceBtn) {
      replaceBtn.innerHTML = isBengali ? '<span>⇄ Replace</span>' : '<span>⇄ প্রতিস্থাপন</span>';
    }

    triggerBtn.style.display = 'none';

    // Reset card contents to loading skeleton
    const contentBox = shadowRoot.getElementById('bt-content');
    contentBox.innerHTML = `
      <div class="bt-loading-skeleton">
        <div class="bt-skeleton-line"></div>
        <div class="bt-skeleton-line"></div>
        <div class="bt-skeleton-line short"></div>
      </div>
    `;

    positionCard(selectionRange);
    cardEl.style.display = 'flex';
  }

  /**
   * Calculates smart coordinates preventing the card from overflowing the viewport.
   */
  function positionCard(selectionRange) {
    if (!selectionRange) return;
    const rect = selectionRange.getBoundingClientRect();

    const cardWidth = 460;
    const cardEstHeight = 260;
    const padding = 12;

    let left = window.scrollX + rect.left;
    // Align centered with selection if possible
    left = window.scrollX + rect.left + rect.width / 2 - cardWidth / 2;

    // Viewport bounds checking horizontally
    const minLeft = window.scrollX + padding;
    const maxLeft = window.scrollX + document.documentElement.clientWidth - cardWidth - padding;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    // Place below selection by default, or above if there's no room below
    let top = window.scrollY + rect.bottom + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < cardEstHeight + 20 && rect.top > cardEstHeight + 20) {
      top = window.scrollY + rect.top - cardEstHeight - 8;
    }

    cardEl.style.left = `${left}px`;
    cardEl.style.top = `${top}px`;
  }

  /**
   * Formats paragraph text into DOM elements, intelligently turning lists into <ul><li> items.
   */
  function formatParagraphElements(paraText) {
    const lines = paraText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      const pEl = document.createElement('div');
      pEl.className = 'bt-para';
      pEl.textContent = paraText.trim();
      return [pEl];
    }

    // Check if line 0 ends with ':' and subsequent lines are list items
    if (lines[0].endsWith(':') && lines.length > 1) {
      const introEl = document.createElement('div');
      introEl.className = 'bt-para';
      introEl.textContent = lines[0];

      const ulEl = document.createElement('ul');
      ulEl.className = 'bt-list';
      for (let i = 1; i < lines.length; i++) {
        const liEl = document.createElement('li');
        liEl.textContent = lines[i].replace(/^[-*•]\s*/, '').trim();
        ulEl.appendChild(liEl);
      }
      return [introEl, ulEl];
    }

    // Check if lines contain bullet indicators
    if (lines.some((l) => /^[-*•]\s+/.test(l))) {
      const elements = [];
      let currentUl = null;
      for (const line of lines) {
        if (/^[-*•]\s+/.test(line)) {
          if (!currentUl) {
            currentUl = document.createElement('ul');
            currentUl.className = 'bt-list';
            elements.push(currentUl);
          }
          const liEl = document.createElement('li');
          liEl.textContent = line.replace(/^[-*•]\s*/, '').trim();
          currentUl.appendChild(liEl);
        } else {
          currentUl = null;
          const pEl = document.createElement('div');
          pEl.className = 'bt-para';
          pEl.textContent = line;
          elements.push(pEl);
        }
      }
      return elements;
    }

    const pEl = document.createElement('div');
    pEl.className = 'bt-para';
    pEl.textContent = paraText.trim();
    return [pEl];
  }

  /**
   * Updates card translation content (supports streaming updates).
   */
  function setContent(translatedText, engineName = 'Chrome Native AI', targetLang = null) {
    if (targetLang) {
      currentTargetLang = targetLang;
    }
    currentTranslatedText = translatedText;
    const contentBox = shadowRoot.getElementById('bt-content');
    const engineBadge = shadowRoot.getElementById('bt-engine');

    if (engineBadge) {
      engineBadge.textContent = engineName.includes('Native') ? '⚡ Native AI' : '🌐 Web';
      if (engineName.includes('Native')) {
        engineBadge.classList.add('native');
      } else {
        engineBadge.classList.remove('native');
      }
    }

    if (contentBox) {
      if (translatedText) {
        contentBox.innerHTML = '';
        const rawParas = translatedText.split(/\n\s*\n/).filter((p) => p.trim());
        if (rawParas.length === 0 && translatedText.trim()) {
          rawParas.push(translatedText.trim());
        }
        rawParas.forEach((p) => {
          const els = formatParagraphElements(p);
          els.forEach((el) => contentBox.appendChild(el));
        });
      } else {
        contentBox.textContent = '';
      }
    }
  }

  /**
   * Updates download progress indicator for model downloads.
   */
  function setDownloadProgress(progressRatio) {
    const box = shadowRoot.getElementById('bt-progress-box');
    const bar = shadowRoot.getElementById('bt-progress-bar');
    if (!box || !bar) return;

    if (progressRatio >= 0 && progressRatio < 1) {
      box.style.display = 'block';
      bar.style.width = `${Math.round(progressRatio * 100)}%`;
      const contentBox = shadowRoot.getElementById('bt-content');
      if (contentBox && !currentTranslatedText) {
        const isBn = currentTargetLang === 'bn';
        contentBox.textContent = isBn
          ? `Bangla AI মডেল ডাউনলোড হচ্ছে: ${Math.round(progressRatio * 100)}%...`
          : `AI translation model downloading: ${Math.round(progressRatio * 100)}%...`;
      }
    } else {
      box.style.display = 'none';
    }
  }

  /**
   * Replaces selected text in the actual webpage DOM with the translation.
   * Clicking again restores the original text.
   */
  function toggleReplaceInPage() {
    const replaceBtn = shadowRoot.getElementById('bt-replace');
    if (!activeSelectionRange || !currentTranslatedText) return;

    const isEn = currentTargetLang === 'en';

    try {
      if (!isReplacedInPage) {
        // Perform replacement
        const span = document.createElement('span');
        span.className = 'bt-inline-translated-text';
        span.style.cssText =
          'background-color: rgba(37, 99, 235, 0.08); border-bottom: 1.5px dashed #2563eb; color: inherit; transition: background 0.2s;';
        span.title = isEn ? `Original: ${originalSelectedText}` : `আসল লেখা: ${originalSelectedText}`;
        span.textContent = currentTranslatedText;

        activeSelectionRange.deleteContents();
        activeSelectionRange.insertNode(span);

        replacedNewNode = span;
        isReplacedInPage = true;
        if (replaceBtn) replaceBtn.innerHTML = isEn ? '<span>↺ Undo</span>' : '<span>↺ পূর্বাবস্থায় ফিরুন</span>';
        showToast(isEn ? 'Replaced in page' : 'পৃষ্ঠায় প্রতিস্থাপিত');
      } else {
        // Revert to original
        if (replacedNewNode && replacedNewNode.parentNode) {
          const textNode = document.createTextNode(originalSelectedText);
          replacedNewNode.parentNode.replaceChild(textNode, replacedNewNode);
          replacedNewNode = null;
        }
        isReplacedInPage = false;
        if (replaceBtn) replaceBtn.innerHTML = isEn ? '<span>⇄ Replace</span>' : '<span>⇄ প্রতিস্থাপন</span>';
        showToast(isEn ? 'Original restored' : 'আসল লেখা ফেরত আনা হয়েছে');
      }
    } catch (err) {
      console.warn('Replace in page failed:', err);
      showToast(isEn ? 'Replace failed' : 'প্রতিস্থাপন সম্ভব হয়নি');
    }
  }

  /**
   * Hides all UI elements.
   */
  function hideAll() {
    stopAudio();
    if (triggerBtn) triggerBtn.style.display = 'none';
    if (cardEl) cardEl.style.display = 'none';
    activeSelectionRange = null;
  }

  function isVisible() {
    return (
      (triggerBtn && triggerBtn.style.display !== 'none') ||
      (cardEl && cardEl.style.display !== 'none')
    );
  }

  return {
    init,
    showTrigger,
    showCard,
    setContent,
    setDownloadProgress,
    hideAll,
    isVisible,
    isDragging: () => isDraggingCard,
    updateSettings
  };
})();
