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
  let isShowingSummary = false;
  let currentSummaryData = null;
  let isShowingExplanation = false;
  let currentExplanationData = null;
  let currentFormattedTranslationHtml = '';
  let isCardExpanded = false;

  /**
   * Modern View Transitions API (Chrome 111+) runner with graceful fallback.
   * Enables hardware-accelerated morphing for DOM updates.
   */
  function safeViewTransition(updateFn) {
    if (
      typeof document.startViewTransition === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      try {
        return document.startViewTransition(updateFn);
      } catch (e) {
        console.warn('View Transition fallback:', e);
      }
    }
    updateFn();
    return null;
  }

  const LANGUAGE_NAMES = {
    bn: 'বাংলা',
    en: 'English',
    es: 'Español',
    hi: 'हिन्दी',
    ar: 'العربية',
    fr: 'Français',
    de: 'Deutsch',
    zh: '中文',
    ja: '日本語',
    pt: 'Português',
    ru: 'Русский',
    ur: 'اردو'
  };

  // Settings & Preferences
  let uiSettings = {
    targetLanguage: 'bn',
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

  // Animation Timers
  let cardHideTimer = null;
  let triggerHideTimer = null;

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
          user-select: none;
          z-index: 2147483647;
          opacity: 0;
          transform: translateY(6px) scale(0.94);
          transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      background 0.15s ease;
        }

        .bt-trigger-btn.bt-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .bt-trigger-btn.bt-hiding {
          opacity: 0;
          transform: translateY(5px) scale(0.94);
          transition: opacity 0.14s ease-in, transform 0.14s ease-in;
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
          width: 480px;
          min-width: 320px;
          max-width: calc(100vw - 32px);
          background: var(--bt-bg);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid var(--bt-border);
          border-radius: 12px;
          box-shadow: var(--bt-shadow);
          font-family: var(--bt-font);
          color: var(--bt-text);
          pointer-events: auto;
          z-index: 2147483647;
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px) scale(0.97);
          transition: width 0.28s cubic-bezier(0.16, 1, 0.3, 1),
                      max-width 0.28s cubic-bezier(0.16, 1, 0.3, 1),
                      opacity 0.26s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.26s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.2s ease;
          will-change: transform, opacity, width;
          resize: both;
        }

        .bt-card.is-expanded {
          width: min(720px, calc(100vw - 48px));
          box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.25), 0 10px 20px -5px rgba(0, 0, 0, 0.15);
        }

        .bt-card.bt-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .bt-card.bt-hiding {
          opacity: 0;
          pointer-events: none;
          transform: translateY(10px) scale(0.97);
          transition: opacity 0.18s cubic-bezier(0.4, 0, 1, 1),
                      transform 0.18s cubic-bezier(0.4, 0, 1, 1);
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
          opacity: 0.94 !important;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.25) !important;
          transition: none !important;
          transform: none !important;
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

        .bt-header-right {
          display: flex;
          align-items: center;
          gap: 4px;
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

        .bt-icon-btn,
        .bt-close-btn {
          background: transparent;
          border: none;
          color: var(--bt-text-muted);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 3px 5px;
          border-radius: 4px;
          line-height: 1;
          transition: color 0.15s, background 0.15s;
        }

        .bt-close-btn {
          font-size: 14px;
        }

        .bt-icon-btn:hover,
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
          padding: 12px 14px;
          max-height: min(520px, 68vh);
          overflow-y: auto;
          font-size: 13.5px;
          line-height: 1.65;
          letter-spacing: 0.1px;
          word-break: break-word;
          white-space: normal;
          transition: max-height 0.28s cubic-bezier(0.16, 1, 0.3, 1),
                      padding 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .bt-card.is-expanded .bt-body {
          max-height: min(650px, 78vh);
          font-size: 14px;
          line-height: 1.75;
          padding: 16px 18px;
        }

        .bt-para {
          margin-bottom: 10px;
          line-height: 1.65;
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

        .bt-tool-btn.has-long-content {
          border-color: rgba(37, 99, 235, 0.4);
          position: relative;
        }

        .bt-tool-btn.has-long-content::after {
          content: '';
          position: absolute;
          top: -2px;
          right: -2px;
          width: 6px;
          height: 6px;
          background: var(--bt-accent);
          border-radius: 50%;
          box-shadow: 0 0 0 1.5px var(--bt-bg);
          animation: btPulse 2s infinite;
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

        /* Summary view styling */
        .bt-summary-container {
          animation: btFadeIn 0.2s ease;
          white-space: normal !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .bt-summary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 0 8px 0;
          padding: 0;
        }

        .bt-summary-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-weight: 600;
          color: #2563eb;
          background: rgba(37, 99, 235, 0.08);
          padding: 2px 8px;
          border-radius: 5px;
          line-height: 1.4;
        }

        .bt-summary-engine {
          font-size: 10px;
          color: var(--bt-text-muted);
          background: rgba(0, 0, 0, 0.04);
          padding: 2px 6px;
          border-radius: 4px;
          line-height: 1.3;
        }

        .bt-summary-list {
          margin: 0 !important;
          padding: 0 !important;
          list-style: none !important;
        }

        .bt-summary-item {
          margin: 0 0 8px 0 !important;
          padding: 2px 0 !important;
          line-height: 1.65 !important;
          font-size: 13.5px;
          white-space: normal !important;
        }

        .bt-summary-prefix {
          font-weight: 600;
          color: var(--bt-text);
          display: inline;
        }

        .bt-summary-text {
          color: var(--bt-text);
          display: inline;
        }

        .bt-summary-item:last-child {
          margin-bottom: 0 !important;
        }

        .bt-summary-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--bt-text-muted);
          padding: 4px 0;
          margin: 0;
        }

        /* Explanation view styling */
        .bt-explain-container {
          animation: btFadeIn 0.2s ease;
          white-space: normal !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .bt-explain-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 0 10px 0;
          padding: 0;
        }

        .bt-explain-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-weight: 600;
          color: #7c3aed;
          background: rgba(124, 58, 237, 0.09);
          padding: 2px 8px;
          border-radius: 5px;
          line-height: 1.4;
        }

        .bt-explain-engine {
          font-size: 10px;
          color: var(--bt-text-muted);
          background: rgba(0, 0, 0, 0.04);
          padding: 2px 6px;
          border-radius: 4px;
          line-height: 1.3;
        }

        .bt-explain-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 0 !important;
          padding: 0 !important;
        }

        .bt-explain-section {
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid var(--bt-border);
          border-radius: 8px;
          padding: 8px 10px;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .bt-explain-section:hover {
          background: rgba(0, 0, 0, 0.035);
          border-color: rgba(124, 58, 237, 0.3);
        }

        .bt-explain-sec-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--bt-text);
          margin-bottom: 4px;
        }

        .bt-explain-icon {
          font-size: 14px;
          line-height: 1;
        }

        .bt-explain-sec-content {
          font-size: 13px;
          line-height: 1.6;
          color: var(--bt-text);
          white-space: normal;
        }

        .bt-explain-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--bt-text-muted);
          padding: 4px 0;
          margin: 0;
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
          <div class="bt-header-right">
            <button class="bt-icon-btn" id="bt-expand" title="বড় করে পড়ুন (Expand reading view)">
              <svg id="bt-expand-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
            <button class="bt-close-btn" id="bt-close" title="বন্ধ করুন">✕</button>
          </div>
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

          <button class="bt-tool-btn" id="bt-explain" title="সহজ ভাষায় বিস্তারিত ব্যাখ্যা ও বাস্তব উদাহরণ দেখুন">
            <svg viewBox="0 0 24 24"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-1.3l-.85-.6C7.8 13.16 7 11.42 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.42-.8 4.16-2.15 5.1z"/></svg>
            <span id="bt-explain-text">সহজ ব্যাখ্যা</span>
          </button>

          <button class="bt-tool-btn" id="bt-summarize" title="সহজ ভাষায় মূল সারসংক্ষেপ দেখুন">
            <svg viewBox="0 0 24 24"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>
            <span id="bt-summarize-text">সারসংক্ষেপ</span>
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

    // Warm up speech synthesis voices early for instant human-like speech
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
        if (typeof window.speechSynthesis.addEventListener === 'function') {
          window.speechSynthesis.addEventListener('voiceschanged', () => {
            try {
              window.speechSynthesis.getVoices();
            } catch (e) {}
          });
        }
      } catch (e) {}
    }

    // Trigger button click
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideTrigger(true);
      if (typeof onTriggerClick === 'function') {
        onTriggerClick(originalSelectedText, activeSelectionRange);
      }
    });

    // Expand / Restore button click
    const expandBtn = shadowRoot.getElementById('bt-expand');
    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExpand();
      });
    }

    // Close button click
    shadowRoot.getElementById('bt-close').addEventListener('click', (e) => {
      e.stopPropagation();
      hideAll();
    });

    // Copy button
    shadowRoot.getElementById('bt-copy').addEventListener('click', async (e) => {
      e.stopPropagation();
      const textToCopy = (isShowingExplanation && currentExplanationData?.plainText)
        ? currentExplanationData.plainText
        : ((isShowingSummary && currentSummaryData?.plainText)
            ? currentSummaryData.plainText
            : currentTranslatedText);

      if (!textToCopy) return;

      const isEn = currentTargetLang === 'en';
      try {
        await navigator.clipboard.writeText(textToCopy);
        showToast(isEn ? 'Copied!' : 'কপি হয়েছে!');
      } catch (err) {
        showToast(isEn ? 'Copy failed' : 'কপি ব্যর্থ');
      }
    });

    // Listen / Speak button (Natural Voice TTS)
    shadowRoot.getElementById('bt-speak').addEventListener('click', (e) => {
      e.stopPropagation();
      const textToSpeak = (isShowingExplanation && currentExplanationData?.plainText)
        ? currentExplanationData.plainText
        : ((isShowingSummary && currentSummaryData?.plainText)
            ? currentSummaryData.plainText
            : currentTranslatedText);

      if (!textToSpeak) return;
      playNaturalTTS(textToSpeak, currentTargetLang);
    });

    // Explain button click
    const explainBtn = shadowRoot.getElementById('bt-explain');
    if (explainBtn) {
      explainBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExplain();
      });
    }

    // Summarize button click
    const sumBtn = shadowRoot.getElementById('bt-summarize');
    if (sumBtn) {
      sumBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSummarize();
      });
    }
  }

  /**
   * Initializes mouse drag handling on the card header so users can freely reposition the card.
   */
  function initDraggable() {
    const headerEl = shadowRoot.querySelector('.bt-header');
    if (!headerEl || !cardEl) return;

    headerEl.addEventListener('mousedown', (e) => {
      // Don't drag if clicking buttons or not primary mouse button
      if (e.button !== 0 || e.target.closest('#bt-close') || e.target.closest('#bt-expand')) return;

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
   * Prepares text for natural human-like speech:
   * Smooths markdown symbols, acronyms, and technical jargon into natural phonetics.
   */
  function prepareTextForSpeech(text, lang = 'bn') {
    if (!text) return '';

    let clean = text
      // Remove protocol from URLs so TTS doesn't spell "h-t-t-p-s colon slash slash"
      .replace(/https?:\/\/(www\.)?/gi, '')
      // Clean code fences, markdown asterisks, backticks, brackets
      .replace(/[`*#_~<>[\]]/g, ' ')
      .replace(/[—–]/g, ', ')
      .replace(/[:;]/g, ', ')
      .replace(/[()]/g, ', ')
      .replace(/\s*\/\s*/g, lang === 'bn' ? ' বা ' : ' or ');

    if (lang === 'bn') {
      clean = clean
        // Frameworks & tech brands (avoid dots like Next.js causing long robotic pauses)
        .replace(/Next\.js/gi, 'নেক্সট জেএস')
        .replace(/Node\.js/gi, 'নোড জেএস')
        .replace(/Vue\.js/gi, 'ভিউ জেএস')
        .replace(/React/gi, 'রিঅ্যাক্ট')
        .replace(/JavaScript/gi, 'জাভাস্ক্রিপ্ট')
        .replace(/TypeScript/gi, 'টাইপস্ক্রিপ্ট')
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
        // Error handling and technical documentation phrasing
        .replace(/error handling/gi, 'এরর হ্যান্ডলিং')
        .replace(/handling/gi, 'হ্যান্ডলিং')
        .replace(/handle/gi, 'হ্যান্ডেল')
        .replace(/uncaught exceptions/gi, 'আনকট এক্সেপশনস')
        .replace(/uncaught exception/gi, 'আনকট এক্সেপশন')
        .replace(/uncaught/gi, 'আনকট')
        .replace(/expected errors/gi, 'প্রত্যাশিত এরর')
        .replace(/expected error/gi, 'প্রত্যাশিত এরর')
        .replace(/expected/gi, 'প্রত্যাশিত')
        .replace(/exceptions/gi, 'এক্সেপশনস')
        .replace(/exception/gi, 'এক্সেপশন')
        .replace(/errors/gi, 'এররস')
        .replace(/error/gi, 'এরর')
        .replace(/categories/gi, 'ক্যাটাগরি')
        .replace(/category/gi, 'ক্যাটাগরি')
        .replace(/walk you through/gi, 'ধাপে ধাপে দেখিয়ে দেবে')
        .replace(/walk through/gi, 'সহজভাবে বুঝিয়ে দেওয়া')
        .replace(/\s*\/\s*/g, ' বা ');
    }

    // Natural speech punctuation spacing (ensures pauses between sentences and clauses)
    return clean
      .replace(/([।,!?])([^\s])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Splits text into smaller sentence- and clause-sized chunks (<140 chars)
   * for smooth, natural human breathing cadence and zero audio clipping.
   */
  function splitIntoAudioChunks(text, maxLen = 140) {
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
   * Finds the most natural, human-sounding voice available in the browser.
   * Prioritizes Neural / Online / Natural voices (e.g. Microsoft Natural, Google WaveNet).
   */
  function findNaturalVoice(lang = 'bn') {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;

    const prefix = (lang || 'bn').toLowerCase().split('-')[0];

    // Priority 1: High-definition Neural / Online / Natural voices
    const naturalVoice = voices.find((v) => {
      const vLang = (v.lang || '').toLowerCase().replace('_', '-');
      return vLang.startsWith(prefix) && /natural|online|neural|wavenet/i.test(v.name);
    });
    if (naturalVoice) return naturalVoice;

    // Priority 2: Google modern neural browser voice
    const googleVoice = voices.find((v) => {
      const vLang = (v.lang || '').toLowerCase().replace('_', '-');
      return vLang.startsWith(prefix) && /google/i.test(v.name);
    });
    if (googleVoice) return googleVoice;

    // Priority 3: Any installed system/browser voice matching target language
    const langVoice = voices.find((v) => {
      const vLang = (v.lang || '').toLowerCase().replace('_', '-');
      return vLang.startsWith(prefix);
    });
    if (langVoice) return langVoice;

    return null;
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
      const timeout = setTimeout(() => reject(new Error('TTS timeout')), 6000);
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
   * High-fidelity Natural Human Voice Player.
   * Prioritizes browser neural / online voices for natural cadence and human intonation.
   * Falls back smoothly to clean audio streaming with zero metallic distortion.
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

    // Prepare speech-optimized natural phonetics
    const cleanSpeechText = prepareTextForSpeech(rawText, lang);
    const chunks = splitIntoAudioChunks(cleanSpeechText, 140);
    if (!chunks.length) {
      stopAudio();
      return;
    }

    // Check if natural browser voice is available (wait briefly if voices loading)
    let naturalVoice = findNaturalVoice(lang);
    if (!naturalVoice && 'speechSynthesis' in window && window.speechSynthesis.getVoices().length === 0) {
      await new Promise((resolve) => {
        let timer;
        const onVoices = () => {
          clearTimeout(timer);
          if (window.speechSynthesis.removeEventListener) {
            window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
          }
          resolve();
        };
        timer = setTimeout(onVoices, 250);
        if (window.speechSynthesis.addEventListener) {
          window.speechSynthesis.addEventListener('voiceschanged', onVoices, { once: true });
        }
      });
      naturalVoice = findNaturalVoice(lang);
    }

    if (thisSessionId !== audioPlaySessionId || !isAudioPlaying) return;

    // Strategy 1: Browser Neural / Natural Voice (sounds completely human and expressive)
    if (naturalVoice) {
      let chunkIdx = 0;

      function speakNextChunk() {
        if (thisSessionId !== audioPlaySessionId || !isAudioPlaying) return;
        if (chunkIdx >= chunks.length) {
          stopAudio();
          return;
        }

        const chunk = chunks[chunkIdx++];
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.voice = naturalVoice;
        utterance.lang = naturalVoice.lang || (lang === 'en' ? 'en-US' : 'bn-BD');
        utterance.rate = 0.95; // Conversational human pace
        utterance.pitch = 1.0; // Natural pitch

        utterance.onend = () => {
          if (thisSessionId === audioPlaySessionId && isAudioPlaying) {
            // Conversational 50ms pause between clauses
            setTimeout(speakNextChunk, 50);
          }
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis chunk error, continuing:', e);
          if (thisSessionId === audioPlaySessionId && isAudioPlaying) {
            speakNextChunk();
          }
        };

        window.speechSynthesis.speak(utterance);
      }

      speakNextChunk();
      return;
    }

    // Strategy 2: Clean audio stream fallback (clean 1.0 playback rate without metallic artifacts)
    async function playAudioQueue(index) {
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
        currentAudio.playbackRate = 1.0; // Clean 1.0 playback rate avoids robotic metallic time-stretching
        currentAudio.onended = () => {
          playAudioQueue(index + 1);
        };
        currentAudio.onerror = (e) => {
          console.warn('Audio playback error, falling back:', e);
          fallbackToSpeechSynthesis(chunk, lang, () => playAudioQueue(index + 1), thisSessionId);
        };

        await currentAudio.play();

        // Gapless pre-fetch next chunk
        if (index + 1 < chunks.length) {
          fetchChunkAudio(chunks[index + 1], lang).catch(() => {});
        }
      } catch (err) {
        console.warn('Audio chunk fetch failed, falling back:', err.message);
        if (thisSessionId !== audioPlaySessionId || !isAudioPlaying) return;
        fallbackToSpeechSynthesis(chunk, lang, () => playAudioQueue(index + 1), thisSessionId);
      }
    }

    playAudioQueue(0);
  }

  /**
   * Fallback speech synthesis helper for individual chunks.
   */
  function fallbackToSpeechSynthesis(text, lang, onComplete, sessionId) {
    if (!('speechSynthesis' in window)) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-US' : 'bn-BD';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voice = findNaturalVoice(lang);
    if (voice) {
      utterance.voice = voice;
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
  /**
   * Positions and displays the floating trigger button near selection with slide transition.
   */
  function showTrigger(selectionRange, text, userTargetLang = null) {
    init();
    clearTimeout(triggerHideTimer);
    clearTimeout(cardHideTimer);

    activeSelectionRange = selectionRange;
    originalSelectedText = text;

    hideCard(true); // immediately hide any open card

    const activeTarget = userTargetLang || uiSettings.targetLanguage || 'bn';
    const isBengali = window.TermGuardian?.isBengaliText ? window.TermGuardian.isBengaliText(text) : /[\u0980-\u09FF]/.test(text);
    const isTargetMatch = (activeTarget === 'bn' && isBengali);

    currentSourceLang = isTargetMatch ? activeTarget : (isBengali ? 'bn' : 'en');
    currentTargetLang = isTargetMatch ? 'en' : activeTarget;

    const targetLabel = LANGUAGE_NAMES[currentTargetLang] || currentTargetLang.toUpperCase();
    const triggerText = shadowRoot.getElementById('bt-trigger-text');
    if (triggerText) {
      triggerText.textContent = targetLabel;
    }
    triggerBtn.title = `Translate to ${targetLabel}`;

    const rect = selectionRange.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    // Position trigger near the end of selection
    const pageX = window.scrollX + rect.right;
    const pageY = window.scrollY + rect.bottom + 6;

    triggerBtn.style.top = `${pageY}px`;
    triggerBtn.style.left = `${Math.max(10, pageX - 60)}px`;
    triggerBtn.style.display = 'inline-flex';
    triggerBtn.classList.remove('bt-hiding');
    // Force layout reflow so the transition animates smoothly
    void triggerBtn.offsetWidth;
    triggerBtn.classList.add('bt-visible');
  }

  /**
   * Smoothly slides out and hides the floating trigger button.
   */
  function hideTrigger(immediate = false) {
    if (!triggerBtn || triggerBtn.style.display === 'none') return;
    clearTimeout(triggerHideTimer);

    if (immediate) {
      triggerBtn.classList.remove('bt-visible', 'bt-hiding');
      triggerBtn.style.display = 'none';
      return;
    }

    triggerBtn.classList.remove('bt-visible');
    triggerBtn.classList.add('bt-hiding');
    triggerHideTimer = setTimeout(() => {
      triggerBtn.classList.remove('bt-hiding');
      triggerBtn.style.display = 'none';
    }, 140);
  }

  /**
   * Shows the translation card and positions it near selection with smooth slide-in transition.
   */
  function showCard(selectionRange, text, userTargetLang = null) {
    init();
    stopAudio();
    clearTimeout(cardHideTimer);
    clearTimeout(triggerHideTimer);

    activeSelectionRange = selectionRange;
    originalSelectedText = text;
    isReplacedInPage = false;

    const activeTarget = userTargetLang || uiSettings.targetLanguage || 'bn';
    const isBengali = window.TermGuardian?.isBengaliText ? window.TermGuardian.isBengaliText(text) : /[\u0980-\u09FF]/.test(text);
    const isTargetMatch = (activeTarget === 'bn' && isBengali);

    currentSourceLang = isTargetMatch ? activeTarget : (isBengali ? 'bn' : 'en');
    currentTargetLang = isTargetMatch ? 'en' : activeTarget;

    const sourceLabel = LANGUAGE_NAMES[currentSourceLang] || currentSourceLang.toUpperCase();
    const targetLabel = LANGUAGE_NAMES[currentTargetLang] || currentTargetLang.toUpperCase();

    const dirEl = shadowRoot.getElementById('bt-lang-direction');
    if (dirEl) {
      dirEl.textContent = `${sourceLabel} ➔ ${targetLabel}`;
    }

    const i18n = window.PromptHarness?.getI18nLabels
      ? window.PromptHarness.getI18nLabels(currentTargetLang)
      : (currentTargetLang === 'bn'
          ? { copy: 'কপি', listen: 'শুনুন', explain: 'সহজ ব্যাখ্যা', summary: 'সারসংক্ষেপ', fullText: '↩ মূল অনুবাদ' }
          : (currentTargetLang === 'hi'
              ? { copy: 'कॉपी', listen: 'सुनें', explain: 'सरल व्याख्या', summary: 'सारांश', fullText: '↩ मूल अनुवाद' }
              : { copy: 'Copy', listen: 'Listen', explain: 'Explain', summary: 'Summary', fullText: '↩ Full Text' }));

    const copyBtn = shadowRoot.getElementById('bt-copy');
    if (copyBtn) {
      const copySpan = copyBtn.querySelector('span');
      if (copySpan) copySpan.textContent = i18n.copy;
      copyBtn.title = i18n.copy;
    }

    const speakBtn = shadowRoot.getElementById('bt-speak');
    if (speakBtn) {
      speakBtn.style.display = uiSettings.enableTts ? 'inline-flex' : 'none';
      const speakSpan = speakBtn.querySelector('span');
      if (speakSpan) speakSpan.textContent = i18n.listen;
      speakBtn.title = i18n.listen;
    }

    // Reset explain button & state
    isShowingExplanation = false;
    currentExplanationData = null;
    const explainBtn = shadowRoot.getElementById('bt-explain');
    if (explainBtn) {
      explainBtn.classList.remove('active');
      const expSpan = explainBtn.querySelector('#bt-explain-text') || explainBtn.querySelector('span');
      if (expSpan) expSpan.textContent = i18n.explain || 'সহজ ব্যাখ্যা';
      explainBtn.title = i18n.explain || 'সহজ ব্যাখ্যা';
    }

    // Reset summary state
    isShowingSummary = false;
    currentSummaryData = null;
    currentFormattedTranslationHtml = '';

    // Reset card expanded state
    isCardExpanded = false;
    if (cardEl) {
      cardEl.classList.remove('is-expanded');
    }
    const expandBtn = shadowRoot.getElementById('bt-expand');
    if (expandBtn) {
      const isBn = currentTargetLang === 'bn';
      expandBtn.title = isBn ? 'বড় করে পড়ুন (Expand reading view)' : 'Expand reading view';
      expandBtn.innerHTML = `
        <svg id="bt-expand-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"></polyline>
          <polyline points="9 21 3 21 3 15"></polyline>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
      `;
    }

    const sumBtn = shadowRoot.getElementById('bt-summarize');
    if (sumBtn) {
      sumBtn.classList.remove('active');
      const sumSpan = sumBtn.querySelector('#bt-summarize-text') || sumBtn.querySelector('span');
      if (sumSpan) sumSpan.textContent = i18n.summary;
      sumBtn.title = i18n.summary;

      // Pulse callout when selection contains significant text (> 80 words)
      const wordCount = (text || '').trim().split(/\s+/).filter(Boolean).length;
      if (wordCount >= 80) {
        sumBtn.classList.add('has-long-content');
      } else {
        sumBtn.classList.remove('has-long-content');
      }
    }

    hideTrigger(true); // immediately hide trigger

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
    cardEl.classList.remove('bt-hiding');
    // Force layout reflow so the transition animates smoothly from translateY(12px) to 0
    void cardEl.offsetWidth;
    cardEl.classList.add('bt-visible');
  }

  /**
   * Smoothly slides out and hides the translation popover card.
   */
  function hideCard(immediate = false) {
    if (!cardEl || cardEl.style.display === 'none') return;
    stopAudio();
    clearTimeout(cardHideTimer);

    isCardExpanded = false;
    cardEl.classList.remove('is-expanded');

    if (immediate) {
      cardEl.classList.remove('bt-visible', 'bt-hiding');
      cardEl.style.display = 'none';
      return;
    }

    cardEl.classList.remove('bt-visible');
    cardEl.classList.add('bt-hiding');
    cardHideTimer = setTimeout(() => {
      cardEl.classList.remove('bt-hiding');
      cardEl.style.display = 'none';
    }, 190);
  }

  /**
   * Toggles the card between standard and expanded reading view for long articles.
   */
  function toggleExpand() {
    if (!cardEl) return;
    isCardExpanded = !isCardExpanded;

    const expandBtn = shadowRoot.getElementById('bt-expand');
    const isBn = currentTargetLang === 'bn';

    safeViewTransition(() => {
      if (isCardExpanded) {
        cardEl.classList.add('is-expanded');
        if (expandBtn) {
          expandBtn.title = isBn ? 'স্বাভাবিক আকারে ফিরুন (Restore normal view)' : 'Restore normal view';
          expandBtn.innerHTML = `
            <svg id="bt-expand-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 14 10 14 10 20"></polyline>
              <polyline points="20 10 14 10 14 4"></polyline>
              <line x1="14" y1="10" x2="21" y2="3"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          `;
        }
      } else {
        cardEl.classList.remove('is-expanded');
        if (expandBtn) {
          expandBtn.title = isBn ? 'বড় করে পড়ুন (Expand reading view)' : 'Expand reading view';
          expandBtn.innerHTML = `
            <svg id="bt-expand-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          `;
        }
      }

      // Re-position card if needed
      if (activeSelectionRange) {
        positionCard(activeSelectionRange);
      }
    });
  }

  /**
   * Calculates smart coordinates preventing the card from overflowing the viewport.
   * Handles tall multi-paragraph article selections gracefully.
   */
  function positionCard(selectionRange) {
    if (!selectionRange || !cardEl) return;
    const rect = selectionRange.getBoundingClientRect();

    const cardWidth = isCardExpanded
      ? Math.min(720, window.innerWidth - 48)
      : Math.min(480, window.innerWidth - 32);
    const cardEstHeight = isCardExpanded ? 420 : 260;
    const padding = 12;

    const minLeft = window.scrollX + padding;
    const maxLeft = window.scrollX + document.documentElement.clientWidth - cardWidth - padding;

    let left = window.scrollX + rect.left + rect.width / 2 - cardWidth / 2;
    let top = window.scrollY + rect.bottom + 8;

    // Detect tall multi-paragraph selections (e.g. full news articles or essays)
    const isTallSelection = rect.height > 240;

    if (isTallSelection) {
      // Check if there is enough space on the right side of the selection to dock
      const spaceRight = window.innerWidth - rect.right;
      if (spaceRight >= cardWidth + 24) {
        left = window.scrollX + rect.right + 12;
      } else {
        // Center within visible screen
        left = window.scrollX + (window.innerWidth - cardWidth) / 2;
      }

      // Clamp vertical position to visible viewport so user doesn't have to scroll down 800px
      const viewportTop = Math.max(rect.top, 24);
      const maxViewportTop = Math.max(24, window.innerHeight - cardEstHeight - 32);
      top = window.scrollY + Math.min(viewportTop, maxViewportTop);
    } else {
      // Standard selection positioning
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < cardEstHeight + 20 && rect.top > cardEstHeight + 20) {
        top = window.scrollY + rect.top - cardEstHeight - 8;
      }
    }

    left = Math.max(minLeft, Math.min(left, maxLeft));

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
    isShowingSummary = false;
    currentSummaryData = null;
    isShowingExplanation = false;
    currentExplanationData = null;

    const explainBtn = shadowRoot.getElementById('bt-explain');
    if (explainBtn) {
      explainBtn.classList.remove('active');
      const isEn = currentTargetLang === 'en';
      const expSpan = explainBtn.querySelector('#bt-explain-text') || explainBtn.querySelector('span');
      if (expSpan) expSpan.textContent = isEn ? 'Explain' : 'সহজ ব্যাখ্যা';
      explainBtn.title = isEn ? 'Explain concept simply' : 'সহজ ভাষায় বিস্তারিত ব্যাখ্যা ও বাস্তব উদাহরণ দেখুন';
    }

    const sumBtn = shadowRoot.getElementById('bt-summarize');
    if (sumBtn) {
      sumBtn.classList.remove('active');
      const isEn = currentTargetLang === 'en';
      const sumSpan = sumBtn.querySelector('#bt-summarize-text') || sumBtn.querySelector('span');
      if (sumSpan) sumSpan.textContent = isEn ? 'Summary' : 'সারসংক্ষেপ';
      sumBtn.title = isEn ? 'Summarize key points' : 'সহজ ভাষায় মূল সারসংক্ষেপ দেখুন';
    }

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
        currentFormattedTranslationHtml = contentBox.innerHTML;
      } else {
        contentBox.textContent = '';
        currentFormattedTranslationHtml = '';
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
  /**
   * Toggles between full translation and an easy-to-understand explanation with real-world analogies.
   */
  async function toggleExplain() {
    const explainBtn = shadowRoot.getElementById('bt-explain');
    const sumBtn = shadowRoot.getElementById('bt-summarize');
    const contentBox = shadowRoot.getElementById('bt-content');
    if (!contentBox) return;

    const i18n = window.PromptHarness?.getI18nLabels
      ? window.PromptHarness.getI18nLabels(currentTargetLang)
      : (currentTargetLang === 'bn'
          ? { explain: 'সহজ ব্যাখ্যা', fullText: '↩ মূল অনুবাদ', explaining: 'সহজ ভাষায় বুঝিয়ে দেওয়া হচ্ছে...', explainBadge: '🧠 সহজ ভাষায় বিশ্লেষণ' }
          : (currentTargetLang === 'hi'
              ? { explain: 'सरल व्याख्या', fullText: '↩ मूल अनुवाद', explaining: 'सरल भाषा में समझ रहे हैं...', explainBadge: '🧠 सरल भाषा में व्याख्या' }
              : { explain: 'Explain', fullText: '↩ Full Text', explaining: 'Explaining in simple terms...', explainBadge: '🧠 Intuitive Breakdown' }));

    // If currently showing explanation, restore full translation
    if (isShowingExplanation) {
      isShowingExplanation = false;
      if (explainBtn) {
        explainBtn.classList.remove('active');
        const expSpan = explainBtn.querySelector('#bt-explain-text') || explainBtn.querySelector('span');
        if (expSpan) expSpan.textContent = i18n.explain || 'সহজ ব্যাখ্যা';
        explainBtn.title = i18n.explain || 'সহজ ব্যাখ্যা';
      }
      safeViewTransition(() => {
        contentBox.style.animation = 'none';
        void contentBox.offsetWidth;
        contentBox.style.animation = 'btFadeIn 0.2s ease';
        contentBox.innerHTML = currentFormattedTranslationHtml || currentTranslatedText;
      });
      return;
    }

    // If summary was showing, reset summary
    if (isShowingSummary) {
      isShowingSummary = false;
      if (sumBtn) {
        sumBtn.classList.remove('active');
        const sumSpan = sumBtn.querySelector('#bt-summarize-text') || sumBtn.querySelector('span');
        if (sumSpan) sumSpan.textContent = i18n.summary || 'সারসংক্ষেপ';
        sumBtn.title = i18n.summary || 'সারসংক্ষেপ';
      }
    }

    // Switch to explanation view
    if (!currentTranslatedText && !originalSelectedText) return;

    isShowingExplanation = true;
    if (explainBtn) {
      explainBtn.classList.add('active');
      const expSpan = explainBtn.querySelector('#bt-explain-text') || explainBtn.querySelector('span');
      if (expSpan) expSpan.textContent = i18n.fullText || '↩ মূল অনুবাদ';
      explainBtn.title = i18n.fullText || '↩ মূল অনুবাদ';
    }

    // If already generated for this active selection, render instantly
    if (currentExplanationData && currentExplanationData.html) {
      safeViewTransition(() => {
        contentBox.style.animation = 'none';
        void contentBox.offsetWidth;
        contentBox.style.animation = 'btFadeIn 0.2s ease';
        contentBox.innerHTML = currentExplanationData.html;
      });
      return;
    }

    // Show shimmering loading skeleton
    contentBox.innerHTML = `
      <div class="bt-explain-loading">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#7c3aed" style="animation: btPulse 1.2s infinite;"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-1.3l-.85-.6C7.8 13.16 7 11.42 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.42-.8 4.16-2.15 5.1z"/></svg>
        <span>${i18n.explaining || 'সহজ ভাষায় বুঝিয়ে দেওয়া হচ্ছে...'}</span>
      </div>
      <div class="bt-loading-skeleton" style="margin-top: 8px;">
        <div class="bt-skeleton-line"></div>
        <div class="bt-skeleton-line"></div>
        <div class="bt-skeleton-line short"></div>
      </div>
    `;

    try {
      if (window.SummarizerEngine?.explain) {
        currentExplanationData = await window.SummarizerEngine.explain(
          originalSelectedText,
          currentTranslatedText,
          currentTargetLang
        );
      } else {
        throw new Error('Explain engine not available');
      }

      if (isShowingExplanation) {
        safeViewTransition(() => {
          contentBox.style.animation = 'none';
          void contentBox.offsetWidth;
          contentBox.style.animation = 'btFadeIn 0.25s ease';
          contentBox.innerHTML = currentExplanationData.html;
        });
      }
    } catch (err) {
      console.warn('Explain error:', err);
      if (isShowingExplanation) {
        const fallback = window.SummarizerEngine?.smartExplain
          ? window.SummarizerEngine.smartExplain(currentTranslatedText || originalSelectedText, currentTargetLang)
          : { concept: currentTranslatedText, analogy: '', whyItMatters: '' };

        const isBn = currentTargetLang === 'bn';
        const isHi = currentTargetLang === 'hi';
        const sections = [
          { icon: '💡', title: isBn ? 'সহজ কথায়' : (isHi ? 'सरल शब्दों में' : 'In Plain Terms'), content: fallback.concept },
          { icon: '🔍', title: isBn ? 'বাস্তব জীবনের উদাহরণ' : (isHi ? 'वास्तविक जीवन का उदाहरण' : 'Real-World Analogy'), content: fallback.analogy },
          { icon: '⚡', title: isBn ? 'কেন এটি গুরুত্বপূর্ণ' : (isHi ? 'यह क्यों महत्वपूर्ण है' : 'Why It Matters'), content: fallback.whyItMatters }
        ];

        const badge = i18n.explainBadge || '🧠 সহজ ভাষায় বিশ্লেষণ';
        const itemsHtml = sections
          .map((sec) => `
            <div class="bt-explain-section">
              <div class="bt-explain-sec-title"><span class="bt-explain-icon">${sec.icon}</span><span>${sec.title}</span></div>
              <div class="bt-explain-sec-content">${sec.content}</div>
            </div>
          `.trim())
          .join('');

        const html = `<div class="bt-explain-container"><div class="bt-explain-header"><span class="bt-explain-badge">${badge}</span><span class="bt-explain-engine">Smart Explainer</span></div><div class="bt-explain-body">${itemsHtml}</div></div>`.trim();

        currentExplanationData = {
          sections,
          html,
          plainText: `${badge}:\n` + sections.map(s => `${s.icon} ${s.title}: ${s.content}`).join('\n\n')
        };

        safeViewTransition(() => {
          contentBox.innerHTML = html;
        });
      }
    }
  }

  /**
   * Toggles between full translation and an easy-to-understand key points summary.
   */
  async function toggleSummarize() {
    const sumBtn = shadowRoot.getElementById('bt-summarize');
    const explainBtn = shadowRoot.getElementById('bt-explain');
    const contentBox = shadowRoot.getElementById('bt-content');
    if (!contentBox) return;

    const i18n = window.PromptHarness?.getI18nLabels
      ? window.PromptHarness.getI18nLabels(currentTargetLang)
      : (currentTargetLang === 'bn'
          ? { summary: 'সারসংক্ষেপ', fullText: '↩ মূল অনুবাদ', summarizing: 'সহজ ভাষায় সারসংক্ষেপ তৈরি হচ্ছে...', badge: '💡 সহজ ভাষায় সারসংক্ষেপ' }
          : (currentTargetLang === 'hi'
              ? { summary: 'सारांश', fullText: '↩ মূল अनुवाद', summarizing: 'सरल भाषा में सारांश तैयार हो रहा है...', badge: '💡 मुख्य बातें (सरल सारांश)' }
              : { summary: 'Summary', fullText: '↩ Full Text', summarizing: 'Summarizing content...', badge: '💡 Key Takeaways' }));

    // If currently showing summary, restore full translation
    if (isShowingSummary) {
      isShowingSummary = false;
      if (sumBtn) {
        sumBtn.classList.remove('active');
        const sumSpan = sumBtn.querySelector('#bt-summarize-text') || sumBtn.querySelector('span');
        if (sumSpan) sumSpan.textContent = i18n.summary;
        sumBtn.title = i18n.summary;
      }
      safeViewTransition(() => {
        contentBox.style.animation = 'none';
        void contentBox.offsetWidth;
        contentBox.style.animation = 'btFadeIn 0.2s ease';
        contentBox.innerHTML = currentFormattedTranslationHtml || currentTranslatedText;
      });
      return;
    }

    // If explanation was showing, reset explanation
    if (isShowingExplanation) {
      isShowingExplanation = false;
      if (explainBtn) {
        explainBtn.classList.remove('active');
        const expSpan = explainBtn.querySelector('#bt-explain-text') || explainBtn.querySelector('span');
        if (expSpan) expSpan.textContent = i18n.explain || 'সহজ ব্যাখ্যা';
        explainBtn.title = i18n.explain || 'সহজ ব্যাখ্যা';
      }
    }

    // Switch to summary view
    if (!currentTranslatedText && !originalSelectedText) return;

    isShowingSummary = true;
    if (sumBtn) {
      sumBtn.classList.add('active');
      const sumSpan = sumBtn.querySelector('#bt-summarize-text') || sumBtn.querySelector('span');
      if (sumSpan) sumSpan.textContent = i18n.fullText;
      sumBtn.title = i18n.fullText;
    }

    // If already generated for this active selection, render instantly
    if (currentSummaryData && currentSummaryData.html) {
      safeViewTransition(() => {
        contentBox.style.animation = 'none';
        void contentBox.offsetWidth;
        contentBox.style.animation = 'btFadeIn 0.2s ease';
        contentBox.innerHTML = currentSummaryData.html;
      });
      return;
    }

    // Show shimmering loading skeleton
    contentBox.innerHTML = `
      <div class="bt-summary-loading">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#2563eb" style="animation: btPulse 1.2s infinite;"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>
        <span>${i18n.summarizing}</span>
      </div>
      <div class="bt-loading-skeleton" style="margin-top: 8px;">
        <div class="bt-skeleton-line"></div>
        <div class="bt-skeleton-line"></div>
        <div class="bt-skeleton-line short"></div>
      </div>
    `;

    try {
      if (window.SummarizerEngine) {
        currentSummaryData = await window.SummarizerEngine.summarize(
          originalSelectedText,
          currentTranslatedText,
          currentTargetLang
        );
      } else {
        throw new Error('SummarizerEngine not available');
      }

      if (isShowingSummary) {
        safeViewTransition(() => {
          contentBox.style.animation = 'none';
          void contentBox.offsetWidth;
          contentBox.style.animation = 'btFadeIn 0.25s ease';
          contentBox.innerHTML = currentSummaryData.html;
        });
      }
    } catch (err) {
      console.warn('Summarizer error:', err);
      if (isShowingSummary) {
        const fallbackPoints = (window.SummarizerEngine?.smartExtractKeyPoints)
          ? window.SummarizerEngine.smartExtractKeyPoints(currentTranslatedText, currentTargetLang)
          : [currentTranslatedText];

        const context = window.PromptHarness?.detectContext
          ? window.PromptHarness.detectContext(currentTranslatedText || originalSelectedText)
          : 'tech';
        const ctxI18n = window.PromptHarness?.getI18nLabels
          ? window.PromptHarness.getI18nLabels(currentTargetLang, context)
          : i18n;
        const badgeLabel = ctxI18n.badge || i18n.badge;

        const items = fallbackPoints.map((p) => {
          const cleanPt = p.replace(/^[-*•#\d.]+\s*/, '').trim();
          const match = cleanPt.match(/^((?:[^\s:]+[\s:]){1,3}[^:]+:)\s*(.*)$/);
          if (match) {
            return `<li class="bt-summary-item"><strong class="bt-summary-prefix">${match[1]}</strong> <span class="bt-summary-text">${match[2]}</span></li>`;
          }
          return `<li class="bt-summary-item"><span class="bt-summary-text">${cleanPt}</span></li>`;
        }).join('');

        const html = `<div class="bt-summary-container"><div class="bt-summary-header"><span class="bt-summary-badge">${badgeLabel}</span><span class="bt-summary-engine">Smart Summary</span></div><ul class="bt-summary-list">${items}</ul></div>`.trim();
        currentSummaryData = {
          points: fallbackPoints,
          html: html,
          plainText: `${badgeLabel}:\n` + fallbackPoints.map(p => `• ${p}`).join('\n')
        };
        safeViewTransition(() => {
          contentBox.innerHTML = html;
        });
      }
    }
  }

  /**
   * Hides all UI elements with smooth slide-out transition.
   */
  function hideAll(immediate = false) {
    hideTrigger(immediate);
    hideCard(immediate);
    activeSelectionRange = null;
  }

  function isVisible() {
    const isTriggerActive = triggerBtn && triggerBtn.style.display !== 'none' && !triggerBtn.classList.contains('bt-hiding');
    const isCardActive = cardEl && cardEl.style.display !== 'none' && !cardEl.classList.contains('bt-hiding');
    return isTriggerActive || isCardActive;
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
