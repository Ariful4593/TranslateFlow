/**
 * SummarizerEngine - Chrome Built-in AI Summarizer & Intelligent Fallback
 * Provides crystal-clear, easy-to-understand summaries and key takeaways for any user.
 */

window.SummarizerEngine = (function () {
  let cachedSummarizerInstance = null;

  /**
   * Checks if Chrome Native Summarizer API or LanguageModel API is supported.
   */
  async function checkCapabilities() {
    try {
      // 1. Chrome Built-in Summarizer API
      if (typeof window.Summarizer !== 'undefined' && typeof window.Summarizer.availability === 'function') {
        const status = await window.Summarizer.availability();
        return {
          supported: status === 'available' || status === 'readily' || status === 'downloadable',
          status: status,
          apiType: 'Summarizer'
        };
      }

      if (typeof window.ai !== 'undefined' && typeof window.ai.summarizer !== 'undefined') {
        const capabilities = await window.ai.summarizer.capabilities();
        return {
          supported: capabilities.available === 'readily' || capabilities.available === 'after-download',
          status: capabilities.available,
          apiType: 'ai.summarizer'
        };
      }

      // 2. Chrome Built-in LanguageModel (Prompt API)
      if (typeof window.ai !== 'undefined' && typeof window.ai.languageModel !== 'undefined') {
        const capabilities = await window.ai.languageModel.capabilities();
        return {
          supported: capabilities.available === 'readily' || capabilities.available === 'after-download',
          status: capabilities.available,
          apiType: 'ai.languageModel'
        };
      }

      return { supported: false, status: 'unavailable', apiType: 'smart-fallback' };
    } catch (err) {
      console.warn('Summarizer capability check error:', err);
      return { supported: false, status: 'error', apiType: 'smart-fallback' };
    }
  }

  /**
   * Creates or returns cached Chrome Native Summarizer.
   */
  async function getNativeSummarizer(options = {}) {
    if (cachedSummarizerInstance) return cachedSummarizerInstance;

    const defaultOpts = {
      type: 'key-points',
      format: 'markdown',
      length: 'short',
      ...options
    };

    if (typeof window.Summarizer !== 'undefined' && typeof window.Summarizer.create === 'function') {
      cachedSummarizerInstance = await window.Summarizer.create(defaultOpts);
      return cachedSummarizerInstance;
    }

    if (typeof window.ai !== 'undefined' && typeof window.ai.summarizer?.create === 'function') {
      cachedSummarizerInstance = await window.ai.summarizer.create(defaultOpts);
      return cachedSummarizerInstance;
    }

    throw new Error('Native Summarizer is not available');
  }

  /**
   * Smart Linguistic Fallback (Learn with Sumit - LWS Explanatory Technique):
   * Breaks complex technical text into crystal-clear, intuitive takeaways:
   * 1. 🎯 মূল বিষয় (The Core Concept in simple terms)
   * 2. ⚙️ কীভাবে কাজ করে (Working Mechanism)
   * 3. 💡 বাস্তব সুবিধা বা টিপস (Practical Value / Best Practice)
   */
  function smartExtractKeyPoints(text, lang = 'bn') {
    if (!text || !text.trim()) return [];

    let processedText = text;
    if (lang === 'bn' && window.TermGuardian?.postProcessBengaliText) {
      processedText = window.TermGuardian.postProcessBengaliText(processedText);
    }

    // Split on sentence boundaries (Bangla dari, period, exclamation, question mark, newline)
    const rawSentences = processedText
      .split(/(?<=[।!?\n])|(?<=\.\s+)/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 12);

    if (rawSentences.length === 0) return [processedText.trim()];

    const candidates = [];

    for (let i = 0; i < rawSentences.length; i++) {
      let s = rawSentences[i];

      // Remove nested parenthetical clauses if they make the sentence overly dense
      s = s.replace(/\s*—[^—]{15,}—\s*/g, ', ');
      s = s.replace(/\s*\([^)]*[\w\s]{25,}[^)]*\)\s*/g, ' ');
      s = s.replace(/\s+/g, ' ').trim();

      // Skip introductory filler sentences
      if (
        /^(In fact|Notice that|As you know|Furthermore|Moreover|প্রকৃতপক্ষে|উল্লেখ্য যে|যেমনটি আমরা জানি)/i.test(s) &&
        candidates.length > 0
      ) {
        continue;
      }

      if (s.length >= 18) {
        candidates.push(s);
      }

      if (candidates.length >= 3) break;
    }

    const pointsList = candidates.length > 0 ? candidates : rawSentences.slice(0, 2);

    // Apply Learn with Sumit (LWS) structured conceptual prefixes
    const isEn = lang === 'en';
    const prefixes = isEn
      ? ['🎯 Core Concept: ', '⚙️ How it works: ', '💡 Practical Tip: ']
      : ['🎯 মূল বিষয়: ', '⚙️ কীভাবে কাজ করে: ', '💡 বাস্তব সুবিধা: '];

    return pointsList.map((pt, idx) => {
      const cleanPt = pt.replace(/^[-*•#\d.]+\s*/, '').trim();
      if (/^(🎯|⚙️|💡)/.test(cleanPt)) return cleanPt;
      const prefix = prefixes[idx] || (isEn ? '• ' : '• ');
      return `${prefix}${cleanPt}`;
    });
  }

  /**
   * Main Summarize function:
   * 1. Attempts Chrome Built-in AI Summarizer API (Gemini Nano).
   * 2. Translates the summary to target language if needed.
   * 3. Seamlessly falls back to Smart Linguistic Extractor for zero-lag performance.
   *
   * @param {string} sourceText - Original highlighted text (e.g. English)
   * @param {string} translatedText - Full translation of the text (e.g. Bengali)
   * @param {string} targetLang - Target language code (e.g. 'bn', 'en', 'es')
   * @returns {Promise<{ points: string[], html: string, plainText: string, engine: string }>}
   */
  async function summarize(sourceText, translatedText, targetLang = 'bn') {
    const isEn = targetLang === 'en';
    const textToProcess = sourceText || translatedText || '';

    // Attempt 1: Chrome Built-in Summarizer API
    try {
      const caps = await checkCapabilities();

      if (caps.supported && (caps.apiType === 'Summarizer' || caps.apiType === 'ai.summarizer')) {
        const summarizer = await getNativeSummarizer({
          type: 'key-points',
          format: 'markdown',
          length: 'short'
        });

        // Summarize source text with strict 3-second timeout
        const rawSummary = await Promise.race([
          summarizer.summarize(textToProcess),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Summarizer timeout')), 3000))
        ]);

        if (rawSummary && rawSummary.trim()) {
          // Parse lines from markdown
          let lines = rawSummary
            .split('\n')
            .map((l) => l.replace(/^[-*•#\d.]+\s*/, '').trim())
            .filter((l) => l.length > 5);

          // If summary is in English and target language is not English, translate it cleanly
          if (targetLang !== 'en' && window.TranslatorEngine) {
            const translatedLines = [];
            for (const line of lines) {
              try {
                const res = await window.TranslatorEngine.translate(line, {
                  sourceLang: 'en',
                  targetLang: targetLang,
                  preserveTechnicalTerms: true
                });
                translatedLines.push(res.translatedText || line);
              } catch (e) {
                translatedLines.push(line);
              }
            }
            lines = translatedLines;
          }

          if (lines.length > 0) {
            return formatResult(lines, 'Chrome AI Summarizer', targetLang);
          }
        }
      }
    } catch (err) {
      console.warn('Native Summarizer attempt skipped:', err.message);
    }

    // Attempt 2: Chrome Prompt API (window.ai.languageModel)
    try {
      if (typeof window.ai !== 'undefined' && typeof window.ai.languageModel?.create === 'function') {
        const systemPrompt = window.PromptHarness?.buildSystemPrompt
          ? window.PromptHarness.buildSystemPrompt(targetLang, 'summarization')
          : (isEn
              ? 'You are a master technical educator explaining concepts with utmost simplicity, intuition, and real-world clarity. Summarize into 2-3 structured takeaways (1. Core Concept in 1 line, 2. How it works, 3. Practical intuition). Keep all technical terms, code, and API names intact. Output only bullet points.'
              : 'আপনি সুমিত সাহা (Learn with Sumit)-এর মতো অত্যন্ত সহজে, প্রাঞ্জল ও বন্ধুত্বপূর্ণ ভাষায় প্রোগ্রামিং কনসেপ্ট বুঝিয়ে দেন। টেক্সটটিকে ৩টি পয়েন্টে বুঝিয়ে দিন: 🎯 মূল বিষয় (সহজ কথায় ১ লাইনে), ⚙️ কীভাবে কাজ করে, 💡 বাস্তব সুবিধা। সব টেকনিক্যাল টার্ম ও API নাম ইংরেজিতেই অক্ষত রাখুন। সরাসরি ৩টি বুলেট পয়েন্ট লিখুন।');

        const session = await window.ai.languageModel.create({
          systemPrompt: systemPrompt
        });

        const promptText = window.PromptHarness?.buildUserPrompt
          ? window.PromptHarness.buildUserPrompt(textToProcess, targetLang)
          : `Summarize this text:\n\n${textToProcess}`;
        const modelOutput = await Promise.race([
          session.prompt(promptText),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Prompt timeout')), 3000))
        ]);

        if (modelOutput && modelOutput.trim()) {
          const lines = modelOutput
            .split('\n')
            .map((l) => l.replace(/^[-*•#\d.]+\s*/, '').trim())
            .filter((l) => l.length > 5);

          if (lines.length > 0) {
            return formatResult(lines, 'Chrome AI Model', targetLang);
          }
        }
      }
    } catch (err) {
      console.warn('LanguageModel attempt skipped:', err.message);
    }

    // Attempt 3: High-speed Smart Linguistic Extraction (Guaranteed, Instant, Zero-Failure)
    const baseText = translatedText || sourceText;
    const extractedPoints = smartExtractKeyPoints(baseText, targetLang);
    return formatResult(extractedPoints, 'Smart Engine', targetLang);
  }

  /**
   * Formats bullet points into clean, accessible HTML and plain text with zero extra whitespace.
   */
  function formatResult(points, engine, targetLang) {
    const isEn = targetLang === 'en';
    const badgeLabel = isEn ? '💡 Key Takeaways' : '💡 সহজ ভাষায় সারসংক্ষেপ';

    const itemsHtml = points
      .map((p) => `<li class="bt-summary-item">${escapeHtml(p)}</li>`)
      .join('');

    const html = `<div class="bt-summary-container"><div class="bt-summary-header"><span class="bt-summary-badge">${badgeLabel}</span><span class="bt-summary-engine">${engine}</span></div><ul class="bt-summary-list">${itemsHtml}</ul></div>`.trim();

    const plainText = `${badgeLabel}:\n` + points.map((p) => `• ${p}`).join('\n');

    return {
      points,
      html,
      plainText,
      engine
    };
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    checkCapabilities,
    summarize,
    smartExtractKeyPoints
  };
})();
