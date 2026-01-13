// Upgrades System - Between rounds

const UPGRADES = {
    // Offensive upgrades
    damage_up: {
        name: 'Damage+',
        icon: '⚔️',
        description: '+25% weapon damage',
        category: 'offense',
        maxLevel: 4,
        effect: (player, level) => {
            player.weapon.damageMultiplier = 1 + (level * 0.25);
        }
    },
    fire_rate_up: {
        name: 'Fire Rate+',
        icon: '🔫',
        description: '+20% fire rate',
        category: 'offense',
        maxLevel: 4,
        effect: (player, level) => {
            player.weapon.fireRateMultiplier = 1 + (level * 0.2);
        }
    },
    bullet_speed: {
        name: 'Velocity+',
        icon: '💨',
        description: '+15% bullet speed',
        category: 'offense',
        maxLevel: 3,
        effect: (player, level) => {
            player.weapon.bulletSpeedMultiplier = 1 + (level * 0.15);
        }
    },
    accuracy: {
        name: 'Precision',
        icon: '🎯',
        description: '-30% weapon spread',
        category: 'offense',
        maxLevel: 3,
        effect: (player, level) => {
            player.weapon.spreadMultiplier = 1 - (level * 0.3);
        }
    },
    
    // Defensive upgrades
    health_up: {
        name: 'Vitality',
        icon: '❤️',
        description: '+25 max health',
        category: 'defense',
        maxLevel: 4,
        effect: (player, level) => {
            player.maxHealth = 100 + (level * 25);
            player.health = player.maxHealth;
        }
    },
    armor: {
        name: 'Armor',
        icon: '🛡️',
        description: '+10% damage reduction',
        category: 'defense',
        maxLevel: 4,
        effect: (player, level) => {
            player.damageReduction = level * 0.1;
        }
    },
    regen: {
        name: 'Regeneration',
        icon: '💚',
        description: '+3 HP per second',
        category: 'defense',
        maxLevel: 3,
        effect: (player, level) => {
            player.healthRegen = level * 3;
        }
    },
    
    // Mobility upgrades
    speed_up: {
        name: 'Swift',
        icon: '👟',
        description: '+15% movement speed',
        category: 'mobility',
        maxLevel: 4,
        effect: (player, level) => {
            player.speedMultiplier = 1 + (level * 0.15);
        }
    },
    dash_cooldown: {
        name: 'Quick Dash',
        icon: '💫',
        description: '-25% dash cooldown',
        category: 'mobility',
        maxLevel: 3,
        effect: (player, level) => {
            player.dashCooldown = 2000 * (1 - level * 0.25);
        }
    },
    dash_distance: {
        name: 'Long Dash',
        icon: '🌟',
        description: '+20% dash distance',
        category: 'mobility',
        maxLevel: 3,
        effect: (player, level) => {
            player.dashSpeed = 15 * (1 + level * 0.2);
        }
    },
    
    // Special upgrades
    special_cooldown: {
        name: 'Charged',
        icon: '⚡',
        description: '-20% special cooldown',
        category: 'special',
        maxLevel: 3,
        effect: (player, level) => {
            player.specialCooldown = 10000 * (1 - level * 0.2);
        }
    }
};

class UpgradeManager {
    constructor() {
        this.playerUpgrades = {};
        this.aiUpgrades = {};
        this.selectedUpgrade = null;
    }
    
    reset() {
        this.playerUpgrades = {};
        this.aiUpgrades = {};
        this.selectedUpgrade = null;
    }
    
    getUpgradeLevel(isAI, upgradeId) {
        const upgrades = isAI ? this.aiUpgrades : this.playerUpgrades;
        return upgrades[upgradeId] || 0;
    }
    
    canUpgrade(isAI, upgradeId) {
        const currentLevel = this.getUpgradeLevel(isAI, upgradeId);
        const upgrade = UPGRADES[upgradeId];
        return upgrade && currentLevel < upgrade.maxLevel;
    }
    
    applyUpgrade(player, upgradeId, isAI = false) {
        const upgrades = isAI ? this.aiUpgrades : this.playerUpgrades;
        
        if (!this.canUpgrade(isAI, upgradeId)) return false;
        
        upgrades[upgradeId] = (upgrades[upgradeId] || 0) + 1;
        
        // Apply the effect
        const upgrade = UPGRADES[upgradeId];
        upgrade.effect(player, upgrades[upgradeId]);
        
        Audio.play('upgrade');
        
        return true;
    }
    
    applyAllUpgrades(player, isAI = false) {
        const upgrades = isAI ? this.aiUpgrades : this.playerUpgrades;
        
        for (const [upgradeId, level] of Object.entries(upgrades)) {
            if (UPGRADES[upgradeId]) {
                UPGRADES[upgradeId].effect(player, level);
            }
        }
    }
    
    getRandomUpgrades(count = 3, isAI = false) {
        const availableUpgrades = Object.entries(UPGRADES)
            .filter(([id, upgrade]) => this.canUpgrade(isAI, id))
            .map(([id, upgrade]) => ({ id, ...upgrade }));
        
        // Shuffle and take count
        return Utils.shuffle(availableUpgrades).slice(0, count);
    }
    
    getAIUpgrade() {
        // AI picks a random upgrade with some intelligence
        const available = this.getRandomUpgrades(3, true);
        
        if (available.length === 0) return null;
        
        // Weighted selection based on category
        const weights = {
            offense: 0.4,
            defense: 0.3,
            mobility: 0.2,
            special: 0.1
        };
        
        // Apply weights
        const weighted = available.map(upgrade => ({
            ...upgrade,
            weight: weights[upgrade.category] || 0.25
        }));
        
        // Select based on weight
        const totalWeight = weighted.reduce((sum, u) => sum + u.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const upgrade of weighted) {
            random -= upgrade.weight;
            if (random <= 0) return upgrade;
        }
        
        return weighted[0];
    }
    
    renderUpgradeSelection(container, isAI = false) {
        const upgrades = this.getRandomUpgrades(3, isAI);
        container.innerHTML = '';
        
        if (upgrades.length === 0) {
            container.innerHTML = '<p style="color: #888;">All upgrades maxed!</p>';
            return;
        }
        
        upgrades.forEach(upgrade => {
            const currentLevel = this.getUpgradeLevel(isAI, upgrade.id);
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.dataset.upgradeId = upgrade.id;
            
            card.innerHTML = `
                <div class="upgrade-icon">${upgrade.icon}</div>
                <div class="upgrade-name">${upgrade.name}</div>
                <div class="upgrade-desc">${upgrade.description}</div>
                <div class="upgrade-level">Level ${currentLevel + 1}/${upgrade.maxLevel}</div>
            `;
            
            card.addEventListener('click', () => {
                // Remove selection from others
                container.querySelectorAll('.upgrade-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedUpgrade = upgrade.id;
            });
            
            container.appendChild(card);
        });
        
        // Auto-select first
        if (upgrades.length > 0) {
            container.querySelector('.upgrade-card').classList.add('selected');
            this.selectedUpgrade = upgrades[0].id;
        }
    }
    
    confirmSelection(player) {
        if (this.selectedUpgrade) {
            this.applyUpgrade(player, this.selectedUpgrade, false);
            this.selectedUpgrade = null;
            return true;
        }
        return false;
    }
}

// Global upgrade manager
const Upgrades = new UpgradeManager();
