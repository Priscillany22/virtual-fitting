// --- ADD THESE LINES AT THE VERY TOP OF script.js ---

// Catch any unhandled errors and send them to the Expo terminal
window.onerror = function(message, url, line, col, error) {
    if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'Unhandled JS Error',
            error: error ? error.stack : message + ' at line ' + line
        }));
    }
    return true; // Prevents default browser error handling
};

// Catch unhandled promise rejections (very common with camera access)
window.addEventListener('unhandledrejection', (event) => {
    if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'Unhandled Promise Rejection (likely Camera block)',
            error: event.reason.stack || event.reason.toString()
        }));
    }
    event.preventDefault();
});

// --- REST OF YOUR ORIGINAL script.js CODE FOLLOWS ---
// e.g., const video = document.getElementById("video");
// etc.