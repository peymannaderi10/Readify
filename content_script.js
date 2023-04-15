function bionicReader(text) {
  return text.replace(/\b\w+\b/g, function (word) {
    const boldLength = Math.round(word.length * 0.5);
    const boldPart = word.slice(0, boldLength);
    const remainingPart = word.slice(boldLength);
    return `<strong>${boldPart}</strong>${remainingPart}`;
  });
}

function applyBionicReader(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentNode;
    if (parent && parent.tagName.toLowerCase() !== 'script' && parent.tagName.toLowerCase() !== 'style') {
      const newNode = document.createElement('span');
      newNode.innerHTML = bionicReader(node.textContent);
      parent.replaceChild(newNode, node);
    }
  } else {
    const childNodes = node.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      applyBionicReader(childNodes[i]);
    }
  }
}

function removeBoldFormatting() {
  const boldElements = document.querySelectorAll('b, strong');
  for (const boldElement of boldElements) {
    boldElement.outerHTML = boldElement.innerHTML;
  }
}

function processPage() {
  removeBoldFormatting();
  applyBionicReader(document.body);
}

function resetPage() {
  location.reload();
}

chrome.storage.sync.get('bionicReaderEnabled', function (data) {
  if (data.bionicReaderEnabled) {
    processPage();
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.bionicReaderEnabled) {
    processPage();
    sendResponse({ result: "success" });
  } else {
    resetPage();
    sendResponse({ result: "success" });
  }
});
