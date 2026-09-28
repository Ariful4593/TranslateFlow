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

  // Multilingual UI & Summary Labels Dictionary
  const I18N_LABELS = {
    bn: {
      copy: 'কপি',
      copied: 'কপি হয়েছে!',
      listen: 'শুনুন',
      stop: 'থামান',
      replace: '⇄ প্রতিস্থাপন',
      undo: '↺ পূর্বাবস্থায় ফিরুন',
      summary: 'সারসংক্ষেপ',
      fullText: '↩ মূল অনুবাদ',
      summarizing: 'সহজ ভাষায় সারসংক্ষেপ তৈরি হচ্ছে...',
      badge: '💡 সহজ ভাষায় সারসংক্ষেপ',
      prefixes: ['🎯 মূল বিষয়: ', '⚙️ কীভাবে কাজ করে: ', '💡 বাস্তব সুবিধা: ']
    },
    hi: {
      copy: 'कॉपी',
      copied: 'कॉपी हो गया!',
      listen: 'सुनें',
      stop: 'रोकें',
      replace: '⇄ बदलें',
      undo: '↺ पहले जैसा करें',
      summary: 'सारांश',
      fullText: '↩ मूल अनुवाद',
      summarizing: 'सरल भाषा में सारांश तैयार हो रहा है...',
      badge: '💡 मुख्य बातें (सरल सारांश)',
      prefixes: ['🎯 मुख्य विषय: ', '⚙️ यह कैसे काम करता है: ', '💡 व्यावहारिक लाभ: ']
    },
    es: {
      copy: 'Copiar',
      copied: '¡Copiado!',
      listen: 'Escuchar',
      stop: 'Detener',
      replace: '⇄ Reemplazar',
      undo: '↺ Deshacer',
      summary: 'Resumen',
      fullText: '↩ Texto Original',
      summarizing: 'Generando resumen...',
      badge: '💡 Puntos Clave',
      prefixes: ['🎯 Concepto Clave: ', '⚙️ Cómo funciona: ', '💡 Beneficio Práctico: ']
    },
    fr: {
      copy: 'Copier',
      copied: 'Copié !',
      listen: 'Écouter',
      stop: 'Arrêter',
      replace: '⇄ Remplacer',
      undo: '↺ Annuler',
      summary: 'Résumé',
      fullText: '↩ Texte Complet',
      summarizing: 'Résumé en cours...',
      badge: '💡 Points Clés',
      prefixes: ['🎯 Concept Clé: ', '⚙️ Fonctionnement: ', '💡 Avantage Pratique: ']
    },
    de: {
      copy: 'Kopieren',
      copied: 'Kopiert!',
      listen: 'Anhören',
      stop: 'Stopp',
      replace: '⇄ Ersetzen',
      undo: '↺ Rückgängig',
      summary: 'Zusammenfassung',
      fullText: '↩ Vollständiger Text',
      summarizing: 'Zusammenfassung wird erstellt...',
      badge: '💡 Wichtigste Punkte',
      prefixes: ['🎯 Kernkonzept: ', '⚙️ Funktionsweise: ', '💡 Praktischer Nutzen: ']
    },
    ar: {
      copy: 'نسخ',
      copied: 'تم النسخ!',
      listen: 'استماع',
      stop: 'إيقاف',
      replace: '⇄ استبدال',
      undo: '↺ تراجع',
      summary: 'ملخص',
      fullText: '↩ النص الكامل',
      summarizing: 'جاري إنشاء الملخص...',
      badge: '💡 أهم النقاط',
      prefixes: ['🎯 المفهوم الأساسي: ', '⚙️ كيف يعمل: ', '💡 الفائدة العملية: ']
    },
    zh: {
      copy: '复制',
      copied: '已复制！',
      listen: '朗读',
      stop: '停止',
      replace: '⇄ 替换',
      undo: '↺ 撤销',
      summary: '要点摘要',
      fullText: '↩ 完整译文',
      summarizing: '正在生成摘要...',
      badge: '💡 核心要点',
      prefixes: ['🎯 核心概念: ', '⚙️ 工作原理: ', '💡 实际应用: ']
    },
    ja: {
      copy: 'コピー',
      copied: 'コピー完了！',
      listen: '読み上げ',
      stop: '停止',
      replace: '⇄ 置換',
      undo: '↺ 元に戻す',
      summary: '要約',
      fullText: '↩ 全文に戻る',
      summarizing: '要約を作成中...',
      badge: '💡 主なポイント',
      prefixes: ['🎯 コア概念: ', '⚙️ 動作の仕組み: ', '💡 実用的なメリット: ']
    },
    pt: {
      copy: 'Copiar',
      copied: 'Copiado!',
      listen: 'Ouvir',
      stop: 'Parar',
      replace: '⇄ Substituir',
      undo: '↺ Desfazer',
      summary: 'Resumo',
      fullText: '↩ Texto Completo',
      summarizing: 'Gerando resumo...',
      badge: '💡 Pontos Principais',
      prefixes: ['🎯 Conceito Principal: ', '⚙️ Como funciona: ', '💡 Benefício Prático: ']
    },
    ru: {
      copy: 'Копировать',
      copied: 'Скопировано!',
      listen: 'Слушать',
      stop: 'Стоп',
      replace: '⇄ Заменить',
      undo: '↺ Отменить',
      summary: 'Кратко',
      fullText: '↩ Полный текст',
      summarizing: 'Создание резюме...',
      badge: '💡 Главные тезисы',
      prefixes: ['🎯 Главная суть: ', '⚙️ Как это работает: ', '💡 Практическая польза: ']
    },
    ur: {
      copy: 'کاپی',
      copied: 'کاپی ہو گیا!',
      listen: 'سنیں',
      stop: 'روکیں',
      replace: '⇄ تبدیل کریں',
      undo: '↺ واپس کریں',
      summary: 'خلاصہ',
      fullText: '↩ اصل متن',
      summarizing: 'خلاصہ تیار کیا جا رہا ہے...',
      badge: '💡 اہم نکات',
      prefixes: ['🎯 بنیادی تصور: ', '⚙️ یہ کیسے کام کرتا ہے: ', '💡 عملی فائدہ: ']
    },
    en: {
      copy: 'Copy',
      copied: 'Copied!',
      listen: 'Listen',
      stop: 'Stop',
      replace: '⇄ Replace',
      undo: '↺ Undo',
      summary: 'Summary',
      fullText: '↩ Full Text',
      summarizing: 'Summarizing content...',
      badge: '💡 Key Takeaways',
      prefixes: ['🎯 Core Concept: ', '⚙️ How it works: ', '💡 Practical Tip: ']
    }
  };

  // Contextual Takeaway Configurations: Adapt prefixes and badges to content domain
  const CONTEXTUAL_CONFIG = {
    tech: {
      bn: {
        badge: '💡 সহজ ভাষায় সারসংক্ষেপ',
        prefixes: ['🎯 মূল বিষয়: ', '⚙️ কীভাবে কাজ করে: ', '💡 বাস্তব সুবিধা: ']
      },
      hi: {
        badge: '💡 मुख्य बातें (सरल सारांश)',
        prefixes: ['🎯 मुख्य विषय: ', '⚙️ यह कैसे काम करता है: ', '💡 व्यावहारिक लाभ: ']
      },
      en: {
        badge: '💡 Key Takeaways',
        prefixes: ['🎯 Core Concept: ', '⚙️ How it works: ', '💡 Practical Tip: ']
      },
      es: {
        badge: '💡 Puntos Clave',
        prefixes: ['🎯 Concepto Clave: ', '⚙️ Cómo funciona: ', '💡 Beneficio Práctico: ']
      }
    },
    news: {
      bn: {
        badge: '📰 সংবাদের মূল সারসংক্ষেপ',
        prefixes: ['📌 মূল সংবাদ: ', '💬 কী বলা হয়েছে: ', '📋 মূল সিদ্ধান্ত বা প্রভাব: ']
      },
      hi: {
        badge: '📰 मुख्य समाचार सारांश',
        prefixes: ['📌 मुख्य समाचार: ', '💬 क्या कहा गया: ', '📋 मुख्य निर्णय / प्रभाव: ']
      },
      en: {
        badge: '📰 News Takeaways',
        prefixes: ['📌 Key Event: ', '💬 What was said: ', '📋 Decision & Impact: ']
      },
      es: {
        badge: '📰 Resumen de Noticias',
        prefixes: ['📌 Noticia Principal: ', '💬 Declaraciones: ', '📋 Decisión e Impacto: ']
      }
    },
    general: {
      bn: {
        badge: '💡 মূল সারসংক্ষেপ',
        prefixes: ['📌 মূল কথা: ', '💡 গুরুত্বপূর্ণ দিক: ', '🔍 বিস্তারিত: ']
      },
      hi: {
        badge: '💡 मुख्य बातें',
        prefixes: ['📌 मुख्य बात: ', '💡 महत्वपूर्ण पहलू: ', '🔍 मुख्य विवरण: ']
      },
      en: {
        badge: '💡 Key Summary',
        prefixes: ['📌 Main Point: ', '💡 Key Aspect: ', '🔍 Notable Details: ']
      },
      es: {
        badge: '💡 Resumen Principal',
        prefixes: ['📌 Punto Principal: ', '💡 Aspecto Relevante: ', '🔍 Detalles: ']
      }
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

  // Core LWS Persona & Quality Principles per language
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

  const FEW_SHOT_EXEMPLARS = [
    {
      source: "React components receive data and return what should appear on the screen. You can pass them new data in response to an interaction, like when the user types into an input. React will then update the screen to match the new data.",
      targetBn: "React components মূলত ডেটা গ্রহণ করে এবং স্ক্রিনে কী প্রদর্শিত হবে তা রিটার্ন করে। ইউজারের কোনো ইন্টারঅ্যাকশনের প্রেক্ষিতে (যেমন ইনপুট বক্সে কিছু টাইপ করলে) আপনি এতে নতুন ডেটা পাঠাতে পারেন। এরপর React সেই নতুন ডেটা অনুযায়ী স্ক্রিন আপডেট করে দেয়।",
      summaryBn: [
        "🎯 মূল বিষয়: React component ডেটা (props/state) নেয় এবং স্ক্রিনে UI রেন্ডার করে।",
        "⚙️ কীভাবে কাজ করে: ইউজার কোনো অ্যাকশন করলে কম্পোনেন্টে নতুন ডেটা যায় এবং React সাথে সাথে স্ক্রিন রি-রেন্ডার করে।",
        "💡 বাস্তব সুবিধা: সম্পূর্ণ পেজ রিলোড না করে শুধু পরিবর্তিত অংশটি রিয়্যাক্টিভলি আপডেট হয়ে যায়।"
      ]
    }
  ];

  /**
   * Generates a context-aware system prompt for Chrome Built-in LanguageModel / Summarizer.
   * @param {string} [targetLang='bn']
   * @param {'translation'|'summarization'} [taskType='summarization']
   * @param {'tech'|'news'|'general'} [context='tech']
   * @returns {string}
   */
  function buildSystemPrompt(targetLang = 'bn', taskType = 'summarization', context = 'tech') {
    const ctx = CONTEXTUAL_CONFIG[context] ? context : 'tech';
    const i18n = getI18nLabels(targetLang, ctx);

    if (taskType === 'summarization') {
      if (ctx === 'news') {
        if (targetLang === 'bn') {
          return `আপনি সংবাদ প্রতিবেদন ও সাম্প্রতিক ঘটনার তথ্য অত্যন্ত সহজ ও প্রাঞ্জল বাংলায় উপস্থাপন করেন। খবরটির মূল ঘটনা, বক্তব্য ও ফলাফল ২ থেকে ৩টি স্পষ্ট পয়েন্টে (${i18n.prefixes.map(p => p.split(':')[0]).join(', ')}) সাজিয়ে দিন। কোনো ভুল বা বিভ্রান্তিকর টেকনিক্যাল শব্দ (যেমন 'কীভাবে কাজ করে') ব্যবহার করবেন না। শুধু পয়েন্টগুলো লিখুন।`;
        }
        if (targetLang === 'hi') {
          return `आप समाचार और घटनाओं को सरल व स्पष्ट हिंदी में 2 से 3 बिंदुओं (${i18n.prefixes.map(p => p.split(':')[0]).join(', ')}) में संक्षेप करते हैं। अप्रासंगिक तकनीकी शब्द प्रयोग न करें।`;
        }
        return `Summarize news and current events clearly and factually into 2 to 3 points (${i18n.prefixes.map(p => p.split(':')[0]).join(', ')}). Output only bullet points.`;
      }

      if (ctx === 'general') {
        if (targetLang === 'bn') {
          return `আপনি যেকোনো লেখার মূল ভাব ও গুরুত্বপূর্ণ বিষয়গুলো সহজ বাংলায় ২ থেকে ৩টি পয়েন্টে (${i18n.prefixes.map(p => p.split(':')[0]).join(', ')}) তুলে ধরেন। শুধু বুলেট পয়েন্ট লিখুন।`;
        }
        return `Summarize the content into 2 to 3 clear, concise takeaways (${i18n.prefixes.map(p => p.split(':')[0]).join(', ')}). Output only bullet points.`;
      }

      // Default: tech (LWS Style)
      const directives = LWS_SYSTEM_DIRECTIVES[targetLang] || LWS_SYSTEM_DIRECTIVES.en;
      let basePrompt = directives.join(' ');
      basePrompt += ` Output exactly 2 to 3 concise bullet points with the appropriate icons (${i18n.prefixes.map(p => p.split(':')[0]).join(', ')}). Output only bullet points without conversational filler.`;
      return basePrompt;
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
   * @returns {string}
   */
  function buildUserPrompt(text, targetLang = 'bn', context = null) {
    const ctx = context || detectContext(text);
    const i18n = getI18nLabels(targetLang, ctx);
    const markers = i18n.prefixes.map((p) => p.replace(/:\s*$/, '')).join(', ');

    if (ctx === 'news') {
      if (targetLang === 'bn') {
        return `নিচের সংবাদ প্রতিবেদনটি সহজ ভাষায় সংবাদের মূল বিষয় অনুযায়ী পয়েন্টে (${markers}) সারসংক্ষেপ করে দিন:\n\n${text}`;
      }
      if (targetLang === 'hi') {
        return `निम्नलिखित समाचार को स्पष्ट बिंदुओं (${markers}) में संक्षेप करें:\n\n${text}`;
      }
      return `Summarize this news article into clear takeaways (${markers}):\n\n${text}`;
    }

    if (targetLang === 'bn') {
      return `নিচের টেকনিক্যাল ডকুমেন্টেশনটি সুমিত সাহা (LWS) স্টাইলে ৩টি সহজ পয়েন্টে (${markers}) সারসংক্ষেপ করে দিন:\n\n${text}`;
    }
    if (targetLang === 'hi') {
      return `निम्नलिखित तकनीकी विवरण को सरल भाषा में 3 स्पष्ट बिंदुओं (${markers}) में संक्षेप करें:\n\n${text}`;
    }
    return `Summarize the following technical documentation in 3 clear takeaways (${markers}):\n\n${text}`;
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
    LWS_SYSTEM_DIRECTIVES
  };
});
