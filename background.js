const tabStates = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ tabStates }, () => {
    console.log("Bionic Reader is disabled by default.");
  });
});

chrome.action.onClicked.addListener((tab) => {
  const tabId = tab?.id;
  const isEnabled = !tabStates[tabId];
  tabStates[tabId] = isEnabled;
  chrome.storage.sync.set({ tabStates });
  chrome.tabs.sendMessage(tabId, { bionicReaderEnabled: isEnabled });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabStates[tabId];
  chrome.storage.sync.set({ tabStates });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo?.tabId;
  if (tabStates.hasOwnProperty(tabId)) {
    const isEnabled = tabStates[tabId];
    chrome.tabs.sendMessage(tabId, { bionicReaderEnabled: isEnabled });
  } else {
    chrome.storage.sync.get(["tabStates"], ({ tabStates }) => {
      const isEnabled = tabStates?.[tabId] ?? false;
      chrome.tabs.sendMessage(tabId, { bionicReaderEnabled: isEnabled });
    });
  }
});

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    if (request?.updateTabState !== undefined) {
      const { tabId, isEnabled } = request.updateTabState;
      tabStates[tabId] = isEnabled;
      chrome.storage.sync.set({ tabStates });
      sendResponse({ result: "Tab state updated" });
    } else if (request?.getTabState !== undefined) {
      const { tabId } = request.getTabState;
      sendResponse({ isEnabled: tabStates[tabId] || false });
    }
  }
);
