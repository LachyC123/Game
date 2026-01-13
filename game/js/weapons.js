// Weapons and Projectile System

// Weapon definitions
const WEAPONS = {
    pistol: {
        name: 'Pistol',
        damage: 20,
        fireRate: 300, // ms between shots
        bulletSpeed: 15,
        bulletSize: 4,
        spread: 0.05,
        recoil: 2,
        ammo: Infinity,
        magazineSize: Infinity,
        reloadTime: 0,
        automatic: false,
        color: '#ffff00',
        trailColor: '#ffaa00'
    },
    smg: {
        name: 'SMG',
        damage: 12,
        fireRate: 80,
        bulletSpeed: 14,
        bulletSize: 3,
        spread: 0.15,
        recoil: 1.5,
        ammo: 150,
        magazineSize: 30,
        reloadTime: 1500,
        automatic: true,
        color: '#00ffff',
        trailColor: '#0088ff'
    },
    shotgun: {
        name: 'Shotgun',
        damage: 8,
        fireRate: 800,
        bulletSpeed: 12,
        bulletSize: 3,
        spread: 0.3,
        pellets: 8,
        recoil: 8,
        ammo: 24,
        magazineSize: 6,
        reloadTime: 2000,
        automatic: false,
        color: '#ff6600',
        trailColor: '#ff3300'
    },
    rifle: {
        name: 'Rifle',
        damage: 35,
        fireRate: 500,
        bulletSpeed: 20,
        bulletSize: 4,
        spread: 0.02,
        recoil: 5,
        ammo: 60,
        magazineSize: 10,
        reloadTime: 2000,
        automatic: false,
        color: '#ff00ff',
        trailColor: '#aa00ff'
    },
    minigun: {
        name: 'Minigun',
        damage: 8,
        fireRate: 50,
        bulletSpeed: 16,
        bulletSize: 3,
        spread: 0.2,
        recoil: 0.5,
        ammo: 200,
        magazineSize: 100,
        reloadTime: 3000,
        automatic: true,
        spinUpTime: 500,
        color: '#ff0000',
        trailColor: '#aa0000'
    }
};

class Bullet {
    constructor(x, y, angle, owner, weapon) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.angle = angle;
        this.owner = owner; // 'player' or 'ai'
        this.weapon = weapon;
        
        // Apply spread
        const spreadAngle = angle + Utils.random(-weapon.spread, weapon.spread);
        this.vx = Math.cos(spreadAngle) * weapon.bulletSpeed;
        this.vy = Math.sin(spreadAngle) * weapon.bulletSpeed;
        
        this.damage = weapon.damage;
        this.size = weapon.bulletSize;
        this.color = weapon.color;
        this.trailColor = weapon.trailColor;
        this.alive = true;
        this.lifetime = 0;
        this.maxLifetime = 3000; // 3 seconds max
        
