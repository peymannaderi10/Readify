const bionicReaderSwitch = document.getElementById('bionicReaderSwitch');

chrome.storage.sync.get('bionicReaderEnabled', function (data) {
  bionicReaderSwitch.checked = data.bionicReaderEnabled;
});

bionicReaderSwitch.addEventListener('change', function () {
  chrome.storage.sync.set({ bionicReaderEnabled: bionicReaderSwitch.checked });

  // Get the active tab and send a message to the content script
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { bionicReaderEnabled: bionicReaderSwitch.checked }, function(response) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      } else {
        console.log(response);
      }
    });
  });
});
