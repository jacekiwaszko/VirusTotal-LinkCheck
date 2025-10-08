let VT_API_KEY = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "checkUrlReputation",
    title: "Check URL Reputation on VirusTotal",
    contexts: ["link"]
  });
  loadApiKey();
});

async function loadApiKey() {
  const result = await chrome.storage.sync.get(['apiKey']);
  VT_API_KEY = result.apiKey || null;
  console.log('API Key loaded:', VT_API_KEY ? 'Yes (hidden)' : 'No - Set it in popup');
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "checkUrlReputation" && info.linkUrl) {
    console.log('Context menu clicked for URL:', info.linkUrl);
    let url = info.linkUrl.trim();
    url = url.replace(/:$/, '');
    console.log('Cleaned URL:', url);
    const x = Number.isFinite(parseFloat(info.pageX)) ? parseFloat(info.pageX) : -1;
    const y = Number.isFinite(parseFloat(info.pageY)) ? parseFloat(info.pageY) : -1;
    console.log('Raw coordinates:', { pageX: info.pageX, pageY: info.pageY });
    console.log('Sanitized coordinates:', { x, y });
    
    // Generate unique ID for this request
    const requestId = `vt-modal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    // Show immediate "Checking..." modal
    const loadingContent = JSON.stringify({
      title: 'Checking URL...',
      message: 'Please wait... <span class="vt-spinner"></span>',
      url: url
    });
    console.log('Injecting loading modal with:', { x, y, content: loadingContent, requestId });
    await injectModal(tab.id, x, y, loadingContent, requestId);
    
    await checkUrlReputation(url, x, y, tab.id, requestId);
  }
});

async function checkUrlReputation(url, x, y, tabId, requestId) {
  console.log('Starting URL check for:', url);
  
  if (!VT_API_KEY) {
    await loadApiKey();
    if (!VT_API_KEY) {
      console.log('No API key - Opening options');
      chrome.runtime.openOptionsPage();
      const content = JSON.stringify({
        title: 'Missing API Key',
        message: 'Please set your VirusTotal API key in the extension popup.',
        url: ''
      });
      console.log('Injecting error modal with:', { x, y, content, requestId });
      await injectModal(tabId, x, y, content, requestId);
      return;
    }
  }

  try {
    console.log('Submitting URL for scan...');
    const formData = new URLSearchParams();
    formData.append('url', url);
    console.log('Form body to send:', formData.toString());
    
    const scanResponse = await fetch('https://www.virustotal.com/api/v3/urls', {
      method: 'POST',
      headers: {
        'x-apikey': VT_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!scanResponse.ok) {
      const errorText = await scanResponse.text();
      throw new Error(`Scan failed: ${scanResponse.status} - ${errorText}`);
    }

    const scanData = await scanResponse.json();
    const analysisId = scanData.data.id.split('/').pop();
    console.log('Scan submitted, ID:', analysisId);

    // Poll for results
    let report;
    const maxAttempts = 15;
    for (let i = 0; i < maxAttempts; i++) {
      console.log(`Polling attempt ${i + 1}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      const reportResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
        headers: { 
          'x-apikey': VT_API_KEY,
          'Accept': 'application/json'
        }
      });

      if (!reportResponse.ok) {
        const errorText = await reportResponse.text();
        throw new Error(`Report fetch failed: ${reportResponse.status} - ${errorText}`);
      }

      const reportData = await reportResponse.json();
      const status = reportData.data.attributes.status;
      console.log('Analysis status:', status);
      
      if (status === 'completed') {
        report = reportData.data.attributes.stats;
        console.log('Report fetched successfully');
        break;
      } else if (status === 'error') {
        throw new Error('Analysis failed: ' + (reportData.data.attributes.error || 'Unknown'));
      }
    }

    if (!report) {
      throw new Error('Scan timed out - URL not analyzed yet. Try again in a minute.');
    }

    // Prepare score for modal
    const total = report.harmless + report.malicious + report.suspicious + report.undetected + report.timeout;
    const detections = report.malicious + report.suspicious;
    const score = `${detections}/${total}`;
    const content = JSON.stringify({
      title: 'VirusTotal Score',
      message: `Score: ${score} ${detections > 0 ? '🚨' : '✅'}`,
      url: url
    });
    console.log('Injecting result modal with:', { x, y, content, requestId });
    await injectModal(tabId, x, y, content, requestId);

  } catch (error) {
    console.error('VT Check Error:', error);
    const content = JSON.stringify({
      title: 'URL Check Error',
      message: `Failed to check ${url}: ${error.message}`,
      url: ''
    });
    console.log('Injecting error modal with:', { x, y, content, requestId });
    await injectModal(tabId, x, y, content, requestId);
  }
}

