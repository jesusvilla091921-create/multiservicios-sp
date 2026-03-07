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
    try {
      if (!idCotizacionActiva) {
        throw new Error('Primero guarda la cotización');
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

      const jsPDF = window.jspdf.jsPDF;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const COLOR_PRIMARY = [44, 62, 80];
      const COLOR_SECONDARY = [52, 73, 94];
      const COLOR_ACCENT = [41, 128, 185];
      const COLOR_TEXT = [52, 52, 52];
      const COLOR_TEXT_LIGHT = [127, 140, 141];
      const COLOR_BORDER = [236, 240, 241];

      const cliente = document.getElementById('solCotCliente').value.trim();
      const telefono = document.getElementById('solCotTelefono').value.trim();
      const servicio = document.getElementById('solCotServicio').value.trim();
      const direccion = document.getElementById('solCotDireccion').value.trim();
      const diagnostico = document.getElementById('solCotDiagnostico').value.trim();
      const conceptos = getConceptos();
      const total = recalcTotal();
      const fechaActual = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const folioSolicitud = solicitudActiva ? solicitudActiva.id : '';

      doc.setDrawColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      doc.setLineWidth(0.3);
      doc.line(20, 15, 190, 15);
      doc.setFontSize(22);
      doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('MULTISERVICIOS SP', 20, 28);
      doc.setFontSize(8);
      doc.setTextColor(COLOR_TEXT_LIGHT[0], COLOR_TEXT_LIGHT[1], COLOR_TEXT_LIGHT[2]);
      doc.setFont('helvetica', 'normal');
      doc.text('Soluciones profesionales', 20, 34);

      doc.setFontSize(10);
      doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('COTIZACIÓN', 150, 24);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLOR_TEXT_LIGHT[0], COLOR_TEXT_LIGHT[1], COLOR_TEXT_LIGHT[2]);
      doc.text('Folio: ' + idCotizacionActiva, 150, 30);
      doc.text('Fecha: ' + fechaActual, 150, 35);
      doc.text('Solicitud: ' + folioSolicitud, 150, 40);

      doc.setFontSize(11);
      doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DEL CLIENTE', 20, 55);
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      doc.setLineWidth(0.2);
      doc.line(20, 57, 190, 57);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
      doc.text('Cliente:', 20, 65);
      doc.text('Teléfono:', 20, 72);
      doc.text('Dirección:', 20, 79);
      doc.text('Servicio:', 110, 65);
      doc.text(cliente || '—', 45, 65);
      doc.text(telefono || '—', 45, 72);
      const direccionLines = doc.splitTextToSize(direccion || '—', 80);
      doc.text(direccionLines, 45, 79);
      doc.text(servicio || '—', 130, 65);

      if (diagnostico) {
        const yStart = direccionLines.length > 1 ? 90 : 86;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
        doc.text('DIAGNÓSTICO', 20, yStart);
        doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
        doc.line(20, yStart + 2, 190, yStart + 2);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
        const diagnosticLines = doc.splitTextToSize(diagnostico, 170);
        doc.text(diagnosticLines, 20, yStart + 10);
      }

      let startY = diagnostico ? (direccionLines.length > 1 ? 120 : 110) : (direccionLines.length > 1 ? 100 : 96);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
      doc.text('CONCEPTOS', 20, startY);
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      doc.line(20, startY + 2, 190, startY + 2);

      const tableY = startY + 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLOR_TEXT_LIGHT[0], COLOR_TEXT_LIGHT[1], COLOR_TEXT_LIGHT[2]);
      doc.text('DESCRIPCIÓN', 20, tableY);
      doc.text('CANT', 130, tableY);
      doc.text('PRECIO UNIT.', 150, tableY);
      doc.text('IMPORTE', 180, tableY);
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      doc.setLineWidth(0.1);
      doc.line(20, tableY + 1, 190, tableY + 1);

      let y = tableY + 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
      conceptos.forEach(function (c) {
        if (y > 250) {
          doc.addPage();
          y = 30;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(COLOR_TEXT_LIGHT[0], COLOR_TEXT_LIGHT[1], COLOR_TEXT_LIGHT[2]);
          doc.text('DESCRIPCIÓN', 20, y - 10);
          doc.text('CANT', 130, y - 10);
          doc.text('PRECIO UNIT.', 150, y - 10);
          doc.text('IMPORTE', 180, y - 10);
          doc.line(20, y - 9, 190, y - 9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
        }
        const descripcion = c.desc.length > 50 ? c.desc.substring(0, 47) + '...' : c.desc;
        doc.text(descripcion, 20, y);
        doc.text(c.cant.toString(), 135, y, { align: 'right' });
        doc.text(money(c.precio), 160, y, { align: 'right' });
        doc.text(money(c.importe), 190, y, { align: 'right' });
        y += 7;
      });

      y += 5;
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      doc.setLineWidth(0.3);
      doc.line(130, y - 2, 190, y - 2);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
      doc.text('TOTAL:', 140, y + 5);
      doc.setFontSize(13);
      doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
      doc.text(money(total), 190, y + 5, { align: 'right' });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
        doc.setLineWidth(0.2);
        doc.line(20, 280, 190, 280);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLOR_TEXT_LIGHT[0], COLOR_TEXT_LIGHT[1], COLOR_TEXT_LIGHT[2]);
        doc.text('Multiservicios SP · Tel: (55) 1234-5678 · contacto@multiserviciossp.com', 20, 287);
        doc.text('Página ' + i + ' de ' + pageCount, 170, 287);
        doc.text('Cotización válida por 15 días', 105, 287, { align: 'center' });
      }

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
