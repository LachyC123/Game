// Player Class

class Player {
    constructor(x, y, isAI = false) {
        // Position and movement
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        
        // Stats
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.speed = 4;
        this.radius = 20;
        
        // State
        this.isAI = isAI;
        this.alive = true;
        this.invulnerable = false;
        this.invulnerableTime = 0;
        
        // Dash ability
        this.dashSpeed = 15;
        this.dashDuration = 150; // ms
        this.dashCooldown = 2000; // ms
        this.isDashing = false;
        this.dashStartTime = 0;
        this.lastDashTime = -this.dashCooldown;
        this.dashDirection = { x: 0, y: 0 };
        
        // Special ability
        this.specialCooldown = 10000; // 10 seconds
        this.lastSpecialTime = -this.specialCooldown;
        this.specialReady = true;
        
        // Weapon
        this.weapon = new WeaponManager(isAI ? 'ai' : 'player');
        
        // Visual
        this.color = isAI ? '#ff3366' : '#00ff88';
        this.secondaryColor = isAI ? '#ff6699' : '#66ffbb';
        
        // Animation
        this.bobOffset = 0;
        this.bobSpeed = 0.1;
        this.gunAngle = 0;
        this.recoilOffset = 0;
        
        // Upgrades/modifiers
        this.speedMultiplier = 1;
        this.damageReduction = 0;
        this.healthRegen = 0;
        this.lastRegenTime = 0;
    }
    
    update(dt, currentTime, input, obstacles, bounds) {
        if (!this.alive) return;
        
        // Handle dash
        if (this.isDashing) {
            this.updateDash(currentTime, obstacles, bounds);
        } else {
            this.updateMovement(dt, input, obstacles, bounds);
        }
        
        // Update aim angle
        if (input.aimX !== undefined && input.aimY !== undefined) {
            this.angle = Utils.angle(this.x, this.y, input.aimX, input.aimY);
        }
        
        // Handle shooting
        if (input.shooting) {
            this.shoot(currentTime);
        }
        
        // Handle reload
        this.weapon.updateReload(currentTime);
        
        // Health regeneration
        if (this.healthRegen > 0 && currentTime - this.lastRegenTime > 1000) {
            this.health = Math.min(this.maxHealth, this.health + this.healthRegen);
            this.lastRegenTime = currentTime;
        }
        
        // Update invulnerability
        if (this.invulnerable && currentTime > this.invulnerableTime) {
            this.invulnerable = false;
        }
        
        // Update special cooldown
        this.specialReady = currentTime - this.lastSpecialTime >= this.specialCooldown;
        
        // Update animation
        this.bobOffset += this.bobSpeed * dt * 60;
        this.recoilOffset *= 0.8;
        this.gunAngle = Utils.lerp(this.gunAngle, this.angle, 0.3);
    }
    
    updateMovement(dt, input, obstacles, bounds) {
        // Get movement input
        let moveX = input.moveX || 0;
        let moveY = input.moveY || 0;
        
        // Normalize diagonal movement
        const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
        if (magnitude > 1) {
            moveX /= magnitude;
            moveY /= magnitude;
        }
        
        // Apply movement
        const effectiveSpeed = this.speed * this.speedMultiplier;
        this.vx = moveX * effectiveSpeed;
        this.vy = moveY * effectiveSpeed;
        
        // Apply velocity
        let newX = this.x + this.vx * dt * 60;
        let newY = this.y + this.vy * dt * 60;
        
        // Check obstacle collisions
        for (const obstacle of obstacles) {
            const collision = this.resolveObstacleCollision(newX, newY, obstacle);
            newX = collision.x;
            newY = collision.y;
        }
        
        // Clamp to bounds
        newX = Utils.clamp(newX, bounds.left + this.radius, bounds.right - this.radius);
        newY = Utils.clamp(newY, bounds.top + this.radius, bounds.bottom - this.radius);
        
        this.x = newX;
        this.y = newY;
    }
    
    resolveObstacleCollision(newX, newY, obstacle) {
        // Check if colliding
        if (!Utils.circleRectCollision(
            newX, newY, this.radius,
            obstacle.x, obstacle.y, obstacle.width, obstacle.height
        )) {
            return { x: newX, y: newY };
        }
        
        // Find nearest point on rectangle
        const nearestX = Utils.clamp(newX, obstacle.x, obstacle.x + obstacle.width);
        const nearestY = Utils.clamp(newY, obstacle.y, obstacle.y + obstacle.height);
        
        // Push player out
        const dist = Utils.distance(newX, newY, nearestX, nearestY);
        if (dist > 0) {
            const overlap = this.radius - dist;
            const angle = Utils.angle(nearestX, nearestY, newX, newY);
            newX += Math.cos(angle) * overlap;
            newY += Math.sin(angle) * overlap;
        }
        
        return { x: newX, y: newY };
    }
    
    dash(currentTime, direction) {
        if (this.isDashing) return false;
        if (currentTime - this.lastDashTime < this.dashCooldown) return false;
        
        this.isDashing = true;
        this.dashStartTime = currentTime;
        this.lastDashTime = currentTime;
        this.dashDirection = Utils.normalize(direction.x, direction.y);
        
        // If no direction specified, dash in facing direction
        if (this.dashDirection.x === 0 && this.dashDirection.y === 0) {
            this.dashDirection = {
                x: Math.cos(this.angle),
                y: Math.sin(this.angle)
            };
        }
        
        Audio.play('dash');
        Utils.vibrate(50);
        
        return true;
    }
    
