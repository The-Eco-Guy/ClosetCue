'use strict';
(async () => {
  const {api, card, escape, date, showError} = ClosetCue;
  const outcomes = await Promise.allSettled([api('php/get_analytics.php'), api('php/filter_closet.php')]);
  const [analytics, closet] = outcomes;
  if (analytics.status === 'fulfilled') {
    const data = analytics.value;
    document.getElementById('most-loved-grid').innerHTML = data.most_loved.map(item => card(item,'loved')).join('');
    document.getElementById('most-loved-empty').hidden = data.most_loved.length > 0;
    document.getElementById('recently-worn-grid').innerHTML = data.recently_worn.map(item => `<article class="recent-card" role="listitem"><a href="item-details.html?id=${encodeURIComponent(item.id)}"><img src="${escape(item.image_path)}" alt="${escape(item.alt_text)}" width="80" height="100" loading="lazy"><div><h3>${escape(item.garment_name)}</h3><p>Last worn<br>${date(item.last_worn)} ↗</p></div></a></article>`).join('');
    document.getElementById('recently-worn-empty').hidden = data.recently_worn.length > 0;
  } else showError(document.getElementById('dashboard-error'), analytics.reason.message);
  document.getElementById('most-loved-grid').setAttribute('aria-busy','false');
  if (closet.status === 'fulfilled') {
    const items = closet.value.garments;
    const unworn = items.filter(item=>Number(item.wear_count)===0).length;
    document.getElementById('stat-total').textContent = items.length;
    document.getElementById('stat-wears').textContent = items.reduce((sum,item)=>sum+Number(item.wear_count),0);
    document.getElementById('stat-unworn').textContent = unworn;
    document.getElementById('stat-utilization').textContent = items.length ? `${Math.round((items.length-unworn)/items.length*100)}% of your closet in rotation` : 'Your first piece is a fresh start.';
  } else document.getElementById('stat-utilization').textContent = 'Stats unavailable. Please reload.';
})();
