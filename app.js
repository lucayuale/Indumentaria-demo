'use strict';

const config = window.VYB_CONFIG;
const byId = id => document.getElementById(id);
const languages = config.language.available;
const storageKey = 'vyb-catalog-language:' + location.pathname;
const mobile = matchMedia('(max-width:799px)');
const nav = byId('main-nav');
const toggle = document.querySelector('.menu-toggle');
const dialog = byId('detail');
const audience = byId('audience');
const collection = byId('collection');
const sort = byId('sort');

let language = config.language.default;
try {
  const saved = localStorage.getItem(storageKey);
  if (languages.includes(saved)) language = saved;
} catch {}
let currentProduct = null;
let productButton = null;

const t = key => config.translations[language][key];
const localized = value => typeof value === 'string' ? value : (value?.[language] ?? value?.[config.language.default] ?? '');
const element = (tag, className = '', content = '') => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
};
const price = value => new Intl.NumberFormat(language === 'es' ? 'es-AR' : 'en-US', {
  style:'currency', currency:config.catalog.currency
}).format(value);

function image(src, alt, width, height) {
  const node = element('img');
  node.src = src;
  node.alt = alt;
  node.width = width;
  node.height = height;
  node.loading = 'lazy';
  node.decoding = 'async';
  return node;
}

function setOptions(select, entries, selected = '') {
  select.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
  select.value = selected;
  if (select.selectedIndex === -1) select.selectedIndex = 0;
}

function initializeFilters() {
  setOptions(audience, [['',t('all')], ['women',t('women')], ['men',t('men')], ['unisex',t('unisex')]], audience.value);
  setOptions(collection, [['',t('all')], ...config.catalog.collections.map(item => [item.id, localized(item.name)])], collection.value);
  setOptions(sort, [['featured',t('featured')], ['low',t('low')], ['high',t('high')], ['newest',t('newest')]], sort.value || 'featured');
}

function renderProducts() {
  const filtered = config.catalog.products.filter(item =>
    (!audience.value || item.audience === audience.value || item.audience === 'unisex') &&
    (!collection.value || item.collections.includes(collection.value)));
  if (sort.value === 'low') filtered.sort((a,b) => a.price - b.price);
  if (sort.value === 'high') filtered.sort((a,b) => b.price - a.price);
  if (sort.value === 'newest') filtered.sort((a,b) => b.added.localeCompare(a.added));

  const cards = filtered.map(item => {
    const article = element('article','product');
    const button = element('button','product-button');
    button.type = 'button';
    button.setAttribute('aria-haspopup','dialog');
    const photo = element('span','product-image');
    photo.append(image(item.image, localized(item.alt), 508, 508));
    if (item.isNew) photo.append(element('span','tag',t('new')));
    const metadata = element('span','product-meta');
    metadata.append(element('strong','',localized(item.name)), element('span','',price(item.price)));
    button.append(photo, metadata, element('span','product-color',localized(item.color)));
    button.addEventListener('click', () => openDetail(item,button));
    article.append(button);
    return article;
  });
  byId('products').replaceChildren(...cards);
  const status = filtered.length === 1 ? t('resultOne') : t('results').replace('{count}', filtered.length);
  byId('catalog-status').textContent = filtered.length ? status : t('empty');
}

function applyFilter(selectedAudience, selectedCollection) {
  audience.value = selectedAudience;
  collection.value = selectedCollection;
  renderProducts();
}

function renderCollections() {
  byId('collections-grid').replaceChildren(...config.catalog.collections.map(item => {
    const link = element('a','collection-card');
    link.href = '#catalog';
    link.append(image(item.image, localized(item.alt), 768, 1024), element('span','',localized(item.name)));
    link.addEventListener('click', () => applyFilter('',item.id));
    return link;
  }));
}

function contactHref(message = '') {
  if (config.contact?.whatsapp) {
    const url = new URL('https://wa.me/' + config.contact.whatsapp.slice(1));
    if (message) url.searchParams.set('text',message);
    return url.href;
  }
  if (config.contact?.email) return 'mailto:' + config.contact.email + (message ? '?body=' + encodeURIComponent(message) : '');
  return '';
}

function setDetailLink() {
  const selected = byId('size').value;
  const size = selected ? t('sizeMessage').replace('{size}',selected) : '';
  const link = byId('detail-contact');
  const href = contactHref(t('inquiry').replace('{product}',localized(currentProduct.name)).replace('{size}',size));
  link.hidden = !href;
  if (href) link.href = href;
  else link.removeAttribute('href');
}

