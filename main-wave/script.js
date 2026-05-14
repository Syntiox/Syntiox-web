const canvas = document.getElementById('wave-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
const colors = ['#4285F4'];

let mouse = { x: 0, y: 0 };
let targetMouse = { x: 0, y: 0 };

window.addEventListener('mousemove', (e) => {
    targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});
window.addEventListener('touchmove', (e) => {
    targetMouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
}, {passive: true});

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles();
}

class Particle {
    constructor(ringIndex, maxRings, countInRing, indexInRing) {
        let radiusFraction = (ringIndex + 1) / maxRings;
        this.baseRadius = 40 + Math.pow(radiusFraction, 1.3) * (Math.max(width, height) * 0.8);
        
        this.angle = (indexInRing / countInRing) * Math.PI * 2;
        this.angle += (Math.random() - 0.5) * (Math.PI * 2 / countInRing) * 0.4;

        this.size = 1.2 + Math.random() * 1.5; 
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    draw(ctx, centerX, centerY, time, mx, my) {
        let rotTime = time * 0.00015;
        let currentAngle = this.angle + rotTime * (1 + 150 / (this.baseRadius + 50));

        let x0 = this.baseRadius * Math.cos(currentAngle);
        let y0 = this.baseRadius * Math.sin(currentAngle);
        let z0 = Math.sin(this.baseRadius * 0.015 - time * 0.002) * 25;

        let rotX = -0.9 + (my * 0.6); 
        let rotY = mx * 0.5;

        let x1 = x0;
        let y1 = y0 * Math.cos(rotX) - z0 * Math.sin(rotX);
        let z1 = y0 * Math.sin(rotX) + z0 * Math.cos(rotX);

        let x2 = x1 * Math.cos(rotY) - z1 * Math.sin(rotY);
        let y2 = y1;
        let z2 = x1 * Math.sin(rotY) + z1 * Math.cos(rotY);

        let fov = 1000;
        let pZ = fov + z2;
        if (pZ <= 0) return;
        let scale = fov / pZ;
        
        let px = centerX + x2 * scale;
        let py = centerY + y2 * scale;

        let tx0 = Math.cos(currentAngle);
        let ty0 = Math.sin(currentAngle);
        let tz0 = 0;

        let tx1 = tx0;
        let ty1 = ty0 * Math.cos(rotX) - tz0 * Math.sin(rotX);
        let tz1 = ty0 * Math.sin(rotX) + tz0 * Math.cos(rotX);

        let tx2 = tx1 * Math.cos(rotY) - tz1 * Math.sin(rotY);
        let ty2 = ty1;
        let tz2 = tx1 * Math.sin(rotY) + tz1 * Math.cos(rotY);

        let screenAngle = Math.atan2(ty2, tx2);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(screenAngle);
        ctx.scale(scale, scale);
        
        let s = this.size;
        
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-s * 2, -s * 0.6, s * 4, s * 1.2, s * 0.6);
        } else {
            ctx.rect(-s * 2, -s * 0.6, s * 4, s * 1.2);
        }
        
        ctx.fillStyle = this.color;
        
        let depthAlpha = Math.max(0.1, Math.min(1, 1 - (z2 / 800)));
        let centerFade = Math.min(1, this.baseRadius / 60); 
        let maxRad = Math.max(width, height) * 0.8;
        let edgeFade = Math.max(0, 1 - (this.baseRadius / maxRad));
        
        ctx.globalAlpha = Math.max(0.02, Math.min(1, depthAlpha * centerFade * edgeFade));
        ctx.fill();
        ctx.restore();
    }
}

function initParticles() {
    particles = [];
    let numRings = window.innerWidth < 768 ? 35 : 60;
    for (let r = 0; r < numRings; r++) {
        let countInRing = 12 + Math.floor(r * 5);
        for (let i = 0; i < countInRing; i++) {
            particles.push(new Particle(r, numRings, countInRing, i));
        }
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function render(time) {
    if (!time) time = 0;
    ctx.clearRect(0, 0, width, height);

    mouse.x += (targetMouse.x - mouse.x) * 0.08;
    mouse.y += (targetMouse.y - mouse.y) * 0.08;

    particles.forEach(p => {
        p.draw(ctx, width / 2, height / 2, time, mouse.x, mouse.y);
    });
    
    requestAnimationFrame(render);
}
requestAnimationFrame(render);
