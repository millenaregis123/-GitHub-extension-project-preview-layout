// ─── PR Preview Vercel ─ Background Service Worker ────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'openTab' && msg.url) {
    chrome.tabs.create({ url: msg.url, active: true });
    sendResponse({ ok: true });
  }

  if (msg.action === 'openPopup') {
    // Abre a página de configurações (options page) como fallback
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    sendResponse({ ok: true });
  }

  return true;
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  }
});