function openDetail(item, button) {
  currentProduct = item;
  productButton = button;
  byId('detail-image').src = item.image;
  byId('detail-image').alt = localized(item.alt);
  byId('detail-title').textContent = localized(item.name);
  byId('detail-audience').textContent = t(item.audience);
  byId('detail-description').textContent = localized(item.description);
  byId('detail-price').textContent = price(item.price);
  byId('detail-color').textContent = t('color') + ' · ' + localized(item.color);
  byId('size-field').hidden = !item.sizes.length;
  setOptions(byId('size'), item.sizes.map(value => [value,value]));
  byId('detail-note').textContent = config.isDemo ? t('detailDemo') : '';
  byId('detail-note').hidden = !config.isDemo;
  setDetailLink();
  dialog.showModal();
  document.documentElement.classList.add('panel-open');
  byId('close-detail').focus();
}

function setMenu(open, focus = false) {
  const expanded = mobile.matches && open;
  toggle.setAttribute('aria-expanded',String(expanded));
  toggle.setAttribute('aria-label',t(expanded ? 'closeMenu' : 'openMenu'));
  nav.classList.toggle('is-open',expanded);
  nav.inert = mobile.matches && !expanded;
  document.documentElement.classList.toggle('panel-open',expanded || dialog.open);
  if (focus) toggle.focus();
}

function makeLink(label, href, classes = '') {
  const link = element('a',classes,label);
  link.href = href;
  return link;
}

function renderContact() {
  byId('contact-note').textContent = t(config.isDemo ? 'contactDemo' : 'contactLive');
  const links = [];
  if (config.contact?.email) links.push(makeLink(t('email'),'mailto:' + config.contact.email,'button primary'));
  if (config.contact?.whatsapp) links.push(makeLink(t('whatsapp'),contactHref(),'button primary'));
  if (config.vybUrl) links.push(makeLink(t('vybCta'),config.vybUrl,'button primary'));
  byId('contact-links').replaceChildren(...links);
  byId('socials').replaceChildren(...(config.contact?.socials ?? []).map(item => makeLink(localized(item.label),item.url)));
  byId('demo-note').hidden = !config.isDemo;
  byId('credit').hidden = !config.vybUrl;
  if (config.vybUrl) byId('credit').href = config.vybUrl;
}

function render() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-brand]').forEach(node => {
    node.textContent = config.business.name;
    if (config.brand?.logoImage) node.replaceChildren(image(config.brand.logoImage,config.business.name,116,36));
  });
  for (const [id,key] of [['hero-image','hero'], ['about-image','manifesto']]) {
    const node = byId(id);
    node.src = config.images[key];
    node.alt = localized(config.images[key + 'Alt']);
  }
  nav.setAttribute('aria-label',t('nav'));
  byId('footer-nav').setAttribute('aria-label',t('footerNav'));
  document.querySelector('.languages').setAttribute('aria-label',t('languages'));
  document.querySelectorAll('[data-lang]').forEach(button => {
    button.hidden = !languages.includes(button.dataset.lang);
    button.setAttribute('aria-pressed',String(button.dataset.lang === language));
  });
  for (const id of ['collections','about','contact']) {
    byId(id).hidden = config.sections?.[id] === false;
    nav.querySelector('a[href="#' + id + '"]').hidden = byId(id).hidden;
  }
  byId('footer-nav').replaceChildren(...[...nav.querySelectorAll('a:not([hidden])')].map(link => link.cloneNode(true)));
  renderCollections();
  initializeFilters();
  renderProducts();
  renderContact();
  setMenu(toggle.getAttribute('aria-expanded') === 'true');
}

for (const [key,value] of Object.entries(config.colorVariables)) document.documentElement.style.setProperty(key,value);
document.documentElement.style.setProperty('--display',config.brand?.fonts?.display || 'Arial, sans-serif');
document.documentElement.style.setProperty('--body',config.brand?.fonts?.body || 'system-ui, sans-serif');

toggle.hidden = false;
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
mobile.addEventListener('change', () => setMenu(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenu(false,true);
});
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (link?.hasAttribute('data-audience')) applyFilter(link.dataset.audience,'');
  if (link || !event.target.closest('.header')) setMenu(false);
});
nav.addEventListener('focusout', event => {
  if (event.relatedTarget && !event.relatedTarget.closest('.header')) setMenu(false);
});
document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
  language = button.dataset.lang;
  try { localStorage.setItem(storageKey,language); } catch {}
  render();
}));
for (const select of [audience,collection,sort]) select.addEventListener('change',renderProducts);
byId('reset').addEventListener('click', () => { sort.value = 'featured'; applyFilter('',''); });
byId('size').addEventListener('change',setDetailLink);
dialog.addEventListener('close', () => {
  document.documentElement.classList.remove('panel-open');
  productButton?.focus({preventScroll:true});
});
render();
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('is-pending');
      observer.unobserve(entry.target);
    }
  },{threshold:.12});
  document.querySelectorAll('.reveal:not([hidden])').forEach(node => {
    if (node.getBoundingClientRect().top >= innerHeight) node.classList.add('is-pending');
    observer.observe(node);
    node.addEventListener('focusin', () => node.classList.remove('is-pending'), {once:true});
  });
}
