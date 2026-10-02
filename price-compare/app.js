'use strict';

const STORAGE_KEY = 'hegoubi.basket.v1';
const MAX_ITEMS = 5;
const MAX_QTY = 5;

const state = {
  query: '',
  category: '全部',
  basket: [],
  customProducts: [],
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function norm(value) {
  return String(value).toLowerCase().replace(/\s+/g, '').replace(/[（）()]/g, '');
}

function motion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function findProduct(id) {
  return PRODUCTS.find((product) => product.id === id)
    || state.customProducts.find((product) => product.id === id);
}

function allProducts() {
  return PRODUCTS.concat(state.customProducts);
}

function selections() {
  return state.basket.map((item) => ({ id: item.id, qty: item.qty }));
}

function sameBasket(items) {
  if (items.length !== state.basket.length) return false;
  return items.every((item, index) => state.basket[index].id === item.id && state.basket[index].qty === item.qty);
}

function joinNames(names) {
  if (names.length <= 1) return names[0] || '';
  if (names.length === 2) return `${names[0]}與${names[1]}`;
  return `${names.slice(0, -1).join('、')}與${names[names.length - 1]}`;
}

function shippingPhrase(store, subtotal, shipping) {
  if (store.freeOver <= 0) return '免運';
  if (shipping === 0) return `已滿 ${ntd(store.freeOver)}，免運`;
  return `未滿 ${ntd(store.freeOver)}，運費 ${ntd(shipping)}`;
}

function lowestUnit(product) {
  const values = Object.values(product.prices).filter((price) => Number.isInteger(price) && price > 0);
  return values.length ? Math.min(...values) : null;
}

function storeCount(product) {
  return Object.values(product.prices).filter((price) => Number.isInteger(price) && price > 0).length;
}

function metaLine(product) {
  return [product.brand, product.spec].filter(Boolean).join(' · ');
}

function searchText(product) {
  return [product.name, product.brand, product.category, product.spec, ...(product.keywords || [])].join(' ');
}

function summaryText(result) {
  if (!result || result.error) return '無法計算';
  if (!result.cheapest.length) {
    if (!result.split) return '無法計算總額';
    return `沒有賣家能一次買齊，分頭購買 ${ntd(result.split.total)}`;
  }
  const names = joinNames(result.cheapest.map((row) => row.store.name));
  const label = result.cheapest.length > 1 ? `${names}並列最便宜` : `${names}最便宜`;
  return `${label} ${ntd(result.cheapest[0].total)}`;
}

function splitWins(result) {
  return Boolean(result.split && result.cheapest.length && result.split.total < result.cheapest[0].total);
}

function avatarHtml(store, tiny) {
  return `<span class="avatar${tiny ? ' tiny' : ''}" data-store="${esc(store.id)}">${esc(store.short)}</span>`;
}

function isValidCustom(product) {
  if (!product || typeof product.id !== 'string' || !product.id.startsWith('custom-')) return false;
  if (typeof product.name !== 'string' || !product.name.trim() || product.name.length > 40) return false;
  if (!product.prices || typeof product.prices !== 'object') return false;
  const entries = Object.entries(product.prices);
  if (!entries.length) return false;
  const storeIds = new Set(STORES.map((store) => store.id));
  return entries.every(([storeId, price]) => storeIds.has(storeId) && Number.isInteger(price) && price > 0);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const custom = Array.isArray(data.customProducts) ? data.customProducts.filter(isValidCustom).slice(0, 20) : [];
    state.customProducts = custom;
    const ids = new Set(PRODUCTS.map((product) => product.id).concat(custom.map((product) => product.id)));
    const basket = Array.isArray(data.basket) ? data.basket : [];
    const seen = new Set();
    state.basket = basket.filter((item) => {
      if (!item || !ids.has(item.id) || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > MAX_QTY) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, MAX_ITEMS);
  } catch {
    state.basket = [];
    state.customProducts = [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      basket: state.basket,
      customProducts: state.customProducts,
    }));
  } catch {
    // 隱私模式或容量不足時，這一輪仍可繼續操作。
  }
}

let toastTimer = 0;
function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2400);
}

function parsePrice(value) {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+$/.test(text)) return 'invalid';
  const price = Number(text);
  if (price <= 0 || price > 10000000) return 'invalid';
  return price;
}

