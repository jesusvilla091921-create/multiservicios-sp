(function () {
  function e(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  async function cargarAgenda() {
    const wrap = document.getElementById('agendaWrap');
    if (!wrap) return;

    wrap.innerHTML = '<p class="module-muted">Cargando agenda...</p>';

    const payload = await window.api('/agenda');
    const servicios = payload && payload.success ? payload.servicios : [];

    if (!servicios || servicios.length === 0) {
      wrap.innerHTML = '<p class="module-muted">No hay eventos programados.</p>';
      return;
    }

    const groups = {};
    servicios.forEach(function (s) {
      const key = s.fecha || 'Sin fecha';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    const dates = Object.keys(groups).sort();
    wrap.innerHTML = dates.map(function (date) {
      const items = groups[date].map(function (s) {
        return '<li>' + e(s.hora || '--:--') + ' · ' + e(s.servicio) + ' · ' + e(s.cliente) + ' · ' + e(s.tecnico) + '</li>';
      }).join('');
      return '<div class="panel-card" style="margin-bottom:10px;"><h3 style="margin:0 0 8px;">' + e(date) + '</h3><ul style="margin:0;padding-left:18px;">' + items + '</ul></div>';
    }).join('');
  }

  cargarAgenda().catch(function (err) {
    const wrap = document.getElementById('agendaWrap');
    if (wrap) wrap.innerHTML = '<p class="module-muted">Error: ' + e(err.message || err) + '</p>';
  });
})();
