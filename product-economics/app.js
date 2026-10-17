(() => {
  'use strict';
  const KEY = 'zj1-economics-admin-trial-v2';
  const components = [
    ['silver','Silver','Purchased silver content or silver components for one product.'],
    ['gold','Gold','Purchased gold content or gold components for one product.'],
    ['brass','Brass','Purchased brass content or brass components for one product.'],
    ['gemstones','Gemstones','Stone purchase and setting costs for one product.'],
    ['production','Production','Workshop labour, casting or assembly for one product.'],
    ['plating','Plating','Plating or surface-treatment cost for one product.'],
    ['packaging','Packaging','Packaging cost allocated to one product.'],
    ['other','Other','Any other manufacturing cost for one product.']
  ];
  const $ = id => document.getElementById(id);
  const dollars = n => '$' + n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const number = element => element.value.trim() === '' ? null : Number(element.value);
  const valid = n => n !== null && Number.isFinite(n) && n >= 0;
  const value = id => $(id).value.trim();
  const put = (id,v) => { $(id).value = v ?? ''; };

  for (const [id,label,description] of components) {
    const row = document.createElement('div'); row.className = 'component-field';
    row.innerHTML = `<label for="component-${id}">${label} <span class="help" tabindex="0" aria-label="${label} help">?<span class="tip">${description}</span></span></label><div class="input-money input-small"><span>$</span><input id="component-${id}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00"></div>`;
    $('componentFields').append(row);
  }
  const componentInputs = components.map(([id]) => $(`component-${id}`));
  function subtotal() { return componentInputs.reduce((sum,input) => { const n = number(input); return sum + (valid(n) ? n : 0); },0); }
  function hasComponent() { return componentInputs.some(input => input.value.trim() !== ''); }
  function update() {
    $('componentSubtotal').textContent = dollars(subtotal());
    $('adoptSubtotal').disabled = !hasComponent();
    const cost = number($('totalCost')), base = number($('commercialBase'));
    const wholesale = number($('wholesaleMultiplier')), retail = number($('retailMultiplier'));
    const wholesalePrice = valid(base) && valid(wholesale) ? dollars(base * wholesale) : '—';
    const retailPrice = valid(base) && valid(retail) ? dollars(base * retail) : '—';
    $('wholesaleResult').textContent = wholesalePrice;
    $('retailResult').textContent = retailPrice;
    $('summaryCost').textContent = valid(cost) ? dollars(cost) : '—';
    $('summaryBase').textContent = valid(base) ? dollars(base) : '—';
    $('summaryWholesale').textContent = wholesalePrice;
    $('summaryRetail').textContent = retailPrice;
  }
  function entries() {
    try { const list = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(list) ? list : []; }
    catch { return []; }
  }
  function persist(list) {
    try { localStorage.setItem(KEY,JSON.stringify(list)); return true; }
    catch { $('saveStatus').textContent = 'Browser storage is unavailable. Please keep a manual copy of these values.'; return false; }
  }
  function snapshot() {
    return {id:crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,savedAt:new Date().toISOString(),
      productReference:value('productReference'),feedback:value('feedback'),totalCost:value('totalCost'),
      commercialBase:value('commercialBase'),wholesaleMultiplier:value('wholesaleMultiplier'),retailMultiplier:value('retailMultiplier'),
      components:Object.fromEntries(components.map(([id]) => [id,value(`component-${id}`)]))};
  }
  function display(list=entries()) {
    $('savedCount').textContent = String(list.length);
    const host = $('entriesList'); host.replaceChildren();
    if (!list.length) { const p=document.createElement('p');p.className='empty-state';p.textContent='No entries saved yet.';host.append(p);return; }
    for (const item of list.slice().reverse()) {
      const row=document.createElement('div');row.className='entry';
      const head=document.createElement('div');head.className='entry-head';
      const title=document.createElement('strong');title.textContent=item.productReference || 'Sample product';
      const cost=document.createElement('strong');cost.textContent=item.totalCost !== '' && valid(Number(item.totalCost)) ? dollars(Number(item.totalCost)) : '—';
      head.append(title,cost);
      const date=document.createElement('small');date.textContent=new Date(item.savedAt).toLocaleString();
      const actions=document.createElement('div');actions.className='entry-actions';
      const open=document.createElement('button');open.type='button';open.className='link-button';open.textContent='Open';open.addEventListener('click',()=>openEntry(item));
      const remove=document.createElement('button');remove.type='button';remove.className='link-button';remove.textContent='Delete';remove.addEventListener('click',()=>{if(confirm('Delete this saved trial entry?')){const next=entries().filter(x=>x.id!==item.id);if(persist(next))display(next);}});
      actions.append(open,remove);row.append(head,date,actions);host.append(row);
    }
  }
  function openEntry(item) {
    for(const id of ['productReference','feedback','totalCost','commercialBase','wholesaleMultiplier','retailMultiplier']) put(id,item[id]);
    for(const [id] of components) put(`component-${id}`,item.components?.[id]);
    $('componentsPanel').open=components.some(([id]) => (item.components?.[id] ?? '') !== '');
    $('pricingPanel').open=['commercialBase','wholesaleMultiplier','retailMultiplier'].some(id => (item[id] ?? '') !== '');
    $('trialPanel').open=!!(item.productReference || item.feedback);
    $('saveStatus').textContent='Saved entry opened. Saving again creates another copy.';
    update();window.scrollTo({top:0,behavior:'smooth'});
  }
  function save() {
    const cost=number($('totalCost'));
    if(!valid(cost)) { $('saveStatus').textContent='Enter a valid Total Product Cost before saving.';$('totalCost').focus();return; }
    const optional=[...componentInputs,$('commercialBase'),$('wholesaleMultiplier'),$('retailMultiplier')];
    if(optional.some(input=>input.value.trim()!=='' && !valid(number(input)))) { $('saveStatus').textContent='Amounts and multipliers must be zero or greater.';return; }
    const list=entries();list.push(snapshot());
    if(persist(list)){display(list);$('saveStatus').textContent='Saved in this browser. Export CSV to share trial results.';}
  }
  function exportCsv() {
    const list=entries();if(!list.length){$('saveStatus').textContent='Save at least one entry before exporting.';return;}
    const keys=['savedAt','productReference','totalCost',...components.map(([id])=>id),'componentSubtotal','commercialBase','wholesaleMultiplier','wholesalePrice','retailMultiplier','retailPrice','feedback'];
    const quote=x=>{const raw=String(x??'');const safe=/^\s*[=+\-@]/.test(raw)?"'"+raw:raw;return `"${safe.replaceAll('"','""')}"`;};
    const rows=[keys.map(quote).join(',')];
    for(const item of list){const sum=components.reduce((s,[id])=>s+(Number(item.components?.[id])||0),0);const price=id=>item.commercialBase!==''&&item[id]!==''?(Number(item.commercialBase)*Number(item[id])).toFixed(2):'';
      rows.push([item.savedAt,item.productReference,item.totalCost,...components.map(([id])=>item.components?.[id]??''),sum.toFixed(2),item.commercialBase,item.wholesaleMultiplier,price('wholesaleMultiplier'),item.retailMultiplier,price('retailMultiplier'),item.feedback].map(quote).join(','));}
    const blob=new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='zuman-product-economics-trial.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('saveStatus').textContent=`Exported ${list.length} ${list.length===1?'entry':'entries'}.`;
  }
  function reset() { for(const input of document.querySelectorAll('input,textarea')) input.value='';for(const id of ['componentsPanel','pricingPanel','trialPanel']) $(id).open=false;for(const id of ['componentsStatus','pricingStatus','saveStatus']) $(id).textContent='';update();window.scrollTo({top:0,behavior:'smooth'}); }
  document.querySelectorAll('input[type=number]').forEach(input=>input.addEventListener('input',update));
  $('adoptSubtotal').addEventListener('click',()=>{if(!hasComponent())return;$('totalCost').value=subtotal().toFixed(2);$('componentsStatus').textContent='Subtotal applied. Total Product Cost remains editable.';update();});
  $('copyCost').addEventListener('click',()=>{const cost=number($('totalCost'));if(!valid(cost)){$('pricingStatus').textContent='Enter Total Product Cost first.';$('totalCost').focus();return;}$('commercialBase').value=$('totalCost').value;$('pricingStatus').textContent='Copied once. Future cost edits will not change this base.';update();});
  $('saveEntry').addEventListener('click',save);$('saveEntryTop').addEventListener('click',save);$('exportEntries').addEventListener('click',exportCsv);$('newEntry').addEventListener('click',reset);
  $('clearEntries').addEventListener('click',()=>{const list=entries();if(list.length&&confirm(`Delete all ${list.length} saved trial entries from this browser?`)){if(persist([])){display([]);$('saveStatus').textContent='Saved entries cleared.';}}});
  display();update();
})();