function focusedMarker() {
  const el = document.activeElement;
  if (!el || el === document.body || !el.dataset) return null;
  const keys = ['inc', 'dec', 'remove', 'add', 'preset', 'category'];
  for (const key of keys) {
    if (el.dataset[key]) return `[data-${key}="${CSS.escape(el.dataset[key])}"]`;
  }
  return null;
}

function renderBasketCount() {
  const el = document.getElementById('basket-count');
  el.textContent = `${state.basket.length}/${MAX_ITEMS}`;
  el.classList.toggle('is-full', state.basket.length >= MAX_ITEMS);
  el.setAttribute('aria-label', `比價籃 ${state.basket.length} 樣，最多 ${MAX_ITEMS} 樣`);
}

function renderHeroPreview() {
  const preset = PRESETS.find((item) => item.id === 'commute');
  const result = compareBasket(preset.items, PRODUCTS, STORES);
  const best = result.cheapest[0];
  const lines = best.lines.map((line) => `
    <li><span>${esc(line.product.name)}</span><span>${ntd(line.lineTotal)}</span></li>
  `).join('');
  document.getElementById('hero-preview').innerHTML = `
    <div class="receipt">
      <p class="eyebrow">範例 · ${esc(preset.title)}</p>
      <div class="receipt-store">
        ${avatarHtml(best.store)}
        <div>
          <strong>${esc(best.store.name)}</strong>
          <p>${esc(best.store.domain)}</p>
        </div>
      </div>
      <ul class="lines">
        ${lines}
        <li><span>運費</span><span>${ntd(best.shipping)}</span></li>
      </ul>
      <p class="receipt-total"><span>含運總額</span><strong>${ntd(best.total)}</strong></p>
    </div>
  `;
}

function renderPresets() {
  const root = document.getElementById('presets');
  if (state.basket.length) {
    root.innerHTML = '';
    return;
  }
  root.innerHTML = PRESETS.map((preset) => {
    const result = compareBasket(preset.items, PRODUCTS, STORES);
    const teaser = result.cheapest.length
      ? `${joinNames(result.cheapest.map((row) => row.store.name))} · ${ntd(result.cheapest[0].total)}`
      : `沒有賣家能一次買齊 · 分頭 ${ntd(result.split.total)}`;
    return `
      <button type="button" class="preset" data-preset="${esc(preset.id)}">
        <span class="kicker">範例 · ${preset.items.length} 樣</span>
        <strong>${esc(preset.title)}</strong>
        <span class="preset-desc">${esc(preset.desc)}</span>
        <span class="preset-result">${esc(teaser)}</span>
      </button>
    `;
  }).join('');
}

function switcherHtml() {
  return `
    <div class="switcher">
      <span class="meta">換一個範例</span>
      ${PRESETS.map((preset) => {
        const on = sameBasket(preset.items);
        return `<button type="button" data-preset="${esc(preset.id)}" class="${on ? 'is-on' : ''}" aria-pressed="${on ? 'true' : 'false'}">${esc(preset.title)}</button>`;
      }).join('')}
    </div>
  `;
}

function answerNote(result) {
  const parts = [];
  const best = result.cheapest[0];
  const pricey = result.complete[result.complete.length - 1];
  if (result.complete.length > 1 && pricey.total > best.total) {
    parts.push(`在可一次買齊的賣家裡，比${pricey.store.name}少 ${ntd(pricey.total - best.total)}。`);
  }
  if (result.split && result.split.orders.length > 1 && result.split.total > best.total) {
    parts.push(`分頭購買的含運總額是 ${ntd(result.split.total)}，多 ${ntd(result.split.total - best.total)}。`);
  } else if (result.split && result.split.orders.length > 1 && result.split.total === best.total) {
    parts.push(`分頭購買的含運總額同樣是 ${ntd(result.split.total)}。`);
  }
  return parts.join('');
}

function answerCard(row, tie) {
  const lines = row.lines.map((line) => `
    <li>
      <span>${esc(line.product.name)}${line.qty > 1 ? ` × ${line.qty}` : ''}</span>
      <span>${ntd(line.lineTotal)}</span>
    </li>
  `).join('');
  return `
    <article class="answer" data-answer-store="${esc(row.store.id)}" data-answer-total="${row.total}">
      <p class="eyebrow">${tie ? '一次買齊 · 並列最便宜' : '一次買齊 · 總額最便宜'}</p>
      <div class="answer-top">
        <div class="store-id">
          ${avatarHtml(row.store)}
          <div>
            <h3>${esc(row.store.name)}</h3>
            <p>${esc(row.store.domain)} · ${esc(row.store.speed)}</p>
          </div>
        </div>
        <p class="answer-price"><span>含運總額</span><strong>${ntd(row.total)}</strong></p>
      </div>
      <ul class="lines">
        ${lines}
        <li><span>運費</span><span>${ntd(row.shipping)}</span></li>
      </ul>
      <p class="meta">${esc(shippingPhrase(row.store, row.subtotal, row.shipping))}</p>
    </article>
  `;
}

