document.addEventListener('DOMContentLoaded', function () {
  const bionicReaderSwitch = document.getElementById('bionicReaderSwitch');

  // Get Bionic Reader state for the current tab
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tabId = tabs[0].id;
    chrome.runtime.sendMessage({ getTabState: { tabId } }, function (response) {
      bionicReaderSwitch.checked = response.isEnabled;
    });
  });

  bionicReaderSwitch.addEventListener('change', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;
      const isEnabled = bionicReaderSwitch.checked;
      chrome.runtime.sendMessage({ updateTabState: { tabId, isEnabled } });
      chrome.tabs.sendMessage(tabId, { bionicReaderEnabled: isEnabled }, function (response) {
        if (response.result === "success") {
          console.log("Bionic Reader applied/removed successfully.");
        } else {
          console.error("Error applying/removing Bionic Reader.");
        }
      });
    });
  });
});
