const CRITERIA = [
  { key: 'priceBefore', label: 'Prezzo prima della prenotazione', short: 'Prezzo pubblico', definition: 'Un prezzo, un intervallo o la tariffa del singolo professionista è consultabile su una pagina ufficiale prima di inviare la prenotazione.' },
  { key: 'familySupport', label: 'Supporto a familiare o caregiver', short: 'Supporto familiare', definition: 'Una fonte ufficiale documenta la prenotazione per un’altra persona o la possibilità di essere assistiti da familiare o caregiver.' },
  { key: 'humanSupport', label: 'Assistenza umana', short: 'Assistenza umana', definition: 'È pubblicato almeno un canale umano di aiuto — telefono, email, chat o staff — per prenotazione o problemi del servizio.' },
  { key: 'multiAccess', label: 'Più canali o dispositivi', short: 'Accesso flessibile', definition: 'La fonte ufficiale indica almeno due modalità di accesso oppure compatibilità con più categorie di dispositivo.' },
  { key: 'postVisit', label: 'Documenti o supporto dopo la visita', short: 'Dopo la visita', definition: 'È documentata almeno una funzione successiva all’appuntamento, come referto, documenti condivisi o canale di chiarimento.' },
  { key: 'usageLimits', label: 'Limiti d’uso dichiarati', short: 'Limiti dichiarati', definition: 'La pagina ufficiale spiega quando il servizio a distanza non è disponibile, non è appropriato o dipende dalla valutazione del professionista.' }
];

let offers = [];
const selectedOffers = new Set();

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}

function remoteDataUrl(path) {
  const config = window.TELEMEDICARE_CONFIG;
  if (!config || !config.githubOwner || config.githubOwner === 'INSERISCI_USERNAME_GITHUB') return null;
  const owner = encodeURIComponent(config.githubOwner);
  const repository = encodeURIComponent(config.githubRepository || 'telemedicare.it');
  const branch = encodeURIComponent(config.githubBranch || 'main');
  const safePath = String(path).split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${owner}/${repository}/${branch}/${safePath}`;
}

function formatCheckDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome'
  }).format(date);
}

function updateMonitoringStatus(data, isRemote) {
  const label = document.querySelector('#monitoring-label');
  const lastCheck = document.querySelector('#last-check-date');
  const nextCheck = document.querySelector('#next-check-date');
  const checkedAt = formatCheckDate(data.checkedAt);
  const scheduledAt = formatCheckDate(data.nextCheck);
  if (label) label.textContent = isRemote ? 'Monitoraggio settimanale attivo' : 'Dati locali verificati';
  if (lastCheck && checkedAt) lastCheck.textContent = checkedAt;
  if (nextCheck) nextCheck.textContent = isRemote && scheduledAt ? scheduledAt : 'dopo l’attivazione GitHub';
}

function validPayload(data) {
  return data?.schemaVersion === 2 && Array.isArray(data.offers) && data.offers.length > 0 &&
    data.offers.every(offer => offer.criteria && CRITERIA.every(criterion =>
      typeof offer.criteria[criterion.key]?.met === 'boolean'
    ));
}

async function loadOffers() {
  const hasConsumer = document.querySelector('#offer-grid') || document.querySelector('#criteria-matrix');
  if (!hasConsumer) return;
  const remoteUrl = remoteDataUrl('data/offers.json');
  const url = remoteUrl || 'data/offers.json';
  try {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!validPayload(data)) throw new Error('formato dati non valido');
    offers = data.offers;
    updateMonitoringStatus(data, Boolean(remoteUrl));
    renderOffers();
    renderCriteriaMatrix();
  } catch (error) {
    console.warn('Dati delle offerte non disponibili.', error);
    const grid = document.querySelector('#offer-grid');
    const matrix = document.querySelector('#criteria-matrix');
    if (grid) grid.innerHTML = '<div class="data-unavailable"><h3>Dati temporaneamente non disponibili</h3><p>Per prudenza non mostriamo copie non aggiornate. Riprova più tardi.</p></div>';
    if (matrix) matrix.innerHTML = '<div class="data-unavailable"><h3>Matrice temporaneamente non disponibile</h3><p>Le prove torneranno visibili insieme ai dati aggiornati.</p></div>';
  }
}

async function loadCensus() {
  const providers = document.querySelector('#included-providers');
  if (!providers) return;
  const remoteUrl = remoteDataUrl('data/census.json');
  const url = remoteUrl || 'data/census.json';
  try {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const census = await response.json();
    if (census?.schemaVersion !== 1 || census.exhaustive !== false || !Array.isArray(census.included)) {
      throw new Error('formato censimento non valido');
    }
    const count = document.querySelector('#included-count');
    const last = document.querySelector('#last-discovery-date');
    const next = document.querySelector('#next-discovery-date');
    if (count) count.textContent = String(census.included.length);
    if (last) last.textContent = formatCheckDate(census.lastDiscoveryAt) || 'non disponibile';
    if (next) next.textContent = formatCheckDate(census.nextDiscoveryAt) || 'non disponibile';
    providers.innerHTML = census.included
      .sort((a, b) => a.provider.localeCompare(b.provider, 'it'))
      .map(entry => `<li><a href="${safeUrl(entry.officialUrl)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHTML(entry.provider)} <span aria-hidden="true">↗</span></a></li>`)
      .join('');
  } catch (error) {
    console.warn('Censimento non disponibile.', error);
    providers.innerHTML = '<li>Elenco temporaneamente non disponibile. Riprova più tardi.</li>';
  }
}

