// --- START OF script.js ---

// 1. ROBUST ERROR HANDLERS (for debugging in Expo terminal)
window.onerror = function(message, url, line, col, error) {
    if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'Unhandled JS Error',
            error: error ? error.stack : message + ' at line ' + line
        }));
    }
    return true; 
};

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


// 2. STATUS DISPLAY SETUP
const statusDiv = document.createElement('div');
statusDiv.id = 'status-display';
statusDiv.style.position = 'absolute';
statusDiv.style.top = '10px';
statusDiv.style.left = '10px';
statusDiv.style.color = 'yellow';
statusDiv.style.zIndex = '100';
statusDiv.style.fontSize = '20px'; // Make it easy to read
document.body.appendChild(statusDiv);
statusDiv.textContent = 'Status: JS Running, App Loaded...';

// Global variables for MediaPipe setup
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let segmentationMask = null;


// 3. DELAYED CAMERA INITIALIZATION (CRUCIAL FIX)
setTimeout(() => {
    statusDiv.textContent = 'Status: Requesting Camera Permission... (3 sec delay passed)';
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusDiv.textContent = 'FATAL ERROR: getUserMedia not supported!';
        if (window.ReactNativeWebView) {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'getUserMedia not supported!' }));
        }
        return;
    }

    navigator.mediaDevices.getUserMedia({ 
        video: {
            // Force the front camera if possible, helps with mobile setup
            facingMode: 'user' 
        }
    })
    .then(stream => {
        statusDiv.textContent = 'Status: Stream Acquired! Initializing MediaPipe...';
        
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            // Set canvas size to video size for full coverage
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            video.play();
            statusDiv.textContent = 'Status: Camera Playing.';
            
            // Start the MediaPipe loop
            onResults(segmentationMask); 
        };
    })
    .catch(error => {
        // This catches the crucial iOS 'Permission denied' error
        statusDiv.textContent = 'FATAL ERROR: Camera Blocked! ' + error.name + ': ' + error.message;
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'error', 
                message: 'Camera Initialization Failed', 
                error: error.name + ': ' + error.message 
            }));
        }
    });
}, 3000); // 3 second delay


// 4. MEDIAPIPE SETUP AND DRAWING LOGIC (Simplified from your original code)

// Initialize the MediaPipe Selfie Segmentation model
const selfieSegmentation = new SelfieSegmentation({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
}});
selfieSegmentation.setOptions({
    modelSelection: 1, // Use the more accurate model
    selfieMode: true,
});
selfieSegmentation.onResults(function(results) {
    segmentationMask = results.segmentationMask;
    
    // Post data to React Native (even if only a placeholder for now)
    if (window.ReactNativeWebView) {
        // Send a simple message to confirm the segmenter is working
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
            type: 'poseData', 
            landmarks: [{ x: 1, y: 1 }] // Placeholder data to confirm flow
        }));
    }
});


async function onResults() {
    // This is the drawing loop
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (segmentationMask) {
        // Apply the mask (green screen effect)
        ctx.globalCompositeOperation = 'destination-atop';
        ctx.drawImage(segmentationMask, 0, 0, canvas.width, canvas.height);

        // Apply background (Green screen)
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = "#00FF00"; // Green background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.restore();
    
    // Request the next frame
    window.requestAnimationFrame(onResults);

    // Run the MediaPipe processing on the video frame (this is required inside the loop)
    await selfieSegmentation.send({image: video});
}

// --- END OF script.js ---