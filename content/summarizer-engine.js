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
  /**
   * Smart Pedagogical Analogy & Explanation Generator (Learn with Sumit - LWS Style)
   * Converts complex technical concepts into intuitive real-world analogies:
   * 1. 💡 সহজ ভাষায় মূল ধারণা (What it actually is in plain, friendly, conversational terms)
   * 2. 🔍 বাস্তব জীবনের উদাহরণ (Vivid relatable real-world analogy)
   * 3. ⚡ এটি আমাদের কী কাজে লাগে (Practical developer benefit / utility)
   */
  function smartExplain(sourceText, translatedText, lang = 'bn') {
    const textToCheck = `${sourceText || ''} ${translatedText || ''}`.trim();
    if (!textToCheck) {
      return {
        concept: lang === 'bn' ? 'প্রদত্ত বিষয়টির মূল ভাব।' : 'The core concept.',
        analogy: lang === 'bn' ? 'বাস্তব জীবনের একটি সুশৃঙ্খল সিস্টেমের মতোই এটি কাজ করে।' : 'Works like an organized everyday system.',
        whyItMatters: lang === 'bn' ? 'সঠিকভাবে বুঝলে কাজ অনেক সহজ ও দ্রুত হয়।' : 'Understanding this makes development faster and simpler.'
      };
    }

    let processedText = translatedText || sourceText;
    if (lang === 'bn' && window.TermGuardian?.postProcessBengaliText) {
      processedText = window.TermGuardian.postProcessBengaliText(processedText);
    }

    const lower = textToCheck.toLowerCase();
    const isBn = lang === 'bn';
    const isHi = lang === 'hi';

    let concept = '';
    let analogy = '';
    let whyItMatters = '';

    // 1. Parallel Routes & Slots (Next.js App Router / Dashboards)
    if (/parallel route|parallel routes|slots|@\w+|dashboard.*team|team.*analytics|সমান্তরাল রুট|সমান্তরাল.*রেন্ডার|সমান্তরাল/i.test(lower)) {
      if (isBn) {
        concept = 'Next.js-এর প্যারালাল রাউটস (Parallel Routes) হলো একই লেআউটের ভেতর একাধিক স্বাধীন পেজ বা সেকশনকে (যেমন: @team বা @analytics স্লট) আলাদা কম্পোনেন্ট হিসেবে ইম্পোর্ট না করে সরাসরি স্বাধীন রাউট হিসেবে একই সাথে পাশাপাশি রেন্ডার করার আধুনিক টেকনিক।';
        analogy = 'যেমন একটি বড় ড্যাশবোর্ডে একদিকে অ্যানালিটিক্স চার্ট এবং অন্যদিকে টিমের অ্যাক্টিভিটি—ড্রয়িং রুমের স্মার্ট টিভির Split-Screen / Picture-in-Picture মোডের মতো দুটি অংশ পাশাপাশি চলে। অ্যানালিটিক্সের ডাটা আসতে দেরি হলে পুরো পেজ আটকে থাকে না; শুধু অ্যানালিটিক্স অংশে স্পিনার দেখাবে এবং টিমের ডাটা সাথে সাথে রেন্ডার হয়ে যাবে!';
        whyItMatters = '১. প্রতিটি স্লটের জন্য নিজস্ব loading.js ও error.js থাকায় স্বাধীন লোডিং হয়, ২. ইউজারের রোল অনুযায়ী শর্তসাপেক্ষে (@admin বা @user) স্লট দেখানো যায়, এবং ৩. ক্লায়েন্ট নেভিগেশনে অন্য অংশের স্টেট ও স্ক্রল পজিশন অবিকৃত থাকে।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, एक ही लेआउट या पेज के भीतर कई अलग-अलग सेक्शन (जैसे टीम लिस्ट, एनालिटिक्स चार्ट) को पूरी तरह स्वतंत्र रूप से एक साथ रेंडर करने की सुविधा।';
        analogy = 'जैसे स्मार्ट टीवी पर स्प्लिट-स्क्रीन (Split-screen) मोड—एक तरफ क्रिकेट मैच और दूसरी तरफ समाचार एक साथ चल रहे हैं, किसी एक के अटकने से दूसरा प्रभावित नहीं होता।';
        whyItMatters = 'डैशबोर्ड का कोई धीमा हिस्सा पूरे पेज को लोड होने से नहीं रोकता और हर सेक्शन की लोडिंग व एरर अलग से संभाली जा सकती है।';
      } else {
        concept = 'Simultaneously rendering multiple independent pages or widgets (such as team views and analytics) within the exact same parent layout.';
        analogy = 'Like a Picture-in-Picture or split-screen TV mode where live sports and news stream side-by-side without one freezing the other.';
        whyItMatters = 'Allows independent loading and error states for each widget so slow sub-sections never block the overall dashboard UI.';
      }
    }
    // 2. Intercepting Routes & Modal Overlays (Next.js App Router)
    else if (/intercepting route|intercepting routes|modal route|feed modal|ইন্টারসেপ্টিং|পপআপ রুট/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ কথায়, ব্যাকগ্রাউন্ডের পেজটিকে ঠিক রেখে তার ওপরেই সাময়িকভাবে কোনো সাব-পেজ (যেমন ফটোর প্রিভিউ বা লগইন মোডাল) খুলে দেখানো; কিন্তু পেজটি রিফ্রেশ করলে বা শেয়ার করলে সেটি তার নিজস্ব পূর্ণাঙ্গ পেজে ওপেন হওয়া।';
        analogy = 'যেমন ইনস্টাগ্রাম বা ফেসবুক ফিডে স্ক্রোল করার সময় কোনো ছবিতে ক্লিক করলে ফিড হারিয়ে যায় না, চমৎকারভাবে উপরে ছবিটি পপআপ হয়ে ভিউ হয়। আবার ছবির লিংকটি বন্ধুকে শেয়ার করলে সে সরাসরি ছবির মূল পূর্ণাঙ্গ পেজে চলে যায়।';
        whyItMatters = 'ইউজারকে পেজ থেকে বের না করে চমৎকার অ্যাপ-লাইক ফিলিংস দেয় এবং একই সাথে রিফ্রেশ ও শেয়ারেবল ডেডিকেটেড URL-এর পূর্ণ সুবিধা বজায় থাকে।';
      } else if (isHi) {
        concept = 'सरल भाषा में, बैकग्राउंड पेज को बदले बिना उसके ऊपर ही कोई सब-पेज (जैसे फोटो प्रिव्यू या लॉगिन मॉडल) दिखाना, लेकिन रिफ्रेश करने पर पूरे पेज के रूप में खुलना।';
        analogy = 'जैसे इंस्टाग्राम फीड में किसी तस्वीर पर क्लिक करने पर फीड नहीं हटती बल्कि ऊपर पॉपअप आता है, और लिंक शेयर करने पर पूरा फोटो पेज खुलता है।';
        whyItMatters = 'यूजर को सहज अनुभव मिलता है और साथ ही शेयर करने योग्य यूआरएल की सुविधा भी बनी रहती है।';
      } else {
        concept = 'Loading a route within the current layout while displaying a modal or preview, yet rendering full-page upon direct URL visit or page reload.';
        analogy = 'Like tapping an Instagram photo that opens in a quick overlay without losing your feed position, while sharing the link opens the dedicated photo page.';
        whyItMatters = 'Delivers seamless app-like modal experiences while preserving shareable deep links and standard browser history.';
      }
    }
    // 3. Partial Prerendering (PPR) / Pre-rendering
    else if (/ppr|partial prerender|partial pre-render|prerender|prerendering|আংশিক prerendering|আংশিক prerender/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ করে বললে, একটি ওয়েবপেজের যেসব অংশ সবার জন্য এক (যেমন হেডার, সাইডবার, ফুটার) সেগুলো আগে থেকেই প্রস্তুত রেখে নিমিষেই স্ক্রিনে দেখানো; আর যেসব অংশে লাইভ ডাটা লাগে (যেমন ইউজারের কার্ট বা ব্যালেন্স) সেগুলোকে ব্যাকগ্রাউন্ডে রেডি করে এনে বসিয়ে দেওয়া।';
        analogy = 'যেমন ধরুন রেস্তোরাঁয় বসামাত্রই টেবিল, পানির গ্লাস ও মেনু কার্ড আগে থেকেই রেডি থাকে (স্ট্যাটিক শেল)। আপনি বসামাত্র তা পেয়ে যান। এরপর আপনি যে বিশেষ খাবারটি অর্ডার করলেন, বাবুর্চি শুধু সেই খাবারটুকু ফ্রেশ রান্না করে টেবিলে এনে দেয় (ডাইনামিক স্ট্রিমিং)। পুরো রেস্তোরাঁ নতুন করে তৈরি করতে হয় না!';
        whyItMatters = 'ইউজারকে কোনো সাদা স্ক্রিন দেখে বসে থাকতে হয় না, ইনস্ট্যান্ট পেজ লোড ও রিয়েল-টাইম ডাটা দুটোই একসাথে পাওয়া যায়—বেস্ট অফ বোথ ওয়ার্ল্ডস!';
      } else if (isHi) {
        concept = 'सरल शब्दों में, पेज के जो हिस्से सभी के लिए समान हैं (जैसे हेडर या मेन्यू) उन्हें पहले से तैयार रखकर तुरंत स्क्रीन पर दिखाना, और जिनमें लाइव यूजर डेटा चाहिए उन्हें बैकग्राउंड में तैयार करके जोड़ना।';
        analogy = 'जैसे रेस्तरां में बैठते ही पानी का गिलास और मेन्यू कार्ड पहले से तैयार रहता है (स्टैटिक)। फिर आप जो विशेष खाना आर्डर करते हैं, वेटर सिर्फ उसे ताजा बनवाकर मेज पर लाता है (डायनामिक)।';
        whyItMatters = 'उपयोगकर्ता को खाली स्क्रीन नहीं देखनी पड़ती, पेज तुरंत खुलता है और साथ ही लाइव डेटा भी मिल जाता है।';
      } else {
        concept = 'In simple terms, combining instant static page delivery (like headers and layouts) with background streaming for personalized dynamic data.';
        analogy = 'Like a restaurant having the table, glasses, and menu ready the instant you sit down, while the chef prepares only your custom-ordered hot meal in the background.';
        whyItMatters = 'Eliminates blank loading screens, delivering instant static speed alongside fresh dynamic user data in a single request.';
      }
    }
    // 4. Server Components (RSC) / Server-side vs Client-side
    else if (/server component|server components|rsc|server-side|serverside|client component|client components|সার্ভার কম্পোনেন্ট|ক্লায়েন্ট কম্পোনেন্ট/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ ভাষায়, ভারী ডাটাবেস কোয়েরি ও ক্যালকুলেশনের কাজগুলো ইউজারের ব্রাউজারে না চাপিয়ে সরাসরি সার্ভারেই শেষ করে নেওয়া, আর ইউজারের ডিভাইসে শুধু হালকা আউটপুট পাঠানো।';
        analogy = 'যেমন হোটেলের শেফ ব্যাকগ্রাউন্ডের কিচেনে সমস্ত মসলা পিষে খাবার রান্না করে আপনাকে শুধু সুন্দর প্লেটে খাবার সাজিয়ে দেয়, রান্নার ভারী যন্ত্রপাতি আপনার ডাইনিং টেবিলে নিয়ে আসে না।';
        whyItMatters = 'ইউজারের মোবাইলে অপ্রয়োজনীয় জাভাস্ক্রিপ্ট কোড ডাউনলোড করতে হয় না, ফলে ওয়েবসাইট সুপারফাস্ট লোড হয় এবং ডাটাবেসের সিক্রেট কি সুরক্ষিত থাকে।';
      } else if (isHi) {
        concept = 'सरल भाषा में, भारी डेटाबेस और गणना का काम सर्वर पर ही पूरा कर लेना और यूजर के ब्राउज़र पर केवल तैयार हल्का आउटपुट भेजना।';
        analogy = 'जैसे होटल का शेफ रसोई में सारा भारी काम करके आपको सिर्फ तैयार व्यंजन परोसता है, खाना पकाने के भारी बर्तन आपकी मेज पर नहीं लाता।';
        whyItMatters = 'यूजर के डिवाइस पर भारी कोड डाउनलोड नहीं होता, जिससे वेबसाइट बहुत तेज चलती है और डेटा सुरक्षित रहता है।';
      } else {
        concept = 'Running data-heavy logic directly on the secure server and sending only lightweight HTML/UI to the user\'s browser.';
        analogy = 'Like a restaurant chef doing all heavy chopping and cooking in the kitchen and serving only the finished plate to your table.';
        whyItMatters = 'Zero client-side JavaScript bundle impact, faster page loads on mobile devices, and secure direct database access.';
      }
    }
    // 5. Streaming / Suspense / Granular Streaming
    else if (/streaming|suspense|chunked|chunking|stream in|স্ট্রিমিং|সাসপেন্স/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ করে বললে, পুরো পেজের সব ডাটা একসাথে তৈরি হওয়ার জন্য অপেক্ষা না করে, যে অংশটুকু আগে রেডি হচ্ছে তা সাথে সাথে ইউজারের সামনে তুলে ধরা এবং বাকি অংশের জন্য স্কেলিটন লোডার দেখানো।';
        analogy = 'যেমন ইউটিউব বা নেটফ্লিক্সে ভিডিও দেখার সময় পুরো ২ ঘণ্টার সিনেমা ডাউনলোড হওয়া পর্যন্ত বসে থাকতে হয় না, যতটুকু ডাটা আসছে ততটুকু সাথে সাথে প্লে হতে থাকে।';
        whyItMatters = 'ধীরগতির ইন্টারনেটেও ইউজার সাথে সাথে পেজের সাথে ইন্টারঅ্যাক্ট করা শুরু করতে পারে, স্ক্রিন আটকে থাকে না।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, पूरे पेज के तैयार होने का इंतजार किए बिना, जो हिस्सा पहले तैयार हो जाए उसे तुरंत यूजर को दिखा देना।';
        analogy = 'जैसे यूट्यूब पर वीडियो देखते समय पूरी फिल्म डाउनलोड होने का इंतजार नहीं करना पड़ता, जितना डेटा लोड होता है उतना तुरंत प्ले होने लगता है।';
        whyItMatters = 'धीमे इंटरनेट पर भी यूजर तुरंत काम शुरू कर सकता है, पेज अटकता नहीं है।';
      } else {
        concept = 'Displaying ready parts of the page immediately instead of blocking the entire UI until all slow data requests resolve.';
        analogy = 'Like watching a YouTube video that streams and plays immediately as chunks arrive, without waiting for the whole multi-hour video to download.';
        whyItMatters = 'Maximizes perceived performance and user engagement even on high-latency mobile networks.';
      }
    }
    // 6. Server Actions / Mutations / Form Handling
    else if (/server action|server actions|form action|useactionstate|সার্ভার অ্যাকশন/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ কথায়, আলাদা কোনো REST API এন্ডপয়েন্ট বা রুট হ্যান্ডলার তৈরি না করেই সরাসরি React কম্পোনেন্ট বা ফর্ম থেকে ব্যাকএন্ডের ফাংশন কল করে ডাটাবেস আপডেট করার আধুনিক পদ্ধতি।';
        analogy = 'যেমন কোনো ফর্ম পূরণ করে সরাসরি মূল কর্মকর্তার ডেস্কে জমা দেওয়ার মতো—মাঝখানের কোনো পিওন বা মধ্যস্থতাকারীর (আলাদা API রুট) জন্য আলাদা লাইন ধরতে হয় না।';
        whyItMatters = 'বয়লারপ্লেট API হ্যান্ডলার লেখার ঝামেলা দূর হয়, টাইপ সেফটি বজায় থাকে এবং জাভাস্ক্রিপ্ট বন্ধ থাকলেও ফর্ম সাবমিট নিখুঁতভাবে কাজ করে।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, बिना अलग एपीआई रूट बनाए सीधे रिएक्ट कंपोनेंट से सर्वर फंक्शन चलाकर डेटाबेस में बदलाव करने का तरीका।';
        analogy = 'जैसे किसी फॉर्म को सीधे मुख्य अधिकारी को सौंपना, बिना किसी बिचौलिए या अलग काउंटर की लाइन में लगे।';
        whyItMatters = 'अनावश्यक कोड कम होता है और बिना जावास्क्रिप्ट के भी फॉर्म सुरक्षित रूप से काम करता है।';
      } else {
        concept = 'Directly calling asynchronous backend server functions from UI components and forms without creating separate REST API endpoints.';
        analogy = 'Like dropping an official form directly onto the director\'s desk without standing in line at an intermediary dispatch window.';
        whyItMatters = 'Eliminates boilerplate API endpoint code, preserves end-to-end type safety, and supports progressive enhancement.';
      }
    }
    // 7. Middleware (Next.js / Express)
    else if (/middleware|মিডলওয়্যার|নেক্সট মিডলওয়্যার/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ ভাষায়, ইউজার কোনো রিকোয়েস্ট পাঠানোর পর সেটি পেজে পৌঁছানোর ঠিক আগেই মাঝপথে আটকে দিয়ে চেক করা (যেমন ইউজার লগইন করা আছে কিনা বা তার লোকেশন কী)।';
        analogy = 'যেমন কোনো সুরক্ষিত অফিসের প্রবেশদ্বারে দাঁড়ানো সিকিউরিটি গার্ড—সবার আইডি কার্ড চেক করে সঠিক রুমে যেতে দেওয়া হয় অথবা অনুমতি না থাকলে গেট থেকেই রিডাইরেক্ট করে ফেরত পাঠানো হয়।';
        whyItMatters = 'প্রতিটি পেজে আলাদা করে লগইন ভ্যালিডেশনের কোড না লিখে এক জায়গায় কেন্দ্রীয়ভাবে সিকিউরিটি ও রিডাইরেকশন নিয়ন্ত্রণ করা যায়।';
      } else if (isHi) {
        concept = 'सरल भाषा में, रिक्वेस्ट के पेज तक पहुंचने से पहले बीच में ही उसे जांचना और आवश्यकतानुसार रीडायरेक्ट या ब्लॉक करना।';
        analogy = 'जैसे मुख्य द्वार पर तैनात सुरक्षा गार्ड, जो पास चेक करके ही अंदर जाने की अनुमति देता है।';
        whyItMatters = 'सुरक्षा और रीडायरेक्शन का काम एक ही जगह से व्यवस्थित हो जाता है।';
      } else {
        concept = 'Running code before a request is completed to inspect headers, authenticate users, or rewrite URL paths.';
        analogy = 'Like a security checkpoint at a corporate lobby verifying guest badges before permitting elevator access to designated floors.';
        whyItMatters = 'Centralizes authentication, geolocation redirects, and bot protection across every single application route.';
      }
    }
    // 8. Layouts & Nested Layouts
    else if (/nested layout|layouts|layout|লেআউট/i.test(lower) && !/parallel|ppr/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ ভাষায়, ওয়েবসাইটের কমন অংশগুলো (যেমন হেডার, সাইডবার, ফুটার) এক জায়গায় ডিফাইন করে রাখা, যাতে অন্য পেজে নেভিগেট করলেও এগুলো নতুন করে লোড না হয়ে ফিক্সড থাকে এবং শুধুমাত্র ভেতরের কনটেন্ট পরিবর্তন হয়।';
        analogy = 'যেমন একটি ফটো অ্যালবামের শক্ত বাঁধাই করা ফ্রেম—ভেতরের ছবিগুলো একটার পর একটা পাতা উল্টে বদলানো যায়, কিন্তু অ্যালবামের মূল ফ্রেম ও সাইজ একই থাকে।';
        whyItMatters = 'পেজ পরিবর্তনের সময় সাইডবার বা হেডার ফ্লিকার করে না, স্টেট সংরক্ষিত থাকে এবং সাইট সুপার স্মুথ ও ফাস্ট মনে হয়।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, वेबसाइट के साझा ढाँचे (हेडर, साइडबार) को स्थिर रखना ताकि पेज बदलने पर वे दोबारा लोड न हों।';
        analogy = 'जैसे फोटो फ्रेम वही रहता है, बस उसके अंदर की तस्वीर बदल दी जाती है।';
        whyItMatters = 'नेविगेशन बहुत स्मूथ होता है और अनावश्यक रेंडरिंग से बचत होती है।';
      } else {
        concept = 'Sharing persistent UI structures (headers, sidebars) across routes without re-rendering them upon navigation.';
        analogy = 'Like a picture frame that stays mounted on the wall while you effortlessly swap the photos displayed inside.';
        whyItMatters = 'Prevents UI flicker during navigation, preserves scroll position, and dramatically speeds up page transitions.';
      }
    }
    // 9. Hydration / Rehydration
    else if (/hydration|rehydration|হাইড্রেট|হাইড্রেটিং/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ ভাষায়, সার্ভার থেকে পাঠানো রেডিমেড স্ট্যাটিক HTML কোডের সাথে ক্লায়েন্টের জাভাস্ক্রিপ্ট ইভেন্ট লিসেনারগুলো (যেমন ক্লিক, হোভার) যুক্ত করে পেজটিকে সক্রিয় ও ইন্টারঅ্যাক্টিভ করে তোলা।';
        analogy = 'যেমন শুষ্ক গাছপালায় পানি ঢালার মতো—গাছের কাঠামো আগেই তৈরি ছিল, পানি দেওয়ার পর তা সতেজ হয়ে নড়াচড়া ও সাড়া দেওয়া শুরু করল!';
        whyItMatters = 'ইউজার নিমিষেই পেজের লেখা ও ছবি দেখতে পায় (Fast Initial Paint) এবং মুহূর্তের মধ্যে বাটনে ক্লিক করে কাজ শুরু করতে পারে।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, सर्वर से आए एचटीएमएल में जावास्क्रिप्ट इवेंट्स जोड़कर पेज को पूरी तरह इंटरैक्टिव बनाना।';
        analogy = 'जैसे किसी पुतले में जान फूंकना—ढांचा पहले से तैयार था, अब वह छूने पर प्रतिक्रिया देने लगता है।';
        whyItMatters = 'पेज तुरंत दिखाई देता है और बहुत तेजी से काम करने के लिए तैयार हो जाता है।';
      } else {
        concept = 'Attaching client-side event listeners to server-rendered HTML so the page becomes fully interactive.';
        analogy = 'Like watering a plant—the physical structure exists instantly, and moisture brings it to lively responsive action.';
        whyItMatters = 'Delivers blazing fast initial visual paint while powering seamless dynamic interactions.';
      }
    }
    // 10. State Management & Context API / Redux / Zustand
    else if (/redux|zustand|context api|usecontext|state management|গ্লোবাল স্টেট/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ করে বললে, পুরো অ্যাপের সব কম্পোনেন্টের প্রয়োজনীয় ডাটা একটি কেন্দ্রীয় ভাণ্ডারে রাখা, যাতে যেকোনো কম্পোনেন্ট এক ক্লিকেই তা পড়তে বা আপডেট করতে পারে।';
        analogy = 'যেমন ড্রয়িং রুমের কমন নোটিশ বোর্ড বা ফ্রিজ—যেখানে সবাই যার যার দরকারি জিনিস রাখতে পারে এবং অন্য যে কেউ সরাসরি সেখান থেকে নিতে পারে; একজন একজন করে হাতবদল (Props Drilling) করতে হয় না।';
        whyItMatters = 'জটিল কম্পোনেন্ট ট্রিতে একের পর এক প্রপস পাঠানোর ঝামেলা থেকে মুক্তি পাওয়া যায় এবং পুরো অ্যাপের স্টেট শৃঙ্খলাবদ্ধ থাকে।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, पूरी ऐप का डेटा एक केंद्रीय स्थान पर रखना ताकि कोई भी कंपोनेंट सीधे उसे एक्सेस कर सके।';
        analogy = 'जैसे घर का कॉमन नोटिस बोर्ड—सबकी जानकारी एक जगह रहती है और किसी को व्यक्तिगत रूप से मैसेज नहीं भेजना पड़ता।';
        whyItMatters = 'प्रॉप्स ड्रिलिंग से मुक्ति मिलती है और डेटा का प्रवाह बिल्कुल साफ रहता है।';
      } else {
        concept = 'A centralized shared data store that any component in the tree can read from or write to directly.';
        analogy = 'Like a shared bulletin board in an office common area rather than whispering a message from desk to desk.';
        whyItMatters = 'Completely eliminates props drilling and ensures synchronicity across distant components.';
      }
    }
    // 11. React Hooks
    else if (/useeffect|usestate|usememo|usecallback|custom hook|react hook|হুক/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ কথায়, ফাংশনাল কম্পোনেন্টের ভেতরেই স্টেট, সাইড ইফেক্ট বা পারফরম্যান্স অপ্টিমাইজেশন লজিক খুব সহজে প্লাগইন করার আধুনিক উপায়।';
        analogy = 'যেমন একটি বহুমুখী সুইস আর্মি নাইফ (Swiss Army Knife)—যেখানে একটি ছোট টুলের ভেতর থেকেই দরকার অনুযায়ী কাঁচি, স্ক্রু-ড্রাইভার বা করাত টেনে বের করে ব্যবহার করা যায়।';
        whyItMatters = 'ক্লাস কম্পোনেন্টের জটিলতা ও বয়লারপ্লেট ছাড়াই পরিচ্ছন্ন, আধুনিক ও পুনঃব্যবহারযোগ্য কোড লেখা যায়।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, फंक्शनल कंपोनेंट्स में स्टेट और लाइफसाइकिल लॉजिक को आसानी से जोड़ने का तरीका।';
        analogy = 'जैसे स्विस आर्मी चाकू—एक ही छोटे टूल में जरूरत के सारे औजार मौजूद होते हैं।';
        whyItMatters = 'क्लास कंपोनेंट के जटिल कोड के बिना साफ-सुथरा और रीयूजेबल कोड लिखा जा सकता है।';
      } else {
        concept = 'Modular functions that allow functional components to hook into React state, lifecycles, and caching.';
        analogy = 'Like a Swiss Army knife where specialized attachments (blades, screwdrivers) snap out as needed.';
        whyItMatters = 'Enables clean separation of concerns, reusable business logic, and simpler component architectures.';
      }
    }
    // 12. React Components / Props / State
    else if (/component|props|state|reactivity/i.test(lower) && !/ppr|prerender|parallel/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ কথায়, একটি ওয়েবসাইটের পুরো লেআউটকে ছোট ছোট স্বাধীন টুকরোতে (যেমন হেডার, বাটন, প্রোডাক্ট কার্ড) ভাগ করে তৈরি করা এবং প্রয়োজনমতো ডাটা দিয়ে সেগুলোকে নিয়ন্ত্রণ করা।';
        analogy = 'যেমন লেগো (Lego) ব্লকের প্রতিটি টুকরো আলাদা থাকে এবং বিভিন্ন রঙের ব্লক জোড়া লাগিয়ে যেমন আস্ত একটি সুন্দর বাড়ি বানানো যায়, তেমনি কোডিংয়েও ছোট ছোট কম্পোনেন্ট জোড়া দিয়ে বড় বড় ওয়েবসাইট তৈরি করা হয়।';
        whyItMatters = 'একই কোড বারবার লেখার প্রয়োজন হয় না (Reusability) এবং কোনো অংশে সমস্যা হলে পুরো কোড না ঘেঁটে শুধু নির্দিষ্ট কম্পোনেন্টটি ঠিক করলেই কাজ হয়ে যায়।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, वेबसाइट के पूरे लेआउट को छोटे-छोटे स्वतंत्र टुकड़ों (जैसे हेडर, बटन, कार्ड) में बांटना और आवश्यकतानुसार डेटा से उन्हें नियंत्रित करना।';
        analogy = 'जैसे लेगो (Lego) ब्लॉक के टुकड़ों को जोड़कर महल या कार बनाई जाती है, वैसे ही कंपोनेंट्स को जोड़कर पूरी वेबसाइट बनती है।';
        whyItMatters = 'एक ही कोड को दोबारा इस्तेमाल किया जा सकता है और किसी एक हिस्से में गड़बड़ी होने पर पूरे प्रोजेक्ट को छेड़े बिना उसे ठीक किया जा सकता है।';
      } else {
        concept = 'Breaking a user interface into reusable, self-contained building blocks (like buttons, headers, cards) controlled by data.';
        analogy = 'Like modular Lego bricks that snap together to build intricate houses or vehicles while remaining independently modifiable.';
        whyItMatters = 'Enables massive code reusability, clean separation of concerns, and rapid UI development.';
      }
    }
    // 13. Dynamic Routes & Slugs
    else if (/dynamic route|dynamic routes|\[slug\]|\[id\]|ডাইনামিক রুট/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ কথায়, হাজার হাজার প্রোডাক্ট বা ব্লগ পোস্টের জন্য আলাদা আলাদা পেজ ফাইল তৈরি না করে, একটিমাত্র কমন টেমপ্লেট দিয়ে ইউআরএলের আইডি অনুযায়ী স্বয়ংক্রিয়ভাবে ডাটা লোড করানো।';
        analogy = 'যেমন পাসপোর্টের ফাঁকা ফরম্যাট—যেখানে ফরম্যাট সবার জন্য একই থাকে, কিন্তু একেক ব্যক্তির নাম ও ছবি বসিয়ে তাদের নিজস্ব পাসপোর্ট তৈরি করে দেওয়া হয়।';
        whyItMatters = 'কোটি কোটি ইউজারের প্রোফাইল বা পণ্যের জন্য মাত্র একটি পেজ ফাইল লিখলেই যথেষ্ট হয়।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, लाखों उत्पादों या पोस्टों के लिए अलग-अलग पेज बनाने के बजाय एक कॉमन टेम्पलेट से काम चलाना।';
        analogy = 'जैसे पासपोर्ट का खाली फॉर्म—फॉर्मेट वही रहता है, बस यूजर का नाम और फोटो बदलकर नया पासपोर्ट बन जाता है।';
        whyItMatters = 'लाखों पेजों के लिए सिर्फ एक फाइल लिखनी पड़ती है और वेबसाइट मेंटेन करना बहुत आसान होता है।';
      } else {
        concept = 'Defining flexible route parameters that dynamically render matching content for thousands of unique URL paths from a single template.';
        analogy = 'Like a standardized passport template where the layout is fixed, but individual names and photos fill in per citizen.';
        whyItMatters = 'Scales single codebases to millions of programmatic pages without duplicate files.';
      }
    }
    // 14. Audio / AudioContext / Web Audio API
    else if (/audio|sound|audiocontext|track|<audio>/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ কথায়, সাধারণ মিউজিক প্লেয়ারের বাইরে সরাসরি কোডের মাধ্যমে ব্রাউজারে শব্দ তৈরি করা, সাউন্ড মডিফাই করা এবং বিভিন্ন স্পেশাল ইফেক্ট যুক্ত করার আধুনিক অডিও কন্ট্রোল সিস্টেম।';
        analogy = 'যেমন মিউজিক স্টুডিওর সাউন্ড মিক্সিং কনসোল—যেখানে একাধিক বাদ্যযন্ত্রের তার এনে একসাথে যুক্ত করা যায় এবং সাউন্ড ইঞ্জিনিয়ার ইচ্ছেমতো প্রতিটি ট্র‍্যাকের ভলিউম ও ইকো নিয়ন্ত্রণ করতে পারেন।';
        whyItMatters = 'ওয়েব গেমে নিখুঁত সাউন্ড ইফেক্ট, ইন্টারেক্টিভ মিউজিক অ্যাপ এবং স্পিচ সিন্থেসাইজার সরাসরি ব্রাউজারে তৈরি করা সম্ভব হয়।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, ब्राउज़र में सीधे कोड के ज़रिए आवाज़ उत्पन्न करना, उसे मॉडिफाई करना और विभिन्न इफेक्ट्स जोड़ने की आधुनिक तकनीक।';
        analogy = 'जैसे एक साउंड स्टूडियो का मिक्सिंग बोर्ड, जहां विभिन्न वाद्यों के तारों को जोड़कर आवाज, बेस और इको को मनमुताबिक बदला जाता है।';
        whyItMatters = 'वेब गेम्स, म्यूजिक ऐप्स और वॉयस सिस्टम बिना किसी बाहरी प्लगइन के सीधे ब्राउज़र में चलाए जा सकते हैं।';
      } else {
        concept = 'A comprehensive browser audio synthesis and processing pipeline that creates, routes, and modulates sounds programmatically.';
        analogy = 'Like a professional sound engineer\'s multi-channel audio mixing console where instruments and filters are wired into modular audio graphs.';
        whyItMatters = 'Enables professional web games, interactive synthesizers, and real-time audio visualization natively.';
      }
    }
    // 15. Caching / Memoization / Performance Optimization
    else if (/cache|caching|memo|usememo|cdn/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ কথায়, একই হিসাব বা ডাটা বারবার সার্ভার থেকে না এনে, আগের ফলাফলটি মেমোরিতে জমিয়ে রাখা যাতে পরবর্তীতে চাইলেই পলকে সাপ্লাই দেওয়া যায়।';
        analogy = 'যেমন স্কুলের গণিত পরীক্ষার কঠিন সূত্রের উত্তর ডায়রিতে নোট করে রাখা—যাতে শিক্ষক পুনরায় জিজ্ঞেস করলেই প্রতিবার নতুন করে হিসাব না করে সাথে সাথে ডায়রি দেখে এক সেকেন্ডে উত্তর দেওয়া যায়।';
        whyItMatters = 'সার্ভারের ওপর অপ্রয়োজনীয় চাপ কমে যায় এবং ইউজার চোখের পলকে ইনস্ট্যান্ট রেসপন্স পায়।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, एक ही गणना या डेटा को बार-बार सर्वर से मांगने के बजाय, पहले परिणाम को मेमोरी में सहेज लेना ताकि मांगने पर तुरंत दिया जा सके।';
        analogy = 'जैसे किसी कठिन सवाल का हल डायरी में लिख लेना, ताकि दोबारा पूछे जाने पर समय बर्बाद किए बिना तुरंत उत्तर दिया जा सके।';
        whyItMatters = 'सर्वर पर लोड कम होता है और यूजर को बिजली जैसी तेज गति से परिणाम मिलते हैं।';
      } else {
        concept = 'Storing computed results or fetched data in fast temporary memory to eliminate redundant computation and network round-trips.';
        analogy = 'Like writing frequent answers in a pocket notebook rather than recalculating long mathematical formulas from scratch every single time.';
        whyItMatters = 'Reduces server resource consumption, slashes network latency, and delivers instantaneous UI responses.';
      }
    }
    // 16. API / Data Fetching / Backend Communication
    else if (/api|fetch|request|backend|endpoint|সার্ভার/i.test(lower) && !/server component|server action/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ ভাষায়, ফ্রন্টএন্ড ওয়েবসাইট এবং পেছনের ডাটাবেসের মধ্যে নিরাপদে ডাটা চাওয়া ও পাওয়ার সুনির্দিষ্ট মাধ্যম বা সংযোগ সেতু।';
        analogy = 'যেমন রেস্তোরাঁর ওয়েটার—আপনি মেনু কার্ড দেখে অর্ডার দিলে ওয়েটার সেই বার্তা কিচেনে বাবুর্চির কাছে নিয়ে যায় এবং রান্না শেষ হলে খাবার আপনার টেবিলে এনে পরিবেশন করে।';
        whyItMatters = 'ফ্রন্টএন্ডকে ডাটাবেসের জটিল লজিক নিয়ে মাথা ঘামাতে হয় না, সুনির্দিষ্ট নিয়মে সুরক্ষিতভাবে ডাটা আদান-প্রদান করা যায়।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, यूजर इंटरफेस और बैकएंड डेटाबेस के बीच डेटा के सुरक्षित और व्यवस्थित आदान-प्रदान का माध्यम।';
        analogy = 'जैसे रेस्तरां में वेटर आपकी मेज से आर्डर लेकर किचन के रसोइये को देता है और खाना तैयार होने पर आपकी मेज पर लाता है।';
        whyItMatters = 'फ्रंटएंड को डेटाबेस की आंतरिक जटिलताओं की चिंता नहीं करनी पड़ती और डेटा सुरक्षित रहता है।';
      } else {
        concept = 'A structured contract and communication bridge allowing frontends to query and modify data on remote backend servers.';
        analogy = 'Like a restaurant waiter carrying your order slip from the dining table to the kitchen chefs and returning with the prepared meal.';
        whyItMatters = 'Provides clean abstraction, secure data validation, and clean decoupling between UI and database architecture.';
      }
    }
    // 17. Error Handling / Try-Catch / Error Boundaries / Exceptions
    else if (/error|exception|catch|handling|ভুল/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ ভাষায়, কোডে বা নেটওয়ার্কে কোনো অপ্রত্যাশিত ভুল হলেও যেন পুরো অ্যাপ্লিকেশন ধপাস করে ক্র্যাশ না করে, বরং সুন্দর কোনো নোটিশ দেখিয়ে পরিস্থিতি সামাল দেওয়া।';
        analogy = 'যেমন গাড়ির সিটবেল্ট ও এয়ারব্যাগ অথবা সার্কাসের ট্রাপিজ খেলার নিচে টানানো সেফটি নেট—যাতে অপ্রত্যাশিত কোনো ঝাঁকুনি ঘটলেও বড় কোনো বিপদ ছাড়া পরিস্থিতি সামাল দেওয়া যায়।';
        whyItMatters = 'ইউজারের কাজ ও ডাটা নষ্ট হয় না এবং অ্যাপের পেশাদারিত্ব বজায় থাকে।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, कोड में कोई अप्रत्याशित गड़बड़ी होने पर पूरी ऐप को क्रैश होने से बचाना और शालीनता से समस्या को संभालना।';
        analogy = 'जैसे कार की सीटबेल्ट और एयरबैग—सड़क पर अचानक झटका लगने पर भी यात्री को बड़ी चोट से सुरक्षित रखते हैं।';
        whyItMatters = 'उपयोगकर्ता का डेटा सुरक्षित रहता है और ऐप का अनुभव पेशेवर बना रहता है।';
      } else {
        concept = 'Gracefully intercepting unexpected code failures and network faults so the application continues running without crashing.';
        analogy = 'Like a car\'s seatbelts and airbags deploy during an unexpected jolt, protecting passengers while keeping the vehicle stable.';
        whyItMatters = 'Prevents full-app breakdowns, preserves user session state, and ensures reliable recovery paths.';
      }
    }
    // 18. Routing / Navigation / Pages (General)
    else if (/routing|router|navigation|route|রুট|নেভিগেশন/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ করে বললে, ইউজার ব্রাউজারের অ্যাড্রেস বারে কোন লিংকে গেল বা কোন মেনুতে ক্লিক করল, তা দেখে সম্পূর্ণ পেজ রিলোড ছাড়াই পলকে সঠিক স্ক্রিন তার সামনে হাজির করা।';
        analogy = 'যেমন রেললাইনের পয়েন্ট সুইচ—ট্রেন কোন স্টেশনে যাবে তা লাইনের পয়েন্ট ঘুরিয়ে মসৃণভাবে ঠিক করে দেওয়া হয়।';
        whyItMatters = 'সম্পূর্ণ ওয়েবসাইট রিলোড না হয়ে দ্রুত এক পেজ থেকে অন্য পেজে যাওয়া যায় এবং সিঙ্গেল পেজ অ্যাপ্লিকেশনের স্পিড পাওয়া যায়।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, यूजर किस यूआरएल या लिंक पर क्लिक करता है, उसके आधार पर बिना पेज रीलोड किए सही दृश्य सामने लाना।';
        analogy = 'जैसे रेलवे ट्रैक का स्विच, जो ट्रेन को उसकी सही पटरी और स्टेशन की ओर मोड़ देता है।';
        whyItMatters = 'बिना पूरा पेज दोबारा लोड किए आसानी से एक हिस्से से दूसरे हिस्से में जाया जा सकता है।';
      } else {
        concept = 'Mapping user URLs and navigation actions to render the corresponding page components seamlessly.';
        analogy = 'Like a railway track switcher directing oncoming trains into their designated platforms and tracks.';
        whyItMatters = 'Enables lightning-fast single-page application navigation with persistent global state.';
      }
    }
    // 19. News / Transport / Public Administration
    else if (/bus|traffic|minister|accident|police|dhaka|government|cabinet|parliament/i.test(lower)) {
      if (isBn) {
        concept = 'সহজ কথায়, সাম্প্রতিক ঘটনা বা নেওয়া সিদ্ধান্তের মূল উদ্দেশ্য এবং সাধারণ মানুষের দৈনন্দিন জীবনে এর প্রভাব কী তা স্পষ্টভাবে তুলে ধরা।';
        analogy = 'যেমন শহরের ব্যস্ত মোড়ে ট্রাফিক লেন ও সুনির্দিষ্ট বাস স্টপ নির্ধারণ করে দেওয়া—শুরুতে কিছুটা নিয়ম মানতে হলেও পরে সবার যাতায়াত যানজটমুক্ত ও স্বস্তিদায়ক হয়ে ওঠে।';
        whyItMatters = 'সংশ্লিষ্ট সবার মধ্যে নিয়মশৃঙ্খলা তৈরি হয় এবং অপ্রয়োজনীয় জটিলতা ও সময় অপচয় দূর হয়।';
      } else if (isHi) {
        concept = 'सरल शब्दों में, हाल की घटना या सरकारी निर्णय का मूल उद्देश्य और आम नागरिकों पर पड़ने वाला प्रभाव।';
        analogy = 'जैसे शहर में ट्रैफिक लेन और बस स्टॉप तय करने से जाम कम होता है और सभी की यात्रा सुगम बनती है।';
        whyItMatters = 'व्यवस्था में अनुशासन आता है और लोगों का कीमती समय और धन बचता है।';
      } else {
        concept = 'Highlighting the core objective of policy decisions and how they directly impact public daily life.';
        analogy = 'Like implementing designated bus lanes and predictable stops to untangle gridlock across crowded municipal routes.';
        whyItMatters = 'Establishes systemic accountability, lowers transit friction, and saves valuable commuter time.';
      }
    }
    // 20. Contextual Adaptive Fallback (Intelligent Linguistic Synthesis - No Static Clock Analogies!)
    else {
      const rawSentences = processedText
        .split(/(?<=[।!?\n])|(?<=\.\s+)/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 12 && !isBoilerplateOrNavText(s));

      const rawClean = (rawSentences[0] || processedText.trim())
        .replace(/^[-*•#\d.]+\s*/, '')
        .replace(/^(একটি|এটি একটি|ইহা একটি|মূলত|সহজ ভাষায়)\s+/i, '')
        .trim();

      if (isBn) {
        concept = `সহজ ভাষায় বললে, মূল বিষয়টি হলো—${rawClean}`;
        analogy = 'যেমন একটি সুপরিকল্পিত কারখানায় প্রতিটি দল যার যার নির্দিষ্ট দায়িত্ব আলাদাভাবে পালন করে যাতে পুরো প্রজেক্ট কোনো ঝামেলা ছাড়াই নিখুঁতভাবে সমাপ্ত হয়।';
        whyItMatters = 'বিষয়টি স্পষ্টভাবে জানা থাকলে কোডিং ও আর্কিটেকচারে কোনো ভুল বোঝাবুঝি থাকে না এবং দ্রুত সঠিক সমাধান প্রয়োগ করা যায়।';
      } else if (isHi) {
        concept = `सरल शब्दों में, मुख्य बात यह है कि—${rawClean}`;
        analogy = 'जैसे किसी सुव्यवस्थित कारखाने में प्रत्येक टीम अपना काम अलग से करती है ताकि पूरी परियोजना समय पर और बिना बाधा के पूरी हो।';
        whyItMatters = 'मूल अवधारणा स्पष्ट होने से काम में कोई गलती नहीं होती और उत्पादकता बढ़ती है।';
      } else {
        concept = `In plain terms, the core concept is: ${rawClean}`;
        analogy = 'Like specialized stations on an organized assembly line working in harmony to complete deliverables efficiently.';
        whyItMatters = 'Gives foundational clarity to build and optimize solutions without subtle bugs or misconceptions.';
      }
    }

    return {
      concept,
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
        title: isBn ? 'বাস্তব জীবনের উদাহরণ (Analogy)' : (isHi ? 'वास्तविक जीवन का उदाहरण (Analogy)' : 'Real-World Analogy'),
        content: result.analogy
      },
      {
        icon: '⚡',
        title: isBn ? 'এটি আমাদের কী কাজে লাগে' : (isHi ? 'यह हमारे किस काम आता है' : 'Why It Matters'),
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
