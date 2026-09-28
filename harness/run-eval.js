/**
 * Automated Evaluation Harness for TranslateFlow (Harness Engineering)
 * Runs benchmarks across React, Web Audio, Next.js, and JS async documentation,
 * evaluating Translation Quality & LWS Pedagogical Summaries against strict rubrics.
 *
 * Usage: node harness/run-eval.js
 */

const fs = require('fs');
const path = require('path');

// 1. Setup global environment for browser modules
global.window = {};
global.self = global.window;

// 2. Load harness guidelines & benchmarks
const guidelines = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'specs', 'lws-guidelines.json'), 'utf8')
);
const benchmarks = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'specs', 'benchmarks.json'), 'utf8')
);

// 3. Load runtime engines
const termGuardianCode = fs.readFileSync(
  path.join(__dirname, '..', 'content', 'term-guardian.js'),
  'utf8'
);
const summarizerCode = fs.readFileSync(
  path.join(__dirname, '..', 'content', 'summarizer-engine.js'),
  'utf8'
);
const promptHarness = require('./prompt-harness');

eval(termGuardianCode);
eval(summarizerCode);

console.log('========================================================================');
console.log('  TranslateFlow - Automated Evaluation Harness (LWS Standard)');
console.log(`  Version: ${guidelines.version} | Spec: ${guidelines.name}`);
console.log('========================================================================\n');

let totalScoreSum = 0;
let benchmarkCount = 0;
let hasFailures = false;

// Sample raw machine translation simulation for evaluation (mimicking raw GT/Chrome output before TermGuardian)
const rawMachineTranslations = {
  'react-components-data-flow':
    'React components ডেটা গ্রহণ করুন এবং স্ক্রিনে যা উপস্থিত হওয়া উচিত তা ফেরত দিন। আপনি তাদের response-এ একটি ইন্টারঅ্যাকশনে নতুন ডেটা পাঠাতে পারেন, যেমন ব্যবহারকারী যখন একটি ইনপুটে টাইপ করে। React তারপর নতুন ডেটার সাথে মেলে স্ক্রিন আপডেট করবে।',
  'mdn-web-audio-loading':
    'এখন, আমরা যে অডিও প্রসঙ্গ তৈরি করেছি তা চালানোর জন্য কিছু শব্দ প্রয়োজন। API এর সাথে এটি করার কয়েকটি উপায় রয়েছে। আসুন একটি সহজ পদ্ধতি দিয়ে শুরু করা যাক — যেহেতু আমাদের একটি বুমবক্স আছে, আমরা সম্ভবত একটি সম্পূর্ণ গানের ট্র্যাক চালাতে চাই। এছাড়াও, অ্যাক্সেসিবিলিটির জন্য, সেই ট্র্যাকটিকে DOM-এ উন্মোচিত করা ভালো। আমরা <audio> এলিমেন্ট ব্যবহার করে পেজে গানটি উন্মোচিত করব।',
  'nextjs-streaming-granularity':
    'Suspense এর সাথে দানাদার স্ট্রিমিং একক ব্লকিং পাস ছাড়াই ভাইবোন উপাদান গুলিকে স্বাধীনভাবে সমাধান করতে দেয়। ব্যক্তিগতকৃত ডেটা streaming করার সময় স্ট্যাটিক বিষয়বস্তু অবিলম্বে সরবরাহ করা যেতে পারে।',
  'react-architecture-hindi':
    'React एक वास्तुकला भी है। फ्रेमवर्क जो इसे लागू करते हैं, आपको fetch डेटा को अतुल्यकालिक components में सर्वर पर या निर्माण के दौरान भी चलाने की सुविधा देता है। किसी फ़ाइल या डेटाबेस से डेटा पढ़ें, और इसे अपने इंटरैक्टिव components में पास करें।'
};

