// Clever AI Opponent System

// AI difficulty settings
const AI_DIFFICULTY = {
    easy: {
        reactionTime: 500,    // ms before reacting
        aimAccuracy: 0.5,     // 0-1, affects aim wobble
        predictionSkill: 0.3, // How well it predicts player movement
        dodgeChance: 0.2,     // Chance to dodge bullets
        aggressiveness: 0.4,  // How often it pushes forward
        tacticalSkill: 0.3,   // How smart about cover usage
        shootingDelay: 300,   // Extra delay between shots
    },
    medium: {
        reactionTime: 300,
        aimAccuracy: 0.7,
        predictionSkill: 0.5,
        dodgeChance: 0.4,
        aggressiveness: 0.5,
        tacticalSkill: 0.5,
        shootingDelay: 150,
    },
    hard: {
        reactionTime: 150,
        aimAccuracy: 0.85,
        predictionSkill: 0.7,
        dodgeChance: 0.6,
        aggressiveness: 0.6,
        tacticalSkill: 0.7,
        shootingDelay: 50,
    },
    insane: {
        reactionTime: 50,
        aimAccuracy: 0.95,
        predictionSkill: 0.9,
        dodgeChance: 0.8,
        aggressiveness: 0.7,
        tacticalSkill: 0.9,
        shootingDelay: 0,
    }
};

// AI behavior states
const AI_STATE = {
    IDLE: 'idle',
    CHASE: 'chase',
    ATTACK: 'attack',
    RETREAT: 'retreat',
    FLANK: 'flank',
    TAKE_COVER: 'take_cover',
    DODGE: 'dodge',
    STRAFE: 'strafe'
};

class AIController {
    constructor(player, difficulty = 'medium') {
        this.player = player; // The AI-controlled player
        this.difficulty = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.medium;
        this.difficultyName = difficulty;
        
        // State machine
        this.state = AI_STATE.IDLE;
        this.stateTime = 0;
        this.lastStateChange = 0;
        
        // Targeting
        this.target = null;
        this.lastKnownTargetPos = { x: 0, y: 0 };
        this.aimOffset = { x: 0, y: 0 };
        this.aimUpdateTime = 0;
        
        // Behavior timers
        this.lastDecisionTime = 0;
        this.decisionInterval = 200; // ms between decisions
        this.lastShotTime = 0;
        this.reactionStartTime = 0;
        this.hasReacted = false;
        
        // Movement
        this.moveTarget = { x: 0, y: 0 };
        this.strafeDirection = 1;
        this.lastStrafeChange = 0;
        this.dodgeDirection = { x: 0, y: 0 };
        
        // Awareness
        this.incomingBullets = [];
        this.nearestCover = null;
        this.distanceToTarget = Infinity;
        
        // Personality variations
        this.personality = {
            preferredRange: Utils.random(150, 300),
            strafeFrequency: Utils.random(500, 1500),
            patience: Utils.random(0.3, 0.8)
        };
    }
    
    setDifficulty(difficulty) {
        this.difficulty = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.medium;
        this.difficultyName = difficulty;
    }
    
    update(dt, currentTime, target, obstacles, bullets, bounds) {
        if (!this.player.alive) return { moveX: 0, moveY: 0, shooting: false };
        
        this.target = target;
        this.stateTime += dt * 1000;
        
        // Update awareness
        this.updateAwareness(currentTime, obstacles, bullets);
        
        // Make decisions periodically
        if (currentTime - this.lastDecisionTime > this.decisionInterval) {
            this.makeDecision(currentTime, obstacles);
            this.lastDecisionTime = currentTime;
        }
        
        // Handle reaction time
        if (!this.hasReacted && target.alive) {
            if (this.reactionStartTime === 0) {
                this.reactionStartTime = currentTime;
            }
            if (currentTime - this.reactionStartTime < this.difficulty.reactionTime) {
                return { moveX: 0, moveY: 0, shooting: false };
            }
            this.hasReacted = true;
        }
        
        // Execute current state behavior
        const input = this.executeBehavior(dt, currentTime, obstacles, bounds);
        
        // Update aim with wobble and prediction
        this.updateAim(currentTime, target);
        
        // Return input for player controller
        return {
            moveX: input.moveX,
            moveY: input.moveY,
            aimX: this.lastKnownTargetPos.x + this.aimOffset.x,
            aimY: this.lastKnownTargetPos.y + this.aimOffset.y,
            shooting: input.shooting && this.canShoot(currentTime),
            dash: input.dash,
            special: input.special
        };
    }
    
    updateAwareness(currentTime, obstacles, bullets) {
        if (!this.target) return;
        
        // Update distance to target
        this.distanceToTarget = Utils.distance(
            this.player.x, this.player.y,
            this.target.x, this.target.y
        );
        
        // Track target position
        this.lastKnownTargetPos = { x: this.target.x, y: this.target.y };
        
        // Find incoming bullets
        this.incomingBullets = bullets.filter(bullet => {
            if (bullet.owner === 'ai' || !bullet.alive) return false;
            
            // Check if bullet is heading towards AI
            const toBullet = Utils.angle(this.player.x, this.player.y, bullet.x, bullet.y);
            const bulletDir = Math.atan2(bullet.vy, bullet.vx);
            const angleDiff = Math.abs(Utils.normalizeAngle(bulletDir - toBullet + Math.PI));
            
            // Also check distance
            const dist = Utils.distance(this.player.x, this.player.y, bullet.x, bullet.y);
            
            return angleDiff < 0.5 && dist < 300;
        });
        
        // Find nearest cover
        this.nearestCover = this.findNearestCover(obstacles);
    }
    
