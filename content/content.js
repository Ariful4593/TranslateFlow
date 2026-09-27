/**
 * Bangla Inline Translator - Main Content Script
 * Monitors text selections, coordinates translation with TermGuardian, and renders UI via UIPopover.
 */

(function () {
  let userSettings = {
    targetLanguage: 'bn',
    triggerMode: 'button', // 'button' | 'instant'
    preserveTechnicalTerms: true,
    fontSize: 'medium',
    enableTts: false,
    preferNativeAI: true,
    disabledDomains: []
  };

  let disabledDomains = [];
  const currentHostname = (window.location.hostname || '').toLowerCase();

  /**
   * Checks if translation is disabled for the current hostname or domain.
   */
  function isDomainDisabled() {
    if (!currentHostname) return false;
    return disabledDomains.some((d) => {
      const dom = d.toLowerCase().trim();
      return currentHostname === dom || currentHostname.endsWith('.' + dom);
    });
  }

  // Load user settings
  chrome.storage.sync.get('settings', (res) => {
    if (res && res.settings) {
      userSettings = { ...userSettings, ...res.settings };
      if (Array.isArray(res.settings.disabledDomains)) {
        disabledDomains = res.settings.disabledDomains;
      }
      if (isDomainDisabled() && window.UIPopover?.hideAll) {
        window.UIPopover.hideAll();
      }
      if (window.UIPopover?.updateSettings) {
        window.UIPopover.updateSettings(userSettings);
      }
    }
  });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.settings?.newValue) {
      userSettings = { ...userSettings, ...changes.settings.newValue };
      if (Array.isArray(changes.settings.newValue.disabledDomains)) {
        disabledDomains = changes.settings.newValue.disabledDomains;
      }
      if (isDomainDisabled() && window.UIPopover?.hideAll) {
        window.UIPopover.hideAll();
      }
      if (window.UIPopover?.updateSettings) {
        window.UIPopover.updateSettings(userSettings);
      }
    }
  });

  // Initialize UI Popover callbacks
  window.UIPopover.init({
    onTriggerClick: (selectedText, range) => {
      executeTranslation(selectedText, range);
    }
  });

  let activeTranslationSessionId = 0;

  /**
   * Translates the selected text and displays it in the card.
   */
  async function executeTranslation(text, range) {
    if (isDomainDisabled()) return;
    if (!text || !text.trim()) return;

    const currentSessionId = ++activeTranslationSessionId;
    const targetLang = userSettings.targetLanguage || 'bn';
    window.UIPopover.showCard(range, text, targetLang);

    try {
      const result = await window.TranslatorEngine.translate(text, {
        targetLang: targetLang,
        preserveTechnicalTerms: userSettings.preserveTechnicalTerms,
        onStreamChunk: (chunkText, isFinal) => {
          if (currentSessionId !== activeTranslationSessionId) return;
          window.UIPopover.setContent(chunkText, 'Chrome Native AI (Streaming)');
        },
        onDownloadProgress: (ratio) => {
          if (currentSessionId !== activeTranslationSessionId) return;
          window.UIPopover.setDownloadProgress(ratio);
        }
      });

      if (currentSessionId !== activeTranslationSessionId) return;
      window.UIPopover.setDownloadProgress(1); // Complete
      window.UIPopover.setContent(result.translatedText, result.engine, result.targetLang);
    } catch (err) {
      if (currentSessionId !== activeTranslationSessionId) return;
      console.error('Translation error:', err);
      window.UIPopover.setContent(
        `অনুবাদ সম্পন্ন করা যায়নি (${err.message || 'Error'})। দয়া করে আবার চেষ্টা করুন।`,
        'Error'
      );
    }
  }

  // Handle Mouse Selection
  let selectionTimeout = null;

  document.addEventListener('mouseup', (e) => {
    // If translation is disabled on this domain, do nothing
    if (isDomainDisabled()) return;

    // If a drag operation was just performed or active, ignore
    if (window.UIPopover?.isDragging && window.UIPopover.isDragging()) return;

    // Avoid re-triggering if click happened inside our host element
    const host = document.getElementById('bangla-translator-host');
    if (host && host.contains(e.target)) return;

    // Security & privacy: Never capture or translate selections from password inputs
    if (e.target && (e.target.type === 'password' || e.target.matches?.('input[type="password"]'))) {
      return;
    }

    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        return;
      }

      const selectedText = selection.toString().trim();
      // Only trigger for meaningful selections (more than 1 non-whitespace char)
      if (selectedText.length < 2) {
        return;
      }

      // Check if text is only punctuation or numbers
      if (!/[a-zA-Z\u0980-\u09FF]/.test(selectedText)) {
        return;
      }

      try {
        const range = selection.getRangeAt(0);

        if (userSettings.triggerMode === 'instant') {
          executeTranslation(selectedText, range);
        } else {
          window.UIPopover.showTrigger(range, selectedText, userSettings.targetLanguage || 'bn');
        }
      } catch (err) {
        console.warn('Could not read selection range:', err);
      }
    }, 120);
  });

  // Hide UI on click outside
  document.addEventListener('mousedown', (e) => {
    if (window.UIPopover?.isDragging && window.UIPopover.isDragging()) return;

    const host = document.getElementById('bangla-translator-host');
    if (host && (e.target === host || host.contains(e.target))) {
      return;
    }

    // If clicking anywhere else on page, hide popover
    if (window.UIPopover.isVisible()) {
      window.UIPopover.hideAll();
    }
  });

  // Hide on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.UIPopover.isVisible()) {
      window.UIPopover.hideAll();
    }
  });

  // Listen for context menu triggers from background worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'TRIGGER_SELECTION_TRANSLATION') {
      if (isDomainDisabled()) {
        sendResponse({ received: true, disabled: true });
        return;
      }
      const selection = window.getSelection();
      let text = message.selectionText;
      let range = null;

      if (selection && !selection.isCollapsed) {
        text = text || selection.toString().trim();
        try {
          range = selection.getRangeAt(0);
        } catch (e) {}
      }

      if (text) {
        executeTranslation(text, range);
      }
      sendResponse({ received: true });
    }
  });
})();