benchmarks.forEach((bench) => {
  benchmarkCount++;
  console.log(`[Benchmark #${benchmarkCount}]: ${bench.name} (${bench.id})`);

  const rawTranslation = rawMachineTranslations[bench.id] || bench.sourceText;
  
  // 1. Process translation through TermGuardian
  const cleanedTranslation = bench.targetLanguage === 'bn'
    ? window.TermGuardian.postProcessBengaliText(rawTranslation)
    : rawTranslation;

  // 2. Generate summary points using SummarizerEngine
  const summaryPoints = window.SummarizerEngine.smartExtractKeyPoints(
    cleanedTranslation,
    bench.targetLanguage
  );

  // Rubric 1: Term Preservation (Max 30 pts)
  let termScore = 30;
  const missingTerms = [];
  bench.requiredTerms.forEach((term) => {
    if (!cleanedTranslation.toLowerCase().includes(term.toLowerCase())) {
      termScore -= 10;
      missingTerms.push(term);
    }
  });
  termScore = Math.max(0, termScore);

  // Rubric 2: Grammar & Imperative Verb Penalty (Max 25 pts)
  let grammarScore = 25;
  const foundForbidden = [];
  bench.forbiddenSubstrings.forEach((forbidden) => {
    if (cleanedTranslation.includes(forbidden) || summaryPoints.some(pt => pt.includes(forbidden))) {
      grammarScore -= 10;
      foundForbidden.push(forbidden);
    }
  });
  // Check for any remaining Bengali imperative command verbs
  if (bench.targetLanguage === 'bn' && /(\b|\s)(করুন|দিন|নিন|পাঠান)(\b|\s|[।!?])/i.test(cleanedTranslation)) {
    grammarScore -= 10;
    foundForbidden.push('imperative verb');
  }
  grammarScore = Math.max(0, grammarScore);

  // Rubric 3: Natural Phrasing & Fluency (Max 25 pts)
  let fluencyScore = 25;
  if (cleanedTranslation.includes('উপস্থিত হওয়া উচিত') || cleanedTranslation.includes('মেলে স্ক্রিন')) {
    fluencyScore -= 15;
  }
  if (cleanedTranslation.includes('অডিও প্রসঙ্গ') || cleanedTranslation.includes('শব্দ প্রয়োজন')) {
    fluencyScore -= 15;
  }
  fluencyScore = Math.max(0, fluencyScore);

  // Rubric 4: LWS 3-Tier Structure Compliance (Max 20 pts)
  let structureScore = 20;
  const foundMarkers = [];
  bench.expectedSummaryMarkers.forEach((marker) => {
    const hasMarker = summaryPoints.some((pt) => pt.includes(marker));
    if (hasMarker) {
      foundMarkers.push(marker);
    } else {
      structureScore -= 7;
    }
  });
  structureScore = Math.max(0, structureScore);

  // Composite Score
  const totalScore = termScore + grammarScore + fluencyScore + structureScore;
  totalScoreSum += totalScore;

  const passed = totalScore >= 90;
  if (!passed) hasFailures = true;

  console.log(`  > Cleaned Translation: "${cleanedTranslation.slice(0, 110)}..."`);
  console.log(`  > LWS Summary Points: [${summaryPoints.length} points generated]`);
  summaryPoints.forEach((pt) => console.log(`      ${pt}`));
  console.log(`  > Scorecard:`);
  console.log(`      • Term Preservation:       ${termScore}/30 pts ${missingTerms.length ? '(Missing: ' + missingTerms.join(', ') + ')' : '✓'}`);
  console.log(`      • Grammar & Verbs:         ${grammarScore}/25 pts ${foundForbidden.length ? '(Found: ' + foundForbidden.join(', ') + ')' : '✓'}`);
  console.log(`      • Naturalness & Fluency:   ${fluencyScore}/25 pts`);
  console.log(`      • LWS 3-Tier Structure:    ${structureScore}/20 pts (${foundMarkers.join(', ')})`);
  console.log(`  > Final Composite Score: ${totalScore}/100 [${passed ? 'PASS' : 'FAIL'}]\n`);
});

const averageScore = Math.round(totalScoreSum / benchmarkCount);

console.log('------------------------------------------------------------------------');
console.log(`  OVERALL HARNESS RESULT: ${averageScore}/100 [${averageScore >= 90 ? 'PASSED' : 'NEEDS ADJUSTMENT'}]`);
console.log('------------------------------------------------------------------------\n');

if (hasFailures || averageScore < 90) {
  console.error('❌ Harness evaluation failed threshold requirements.');
  process.exit(1);
} else {
  console.log('✅ All benchmarks passed LWS Quality & Harness Engineering criteria!');
  process.exit(0);
}
