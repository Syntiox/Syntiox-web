// =====================================================
// SYNTIOX — Main Script (Premium Redesign)
// =====================================================

(function() {

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initNavbar();
    initMobileMenu();
    initScrollProgress();
    setFooterYear();
});

// ── Scroll Reveal ──────────────────────────────────
function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
    });

    elements.forEach(el => observer.observe(el));
}

// ── Navbar Scroll Behavior ─────────────────────────
function initNavbar() {
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Update active nav link based on section
        updateActiveNavLink();

        lastScroll = currentScroll;
    }, { passive: true });
}

function updateActiveNavLink() {
    const sections = ['hero', 'products', 'capabilities', 'about', 'community', 'contact'];
    const scrollPos = window.pageYOffset + 100;

    sections.forEach(id => {
        const section = document.getElementById(id);
        const link = document.querySelector(`.nav-link[href="#${id}"]`);

        if (!section || !link) return;

        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;

        if (scrollPos >= sectionTop && scrollPos < sectionBottom) {
            document.querySelectorAll('.nav-link').forEach(l => l.style.color = '');
            link.style.color = '#1d1d1f';
        }
    });
}

// ── Mobile Menu ────────────────────────────────────
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        mobileMenu.classList.toggle('open');
        document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
}

window.closeMobileMenu = closeMobileMenu;
function closeMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburger) hamburger.classList.remove('open');
    if (mobileMenu) mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
}

// Expose globally
window.closeMobileMenu = closeMobileMenu;

// ── Scroll Progress (subtle top bar) ──────────────
function initScrollProgress() {
    // Create progress bar
    const bar = document.createElement('div');
    bar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 2px;
        background: linear-gradient(to right, #0071e3, #6366f1);
        z-index: 9999;
        width: 0%;
        transition: width 0.1s linear;
        pointer-events: none;
    `;
    document.body.appendChild(bar);

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = `${Math.min(progress, 100)}%`;
    }, { passive: true });
}

// ── Footer Year ────────────────────────────────────
function setFooterYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
}

// (AI Chat logic removed - fully handled by ai-chat.js)

// ── Keyboard shortcut: ESC closes menus ──────────
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeMobileMenu();
        closeReportModal();
        closeConfirmModal();

        // Close chat
        const chatWindow = document.getElementById('chat-window');
        if (chatWindow && chatWindow.classList.contains('open')) {
            toggleChat();
        }
    }
});

// ── Smooth anchor clicks ──────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    });
});

})();