    updateDash(currentTime, obstacles, bounds) {
        const elapsed = currentTime - this.dashStartTime;
        
        if (elapsed >= this.dashDuration) {
            this.isDashing = false;
            return;
        }
        
        // Move in dash direction
        const progress = elapsed / this.dashDuration;
        const speedCurve = 1 - Utils.easeOutQuad(progress);
        const speed = this.dashSpeed * speedCurve;
        
        let newX = this.x + this.dashDirection.x * speed;
        let newY = this.y + this.dashDirection.y * speed;
        
        // Check obstacle collisions
        for (const obstacle of obstacles) {
            const collision = this.resolveObstacleCollision(newX, newY, obstacle);
            newX = collision.x;
            newY = collision.y;
        }
        
        // Clamp to bounds
        newX = Utils.clamp(newX, bounds.left + this.radius, bounds.right - this.radius);
        newY = Utils.clamp(newY, bounds.top + this.radius, bounds.bottom - this.radius);
        
        this.x = newX;
        this.y = newY;
        
        // Create dash trail
        Effects.dashTrail(this.x, this.y, this.radius * 2, this.radius * 2, this.angle, this.color);
    }
    
    getDashCooldownProgress(currentTime) {
        const elapsed = currentTime - this.lastDashTime;
        return Math.min(1, elapsed / this.dashCooldown);
    }
    
    shoot(currentTime) {
        const gunTipX = this.x + Math.cos(this.angle) * (this.radius + 15);
        const gunTipY = this.y + Math.sin(this.angle) * (this.radius + 15);
        
        const recoil = this.weapon.fire(gunTipX, gunTipY, this.angle, currentTime, window.gameBullets || []);
        
        if (recoil) {
            this.recoilOffset = recoil;
            Effects.shake(recoil * 0.5);
            
            // Track shots for accuracy
            if (!this.isAI) {
                window.gameStats.totalShots++;
            }
        }
    }
    
    useSpecial(currentTime, target) {
        if (!this.specialReady) return false;
        
        this.lastSpecialTime = currentTime;
        this.specialReady = false;
        
        // Special ability: Explosive shot
        const gunTipX = this.x + Math.cos(this.angle) * (this.radius + 15);
        const gunTipY = this.y + Math.sin(this.angle) * (this.radius + 15);
        
        // Create special bullet with extra damage and explosion
        const specialWeapon = {
            damage: 50,
            bulletSpeed: 12,
            bulletSize: 8,
            spread: 0,
            color: '#aa44ff',
            trailColor: '#ff00ff'
        };
        
        const bullet = new Bullet(gunTipX, gunTipY, this.angle, this.isAI ? 'ai' : 'player', specialWeapon);
        bullet.isSpecial = true;
        (window.gameBullets || []).push(bullet);
        
        Audio.play('explosion');
        Effects.muzzleFlash(gunTipX, gunTipY, this.angle, '#aa44ff');
        Effects.shake(10);
        Utils.vibrate(100);
        
        return true;
    }
    
    getSpecialCooldownProgress(currentTime) {
        const elapsed = currentTime - this.lastSpecialTime;
        return Math.min(1, elapsed / this.specialCooldown);
    }
    
    takeDamage(amount, currentTime) {
        if (!this.alive || this.invulnerable) return 0;
        
        // Apply damage reduction
        const actualDamage = amount * (1 - this.damageReduction);
        this.health -= actualDamage;
        
        // Visual feedback
        Effects.damageParticles(this.x, this.y, 8, this.color);
        
        if (!this.isAI) {
            Effects.damageFlash();
            Utils.vibrate([50, 30, 50]);
        }
        
        Audio.play('hit');
        
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
        
        return actualDamage;
    }
    
    die() {
        this.alive = false;
        Effects.deathExplosion(this.x, this.y, this.color);
        Audio.play('explosion');
        Effects.shake(20);
        Utils.vibrate([100, 50, 100, 50, 100]);
    }
    
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.health = this.maxHealth;
        this.alive = true;
        this.isDashing = false;
        this.lastDashTime = -this.dashCooldown;
        this.lastSpecialTime = -this.specialCooldown;
        this.specialReady = true;
        this.invulnerable = false;
        this.weapon.reset();
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Invulnerability flash
        if (this.invulnerable) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
        }
        
        // Body glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 1.5);
        gradient.addColorStop(0, this.color + '40');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Body
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.secondaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner circle
        ctx.fillStyle = this.secondaryColor;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Direction indicator
        ctx.rotate(this.gunAngle);
        
        // Gun
        ctx.fillStyle = '#333';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.fillRect(this.radius - 5 - this.recoilOffset, -6, 25, 12);
        ctx.strokeRect(this.radius - 5 - this.recoilOffset, -6, 25, 12);
        
        // Gun barrel
        ctx.fillStyle = '#222';
        ctx.fillRect(this.radius + 15 - this.recoilOffset, -4, 10, 8);
        
        ctx.restore();
        
        // Health bar (only for AI, player health is in HUD)
        if (this.isAI) {
            this.drawHealthBar(ctx);
        }
        
        // Low health indicator
        if (this.health <= this.maxHealth * 0.3 && !this.isAI) {
            this.drawLowHealthIndicator(ctx);
        }
    }
    
    drawHealthBar(ctx) {
        const barWidth = 40;
        const barHeight = 6;
        const x = this.x - barWidth / 2;
        const y = this.y - this.radius - 15;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffaa00' : '#ff3366';
        ctx.fillStyle = healthColor;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }
    
    drawLowHealthIndicator(ctx) {
        // Pulse effect
        const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        
        ctx.save();
        ctx.strokeStyle = `rgba(255, 50, 50, ${pulse * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 5 + pulse * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
