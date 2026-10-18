(() => {
  'use strict';

  const KEY = 'zj1-economics-admin-trial-v2';
  const components = [
    ['silver', 'Silver', 'Purchased silver content or silver components for one product.'],
    ['gold', 'Gold', 'Purchased gold content or gold components for one product.'],
    ['brass', 'Brass', 'Purchased brass content or brass components for one product.'],
    ['gemstones', 'Gemstones', 'Stone purchase and setting costs for one product.'],
    ['production', 'Production', 'Workshop labour, casting or assembly for one product.'],
    ['plating', 'Plating', 'Plating or surface-treatment cost for one product.'],
    ['packaging', 'Packaging', 'Packaging cost allocated to one product.'],
    ['other', 'Other', 'Any other direct product cost.']
  ];
  const definitions = new Map(components.map(item => [item[0], item]));
  const active = [];
  const $ = id => document.getElementById(id);
  const dollars = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const number = element => element.value.trim() === '' ? null : Number(element.value);
  const valid = n => n !== null && Number.isFinite(n) && n >= 0;
  const value = id => $(id).value.trim();
  const put = (id, v) => { $(id).value = v ?? ''; };

  function componentInput(id) { return $('component-' + id); }
  function subtotal() {
    return active.reduce((sum, id) => {
      const n = number(componentInput(id));
      return sum + (valid(n) ? n : 0);
    }, 0);
  }
  function hasEnteredComponent() {
    return active.some(id => valid(number(componentInput(id))));
  }
  function syncPicker() {
    for (const option of $('componentSelect').options) {
      if (option.value) option.disabled = active.includes(option.value);
    }
    $('componentSelect').value = '';
    $('componentSelect').disabled = active.length === components.length;
  }
  function syncEmptyComponents() {
    const host = $('componentFields');
    const old = host.querySelector('.empty-components');
    if (active.length && old) old.remove();
    if (!active.length && !old) {
      const empty = document.createElement('p');
      empty.className = 'empty-components';
      empty.textContent = 'No components added';
      host.append(empty);
    }
  }
  function addComponent(id, amount = '') {
    if (!definitions.has(id) || active.includes(id)) return;
    const [, label, description] = definitions.get(id);
    const row = document.createElement('div');
    row.className = 'component-field';
    row.dataset.component = id;
    const name = document.createElement('label');
    name.htmlFor = 'component-' + id;
    name.append(document.createTextNode(label + ' '));
    const help = document.createElement('span');
    help.className = 'help';
    help.tabIndex = 0;
    help.setAttribute('aria-label', label + ' help');
    help.textContent = '?';
    const tip = document.createElement('span');
    tip.className = 'tip';
    tip.textContent = description;
    help.append(tip);
    name.append(help);
    const money = document.createElement('div');
    money.className = 'input-money';
    const symbol = document.createElement('span');
    symbol.textContent = '$';
    const input = document.createElement('input');
    input.id = 'component-' + id;
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.inputMode = 'decimal';
    input.placeholder = '0.00';
    input.value = amount;
    money.append(symbol, input);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-component';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remove ' + label);
    remove.addEventListener('click', () => removeComponent(id));
    row.append(name, money, remove);
    active.push(id);
    $('componentFields').append(row);
    syncEmptyComponents();
    syncPicker();
    update();
  }
  function removeComponent(id) {
    const index = active.indexOf(id);
    if (index < 0) return;
    active.splice(index, 1);
    $('componentFields').querySelector('[data-component="' + id + '"]').remove();
    syncEmptyComponents();
    syncPicker();
    $('componentsStatus').textContent = '';
    update();
  }
  function clearComponents() {
    active.length = 0;
    $('componentFields').replaceChildren();
    syncEmptyComponents();
    syncPicker();
  }
  function update() {
    $('componentSubtotal').textContent = dollars(subtotal());
    $('adoptSubtotal').disabled = !hasEnteredComponent();
    const cost = number($('totalCost'));
    const base = number($('commercialBase'));
    const wholesale = number($('wholesaleMultiplier'));
    const retail = number($('retailMultiplier'));
    const wholesaleAmount = valid(base) && valid(wholesale) ? base * wholesale : null;
    const retailAmount = valid(base) && valid(retail) ? base * retail : null;
    $('costOverview').textContent = valid(cost) ? dollars(cost) : '—';
    $('wholesaleOverview').textContent = valid(wholesaleAmount) ? dollars(wholesaleAmount) : '—';
    $('retailOverview').textContent = valid(retailAmount) ? dollars(retailAmount) : '—';
  }
  function entries() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  function persist(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch {
      $('saveStatus').textContent = 'Browser storage is unavailable. Keep a manual copy of these values.';
      return false;
    }
  }
  function snapshot() {
    return {
      id: crypto.randomUUID?.() ?? String(Date.now()) + '-' + String(Math.random()),
      savedAt: new Date().toISOString(),
      productReference: value('productReference'),
      feedback: value('feedback'),
      totalCost: value('totalCost'),
      commercialBase: value('commercialBase'),
      wholesaleMultiplier: value('wholesaleMultiplier'),
      retailMultiplier: value('retailMultiplier'),
      componentTypes: active.slice(),
      components: Object.fromEntries(active.map(id => [id, componentInput(id).value.trim()]))
    };
  }
  function display(list = entries()) {
    $('savedCount').textContent = String(list.length);
    const host = $('entriesList');
    host.replaceChildren();
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No entries saved yet.';
      host.append(empty);
      return;
    }
    for (const item of list.slice().reverse()) {
      const row = document.createElement('div');
      row.className = 'entry';
      const head = document.createElement('div');
      head.className = 'entry-head';
      const title = document.createElement('strong');
      title.textContent = item.productReference || 'Sample product';
      const cost = document.createElement('strong');
      cost.textContent = item.totalCost !== '' && valid(Number(item.totalCost)) ? dollars(Number(item.totalCost)) : '—';
      head.append(title, cost);
      const date = document.createElement('small');
      date.textContent = new Date(item.savedAt).toLocaleString();
      const actions = document.createElement('div');
      actions.className = 'entry-actions';
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'link-button';
      open.textContent = 'Open';
      open.addEventListener('click', () => openEntry(item));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'link-button';
      remove.textContent = 'Delete';
      remove.addEventListener('click', () => {
        if (confirm('Delete this saved trial entry?')) {
          const next = entries().filter(entry => entry.id !== item.id);
          if (persist(next)) display(next);
        }
      });
      actions.append(open, remove);
      row.append(head, date, actions);
      host.append(row);
    }
  }
  function openEntry(item) {
    for (const id of ['productReference', 'feedback', 'totalCost', 'commercialBase', 'wholesaleMultiplier', 'retailMultiplier']) put(id, item[id]);
    clearComponents();
    const selected = Array.isArray(item.componentTypes)
      ? item.componentTypes
      : components.map(([id]) => id).filter(id => (item.components?.[id] ?? '') !== '');
    for (const id of selected) addComponent(id, item.components?.[id] ?? '');
    $('costPanel').open = item.totalCost !== '' || selected.length > 0;
    $('pricingPanel').open = ['commercialBase', 'wholesaleMultiplier', 'retailMultiplier'].some(id => (item[id] ?? '') !== '');
    $('saveStatus').textContent = 'Saved entry opened. Saving again creates another copy.';
    closeDrawer();
    update();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function save() {
    const cost = number($('totalCost'));
    if (!valid(cost)) {
      $('saveStatus').textContent = 'Enter a valid Total Product Cost before saving.';
      $('costPanel').open = true;
      return;
    }
    const optional = [...active.map(componentInput), $('commercialBase'), $('wholesaleMultiplier'), $('retailMultiplier')];
    if (optional.some(input => input.value.trim() !== '' && !valid(number(input)))) {
      $('saveStatus').textContent = 'Amounts and multipliers must be zero or greater.';
      return;
    }
    const list = entries();
    list.push(snapshot());
    if (persist(list)) {
      display(list);
      $('saveStatus').textContent = 'Saved in this browser. Export CSV to share trial results.';
    }
  }
  function exportCsv() {
    const list = entries();
    if (!list.length) {
      $('saveStatus').textContent = 'Save at least one entry before exporting.';
      return;
    }
    const keys = ['savedAt', 'productReference', 'totalCost', ...components.map(([id]) => id), 'componentSubtotal', 'commercialBase', 'wholesaleMultiplier', 'wholesalePrice', 'retailMultiplier', 'retailPrice', 'feedback'];
    const quote = input => {
      const raw = String(input ?? '');
      const safe = /^\s*[=+\-@]/.test(raw) ? "'" + raw : raw;
      return '"' + safe.replaceAll('"', '""') + '"';
    };
    const rows = [keys.map(quote).join(',')];
    for (const item of list) {
      const sum = components.reduce((total, [id]) => total + (Number(item.components?.[id]) || 0), 0);
      const price = id => item.commercialBase !== '' && item[id] !== '' ? (Number(item.commercialBase) * Number(item[id])).toFixed(2) : '';
      rows.push([
        item.savedAt, item.productReference, item.totalCost,
        ...components.map(([id]) => item.components?.[id] ?? ''),
        sum.toFixed(2), item.commercialBase, item.wholesaleMultiplier,
        price('wholesaleMultiplier'), item.retailMultiplier,
        price('retailMultiplier'), item.feedback
      ].map(quote).join(','));
    }
    const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zuman-cost-pricing-trial.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('saveStatus').textContent = 'Exported ' + list.length + (list.length === 1 ? ' entry.' : ' entries.');
  }
  function resetForm() {
    for (const id of ['totalCost', 'commercialBase', 'wholesaleMultiplier', 'retailMultiplier', 'productReference', 'feedback']) put(id, '');
    clearComponents();
    $('costPanel').open = false;
    $('pricingPanel').open = false;
    for (const id of ['componentsStatus', 'pricingStatus']) $(id).textContent = '';
    $('saveStatus').textContent = 'Product fields reset. Saved entries remain available.';
    update();
  }
  function openDrawer() {
    $('trialBackdrop').hidden = false;
    $('trialDrawer').hidden = false;
    $('closeTrial').focus();
  }
  function closeDrawer() {
    $('trialBackdrop').hidden = true;
    $('trialDrawer').hidden = true;
  }

  $('componentSelect').addEventListener('change', event => {
    if (event.target.value) addComponent(event.target.value);
  });
  document.addEventListener('input', event => {
    if (event.target.matches('input[type=number]')) update();
  });
  $('adoptSubtotal').addEventListener('click', () => {
    if (!hasEnteredComponent()) return;
    $('totalCost').value = subtotal().toFixed(2);
    $('componentsStatus').textContent = 'Subtotal applied. Total Product Cost remains editable.';
    update();
  });
  $('copyCost').addEventListener('click', () => {
    const cost = number($('totalCost'));
    if (!valid(cost)) {
      $('pricingStatus').textContent = 'Enter Total Product Cost first.';
      $('costPanel').open = true;
      return;
    }
    $('commercialBase').value = $('totalCost').value;
    $('pricingStatus').textContent = 'Copied once. Later cost edits will not change the base price.';
    update();
  });
  $('openTrial').addEventListener('click', openDrawer);
  $('closeTrial').addEventListener('click', closeDrawer);
  $('trialBackdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDrawer(); });
  $('saveEntry').addEventListener('click', save);
  $('exportEntries').addEventListener('click', exportCsv);
  $('newEntry').addEventListener('click', resetForm);
  $('clearEntries').addEventListener('click', () => {
    const list = entries();
    if (list.length && confirm('Delete all ' + list.length + ' saved trial entries from this browser?')) {
      if (persist([])) {
        display([]);
        $('saveStatus').textContent = 'Saved entries cleared.';
      }
    }
  });
  syncPicker();
  display();
  update();
})();
