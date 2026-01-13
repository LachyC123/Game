// Visual Effects System

class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.size = options.size || 5;
        this.color = options.color || '#ffffff';
        this.alpha = options.alpha || 1;
        this.decay = options.decay || 0.02;
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 0.98;
        this.shrink = options.shrink || 0;
        this.shape = options.shape || 'circle'; // circle, square, triangle
        this.rotation = options.rotation || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
        this.alive = true;
    }
    
    update(dt) {
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
        
        this.alpha -= this.decay * dt * 60;
        this.size -= this.shrink * dt * 60;
        this.rotation += this.rotationSpeed * dt * 60;
        
        if (this.alpha <= 0 || this.size <= 0) {
            this.alive = false;
        }
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        switch (this.shape) {
            case 'square':
                ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                break;
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(this.size, this.size);
                ctx.lineTo(-this.size, this.size);
                ctx.closePath();
                ctx.fill();
                break;
            default:
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
        }
        
        ctx.restore();
    }
}

class EffectsManager {
    constructor() {
        this.particles = [];
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.flashEffects = [];
    }
    
    update(dt) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (!this.particles[i].alive) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update screen shake
        if (this.screenShake.intensity > 0) {
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.intensity *= 0.9;
            if (this.screenShake.intensity < 0.5) {
                this.screenShake.intensity = 0;
                this.screenShake.x = 0;
                this.screenShake.y = 0;
            }
        }
        
        // Update flash effects
        for (let i = this.flashEffects.length - 1; i >= 0; i--) {
            this.flashEffects[i].alpha -= 0.1;
            if (this.flashEffects[i].alpha <= 0) {
                this.flashEffects.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        // Draw particles
        for (const particle of this.particles) {
            particle.draw(ctx);
        }
    }
    
    drawFlash(ctx, canvas) {
        for (const flash of this.flashEffects) {
            ctx.save();
            ctx.globalAlpha = flash.alpha;
            ctx.fillStyle = flash.color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }
    
    // Create muzzle flash effect
    muzzleFlash(x, y, angle, color = '#ffff00') {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const spread = Utils.random(-0.3, 0.3);
            const speed = Utils.random(5, 15);
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle + spread) * speed,
                vy: Math.sin(angle + spread) * speed,
                size: Utils.random(3, 8),
                color: color,
                decay: 0.1,
                shrink: 0.3
            }));
        }
    }
    
    // Create bullet trail
    bulletTrail(x, y, color = '#ffff00') {
        this.particles.push(new Particle(x, y, {
            size: Utils.random(2, 4),
            color: color,
            decay: 0.15,
            shrink: 0.1
        }));
    }
    
    // Create hit sparks
    hitSparks(x, y, count = 15, color = '#ff6600') {
        for (let i = 0; i < count; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(2, 8);
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.random(2, 5),
                color: color,
                decay: 0.05,
                shrink: 0.1,
                shape: Utils.randomPick(['circle', 'square'])
            }));
        }
    }
    
    // Create blood/damage particles
    damageParticles(x, y, count = 10, color = '#ff3333') {
        for (let i = 0; i < count; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(1, 5);
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.random(3, 8),
                color: color,
                decay: 0.03,
                gravity: 0.1,
                friction: 0.95
            }));
        }
    }
    
    // Create explosion effect
    explosion(x, y, size = 1) {
        const particleCount = Math.floor(30 * size);
        const colors = ['#ff6600', '#ff3300', '#ffff00', '#ff9900'];
        
        // Main explosion particles
        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(3, 12) * size;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.random(5, 15) * size,
                color: Utils.randomPick(colors),
                decay: 0.03,
                shrink: 0.2 * size,
                shape: Utils.randomPick(['circle', 'square'])
            }));
        }
        
        // Smoke particles
        for (let i = 0; i < particleCount / 2; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(1, 5) * size;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                size: Utils.random(10, 25) * size,
                color: '#666666',
                alpha: 0.5,
                decay: 0.01,
                shrink: 0.05
            }));
        }
        
        this.shake(15 * size);
    }
    
    // Create dash trail
    dashTrail(x, y, width, height, angle, color = '#00ff88') {
        for (let i = 0; i < 5; i++) {
            this.particles.push(new Particle(
                x + Utils.random(-width/2, width/2),
                y + Utils.random(-height/2, height/2),
                {
                    size: Utils.random(5, 12),
                    color: color,
                    alpha: 0.6,
                    decay: 0.08,
                    shrink: 0.3
                }
            ));
        }
    }
    
    // Create power-up collect effect
    powerupCollect(x, y, color = '#00ffff') {
        const count = 20;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 5;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 6,
                color: color,
                decay: 0.03,
                shrink: 0.1
            }));
        }
        
        // Rising sparkles
        for (let i = 0; i < 10; i++) {
            this.particles.push(new Particle(
                x + Utils.random(-20, 20),
                y + Utils.random(-20, 20),
                {
                    vy: Utils.random(-3, -6),
                    size: Utils.random(3, 6),
                    color: color,
                    decay: 0.02,
                    shrink: 0.05
                }
            ));
        }
    }
    
    // Create death explosion
    deathExplosion(x, y, color = '#ff3366') {
        this.explosion(x, y, 1.5);
        
        // Extra colored particles
        for (let i = 0; i < 30; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(5, 15);
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.random(5, 12),
                color: color,
                decay: 0.02,
                shrink: 0.1
            }));
        }
    }
    
    // Create bullet wall hit
    wallHit(x, y, angle) {
        const count = 10;
        const colors = ['#aaaaaa', '#888888', '#666666'];
        
        for (let i = 0; i < count; i++) {
            const spread = Utils.random(-0.8, 0.8);
            const speed = Utils.random(2, 6);
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle + Math.PI + spread) * speed,
                vy: Math.sin(angle + Math.PI + spread) * speed,
                size: Utils.random(2, 5),
                color: Utils.randomPick(colors),
                decay: 0.05,
                gravity: 0.05
            }));
        }
    }
    
    // Screen shake
    shake(intensity) {
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
    }
    
    // Screen flash
    flash(color = 'rgba(255, 255, 255, 0.3)', intensity = 0.3) {
        this.flashEffects.push({ color, alpha: intensity });
    }
    
    // Damage vignette flash
    damageFlash() {
        const flashDiv = document.createElement('div');
        flashDiv.className = 'damage-flash';
        document.body.appendChild(flashDiv);
        setTimeout(() => flashDiv.remove(), 300);
    }
    
    // Clear all effects
    clear() {
        this.particles = [];
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.flashEffects = [];
    }
}

// Floating text for damage numbers, etc.
class FloatingText {
    constructor(x, y, text, options = {}) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = options.color || '#ffffff';
        this.size = options.size || 16;
        this.vy = options.vy || -2;
        this.alpha = 1;
        this.decay = options.decay || 0.02;
        this.alive = true;
    }
    
    update(dt) {
        this.y += this.vy * dt * 60;
        this.alpha -= this.decay * dt * 60;
        if (this.alpha <= 0) {
            this.alive = false;
        }
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// Global effects manager
const Effects = new EffectsManager();

// Floating texts array
const floatingTexts = [];

function addFloatingText(x, y, text, options = {}) {
    floatingTexts.push(new FloatingText(x, y, text, options));
}

function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update(dt);
        if (!floatingTexts[i].alive) {
            floatingTexts.splice(i, 1);
        }
    }
}

function drawFloatingTexts(ctx) {
    for (const text of floatingTexts) {
        text.draw(ctx);
    }
}
