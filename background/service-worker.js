/**
 * Bangla Inline Translator - Background Service Worker (Manifest V3)
 */

// Register Context Menu on install
chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'translate-selection-bangla',
    title: 'বাংলায় অনুবাদ দেখুন (Translate to Bangla)',
    contexts: ['selection']
  });

  // Initialize and migrate user settings safely
  const defaults = {
    targetLanguage: 'bn', // Default target: Bangla (বাংলা), can be switched internationally
    triggerMode: 'button', // 'button' or 'instant'
    preserveTechnicalTerms: true,
    fontSize: 'medium', // 'small', 'medium', 'large'
    preferNativeAI: true,
    autoDetectLang: true,
    enableTts: false, // Initially hidden; shown when user enables it in settings
    disabledDomains: [] // List of hostnames where translation is disabled
  };

  try {
    const current = await chrome.storage.sync.get('settings');
    const existing = current?.settings || {};
    const merged = { ...defaults, ...existing };
    if (!Array.isArray(merged.disabledDomains)) {
      merged.disabledDomains = [];
    }
    await chrome.storage.sync.set({ settings: merged });
  } catch (err) {
    console.warn('Failed to initialize or migrate settings:', err);
  }
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translate-selection-bangla' && tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'TRIGGER_SELECTION_TRANSLATION',
        selectionText: info.selectionText
      });
    } catch (err) {
      console.warn('Could not send message to tab:', err);
    }
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'TRANSLATE_FALLBACK') {
    (async () => {
      try {
        const text = message.text;
        if (!text || !text.trim()) {
          sendResponse({ success: false, error: 'Empty text' });
          return;
        }

        const sourceLang = message.sourceLang || 'auto';
        const targetLang = message.targetLang || 'bn';
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
          sourceLang
        )}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Translation fetch failed with status ${response.status}`);
        }

        const data = await response.json();
        // data[0] contains array of translated sentences: [[translated, original], ...]
        let translatedText = '';
        if (Array.isArray(data) && Array.isArray(data[0])) {
          translatedText = data[0]
            .map((item) => (item && item[0] ? item[0] : ''))
            .join('');
        }

        sendResponse({
          success: true,
          translatedText: translatedText || text,
          engine: 'web-fallback'
        });
      } catch (err) {
        console.error('Translation fallback error:', err);
        sendResponse({
          success: false,
          error: err.message || 'Translation request failed'
        });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (message.action === 'GET_TTS_AUDIO') {
    (async () => {
      try {
        const text = message.text;
        const lang = message.lang || 'bn';
        if (!text || !text.trim()) {
          sendResponse({ success: false, error: 'Empty text' });
          return;
        }

        const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
          text.trim()
        )}&tl=${encodeURIComponent(lang)}&client=gtx`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`TTS fetch failed with status ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk);
        }
        const base64 = btoa(binary);

        sendResponse({
          success: true,
          audioData: `data:audio/mp3;base64,${base64}`
        });
      } catch (err) {
        console.warn('TTS audio fetch error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (message.action === 'GET_SETTINGS') {
    (async () => {
      const data = await chrome.storage.sync.get('settings');
      sendResponse({ settings: data.settings || {} });
    })();
    return true;
  }
});
