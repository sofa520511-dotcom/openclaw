'use strict';

const assert = require('assert');
const { STORES, PRODUCTS, PRESETS } = require('./data');
const { compareBasket } = require('./compare');

function preset(id) {
  const found = PRESETS.find((item) => item.id === id);
  assert.ok(found, `缺少範例 ${id}`);
  return found;
}

function storeIds() {
  return new Set(STORES.map((store) => store.id));
}

{
  const ids = STORES.map((store) => store.id);
  assert.strictEqual(new Set(ids).size, ids.length, '賣家 id 重複');
  const productIds = PRODUCTS.map((product) => product.id);
  assert.strictEqual(new Set(productIds).size, productIds.length, '商品 id 重複');
  assert.ok(PRODUCTS.length >= 24);
  for (const product of PRODUCTS) {
    const entries = Object.entries(product.prices);
    assert.ok(entries.length > 0, `${product.id} 沒有價格`);
    for (const [storeId, price] of entries) {
      assert.ok(storeIds().has(storeId), `${product.id} 的賣家 ${storeId} 不存在`);
      assert.ok(Number.isInteger(price) && price > 0, `${product.id} 價格不正確`);
    }
  }
  for (const item of PRESETS) {
    assert.ok(item.items.length > 0 && item.items.length <= 5);
    for (const sel of item.items) {
      assert.ok(PRODUCTS.some((product) => product.id === sel.id), `範例引用不存在的 ${sel.id}`);
    }
  }
}

{
  const stores = [{ id: 's', name: 'S', shipping: 80, freeOver: 500 }];
  const products = [{ id: 'p', name: 'P', prices: { s: 200 } }];
  let result = compareBasket([{ id: 'p', qty: 2 }], products, stores);
  assert.strictEqual(result.cheapest[0].subtotal, 400);
  assert.strictEqual(result.cheapest[0].shipping, 80);
  assert.strictEqual(result.cheapest[0].total, 480);

  result = compareBasket([{ id: 'p', qty: 3 }], products, stores);
  assert.strictEqual(result.cheapest[0].subtotal, 600);
  assert.strictEqual(result.cheapest[0].shipping, 0);
  assert.strictEqual(result.cheapest[0].total, 600);

  result = compareBasket([{ id: 'p', qty: 1 }, { id: 'p', qty: 1 }], products, stores);
  assert.strictEqual(result.selections.length, 1);
  assert.strictEqual(result.cheapest[0].subtotal, 400);
}

{
  const stores = [
    { id: 'a', name: '甲', shipping: 0, freeOver: 0 },
    { id: 'b', name: '乙', shipping: 0, freeOver: 0 },
  ];
  const products = [{ id: 'p', name: 'P', prices: { a: 100, b: 100 } }];
  const result = compareBasket([{ id: 'p', qty: 1 }], products, stores);
  assert.strictEqual(result.cheapest.length, 2);
  assert.deepStrictEqual(result.cheapest.map((row) => row.store.id).sort(), ['a', 'b']);
}

{
  const empty = compareBasket([], PRODUCTS, STORES);
  assert.strictEqual(empty.complete.length, 0);
  assert.strictEqual(empty.split, null);
}

{
  const commute = compareBasket(preset('commute').items, PRODUCTS, STORES);
  assert.strictEqual(commute.complete.length, 6);
  assert.strictEqual(commute.cheapest.length, 1);
  assert.strictEqual(commute.cheapest[0].store.id, 'shopee');
  assert.strictEqual(commute.cheapest[0].subtotal, 4670);
  assert.strictEqual(commute.cheapest[0].shipping, 0);
  assert.strictEqual(commute.cheapest[0].total, 4670);
  assert.strictEqual(commute.complete[commute.complete.length - 1].store.id, 'tk3c');
  assert.strictEqual(commute.complete[commute.complete.length - 1].total, 5410);
  assert.strictEqual(commute.split.total, 4705);
  assert.strictEqual(commute.split.shipping, 75);
  assert.ok(commute.split.total > commute.cheapest[0].total);
  const missing = new Set(commute.incomplete.map((row) => row.store.id));
  assert.deepStrictEqual(missing, new Set(['books', 'efun']));
}

{
  const lip = compareBasket(preset('lipbalm').items, PRODUCTS, STORES);
  assert.strictEqual(lip.cheapest.length, 1);
  assert.strictEqual(lip.cheapest[0].store.id, 'pchome');
  assert.strictEqual(lip.cheapest[0].total, 89);
  const shopee = lip.complete.find((row) => row.store.id === 'shopee');
  assert.strictEqual(shopee.subtotal, 69);
  assert.strictEqual(shopee.shipping, 60);
  assert.strictEqual(shopee.total, 129);

  const tie = compareBasket([{ id: 'lipbalm', qty: 3 }], PRODUCTS, STORES);
  assert.strictEqual(tie.cheapest.length, 2);
  assert.deepStrictEqual(tie.cheapest.map((row) => row.store.id).sort(), ['pchome', 'shopee']);
  assert.strictEqual(tie.cheapest[0].total, 267);
}

{
  const splitWin = compareBasket(preset('split-win').items, PRODUCTS, STORES);
  assert.strictEqual(splitWin.cheapest.length, 1);
  assert.strictEqual(splitWin.cheapest[0].store.id, 'momo');
  assert.strictEqual(splitWin.cheapest[0].total, 3810);
  assert.strictEqual(splitWin.split.total, 3619);
  assert.ok(splitWin.split.total < splitWin.cheapest[0].total);
  const orderIds = splitWin.split.orders.map((order) => order.store.id).sort();
  assert.deepStrictEqual(orderIds, ['books', 'tk3c']);
}

{
  const none = compareBasket(preset('no-overlap').items, PRODUCTS, STORES);
  assert.strictEqual(none.complete.length, 0);
  assert.strictEqual(none.cheapest.length, 0);
  assert.ok(none.incomplete.every((row) => row.coverage === 1));
  assert.strictEqual(none.split.total, 3269);
  assert.strictEqual(none.split.shipping, 79);
}

{
  const household = compareBasket(
    [
      { id: 'tissue', qty: 1 },
      { id: 'wipes', qty: 1 },
      { id: 'mop', qty: 1 },
    ],
    PRODUCTS,
    STORES,
  );
  assert.strictEqual(household.cheapest[0].store.id, 'shopee');
  assert.strictEqual(household.cheapest[0].total, 787);
  const yahoo = household.complete.find((row) => row.store.id === 'yahoo');
  assert.strictEqual(yahoo.subtotal, 977);
  assert.strictEqual(yahoo.shipping, 99);
  assert.strictEqual(yahoo.total, 1076);
}

{
  const stores = [{ id: 's', name: 'S', shipping: 10, freeOver: 100 }];
  const result = compareBasket([{ id: 'ghost', qty: 1 }], [{ id: 'ghost', name: 'G', prices: {} }], stores);
  assert.strictEqual(result.complete.length, 0);
  assert.strictEqual(result.split, null);
}

console.log('compare.test.js 全部通過');
