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

// Global variables
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let segmentationMask = null;
let poseLandmarks = null; 


// 3. MEDIAPIPE POSE MODEL INITIALIZATION
const pose = new Pose({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

pose.setOptions({
    modelComplexity: 1, 
    smoothLandmarks: true,
    enableSegmentation: true, 
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});


// 4. FUNCTION TO DRAW THE VIRTUAL SHIRT
function drawVirtualShirt(ctx, landmarks) {
    if (!landmarks || landmarks.length === 0) return;

    // Landmarks needed: 11: Left Shoulder, 12: Right Shoulder, 23: Left Hip, 24: Right Hip
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    
    if (!leftShoulder || !rightShoulder || leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5) {
        statusDiv.textContent = 'Status: Finding shoulders for clothing...';
        return;
    }
    
    // Normalize coordinates to canvas size
    const width = canvas.width;
    const height = canvas.height;

    // 1. Calculate Center and Rotation
    const centerX = leftShoulder.x * width + (rightShoulder.x * width - leftShoulder.x * width) / 2;
    const centerY = leftShoulder.y * height + (rightShoulder.y * height - leftShoulder.y * height) / 2;

    // Rotation angle
    const angleRadians = Math.atan2(rightShoulder.y * height - leftShoulder.y * height, rightShoulder.x * width - leftShoulder.x * width);
    
    // 2. Calculate Width and Height
    const shoulderDistance = Math.hypot(rightShoulder.x * width - leftShoulder.x * width, rightShoulder.y * height - leftShoulder.y * height);
    
    // Scale the shirt width relative to the shoulder distance (1.2 is the scaling factor)
    const shirtWidth = shoulderDistance * 1.2; 

    // Scale height using shoulder-to-hip distance
    const shoulderToHipNormalized = Math.hypot(leftHip.x - leftShoulder.x, leftHip.y - leftShoulder.y);
    const shirtHeight = shoulderToHipNormalized * height * 2.5; 
    
    // 3. Load and Draw the Shirt Image
    const shirtImage = document.getElementById('virtual-shirt-image');
    
    if (shirtImage && shirtImage.complete) {
        ctx.save();
        
        // Translate context to the shoulder center (rotation point)
        ctx.translate(centerX, centerY);
        // Rotate context
        ctx.rotate(angleRadians);

        // Draw the image, centered on the shoulder midpoint
        ctx.drawImage(
            shirtImage,
            -(shirtWidth / 2),  // X position to center
            -(shirtHeight * 0.1), // Y position (nudged down from shoulders)
            shirtWidth,
            shirtHeight
        );
        
        ctx.restore();
    }
}


// 5. RESULTS HANDLER (Runs every frame after Pose processes the image)
pose.onResults(function(results) {
    segmentationMask = results.segmentationMask;
    poseLandmarks = results.poseLandmarks;
    
    // Send landmark data back to React Native
    if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
            type: 'poseData', 
            landmarks: results.poseLandmarks || []
        }));
    }

    // Call the drawing function
    drawCanvas(results); 
});


// 6. DRAWING LOOP AND RENDERING
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

    // Draw the shirt (drawn first so it appears "under" the tracking dots)
    ctx.globalCompositeOperation = 'source-over'; 
    drawVirtualShirt(ctx, poseLandmarks); 
    
    // Draw the tracking dots (Red/Green visualization)
    drawConnectors(ctx, poseLandmarks, POSE_CONNECTIONS, { color: '#FF0000', lineWidth: 4 });
    drawLandmarks(ctx, poseLandmarks, { color: '#00FF00', lineWidth: 2 });
    
    ctx.restore();
}


// 7. DELAYED CAMERA INITIALIZATION (CRUCIAL FINAL FIX)
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
    .catch(error => {
        statusDiv.textContent = 'FATAL ERROR: Camera Blocked! ' + error.name + ': ' + error.message;
    });
}, 3000); 


// 8. LOOP FUNCTION to continuously send the video frame to the Pose model
async function sendToPoseModel() {
    await pose.send({image: video});
    window.requestAnimationFrame(sendToPoseModel);
}
// --- END OF mediapipe_web/script.js ---