function answerHtml(result) {
  if (!result.cheapest.length) {
    const splitText = result.split ? `分頭向不同賣家購買的含運總額是 ${ntd(result.split.total)}。` : '';
    return `
      <article class="answer answer-empty">
        <p class="eyebrow">無法在同一賣家買齊</p>
        <h3>沒有賣家同時販售這 ${result.selections.length} 樣商品</h3>
        <p>${esc(splitText)}下方列出每個賣家缺了哪幾樣。</p>
      </article>
    `;
  }
  const tie = result.cheapest.length > 1;
  const note = answerNote(result);
  return `
    <div class="answers">${result.cheapest.map((row) => answerCard(row, tie)).join('')}</div>
    ${note ? `<p class="answer-note">${esc(note)}</p>` : ''}
  `;
}

function splitHtml(result, emphasis) {
  const split = result.split;
  if (!split) return '';
  const lines = split.assignments.map((item) => `
    <li>
      <span>${esc(item.product.name)}${item.qty > 1 ? ` × ${item.qty}` : ''}</span>
      <span>${esc(item.store.name)} · ${ntd(item.lineTotal)}</span>
    </li>
  `).join('');
  const orders = split.orders.map((order) => `
    <li>${esc(order.store.name)}：商品 ${ntd(order.subtotal)}，${esc(shippingPhrase(order.store, order.subtotal, order.shipping))}</li>
  `).join('');
  let verdict = '與一次買齊的總額相同。';
  if (!result.cheapest.length) verdict = '沒有賣家能一次買齊，這是買齊全部商品的含運總額。';
  else if (split.total < result.cheapest[0].total) {
    verdict = `比在${joinNames(result.cheapest.map((row) => row.store.name))}一次買齊少 ${ntd(result.cheapest[0].total - split.total)}。`;
  } else if (split.total > result.cheapest[0].total) {
    verdict = `比一次買齊多 ${ntd(split.total - result.cheapest[0].total)}。`;
  }
  const intro = split.orders.length === 1
    ? '每一樣的最低單價都在同一賣家。'
    : '每一樣向單價最低的賣家購買，再各自加上運費。';
  const title = emphasis && result.cheapest.length ? '分頭購買，總額更低' : '分頭向不同賣家購買';
  return `
    <section class="panel ${emphasis ? 'panel-emphasis' : ''}" data-split-total="${split.total}">
      <div class="panel-head">
        <h3>${esc(title)}</h3>
        <strong class="panel-total">${ntd(split.total)}</strong>
      </div>
      <p>${esc(intro)}</p>
      <ul class="lines">${lines}</ul>
      <ul class="order-notes">${orders}</ul>
      <p class="verdict">${esc(verdict)}</p>
    </section>
  `;
}

function rankHtml(result) {
  const items = result.complete.map((row, index) => {
    const best = result.cheapest.some((item) => item.store.id === row.store.id);
    const details = row.lines.map((line) => `
      <li>
        <span>${esc(line.product.name)}${line.qty > 1 ? ` × ${line.qty}` : ''}</span>
        <span>${ntd(line.lineTotal)}</span>
      </li>
    `).join('');
    return `
      <li class="rank${best ? ' is-best' : ''}">
        <span class="rank-no">${index + 1}</span>
        ${avatarHtml(row.store)}
        <div class="rank-copy">
          <strong>${esc(row.store.name)}</strong>
          <p>${esc(row.store.domain)} · 商品 ${ntd(row.subtotal)} ＋ 運費 ${ntd(row.shipping)}</p>
          <details>
            <summary>查看明細</summary>
            <ul class="lines">${details}</ul>
          </details>
        </div>
        <div class="rank-end">
          ${best ? '<em class="pill">最便宜</em>' : ''}
          <strong>${ntd(row.total)}</strong>
        </div>
      </li>
    `;
  }).join('');
  const empty = result.complete.length ? '' : '<p class="callout">這幾樣商品沒有任何賣家同時有賣。</p>';
  return `
    <section class="panel">
      <h3>同時有販售全部商品的賣家（${result.complete.length}）</h3>
      ${empty}
      ${items ? `<ol class="ranks">${items}</ol>` : ''}
    </section>
  `;
}

