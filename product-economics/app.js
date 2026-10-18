(() => {
  'use strict';

  const KEY = 'zj1-economics-admin-trial-v2';
  const components = [
    ['silver', 'Silver', 'Weight in grams × Gold API silver spot price per gram × dealer markup.'],
    ['gold', 'Gold', 'Weight in grams × Gold API gold spot price per gram × dealer markup.'],
    ['brass', 'Brass', 'Weight in grams × your supplier quote per gram × dealer markup.'],
    ['gemstones', 'Gemstones', 'Each stone type, count and size uses its supplier quote per carat plus dealer markup. Setting labour belongs under Production.'],
    ['production', 'Production', 'Workshop labour, casting or assembly for one product.'],
    ['plating', 'Plating', 'Plating or surface-treatment cost for one product.'],
    ['packaging', 'Packaging', 'Packaging cost allocated to one product.'],
    ['other', 'Other', 'Any other direct product cost.']
  ];
  const gemstoneNames = `Abalony shell
Amber
Amethyst
Apple Quartz
Aqua Chalcedony
Aquamarine (202)
Aventurine
Black Diamond (215)
Black Obsidian
Black-Jet (280)
Blue Chalcedony
Blue Cherry Quartz
Blue Mabe pearl
Blue Topaz
Blue Topaz Glass
Carnelian
Cetrine
Chalcedony
Cherry Quartz
Chrysocolla
Clear Glass
Clear Quartz
Coin Pearl
Coin pearl
Compresed Turquoise
Coral
Crystal (001)
Denim Chalcedony
Drusy-Blue
drusy-gold
Drusy-silver
Drusy-white
Flower Beads
Garnet
Gold fill
Gold Sand Stone
goldfill
Gray Moon stone
gray moonstone
Gray Mother of pearl Doublet
Green Amethyst
Green Aventurine
Hametite
Ice Qtz
Indian Agate
Jade
Kianite
Labradorite
Lapis
Lavender chalcedony
Lemon Quartz
Light Amethyst
Light Rose
Light Sapphire
Light Sapphire (211)
Malachite
Milky Aqua
Mixed colors
Moon Stone
Moss Agate
Mother of Pearl
Mother of pearl dublet
New Jade
Ocean
onyx
Opalite
Peach Moonstone
Pearls
Pearls plus
Peridot
Pink Amethyst
Pink Chalcedony
Pink Chalcedony
Pink Opal
Pink Pearl
Platinum Drusy
Rainbow Jasper
Rainbow qtz
Red Aventurine
Red Rubby
Roman glass
Rose
Rose Quartz
Rutilated Quartz
Sapphire (206)
shell
Smokey Quartz
Sodolite
Swarovski
Swarovski - Amethyst
Swarovski - Aquamarine
Swarovski - Crystal AB
Swarovski - Golden Shadow
Swarovski - Jet
Swarovski - Light Amethyst
Swarovski - Light Rose
Swarovski - Rose
Swarovski-Amethyst+Light Amethyst
Swarovski-Aquamarine + Light Azore
swarovski-crystal rocks-black
swarovski-crystal rocks-silver
Swarovski-Golden Sadow + Light Smokey Topaz
swarovski-golden shade
Swarovski-Light Azore
Swarovski-Light Siam
Swarovski-Light Smokey Topaz
Swarovski-Siam
Syn Opal
Tanzanite (539)
Turquoise
White Agate
White Calcedony
White Drusy
White Mabe Pearl
White Quartz
White Striped Jasper
Zircon`.split('\n');
  const definitions = new Map(components.map(item => [item[0], item]));
  const active = [];
  const rates = { silver: null, gold: null };
  const TROY_GRAMS = 31.1034768;
  let stoneSequence = 0;
  const $ = id => document.getElementById(id);
  const dollars = n => '$US ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const number = element => element.value.trim() === '' ? null : Number(element.value);
  const valid = n => n !== null && Number.isFinite(n) && n >= 0;
  const value = id => $(id).value.trim();
  const put = (id, v) => { $(id).value = v ?? ''; };
  const relatedProducts = [];
  const tags = [];
  const SAMPLE_DESCRIPTION = 'A geometric statement necklace with alternating warm and cool metallic bars suspended from a fine chain.';
  const SAMPLE_HEBREW_DESCRIPTION = 'שרשרת בולטת בעיצוב גיאומטרי, עם מוטות מתכתיים בגוונים חמים וקרים לסירוגין התלויים על שרשרת עדינה.';
  let descriptionEnabled = true;
  let selectedImageName = '';
  let photoUrl = null;
  const checked = id => [...$(id).querySelectorAll('input:checked')].map(input => input.value);
  const radio = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
  function populateGemstones() {
    for (const id of ['catalogStone1', 'catalogStone2', 'catalogStone3', 'catalogStone4']) {
      const select = $(id);
      const none = document.createElement('option');
      none.value = '';
      none.textContent = 'None';
      select.append(none);
      for (const name of gemstoneNames) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.append(option);
      }
    }
  }
  function renderRelatedProducts() {
    const host = $('relatedProducts');
    host.replaceChildren();
    for (const code of relatedProducts) {
      const item = document.createElement('span');
      item.className = 'related-item';
      const text = document.createElement('span');
      text.textContent = code;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Remove related product ' + code);
      remove.addEventListener('click', () => {
        relatedProducts.splice(relatedProducts.indexOf(code), 1);
        renderRelatedProducts();
      });
      item.append(text, remove);
      host.append(item);
    }
  }
  function addRelatedProduct(code = value('relatedProductInput')) {
    const trimmed = code.trim();
    if (!trimmed || relatedProducts.some(item => item.toLowerCase() === trimmed.toLowerCase())) return;
    relatedProducts.push(trimmed);
    put('relatedProductInput', '');
    renderRelatedProducts();
  }
  function renderTags() {
    const host = $('tagList');
    host.replaceChildren();
    for (const tag of tags) {
      const item = document.createElement('span');
      item.className = 'related-item';
      const name = document.createElement('span');
      name.textContent = tag;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Remove tag ' + tag);
      remove.addEventListener('click', () => {
        tags.splice(tags.indexOf(tag), 1);
        renderTags();
      });
      item.append(name, remove);
      host.append(item);
    }
    for (const button of $('presetTags').querySelectorAll('button[data-tag]')) {
      button.setAttribute('aria-pressed', String(tags.some(tag => tag.toLowerCase() === button.dataset.tag.toLowerCase())));
    }
  }
  function addTag(tag = value('tagInput')) {
    if (!tag || tags.some(item => item.toLowerCase() === tag.toLowerCase())) return;
    tags.push(tag);
    put('tagInput', '');
    renderTags();
  }
  function togglePresetTag(tag) {
    const index = tags.findIndex(item => item.toLowerCase() === tag.toLowerCase());
    if (index < 0) tags.push(tag);
    else tags.splice(index, 1);
    renderTags();
  }
  function setDescriptionEnabled(enabled) {
    descriptionEnabled = enabled;
    $('catalogDescription').disabled = !enabled;
    $('catalogDescriptionHebrew').disabled = !enabled;
    $('toggleDescription').setAttribute('aria-checked', String(enabled));
    $('descriptionToggleLabel').textContent = enabled ? 'On' : 'Off';
    document.querySelector('.description-section').classList.toggle('is-disabled', !enabled);
  }
  function showInput(name) { return [...$('catalogShow').querySelectorAll('input')].find(input => input.value === name); }
  function updateShow(changed) {
    const all = showInput('All users');
    const registered = showInput('Only registered');
    const wholesale = showInput('Wholesale');
    const retail = showInput('Retail');
    if (changed === wholesale && wholesale.checked) { registered.checked = true; all.checked = false; }
    if (changed === all && all.checked) { registered.checked = false; wholesale.checked = false; }
    if (changed === registered && registered.checked) all.checked = false;
    if (changed === registered && !registered.checked && wholesale.checked) wholesale.checked = false;
    if (!all.checked && !registered.checked) (changed === registered ? registered : all).checked = true;
    if (!wholesale.checked && !retail.checked) (changed === wholesale ? wholesale : retail).checked = true;
    if (wholesale.checked && !registered.checked) { registered.checked = true; all.checked = false; }
    $('showStatus').textContent = wholesale.checked ? 'Wholesale is shown only to registered users.' : 'Wholesale requires Only Registered.';
  }
  function setProductPhoto(file) {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = file ? URL.createObjectURL(file) : null;
    $('productPhoto').src = photoUrl || './sample-product.png';
    $('productPhoto').alt = file ? 'Selected trial product image' : 'Sample mixed-metal necklace supplied for the prototype';
    selectedImageName = file?.name || '';
    $('catalogImageStatus').textContent = file ? file.name : '';
    $('descriptionSource').textContent = file ? 'New image selected. Write or edit the English description.' : 'Example draft for the sample image. Edit before use.';
    if (file && value('catalogDescription') === SAMPLE_DESCRIPTION) put('catalogDescription', '');
    if (file && value('catalogDescriptionHebrew') === SAMPLE_HEBREW_DESCRIPTION) {
      put('catalogDescriptionHebrew', '');
      $('hebrewSource').textContent = 'Add a Hebrew description for the new image.';
    }
  }
  function catalogSnapshot() {
    return {
      section: value('catalogSection'), sku: value('catalogCode'),
      categories: checked('catalogCategories'), metals: ['Gold', 'Silver'].filter((metal, i) => Number(value(i ? 'catalogSilverWeight' : 'catalogGoldWeight')) > 0),
      silverWeight: value('catalogSilverWeight'), goldWeight: value('catalogGoldWeight'), gemstonesWeight: value('catalogGemstonesWeight'), totalWeight: value('catalogTotalWeight'),
      gemstones: ['catalogStone1', 'catalogStone2', 'catalogStone3', 'catalogStone4'].map(value),
      sizes: value('catalogSizes'),
      status: radio('catalogStatus'), show: checked('catalogShow'), tags: tags.slice(),
      description: value('catalogDescription'), descriptionHebrew: value('catalogDescriptionHebrew'), descriptionEnabled,
      internalNote: value('catalogInternalNote'),
      imageFileName: selectedImageName, relatedProducts: relatedProducts.slice()
    };
  }
  function restoreCatalog(item = {}) {
    const section = $('catalogSection');
    for (const option of section.querySelectorAll('option[data-saved]')) option.remove();
    if (item.section && ![...section.options].some(option => option.value === item.section)) {
      const previous = document.createElement('option');
      previous.value = item.section;
      previous.textContent = item.section + ' (saved value)';
      previous.dataset.saved = 'true';
      section.append(previous);
    }
    for (const [id, key] of [
      ['catalogSection','section'], ['catalogSilverWeight','silverWeight'], ['catalogGoldWeight','goldWeight'],
      ['catalogGemstonesWeight','gemstonesWeight'], ['catalogTotalWeight','totalWeight'],
      ['catalogSizes','sizes'], ['catalogInternalNote','internalNote']
    ]) put(id, item[key] ?? '');
    put('catalogDescription', item.description ?? SAMPLE_DESCRIPTION);
    const sampleDraft = (item.description ?? SAMPLE_DESCRIPTION) === SAMPLE_DESCRIPTION;
    put('catalogDescriptionHebrew', item.descriptionHebrew ?? (sampleDraft ? SAMPLE_HEBREW_DESCRIPTION : ''));
    $('hebrewSource').textContent = value('catalogDescriptionHebrew') === SAMPLE_HEBREW_DESCRIPTION
      ? 'Translated from the sample English draft. Editable.'
      : 'Operator translation. Editable.';
    setDescriptionEnabled(item.descriptionEnabled !== false);
    put('catalogCode', item.sku ?? item.code ?? 'AVN01575');
    for (const input of $('catalogCategories').querySelectorAll('input')) input.checked = (item.categories || []).includes(input.value);
    for (const input of document.querySelectorAll('input[name="catalogStatus"]')) input.checked = input.value === (item.status || 'Active');
    const savedShow = Array.isArray(item.show) ? item.show : [item.audience || 'All users', 'Retail'];
    for (const input of $('catalogShow').querySelectorAll('input')) input.checked = savedShow.includes(input.value);
    updateShow();
    tags.splice(0, tags.length, ...(Array.isArray(item.tags) ? item.tags : []));
    put('tagInput', '');
    renderTags();
    for (let i = 0; i < 4; i++) put('catalogStone' + (i + 1), item.gemstones?.[i] ?? '');
    relatedProducts.splice(0, relatedProducts.length, ...(Array.isArray(item.relatedProducts) ? item.relatedProducts : []));
    renderRelatedProducts();
    $('catalogImage').value = '';
    setProductPhoto(null);
    selectedImageName = item.imageFileName || '';
    if (selectedImageName) {
      $('catalogImageStatus').textContent = `Re-select image: ${selectedImageName}`;
      $('descriptionSource').textContent = 'Description saved with this entry. Re-select the image to preview it.';
    }
    $('productCodePreview').textContent = value('catalogCode') || 'AVN01575';
    $('pictureSku').textContent = value('catalogCode') || 'AVN01575';
  }

  function componentInput(id) { return $('component-' + id); }
  const entered = input => input && valid(number(input));
  const legacyAmount = id => { const input = $('legacy-' + id); return entered(input) ? number(input) : 0; };
  function metalAmount(id) {
    const grams = number($('grams-' + id));
    const spot = id === 'brass' ? number($('spot-brass')) : rates[id]?.usdPerGram ?? null;
    const markup = number($('dealerMarkup'));
    return valid(grams) && valid(spot) && valid(markup) ? grams * spot * (1 + markup / 100) : legacyAmount(id);
  }
  function stones() {
    return [...document.querySelectorAll('.stone-row')].map(row => ({
      type: row.querySelector('.stone-type').value.trim(),
      quantity: row.querySelector('.stone-quantity').value.trim(),
      carats: row.querySelector('.stone-carats').value.trim(),
      pricePerCarat: row.querySelector('.stone-price').value.trim()
    }));
  }
  function stoneAmount(stone) {
    const q = Number(stone.quantity), ct = Number(stone.carats), price = Number(stone.pricePerCarat);
    const markup = number($('dealerMarkup'));
    return stone.quantity !== '' && stone.carats !== '' && stone.pricePerCarat !== '' && [q, ct, price, markup].every(valid) ? q * ct * price * (1 + markup / 100) : 0;
  }
  function componentAmount(id) {
    if (['silver', 'gold', 'brass'].includes(id)) return metalAmount(id);
    if (id === 'gemstones') return stones().some(stone => stone.type && stone.quantity !== '' && stone.carats !== '' && stone.pricePerCarat !== '')
      ? stones().reduce((sum, stone) => sum + stoneAmount(stone), 0) : legacyAmount(id);
    const n = number(componentInput(id));
    return valid(n) ? n : 0;
  }
  function subtotal() {
    return active.reduce((sum, id) => sum + componentAmount(id), 0);
  }
  function hasEnteredComponent() {
    return active.some(id => {
      if (['silver', 'gold', 'brass'].includes(id)) return entered($('legacy-' + id)) || (entered($('grams-' + id)) && (id === 'brass' ? entered($('spot-brass')) : !!rates[id]));
      if (id === 'gemstones') return entered($('legacy-' + id)) || stones().some(stone => stone.type && [stone.quantity, stone.carats, stone.pricePerCarat].every(v => v !== '' && valid(Number(v))));
      return entered(componentInput(id));
    });
  }
  function field(parent, label, id, saved = '', prefix = '', suffix = '') {
    const wrap = document.createElement('div');
    wrap.className = 'component-subfield';
    const caption = document.createElement('label');
    caption.htmlFor = id;
    caption.textContent = label;
    const box = document.createElement('div');
    box.className = 'input-money';
    if (prefix) { const p = document.createElement('span'); p.textContent = prefix; box.append(p); }
    const input = document.createElement('input');
    input.id = id;
    input.type = 'number';
    input.min = '0';
    input.step = 'any';
    input.inputMode = 'decimal';
    input.value = saved;
    box.append(input);
    if (suffix) { const s = document.createElement('small'); s.textContent = suffix; box.append(s); }
    wrap.append(caption, box);
    parent.append(wrap);
    return input;
  }
  async function refreshMetal(id) {
    const state = $('rate-' + id);
    state.textContent = 'Loading Gold API spot quote…';
    try {
      const symbol = id === 'gold' ? 'XAU' : 'XAG';
      const response = await fetch('https://api.gold-api.com/price/' + symbol, { cache: 'no-store' });
      if (!response.ok) throw new Error('Quote unavailable');
      const data = await response.json();
      if (data.currency !== 'USD' || !Number.isFinite(Number(data.price)) || Number(data.price) <= 0) throw new Error('Invalid quote');
      if (!active.includes(id)) return;
      rates[id] = { usdPerGram: Number(data.price) / TROY_GRAMS, updatedAt: data.updatedAt || new Date().toISOString(), provider: 'Gold API' };
      update();
    } catch {
      if (!active.includes(id)) return;
      rates[id] = null;
      state.textContent = 'Gold API unavailable. Live cost paused; retry quote.';
      update();
    }
  }
  function addStone(saved = {}) {
    const host = $('stoneRows');
    if (!host) return;
    const row = document.createElement('div');
    row.className = 'stone-row';
    const key = ++stoneSequence;
    const typeWrap = document.createElement('div');
    typeWrap.className = 'component-subfield';
    const label = document.createElement('label');
    label.htmlFor = 'stone-type-' + key;
    label.textContent = 'Gemstone';
    const type = document.createElement('select');
    type.id = 'stone-type-' + key;
    type.className = 'text-input stone-type';
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'Choose gemstone';
    type.append(blank);
    for (const gemstone of gemstoneNames) {
      const option = document.createElement('option');
      option.value = gemstone;
      option.textContent = gemstone;
      type.append(option);
    }
    if (saved.type && !gemstoneNames.includes(saved.type)) {
      const previous = document.createElement('option');
      previous.value = saved.type;
      previous.textContent = saved.type + ' (saved value)';
      type.append(previous);
    }
    type.value = saved.type || '';
    typeWrap.append(label, type);
    row.append(typeWrap);
    for (const [name, suffix, klass, val] of [
      ['Number', 'stones', 'stone-quantity', saved.quantity],
      ['Size each', 'ct', 'stone-carats', saved.carats],
      ['Supplier quote', '$US / ct', 'stone-price', saved.pricePerCarat]
    ]) {
      const input = field(row, name, 'stone-' + klass + '-' + key, val || '', '', suffix);
      input.classList.add(klass);
    }
    const result = document.createElement('strong');
    result.className = 'stone-amount';
    result.textContent = dollars(0);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'link-button';
    remove.textContent = 'Remove stone';
    remove.addEventListener('click', () => { row.remove(); update(); });
    row.append(result, remove);
    host.append(row);
    update();
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
  function addComponent(id, amount = '', detail = {}) {
    if (!definitions.has(id) || active.includes(id)) return;
    const [, label, description] = definitions.get(id);
    const row = document.createElement('div');
    row.className = 'component-field' + (['silver', 'gold', 'brass', 'gemstones'].includes(id) ? ' detailed-component' : '');
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
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-component';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remove ' + label);
    remove.addEventListener('click', () => removeComponent(id));
    row.append(name);
    if (['silver', 'gold', 'brass'].includes(id)) {
      const fields = document.createElement('div');
      fields.className = 'metal-fields';
      field(fields, 'Weight', 'grams-' + id, detail.grams ?? '', '', 'g');
      if (id === 'brass') {
        field(fields, 'Supplier quote', 'spot-brass', detail.spot ?? '', '$US', '/ g');
        const note = document.createElement('small');
        note.className = 'rate-note';
        note.textContent = 'Brass · supplier quote in $US/g. No standard brass spot feed.';
        fields.append(note);
      } else {
        const quote = document.createElement('div');
        quote.className = 'metal-quote';
        const status = document.createElement('span');
        status.id = 'rate-' + id;
        status.className = 'rate-note';
        status.textContent = 'Loading Gold API spot quote…';
        const refresh = document.createElement('button');
        refresh.type = 'button';
        refresh.className = 'link-button';
        refresh.textContent = 'Refresh quote';
        refresh.addEventListener('click', () => refreshMetal(id));
        quote.append(status, refresh);
        fields.append(quote);
      }
      const amount = document.createElement('strong');
      amount.id = 'amount-' + id;
      amount.className = 'metal-amount';
      amount.textContent = dollars(0);
      fields.append(amount);
      row.append(fields);
    } else if (id === 'gemstones') {
      const fields = document.createElement('div');
      fields.className = 'gemstone-fields';
      const note = document.createElement('p');
      note.className = 'helper';
      note.textContent = 'Supplier quote by type, size and quality. Number × carats per stone × $US per carat, plus dealer markup.';
      const list = document.createElement('div');
      list.id = 'stoneRows';
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn btn-secondary';
      add.textContent = '+ Add gemstone';
      add.addEventListener('click', () => addStone());
      fields.append(note, list, add);
      row.append(fields);
    } else {
      const money = document.createElement('div');
      money.className = 'input-money';
      const symbol = document.createElement('span');
      symbol.textContent = '$US';
      const input = document.createElement('input');
      input.id = 'component-' + id;
      input.type = 'number';
      input.min = '0';
      input.step = '0.01';
      input.inputMode = 'decimal';
      input.placeholder = '0.00';
      input.value = amount;
      money.append(symbol, input);
      row.append(money);
    }
    if (['silver', 'gold', 'brass', 'gemstones'].includes(id) && ((detail.legacyAmount ?? '') !== '' || (amount !== '' && !Object.keys(detail).length))) {
      const legacy = document.createElement('div');
      legacy.className = 'legacy-field';
      const note = document.createElement('small');
      note.textContent = 'Earlier saved amount. Enter the detailed inputs above to replace it.';
      field(legacy, 'Previously entered amount', 'legacy-' + id, detail.legacyAmount ?? amount, '$US');
      legacy.append(note);
      row.append(legacy);
    }
    row.append(remove);
    active.push(id);
    $('componentFields').append(row);
    syncEmptyComponents();
    syncPicker();
    $('dealerMarkupRow').hidden = !active.some(x => ['silver', 'gold', 'brass', 'gemstones'].includes(x));
    if (id !== 'brass' && ['silver', 'gold'].includes(id)) {
      if (detail.rate?.usdPerGram > 0) rates[id] = detail.rate;
      else refreshMetal(id);
    }
    if (id === 'gemstones') for (const stone of detail.stones || []) addStone(stone);
    update();
  }
  function removeComponent(id) {
    const index = active.indexOf(id);
    if (index < 0) return;
    active.splice(index, 1);
    if (rates[id]) rates[id] = null;
    $('componentFields').querySelector('[data-component="' + id + '"]').remove();
    syncEmptyComponents();
    syncPicker();
    $('dealerMarkupRow').hidden = !active.some(x => ['silver', 'gold', 'brass', 'gemstones'].includes(x));
    $('componentsStatus').textContent = '';
    update();
  }
  function clearComponents() {
    active.length = 0;
    rates.silver = rates.gold = null;
    $('componentFields').replaceChildren();
    syncEmptyComponents();
    syncPicker();
    $('dealerMarkupRow').hidden = true;
  }
  function update() {
    for (const id of ['gold', 'silver']) {
      const state = $('rate-' + id);
      if (state && rates[id]) {
        const rate = rates[id];
        const markup = number($('dealerMarkup'));
        state.textContent = `Gold API spot ${dollars(rate.usdPerGram)}/g · ${new Date(rate.updatedAt).toLocaleString()}${valid(markup) ? ` · with markup ${dollars(rate.usdPerGram * (1 + markup / 100))}/g` : ''}`;
      }
    }
    for (const id of ['gold', 'silver', 'brass']) {
      const amount = $('amount-' + id);
      if (amount) amount.textContent = dollars(metalAmount(id));
    }
    for (const row of document.querySelectorAll('.stone-row')) {
      const stone = { quantity: row.querySelector('.stone-quantity').value, carats: row.querySelector('.stone-carats').value, pricePerCarat: row.querySelector('.stone-price').value };
      row.querySelector('.stone-amount').textContent = dollars(stoneAmount(stone));
    }
    $('componentSubtotal').textContent = dollars(subtotal());
    $('adoptSubtotal').disabled = !hasEnteredComponent();
    const cost = number($('totalCost'));
    const base = number($('commercialBase'));
    const wholesale = number($('wholesaleMultiplier'));
    const retail = number($('retailMultiplier'));
    const wholesaleAmount = valid(base) && valid(wholesale) ? base * wholesale : null;
    const retailAmount = valid(base) && valid(retail) ? base * retail : null;
    $('costOverview').textContent = valid(cost) ? dollars(cost) : dollars(0);
    $('wholesaleOverview').textContent = valid(wholesaleAmount) ? dollars(wholesaleAmount) : dollars(0);
    $('retailOverview').textContent = valid(retailAmount) ? dollars(retailAmount) : dollars(0);
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
      components: Object.fromEntries(active.map(id => [id, ['silver', 'gold', 'brass', 'gemstones'].includes(id) ? componentAmount(id).toFixed(2) : componentInput(id).value.trim()])),
      dealerMarkup: value('dealerMarkup'),
      componentDetails: Object.fromEntries(active.map(id => [id,
        id === 'gemstones' ? { stones: stones(), legacyAmount: $('legacy-' + id)?.value ?? '' } :
        ['silver', 'gold', 'brass'].includes(id) ? { grams: value('grams-' + id), spot: id === 'brass' ? value('spot-brass') : '', rate: rates[id], legacyAmount: $('legacy-' + id)?.value ?? '' } : {}
      ])),
      catalog: catalogSnapshot()
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
      title.textContent = item.productReference || item.catalog?.sku || item.catalog?.code || 'Sample product';
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
    restoreCatalog(item.catalog);
    clearComponents();
    put('dealerMarkup', item.dealerMarkup ?? '5');
    const selected = Array.isArray(item.componentTypes)
      ? item.componentTypes
      : components.map(([id]) => id).filter(id => (item.components?.[id] ?? '') !== '');
    for (const id of selected) addComponent(id, item.components?.[id] ?? '', item.componentDetails?.[id] || {});
    $('costPanel').open = item.totalCost !== '';
    $('componentPanel').open = selected.length > 0;
    $('pricingPanel').open = ['commercialBase', 'wholesaleMultiplier', 'retailMultiplier'].some(id => (item[id] ?? '') !== '');
    $('catalogPanel').open = !!item.catalog;
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
    const optional = [
      ...active.filter(id => !['silver', 'gold', 'brass', 'gemstones'].includes(id)).map(componentInput),
      ...active.filter(id => ['silver', 'gold', 'brass'].includes(id)).map(id => $('grams-' + id)),
      ...(active.includes('brass') ? [$('spot-brass')] : []),
      ...document.querySelectorAll('.stone-quantity, .stone-carats, .stone-price'),
      ...document.querySelectorAll('[id^=legacy-]'),
      $('dealerMarkup'), $('commercialBase'), $('wholesaleMultiplier'), $('retailMultiplier'),
      $('catalogSilverWeight'), $('catalogGoldWeight'), $('catalogGemstonesWeight'), $('catalogTotalWeight')
    ];
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
    const catalogKeys = ['section','categories','sku','metals','silverWeight','goldWeight','gemstonesWeight','totalWeight','gemstone1','gemstone2','gemstone3','gemstone4','sizes','status','show','tags','description','descriptionHebrew','descriptionEnabled','internalNote','imageFileName','relatedProducts'];
    const keys = ['savedAt', 'productReference', ...catalogKeys, 'totalCost', ...components.map(([id]) => id), 'componentSubtotal', 'dealerMarkup', 'componentDetails', 'commercialBase', 'wholesaleMultiplier', 'wholesalePrice', 'retailMultiplier', 'retailPrice', 'feedback'];
    const quote = input => {
      const raw = String(input ?? '');
      const safe = /^\s*[=+\-@]/.test(raw) ? "'" + raw : raw;
      return '"' + safe.replaceAll('"', '""') + '"';
    };
    const rows = [keys.map(quote).join(',')];
    for (const item of list) {
      const sum = components.reduce((total, [id]) => total + (Number(item.components?.[id]) || 0), 0);
      const price = id => item.commercialBase !== '' && item[id] !== '' ? (Number(item.commercialBase) * Number(item[id])).toFixed(2) : '';
      const catalog = item.catalog || {};
      const catalogValues = [catalog.section, (catalog.categories || []).join('; '), catalog.sku ?? catalog.code, (catalog.metals || []).join('; '), catalog.silverWeight, catalog.goldWeight, catalog.gemstonesWeight, catalog.totalWeight,
        ...Array.from({ length: 4 }, (_, i) => catalog.gemstones?.[i] ?? ''), catalog.sizes, catalog.status, (catalog.show || [catalog.audience || 'All users', 'Retail']).join('; '), (catalog.tags || []).join('; '), catalog.description, catalog.descriptionHebrew, catalog.descriptionEnabled !== false, catalog.internalNote, catalog.imageFileName, (catalog.relatedProducts || []).join('; ')];
      rows.push([
        item.savedAt, item.productReference, ...catalogValues, item.totalCost,
        ...components.map(([id]) => item.components?.[id] ?? ''),
        sum.toFixed(2), item.dealerMarkup ?? '', JSON.stringify(item.componentDetails || {}), item.commercialBase, item.wholesaleMultiplier,
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
    put('dealerMarkup', '5');
    restoreCatalog();
    clearComponents();
    $('costPanel').open = false;
    $('componentPanel').open = false;
    $('pricingPanel').open = false;
    $('catalogPanel').open = false;
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
  $('openComponents').addEventListener('click', () => {
    $('componentPanel').open = true;
    $('componentPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('catalogCode').addEventListener('input', () => { $('productCodePreview').textContent = $('pictureSku').textContent = value('catalogCode') || 'AVN01575'; });
  $('catalogShow').addEventListener('change', event => { if (event.target.matches('input[type=checkbox]')) updateShow(event.target); });
  $('addTag').addEventListener('click', () => addTag());
  $('tagInput').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } });
  $('presetTags').addEventListener('click', event => { const button = event.target.closest('button[data-tag]'); if (button) togglePresetTag(button.dataset.tag); });
  $('toggleDescription').addEventListener('click', () => setDescriptionEnabled(!descriptionEnabled));
  $('catalogDescription').addEventListener('input', () => {
    if (value('catalogDescription') === SAMPLE_DESCRIPTION) {
      if (!value('catalogDescriptionHebrew')) put('catalogDescriptionHebrew', SAMPLE_HEBREW_DESCRIPTION);
      $('hebrewSource').textContent = 'Translated from the sample English draft. Editable.';
    } else if (value('catalogDescriptionHebrew') === SAMPLE_HEBREW_DESCRIPTION) {
      put('catalogDescriptionHebrew', '');
      $('hebrewSource').textContent = 'English draft changed. Enter a Hebrew translation.';
    }
  });
  $('catalogImage').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file && !file.type.startsWith('image/')) {
      event.target.value = '';
      $('catalogImageStatus').textContent = 'Choose an image file.';
      return;
    }
    setProductPhoto(file || null);
  });
  $('addRelatedProduct').addEventListener('click', () => addRelatedProduct());
  $('relatedProductInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); addRelatedProduct(); }
  });
  document.addEventListener('input', event => {
    if (event.target.matches('input[type=number], .stone-type')) update();
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
  populateGemstones();
  renderTags();
  syncPicker();
  display();
  update();
})();
