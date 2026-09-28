/**
 * PromptHarness - Prompt Engineering & Quality Orchestrator for TranslateFlow
 * Ingests the LWS (Learn with Sumit) guidelines, enforcing terminology protocols,
 * declarative verb tenses, and structured pedagogical takeaways.
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

  // Core LWS Persona & Quality Principles
  const LWS_SYSTEM_DIRECTIVES = {
    bn: [
      'আপনি সুমিত সাহা (Learn with Sumit)-এর মতো অত্যন্ত আকর্ষণীয়, বন্ধুত্বপূর্ণ ও প্রাঞ্জল কথ্য বাংলায় টেকনিক্যাল কনসেপ্ট বুঝিয়ে দেন।',
      'কখনো রোবটিক বা আক্ষরিক অনুবাদ করবেন না। কোডের কর্মপদ্ধতি বর্ণনায় সবসময় থার্ড-পারসন ডিক্লারেটিভ ক্রিয়াপদ (করে, দেয়, নেয়, পাঠায়, রেন্ডার করে) ব্যবহার করবেন; ভুলবশত কখনো আদেশবাচক ক্রিয়াপদ (করুন, দিন, নিন) ব্যবহার করবেন না।',
      'প্রোগ্রামিং ও ওয়েব টেকনোলজির পরিভাষাগুলো (যেমন React components, AudioContext, DOM, props, state, API, <audio>, render ইত্যাদি) সম্পূর্ণ অবিকল ইংরেজিতে রাখবেন।',
      'আউটপুট সবসময় ৩টি সুনির্দিষ্ট ধাপে সাজিয়ে দিন: 🎯 মূল বিষয় (সহজ কথায় ১ লাইনে), ⚙️ কীভাবে কাজ করে (আন্ডার-দ্য-হুড মেকানিজম), 💡 বাস্তব সুবিধা (ব্যবহারের উপকারিতা)।'
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
   * @returns {string}
   */
  function buildSystemPrompt(targetLang = 'bn', taskType = 'summarization') {
    const isEn = targetLang === 'en';
    const directives = isEn ? LWS_SYSTEM_DIRECTIVES.en : LWS_SYSTEM_DIRECTIVES.bn;

    let basePrompt = directives.join(' ');

    if (taskType === 'summarization') {
      basePrompt += isEn
        ? ' Output exactly 2 to 3 concise bullet points with the appropriate icons (🎯, ⚙️, 💡). Do not include conversational filler.'
        : ' অতিরিক্ত কথা না বাড়িয়ে সরাসরি ৩টি বুলেট পয়েন্টে (🎯, ⚙️, 💡 সহ) গুছিয়ে উত্তর দিন।';
    } else {
      basePrompt += isEn
        ? ' Translate clearly and naturally for developers. Preserve code and technical keywords.'
        : ' সহজ, প্রাঞ্জল ও ডেভেলপার-বান্ধব বাংলায় অনুবাদ করুন। টেকনিক্যাল শব্দগুলো অবিকল রাখুন।';
    }

    return basePrompt;
  }

  /**
   * Builds an instruction prompt with few-shot guidance if needed.
   * @param {string} text
   * @param {string} [targetLang='bn']
   * @returns {string}
   */
  function buildUserPrompt(text, targetLang = 'bn') {
    const isEn = targetLang === 'en';
    if (isEn) {
      return `Summarize the following technical documentation clearly:\n\n${text}`;
    }
    return `নিচের টেকনিক্যাল ডকুমেন্টেশনটি সুমিত সাহা (LWS) স্টাইলে ৩টি সহজ পয়েন্টে (🎯 মূল বিষয়, ⚙️ কীভাবে কাজ করে, 💡 বাস্তব সুবিধা) সারসংক্ষেপ করে দিন:\n\n${text}`;
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
    getFewShotExemplars,
    LWS_SYSTEM_DIRECTIVES
  };
});