function gapHtml(result) {
  if (!result.incomplete.length) return '';
  const items = result.incomplete.map((row) => `
    <li>
      ${avatarHtml(row.store)}
      <div>
        <strong>${esc(row.store.name)}</strong>
        <p class="meta">${esc(row.store.domain)}</p>
        <p class="missing">缺少：${esc(row.missing.map((product) => product.name).join('、') || '全部商品')}</p>
      </div>
      <span class="coverage">${row.coverage}/${result.selections.length} 有貨</span>
    </li>
  `).join('');
  return `
    <section class="panel">
      <h3>無法一次買齊的賣家（${result.incomplete.length}）</h3>
      <ul class="gaps">${items}</ul>
    </section>
  `;
}

function matrixHtml(result) {
  const columns = result.complete.concat(result.incomplete);
  const bestIds = new Set(result.cheapest.map((row) => row.store.id));
  const header = columns.map((col) => {
    const best = bestIds.has(col.store.id);
    const cls = [best ? 'is-best' : '', col.complete ? '' : 'is-incomplete'].filter(Boolean).join(' ');
    return `
      <th scope="col" class="${cls}">
        ${avatarHtml(col.store, true)}
        <span>${esc(col.store.name)}</span>
        ${best ? '<em>最便宜</em>' : ''}
        ${col.complete ? '' : '<em>未買齊</em>'}
      </th>
    `;
  }).join('');
  const body = result.selections.map((sel) => {
    const product = findProduct(sel.id);
    let min = Infinity;
    for (const col of columns) {
      const line = col.lines.find((item) => item.product.id === sel.id);
      if (line && line.unit < min) min = line.unit;
    }
    const cells = columns.map((col) => {
      const line = col.lines.find((item) => item.product.id === sel.id);
      if (!line) return '<td class="missing">未販售</td>';
      const low = line.unit === min;
      const unitNote = sel.qty > 1 ? `<small>單價 ${ntd(line.unit)} × ${sel.qty}</small>` : '';
      return `<td class="${low ? 'is-low' : ''}">${ntd(line.lineTotal)}${low ? '<small>最低單價</small>' : ''}${unitNote}</td>`;
    }).join('');
    return `
      <tr>
        <th scope="row">${esc(product.name)}${sel.qty > 1 ? `<small>× ${sel.qty}</small>` : ''}</th>
        ${cells}
      </tr>
    `;
  }).join('');
  const moneyRow = (label, pick) => `
    <tr>
      <th scope="row">${label}</th>
      ${columns.map((col) => {
        if (!col.complete) return '<td class="missing">—</td>';
        const best = label === '含運總額' && bestIds.has(col.store.id);
        return `<td class="${best ? 'is-best' : ''}">${ntd(pick(col))}</td>`;
      }).join('')}
    </tr>
  `;
  return `
    <section class="panel">
      <h3>各賣家價格</h3>
      <p class="meta">含運總額以綠色標出最便宜的賣家。商品列上的「最低單價」只比較單價，還沒有加運費。</p>
      <p class="scroll-hint">左右滑動可看所有賣家</p>
      <div class="matrix-wrap" tabindex="0">
        <table class="matrix">
          <caption class="sr-only">各賣家價格。可以一次買齊的賣家排在前面，並以含運總額由低到高排列。</caption>
          <thead>
            <tr><th scope="col">商品</th>${header}</tr>
          </thead>
          <tbody>${body}</tbody>
          <tfoot>
            ${moneyRow('運費', (col) => col.shipping)}
            ${moneyRow('含運總額', (col) => col.total)}
          </tfoot>
        </table>
      </div>
    </section>
  `;
}

function showEmphasisSplit(result) {
  return Boolean(result.split) && (splitWins(result) || !result.cheapest.length);
}

function showQuietSplit(result) {
  if (!result.split || !result.cheapest.length || splitWins(result)) return false;
  if (result.split.orders.length === 1 && result.split.total === result.cheapest[0].total) return false;
  return true;
}

