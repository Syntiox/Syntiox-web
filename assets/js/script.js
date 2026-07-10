// =====================================================
// SYNTIOX — Main Script (Premium Redesign)
// =====================================================

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

// ── Chat Toggle ────────────────────────────────────
function toggleChat() {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;

    const isOpen = chatWindow.classList.contains('open');
    if (isOpen) {
        chatWindow.classList.remove('open');
        chatWindow.style.display = 'none';
    } else {
        chatWindow.classList.add('open');
        chatWindow.style.display = 'flex';
        // Focus input
        setTimeout(() => {
            const input = document.getElementById('chat-input');
            if (input) input.focus();
        }, 100);
    }
}
window.toggleChat = toggleChat;

// ── Chat Resize ────────────────────────────────────
(function initChatResize() {
    const chatWindow = document.getElementById('chat-window');
    const resizer = document.getElementById('resizer');
    const resizerLeft = document.getElementById('resizer-left');
    const resizerCorner = document.getElementById('resizer-corner');

    if (!chatWindow || !resizer) return;

    let isResizing = false;
    let startX, startY, startW, startH;
    let resizeMode = '';

    function startResize(e, mode) {
        isResizing = true;
        resizeMode = mode;
        startX = e.clientX;
        startY = e.clientY;
        startW = chatWindow.offsetWidth;
        startH = chatWindow.offsetHeight;
        document.body.style.userSelect = 'none';
        e.preventDefault();
    }

    resizer.addEventListener('mousedown', e => startResize(e, 'y'));
    if (resizerLeft) resizerLeft.addEventListener('mousedown', e => startResize(e, 'x'));
    if (resizerCorner) resizerCorner.addEventListener('mousedown', e => startResize(e, 'xy'));

    document.addEventListener('mousemove', e => {
        if (!isResizing) return;
        const dx = startX - e.clientX;
        const dy = startY - e.clientY;

        if (resizeMode === 'y' || resizeMode === 'xy') {
            const newH = Math.max(300, Math.min(startH + dy, window.innerHeight - 120));
            chatWindow.style.height = newH + 'px';
        }
        if (resizeMode === 'x' || resizeMode === 'xy') {
            const newW = Math.max(280, Math.min(startW + dx, 600));
            chatWindow.style.width = newW + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.userSelect = '';
    });
})();

// ── Clear Chat ────────────────────────────────────
function clearChat() {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) {
        confirmModal.classList.add('active');
    }
}

function closeConfirmModal() {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) {
        confirmModal.classList.remove('active');
    }
}

function executeClearChat() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="message bot-message">Hello! I'm Syntiox AI. How can I help you today? 😊</div>
            <div id="suggestions" class="suggestions-container">
                <button class="suggestion-btn" onclick="sendSuggestion('Who are you?')">Who are you?</button>
                <button class="suggestion-btn" onclick="sendSuggestion('Tell me about Syntiox')">Tell me about Syntiox</button>
                <button class="suggestion-btn" onclick="sendSuggestion('What can you do?')">What can you do?</button>
            </div>
        `;
    }
    closeConfirmModal();
    showToast('Chat cleared', 'success');
}

window.clearChat = clearChat;
window.closeConfirmModal = closeConfirmModal;
window.executeClearChat = executeClearChat;

// ── Report Modal ──────────────────────────────────
function openReportModal() {
    const modal = document.getElementById('report-modal');
    if (modal) modal.classList.add('active');
}

function closeReportModal() {
    const modal = document.getElementById('report-modal');
    if (modal) modal.classList.remove('active');
}

async function submitReport() {
    const text = document.getElementById('report-text')?.value?.trim();
    if (!text) {
        showToast('Please describe the issue first.', 'error');
        return;
    }
    closeReportModal();
    showToast('Report sent. Thank you!', 'success');
    if (document.getElementById('report-text')) {
        document.getElementById('report-text').value = '';
    }
}

window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.submitReport = submitReport;

// ── Toast Notifications ───────────────────────────
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toast-out 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.showToast = showToast;

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
