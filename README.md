# Readify: A Technical Overview

Readify is a Chrome extension built with vanilla JavaScript that enhances the user's reading experience through a suite of DOM manipulation and AI-powered tools. This extension is designed based on the Chrome Extension Manifest V3 architecture, ensuring better performance, security, and a more modular design.

## How It Works: An Architectural Deep-Dive

Readify operates on a modular architecture consisting of a background service worker, content scripts, and a side panel. This separation of concerns allows for efficient event handling, seamless integration with web pages, and a user-friendly interface for controlling the extension's features.

### 1. **Background Service Worker (`background.js`)**

The service worker is the backbone of the extension, responsible for managing the extension's state and handling events. Key responsibilities include:

-   **Side Panel Management:** It listens for the `chrome.action.onClicked` event to open the side panel, providing a consistent entry point for users.
-   **Payment Integration:** It initializes and manages the `ExtPay` integration for handling payments and premium features.

### 2. **Content Scripts**

A suite of content scripts is injected into web pages at `document_idle` to interact with the DOM. These scripts are responsible for the core functionalities of the extension:

-   **`content-main.js`**: The main entry point for the content scripts. It initializes a shadow DOM to encapsulate the extension's UI components, preventing style conflicts with the host page. It also sets up event listeners for user interactions, such as `mouseup` for text selection, and handles communication with other parts of the extension via `chrome.runtime.onMessage`.
-   **`selection-handler.js` & `text-operations.js`**: These scripts manage text selection and provide a context menu of actions that can be performed on the selected text, such as highlighting or text-to-speech.
-   **`storage-manager.js`**: Manages the persistence of user preferences and modifications using `chrome.storage.sync` and `chrome.storage.local`. This ensures that user customizations are not lost between sessions.
-   **`ui-components.js`**: Contains the logic for creating and managing the various UI components that are injected into the page, such as the selection menu and pop-ups.

### 3. **Side Panel (`sidepanel.html`, `sidepanel.js`)**

The side panel serves as the main user interface for the extension, allowing users to control the various features and settings. It communicates with the content scripts via message passing to apply changes to the web page in real-time.

## Core Technologies and Concepts

-   **Manifest V3:** The extension is built on the latest Chrome extension platform, leveraging its improved security and performance features.
-   **Vanilla JavaScript:** The entire extension is built with plain JavaScript, ensuring a lightweight and fast user experience.
-   **Shadow DOM:** To prevent CSS conflicts and ensure the extension's UI is isolated from the host page, a shadow DOM is used to encapsulate all injected UI components.
-   **Chrome APIs:** The extension makes extensive use of Chrome's extension APIs, including:
    -   `chrome.action`: For managing the extension's icon and a popup.
    -   `chrome.storage`: For persisting user data and settings.
    -   `chrome.runtime`: For messaging and communication between different parts of the extension.
    -   `chrome.sidePanel`: For managing the side panel UI.
-   **Asynchronous Operations:** The extension heavily relies on asynchronous operations (Promises and async/await) to handle events, communicate between components, and interact with storage without blocking the main thread.

## Installation

1.  Download the repository by opening terminal and type the following in order:
    -   `cd Desktop`
    -   `git clone https://github.com/peymannaderi10/Readify.git`
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click on "Load Unpacked".
5.  Select the `Readify` folder from your Desktop.

Once installed, you can open any webpage and click on the Readify icon in your browser's toolbar to open the side panel and start customizing your reading experience.