function resultsHtml(result) {
  return `
    <header class="results-head">
      <div>
        <h2>比價結果</h2>
        <p class="meta">共 ${result.selections.length} 樣商品 · ${result.complete.length} 個賣家可以一次買齊</p>
      </div>
      ${switcherHtml()}
    </header>
    <p class="rule">總額＝各商品單價 × 數量，再加運費。只有同時販售全部商品的賣家，才算一次買齊。</p>
    ${answerHtml(result)}
    ${showEmphasisSplit(result) ? splitHtml(result, true) : ''}
    ${rankHtml(result)}
    ${showQuietSplit(result) ? splitHtml(result, false) : ''}
    ${matrixHtml(result)}
    ${gapHtml(result)}
  `;
}

function renderBasket(result) {
  const bar = document.getElementById('basket-bar');
  if (!state.basket.length) {
    bar.innerHTML = '';
    bar.classList.remove('is-on');
    return;
  }
  const chips = state.basket.map((item) => {
    const product = findProduct(item.id);
    const name = product ? product.name : item.id;
    return `
      <div class="chip">
        <span class="chip-name" title="${esc(name)}">${esc(name)}</span>
        <div class="stepper">
          <button type="button" data-dec="${esc(item.id)}" aria-label="減少${esc(name)}數量" ${item.qty <= 1 ? 'disabled' : ''}>−</button>
          <span>${item.qty}</span>
          <button type="button" data-inc="${esc(item.id)}" aria-label="增加${esc(name)}數量" ${item.qty >= MAX_QTY ? 'disabled' : ''}>+</button>
        </div>
        <button type="button" class="icon-btn" data-remove="${esc(item.id)}" aria-label="移除${esc(name)}">×</button>
      </div>
    `;
  }).join('');
  bar.classList.add('is-on');
  bar.innerHTML = `
    <div class="chips">${chips}</div>
    <div class="basket-side">
      <a class="summary-link" href="#results">${esc(summaryText(result))}</a>
      <button type="button" class="text-btn" data-clear>清空</button>
    </div>
  `;
}

function renderResults(result) {
  const el = document.getElementById('results');
  const live = document.getElementById('live-summary');
  if (!state.basket.length || !result) {
    el.innerHTML = '';
    live.textContent = '';
    return;
  }
  if (result.error) {
    el.innerHTML = `<p class="empty">比價時發生問題：${esc(result.error.message)}</p>`;
    live.textContent = '比價時發生問題';
    return;
  }
  el.innerHTML = resultsHtml(result);
  live.textContent = summaryText(result);
}

function filteredProducts() {
  const query = norm(state.query);
  const categoryOrder = new Map(CATEGORIES.map((category, index) => [category, index]));
  categoryOrder.set('自訂', CATEGORIES.length);
  return allProducts()
    .filter((product) => state.category === '全部' || product.category === state.category)
    .filter((product) => !query || norm(searchText(product)).includes(query))
    .sort((a, b) => {
      const categoryDiff = (categoryOrder.get(a.category) ?? 99) - (categoryOrder.get(b.category) ?? 99);
      if (categoryDiff) return categoryDiff;
      return a.name.localeCompare(b.name, 'zh-Hant');
    });
}

function cardHtml(product) {
  const inBasket = state.basket.some((item) => item.id === product.id);
  const full = state.basket.length >= MAX_ITEMS && !inBasket;
  const low = lowestUnit(product);
  const action = inBasket
    ? `<button type="button" class="add-btn is-in" data-remove="${esc(product.id)}">從籃內移除</button>`
    : `<button type="button" class="add-btn" data-add="${esc(product.id)}" ${full ? 'disabled' : ''}>${full ? '籃子已滿' : '加入比價'}</button>`;
  const custom = product.id.startsWith('custom-')
    ? `<button type="button" class="text-btn" data-delete-custom="${esc(product.id)}">刪除自訂商品</button>`
    : '';
  const initial = Array.from(product.brand || '商')[0];
  return `
    <article class="card${inBasket ? ' is-selected' : ''}" data-product-id="${esc(product.id)}">
      <div class="thumb" data-cat="${esc(product.category)}">
        <strong>${esc(initial)}</strong>
        <span>${esc(product.category)}</span>
      </div>
      <div class="card-body">
        <h3>${esc(product.name)}</h3>
        <p class="meta">${esc(metaLine(product))}</p>
        <p class="card-price">${low == null ? '尚無價格' : `${ntd(low)} 起`}</p>
        <p class="meta">${storeCount(product)} 家有貨</p>
        ${action}
        ${custom}
      </div>
    </article>
  `;
}