    findNearestCover(obstacles) {
        if (!this.target || obstacles.length === 0) return null;
        
        let bestCover = null;
        let bestScore = -Infinity;
        
        for (const obstacle of obstacles) {
            // Find the side of the obstacle away from the player
            const obsCenterX = obstacle.x + obstacle.width / 2;
            const obsCenterY = obstacle.y + obstacle.height / 2;
            
            // Calculate cover position behind obstacle
            const toTarget = Utils.angle(obsCenterX, obsCenterY, this.target.x, this.target.y);
            const coverX = obsCenterX - Math.cos(toTarget) * (obstacle.width / 2 + 30);
            const coverY = obsCenterY - Math.sin(toTarget) * (obstacle.height / 2 + 30);
            
            // Score based on distance and angle
            const distToAI = Utils.distance(this.player.x, this.player.y, coverX, coverY);
            const distToTarget = Utils.distance(coverX, coverY, this.target.x, this.target.y);
            
            // Prefer cover that's close to AI but maintains good distance to target
            const score = -distToAI + distToTarget * 0.5;
            
            if (score > bestScore && distToAI < 300) {
                bestScore = score;
                bestCover = { x: coverX, y: coverY, obstacle };
            }
        }
        
        return bestCover;
    }
    
    makeDecision(currentTime, obstacles) {
        if (!this.target || !this.target.alive) {
            this.changeState(AI_STATE.IDLE);
            return;
        }
        
        const healthPercent = this.player.health / this.player.maxHealth;
        const targetHealthPercent = this.target.health / this.target.maxHealth;
        
        // Dodge incoming bullets (high priority)
        if (this.incomingBullets.length > 0 && Math.random() < this.difficulty.dodgeChance) {
            this.changeState(AI_STATE.DODGE);
            this.calculateDodgeDirection();
            return;
        }
        
        // Retreat if low health
        if (healthPercent < 0.3 && this.nearestCover) {
            if (Math.random() < this.difficulty.tacticalSkill) {
                this.changeState(AI_STATE.TAKE_COVER);
                return;
            }
            this.changeState(AI_STATE.RETREAT);
            return;
        }
        
        // Attack if target is low health (aggressive)
        if (targetHealthPercent < 0.4 && healthPercent > 0.5) {
            if (Math.random() < this.difficulty.aggressiveness) {
                this.changeState(AI_STATE.CHASE);
                return;
            }
        }
        
        // Use special ability if available and good opportunity
        if (this.player.specialReady && this.distanceToTarget < 200) {
            if (Math.random() < this.difficulty.tacticalSkill) {
                // Will use special in execute behavior
            }
        }
        
        // Normal combat behavior
        const optimalRange = this.personality.preferredRange;
        
        if (this.distanceToTarget > optimalRange * 1.5) {
            // Too far, close the distance
            this.changeState(AI_STATE.CHASE);
        } else if (this.distanceToTarget < optimalRange * 0.5) {
            // Too close, create distance
            if (Math.random() < 0.5) {
                this.changeState(AI_STATE.STRAFE);
            } else {
                this.changeState(AI_STATE.RETREAT);
            }
        } else {
            // Good range, strafe and shoot
            if (Math.random() < 0.7) {
                this.changeState(AI_STATE.STRAFE);
            } else if (Math.random() < this.difficulty.tacticalSkill) {
                this.changeState(AI_STATE.FLANK);
            } else {
                this.changeState(AI_STATE.ATTACK);
            }
        }
        
        // Randomly change strafe direction
        if (currentTime - this.lastStrafeChange > this.personality.strafeFrequency) {
            this.strafeDirection *= -1;
            this.lastStrafeChange = currentTime;
        }
    }
    
    changeState(newState) {
        if (this.state !== newState) {
            this.state = newState;
            this.stateTime = 0;
            this.lastStateChange = Date.now();
        }
    }
    
    calculateDodgeDirection() {
        // Dodge perpendicular to incoming bullet
        if (this.incomingBullets.length > 0) {
            const bullet = this.incomingBullets[0];
            const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
            
            // Choose left or right perpendicular
            const perpAngle = bulletAngle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
            
            this.dodgeDirection = {
                x: Math.cos(perpAngle),
                y: Math.sin(perpAngle)
            };
        }
    }
    
