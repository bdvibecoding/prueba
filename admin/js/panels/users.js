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
      .us-layout { padding: 32px 40px; overflow-y: auto; background: var(--color-bg); }
      .us-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
      .us-title { font-size: 22px; font-weight: 700; color: var(--color-text); display: flex; align-items: center; gap: 10px; }

      .us-table-container { background: rgba(255,255,255,0.02); border: 0.5px solid var(--glass-border); border-radius: var(--r-lg,14px); overflow-x: auto; }
      .us-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 560px; }
      .us-table th { padding: 12px 20px; color: var(--color-text-muted); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 0.5px solid var(--glass-border); background: rgba(0,0,0,0.1); white-space: nowrap; }
      .us-table td { padding: 14px 20px; border-bottom: 0.5px solid rgba(255,255,255,0.04); vertical-align: middle; }
      .us-table tr:last-child td { border-bottom: none; }
      .us-table tr:hover td { background: rgba(255,255,255,0.02); }

      .us-user-cell { display: flex; align-items: center; gap: 12px; }
      .us-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(193,8,1,0.08); color: var(--red,#C10801); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }

      .us-badge { display: inline-block; padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; background: rgba(255,255,255,0.07); color: var(--color-text-muted); }
      .us-badge-role { background: rgba(193,8,1,0.08); color: var(--red,#C10801); }
      .us-search { padding: 10px 14px; border-radius: var(--r-md,10px); border: 0.5px solid var(--glass-border); background: var(--glass-bg); color: var(--color-text); font-family: inherit; font-size: 13px; min-width: 200px; max-width: 280px; }
    `;
    document.head.appendChild(style);
  }

  container.innerHTML = `
    <div class="us-layout">
      <div class="us-header">
        <h2 class="us-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;color:var(--red,#C10801)"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>
          Gestión de Usuarios
        </h2>
        <input type="text" id="us-search" class="us-search" placeholder="Buscar nombre o email...">
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
                <div style="font-weight:600;font-size:14px;color:var(--color-text)">${c.name || 'Sin nombre'}</div>
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
