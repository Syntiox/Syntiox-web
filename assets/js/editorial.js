// Syntiox Editorial Platform Script

document.addEventListener('DOMContentLoaded', () => {
  initConstellation();
  initModuleSwitcher();
  initDashboardTelemetry();
  initProductsFilter();
  initSupportForm();
  initMobileNav();
  setFooterYear();
});

// Particle Constellation Visual
function initConstellation() {
  const canvas = document.getElementById('constellation-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = canvas.parentElement.clientWidth);
  let height = (canvas.height = canvas.parentElement.clientHeight);

  const onResize = () => {
    if (!canvas.parentElement) return;
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;
  };
  window.addEventListener('resize', onResize);

  const dotCount = Math.max(22, Math.floor((width * height) / 10000));
  const dots = [];

  for (let i = 0; i < dotCount; i++) {
    dots.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: i === 0 ? 4.5 : Math.random() * 2.5 + 1.2,
      isCoralOrbit: i === 0,
      orbitRadius: 16
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x;
        const dy = dots[i].y - dots[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 105) {
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.strokeStyle = `rgba(23, 25, 24, ${0.22 * (1 - dist / 105)})`;
          ctx.lineWidth = 0.85;
          ctx.stroke();
        }
      }
    }

    dots.forEach((dot) => {
      dot.x += dot.vx;
      dot.y += dot.vy;

      if (dot.x < 10 || dot.x > width - 10) dot.vx *= -1;
      if (dot.y < 10 || dot.y > height - 10) dot.vy *= -1;

      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);

      if (dot.isCoralOrbit) {
        ctx.fillStyle = '#D98282';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.orbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(217, 130, 130, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = '#171918';
        ctx.fill();
      }
    });

    requestAnimationFrame(render);
  }

  render();
}

// Research & Applied AI Module Switcher (Home)
const MODULE_DATA = {
  linguistic: {
    name: 'Localized Language & Tokenization',
    role: 'NLP & Low-Resource LLM Research',
    description: 'Researching subword tokenization efficiency, semantic alignment, and localized language understanding for Sinhala and regional dialects alongside English.',
    specs: { focus: 'Indic / si-LK NLP', architecture: 'Custom BPE & LLMs', deployment: 'Ceylex AI' },
    logs: [
      { prefix: 'NLP-01', text: 'Loading bilingual vocabulary matrix (si-LK / en-US)' },
      { prefix: 'NLP-01', text: 'Optimizing subword token boundaries for agglutinative script' },
      { prefix: 'NLP-01', text: 'Semantic preservation verified across multi-turn context', type: 'success' },
      { prefix: 'NLP-01', text: 'Active inference endpoint: ceylex-ai.vercel.app', type: 'highlight' }
    ]
  },
  autonomous: {
    name: 'Autonomous Agent Workflows',
    role: 'Multi-Step Reasoning & Tool Execution',
    description: 'Engineering conversational agents and automated workflows capable of executing structured API calls, media processing, and real-time messaging tasks.',
    specs: { focus: 'Tool Orchestration', architecture: 'Event-Driven Agents', deployment: 'Syntiox AI / ATOM' },
    logs: [
      { prefix: 'AGT-02', text: 'Initializing conversational agent context & tool registry' },
      { prefix: 'AGT-02', text: 'Validating structured parameters before external dispatch' },
      { prefix: 'AGT-02', text: 'Zero-code automation pipeline connected', type: 'success' },
      { prefix: 'AGT-02', text: 'Active runtime: ai.syntiox.top & atom.syntiox.top', type: 'highlight' }
    ]
  },
  gateway: {
    name: 'Distributed API & Edge Infrastructure',
    role: 'High-Throughput Developer Gateway',
    description: 'Low-latency REST and WebSocket infrastructure with unified authentication, rate-limiting guards, and developer key management.',
    specs: { focus: 'API Telemetry', architecture: 'Edge Microservices', deployment: 'API Console' },
    logs: [
      { prefix: 'API-03', text: 'Authenticating bearer credentials via Syntiox SSO' },
      { prefix: 'API-03', text: 'Routing request through regional edge proxy' },
      { prefix: 'API-03', text: 'Rate-limit & schema validation passed', type: 'success' },
      { prefix: 'API-03', text: 'Active console: console.api.syntiox.top', type: 'highlight' }
    ]
  },
  security: {
    name: 'Cryptographic Session & Identity',
    role: 'Security & Real-Time State Sync',
    description: 'Isolated session pairing, encrypted WebSocket bridges, and unified Single Sign-On (SSO) identity across the Syntiox ecosystem.',
    specs: { focus: 'Zero-Trust Auth', architecture: 'WebSocket + SSO', deployment: 'Syntiox Sync' },
    logs: [
      { prefix: 'SEC-04', text: 'Establishing encrypted session bridge via pairing handshake' },
      { prefix: 'SEC-04', text: 'Verifying cross-domain SSO token integrity' },
      { prefix: 'SEC-04', text: 'Session state synchronized without credential exposure', type: 'success' },
      { prefix: 'SEC-04', text: 'Active bridge: syntiox-sync.vercel.app', type: 'highlight' }
    ]
  }
};

