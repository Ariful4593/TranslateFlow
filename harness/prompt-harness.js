/**
 * PromptHarness - Prompt Engineering & Quality Orchestrator for TranslateFlow
 * Ingests the LWS (Learn with Sumit) guidelines, enforcing terminology protocols,
 * declarative verb tenses, multilingual localization, and structured pedagogical takeaways.
 * Compatible with both Browser (Chrome AI) and Node.js (Evaluation Harness).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PromptHarness = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Multilingual UI, Summary & Explanation Labels Dictionary
  const I18N_LABELS = {
    bn: {
      copy: 'কপি',
      copied: 'কপি হয়েছে!',
      listen: 'শুনুন',
      stop: 'থামান',
      explain: 'সহজ ব্যাখ্যা',
      explaining: 'সহজ ভাষায় বুঝিয়ে দেওয়া হচ্ছে...',
      summary: 'সারসংক্ষেপ',
      fullText: '↩ মূল অনুবাদ',
      summarizing: 'সারসংক্ষেপ তৈরি হচ্ছে...',
      badge: '💡 সারসংক্ষেপ',
      explainBadge: '🧠 সহজ ব্যাখ্যা',
      prefixes: ['• ', '• ', '• ']
    },
    hi: {
      copy: 'कॉपी',
      copied: 'कॉपी हो गया!',
      listen: 'सुनें',
      stop: 'रोकें',
      explain: 'सरल व्याख्या',
      explaining: 'सरल भाषा में समझ रहे हैं...',
      summary: 'सारांश',
      fullText: '↩ मूल अनुवाद',
      summarizing: 'सारांश तैयार हो रहा है...',
      badge: '💡 सारांश',
      explainBadge: '🧠 सरल व्याख्या',
      prefixes: ['• ', '• ', '• ']
    },
    es: {
      copy: 'Copiar',
      copied: '¡Copiado!',
      listen: 'Escuchar',
      stop: 'Detener',
      explain: 'Explicar',
      explaining: 'Explicando en términos sencillos...',
      summary: 'Resumen',
      fullText: '↩ Texto Original',
      summarizing: 'Generando resumen...',
      badge: '💡 Resumen',
      explainBadge: '🧠 Explicación Simple',
      prefixes: ['• ', '• ', '• ']
    },
    fr: {
      copy: 'Copier',
      copied: 'Copié !',
      listen: 'Écouter',
      stop: 'Arrêter',
      explain: 'Expliquer',
      explaining: 'Explication simple en cours...',
      summary: 'Résumé',
      fullText: '↩ Texte Complet',
      summarizing: 'Résumé en cours...',
      badge: '💡 Résumé',
      explainBadge: '🧠 Explication Simple',
      prefixes: ['• ', '• ', '• ']
    },
    de: {
      copy: 'Kopieren',
      copied: 'Kopiert!',
      listen: 'Anhören',
      stop: 'Stopp',
      explain: 'Erklären',
      explaining: 'Einfache Erklärung wird erstellt...',
      summary: 'Zusammenfassung',
      fullText: '↩ Vollständiger Text',
      summarizing: 'Zusammenfassung wird erstellt...',
      badge: '💡 Zusammenfassung',
      explainBadge: '🧠 Einfache Erklärung',
      prefixes: ['• ', '• ', '• ']
    },
    ar: {
      copy: 'نسخ',
      copied: 'تم النسخ!',
      listen: 'استماع',
      stop: 'إيقاف',
      explain: 'شرح مبسط',
      explaining: 'جاري التبسيط والتوضيح...',
      summary: 'ملخص',
      fullText: '↩ النص الكامل',
      summarizing: 'جاري إنشاء الملخص...',
      badge: '💡 ملخص',
      explainBadge: '🧠 شرح مبسط',
      prefixes: ['• ', '• ', '• ']
    },
    zh: {
      copy: '复制',
      copied: '已复制！',
      listen: '朗读',
      stop: '停止',
      explain: '通俗讲解',
      explaining: '正在用通俗语言解析...',
      summary: '要点摘要',
      fullText: '↩ 完整译文',
      summarizing: '正在生成摘要...',
      badge: '💡 要点摘要',
      explainBadge: '🧠 通俗讲解',
      prefixes: ['• ', '• ', '• ']
    },
    ja: {
      copy: 'コピー',
      copied: 'コピー完了！',
      listen: '読み上げ',
      stop: '停止',
      explain: 'わかりやすく解説',
      explaining: 'わかりやすく解説中...',
      summary: '要約',
      fullText: '↩ 全文に戻る',
      summarizing: '要約を作成中...',
      badge: '💡 要約',
      explainBadge: '🧠 わかりやすく解説',
      prefixes: ['• ', '• ', '• ']
    },
    pt: {
      copy: 'Copiar',
      copied: 'Copiado!',
      listen: 'Ouvir',
      stop: 'Parar',
      explain: 'Explicar',
      explaining: 'Explicando de forma simples...',
      summary: 'Resumo',
      fullText: '↩ Texto Completo',
      summarizing: 'Gerando resumo...',
      badge: '💡 Resumo',
      explainBadge: '🧠 Explicação Simples',
      prefixes: ['• ', '• ', '• ']
    },
    ru: {
      copy: 'Копировать',
      copied: 'Скопировано!',
      listen: 'Слушать',
      stop: 'Стоп',
      explain: 'Объяснить просто',
      explaining: 'Объяснение простыми словами...',
      summary: 'Кратко',
      fullText: '↩ Полный текст',
      summarizing: 'Создание резюме...',
      badge: '💡 Кратко',
      explainBadge: '🧠 Простое объяснение',
      prefixes: ['• ', '• ', '• ']
    },
    ur: {
      copy: 'کاپی',
      copied: 'کاپی ہو گیا!',
      listen: 'سنیں',
      stop: 'روکیں',
      explain: 'آسان وضاحت',
      explaining: 'آسان الفاظ میں سمجھایا جا رہا ہے...',
      summary: 'خلاصہ',
      fullText: '↩ اصل متن',
      summarizing: 'خلاصہ تیار کیا جا رہا ہے...',
      badge: '💡 خلاصہ',
      explainBadge: '🧠 آسان وضاحت',
      prefixes: ['• ', '• ', '• ']
    },
    en: {
      copy: 'Copy',
      copied: 'Copied!',
      listen: 'Listen',
      stop: 'Stop',
      explain: 'Explain',
      explaining: 'Explaining in simple terms...',
      summary: 'Summary',
      fullText: '↩ Full Text',
      summarizing: 'Summarizing content...',
      badge: '💡 Summary',
      explainBadge: '🧠 Simple Explanation',
      prefixes: ['• ', '• ', '• ']
    }
  };

  // Contextual Takeaway Configurations: Clean, universal badges across all domains
  const CONTEXTUAL_CONFIG = {
    tech: {
      bn: { badge: '💡 সারসংক্ষেপ', prefixes: ['• ', '• ', '• '] },
      hi: { badge: '💡 सारांश', prefixes: ['• ', '• ', '• '] },
      en: { badge: '💡 Summary', prefixes: ['• ', '• ', '• '] },
      es: { badge: '💡 Resumen', prefixes: ['• ', '• ', '• '] }
    },
    news: {
      bn: { badge: '💡 সারসংক্ষেপ', prefixes: ['• ', '• ', '• '] },
      hi: { badge: '💡 सारांश', prefixes: ['• ', '• ', '• '] },
      en: { badge: '💡 Summary', prefixes: ['• ', '• ', '• '] },
      es: { badge: '💡 Resumen', prefixes: ['• ', '• ', '• '] }
    },
    general: {
      bn: { badge: '💡 সারসংক্ষেপ', prefixes: ['• ', '• ', '• '] },
      hi: { badge: '💡 सारांश', prefixes: ['• ', '• ', '• '] },
      en: { badge: '💡 Summary', prefixes: ['• ', '• ', '• '] },
      es: { badge: '💡 Resumen', prefixes: ['• ', '• ', '• '] }
    }
  };

  /**
   * Intelligently classifies text domain into 'tech', 'news', or 'general'
   * based on terminology and lexical patterns.
   * @param {string} text
   * @returns {'tech'|'news'|'general'}
   */
  function detectContext(text) {
    if (!text || typeof text !== 'string') return 'general';
    const lower = text.toLowerCase();

    // 1. News, current affairs, politics, government, incidents, transport
    const newsKeywords = [
      'minister', 'ministry', 'police', 'court', 'government', 'parliament',
      'president', 'official', 'officials', 'spokesperson', 'spokesman',
      'meeting', 'auditorium', 'protest', 'strike', 'election', 'cabinet',
      'authorities', 'investigation', 'accident', 'killed', 'injured', 'death',
      'bus owners', 'bus routes', 'buses', 'traffic', 'dhaka', 'bangladesh',
      'daily star', 'announced', 'called on', 'said at a', 'press release',
      'press conference', 'highway', 'passengers', 'hospital', 'arrested',
      'fir', 'judge', 'order', 'tribunal', 'rally', 'summit',
      'মালিক', 'বাস', 'রুট', 'মন্ত্রী', 'সরকার', 'পুলিশ', 'আদালত', 'বৈঠক',
      'ঘোষণা', 'আহ্বান', 'তেজগাঁও', 'অডিটোরিয়াম', 'নিহত', 'আহত', 'সংসদ',
      'নির্বাচন', 'কর্মকর্তা', 'দুর্ঘটনা', 'হাসপাতাল', 'গ্রেফতার', 'বক্তব্য',
      'সংবাদ', 'যানবাহন', 'যাত্রী', 'আন্দোলন', 'ধর্মঘট'
    ];

    // 2. Tech, programming, software architecture, code, API, data science
    const techKeywords = [
      'react', 'javascript', 'typescript', 'python', 'node', 'component',
      'components', 'function', 'class', 'method', 'props', 'state', 'render',
      'rendering', 'api', 'sdk', 'cli', 'dom', 'audiocontext', 'suspense',
      'streaming', 'compiler', 'bundler', 'frontend', 'backend', 'framework',
      'library', 'database', 'sql', 'nosql', 'query', 'mutation', 'async',
      'await', 'cache', 'caching', 'server-side', 'client-side', 'html',
      'css', 'json', 'endpoint', 'algorithm', 'git', 'github', 'docker',
      'cloud', 'variable', 'module', 'import', 'export', 'hook', 'hooks',
      'router', 'route', 'full-stack', 'web application', 'ui', 'ux',
      'কিলোবাইট', 'ফাংশন', 'কম্পোনেন্ট', 'এপিআই', 'রেন্ডার', 'সার্ভার',
      'ক্লায়েন্ট', 'কোড', 'সফটওয়্যার', 'ডেটাবেস', 'ফ্রেমওয়ার্ক', 'লাইব্রেরি',
      'লজিক', 'প্রোগ্রামিং'
    ];

    let newsScore = 0;
    for (const kw of newsKeywords) {
      if (lower.includes(kw)) {
        newsScore += (kw.includes(' ') ? 2 : 1);
      }
    }

    let techScore = 0;
    for (const kw of techKeywords) {
      if (lower.includes(kw)) {
        techScore += (kw.includes(' ') ? 2 : 1);
      }
    }

    if (techScore > newsScore && techScore >= 1) return 'tech';
    if (newsScore > techScore && newsScore >= 1) return 'news';
    if (techScore >= 1) return 'tech';
    if (newsScore >= 1) return 'news';

    return 'general';
  }

  function getI18nLabels(lang = 'bn', context = 'tech') {
    const base = I18N_LABELS[lang] || I18N_LABELS.en;
    const ctx = (context && CONTEXTUAL_CONFIG[context]) ? context : 'tech';
    const ctxLangConfig = (CONTEXTUAL_CONFIG[ctx] && (CONTEXTUAL_CONFIG[ctx][lang] || CONTEXTUAL_CONFIG[ctx].en)) || {};

    return {
      ...base,
      badge: ctxLangConfig.badge || base.badge,
      prefixes: ctxLangConfig.prefixes || base.prefixes
    };
  }

  // Core LWS Persona & Quality Principles per language (Summarization & Translation)
  const LWS_SYSTEM_DIRECTIVES = {
    bn: [
      'আপনি সুমিত সাহা (Learn with Sumit)-এর মতো অত্যন্ত আকর্ষণীয়, বন্ধুত্বপূর্ণ ও প্রাঞ্জল কথ্য বাংলায় টেকনিক্যাল কনসেপ্ট বুঝিয়ে দেন।',
      'কখনো রোবটিক বা আক্ষরিক অনুবাদ করবেন না। কোডের কর্মপদ্ধতি বর্ণনায় সবসময় থার্ড-পারসন ডিক্লারেটিভ ক্রিয়াপদ (করে, দেয়, নেয়, পাঠায়, রেন্ডার করে) ব্যবহার করবেন; ভুলবশত কখনো আদেশবাচক ক্রিয়াপদ (করুন, দিন, নিন) ব্যবহার করবেন না।',
      'প্রোগ্রামিং ও ওয়েব টেকনোলজির পরিভাষাগুলো (যেমন React components, AudioContext, DOM, props, state, API, <audio>, render ইত্যাদি) সম্পূর্ণ অবিকল ইংরেজিতে রাখবেন।',
      'আউটপুট সবসময় ৩টি সুনির্দিষ্ট ধাপে সাজিয়ে দিন: 🎯 মূল বিষয় (সহজ কথায় ১ লাইনে), ⚙️ কীভাবে কাজ করে (আন্ডার-দ্য-হুড মেকানিজম), 💡 বাস্তব সুবিধা (ব্যবহারের উপকারিতা)।'
    ],
    hi: [
      'आप सुमित साहा (Learn with Sumit) की तरह सरल, सहज और संवादात्मक हिंदी में तकनीकी अवधारणाओं को समझाते हैं।',
      'कोड और सॉफ्टवेयर के काम करने के तरीके को बताते समय हमेशा थर्ड-पर्सन वर्तमान काल (करता है, लेता है, देता है, रेंडर करता है) का उपयोग करें; कभी भी आदेशात्मक शब्दों (करें, दें) का प्रयोग न करें।',
      'React components, AudioContext, DOM, props, state, API आदि जैसे तकनीकी शब्दों को मूल रूप में रखें।',
      'आउटपुट को 3 स्पष्ट बिंदुओं में दें: 🎯 मुख्य विषय, ⚙️ यह कैसे काम करता है, 💡 व्यावहारिक लाभ।'
    ],
    es: [
      'Eres un educador técnico experto que explica conceptos con máxima simplicidad y claridad práctica.',
      'Mantén todos los identificadores de código, nombres de API y términos técnicos intactos en inglés.',
      'Organiza la respuesta estrictamente en 3 puntos: 🎯 Concepto Clave, ⚙️ Cómo funciona, 💡 Beneficio Práctico.'
    ],
    en: [
      'You are a master technical educator explaining programming concepts with utmost simplicity and real-world clarity.',
      'Always maintain clear, active technical voice. Keep all code identifiers, API names, and architecture terms intact.',
      'Organize output strictly into 3 takeaways: 🎯 Core Concept (in 1 line), ⚙️ How it works (under the hood), 💡 Practical Benefit (why developers use it).'
    ]
  };

  // Core Explanation Directives per language (Natural, accessible, plain-language explanation)
  const EXPLAIN_SYSTEM_DIRECTIVES = {
    bn: [
      'আপনি অত্যন্ত আকর্ষণীয়, বন্ধুত্বপূর্ণ ও প্রাঞ্জল কথ্য ভাষায় জটিল বিষয় ও যেকোনো টেক্সট একদম সহজ করে বুঝিয়ে দেন।',
      'কখনো রোবটিক বা আক্ষরিক বুকিশ অনুবাদ করবেন না। কোনো কৃত্রিম ক্যাটাগরি, অপ্রয়োজনীয় প্রিফিক্স বা পুনরাবৃত্তিমূলক লেবেল ছাড়া সরাসরি সহজ ও প্রাঞ্জল ভাষায় বুঝিয়ে লিখুন।',
      'প্রোগ্রামিং ও টেকনিক্যাল পরিভাষাগুলো (যেমন React, Next.js, API, DOM, State, Props ইত্যাদি) হুবহু মূল ইংরেজিতে রাখুন।'
    ],
    hi: [
      'आप अत्यंत सरल, सहज और संवादात्मक भाषा में किसी भी तकनीकी या सामान्य विषय को बहुत आसान शब्दों में समझाते हैं।',
      'रोबोटिक अनुवाद से बचें। बिना किसी अनावश्यक लेबल या उप-शीर्षक के सीधे और स्वाभाविक रूप से बात समझाएं।',
      'तकनीकी शब्दों को मूल रूप में रखें।'
    ],
    es: [
      'Eres un educador excepcional que explica conceptos complejos de forma simple, directa e intuitiva.',
      'Evita etiquetas rígidas o lenguaje robótico; explica de manera fluida y conversacional en español sencillo.',
      'Mantén los términos técnicos intactos en inglés.'
    ],
    en: [
      'You are a world-class educator explaining complex engineering and general concepts with absolute clarity, direct conversational intuition, and simplicity.',
      'Avoid rigid categories or robotic labels; provide a clean, highly intuitive, and natural explanation in plain language.',
      'Keep code identifiers and technical terms intact in English.'
    ]
  };

  const FEW_SHOT_EXEMPLARS = [
    {
      source: "React components receive data and return what should appear on the screen. You can pass them new data in response to an interaction, like when the user types into an input. React will then update the screen to match the new data.",
      targetBn: "React components মূলত ডেটা গ্রহণ করে এবং স্ক্রিনে কী প্রদর্শিত হবে তা রিটার্ন করে। ইউজারের কোনো ইন্টারঅ্যাকশনের প্রেক্ষিতে (যেমন ইনপুট বক্সে কিছু টাইপ করলে) আপনি এতে নতুন ডেটা পাঠাতে পারেন। এরপর React সেই নতুন ডেটা অনুযায়ী স্ক্রিন আপডেট করে দেয়।",
      summaryBn: [
        "React components ডেটা (props/state) নেয় এবং স্ক্রিনে UI রেন্ডার করে।",
        "ইউজার কোনো অ্যাকশন করলে কম্পোনেন্টে নতুন ডেটা যায় এবং React সাথে সাথে স্ক্রিন রি-রেন্ডার করে।",
        "সম্পূর্ণ পেজ রিলোড না করে শুধু পরিবর্তিত অংশটি রিয়্যাক্টিভলি আপডেট হয়ে যায়।"
      ],
      explainBn: {
        concept: "একটি ওয়েবসাইটের পুরো লেআউটকে ছোট ছোট স্বাধীন টুকরোতে (যেমন হেডার, বাটন, প্রোডাক্ট কার্ড) ভাগ করে তৈরি করা এবং প্রয়োজনমতো ডাটা দিয়ে সেগুলোকে নিয়ন্ত্রণ করা।",
        analogy: "লেগো ব্লকের প্রতিটি টুকরো আলাদা থাকে এবং বিভিন্ন রঙের ব্লক জোড়া লাগিয়ে যেমন বাড়ি বানানো যায়, তেমনি কোডিংয়েও ছোট ছোট কম্পোনেন্ট জোড়া দিয়ে বড় ওয়েবসাইট তৈরি করা হয়।",
        whyItMatters: "একই কম্পোনেন্ট বারবার পুনর্ব্যবহার করা যায় এবং কোনো অংশে সমস্যা হলে শুধু নির্দিষ্ট কম্পোনেন্টটি পরিবর্তন করলেই কাজ হয়ে যায়।"
      }
    }
  ];

  /**
   * Generates a context-aware system prompt for Chrome Built-in LanguageModel / Summarizer.
   * Provides high-level agent instructions for domain-specific, executive-level summaries.
   * @param {string} [targetLang='bn']
   * @param {'translation'|'summarization'|'explanation'} [taskType='summarization']
   * @param {'tech'|'news'|'general'} [context='tech']
   * @returns {string}
   */
  function buildSystemPrompt(targetLang = 'bn', taskType = 'summarization', context = 'tech') {
    const ctx = CONTEXTUAL_CONFIG[context] ? context : 'tech';
    const i18n = getI18nLabels(targetLang, ctx);

    if (taskType === 'explanation') {
      const directives = EXPLAIN_SYSTEM_DIRECTIVES[targetLang] || EXPLAIN_SYSTEM_DIRECTIVES.en;
      return directives.join(' ');
    }

    if (taskType === 'summarization') {
      if (targetLang === 'bn') {
        return 'আপনি একজন দক্ষ ভাষা ও তথ্য বিশেষজ্ঞ। প্রদত্ত লেখার মূল ভাব ও গুরুত্বপূর্ণ তথ্যগুলো ২ থেকে ৩টি সংক্ষিপ্ত, প্রাঞ্জল ও তথ্যবহুল বুলেট পয়েন্টে (•) সারসংক্ষেপ করুন। কোনো অপ্রয়োজনীয় ক্যাটাগরি লেবেল বা ভূমিকা ছাড়া সরাসরি বুলেট পয়েন্ট লিখুন।';
      }
      if (targetLang === 'hi') {
        return 'आप एक कुशल भाषा व सूचना विशेषज्ञ हैं। दिए गए पाठ का मुख्य सार 2 से 3 संक्षिप्त, स्पष्ट और सटीक बुलेट पॉइंट्स (•) में प्रस्तुत करें। बिना किसी अनावश्यक लेबल के सीधे बुलेट पॉइंट्स लिखें।';
      }
      return 'You are an expert summarizer. Summarize the text into 2 to 3 concise, clear, and high-quality bullet points (•). Do not include artificial category labels or conversational filler. Output strictly bullet points.';
    }

    // Translation task
    const directives = LWS_SYSTEM_DIRECTIVES[targetLang] || LWS_SYSTEM_DIRECTIVES.en;
    let basePrompt = directives.join(' ');
    basePrompt += ' Translate clearly, naturally, and developer-friendly. Preserve code and technical keywords in English.';
    return basePrompt;
  }

  /**
   * Builds an instruction prompt with few-shot guidance if needed.
   * @param {string} text
   * @param {string} [targetLang='bn']
   * @param {'tech'|'news'|'general'} [context=null]
   * @param {'summarization'|'explanation'} [taskType='summarization']
   * @returns {string}
   */
  function buildUserPrompt(text, targetLang = 'bn', context = null, taskType = 'summarization') {
    const ctx = context || detectContext(text);

    if (taskType === 'explanation') {
      if (targetLang === 'bn') {
        return `নিচের বিষয়টি সাধারণ পাঠকের জন্য একদম সহজ, স্পষ্ট ও আকর্ষণীয় ভাষায় সরাসরি বুঝিয়ে লিখুন:\n\n${text}`;
      }
      if (targetLang === 'hi') {
        return `निम्नलिखित विषय को आम पाठक के लिए बिल्कुल सरल, स्पष्ट और सहज भाषा में समझाकर लिखें:\n\n${text}`;
      }
      return `Explain the following text in simple, clear, and intuitive language so that anyone can easily understand:\n\n${text}`;
    }

    if (targetLang === 'bn') {
      return `নিচের লেখাটির মূল সারসংক্ষেপ ২-৩টি সহজ ও স্পষ্ট বুলেট পয়েন্টে (•) লিখে দিন:\n\n${text}`;
    }
    if (targetLang === 'hi') {
      return `निम्नलिखित पाठ का मुख्य सारांश 2-3 स्पष्ट बुलेट पॉइंट्स (•) में लिखें:\n\n${text}`;
    }
    return `Summarize the following text into 2-3 clear, high-quality bullet points (•):\n\n${text}`;
  }

  /**
   * Returns few-shot exemplars for evaluation or fine-tuning prompts.
   */
  function getFewShotExemplars() {
    return FEW_SHOT_EXEMPLARS;
  }

  return {
    buildSystemPrompt,
    buildUserPrompt,
    detectContext,
    getFewShotExemplars,
    getI18nLabels,
    CONTEXTUAL_CONFIG,
    I18N_LABELS,
    LWS_SYSTEM_DIRECTIVES,
    EXPLAIN_SYSTEM_DIRECTIVES
  };
});
