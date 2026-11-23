// Phòng chat khóa học. Mọi nội dung hiển thị bằng textContent (không innerHTML) → tin nhắn không thể chèn mã.
(() => {
  const box = document.querySelector('[data-chat]');
  if (!box || !window.io) return;
  const list = box.querySelector('[data-chat-list]');
  const form = box.querySelector('[data-chat-form]');
  const input = form.querySelector('input');
  const button = form.querySelector('button');
  const status = document.querySelector('[data-chat-status]');
  const errorBox = box.querySelector('[data-chat-error]');
  let canModerate = false;
  let me = '';

  const showError = (msg) => {
    errorBox.textContent = msg || '';
    errorBox.hidden = !msg;
  };
  const fmt = (d) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  function render(m) {
    let li = list.querySelector(`[data-id="${m.id}"]`);
    if (!li) {
      li = document.createElement('li');
      li.dataset.id = m.id;
      li.dataset.at = m.at;
      list.append(li);
    }
    li.replaceChildren();
    li.className = `chat-msg${m.user && m.user.id === me ? ' mine' : ''}${m.deleted ? ' deleted' : ''}`;
    const head = document.createElement('div');
    head.className = 'chat-head';
    const name = document.createElement('b');
    name.textContent = m.user ? m.user.name : 'Người dùng';
    const time = document.createElement('span');
    time.className = 'muted small';
    time.textContent = ` · ${fmt(m.at)}`;
    head.append(name, time);
    if (m.user && m.user.role === 'admin') {
      const badge = document.createElement('span');
      badge.className = 'pill pill-staff';
      badge.textContent = 'Quản trị';
      head.append(' ', badge);
    }
    if (m.user && m.user.demo) {
      const demo = document.createElement('span');
      demo.className = 'demo-label';
      demo.textContent = 'Dữ liệu mẫu';
      head.append(' ', demo);
    }
    const body = document.createElement('p');
    body.textContent = m.deleted ? '(Tin nhắn đã bị xóa)' : m.text;
    li.append(head, body);
    if (canModerate && !m.deleted) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'icon-btn danger chat-del';
      del.textContent = '✕';
      del.setAttribute('aria-label', `Xóa tin nhắn của ${name.textContent}`);
      del.addEventListener('click', () => {
        if (!window.confirm('Xóa tin nhắn này?')) return;
        socket.emit('delete', m.id, (r) => r && r.error && showError(r.error));
      });
      li.append(del);
    }
  }
  const scrollEnd = () => {
    list.scrollTop = list.scrollHeight;
  };

  const socket = window.io({ transports: ['websocket'] });
  const setEnabled = (on) => {
    input.disabled = !on;
    button.disabled = !on;
  };

  socket.on('connect', () => {
    status.textContent = 'Đang vào phòng…';
    socket.emit('join', box.dataset.chat, (r) => {
      if (!r || r.error) {
        status.textContent = 'Không vào được phòng';
        showError(r ? r.error : 'Lỗi kết nối');
        return;
      }
      canModerate = r.canModerate;
      me = r.me;
      list.replaceChildren();
      r.messages.forEach(render);
      scrollEnd();
      status.textContent = '● Đã kết nối';
      setEnabled(true);
      showError('');
    });
  });
  socket.on('connect_error', () => {
    status.textContent = 'Mất kết nối – đang thử lại…';
    setEnabled(false);
  });
  socket.on('disconnect', () => {
    status.textContent = 'Mất kết nối – đang thử lại…';
    setEnabled(false);
  });
  socket.on('message', (m) => {
    const nearEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    render(m);
    if (nearEnd || (m.user && m.user.id === me)) scrollEnd();
  });
  socket.on('deleted', (id) => {
    const li = list.querySelector(`[data-id="${id}"]`);
    if (li) render({ id, deleted: true, at: li.dataset.at, user: { name: li.querySelector('b').textContent } });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    button.disabled = true;
    socket.emit('message', text, (r) => {
      button.disabled = false;
      if (r && r.error) return showError(r.error);
      showError('');
      input.value = '';
      input.focus();
    });
  });
})();
