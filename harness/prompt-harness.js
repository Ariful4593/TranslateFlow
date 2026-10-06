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
      summarizing: 'সহজ ভাষায় সারসংক্ষেপ তৈরি হচ্ছে...',
      badge: '💡 সহজ ভাষায় সারসংক্ষেপ',
      explainBadge: '🧠 সহজ ভাষায় বিশ্লেষণ',
      prefixes: ['🎯 মূল বিষয়: ', '⚙️ কীভাবে কাজ করে: ', '💡 বাস্তব সুবিধা: ']
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
      summarizing: 'सरल भाषा में सारांश तैयार हो रहा है...',
      badge: '💡 मुख्य बातें (सरल सारांश)',
      explainBadge: '🧠 सरल भाषा में व्याख्या',
      prefixes: ['🎯 मुख्य विषय: ', '⚙️ यह कैसे काम करता है: ', '💡 व्यावहारिक लाभ: ']
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
      badge: '💡 Puntos Clave',
      explainBadge: '🧠 Explicación Didáctica',
      prefixes: ['🎯 Concepto Clave: ', '⚙️ Cómo funciona: ', '💡 Beneficio Práctico: ']
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
      badge: '💡 Points Clés',
      explainBadge: '🧠 Explication Simple',
      prefixes: ['🎯 Concept Clé: ', '⚙️ Fonctionnement: ', '💡 Avantage Pratique: ']
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
      badge: '💡 Wichtigste Punkte',
      explainBadge: '🧠 Einfache Erklärung',
      prefixes: ['🎯 Kernkonzept: ', '⚙️ Funktionsweise: ', '💡 Praktischer Nutzen: ']
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
      badge: '💡 أهم النقاط',
      explainBadge: '🧠 شرح مبسط ومفصل',
      prefixes: ['🎯 المفهوم الأساسي: ', '⚙️ كيف يعمل: ', '💡 الفائدة العملية: ']
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
      badge: '💡 核心要点',
      explainBadge: '🧠 通俗原理解析',
      prefixes: ['🎯 核心概念: ', '⚙️ 工作原理: ', '💡 实际应用: ']
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
      badge: '💡 主なポイント',
      explainBadge: '🧠 直感的な解説',
      prefixes: ['🎯 コア概念: ', '⚙️ 動作の仕組み: ', '💡 実用的なメリット: ']
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
      badge: '💡 Pontos Principais',
      explainBadge: '🧠 Explicação Descomplicada',
      prefixes: ['🎯 Conceito Principal: ', '⚙️ Como funciona: ', '💡 Benefício Prático: ']
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
      badge: '💡 Главные тезисы',
      explainBadge: '🧠 Простое объяснение',
      prefixes: ['🎯 Главная суть: ', '⚙️ Как это работает: ', '💡 Практическая польза: ']
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
      badge: '💡 اہم نکات',
      explainBadge: '🧠 آسان وضاحت',
      prefixes: ['🎯 بنیادی تصور: ', '⚙️ یہ کیسے کام کرتا ہے: ', '💡 عملی فائدہ: ']
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
      badge: '💡 Key Takeaways',
      explainBadge: '🧠 Intuitive Breakdown',
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

  // Core LWS Explanation Directives per language (Deep pedagogical intuition with real-world analogies)
  const EXPLAIN_SYSTEM_DIRECTIVES = {
    bn: [
      'আপনি সুমিত সাহা (Learn with Sumit)-এর মতো অত্যন্ত আকর্ষণীয়, আন্তরিক ও প্রাঞ্জল কথ্য বাংলায় জটিল টেকনিক্যাল বিষয় ও সাধারণ কনসেপ্ট একদম সহজ করে বুঝিয়ে দেন।',
      'কখনো রোবটিক বা আক্ষরিক বুকিশ অনুবাদ করবেন না। কথা বলার সুরে প্রাঞ্জল বাংলায় ৩টি গোছানো সেকশনে উপস্থাপন করুন:',
      '1. 💡 সহজ ভাষায় মূল বিষয়: কোনো কঠিন টেকনিক্যাল জার্গন বা কেতাবি ভাষা ছাড়া গল্প বলার মতো করে একদম সহজ ভাষায় ১-২ লাইনে মূল বিষয়টি বুঝিয়ে বলুন (যেমন "সহজ করে বললে...", "ধরা যাক আপনার একটি পেজ আছে...")।',
      '2. 🔍 বাস্তব জীবনের উদাহরণ: সম্পূর্ণ প্রাসঙ্গিক ও দৈনন্দিন জীবনের সাথে হুবহু মিল থাকা একটি চমৎকার বাস্তব উদাহরণ বা রূপক (Real-world Analogy) দিয়ে বুঝিয়ে দিন যাতে বিষয়টি সাথে সাথে মাথায় গেঁথে যায় (যেমন PPR-এর জন্য রেস্তোরাঁর মেনু ও ফ্রেশ রান্না, কম্পোনেন্টের জন্য লেগো ব্লক, স্ট্রিমিংয়ের জন্য ইউটিউব ভিডিও প্লে, API-এর জন্য রেস্তোরাঁর ওয়েটার)।',
      '3. ⚡ কেন এটি দরকার: প্রজেক্টে বা বাস্তবিক কাজে এটি ব্যবহারের মূল সুবিধা ও প্রয়োজনীয়তা কী।',
      'প্রোগ্রামিং পরিভাষাগুলো (যেমন React, Next.js, PPR, API, DOM, State, Props ইত্যাদি) হুবহু মূল ইংরেজিতে রাখুন।'
    ],
    hi: [
      'आप सुमित साहा (Learn with Sumit) की तरह सरल, रोचक और वास्तविक जीवन के उदाहरणों (Analogies) के साथ तकनीकी अवधारणाओं को गहराई से समझाते हैं।',
      'प्रस्तुति को 3 स्पष्ट खंडों में रखें:',
      '1. 💡 सरल शब्दों में: यह क्या है, बिना किसी जटिलता के आसान 1-2 पंक्तियों में सरल भाषा में।',
      '2. 🔍 वास्तविक जीवन का उदाहरण: एक सहज और सटीक दैनिक उदाहरण/एनालॉजी जिससे अवधारणा तुरंत समझ आ जाए।',
      '3. ⚡ यह क्यों आवश्यक है: वास्तविक काम और विकास में इसका मुख्य लाभ और आवश्यकता।',
      'तकनीकी शब्दों को मूल रूप में रखें और व्यावहारिक भाषा का प्रयोग करें।'
    ],
    es: [
      'Eres un educador técnico magistral al estilo de Learn with Sumit que desglosa conceptos complejos usando analogías de la vida real con máxima claridad e intuición.',
      'Estructura la explicación estrictamente en 3 secciones:',
      '1. 💡 En Palabras Sencillas: Qué es exactamente el concepto en 1-2 oraciones claras, directas y sin jerga confusa.',
      '2. 🔍 Analogía de la Vida Real: Una metáfora cotidiana y vívida que hace que el concepto sea instantáneamente comprensible.',
      '3. ⚡ Por Qué Es Importante: Su valor práctico y utilidad real para los desarrolladores.',
      'Mantén los nombres técnicos y de código intactos en inglés.'
    ],
    en: [
      'You are a world-class technical educator in the inspiring style of Learn with Sumit, explaining complex engineering and general concepts with absolute clarity, conversational intuition, and memorable real-world analogies.',
      'Structure the explanation strictly into 3 clear pedagogical sections:',
      '1. 💡 In Plain Terms: What the concept actually is in 1-2 simple, conversational, jargon-free sentences.',
      '2. 🔍 Real-World Analogy: A vivid, relatable everyday metaphor (e.g. restaurant kitchen, Lego bricks, sound mixer) that makes the concept click instantly.',
      '3. ⚡ Why It Matters: The practical engineering value, performance impact, or real-world necessity.',
      'Keep code identifiers and technical terms intact in English.'
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
      ],
      explainBn: {
        concept: "সহজ কথায়, একটি ওয়েবসাইটের পুরো লেআউটকে ছোট ছোট স্বাধীন টুকরোতে (যেমন হেডার, বাটন, প্রোডাক্ট কার্ড) ভাগ করে তৈরি করা এবং প্রয়োজনমতো ডাটা দিয়ে সেগুলোকে নিয়ন্ত্রণ করা।",
        analogy: "যেমন লেগো (Lego) ব্লকের প্রতিটি টুকরো আলাদা থাকে এবং বিভিন্ন রঙের ব্লক জোড়া লাগিয়ে যেমন আস্ত একটি সুন্দর বাড়ি বানানো যায়, তেমনি কোডিংয়েও ছোট ছোট কম্পোনেন্ট জোড়া দিয়ে বড় ওয়েবসাইট তৈরি করা হয়।",
        whyItMatters: "একই কম্পোনেন্ট বারবার পুনর্ব্যবহার (Reuse) করা যায় এবং কোনো অংশে সমস্যা হলে পুরো কোড না ঘেঁটে শুধু নির্দিষ্ট কম্পোনেন্টটি ঠিক করলেই কাজ হয়ে যায়।"
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
      if (ctx === 'news') {
        if (targetLang === 'bn') {
          return `আপনি একজন অভিজ্ঞ সংবাদ বিশ্লেষক ও সাংবাদিক। যেকোনো খবর বা সাম্প্রতিক ঘটনার সারসংক্ষেপ ৩টি স্পষ্ট ও তথ্যবহুল পয়েন্টে উপস্থাপন করুন:
1. 📌 মূল সংবাদ: (ঘটনাটি কী এবং মূল কারা জড়িত তা ১ লাইনে সুস্পষ্টভাবে তুলে ধরুন)
2. 💬 মূল বক্তব্য ও প্রেক্ষাপট: (কেন ঘটনাটি ঘটেছে, কী বিবৃতি, দাবি বা পটভূমি রয়েছে তা সংক্ষেপে গুছিয়ে লিখুন)
3. 📋 মূল সিদ্ধান্ত বা প্রভাব: (প্রশাসনের পদক্ষেপ, ফলাফল বা সামগ্রিক প্রভাব কী হতে পারে তা বিশ্লেষণ করুন)
কখনো কোনো ওয়েবসাইটের বিজ্ঞাপনী বাক্য বা অসম্পূর্ণ তথ্য রাখবেন না। শুধুমাত্র এই ৩টি পয়েন্ট সরাসরি লিখুন।`;
        }
        if (targetLang === 'hi') {
          return `आप एक कुशल समाचार विश्लेषक हैं। समाचार की मुख्य बातों को 3 स्पष्ट बिंदुओं में प्रस्तुत करें:
1. 📌 मुख्य समाचार: (घटना क्या है और कौन शामिल है, 1 पंक्ति में)
2. 💬 मुख्य बयान व संदर्भ: (कारण, बयान या पृष्ठभूमि)
3. 📋 मुख्य निर्णय या प्रभाव: (प्रशासन की कार्रवाई, परिणाम या प्रभाव)
अनावश्यक विज्ञापन या लिंक्स न जोड़ें। केवल ये 3 बिंदु लिखें।`;
        }
        return `You are an expert news analyst. Summarize the news article into 3 clear, structured takeaways:
1. 📌 Key Event: (What happened and who is involved in 1 crisp line)
2. 💬 Statements & Context: (Why it happened, statements made, or background context)
3. 📋 Decision & Impact: (Actions taken, outcomes, or broader significance)
Output strictly these 3 bullet points without conversational filler.`;
      }

      if (ctx === 'general') {
        if (targetLang === 'bn') {
          return `আপনি যেকোনো লেখার মূল ভাব ও গুরুত্বপূর্ণ বিষয়গুলো অত্যন্ত সহজ ও প্রাঞ্জল বাংলায় ৩টি গোছানো বুলেট পয়েন্টে উপস্থাপন করেন:
1. 📌 মূল কথা: (লেখার মূল প্রতিপাদ্য)
2. 💡 গুরুত্বপূর্ণ দিক: (প্রধান তথ্য বা যুক্তি)
3. 📋 মূল তাৎপর্য: (মূল ফলাফল বা সিদ্ধান্ত)
সরাসরি ৩টি পয়েন্ট লিখুন।`;
        }
        return `Summarize the content into 3 clear, high-level takeaways (📌 Main Point, 💡 Key Aspect, 📋 Significance). Output only bullet points.`;
      }

      // Default: tech (LWS Master Educator Persona)
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
   * @param {'summarization'|'explanation'} [taskType='summarization']
   * @returns {string}
   */
  function buildUserPrompt(text, targetLang = 'bn', context = null, taskType = 'summarization') {
    const ctx = context || detectContext(text);
    const i18n = getI18nLabels(targetLang, ctx);
    const markers = i18n.prefixes.map((p) => p.replace(/:\s*$/, '')).join(', ');

    if (taskType === 'explanation') {
      if (targetLang === 'bn') {
        return `নিচের বিষয়টি সুমিত সাহা (LWS) স্টাইলে একদম সহজ কথায়, একটি দারুণ বাস্তব জীবনের উদাহরণ (Analogy) দিয়ে এবং কেন এটি গুরুত্বপূর্ণ তা ৩টি সেকশনে (💡 সহজ কথায়, 🔍 বাস্তব জীবনের উদাহরণ, ⚡ কেন এটি গুরুত্বপূর্ণ) বুঝিয়ে দিন:\n\n${text}`;
      }
      if (targetLang === 'hi') {
        return `निम्नलिखित विषय को सरल भाषा में, एक सटीक वास्तविक जीवन के उदाहरण (Analogy) के साथ 3 खंडों (💡 सरल शब्दों में, 🔍 वास्तविक जीवन का उदाहरण, ⚡ यह क्यों महत्वपूर्ण है) में समझाइए:\n\n${text}`;
      }
      return `Explain the following concept in intuitive terms with a memorable real-world analogy in 3 sections (💡 In Plain Terms, 🔍 Real-World Analogy, ⚡ Why It Matters):\n\n${text}`;
    }

    if (ctx === 'news') {
      if (targetLang === 'bn') {
        return `প্রদত্ত সংবাদটি বিশ্লেষণ করে ৩টি পয়েন্টে (📌 মূল সংবাদ, 💬 মূল বক্তব্য ও প্রেক্ষাপট, 📋 মূল সিদ্ধান্ত বা প্রভাব) উচ্চমানের সারসংক্ষেপ তৈরি করুন:\n\n${text}`;
      }
      if (targetLang === 'hi') {
        return `दिए गए समाचार का विश्लेषण करके 3 बिंदुओं (📌 मुख्य समाचार, 💬 मुख्य बयान व संदर्भ, 📋 मुख्य निर्णय या प्रभाव) में उच्च-स्तरीय सारांश दें:\n\n${text}`;
      }
      return `Analyze and summarize this news report into 3 structured points (📌 Key Event, 💬 Statements & Context, 📋 Decision & Impact):\n\n${text}`;
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
    LWS_SYSTEM_DIRECTIVES,
    EXPLAIN_SYSTEM_DIRECTIVES
  };
});
