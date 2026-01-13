// UI Management

class UIManager {
    constructor() {
        // Screen elements
        this.screens = {
            menu: document.getElementById('menu-screen'),
            tutorial: document.getElementById('tutorial-screen'),
            settings: document.getElementById('settings-screen'),
            game: document.getElementById('game-screen')
        };
        
        // Overlays
        this.overlays = {
            pause: document.getElementById('pause-menu'),
            roundEnd: document.getElementById('round-end'),
            matchEnd: document.getElementById('match-end'),
            countdown: document.getElementById('countdown-overlay')
        };
        
        // HUD elements
        this.hud = {
            playerHealth: document.getElementById('player-health'),
            playerHealthText: document.getElementById('player-health-text'),
            playerAmmo: document.getElementById('player-ammo'),
            playerWins: document.getElementById('player-wins'),
            aiHealth: document.getElementById('ai-health'),
            aiHealthText: document.getElementById('ai-health-text'),
            aiWins: document.getElementById('ai-wins'),
            roundNumber: document.getElementById('round-number'),
            roundTimer: document.getElementById('round-timer'),
            fpsDisplay: document.getElementById('fps-display')
        };
        
        // Other elements
        this.killFeed = document.getElementById('kill-feed');
        this.countdownNumber = document.querySelector('.countdown-number');
        
        // Low health warning element
        this.lowHealthWarning = null;
        
        this.setupEventListeners();
        this.updateMenuStats();
    }
    
