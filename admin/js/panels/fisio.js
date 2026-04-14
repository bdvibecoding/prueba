import { db, collections, timestamp } from '../../../js/firebase-config.js';
import { toast, getInitials } from '../../../js/utils.js';

let _profile = null;
let _clients = [];
let _selectedClient = null;

export async function render(container, profile) {
  _profile = profile;
  // Shared styles injected globally by other views already, or fallback:
  container.innerHTML = `
    <div class="dash-panel-layout">
      <div class="dash-panel-list-col">
        <div class="dash-panel-head">
          <h3 style="font-size:20px;font-weight:700;margin:0 0 16px 0;">Mis Pacientes</h3>
          <input type="text" class="dash-input" id="fisio-search" placeholder="Buscar paciente...">
        </div>
        <div class="dash-panel-list" id="fisio-clients-container">
          <div style="text-align:center;padding:40px;opacity:0.5"><div class="spinner-sm"></div></div>
        </div>
      </div>
      
      <div class="dash-builder-col" id="fisio-builder-container">
        <div class="dash-empty-state">
          <div style="font-size:64px;margin-bottom:24px;">🦴</div>
          <h2 style="font-size:24px;font-weight:700;margin-bottom:8px">Fisioterapia</h2>
          <p style="color:var(--color-text-muted);font-size:15px">Selecciona un paciente para ver o agregar registros</p>
        </div>
      </div>
    </div>
  `;
}

export async function init(container, profile) {
  await loadClients(container, profile);

  const searchInput = container.querySelector('#fisio-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.dash-client-card').forEach(card => {
        const name = card.dataset.name.toLowerCase();
        card.style.display = name.includes(q) ? '' : 'none';
      });
    });
  }
}

async function loadClients(container, profile) {
  const el = container.querySelector('#fisio-clients-container');
  try {
    let snap;
    if (profile.role === 'admin') {
      snap = await db.collection('users').orderBy('name').limit(100).get();
    } else {
      snap = await db.collection('users').where('assignedFisio', '==', profile.uid).limit(60).get();
    }
    
    _clients = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    
    if (_clients.length === 0) {
      el.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--color-text-muted);font-size:14px;">No tienes pacientes asignados.</div>`;
      return;
    }
    
    el.innerHTML = _clients.map(c => `
      <div class="dash-client-card" data-uid="${c.uid}" data-name="${(c.name||'').replace(/"/g,'')}">
        <div class="dash-avatar">${getInitials(c.name || '?')}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name || 'Sin nombre'}</div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px">${c.email || ''}</div>
        </div>
      </div>
    `).join('');

    el.querySelectorAll('.dash-client-card').forEach(card => {
      card.addEventListener('click', () => {
        el.querySelectorAll('.dash-client-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        _selectedClient = _clients.find(c => c.uid === card.dataset.uid);
        if (_selectedClient) { renderBuilder(container); loadHistory(container); }
      });
    });
  } catch (err) {
    el.innerHTML = `<p style="padding:24px;color:#ef4444">Error al cargar pacientes</p>`;
  }
}

function renderBuilder(container) {
  const el = container.querySelector('#fisio-builder-container');
  if (!_selectedClient) return;

  el.innerHTML = `
    <div class="dash-builder-head">
      <div>
        <div style="font-size:13px;color:var(--cyan);font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">REGISTRO DE FISIO DE</div>
        <div style="font-size:28px;font-weight:800;color:var(--white)">${_selectedClient.name}</div>
      </div>
    </div>
    
    <div class="dash-builder-body" id="fi-form-body">
      <div class="dash-section-title">🦴 Nueva Nota de Fisio</div>
      
      <div class="dash-input-group" style="margin-bottom:32px">
        <label class="dash-label">Evolución de lesiones / Tratamiento aplicado</label>
        <textarea id="fi-notes" class="dash-textarea" style="min-height:150px" placeholder="Describe la consulta de fisioterapia, masajes, pautas preventivas..."></textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-bottom:40px;border-bottom:1px solid var(--glass-border);padding-bottom:40px;">
        <button class="btn-save-dash" id="btn-submit-fi">
          <span style="font-size:20px">💾</span> Guardar Nota
        </button>
      </div>

      <div class="dash-section-title">📚 Historial Anterior</div>
      <div id="fi-history-container">
        <div style="text-align:center;padding:24px;opacity:0.5"><div class="spinner-sm"></div></div>
      </div>
    </div>
  `;

  el.querySelector('#btn-submit-fi').addEventListener('click', () => submitHealth(container));
}

async function loadHistory(container) {
  const el = container.querySelector('#fi-history-container');
  if (!el || !_selectedClient) return;

  try {
    const snap = await collections.health(_selectedClient.uid)
      .where('type', '==', 'fisio')
      .orderBy('date', 'desc')
      .limit(20).get();
      
    if (snap.empty) {
      el.innerHTML = '<div style="padding:20px;border:1px dashed rgba(255,255,255,0.1);border-radius:12px;color:#888;">Sin registros de fisio.</div>';
      return;
    }

    el.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const dateStr = d.date?.toDate ? d.date.toDate().toLocaleString() : new Date(d.date).toLocaleString();
      return `
        <div style="background:rgba(255,255,255,0.02);border:1px solid var(--glass-border);border-radius:12px;padding:20px;margin-bottom:16px;">
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:8px;">${dateStr}</div>
          <div style="font-size:14px;color:var(--white);white-space:pre-wrap;line-height:1.6;">${String(d.notes).replace(/</g, '&lt;')}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    el.innerHTML = '<div style="color:#ef4444">Error cargando historial de fisio.</div>';
  }
}

async function submitHealth(container) {
  const notes = document.getElementById('fi-notes').value.trim();
  if (!notes) { toast('El registro está vacío', 'warning'); return; }

  const btn = document.getElementById('btn-submit-fi');
  btn.disabled = true;
  btn.innerHTML = 'Guardando...';

  try {
    await collections.health(_selectedClient.uid).add({
      notes,
      type: 'fisio',
      date: timestamp(),
      addedBy: _profile.uid,
      createdAt: timestamp()
    });
    
    toast('Nota de fisio guardada ✅', 'success');
    document.getElementById('fi-notes').value = '';
    loadHistory(container);
    
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span style="font-size:20px">💾</span> Guardar Nota`;
  }
}
