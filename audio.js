// Audio system using Web Audio API for low latency

class AudioManager {
    constructor() {
        this.context = null;
        this.sounds = {};
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) return;
        
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain nodes for volume control
            this.musicGain = this.context.createGain();
            this.sfxGain = this.context.createGain();
            
            this.musicGain.connect(this.context.destination);
            this.sfxGain.connect(this.context.destination);
            
            this.musicGain.gain.value = window.gameSettings.music ? 0.3 : 0;
            this.sfxGain.gain.value = window.gameSettings.sfx ? 0.5 : 0;
            
            // Generate all sounds
            this.generateSounds();
            
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }
    
    generateSounds() {
        // Generate synthetic sounds
        this.sounds.shoot = this.createShootSound();
        this.sounds.hit = this.createHitSound();
        this.sounds.explosion = this.createExplosionSound();
        this.sounds.dash = this.createDashSound();
        this.sounds.pickup = this.createPickupSound();
        this.sounds.upgrade = this.createUpgradeSound();
        this.sounds.countdown = this.createCountdownSound();
        this.sounds.roundStart = this.createRoundStartSound();
        this.sounds.victory = this.createVictorySound();
        this.sounds.defeat = this.createDefeatSound();
        this.sounds.lowHealth = this.createLowHealthSound();
        this.sounds.reload = this.createReloadSound();
    }
    
    // Create an oscillator-based sound
    createTone(frequency, duration, type = 'sine', attack = 0.01, decay = 0.1) {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.context.currentTime + attack);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + duration);
        };
    }
    
    // Create noise-based sound (for explosions, shots, etc.)
    createNoise(duration, filterFreq = 1000, filterType = 'lowpass') {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const bufferSize = this.context.sampleRate * duration;
            const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.context.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.context.createBiquadFilter();
            filter.type = filterType;
            filter.frequency.value = filterFreq;
            
            const gainNode = this.context.createGain();
            gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            noise.start();
        };
    }
    
    createShootSound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            // Sharp attack noise with quick decay
            const bufferSize = this.context.sampleRate * 0.1;
            const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
            }
            
            const noise = this.context.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.context.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 800;
            
            const gainNode = this.context.createGain();
            gainNode.gain.value = 0.4;
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            noise.start();
        };
    }
    
    createHitSound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0.4, this.context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start();
            osc.stop(this.context.currentTime + 0.1);
        };
    }
    
    createExplosionSound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const bufferSize = this.context.sampleRate * 0.5;
            const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
            }
            
            const noise = this.context.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.context.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, this.context.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.5);
            
            const gainNode = this.context.createGain();
            gainNode.gain.value = 0.5;
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            noise.start();
        };
    }
    
    createDashSound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.15);
            
            gain.gain.setValueAtTime(0.2, this.context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start();
            osc.stop(this.context.currentTime + 0.15);
        };
    }
    
    createPickupSound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const frequencies = [523, 659, 784]; // C5, E5, G5
            
            frequencies.forEach((freq, i) => {
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                const startTime = this.context.currentTime + i * 0.05;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
                
                osc.connect(gain);
                gain.connect(this.sfxGain);
                
                osc.start(startTime);
                osc.stop(startTime + 0.15);
            });
        };
    }
    
    createUpgradeSound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const frequencies = [392, 523, 659, 784]; // G4, C5, E5, G5
            
            frequencies.forEach((freq, i) => {
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                
                osc.type = 'triangle';
                osc.frequency.value = freq;
                
                const startTime = this.context.currentTime + i * 0.08;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
                
                osc.connect(gain);
                gain.connect(this.sfxGain);
                
                osc.start(startTime);
                osc.stop(startTime + 0.2);
            });
        };
    }
    
    createCountdownSound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = 440;
            
            gain.gain.setValueAtTime(0.3, this.context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start();
            osc.stop(this.context.currentTime + 0.2);
        };
    }
    
    createRoundStartSound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 0.3);
            
            gain.gain.setValueAtTime(0.2, this.context.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, this.context.currentTime + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.4);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start();
            osc.stop(this.context.currentTime + 0.4);
        };
    }
    
    createVictorySound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
            
            notes.forEach((freq, i) => {
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                
                osc.type = 'triangle';
                osc.frequency.value = freq;
                
                const startTime = this.context.currentTime + i * 0.12;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
                gain.gain.setValueAtTime(0.3, startTime + 0.25);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
                
                osc.connect(gain);
                gain.connect(this.sfxGain);
                
                osc.start(startTime);
                osc.stop(startTime + 0.5);
            });
        };
    }
    
    createDefeatSound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const notes = [392, 349, 311, 262]; // G4, F4, Eb4, C4
            
            notes.forEach((freq, i) => {
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                
                const startTime = this.context.currentTime + i * 0.15;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
                
                osc.connect(gain);
                gain.connect(this.sfxGain);
                
                osc.start(startTime);
                osc.stop(startTime + 0.4);
            });
        };
    }
    
    createLowHealthSound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = 100;
            
            gain.gain.setValueAtTime(0.15, this.context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start();
            osc.stop(this.context.currentTime + 0.5);
        };
    }
    
    createReloadSound() {
        return () => {
            if (!this.context || !window.gameSettings.sfx) return;
            
            // Click sound
            const bufferSize = this.context.sampleRate * 0.05;
            const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
            }
            
            const noise = this.context.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.context.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 2000;
            
            const gainNode = this.context.createGain();
            gainNode.gain.value = 0.3;
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            noise.start();
        };
    }
    
    play(soundName) {
        if (!this.initialized) {
            this.init();
        }
        
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }
    
    setMusicVolume(enabled) {
        if (this.musicGain) {
            this.musicGain.gain.value = enabled ? 0.3 : 0;
        }
    }
    
    setSfxVolume(enabled) {
        if (this.sfxGain) {
            this.sfxGain.gain.value = enabled ? 0.5 : 0;
        }
    }
    
    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }
}

// Global audio manager
const Audio = new AudioManager();
