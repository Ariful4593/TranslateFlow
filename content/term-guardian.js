/**
 * TermGuardian - Technical Terminology & Code Preservation for Natural Bengali
 * Ensures technical documentation remains easy to understand without distorted literal translations.
 */

window.TermGuardian = (function () {
  // Common technical terms that should NEVER be literally translated into awkward Bengali
  const COMMON_TECH_TERMS = [
    // Web & React / Next.js Framework concepts
    'Next.js', 'React', 'Vue', 'Angular', 'Node.js', 'TypeScript', 'JavaScript',
    'HTML', 'CSS', 'DOM', 'JSON', 'API', 'REST', 'GraphQL', 'SDK', 'CLI', 'SQL',
    'CDN', 'URL', 'HTTP', 'HTTPS', 'DNS', 'IP', 'SSL', 'TLS', 'TCP', 'UDP',
    'SSR', 'CSR', 'SSG', 'ISR', 'RSC',
    'Server-Side Rendering', 'Client-Side Rendering', 'server-side rendering', 'client-side rendering',
    'chunked transfer encoding', 'Suspense', 'Suspense boundary', 'Suspense boundaries',
    'App Router', 'Pages Router', 'Route Handler', 'Route Handlers', 'Middleware',
    'Parallel Routes', 'parallel routes', 'Parallel Route', 'parallel route',
    'Intercepting Routes', 'intercepting routes', 'Intercepting Route', 'intercepting route',
    'slots', 'Slots', 'slot', 'Slot',
    'loading.tsx', 'page.tsx', 'layout.tsx', 'layout.js', 'page.js',
    'hydration', 'prerendered', 'prerendering', 'streaming', 'stream in', 'stream',
    'static content', 'dynamic content', 'static parts', 'dynamic parts',
    'headers', 'navigation', 'layout', 'analytics', 'recommendations', 'personalized data',

    // Specific terms that machine translation garbles
    'granular streaming', 'Granular streaming', 'granular', 'Granular',
    'sibling <Suspense> boundaries', 'sibling <Suspense>', 'sibling boundaries',
    'sibling', 'siblings',
    'resolve independently', 'resolve', 'resolves', 'resolved',
    'single blocking pass', 'blocking pass', 'split hydration', 'Hydration comparison',
    'Raw HTML streaming', 'raw HTML streaming', 'Raw HTML', 'raw HTML',
    'early CSS discovery', 'CSS discovery',
    'ReadableStream', 'WritableStream',
    'chunk sizes', 'chunk size', 'chunk', 'chunks',
    'browser buffering', 'buffering',
    'Page-level streaming', 'page-level streaming', 'Page-level', 'page-level',
    'skeleton', 'companion', 'streaming demo',
    'full-stack web applications', 'full-stack',
    'bundlers and compilers', 'bundlers', 'compilers', 'bundler', 'compiler',
    'lower-level tools', 'low-level tools',
    'individual developer',
    'user interfaces', 'user interface', 'optimizations',

    'props', 'state', 'hook', 'hooks', 'lifecycle', 'component', 'components',
    'cache', 'caching', 'payload', 'fallback', 'endpoint', 'server action',
    'Service Worker', 'Content Script', 'Manifest', 'DevTools', 'WebAssembly',

    // Web APIs & Audio / Media concepts (LWS / Web Dev Best Practice)
    'AudioContext', 'OfflineAudioContext', 'audio context', 'offline audio context',
    'Web Audio API', 'web audio api', 'Web Audio', 'web audio',
    'AudioNode', 'AudioDestination', 'GainNode', 'OscillatorNode', 'AudioBuffer',
    'audio element', 'audio elements', '<audio>', '<video>', '<canvas>',
    'sound track', 'song track', 'audio track', 'audio data',
    'boombox', 'DOM', 'DOM tree', 'accessibility',
    'event listener', 'event listeners', 'callback', 'callbacks',
    'Promise', 'Promises', 'async', 'await', 'async/await',
    'fetch', 'request', 'response'
  ];

  /**
   * Universal Source Language Detector based on scripts and diacritics.
   * Accurately identifies source language (Hindi, Bengali, Arabic, Urdu, Russian, Spanish, etc.)
   * so multi-directional translation never fails or assumes hardcoded English.
   *
   * @param {string} text
   * @returns {string} Two-letter language code ('hi', 'bn', 'ar', 'ur', 'ru', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'en')
   */
  function detectSourceLanguage(text) {
    if (!text || typeof text !== 'string') return 'en';
    const clean = text.trim();
    if (!clean) return 'en';

    // 1. Script checks
    if (/[\u0980-\u09FF]/.test(clean)) return 'bn';
    if (/[\u0900-\u097F]/.test(clean)) return 'hi';
    if (/[\u0679\u0686\u0688\u0691\u06BA\u06BE\u06C1\u06D2]/.test(clean)) return 'ur';
    if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(clean)) return 'ar';
    if (/[\u0400-\u04FF]/.test(clean)) return 'ru';
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(clean)) return 'ja';
    if (/[\u4E00-\u9FFF]/.test(clean)) return 'zh';

    // 2. Latin family diacritics
    if (/[áéíóúüñ¿¡]/i.test(clean)) return 'es';
    if (/[éàèùâêîôûçëïüœæ]/i.test(clean)) return 'fr';
    if (/[äöüß]/i.test(clean)) return 'de';
    if (/[ãõáéíóúâêôç]/i.test(clean)) return 'pt';

    // 3. Document language hint if in browser
    if (typeof document !== 'undefined' && document.documentElement?.lang) {
      const docLang = document.documentElement.lang.slice(0, 2).toLowerCase();
      if (['es', 'fr', 'de', 'pt', 'ru', 'zh', 'ja', 'hi', 'ar', 'ur', 'bn'].includes(docLang)) {
        return docLang;
      }
    }

    return 'en';
  }

  /**
   * Detects if the given text is primarily in Bengali script.
   * @param {string} text
   * @returns {boolean}
   */
  function isBengaliText(text) {
    if (!text || typeof text !== 'string') return false;
    const bnMatch = text.match(/[\u0980-\u09FF]/g);
    if (!bnMatch) return false;
    const bnCount = bnMatch.length;
    const latinMatch = text.match(/[a-zA-Z]/g);
    const latinCount = latinMatch ? latinMatch.length : 0;
    return bnCount >= latinCount;
  }

  /**
   * Checks if text consists only of numbers, symbols, URLs, whitespace, or non-alphabetic noise.
   * @param {string} text
   * @returns {boolean}
   */
  function isNonLinguistic(text) {
    if (!text || typeof text !== 'string') return true;
    const clean = text.trim();
    if (clean.length < 2) return true;

    // 1. Pure URLs, emails, file paths, IP addresses
    if (/^(https?:\/\/|ftp:\/\/|mailto:|file:\/\/|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\/?[\w-]+\/[\w-]+\.[\w]+|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)/i.test(clean)) return true;

    // 2. Pure numbers, timestamps, hex codes, hashes, currency amounts, symbols
    if (/^[\d\s.,:;/#$€£¥%+\-*=(){}\[\]<>_\/\\|'"`~^@!?&]+$/.test(clean)) return true;

    // 3. Raw JSON object or array structure
    if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
      try {
        JSON.parse(clean);
        return true;
      } catch (e) {}
    }

    // 4. Pure alphabetic letter presence
    const letters = clean.match(/[\p{L}\p{M}]/u);
    if (!letters) return true;

    return false;
  }

  /**
   * Universal Multi-Script Language Classifier & Target Language Matcher.
   * Determines whether the selected text is already in the user's chosen target language,
   * enabling intelligent zero-nuisance dormancy on native websites across all 11+ languages.
   *
   * @param {string} text - The highlighted user text
   * @param {string} targetLang - The user's active target language code ('bn', 'hi', 'es', 'fr', etc.)
   * @returns {boolean} - Returns true if the text matches targetLang (safe to skip translation)
   */
  function isTextMatchingTargetLanguage(text, targetLang = 'bn') {
    if (!text || typeof text !== 'string') return false;
    if (isNonLinguistic(text)) return true; // Non-linguistic noise is always skipped

    const clean = text.trim();
    const totalChars = clean.length;
    if (totalChars < 2) return true;

    // Character frequency counters per script
    const bnCount = (clean.match(/[\u0980-\u09FF]/g) || []).length;
    const hiCount = (clean.match(/[\u0900-\u097F]/g) || []).length;
    const arCount = (clean.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
    const ruCount = (clean.match(/[\u0400-\u04FF]/g) || []).length;
    const zhCount = (clean.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g) || []).length;
    const jaCount = (clean.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
    const latinCount = (clean.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length;

    const totalLetterCount = bnCount + hiCount + arCount + ruCount + zhCount + jaCount + latinCount;
    if (totalLetterCount === 0) return true; // No recognized alphabetic letters

    // 1. Bengali (bn)
    if (targetLang === 'bn') {
      if (bnCount > 0 && (bnCount / totalLetterCount >= 0.35 || bnCount >= latinCount)) {
        return true; // Already Bengali
      }
      return false; // Foreign text (e.g. English) -> Translate to Bengali
    }

    // 2. Hindi (hi)
    if (targetLang === 'hi') {
      if (hiCount > 0 && (hiCount / totalLetterCount >= 0.35 || hiCount >= latinCount)) {
        return true; // Already Hindi
      }
      return false; // Foreign text -> Translate to Hindi
    }

    // 3. Arabic (ar) or Urdu (ur)
    if (targetLang === 'ar' || targetLang === 'ur') {
      if (arCount > 0 && (arCount / totalLetterCount >= 0.35 || arCount >= latinCount)) {
        return true; // Already Arabic / Urdu
      }
      return false;
    }

    // 4. Russian (ru)
    if (targetLang === 'ru') {
      if (ruCount > 0 && (ruCount / totalLetterCount >= 0.35 || ruCount >= latinCount)) {
        return true; // Already Russian
      }
      return false;
    }

    // 5. Chinese (zh)
    if (targetLang === 'zh') {
      if (zhCount > 0 && (zhCount / totalLetterCount >= 0.35 || zhCount >= latinCount)) {
        return true; // Already Chinese
      }
      return false;
    }

    // 6. Japanese (ja)
    if (targetLang === 'ja') {
      if ((jaCount > 0 || zhCount > 0) && ((jaCount + zhCount) / totalLetterCount >= 0.35)) {
        return true; // Already Japanese
      }
      return false;
    }

    // 7. Latin-based languages (Spanish, French, German, Portuguese, English)
    if (['es', 'fr', 'de', 'pt', 'en'].includes(targetLang)) {
      // Check document declared language if in browser environment
      const docLang = (typeof document !== 'undefined' && document.documentElement?.lang)
        ? document.documentElement.lang.toLowerCase()
        : '';

      if (targetLang === 'es') {
        const esDiacritics = (clean.match(/[áéíóúüñ¿¡]/gi) || []).length;
        if (esDiacritics > 0 || (docLang.startsWith('es') && latinCount > 0 && bnCount === 0 && hiCount === 0 && arCount === 0)) {
          return true; // Already Spanish
        }
      }

      if (targetLang === 'fr') {
        const frDiacritics = (clean.match(/[éàèùâêîôûçëïüœæ]/gi) || []).length;
        if (frDiacritics > 0 || (docLang.startsWith('fr') && latinCount > 0 && bnCount === 0 && hiCount === 0 && arCount === 0)) {
          return true; // Already French
        }
      }

      if (targetLang === 'de') {
        const deDiacritics = (clean.match(/[äöüß]/gi) || []).length;
        if (deDiacritics > 0 || (docLang.startsWith('de') && latinCount > 0 && bnCount === 0 && hiCount === 0 && arCount === 0)) {
          return true; // Already German
        }
      }

      if (targetLang === 'pt') {
        const ptDiacritics = (clean.match(/[ãõáéíóúâêôç]/gi) || []).length;
        if (ptDiacritics > 0 || (docLang.startsWith('pt') && latinCount > 0 && bnCount === 0 && hiCount === 0 && arCount === 0)) {
          return true; // Already Portuguese
        }
      }

      if (targetLang === 'en') {
        // If target is English and text is purely English/Latin on an English site
        if (docLang.startsWith('en') && latinCount > 0 && bnCount === 0 && hiCount === 0 && arCount === 0 && ruCount === 0) {
          return true; // Already English
        }
      }
    }

    return false;
  }

  /**
   * Masks technical terms, inline code, and file paths with unique placeholder tokens.
   * @param {string} text
   * @returns {{ maskedText: string, termsMap: Map<string, string> }}
   */
  function protectTechnicalTerms(text) {
    if (!text || typeof text !== 'string') {
      return { maskedText: text, termsMap: new Map() };
    }

    const termsMap = new Map();
    let counter = 0;

    // Helper to store token
    const storeToken = (original) => {
      const token = `__T${counter++}__`;
      termsMap.set(token, original);
      return token;
    };

    let processed = text;
    const isBengali = isBengaliText(text);

    // 0. Protect bullet markers at line starts: "- ", "* ", "• "
    processed = processed.replace(/(^|\n)(\s*[-*•]\s+)/g, (match, nl, bullet) => {
      return nl + storeToken(bullet);
    });

    // 1. Protect inline code blocks: `code here`
    processed = processed.replace(/`([^`]+)`/g, (match) => storeToken(match));

    // 2. Protect HTML / JSX tags: <Suspense>, <Component />, </div>
    processed = processed.replace(/<[A-Za-z0-9_\-.]+(?:\s+[^>]*?)?\/?>|<\/[A-Za-z0-9_\-.]+>/g, (match) =>
      storeToken(match)
    );

    // 3. Protect URLs
    processed = processed.replace(/https?:\/\/[^\s]+/g, (match) => storeToken(match));

    // 4. Protect file names with extensions (e.g. loading.tsx, config.json)
    processed = processed.replace(/\b[A-Za-z0-9_\-]+\.(?:tsx|jsx|ts|js|json|css|scss|html|md|py|go|rs|env)\b/gi, (match) =>
      storeToken(match)
    );

    // If source is English, protect camelCase, snake_case, and COMMON_TECH_TERMS
    if (!isBengali) {
      // 5. Protect camelCase and snake_case variable names (e.g. chunkedTransfer, is_recording)
      processed = processed.replace(/\b[a-z]+[A-Z][a-zA-Z0-9]*\b/g, (match) => storeToken(match));
      processed = processed.replace(/\b[a-z0-9]+_[a-z0-9_]+\b/gi, (match) => storeToken(match));

      // 6. Protect common technical jargon (longer phrases first to avoid partial replacements)
      const sortedTerms = [...COMMON_TECH_TERMS].sort((a, b) => b.length - a.length);
      for (const term of sortedTerms) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        processed = processed.replace(regex, (match) => storeToken(match));
      }
    }

    return { maskedText: processed, termsMap };
  }

  /**
   * Restores protected tokens back to their original form in the translated string.
   * @param {string} translatedText
   * @param {Map<string, string>} termsMap
   * @param {string} [targetLang='bn']
   * @returns {string}
   */
  function restoreTechnicalTerms(translatedText, termsMap, targetLang = 'bn') {
    if (!translatedText) return '';

    let restored = translatedText;

    if (termsMap && termsMap.size > 0) {
      // Restore each token, accommodating any slight spacing added by translator (e.g. "__ T0 __")
      for (const [token, original] of termsMap.entries()) {
        const cleanToken = token.replace(/_/g, '');
        const flexibleRegex = new RegExp(`__\\s*${cleanToken}\\s*__|${token}`, 'g');
        restored = restored.replace(flexibleRegex, original);
      }
    }

    if (targetLang === 'bn') {
      return postProcessBengaliText(restored);
    }

    return restored.replace(/[ \t]+/g, ' ').trim();
  }

  /**
   * Cleans up formatting, spacing, and translates awkward literal phrases into natural developer Bengali.
   * Eliminates funny/robotic machine translations like "ভাইবোন", "কাঁচা HTML", "দানাদার", "পরিবেশন করা".
   * 
   * @param {string} text
   * @returns {string}
   */
  function postProcessBengaliText(text) {
    if (!text) return '';

    // Normalize composed Bengali characters (nuktas: য়, ড়, ঢ়) so regex patterns match reliably
    const normalizedText = text
      .replace(/\u09AF\u09BC/g, '\u09DF') // য়
      .replace(/\u09A1\u09BC/g, '\u09DC') // ড়
      .replace(/\u09A2\u09BC/g, '\u09DD'); // ঢ়

    let cleaned = normalizedText
      // Fix "sibling" translated to "ভাইবোন"
      .replace(/ভাইবোনের\s*সাথে/gi, 'Sibling')
      .replace(/ভাইবোনদের\s*সাথে/gi, 'Sibling')
      .replace(/ভাইবোনের/gi, 'Sibling')
      .replace(/ভাইবোন/gi, 'Sibling')

      // Fix "granular" translated to "দানাদার" (sugar grains)
      .replace(/দানাদার\s*streaming/gi, 'Granular streaming')
      .replace(/দানাদার/gi, 'Granular (ক্ষুদ্রাতিক্ষুদ্র)')

      // Fix "raw HTML" translated to "কাঁচা HTML" (raw food/vegetables)
      .replace(/কাঁচা\s*HTML/gi, 'Raw HTML')
      .replace(/কাঁচা\s*html/gi, 'Raw HTML')

      // Fix "page-level" translated to "পৃষ্ঠা-স্তরের"
      .replace(/পৃষ্ঠা-স্তরের/gi, 'Page-level')
      .replace(/পৃষ্ঠা\s*স্তরের/gi, 'Page-level')

      // Fix "resolve" translated to "সমাধান করে"
      .replace(/স্বাধীনভাবে\s*সমাধান\s*করে/gi, 'আলাদাভাবে লোড (resolve) হয়')
      .replace(/স্বাধীনভাবে\s*সমাধান\s*হয়/gi, 'আলাদাভাবে লোড (resolve) হয়')
      .replace(/সমাধান\s*করে/gi, 'লোড (resolve) করে')

      // Fix "chunk sizes" translated to "খণ্ড আকার"
      .replace(/খণ্ড\s*আকার/gi, 'Chunk size')
      .replace(/খণ্ডের\s*আকার/gi, 'Chunk size')

      // Fix "single blocking pass" translated awkwardly
      .replace(/একক\s*ব্লকিং\s*পাস/gi, 'সিঙ্গেল ব্লকিং রেন্ডারিং')
      .replace(/একটি\s*ব্লকিং\s*পাস/gi, 'সিঙ্গেল ব্লকিং রেন্ডারিং')
      .replace(/ব্লকিং\s*পাস/gi, 'ব্লকিং রেন্ডারিং')
      .replace(/বনাম\s*বিভক্ত/gi, 'বনাম স্প্লিট (split)')

      // Fix "served from CDN"
      .replace(/CDN\s*থেকে\s*পরিবেশন\s*করা\s*যেতে\s*পারে/gi, 'CDN থেকে সার্ভ/লোড করা যেতে পারে')
      .replace(/পরিবেশন\s*করা\s*যেতে\s*পারে/gi, 'সার্ভ বা লোড করা যেতে পারে')
      .replace(/পরিবেশন\s*করা\s*হয়/gi, 'সার্ভ/ডেলিভার করা হয়')

      // Fix "painting instantly"
      .replace(/তাৎক্ষণিকভাবে\s*পেইন্টিং\s*করা\s*হয়/gi, 'তাৎক্ষণিকভাবে স্ক্রিনে রেন্ডার/ডিসপ্লে হয়')
      .replace(/পেইন্টিং\s*করা\s*হয়/gi, 'স্ক্রিনে রেন্ডার হয়')

      // Natural phrasing for product building & shipping
      .replace(/আপনি\s*পরিবর্তে\s*আপনার\s*প্রোডাক্ট\s*এবং\s*shipping\s*(quickly)?\s*নির্মাণে\s*ফোকাস\s*করতে\s*পারেন।?/gi, 
        'এর বদলে আপনি কেবল নিজের প্রোডাক্ট তৈরি এবং তা দ্রুত শিপ (ship) করার ওপর ফোকাস করতে পারেন।')
      .replace(/আপনি\s*পরিবর্তে/gi, 'এর বদলে আপনি')
      .replace(/বান্ডলার\s*এবং\s*কম্পাইলারের\s*মতো/gi, 'bundlers এবং compilers এর মতো')
      .replace(/shipping\s*quickly\s*নির্মাণে/gi, 'দ্রুত শিপ করায়')
      .replace(/shipping\s*নির্মাণে/gi, 'শিপ করায়')
      .replace(/পণ্য\s*নির্মাণে/gi, 'প্রোডাক্ট তৈরিতে')
      .replace(/প্রোডাক্ট\s*নির্মাণে/gi, 'প্রোডাক্ট তৈরিতে')
      .replace(/নির্মাণে\s*ফোকাস/gi, 'তৈরি করার ওপর ফোকাস')
      .replace(/নিম্ন-স্তরের\s*সরঞ্জামগুলি/gi, 'Low-level tools')
      .replace(/নিম্ন\s*স্তরের\s*সরঞ্জামগুলি/gi, 'Low-level tools')
      .replace(/সরঞ্জামগুলি/gi, 'টুলস')
      .replace(/সরঞ্জামগুলো/gi, 'টুলস')
      .replace(/পণ্য\s*নির্মাণ/gi, 'প্রোডাক্ট তৈরি')
      .replace(/পণ্য/gi, 'প্রোডাক্ট')
      .replace(/শিপিং\s*উপর\s*ফোকাস/gi, 'শিপ করার ওপর ফোকাস')
      .replace(/শিপিং\s*এর\s*উপর/gi, 'শিপ করার ওপর')

      // Natural phrasing for team & developer context
      .replace(/আপনি\s*একজন\s*স্বতন্ত্র\s*বিকাশকারী\s*বা\s*একটি\s*বৃহত্তর\s*দলের\s*অংশ\s*হোন\s*না\s*কেন/gi,
        'আপনি একক ডেভেলপার হোন কিংবা বড় কোনো টিমের অংশ')
      .replace(/স্বতন্ত্র\s*বিকাশকারী/gi, 'একক ডেভেলপার')
      .replace(/বৃহত্তর\s*দলের/gi, 'বড় কোনো টিমের')
      .replace(/বৃহত্তর\s*দল/gi, 'বড় টিম')

      // Natural phrasing for company usage and capabilities
      .replace(/বিশ্বের\s*কিছু\s*বড়\s*কোম্পানির\s*দ্বারা\s*ব্যবহৃত/gi, 'বিশ্বের শীর্ষস্থানীয় বড় কোম্পানিগুলো Next.js ব্যবহার করে')
      .replace(/কোম্পানির\s*দ্বারা\s*ব্যবহৃত/gi, 'কোম্পানিগুলো ব্যবহার করে')
      .replace(/দ্বারা\s*ব্যবহৃত/gi, 'ব্যবহার করে')
      .replace(/React\s*components\s*এর\s*শক্তি\s*দিয়ে/gi, 'React components এর সুবিধা কাজে লাগিয়ে')
      .replace(/এর\s*শক্তি\s*দিয়ে/gi, 'এর সাহায্যে')
      .replace(/উচ্চ-মানের/gi, 'উচ্চমানের')
      .replace(/উচ্চ\s*মানের/gi, 'উচ্চমানের')
      .replace(/তৈরি\s*করতে\s*সক্ষম\s*করে/gi, 'তৈরি করতে সাহায্য করে')
      .replace(/সক্ষম\s*করে/gi, 'সাহায্য করে')

      // Fix dynamic / static parts
      .replace(/গতিশীল/gi, 'ডাইনামিক')
      .replace(/গতিশীল\s*অংশগুলো/gi, 'ডাইনামিক অংশগুলো')
      .replace(/গতিশীল\s*অংশ/gi, 'ডাইনামিক অংশ')
      .replace(/গতিশীল\s*বিষয়বস্তু/gi, 'ডাইনামিক কনটেন্ট')
      .replace(/স্ট্যাটিক\s*অংশগুলি/gi, 'স্ট্যাটিক অংশগুলো')
      .replace(/ঐতিহ্যগত\s*সার্ভার-সাইড/gi, 'প্রচলিত Server-Side')
      .replace(/পদ্ধতিগত\s*সার্ভার-সাইড/gi, 'প্রচলিত Server-Side')
      .replace(/বিষয়বস্তু\s*স্ট্রীম/gi, 'কনটেন্ট স্ট্রিম')
      .replace(/বিষয়বস্তু\s*স্ট্রিম/gi, 'কনটেন্ট স্ট্রিম')

      // Natural phrasing for documentation familiarity and prerequisites
      .replace(/(?:আমাদের\s*)?ডকুমেন্টেশন\s+([^।,;]+?)\s*(?:-এর\s*সাথে|-এর|এর\s*সাথে|এর|সাথে)\s+কিছু\s*পরিচিতি\s*অনুমান\s*করে।?/gi, (match, topic) => {
        const cleanTopic = topic.replace(/(?:-?এর|-?র|ের)$/, '').trim();
        return `ধরে নেওয়া হচ্ছে ${cleanTopic} নিয়ে আপনার কিছুটা প্রাথমিক ধারণা আছে।`;
      })
      .replace(/কিছু\s*পরিচিতি\s*অনুমান\s*করে/gi, 'প্রাথমিক ধারণা আছে ধরে নেওয়া হচ্ছে')
      .replace(/পরিচিতি\s*অনুমান\s*করে/gi, 'ধারণা আছে ধরে নেওয়া হচ্ছে')
      .replace(/শুরু\s*করার\s*আগে,?\s*(?:আপনি\s*যদি|যদি\s*আপনি)\s*(?:এতে|এগুলোতে|এগুলোর)?\s*(?:স্বাচ্ছন্দ্য\s*বোধ|স্বাচ্ছন্দ্যবোধ)\s*করেন\s*তবে\s*এটি\s*সাহায্য\s*করবে:?/gi,
        'শুরু করার আগে, এই বিষয়গুলো ভালো বুঝলে বা এগুলোতে স্বাচ্ছন্দ্য থাকলে আপনার জন্য সুবিধা হবে:')
      .replace(/শুরু\s*করার\s*আগে,?\s*এটি\s*(?:সহায়ক\s*হবে|সাহায্য\s*করবে)\s*যদি\s*(?:আপনি|তুমি)\s*(?:এতে|এগুলোতে|এগুলোর)?\s*(?:স্বাচ্ছন্দ্য\s*বোধ|স্বাচ্ছন্দ্যবোধ)\s*(?:করেন|করো):?/gi,
        'শুরু করার আগে, এই বিষয়গুলো ভালো বুঝলে বা এগুলোতে স্বাচ্ছন্দ্য থাকলে আপনার জন্য সুবিধা হবে:')
      .replace(/শুরু\s*করার\s*আগে,?\s*(?:আপনি|তুমি)\s*(?:স্বাচ্ছন্দ্য\s*বোধ|স্বাচ্ছন্দ্যবোধ)\s*করলে\s*এটি\s*সাহায্য\s*করবে:?/gi,
        'শুরু করার আগে, এই বিষয়গুলো ভালো বুঝলে বা স্বাচ্ছন্দ্য থাকলে আপনার জন্য সুবিধা হবে:')
      .replace(/(?:যদি\s*আপনি|আপনি\s*যদি)\s*(?:এতে|এগুলোতে|এগুলোর)?\s*(?:স্বাচ্ছন্দ্য\s*বোধ|স্বাচ্ছন্দ্যবোধ)\s*করেন\s*তবে\s*এটি\s*সাহায্য\s*করবে/gi,
        'এসব বিষয় ভালো জানা বা স্বাচ্ছন্দ্য থাকলে আপনার কাজ সহজ হবে')
      .replace(/স্বাচ্ছন্দ্য\s*বোধ\s*করেন\s*তবে\s*এটি\s*সাহায্য\s*করবে/gi,
        'ভালো জানা থাকলে বা স্বাচ্ছন্দ্য থাকলে আপনার জন্য সুবিধা হবে')
      .replace(/প্রাক-প্রয়োজনীয়\s*জ্ঞান|পূর্বশর্ত\s*জ্ঞান/gi, 'প্রয়োজনীয় পূর্বজ্ঞান')

      // Web Audio & DOM natural phrasing (Sumit Saha / LWS style)
      .replace(/অডিও\s*প্রসঙ্গ/gi, 'AudioContext')
      .replace(/অফলাইন\s*অডিও\s*প্রসঙ্গ/gi, 'OfflineAudioContext')
      .replace(/প্রসঙ্গ\s*তৈরি\s*করেছি/gi, 'AudioContext তৈরি করেছি')
      .replace(/কিছু\s*শব্দ\s*প্রয়োজন/gi, 'সাউন্ড প্লে করার জন্য অডিও সোর্স প্রয়োজন')
      .replace(/কিছু\s*শব্দ\s*প্রয়োজন/gi, 'সাউন্ড প্লে করার জন্য অডিও সোর্স প্রয়োজন')
      .replace(/শব্দ\s*প্লে\s*কর/gi, 'সাউন্ড প্লে কর')
      .replace(/শব্দ\s*চালানো/gi, 'সাউন্ড চালানো')
      .replace(/শব্দটি\s*প্লে/gi, 'সাউন্ডটি প্লে')
      .replace(/একটি\s*সম্পূর্ণ\s*গানের\s*ট্র্যাক/gi, 'একটি সম্পূর্ণ অডিও বা গানের ট্র্যাক')
      .replace(/গান\s*চালানো/gi, 'অডিও বা গান প্লে করা')
      .replace(/অ্যাক্সেসিবিলিটির\s*জন্য,/gi, 'accessibility-এর সুবিধার জন্য,')
      .replace(/পৃষ্ঠায়\s*উন্মোচিত/gi, 'পেজের DOM-এ যুক্ত')
      .replace(/পৃষ্ঠায়\s*উন্মোচিত/gi, 'পেজের DOM-এ যুক্ত')
      .replace(/উন্মোচিত\s*করা\s*হয়েছে/gi, 'DOM-এ যুক্ত করা হয়েছে')
      .replace(/উন্মোচিত\s*করা/gi, 'যুক্ত করা')

      // React & UI Data Flow natural phrasing (Fix imperative verbs & awkward machine translation)
      .replace(/React\s*components\s*ডেটা\s*গ্রহণ\s*করুন/gi, 'React components ডেটা গ্রহণ করে')
      .replace(/ডেটা\s*গ্রহণ\s*করুন/gi, 'ডেটা গ্রহণ করে')
      .replace(/(?:স্ক্রিনে\s*)?যা\s*উপস্থিত\s*হওয়া\s*উচিত\s*তা\s*ফেরত\s*দিন/gi, 'স্ক্রিনে কী প্রদর্শিত হবে তা রিটার্ন করে')
      .replace(/স্ক্রিনে\s*যা\s*উপস্থিত\s*হওয়া\s*উচিত/gi, 'স্ক্রিনে কী প্রদর্শিত হবে')
      .replace(/উপস্থিত\s*হওয়া\s*উচিত/gi, 'প্রদর্শিত হওয়া উচিত')
      .replace(/তা\s*ফেরত\s*দিন/gi, 'তা রিটার্ন করে')
      .replace(/ফেরত\s*দিন/gi, 'রিটার্ন করে')
      .replace(/(?:তাদের\s*)?response-এ\s*একটি\s*ইন্টারঅ্যাকশনে/gi, 'ইউজারের কোনো ইন্টারঅ্যাকশন বা অ্যাকশনের প্রেক্ষিতে')
      .replace(/ব্যবহারকারী\s*যখন/gi, 'ইউজার যখন')
      .replace(/একটি\s*ইনপুটে\s*টাইপ\s*করে/gi, 'ইনপুট ফিল্ডে কিছু টাইপ করে')
      .replace(/নতুন\s*ডেটার\s*সাথে\s*মেলে\s*স্ক্রিন\s*আপডেট\s*(?:করবে|করে)/gi, 'নতুন ডেটা অনুযায়ী স্ক্রিন আপডেট করে')
      .replace(/সাথে\s*মেলে\s*স্ক্রিন\s*আপডেট/gi, 'অনুযায়ী স্ক্রিন আপডেট')

      // Fix spaces before Bengali punctuation marks
      .replace(/\s+([।,;!?])/g, '$1')
      // Ensure single space after Bengali dari or comma if followed by a letter
      .replace(/([।,;!?])([^\s0-9।,;!?])/g, '$1 $2')
      // Fix multiple spaces
      .replace(/[ \t]+/g, ' ')
      .trim();

    return cleaned;
  }

  return {
    isBengaliText,
    detectSourceLanguage,
    isNonLinguistic,
    isTextMatchingTargetLanguage,
    protectTechnicalTerms,
    restoreTechnicalTerms,
    postProcessBengaliText
  };
})();
