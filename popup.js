const bionicReaderSwitch = document.getElementById("bionicReaderSwitch");

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tabId = tabs[0].id;
  chrome.storage.sync.get(["tabStates"], ({ tabStates }) => {
    const isEnabled = tabStates?.[tabId] ?? false;
    bionicReaderSwitch.checked = isEnabled;
  });
});

bionicReaderSwitch.addEventListener("change", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    const isEnabled = bionicReaderSwitch.checked;
    chrome.storage.sync.get(["tabStates"], ({ tabStates }) => {
      tabStates = tabStates ?? {};
      tabStates[tabId] = isEnabled;
      chrome.storage.sync.set({ tabStates });
      chrome.tabs.sendMessage(
        tabId,
        { bionicReaderEnabled: isEnabled },
        (response) => {
          if (response?.result === "success") {
            console.log("Bionic Reader applied/removed successfully.");
          } else {
            console.error("Error applying/removing Bionic Reader.");
          }
        }
      );
    });
  });
});
