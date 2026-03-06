(function () {
  let serviciosCache = [];

  function e(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function withBusyAction(btn, text) {
    if (!btn) return function () {};
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('is-busy');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (text || 'Procesando...');
    return function done() {
      btn.disabled = false;
      btn.classList.remove('is-busy');
      btn.innerHTML = original;
    };
  }

  async function actualizarEstado(idServicio, estado, cambiosPosponer) {
    let payload = { idServicio: idServicio, estado: estado };
    if (estado === 'POSPUESTO') {
      if (!cambiosPosponer || !cambiosPosponer.nuevaFecha) {
        throw new Error('Falta nueva fecha para posponer');
      }
      payload.nuevaFecha = cambiosPosponer.nuevaFecha;
      payload.nuevaHora = cambiosPosponer.nuevaHora || '';
    }

    const resp = await window.api('/updateServicioEstado', payload);
    if (!resp || !resp.success) {
      throw new Error(resp && resp.error ? resp.error : 'No se pudo actualizar el servicio');
    }
  }

  function canCloseServicio(s) {
    const estado = String(s && s.estado || '').toUpperCase();
    return !!(s && s.puedeCerrar) && estado !== 'REALIZADO' && estado !== 'CANCELADO';
  }

  function render(list) {
    const tbody = document.querySelector('#tablaServicios tbody');
    if (!tbody) return;
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Sin servicios programados.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function (s) {
      const canClose = canCloseServicio(s);
      const actions = canClose
        ? (
          '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
          '<button type="button" class="btn-primary srv-action" data-id="' + e(s.id) + '" data-estado="REALIZADO">Finalizar</button>' +
          '<button type="button" class="btn-secondary srv-action" data-id="' + e(s.id) + '" data-estado="POSPUESTO">Posponer</button>' +
          '<button type="button" class="btn-secondary srv-action" data-id="' + e(s.id) + '" data-estado="CANCELADO">Cancelar</button>' +
          '</div>'
        )
        : '<span class="module-muted">Sin acciones</span>';
      const wa = window.WAUtils
        ? window.WAUtils.makeButtonHtml({ phone: s.telefono, folio: (s.idCotizacion || s.id), cliente: s.cliente, className: 'btn-secondary', compact: true })
        : '';

      return '<tr>' +
        '<td>' + e(s.id) + '</td>' +
        '<td>' + e(s.cliente) + '</td>' +
        '<td>' + e(s.servicio) + '</td>' +
        '<td>' + e(s.fecha) + ' ' + e(s.hora) + '</td>' +
        '<td>' + e(s.tecnico) + '</td>' +
        '<td>' + e(s.estado || '') + '</td>' +
        '<td style="display:flex;gap:6px;flex-wrap:wrap;">' + actions + wa + '</td>' +
        '</tr>';
    }).join('');

    if (window.WAUtils) window.WAUtils.bind(tbody);

    tbody.querySelectorAll('.srv-action').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const idServicio = btn.getAttribute('data-id');
        const estado = btn.getAttribute('data-estado');
        const ok = confirm('¿Confirmas cambiar a ' + estado + '?');
        if (!ok) return;

        const prev = serviciosCache.slice();
        const row = serviciosCache.find(function (s) { return String(s.id) === String(idServicio); });
        if (!row) return;

        let cambiosPosponer = null;
        if (estado === 'POSPUESTO') {
          const nuevaFecha = prompt('Nueva fecha (YYYY-MM-DD):', row.fecha || '');
          if (!nuevaFecha) return;
          const nuevaHora = prompt('Nueva hora (HH:MM, opcional):', row.hora || '') || '';
          cambiosPosponer = { nuevaFecha: nuevaFecha.trim(), nuevaHora: nuevaHora.trim() };
          row.fecha = nuevaFecha.trim();
          row.hora = nuevaHora.trim();
        }

        row.estado = estado;
        row.puedeCerrar = false;
        render(serviciosCache);

        const done = withBusyAction(btn, 'Guardando...');
        try {
          await actualizarEstado(idServicio, estado, cambiosPosponer);
          await cargar(true);
        } catch (err) {
          serviciosCache = prev;
          render(serviciosCache);
          alert('Error: ' + (err.message || err));
        } finally {
          done();
        }
      });
    });
  }

  async function cargar(force) {
    const tbody = document.querySelector('#tablaServicios tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
    const payload = await window.api('/servicios', null, { force: !!force });
    serviciosCache = payload && payload.success ? payload.servicios : [];
    render(serviciosCache);
  }

  async function cargarConfigDisponibilidad() {
    const payload = await window.api('/configDisponibilidad', null, { force: true });
    if (!payload || !payload.success) {
      throw new Error(payload && payload.error ? payload.error : 'No se pudo cargar configuración');
    }
    const tecnicos = Array.isArray(payload.tecnicos) ? payload.tecnicos : [];
    const start = document.getElementById('cfgStartHour');
    const end = document.getElementById('cfgEndHour');
    const slot = document.getElementById('cfgSlotMinutes');
    const names = document.getElementById('cfgTecnicos');
    if (start) start.value = payload.startHour || '08:00';
    if (end) end.value = payload.endHour || '18:00';
    if (slot) slot.value = Number(payload.slotMinutes || 60);
    if (names) names.value = tecnicos.join(', ');
  }

  async function guardarConfigDisponibilidad(btn) {
    const startHour = document.getElementById('cfgStartHour')?.value;
    const endHour = document.getElementById('cfgEndHour')?.value;
    const slotMinutes = Number(document.getElementById('cfgSlotMinutes')?.value || 60);
    const tecnicosRaw = document.getElementById('cfgTecnicos')?.value || '';
    const tecnicos = tecnicosRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean);

    if (!startHour || !endHour || !tecnicos.length) {
      alert('Completa inicio, fin y técnicos.');
      return;
    }

    const done = withBusyAction(btn, 'Guardando...');
    try {
      const resp = await window.api('/actualizarConfigDisponibilidad', {
        startHour: startHour,
        endHour: endHour,
        slotMinutes: slotMinutes,
        tecnicos: tecnicos
      });
      if (!resp || !resp.success) {
        throw new Error(resp && resp.error ? resp.error : 'No se pudo guardar la configuración');
      }
      alert('Disponibilidad actualizada. El index del cliente ya usará estos horarios.');
    } finally {
      done();
    }
  }

  async function bloquearHorario(btn) {
    const fecha = prompt('Fecha a bloquear (YYYY-MM-DD):', '');
    if (!fecha) return;
    const hora = prompt('Hora a bloquear (HH:MM):', '');
    if (!hora) return;
    const tecnico = prompt('Técnico:', (document.getElementById('cfgTecnicos')?.value || '').split(',')[0] || '');
    if (!tecnico) return;
    const motivo = prompt('Motivo (opcional):', '') || '';

    const done = withBusyAction(btn, 'Bloqueando...');
    try {
      const resp = await window.api('/bloquearHorarioTecnico', {
        fecha: fecha.trim(),
        hora: hora.trim(),
        tecnico: tecnico.trim(),
        motivo: motivo.trim()
      });
      if (!resp || !resp.success) {
        throw new Error(resp && resp.error ? resp.error : 'No se pudo bloquear el horario');
      }
      alert('Horario bloqueado correctamente.');
    } finally {
      done();
    }
  }

  const refreshBtn = document.getElementById('refreshServicios');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      const done = withBusyAction(refreshBtn, 'Actualizando...');
      cargar(true).catch(function (err) {
        alert('Error: ' + (err.message || err));
      }).finally(done);
    });
  }

  const saveCfgBtn = document.getElementById('saveDisponibilidadCfg');
  if (saveCfgBtn) {
    saveCfgBtn.addEventListener('click', function () {
      guardarConfigDisponibilidad(saveCfgBtn).catch(function (err) {
        alert('Error: ' + (err.message || err));
      });
    });
  }

  const blockBtn = document.getElementById('blockHorarioBtn');
  if (blockBtn) {
    blockBtn.addEventListener('click', function () {
      bloquearHorario(blockBtn).catch(function (err) {
        alert('Error: ' + (err.message || err));
      });
    });
  }

  Promise.allSettled([
    cargar(false),
    cargarConfigDisponibilidad()
  ]).then(function (results) {
    const failed = results.find(function (r) { return r.status === 'rejected'; });
    if (failed) {
      const tbody = document.querySelector('#tablaServicios tbody');
      if (tbody && !tbody.children.length) {
        tbody.innerHTML = '<tr><td colspan="7">Error: ' + e(failed.reason && failed.reason.message ? failed.reason.message : failed.reason) + '</td></tr>';
      }
    }
  });
})();
