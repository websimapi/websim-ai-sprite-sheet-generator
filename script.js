class SpriteSheetGenerator {
    constructor() {
        this.spriteSheet = null;
        this.frames = [];
        this.animationInterval = null;
        this.currentFrame = 0;
        this.columns = 2;
        this.rows = 2;
        this.columnPositions = []; // Store custom column positions (percentages)
        this.rowPositions = []; // Store custom row positions (percentages)
        this.isDragging = false;
        this.dragElement = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeGridPositions();
    }
    
    initializeElements() {
        this.promptInput = document.getElementById('prompt');
        this.columnsSelect = document.getElementById('columns');
        this.rowsSelect = document.getElementById('rows');
        this.columnsManual = document.getElementById('columnsManual');
        this.rowsManual = document.getElementById('rowsManual');
        this.styleSelect = document.getElementById('style');
        this.generateBtn = document.getElementById('generateBtn');
        this.resultsDiv = document.getElementById('results');
        this.spriteSheetImg = document.getElementById('spriteSheet');
        this.gridOverlay = document.getElementById('gridOverlay');
        this.frameContainer = document.getElementById('frameContainer');
        this.animationCanvas = document.getElementById('animationCanvas');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        
        // Set default prompt
        this.promptInput.value = "A sprite sheet showing four frames of animation of a bird in flight. The bird is depicted in silhouette, with the wings in various positions suggesting movement. The style is simple and graphic, suitable for animation or game use. The background is transparent.";
    }
    
    attachEventListeners() {
        this.generateBtn.addEventListener('click', () => this.generateSpriteSheet());
        this.columnsSelect.addEventListener('change', (e) => {
            this.columns = parseInt(e.target.value);
            this.columnsManual.value = this.columns;
            this.initializeGridPositions();
            this.updateGridOverlay();
        });
        this.rowsSelect.addEventListener('change', (e) => {
            this.rows = parseInt(e.target.value);
            this.rowsManual.value = this.rows;
            this.initializeGridPositions();
            this.updateGridOverlay();
        });
        
        this.columnsManual.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value && value > 0 && value <= 20) {
                this.columns = value;
                this.columnsSelect.value = value <= 8 ? value : 8;
                this.initializeGridPositions();
                this.updateGridOverlay();
            }
        });
        
        this.rowsManual.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value && value > 0 && value <= 20) {
                this.rows = value;
                this.rowsSelect.value = value <= 6 ? value : 6;
                this.initializeGridPositions();
                this.updateGridOverlay();
            }
        });
        this.playBtn.addEventListener('click', () => this.playAnimation());
        this.pauseBtn.addEventListener('click', () => this.pauseAnimation());
        this.speedSlider.addEventListener('input', (e) => {
            this.speedValue.textContent = e.target.value + 'ms';
            if (this.animationInterval) {
                this.pauseAnimation();
                this.playAnimation();
            }
        });
        
        document.getElementById('downloadFrames').addEventListener('click', () => this.downloadFrames());
        document.getElementById('downloadGif').addEventListener('click', () => this.downloadGif());
        
        // Add drag event listeners
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        document.addEventListener('touchmove', (e) => this.handleDrag(e), { passive: false });
        document.addEventListener('touchend', () => this.stopDrag());
    }
    
    initializeGridPositions() {
        // Initialize evenly spaced positions
        this.columnPositions = [];
        this.rowPositions = [];
        
        for (let i = 1; i < this.columns; i++) {
            this.columnPositions.push((i / this.columns) * 100);
        }
        
        for (let i = 1; i < this.rows; i++) {
            this.rowPositions.push((i / this.rows) * 100);
        }
    }
    
    async generateSpriteSheet() {
        const prompt = this.promptInput.value.trim();
        const style = this.styleSelect.value;
        
        if (!prompt) {
            alert('Please enter an animation description');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const totalFrames = this.columns * this.rows;
            const gridInstruction = `${totalFrames} frames arranged in a perfect ${this.columns}x${this.rows} grid`;
            const styleInstruction = style ? `, ${style}` : '';
            
            const fullPrompt = `${prompt}, ${gridInstruction}${styleInstruction}, evenly spaced frames, no gaps between frames, sprite sheet format, animation frames`;
            
            console.log('Generating with prompt:', fullPrompt);
            
            const result = await websim.imageGen({
                prompt: fullPrompt,
                width: 1024,
                height: 512,
            });
            
            this.spriteSheet = result.url;
            this.displayResults();
            
        } catch (error) {
            console.error('Error generating sprite sheet:', error);
            alert('Error generating sprite sheet. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(isLoading) {
        const btnText = this.generateBtn.querySelector('.btn-text');
        const spinner = this.generateBtn.querySelector('.loading-spinner');
        
        if (isLoading) {
            btnText.textContent = 'Generating...';
            spinner.style.display = 'block';
            this.generateBtn.disabled = true;
        } else {
            btnText.textContent = 'Generate Sprite Sheet';
            spinner.style.display = 'none';
            this.generateBtn.disabled = false;
        }
    }
    
    displayResults() {
        this.spriteSheetImg.src = this.spriteSheet;
        this.spriteSheetImg.onload = () => {
            this.updateGridOverlay();
            this.extractFrames();
        };
        this.resultsDiv.style.display = 'block';
    }
    
    updateGridOverlay() {
        if (!this.spriteSheetImg.src) return;
        
        const overlay = this.gridOverlay;
        overlay.innerHTML = '';
        
        // Create vertical grid lines
        this.columnPositions.forEach((position, index) => {
            const vLine = document.createElement('div');
            vLine.className = 'grid-line vertical';
            vLine.style.left = `${position}%`;
            vLine.dataset.type = 'vertical';
            vLine.dataset.index = index;
            
            vLine.addEventListener('mousedown', (e) => this.startDrag(e, vLine));
            vLine.addEventListener('touchstart', (e) => this.startDrag(e, vLine), { passive: false });
            
            overlay.appendChild(vLine);
        });
        
        // Create horizontal grid lines
        this.rowPositions.forEach((position, index) => {
            const hLine = document.createElement('div');
            hLine.className = 'grid-line horizontal';
            hLine.style.top = `${position}%`;
            hLine.dataset.type = 'horizontal';
            hLine.dataset.index = index;
            
            hLine.addEventListener('mousedown', (e) => this.startDrag(e, hLine));
            hLine.addEventListener('touchstart', (e) => this.startDrag(e, hLine), { passive: false });
            
            overlay.appendChild(hLine);
        });
    }
    
    startDrag(event, element) {
        event.preventDefault();
        this.isDragging = true;
        this.dragElement = element;
        element.classList.add('dragging');
        
        const evt = event.touches ? event.touches[0] : event;
        
        // Store initial mouse position
        this.dragStartX = evt.clientX;
        this.dragStartY = evt.clientY;
        
        // Store container bounds
        const rect = this.gridOverlay.getBoundingClientRect();
        this.containerRect = rect;
    }
    
    handleDrag(event) {
        if (!this.isDragging || !this.dragElement) return;
        
        event.preventDefault();
        
        const evt = event.touches ? event.touches[0] : event;
        const rect = this.containerRect;
        const type = this.dragElement.dataset.type;
        const index = parseInt(this.dragElement.dataset.index);
        
        if (type === 'vertical') {
            const x = evt.clientX - rect.left;
            const percentage = Math.max(5, Math.min(95, (x / rect.width) * 100));
            
            this.columnPositions[index] = percentage;
            this.dragElement.style.left = `${percentage}%`;
        } else if (type === 'horizontal') {
            const y = evt.clientY - rect.top;
            const percentage = Math.max(5, Math.min(95, (y / rect.height) * 100));
            
            this.rowPositions[index] = percentage;
            this.dragElement.style.top = `${percentage}%`;
        }
    }
    
    stopDrag() {
        if (this.isDragging && this.dragElement) {
            this.dragElement.classList.remove('dragging');
            this.isDragging = false;
            this.dragElement = null;
            
            // Re-extract frames with new grid positions
            if (this.spriteSheet) {
                this.extractFrames();
            }
        }
    }
    
    extractFrames() {
        this.frameContainer.innerHTML = '';
        this.frames = [];
        let maxW = 0, maxH = 0;
        
        const img = this.spriteSheetImg;
        
        // Calculate actual positions including custom grid positions
        const colPositions = [0, ...this.columnPositions.map(p => p / 100), 1];
        const rowPositions = [0, ...this.rowPositions.map(p => p / 100), 1];
        
        // Sort positions to ensure proper order
        colPositions.sort((a, b) => a - b);
        rowPositions.sort((a, b) => a - b);
        
        let frameIndex = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                // Calculate frame boundaries
                const x1 = colPositions[col] * img.naturalWidth;
                const x2 = colPositions[col + 1] * img.naturalWidth;
                const y1 = rowPositions[row] * img.naturalHeight;
                const y2 = rowPositions[row + 1] * img.naturalHeight;
                
                const frameWidth = x2 - x1;
                const frameHeight = y2 - y1;
                maxW = Math.max(maxW, frameWidth);
                maxH = Math.max(maxH, frameHeight);
                
                // Create canvas for this frame
                const canvas = document.createElement('canvas');
                canvas.width = frameWidth;
                canvas.height = frameHeight;
                const ctx = canvas.getContext('2d');
                
                // Extract frame from sprite sheet
                ctx.drawImage(
                    img,
                    x1, y1,
                    frameWidth, frameHeight,
                    0, 0,
                    frameWidth, frameHeight
                );
                
                this.frames.push(canvas);
                
                // Create frame display
                const frameDiv = document.createElement('div');
                frameDiv.className = 'frame';
                
                const displayCanvas = canvas.cloneNode();
                const displayCtx = displayCanvas.getContext('2d');
                displayCtx.drawImage(canvas, 0, 0);
                
                const frameNumber = document.createElement('div');
                frameNumber.className = 'frame-number';
                frameNumber.textContent = frameIndex + 1;
                
                frameDiv.appendChild(displayCanvas);
                frameDiv.appendChild(frameNumber);
                this.frameContainer.appendChild(frameDiv);
                
                frameIndex++;
            }
        }
        
        // Pad all frames to the largest size
        this.frames = this.frames.map(c => {
            if (c.width === maxW && c.height === maxH) return c;
            const padded = document.createElement('canvas');
            padded.width = maxW; padded.height = maxH;
            padded.getContext('2d').drawImage(c, 0, 0);
            return padded;
        });
        
        // Update displayed thumbnails to padded sizes
        const displays = this.frameContainer.querySelectorAll('.frame canvas');
        displays.forEach((dc, i) => {
            const src = this.frames[i]; dc.width = src.width; dc.height = src.height;
            const dctx = dc.getContext('2d'); dctx.clearRect(0,0,dc.width,dc.height); dctx.drawImage(src,0,0);
        });
        
        this.setupAnimationCanvas();
    }
    
    setupAnimationCanvas() {
        if (this.frames.length === 0) return;
        
        const canvas = this.animationCanvas;
        const firstFrame = this.frames[0];
        
        canvas.width = firstFrame.width;
        canvas.height = firstFrame.height;
        
        this.drawFrame(0);
    }
    
    drawFrame(frameIndex) {
        if (frameIndex >= this.frames.length) return;
        
        const canvas = this.animationCanvas;
        const ctx = canvas.getContext('2d');
        const frame = this.frames[frameIndex];
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frame, 0, 0);
    }
    
    playAnimation() {
        if (this.frames.length === 0) return;
        
        this.pauseAnimation();
        
        const speed = parseInt(this.speedSlider.value);
        this.animationInterval = setInterval(() => {
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            this.drawFrame(this.currentFrame);
        }, speed);
    }
    
    pauseAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
    }
    
    downloadFrames() {
        if (this.frames.length === 0) return;
        
        this.frames.forEach((canvas, index) => {
            const link = document.createElement('a');
            link.download = `frame_${index + 1}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    }
    
    async downloadGif() {
        if (this.frames.length === 0) return;
        
        // Simple GIF creation would require a library
        // For now, we'll download the original sprite sheet
        const link = document.createElement('a');
        link.download = 'sprite_sheet.png';
        link.href = this.spriteSheet;
        link.click();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new SpriteSheetGenerator();
});