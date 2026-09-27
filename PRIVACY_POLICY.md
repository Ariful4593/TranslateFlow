# Privacy Policy for TranslateFlow

**Last Updated:** September 27, 2026

TranslateFlow ("the Extension", "we", "our") is dedicated to protecting your privacy. This Privacy Policy details how TranslateFlow handles user data, permissions, and network communications when you use the extension.

---

## 1. Core Principle: Zero Tracking & Privacy by Design

TranslateFlow is built on a privacy-first foundation:
- **No Personal Data Collection:** We do not collect, log, track, sell, or profile your personal information, browsing history, identity, IP address, or online behavior.
- **No Third-Party Analytics or Ads:** The extension contains no analytics trackers, tracking pixels, marketing telemetry, or advertising SDKs.
- **No Account Required:** You do not need to register an account, sign in, or provide an email address to use TranslateFlow.

---

## 2. Information We Process and How It Is Handled

### A. Selected Text & Translations
- **On-Device Translation (Primary):** When using Chrome's Built-in AI (`window.ai.translator`), text translation occurs directly on your computer inside your browser. No text is sent to any server.
- **Web Fallback Translation & Natural Voice Speech (Optional):** If on-device AI is unavailable on your system or you click the "Listen" (TTS) button, the selected text is transmitted over secure HTTPS directly to Google's translation services (`translate.googleapis.com` / `translate.google.com`) solely to generate the translation or audio stream. TranslateFlow does not intermediate, store, or log these requests.

### B. User Settings & Preferences
- **Local / Synced Storage:** The extension stores user preferences (e.g., target language, dark mode, floating trigger button visibility, font size, and technical term protection toggle) using Chrome's secure storage API (`chrome.storage.sync` and `chrome.storage.local`).
- **Data Location:** Your settings remain strictly within your personal Google Chrome profile and sync across your devices via your Google Account. We have no access to your settings or data.

---

## 3. Chrome Permissions and Their Usage

TranslateFlow requests only the minimum necessary permissions required for its functionality:

| Permission | Purpose |
| :--- | :--- |
| `storage` | Saves your personal extension preferences (target language, dark theme, font size, TTS toggle) locally in your browser. |
| `contextMenus` | Adds a convenient right-click context menu option ("Translate with TranslateFlow") to translate selected text. |
| `activeTab` | Allows the extension to interact with the currently active tab when you explicitly click the extension action button or trigger. |
| `https://translate.googleapis.com/*` & `https://translate.google.com/*` | Enables translation fallback and high-quality natural voice audio synthesis when on-device AI is unavailable. |

---

## 4. Third-Party Services

TranslateFlow does not share, monetize, or transfer your data to any third parties, data brokers, or advertising networks.

The only external network requests made by the extension are direct HTTPS requests to:
- **Google Translation & Audio APIs:** Governed by Google's Privacy Policy at [https://policies.google.com/privacy](https://policies.google.com/privacy).

---

## 5. Data Retention & Deletion

Because TranslateFlow stores no user data on external servers, there is no personal data retained.
- You can clear all local settings at any time by right-clicking the TranslateFlow extension icon in your Chrome toolbar, selecting **"Remove from Chrome"**, or clearing extension data via `chrome://extensions`.

---

## 6. Children's Privacy

TranslateFlow does not knowingly collect or solicit any information from anyone under the age of 13.

---

## 7. Compliance with Chrome Web Store Policies

TranslateFlow strictly adheres to the:
- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- **Single Purpose Policy:** TranslateFlow exists solely to provide inline and web text translation.
- **Limited Use Requirements:** Any user data processed is strictly used to provide the core user-facing translation functionality.

---

## 8. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect updates to the extension or policy standards. Any updates will be published directly to this document with a revised "Last Updated" date.

---

## 9. Contact Us

If you have questions, feedback, or concerns regarding this Privacy Policy, please open an issue on our GitHub repository:
- **GitHub Repository:** [https://github.com/Ariful4593/TranslateFlow](https://github.com/Ariful4593/TranslateFlow)
- **Contact:** [https://github.com/Ariful4593](https://github.com/Ariful4593)
