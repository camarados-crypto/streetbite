// ── CAMERA ────────────────────────────────────────────
let _cameraStream = null;
let _cameraTarget = null;

async function openCamera(target) {
  _cameraTarget = target;
  try {
    _cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    $('camera-video').srcObject = _cameraStream;
    $('camera-overlay').classList.add('open');
  } catch(e) {
    // Camera not available — fall back to file picker
    if (target === 'checkin') $('ci-photo-input').click();
    else $('submit-photo-input').click();
  }
}

function capturePhoto() {
  const video = $('camera-video');
  const canvas = document.createElement('canvas');
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    closeCamera();
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      if (_cameraTarget === 'checkin') {
        ciPhotoFile    = file;
        ciPhotoDataUrl = dataUrl;
        $('ci-photo-preview').src          = dataUrl;
        $('ci-photo-preview').style.display = 'block';
        $('ci-photo-placeholder').style.display = 'none';
      } else {
        submitPhotoFile = file;
        $('submit-photo-preview').src          = dataUrl;
        $('submit-photo-preview').style.display = 'block';
        $('submit-photo-placeholder').style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
  }, 'image/jpeg', 0.88);
}

function closeCamera() {
  if (_cameraStream) {
    _cameraStream.getTracks().forEach(t => t.stop());
    _cameraStream = null;
  }
  $('camera-overlay').classList.remove('open');
}
