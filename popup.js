const bionicReaderSwitch = document.getElementById("bionicReaderSwitch");
const increaseLineHeightBtn = document.getElementById("increaseLineHeightBtn");
const decreaseLineHeightBtn = document.getElementById("decreaseLineHeightBtn");

let lineHeight;

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tabId = tabs[0].id;
  chrome.storage.sync.get(["tabStates", "lineHeights"], ({ tabStates, lineHeights }) => {
    const isEnabled = tabStates?.[tabId] ?? false;
    lineHeight = lineHeights?.[tabId] ?? 0;
    bionicReaderSwitch.checked = isEnabled;
    setButtonDisabledState(!isEnabled); // Set initial disabled state
  });
});

bionicReaderSwitch.addEventListener("change", () => {
  const isEnabled = bionicReaderSwitch.checked;
  setButtonDisabledState(!isEnabled); // Update disabled state
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
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

increaseLineHeightBtn.addEventListener("click", () => {
  lineHeight += 0.5;
  adjustLineHeight();
});

decreaseLineHeightBtn.addEventListener("click", () => {
  lineHeight -= 0.5;
  if (lineHeight < 0) {
    lineHeight = 0;
  }
  adjustLineHeight();
});

function setButtonDisabledState(disabled) {
  increaseLineHeightBtn.disabled = disabled;
  decreaseLineHeightBtn.disabled = disabled;
}

function adjustLineHeight() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.storage.sync.get(["lineHeights"], ({ lineHeights }) => {
      lineHeights = lineHeights ?? {};
      lineHeights[tabId] = lineHeight;
      chrome.storage.sync.set({ lineHeights });
      chrome.tabs.sendMessage(
        tabId,
        { lineHeight },
        (response) => {
          if (response?.result === "success") {
            console.log("Line height adjusted successfully.");
          } else {
            console.error("Error adjusting line height.");
          }
        }
      );
    });
  });
}