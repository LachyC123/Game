alert("game.js loaded");
// Main Game Engine

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.state = 'menu'; // menu, playing, paused, roundEnd, matchEnd
        this.difficulty = 'medium';
        
        // Match state
        this.roundNumber = 1;
        this.roundsToWin = 5;
        this.playerWins = 0;
        this.aiWins = 0;
        this.roundTimer = 60;
        this.roundTimeLimit = 60;
        
        // Arena setup
        this.arena = {
            width: 1200,
            height: 800,
            padding: 50
        };
        
        // Obstacles
        this.obstacles = [];
        
        // Entities
        this.player = null;
        this.ai = null;
        this.aiController = null;
        
        // Bullets
        window.gameBullets = [];
        this.bullets = window.gameBullets;
        
        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 60;
        this.fpsCounter = 0;
        this.fpsTime = 0;
        
        // Input state
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        
        // Camera
        this.camera = { x: 0, y: 0 };
        
        // Match stats
        window.matchStats = {
            damageDealt: 0,
            roundsWon: 0,
            timePlayed: 0
        };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupInput();
        this.generateArena();
        
        // Make game globally accessible
        window.game = this;
        
        // Start game loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    setupCanvas() {
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            
            // Calculate camera/scale to fit arena
            const scaleX = this.canvas.width / this.arena.width;
            const scaleY = this.canvas.height / this.arena.height;
            this.scale = Math.min(scaleX, scaleY, 1);
            
            // Center camera
            this.camera.x = (this.canvas.width - this.arena.width * this.scale) / 2;
            this.camera.y = (this.canvas.height - this.arena.height * this.scale) / 2;
        };
        
        window.addEventListener('resize', resize);
        resize();
    }
    
    setupInput() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Escape') {
                if (this.state === 'playing') this.togglePause();
            }
            if (e.code === 'KeyR' && this.player && !this.player.weapon.isReloading) {
                this.player.weapon.reload(Date.now());
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = (e.clientX - rect.left - this.camera.x) / this.scale;
            this.mouse.y = (e.clientY - rect.top - this.camera.y) / this.scale;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.down = true;
            Audio.init();
            Audio.resume();
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });
        
        // Touch events for canvas
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            Audio.init();
            Audio.resume();
        }, { passive: false });
    }
    
    generateArena() {
        this.obstacles = [];
        
        // Create interesting obstacle layout
        const layouts = [
            // Layout 1: Central cover with corners
            () => {
                // Center obstacle
                this.obstacles.push({
                    x: this.arena.width / 2 - 60,
                    y: this.arena.height / 2 - 60,
                    width: 120,
                    height: 120
                });
                
                // Corner covers
                const cornerOffset = 150;
                const cornerSize = 80;
                
                this.obstacles.push({ x: cornerOffset, y: cornerOffset, width: cornerSize, height: cornerSize });
                this.obstacles.push({ x: this.arena.width - cornerOffset - cornerSize, y: cornerOffset, width: cornerSize, height: cornerSize });
                this.obstacles.push({ x: cornerOffset, y: this.arena.height - cornerOffset - cornerSize, width: cornerSize, height: cornerSize });
                this.obstacles.push({ x: this.arena.width - cornerOffset - cornerSize, y: this.arena.height - cornerOffset - cornerSize, width: cornerSize, height: cornerSize });
                
                // Side pillars
                this.obstacles.push({ x: this.arena.width / 2 - 25, y: 100, width: 50, height: 80 });
                this.obstacles.push({ x: this.arena.width / 2 - 25, y: this.arena.height - 180, width: 50, height: 80 });
                this.obstacles.push({ x: 100, y: this.arena.height / 2 - 40, width: 80, height: 80 });
                this.obstacles.push({ x: this.arena.width - 180, y: this.arena.height / 2 - 40, width: 80, height: 80 });
            },
            
            // Layout 2: Symmetrical lanes
            () => {
                const wallWidth = 30;
                const wallLength = 200;
                
                // Horizontal walls
                this.obstacles.push({ x: 200, y: this.arena.height / 3, width: wallLength, height: wallWidth });
                this.obstacles.push({ x: this.arena.width - 200 - wallLength, y: this.arena.height / 3, width: wallLength, height: wallWidth });
                this.obstacles.push({ x: 200, y: this.arena.height * 2 / 3 - wallWidth, width: wallLength, height: wallWidth });
                this.obstacles.push({ x: this.arena.width - 200 - wallLength, y: this.arena.height * 2 / 3 - wallWidth, width: wallLength, height: wallWidth });
                
                // Center pillars
                this.obstacles.push({ x: this.arena.width / 2 - 100, y: this.arena.height / 2 - 40, width: 60, height: 80 });
                this.obstacles.push({ x: this.arena.width / 2 + 40, y: this.arena.height / 2 - 40, width: 60, height: 80 });
                
                // Corner boxes
                this.obstacles.push({ x: 80, y: 80, width: 60, height: 60 });
                this.obstacles.push({ x: this.arena.width - 140, y: 80, width: 60, height: 60 });
                this.obstacles.push({ x: 80, y: this.arena.height - 140, width: 60, height: 60 });
                this.obstacles.push({ x: this.arena.width - 140, y: this.arena.height - 140, width: 60, height: 60 });
            },
            
            // Layout 3: Maze-like
            () => {
                // L-shaped covers
                this.obstacles.push({ x: 200, y: 200, width: 150, height: 30 });
                this.obstacles.push({ x: 200, y: 200, width: 30, height: 150 });
                
                this.obstacles.push({ x: this.arena.width - 350, y: 200, width: 150, height: 30 });
                this.obstacles.push({ x: this.arena.width - 230, y: 200, width: 30, height: 150 });
                
                this.obstacles.push({ x: 200, y: this.arena.height - 230, width: 150, height: 30 });
                this.obstacles.push({ x: 200, y: this.arena.height - 350, width: 30, height: 150 });
                
                this.obstacles.push({ x: this.arena.width - 350, y: this.arena.height - 230, width: 150, height: 30 });
                this.obstacles.push({ x: this.arena.width - 230, y: this.arena.height - 350, width: 30, height: 150 });
                
                // Center cross
                this.obstacles.push({ x: this.arena.width / 2 - 15, y: this.arena.height / 2 - 80, width: 30, height: 160 });
                this.obstacles.push({ x: this.arena.width / 2 - 80, y: this.arena.height / 2 - 15, width: 160, height: 30 });
            }
        ];
        
        // Pick random layout
        const layout = Utils.randomPick(layouts);
        layout();
        
        // Set powerup spawn points
        const spawnPoints = [
            { x: this.arena.width / 2, y: 150 },
            { x: this.arena.width / 2, y: this.arena.height - 150 },
            { x: 150, y: this.arena.height / 2 },
            { x: this.arena.width - 150, y: this.arena.height / 2 },
            { x: this.arena.width / 2, y: this.arena.height / 2 }
        ];
        PowerUps.setSpawnPoints(spawnPoints);
    }
    
    setDifficulty(diff) {
        this.difficulty = diff;
        if (this.aiController) {
            this.aiController.setDifficulty(diff);
        }
    }
    
    startGame() {
        this.state = 'playing';
        this.roundNumber = 1;
        this.playerWins = 0;
        this.aiWins = 0;
        
        // Reset match stats
        window.matchStats = {
            damageDealt: 0,
            roundsWon: 0,
            timePlayed: 0
        };
        
        // Reset upgrades
        Upgrades.reset();
        
        // Show game screen
        UI.showScreen('game');
        
        this.startRound();
    }
    
    startRound() {
        // Generate new arena layout
        this.generateArena();
        
        // Create players
        const playerX = 150;
        const playerY = this.arena.height / 2;
        const aiX = this.arena.width - 150;
        const aiY = this.arena.height / 2;
        
        if (!this.player) {
            this.player = new Player(playerX, playerY, false);
        } else {
            this.player.reset(playerX, playerY);
        }
        
        if (!this.ai) {
            this.ai = new Player(aiX, aiY, true);
            this.aiController = new AIController(this.ai, this.difficulty);
        } else {
            this.ai.reset(aiX, aiY);
            this.aiController.reset();
        }
        
        // Apply upgrades
        Upgrades.applyAllUpgrades(this.player, false);
        Upgrades.applyAllUpgrades(this.ai, true);
        
        // Clear bullets
        this.bullets.length = 0;
        window.gameBullets = this.bullets;
        
        // Reset powerups
        PowerUps.reset();
        
        // Clear effects
        Effects.clear();
        floatingTexts.length = 0;
        
        // Reset timer
        this.roundTimer = this.roundTimeLimit;
        
        // Update UI
        UI.updateWins(this.playerWins, this.aiWins);
        UI.updateRoundInfo(this.roundNumber, this.roundTimer);
        UI.hideAllOverlays();
        
        // Countdown
        this.state = 'countdown';
        UI.showCountdown(3, () => {
            this.state = 'playing';
        });
    }
    
    getPlayerInput() {
        const input = {
            moveX: 0,
            moveY: 0,
            aimX: this.mouse.x,
            aimY: this.mouse.y,
            shooting: this.mouse.down,
            dash: false,
            special: false
        };
        
        // Keyboard movement
        if (this.keys['KeyW'] || this.keys['ArrowUp']) input.moveY -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) input.moveY += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) input.moveX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) input.moveX += 1;
        
        // Dash
        if (this.keys['Space'] || this.keys['ShiftLeft']) {
            input.dash = true;
            this.keys['Space'] = false; // Consume
            this.keys['ShiftLeft'] = false;
        }
        
        // Special
        if (this.keys['KeyE'] || this.keys['KeyQ']) {
            input.special = true;
            this.keys['KeyE'] = false;
            this.keys['KeyQ'] = false;
        }
        
        // Mobile input
        if (Utils.isMobile() && window.mobileInput) {
            input.moveX = window.mobileInput.moveX;
            input.moveY = window.mobileInput.moveY;
            
            if (window.mobileInput.shooting) {
                // Convert mobile aim to world coordinates
                const rect = this.canvas.getBoundingClientRect();
                input.aimX = (window.mobileInput.aimX - this.camera.x) / this.scale;
                input.aimY = (window.mobileInput.aimY - this.camera.y) / this.scale;
                input.shooting = true;
            }
            
            if (window.mobileInput.dash) {
                input.dash = true;
                window.mobileInput.dash = false;
            }
            
            if (window.mobileInput.special) {
                input.special = true;
                window.mobileInput.special = false;
            }
        }
        
        return input;
    }
    
    update(dt, currentTime) {
        if (this.state !== 'playing') return;
        
        const bounds = {
            left: 0,
            right: this.arena.width,
            top: 0,
            bottom: this.arena.height
        };
        
        // Update timer
        this.roundTimer -= dt;
        if (this.roundTimer <= 0) {
            this.handleTimeout();
            return;
        }
        
        // Update match time
        window.matchStats.timePlayed += dt;
        
        // Get player input
        const playerInput = this.getPlayerInput();
        
        // Handle dash
        if (playerInput.dash && this.player.alive) {
            this.player.dash(currentTime, { x: playerInput.moveX, y: playerInput.moveY });
        }
        
        // Handle special
        if (playerInput.special && this.player.alive) {
            this.player.useSpecial(currentTime, this.ai);
        }
        
        // Update player
        this.player.update(dt, currentTime, playerInput, this.obstacles, bounds);
        
        // Get AI input
        const aiInput = this.aiController.update(dt, currentTime, this.player, this.obstacles, this.bullets, bounds);
        
        // Handle AI dash
        if (aiInput.dash && this.ai.alive) {
            this.ai.dash(currentTime, { x: aiInput.moveX, y: aiInput.moveY });
        }
        
        // Handle AI special
        if (aiInput.special && this.ai.alive) {
            this.ai.useSpecial(currentTime, this.player);
        }
        
        // Update AI
        this.ai.update(dt, currentTime, aiInput, this.obstacles, bounds);
        
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(dt, this.obstacles);
            
            if (!bullet.alive) {
                this.bullets.splice(i, 1);
                continue;
            }
            
            // Check bullet hits
            if (bullet.owner === 'player' && bullet.checkHit(this.ai)) {
                const damage = this.ai.takeDamage(bullet.damage, currentTime);
                window.matchStats.damageDealt += damage;
                window.gameStats.totalHits++;
                
                addFloatingText(this.ai.x, this.ai.y - 30, `-${Math.round(damage)}`, {
                    color: '#ff6666',
                    size: 16
                });
                
                Effects.hitSparks(bullet.x, bullet.y, 10, bullet.color);
                
                if (bullet.isSpecial) {
                    Effects.explosion(bullet.x, bullet.y, 0.8);
                }
                
                bullet.alive = false;
                this.bullets.splice(i, 1);
            } else if (bullet.owner === 'ai' && bullet.checkHit(this.player)) {
                const damage = this.player.takeDamage(bullet.damage, currentTime);
                
                addFloatingText(this.player.x, this.player.y - 30, `-${Math.round(damage)}`, {
                    color: '#ff6666',
                    size: 16
                });
                
                Effects.hitSparks(bullet.x, bullet.y, 10, bullet.color);
                
                if (bullet.isSpecial) {
                    Effects.explosion(bullet.x, bullet.y, 0.8);
                }
                
                bullet.alive = false;
                this.bullets.splice(i, 1);
            }
        }
        
        // Update powerups
        PowerUps.update(dt, currentTime, this.player, this.ai);
        
        // Update effects
        Effects.update(dt);
        updateFloatingTexts(dt);
        
        // Update UI
        UI.updateHealth(this.player, this.ai);
        UI.updateAmmo(this.player.weapon);
        UI.updateRoundInfo(this.roundNumber, this.roundTimer);
        UI.updateSpecialButton(this.player.specialReady);
        
        // Check for round end
        if (!this.player.alive) {
            this.endRound(false);
        } else if (!this.ai.alive) {
            this.endRound(true);
        }
    }
    
    handleTimeout() {
        // Compare health percentages
        const playerHealthPercent = this.player.health / this.player.maxHealth;
        const aiHealthPercent = this.ai.health / this.ai.maxHealth;
        
        if (playerHealthPercent > aiHealthPercent) {
            this.endRound(true);
        } else if (aiHealthPercent > playerHealthPercent) {
            this.endRound(false);
        } else {
            // Tie - both lose (or do sudden death?)
            this.endRound(false);
        }
    }
    
    endRound(playerWon) {
        this.state = 'roundEnd';
        
        if (playerWon) {
            this.playerWins++;
            window.matchStats.roundsWon++;
            UI.addKillMessage('You eliminated the AI!', true);
        } else {
            this.aiWins++;
            UI.addKillMessage('You were eliminated!', false);
        }
        
        // Check for match end
        const isMatchEnd = this.playerWins >= this.roundsToWin || this.aiWins >= this.roundsToWin;
        
        setTimeout(() => {
            UI.showRoundEnd(playerWon, this.playerWins, this.aiWins, isMatchEnd);
            
            // AI picks upgrade
            if (!isMatchEnd) {
                const aiUpgrade = Upgrades.getAIUpgrade();
                if (aiUpgrade) {
                    Upgrades.applyUpgrade(this.ai, aiUpgrade.id, true);
                }
            }
        }, 1000);
    }
    
    nextRound() {
        // Apply selected upgrade
        Upgrades.confirmSelection(this.player);
        
        this.roundNumber++;
        this.startRound();
    }
    
    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            UI.showOverlay('pause');
        } else if (this.state === 'paused') {
            this.state = 'playing';
            UI.hideAllOverlays();
        }
    }
    
    restartMatch() {
        UI.hideAllOverlays();
        UI.hideLowHealthWarning();
        this.startGame();
    }
    
    quitToMenu() {
        this.state = 'menu';
        UI.hideAllOverlays();
        UI.hideLowHealthWarning();
        UI.showScreen('menu');
        UI.updateMenuStats();
    }
    
    draw() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.state === 'menu') return;
        
        // Apply camera transform
        ctx.save();
        ctx.translate(this.camera.x + Effects.screenShake.x, this.camera.y + Effects.screenShake.y);
        ctx.scale(this.scale, this.scale);
        
        // Draw arena background
        this.drawArena(ctx);
        
        // Draw obstacles
        this.drawObstacles(ctx);
        
        // Draw powerups
        PowerUps.draw(ctx);
        
        // Draw bullets
        for (const bullet of this.bullets) {
            bullet.draw(ctx);
        }
        
        // Draw players
        if (this.player) this.player.draw(ctx);
        if (this.ai) this.ai.draw(ctx);
        
        // Draw effects
        Effects.draw(ctx);
        drawFloatingTexts(ctx);
        
        ctx.restore();
        
        // Draw screen effects (not affected by camera)
        Effects.drawFlash(ctx, this.canvas);
    }
    
    drawArena(ctx) {
        // Arena floor
        const gradient = ctx.createRadialGradient(
            this.arena.width / 2, this.arena.height / 2, 0,
            this.arena.width / 2, this.arena.height / 2, this.arena.width / 2
        );
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f0f1a');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.arena.width, this.arena.height);
        
        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        
        const gridSize = 50;
        for (let x = 0; x <= this.arena.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.arena.height);
            ctx.stroke();
        }
        for (let y = 0; y <= this.arena.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.arena.width, y);
            ctx.stroke();
        }
        
        // Arena border
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;
        ctx.strokeRect(2, 2, this.arena.width - 4, this.arena.height - 4);
        ctx.shadowBlur = 0;
        
        // Corner accents
        const cornerSize = 50;
        ctx.fillStyle = '#00ff88';
        ctx.globalAlpha = 0.3;
        
        // Top-left
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cornerSize, 0);
        ctx.lineTo(0, cornerSize);
        ctx.fill();
        
        // Top-right
        ctx.beginPath();
        ctx.moveTo(this.arena.width, 0);
        ctx.lineTo(this.arena.width - cornerSize, 0);
        ctx.lineTo(this.arena.width, cornerSize);
        ctx.fill();
        
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(0, this.arena.height);
        ctx.lineTo(cornerSize, this.arena.height);
        ctx.lineTo(0, this.arena.height - cornerSize);
        ctx.fill();
        
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(this.arena.width, this.arena.height);
        ctx.lineTo(this.arena.width - cornerSize, this.arena.height);
        ctx.lineTo(this.arena.width, this.arena.height - cornerSize);
        ctx.fill();
        
        ctx.globalAlpha = 1;
    }
    
    drawObstacles(ctx) {
        for (const obs of this.obstacles) {
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(obs.x + 5, obs.y + 5, obs.width, obs.height);
            
            // Main body
            const gradient = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
            gradient.addColorStop(0, '#3a3a5a');
            gradient.addColorStop(1, '#2a2a4a');
            ctx.fillStyle = gradient;
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            
            // Border
            ctx.strokeStyle = '#4a4a6a';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
            
            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(obs.x, obs.y, obs.width, 3);
        }
    }
    
    gameLoop(currentTime) {
        // Calculate delta time
        this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        
        // FPS counter
        this.fpsCounter++;
        this.fpsTime += this.deltaTime;
        if (this.fpsTime >= 1) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTime = 0;
            UI.updateFPS(this.fps);
        }
        
        // Update and draw
        this.update(this.deltaTime, currentTime);
        this.draw();
        
        // Next frame
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        new Game();
    }, 100);
});
