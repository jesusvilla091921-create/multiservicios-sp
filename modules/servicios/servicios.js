(function () {
  function e(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  async function cargar() {
    const tbody = document.querySelector('#tablaServicios tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

    const payload = await window.api('/servicios');
    const list = payload && payload.success ? payload.servicios : [];
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">Sin servicios programados.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function (s) {
      return '<tr>' +
        '<td>' + e(s.id) + '</td>' +
        '<td>' + e(s.cliente) + '</td>' +
        '<td>' + e(s.servicio) + '</td>' +
        '<td>' + e(s.fecha) + ' ' + e(s.hora) + '</td>' +
        '<td>' + e(s.tecnico) + '</td>' +
        '<td>' + e(s.estado) + '</td>' +
        '</tr>';
    }).join('');
  }

  cargar().catch(function (err) {
    const tbody = document.querySelector('#tablaServicios tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6">Error: ' + e(err.message || err) + '</td></tr>';
    }
  });
})();
