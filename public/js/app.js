// Script dùng chung – CSP chỉ cho phép script từ cùng nguồn, không có inline script
(() => {
  // ---------- Menu hamburger trên điện thoại ----------
  const navToggle = document.querySelector('[data-nav-toggle]');
  const menu = document.getElementById('main-menu');
  if (navToggle && menu) {
    const setOpen = (open) => {
      menu.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
      navToggle.textContent = open ? '✕' : '☰';
    };
    navToggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        setOpen(false);
        navToggle.focus();
      }
    });
  }

  // ---------- Chế độ sáng/tối (nhớ lựa chọn) ----------
  const themeBtn = document.querySelector('[data-theme-toggle]');
  if (themeBtn) {
    const root = document.documentElement;
    const isDark = () =>
      root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const sync = () => {
      const dark = isDark();
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.setAttribute('aria-label', dark ? 'Chuyển sang chế độ sáng' : 'Bật chế độ tối');
    };
    themeBtn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      try {
        localStorage.setItem('cnow.theme', next);
      } catch {
        /* bỏ qua nếu bị chặn */
      }
      sync();
    });
    sync();
  }

  // Tô màu ảnh bìa khóa học
  document.querySelectorAll('[data-color]').forEach((el) => {
    const c = el.dataset.color;
    if (!/^#[0-9a-fA-F]{6}$/.test(c)) return;
    if (el.classList.contains('thumb')) el.style.background = `linear-gradient(135deg, ${c}, ${c}cc 60%, #11131888)`;
    else el.style.background = c;
  });

  // Hiện/ẩn mật khẩu
  document.querySelectorAll('.pw-toggle').forEach((btn) =>
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.setAttribute('aria-label', input.type === 'password' ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
    }),
  );

  // Xác nhận trước thao tác nguy hiểm
  document.querySelectorAll('form[data-confirm]').forEach((f) =>
    f.addEventListener('submit', (e) => {
      if (!window.confirm(f.dataset.confirm)) e.preventDefault();
    }),
  );

  // Form chỉ gửi 1 lần (trang xác nhận thanh toán demo): khóa nút SAU khi trình duyệt đã lấy giá trị nút được bấm.
  // Server vẫn tự chống bấm 2 lần (chuyển trạng thái nguyên tử) – đây chỉ là tiện ích giao diện.
  document.querySelectorAll('form[data-once]').forEach((f) =>
    f.addEventListener('submit', () => {
      setTimeout(() => f.querySelectorAll('button').forEach((b) => (b.disabled = true)), 0);
    }),
  );

  // Xác nhận cho riêng một nút submit
  document.querySelectorAll('button[data-confirm-click]').forEach((b) =>
    b.addEventListener('click', (e) => {
      if (!window.confirm(b.dataset.confirmClick)) e.preventDefault();
    }),
  );

  // Đổi vai trò: tự gửi form khi chọn
  document.querySelectorAll('select[data-autosubmit]').forEach((s) =>
    s.addEventListener('change', () => {
      if (window.confirm(`Đổi vai trò thành “${s.options[s.selectedIndex].text}”?`)) s.form.submit();
      else s.form.reset();
    }),
  );

  // ---------- Trình dựng chương / bài học (trang quản trị) ----------
  const builder = document.querySelector('[data-builder]');
  if (builder) {
    const form = builder.closest('form');
    const list = builder.querySelector('[data-sections]');
    const tplSection = builder.querySelector('[data-tpl-section]');
    const tplLesson = builder.querySelector('[data-tpl-lesson]');
    const ITEM = '[data-lesson], [data-section]';
    const clone = (tpl) => tpl.content.firstElementChild.cloneNode(true);
    const sectionsOf = () => [...list.querySelectorAll(':scope > [data-section]')];

    builder.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || !builder.contains(btn)) return;
      if (btn.matches('[data-add-section]')) {
        const s = clone(tplSection);
        list.appendChild(s);
        s.querySelector('input').focus();
      } else if (btn.matches('[data-add-lesson]')) {
        const l = clone(tplLesson);
        btn.closest('[data-section]').querySelector('[data-lessons]').appendChild(l);
        l.querySelector('input').focus();
      } else if (btn.dataset.remove !== undefined) {
        const item = btn.closest(ITEM);
        if (window.confirm(btn.dataset.remove)) item.remove();
      } else if (btn.dataset.move) {
        const item = btn.closest(ITEM);
        const up = btn.dataset.move === 'up';
        const sib = up ? item.previousElementSibling : item.nextElementSibling;
        if (sib) up ? sib.before(item) : sib.after(item);
        else if (item.matches('[data-lesson]')) {
          // Bài ở đầu/cuối chương: chuyển sang chương liền kề
          const secs = sectionsOf();
          const i = secs.indexOf(item.closest('[data-section]'));
          const target = secs[up ? i - 1 : i + 1];
          if (target) {
            const ol = target.querySelector('[data-lessons]');
            up ? ol.appendChild(item) : ol.prepend(item);
          }
        }
        btn.focus();
      }
    });

    // Kéo-thả: chỉ bật draggable khi nhấn vào tay nắm ⠿ để vẫn chọn được chữ trong ô nhập
    let dragging = null;
    builder.addEventListener('pointerdown', (e) => {
      const h = e.target.closest('.handle');
      if (h) h.closest(ITEM).draggable = true;
    });
    builder.addEventListener('pointerup', () => {
      if (!dragging)
        builder.querySelectorAll('[draggable="true"]').forEach((el) => {
          el.draggable = false;
        });
    });
    builder.addEventListener('dragstart', (e) => {
      dragging = e.target.closest(ITEM);
      if (!dragging) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
      dragging.classList.add('dragging');
    });
    const after = (container, y, sel) =>
      [...container.querySelectorAll(`:scope > ${sel}:not(.dragging)`)].find((el) => {
        const r = el.getBoundingClientRect();
        return y < r.top + r.height / 2;
      });
    builder.addEventListener('dragover', (e) => {
      if (!dragging) return;
      e.preventDefault();
      if (dragging.matches('[data-lesson]')) {
        const sec = e.target.closest('[data-section]');
        if (!sec) return;
        const ol = sec.querySelector('[data-lessons]');
        const ref = after(ol, e.clientY, '[data-lesson]');
        ref ? ol.insertBefore(dragging, ref) : ol.appendChild(dragging);
      } else {
        const ref = after(list, e.clientY, '[data-section]');
        ref ? list.insertBefore(dragging, ref) : list.appendChild(dragging);
      }
    });
    builder.addEventListener('dragend', () => {
      if (!dragging) return;
      dragging.classList.remove('dragging');
      dragging.draggable = false;
      dragging = null;
    });

    // Gửi form: tuần tự hóa cấu trúc thành JSON
    form.addEventListener('submit', () => {
      const val = (root, f) => root.querySelector(`[data-f="${f}"]`);
      form.querySelector('[data-structure]').value = JSON.stringify(
        sectionsOf().map((s) => ({
          id: s.dataset.id || '',
          title: val(s.querySelector('.sec-head'), 'title').value,
          lessons: [...s.querySelectorAll('[data-lesson]')].map((l) => ({
            id: l.dataset.id || '',
            title: val(l, 'title').value,
            youtubeId: val(l, 'youtubeId').value,
            minutes: val(l, 'minutes').value,
            preview: val(l, 'preview').checked,
          })),
        })),
      );
    });
  }

  // ---------- Soạn trắc nghiệm (trang sửa bài học) ----------
  const quizEditor = document.querySelector('[data-quiz-editor]');
  if (quizEditor) {
    const qlist = quizEditor.querySelector('[data-quiz-list]');
    const renumber = () =>
      qlist.querySelectorAll('[data-quiz-no]').forEach((el, i) => {
        el.textContent = `Câu ${i + 1}`;
      });
    quizEditor.querySelector('[data-quiz-add]').addEventListener('click', () => {
      const item = quizEditor.querySelector('[data-quiz-tpl]').content.firstElementChild.cloneNode(true);
      qlist.appendChild(item);
      renumber();
      item.querySelector('textarea').focus();
    });
    qlist.addEventListener('click', (e) => {
      const b = e.target.closest('[data-quiz-remove]');
      if (b && window.confirm('Xóa câu hỏi này?')) {
        b.closest('[data-quiz-item]').remove();
        renumber();
      }
    });
    renumber();
  }

  // ---------- Ghi chú theo mốc thời gian (YouTube IFrame Player API) ----------
  const ytFrame = document.querySelector('iframe[data-yt-api]');
  if (ytFrame) {
    const fmt = (s) => {
      s = Math.max(0, Math.floor(s));
      const h = Math.floor(s / 3600);
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
    };
    const form = document.querySelector('[data-note-form]');
    const label = form && form.querySelector('[data-note-time]');
    const hidden = form && form.querySelector('[data-note-seconds]');
    const textarea = form && form.querySelector('textarea');
    let player = null;
    let frozen = false;
    const setTime = (t) => {
      if (label) label.textContent = fmt(t);
      if (hidden) hidden.value = String(Math.floor(t));
    };
    // Đang gõ ghi chú thì giữ nguyên mốc thời gian lúc bắt đầu gõ
    if (textarea) {
      textarea.addEventListener('focus', () => {
        frozen = true;
      });
      textarea.addEventListener('blur', () => {
        if (!textarea.value.trim()) frozen = false;
      });
    }
    window.onYouTubeIframeAPIReady = () => {
      player = new window.YT.Player(ytFrame, {
        events: {
          onReady: () =>
            setInterval(() => {
              if (!frozen && player && typeof player.getCurrentTime === 'function') setTime(player.getCurrentTime() || 0);
            }, 500),
        },
      });
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);

    document.querySelectorAll('[data-seek]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const t = Number(btn.dataset.seek) || 0;
        if (player && typeof player.seekTo === 'function') {
          player.seekTo(t, true);
          player.playVideo();
          ytFrame.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }),
    );
  }

  // Bộ lọc khóa học: đổi lựa chọn là lọc ngay (vẫn có nút "Lọc" khi tắt JS)
  document.querySelectorAll('[data-filter-form] select').forEach((s) => s.addEventListener('change', () => s.form.submit()));

  // ---------- Bài đọc: nút "Sao chép" cho khối code, thanh tiến độ đọc, chế độ đọc toàn màn hình ----------
  document.querySelectorAll('.prose pre').forEach((pre) => {
    const code = pre.querySelector('code');
    if (!code) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Sao chép';
    btn.setAttribute('aria-label', 'Sao chép đoạn code');
    btn.addEventListener('click', async () => {
      const text = code.innerText;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      btn.textContent = 'Đã chép ✓';
      setTimeout(() => {
        btn.textContent = 'Sao chép';
      }, 1500);
    });
    pre.classList.add('has-copy');
    pre.appendChild(btn);
  });

  const article = document.querySelector('[data-reading]');
  const bar = document.querySelector('[data-read-bar]');
  if (article && bar) {
    const update = () => {
      const r = article.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const pct = total > 0 ? Math.min(100, Math.max(0, ((-r.top + window.innerHeight * 0.2) / total) * 100)) : 100;
      bar.style.width = `${pct}%`;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  const learn = document.querySelector('[data-learn]');
  const toggle = document.querySelector('[data-reading-toggle]');
  if (learn && toggle) {
    const KEY = 'cnow.readingFull';
    const set = (on) => {
      learn.classList.toggle('reading-full', on);
      toggle.setAttribute('aria-pressed', String(on));
      toggle.textContent = on ? '⤡ Hiện danh sách bài' : '⤢ Đọc toàn màn hình';
    };
    try {
      set(localStorage.getItem(KEY) === '1');
    } catch {
      /* bỏ qua */
    }
    toggle.addEventListener('click', () => {
      const on = !learn.classList.contains('reading-full');
      set(on);
      try {
        localStorage.setItem(KEY, on ? '1' : '0');
      } catch {
        /* bỏ qua */
      }
    });
  }

  // Mục lục bài đọc: trên điện thoại thu gọn mặc định để nội dung bài lên đầu
  const toc = document.querySelector('[data-toc]');
  if (toc && window.matchMedia('(max-width: 900px)').matches) toc.open = false;

  // In / Lưu PDF chứng nhận
  document.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));

  // Mở rộng / thu gọn tất cả chương
  document.querySelectorAll('[data-toggle-all]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const items = document.querySelectorAll(btn.dataset.toggleAll);
      const open = [...items].some((d) => !d.open);
      items.forEach((d) => {
        d.open = open;
      });
      btn.textContent = open ? 'Thu gọn tất cả' : 'Mở rộng tất cả';
    }),
  );

  // Chống bấm thanh toán 2 lần
  document.querySelectorAll('form[action="/pay"]').forEach((f) =>
    f.addEventListener('submit', () => {
      const b = f.querySelector('button');
      if (b) {
        b.disabled = true;
        b.textContent = 'Đang chuyển sang cổng thanh toán…';
      }
    }),
  );
})();
