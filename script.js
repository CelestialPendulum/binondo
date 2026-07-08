(() => {
  const $ = (id) => document.getElementById(id);

  // ---------- elements ----------
  const video = $('video');
  const captured = $('captured');
  const photoEmpty = $('photoEmpty');
  const startCamBtn = $('startCam');
  const captureBtn = $('captureBtn');
  const retakeBtn = $('retakeBtn');
  const downloadBtn = $('downloadBtn');
  const bwToggle = $('bwToggle');
  const mirrorToggle = $('mirrorToggle');
  const countdownEl = $('countdown');
  const workCanvas = $('workCanvas');
  const settingsToggle = $('settingsToggle');
  const settingsPanel = $('settingsPanel');
  const hint = $('hint');

  let stream = null;
  let mirrored = true;
  let bw = false;

  // ---------- live headline / masthead editing ----------
  const bindings = [
    ['cfgMasthead', 'outMasthead'],
    ['cfgHeadline', 'outHeadline'],
    ['cfgHeadline', 'outHeadline2'],
    ['cfgTagline', 'outTagline'],
    ['cfgBanner', 'outBanner'],
    ['cfgVolume', 'outVolume'],
  ];
  bindings.forEach(([inputId, outputId]) => {
    const input = $(inputId);
    const output = $(outputId);
    input.addEventListener('input', () => { output.textContent = input.value || output.textContent; });
  });
  $('cfgStudio').addEventListener('input', (e) => {
    const val = e.target.value.trim() || 'MY STUDIO';
    $('outStudioFooter').textContent = val.toLowerCase();
  });

  $('outYear').textContent = String(new Date().getFullYear()).slice(0, 2);

  settingsToggle.addEventListener('click', () => {
    const isHidden = settingsPanel.hasAttribute('hidden');
    if (isHidden) { settingsPanel.removeAttribute('hidden'); } else { settingsPanel.setAttribute('hidden', ''); }
    settingsToggle.setAttribute('aria-expanded', String(isHidden));
  });

  // ---------- camera ----------
  async function startCamera() {
    const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecure) {
      hint.textContent = 'Camera access needs https:// (or localhost). Opening this file directly (file://) or over plain http:// blocks it — try GitHub Pages or "python3 -m http.server" instead.';
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      hint.textContent = "This browser doesn't support camera access. Try the latest Chrome, Safari, or Firefox.";
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1600 } },
        audio: false,
      });
      video.srcObject = stream;
      photoEmpty.setAttribute('hidden', '');
      video.hidden = false;
      captureBtn.disabled = false;
      applyLiveClasses();
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        hint.textContent = 'Camera permission was blocked. Allow camera access for this site in your browser\'s address-bar settings, then try again.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        hint.textContent = 'No camera was found on this device.';
      } else if (err.name === 'NotReadableError') {
        hint.textContent = 'The camera is already in use by another app or tab. Close it and try again.';
      } else {
        hint.textContent = "Couldn't access your camera — check your browser's permission settings and try again.";
      }
    }
  }
  startCamBtn.addEventListener('click', startCamera);

  function applyLiveClasses() {
    video.classList.toggle('mirrored', mirrored);
    video.classList.toggle('bw', bw);
    captured.classList.toggle('mirrored', mirrored);
    captured.classList.toggle('bw', bw);
  }

  mirrorToggle.addEventListener('click', () => {
    mirrored = !mirrored;
    mirrorToggle.textContent = `Mirror: ${mirrored ? 'On' : 'Off'}`;
    mirrorToggle.setAttribute('aria-pressed', String(mirrored));
    applyLiveClasses();
  });

  bwToggle.addEventListener('click', () => {
    bw = !bw;
    bwToggle.textContent = `B&W newsprint: ${bw ? 'On' : 'Off'}`;
    bwToggle.setAttribute('aria-pressed', String(bw));
    applyLiveClasses();
  });

  // ---------- capture with countdown ----------
  captureBtn.addEventListener('click', () => runCountdown(3));

  function runCountdown(n) {
    captureBtn.disabled = true;
    countdownEl.hidden = false;
    countdownEl.textContent = n;
    if (n === 0) {
      countdownEl.hidden = true;
      takePhoto();
      return;
    }
    countdownEl.textContent = n;
    setTimeout(() => runCountdown(n - 1), 700);
  }

  function takePhoto() {
    const vw = video.videoWidth || 720;
    const vh = video.videoHeight || 900;
    workCanvas.width = vw;
    workCanvas.height = vh;
    const ctx = workCanvas.getContext('2d');

    ctx.save();
    if (mirrored) {
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
    }
    if (bw) {
      ctx.filter = 'grayscale(1) contrast(1.15) brightness(1.02)';
    }
    ctx.drawImage(video, 0, 0, vw, vh);
    ctx.restore();

    captured.src = workCanvas.toDataURL('image/png');
    captured.hidden = false;
    captured.classList.remove('mirrored', 'bw'); // already baked into the pixels
    video.hidden = true;

    if (stream) stream.getTracks().forEach((t) => t.stop());

    retakeBtn.hidden = false;
    captureBtn.hidden = true;
    downloadBtn.disabled = false;
  }

  retakeBtn.addEventListener('click', () => {
    captured.hidden = true;
    retakeBtn.hidden = true;
    captureBtn.hidden = false;
    captureBtn.disabled = true;
    downloadBtn.disabled = true;
    startCamera();
  });

  // ---------- export the whole front page as PNG ----------
  downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    const originalLabel = downloadBtn.textContent;
    downloadBtn.textContent = 'Preparing…';
    try {
      const node = $('newspaper');
      const canvas = await html2canvas(node, {
        backgroundColor: '#faf6ee',
        scale: 3,
        useCORS: true,
      });
      const link = document.createElement('a');
      const headline = ($('cfgHeadline').value || 'photobooth').trim().toLowerCase().replace(/\s+/g, '-');
      link.download = `${headline}-front-page.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      hint.textContent = 'Could not generate the image. Try again, or take a screenshot instead.';
    } finally {
      downloadBtn.textContent = originalLabel;
      downloadBtn.disabled = false;
    }
  });
})();
