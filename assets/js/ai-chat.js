const chatWindow = document.getElementById("chat-window");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const resizer = document.getElementById("resizer");
// 1️⃣ API URL එක මෙතන (ඔයාගේ python කෝඩ් එකේ තිබ්බ එක)
const API_URL = "/api/chat";
let chatHistory = [];
let abortController = null;
// ----- Resizer Logic (Height + Width, Mouse + Touch) -----
const resizerLeft = document.getElementById("resizer-left");
let isResizing = false;
let isResizingWidth = false;
let startY, startX, startHeight, startWidth, startRight;

// --- Height Resizer (top edge) ---
function startHeightResize(clientY) {
  isResizing = true;
  startY = clientY;
  startHeight = parseInt(document.defaultView.getComputedStyle(chatWindow).height, 10);
}
resizer.addEventListener("mousedown", (e) => {
  startHeightResize(e.clientY);
  e.preventDefault();
});
resizer.addEventListener("touchstart", (e) => {
  startHeightResize(e.touches[0].clientY);
  e.preventDefault();
}, { passive: false });

// --- Width Resizer (left edge) ---
function startWidthResize(clientX) {
  isResizingWidth = true;
  startX = clientX;
  startWidth = parseInt(document.defaultView.getComputedStyle(chatWindow).width, 10);
}
if (resizerLeft) {
  resizerLeft.addEventListener("mousedown", (e) => {
    startWidthResize(e.clientX);
    e.preventDefault();
  });
  resizerLeft.addEventListener("touchstart", (e) => {
    startWidthResize(e.touches[0].clientX);
    e.preventDefault();
  }, { passive: false });
}

// --- Corner Resizer (bottom-right, resizes both height & width) ---
const resizerCorner = document.getElementById("resizer-corner");
let isResizingCorner = false;

function startCornerResize(clientX, clientY) {
  isResizingCorner = true;
  startX = clientX;
  startY = clientY;
  startHeight = parseInt(document.defaultView.getComputedStyle(chatWindow).height, 10);
  startWidth = parseInt(document.defaultView.getComputedStyle(chatWindow).width, 10);
  startRight = parseInt(document.defaultView.getComputedStyle(chatWindow).right, 10) || 30;
}
if (resizerCorner) {
  resizerCorner.addEventListener("mousedown", (e) => {
    startCornerResize(e.clientX, e.clientY);
    e.preventDefault();
  });
  resizerCorner.addEventListener("touchstart", (e) => {
    startCornerResize(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });
}

// --- Move Handlers ---
function onMove(clientX, clientY) {
  if (isResizing) {
    const diff = startY - clientY;
    const newHeight = startHeight + diff;
    const minH = window.innerWidth <= 768 ? 250 : 400;
    const maxH = window.innerHeight * 0.9;
    if (newHeight >= minH && newHeight <= maxH) {
      chatWindow.style.height = newHeight + "px";
    }
  }
  if (isResizingWidth) {
    const diff = clientX - startX;
    const newWidth = startWidth + diff;
    const minW = 260;
    const maxW = window.innerWidth * 0.95;
    if (newWidth >= minW && newWidth <= maxW) {
      chatWindow.style.width = newWidth + "px";
    }
  }
  if (isResizingCorner) {
    // Height: drag UP = taller (startY - clientY)
    const hDiff = startY - clientY;
    const newHeight = startHeight + hDiff;
    const minH = window.innerWidth <= 768 ? 250 : 400;
    const maxH = window.innerHeight * 0.9;
    if (newHeight >= minH && newHeight <= maxH) {
      chatWindow.style.height = newHeight + "px";
    }
    // Width: drag RIGHT → right edge moves right, left edge stays fixed
    // Achieved by: decreasing 'right' + increasing 'width' by same amount
    const wDiff = clientX - startX;
    const newRight = startRight - wDiff;
    const newWidth = startWidth + wDiff;
    const minW = 260;
    const maxW = window.innerWidth * 0.95;
    if (newWidth >= minW && newWidth <= maxW && newRight >= 0) {
      chatWindow.style.right = newRight + "px";
      chatWindow.style.width = newWidth + "px";
    }
  }
}
document.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
document.addEventListener("touchmove", (e) => {
  if (isResizing || isResizingWidth) {
    onMove(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }
}, { passive: false });

function stopResize() {
  isResizing = false;
  isResizingWidth = false;
  isResizingCorner = false;
}
document.addEventListener("mouseup", stopResize);
document.addEventListener("touchend", stopResize);
// --------------------------------------------------
let chatWarningShown = false;

function toggleChat() {
  if (chatWindow.classList.contains("open")) {
    chatWindow.classList.remove("open");
    // Wait for transition before display:none
    setTimeout(() => (chatWindow.style.display = "none"), 300);
  } else {
    chatWindow.style.display = "flex";
    // Small delay to allow display:flex to apply before adding class for transition
    setTimeout(() => chatWindow.classList.add("open"), 10);
    chatInput.focus();

    // Show CPU warning once per session when opened
    if (!chatWarningShown) {
      chatWarningShown = true;
      const warning = document.getElementById("cpu-warning");
      if (warning) {
        warning.style.display = "block";
        setTimeout(() => {
          // fade out effect
          warning.style.transition = "opacity 0.4s ease, margin-top 0.4s ease, height 0.4s ease, padding 0.4s ease";
          warning.style.opacity = "0";
          warning.style.height = "0";
          warning.style.padding = "0";
          warning.style.border = "none";
          warning.style.overflow = "hidden";
          setTimeout(() => warning.style.display = "none", 400);
        }, 5500); // Wait 5.5 seconds before hiding
      }
    }
  }
}
function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}

function getVisibleContext() {
  let visibleItems = [];
  const chatWidgetId = 'chat-window'; 
  const chatBtnId = 'chat-btn';

  const elements = document.querySelectorAll('h1, h2, h3, p, span, button, a, input, textarea');

  elements.forEach(el => {
    // Chat widget එකයි button එකයි අතෑරලා දානවා
    if (el.closest(`#${chatWidgetId}`) || el.closest(`#${chatBtnId}`)) return;

    const rect = el.getBoundingClientRect();
    
    // Screen එකේ පේනවද බලන අලුත් ක්‍රමය
    const isVisibleInViewport = (
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );

    if (isVisibleInViewport) {
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        
        let content = '';
        const tagName = el.tagName.toLowerCase();

        if (tagName === 'input' || tagName === 'textarea') {
          content = el.value || el.placeholder;
        } else {
          content = el.innerText.trim();
        }

        if (content !== '') {
          // Markdown format එකට හදනවා
          visibleItems.push(`- **[${tagName.toUpperCase()}]** : ${content}`);
        }
      }
    }
  });

  return visibleItems.join('\n');
}

