'use strict';

// 一次買齊：賣家必須每樣商品都有價格。
// 總額 = 單價 × 數量 的加總 + 運費。
// 小計達到 freeOver（含）則免運；freeOver 為 0 代表一律免運。
// 分頭購買：每項商品挑單價最低的賣家，各賣家再各自計算運費。

function ntd(amount) {
  const sign = amount < 0 ? '-' : '';
  const n = Math.abs(Math.round(amount));
  return `${sign}NT$${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function unitPrice(product, storeId) {
  if (!product || !product.prices) return null;
  const price = product.prices[storeId];
  return Number.isInteger(price) && price > 0 ? price : null;
}

function normalizeSelections(selections) {
  const order = [];
  const qtyById = new Map();
  for (const sel of selections) {
    if (!sel || typeof sel.id !== 'string') throw new Error('商品不正確');
    if (!Number.isInteger(sel.qty) || sel.qty < 1) throw new Error('數量不正確');
    if (!qtyById.has(sel.id)) order.push(sel.id);
    qtyById.set(sel.id, (qtyById.get(sel.id) || 0) + sel.qty);
  }
  return order.map((id) => ({ id, qty: qtyById.get(id) }));
}

function shippingFee(store, subtotal) {
  if (store.freeOver <= 0 || subtotal >= store.freeOver) return 0;
  return store.shipping;
}

function evaluateStore(store, selections, productMap) {
  const lines = [];
  const missing = [];
  for (const sel of selections) {
    const product = productMap.get(sel.id);
    if (!product) throw new Error(`找不到商品 ${sel.id}`);
    const unit = unitPrice(product, store.id);
    if (unit == null) {
      missing.push(product);
      continue;
    }
    lines.push({
      product,
      qty: sel.qty,
      unit,
      lineTotal: unit * sel.qty,
    });
  }
  const complete = missing.length === 0 && selections.length > 0;
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shipping = complete ? shippingFee(store, subtotal) : null;
  return {
    store,
    lines,
    missing,
    complete,
    subtotal,
    shipping,
    total: complete ? subtotal + shipping : null,
    coverage: lines.length,
  };
}

function splitPurchase(selections, productMap, stores) {
  const assignments = [];
  for (const sel of selections) {
    const product = productMap.get(sel.id);
    if (!product) throw new Error(`找不到商品 ${sel.id}`);
    let best = null;
    for (const store of stores) {
      const unit = unitPrice(product, store.id);
      if (unit == null) continue;
      const nameOrder = best ? store.name.localeCompare(best.store.name, 'zh-Hant') : 0;
      if (!best || unit < best.unit || (unit === best.unit && nameOrder < 0)) {
        best = { store, unit };
      }
    }
    if (!best) return null;
    assignments.push({
      product,
      qty: sel.qty,
      store: best.store,
      unit: best.unit,
      lineTotal: best.unit * sel.qty,
    });
  }

  const groups = new Map();
  for (const assignment of assignments) {
    if (!groups.has(assignment.store.id)) {
      groups.set(assignment.store.id, {
        store: assignment.store,
        lines: [],
        subtotal: 0,
      });
    }
    const group = groups.get(assignment.store.id);
    group.lines.push(assignment);
    group.subtotal += assignment.lineTotal;
  }

  const orders = [];
  let shipping = 0;
  let merchandise = 0;
  for (const group of groups.values()) {
    const fee = shippingFee(group.store, group.subtotal);
    merchandise += group.subtotal;
    shipping += fee;
    orders.push({
      store: group.store,
      lines: group.lines,
      subtotal: group.subtotal,
      shipping: fee,
      total: group.subtotal + fee,
    });
  }
  orders.sort((a, b) => a.store.name.localeCompare(b.store.name, 'zh-Hant'));
  return {
    assignments,
    orders,
    merchandise,
    shipping,
    total: merchandise + shipping,
  };
}

function compareBasket(selections, products, stores) {
  const normalized = normalizeSelections(selections);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const evaluated = stores.map((store) => evaluateStore(store, normalized, productMap));
  const byName = (a, b) => a.store.name.localeCompare(b.store.name, 'zh-Hant');
  const complete = evaluated.filter((row) => row.complete).sort((a, b) => a.total - b.total || byName(a, b));
  const incomplete = evaluated.filter((row) => !row.complete).sort((a, b) => b.coverage - a.coverage || byName(a, b));
  const cheapestTotal = complete.length ? complete[0].total : null;
  const cheapest = complete.filter((row) => row.total === cheapestTotal);
  const split = normalized.length ? splitPurchase(normalized, productMap, stores) : null;
  return { selections: normalized, evaluated, complete, incomplete, cheapest, split };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compareBasket, ntd, shippingFee };
}
