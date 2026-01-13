// Utility functions for the game

const Utils = {
    // Random number between min and max
    random: (min, max) => Math.random() * (max - min) + min,
    
    // Random integer between min and max (inclusive)
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    // Clamp value between min and max
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    
    // Linear interpolation
    lerp: (a, b, t) => a + (b - a) * t,
    
    // Distance between two points
    distance: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
    
    // Angle between two points (in radians)
    angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    
    // Normalize an angle to be between -PI and PI
    normalizeAngle: (angle) => {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    },
    
    // Convert degrees to radians
    degToRad: (deg) => deg * (Math.PI / 180),
    
    // Convert radians to degrees
    radToDeg: (rad) => rad * (180 / Math.PI),
    
    // Check if two circles collide
    circleCollision: (x1, y1, r1, x2, y2, r2) => {
        return Utils.distance(x1, y1, x2, y2) < r1 + r2;
    },
    
    // Check if a point is inside a circle
    pointInCircle: (px, py, cx, cy, r) => {
        return Utils.distance(px, py, cx, cy) < r;
    },
    
    // Check if a point is inside a rectangle
    pointInRect: (px, py, rx, ry, rw, rh) => {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },
    
    // Check if two rectangles collide
    rectCollision: (r1, r2) => {
        return r1.x < r2.x + r2.width &&
               r1.x + r1.width > r2.x &&
               r1.y < r2.y + r2.height &&
               r1.y + r1.height > r2.y;
    },
    
    // Check circle vs rectangle collision
    circleRectCollision: (cx, cy, cr, rx, ry, rw, rh) => {
        const nearestX = Utils.clamp(cx, rx, rx + rw);
        const nearestY = Utils.clamp(cy, ry, ry + rh);
        return Utils.distance(cx, cy, nearestX, nearestY) < cr;
    },
    
    // Normalize a vector
    normalize: (x, y) => {
        const len = Math.sqrt(x * x + y * y);
        if (len === 0) return { x: 0, y: 0 };
        return { x: x / len, y: y / len };
    },
    
    // Get vector from angle
    vectorFromAngle: (angle, magnitude = 1) => {
        return {
            x: Math.cos(angle) * magnitude,
            y: Math.sin(angle) * magnitude
        };
    },
    
    // Rotate a point around origin
    rotatePoint: (x, y, angle) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: x * cos - y * sin,
            y: x * sin + y * cos
        };
    },
    
    // Ease functions
    easeOutQuad: (t) => t * (2 - t),
    easeInQuad: (t) => t * t,
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOutElastic: (t) => {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    },
    
    // Format time as MM:SS
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Shuffle an array
    shuffle: (array) => {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },
    
    // Pick random element from array
    randomPick: (array) => array[Math.floor(Math.random() * array.length)],
    
    // Create a color with alpha
    rgba: (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${a})`,
    
    // Parse hex color to RGB
    hexToRgb: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    // Vibrate device (if supported)
    vibrate: (pattern) => {
        if (navigator.vibrate && window.gameSettings?.vibration) {
            navigator.vibrate(pattern);
        }
    },
    
    // Check if device is mobile
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.matchMedia && window.matchMedia('(max-width: 1024px)').matches && 'ontouchstart' in window);
    },
    
    // Deep clone an object
    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
    
    // Save to localStorage
    save: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    },
    
    // Load from localStorage
    load: (key, defaultValue = null) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
            return defaultValue;
        }
    }
};

// Game settings (global)
window.gameSettings = Utils.load('arenaRivals_settings', {
    sfx: true,
    music: true,
    vibration: true,
    showFps: false
});

// Game stats (global)
window.gameStats = Utils.load('arenaRivals_stats', {
    wins: 0,
    losses: 0,
    bestStreak: 0,
    currentStreak: 0,
    totalDamage: 0,
    totalShots: 0,
    totalHits: 0
});

// Save settings
function saveSettings() {
    Utils.save('arenaRivals_settings', window.gameSettings);
}

// Save stats
function saveStats() {
    Utils.save('arenaRivals_stats', window.gameStats);
}