function initModuleSwitcher() {
  const rows = document.querySelectorAll('.agent-row-item');
  const panel = document.getElementById('agent-preview-panel');
  if (!rows.length || !panel) return;

  rows.forEach((row) => {
    row.addEventListener('click', () => {
      const key = row.getAttribute('data-agent');
      const data = MODULE_DATA[key];
      if (!data) return;

      rows.forEach((r) => r.classList.remove('is-selected'));
      row.classList.add('is-selected');

      const titleEl = panel.querySelector('.preview-agent-title');
      const roleEl = panel.querySelector('.preview-meta');
      const descEl = panel.querySelector('.preview-agent-desc');
      const spec1El = panel.querySelector('#spec-focus');
      const spec2El = panel.querySelector('#spec-arch');
      const spec3El = panel.querySelector('#spec-deploy');
      const termEl = panel.querySelector('.preview-terminal-window');

      if (titleEl) titleEl.textContent = data.name;
      if (roleEl) roleEl.textContent = `DOMAIN // ${data.role.toUpperCase()}`;
      if (descEl) descEl.textContent = data.description;
      if (spec1El) spec1El.textContent = data.specs.focus;
      if (spec2El) spec2El.textContent = data.specs.architecture;
      if (spec3El) spec3El.textContent = data.specs.deployment;

      if (termEl) {
        termEl.innerHTML = '';
        data.logs.forEach((log) => {
          const line = document.createElement('div');
          line.className = `terminal-line ${log.type || ''}`;
          line.innerHTML = `<span class="terminal-prefix">[${log.prefix}]</span> <span>${log.text}</span>`;
          termEl.appendChild(line);
        });
      }
    });
  });
}

// Matrix Animation
function initDashboardTelemetry() {
  const cells = document.querySelectorAll('.matrix-node-cell');
  if (!cells.length) return;

  setInterval(() => {
    const randomIndex = Math.floor(Math.random() * cells.length);
    cells[randomIndex].classList.toggle('active');
  }, 2200);
}

// Products Category Filter (/products)
function initProductsFilter() {
  const buttons = document.querySelectorAll('.editorial-filter-btn');
  const cards = document.querySelectorAll('.editorial-product-card');
  if (!buttons.length || !cards.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      buttons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      cards.forEach((card) => {
        const category = card.getAttribute('data-category') || '';
        if (filter === 'all' || category.includes(filter)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// Support Inquiry Form via Formspree (/support)
function initSupportForm() {
  const form = document.getElementById('support-inquiry-form');
  const submitBtn = document.getElementById('inq-submit-btn');
  const successBox = document.getElementById('inq-success-box');
  const errorText = document.getElementById('inq-error-text');

  if (!form || !submitBtn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.textContent = 'Dispatching Inquiry...';
    if (errorText) errorText.style.display = 'none';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (response.ok) {
        form.style.display = 'none';
        if (successBox) successBox.classList.add('is-visible');
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        if (errorText) errorText.style.display = 'inline';
      }
    } catch {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      if (errorText) errorText.style.display = 'inline';
    }
  });
}

// Mobile Navigation Toggle
function initMobileNav() {
  const hamburger = document.getElementById('nav-hamburger-btn');
  const panel = document.getElementById('mobile-nav-panel');
  if (!hamburger || !panel) return;

  hamburger.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.querySelectorAll('.mobile-nav-item').forEach((link) => {
    link.addEventListener('click', () => {
      panel.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

// Footer Dynamic Year
function setFooterYear() {
  const yearEls = document.querySelectorAll('.dynamic-year');
  const year = new Date().getFullYear();
  yearEls.forEach((el) => {
    el.textContent = year;
  });
}
