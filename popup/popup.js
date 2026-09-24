/**
 * Bangla Inline Translator - Modern Popup Script
 * Manages site-level toggles, user preferences, and Chrome AI diagnostics.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Header Engine Badge elements
  const statusDot = document.getElementById('status-dot');
  const statusTitle = document.getElementById('status-title');
  const engineBadge = document.getElementById('engine-badge');
  const flagHelp = document.getElementById('flag-help');
  const copyFlagBtn = document.getElementById('copy-flag-btn');

  // Domain Hero elements
  const domainCard = document.getElementById('domain-item');
  const domainToggle = document.getElementById('domain-enable-toggle');
  const domainDisplay = document.getElementById('current-domain-display');
  const domainBadge = document.getElementById('domain-status-badge');

  // Settings inputs
  const triggerModeSelect = document.getElementById('trigger-mode');
  const preserveTermsCheckbox = document.getElementById('preserve-terms');
  const fontSizeSelect = document.getElementById('font-size');
  const enableTtsCheckbox = document.getElementById('enable-tts');

  // Test sandbox elements
  const testInput = document.getElementById('test-input');
  const testBtn = document.getElementById('test-btn');
  const testResult = document.getElementById('test-result');

  let currentDomain = '';
  let disabledDomains = [];

  // 1. Detect current active tab domain safely (with timeout protection)
  async function detectCurrentDomain() {
    try {
      // Prioritize lastFocusedWindow so popup window itself doesn't obscure the tab
      let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tabs || !tabs[0] || !tabs[0].url) {
        tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      }
      if (tabs && tabs[0] && tabs[0].url) {
        const url = new URL(tabs[0].url);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          return url.hostname;
        }
      }
    } catch (err) {
      console.warn('Could not query active tab domain:', err);
    }
    return '';
  }

  currentDomain = await detectCurrentDomain();

  if (currentDomain) {
    domainDisplay.textContent = currentDomain;
    domainDisplay.title = currentDomain;
  } else {
    domainDisplay.textContent = 'Browser page (Translation disabled)';
    domainToggle.disabled = true;
    updateDomainBadge(false);
  }

  function updateDomainBadge(isEnabled) {
    if (!domainBadge) return;
    if (isEnabled) {
      domainBadge.textContent = 'Active';
      domainBadge.className = 'site-status';
      domainCard?.classList.remove('disabled');
    } else {
      domainBadge.textContent = 'Disabled';
      domainBadge.className = 'site-status';
      domainCard?.classList.add('disabled');
    }
  }

  // 2. Check Chrome Native AI availability (Zero-loop safe diagnostic)
  try {
    let nativeAvailable = false;
    let apiStatus = 'unavailable';

    if (typeof window.Translator !== 'undefined' && typeof window.Translator.availability === 'function') {
      apiStatus = await window.Translator.availability({ sourceLanguage: 'en', targetLanguage: 'bn' });
      nativeAvailable = apiStatus === 'available';
    } else if (typeof window.translation !== 'undefined' && typeof window.translation.canTranslate === 'function') {
      apiStatus = await window.translation.canTranslate({ sourceLanguage: 'en', targetLanguage: 'bn' });
      nativeAvailable = apiStatus === 'readily';
    }

    if (nativeAvailable) {
      statusDot.className = 'engine-dot ready';
      statusTitle.textContent = 'Native AI ⚡';
      engineBadge.title = 'Chrome On-Device AI is active and ready';
      flagHelp.style.display = 'none';
    } else {
      statusDot.className = 'engine-dot fallback';
      statusTitle.textContent = 'Web AI 🌐';
      engineBadge.title = 'Web AI engine is active (On-device model offline/unavailable)';
    }
  } catch (err) {
    statusDot.className = 'engine-dot fallback';
    statusTitle.textContent = 'Web AI 🌐';
    engineBadge.title = 'Web AI Engine is active';
  }

  // Click on engine badge toggles flag instructions if not on native AI
  engineBadge.addEventListener('click', () => {
    if (!statusDot.classList.contains('ready')) {
      flagHelp.style.display = flagHelp.style.display === 'none' ? 'flex' : 'none';
    }
  });

  if (copyFlagBtn) {
    copyFlagBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('chrome://flags/#translation-api');
        copyFlagBtn.textContent = 'Copied!';
        setTimeout(() => (copyFlagBtn.textContent = 'Copy'), 1500);
      } catch (e) {}
    });
  }

  // 3. Load stored settings
  try {
    const { settings } = await chrome.storage.sync.get('settings');
    if (settings) {
      if (settings.triggerMode) triggerModeSelect.value = settings.triggerMode;
      if (typeof settings.preserveTechnicalTerms === 'boolean') {
        preserveTermsCheckbox.checked = settings.preserveTechnicalTerms;
      }
      if (settings.fontSize) fontSizeSelect.value = settings.fontSize;
      if (typeof settings.enableTts === 'boolean') {
        enableTtsCheckbox.checked = settings.enableTts;
      } else {
        enableTtsCheckbox.checked = false; // Initially hidden by default
      }
      if (Array.isArray(settings.disabledDomains)) {
        disabledDomains = settings.disabledDomains;
      }
    }
  } catch (e) {
    console.warn('Error loading sync settings:', e);
  }

  // Apply domain toggle initial state
  if (currentDomain) {
    const isDomainDisabled = disabledDomains.some(
      (d) => d.toLowerCase() === currentDomain.toLowerCase()
    );
    domainToggle.checked = !isDomainDisabled;
    updateDomainBadge(!isDomainDisabled);
  }

  // 4. Save settings on change
  async function saveSettings() {
    const updated = {
      triggerMode: triggerModeSelect.value,
      preserveTechnicalTerms: preserveTermsCheckbox.checked,
      fontSize: fontSizeSelect.value,
      enableTts: enableTtsCheckbox.checked,
      preferNativeAI: true,
      disabledDomains: disabledDomains
    };
    try {
      await chrome.storage.sync.set({ settings: updated });
    } catch (e) {
      console.warn('Error saving settings:', e);
    }
  }

  triggerModeSelect.addEventListener('change', saveSettings);
  preserveTermsCheckbox.addEventListener('change', saveSettings);
  fontSizeSelect.addEventListener('change', saveSettings);
  enableTtsCheckbox.addEventListener('change', saveSettings);

  domainToggle.addEventListener('change', async () => {
    if (!currentDomain) return;
    const isEnabled = domainToggle.checked;
    updateDomainBadge(isEnabled);

    const norm = currentDomain.toLowerCase();
    if (isEnabled) {
      disabledDomains = disabledDomains.filter((d) => d.toLowerCase() !== norm);
    } else {
      if (!disabledDomains.some((d) => d.toLowerCase() === norm)) {
        disabledDomains.push(norm);
      }
    }
    await saveSettings();
  });

  // 5. Quick Test Sandbox (Safe from freezing or loop locks)
  testBtn.addEventListener('click', async () => {
    const text = testInput.value.trim();
    if (!text) return;

    testResult.textContent = 'Translating...';
    testBtn.disabled = true;

    // Strict 6-second timeout fail-safe to prevent button loop lock
    let isFinished = false;
    const safetyTimer = setTimeout(() => {
      if (!isFinished) {
        testBtn.disabled = false;
        testResult.textContent = 'Request timed out. Please try again.';
      }
    }, 6000);

    try {
      let textToTranslate = text;
      let termsMap = new Map();

      if (preserveTermsCheckbox.checked && window.TermGuardian) {
        const protectedData = window.TermGuardian.protectTechnicalTerms(text);
        textToTranslate = protectedData.maskedText;
        termsMap = protectedData.termsMap;
      }

      const isBengali = window.TermGuardian?.isBengaliText
        ? window.TermGuardian.isBengaliText(text)
        : /[\u0980-\u09FF]/.test(text);
      const targetLang = isBengali ? 'en' : 'bn';

      chrome.runtime.sendMessage(
        {
          action: 'TRANSLATE_FALLBACK',
          text: textToTranslate,
          sourceLang: 'auto',
          targetLang: targetLang
        },
        (res) => {
          isFinished = true;
          clearTimeout(safetyTimer);
          testBtn.disabled = false;

          if (res && res.success) {
            let output = res.translatedText;
            if (window.TermGuardian) {
              output = window.TermGuardian.restoreTechnicalTerms(output, termsMap, targetLang);
            }
            testResult.textContent = output;
          } else {
            testResult.textContent = 'Translation error. Please try again.';
          }
        }
      );
    } catch (err) {
      isFinished = true;
      clearTimeout(safetyTimer);
      testBtn.disabled = false;
      testResult.textContent = `Error: ${err.message}`;
    }
  });
});
