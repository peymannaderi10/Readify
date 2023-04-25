let originalPageContent;
let bionicReaderEnabled;

function bionicReader(text) {
  return text.replace(/\b\w+\b/g, function (word) {
    const boldLength = Math.round(word.length * 0.4);
    const boldPart = word.slice(0, boldLength);
    const remainingPart = word.slice(boldLength);
    return `<strong>${boldPart}</strong>${remainingPart}`;
  });
}

function removeStrongInParagraphs() {
  const paragraphs = document.querySelectorAll('p');
  paragraphs.forEach((paragraph) => {
    paragraph.innerHTML = paragraph.innerHTML.replace(/<strong>|<\/strong>/g, '');
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

function processPage() {
  if (!originalPageContent) {
    originalPageContent = document.body.innerHTML;
  }
  removeStrongInParagraphs();
  applyBionicReader(document.body);
}

function resetPage() {
  if (originalPageContent) {
    document.body.innerHTML = originalPageContent;
  }
}

chrome.storage.sync.get('bionicReaderEnabled', function (data) {
  bionicReaderEnabled = data.bionicReaderEnabled;
  if (bionicReaderEnabled) {
    processPage();
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  bionicReaderEnabled = request.bionicReaderEnabled;
  if (bionicReaderEnabled) {
    processPage();
  } else {
    resetPage();
  }
  sendResponse({ result: "success" });
});

chrome.runtime.onMessageExternal.addListener(function (request, sender, sendResponse) {
  if (request.command === "checkBionicReaderState") {
    sendResponse({ bionicReaderEnabled });
  }
});