    setupEventListeners() {
        // Menu buttons
        document.getElementById('play-btn').addEventListener('click', () => {
            Audio.init();
            Audio.resume();
            if (window.game) window.game.startGame();
        });
        
        document.getElementById('how-to-play-btn').addEventListener('click', () => {
            this.showScreen('tutorial');
        });
        
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showScreen('settings');
        });
        
        document.getElementById('back-tutorial-btn').addEventListener('click', () => {
            this.showScreen('menu');
        });
        
        document.getElementById('back-settings-btn').addEventListener('click', () => {
            this.showScreen('menu');
        });
        
        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (window.game) window.game.setDifficulty(btn.dataset.diff);
            });
        });
        
        // Settings toggles
        document.getElementById('sfx-toggle').addEventListener('change', (e) => {
            window.gameSettings.sfx = e.target.checked;
            Audio.setSfxVolume(e.target.checked);
            saveSettings();
        });
        
        document.getElementById('music-toggle').addEventListener('change', (e) => {
            window.gameSettings.music = e.target.checked;
            Audio.setMusicVolume(e.target.checked);
            saveSettings();
        });
        
        document.getElementById('vibration-toggle').addEventListener('change', (e) => {
            window.gameSettings.vibration = e.target.checked;
            saveSettings();
        });
        
        document.getElementById('fps-toggle').addEventListener('change', (e) => {
            window.gameSettings.showFps = e.target.checked;
            this.hud.fpsDisplay.classList.toggle('hidden', !e.target.checked);
            saveSettings();
        });
        
        // Pause button
        document.getElementById('pause-btn').addEventListener('click', () => {
            if (window.game) window.game.togglePause();
        });
        
        // Pause menu buttons
        document.getElementById('resume-btn').addEventListener('click', () => {
            if (window.game) window.game.togglePause();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            if (window.game) window.game.restartMatch();
        });
        
        document.getElementById('quit-btn').addEventListener('click', () => {
            if (window.game) window.game.quitToMenu();
        });
        
        // Round end button
        document.getElementById('next-round-btn').addEventListener('click', () => {
            if (window.game) window.game.nextRound();
        });
        
        // Match end buttons
        document.getElementById('rematch-btn').addEventListener('click', () => {
            if (window.game) window.game.restartMatch();
        });
        
        document.getElementById('menu-btn').addEventListener('click', () => {
            if (window.game) window.game.quitToMenu();
        });
        
        // Mobile controls
        this.setupMobileControls();
        
        // Load settings
        document.getElementById('sfx-toggle').checked = window.gameSettings.sfx;
        document.getElementById('music-toggle').checked = window.gameSettings.music;
        document.getElementById('vibration-toggle').checked = window.gameSettings.vibration;
        document.getElementById('fps-toggle').checked = window.gameSettings.showFps;
        this.hud.fpsDisplay.classList.toggle('hidden', !window.gameSettings.showFps);
    }
    
    setupMobileControls() {
        const moveJoystick = document.getElementById('move-joystick');
        const aimJoystick = document.getElementById('aim-joystick');
        const dashBtn = document.getElementById('dash-btn');
        const specialBtn = document.getElementById('special-btn');
        
        // Joystick state
        window.mobileInput = {
            moveX: 0,
            moveY: 0,
            aimX: 0,
            aimY: 0,
            shooting: false,
            dash: false,
            special: false
        };
        
        // Setup movement joystick
        this.setupJoystick(moveJoystick, (x, y) => {
            window.mobileInput.moveX = x;
            window.mobileInput.moveY = y;
        });
        
        // Setup aim joystick
        this.setupJoystick(aimJoystick, (x, y, isActive) => {
            if (isActive && (Math.abs(x) > 0.1 || Math.abs(y) > 0.1)) {
                // Convert joystick to screen coordinates for aiming
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                window.mobileInput.aimX = rect.width / 2 + x * 200;
                window.mobileInput.aimY = rect.height / 2 + y * 200;
                window.mobileInput.shooting = true;
            } else {
                window.mobileInput.shooting = false;
            }
        });
        
        // Dash button
        dashBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            window.mobileInput.dash = true;
        });
        
        dashBtn.addEventListener('touchend', () => {
            window.mobileInput.dash = false;
        });
        
        // Special button
        specialBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            window.mobileInput.special = true;
        });
        
        specialBtn.addEventListener('touchend', () => {
            window.mobileInput.special = false;
        });
    }
    
    setupJoystick(container, callback) {
        const base = container.querySelector('.joystick-base');
        const stick = container.querySelector('.joystick-stick');
        const maxDistance = 35;
        
        let isActive = false;
        let startX = 0;
        let startY = 0;
        
        const handleStart = (e) => {
            e.preventDefault();
            isActive = true;
            const touch = e.touches ? e.touches[0] : e;
            const rect = base.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
        };
        
        const handleMove = (e) => {
            if (!isActive) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            let dx = touch.clientX - startX;
            let dy = touch.clientY - startY;
            
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > maxDistance) {
                dx = (dx / distance) * maxDistance;
                dy = (dy / distance) * maxDistance;
            }
            
            stick.style.transform = `translate(${dx}px, ${dy}px)`;
            
            callback(dx / maxDistance, dy / maxDistance, true);
        };
        
        const handleEnd = () => {
            isActive = false;
            stick.style.transform = 'translate(0, 0)';
            callback(0, 0, false);
        };
        
        base.addEventListener('touchstart', handleStart, { passive: false });
        base.addEventListener('touchmove', handleMove, { passive: false });
        base.addEventListener('touchend', handleEnd);
        base.addEventListener('touchcancel', handleEnd);
        
        // Mouse support for testing
        base.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', (e) => {
            if (isActive) handleMove(e);
        });
        document.addEventListener('mouseup', handleEnd);
    }
    
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    }
    
    showOverlay(overlayName) {
        Object.values(this.overlays).forEach(overlay => {
            overlay.classList.add('hidden');
        });
        
        if (this.overlays[overlayName]) {
            this.overlays[overlayName].classList.remove('hidden');
        }
    }
    
    hideAllOverlays() {
        Object.values(this.overlays).forEach(overlay => {
            overlay.classList.add('hidden');
        });
    }
    
    updateHealth(player, ai) {
        // Player health
        const playerPercent = (player.health / player.maxHealth) * 100;
        this.hud.playerHealth.style.width = playerPercent + '%';
        this.hud.playerHealthText.textContent = Math.ceil(player.health);
        
        // AI health
        const aiPercent = (ai.health / ai.maxHealth) * 100;
        this.hud.aiHealth.style.width = aiPercent + '%';
        this.hud.aiHealthText.textContent = Math.ceil(ai.health);
        
        // Low health warning
        if (playerPercent <= 30 && player.alive) {
            this.showLowHealthWarning();
        } else {
            this.hideLowHealthWarning();
        }
    }
    
    showLowHealthWarning() {
        if (!this.lowHealthWarning) {
            this.lowHealthWarning = document.createElement('div');
            this.lowHealthWarning.className = 'low-health-warning';
            document.body.appendChild(this.lowHealthWarning);
        }
    }
    
    hideLowHealthWarning() {
        if (this.lowHealthWarning) {
            this.lowHealthWarning.remove();
            this.lowHealthWarning = null;
        }
    }
    
    updateAmmo(weapon) {
        this.hud.playerAmmo.textContent = weapon.getAmmoDisplay();
    }
    
    updateRoundInfo(roundNumber, timer) {
        this.hud.roundNumber.textContent = `ROUND ${roundNumber}`;
        this.hud.roundTimer.textContent = Math.ceil(timer);
        
        // Flash timer when low
        if (timer <= 10) {
            this.hud.roundTimer.style.color = '#ff3366';
        } else {
            this.hud.roundTimer.style.color = '';
        }
    }
    
    updateWins(playerWins, aiWins) {
        const playerDots = this.hud.playerWins.querySelectorAll('.win-dot');
        const aiDots = this.hud.aiWins.querySelectorAll('.win-dot');
        
        playerDots.forEach((dot, i) => {
            dot.classList.toggle('won', i < playerWins);
        });
        
        aiDots.forEach((dot, i) => {
            dot.classList.toggle('won', i < aiWins);
        });
    }
    
    updateFPS(fps) {
        if (window.gameSettings.showFps) {
            this.hud.fpsDisplay.textContent = `FPS: ${fps}`;
        }
    }
    
    updateMenuStats() {
        document.getElementById('menu-wins').textContent = window.gameStats.wins;
        document.getElementById('menu-losses').textContent = window.gameStats.losses;
        document.getElementById('menu-streak').textContent = window.gameStats.bestStreak;
    }
    
    showCountdown(number, callback) {
        this.showOverlay('countdown');
        this.countdownNumber.textContent = number;
        this.countdownNumber.style.animation = 'none';
        this.countdownNumber.offsetHeight; // Trigger reflow
        this.countdownNumber.style.animation = 'countdownPulse 1s ease-in-out';
        
        Audio.play('countdown');
        
        if (number > 0) {
            setTimeout(() => {
                this.showCountdown(number - 1, callback);
            }, 1000);
        } else {
            this.countdownNumber.textContent = 'FIGHT!';
            Audio.play('roundStart');
            setTimeout(() => {
                this.hideAllOverlays();
                if (callback) callback();
            }, 500);
        }
    }
    
    showRoundEnd(playerWon, playerWins, aiWins, isMatchEnd) {
        if (isMatchEnd) {
            this.showMatchEnd(playerWins > aiWins);
            return;
        }
        
        const resultEl = document.getElementById('round-result');
        resultEl.textContent = playerWon ? 'ROUND WON!' : 'ROUND LOST!';
        resultEl.className = playerWon ? '' : 'lost';
        
        document.getElementById('round-score').textContent = `You ${playerWins} - ${aiWins} AI`;
        
        // Render upgrade selection
        Upgrades.renderUpgradeSelection(document.getElementById('upgrade-selection'));
        
        this.showOverlay('roundEnd');
        
        if (playerWon) {
            Audio.play('victory');
        } else {
            Audio.play('defeat');
        }
    }
    
    showMatchEnd(playerWon) {
        const resultEl = document.getElementById('match-result');
        resultEl.textContent = playerWon ? 'VICTORY!' : 'DEFEAT';
        resultEl.className = playerWon ? 'victory' : 'defeat';
        
        // Update stats
        if (playerWon) {
            window.gameStats.wins++;
            window.gameStats.currentStreak++;
            window.gameStats.bestStreak = Math.max(window.gameStats.bestStreak, window.gameStats.currentStreak);
        } else {
            window.gameStats.losses++;
            window.gameStats.currentStreak = 0;
        }
        saveStats();
        
        // Show match stats
        const accuracy = window.gameStats.totalShots > 0 
            ? Math.round((window.gameStats.totalHits / window.gameStats.totalShots) * 100) 
            : 0;
        
        document.getElementById('stat-damage').textContent = window.matchStats?.damageDealt || 0;
        document.getElementById('stat-accuracy').textContent = accuracy + '%';
        document.getElementById('stat-rounds').textContent = window.matchStats?.roundsWon || 0;
        document.getElementById('stat-time').textContent = Utils.formatTime(window.matchStats?.timePlayed || 0);
        
        this.showOverlay('matchEnd');
        
        if (playerWon) {
            Audio.play('victory');
        } else {
            Audio.play('defeat');
        }
    }
    
    addKillMessage(message, isPlayer) {
        const msgEl = document.createElement('div');
        msgEl.className = `kill-message ${isPlayer ? 'player' : 'ai'}`;
        msgEl.textContent = message;
        
        this.killFeed.appendChild(msgEl);
        
        setTimeout(() => {
            msgEl.remove();
        }, 3000);
    }
    
    updateSpecialButton(ready) {
        const btn = document.getElementById('special-btn');
        btn.classList.toggle('ready', ready);
    }
}

// Global UI manager
let UI;
document.addEventListener('DOMContentLoaded', () => {
    UI = new UIManager();
});