async function sendMessage() {
  // සර්වර් එකෙන් එන එක අතරමග නවත්තන්න
  if (abortController) {
    abortController.abort();
    abortController = null;
    sendBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>`;
    chatInput.disabled = false;
    sendBtn.disabled = false;
    return;
  }
  const userText = chatInput.value.trim();
  if (!userText) return;
  appendMessage(userText, "user-message");
  chatInput.value = "";
  chatInput.disabled = true;
  // Send button එක Stop button එකක් කරනවා
  sendBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" style="margin-left:0px;"><rect x="4" y="4" width="16" height="16" fill="white"></rect></svg>`;
  const botWrapper = document.createElement("div");
  botWrapper.style.display = "flex";
  botWrapper.style.flexDirection = "column";
  botWrapper.style.alignItems = "flex-start";
  botWrapper.style.marginBottom = "10px";
  const botMessageDiv = document.createElement("div");
  botMessageDiv.className = "message bot-message";
  const timerId = "think-timer-" + Date.now();
  botMessageDiv.innerHTML = `
        <div class="typing-indicator" style="margin-bottom: 5px;"><span></span><span></span><span></span></div>
        <div style="font-size: 12px; color: #888;">Model thinking... <span id="${timerId}">0ms</span></div>
    `;
  botWrapper.appendChild(botMessageDiv);
  chatMessages.appendChild(botWrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  abortController = new AbortController();
  const startTime = Date.now();
  const timerSpan = document.getElementById(timerId);
  // Update timer every 10ms
  const timerInterval = setInterval(() => {
    if (timerSpan) {
      const ms = Date.now() - startTime;
      if (ms < 1000) {
        timerSpan.innerText = ms + "ms";
      } else {
        const s = Math.floor(ms / 1000);
        const mMs = ms % 1000;
        timerSpan.innerText = s + "s " + mMs + "ms";
      }
    }
  }, 10);
  let thinkTime = 0;
  let fullBotResponse = "";
  try {
    // පේළියටම user messages 2ක් යැව්වොත් API එක හිරවෙන නිසා, කලින් user message එක අයින් කරනවා
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === "user") {
      chatHistory.pop();
    }
    // 2️⃣ User ගේ ප්‍රශ්නය History එකට දානවා
    chatHistory.push({ role: "user", content: userText });

    // වෙබ් පිටුවේ ඒ වෙලාවේ user ට පේන්න තියෙන ටික අරගන්නවා (Screen එකේ පේන ටික විතරක් Markdown වලින්)
    const webContext = getVisibleContext();

    // ඔයාට බලාගන්න Console එකෙත් පෙන්නනවා
    console.log("==== WEB CONTEXT (Sent to AI) ====\n", webContext, "\n===================================");

    // අවසාන මැසේජ් 3න විතරක් payload එකට දානවා (crash නොවෙන්න)
    const payload = {
      history: chatHistory.slice(-3),
      web_context: webContext
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // 3️⃣ stream=True විදියට එන ඩේටා කියවන්න Reader එක හදාගන්නවා
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let firstChunkReceived = false;
    let chunkTimeout;
    // 4️⃣ සර්වර් එකෙන් එවන කෑලි (Chunks) කියවලා UI එකට දානවා
    while (true) {
      const readPromise = reader.read();
      const timeoutPromise = new Promise((resolve) => {
        // තත්පර 120ක් (විනාඩි 2ක්) බලනවා Hugging Face Space එක අවදි වෙනකම්
        chunkTimeout = setTimeout(() => resolve({ timeout: true }), 120000);
      });
      const result = await Promise.race([readPromise, timeoutPromise]);
      clearTimeout(chunkTimeout);
      if (result.timeout) {
        throw new Error("Stream reading timed out. Server took too long to respond.");
      }
      const { done, value } = result;
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // හිස් spaces (keep-alive) ආවොත් ඒවා මඟ හරිනවා, එතකොට timer එක දිගටම වැඩ කරනවා
      if (!firstChunkReceived && chunk.trim() === "") {
        continue;
      }
      if (!firstChunkReceived) {
        firstChunkReceived = true;
        clearInterval(timerInterval);
        thinkTime = Date.now() - startTime;
        // Remove typing indicator before showing real text
        botMessageDiv.innerHTML = "";
      }

      fullBotResponse += chunk;
      // \n තියෙන තැන් <br> වලට හරවලා HTML එකට එකතු කරනවා, link තියෙනවනම් ඒවත් හදනවා, markdown style අකුරුත් හදනවා
      botMessageDiv.innerHTML = parseMarkdown(fullBotResponse);
      // අලුත් අකුරු එනකොට Scroll එක පල්ලෙහාටම දානවා
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  } catch (error) {
    clearInterval(timerInterval);
    if (error.name === "AbortError") {
      botMessageDiv.innerHTML +=
        '<br><br><i style="color:#a1a1aa; font-size:11px;">(Stopped by user)</i>';
    } else {
      console.error("Error fetching API:", error);
      botMessageDiv.innerHTML = '<span style="color:#ef4444; font-size:0.875rem;">⚠️ Unable to connect to server. Please check your configuration.</span>';
    }
  } finally {
    clearInterval(timerInterval);
    try {
      if (fullBotResponse) {
        chatHistory.push({ role: "assistant", content: fullBotResponse });
      }
      if (thinkTime > 0) {
        let timeText = thinkTime + "ms";
        if (thinkTime >= 1000) {
          const s = Math.floor(thinkTime / 1000);
          const mMs = thinkTime % 1000;
          timeText = s + "s " + mMs + "ms";
        }
        botMessageDiv.innerHTML += `<div style="font-size: 11px; color: #aaa; margin-top: 8px; text-align: right;">Thought for ${timeText}</div>`;
      }
      // Action Buttons
      const actionBar = document.createElement("div");
      actionBar.style.cssText = "display:flex; gap:6px; margin-top:8px; margin-left:5px;";
      
      const copyBtn = document.createElement("button");
      copyBtn.className = "action-btn";
      copyBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy`;
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(fullBotResponse);
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copied`;
        setTimeout(() => (copyBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy`), 2000);
      };
      
      const retryBtn = document.createElement("button");
      retryBtn.className = "action-btn";
      retryBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> Retry`;
      retryBtn.onclick = () => {
        if (chatHistory.length >= 2) {
          const lastUser = chatHistory[chatHistory.length - 2];
          if (chatHistory[chatHistory.length - 1]?.role === "assistant") chatHistory.pop();
          if (chatHistory[chatHistory.length - 1]?.role === "user") chatHistory.pop();
          chatInput.value = lastUser.content;
          sendMessage();
        }
      };
      
      const reportBtn = document.createElement("button");
      reportBtn.className = "action-btn";
      reportBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg> Report`;
      reportBtn.onclick = () => {
        document.getElementById("report-modal").classList.add("active");
      };
      
      actionBar.appendChild(copyBtn);
      actionBar.appendChild(retryBtn);
      actionBar.appendChild(reportBtn);
      botWrapper.appendChild(actionBar);
      // Play notification sound when done (if not aborted and has response)
      if (fullBotResponse && abortController && !abortController.signal.aborted) {
        playNotificationSound();
      }
    } catch (e) {
      console.error(e);
      botMessageDiv.innerHTML += `<br><span style="color:red; font-size:10px;">UI Error: ${e.message}</span>`;
    }
    // UI Reset
    abortController = null;
    sendBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>`;
    sendBtn.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

// Register KaTeX extension for marked if available
if (typeof marked !== 'undefined' && typeof markedKatex !== 'undefined') {
  marked.use(markedKatex({ throwOnError: false }));
}

function escapeHTML(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function parseMarkdown(text) {
  // Use Marked.js for standard markdown parsing (tables, bold, links, etc.)
  if (typeof marked !== 'undefined') {
    return marked.parse(text, { breaks: true });
  }
  // Fallback if marked is not loaded
  return escapeHTML(text).replace(/\n/g, "<br>");
}
function appendMessage(text, className) {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection =
    className === "user-message" ? "row-reverse" : "row";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "8px";
  wrapper.style.marginBottom = "10px";
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${className}`;
  msgDiv.innerHTML = parseMarkdown(text);
  wrapper.appendChild(msgDiv);
  // Edit Button for User Messages
  if (className === "user-message") {
    const editBtn = document.createElement("button");
    editBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:white;"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
    editBtn.title = "Edit Message";
    editBtn.style.cssText =
      "background:none; border:none; cursor:pointer; opacity:0.6; padding:4px; display:flex; align-items:center; margin-top:4px;";
    editBtn.onmouseover = () => (editBtn.style.opacity = "1");
    editBtn.onmouseout = () => (editBtn.style.opacity = "0.6");
    editBtn.onclick = () => {
      chatInput.value = text;
      chatInput.focus();
    };
    wrapper.appendChild(editBtn);
  }
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function sendSuggestion(text) {
  chatInput.value = text;
  sendMessage();
}
// --- New Features (Clear Chat, Report, Notification) ---
function showToast(message) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<svg style="width:18px;height:18px;fill:#4caf50;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    if (container.contains(toast)) {
      container.removeChild(toast);
    }
  }, 3000);
}

function clearChat() {
  document.getElementById("confirm-modal").classList.add("active");
}

function closeConfirmModal() {
  document.getElementById("confirm-modal").classList.remove("active");
}

function executeClearChat() {
  chatHistory = [];
  chatMessages.innerHTML = `
      <div class="message bot-message">Hello! I'm Syntiox AI. How can I help you today? 😊</div>
      <div id="suggestions" class="suggestions-container">
          <button class="suggestion-btn" onclick="sendSuggestion('Who are you?')">Who are you?</button>
          <button class="suggestion-btn" onclick="sendSuggestion('Tell me about Syntiox')">Tell me about Syntiox</button>
          <button class="suggestion-btn" onclick="sendSuggestion('What can you do?')">What can you do?</button>
      </div>
  `;
  closeConfirmModal();
  showToast("Chat history cleared!");
}

function closeReportModal() {
  document.getElementById("report-modal").classList.remove("active");
  document.getElementById("report-text").value = "";
}

async function submitReport() {
  const text = document.getElementById("report-text").value.trim();
  if (!text) {
    showToast("Please describe the issue before sending.");
    return;
  }
  // Disable button to prevent multiple clicks
  const reportModalBtn = document.querySelector("#report-modal .btn-primary") || document.querySelector("#report-modal button:last-child");
  const originalText = reportModalBtn.innerText;
  reportModalBtn.innerText = "Sending...";
  reportModalBtn.disabled = true;
  try {
    // Formspree URL එකට POST Request එක යවනවා
    const response = await fetch("https://formspree.io/f/mwvyvenv", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        issue: text,
        context: chatHistory.slice(-2), // අන්තිමට යවපු ප්‍රශ්නෙයි උත්තරෙයි යවනවා අවබෝධයට
      }),
    });
    if (response.ok) {
      showToast("Your report has been sent! Thank you.");
      closeReportModal();
    } else {
      showToast("Failed to send report. Please try again.");
    }
  } catch (error) {
    console.error("Error sending report:", error);
    showToast("Network error. Please try again.");
  } finally {
    reportModalBtn.innerText = originalText;
    reportModalBtn.disabled = false;
  }
}
function playNotificationSound() {
  const audio = new Audio(
    "https://www.myinstants.com/media/sounds/discord-notification.mp3",
  );
  audio.play().catch((e) => console.error("Audio play blocked:", e));
}

// --- Mobile Keyboard Fix ---
if (window.visualViewport) {
  const handleViewportResize = () => {
    const win = document.getElementById("chat-window");
    if (!win || win.style.display === "none") return;
    if (window.innerWidth > 480) return;
    
    // If viewport height is significantly less than window innerHeight, keyboard is likely open
    const keyboardOpen = window.visualViewport.height < window.innerHeight * 0.75;
    
    if (keyboardOpen) {
      win.style.height = Math.max(200, window.visualViewport.height - 40) + "px";
      win.style.bottom = "10px";
    } else {
      win.style.height = "";
      win.style.bottom = "";
    }
  };
  
  window.visualViewport.addEventListener("resize", handleViewportResize);
  window.visualViewport.addEventListener("scroll", handleViewportResize);
}
