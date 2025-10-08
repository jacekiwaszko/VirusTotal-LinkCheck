// Load existing key on open
chrome.storage.sync.get(['apiKey'], (result) => {
  if (result.apiKey && result.apiKey !== 'YOUR_VT_API_KEY') {
    document.getElementById('apiKey').value = result.apiKey;
    document.getElementById('status').textContent = 'Key loaded! Ready to use.';
  }
});

document.getElementById('save').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (apiKey) {
    chrome.storage.sync.set({ apiKey: apiKey }, () => {
      document.getElementById('status').textContent = 'API key saved! Reload extension if needed.';
      // Notify background to reload key
      chrome.runtime.sendMessage({ action: 'reloadKey' });
    });
  } else {
    document.getElementById('status').textContent = 'Please enter a key.';
    document.getElementById('status').style.color = 'red';
  }
});

// Listen for reload message (if any)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'reloadKey') loadApiKey();
});