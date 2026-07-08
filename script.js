(() => {
  // ---------- visible crash banner (works even if the rest of this file errors) ----------
  function showCrashBanner(message) {
    let banner = document.getElementById('crashBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'crashBanner';
      banner.style.cssText = 'position:sticky;top:0;z-index:9999;background:#ffd9d9;color:#5c0e18;' +
        'font-family:sans-serif;font-size:13px;line-height:1.5;padding:12px 16px;text-align:center;' +
        'border-bottom:2px solid #7c1420;';
      document.body.prepend(banner);
    }
    banner.textContent = message;
  }
  window.addEventListener('error', (e) => {
    showCrashBanner('A script error occurred: ' + (e.message || 'unknown error') +
      '. This usually means the deployed files are out of sync — try clearing your browser cache/site data and reloading.');
  });

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
  const camStatus = $('camStatus');

  const required = { video, captured, photoEmpty, startCamBtn, captureBtn, retakeBtn, downloadBtn, bwToggle, mirrorToggle, countdownEl, workCanvas, settingsToggle, settingsPanel, hint };
  const missing = Object.keys(required).filter((k) => !required[k]);
  if (missing.length) {
    showCrashBanner('Setup error: this page is missing element(s) (' + missing.join(', ') +
      '). Your index.html and script.js are probably from different versions — re-upload both files together, then hard-reload.');
    return; // stop here rather than throwing further errors
  }

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

  function setStatus(msg) {
    if (camStatus) camStatus.textContent = msg;
    if (hint) hint.textContent = msg || 'Camera access stays on your device — nothing is uploaded anywhere.';
  }

  // ---------- camera ----------
  async function getStream() {
    // Try ideal constraints first; iOS Safari can throw OverconstrainedError
    // on some devices, so fall back to the simplest possible request.
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1600 } },
        audio: false,
      });
    } catch (e) {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }

  async function startCamera() {
    setStatus('');
    const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecure) {
      setStatus('Camera access needs https:// (or localhost). Opening this file directly (file://) blocks it.');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("This browser doesn't support camera access. Try the latest Safari or Chrome.");
      return;
    }
    startCamBtn.disabled = true;
    const originalLabel = startCamBtn.textContent;
    startCamBtn.textContent = 'Requesting access…';
    try {
      stream = await getStream();
      video.srcObject = stream;
      await video.play().catch(() => {});
      photoEmpty.setAttribute('hidden', '');
      video.hidden = false;
      captureBtn.disabled = false;
      applyLiveClasses();
    } catch (err) {
      if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setStatus('Camera permission was blocked. On iPhone: Settings app → Safari → Camera → Allow (or tap the "aA" icon in the address bar → Website Settings → Camera → Allow), then reload this page.');
      } else if (err && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')) {
        setStatus('No camera was found on this device.');
      } else if (err && err.name === 'NotReadableError') {
        setStatus('The camera is already in use by another app or tab. Close it and try again.');
      } else {
        setStatus(`Couldn't access your camera (${err && err.name ? err.name : 'unknown error'}). If you're in an app browser (Instagram/TikTok/Messenger), open this link in Safari directly instead.`);
      }
    } finally {
      startCamBtn.disabled = false;
      startCamBtn.textContent = originalLabel;
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
