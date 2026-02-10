// ---------- Utilities ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const pad2 = (n) => String(n).padStart(2, "0");
function timeStamp() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// Tiny click "sound" using WebAudio (no external files)
function clickBeep() {
  if (!state.sound) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.value = 520;
  g.gain.value = 0.0001;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  const now = ctx.currentTime;
  g.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  o.frequency.exponentialRampToValueAtTime(380, now + 0.12);
  o.stop(now + 0.14);
  setTimeout(() => ctx.close?.(), 220);
}

// ---------- State ----------
const STORAGE_KEY = "Duksitext.v1";
const DEFAULT_CONTACT = "Duksi";

const state = {
  contact: DEFAULT_CONTACT,
  autoReply: true,
  sound: false,
  timestamps: true,
  typing: true,
  threads: {}, 
};

// ---------- DOM ----------
const threadEl = $("#thread");
const inputEl = $("#messageInput");
const sendBtn = $("#sendBtn");
const clearBtn = $("#clearBtn");
const newChatBtn = $("#newChatBtn");
const attachBtn = $("#attachBtn");
const contactSel = $("#contact");
const profileTitle = $("#profileTitle");
const yearEl = $("#year");
const charCountEl = $("#charCount");

const toggles = {
  autoReply: $("#autoReplyToggle"),
  sound: $("#soundToggle"),
  timestamps: $("#timestampsToggle"),
  typing: $("#typingToggle"),
};

// ---------- Persistence ----------
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);

    if (data && typeof data === "object") {
      Object.assign(state, data);
      // ensure shape
      state.threads = state.threads || {};
      state.contact = state.contact || DEFAULT_CONTACT;
      return true;
    }
  } catch (e) {}
  return false;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- Rendering ----------
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (s) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[s]));
}

function renderMessage(msg, index) {
  const whoClass = msg.who === "you" ? "you" : "them";
  const name = msg.who === "you" ? "You" : state.contact;

  const ts = state.timestamps ? `<span>${escapeHtml(msg.at)}</span>` : `<span></span>`;
  const meta = `<div class="meta"><strong>${escapeHtml(name)}</strong>${ts}</div>`;
  const tail = `<span class="tail" aria-hidden="true"></span>`;

  const delay = Math.min(index * 45, 280); 
  return `
        <article class="msg ${whoClass}" style="animation-delay:${delay}ms" data-id="${escapeHtml(msg.id)}">
          ${meta}
          <p>${escapeHtml(msg.text)}</p>
          ${tail}
        </article>
      `;
}

function ensureThread(contact) {
  if (!state.threads[contact]) state.threads[contact] = [];
}

function seedIfEmpty() {
  ensureThread(state.contact);
  if (state.threads[state.contact].length) return;

  state.threads[state.contact] = [
    { id: uid(), who: "them", text: "You there?", at: timeStamp() },
    { id: uid(), who: "you", text: "Yeah. What’s up?", at: timeStamp() },
    { id: uid(), who: "them", text: "You a bitch", at: timeStamp() },
  ];
  save();
}

function renderThread() {
  ensureThread(state.contact);
  const msgs = state.threads[state.contact];

  threadEl.innerHTML = msgs.map(renderMessage).join("");
  // scroll to bottom
  requestAnimationFrame(() => {
    threadEl.scrollTop = threadEl.scrollHeight;
  });
}

function setContact(name) {
  state.contact = name;
  contactSel.value = name;
  profileTitle.textContent = `Chatting with ${name}`;
  ensureThread(name);
  save();
  renderThread();
}

// Typing indicator bubble
let typingTimer = null;
function showTyping() {
  if (!state.typing) return;
  const id = "typing";
  if (threadEl.querySelector(`[data-id="${id}"]`)) return;

  const bubble = document.createElement("article");
  bubble.className = "msg them";
  bubble.dataset.id = id;
  bubble.innerHTML = `
        <div class="meta"><strong>${state.contact}</strong>${state.timestamps ? `<span>${timeStamp()}</span>` : `<span></span>`}</div>
        <p>Typing<span id="dots">.</span></p>
        <span class="tail"></span>
      `;
  threadEl.appendChild(bubble);
  threadEl.scrollTop = threadEl.scrollHeight;

  const dots = bubble.querySelector("#dots");
  let n = 1;
  typingTimer = setInterval(() => {
    n = (n % 3) + 1;
    dots.textContent = ".".repeat(n);
  }, 320);
}

function hideTyping() {
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;
  }
  const el = threadEl.querySelector(`[data-id="typing"]`);
  if (el) el.remove();
}

// ---------- Actions ----------
const AUTO_REPLIES = [
  "Hi.",
  "Suck dick",
  "Wow cool didn't ask",
  "Micic is keeping drekavce",
  "Cool. Testing complete.",
  "Bravo",
];

