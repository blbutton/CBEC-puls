// mall-AI 聊天室前端逻辑
(() => {
  const $ = (id) => document.getElementById(id);
  const joinScreen = $("join-screen");
  const chatScreen = $("chat-screen");
  const roomInput = $("room-input");
  const userInput = $("user-input");
  const joinBtn = $("join-btn");
  const leaveBtn = $("leave-btn");
  const roomNameEl = $("room-name");
  const onlineEl = $("online-count");
  const statusEl = $("conn-status");
  const messagesEl = $("messages");
  const textInput = $("text-input");
  const sendBtn = $("send-btn");

  let ws = null;
  let currentUser = "";
  let currentRoom = "lobby";
  let pollingTimer = null;

  // ===== 加入 =====
  joinBtn.addEventListener("click", join);
  [roomInput, userInput].forEach((el) =>
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") join();
    })
  );

  function join() {
    const room = (roomInput.value || "lobby").trim() || "lobby";
    const user = (userInput.value || "").trim();
    if (!user) {
      userInput.focus();
      return;
    }
    currentRoom = room;
    currentUser = user;
    roomNameEl.textContent = room;
    joinScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    connect(room, user);
  }

  // ===== WebSocket =====
  function connect(room, user) {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${location.host}/ws/chat?room=${encodeURIComponent(
      room
    )}&user=${encodeURIComponent(user)}`;
    setStatus("connecting");
    ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus("online");
      refreshRooms();
      startPolling();
    };
    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      onMessage(msg);
    };
    ws.onclose = () => {
      setStatus("offline");
      stopPolling();
    };
    ws.onerror = () => setStatus("offline");
  }

  function setStatus(state) {
    statusEl.className = `status ${state}`;
    statusEl.textContent =
      state === "online" ? "在线" : state === "offline" ? "已断开" : "连接中";
  }

  // ===== 消息渲染 =====
  function onMessage(msg) {
    // 系统消息（加入/离开）刷新在线人数
    if (msg.is_system) {
      renderMessage(msg);
      refreshRooms();
      return;
    }
    renderMessage(msg);
  }

  function renderMessage(msg) {
    const existing = messagesEl.querySelector(`[data-id="${msg.id}"]`);
    if (existing) {
      existing.replaceWith(buildMessageEl(msg));
    } else {
      messagesEl.appendChild(buildMessageEl(msg));
    }
    scrollToBottom();
  }

  function buildMessageEl(msg) {
    const wrap = document.createElement("div");
    wrap.className = "msg";
    wrap.dataset.id = msg.id;
    if (msg.is_system) wrap.classList.add("system");
    else if (msg.is_ai) wrap.classList.add("ai");
    else if (msg.user === currentUser) wrap.classList.add("mine");

    const meta = document.createElement("div");
    meta.className = "meta";
    const time = (msg.ts || "").slice(11, 19) || "";
    if (msg.is_system) {
      meta.textContent = msg.text;
    } else {
      meta.innerHTML = `<span class="name">${escapeHtml(
        msg.user
      )}</span> · <span>${time}</span>`;
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (msg.is_ai) {
      // 流式生成中：显示带光标的文本
      if (msg.kind === "typing") {
        bubble.classList.add("cursor");
        bubble.textContent = msg.text || "正在生成";
      } else {
        // done：渲染 markdown + 代码块保存按钮
        bubble.innerHTML = renderMarkdown(msg.text);
        attachSaveButtons(bubble, msg.code_blocks || []);
        if (window.hljs) {
          bubble.querySelectorAll("pre code").forEach((b) => hljs.highlightElement(b));
        }
      }
    } else if (!msg.is_system) {
      bubble.textContent = msg.text;
    } else {
      bubble.textContent = msg.text;
    }

    if (msg.is_system) {
      wrap.appendChild(bubble);
    } else {
      wrap.appendChild(meta);
      wrap.appendChild(bubble);
    }
    return wrap;
  }

  function renderMarkdown(text) {
    if (window.marked) {
      try {
        return marked.parse(text, { breaks: true });
      } catch {
        return escapeHtml(text);
      }
    }
    return escapeHtml(text);
  }

  function attachSaveButtons(bubble, codeBlocks) {
    const pres = bubble.querySelectorAll("pre");
    pres.forEach((pre, idx) => {
      const block = codeBlocks[idx];
      if (!block) return;
      const head = document.createElement("div");
      head.className = "code-head";
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = block.filename || `code-${idx}`;
      const btn = document.createElement("button");
      btn.className = "save-btn";
      btn.textContent = "保存";
      btn.addEventListener("click", () => saveCode(block, btn));
      head.appendChild(name);
      head.appendChild(btn);
      // 包裹
      const container = document.createElement("div");
      container.className = "code-block";
      pre.parentNode.replaceChild(container, pre);
      container.appendChild(head);
      container.appendChild(pre);
    });
  }

  async function saveCode(block, btn) {
    btn.disabled = true;
    btn.textContent = "保存中…";
    try {
      const resp = await fetch("/api/code/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: currentRoom,
          filename: block.filename,
          content: block.content,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      btn.textContent = "已保存";
      btn.classList.add("saved");
      btn.title = data.path;
    } catch (e) {
      btn.disabled = false;
      btn.textContent = "重试";
      alert("保存失败: " + e.message);
    }
  }

  // ===== 发送 =====
  sendBtn.addEventListener("click", send);
  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  textInput.addEventListener("input", () => {
    textInput.style.height = "auto";
    textInput.style.height = Math.min(textInput.scrollHeight, 140) + "px";
  });

  function send() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const text = textInput.value.trim();
    if (!text) return;
    ws.send(JSON.stringify({ user: currentUser, text }));
    textInput.value = "";
    textInput.style.height = "auto";
  }

  // ===== 在线人数 =====
  async function refreshRooms() {
    try {
      const resp = await fetch("/api/rooms");
      if (!resp.ok) return;
      const rooms = await resp.json();
      const cur = rooms.find((r) => r.name === currentRoom);
      onlineEl.textContent = `${cur ? cur.online : 0} 在线`;
    } catch {
      /* ignore */
    }
  }

  function startPolling() {
    stopPolling();
    pollingTimer = setInterval(refreshRooms, 5000);
  }
  function stopPolling() {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = null;
  }

  // ===== 离开 =====
  leaveBtn.addEventListener("click", () => {
    if (ws) ws.close();
    stopPolling();
    chatScreen.classList.add("hidden");
    joinScreen.classList.remove("hidden");
    messagesEl.innerHTML = "";
    roomInput.focus();
  });

  // ===== 工具 =====
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // 默认聚焦
  userInput.focus();
})();
