# VirusTotal URL Reputation Checker Chrome Extension

This Chrome extension lets you check the reputation of any URL using [VirusTotal's API](https://developers.virustotal.com/v3.0/reference) by right-clicking a link. Instead of opening a new tab or popup, it displays a compact modal near the clicked link showing the VirusTotal score (e.g., "0/97 ✅" for safe URLs or "5/97 🚨" for risky ones). The modal includes a link to the full VirusTotal report for detailed analysis. This is ideal for verifying link safety before clicking, helping you avoid phishing, malware, or suspicious redirects.

## Benefits
- **Enhanced Safety**: Verify if a link is safe *before* clicking, reducing risks from malicious URLs (e.g., phishing, malware, or scams).
- **Non-Intrusive UI**: Shows a clean, clickable modal with the VirusTotal score (e.g., "0/97") right next to the link—no new tabs or popups.
- **Powered by VirusTotal**: Uses VirusTotal’s API, scanning URLs against 90+ antivirus engines and community reputation data.
- **Free to Use**: Works with a free VirusTotal API key (rate-limited to ~4 requests/minute).
- **Customizable**: Easily modify modal styles or add more VirusTotal data (e.g., detailed stats) as needed.

## Prerequisites
- **VirusTotal API Key**: Required for API access. See [Getting a VirusTotal API Key](#getting-a-virustotal-api-key) below.
- **Google Chrome**: Version 88 or later (supports Manifest V3).
- **Basic File Management**: Ability to download and unzip files from GitHub.

## Getting a VirusTotal API Key
1. **Sign Up**: Create a free account at [virustotal.com](https://www.virustotal.com/gui/join-us).
2. **Access Your Key**:
   - Log in to your VirusTotal account.
   - Navigate to [My API Key](https://www.virustotal.com/gui/my-apikey) (or go to your profile > API key).
   - Copy the API key (a long string, e.g., `a1b2c3...`).
3. **Keep It Secure**: Never share your API key publicly. You’ll paste it into the extension’s popup during setup.
4. **Rate Limits**: The free API is limited to ~4 requests/minute and 500 requests/day. For higher limits, consider [VirusTotal Premium](https://www.virustotal.com/gui/premium-services).

## Installation in Developer Mode
Follow these steps to install the extension in Chrome’s developer mode:

1. **Download the Extension**:
   - Clone this repository: `git clone <repo-url>` or download the ZIP file from GitHub.
   - If using ZIP, extract it to a folder (e.g., `vt-url-checker`).

2. **Enable Developer Mode in Chrome**:
   - Open Chrome and go to `chrome://extensions/`.
   - Toggle **Developer mode** (top-right corner) to ON.

3. **Load the Extension**:
   - Click **Load unpacked** on the Extensions page.
   - Select the folder containing the extension files (e.g., `vt-url-checker`).
   - The extension will appear in your Extensions list as "VirusTotal URL Reputation Checker."

4. **Set Up Your VirusTotal API Key**:
   - Click the extension icon in Chrome’s toolbar (or go to `chrome://extensions/` > Details > Extension options).
   - In the popup, paste your VirusTotal API key.
   - Click **Save Key**. A green "Key loaded! Ready to use." message confirms success.

5. **Verify Installation**:
   - Ensure the extension is enabled (check `chrome://extensions/`).
   - Right-click any link on a webpage; you should see "Check URL Reputation on VirusTotal" in the context menu.

## How to Use
1. **Check a Link**:
   - Visit any webpage (e.g., [example.com](https://example.com)).
   - Right-click a link (e.g., "More information..." linking to `https://www.iana.org/domains/example`).
   - Select **Check URL Reputation on VirusTotal** from the context menu.

2. **View the Result**:
   - After ~5-15 seconds (due to VirusTotal API processing), a small modal appears just below the link.
   - The modal shows:
     - **Score**: E.g., "0/97 ✅" (0 detections out of 97 engines = safe) or "5/97 🚨" (5 detections = risky).
     - **Link to Full Report**: Click "View Full Report" to open VirusTotal’s detailed analysis in a new tab.
   - If an error occurs (e.g., invalid API key or rate limit), the modal displays the error message.

3. **Close the Modal**:
   - Click the **Close** button in the modal.
   - Or click anywhere outside the modal to dismiss it.

4. **Debugging (Optional)**:
   - Open the background console: `chrome://extensions/` > Find the extension > Click "Details" > Click "service worker" under "Inspect views."
   - Look for logs like "Cleaned URL: ...", "Form body to send: ...", or errors (e.g., "VT Check Error: ...").
   - Common errors:
     - **401 Unauthorized**: Invalid API key—reset it in the popup.
     - **429 Too Many Requests**: Free API limit hit; wait ~15 minutes or upgrade to VirusTotal Premium.

## Example
- Visit [example.com](https://example.com).
- Right-click the "More information..." link (`https://www.iana.org/domains/example`).
- Select "Check URL Reputation on VirusTotal."
- After a few seconds, see a modal with: "Score: 0/97 ✅" and a link to VirusTotal’s report.
- For a risky URL, you might see "Score: 3/97 🚨," warning you to avoid clicking.

## Limitations
- **API Rate Limits**: Free VirusTotal API keys are limited to ~4 requests/minute and 500 requests/day. Exceeding this shows a "429" error in the modal—wait or use a Premium key.
- **Long URLs**: URLs over ~2KB may fail (rare, but ad links can hit this). The extension trims basic issues, but complex URLs may need manual checks on VirusTotal’s site.
- **Processing Time**: Scans take 5-15 seconds due to VirusTotal’s polling (caches help for recently scanned URLs).
- **Page Styling**: Some websites’ CSS may overlap the modal. Adjust `zIndex` in `background.js` if needed.

## Customization Ideas
- **Modal Style**: Edit the CSS in `background.js`’s `injectModal` function (e.g., change colors, size, or fonts).
- **More Data**: Modify `injectModal` to show additional VirusTotal stats (e.g., malicious engines, last scan date).
- **Persistent Modals**: Adjust the content script to keep multiple modals open (requires storing modal instances).

## Troubleshooting
- **No Modal Appears**:
  - Check background console for errors (`chrome://extensions/` > Details > service worker).
  - Ensure API key is set (extension popup > verify "Key loaded!").
  - Test with a simple URL like `https://example.com`.
- **Error Messages**:
  - "Missing API Key": Set key in the popup.
  - "Scan failed: 400/401": Check API key validity.
  - "429 Too Many Requests": Wait 15 minutes or use a Premium key.
- **Modal Position Off**: Some pages’ CSS may interfere. Increase `zIndex` in `background.js`’s `injectModal` (e.g., `modal.style.zIndex = '99999'`).

## Contributing
- Fork this repo and submit pull requests for improvements (e.g., better UI, caching, or error handling).
- Report issues via GitHub Issues with console logs and steps to reproduce.

## License
MIT License—see `LICENSE` file for details.