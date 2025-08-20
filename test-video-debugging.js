// Quick test script to verify video SDK multiple participant functionality
console.log('🧪 Testing Multiple Participants Video SDK...');

// Test WebRTC support
if (!window.RTCPeerConnection) {
  console.error('❌ WebRTC not supported in this browser');
} else {
  console.log('✅ WebRTC supported');
}

// Test getUserMedia support
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  console.error('❌ getUserMedia not supported');
} else {
  console.log('✅ getUserMedia supported');
}

// Test video element creation
const testVideo = document.createElement('video');
testVideo.autoplay = true;
testVideo.muted = true;
testVideo.playsInline = true;
console.log('✅ Video element creation test passed');

console.log('🎯 Ready for multi-participant video testing!');