'use strict';
window.ClosetCue = (() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#${name}"></use></svg>`;
  const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const date = value => !value ? 'Never' : value === today() ? 'Today' : new Date(value + 'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
  async function api(url, options = {}) {
    let response;
    try { response = await fetch(url, options); }
    catch (error) { if(error.name === 'AbortError') throw error; throw new Error('Could not connect to your wardrobe. Check that the server is running, then try again.'); }
    let data;
    try { data = await response.json(); } catch { throw new Error('The wardrobe server is unavailable. Start the demo server or Apache and MySQL, then reload.'); }
    if (!response.ok || data.status !== 'success') throw new Error(data.message || 'Something went wrong. Please try again.');
    return data;
  }
  function card(item, kind = 'closet') {
    const wears = Number(item.total_wears ?? item.wear_count ?? item.times_worn ?? 0);
    const badge = kind === 'loved' || wears >= 3 ? `♡ Worn ${wears} times` : wears === 0 ? '✧ Unworn gem!' : `↶ ${date(item.last_worn)}`;
    const badgeClass = kind === 'loved' || wears >= 3 ? '' : wears === 0 ? 'badge-unworn' : 'badge-recent';
    return `<article class="product-card" role="listitem"><a href="item-details.html?id=${encodeURIComponent(item.id)}" aria-label="View ${escape(item.garment_name)}"><div class="product-photo"><img src="${escape(item.image_path)}" alt="${escape(item.alt_text || item.garment_name)}" width="400" height="500" loading="lazy"><span class="product-index">No. ${String(Number(item.id)).padStart(3,'0')}</span>${kind === 'recommendation' ? '' : `<span class="badge ${badgeClass}">${escape(badge)}</span>`}</div><div class="product-card-body"><h3 class="product-card-title">${escape(item.garment_name)}</h3><div class="product-card-tags"><span>${escape(item.fabric)}</span><span>${escape(item.color_name)}</span></div>${kind === 'recommendation' ? `<p class="match-reason">✧ ${escape(item.match_reason)}</p>` : `<div class="card-bottom"><span>${escape(item.occasion)} / ${escape(item.category)}</span>${icon('arrow')}</div>`}</div></a></article>`;
  }
  const showError = (el, message) => { el.textContent = message; el.hidden = false; };
  const toast = message => {const el = document.getElementById('toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,6500);};
  document.querySelectorAll('[data-today]').forEach(el => el.textContent = new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date()));
  document.addEventListener('error', event => {if(event.target.tagName === 'IMG'){const img=event.target;const fallback=document.createElement('div');fallback.className='image-fallback';fallback.textContent=img.alt || 'Garment photo unavailable';img.replaceWith(fallback);}}, true);
  return {escape,icon,today,date,api,card,showError,toast};
})();
