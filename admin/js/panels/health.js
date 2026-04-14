import { db, collections, timestamp } from '../../../js/firebase-config.js';
import { toast, getInitials } from '../../../js/utils.js';

let _profile = null;
let _clients = [];
let _selectedClient = null;

export async function render(container, profile) {
  _profile = profile;
  
  // Re-use layout styles from diet or define them if missing
  if (!document.getElementById('dash-panel-css')) {
     // (Assume dash-panel-css is already injected by diet/routines if visited, 
     // but inject just in case they land here directly)
     const style = document.createElement('style');
     style.id = 'dash-panel-css';
     style.textContent = `
      .dash-panel-layout { display: flex; height: 100%; width: 100%; overflow: hidden; }
      .dash-panel-list-col { width: 320px; border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; background: var(--color-bg); flex-shrink: 0; }
      .dash-panel-head { padding: 24px; border-bottom: 1px solid var(--glass-border); }
      .dash-panel-list { flex: 1; overflow-y: auto; padding: 12px; }
      .dash-client-card { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 8px; }
      .dash-client-card:hover { background: var(--glass-bg); }
      .dash-client-card.active { background: var(--glass-bg-strong); border-color: var(--cyan); box-shadow: inset 4px 0 0 var(--cyan); }
      .dash-avatar { width: 44px; height: 44px; border-radius: 50%; background: rgba(0, 200, 255, 0.15); color: var(--cyan); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }
      
      .dash-builder-col { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--color-bg); position: relative; }
      .dash-builder-head { padding: 32px 40px; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: var(--glass-bg); }
      .dash-builder-body { flex: 1; overflow-y: auto; padding: 40px; }
      
      .dash-empty-state { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.5; }
      
      .dash-section-title { font-size: 18px; font-weight: 700; margin-bottom: 24px; color: var(--white); display: flex; align-items: center; gap: 8px; }
      .dash-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
      
      .dash-input-group { display: flex; flex-direction: column; gap: 10px; }
      .dash-label { font-size: 13px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      .dash-input { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px 16px; font-size: 15px; color: var(--white); font-family: inherit; transition: border-color 0.2s; width: 100%; box-sizing: border-box; }
      .dash-input:focus { outline: none; border-color: var(--cyan); }
      .dash-textarea { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px; font-size: 15px; color: var(--white); font-family: inherit; resize: vertical; min-height: 100px; transition: border-color 0.2s; width: 100%; box-sizing: border-box; }
      .dash-textarea:focus { outline: none; border-color: var(--cyan); }
      
      .dash-bottom-action { position: sticky; bottom: 0; background: var(--color-bg); padding: 24px 40px; border-top: 1px solid var(--glass-border); display: flex; justify-content: flex-end; }
      .btn-save-dash { background: var(--cyan); color: #000; font-weight: 700; font-size: 16px; padding: 16px 32px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: opacity 0.2s; }
      .btn-save-dash:hover { opacity: 0.9; }
     `;
     document.head.appendChild(style);
  }

  container.innerHTML = `
    <div class="dash-panel-layout">
      <div class="dash-panel-list-col">
        <div class="dash-panel-head">
          <h3 style="font-size:20px;font-weight:700;margin:0 0 16px 0;">Mis Pacientes</h3>
          <input type="text" class="dash-input" id="health-search" placeholder="Buscar paciente...">
        </div>
        <div class="dash-panel-list" id="health-clients-container">
          <div style="text-align:center;padding:40px;opacity:0.5"><div class="spinner-sm"></div></div>
        </div>
      </div>
      
      <div class="dash-builder-col" id="health-builder-container">
        <div class="dash-empty-state">
          <div style="font-size:64px;margin-bottom:24px;">🩺</div>
          <h2 style="font-size:24px;font-weight:700;margin-bottom:8px">Historial Médico</h2>
          <p style="color:var(--color-text-muted);font-size:15px">Selecciona un paciente para ver o agregar registros</p>
        </div>
      </div>
    </div>
  `;
}

export async function init(container, profile) {
  await loadClients(container, profile);

  const searchInput = container.querySelector('#health-search');
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
  const el = container.querySelector('#health-clients-container');
  try {
    let snap;
    if (profile.role === 'admin') {
      snap = await db.collection('users').orderBy('name').limit(100).get();
    } else {
      snap = await db.collection('users').where('assignedMedico', '==', profile.uid).limit(60).get();
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
        const client = _clients.find(c => c.uid === card.dataset.uid);
        if (client) {
          _selectedClient = client;
          renderBuilder(container);
          loadHistory(container);
        }
      });
    });
  } catch (err) {
    el.innerHTML = `<p style="padding:24px;color:#ef4444">Error al cargar pacientes</p>`;
  }
}

function renderBuilder(container) {
  const el = container.querySelector('#health-builder-container');
  if (!_selectedClient) return;

  el.innerHTML = `
    <div class="dash-builder-head">
      <div>
        <div style="font-size:13px;color:var(--cyan);font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">HISTORIAL MÉDICO DE</div>
        <div style="font-size:28px;font-weight:800;color:var(--white)">${_selectedClient.name}</div>
      </div>
    </div>
    
    <div class="dash-builder-body" id="hl-form-body">
      <div class="dash-section-title">🩺 Nuevo Registro Médico</div>
      
      <div class="dash-input-group" style="margin-bottom:32px">
        <label class="dash-label">Diagnóstico / Resumen Visita</label>
        <textarea id="hl-notes" class="dash-textarea" style="min-height:150px" placeholder="Describe la consulta médica, medicación recetada, diagnóstico..."></textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-bottom:40px;border-bottom:1px solid var(--glass-border);padding-bottom:40px;">
        <button class="btn-save-dash" id="btn-submit-hl">
          <span style="font-size:20px">💾</span> Guardar Registro
        </button>
      </div>

      <div class="dash-section-title">📚 Historial Anterior</div>
      <div id="hl-history-container">
        <div style="text-align:center;padding:24px;opacity:0.5"><div class="spinner-sm"></div></div>
      </div>
    </div>
  `;

  el.querySelector('#btn-submit-hl').addEventListener('click', () => submitHealth(container));
}

async function loadHistory(container) {
  const el = container.querySelector('#hl-history-container');
  if (!el || !_selectedClient) return;

  try {
    const snap = await collections.health(_selectedClient.uid)
      .where('type', '==', 'medico')
      .orderBy('date', 'desc')
      .limit(20).get();
      
    if (snap.empty) {
      el.innerHTML = '<div style="padding:20px;border:1px dashed rgba(255,255,255,0.1);border-radius:12px;color:#888;">Sin registros anteriores médicos.</div>';
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
    el.innerHTML = '<div style="color:#ef4444">Error cargando historial médico.</div>';
    console.error(err);
  }
}

async function submitHealth(container) {
  const notes = document.getElementById('hl-notes').value.trim();
  if (!notes) { toast('El registro está vacío', 'warning'); return; }

  const btn = document.getElementById('btn-submit-hl');
  btn.disabled = true;
  btn.innerHTML = 'Guardando...';

  try {
    await collections.health(_selectedClient.uid).add({
      notes,
      type: 'medico',
      date: timestamp(),
      addedBy: _profile.uid,
      createdAt: timestamp()
    });
    
    toast('Registro médico guardado ✅', 'success');
    document.getElementById('hl-notes').value = '';
    loadHistory(container);
    
  } catch (err) {
    console.error(err);
    toast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span style="font-size:20px">💾</span> Guardar Registro`;
  }
}
