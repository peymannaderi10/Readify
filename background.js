const tabStates = {};

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({ bionicReaderEnabled: false }, function () {
    console.log("Bionic Reader is disabled by default.");
  });
});

chrome.browserAction.onClicked.addListener(function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs[0];
    const tabId = tab.id;
    const isEnabled = !tabStates[tabId];
    tabStates[tabId] = isEnabled;
    chrome.tabs.sendMessage(tabId, { bionicReaderEnabled: isEnabled });
    chrome.storage.sync.set({ bionicReaderEnabled: isEnabled });
  });
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  delete tabStates[tabId];
  chrome.storage.sync.remove(`bionicReaderEnabled_${tabId}`);
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  const tabId = activeInfo.tabId;
  if (tabStates.hasOwnProperty(tabId)) {
    const isEnabled = tabStates[tabId];
    chrome.tabs.sendMessage(tabId, { bionicReaderEnabled: isEnabled });
    chrome.storage.sync.set({ [`bionicReaderEnabled_${tabId}`]: isEnabled });
  } else {
    chrome.storage.sync.get(`bionicReaderEnabled_${tabId}`, function (data) {
      if (data[`bionicReaderEnabled_${tabId}`]) {
        chrome.tabs.sendMessage(tabId, { bionicReaderEnabled: true });
      } else {
        chrome.tabs.sendMessage(tabId, { bionicReaderEnabled: false });
      }
    });
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.updateTabState !== undefined) {
    const { tabId, isEnabled } = request.updateTabState;
    tabStates[tabId] = isEnabled;
    chrome.storage.sync.set({ [`bionicReaderEnabled_${tabId}`]: isEnabled });
    sendResponse({ result: "Tab state updated" });
  } else if (request.getTabState !== undefined) {
    const { tabId } = request.getTabState;
    sendResponse({ isEnabled: tabStates[tabId] || false });
  }
});