function addMessage(who, text) {
  ensureThread(state.contact);
  const msg = { id: uid(), who, text: text.trim(), at: timeStamp() };
  state.threads[state.contact].push(msg);
  save();

  // append (faster than full rerender)
  const index = state.threads[state.contact].length - 1;
  threadEl.insertAdjacentHTML("beforeend", renderMessage(msg, index));
  threadEl.scrollTop = threadEl.scrollHeight;
}

function sendCurrent() {
  const raw = inputEl.value;
  const text = raw.trim();
  if (!text) return;

  addMessage("you", text);
  clickBeep();

  inputEl.value = "";
  resizeTextarea();
  updateCharCount();

  if (state.autoReply) {
    hideTyping();
    showTyping();
    // simulate response delay
    const delay = 700 + Math.random() * 900;
    setTimeout(() => {
      hideTyping();
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      addMessage("them", reply);
    }, delay);
  }
}

function clearThread() {
  ensureThread(state.contact);
  state.threads[state.contact] = [];
  save();
  hideTyping();
  renderThread();
}

function newChat() {
  // Create a fresh thread for current contact (wipe) and add a single system-style starter
  state.threads[state.contact] = [
    { id: uid(), who: "them", text: "What's up", at: timeStamp() },
  ];
  save();
  hideTyping();
  renderThread();
}

function sparkle() {
  const spark = "✨ Purple check: gradients, glass, and contrast. Ready.";
  inputEl.value = (inputEl.value ? inputEl.value + "\n" : "") + spark;
  resizeTextarea();
  updateCharCount();
  inputEl.focus();
  clickBeep();
}

// ---------- Textarea helpers ----------
function resizeTextarea() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + "px";
}

const MAX_CHARS = 280;
function updateCharCount() {
  const n = inputEl.value.length;
  charCountEl.textContent = `${n} / ${MAX_CHARS}`;
  charCountEl.style.color =
    n > MAX_CHARS ? "color-mix(in oklab, var(--p2) 70%, white)" : "var(--muted2)";
  sendBtn.disabled = n === 0 || n > MAX_CHARS;
  sendBtn.style.opacity = sendBtn.disabled ? 0.6 : 1;
  sendBtn.style.cursor = sendBtn.disabled ? "not-allowed" : "pointer";
}

// ---------- Toggles ----------
function syncToggles() {
  toggles.autoReply.setAttribute("pressed", String(state.autoReply));
  toggles.sound.setAttribute("pressed", String(state.sound));
  toggles.timestamps.setAttribute("pressed", String(state.timestamps));
  toggles.typing.setAttribute("pressed", String(state.typing));
}

function toggle(key) {
  state[key] = !state[key];
  save();
  syncToggles();
  clickBeep();

  if (key === "timestamps") {
    renderThread();
  }
  if (key === "typing" && !state.typing) {
    hideTyping();
  }
}

// ---------- Scroll reveal ----------
function setupReveal() {
  const els = $$(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("in");
      });
    },
    { threshold: 0.12 }
  );
  els.forEach((el) => io.observe(el));
}

// ---------- Init ----------
function init() {
  yearEl.textContent = new Date().getFullYear();

  const had = load();
  // contact options might be changed
  if (![...contactSel.options].some((o) => o.value === state.contact)) {
    state.contact = DEFAULT_CONTACT;
  }

  syncToggles();
  setContact(state.contact);

  if (!had) {
    seedIfEmpty();
    renderThread();
  } else {
    seedIfEmpty();
    renderThread();
  }

  setupReveal();

  // Events
  sendBtn.addEventListener("click", () => {
    if (sendBtn.disabled) return;
    sendCurrent();
  });

  inputEl.addEventListener("input", () => {
    resizeTextarea();
    
    if (inputEl.value.length > MAX_CHARS) {
      inputEl.value = inputEl.value.slice(0, MAX_CHARS + 200); 
    }
    updateCharCount();
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) sendCurrent();
    }
  });

  clearBtn.addEventListener("click", () => {
    clickBeep();
    clearThread();
  });

  newChatBtn.addEventListener("click", () => {
    clickBeep();
    newChat();
  });

  attachBtn.addEventListener("click", sparkle);

  contactSel.addEventListener("change", (e) => {
    clickBeep();
    setContact(e.target.value);
  });

  toggles.autoReply.addEventListener("click", () => toggle("autoReply"));
  toggles.sound.addEventListener("click", () => toggle("sound"));
  toggles.timestamps.addEventListener("click", () => toggle("timestamps"));
  toggles.typing.addEventListener("click", () => toggle("typing"));

  $$(".btn[data-quick]").forEach((b) => {
    b.addEventListener("click", () => {
      inputEl.value = b.getAttribute("data-quick");
      resizeTextarea();
      updateCharCount();
      inputEl.focus();
      clickBeep();
    });
  });

  
  resizeTextarea();
  updateCharCount();
}


init();

