'use strict';
(() => {
  const {api,card,showError} = ClosetCue;
  const form = document.getElementById('filter-form');
  const grid = document.getElementById('closet-grid');
  const count = document.getElementById('results-count');
  const error = document.getElementById('closet-error');
  const empty = document.getElementById('empty-state');
  let pending;
  const initial = new URLSearchParams(location.search);
  if(initial.get('deleted')==='1')ClosetCue.toast('Garment deleted. Your closet is up to date.');
  Array.from(form.elements).forEach(el=>{if(el.name && initial.has(el.name) && [...(el.options||[])].some(option=>option.value===initial.get(el.name)))el.value=initial.get(el.name);});
  async function load() {
    pending?.abort(); pending = new AbortController();
    const signal = pending.signal;
    const params = new URLSearchParams(new FormData(form));
    for (const [key,value] of [...params]) if (!value) params.delete(key);
    history.replaceState(null,'',`${location.pathname}${params.size ? '?' + params : ''}`);
    count.textContent='Loading your wardrobe…';grid.setAttribute('aria-busy','true');error.hidden=true;empty.hidden=true;
    try {
      const data = await api(`php/filter_closet.php?${params}`,{signal});
      if (signal.aborted) return;
      grid.innerHTML = data.garments.map(item=>card(item)).join('');
      count.textContent=`${data.count} piece${data.count===1?'':'s'} in your closet`;
      empty.hidden=data.count>0;
    } catch (err) {
      if (err.name === 'AbortError') return;
      grid.innerHTML='';count.textContent='Your wardrobe could not be loaded.';showError(error,err.message);
    } finally {if(!signal.aborted)grid.setAttribute('aria-busy','false');}
  }
  form.addEventListener('submit',event=>{event.preventDefault();load();});
  document.querySelectorAll('select').forEach(select=>select.addEventListener('change',load));
  document.getElementById('clear-filters').addEventListener('click',()=>{form.reset();load();});
  window.addEventListener('pageshow',event=>{if(event.persisted)load();});
  load();
})();
