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
   * Identifies documentation links, navigation boilerplate, and call-to-action fragments
   * (e.g., "Learn more in Cache Components", "আরও জানুন", "Read more").
   */
  function isBoilerplateOrNavText(text) {
    if (!text || typeof text !== 'string') return true;
    const clean = text.trim();

    // 1. Navigation / Link / CTA patterns
    const ctaRegex = /^(learn more|read more|see also|check out|click here|find out more|refer to|for more information|for more info|for more details|view documentation|explore more|visit|get started|next steps)($|[\s.:—–])/i;
    const ctaInlineRegex = /(learn more in|learn more about|read more in|see also|check the docs|view the docs|for more details|আরও জানুন|বিস্তারিত জানুন|বিস্তারিত দেখুন|সম্পর্কে আরও জানুন|ডকুমেন্টেশন দেখুন|এখানে ক্লিক করুন|এখানে দেখুন|টুলস দেখুন|এবং আরও|এবং আরও অনেক|और जानें|अधिक जानकारी|अधिक पढ़ें)/i;

    if (ctaRegex.test(clean) || ctaInlineRegex.test(clean)) {
      if (clean.length < 65) return true;
    }

    // 2. Section headings / breadcrumbs
    if (/^(table of contents|quick start|overview|prerequisites|introduction|summary|conclusion|সূচিপত্র|ভূমিকা|সারসংক্ষেপ)($|[:—–])/i.test(clean)) {
      return true;
    }

    // 3. URLs, copyright, license notices
    if (/^(https?:\/\/|www\.|copyright|all rights reserved|©|license:)/i.test(clean)) {
      return true;
    }

    return false;
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
      .filter((s) => s.length > 12 && !isBoilerplateOrNavText(s));

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

      // Skip navigation boilerplate or "Learn more" links
      if (isBoilerplateOrNavText(s)) {
        continue;
      }

      if (s.length >= 18) {
        candidates.push(s);
      }

      if (candidates.length >= 3) break;
    }

    // Detect domain context (tech, news, general)
    const context = window.PromptHarness?.detectContext
      ? window.PromptHarness.detectContext(processedText)
      : 'tech';

    const pointsList = candidates.length > 0 ? candidates : rawSentences.slice(0, 2);

    // Apply context-aware structured prefixes according to target language
    const i18n = window.PromptHarness?.getI18nLabels
      ? window.PromptHarness.getI18nLabels(lang, context)
      : (lang === 'bn'
          ? (context === 'news'
              ? { prefixes: ['📌 মূল সংবাদ: ', '💬 কী বলা হয়েছে: ', '📋 মূল সিদ্ধান্ত বা প্রভাব: '] }
              : { prefixes: ['🎯 মূল বিষয়: ', '⚙️ কীভাবে কাজ করে: ', '💡 বাস্তব সুবিধা: '] })
          : { prefixes: ['📌 Key Event: ', '💬 What was said: ', '📋 Impact: '] });
    const prefixes = i18n.prefixes || ['📌 ', '💬 ', '📋 '];

    return pointsList.map((pt, idx) => {
      const cleanPt = pt.replace(/^[-*•#\d.]+\s*/, '').trim();
      if (/^(🎯|⚙️|💡|📌|💬|📋|🔹)/.test(cleanPt)) return cleanPt;
      const prefix = prefixes[idx] || (lang === 'bn' ? '• ' : '• ');
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
   * Smart Pedagogical Analogy & Explanation Generator (Learn with Sumit - LWS Style)
   * Converts complex technical concepts into intuitive real-world analogies:
   * 1. 💡 সহজ কথায় (What it actually is in plain, friendly terms)
   * 2. 🔍 বাস্তব জীবনের উদাহরণ / রূপক (Vivid relatable real-world analogy)
   * 3. ⚡ কেন এটি গুরুত্বপূর্ণ (Practical benefit / engineering utility)
   */
  function smartExplain(text, lang = 'bn') {
    if (!text || !text.trim()) {
      return {
        concept: lang === 'bn' ? 'প্রদত্ত তথ্যটির মূল ভাব।' : 'The core concept.',
        analogy: lang === 'bn' ? 'বাস্তব জীবনের সাধারণ নিয়মের মতোই এটি কাজ করে।' : 'Works just like everyday life principles.',
        whyItMatters: lang === 'bn' ? 'সঠিকভাবে বুঝলে কাজ অনেক সহজ ও দ্রুত হয়।' : 'Understanding this makes work faster and simpler.'
      };
    }

    let processedText = text;
    if (lang === 'bn' && window.TermGuardian?.postProcessBengaliText) {
      processedText = window.TermGuardian.postProcessBengaliText(processedText);
    }

    const lower = text.toLowerCase();
    const isBn = lang === 'bn';
    const isHi = lang === 'hi';
    const isEn = lang === 'en';

    // 1. Concept: extract the first clear informative sentence
    const rawSentences = processedText
      .split(/(?<=[।!?\n])|(?<=\.\s+)/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 12 && !isBoilerplateOrNavText(s));

    const firstSentence = rawSentences[0] || processedText.trim();
    const conceptSummary = firstSentence.replace(/^[-*•#\d.]+\s*/, '').trim();

    // 2. Contextual Analogy selection based on technical patterns
    let analogy = '';
    let whyItMatters = '';

    if (/streaming|suspense|chunk|stream/i.test(lower)) {
      if (isBn) {
        analogy = 'যেমন ধরুন রেস্টুরেন্টে খাবার অর্ডার দিলে ওয়েটার পুরো মেনু একসাথে রান্না হওয়ার জন্য অপেক্ষা না করে, পানি ও সালাদ তৈরি হওয়ামাত্রই আপনার টেবিলে এনে দেয় এবং প্রধান খাবারটি রান্না হতে হতে আপনি সালাদ উপভোগ করতে পারেন।';
        whyItMatters = 'ইউজারকে পুরো ডেটা বা পেজ লোড হওয়ার জন্য অলস বসে থাকতে হয় না; স্ক্রিনে দ্রুত কনটেন্ট দেখা যায় এবং অ্যাপ অনেক দ্রুত অনুভূত হয়।';
      } else if (isHi) {
        analogy = 'जैसे रेस्तरां में वेटर पूरा खाना एक साथ बनने का इंतज़ार किए बिना, जो चीज़ तैयार है (जैसे सलाद और पानी) उसे तुरंत आपकी मेज पर पहुंचा देता है।';
        whyItMatters = 'उपयोगकर्ता को पूरे पेज के लोड होने का इंतज़ार नहीं करना पड़ता, जिससे ऐप बहुत तेज़ और स्मूथ लगता है।';
      } else {
        analogy = 'Like a restaurant waiter serving water and appetizers immediately while the main course is still cooking in the kitchen.';
        whyItMatters = 'Users see meaningful content immediately without blocking the entire interface on slow data fetches.';
      }
    } else if (/component|react|props|state|render|ui/i.test(lower)) {
      if (isBn) {
        analogy = 'যেমন ধরুন একটি লেগো (Lego) সেটের ব্লক—প্রতিটি ব্লক আলাদা আলাদাভাবে তৈরি থাকে এবং সেগুলো একসাথে জোড়া লাগিয়ে যেমন আস্ত একটি সুন্দর বাড়ি বা গাড়ি বানানো যায়, তেমনি কোডিংয়েও ছোট ছোট কম্পোনেন্ট জোড়া দিয়ে পুরো ওয়েবসাইট তৈরি করা হয়।';
        whyItMatters = 'একই কম্পোনেন্ট বারবার রিইউজ (পুনর্ব্যবহার) করা যায় এবং কোডে কোনো সমস্যা হলে পুরো ওয়েবসাইট ঘাঁটতে হয় না, শুধু নির্দিষ্ট কম্পোনেন্টটি ঠিক করলেই হয়।';
      } else if (isHi) {
        analogy = 'जैसे लेगो (Lego) ब्लॉक से अलग-अलग टुकड़े जोड़कर पूरा महल या कार बनाई जाती है, वैसे ही छोटे-छोटे कंपोनेंट्स जोड़कर पूरी वेबसाइट बनती है।';
        whyItMatters = 'कोड को बार-बार दोबारा इस्तेमाल किया जा सकता है और रखरखाव बेहद आसान हो जाता है।';
      } else {
        analogy = 'Like building a house with modular Lego blocks where each brick is self-contained and snaps together seamlessly.';
        whyItMatters = 'Enables high reusability, clean separation of concerns, and instant local updates without full-page reloads.';
      }
    } else if (/audio|sound|audiocontext|track|<audio>/i.test(lower)) {
      if (isBn) {
        analogy = 'যেমন একটি আধুনিক সাউন্ড স্টুডিওর মিক্সিং কনসোল—যেখানে মাইক্রোফোন, গিটার ও ড্রামের সাউন্ড আলাদা তার দিয়ে এনে যুক্ত করা হয় এবং সাউন্ড ইঞ্জিনিয়ার ইচ্ছেমতো ভলিউম ও ইফেক্ট নিয়ন্ত্রণ করতে পারেন।';
        whyItMatters = 'ব্রাউজারে সরাসরি অত্যন্ত নিখুঁতভাবে অডিও প্লেব্যাক, ভলিউম কন্ট্রোল এবং ওয়েব অ্যাক্সেসিবিলিটি নিশ্চিত করা যায়।';
      } else if (isHi) {
        analogy = 'जैसे एक साउंड स्टूडियो का मिक्सिंग कंसोल, जहाँ कई वाद्ययंत्रों की आवाज़ को एक साथ जोड़कर नियंत्रित किया जाता है।';
        whyItMatters = 'ब्राउज़र में सीधे ऑडियो प्लेबैक और एक्सेसिबिलिटी को सटीक रूप से नियंत्रित किया जा सकता है।';
      } else {
        analogy = 'Like a professional sound recording mixer where multiple audio tracks and effects are plugged into a central board.';
        whyItMatters = 'Gives developers fine-grained programmatic control over browser audio pipelines and web accessibility.';
      }
    } else if (/cache|caching|memo/i.test(lower)) {
      if (isBn) {
        analogy = 'যেমন ক্লাসের জটিল অঙ্কের সমাধান প্রতিবার নতুন করে না কষে ডায়রিতে টুকে রাখা—যাতে শিক্ষক পুনরায় জিজ্ঞেস করলেই সাথে সাথে ডায়রি দেখে এক সেকেন্ডে উত্তর দেওয়া যায়।';
        whyItMatters = 'সার্ভার বা ডেটাবেসে অপ্রয়োজনীয় রিকোয়েস্ট কমে যায় এবং অ্যাপ্লিকেশন অবিশ্বাস্য দ্রুতগতিতে লোড হয়।';
      } else if (isHi) {
        analogy = 'जैसे किसी कठिन सवाल का हल डायरी में लिख लेना, ताकि दोबारा पूछे जाने पर तुरंत उत्तर दिया जा सके।';
        whyItMatters = 'सर्वर पर लोड कम होता है और एप्लीकेशन तुरंत लोड होती है।';
      } else {
        analogy = 'Like jotting down frequent math answers in a pocket notebook instead of recalculating from scratch every time.';
        whyItMatters = 'Eliminates redundant computations and network round-trips for lightning-fast response times.';
      }
    } else if (/api|fetch|request|server|backend/i.test(lower)) {
      if (isBn) {
        analogy = 'যেমন রেস্টুরেন্টের ওয়েটার—আপনি মেনু দেখে খাবার অর্ডার দিলে ওয়েটার সেই নির্দেশ কিচেনে বাবুর্চিকে পৌঁছে দেয় এবং খাবার রেডি হলে প্লেটে সাজিয়ে আপনার টেবিলে নিয়ে আসে।';
        whyItMatters = 'ফ্রন্টএন্ড ক্লায়েন্টকে ডেটাবেসের জটিল ব্যাকএন্ড লজিক নিয়ে ভাবতে হয় না, সুরক্ষিতভাবে নির্ভরযোগ্য ডেটা আদান-প্রদান করা যায়।';
      } else if (isHi) {
        analogy = 'जैसे एक वेटर ग्राहक का आर्डर किचन तक पहुंचाता है और तैयार खाना मेज पर लाता है।';
        whyItMatters = 'फ्रंटएंड और बैकएंड के बीच सुरक्षित और व्यवस्थित डेटा संचार सुनिश्चित होता है।';
      } else {
        analogy = 'Like a restaurant waiter taking your order to the kitchen chefs and returning with the prepared meal.';
        whyItMatters = 'Provides clean abstraction between user interface and backend databases with structured contracts.';
      }
    } else if (/bus|traffic|minister|accident|police|route|dhaka/i.test(lower)) {
      if (isBn) {
        analogy = 'যেমন একটি ব্যস্ত শহরের ট্রাফিক সিগন্যাল ও লেন ব্যবস্থা—সবাই যার যার ইচ্ছামতো গাড়ি না চালিয়ে সুনির্দিষ্ট স্টপেজ ও নিয়মে চললে পুরো শহরের যানজট নাটকীয়ভাবে কমে যায়।';
        whyItMatters = 'নাগরিকদের দৈনন্দিন চলাচলে শৃঙ্খলা আসে, সময় বাঁচে এবং সড়ক দুর্ঘটনা হ্রাস পায়।';
      } else if (isHi) {
        analogy = 'जैसे शहर में ट्रैफ़िक लेन और व्यवस्थित बस स्टॉप होने से जाम और दुर्घटनाओं में कमी आती है।';
        whyItMatters = 'यात्रियों का समय बचता है और शहर की व्यवस्था सुचारू रूप से चलती है।';
      } else {
        analogy = 'Like a dedicated lane and designated stop system that prevents gridlock across busy metropolitan transit corridors.';
        whyItMatters = 'Brings predictable travel times, safety, and systemic efficiency for all commuters.';
      }
    } else {
      if (isBn) {
        analogy = 'যেমন যেকোনো যন্ত্রের অভ্যন্তরীণ গিয়ার—বাইরে থেকে পুরো কাঠামোটি একরকম দেখায়, কিন্তু ভেতরের ছোট ছোট মেকানিজমগুলোর সঠিক সমন্বয়ে পুরো সিস্টেমটি চমৎকারভাবে চালু থাকে।';
        whyItMatters = 'কনসেপ্টটি পরিষ্কারভাবে আয়ত্তে থাকলে বাস্তব প্রয়োগে ভুল হওয়ার সম্ভাবনা থাকে না এবং কাজের গতি বহুগুণ বাড়ে।';
      } else if (isHi) {
        analogy = 'जैसे किसी मशीन के आंतरिक पुर्जे एक साथ मिलकर पूरे उपकरण को सुचारू रूप से चलाते हैं।';
        whyItMatters = 'मूल अवधारणा को समझने से काम में कोई गलती नहीं होती और उत्पादकता बढ़ती है।';
      } else {
        analogy = 'Like precision gears inside a clockwork mechanism where individual pieces align to drive the entire system smoothly.';
        whyItMatters = 'Gives foundational clarity to build and optimize solutions without subtle bugs or misconceptions.';
      }
    }

    return {
      concept: conceptSummary,
      analogy,
      whyItMatters
    };
  }

  /**
   * Main Explain function:
   * 1. Uses Chrome Prompt API (window.ai.languageModel) with LWS pedagogical directives when available.
   * 2. Seamlessly falls back to Smart Pedagogical Analogy & Explanation Generator for instant, zero-lag answers.
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

    // Attempt 2: Smart Pedagogical Analogy Generator (Guaranteed, Instant, Zero-Lag)
    const baseText = translatedText || sourceText;
    const result = smartExplain(baseText, targetLang);

    const isBn = targetLang === 'bn';
    const isHi = targetLang === 'hi';

    const sections = [
      {
        icon: '💡',
        title: isBn ? 'সহজ কথায়' : (isHi ? 'सरल शब्दों में' : 'In Plain Terms'),
        content: result.concept
      },
      {
        icon: '🔍',
        title: isBn ? 'বাস্তব জীবনের উদাহরণ' : (isHi ? 'वास्तविक जीवन का उदाहरण' : 'Real-World Analogy'),
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
