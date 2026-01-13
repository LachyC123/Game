// Power-up System

const POWERUP_TYPES = {
    health: {
        name: 'Health Pack',
        icon: '❤️',
        color: '#ff4444',
        duration: 0,
        effect: (player) => {
            player.heal(50);
            addFloatingText(player.x, player.y - 30, '+50 HP', { color: '#ff4444', size: 20 });
        }
    },
    shield: {
        name: 'Shield',
        icon: '🛡️',
        color: '#4488ff',
        duration: 5000,
        effect: (player) => {
            player.invulnerable = true;
            player.invulnerableTime = Date.now() + 5000;
            addFloatingText(player.x, player.y - 30, 'SHIELD!', { color: '#4488ff', size: 20 });
        }
    },
    speed: {
        name: 'Speed Boost',
        icon: '⚡',
        color: '#ffff00',
        duration: 8000,
        effect: (player) => {
            const originalSpeed = player.speedMultiplier;
            player.speedMultiplier = 1.5;
            addFloatingText(player.x, player.y - 30, 'SPEED!', { color: '#ffff00', size: 20 });
            
            setTimeout(() => {
                player.speedMultiplier = originalSpeed;
            }, 8000);
        }
    },
    damage: {
        name: 'Damage Boost',
        icon: '💥',
        color: '#ff6600',
        duration: 10000,
        effect: (player) => {
            const originalDamage = player.weapon.damageMultiplier;
            player.weapon.damageMultiplier = 2;
            addFloatingText(player.x, player.y - 30, '2X DAMAGE!', { color: '#ff6600', size: 20 });
            
            setTimeout(() => {
                player.weapon.damageMultiplier = originalDamage;
            }, 10000);
        }
    },
    rapidFire: {
        name: 'Rapid Fire',
        icon: '🔥',
        color: '#ff0088',
        duration: 8000,
        effect: (player) => {
            const originalFireRate = player.weapon.fireRateMultiplier;
            player.weapon.fireRateMultiplier = 2;
            addFloatingText(player.x, player.y - 30, 'RAPID FIRE!', { color: '#ff0088', size: 20 });
            
            setTimeout(() => {
                player.weapon.fireRateMultiplier = originalFireRate;
            }, 8000);
        }
    }
};

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = POWERUP_TYPES[type];
        this.radius = 18;
        this.alive = true;
        this.spawnTime = Date.now();
        this.lifetime = 15000; // 15 seconds before despawn
        
        // Animation
        this.bobOffset = Math.random() * Math.PI * 2;
        this.rotation = 0;
        this.pulseScale = 1;
    }
    
    update(dt) {
        // Bobbing animation
        this.bobOffset += dt * 3;
        this.rotation += dt * 2;
        this.pulseScale = 1 + Math.sin(this.bobOffset) * 0.1;
        
        // Check lifetime
        if (Date.now() - this.spawnTime > this.lifetime) {
            this.alive = false;
        }
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        const bobY = Math.sin(this.bobOffset) * 5;
        
        ctx.save();
        ctx.translate(this.x, this.y + bobY);
        ctx.scale(this.pulseScale, this.pulseScale);
        
        // Glow effect
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
        gradient.addColorStop(0, this.config.color + '60');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer ring
        ctx.strokeStyle = this.config.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner fill
        ctx.fillStyle = this.config.color + '40';
        ctx.fill();
        
        // Icon
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.icon, 0, 0);
        
        // Timer indicator (when about to despawn)
        const timeLeft = this.lifetime - (Date.now() - this.spawnTime);
        if (timeLeft < 5000) {
            const alpha = (Math.sin(Date.now() * 0.01) + 1) / 2;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    collect(player) {
        if (!this.alive) return false;
        
        const dist = Utils.distance(this.x, this.y, player.x, player.y);
        if (dist < this.radius + player.radius) {
            this.alive = false;
            this.config.effect(player);
            
            Audio.play('pickup');
            Effects.powerupCollect(this.x, this.y, this.config.color);
            
            return true;
        }
        
        return false;
    }
}

class PowerUpManager {
    constructor() {
        this.powerups = [];
        this.spawnInterval = 10000; // 10 seconds
        this.lastSpawnTime = 0;
        this.maxPowerups = 3;
        this.spawnPoints = [];
    }
    
    setSpawnPoints(points) {
        this.spawnPoints = points;
    }
    
    update(dt, currentTime, player, ai) {
        // Update existing powerups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            this.powerups[i].update(dt);
            
            // Check collection
            if (player && player.alive) {
                this.powerups[i].collect(player);
            }
            if (ai && ai.alive) {
                this.powerups[i].collect(ai);
            }
            
            // Remove dead powerups
            if (!this.powerups[i].alive) {
                this.powerups.splice(i, 1);
            }
        }
        
        // Spawn new powerups
        if (currentTime - this.lastSpawnTime > this.spawnInterval && 
            this.powerups.length < this.maxPowerups) {
            this.spawn();
            this.lastSpawnTime = currentTime;
        }
    }
    
    spawn() {
        if (this.spawnPoints.length === 0) return;
        
        // Pick random spawn point
        const point = Utils.randomPick(this.spawnPoints);
        
        // Pick random powerup type (weighted towards useful ones)
        const types = Object.keys(POWERUP_TYPES);
        const weights = [3, 1, 2, 2, 2]; // health more common
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        let selectedType = types[0];
        for (let i = 0; i < types.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                selectedType = types[i];
                break;
            }
        }
        
        this.powerups.push(new PowerUp(point.x, point.y, selectedType));
    }
    
    draw(ctx) {
        for (const powerup of this.powerups) {
            powerup.draw(ctx);
        }
    }
    
    reset() {
        this.powerups = [];
        this.lastSpawnTime = 0;
    }
}

// Global powerup manager
const PowerUps = new PowerUpManager();
