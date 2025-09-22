class SpriteSheetGenerator {
    constructor() {
        this.spriteSheet = null;
        this.frames = [];
        this.animationInterval = null;
        this.currentFrame = 0;
        this.columns = 4;
        this.rows = 2;
        
        this.initializeElements();
        this.attachEventListeners();
    }
    
    initializeElements() {
        this.promptInput = document.getElementById('prompt');
        this.columnsSelect = document.getElementById('columns');
        this.rowsSelect = document.getElementById('rows');
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
        this.promptInput.value = "A walking character animation cycle, 8 frames in a 4x2 grid, each frame shows different walking poses, pixel art style, consistent character design";
    }
    
    attachEventListeners() {
        this.generateBtn.addEventListener('click', () => this.generateSpriteSheet());
        this.columnsSelect.addEventListener('change', (e) => {
            this.columns = parseInt(e.target.value);
            this.updateGridOverlay();
        });
        this.rowsSelect.addEventListener('change', (e) => {
            this.rows = parseInt(e.target.value);
            this.updateGridOverlay();
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
        
        // Create grid lines
        for (let i = 1; i < this.columns; i++) {
            const vLine = document.createElement('div');
            vLine.style.cssText = `
                position: absolute;
                left: ${(i / this.columns) * 100}%;
                top: 0;
                width: 1px;
                height: 100%;
                background: #00ff88;
                opacity: 0.7;
            `;
            overlay.appendChild(vLine);
        }
        
        for (let i = 1; i < this.rows; i++) {
            const hLine = document.createElement('div');
            hLine.style.cssText = `
                position: absolute;
                top: ${(i / this.rows) * 100}%;
                left: 0;
                width: 100%;
                height: 1px;
                background: #00ff88;
                opacity: 0.7;
            `;
            overlay.appendChild(hLine);
        }
    }
    
    extractFrames() {
        this.frameContainer.innerHTML = '';
        this.frames = [];
        
        const img = this.spriteSheetImg;
        const frameWidth = img.naturalWidth / this.columns;
        const frameHeight = img.naturalHeight / this.rows;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                const frameIndex = row * this.columns + col;
                
                // Create canvas for this frame
                const canvas = document.createElement('canvas');
                canvas.width = frameWidth;
                canvas.height = frameHeight;
                const ctx = canvas.getContext('2d');
                
                // Extract frame from sprite sheet
                ctx.drawImage(
                    img,
                    col * frameWidth, row * frameHeight,
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
            }
        }
        
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