    executeBehavior(dt, currentTime, obstacles, bounds) {
        let moveX = 0;
        let moveY = 0;
        let shooting = false;
        let dash = false;
        let special = false;
        
        switch (this.state) {
            case AI_STATE.IDLE:
                // Stay still, maybe look around
                break;
                
            case AI_STATE.CHASE:
                // Move towards target
                if (this.target) {
                    const angle = Utils.angle(this.player.x, this.player.y, this.target.x, this.target.y);
                    moveX = Math.cos(angle);
                    moveY = Math.sin(angle);
                    shooting = this.distanceToTarget < 400;
                }
                break;
                
            case AI_STATE.ATTACK:
                // Stand and shoot
                shooting = true;
                // Slight movement to avoid being easy target
                moveX = Math.sin(currentTime * 0.005) * 0.3;
                break;
                
            case AI_STATE.RETREAT:
                // Move away from target
                if (this.target) {
                    const angle = Utils.angle(this.target.x, this.target.y, this.player.x, this.player.y);
                    moveX = Math.cos(angle);
                    moveY = Math.sin(angle);
                    shooting = true; // Shoot while retreating
                    
                    // Consider dashing to escape
                    if (this.distanceToTarget < 100 && this.player.getDashCooldownProgress(currentTime) >= 1) {
                        dash = true;
                    }
                }
                break;
                
            case AI_STATE.FLANK:
                // Move around target
                if (this.target) {
                    const angle = Utils.angle(this.player.x, this.player.y, this.target.x, this.target.y);
                    const flankAngle = angle + (Math.PI / 2) * this.strafeDirection;
                    
                    // Mix forward movement with flanking
                    moveX = Math.cos(flankAngle) * 0.7 + Math.cos(angle) * 0.3;
                    moveY = Math.sin(flankAngle) * 0.7 + Math.sin(angle) * 0.3;
                    shooting = this.distanceToTarget < 350;
                }
                break;
                
            case AI_STATE.TAKE_COVER:
                // Move to cover position
                if (this.nearestCover) {
                    const angle = Utils.angle(this.player.x, this.player.y, this.nearestCover.x, this.nearestCover.y);
                    const dist = Utils.distance(this.player.x, this.player.y, this.nearestCover.x, this.nearestCover.y);
                    
                    if (dist > 20) {
                        moveX = Math.cos(angle);
                        moveY = Math.sin(angle);
                    }
                    shooting = true;
                }
                break;
                
            case AI_STATE.DODGE:
                // Quick dodge movement
                moveX = this.dodgeDirection.x;
                moveY = this.dodgeDirection.y;
                
                // Use dash if available
                if (this.player.getDashCooldownProgress(currentTime) >= 1) {
                    dash = true;
                }
                
                // Return to normal state after dodging
                if (this.stateTime > 300) {
                    this.changeState(AI_STATE.STRAFE);
                }
                break;
                
            case AI_STATE.STRAFE:
                // Strafe around target while shooting
                if (this.target) {
                    const angle = Utils.angle(this.player.x, this.player.y, this.target.x, this.target.y);
                    const strafeAngle = angle + (Math.PI / 2) * this.strafeDirection;
                    
                    // Maintain preferred distance
                    const distanceFactor = (this.distanceToTarget - this.personality.preferredRange) / 100;
                    
                    moveX = Math.cos(strafeAngle) * 0.8 + Math.cos(angle) * distanceFactor * 0.4;
                    moveY = Math.sin(strafeAngle) * 0.8 + Math.sin(angle) * distanceFactor * 0.4;
                    shooting = true;
                }
                break;
        }
        
        // Use special ability
        if (this.player.specialReady && this.distanceToTarget < 200 && Math.random() < 0.02) {
            special = true;
        }
        
        return { moveX, moveY, shooting, dash, special };
    }
    
    updateAim(currentTime, target) {
        if (!target) return;
        
        // Update aim offset (wobble) periodically
        if (currentTime - this.aimUpdateTime > 100) {
            this.aimUpdateTime = currentTime;
            
            // Base wobble inversely proportional to accuracy
            const wobbleAmount = (1 - this.difficulty.aimAccuracy) * 50;
            
            // Predict target movement
            if (this.difficulty.predictionSkill > 0) {
                const predictionTime = 0.2 * this.difficulty.predictionSkill;
                const predictedX = target.x + target.vx * predictionTime * 60;
                const predictedY = target.y + target.vy * predictionTime * 60;
                
                this.aimOffset.x = (predictedX - target.x) + Utils.random(-wobbleAmount, wobbleAmount);
                this.aimOffset.y = (predictedY - target.y) + Utils.random(-wobbleAmount, wobbleAmount);
            } else {
                this.aimOffset.x = Utils.random(-wobbleAmount, wobbleAmount);
                this.aimOffset.y = Utils.random(-wobbleAmount, wobbleAmount);
            }
        }
    }
    
    canShoot(currentTime) {
        // Additional shooting delay based on difficulty
        if (currentTime - this.lastShotTime < this.difficulty.shootingDelay) {
            return false;
        }
        
        if (this.player.weapon.canFire(currentTime)) {
            this.lastShotTime = currentTime;
            return true;
        }
        
        return false;
    }
    
    reset() {
        this.state = AI_STATE.IDLE;
        this.stateTime = 0;
        this.hasReacted = false;
        this.reactionStartTime = 0;
        this.incomingBullets = [];
    }
}
