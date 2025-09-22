class SpriteApp {
  constructor() {
    // State
    this.imgUrl = null;
    this.imgEl = document.getElementById('sheet');
    this.overlay = document.getElementById('overlay');
    this.frames = [];
    this.cols = 2;
    this.rows = 2;
    this.colPercents = []; // between 0..100, excludes 0 and 100
    this.rowPercents = [];
    this.dragging = null; // {type:'v'|'h', index, lineEl}
    this.timer = null;
    this.cur = 0;

    // UI
    this.prompt = document.getElementById('prompt');
    this.colsInput = document.getElementById('cols');
    this.rowsInput = document.getElementById('rows');
    this.styleSelect = document.getElementById('style');
    this.generateBtn = document.getElementById('generate');
    this.uploadInput = document.getElementById('upload');

    this.workArea = document.getElementById('workArea');
    this.framesArea = document.getElementById('framesArea');
    this.previewArea = document.getElementById('previewArea');
    this.exportArea = document.getElementById('exportArea');

    this.framesWrap = document.getElementById('frames');
    this.previewCanvas = document.getElementById('preview');
    this.playBtn = document.getElementById('play');
    this.pauseBtn = document.getElementById('pause');
    this.speedSlider = document.getElementById('speed');
    this.speedVal = document.getElementById('speedVal');

    this.dlFrames = document.getElementById('dlFrames');
    this.dlSheet = document.getElementById('dlSheet');

    // Defaults
    if (this.prompt) this.prompt.value =
      "A sprite sheet showing four frames of animation of a bird in flight. The bird is depicted in silhouette, with the wings in various positions suggesting movement. The style is simple and graphic, suitable for animation or game use. The background is transparent.";

    // Init
    this.bind();
    this.syncGrid();
  }

  bind() {
    this.generateBtn?.addEventListener('click', () => this.generate());
    this.uploadInput?.addEventListener('change', (e) => this.handleUpload(e));

    this.colsInput?.addEventListener('input', () => {
      this.cols = this.clampInt(this.colsInput.value, 1, 20);
      this.syncGrid();
      if (this.imgEl.complete && this.imgEl.naturalWidth) this.extractFrames();
    });

    this.rowsInput?.addEventListener('input', () => {
      this.rows = this.clampInt(this.rowsInput.value, 1, 20);
      this.syncGrid();
      if (this.imgEl.complete && this.imgEl.naturalWidth) this.extractFrames();
    });

    // Dragging
    document.addEventListener('mousemove', (e) => this.onDragMove(e));
    document.addEventListener('mouseup', () => this.onDragEnd());
    document.addEventListener('touchmove', (e) => this.onDragMove(e), { passive: false });
    document.addEventListener('touchend', () => this.onDragEnd());

    // Preview
    this.playBtn?.addEventListener('click', () => this.play());
    this.pauseBtn?.addEventListener('click', () => this.pause());
    this.speedSlider?.addEventListener('input', (e) => {
      if (this.speedVal) this.speedVal.textContent = `${e.target.value}ms`;
      if (this.timer) {
        this.pause();
        this.play();
      }
    });

    // Exports
    this.dlFrames?.addEventListener('click', () => this.downloadFrames());
    this.dlSheet?.addEventListener('click', () => this.downloadSheet());
  }

  clampInt(v, min, max) {
    const n = parseInt(v, 10);
    if (isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  syncGrid() {
    // Evenly spaced defaults
    this.colPercents = [];
    this.rowPercents = [];
    for (let i = 1; i < this.cols; i++) this.colPercents.push((i / this.cols) * 100);
    for (let i = 1; i < this.rows; i++) this.rowPercents.push((i / this.rows) * 100);
    this.renderOverlay();
  }

  setLoading(on) {
    this.generateBtn.classList.toggle('loading', on);
    this.generateBtn.disabled = on;
  }

  async generate() {
    const prompt = this.prompt.value.trim();
    if (!prompt) {
      alert('Please enter an animation description.');
      return;
    }
    const style = this.styleSelect.value;
    const total = this.cols * this.rows;
    const grid = `${total} frames arranged in a perfect ${this.cols}x${this.rows} grid`;
    const full = `${prompt}, ${grid}${style ? ', ' + style : ''}, evenly spaced frames, no gaps, sprite sheet format, animation frames, transparent background`;

    this.setLoading(true);
    try {
      const result = await websim.imageGen({
        prompt: full,
        width: Math.max(512, this.cols * 256),
        height: Math.max(512, this.rows * 256),
      });
      this.loadImage(result.url);
    } catch (e) {
      console.error(e);
      alert('Generation failed. Try again.');
    } finally {
      this.setLoading(false);
    }
  }

  handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.loadImage(url);
  }

  loadImage(url) {
    this.imgUrl = url;
    this.imgEl.src = url;
    this.imgEl.onload = () => {
      this.workArea.style.display = '';
      this.framesArea.style.display = '';
      this.previewArea.style.display = '';
      this.exportArea.style.display = '';
      this.renderOverlay();
      this.extractFrames();
    };
  }

  renderOverlay() {
    if (!this.overlay) return;
    this.overlay.innerHTML = '';
    this.overlay.style.pointerEvents = 'none';

    // Add draggable lines with large handles for touch
    // Vertical lines
    this.colPercents.forEach((p, i) => {
      const line = document.createElement('div');
      line.className = 'grid-line vertical';
      line.style.left = `${p}%`;
      line.style.top = '0';
      line.style.height = '100%';
      line.dataset.type = 'v';
      line.dataset.index = String(i);

      const handle = document.createElement('div');
      handle.className = 'grid-handle v';
      handle.style.left = '0';
      handle.textContent = '|';
      handle.style.top = '50%';

      // Make handles catch events
      handle.style.pointerEvents = 'auto';
      line.style.pointerEvents = 'auto';

      const start = (ev) => this.onDragStart(ev, 'v', i, line);
      line.addEventListener('mousedown', start);
      line.addEventListener('touchstart', start, { passive: false });
      handle.addEventListener('mousedown', start);
      handle.addEventListener('touchstart', start, { passive: false });

      line.appendChild(handle);
      this.overlay.appendChild(line);
    });

    // Horizontal lines
    this.rowPercents.forEach((p, i) => {
      const line = document.createElement('div');
      line.className = 'grid-line horizontal';
      line.style.top = `${p}%`;
      line.style.left = '0';
      line.style.width = '100%';
      line.dataset.type = 'h';
      line.dataset.index = String(i);

      const handle = document.createElement('div');
      handle.className = 'grid-handle h';
      handle.style.top = '0';
      handle.textContent = '—';
      handle.style.left = '50%';

      handle.style.pointerEvents = 'auto';
      line.style.pointerEvents = 'auto';

      const start = (ev) => this.onDragStart(ev, 'h', i, line);
      line.addEventListener('mousedown', start);
      line.addEventListener('touchstart', start, { passive: false });
      handle.addEventListener('mousedown', start);
      handle.addEventListener('touchstart', start, { passive: false });

      line.appendChild(handle);
      this.overlay.appendChild(line);
    });
  }

  getOverlayRect() {
    return this.overlay.getBoundingClientRect();
  }

  onDragStart(event, type, index, lineEl) {
    if (event.cancelable) event.preventDefault();
    const pt = event.touches ? event.touches[0] : event;
    this.dragging = { type, index, lineEl, startX: pt.clientX, startY: pt.clientY, value: null };
    lineEl.classList.add('active');
    this.overlay.style.pointerEvents = 'auto';
  }

  onDragMove(event) {
    if (!this.dragging) return;
    if (event.cancelable) event.preventDefault();
    const rect = this.getOverlayRect();
    const pt = event.touches ? event.touches[0] : event;
    if (this.dragging.type === 'v') {
      const x = ((pt.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(1, Math.min(99, x));
      this.dragging.value = clamped;
      this.dragging.lineEl.style.left = `${clamped}%`;
    } else {
      const y = ((pt.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.max(1, Math.min(99, y));
      this.dragging.value = clamped;
      this.dragging.lineEl.style.top = `${clamped}%`;
    }
  }

  onDragEnd() {
    if (!this.dragging) return;
    const { type, index, value, lineEl } = this.dragging;
    lineEl.classList.remove('active');
    this.dragging = null;
    this.overlay.style.pointerEvents = 'none';
    if (value != null) {
      if (type === 'v') {
        this.colPercents[index] = value;
        this.colPercents.sort((a,b)=>a-b);
      } else {
        this.rowPercents[index] = value;
        this.rowPercents.sort((a,b)=>a-b);
      }
      this.renderOverlay();
      if (this.imgEl.complete && this.imgEl.naturalWidth) this.extractFrames();
    }
  }

  extractFrames() {
    this.frames = [];
    this.framesWrap.innerHTML = '';

    const img = this.imgEl;
    const cols = [0, ...this.colPercents.map(p => p / 100), 1].sort((a,b)=>a-b);
    const rows = [0, ...this.rowPercents.map(p => p / 100), 1].sort((a,b)=>a-b);

    let maxW = 0, maxH = 0;
    const raw = [];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x1 = Math.round(cols[c] * img.naturalWidth);
        const x2 = Math.round(cols[c+1] * img.naturalWidth);
        const y1 = Math.round(rows[r] * img.naturalHeight);
        const y2 = Math.round(rows[r+1] * img.naturalHeight);
        const w = Math.max(0, x2 - x1);
        const h = Math.max(0, y2 - y1);

        const can = document.createElement('canvas');
        can.width = w; can.height = h;
        const ctx = can.getContext('2d');
        ctx.clearRect(0,0,w,h);
        ctx.drawImage(img, x1, y1, w, h, 0, 0, w, h);

        raw.push(can);
        maxW = Math.max(maxW, w);
        maxH = Math.max(maxH, h);
      }
    }

    // Normalize every frame to the largest W/H
    let i = 0;
    for (const rCan of raw) {
      const norm = document.createElement('canvas');
      norm.width = maxW;
      norm.height = maxH;
      const nctx = norm.getContext('2d');
      nctx.clearRect(0,0,maxW,maxH);
      const offX = Math.floor((maxW - rCan.width)/2);
      const offY = Math.floor((maxH - rCan.height)/2);
      nctx.drawImage(rCan, offX, offY);
      this.frames.push(norm);

      // UI cell
      const cell = document.createElement('div');
      cell.className = 'frame';
      const dv = document.createElement('div');
      dv.className = 'frame-tag';
      dv.textContent = i+1;
      const disp = document.createElement('canvas');
      disp.width = maxW; disp.height = maxH;
      disp.getContext('2d').drawImage(norm, 0, 0);
      cell.appendChild(disp);
      cell.appendChild(dv);
      this.framesWrap.appendChild(cell);
      i++;
    }

    // Setup preview canvas to normalized size
    const cvs = this.previewCanvas;
    cvs.width = maxW;
    cvs.height = maxH;
    this.cur = 0;
    this.draw(0);
  }

  draw(index) {
    const cvs = this.previewCanvas;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0,0,cvs.width,cvs.height);
    const frame = this.frames[index];
    if (frame) ctx.drawImage(frame, 0, 0);
  }

  play() {
    if (!this.frames.length) return;
    this.pause();
    const speed = parseInt(this.speedSlider.value, 10);
    this.timer = setInterval(() => {
      this.cur = (this.cur + 1) % this.frames.length;
      this.draw(this.cur);
    }, speed);
  }

  pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  downloadFrames() {
    if (!this.frames.length) return;
    this.frames.forEach((c, idx) => {
      const a = document.createElement('a');
      a.download = `frame_${idx+1}.png`;
      a.href = c.toDataURL('image/png');
      a.click();
    });
  }

  downloadSheet() {
    if (!this.imgUrl) return;
    const a = document.createElement('a');
    a.download = 'sprite_sheet.png';
    a.href = this.imgUrl;
    a.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SpriteApp();
});