function criterionScore(offer) {
  return CRITERIA.reduce((score, criterion) => score + (offer.criteria?.[criterion.key]?.met ? 1 : 0), 0);
}

function rankedOffers(list) {
  return [...list].sort((a, b) => criterionScore(b) - criterionScore(a) || a.provider.localeCompare(b.provider, 'it'));
}

const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('#main-nav');
if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Chiudi il menu' : 'Apri il menu');
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }));
}

const offerGrid = document.querySelector('#offer-grid');
const needFilter = document.querySelector('#need-filter');
const helpFilter = document.querySelector('#help-filter');
const resetFilters = document.querySelector('#reset-filters');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');

function offerCard(offer) {
  const features = offer.features.map(feature => `<span class="feature"><span aria-hidden="true">✓</span>${escapeHTML(feature)}</span>`).join('');
  const score = criterionScore(offer);
  return `
    <article class="offer-card" data-id="${escapeHTML(offer.id)}">
      <div class="offer-top">
        <span class="provider-mark ${escapeHTML(offer.id)}" aria-hidden="true">${escapeHTML(offer.initials)}</span>
        <p><b>${escapeHTML(offer.provider)}</b><small>${escapeHTML(offer.service)}</small></p>
      </div>
      <div class="offer-price"><span>Prezzo</span><b>${escapeHTML(offer.price)}</b><small>${escapeHTML(offer.priceNote)}</small></div>
      <p class="offer-description">${escapeHTML(offer.description)}</p>
      <div class="feature-list">${features}</div>
      <div class="evidence-row">
        <div class="evidence-score"><strong>${score}/${CRITERIA.length}</strong><span>criteri documentati</span></div>
        <div><a href="criteri.html#matrice">Regole e prove →</a><small>Fonti ufficiali · Verificato ${escapeHTML(offer.reviewed)}</small></div>
      </div>
      <div class="offer-actions">
        <label class="compare-check"><input type="checkbox" value="${escapeHTML(offer.id)}" ${selectedOffers.has(offer.id) ? 'checked' : ''}> Aggiungi al confronto</label>
        <a class="offer-link" href="${safeUrl(offer.url)}" target="_blank" rel="noopener noreferrer nofollow">Vai alla fonte ufficiale <span aria-hidden="true">↗</span></a>
      </div>
    </article>`;
}

function currentPriceFilter() {
  return document.querySelector('input[name="price"]:checked')?.value || 'all';
}

