// Readify Extension - CSS Styles
// All CSS styles used in shadow DOM and page injection

// Spinner animation CSS
const spinnerCss = `
  @keyframes spinner {
    to {transform: rotate(360deg);}
  }
  .spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 24px;
    height: 24px;
    margin: -12px 0 0 -12px;
    border: 2px solid transparent;
    border-top-color: #0097ff;
    border-radius: 50%;
    animation: spinner .6s linear infinite;
    z-index: 10;
  }
`;

// Page-level styles (injected into the document, not shadow DOM)
// These styles affect elements added to the actual webpage
const pageStyles = `
.thicker-underline {
    text-decoration: none !important;
    border-bottom: 2px solid black !important;
    display: inline !important;
}
`;

// Shadow DOM styles
const styles = `
${spinnerCss}
.dropdown-container {
    position: relative;
    font-family: 'Arial', sans-serif;
}
.dropdown-menu, .submenu {
    display: none;
    position: absolute;
    list-style: none;
    padding: 0;
    margin: 0;
    border: 1px solid #ddd;
    background-color: #ffffff;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
    border-radius: 4px;
}
.dropdown-menu li, .submenu li {
    padding: 10px 20px;
    cursor: pointer;
    transition: background-color 0.3s;
}
.dropdown-menu li:hover, .submenu li:hover {
    background-color: #f7f7f7;
}
.has-submenu {
    position: relative;
}
.has-submenu:hover .submenu {
    display: block;
    left: 100%;
    top: 0;
    border-left: none;
}
.dropdown-toggle {
    padding: 10px 20px !important;
    font-size: 16px !important;
    border: none !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    transition: background-color 0.3s !important;
    outline: none !important;
    border: 2px solid #000 !important;
    background-color: #B0DCFF !important;
}
.dropdown-toggle:hover {
    background-color: #0097FF !important;
}
.submenu {
    max-height: 200px; 
    overflow-y: auto; 
    width: 200px; 
}
.highlight-btn {
    width:20px;
    height:20px;
    border:none;
    border-radius:50%;
}
`;

// Common button style template
const commonButtonStyle = `
padding: 5px 15px !important;
border-radius: 5px !important;
border: 1px solid #ccc !important;
background: transparent !important;
cursor: pointer !important;
transition: background-color 0.2s ease !important;
`;

