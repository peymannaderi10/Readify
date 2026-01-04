// Readify Extension - Coming Soon Popup
// Popup for temporarily disabled features

// featureName: "tts" (or any string for custom features)
function showComingSoonPopup(featureName = "tts") {
    // Remove any existing coming soon popup
    const existingPopup = containerRoot.querySelector('#coming-soon-popup');
    if (existingPopup) existingPopup.remove();

    // Feature-specific content
    const featureContent = {
        tts: {
            icon: "🔊",
            description: "Text to Speech will be available for Premium users. Stay tuned!"
        }
    };

    const content = featureContent[featureName] || featureContent.tts;

    const popup = document.createElement("div");
    popup.id = "coming-soon-popup";
    popup.style.position = "fixed";
    popup.style.left = selectionBox ? selectionBox.style.left : "50%";
    popup.style.width = "min(340px, 90vw)";
    popup.style.backgroundColor = "#ffffff";
    popup.style.borderRadius = "16px";
    popup.style.boxShadow = "0 20px 40px rgba(0, 151, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)";
    popup.style.padding = "28px";
    popup.style.border = "1px solid rgba(0, 151, 255, 0.1)";
    popup.style.backdropFilter = "blur(10px)";
    popup.style.fontFamily = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    popup.style.zIndex = "10000";
    popup.style.display = "flex";
    popup.style.flexDirection = "column";
    popup.style.alignItems = "center";
    popup.style.gap = "16px";
    popup.style.textAlign = "center";

    // Icon
    const iconElement = document.createElement("div");
    iconElement.innerHTML = content.icon;
    iconElement.style.cssText = `
        font-size: 48px;
        line-height: 1;
        margin-bottom: 4px;
    `;

    // Title
    const titleElement = document.createElement("h3");
    titleElement.innerText = "Coming Soon";
    titleElement.style.cssText = `
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: #1a202c;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.2;
    `;

    // Subtitle / Description
    const descElement = document.createElement("p");
    descElement.innerText = content.description;
    descElement.style.cssText = `
        margin: 0;
        font-size: 14px;
        color: #6b7280;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.5;
        max-width: 280px;
    `;

    // Premium badge
    const premiumBadge = document.createElement("div");
    premiumBadge.innerText = "🔒 Premium Feature";
    premiumBadge.style.cssText = `
        padding: 8px 16px;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(0, 151, 255, 0.1) 0%, rgba(0, 180, 255, 0.1) 100%);
        color: #0097ff;
        font-size: 12px;
        font-weight: 600;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        border: 1px solid rgba(0, 151, 255, 0.2);
    `;

    // Close button
    const closeButton = document.createElement("button");
    closeButton.innerText = "Got it";
    closeButton.style.cssText = `
        padding: 12px 32px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #0097ff 0%, #00b4ff 100%);
        color: white;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0, 151, 255, 0.3);
        margin-top: 8px;
    `;

    closeButton.addEventListener("mouseenter", function() {
        this.style.background = "linear-gradient(135deg, #0088e6 0%, #00a3e6 100%)";
        this.style.transform = "translateY(-2px)";
        this.style.boxShadow = "0 6px 20px rgba(0, 151, 255, 0.4)";
    });

    closeButton.addEventListener("mouseleave", function() {
        this.style.background = "linear-gradient(135deg, #0097ff 0%, #00b4ff 100%)";
        this.style.transform = "translateY(0)";
        this.style.boxShadow = "0 4px 12px rgba(0, 151, 255, 0.3)";
    });

    closeButton.addEventListener("click", function() {
        removeElementWithCleanup(popup);
    });

    // Assemble popup
    popup.appendChild(iconElement);
    popup.appendChild(titleElement);
    popup.appendChild(descElement);
    popup.appendChild(premiumBadge);
    popup.appendChild(closeButton);

    containerRoot.appendChild(popup);

    // Calculate positioning similar to other popups
    let boxHeight = popup.getBoundingClientRect().height;
    let positionLeft = selectionBox ? parseFloat(selectionBox.style.left) : (window.innerWidth / 2 - 170);
    let spaceAbove = selectionBox ? parseFloat(selectionBox.style.top) : window.innerHeight / 2;
    let spaceBelow = selectionBox 
        ? window.innerHeight - (parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height)
        : window.innerHeight / 2;

    let positionTop;
    if (spaceBelow > boxHeight + 20) {
        positionTop = selectionBox 
            ? parseFloat(selectionBox.style.top) + selectionBox.getBoundingClientRect().height + 10
            : (window.innerHeight / 2 - boxHeight / 2);
    } else if (spaceAbove > boxHeight + 20) {
        positionTop = spaceAbove - boxHeight - 10;
    } else {
        positionTop = Math.max(10, spaceAbove - boxHeight - 10);
    }

    popup.style.top = positionTop + "px";
    popup.style.left = positionLeft + "px";

    // Auto-close after 5 seconds
    setTimeout(() => {
        if (popup.parentNode) {
            popup.style.opacity = "0";
            popup.style.transform = "translateY(-10px)";
            popup.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            setTimeout(() => removeElementWithCleanup(popup), 300);
        }
    }, 5000);

    makeDraggable(popup);
}

