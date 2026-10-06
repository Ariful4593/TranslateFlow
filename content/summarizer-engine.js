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
   * Identifies documentation links, navigation boilerplate, newspaper live update promos,
   * and call-to-action fragments (e.g., "Learn more in Cache Components", "আরও জানুন", "লাইভ আপডেটগুলি পড়ুন").
   */
  function isBoilerplateOrNavText(text) {
    if (!text || typeof text !== 'string') return true;
    const clean = text.trim();

    // 1. Newspaper Live-Update Promos & CTA patterns
    const newsPromoRegex = /(লাইভ আপডেট|লাইভ আপডেটগুলি|আপডেটগুলি পড়ুন|বিস্তারিত পড়ুন|আরও পড়ুন|লাইভ আপডেট পড়ুন|লাইভ আপডেট দেখুন|লাইভ কভারেজ|লাইভ খবর|লাইভ দেখুন|पढ़ें अमर उजाला|अमर उजाला की यह लाइव|लाइव अपडेट|लाइव अपडेट्स|लाइव कवरेज|लाइव खबर|पढ़ें|पढ़िए|live update|live updates|follow live|follow live updates|read live updates)/i;
    if (newsPromoRegex.test(clean)) {
      return true;
    }

    // 2. Navigation / Link / CTA patterns
    const ctaRegex = /^(learn more|read more|see also|check out|click here|find out more|refer to|for more information|for more info|for more details|view documentation|explore more|visit|get started|next steps)($|[\s.:—–])/i;
    const ctaInlineRegex = /(learn more in|learn more about|read more in|see also|check the docs|view the docs|for more details|আরও জানুন|বিস্তারিত জানুন|বিস্তারিত দেখুন|সম্পর্কে আরও জানুন|ডকুমেন্টেশন দেখুন|এখানে ক্লিক করুন|এখানে দেখুন|টুলস দেখুন|এবং আরও|এবং আরও অনেক|और जानें|अधिक जानकारी|अधिक पढ़ें)/i;

    if (ctaRegex.test(clean) || ctaInlineRegex.test(clean)) {
      if (clean.length < 80) return true;
    }

    // 3. Section headings / breadcrumbs
    if (/^(table of contents|quick start|overview|prerequisites|introduction|summary|conclusion|সূচিপত্র|ভূমিকা|সারসংক্ষেপ)($|[:—–])/i.test(clean)) {
      return true;
    }

    // 4. URLs, copyright, license notices
    if (/^(https?:\/\/|www\.|copyright|all rights reserved|©|license:)/i.test(clean)) {
      return true;
    }

    return false;
  }

  /**
   * Smart Linguistic Fallback:
   * Extracts clean, substantive key points directly from the content without promotional clutter.
   *
   * @param {string} text
   * @param {string} lang
   * @returns {string[]}
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
      .map((s) => s.trim().replace(/^[-*•#\d.]+\s*/, '').trim())
      .filter((s) => s.length > 10 && !isBoilerplateOrNavText(s));

    if (rawSentences.length === 0) {
      const single = processedText.trim().replace(/^[-*•#\d.]+\s*/, '').trim();
      return isBoilerplateOrNavText(single) ? [] : [single];
    }

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

      // Skip navigation or promotional boilerplate
      if (isBoilerplateOrNavText(s)) {
        continue;
      }

      if (s.length >= 15) {
        candidates.push(s);
      }

      if (candidates.length >= 3) break;
    }

    const pointsList = candidates.length > 0 ? candidates : rawSentences.slice(0, 3);

    // Detect domain context (tech, news, general)
    const context = window.PromptHarness?.detectContext
      ? window.PromptHarness.detectContext(processedText)
      : 'tech';

    // Format into natural, clean structured points
    const i18n = window.PromptHarness?.getI18nLabels
      ? window.PromptHarness.getI18nLabels(lang, context)
      : null;
    const prefixes = i18n?.prefixes || ['• ', '• ', '• '];

    return pointsList.map((pt, idx) => {
      const cleanPt = pt.replace(/^[-*•#\d.]+\s*/, '').trim();
      if (/^(🎯|⚙️|💡|📌|💬|📋|🔹)/.test(cleanPt)) return cleanPt;
      const prefix = prefixes[idx] || '• ';
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

    // Detect domain context (tech, news, general)
    const context = window.PromptHarness?.detectContext
      ? window.PromptHarness.detectContext(textToProcess)
      : 'tech';

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
            return formatResult(lines, 'Chrome AI Summarizer', targetLang, context);
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
          ? window.PromptHarness.buildSystemPrompt(targetLang, 'summarization', context)
          : (isEn
              ? 'You are a master educator explaining concepts with utmost simplicity, intuition, and real-world clarity. Summarize into 2-3 structured takeaways. Keep all key terms intact. Output only bullet points.'
              : 'টেক্সটটিকে সহজ ও প্রাঞ্জল ভাষায় ২ থেকে ৩টি পয়েন্টে সারসংক্ষেপ করে দিন। সরাসরি বুলেট পয়েন্ট লিখুন।');

        const session = await window.ai.languageModel.create({
          systemPrompt: systemPrompt
        });

        const promptText = window.PromptHarness?.buildUserPrompt
          ? window.PromptHarness.buildUserPrompt(textToProcess, targetLang, context)
          : `Summarize this text:\n\n${textToProcess}`;
        const modelOutput = await Promise.race([
          session.prompt(promptText),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Prompt timeout')), 3000))
        ]);

        if (modelOutput && modelOutput.trim()) {
          const lines = modelOutput
            .split('\n')
            .map((l) => l.replace(/^[-*•#\d.]+\s*/, '').trim())
            .filter((l) => l.length > 5 && !isBoilerplateOrNavText(l));

          if (lines.length > 0) {
            return formatResult(lines, 'Chrome AI Model', targetLang, context);
          }
        }
      }
    } catch (err) {
      console.warn('LanguageModel attempt skipped:', err.message);
    }

    // Attempt 3: High-speed Smart Linguistic Extraction (Guaranteed, Instant, Zero-Failure)
    const baseText = translatedText || sourceText;
    const extractedPoints = smartExtractKeyPoints(baseText, targetLang);
    return formatResult(extractedPoints, 'Smart Engine', targetLang, context);
  }

  /**
   * Smart Dynamic Text Explanation (Offline / Instant Zero-Lag Fallback)
   * Dynamically formats source & translated sentences into smooth, intuitive,
   * plain-language explanation paragraphs without hardcoded analogies or artificial labels.
   *
   * @param {string} sourceText
   * @param {string} translatedText
   * @param {string} lang
   * @returns {{ text: string, paragraphs: string[], html: string, concept: string, analogy: string, whyItMatters: string }}
   */
  function smartExplain(sourceText, translatedText, lang = 'bn') {
    const textToCheck = `${translatedText || ''} ${sourceText || ''}`.trim();
    if (!textToCheck) {
      const defaultText = lang === 'bn'
        ? 'প্রদত্ত বিষয়টির সহজ ও স্পষ্ট ব্যাখ্যা।'
        : (lang === 'hi' ? 'दिए गए विषय की सरल और स्पष्ट व्याख्या।' : 'Clear and simple explanation of the provided text.');
      return {
        text: defaultText,
        paragraphs: [defaultText],
        html: `<p class="bt-explain-para">${escapeHtml(defaultText)}</p>`,
        concept: defaultText,
        analogy: '',
        whyItMatters: ''
      };
    }

    let processedText = translatedText || sourceText;
    if (lang === 'bn' && window.TermGuardian?.postProcessBengaliText) {
      processedText = window.TermGuardian.postProcessBengaliText(processedText);
    }

    // Split sentences respecting Bengali dandi (।), Hindi danda (।), English period, exclamation, question mark, newlines
    const rawSentences = processedText
      .split(/(?<=[।!?\n])|(?<=\.\s+)/g)
      .map((s) => s.trim().replace(/^[-*•#\d.]+\s*/, '').trim())
      .filter((s) => s.length > 5 && !isBoilerplateOrNavText(s));

    let explanationParas = [];

    if (rawSentences.length === 0) {
      const fallbackClean = processedText.trim().replace(/^[-*•#\d.]+\s*/, '').trim();
      explanationParas.push(fallbackClean);
    } else if (rawSentences.length <= 2) {
      explanationParas.push(rawSentences.join(' '));
    } else {
      // 3 or more sentences: organize into 1-2 smooth, well-paced paragraphs
      const firstPara = rawSentences.slice(0, 2).join(' ');
      const secondPara = rawSentences.slice(2).join(' ');
      explanationParas.push(firstPara);
      if (secondPara) {
        explanationParas.push(secondPara);
      }
    }

    const plainText = explanationParas.join('\n\n');
    const html = explanationParas.map((p) => `<p class="bt-explain-para">${escapeHtml(p)}</p>`).join('');

    return {
      text: plainText,
      paragraphs: explanationParas,
      html,
      concept: explanationParas[0] || '',
      analogy: explanationParas[1] || '',
      whyItMatters: ''
    };
  }

  /**
   * Main Explain function:
   * 1. Uses Chrome Prompt API (window.ai.languageModel) for natural, conversational plain-language explanations.
   * 2. Seamlessly falls back to Smart Dynamic Text Explanation for instant, zero-lag answers.
   *
   * @param {string} sourceText
   * @param {string} translatedText
   * @param {string} targetLang
   * @returns {Promise<{ html: string, plainText: string, engine: string, text: string }>}
   */
  async function explain(sourceText, translatedText, targetLang = 'bn') {
    const textToProcess = sourceText || translatedText || '';
    const context = window.PromptHarness?.detectContext
      ? window.PromptHarness.detectContext(textToProcess)
      : 'tech';

    // Attempt 1: Chrome Built-in Prompt API (window.ai.languageModel)
    try {
      if (typeof window.ai !== 'undefined' && typeof window.ai.languageModel?.create === 'function') {
        const systemPrompt = window.PromptHarness?.buildSystemPrompt
          ? window.PromptHarness.buildSystemPrompt(targetLang, 'explanation', context)
          : (targetLang === 'bn'
              ? 'আপনি সহজ ও প্রাঞ্জল ভাষায় যেকোনো বিষয় বুঝিয়ে দেন। কোনো অপ্রয়োজনীয় লেবেল ছাড়া সরাসরি সহজ ভাষায় ব্যাখ্যা লিখুন।'
              : 'Explain the concept simply and intuitively in plain language without rigid category labels.');

        const session = await window.ai.languageModel.create({
          systemPrompt: systemPrompt
        });

        const promptText = window.PromptHarness?.buildUserPrompt
          ? window.PromptHarness.buildUserPrompt(textToProcess, targetLang, context, 'explanation')
          : `Explain this simply:\n\n${textToProcess}`;

        const modelOutput = await Promise.race([
          session.prompt(promptText),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Prompt timeout')), 3500))
        ]);

        if (modelOutput && modelOutput.trim()) {
          const parsed = parseExplanationOutput(modelOutput, targetLang);
          if (parsed.text) {
            return formatExplainResult(parsed, 'Chrome AI Explainer', targetLang);
          }
        }
      }
    } catch (err) {
      console.warn('AI Explainer attempt skipped:', err.message);
    }

    // Attempt 2: Smart Dynamic Text Explanation (Guaranteed, Instant, Zero-Lag Fallback)
    const result = smartExplain(sourceText, translatedText, targetLang);
    return formatExplainResult(result, 'Smart Explainer', targetLang);
  }

  /**
   * Parses freeform model explanation into clean, readable paragraphs.
   */
  function parseExplanationOutput(rawOutput, lang = 'bn') {
    const lines = rawOutput
      .split('\n')
      .map((l) => l.trim().replace(/^([💡🔍⚡🎯⚙️📌#*\d.]+\s*|[A-Za-z0-9\u0980-\u09FF\u0900-\u097F\s]{1,25}:\s*)/, '').trim())
      .filter((l) => l.length > 5 && !isBoilerplateOrNavText(l));

    if (lines.length === 0) {
      const clean = rawOutput.trim();
      return {
        text: clean,
        paragraphs: [clean]
      };
    }

    return {
      text: lines.join('\n\n'),
      paragraphs: lines
    };
  }

  /**
   * Formats explanation into clean, modern card HTML and plain text.
   */
  function formatExplainResult(explainData, engine, targetLang = 'bn') {
    const i18n = window.PromptHarness?.getI18nLabels
      ? window.PromptHarness.getI18nLabels(targetLang)
      : { explainBadge: targetLang === 'bn' ? '🧠 সহজ ব্যাখ্যা' : (targetLang === 'hi' ? '🧠 सरल व्याख्या' : '🧠 Simple Explanation') };
    const badgeLabel = i18n.explainBadge || (targetLang === 'bn' ? '🧠 সহজ ব্যাখ্যা' : (targetLang === 'hi' ? '🧠 सरल व्याख्या' : '🧠 Simple Explanation'));

    let bodyHtml = '';
    let plainTextContent = '';

    if (typeof explainData === 'string') {
      bodyHtml = `<p class="bt-explain-para">${escapeHtml(explainData)}</p>`;
      plainTextContent = explainData;
    } else if (Array.isArray(explainData.paragraphs) && explainData.paragraphs.length > 0) {
      bodyHtml = explainData.paragraphs.map((p) => `<p class="bt-explain-para">${escapeHtml(p)}</p>`).join('');
      plainTextContent = explainData.paragraphs.join('\n\n');
    } else if (explainData.html) {
      bodyHtml = explainData.html;
      plainTextContent = explainData.text || '';
    } else if (explainData.text) {
      bodyHtml = `<p class="bt-explain-para">${escapeHtml(explainData.text)}</p>`;
      plainTextContent = explainData.text;
    } else if (Array.isArray(explainData)) {
      bodyHtml = explainData
        .map((sec) => `<p class="bt-explain-para">${escapeHtml(sec.content || sec.title || '')}</p>`)
        .join('');
      plainTextContent = explainData.map((sec) => sec.content || sec.title || '').join('\n\n');
    }

    const html = `
      <div class="bt-explain-container">
        <div class="bt-explain-header">
          <span class="bt-explain-badge">${badgeLabel}</span>
        </div>
        <div class="bt-explain-body">${bodyHtml}</div>
      </div>
    `.trim();

    const plainText = `${badgeLabel}:\n${plainTextContent}`;

    return {
      html,
      plainText,
      engine,
      text: plainTextContent
    };
  }

  /**
   * Formats bullet points into clean, accessible HTML and plain text with zero extra whitespace.
   */
  function formatResult(points, engine, targetLang, context = 'tech') {
    const i18n = window.PromptHarness?.getI18nLabels
      ? window.PromptHarness.getI18nLabels(targetLang, context)
      : { badge: targetLang === 'bn' ? '💡 সারসংক্ষেপ' : (targetLang === 'hi' ? '💡 सारांश' : '💡 Summary') };
    const badgeLabel = i18n.badge || (targetLang === 'bn' ? '💡 সারসংক্ষেপ' : (targetLang === 'hi' ? '💡 सारांश' : '💡 Summary'));

    const itemsHtml = points
      .map((p) => {
        const cleanPt = p.replace(/^[-*•#\d.]+\s*/, '').trim();
        const escaped = escapeHtml(cleanPt);
        return `<li class="bt-summary-item"><span class="bt-summary-text">${escaped}</span></li>`;
      })
      .join('');

    const html = `<div class="bt-summary-container"><div class="bt-summary-header"><span class="bt-summary-badge">${badgeLabel}</span></div><ul class="bt-summary-list">${itemsHtml}</ul></div>`.trim();

    const plainText = `${badgeLabel}:\n` + points.map((p) => `• ${p.replace(/^[-*•#\d.]+\s*/, '').trim()}`).join('\n');

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
    smartExtractKeyPoints,
    explain,
    smartExplain
  };
})();
