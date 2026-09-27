# Chrome Web Store Listing — TranslateFlow

> Last Updated: 2026-09-27

## Store Listing

**Extension Name** [REQUIRED]
TranslateFlow: AI Web & Inline Translator

**Short Description** [REQUIRED]
Instant inline text and webpage translator with developer term preservation and natural neural voice speech.

**Detailed Description** [REQUIRED]
TranslateFlow is your intelligent, lightweight inline reading and translation companion designed for modern web browsing, developer documentation, research, and multilingual learning.

Whether you are studying engineering documentation, reading global news, or learning a new language, TranslateFlow lets you highlight any text on any webpage to see an instant, beautiful translation right where your eyes are—without switching tabs or losing your flow.

KEY HIGHLIGHTS

• Smart Inline Popover: Highlight any word, sentence, or paragraph to instantly view its translation in a floating, draggable card with smooth animations.
• Technical Term Preservation: Keeps code snippets, API names, frameworks, CSS classes, and programming keywords intact so technical documentation remains clear and accurate.
• Natural Neural Voice (Listen): Hear translations read aloud with expressive, human-like voice synthesis that respects conversational cadence and sentence pauses.
• International Language Hub: Built with rich, bidirectional support for Bangla (বাংলা) alongside English, Spanish, Hindi, French, German, Arabic, Japanese, Chinese, and more.
• In-Page Replacement: Effortlessly swap the original text on the webpage with the translated text in one click, or revert back at any time.
• Draggable & Non-Intrusive: Position the translation card wherever you like on your screen. Customize font size, dark theme, and trigger bubble visibility to match your workflow.
• Privacy-First by Design: Translates text directly in your browser with zero personal data collection, zero ad tracking, and zero browsing history logging.

HOW TO USE TRANSLATEFLOW

1. Select any text on any webpage using your mouse.
2. Click the floating translation bubble or right-click and choose "Translate with TranslateFlow".
3. View the instant translation, listen with the Listen button, or copy it with a single click.
4. Click the TranslateFlow icon in your Chrome toolbar at any time to switch target languages or customize your preferences.

PERMISSIONS & PRIVACY

TranslateFlow respects your privacy above all else:
- No personal data or browsing history is tracked, logged, or sold.
- Settings are saved securely in your personal Chrome browser profile.
- All translations occur directly in your browser, using secure Google translation services only when network fallback is needed.

SUPPORT & COMMUNITY

Have suggestions, feature requests, or questions? We would love to hear from you:
GitHub: https://github.com/Ariful4593/TranslateFlow


**Category** [REQUIRED]
Productivity

**Secondary Category** [RECOMMENDED]
Developer Tools

**Single Purpose** [REQUIRED]
Provides instant inline translation and speech of selected web text with technical term preservation.

**Primary Language** [REQUIRED]
English


## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|---|---|---|---|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Small Icon | 48×48 PNG | ✅ Ready | `icons/icon-48.png` |
| Tiny Icon | 16×16 PNG | ✅ Ready | `icons/icon-16.png` |
| Screenshot 1 (Inline Popover & Smooth UI) [REQUIRED] | 1280×800 | 🟡 To Capture | `assets/screenshot-1-popover.png` |
| Screenshot 2 (Technical Docs & Term Guardian) [RECOMMENDED] | 1280×800 | 🟡 To Capture | `assets/screenshot-2-tech-docs.png` |
| Screenshot 3 (Natural Voice TTS & Language Selector) [RECOMMENDED] | 1280×800 | 🟡 To Capture | `assets/screenshot-3-settings.png` |
| Small Promo Tile [RECOMMENDED] | 440×280 | 🟡 Prepared | `assets/promo-440x280.png` |
| Marquee Promo Tile | 1400×560 | ⬜ Optional | `assets/marquee-1400x560.png` |

### Screenshot Notes
- **Screenshot 1:** Shows a user reading a modern web article with text selected, displaying the floating TranslateFlow popover card with smooth slide animation and action toolbar.
- **Screenshot 2:** Demonstrates technical documentation (such as Next.js, MDN, or React docs) where code terms, API endpoints, and programming keywords are preserved during translation.
- **Screenshot 3:** Displays the toolbar popup menu showing target language selection (Bangla default, English, Spanish, Hindi, French, German, etc.) and active natural voice playback.


## Permissions Justification

| Permission | Type | Justification for Chrome Web Store Reviewers |
|---|---|---|
| `storage` | permissions | Required to save user preferences (target language, font size, dark theme, and trigger button visibility) locally in the browser profile. |
| `contextMenus` | permissions | Required to provide a right-click context menu option ("Translate with TranslateFlow") allowing users to translate highlighted text. |
| `activeTab` | permissions | Required to access the selected text in the active webpage only when the user explicitly triggers translation via context menu or toolbar action. |
| `https://translate.googleapis.com/*` | host_permissions | Required to fetch translation and natural audio data when Chrome Built-in on-device AI translation is not available on the user's device. |
| `https://translate.google.com/*` | host_permissions | Required to stream high-definition natural voice audio data for the Listen (TTS) feature. |


## Privacy & Data Use

### Data Collection Disclosure

**Does the extension collect user data?** No

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|---|---|---|---|---|
| Personally identifiable info | No | No | N/A | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | No | No | N/A | No |
| Personal communications | No | No | N/A | No |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | No | No | N/A | No |
| Website content | No | Only user-selected snippet | For real-time user-requested translation only | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes


## Privacy Policy

**Privacy Policy URL** [REQUIRED]
https://github.com/Ariful4593/TranslateFlow/blob/main/PRIVACY_POLICY.md


## Distribution

**Visibility**: Public
**Regions**: All regions (Worldwide)


## Developer Info

**Publisher Name** [REQUIRED]
TranslateFlow Team

**Contact / Support Email** [REQUIRED]
https://github.com/Ariful4593/TranslateFlow/issues

**Homepage URL** [RECOMMENDED]
https://github.com/Ariful4593/TranslateFlow


## Version History

| Version | Date | Changes | Status |
|---|---|---|---|
| 1.0.0 | 2026-09-27 | Initial public release: Inline popover translation, technical term preservation, human-like neural voice audio, smooth slide animations, and international target language selector. | Ready for Submission |