function renderGrid() {
  const products = filteredProducts();
  const count = document.getElementById('grid-count');
  const prefix = state.category === '全部' ? '' : `${state.category} · `;
  const filtered = state.query.trim() || state.category !== '全部';
  count.textContent = filtered ? `${prefix}找到 ${products.length} 項` : `共 ${products.length} 項`;
  const grid = document.getElementById('grid');
  if (!products.length) {
    grid.innerHTML = `
      <div class="empty">
        <p>找不到符合的商品。</p>
        <button type="button" class="primary" data-open-custom>自行填入價格</button>
      </div>
    `;
    return;
  }
  grid.innerHTML = products.map(cardHtml).join('');
}

function renderToolbar() {
  document.getElementById('categories').innerHTML = CATEGORIES.map((category) => `
    <button type="button" data-category="${esc(category)}">${esc(category)}</button>
  `).join('');
  const suggestions = ['滑鼠', '耳機', '吹風機', '防曬', '原子習慣', '衛生紙'];
  document.getElementById('suggestions').innerHTML = suggestions.map((word) => `
    <button type="button" class="suggestion" data-suggest="${esc(word)}">${esc(word)}</button>
  `).join('');
}

function syncCategories() {
  const wrap = document.getElementById('categories');
  let customBtn = wrap.querySelector('[data-category="自訂"]');
  if (state.customProducts.length && !customBtn) {
    customBtn = document.createElement('button');
    customBtn.type = 'button';
    customBtn.dataset.category = '自訂';
    customBtn.textContent = '自訂';
    wrap.appendChild(customBtn);
  } else if (!state.customProducts.length && customBtn) {
    customBtn.remove();
    if (state.category === '自訂') state.category = '全部';
  }
  wrap.querySelectorAll('[data-category]').forEach((btn) => {
    const on = btn.dataset.category === state.category;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('is-on', on);
  });
}

function renderCustomFields() {
  document.getElementById('custom-prices').innerHTML = STORES.map((store) => `
    <label class="price-field">${esc(store.name)}
      <input name="price-${esc(store.id)}" data-store="${esc(store.id)}" inputmode="numeric" autocomplete="off" placeholder="未販售">
    </label>
  `).join('');
}

function render() {
  const marker = focusedMarker();
  document.body.classList.toggle('has-basket', state.basket.length > 0);
  renderBasketCount();
  let result = null;
  if (state.basket.length) {
    try {
      result = compareBasket(selections(), allProducts(), STORES);
    } catch (error) {
      result = { error };
    }
  }
  renderPresets();
  renderBasket(result);
  renderResults(result);
  syncCategories();
  renderGrid();
  if (marker) {
    const next = document.querySelector(marker);
    if (next) next.focus();
  }
}

function commit() {
  save();
  render();
}

function addProduct(id) {
  const existing = state.basket.find((item) => item.id === id);
  if (existing) {
    if (existing.qty >= MAX_QTY) {
      toast('這一項最多 5 件');
      return;
    }
    existing.qty += 1;
    toast(`已在比價籃，數量改為 ${existing.qty}`);
    commit();
    return;
  }
  if (state.basket.length >= MAX_ITEMS) {
    toast('比價籃最多放 5 樣商品');
    return;
  }
  const product = findProduct(id);
  if (!product) return;
  state.basket.push({ id, qty: 1 });
  toast(`已加入${product.name}`);
  commit();
}

function removeProduct(id) {
  const product = findProduct(id);
  state.basket = state.basket.filter((item) => item.id !== id);
  toast(product ? `已移除${product.name}` : '已移除');
  commit();
}

function changeQty(id, delta) {
  const item = state.basket.find((entry) => entry.id === id);
  if (!item) return;
  const next = item.qty + delta;
  if (next > MAX_QTY) {
    toast('每一樣最多 5 件');
    return;
  }
  if (next < 1) return;
  item.qty = next;
  commit();
}

function clearBasket() {
  if (!state.basket.length) return;
  state.basket = [];
  toast('已清空比價籃');
  commit();
}