function renderOffers() {
  if (!offerGrid || offers.length === 0) return;
  const need = needFilter?.value || 'all';
  const price = currentPriceFilter();
  const assistanceOnly = Boolean(helpFilter?.checked);
  const filtered = rankedOffers(offers.filter(offer =>
    (need === 'all' || offer.needs.includes(need)) &&
    (price === 'all' || offer.priceBand === price) &&
    (!assistanceOnly || offer.assistance)
  ));
  offerGrid.innerHTML = filtered.map(offerCard).join('');
  if (resultCount) resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'servizio' : 'servizi'}`;
  if (emptyState) emptyState.hidden = filtered.length > 0;
  offerGrid.querySelectorAll('.compare-check input').forEach(input => input.addEventListener('change', handleCompareSelection));
}

function handleCompareSelection(event) {
  const id = event.target.value;
  if (event.target.checked && selectedOffers.size >= 3) {
    event.target.checked = false;
    showToast('Puoi confrontare fino a 3 servizi alla volta.');
    return;
  }
  event.target.checked ? selectedOffers.add(id) : selectedOffers.delete(id);
  updateCompareDock();
}

function updateCompareDock() {
  const dock = document.querySelector('#compare-dock');
  const count = document.querySelector('#compare-count');
  if (!dock || !count) return;
  dock.hidden = selectedOffers.size < 2;
  count.textContent = `${selectedOffers.size} servizi`;
}

[needFilter, helpFilter].forEach(control => control?.addEventListener('change', renderOffers));
document.querySelectorAll('input[name="price"]').forEach(control => control.addEventListener('change', renderOffers));
resetFilters?.addEventListener('click', () => {
  if (needFilter) needFilter.value = 'all';
  if (helpFilter) helpFilter.checked = false;
  const allPrice = document.querySelector('input[name="price"][value="all"]');
  if (allPrice) allPrice.checked = true;
  renderOffers();
});

const compareModal = document.querySelector('#compare-modal');
document.querySelector('#open-compare')?.addEventListener('click', () => {
  const chosen = rankedOffers(offers.filter(offer => selectedOffers.has(offer.id)));
  const rows = [
    ['Criteri documentati', offer => `${criterionScore(offer)}/${CRITERIA.length}`],
    ['Prezzo', offer => offer.price],
    ['Tipo di servizio', offer => offer.service],
    ['Supporto familiare', offer => offer.family],
    ['Assistenza umana', offer => offer.assistance ? 'Documentata' : 'Non documentata'],
    ['Dopo la visita', offer => offer.followup],
    ['Accesso', offer => offer.access]
  ];
  const table = `<table class="compare-table"><thead><tr><th>Campo</th>${chosen.map(offer => `<th>${escapeHTML(offer.provider)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label, value]) => `<tr><td>${escapeHTML(label)}</td>${chosen.map(offer => `<td>${escapeHTML(value(offer))}</td>`).join('')}</tr>`).join('')}<tr><td>Fonte</td>${chosen.map(offer => `<td><a href="${safeUrl(offer.url)}" target="_blank" rel="noopener noreferrer nofollow">Apri il sito ufficiale ↗</a></td>`).join('')}</tr></tbody></table>`;
  const wrap = document.querySelector('#compare-table-wrap');
  if (wrap) wrap.innerHTML = table;
  compareModal?.showModal();
  document.body.classList.add('modal-open');
});

function closeCompareModal() {
  compareModal?.close();
  document.body.classList.remove('modal-open');
}
document.querySelector('#close-compare')?.addEventListener('click', closeCompareModal);
compareModal?.addEventListener('click', event => {
  if (event.target === compareModal) closeCompareModal();
});

function renderCriteriaMatrix() {
  const container = document.querySelector('#criteria-matrix');
  if (!container || offers.length === 0) return;
  const ordered = rankedOffers(offers);
  const header = ordered.map(offer => `<th>${escapeHTML(offer.provider)}<small>${criterionScore(offer)}/${CRITERIA.length}</small></th>`).join('');
  const rows = CRITERIA.map(criterion => {
    const cells = ordered.map(offer => {
      const evidence = offer.criteria[criterion.key];
      const status = evidence.met ? '<span class="criterion-status met">✓ Documentato</span>' : '<span class="criterion-status missing">— Non documentato</span>';
      const source = evidence.met && evidence.source ? `<a href="${safeUrl(evidence.source)}" target="_blank" rel="noopener noreferrer nofollow">Apri la prova ↗</a>` : '';
      return `<td>${status}<p>${escapeHTML(evidence.note)}</p>${source}</td>`;
    }).join('');
    return `<tr><th><strong>${escapeHTML(criterion.label)}</strong><span>${escapeHTML(criterion.definition)}</span></th>${cells}</tr>`;
  }).join('');
  container.innerHTML = `<div class="criteria-table-wrap"><table class="criteria-table"><thead><tr><th>Criterio verificabile</th>${header}</tr></thead><tbody>${rows}</tbody><tfoot><tr><th>Totale documentato</th>${ordered.map(offer => `<td><strong>${criterionScore(offer)}/${CRITERIA.length}</strong></td>`).join('')}</tr></tfoot></table></div>`;
}

const contactForm = document.querySelector('#contact-form');
contactForm?.addEventListener('submit', event => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;
  const data = new FormData(contactForm);
  const subject = encodeURIComponent('Richiesta di contatto da Telemedicare.it');
  const phone = data.get('phone') || 'non indicato';
  const body = encodeURIComponent(`Nome: ${data.get('name')}\nTelefono: ${phone}\nEmail: ${data.get('email')}\nRichiesta: ${data.get('request')}\n\nNota: non sono stati richiesti dati sanitari.`);
  showToast('Si aprirà il tuo programma email per completare l’invio.');
  window.setTimeout(() => { window.location.href = `mailto:info@telemedicare.it?subject=${subject}&body=${body}`; }, 250);
});

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('show'), 3800);
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
} else {
  document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
}

loadOffers();
loadCensus();

