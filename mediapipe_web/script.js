const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

let camera; 

function postMessageToReactNative(data) {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(data));
  }
}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  }
});

pose.setOptions({
  modelComplexity: 1, 
  smoothLandmarks: true,
  enableSegmentation: true,
  smoothSegmentation: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

pose.onResults((results) => {
  if (canvasElement.width !== results.image.width || canvasElement.height !== results.image.height) {
    canvasElement.width = results.image.width;
    canvasElement.height = results.image.height;
  }
  
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (results.segmentationMask) {
    canvasCtx.globalCompositeOperation = 'source-in'; 
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.fillStyle = '#FFFFFF';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
  }

  canvasCtx.globalCompositeOperation = 'source-over'; 
  if (results.poseLandmarks) {
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: '#00FF00', 
      lineWidth: 4
    });
    drawLandmarks(canvasCtx, results.poseLandmarks, {
      color: '#FF0000', 
      lineWidth: 2
    });
    
    // ⭐️ NEW: Send the raw pose landmark data back to React Native ⭐️
    postMessageToReactNative({ 
        type: "poseData", 
        landmarks: results.poseLandmarks 
    });
  }

  canvasCtx.restore();
});

async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: {
        facingMode: "user" 
      }
    });
    
    videoElement.srcObject = stream;
    await videoElement.play();

    camera = new Camera(videoElement, {
      onFrame: async () => {
        await pose.send({ image: videoElement });
      },
      width: videoElement.videoWidth,
      height: videoElement.videoHeight
    });
    camera.start();

    postMessageToReactNative({ type: "status", message: "MediaPipe Engine Ready" });

  } catch (error) {
    postMessageToReactNative({ 
      type: "error", 
      message: "Failed to start camera or MediaPipe.", 
      error: error.message 
    });
  }
}

setupCamera();

window.addEventListener("message", (event) => {
  // Add logic to handle commands from React Native
});