function applyPreset(id) {
  const preset = PRESETS.find((item) => item.id === id);
  if (!preset) return;
  state.basket = preset.items.map((item) => ({ id: item.id, qty: item.qty }));
  toast(`已套用範例「${preset.title}」`);
  commit();
  document.getElementById('results').scrollIntoView({ behavior: motion(), block: 'start' });
}

function deleteCustom(id) {
  state.customProducts = state.customProducts.filter((product) => product.id !== id);
  state.basket = state.basket.filter((item) => item.id !== id);
  if (state.category === '自訂' && !state.customProducts.length) state.category = '全部';
  toast('已刪除自訂商品');
  commit();
}

function openCustom() {
  if (state.basket.length >= MAX_ITEMS) {
    toast('比價籃最多放 5 樣商品');
    return;
  }
  const form = document.getElementById('custom-form');
  form.reset();
  document.getElementById('custom-error').textContent = '';
  const dialog = document.getElementById('custom-dialog');
  dialog.showModal();
  form.querySelector('[name="name"]').focus();
}

function onCustomSubmit(event) {
  event.preventDefault();
  const error = document.getElementById('custom-error');
  const name = document.querySelector('#custom-form [name="name"]').value.trim();
  if (!name) {
    error.textContent = '請輸入商品名稱';
    return;
  }
  if (name.length > 40) {
    error.textContent = '商品名稱最多 40 字';
    return;
  }
  if (state.basket.length >= MAX_ITEMS) {
    error.textContent = '比價籃最多放 5 樣商品';
    return;
  }
  const prices = {};
  let invalid = false;
  document.querySelectorAll('#custom-prices input').forEach((input) => {
    const parsed = parsePrice(input.value);
    if (parsed === 'invalid') invalid = true;
    else if (parsed != null) prices[input.dataset.store] = parsed;
  });
  if (invalid) {
    error.textContent = '價格請填正整數';
    return;
  }
  if (!Object.keys(prices).length) {
    error.textContent = '請至少填一個賣家的價格';
    return;
  }
  const product = {
    id: `custom-${Date.now()}`,
    name,
    brand: '自訂',
    category: '自訂',
    spec: '自行填入的價格',
    keywords: [],
    prices,
  };
  state.customProducts.push(product);
  state.basket.push({ id: product.id, qty: 1 });
  document.getElementById('custom-dialog').close();
  toast(`已加入${name}`);
  commit();
  document.getElementById('results').scrollIntoView({ behavior: motion(), block: 'start' });
}

function onClick(event) {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.add) addProduct(target.dataset.add);
  else if (target.dataset.remove) removeProduct(target.dataset.remove);
  else if (target.dataset.inc) changeQty(target.dataset.inc, 1);
  else if (target.dataset.dec) changeQty(target.dataset.dec, -1);
  else if (target.dataset.preset) applyPreset(target.dataset.preset);
  else if (target.dataset.category) {
    state.category = target.dataset.category;
    syncCategories();
    renderGrid();
  } else if (target.dataset.suggest) {
    const search = document.getElementById('search');
    search.value = target.dataset.suggest;
    state.query = search.value;
    document.getElementById('search-clear').hidden = false;
    renderGrid();
    document.getElementById('catalog').scrollIntoView({ behavior: motion(), block: 'start' });
  } else if (target.hasAttribute('data-clear')) clearBasket();
  else if (target.hasAttribute('data-open-custom')) openCustom();
  else if (target.dataset.deleteCustom) deleteCustom(target.dataset.deleteCustom);
}

function bind() {
  document.getElementById('search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    document.getElementById('catalog').scrollIntoView({ behavior: motion(), block: 'start' });
  });
  const search = document.getElementById('search');
  const clear = document.getElementById('search-clear');
  search.addEventListener('input', () => {
    state.query = search.value;
    clear.hidden = !search.value;
    renderGrid();
  });
  clear.addEventListener('click', () => {
    search.value = '';
    state.query = '';
    clear.hidden = true;
    renderGrid();
    search.focus();
  });
  document.getElementById('custom-form').addEventListener('submit', onCustomSubmit);
  document.getElementById('custom-cancel').addEventListener('click', () => {
    document.getElementById('custom-dialog').close();
  });
  document.addEventListener('click', onClick);
}

function init() {
  load();
  bind();
  renderToolbar();
  renderCustomFields();
  renderHeroPreview();
  document.getElementById('catalog-meta').textContent = `${PRODUCTS.length} 項示範商品 · ${STORES.length} 個購物網站`;
  render();
}

init();
