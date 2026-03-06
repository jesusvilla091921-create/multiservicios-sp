const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZL-jO1g3AbePttdQ-_Q1J5eha5jiPP-VLJYPJ4osuD1J0rPYhu2QoZBF--YdH7tmZ/exec';
    
    const serviceConfig = {
      climatizacion: { 
        name: "Climatización Avanzada (VRV/Minisplit)", 
        icon: "❄️", 
        questions: [
          { id: "p1", label: "¿Qué tecnología utiliza su sistema?", options: ["Minisplit Tradicional", "Sistema VRV / VRF", "Paquete / Central", "Chiller"] },
          { id: "p2", label: "¿Cuál es el objetivo?", options: ["Mantenimiento Preventivo", "Diagnóstico de Falla", "Instalación / Proyecto", "Reubicación"] },
          { id: "p3", label: "¿Qué tan urgente es para ti?", options: ["hoy (emergencia)", "mañana", "esta semana", "programar"] },
          { id: "p4", label: "¿Cuántos equipos o zonas necesitas revisar?", options: ["1", "2", "3-5", "+5"] }
        ]
      },
      plomeria: { 
        name: "Plomería / Destape", 
        icon: "🚰", 
        questions: [
          { id: "p1", label: "¿Qué problema tienes con tu instalación?", options: ["caño tapado", "fuga de agua", "wc tapado", "grifo gotea", "tubería rota"] },
          { id: "p2", label: "¿Dónde se encuentra la instalación?", options: ["casa", "oficina", "local comercial", "industria"] },
          { id: "p3", label: "¿Qué tan urgente es?", options: ["inundación", "hoy", "mañana", "esta semana"] }
        ]
      },
      electricidad: { 
        name: "Electricidad Crítica", 
        icon: "⚡", 
        questions: [
          { id: "p1", label: "¿Qué falla eléctrica estás experimentando?", options: ["corto / plafones", "apagones constantes", "sin luz parcial", "instalación nueva", "tablero principal"] },
          { id: "p2", label: "¿Dónde se encuentra la instalación?", options: ["casa", "oficina", "local comercial", "industria"] },
          { id: "p3", label: "¿Qué tan urgente lo necesitas?", options: ["sin luz ahora", "hoy", "mañana", "cotizar"] }
        ]
      },
      soldadura: { 
        name: "Soldadura / Herrería", 
        icon: "🧱", 
        questions: [
          { id: "p1", label: "¿Qué necesitas fabricar o reparar?", options: ["reparar portón", "portón nuevo", "escalera", "estructura", "rejas"] },
          { id: "p2", label: "¿Dónde se realizará el trabajo?", options: ["casa", "oficina", "local comercial", "industria"] },
          { id: "p3", label: "¿Para cuándo lo necesitas?", options: ["urgente (seguridad)", "2-3 días", "semana", "proyecto"] }
        ]
      },
      camaras: { 
        name: "Cámaras / CCTV", 
        icon: "🎥", 
        questions: [
          { id: "p1", label: "¿Qué servicio de videovigilancia requieres?", options: ["instalación nueva", "reparar equipo", "agregar cámara", "configurar app"] },
          { id: "p2", label: "¿Dónde se realizará la instalación?", options: ["casa", "oficina", "local comercial", "industria"] },
          { id: "p3", label: "¿Cuántas cámaras necesitas?", options: ["1-2", "3-4", "5-8", "+8"] }
        ]
      },
      general: { 
        name: "Mantenimiento General", 
        icon: "🏠", 
        questions: [
          { id: "p1", label: "¿Qué tipo de mantenimiento necesitas?", options: ["pintura industrial", "tablaroca", "impermeabilizar", "tinaco/bomba", "varios"] },
          { id: "p2", label: "¿Dónde se realizará el trabajo?", options: ["casa", "oficina", "local comercial", "industria"] },
          { id: "p3", label: "¿Qué tan grande es el trabajo?", options: ["1 día", "2-3 días", "semana+", "recurrente"] },
          { id: "p4", label: "¿Qué prioridad tiene?", options: ["hoy", "esta semana", "cotización"] }
        ]
      }
    };

    let currentService = null;
    let answers = {};
    let currentStep = 0;
    let totalSteps = 0;
    let clientData = {
      nombre: '',
      telefono: '',
      direccion: '',
      whatsapp: '',
      comentarios: ''
    };

    function toggleCard(id) {
      const card = document.getElementById(id);
      if (card) {
        card.classList.toggle('expanded');
      }
    }

    function openModal(key) {
      currentService = key;
      answers = {};
      clientData = { nombre: '', telefono: '', direccion: '', whatsapp: '', comentarios: '' };
      currentStep = 0;
      
      const cfg = serviceConfig[key];
      totalSteps = cfg.questions.length + 4;
      
      document.getElementById('modalIcon').innerText = cfg.icon;
      document.getElementById('modalServiceName').innerText = cfg.name;
      
      renderStep();
      
      document.getElementById('diagnosticModal').style.display = 'flex';
      document.body.style.overflow = 'hidden';

      document.querySelector('.hero-guide')?.remove();
    }

    function renderStep() {
      const cfg = serviceConfig[currentService];
      const container = document.getElementById('questionsContainer');
      const whatsappBtn = document.getElementById('whatsappBtn');
      const modalNav = document.getElementById('modalNav');
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      
      whatsappBtn.style.display = 'none';
      modalNav.style.display = 'flex';
      
      if (currentStep < cfg.questions.length) {
        const question = cfg.questions[currentStep];
        let html = `
          <div class="question-block">
            <label class="question-label">${question.label}</label>
            <div class="options-grid" id="q-${question.id}">
        `;
        
        question.options.forEach(opt => {
          const isSelected = answers[question.id] === opt;
          html += `<button class="option-btn ${isSelected ? 'selected' : ''}" onclick="selectOption('${question.id}', '${opt.replace(/'/g, "\\'")}', this)">${opt}</button>`;
        });
        
        html += `</div></div>`;
        container.innerHTML = html;

        const block = document.querySelector('.question-block');
        if (block && currentStep === 0) {
          block.classList.add('highlight-step');
        }
        
        const options = document.querySelectorAll('.option-btn');
        options.forEach(btn => {
          btn.addEventListener('click', function() {
            setTimeout(() => {
              if (currentStep < cfg.questions.length - 1) {
                nextStep();
              }
            }, 200);
          });
        });
        
        prevBtn.style.display = currentStep === 0 ? 'none' : 'flex';
        nextBtn.style.display = 'flex';
        nextBtn.innerHTML = 'Siguiente <i class="fas fa-arrow-right"></i>';

        const lastDiagnosticStep = cfg.questions.length - 1;
        nextBtn.querySelector('.next-pointer')?.remove();

        if (currentStep === lastDiagnosticStep) {
          nextBtn.insertAdjacentHTML('afterbegin', '<span class="next-pointer">↘</span>');
        }
        
      } else if (currentStep < cfg.questions.length + 4) {
        const dataStep = currentStep - cfg.questions.length;
        let html = '';
        
        if (dataStep === 0) {
          html = `
            <div class="question-block">
              <label class="question-label">¿A nombre de quién registramos el reporte técnico?</label>
              <input type="text" id="clientNombre" placeholder="Ej: Juan Pérez" class="input-field" value="${clientData.nombre}">
            </div>`;
        } else if (dataStep === 1) {
          html = `
            <div class="question-block">
              <label class="question-label">¿En qué número podemos contactarte?</label>
              <input type="tel" id="clientTelefono" placeholder="Ej: 8112345678" class="input-field" value="${clientData.telefono}">
            </div>`;
        } else if (dataStep === 2) {
          html = `
            <div class="question-block">
              <label class="question-label">¿Cuál es la dirección donde se realizará el trabajo?</label>
              <input type="text" id="clientDireccion" placeholder="Ej: Calle, colonia, ciudad" class="input-field" value="${clientData.direccion}">
              <p class="text-xs" style="color: var(--text-secondary); margin-top: 8px;">Esto nos ayuda a llegar más rápido</p>
            </div>`;
        } else if (dataStep === 3) {
          html = `
            <div class="question-block">
              <label class="question-label">¿Algún comentario adicional o descripción del problema?</label>
              <textarea id="clientComentarios" placeholder="Ej: El problema ocurre solo por las tardes, el equipo tiene 5 años, etc." class="input-field">${clientData.comentarios}</textarea>
            </div>`;
        }
        
        container.innerHTML = html;
        
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
        nextBtn.innerHTML = dataStep === 3 ? 'Ver resumen <i class="fas fa-check"></i>' : 'Siguiente <i class="fas fa-arrow-right"></i>';

        nextBtn.querySelector('.next-pointer')?.remove();
        
      } else {
        showSummary();
      }
    }

    function selectOption(qId, val, btn) {
      document.querySelectorAll(`#q-${qId} .option-btn`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      answers[qId] = val;

      const cfg = serviceConfig[currentService];
      const lastDiagnosticStep = cfg.questions.length - 1;

      if (currentStep === lastDiagnosticStep) {
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
          nextBtn.querySelector('.next-pointer')?.remove();
          nextBtn.insertAdjacentHTML('afterbegin', '<span class="next-pointer">↘</span>');
        }
      }
    }

    function nextStep() {
      const cfg = serviceConfig[currentService];
      
      if (currentStep >= cfg.questions.length && currentStep < cfg.questions.length + 4) {
        const dataStep = currentStep - cfg.questions.length;
        
        if (dataStep === 0) {
          const nombre = document.getElementById('clientNombre')?.value.trim();
          if (!nombre) {
            alert('El nombre es obligatorio');
            return;
          }
          clientData.nombre = nombre;
        } else if (dataStep === 1) {
          const telefono = document.getElementById('clientTelefono')?.value.trim();
          if (!telefono) {
            alert('El teléfono es obligatorio para contactarte');
            return;
          }
          clientData.telefono = telefono;
        } else if (dataStep === 2) {
          const direccion = document.getElementById('clientDireccion')?.value.trim();
          clientData.direccion = direccion;
        } else if (dataStep === 3) {
          const comentarios = document.getElementById('clientComentarios')?.value.trim();
          clientData.comentarios = comentarios;
        }
      }
      
      if (currentStep < totalSteps - 1) {
        currentStep++;
        renderStep();
      } else {
        showSummary();
      }
    }

    function previousStep() {
      if (currentStep > 0) {
        if (currentStep >= serviceConfig[currentService].questions.length) {
          const dataStep = currentStep - serviceConfig[currentService].questions.length;
          if (dataStep === 0 && document.getElementById('clientNombre')) {
            clientData.nombre = document.getElementById('clientNombre').value;
          } else if (dataStep === 1 && document.getElementById('clientTelefono')) {
            clientData.telefono = document.getElementById('clientTelefono').value;
          } else if (dataStep === 2 && document.getElementById('clientDireccion')) {
            clientData.direccion = document.getElementById('clientDireccion').value;
          } else if (dataStep === 3 && document.getElementById('clientComentarios')) {
            clientData.comentarios = document.getElementById('clientComentarios').value;
          }
        }
        
        currentStep--;
        renderStep();
      }
    }

    function showSummary() {
      const cfg = serviceConfig[currentService];
      
      let summaryHtml = '<div class="question-block"><h3 class="text-xl" style="color: var(--text-primary); margin-bottom: 16px;">📋 Resumen de tu solicitud</h3>';
      
      summaryHtml += `<div style="background: #e0f2f1; border: 1px solid #b2dfdb; border-radius: 16px; padding: 16px; margin-bottom: 20px; text-align: center;">
        <p style="color: #00695c; font-size: 0.95rem;">✨ <span style="font-weight: 600;">Gracias, ${clientData.nombre || 'cliente'}</span>. Hemos procesado tu diagnóstico. Un especialista de nuestro equipo validará esta información personalmente para darte la solución más eficiente.</p>
      </div>`;
      
      summaryHtml += '<div style="background: var(--bg-primary); border-radius: 16px; padding: 20px; margin-bottom: 16px;">';
      
      summaryHtml += `<div style="border-bottom: 1px solid var(--border-light); padding-bottom: 12px; margin-bottom: 12px;">
        <p style="color: var(--accent-light); font-weight: 600; margin-bottom: 8px;">👤 TUS DATOS</p>
        <p style="color: var(--text-primary);"><strong>Nombre:</strong> ${clientData.nombre || 'No proporcionado'}</p>
        ${clientData.telefono ? `<p style="color: var(--text-primary);"><strong>Teléfono:</strong> ${clientData.telefono}</p>` : ''}
        ${clientData.direccion ? `<p style="color: var(--text-primary);"><strong>Dirección:</strong> ${clientData.direccion}</p>` : ''}
      </div>`;
      
      summaryHtml += `<p style="color: var(--accent-light); font-weight: 600; margin-bottom: 12px;">🔧 DIAGNÓSTICO</p>`;
      
      const diagnosticText = [];
      cfg.questions.forEach(q => {
        if (answers[q.id]) {
          diagnosticText.push(answers[q.id]);
        }
      });
      
      summaryHtml += `<p style="color: var(--text-primary); background: white; padding: 12px; border-radius: 12px; margin-bottom: 12px;">${diagnosticText.join(' · ')}</p>`;
      
      if (clientData.comentarios) {
        summaryHtml += `<div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-light);">
          <p style="color: var(--accent-light); font-weight: 600; margin-bottom: 4px;">📝 COMENTARIOS</p>
          <p style="color: var(--text-primary); background: white; padding: 12px; border-radius: 12px;">${clientData.comentarios}</p>
        </div>`;
      }
      
      summaryHtml += '</div></div>';
      
      summaryHtml += `<div class="photo-suggestion">
        <span style="font-size: 1.8rem;">📸</span>
        <div>
          <p style="font-weight: 600;">¿Quieres ayudarnos a diagnosticar mejor?</p>
          <p style="font-size: 0.9rem;">Después de enviar, puedes mandarnos fotos del equipo o la instalación por WhatsApp para agilizar tu servicio.</p>
        </div>
      </div>`;
      
      document.getElementById('questionsContainer').innerHTML = summaryHtml;
      document.getElementById('modalNav').style.display = 'none';
      
      const whatsappBtn = document.getElementById('whatsappBtn');
      whatsappBtn.style.display = 'flex';
      whatsappBtn.disabled = false;
      whatsappBtn.innerHTML = '<span>📱</span><span>Conectar ahora con un técnico especializado</span>';
    }

    async function sendToWhatsApp() {
      const cfg = serviceConfig[currentService];
      const phone = '5218131590917';
      
      const ahora = new Date();
      const year = ahora.getFullYear().toString().slice(-2);
      const month = (ahora.getMonth() + 1).toString().padStart(2, '0');
      const day = ahora.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 9000 + 1000);
      const folio = `SOL-${year}${month}${day}-${random}`;
      
      const datosParaCloud = {
        action: 'nuevaSolicitud',
        idSolicitud: folio,
        cliente: clientData.nombre,
        nombreCliente: clientData.nombre,
        telefono: clientData.telefono,
        servicio: cfg.name,
        direccion: clientData.direccion,
        comentarios: clientData.comentarios,
        whatsappCliente: clientData.whatsapp || clientData.telefono,
        respuestas: answers,
        folio: folio
      };
      
      cfg.questions.forEach((q, index) => {
        datosParaCloud[`pregunta${index+1}`] = q.label;
        datosParaCloud[`respuesta${index+1}`] = answers[q.id] || '';
      });
      
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          // Enviar texto JSON evita preflight CORS por headers custom.
          body: JSON.stringify(datosParaCloud)
        });

        if (!response.ok) {
          throw new Error('Error HTTP ' + response.status);
        }

        const raw = await response.text();
        const payload = JSON.parse(raw);
        if (!payload || !payload.success) {
          throw new Error(payload && payload.error ? payload.error : 'No se pudo guardar la solicitud');
        }

        console.log('✅ Solicitud guardada en la nube con ID:', folio);
      } catch (error) {
        console.error('Error al guardar en nube:', error);
        alert('No se pudo guardar tu solicitud en el sistema. Inténtalo de nuevo.');
        return;
      }
      
      const diagnosticText = [];
      cfg.questions.forEach(q => {
        if (answers[q.id]) {
          diagnosticText.push(answers[q.id]);
        }
      });
      
      let mensaje = `Hola, buen día. Soy ${clientData.nombre || 'un cliente'}. Acabo de realizar el diagnóstico en su plataforma para un servicio de ${cfg.name}. Mi folio de seguimiento es el ${folio}. ¿Me podrían confirmar el tiempo de respuesta para una atención personal? Gracias.\n\n`;
      mensaje += `📋 *Diagnóstico:* ${diagnosticText.join(' · ')}\n\n`;
      
      if (clientData.comentarios) {
        mensaje += `📝 *Comentarios:* ${clientData.comentarios}\n\n`;
      }
      
      mensaje += `📍 *Dirección:* ${clientData.direccion || 'No proporcionada'}\n`;
      mensaje += `📞 *Teléfono:* ${clientData.telefono}`;
      
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');
      
      setTimeout(() => {
        alert('📸 Recuerda: Puedes enviarnos fotos del equipo o la instalación por WhatsApp para ayudarnos a diagnosticar mejor.');
      }, 1500);
      
      setTimeout(closeModal, 2000);
    }

    function closeModal(e) {
      if (e && e.target !== e.currentTarget) return;
      document.getElementById('diagnosticModal').style.display = 'none';
      document.body.style.overflow = 'auto';
    }

    document.addEventListener('keydown', (e) => { 
      if (e.key === 'Escape') closeModal(); 
    });
