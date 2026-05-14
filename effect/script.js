const canvas = document.getElementById('wave-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
const colors = ['#4285F4']; // Google Blue

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

const equations = [
    'f(x) = σ(Wx + b)',
    'E = ½∑(t-y)²',
    '∇L',
    'σ(z) = 1/(1+e⁻ᶻ)',
    'W = W - η∇J(W)',
    'a = ReLU(z)',
    'z = Wx + b',
    'Softmax(zᵢ)',
    '∂E/∂wᵢⱼ',
    'tanh(x)',
    'L = -∑ y(log p)',
    'H(p,q) = -∑ p(x)log q(x)',
    // Transformers / Attention
    'Attention(Q,K,V) = softmax(QKᵀ/√dₖ)V',
    'PE₍ₚₒₛ,₂ᵢ₎ = sin(pos/10000²ⁱ/ᵈ)',
    // Reinforcement Learning
    'Q(s,a) = r + γ max Q(s\',a\')',
    'V*(s) = max_a E[R + γV*(s\')]',
    // Generative Adversarial Networks (GANs)
    'min_G max_D V(D,G)',
    // Probabilistic / Bayesian
    'P(A|B) = P(B|A)P(A)/P(B)',
    'KL(P||Q) = ∑ P(x)log(P(x)/Q(x))',
    // Support Vector Machines (SVM)
    'yᵢ(w·xᵢ + b) ≥ 1 - ζᵢ',
    // Recurrent Neural Networks (RNN / LSTM)
    'hₜ = tanh(Wₕₕhₜ₋₁ + Wₓₕxₜ)',
    'cₜ = fₜ⊙cₜ₋₁ + iₜ⊙čₜ',
    // Diffusion Models
    'xₜ₋₁ = µ_θ(xₜ,t) + Σ_θ(xₜ,t)z'
];

class Particle {
    constructor() {
        // Randomly distribute on a disk
        let r = Math.sqrt(Math.random()) * (Math.max(width, height) * 0.8);
        this.baseRadius = r + 10;
        this.angle = Math.random() * Math.PI * 2;

        this.size = 1.5 + Math.random() * 2; 
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        this.speedVariability = 0.8 + Math.random() * 0.4;

        this.isEquation = Math.random() < 0.15; // 15% of particles are equations
        if (this.isEquation) {
            this.equationText = equations[Math.floor(Math.random() * equations.length)];
        }
    }

    update(time, mx, my, centerX, centerY) {
        let rotTime = time * 0.00015;
        let currentAngle = this.angle + rotTime * (1 + 80 / (this.baseRadius + 30)) * this.speedVariability;

        let x0 = this.baseRadius * Math.cos(currentAngle);
        let y0 = this.baseRadius * Math.sin(currentAngle);
        
        // Complex sea wave effect using sine waves on radius and angle
        let wave1 = Math.sin(this.baseRadius * 0.015 - time * 0.002);
        let wave2 = Math.sin(currentAngle * 4 + time * 0.001);
        let z0 = (wave1 + wave2) * 45;

        // Apply mouse rotations
        let rotX = -0.8 + (my * 0.5); 
        let rotY = mx * 0.7;

        let x1 = x0;
        let y1 = y0 * Math.cos(rotX) - z0 * Math.sin(rotX);
        let z1 = y0 * Math.sin(rotX) + z0 * Math.cos(rotX);

        this.x3D = x1 * Math.cos(rotY) - z1 * Math.sin(rotY);
        this.y3D = y1;
        this.z3D = x1 * Math.sin(rotY) + z1 * Math.cos(rotY);

        let fov = 1000;
        let pZ = fov + this.z3D;
        
        if (pZ > 0) {
            this.visible = true;
            this.scale = fov / pZ;
            this.px = centerX + this.x3D * this.scale;
            this.py = centerY + this.y3D * this.scale;
        } else {
            this.visible = false;
        }
    }

    draw(ctx) {
        if (!this.visible) return;
        
        let s = this.size * this.scale; // Scale particle by depth
        
        ctx.beginPath();
        ctx.arc(this.px, this.py, s, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        
        let depthAlpha = Math.max(0.1, Math.min(1, 1 - (this.z3D / 800)));
        let centerFade = Math.min(1, this.baseRadius / 40); 
        let maxRad = Math.max(width, height) * 0.8;
        let edgeFade = Math.max(0, 1 - (this.baseRadius / maxRad));
        
        ctx.globalAlpha = Math.max(0.02, Math.min(1, depthAlpha * centerFade * edgeFade));
        ctx.fill();

        if (this.isEquation) {
            ctx.font = `${Math.max(10, 14 * this.scale)}px "Roboto Mono", "Consolas", monospace`;
            
            // Draw equation text cleanly
            ctx.globalAlpha = Math.max(0.02, Math.min(1, depthAlpha * centerFade * edgeFade * 0.7));
            ctx.fillStyle = '#8AB4F8'; // Light google blue for text
            ctx.fillText(this.equationText, this.px + s + 6, this.py + s);
        }
    }
}

function initParticles() {
    particles = [];
    let numParticles = window.innerWidth < 768 ? 250 : 600;
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawLines(ctx) {
    // calculate a responsive connection distance limit
    let maxBaseDimension = Math.max(width, height);
    let connectDistance = window.innerWidth < 768 ? maxBaseDimension * 0.22 : maxBaseDimension * 0.14;
    let sqDist = connectDistance * connectDistance;
    
    ctx.lineWidth = 1.2;

    // Optimization: avoid slow canvas context changes by batching roughly by opacity
    let opacityBuckets = Array.from({length: 10}, () => []);

    for (let i = 0; i < particles.length; i++) {
        let p1 = particles[i];
        if (!p1.visible) continue;
        
        let connectionsCount = 0;
        
        for (let j = i + 1; j < particles.length; j++) {
            let p2 = particles[j];
            if (!p2.visible) continue;
            
            // Cheap short-circuits (2D screen space roughly maps to distance)
            if (Math.abs(p1.px - p2.px) > connectDistance * 2) continue;
            if (Math.abs(p1.py - p2.py) > connectDistance * 2) continue;

            let dx = p1.x3D - p2.x3D;
            let dy = p1.y3D - p2.y3D;
            let dz = p1.z3D - p2.z3D;
            let distSq = dx*dx + dy*dy + dz*dz;
            
            if (distSq < sqDist) {
                // fade based on distance
                let ratio = 1 - (Math.sqrt(distSq) / connectDistance);
                
                // base alpha based on depth
                let avgZ = (p1.z3D + p2.z3D) / 2;
                let depthAlpha = Math.max(0, Math.min(1, 1 - (avgZ / 800)));
                
                // fade out near center and edges to match particles
                let avgRadius = (p1.baseRadius + p2.baseRadius) / 2;
                let centerFade = Math.min(1, avgRadius / 40);
                let maxRad = maxBaseDimension * 0.8;
                let edgeFade = Math.max(0, 1 - (avgRadius / maxRad));
                
                let targetAlpha = Math.max(0.02, ratio * 0.8 * depthAlpha * centerFade * edgeFade);
                
                // Map alpha from 0 to 1 into 10 buckets
                let bucketIdx = Math.min(9, Math.floor(targetAlpha * 10));
                opacityBuckets[bucketIdx].push({x1: p1.px, y1: p1.py, x2: p2.px, y2: p2.py});
                
                connectionsCount++;
                if (connectionsCount > 8) break; // Optimization: max connections per node
            }
        }
    }

    ctx.strokeStyle = '#4285F4';
    opacityBuckets.forEach((bucket, i) => {
        if (bucket.length === 0) return;
        ctx.globalAlpha = i / 10 + 0.05;
        ctx.beginPath();
        for (let line of bucket) {
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
        }
        ctx.stroke();
    });
}

function render(time) {
    if (!time) time = 0;

    // Use a slight trailing effect but keep text readable
    ctx.fillStyle = 'rgba(5, 5, 5, 0.7)'; 
    ctx.fillRect(0, 0, width, height);

    mouse.x += (targetMouse.x - mouse.x) * 0.08;
    mouse.y += (targetMouse.y - mouse.y) * 0.08;

    let centerX = width / 2;
    let centerY = height / 2;

    // First update all 3D positions
    particles.forEach(p => p.update(time, mouse.x, mouse.y, centerX, centerY));
    
    // Draw connections
    drawLines(ctx);

    // Draw individual nodes on top
    particles.forEach(p => p.draw(ctx));
    
    requestAnimationFrame(render);
}

requestAnimationFrame(render);