        // Trail positions
        this.trail = [];
        this.maxTrailLength = 8;
    }
    
    update(dt, obstacles) {
        this.lifetime += dt * 1000;
        if (this.lifetime > this.maxLifetime) {
            this.alive = false;
            return;
        }
        
        // Store previous position for collision detection
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Update trail
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }
        
        // Move bullet
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
        
        // Check obstacle collisions
        for (const obstacle of obstacles) {
            if (this.checkObstacleCollision(obstacle)) {
                this.alive = false;
                Effects.wallHit(this.x, this.y, this.angle);
                return;
            }
        }
    }
    
    checkObstacleCollision(obstacle) {
        // Line-rectangle intersection for fast bullets
        return Utils.circleRectCollision(
            this.x, this.y, this.size,
            obstacle.x, obstacle.y, obstacle.width, obstacle.height
        );
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        // Draw trail
        ctx.save();
        for (let i = 0; i < this.trail.length; i++) {
            const pos = this.trail[i];
            const alpha = 1 - (i / this.trail.length);
            const size = this.size * (1 - (i / this.trail.length) * 0.5);
            
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = this.trailColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        
        // Draw bullet
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    // Check collision with a target
    checkHit(target) {
        if (!this.alive) return false;
        
        const dist = Utils.distance(this.x, this.y, target.x, target.y);
        return dist < this.size + target.radius;
    }
}

class WeaponManager {
    constructor(owner) {
        this.owner = owner;
        this.currentWeapon = Utils.deepClone(WEAPONS.pistol);
        this.lastFireTime = 0;
        this.isReloading = false;
        this.reloadStartTime = 0;
        this.currentAmmo = this.currentWeapon.magazineSize;
        this.reserveAmmo = this.currentWeapon.ammo;
        this.spinUpProgress = 0;
        
        // Weapon modifiers from upgrades
        this.damageMultiplier = 1;
        this.fireRateMultiplier = 1;
        this.spreadMultiplier = 1;
        this.bulletSpeedMultiplier = 1;
    }
    
    canFire(currentTime) {
        if (this.isReloading) return false;
        if (this.currentAmmo <= 0 && this.currentWeapon.magazineSize !== Infinity) return false;
        
        const effectiveFireRate = this.currentWeapon.fireRate / this.fireRateMultiplier;
        return currentTime - this.lastFireTime >= effectiveFireRate;
    }
    
    fire(x, y, angle, currentTime, bullets) {
        if (!this.canFire(currentTime)) return false;
        
        this.lastFireTime = currentTime;
        
        // Handle minigun spin-up
        if (this.currentWeapon.spinUpTime) {
            // Spin-up logic would go here
        }
        
        // Create bullet(s)
        const pellets = this.currentWeapon.pellets || 1;
        const weaponConfig = {
            ...this.currentWeapon,
            damage: this.currentWeapon.damage * this.damageMultiplier,
            spread: this.currentWeapon.spread * this.spreadMultiplier,
            bulletSpeed: this.currentWeapon.bulletSpeed * this.bulletSpeedMultiplier
        };
        
        for (let i = 0; i < pellets; i++) {
            bullets.push(new Bullet(x, y, angle, this.owner, weaponConfig));
        }
        
        // Consume ammo
        if (this.currentWeapon.magazineSize !== Infinity) {
            this.currentAmmo--;
        }
        
        // Play sound and create muzzle flash
        Audio.play('shoot');
        Effects.muzzleFlash(
            x + Math.cos(angle) * 20,
            y + Math.sin(angle) * 20,
            angle,
            this.currentWeapon.color
        );
        
        return this.currentWeapon.recoil;
    }
    
    reload(currentTime) {
        if (this.isReloading) return;
        if (this.currentAmmo === this.currentWeapon.magazineSize) return;
        if (this.currentWeapon.magazineSize === Infinity) return;
        if (this.reserveAmmo <= 0) return;
        
        this.isReloading = true;
        this.reloadStartTime = currentTime;
        Audio.play('reload');
    }
    
    updateReload(currentTime) {
        if (!this.isReloading) return;
        
        if (currentTime - this.reloadStartTime >= this.currentWeapon.reloadTime) {
            const ammoNeeded = this.currentWeapon.magazineSize - this.currentAmmo;
            const ammoToLoad = Math.min(ammoNeeded, this.reserveAmmo);
            
            this.currentAmmo += ammoToLoad;
            this.reserveAmmo -= ammoToLoad;
            this.isReloading = false;
        }
    }
    
    getReloadProgress(currentTime) {
        if (!this.isReloading) return 1;
        return (currentTime - this.reloadStartTime) / this.currentWeapon.reloadTime;
    }
    
    setWeapon(weaponName) {
        if (WEAPONS[weaponName]) {
            this.currentWeapon = Utils.deepClone(WEAPONS[weaponName]);
            this.currentAmmo = this.currentWeapon.magazineSize;
            this.reserveAmmo = this.currentWeapon.ammo;
            this.isReloading = false;
        }
    }
    
    addAmmo(amount) {
        this.reserveAmmo = Math.min(this.reserveAmmo + amount, this.currentWeapon.ammo * 2);
    }
    
    getAmmoDisplay() {
        if (this.currentWeapon.magazineSize === Infinity) {
            return '∞';
        }
        return `${this.currentAmmo}/${this.reserveAmmo}`;
    }
    
    reset() {
        this.currentWeapon = Utils.deepClone(WEAPONS.pistol);
        this.currentAmmo = this.currentWeapon.magazineSize;
        this.reserveAmmo = this.currentWeapon.ammo;
        this.isReloading = false;
        this.damageMultiplier = 1;
        this.fireRateMultiplier = 1;
        this.spreadMultiplier = 1;
        this.bulletSpeedMultiplier = 1;
    }
}
