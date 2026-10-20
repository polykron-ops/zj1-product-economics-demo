(() => {
  'use strict';

  const KEY = 'zj1-medusa-product-trial-v1';
  const components = [
    ['silver', 'Silver (925)', 'Silver 925 alloy weight × 92.5% fine-metal content × Gold API pure-silver spot rate × dealer markup. Adjust fineness only when needed.'],
    ['gold', 'Gold', 'Choose 14K, 18K or custom fineness. Alloy weight × fine-gold content × Gold API pure-gold spot rate × dealer markup.'],
    ['brass', 'Brass', 'Weight in grams × your supplier quote per gram × dealer markup.'],
    ['gemstones', 'Gemstones', 'Each stone type, count and size uses its supplier quote per carat plus dealer markup. Setting labour belongs under Production.'],
    ['findings', 'Findings / clasps', 'Supplier or stock rate per finding. Add only the quantity used.'],
    ['production', 'Production labour', 'Workshop hours or units × labour rate. Keep metal and setting costs separate.'],
    ['plating', 'Gold plating', 'Use an all-in plating service rate; do not add its gold materials again under Gold.'],
    ['setting', 'Stone setting', 'Setting labour or per-stone service rate; gemstones themselves are separate.'],
    ['overhead', 'Factory overhead', 'Allocated manufacturing overhead per product or batch unit.'],
    ['other', 'Other manufacturing costs', 'Other direct manufacturing costs not already counted above.']
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
  let workflow = 'existing';
  const TROY_GRAMS = 31.1034768;
  let stoneSequence = 0;
  const $ = id => document.getElementById(id);
  const dollars = n => '$US ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const number = element => element.value.trim() === '' ? null : Number(element.value);
  const valid = n => n !== null && Number.isFinite(n) && n >= 0;
  const value = id => $(id).value.trim();
  const put = (id, v) => { $(id).value = v ?? ''; };
  const relatedProducts = [];
  let previewMode = 'wholesale';
  function previewUnitPrice() {
    const qty = number($('previewQty'));
    if (!Number.isInteger(qty) || qty < 1 || (previewMode === 'wholesale' && qty > 50)) return null;
    const base = number($(previewMode === 'wholesale' ? 'sketchWholesaleInput' : 'sketchRetailInput'));
    if (previewMode === 'retail') return valid(base) ? base : null;
    const tier = exceptionSnapshot('tier')
      .filter(item => item.minimum !== '' && item.wholesale !== '' && Number(item.minimum) <= qty && valid(Number(item.wholesale)))
      .sort((a, b) => Number(b.minimum) - Number(a.minimum))[0];
    return tier ? Number(tier.wholesale) : valid(base) ? base : null;
  }
  const defaultTiers = () => [
    { label: '2-10 pcs', minimum: '2', discount: '2.5', wholesale: '', priceMode: 'calculated' },
    { label: '10-50 pcs', minimum: '10', discount: '5', wholesale: '', priceMode: 'calculated' }
  ];
  const tags = ['Necklace', 'Mixed metal', 'Geometric', 'Statement'];
  const SAMPLE_DESCRIPTION = 'A geometric statement necklace with alternating warm and cool metallic bars suspended from a fine chain.';
  const SAMPLE_HEBREW_DESCRIPTION = 'שרשרת בולטת בעיצוב גיאומטרי, עם מוטות מתכתיים בגוונים חמים וקרים לסירוגין התלויים על שרשרת עדינה.';
  let descriptionEnabled = true;
  let hebrewOverride = false;
  let translationTimer = null;
  let translationRequest = null;
  let translationRevision = 0;
  let selectedImageName = '';
  let photoUrl = null;
  const checked = id => [...$(id).querySelectorAll('input:checked')].map(input => input.value);
  const radio = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
  const costBuckets = [['material', 'sketchMaterialCost'], ['directLabor', 'sketchDirectLaborCost'], ['overhead', 'sketchOverheadCost'], ['unallocated', 'sketchUnallocatedCost']];
  function syncCostBuckets() {
    const entered = costBuckets.map(([, id]) => $(id)).filter(input => input.value.trim() !== '');
    const invalid = entered.some(input => !valid(number(input)));
    const total = entered.reduce((sum, input) => sum + (valid(number(input)) ? number(input) : 0), 0);
    put('totalCost', entered.length && !invalid ? total.toFixed(2) : '');
    $('sketchTotalCostValue').textContent = invalid ? '—' : entered.length ? total.toFixed(2) : '0.00';
    $('costVerified').checked = false;
    if (entered.length && workflow === 'existing') {
      if (value('proposedWholesale') === '') put('proposedWholesale', value('existingWholesalePrice'));
      if (value('proposedRetail') === '') put('proposedRetail', value('existingRetailPrice'));
      setWorkflow('new');
    } else if (!entered.length && workflow === 'new') {
      if (value('existingWholesalePrice') === '') put('existingWholesalePrice', value('proposedWholesale'));
      if (value('existingRetailPrice') === '') put('existingRetailPrice', value('proposedRetail'));
      setWorkflow('existing');
    } else update();
  }
  function restoreCostBuckets(data = {}) {
    const prior = data.costBuckets;
    const saved = prior?.material !== undefined || prior?.directLabor !== undefined || prior?.overhead !== undefined || prior?.unallocated !== undefined
      ? prior
      : prior
        ? {
            material: ['silver', 'gold', 'gems'].some(key => prior[key] !== '' && prior[key] != null) ? ['silver', 'gold', 'gems'].reduce((sum, key) => sum + (Number(prior[key]) || 0), 0).toFixed(2) : '',
            directLabor: prior.labor ?? '',
            overhead: '',
            unallocated: prior.other ?? ''
          }
        : data.totalCost !== '' && data.totalCost != null ? { unallocated: data.totalCost } : {};
    for (const [key, id] of costBuckets) put(id, saved[key] ?? '');
    $('sketchUnallocatedCostField').hidden = value('sketchUnallocatedCost') === '';
    syncCostBuckets();
  }
  function buildSketchLayout() {
    const move = (host, node) => $(host).append(node);
    document.querySelector('.sketch-top-row').append(document.querySelector('.sketch-economics'));
    $('sketchPhotoHost').prepend($('productPhoto').closest('.image-wrap'));
    const imageRow = $('catalogImage').closest('.image-edit-row');
    move('sketchPhotoHost', $('catalogImage'));
    $('catalogImageStatus').classList.add('visually-hidden');
    move('sketchPhotoHost', $('catalogImageStatus'));
    imageRow.remove();
    $('photoImport').addEventListener('click', () => $('catalogImage').click());
    move('sketchDescriptionHost', $('toggleDescription').closest('.description-heading'));
    move('sketchDescriptionHost', $('catalogDescription').closest('.field-row'));
    $('catalogDescription').setAttribute('aria-label', 'Editable product description');
    move('sketchComponentsHost', $('componentPanel'));
    $('adoptSubtotal').textContent = 'Use subtotal in cost fields';
    move('sketchWholesaleMultiplierHost', $('newWholesaleMultiplier').closest('.input-money'));
    move('sketchRetailMultiplierHost', $('newRetailMultiplier').closest('.input-money'));
    $('newWholesaleMultiplier').setAttribute('aria-label', 'Wholesale cost multiplier');
    $('newWholesaleMultiplier').title = 'Calculates a reference suggestion only. It never changes the displayed price automatically.';
    $('newRetailMultiplier').setAttribute('aria-label', 'Retail cost multiplier');
    $('newRetailMultiplier').title = 'Calculates a reference suggestion only. It never changes the displayed price automatically.';
    move('sketchTierHost', $('tierRows'));
    move('sketchCustomerHost', $('customerPriceRows'));
    const attributeControls = [
      ['sketchCategoriesHost', $('catalogCategories').closest('fieldset')],
      ['sketchGemstonesHost', $('catalogStone1').closest('.field-row')],
      ['sketchNoteHost', $('catalogInternalNote').closest('.field-row')],
      ['sketchSectionHost', $('catalogSection').closest('.field-row')],
      ['sketchSizeHost', $('catalogSizes').closest('.field-row')],
      ['sketchSkuHost', $('catalogCode').closest('.field-row')],
      ['sketchStatusHost', document.querySelector('input[name="catalogStatus"]').closest('fieldset')],
      ['sketchTagsHost', $('tagInput').closest('.field-row')],
      ['sketchVisibleHost', $('catalogShow').closest('fieldset')],
      ['sketchWeightHost', $('catalogSilverWeight').closest('.weight-row')]
    ];
    for (const [host, control] of attributeControls) move(host, control);
    $('sketchAddTier').addEventListener('click', () => $('addTier').click());
    $('sketchAddCustomer').addEventListener('click', () => $('addCustomerPrice').click());
    $('sketchTitleInput').addEventListener('input', refreshMedusaViews);
    document.querySelectorAll('.related-slot-sku').forEach(input => input.addEventListener('input', () => {
      relatedProducts[Number(input.dataset.slot)] = input.value.trim();
      refreshMedusaViews();
    }));
    $('previewModeToggle').addEventListener('click', () => {
      previewMode = previewMode === 'wholesale' ? 'retail' : 'wholesale';
      $('previewCartStatus').textContent = '';
      refreshSketchViews();
    });
    $('previewQty').addEventListener('input', () => { $('previewCartStatus').textContent = ''; });
    $('previewAddCart').addEventListener('click', () => {
      const qty = number($('previewQty'));
      if (!Number.isInteger(qty) || qty < 1 || (previewMode === 'wholesale' && qty > 50)) {
        $('previewCartStatus').textContent = previewMode === 'wholesale' ? 'Enter 1–50 pcs.' : 'Enter a whole number of pcs.';
        return;
      }
      const price = previewUnitPrice();
      $('previewCartStatus').textContent = valid(price)
        ? `${qty} pcs · ${dollars(price)} each · ${dollars(qty * price)} total (preview only)`
        : 'Enter a displayed price to preview the cart total.';
    });
    document.querySelectorAll('.sketch-attributes').forEach(panel => {
      const attributeRows = [...panel.querySelectorAll('.sketch-attribute-list details')];
      const button = panel.querySelector('.expand-attributes');
      const syncExpandAll = () => {
        const allOpen = attributeRows.every(row => row.open);
        button.textContent = allOpen ? 'Collapse All' : 'Expand All';
        button.setAttribute('aria-expanded', String(allOpen));
      };
      button.addEventListener('click', () => {
        const open = attributeRows.some(row => !row.open);
        attributeRows.forEach(row => { row.open = open; });
        syncExpandAll();
      });
      attributeRows.forEach(row => row.addEventListener('toggle', syncExpandAll));
    });
    for (const [, id] of costBuckets) $(id).addEventListener('input', syncCostBuckets);
    for (const [visible, existing, proposed] of [
      ['sketchWholesaleInput', 'existingWholesalePrice', 'proposedWholesale'],
      ['sketchRetailInput', 'existingRetailPrice', 'proposedRetail']
    ]) {
      $(visible).addEventListener('input', () => {
        put(workflow === 'existing' ? existing : proposed, value(visible));
        update();
      });
    }
    for (const [button, existing, proposed, multiplier] of [
      ['useWholesaleSuggestion', 'existingWholesalePrice', 'proposedWholesale', 'newWholesaleMultiplier'],
      ['useRetailSuggestion', 'existingRetailPrice', 'proposedRetail', 'newRetailMultiplier']
    ]) {
      $(button).addEventListener('click', () => {
        const cost = number($('totalCost')), factor = number($(multiplier));
        if (!valid(cost) || !valid(factor)) return;
        put(workflow === 'existing' ? existing : proposed, (cost * factor).toFixed(2));
        update();
      });
    }
  }
  function refreshSketchViews() {
    const copy = (target, source) => { $(target).textContent = $(source).textContent; };
    for (const [target, source] of [
      ['sketchSkuRow', 'productCodePreview'],
      ['sketchStatusRow', 'statusBadge'],
      ['sketchSectionRow', 'sectionPreview'],
      ['sketchCategories', 'categoriesPreview'], ['sketchGemstones', 'gemstonesPreview'],
      ['sketchNote', 'notePreview'], ['sketchRelated', 'relatedPreview'],
      ['sketchSize', 'sizesPreview'], ['sketchTagsRow', 'tagsPreview'],
      ['sketchVisible', 'overviewShow'], ['sketchWeight', 'weightsPreview']
    ]) copy(target, source);
    const display = [
      ['sketchWholesaleInput', workflow === 'existing' ? 'existingWholesalePrice' : 'proposedWholesale'],
      ['sketchRetailInput', workflow === 'existing' ? 'existingRetailPrice' : 'proposedRetail']
    ];
    for (const [target, source] of display) if ($(target).value !== value(source)) put(target, value(source));
    $('previewModeToggle').textContent = previewMode === 'wholesale' ? 'Wholesale' : 'Retail';
    $('previewModeToggle').setAttribute('aria-label', `Preview ${previewMode}; switch to ${previewMode === 'wholesale' ? 'Retail' : 'Wholesale'}`);
    $('previewPriceLabel').textContent = previewMode === 'wholesale' ? 'Select Qty to Display Volume Pricing' : 'Retail Price';
    $('previewQty').max = previewMode === 'wholesale' ? '50' : '';
    const previewPrice = previewUnitPrice();
    $('sketchPreviewPrice').textContent = valid(previewPrice) ? dollars(previewPrice) : '$US 0.00';
    const cost = number($('totalCost'));
    for (const [textId, buttonId, multiplierId] of [
      ['sketchWholesaleSuggestion', 'useWholesaleSuggestion', 'newWholesaleMultiplier'],
      ['sketchRetailSuggestion', 'useRetailSuggestion', 'newRetailMultiplier']
    ]) {
      const factor = number($(multiplierId));
      const ready = valid(cost) && valid(factor);
      $(textId).textContent = ready ? dollars(cost * factor) : '$US 0.00';
      $(buttonId).disabled = !ready;
    }
  }
  buildSketchLayout();
  function setWorkflow(next) {
    workflow = next === 'new' ? 'new' : 'existing';
    $('existingWorkflow').hidden = workflow !== 'existing';
    $('newWorkflow').hidden = workflow !== 'new';
    document.querySelector(`input[name="workflow"][value="${workflow}"]`).checked = true;
    $('trialWorkflowPreview').textContent = workflow === 'existing' ? 'Existing product' : 'New product';
    update();
  }
  function addExceptionRow(kind, saved = {}) {
    const host = $(kind === 'tier' ? 'tierRows' : 'customerPriceRows');
    const row = document.createElement('div');
    row.className = 'exception-row';
    row.dataset.kind = kind;
    const fields = kind === 'tier'
      ? [['label', 'Tier name', 'text'], ['minimum', 'Minimum units', 'number'], ['discount', 'Discount %', 'number'], ['wholesale', 'Wholesale price', 'number']]
      : [['customer', 'Customer / company', 'text'], ['wholesale', 'Wholesale price', 'number'], ['retail', 'Retail price', 'number']];
    for (const [name, label, type] of fields) {
      const wrap = document.createElement('label');
      wrap.className = 'exception-field';
      wrap.textContent = label;
      const input = document.createElement('input');
      input.className = 'text-input';
      input.dataset.name = name;
      input.type = type;
      if (type === 'number') { input.min = name === 'minimum' ? '1' : '0'; input.step = name === 'minimum' ? '1' : '0.01'; if (name === 'discount') input.max = '100'; }
      input.value = saved[name] ?? '';
      wrap.append(input);
      row.append(wrap);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'link-button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => { row.remove(); update(); });
    row.append(remove);
    host.append(row);
    if (kind === 'tier') {
      row.dataset.priceMode = saved.priceMode || (saved.wholesale !== undefined && saved.wholesale !== '' ? 'manual' : saved.discount !== undefined ? 'calculated' : 'manual');
      row.querySelector('[data-name="wholesale"]').addEventListener('input', () => { row.dataset.priceMode = 'manual'; });
      row.querySelector('[data-name="discount"]').addEventListener('input', () => { row.dataset.priceMode = 'calculated'; syncCalculatedTiers(); update(); });
      syncCalculatedTiers();
    }
    update();
  }
  function syncCalculatedTiers() {
    const base = number($(workflow === 'existing' ? 'existingWholesalePrice' : 'proposedWholesale'));
    for (const row of $('tierRows').querySelectorAll('.exception-row[data-price-mode="calculated"]')) {
      const discount = number(row.querySelector('[data-name="discount"]'));
      row.querySelector('[data-name="wholesale"]').value = valid(base) && valid(discount) && discount <= 100
        ? (base * (1 - discount / 100)).toFixed(2) : '';
    }
  }
  function exceptionSnapshot(kind) {
    return [...$(kind === 'tier' ? 'tierRows' : 'customerPriceRows').querySelectorAll('.exception-row')].map(row =>
      ({ ...Object.fromEntries([...row.querySelectorAll('[data-name]')].map(input => [input.dataset.name, input.value.trim()])), ...(kind === 'tier' ? { priceMode: row.dataset.priceMode } : {}) }));
  }
  function restoreExceptions(tiers = [], customers = []) {
    $('tierRows').replaceChildren();
    $('customerPriceRows').replaceChildren();
    for (const tier of tiers) addExceptionRow('tier', tier);
    for (const customer of customers) addExceptionRow('customer', customer);
  }
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
    document.querySelectorAll('.related-slot-sku').forEach((input, i) => { input.value = relatedProducts[i] || ''; });
    for (const code of relatedProducts.filter(Boolean)) {
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
    refreshMedusaViews();
  }
  function addRelatedProduct(code = value('relatedProductInput')) {
    const trimmed = code.trim();
    if (!trimmed || relatedProducts.some(item => item && item.toLowerCase() === trimmed.toLowerCase())) return;
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
    refreshMedusaViews();
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
    $('sketchDescriptionHost').classList.toggle('is-disabled', !enabled);
    $('revertHebrew').disabled = !enabled || !hebrewOverride;
    if (!enabled) cancelTranslation();
    else if (!hebrewOverride && !value('catalogDescriptionHebrew') && value('catalogDescription')) scheduleHebrewTranslation();
    refreshMedusaViews();
  }
  function cancelTranslation() {
    translationRevision++;
    clearTimeout(translationTimer);
    translationTimer = null;
    if (translationRequest) translationRequest.abort();
    translationRequest = null;
  }
  function scheduleHebrewTranslation(immediate = false) {
    cancelTranslation();
    if (!descriptionEnabled || hebrewOverride) return;
    const english = value('catalogDescription');
    if (!english) {
      put('catalogDescriptionHebrew', '');
      $('hebrewSource').textContent = 'Enter English text to translate.';
      return;
    }
    if (english === SAMPLE_DESCRIPTION) {
      put('catalogDescriptionHebrew', SAMPLE_HEBREW_DESCRIPTION);
      $('hebrewSource').textContent = 'Translated from the sample English draft. Editable.';
      return;
    }
    put('catalogDescriptionHebrew', '');
    if (english.length > 500) {
      $('hebrewSource').textContent = 'Automatic translation supports up to 500 characters. Shorten the English draft or edit Hebrew directly.';
      return;
    }
    $('hebrewSource').textContent = 'Translating English to Hebrew…';
    const revision = translationRevision;
    translationTimer = setTimeout(async () => {
      const controller = new AbortController();
      translationRequest = controller;
      try {
        const url = new URL('https://api.mymemory.translated.net/get');
        url.searchParams.set('q', english);
        url.searchParams.set('langpair', 'en|he');
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Translation service unavailable');
        const data = await response.json();
        const translated = data.responseData?.translatedText;
        if (Number(data.responseStatus) !== 200 || typeof translated !== 'string' || !translated.trim()) throw new Error('No translation returned');
        if (revision !== translationRevision || hebrewOverride || value('catalogDescription') !== english) return;
        put('catalogDescriptionHebrew', translated);
        $('hebrewSource').textContent = 'Automatically translated by MyMemory. Edit Hebrew to override.';
      } catch (error) {
        if (revision === translationRevision && !hebrewOverride && error.name !== 'AbortError') {
          $('hebrewSource').textContent = 'Translation unavailable. Enter Hebrew manually or retry by editing English.';
        }
      } finally {
        if (revision === translationRevision) translationRequest = null;
      }
    }, immediate ? 0 : 600);
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
    refreshMedusaViews();
  }
  function setProductPhoto(file) {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = file ? URL.createObjectURL(file) : null;
    $('productPhoto').src = photoUrl || './sample-product.png';
    $('productPhoto').alt = file ? 'Selected trial product image' : 'Mixed Metal Bar Necklace supplied for the prototype';
    selectedImageName = file?.name || '';
    $('catalogImageStatus').textContent = file ? file.name : '';
    $('descriptionSource').textContent = file ? 'New image selected. Write or edit the English description.' : 'Example draft for the sample image. Edit before use.';
    if (file && value('catalogDescription') === SAMPLE_DESCRIPTION) put('catalogDescription', '');
    if (file && value('catalogDescriptionHebrew') === SAMPLE_HEBREW_DESCRIPTION) {
      cancelTranslation();
      put('catalogDescriptionHebrew', '');
      $('hebrewSource').textContent = 'Add a Hebrew description for the new image.';
      hebrewOverride = false;
      $('revertHebrew').disabled = true;
    }
    refreshMedusaViews();
  }
  function catalogSnapshot() {
    return {
      section: value('catalogSection'), sku: value('catalogCode'), title: value('sketchTitleInput'),
      categories: checked('catalogCategories'), metals: ['Gold', 'Silver'].filter((metal, i) => Number(value(i ? 'catalogSilverWeight' : 'catalogGoldWeight')) > 0),
      silverWeight: value('catalogSilverWeight'), goldWeight: value('catalogGoldWeight'), gemstonesWeight: value('catalogGemstonesWeight'), totalWeight: value('catalogTotalWeight'),
      gemstones: ['catalogStone1', 'catalogStone2', 'catalogStone3', 'catalogStone4'].map(value),
      sizes: value('catalogSizes'),
      status: radio('catalogStatus'), show: checked('catalogShow'), tags: tags.slice(),
      description: value('catalogDescription'), descriptionHebrew: value('catalogDescriptionHebrew'), descriptionEnabled, hebrewOverride,
      internalNote: value('catalogInternalNote'),
      imageFileName: selectedImageName, relatedProducts: relatedProducts.slice()
    };
  }
  function restoreCatalog(item = {}) {
    cancelTranslation();
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
    ]) put(id, item[key] ?? (id === 'catalogSection' ? 'Necklaces' : ''));
    put('catalogDescription', item.description ?? SAMPLE_DESCRIPTION);
    put('sketchTitleInput', item.title ?? 'Mixed Metal Bar Necklace');
    const sampleDraft = (item.description ?? SAMPLE_DESCRIPTION) === SAMPLE_DESCRIPTION;
    put('catalogDescriptionHebrew', item.descriptionHebrew ?? (sampleDraft ? SAMPLE_HEBREW_DESCRIPTION : ''));
    hebrewOverride = item.hebrewOverride ?? (!!item.descriptionHebrew && item.descriptionHebrew !== SAMPLE_HEBREW_DESCRIPTION);
    $('hebrewSource').textContent = hebrewOverride
      ? 'Operator Hebrew override. Revert to translation to replace it.'
      : sampleDraft ? 'Translated from the sample English draft. Editable.' : 'Saved Hebrew translation. Editable.';
    setDescriptionEnabled(item.descriptionEnabled !== false);
    put('catalogCode', item.sku ?? item.code ?? 'AVN01575');
    for (const input of $('catalogCategories').querySelectorAll('input')) input.checked = (item.categories || []).includes(input.value);
    for (const input of document.querySelectorAll('input[name="catalogStatus"]')) input.checked = input.value === (item.status || 'Active');
    const savedShow = Array.isArray(item.show) ? item.show : [item.audience || 'All users', 'Retail'];
    for (const input of $('catalogShow').querySelectorAll('input')) input.checked = savedShow.includes(input.value);
    updateShow();
    tags.splice(0, tags.length, ...(Array.isArray(item.tags) ? item.tags : ['Necklace', 'Mixed metal', 'Geometric', 'Statement']));
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
    refreshMedusaViews();
  }

  function refreshMedusaViews() {
    const fallback = text => text || '—';
    const sku = value('catalogCode') || 'AVN01575';
    const section = value('catalogSection');
    const status = radio('catalogStatus') || 'Active';
    const stones = ['catalogStone1', 'catalogStone2', 'catalogStone3', 'catalogStone4'].map(value).filter(Boolean);
    const weights = [['Silver', 'catalogSilverWeight'], ['Gold', 'catalogGoldWeight'], ['Gemstones', 'catalogGemstonesWeight'], ['Total', 'catalogTotalWeight']]
      .filter(([, id]) => value(id) !== '').map(([label, id]) => `${label} ${value(id)} g`);
    $('productCodePreview').textContent = sku;
    document.querySelector('.overview-title-line > strong').textContent = value('sketchTitleInput') || 'Untitled product';
    $('sectionPreview').textContent = section || 'Not set';
    $('overviewShow').textContent = checked('catalogShow').join(' · ') || 'Not set';
    $('overviewSize').textContent = value('catalogSizes') || 'Not set';
    $('overviewGemstones').textContent = stones.join(', ') || 'None';
    $('overviewWeight').textContent = weights.join(' · ') || 'Not entered';
    $('overviewCategories').textContent = checked('catalogCategories').join(', ') || 'None';
    $('overviewTags').textContent = tags.join(', ') || 'None';
    $('descriptionPreview').textContent = descriptionEnabled ? fallback(value('catalogDescription')) : 'Description off';
    $('statusBadge').textContent = status;
    $('statusBadge').classList.toggle('inactive', status === 'Inactive');
    $('availabilityPreview').textContent = [status, ...checked('catalogShow')].join(' · ');
    $('organizationPreview').textContent = fallback(section);
    $('categoriesPreview').textContent = fallback(checked('catalogCategories').join(', '));
    $('tagsPreview').textContent = fallback(tags.join(', '));
    $('weightsPreview').textContent = fallback(weights.join(' · '));
    $('gemstonesPreview').textContent = fallback(stones.join(', '));
    $('sizesPreview').textContent = fallback(value('catalogSizes'));
    $('relatedPreview').textContent = relatedProducts.filter(Boolean).join(', ') || 'None added';
    $('notePreview').textContent = value('catalogInternalNote') || 'Invisible to public · no note';
    refreshSketchViews();
  }

  function componentInput(id) { return $('component-' + id); }
  const entered = input => input && valid(number(input));
  const legacyAmount = id => { const input = $('legacy-' + id); return entered(input) ? number(input) : 0; };
  function metalAmount(id) {
    const grams = number($('grams-' + id));
    const spot = id === 'brass' ? number($('spot-brass')) : rates[id]?.usdPerGram ?? null;
    const markup = number($('dealerMarkup'));
    const factor = id === 'brass' ? 1 : metalFactor(id);
    return valid(grams) && valid(spot) && valid(markup) && factor !== null
      ? grams * factor * spot * (1 + markup / 100) : legacyAmount(id);
  }
  function metalFactor(id) {
    const basis = value('basis-' + id);
    if (basis === 'fine') return 1;
    if (basis !== 'alloy') return null;
    const fineness = number($('fineness-' + id));
    return valid(fineness) && fineness > 0 && fineness <= 100 ? fineness / 100 : null;
  }
  function syncFineness(id) {
    const alloy = value('basis-' + id) === 'alloy';
    $('fineness-wrap-' + id).hidden = !alloy;
    $('fineness-' + id).disabled = !alloy;
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
    const q = number($('qty-' + id)), rate = number(componentInput(id));
    return valid(q) && valid(rate) ? q * rate : 0;
  }
  function subtotal() {
    return active.reduce((sum, id) => sum + componentAmount(id), 0);
  }
  function hasEnteredComponent() {
    return active.some(id => {
      if (['silver', 'gold', 'brass'].includes(id)) return entered($('legacy-' + id)) || (entered($('grams-' + id)) && (id === 'brass' ? entered($('spot-brass')) : !!rates[id] && metalFactor(id) !== null));
      if (id === 'gemstones') return entered($('legacy-' + id)) || stones().some(stone => stone.type && [stone.quantity, stone.carats, stone.pricePerCarat].every(v => v !== '' && valid(Number(v))));
      return entered($('qty-' + id)) && value('unit-' + id) !== '' && entered(componentInput(id));
    });
  }
  function allComponentsComplete() {
    if (!active.length) return false;
    const markup = number($('dealerMarkup'));
    return active.every(id => {
      if (['silver', 'gold'].includes(id)) {
        const grams = number($('grams-' + id));
        if (grams !== null) return valid(grams) && metalFactor(id) !== null && !!rates[id] && valid(markup);
        return entered($('legacy-' + id));
      }
      if (id === 'brass') {
        const grams = number($('grams-brass'));
        if (grams !== null) return valid(grams) && entered($('spot-brass')) && valid(markup);
        return entered($('legacy-brass'));
      }
      if (id === 'gemstones') {
        const rows = stones();
        if (rows.length) return valid(markup) && rows.every(stone => stone.type &&
          [stone.quantity, stone.carats, stone.pricePerCarat].every(v => v !== '' && valid(Number(v))));
        return entered($('legacy-gemstones'));
      }
      return entered($('qty-' + id)) && value('unit-' + id) !== '' && entered(componentInput(id));
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
    const previous = rates[id];
    state.textContent = 'Loading Gold API spot quote…';
    try {
      const symbol = id === 'gold' ? 'XAU' : 'XAG';
      const response = await fetch('https://api.gold-api.com/price/' + symbol, { cache: 'no-store' });
      if (!response.ok) throw new Error('Quote unavailable');
      const data = await response.json();
      if (data.currency !== 'USD' || !Number.isFinite(Number(data.price)) || Number(data.price) <= 0) throw new Error('Invalid quote');
      if (!active.includes(id)) return;
      rates[id] = { usdPerGram: Number(data.price) / TROY_GRAMS, updatedAt: data.updatedAt || new Date().toISOString(), provider: 'Gold API' };
      $('breakdownComplete').checked = false;
      update();
    } catch {
      if (!active.includes(id)) return;
      rates[id] = previous;
      $('breakdownComplete').checked = false;
      update();
      state.textContent = previous ? state.textContent + ' · Refresh failed; saved quote retained.' : 'Gold API unavailable. Live cost paused; retry quote.';
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
    remove.addEventListener('click', () => { row.remove(); $('breakdownComplete').checked = false; update(); });
    row.append(result, remove);
    host.append(row);
    $('breakdownComplete').checked = false;
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
    $('componentFields').querySelector('.empty-components')?.remove();
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
        const basisWrap = document.createElement('div');
        basisWrap.className = 'component-subfield metal-basis';
        const basisLabel = document.createElement('label');
        basisLabel.htmlFor = 'basis-' + id;
        basisLabel.textContent = 'Weight basis';
        const basis = document.createElement('select');
        basis.id = 'basis-' + id;
        basis.className = 'text-input';
        for (const [optionValue, optionText] of [['', 'Choose basis'], ['fine', 'Fine-metal equivalent'], ['alloy', 'Alloy weight']]) {
          const option = document.createElement('option');
          option.value = optionValue;
          option.textContent = optionText;
          basis.append(option);
        }
        basis.value = detail.basis || 'alloy';
        basisWrap.append(basisLabel, basis);
        fields.append(basisWrap);
        const finenessWrap = document.createElement('div');
        finenessWrap.id = 'fineness-wrap-' + id;
        finenessWrap.className = 'component-subfield metal-fineness';
        finenessWrap.hidden = true;
        if (id === 'gold') {
          const preset = document.createElement('select');
          preset.id = 'goldPreset';
          preset.className = 'text-input';
          preset.setAttribute('aria-label', 'Gold fineness preset');
          for (const [v, label] of [['58.5','14K · 58.5%'],['75','18K · 75%'],['custom','Custom fineness']]) preset.add(new Option(label, v));
          preset.value = ['58.5','75'].includes(String(detail.fineness ?? '75')) ? String(detail.fineness ?? '75') : 'custom';
          preset.addEventListener('change', () => { if (preset.value !== 'custom') $('fineness-gold').value = preset.value; $('breakdownComplete').checked = false; update(); });
          finenessWrap.append(preset);
        }
        const finenessInput = field(finenessWrap, 'Alloy fineness', 'fineness-' + id, detail.fineness ?? (id === 'silver' ? '92.5' : '75'), '', '%');
        finenessInput.min = '0.01';
        finenessInput.max = '100';
        finenessInput.step = '0.01';
        finenessInput.placeholder = id === 'silver' ? '92.5' : '75';
        const finenessHint = document.createElement('small');
        finenessHint.className = 'rate-note';
        finenessHint.textContent = id === 'silver' ? 'Sterling 925 = 92.5%.' : '18K gold = 75%.';
        finenessWrap.append(finenessHint);
        fields.append(finenessWrap);
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
        const note = document.createElement('small');
        note.className = 'rate-note metal-estimate-note';
        note.textContent = 'Fine-metal content estimate only. Other alloy metals, production losses and making costs need separate entries.';
        fields.append(note);
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
      const fields = document.createElement('div');
      fields.className = 'generic-fields';
      field(fields, 'Quantity', 'qty-' + id, detail.quantity ?? '1');
      const unit = document.createElement('label');
      unit.className = 'component-subfield';
      unit.textContent = 'Unit';
      const unitInput = document.createElement('input');
      unitInput.id = 'unit-' + id;
      unitInput.className = 'text-input';
      unitInput.maxLength = 24;
      unitInput.value = detail.unit ?? (['production','setting'].includes(id) ? 'hour' : 'each');
      unit.append(unitInput);
      fields.append(unit);
      field(fields, 'Rate', 'component-' + id, detail.rate ?? amount, '$US', '/ unit');
      const amountView = document.createElement('strong');
      amountView.id = 'amount-' + id;
      amountView.className = 'metal-amount';
      amountView.textContent = dollars(0);
      fields.append(amountView);
      row.append(fields);
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
    if (['silver', 'gold'].includes(id)) syncFineness(id);
    $('breakdownComplete').checked = false;
    syncEmptyComponents();
    syncPicker();
    $('dealerMarkupRow').hidden = !active.some(x => ['silver', 'gold', 'brass', 'gemstones'].includes(x));
    if (['silver', 'gold'].includes(id)) {
      rates[id] = detail.rate?.usdPerGram ? detail.rate : null;
      if (!rates[id]) refreshMetal(id);
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
    $('breakdownComplete').checked = false;
    update();
  }
  function clearComponents() {
    active.length = 0;
    rates.silver = rates.gold = null;
    $('componentFields').replaceChildren();
    syncEmptyComponents();
    syncPicker();
    $('dealerMarkupRow').hidden = true;
    $('breakdownComplete').checked = false;
  }
  function update() {
    syncCalculatedTiers();
    for (const id of ['gold', 'silver']) {
      const state = $('rate-' + id);
      if (state && rates[id]) {
        const rate = rates[id];
        const markup = number($('dealerMarkup'));
        const age = Date.now() - Date.parse(rate.updatedAt);
        const freshness = Number.isFinite(age) && age >= 0 && age < 86400000 ? 'current (<24h)' : 'older saved quote';
        state.textContent = `${rate.provider || 'Gold API'} pure-metal spot ${dollars(rate.usdPerGram)}/g · ${new Date(rate.updatedAt).toLocaleString()} · ${freshness}${valid(markup) ? ` · marked-up fine-metal rate ${dollars(rate.usdPerGram * (1 + markup / 100))}/g` : ''}`;
      }
    }
    for (const id of active.filter(x => x !== 'gemstones')) {
      const amount = $('amount-' + id);
      if (amount) amount.textContent = dollars(componentAmount(id));
    }
    for (const row of document.querySelectorAll('.stone-row')) {
      const stone = { quantity: row.querySelector('.stone-quantity').value, carats: row.querySelector('.stone-carats').value, pricePerCarat: row.querySelector('.stone-price').value };
      row.querySelector('.stone-amount').textContent = dollars(stoneAmount(stone));
    }
    $('componentSubtotal').textContent = dollars(subtotal());
    const complete = hasEnteredComponent() && allComponentsComplete();
    $('breakdownComplete').disabled = !complete;
    if (!complete) $('breakdownComplete').checked = false;
    $('breakdownReadiness').textContent = complete ? 'Confirm that no applicable costs are missing.' : '';
    $('breakdownReadiness').hidden = !complete;
    $('adoptSubtotal').disabled = !complete || !$('breakdownComplete').checked;
    const cost = number($('totalCost'));
    const wholesale = number($('newWholesaleMultiplier'));
    const retail = number($('newRetailMultiplier'));
    const suggestedWholesale = valid(cost) && valid(wholesale) ? cost * wholesale : null;
    const suggestedRetail = valid(cost) && valid(retail) ? cost * retail : null;
    $('suggestedWholesale').textContent = suggestedWholesale === null ? 'Not set' : dollars(suggestedWholesale);
    $('suggestedRetail').textContent = suggestedRetail === null ? 'Not set' : dollars(suggestedRetail);
    $('copySuggestions').disabled = suggestedWholesale === null || suggestedRetail === null;
    $('costQuality').textContent = !valid(cost) ? 'Enter a total cost to calculate suggestions.' : !($('costVerified').checked) ? 'Cost not yet verified. Suggestions are provisional.' : active.length && !complete ? 'Cost checked, but the optional component breakdown is incomplete.' : active.length && Math.abs(subtotal() - cost) > .005 ? 'Cost checked, but it differs from the optional component subtotal. Review before approval.' : 'Total cost checked for this trial.';
    const proposedW = number($('proposedWholesale')), proposedR = number($('proposedRetail'));
    $('proposalStatus').textContent = proposedW === null && proposedR === null ? 'Enter display prices or copy the suggestions once.' : suggestedWholesale !== null && suggestedRetail !== null && (proposedW !== null && Math.abs(proposedW - suggestedWholesale) > .005 || proposedR !== null && Math.abs(proposedR - suggestedRetail) > .005) ? 'Display prices differ from current suggestions. Your entered prices are preserved.' : 'Display prices stay as entered when costs or multipliers change.';
    const displayWholesale = workflow === 'existing' ? number($('existingWholesalePrice')) : proposedW;
    const displayRetail = workflow === 'existing' ? number($('existingRetailPrice')) : proposedR;
    $('overviewMode').textContent = workflow === 'existing' ? 'Existing product · approved prices' : 'New product · proposed prices';
    $('overviewCost').textContent = workflow === 'existing' ? 'Not recorded' : valid(cost) ? dollars(cost) : 'Not entered';
    $('overviewWholesale').textContent = valid(displayWholesale) ? dollars(displayWholesale) : workflow === 'existing' ? 'Not entered' : 'Not set';
    $('overviewRetail').textContent = valid(displayRetail) ? dollars(displayRetail) : workflow === 'existing' ? 'Not entered' : 'Not set';
    const tierCount = $('tierRows').querySelectorAll('.exception-row').length;
    const customerCount = $('customerPriceRows').querySelectorAll('.exception-row').length;
    $('overviewExceptions').textContent = workflow === 'new' ? 'Not applicable' : [tierCount && `${tierCount} tier${tierCount === 1 ? '' : 's'}`, customerCount && `${customerCount} customer${customerCount === 1 ? '' : 's'}`].filter(Boolean).join(' · ') || 'None';
    refreshMedusaViews();
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
    const selected = active.slice();
    const details = Object.fromEntries(selected.map(id => [id,
      id === 'gemstones' ? { stones: stones(), legacyAmount: $('legacy-' + id)?.value ?? '' } :
      ['silver', 'gold', 'brass'].includes(id) ? { grams: value('grams-' + id), spot: id === 'brass' ? value('spot-brass') : '', basis: id === 'brass' ? '' : value('basis-' + id), fineness: id === 'brass' ? '' : value('fineness-' + id), rate: rates[id], legacyAmount: $('legacy-' + id)?.value ?? '' } :
      { quantity: value('qty-' + id), unit: value('unit-' + id), rate: value('component-' + id) }
    ]));
    return {
      id: crypto.randomUUID?.() ?? String(Date.now()) + '-' + String(Math.random()),
      savedAt: new Date().toISOString(),
      productReference: value('productReference'),
      feedback: value('feedback'),
      workflow,
      existing: { wholesale: value('existingWholesalePrice'), retail: value('existingRetailPrice'), tiers: exceptionSnapshot('tier'), customerPrices: exceptionSnapshot('customer') },
      newProduct: workflow === 'new' ? {
        totalCost: value('totalCost'), costBuckets: Object.fromEntries(costBuckets.map(([key, id]) => [key, value(id)])), wholesaleMultiplier: value('newWholesaleMultiplier'), retailMultiplier: value('newRetailMultiplier'), costVerified: $('costVerified').checked,
        suggestedWholesale: number($('totalCost')) * number($('newWholesaleMultiplier')),
        suggestedRetail: number($('totalCost')) * number($('newRetailMultiplier')),
        proposedWholesale: value('proposedWholesale'), proposedRetail: value('proposedRetail'),
        componentTypes: selected, components: Object.fromEntries(selected.map(id => [id, componentAmount(id).toFixed(2)])), componentDetails: details, dealerMarkup: value('dealerMarkup')
      } : null,
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
      const kind = item.workflow || 'legacy';
      const amount = kind === 'existing' ? item.existing?.wholesale : kind === 'new' ? item.newProduct?.totalCost : item.totalCost;
      cost.textContent = kind === 'existing' ? `Existing · wholesale ${amount !== '' && amount != null ? dollars(Number(amount)) : 'not set'}` : `${kind === 'legacy' ? 'Earlier entry' : 'New · cost'} ${amount !== '' && amount != null ? dollars(Number(amount)) : 'not set'}`;
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
    resetForm();
    put('productReference', item.productReference);
    put('feedback', item.feedback);
    restoreCatalog(item.catalog);
    restoreExceptions(item.existing?.tiers, item.existing?.customerPrices);
    if (item.workflow === 'existing') {
      setWorkflow('existing');
      put('existingWholesalePrice', item.existing?.wholesale);
      put('existingRetailPrice', item.existing?.retail);
    } else {
      setWorkflow('new');
      const data = item.workflow === 'new' ? item.newProduct || {} : item;
      put('newWholesaleMultiplier', item.workflow === 'new' ? data.wholesaleMultiplier : '2.00');
      put('newRetailMultiplier', item.workflow === 'new' ? data.retailMultiplier : '4.00');
      put('proposedWholesale', data.proposedWholesale);
      put('proposedRetail', data.proposedRetail);
      put('dealerMarkup', data.dealerMarkup ?? '5');
      const selected = Array.isArray(data.componentTypes) ? data.componentTypes : components.map(([id]) => id).filter(id => (data.components?.[id] ?? '') !== '');
      for (const id of selected) addComponent(id, data.components?.[id] ?? '', data.componentDetails?.[id] || {});
      if (selected.length) $('componentPanel').open = true;
      restoreCostBuckets(data);
      $('costVerified').checked = item.workflow === 'new' && data.costVerified === true;
    }
    $('saveStatus').textContent = item.workflow ? 'Saved entry opened. Saving again creates another copy.' : 'Earlier entry opened. Previous commercial-base pricing was not imported as a cost-based suggestion.';
    closeDrawer();
    update();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function save() {
    if (!value('productReference')) {
      $('saveStatus').textContent = 'Enter a product reference for this trial entry.';
      $('productReference').focus();
      return;
    }
    if (workflow === 'new' && !valid(number($('totalCost')))) {
      $('saveStatus').textContent = 'Enter valid Cost of Goods amounts before saving.';
      closeDrawer();
      (costBuckets.map(([, id]) => $(id)).find(input => input.value.trim() !== '' && !valid(number(input))) || $('sketchMaterialCost')).focus();
      return;
    }
    const optional = workflow === 'existing' ? [
      $('existingWholesalePrice'), $('existingRetailPrice'),
      ...document.querySelectorAll('.exception-row input[type=number]')
    ] : [
      $('totalCost'), ...costBuckets.map(([, id]) => $(id)), $('newWholesaleMultiplier'), $('newRetailMultiplier'), $('proposedWholesale'), $('proposedRetail'),
      ...active.filter(id => !['silver', 'gold', 'brass', 'gemstones'].includes(id)).flatMap(id => [$('qty-' + id), componentInput(id)]),
      ...active.filter(id => ['silver', 'gold', 'brass'].includes(id)).map(id => $('grams-' + id)),
      ...(active.includes('brass') ? [$('spot-brass')] : []),
      ...document.querySelectorAll('.stone-quantity, .stone-carats, .stone-price'),
      ...document.querySelectorAll('[id^=legacy-]'), $('dealerMarkup')
    ];
    optional.push(...document.querySelectorAll('.exception-row input[type=number]'));
    optional.push($('catalogSilverWeight'), $('catalogGoldWeight'), $('catalogGemstonesWeight'), $('catalogTotalWeight'));
    if (optional.some(input => input.value.trim() !== '' && !valid(number(input)))) {
      $('saveStatus').textContent = 'Amounts and multipliers must be zero or greater.';
      return;
    }
    if ([...document.querySelectorAll('#tierRows [data-name="discount"]')].some(input => input.value !== '' && Number(input.value) > 100)) {
      $('saveStatus').textContent = 'Tier discounts must be between 0% and 100%.';
      return;
    }
    if (workflow === 'new' && (!valid(number($('newWholesaleMultiplier'))) || !valid(number($('newRetailMultiplier'))))) {
      $('saveStatus').textContent = 'Enter valid wholesale and retail cost multipliers.'; return;
    }
    for (const id of workflow === 'new' ? ['silver', 'gold'] : []) {
      if (active.includes(id) && value('grams-' + id) !== '' && metalFactor(id) === null) {
        $('saveStatus').textContent = 'Choose the weight basis and, for alloy weight, a valid fineness for ' + id + '.';
        $('componentsStatus').textContent = $('saveStatus').textContent;
        closeDrawer();
        $('componentPanel').open = true;
        $(value('basis-' + id) === 'alloy' ? 'fineness-' + id : 'basis-' + id).focus();
        return;
      }
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
    const catalogKeys = ['section','categories','sku','title','metals','silverWeight','goldWeight','gemstonesWeight','totalWeight','gemstone1','gemstone2','gemstone3','gemstone4','sizes','status','show','tags','description','descriptionHebrew','descriptionEnabled','hebrewOverride','internalNote','imageFileName','relatedProducts'];
    const keys = ['id', 'savedAt', 'productReference', 'workflow', ...catalogKeys, 'approvedWholesale', 'approvedRetail', 'wholesaleTiers', 'customerPrices', 'totalProductCost', ...costBuckets.map(([key]) => key + 'Cost'), 'costVerified', ...components.map(([id]) => id), 'componentSubtotal', 'dealerMarkup', 'componentDetails', 'wholesaleCostMultiplier', 'suggestedWholesale', 'retailCostMultiplier', 'suggestedRetail', 'proposedWholesale', 'proposedRetail', 'feedback', 'earlierEntryData'];
    const quote = input => {
      const raw = String(input ?? '');
      const safe = /^\s*[=+\-@]/.test(raw) ? "'" + raw : raw;
      return '"' + safe.replaceAll('"', '""') + '"';
    };
    const rows = [keys.map(quote).join(',')];
    for (const item of list) {
      const data = item.newProduct || (item.workflow ? {} : item);
      const approved = item.existing || {};
      const sum = components.reduce((total, [id]) => total + (Number(data.components?.[id]) || 0), 0);
      const catalog = item.catalog || {};
      const catalogValues = [catalog.section, (catalog.categories || []).join('; '), catalog.sku ?? catalog.code, catalog.title ?? '', (catalog.metals || []).join('; '), catalog.silverWeight, catalog.goldWeight, catalog.gemstonesWeight, catalog.totalWeight,
        ...Array.from({ length: 4 }, (_, i) => catalog.gemstones?.[i] ?? ''), catalog.sizes, catalog.status, (catalog.show || [catalog.audience || 'All users', 'Retail']).join('; '), (catalog.tags || []).join('; '), catalog.description, catalog.descriptionHebrew, catalog.descriptionEnabled !== false, catalog.hebrewOverride === true, catalog.internalNote, catalog.imageFileName, (catalog.relatedProducts || []).join('; ')];
      rows.push([
        item.id, item.savedAt, item.productReference, item.workflow || 'earlier entry', ...catalogValues,
        approved.wholesale ?? '', approved.retail ?? '', JSON.stringify(approved.tiers || []), JSON.stringify(approved.customerPrices || []),
        data.totalCost ?? '', ...costBuckets.map(([key]) => data.costBuckets?.[key] ?? ''), data.costVerified ?? '',
        ...components.map(([id]) => data.components?.[id] ?? ''),
        data.componentTypes?.length ? sum.toFixed(2) : '', data.dealerMarkup ?? '', JSON.stringify(data.componentDetails || {}),
        data.wholesaleMultiplier ?? '', data.suggestedWholesale ?? '', data.retailMultiplier ?? '', data.suggestedRetail ?? '',
        data.proposedWholesale ?? '', data.proposedRetail ?? '', item.feedback,
        item.workflow ? '' : JSON.stringify(item)
      ].map(quote).join(','));
    }
    const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zuman-product-trial.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('saveStatus').textContent = 'Exported ' + list.length + (list.length === 1 ? ' entry.' : ' entries.');
  }
  function resetForm() {
    for (const id of ['totalCost', 'existingWholesalePrice', 'existingRetailPrice', 'proposedWholesale', 'proposedRetail', 'productReference', 'feedback']) put(id, '');
    for (const [, id] of costBuckets) put(id, '');
    $('sketchUnallocatedCostField').hidden = true;
    $('sketchTotalCostValue').textContent = '0.00';
    put('newWholesaleMultiplier', '2.00'); put('newRetailMultiplier', '4.00');
    put('dealerMarkup', '5');
    $('costVerified').checked = false;
    restoreExceptions(defaultTiers(), []);
    restoreCatalog();
    clearComponents();
    $('componentPanel').open = false;
    setWorkflow('existing');
    closeEditor();
    $('componentsStatus').textContent = '';
    $('saveStatus').textContent = 'Product fields reset. Saved entries remain available.';
    update();
  }
  function openDrawer() {
    closeEditor();
    $('trialBackdrop').hidden = false;
    $('trialDrawer').hidden = false;
    $('closeTrial').focus();
  }
  function closeDrawer() {
    $('trialBackdrop').hidden = true;
    $('trialDrawer').hidden = true;
  }

  const editorIds = ['catalogPanel'];
  function openEditor(id, focusId) {
    for (const panelId of editorIds) $(panelId).open = panelId === id;
    $('editorBackdrop').hidden = false;
    document.body.classList.add('editor-open');
    const target = focusId ? $(focusId) : $(id).querySelector('.close-editor');
    requestAnimationFrame(() => target?.focus());
  }
  function closeEditor() {
    for (const id of editorIds) $(id).open = false;
    $('editorBackdrop').hidden = true;
    document.body.classList.remove('editor-open');
  }
  for (const id of editorIds) {
    $(id).querySelector('summary').addEventListener('click', event => {
      event.preventDefault();
      if ($(id).open) closeEditor(); else openEditor(id);
    });
  }
  for (const button of document.querySelectorAll('[data-edit]')) {
    button.addEventListener('click', () => openEditor(button.dataset.edit, button.dataset.focus));
  }
  for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', closeEditor);
  $('editorBackdrop').addEventListener('click', closeEditor);

  $('componentSelect').addEventListener('change', event => {
    if (event.target.value) addComponent(event.target.value);
  });
  $('componentPanel').querySelector('.component-content').addEventListener('input', event => {
    if (event.target !== $('breakdownComplete')) $('breakdownComplete').checked = false;
    if (event.target.id === 'fineness-gold') $('goldPreset').value = ['58.5','75'].includes(value('fineness-gold')) ? value('fineness-gold') : 'custom';
    update();
  });
  $('componentPanel').querySelector('.component-content').addEventListener('change', event => {
    if (event.target.id === 'basis-silver') syncFineness('silver');
    if (event.target.id === 'basis-gold') syncFineness('gold');
    if (event.target !== $('breakdownComplete')) $('breakdownComplete').checked = false;
    update();
  });
  $('breakdownComplete').addEventListener('change', update);
  for (const input of document.querySelectorAll('input[name="workflow"]')) input.addEventListener('change', event => setWorkflow(event.target.value));
  $('addTier').addEventListener('click', () => addExceptionRow('tier'));
  $('addCustomerPrice').addEventListener('click', () => addExceptionRow('customer'));
  $('costVerified').addEventListener('change', update);
  $('totalCost').addEventListener('input', () => { $('costVerified').checked = false; update(); });
  $('copySuggestions').addEventListener('click', () => {
    const cost = number($('totalCost')), wholesale = number($('newWholesaleMultiplier')), retail = number($('newRetailMultiplier'));
    if (![cost, wholesale, retail].every(valid)) return;
    put('proposedWholesale', (cost * wholesale).toFixed(2));
    put('proposedRetail', (cost * retail).toFixed(2));
    update();
  });
  $('catalogCode').addEventListener('input', refreshMedusaViews);
  $('catalogShow').addEventListener('change', event => { if (event.target.matches('input[type=checkbox]')) updateShow(event.target); });
  $('addTag').addEventListener('click', () => addTag());
  $('tagInput').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } });
  $('presetTags').addEventListener('click', event => { const button = event.target.closest('button[data-tag]'); if (button) togglePresetTag(button.dataset.tag); });
  $('toggleDescription').addEventListener('click', () => setDescriptionEnabled(!descriptionEnabled));
  $('catalogDescription').addEventListener('input', () => {
    if (hebrewOverride) {
      $('hebrewSource').textContent = 'Operator Hebrew override preserved. Revert to translate the current English.';
      return;
    }
    scheduleHebrewTranslation();
  });
  $('catalogDescriptionHebrew').addEventListener('input', () => {
    cancelTranslation();
    hebrewOverride = true;
    $('revertHebrew').disabled = false;
    $('hebrewSource').textContent = 'Operator Hebrew override. Revert to translation to replace it.';
  });
  $('revertHebrew').addEventListener('click', () => {
    hebrewOverride = false;
    $('revertHebrew').disabled = true;
    scheduleHebrewTranslation(true);
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
    if (event.target.matches('#sketchWholesaleInput, #sketchRetailInput, #previewQty') || event.target.closest('#tierRows')) $('previewCartStatus').textContent = '';
    if (event.target.matches('input[type=number], .stone-type')) update();
    else refreshMedusaViews();
  });
  document.addEventListener('change', refreshMedusaViews);
  $('adoptSubtotal').addEventListener('click', () => {
    if (!hasEnteredComponent() || !allComponentsComplete() || !$('breakdownComplete').checked) return;
    const classified = {
      material: active.some(id => ['silver', 'gold', 'brass', 'gemstones', 'findings'].includes(id)) ? ['silver', 'gold', 'brass', 'gemstones', 'findings'].filter(id => active.includes(id)).reduce((sum, id) => sum + componentAmount(id), 0) : null,
      directLabor: active.some(id => ['production', 'setting'].includes(id)) ? ['production', 'setting'].filter(id => active.includes(id)).reduce((sum, id) => sum + componentAmount(id), 0) : null,
      overhead: active.includes('overhead') ? componentAmount('overhead') : null,
      unallocated: active.some(id => ['plating', 'other'].includes(id)) ? ['plating', 'other'].filter(id => active.includes(id)).reduce((sum, id) => sum + componentAmount(id), 0) : null
    };
    const cents = Object.fromEntries(Object.entries(classified).filter(([, amount]) => amount !== null).map(([key, amount]) => [key, Math.round(amount * 100)]));
    const difference = Math.round(subtotal() * 100) - Object.values(cents).reduce((sum, amount) => sum + amount, 0);
    if (difference) {
      const largest = Object.keys(cents).sort((a, b) => cents[b] - cents[a])[0];
      cents[largest] += difference;
    }
    for (const [key, id] of costBuckets) put(id, classified[key] === null ? '' : (cents[key] / 100).toFixed(2));
    $('sketchUnallocatedCostField').hidden = classified.unallocated === null;
    $('componentsStatus').textContent = 'Component subtotal applied to the cost fields. Displayed prices were preserved.';
    $('breakdownComplete').checked = false;
    syncCostBuckets();
  });
  $('openTrial').addEventListener('click', openDrawer);
  $('closeTrial').addEventListener('click', closeDrawer);
  $('trialBackdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeEditor(); closeDrawer(); } });
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
  restoreExceptions(defaultTiers(), []);
  renderTags();
  syncPicker();
  display();
  update();
})();
