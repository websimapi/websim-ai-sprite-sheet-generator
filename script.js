class SpriteApp {
  constructor() {
    // State
    this.imgUrl = null;
    this.imgEl = document.getElementById('sheet');
    this.overlay = document.getElementById('overlay');
    this.frames = [];
    this.frameHidden = [];
    this.frameW = 0; this.frameH = 0;
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
    this.frameInfo = document.getElementById('frameInfo');
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
    const full = `${prompt}, ${grid}${style ? ', ' + style : ''}, evenly spaced frames, no gaps, sprite sheet format, alpha transparency, background must be fully transparent, no white or colored background`;

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
    if (!this.imgEl || !this.imgEl.naturalWidth) return;
    this.overlay.style.pointerEvents = 'auto';
    // vertical lines
    this.colPercents.forEach((p, i) => {
      const line = document.createElement('div');
      line.className = 'grid-line vertical';
      line.style.left = `${p}%`; line.style.top = '0'; line.style.bottom = '0';
      line.addEventListener('mousedown', (e)=> this.onDragStart(e,'v',i,line));
      line.addEventListener('touchstart', (e)=> this.onDragStart(e,'v',i,line), {passive:false});
      const h = document.createElement('div'); h.className = 'grid-handle v'; h.textContent = '↕';
      h.style.left = '0'; h.style.top = '50%'; line.appendChild(h);
      this.overlay.appendChild(line);
    });
    // horizontal lines
    this.rowPercents.forEach((p, i) => {
      const line = document.createElement('div');
      line.className = 'grid-line horizontal';
      line.style.top = `${p}%`; line.style.left = '0'; line.style.right = '0';
      line.addEventListener('mousedown', (e)=> this.onDragStart(e,'h',i,line));
      line.addEventListener('touchstart', (e)=> this.onDragStart(e,'h',i,line), {passive:false});
      const h = document.createElement('div'); h.className = 'grid-handle h'; h.textContent = '↔';
      h.style.top = '0'; h.style.left = '50%'; line.appendChild(h);
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
    this.frameHidden = [];
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
        this.whitenToAlpha(can, 12);
        raw.push(can);
        maxW = Math.max(maxW, w);
        maxH = Math.max(maxH, h);
      }
    }

    // Normalize every frame to the largest W/H
    this.frameW = maxW; this.frameH = maxH;
    if (this.frameInfo) this.frameInfo.textContent = `• ${maxW} × ${maxH}px • ${raw.length} frames`;
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
      this.frameHidden.push(false);

      // UI cell
      const cell = document.createElement('div');
      cell.className = 'frame';
      const dv = document.createElement('div');
      dv.className = 'frame-tag';
      dv.textContent = `${i+1} • ${maxW}×${maxH}`;
      const disp = document.createElement('canvas');
      disp.width = maxW; disp.height = maxH;
      disp.getContext('2d').drawImage(norm, 0, 0);
      
      // controls
      const actions = document.createElement('div');
      actions.className = 'frame-actions';
      const hideBtn = document.createElement('button'); hideBtn.textContent = 'Hide';
      const delBtn = document.createElement('button'); delBtn.textContent = 'Delete';
      const idx = i;
      hideBtn.addEventListener('click', (e)=>{ e.stopPropagation(); this.frameHidden[idx]=!this.frameHidden[idx]; cell.classList.toggle('hidden', this.frameHidden[idx]); hideBtn.textContent=this.frameHidden[idx]?'Show':'Hide'; if (!this.frameHidden[idx] && this.timer==null) this.draw(idx); });
      delBtn.addEventListener('click', (e)=>{ e.stopPropagation(); this.frames.splice(idx,1); this.frameHidden.splice(idx,1); cell.remove(); this.reindexFrames(); if (!this.frames.length){ this.pause(); this.previewCanvas.getContext('2d').clearRect(0,0,this.previewCanvas.width,this.previewCanvas.height);} });
      actions.appendChild(hideBtn); actions.appendChild(delBtn); cell.appendChild(actions);
      
      cell.appendChild(disp);
      cell.appendChild(dv);
      this.framesWrap.appendChild(cell);
      i++;
    }

    // Setup preview canvas to normalized size
    this.previewCanvas.width = maxW; this.previewCanvas.height = maxH;
    const start = this.frames.findIndex((_,idx)=>!this.frameHidden[idx]);
    this.cur = start===-1 ? 0 : start;
    this.draw(this.cur);
  }

  whitenToAlpha(canvas, tol = 10) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const img = ctx.getImageData(0, 0, width, height);
    const d = img.data, t = 255 - tol;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (r >= t && g >= t && b >= t) d[i + 3] = 0;
    }
    ctx.putImageData(img, 0, 0);
  }

  draw(index) {
    const cvs = this.previewCanvas, ctx = cvs.getContext('2d');
    ctx.clearRect(0,0,cvs.width,cvs.height);
    const frame = this.frames[index];
    if (frame && !this.frameHidden[index]) ctx.drawImage(frame, 0, 0);
  }

  play() {
    if (!this.frames.length) return;
    this.pause();
    const speed = parseInt(this.speedSlider.value, 10);
    this.timer = setInterval(() => {
      if (!this.frames.length) return;
      for (let k=0;k<this.frames.length;k++){ this.cur=(this.cur+1)%this.frames.length; if(!this.frameHidden[this.cur]) break; }
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

  reindexFrames() {
    Array.from(this.framesWrap.querySelectorAll('.frame')).forEach((el, i)=>{
      const tag = el.querySelector('.frame-tag'); if (tag) tag.textContent = i+1;
    });
    if (this.frameInfo) this.frameInfo.textContent = `• ${this.frameW} × ${this.frameH}px • ${this.frames.length} frames`;
    if (this.cur >= this.frames.length) this.cur = 0;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SpriteApp();
});