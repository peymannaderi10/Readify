// Readify Extension - Global State Variables
// These are shared across all content script modules

// UI Element references
let selectionBox = null;
let container = null;
let containerRoot = null;
let summaryBox = null;
let ttsBox = null;
let colorPickerDialog = null;

// Drag state
let isDragging = false;
let offsetX, offsetY;

// Selection state
let savedRange = null;
let temporaryRange = null;
let savedSelectionRange = null;

// Extension state
let extensionEnabled = false;

