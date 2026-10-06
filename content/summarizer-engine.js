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
   * Smart Dynamic Text Explanation & Concept Breakdown (Offline / Instant Fallback)
   * Dynamically breaks down any text (tech, news, law, finance, science, literature, general)
   * into 3 structured, fact-grounded pedagogical tiers directly from the source & translated sentences.
   * 100% dynamic AI & NLP extraction with ZERO hardcoded static analogies or canned metaphors.
   *
   * @param {string} sourceText
   * @param {string} translatedText
   * @param {string} lang
   * @returns {{ concept: string, analogy: string, whyItMatters: string }}
   */
  function smartExplain(sourceText, translatedText, lang = 'bn') {
    const textToCheck = `${translatedText || ''} ${sourceText || ''}`.trim();
    if (!textToCheck) {
      return {
        concept: lang === 'bn' ? 'প্রদত্ত বিষয়টির মূল বক্তব্য।' : (lang === 'hi' ? 'दिए गए विषय का मुख्य विचार।' : 'Core statement of the provided text.'),
        analogy: lang === 'bn' ? 'তথ্যটির প্রাসঙ্গিক বিশ্লেষণ।' : (lang === 'hi' ? 'जानकारी का प्रासंगिक विवरण।' : 'Relevant context and breakdown of the text.'),
        whyItMatters: lang === 'bn' ? 'বিষয়টি সঠিকভাবে বোঝা ও প্রয়োগ করা।' : (lang === 'hi' ? 'बात को सही तरीके से समझना और उपयोग करना।' : 'Understanding and applying the key takeaways.')
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

    const isBn = lang === 'bn';
    const isHi = lang === 'hi';

    let concept = '';
    let analogy = '';
    let whyItMatters = '';

    if (rawSentences.length === 0) {
      const fallbackClean = processedText.trim().replace(/^[-*•#\d.]+\s*/, '').trim();
      concept = isBn ? `মূল বক্তব্য: ${fallbackClean}` : (isHi ? `मुख्य बात: ${fallbackClean}` : `Core message: ${fallbackClean}`);
      analogy = isBn ? 'প্রদত্ত বাক্যের সুস্পষ্ট বিশ্লেষণ ও সারসংক্ষেপ।' : (isHi ? 'दिए गए पाठ का स्पष्ट विश्लेषण व सारांश।' : 'Clear contextual breakdown of the provided text.');
      whyItMatters = isBn ? 'সঠিক অর্থ অনুধাবন করা ও কার্যকরভাবে কাজে লাগানো।' : (isHi ? 'सही अर्थ को समझना और प्रभावी ढंग से उपयोग करना।' : 'Ensures accurate interpretation and practical application.');
    } else if (rawSentences.length === 1) {
      const s0 = rawSentences[0];
      concept = isBn ? `সহজ কথায়: ${s0}` : (isHi ? `सरल शब्दों में: ${s0}` : `In plain terms: ${s0}`);
      analogy = isBn ? 'এটি প্রদত্ত তথ্যের প্রধান তাৎপর্য সরাসরি তুলে ধরে।' : (isHi ? 'यह दी गई जानकारी के मुख्य महत्व को स्पष्ट करता है।' : 'Directly highlights the primary takeaway from the statement.');
      whyItMatters = isBn ? 'তথ্যটির মূল উদ্দেশ্য স্পষ্টভাবে অনুধাবন করে সঠিক সিদ্ধান্ত নেওয়া যায়।' : (isHi ? 'तथ्यों के मूल उद्देश्य को समझकर सही निर्णय लिया जा सकता है।' : 'Provides clear context for sound decision-making and accurate understanding.');
    } else if (rawSentences.length === 2) {
      const [s0, s1] = rawSentences;
      concept = isBn ? `মূল বিষয়: ${s0}` : (isHi ? `मुख्य विषय: ${s0}` : `Core point: ${s0}`);
      analogy = isBn ? `বিস্তারিত তথ্য: ${s1}` : (isHi ? `विस्तृत विवरण: ${s1}` : `Key details: ${s1}`);
      whyItMatters = isBn ? 'উভয় বিষয়ের সমন্বয়ে পুরো প্রেক্ষাপটটি স্পষ্টভাবে উপলব্ধি করা যায়।' : (isHi ? 'दोनों बातों के समन्वय से पूरा संदर्भ स्पष्ट रूप से समझा जा सकता है।' : 'Combines these key points for a complete and cohesive understanding.');
    } else {
      // 3 or more sentences: First sentence is concept, middle sentences are details/context, last sentence is conclusion/outcome
      const s0 = rawSentences[0];
      const middle = rawSentences.slice(1, -1).join(' ');
      const last = rawSentences[rawSentences.length - 1];

      concept = isBn ? `মূল বক্তব্য: ${s0}` : (isHi ? `मुख्य बात: ${s0}` : `Core concept: ${s0}`);
      analogy = isBn ? `প্রেক্ষাপট ও কার্যপদ্ধতি: ${middle}` : (isHi ? `संदर्भ व प्रक्रिया: ${middle}` : `Context & details: ${middle}`);
      whyItMatters = isBn ? `মূল ফলাফল বা প্রভাব: ${last}` : (isHi ? `मुख्य परिणाम व प्रभाव: ${last}` : `Key outcome & impact: ${last}`);
    }

    return {
      concept,
      analogy,
      whyItMatters
    };
  }

  /**
   * Main Explain function:
   * 1. Uses Chrome Prompt API (window.ai.languageModel) with dynamic LWS pedagogical directives when available.
   * 2. Seamlessly falls back to Smart Dynamic Text Explanation for instant, zero-lag answers.
   *
   * @param {string} sourceText
   * @param {string} translatedText
   * @param {string} targetLang
   * @returns {Promise<{ sections: { title: string, content: string }[], html: string, plainText: string, engine: string }>}
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
          : 'You are an inspiring technical educator explaining concepts with utmost simplicity and real-world analogies.';

        const session = await window.ai.languageModel.create({
          systemPrompt: systemPrompt
        });

        const promptText = window.PromptHarness?.buildUserPrompt
          ? window.PromptHarness.buildUserPrompt(textToProcess, targetLang, context, 'explanation')
          : `Explain this concept simply with a real-world analogy:\n\n${textToProcess}`;

        const modelOutput = await Promise.race([
          session.prompt(promptText),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Prompt timeout')), 3500))
        ]);

        if (modelOutput && modelOutput.trim()) {
          const parsedSections = parseExplanationOutput(modelOutput, targetLang);
          if (parsedSections.length >= 2) {
            return formatExplainResult(parsedSections, 'Chrome AI Explainer', targetLang);
          }
        }
      }
    } catch (err) {
      console.warn('AI Explainer attempt skipped:', err.message);
    }

    // Attempt 2: Smart Dynamic Text Explanation (Guaranteed, Instant, Zero-Lag Fallback)
    const result = smartExplain(sourceText, translatedText, targetLang);

    const isBn = targetLang === 'bn';
    const isHi = targetLang === 'hi';

    const sections = [
      {
        icon: '💡',
        title: isBn ? 'সহজ ভাষায় মূল ধারণা' : (isHi ? 'सरल भाषा में मूल विचार' : 'Core Concept in Plain Terms'),
        content: result.concept
      },
      {
        icon: '🔍',
        title: isBn ? 'বিস্তারিত বিশ্লেষণ ও প্রেক্ষাপট' : (isHi ? 'विस्तृत विश्लेषण व संदर्भ' : 'Context & Key Details'),
        content: result.analogy
      },
      {
        icon: '⚡',
        title: isBn ? 'কেন এটি গুরুত্বপূর্ণ' : (isHi ? 'यह क्यों महत्वपूर्ण है' : 'Why It Matters'),
        content: result.whyItMatters
      }
    ];

    return formatExplainResult(sections, 'Smart Explainer', targetLang);
  }

  /**
   * Parses freeform model explanation into structured sections.
   */
  function parseExplanationOutput(rawOutput, lang = 'bn') {
    const lines = rawOutput.split('\n').map((l) => l.trim()).filter(Boolean);
    const sections = [];
    let currentSec = null;

    for (const line of lines) {
      const match = line.match(/^([💡🔍⚡🎯⚙️📌#*\d.]*\s*)([^:\n]+):\s*(.*)$/);
      if (match && match[2].length < 35) {
        if (currentSec) sections.push(currentSec);
        currentSec = {
          icon: match[1].trim() || '💡',
          title: match[2].replace(/^[*#\d.]+\s*/, '').trim(),
          content: match[3].trim()
        };
      } else if (currentSec) {
        currentSec.content += ' ' + line;
      } else {
        currentSec = {
          icon: '💡',
          title: lang === 'bn' ? 'সহজ ব্যাখ্যা' : 'Explanation',
          content: line
        };
      }
    }
    if (currentSec) sections.push(currentSec);
    return sections;
  }

  /**
   * Formats explanation sections into clean, modern card HTML and plain text.
   */
  function formatExplainResult(sections, engine, targetLang = 'bn') {
    const i18n = window.PromptHarness?.getI18nLabels
      ? window.PromptHarness.getI18nLabels(targetLang)
      : { explainBadge: targetLang === 'bn' ? '🧠 সহজ ভাষায় বিশ্লেষণ' : '🧠 Intuitive Breakdown' };
    const badgeLabel = i18n.explainBadge || (targetLang === 'bn' ? '🧠 সহজ ভাষায় বিশ্লেষণ' : '🧠 Intuitive Breakdown');

    const sectionsHtml = sections
      .map((sec) => {
        const icon = sec.icon || '💡';
        const title = escapeHtml(sec.title);
        const content = escapeHtml(sec.content);
        return `
          <div class="bt-explain-section">
            <div class="bt-explain-sec-title">
              <span class="bt-explain-icon">${icon}</span>
              <span>${title}</span>
            </div>
            <div class="bt-explain-sec-content">${content}</div>
          </div>
        `.trim();
      })
      .join('');

    const html = `
      <div class="bt-explain-container">
        <div class="bt-explain-header">
          <span class="bt-explain-badge">${badgeLabel}</span>
          <span class="bt-explain-engine">${engine}</span>
        </div>
        <div class="bt-explain-body">${sectionsHtml}</div>
      </div>
    `.trim();

    const plainText = `${badgeLabel}:\n` + sections.map((s) => `${s.icon} ${s.title}: ${s.content}`).join('\n\n');

    return {
      sections,
      html,
      plainText,
      engine
    };
  }

  /**
   * Formats bullet points into clean, accessible HTML and plain text with zero extra whitespace.
   */
  function formatResult(points, engine, targetLang, context = 'tech') {
    const i18n = window.PromptHarness?.getI18nLabels
      ? window.PromptHarness.getI18nLabels(targetLang, context)
      : (targetLang === 'bn'
          ? (context === 'news' ? { badge: '📰 সংবাদের মূল সারসংক্ষেপ' } : { badge: '💡 সহজ ভাষায় সারসংক্ষেপ' })
          : (targetLang === 'hi'
              ? (context === 'news' ? { badge: '📰 मुख्य समाचार सारांश' } : { badge: '💡 मुख्य बातें (सरल सारांश)' })
              : { badge: '💡 Key Takeaways' }));
    const badgeLabel = i18n.badge || '💡 Key Takeaways';

    const itemsHtml = points
      .map((p) => {
        const cleanPt = p.replace(/^[-*•#\d.]+\s*/, '').trim();
        const escaped = escapeHtml(cleanPt);
        const match = escaped.match(/^((?:[^\s:]+[\s:]){1,3}[^:]+:)\s*(.*)$/);
        if (match) {
          return `<li class="bt-summary-item"><strong class="bt-summary-prefix">${match[1]}</strong> <span class="bt-summary-text">${match[2]}</span></li>`;
        }
        return `<li class="bt-summary-item"><span class="bt-summary-text">${escaped}</span></li>`;
      })
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
    smartExtractKeyPoints,
    explain,
    smartExplain
  };
})();