async function injectModal(tabId, x, y, content, requestId) {
  try {
    console.log('Injection args:', {
      x: { value: x, type: typeof x },
      y: { value: y, type: typeof y },
      content: { value: content, type: typeof content },
      requestId: { value: requestId, type: typeof requestId }
    });

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (clickX, clickY, contentStr, requestId) => {
        console.log('[Content Script] Starting modal injection for request:', requestId);
        console.log('[Content Script] Received coords:', { clickX, clickY });
        console.log('[Content Script] Content:', contentStr);

        // Parse content
        const { title, message, url } = JSON.parse(contentStr);

        // Remove any existing modal with same requestId
        const existing = document.getElementById(`vt-reputation-modal-${requestId}`);
        if (existing) {
          console.log('[Content Script] Removing existing modal:', `vt-reputation-modal-${requestId}`);
          existing.remove();
        }

        // Find the link at click position
        let rect = { left: clickX < 0 ? window.innerWidth / 2 - 175 : clickX, top: clickY < 0 ? window.innerHeight / 3 : clickY };
        if (clickX >= 0 && clickY >= 0) {
          const link = document.elementFromPoint(clickX, clickY);
          if (link && link.tagName === 'A') {
            rect = link.getBoundingClientRect();
            console.log('[Content Script] Link found at:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
          } else {
            console.log('[Content Script] No link found, using provided coords:', { clickX, clickY });
          }
        } else {
          console.log('[Content Script] Invalid coords, using center fallback:', rect);
        }

        // Bound coordinates to viewport
        const maxX = window.innerWidth - 350;
        const maxY = window.innerHeight - 150;
        const finalLeft = Math.max(0, Math.min(rect.left + window.scrollX, maxX));
        const finalTop = Math.max(0, Math.min((rect.bottom || rect.top + 20) + window.scrollY + 5, maxY));
        console.log('[Content Script] Final modal position:', { left: finalLeft, top: finalTop });

        // Shorten URL if too long
        let displayUrl = url;
        if (url) {
          try {
            const parsedUrl = new URL(url);
            if (url.length > 40) {
              displayUrl = `${parsedUrl.hostname}/...`;
            }
          } catch (e) {
            console.log('[Content Script] URL parsing error:', e.message);
          }
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = `vt-reputation-modal-${requestId}`;
        modal.style.position = 'fixed';
        modal.style.left = `${finalLeft}px`;
        modal.style.top = `${finalTop}px`;
        modal.style.background = 'rgba(255, 255, 255, 0.3)';
        modal.style.backdropFilter = 'blur(5px)';
        modal.style.border = '1px solid rgba(255, 255, 255, 0.5)';
        modal.style.borderRadius = '8px';
        modal.style.padding = '25px';
        modal.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        modal.style.zIndex = '999999';
        modal.style.fontFamily = 'Arial, sans-serif';
        modal.style.fontSize = '18px';
        modal.style.fontWeight = 'bold';
        modal.style.maxWidth = '350px';
        modal.style.color = '#ffffff';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.style.display = 'block';
        modal.style.textAlign = 'center';
        modal.style.lineHeight = '1.5';
        // Double-encode dots and slashes for VirusTotal search URL
        const doubleEncodedUrl = url ? encodeURIComponent(url).replace(/%2E/g, '%252E').replace(/%2F/g, '%252F') : '';
        modal.innerHTML = `
          <style>
            .vt-spinner::after {
              content: '';
              display: inline-block;
              width: 16px;
              height: 16px;
              border: 2px solid #ffffff;
              border-radius: 50%;
              border-top-color: #007bff;
              animation: spin 1s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
          ${url ? `<span style="font-size:14px;font-weight:normal;display:block;margin-bottom:8px;text-shadow:0 0 4px rgba(0,0,0,0.8);">${displayUrl}</span>` : ''}
          <strong style="font-size:20px;display:block;margin-bottom:12px;text-shadow:0 0 4px rgba(0,0,0,0.8);">${title}</strong>
          <span style="display:block;margin-bottom:12px;text-shadow:0 0 4px rgba(0,0,0,0.8);">${message}</span>
          ${url ? `<a href="https://www.virustotal.com/gui/search/${doubleEncodedUrl}" target="_blank" style="color:#ffffff;text-decoration:underline;font-weight:normal;display:block;margin-top:12px;text-shadow:0 0 4px rgba(0,0,0,0.8);">View Full Report</a>` : ''}
        `;
        document.body.appendChild(modal);
        console.log('[Content Script] Modal appended to document.body, ID:', modal.id);

        // Log computed styles
        const computedStyle = window.getComputedStyle(modal);
        console.log('[Content Script] Modal computed styles:', {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          zIndex: computedStyle.zIndex,
          left: computedStyle.left,
          top: computedStyle.top,
          textAlign: computedStyle.textAlign,
          lineHeight: computedStyle.lineHeight
        });

        // Close on click outside
        document.addEventListener('click', function closeModal(e) {
          if (!modal.contains(e.target)) {
            console.log('[Content Script] Closing modal due to outside click');
            modal.remove();
            document.removeEventListener('click', closeModal);
          }
        });
      },
      args: [x, y, content, requestId]
    });
    console.log('Modal injected successfully for content:', content);
  } catch (error) {
    console.error('Modal Injection Error:', error);
  }
}