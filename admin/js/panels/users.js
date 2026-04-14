import { db, collections, timestamp } from '../../../js/firebase-config.js';
import { toast, getInitials } from '../../../js/utils.js';

let _profile = null;
let _clients = [];

export async function render(container, profile) {
  _profile = profile;
  
  if (!document.getElementById('dash-users-css')) {
    const style = document.createElement('style');
    style.id = 'dash-users-css';
    style.textContent = `
      .us-layout { padding: 40px; height: 100%; overflow-y: auto; background: var(--color-bg); }
      .us-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
      .us-title { font-size: 28px; font-weight: 800; color: var(--white); }
      
      .us-table-container { background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 16px; overflow: hidden; }
      .us-table { width: 100%; border-collapse: collapse; text-align: left; }
      .us-table th { padding: 16px 24px; color: var(--color-text-muted); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); }
      .us-table td { padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }
      .us-table tr:last-child td { border-bottom: none; }
      .us-table tr:hover { background: rgba(255,255,255,0.03); }
      
      .us-user-cell { display: flex; align-items: center; gap: 16px; }
      .us-avatar { width: 40px; height: 40px; border-radius: 50%; background: rgba(25, 249, 249, 0.15); color: var(--cyan); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
      
      .us-badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; background: rgba(255,255,255,0.1); color: var(--white); }
      .us-badge-role { background: rgba(251, 146, 60, 0.15); color: rgb(251, 146, 60); }
    `;
    document.head.appendChild(style);
  }

  container.innerHTML = `
    <div class="us-layout">
      <div class="us-header">
        <h2 class="us-title">👥 Gestión de Usuarios</h2>
        <input type="text" id="us-search" placeholder="🔍 Buscar nombre o email..." style="padding:12px 16px; border-radius:12px; border:1px solid var(--glass-border); background:rgba(0,0,0,0.2); color:white; width:300px;">
      </div>
      
      <div class="us-table-container">
        <table class="us-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Entrenador</th>
              <th>Nutricionista</th>
              <th>Último acceso</th>
            </tr>
          </thead>
          <tbody id="us-table-body">
            <tr>
              <td colspan="5" style="text-align:center;padding:40px;opacity:0.5"><div class="spinner-sm" style="margin:0 auto"></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export async function init(container, profile) {
  loadData(container);

  const searchInput = container.querySelector('#us-search');
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    container.querySelectorAll('.us-row').forEach(row => {
      const match = row.dataset.search.includes(q);
      row.style.display = match ? '' : 'none';
    });
  });
}

async function loadData(container) {
  const tbody = container.querySelector('#us-table-body');
  try {
    const snap = await db.collection('users').orderBy('name').limit(200).get();
    _clients = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

    // Extract all coaching staff dictionaries for resolving names mapping
    const coaches = await db.collection('users').where('role', 'in', ['coach', 'medico', 'fisio', 'psicologo', 'nutricionista']).get();
    const staffMap = {};
    coaches.docs.forEach(d => { staffMap[d.id] = d.data().name || d.data().email });

    if (_clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay usuarios.</td></tr>';
      return;
    }

    tbody.innerHTML = _clients.map(c => {
      const isStaff = ['coach','medico','fisio','psicologo','nutricionista','admin'].includes(c.role);
      const searchStr = `${(c.name||'').toLowerCase()} ${(c.email||'').toLowerCase()} ${c.role||''}`;
      
      const coachName = c.assignedCoach ? (staffMap[c.assignedCoach] || 'Asignado') : '—';
      const nutriName = c.assignedNutricionista ? (staffMap[c.assignedNutricionista] || 'Asignada') : '—';
      
      return `
        <tr class="us-row" data-search="${searchStr}">
          <td>
            <div class="us-user-cell">
              <div class="us-avatar">${getInitials(c.name || '?')}</div>
              <div>
                <div style="font-weight:600;font-size:14px;color:var(--white)">${c.name || 'Sin nombre'}</div>
                <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px">${c.email || ''}</div>
              </div>
            </div>
          </td>
          <td><span class="us-badge ${isStaff ? 'us-badge-role' : ''}">${(c.role || 'cliente').toUpperCase()}</span></td>
          <td><span style="font-size:13px;color:var(--color-text-muted)">${coachName}</span></td>
          <td><span style="font-size:13px;color:var(--color-text-muted)">${nutriName}</span></td>
          <td><span style="font-size:12px;color:var(--color-text-muted)">${formatDate(c.updatedAt)}</span></td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#ef4444;">Error al cargar datos.</td></tr>';
  }
}

function formatDate(ts) {
  if (!ts) return 'Nunca';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  } catch { return 'Nunca'; }
}
