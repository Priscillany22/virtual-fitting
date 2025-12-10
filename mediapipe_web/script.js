// --- START OF mediapipe_web/script.js ---

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
statusDiv.style.fontSize = '20px';
document.body.appendChild(statusDiv);
statusDiv.textContent = 'Status: JS Running, App Loaded...';

// Global variables for MediaPipe setup
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
// NOTE: We don't need the SelfieSegmentation model anymore, Pose does the job!
let segmentationMask = null;
let poseLandmarks = null; // Will store the pose data


// 3. MEDIAPIPE POSE MODEL INITIALIZATION
const pose = new Pose({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

pose.setOptions({
    modelComplexity: 1, // Good balance of speed and accuracy
    smoothLandmarks: true,
    enableSegmentation: true, // Crucial: Keeps the segmentation mask feature
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});


// 4. RESULTS HANDLER (Runs every frame after Pose processes the image)
pose.onResults(function(results) {
    segmentationMask = results.segmentationMask;
    poseLandmarks = results.poseLandmarks;
    
    // ⭐️ Send landmark data back to React Native ⭐️
    if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
            type: 'poseData', 
            landmarks: results.poseLandmarks || []
        }));
    }

    // Call the drawing function
    drawCanvas(results); 
});


// 5. DRAWING LOOP AND RENDERING
function drawCanvas(results) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the video frame
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (segmentationMask) {
        // Apply the mask to draw only the user's body
        ctx.globalCompositeOperation = 'destination-atop';
        ctx.drawImage(segmentationMask, 0, 0, canvas.width, canvas.height);

        // Apply background (Green screen)
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = "#00FF00"; // Green background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // ⭐️ DRAW THE TRACKING DOTS ⭐️
    ctx.globalCompositeOperation = 'source-over'; // Reset blend mode
    drawConnectors(ctx, poseLandmarks, POSE_CONNECTIONS, { color: '#FF0000', lineWidth: 4 });
    drawLandmarks(ctx, poseLandmarks, { color: '#00FF00', lineWidth: 2 });
    
    ctx.restore();
}


// 6. DELAYED CAMERA INITIALIZATION (CRUCIAL FINAL FIX)
setTimeout(() => {
    statusDiv.textContent = 'Status: Requesting Camera Permission... (3 sec delay passed)';
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusDiv.textContent = 'FATAL ERROR: getUserMedia not supported!';
        return;
    }

    navigator.mediaDevices.getUserMedia({ 
        video: {
            facingMode: 'user' 
        }
    })
    .then(stream => {
        statusDiv.textContent = 'Status: Stream Acquired! Initializing Pose Model...';
        
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            video.play();
            statusDiv.textContent = 'Status: Camera Playing. Sending Frames...';
            
            // Start the Pose tracking loop
            sendToPoseModel();
        };
    })
    .