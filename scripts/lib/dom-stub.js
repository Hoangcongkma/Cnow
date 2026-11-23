// DOM giả lập tối thiểu để chạy thử bằng Node các đoạn code trình duyệt trong bài học (khối ```js dom).
// Mục đích: bắt lỗi cú pháp và lỗi chạy (gọi sai hàm, biến chưa khai báo, lỗi trong hàm xử lý sự kiện).
// Không mô phỏng bố cục/hiển thị – phần đó học viên tự thử trên trình duyệt.
const registry = new Map();
const all = [];

function classList() {
  const s = new Set();
  return {
    add: (...c) => c.forEach((x) => s.add(x)),
    remove: (...c) => c.forEach((x) => s.delete(x)),
    toggle: (c, force) => {
      const on = force === undefined ? !s.has(c) : force;
      on ? s.add(c) : s.delete(c);
      return on;
    },
    contains: (c) => s.has(c),
    get length() {
      return s.size;
    },
    toString: () => [...s].join(' '),
  };
}

function el(tag = 'div', key = '') {
  const node = {
    tagName: String(tag).toUpperCase(),
    key,
    id: '',
    className: '',
    textContent: '',
    innerHTML: '',
    innerText: '',
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    href: '',
    src: '',
    type: '',
    style: {},
    dataset: {},
    attributes: {},
    children: [],
    parentNode: null,
    classList: classList(),
    handlers: {},
    addEventListener(t, fn) {
      (this.handlers[t] ||= []).push(fn);
    },
    removeEventListener(t, fn) {
      this.handlers[t] = (this.handlers[t] || []).filter((f) => f !== fn);
    },
    dispatchEvent(e) {
      for (const fn of this.handlers[e.type] || []) fn.call(this, e);
      return true;
    },
    click() {
      this.dispatchEvent(makeEvent('click', this));
    },
    appendChild(c) {
      this.children.push(c);
      c.parentNode = this;
      return c;
    },
    append(...c) {
      c.forEach((x) => (typeof x === 'object' ? this.appendChild(x) : (this.textContent += String(x))));
    },
    prepend(...c) {
      this.children.unshift(...c.filter((x) => typeof x === 'object'));
    },
    remove() {
      if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((x) => x !== this);
    },
    replaceChildren(...c) {
      this.children = [];
      this.append(...c);
    },
    setAttribute(k, v) {
      this.attributes[k] = String(v);
      if (k === 'id') this.id = String(v);
    },
    getAttribute(k) {
      return k in this.attributes ? this.attributes[k] : null;
    },
    removeAttribute(k) {
      delete this.attributes[k];
    },
    hasAttribute(k) {
      return k in this.attributes;
    },
    closest() {
      return this.parentNode || this;
    },
    matches() {
      return true;
    },
    contains(x) {
      return x === this || this.children.includes(x);
    },
    querySelector(s) {
      return find(`${key} ${s}`);
    },
    querySelectorAll(s) {
      return list(`${key} ${s}`);
    },
    focus() {},
    blur() {},
    reset() {},
    submit() {
      this.dispatchEvent(makeEvent('submit', this));
    },
    insertAdjacentHTML(pos, html) {
      this.innerHTML += html;
    },
  };
  all.push(node);
  return node;
}

function find(sel) {
  if (!registry.has(sel)) {
    const tag = (String(sel)
      .trim()
      .split(/\s+/)
      .pop()
      .match(/^[a-z]+/i) || ['div'])[0];
    const node = el(tag, sel);
    const idm = String(sel).match(/#([\w-]+)\s*$/);
    if (idm) node.id = idm[1];
    registry.set(sel, node);
  }
  return registry.get(sel);
}
function list(sel) {
  const items = [find(sel), find(`${sel}:nth(2)`)];
  return Object.assign(items, { item: (i) => items[i] ?? null });
}

function makeEvent(type, target) {
  return {
    type,
    target,
    currentTarget: target,
    key: 'Enter',
    code: 'Enter',
    clientX: 0,
    clientY: 0,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {},
  };
}

const document = {
  body: el('body', 'body'),
  head: el('head', 'head'),
  documentElement: el('html', 'html'),
  title: '',
  querySelector: find,
  querySelectorAll: list,
  getElementById: (id) => find(`#${id}`),
  getElementsByClassName: (c) => list(`.${c}`),
  getElementsByTagName: (t) => list(t),
  createElement: (t) => el(t),
  createTextNode: (t) => ({ textContent: String(t) }),
  createDocumentFragment: () => el('fragment'),
  addEventListener(t, fn) {
    if (t === 'DOMContentLoaded') fn(makeEvent(t, document));
  },
};
const store = new Map();
globalThis.document = document;
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.alert = (m) => console.log(`[alert] ${m}`);
globalThis.confirm = () => true;
globalThis.prompt = () => '';

/** Gọi thử mọi hàm xử lý sự kiện đã đăng ký (mỗi loại 1 lần) để bắt lỗi bên trong chúng. */
function fireAll() {
  for (const node of [...all]) {
    for (const type of Object.keys(node.handlers)) {
      if (!node.value) node.value = '5';
      node.dispatchEvent(makeEvent(type, node));
    }
  }
}

module.exports = { fireAll, document };
