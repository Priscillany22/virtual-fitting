import React, { useRef, useState } from 'react'; 
import { StyleSheet, View, TouchableOpacity, Text, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// ⭐️ THE FINAL, CORRECTED HTTPS URL ⭐️
// The path now points directly to index.html at the root of your published GitHub Pages site.
const REMOTE_URL = 'https://priscillany22.github.io/virtual-fitting/index.html'; 

export default function ScanScreen() {
  const router = useRouter(); 
  const webViewRef = useRef(null);
  const [poseLandmarks, setPoseLandmarks] = useState<any[] | null>(null);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'error') {
        console.error("MediaPipe WebView Error:", data.message, data.error);
      } else if (data.type === 'status') {
        // This will show when the MediaPipe engine successfully loads
        console.log("MediaPipe Engine Status:", data.message);
      } else if (data.type === 'poseData' && data.landmarks) {
        // SUCCESS! Data flow is confirmed.
        setPoseLandmarks(data.landmarks);
      }
    } catch (e) {
      console.warn("Received non-JSON message from WebView:", event.nativeEvent.data);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Load the MediaPipe engine from the secure, remote HTTPS URL */}
      <WebView
        ref={webViewRef}
        style={styles.webView}
        source={{ uri: REMOTE_URL }} // Using the simplified HTTPS URL
        javaScriptEnabled={true}
        onMessage={handleWebViewMessage}
      />

      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={30} color="white" />
      </TouchableOpacity>
      
      {/* Overlays rendered by React Native (monitors data flow) */}
      <View style={styles.placeholderOverlay}>
        <Text style={styles.overlayText}>Live Body Segmentation</Text>
        <Text style={styles.overlayTextSmall}>
          {poseLandmarks ? `Tracking ${poseLandmarks.length} points.` : 'Searching for body...'}
        </Text>
      </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  webView: {
    width: width,
    height: height,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
  },
  placeholderOverlay: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overlayTextSmall: {
    color: '#00FF00',
    fontSize: 12,
    marginTop: 5,
  }
});