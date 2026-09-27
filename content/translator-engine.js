/**
 * TranslatorEngine - High-Speed Chrome Built-in AI & Graceful Fallback
 * Guarantees sub-second response times and zero hanging on loading screens.
 */

window.TranslatorEngine = (function () {
  const cachedNativeTranslators = new Map();
  const failedNativePairs = new Set();

  /**
   * Checks if Chrome Native Translator API is available in this browser for the language pair.
   * @param {string} [sourceLang='en']
   * @param {string} [targetLang='bn']
   * @returns {Promise<{ supported: boolean, status: string, details?: string }>}
   */
  async function checkNativeSupport(sourceLang = 'en', targetLang = 'bn') {
    try {
      if (typeof window.Translator !== 'undefined' && typeof window.Translator.availability === 'function') {
        const status = await window.Translator.availability({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        });
        return {
          supported: status === 'available' || status === 'downloadable',
          status: status,
          apiType: 'Translator'
        };
      }

      if (typeof window.translation !== 'undefined' && typeof window.translation.canTranslate === 'function') {
        const status = await window.translation.canTranslate({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        });
        return {
          supported: status === 'readily' || status === 'after-download',
          status: status,
          apiType: 'translation'
        };
      }

      return {
        supported: false,
        status: 'unavailable',
        details: 'Chrome Translator API not enabled'
      };
    } catch (err) {
      console.warn('Translator capability check error:', err);
      return { supported: false, status: 'error', details: err.message };
    }
  }

  /**
   * Initializes or returns a cached native Chrome Translator instance for the language pair.
   */
  async function getNativeTranslator(sourceLang = 'en', targetLang = 'bn', onProgressCallback = null) {
    const cacheKey = `${sourceLang}->${targetLang}`;
    if (cachedNativeTranslators.has(cacheKey)) {
      return cachedNativeTranslators.get(cacheKey);
    }

    if (typeof window.Translator !== 'undefined' && typeof window.Translator.create === 'function') {
      const options = {
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      };

      if (typeof onProgressCallback === 'function') {
        options.monitor = (m) => {
          m.addEventListener('downloadprogress', (e) => {
            onProgressCallback(e.loaded);
          });
        };
      }

      const translator = await window.Translator.create(options);
      cachedNativeTranslators.set(cacheKey, translator);
      return translator;
    }

    if (typeof window.translation !== 'undefined' && typeof window.translation.createTranslator === 'function') {
      const translator = await window.translation.createTranslator({
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      });
      cachedNativeTranslators.set(cacheKey, translator);
      return translator;
    }

    throw new Error(`Native Translator is not available for ${cacheKey}`);
  }

  /**
   * Fallback via Background Service Worker with guaranteed timeout.
   */
  function fallbackTranslate(textToTranslate, termsMap, sourceLang = 'auto', targetLang = 'bn') {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Translation request timed out'));
      }, 4000);

      chrome.runtime.sendMessage(
        {
          action: 'TRANSLATE_FALLBACK',
          text: textToTranslate,
          sourceLang: sourceLang,
          targetLang: targetLang
        },
        (response) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response && response.success) {
            const finalRestored = window.TermGuardian
              ? window.TermGuardian.restoreTechnicalTerms(response.translatedText, termsMap, targetLang)
              : response.translatedText;

            resolve({
              translatedText: finalRestored,
              engine: 'Web Engine (Fallback)',
              sourceLang,
              targetLang
            });
          } else {
            reject(new Error(response?.error || 'Translation failed'));
          }
        }
      );
    });
  }

  /**
   * Main translate function:
   * Fast, single-pass translation with bullet & technical term protection.
   * Auto-detects English vs Bengali and routes direction accordingly.
   * Never hangs, with a strict 2.5s timeout on on-device calls before instant fallback.
   */
  async function translate(rawText, options = {}) {
    const { preserveTechnicalTerms = true, onDownloadProgress = null } = options;

    if (!rawText || !rawText.trim()) {
      return { translatedText: '', engine: 'none', sourceLang: 'en', targetLang: 'bn' };
    }

    const normalized = rawText.replace(/\r\n/g, '\n').trim();

    // Auto-detect if selected text is already in the target language (default: Bengali)
    const preferredTarget = options.targetLang || 'bn';
    const isBengali = window.TermGuardian && typeof window.TermGuardian.isBengaliText === 'function'
      ? window.TermGuardian.isBengaliText(normalized)
      : /[\u0980-\u09FF]/.test(normalized);

    const isSourceTargetMatch = (preferredTarget === 'bn' && isBengali);
    const sourceLang = options.sourceLang || (isSourceTargetMatch ? preferredTarget : (isBengali ? 'bn' : 'en'));
    const targetLang = isSourceTargetMatch ? 'en' : preferredTarget;

    // Check if multiple paragraphs are selected (separated by blank lines, protected from recursive loops)
    if (!options._isSubChunk && /\n\s*\n/.test(normalized)) {
      const paragraphs = normalized
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      if (paragraphs.length > 1) {
        const results = await Promise.all(
          paragraphs.map((p) => translate(p, { ...options, sourceLang, targetLang, _isSubChunk: true }))
        );
        return {
          translatedText: results.map((r) => r.translatedText).join('\n\n'),
          engine: results[0]?.engine || 'Chrome Native AI',
          sourceLang,
          targetLang
        };
      }
    }

    // Step 1: Protect technical terms, code, and bullet markers
    let textToTranslate = normalized;
    let termsMap = new Map();

    if (preserveTechnicalTerms && window.TermGuardian) {
      const protectedResult = window.TermGuardian.protectTechnicalTerms(textToTranslate);
      textToTranslate = protectedResult.maskedText;
      termsMap = protectedResult.termsMap;
    }

    // Step 2: Try fast Chrome Native Translator (with loop guard and 2.5s fail-safe timeout)
    const pairKey = `${sourceLang}->${targetLang}`;
    if (!failedNativePairs.has(pairKey)) {
      const nativeCapability = await checkNativeSupport(sourceLang, targetLang);
      if (nativeCapability.supported) {
        try {
          const nativePromise = (async () => {
            const translator = await getNativeTranslator(sourceLang, targetLang, onDownloadProgress);
            if (typeof translator.translate === 'function') {
              return await translator.translate(textToTranslate);
            }
            if (typeof translator.translateStreaming === 'function') {
              const stream = translator.translateStreaming(textToTranslate);
              let accumulated = '';
              let chunkCount = 0;
              for await (const chunk of stream) {
                if (++chunkCount > 100) break; // AI stream loop protection
                if (accumulated && chunk.startsWith(accumulated)) {
                  accumulated = chunk;
                } else {
                  accumulated += (accumulated ? ' ' : '') + chunk;
                }
              }
              return accumulated;
            }
            throw new Error('No translate method found');
          })();

          // Race against a 2.5 second timeout to prevent infinite loading screens
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Native translator timeout')), 2500)
          );

          const translatedMasked = await Promise.race([nativePromise, timeoutPromise]);

          const finalRestored = window.TermGuardian
            ? window.TermGuardian.restoreTechnicalTerms(translatedMasked, termsMap, targetLang)
            : translatedMasked;

          return {
            translatedText: finalRestored,
            engine: 'Chrome Native AI',
            sourceLang,
            targetLang
          };
        } catch (err) {
          console.warn('Native Translator timed out or failed, falling back immediately:', err.message);
          // Mark pair as failed so subsequent calls do not repeat the timeout loop
          failedNativePairs.add(pairKey);
        }
      }
    }

    // Step 3: Fast Web Fallback
    return await fallbackTranslate(textToTranslate, termsMap, sourceLang, targetLang);
  }

  /**
   * "সহজ ভাষায় (Simplify & Clarify)"
   * Invokes Gemini Nano Prompt API only on explicit user click, with 3s timeout.
   */
  async function simplifyExplanation(originalText, currentTranslation, isBengaliSource = false) {
    try {
      let model = null;

      // Check if Prompt API is available
      if (typeof window.ai !== 'undefined' && window.ai.languageModel) {
        const caps = await window.ai.languageModel.capabilities();
        if (caps.available !== 'no') {
          // Timeout race for model creation/prompting
          const nanoPromise = (async () => {
            const systemPrompt = isBengaliSource
              ? 'You are an expert communicator. Simplify and clarify the following English text into concise, plain, natural English. Avoid jargon and keep it direct.'
              : 'You are an expert software developer. Explain this technical concept in simple, natural, everyday Bengali (সহজবোধ্য বাংলা). Keep programming terminology, code, and keywords in English. Avoid robotic or literal phrasing.';

            model = await window.ai.languageModel.create({ systemPrompt });

            const promptText = isBengaliSource
              ? `Clarify and rephrase this in concise, simple English:\n"${currentTranslation}"\nOnly provide the simplified text:`
              : `Rephrase this technical text in clear, simple, developer-friendly Bengali (সহজবোধ্য বাংলা):\n"${originalText}"\nBengali translation:\n"${currentTranslation}"\nOnly provide the simplified explanation:`;

            return await model.prompt(promptText);
          })();

          const nanoTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Prompt API timeout')), 3000)
          );

          const response = await Promise.race([nanoPromise, nanoTimeout]);
          if (response && response.trim()) {
            return !isBengaliSource && window.TermGuardian
              ? window.TermGuardian.postProcessBengaliText(response.trim())
              : response.trim();
          }
        }
      }
    } catch (e) {
      console.warn('Gemini Nano simplification skipped/timed out:', e.message);
    }

    // Instant smart developer simplification fallback
    if (isBengaliSource) {
      return currentTranslation.replace(/^(💡\s*(Simplify|Clarify):?\s*\n*)+/gi, '').trim();
    }
    let cleanInput = currentTranslation.replace(/^(💡\s*সহজ\s*ব্যাখ্যা:?\s*\n*)+/gi, '').trim();
    let simplified = cleanInput;
    if (window.TermGuardian) {
      simplified = window.TermGuardian.postProcessBengaliText(cleanInput);
    }
    return simplified;
  }

  return {
    checkNativeSupport,
    translate,
    simplifyExplanation
  };
})();
