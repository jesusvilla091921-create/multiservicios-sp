(function () {
  let solicitudesCache = [];
  let solicitudActiva = null;
  let idCotizacionActiva = null;

  function ensureLoadingCurtain() {
    let node = document.getElementById('uiLoadingCurtain');
    if (node) return node;
    node = document.createElement('div');
    node.id = 'uiLoadingCurtain';
    node.className = 'ui-loading-curtain';
    node.innerHTML = '<div class="ui-loading-card"><i class="fas fa-spinner fa-spin"></i><span id="uiLoadingCurtainText">Procesando...</span></div>';
    document.body.appendChild(node);
    return node;
  }

  function showCurtain(text) {
    const node = ensureLoadingCurtain();
    const textNode = node.querySelector('#uiLoadingCurtainText');
    if (textNode) textNode.textContent = text || 'Procesando...';
    node.classList.add('is-visible');
  }

  function hideCurtain() {
    const node = document.getElementById('uiLoadingCurtain');
    if (node) node.classList.remove('is-visible');
  }

  function withBusy(btn, text) {
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

  function e(v) {
    return String(v || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(n) {
    return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function conceptoRow(data) {
    const row = document.createElement('div');
    row.className = 'grid2';
    row.style.marginBottom = '8px';
    row.innerHTML = [
      '<input class="input-lite sol-concepto-desc" type="text" placeholder="Descripción" value="' + e(data.desc || '') + '">',
      '<div style="display:flex;gap:8px;">',
      '<input class="input-lite sol-concepto-cant" type="number" min="1" value="' + Number(data.cant || 1) + '">',
      '<input class="input-lite sol-concepto-precio" type="number" min="0" step="0.01" value="' + Number(data.precio || 0) + '">',
      '</div>'
    ].join('');
    return row;
  }

  function getConceptos() {
    const rows = Array.from(document.querySelectorAll('#solConceptosWrap .grid2'));
    return rows.map(function (row) {
      const desc = row.querySelector('.sol-concepto-desc').value.trim();
      const cant = Number(row.querySelector('.sol-concepto-cant').value || 0);
      const precio = Number(row.querySelector('.sol-concepto-precio').value || 0);
      return { desc: desc, cant: cant, precio: precio, importe: cant * precio };
    }).filter(function (c) {
      return c.desc && c.cant > 0;
    });
  }

  function recalcTotal() {
    const total = getConceptos().reduce(function (acc, c) { return acc + c.importe; }, 0);
    const totalNode = document.getElementById('solCotTotal');
    if (totalNode) totalNode.textContent = money(total);
    return total;
  }

  function fillCotizador(s) {
    solicitudActiva = s;
    idCotizacionActiva = null;

    const panel = document.getElementById('solCotizadorPanel');
    const hint = document.getElementById('solCotizadorHint');
    if (!panel || !hint) return;

    panel.style.display = 'block';
    hint.textContent = 'Cotizando solicitud: ' + s.id;

    document.getElementById('solCotCliente').value = s.cliente || '';
    document.getElementById('solCotTelefono').value = s.telefono || '';
    document.getElementById('solCotServicio').value = s.servicio || '';
    document.getElementById('solCotDireccion').value = s.direccion || '';
    document.getElementById('solCotDiagnostico').value = s.notas || '';

    const wrap = document.getElementById('solConceptosWrap');
    wrap.innerHTML = '';
    wrap.appendChild(conceptoRow({ desc: s.servicio || 'Servicio técnico', cant: 1, precio: 0 }));
    recalcTotal();
    document.getElementById('solProgramarBtn').disabled = true;
    const pdfBtn = document.getElementById('solPdfCotBtn');
    if (pdfBtn) pdfBtn.disabled = true;
  }

  function estadoClass(estado) {
    const normalized = String(estado || '').toLowerCase();
    if (normalized === 'cotizando') return 'estado-cotizando';
    return 'estado-nueva';
  }

  function renderSolicitudes(list) {
    const tbody = document.querySelector('#tablaSolicitudes tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Sin solicitudes registradas.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function (s) {
      const wa = window.WAUtils
        ? window.WAUtils.makeButtonHtml({ phone: s.telefono, folio: s.id, cliente: s.cliente, className: 'btn-secondary', compact: true })
        : '';
      return '<tr>' +
        '<td>' + e(s.id) + '</td>' +
        '<td>' + e(s.cliente) + '</td>' +
        '<td>' + e(s.servicio) + '</td>' +
        '<td><span class="estado-pill ' + estadoClass(s.estado) + '">' + e(s.estado || 'Nueva') + '</span></td>' +
        '<td style="display:flex;gap:6px;flex-wrap:wrap;">' +
        '<button type="button" class="solicitudes-action sol-cotizar" data-id="' + e(s.id) + '">Cotizar</button>' +
        '<button type="button" class="btn-secondary sol-archive" data-id="' + e(s.id) + '"><i class="fas fa-archive"></i></button>' +
        wa +
        '</td>' +
        '</tr>';
    }).join('');

    if (window.WAUtils) window.WAUtils.bind(tbody);

    tbody.querySelectorAll('.sol-cotizar').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const id = btn.getAttribute('data-id');
        const s = solicitudesCache.find(function (x) { return String(x.id) === String(id); });
        if (!s) return;
        fillCotizador(s);
        const prevEstado = s.estado;
        s.estado = 'Cotizando';
        renderSolicitudes(solicitudesCache);
        try {
          await window.api('/marcarSolicitudCotizando', { idSolicitud: id });
        } catch (_) {
          s.estado = prevEstado;
          renderSolicitudes(solicitudesCache);
        }
      });
    });

    tbody.querySelectorAll('.sol-archive').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const id = btn.getAttribute('data-id');
        const ok = confirm('¿Archivar solicitud ' + id + '?');
        if (!ok) return;
        const prev = solicitudesCache.slice();
        solicitudesCache = solicitudesCache.filter(function (s) { return String(s.id) !== String(id); });
        renderSolicitudes(solicitudesCache);
        try {
          const payload = await window.api('/archiveSolicitud', { idSolicitud: id });
          if (!payload || !payload.success) throw new Error(payload && payload.error ? payload.error : 'No se pudo archivar');
        } catch (err) {
          solicitudesCache = prev;
          renderSolicitudes(solicitudesCache);
          alert('Error: ' + (err.message || err));
        }
      });
    });
  }

  async function loadSolicitudes(force) {
    const tbody = document.querySelector('#tablaSolicitudes tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    const payload = await window.api('/solicitudes', null, { force: !!force });
    if (!payload || !payload.success) {
      throw new Error(payload && payload.error ? payload.error : 'Respuesta inválida');
    }
    solicitudesCache = Array.isArray(payload.solicitudes) ? payload.solicitudes : [];
    renderSolicitudes(solicitudesCache);
  }

  async function guardarCotizacionInline() {
    if (!solicitudActiva) {
      alert('Selecciona una solicitud.');
      return;
    }
    const conceptos = getConceptos();
    const total = recalcTotal();
    if (!conceptos.length) {
      alert('Agrega al menos un concepto.');
      return;
    }

    const payload = await window.api('/cotizarSolicitud', {
      idSolicitud: solicitudActiva.id,
      diagnostico: document.getElementById('solCotDiagnostico').value.trim(),
      conceptos: conceptos,
      total: total
    });
    if (!payload || !payload.success) {
      throw new Error(payload && payload.error ? payload.error : 'No se pudo guardar');
    }
    idCotizacionActiva = payload.idCotizacion;
    document.getElementById('solProgramarBtn').disabled = false;
    const pdfBtn = document.getElementById('solPdfCotBtn');
    if (pdfBtn) pdfBtn.disabled = false;
    document.getElementById('solCotizadorHint').textContent = 'Cotización guardada: ' + idCotizacionActiva;
    const currentId = solicitudActiva.id;
    solicitudesCache = solicitudesCache.filter(function (s) { return String(s.id) !== String(currentId); });
    renderSolicitudes(solicitudesCache);
  }

  async function programarServicioInline() {
    if (!idCotizacionActiva) {
      alert('Primero guarda la cotización.');
      return;
    }
    const fecha = document.getElementById('solSrvFecha').value;
    const hora = document.getElementById('solSrvHora').value;
    const tecnico = document.getElementById('solSrvTecnico').value.trim();
    const total = recalcTotal();
    if (!fecha || !tecnico) {
      alert('Fecha y técnico son obligatorios.');
      return;
    }
    const payload = await window.api('/programarServicio', {
      idSolicitud: solicitudActiva ? solicitudActiva.id : '',
      idCotizacion: idCotizacionActiva,
      fecha: fecha,
      hora: hora,
      tecnico: tecnico,
      total: total
    });
    if (!payload || !payload.success) {
      throw new Error(payload && payload.error ? payload.error : 'No se pudo programar');
    }
    alert('Servicio programado: ' + payload.idServicio);
  }

  async function generarPdfInline() {
    if (!idCotizacionActiva) {
      alert('Primero guarda la cotización.');
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      await new Promise(function (resolve, reject) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    showCurtain('Generando PDF...');
    try {
      const jsPDF = window.jspdf.jsPDF;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const conceptos = getConceptos();
      const total = recalcTotal();
      const cliente = (document.getElementById('solCotCliente').value || '').trim();
      const telefono = (document.getElementById('solCotTelefono').value || '').trim();
      const servicio = (document.getElementById('solCotServicio').value || '').trim();
      const direccion = (document.getElementById('solCotDireccion').value || '').trim();
      const diagnostico = (document.getElementById('solCotDiagnostico').value || '').trim();
      const fechaActual = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

      const COLOR_PRIMARY = [41, 128, 185];
      const COLOR_SECONDARY = [52, 73, 94];
      const COLOR_ACCENT = [46, 204, 113];
      const COLOR_TEXT = [51, 51, 51];
      const COLOR_LIGHT_GRAY = [236, 240, 241];
      const COLOR_BORDER = [189, 195, 199];

      doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      doc.rect(0, 0, 216, 12, 'F');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('MULTISERVICIOS SP', 14, 9);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('FOLIO: ' + idCotizacionActiva, 162, 6);
      doc.text(fechaActual, 162, 10);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      doc.text('DATOS DEL CLIENTE', 14, 25);
      doc.setDrawColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      doc.setLineWidth(0.5);
      doc.line(14, 27, 200, 27);

      doc.setFillColor(COLOR_LIGHT_GRAY[0], COLOR_LIGHT_GRAY[1], COLOR_LIGHT_GRAY[2]);
      doc.roundedRect(14, 30, 90, 25, 2, 2, 'F');
      doc.roundedRect(108, 30, 90, 25, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Cliente:', 18, 38);
      doc.text('Teléfono:', 18, 46);
      doc.setFont('helvetica', 'normal');
      doc.text(cliente, 40, 38);
      doc.text(telefono, 40, 46);
      doc.setFont('helvetica', 'bold');
      doc.text('Servicio:', 112, 38);
      doc.text('Dirección:', 112, 46);
      doc.setFont('helvetica', 'normal');
      doc.text(servicio, 132, 38);
      doc.text(direccion.substring(0, 25) + (direccion.length > 25 ? '...' : ''), 132, 46);

      if (diagnostico) {
        doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
        doc.roundedRect(14, 60, 184, 20, 2, 2, 'S');
        doc.setFont('helvetica', 'bold');
        doc.text('Diagnóstico:', 18, 68);
        doc.setFont('helvetica', 'normal');
        doc.text(diagnostico.substring(0, 70) + (diagnostico.length > 70 ? '...' : ''), 18, 75);
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      doc.text('CONCEPTOS Y SERVICIOS', 14, diagnostico ? 90 : 75);
      doc.line(14, diagnostico ? 92 : 77, 200, diagnostico ? 92 : 77);

      const startY = diagnostico ? 98 : 83;
      doc.setFillColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
      doc.rect(14, startY - 4, 184, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPCIÓN', 16, startY);
      doc.text('CANT', 120, startY);
      doc.text('PRECIO UNIT.', 140, startY);
      doc.text('IMPORTE', 175, startY);

      doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
      doc.setFont('helvetica', 'normal');
      let y = startY + 6;
      conceptos.forEach(function (c, idx) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        if (idx % 2 === 0) {
          doc.setFillColor(COLOR_LIGHT_GRAY[0], COLOR_LIGHT_GRAY[1], COLOR_LIGHT_GRAY[2]);
          doc.rect(14, y - 4, 184, 7, 'F');
        }
        doc.text((idx + 1) + '. ' + c.desc.substring(0, 35), 16, y);
        doc.text(c.cant.toString(), 125, y, { align: 'right' });
        doc.text(money(c.precio), 150, y, { align: 'right' });
        doc.text(money(c.importe), 185, y, { align: 'right' });
        y += 7;
      });

      y += 4;
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      doc.line(120, y - 2, 200, y - 2);
      doc.setFillColor(COLOR_LIGHT_GRAY[0], COLOR_LIGHT_GRAY[1], COLOR_LIGHT_GRAY[2]);
      doc.roundedRect(120, y, 78, 10, 2, 2, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
      doc.text('TOTAL:', 125, y + 7);
      doc.text(money(total), 185, y + 7, { align: 'right' });

      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.line(14, 275, 200, 275);
      doc.text('Cotización válida por 15 días a partir de la fecha de emisión', 14, 280);
      doc.text('Multiservicios SP', 14, 284);

      doc.save('Cotizacion_' + idCotizacionActiva + '.pdf');
    } finally {
      hideCurtain();
    }
  }

  const refreshBtn = document.getElementById('refreshSolicitudes');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      loadSolicitudes(true).catch(function (err) {
        alert('Error: ' + (err.message || err));
      });
    });
  }

  const addConceptoBtn = document.getElementById('solAddConceptoBtn');
  if (addConceptoBtn) {
    addConceptoBtn.addEventListener('click', function () {
      const wrap = document.getElementById('solConceptosWrap');
      wrap.appendChild(conceptoRow({ desc: '', cant: 1, precio: 0 }));
      recalcTotal();
    });
  }

  const conceptosWrap = document.getElementById('solConceptosWrap');
  if (conceptosWrap) conceptosWrap.addEventListener('input', recalcTotal);

  const saveBtn = document.getElementById('solGuardarCotBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      const done = withBusy(saveBtn, 'Guardando...');
      guardarCotizacionInline().catch(function (err) {
        alert('Error: ' + (err.message || err));
      }).finally(done);
    });
  }

  const progBtn = document.getElementById('solProgramarBtn');
  if (progBtn) {
    progBtn.addEventListener('click', function () {
      const done = withBusy(progBtn, 'Programando...');
      showCurtain('Programando servicio...');
      programarServicioInline().catch(function (err) {
        alert('Error: ' + (err.message || err));
      }).finally(function () {
        hideCurtain();
        done();
      });
    });
  }

  const pdfBtn = document.getElementById('solPdfCotBtn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', function () {
      const done = withBusy(pdfBtn, 'Generando...');
      generarPdfInline().catch(function (err) {
        alert('Error PDF: ' + (err.message || err));
      }).finally(done);
    });
  }

  loadSolicitudes(false).catch(function (err) {
    const tbody = document.querySelector('#tablaSolicitudes tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5">Error: ' + e(err.message || err) + '</td></tr>';
  });
})();
