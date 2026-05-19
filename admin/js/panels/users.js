import { db } from '../../../js/firebase-config.js';
import { toast, getInitials } from '../../../js/utils.js';

let _profile = null;
let _clients  = [];
let _staffMap = {};
let _activeRole = 'all';

const ROLES = [
  { key: 'all',           label: 'Todos' },
  { key: 'admin',         label: 'Administrador' },
  { key: 'coach',         label: 'Coach' },
  { key: 'nutricionista', label: 'Nutricionista' },
  { key: 'medico',        label: 'Médico' },
  { key: 'fisio',         label: 'Fisio' },
  { key: 'psicologo',     label: 'Psicólogo' },
  { key: 'cliente',       label: 'Cliente' },
];

export async function render(container, profile) {
  _profile = profile;

  if (!document.getElementById('dash-users-css')) {
    const style = document.createElement('style');
    style.id = 'dash-users-css';
    style.textContent = `
      .us-layout {
        display: flex; flex-direction: column;
        height: 100%; overflow: hidden;
        background: var(--color-bg);
      }
      /* ── Sticky header area ── */
      .us-top {
        flex-shrink: 0;
        padding: 28px 40px 0;
        background: var(--color-bg);
        border-bottom: 0.5px solid var(--glass-border);
      }
      .us-header {
        display: flex; justify-content: space-between;
        align-items: center; gap: 16px;
        margin-bottom: 20px; flex-wrap: wrap;
      }
      .us-title {
        font-size: 22px; font-weight: 700;
        color: var(--color-text);
        display: flex; align-items: center; gap: 10px;
        white-space: nowrap;
      }
      .us-search {
        padding: 9px 14px;
        border-radius: var(--r-md, 10px);
        border: 0.5px solid var(--glass-border);
        background: var(--glass-bg);
        color: var(--color-text);
        font-family: inherit; font-size: 13px;
        min-width: 200px; max-width: 260px;
        flex-shrink: 0;
      }
      /* ── Role filter chips ── */
      .us-filters {
        display: flex; gap: 4px;
        overflow-x: auto; padding-bottom: 0;
        scrollbar-width: none;
      }
      .us-filters::-webkit-scrollbar { display: none; }
      .us-filter-btn {
        flex-shrink: 0;
        padding: 8px 14px;
        font-size: 13px; font-weight: 500;
        border: none; background: none;
        color: var(--color-text-muted);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: color 0.15s, border-color 0.15s;
        white-space: nowrap;
        font-family: inherit;
      }
      .us-filter-btn.active {
        color: var(--color-text);
        border-bottom-color: var(--red, #C10801);
        font-weight: 600;
      }
      /* ── Scrollable table area ── */
      .us-body {
        flex: 1; overflow-y: auto; overflow-x: auto;
        padding: 0;
      }
      .us-table {
        width: 100%; border-collapse: collapse;
        text-align: left; min-width: 580px;
      }
      .us-table th {
        position: sticky; top: 0; z-index: 1;
        padding: 11px 20px;
        color: var(--color-text-muted);
        font-size: 11px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.08em;
        border-bottom: 0.5px solid var(--glass-border);
        background: var(--color-bg);
        white-space: nowrap;
      }
      .us-table td {
        padding: 13px 20px;
        border-bottom: 0.5px solid rgba(255,255,255,0.04);
        vertical-align: middle;
      }
      .us-table tr:last-child td { border-bottom: none; }
      .us-table tr:hover td { background: rgba(255,255,255,0.02); }
      .us-user-cell { display: flex; align-items: center; gap: 12px; }
      .us-avatar {
        width: 34px; height: 34px; border-radius: 50%;
        background: rgba(193,8,1,0.08); color: var(--red,#C10801);
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 12px; flex-shrink: 0;
      }
      .us-badge {
        display: inline-block; padding: 3px 8px;
        border-radius: 5px; font-size: 11px; font-weight: 600;
        background: rgba(255,255,255,0.07); color: var(--color-text-muted);
        white-space: nowrap;
      }
      .us-badge-staff { background: rgba(193,8,1,0.08); color: var(--red,#C10801); }
      .us-badge-pending {
        background: rgba(245,158,11,0.12); color: #f59e0b;
      }
      .us-count {
        font-size: 12px; color: var(--color-text-muted);
        margin-left: 4px; font-weight: 400;
      }
    `;
    document.head.appendChild(style);
  }

  container.innerHTML = `
    <div class="us-layout">
      <div class="us-top">
        <div class="us-header">
          <h2 class="us-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"
              style="width:20px;height:20px;color:var(--red,#C10801);flex-shrink:0">
              <circle cx="9" cy="7" r="4"/>
              <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              <path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
            </svg>
            Usuarios
          </h2>
          <input type="text" id="us-search" class="us-search" placeholder="Buscar nombre o email…">
        </div>
        <div class="us-filters" id="us-filters">
          ${ROLES.map(r => `
            <button class="us-filter-btn${r.key === 'all' ? ' active' : ''}"
              data-role="${r.key}">${r.label}</button>
          `).join('')}
        </div>
      </div>

      <div class="us-body">
        <table class="us-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Coach</th>
              <th>Nutricionista</th>
              <th>Estado</th>
              <th>Último acceso</th>
            </tr>
          </thead>
          <tbody id="us-tbody">
            <tr><td colspan="6" style="text-align:center;padding:48px;opacity:0.4">
              <div class="spinner-sm" style="margin:0 auto"></div>
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export async function init(container, profile) {
  await loadData(container);

  // Role filters
  container.querySelectorAll('.us-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.us-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _activeRole = btn.dataset.role;
      applyFilters(container);
    });
  });

  // Search
  container.querySelector('#us-search').addEventListener('input', e => {
    applyFilters(container, e.target.value.toLowerCase());
  });
}

async function loadData(container) {
  const tbody = container.querySelector('#us-tbody');
  try {
    const [usersSnap, staffSnap] = await Promise.all([
      db.collection('users').orderBy('name').limit(300).get(),
      db.collection('users').where('role', 'in',
        ['coach','medico','fisio','psicologo','nutricionista']).get(),
    ]);

    staffSnap.docs.forEach(d => {
      _staffMap[d.id] = d.data().name || d.data().email || '—';
    });

    _clients = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

    if (!_clients.length) {
      tbody.innerHTML = `<tr><td colspan="6"
        style="text-align:center;padding:48px;color:var(--color-text-muted)">
        No hay usuarios registrados.</td></tr>`;
      return;
    }

    renderRows(container, _clients);

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6"
      style="text-align:center;padding:32px;color:var(--color-danger)">
      Error al cargar: ${err.message}</td></tr>`;
  }
}

function applyFilters(container, searchQ = '') {
  const q = searchQ || container.querySelector('#us-search')?.value?.toLowerCase() || '';
  let filtered = _clients;
  if (_activeRole !== 'all') {
    filtered = filtered.filter(c => (c.role || 'cliente') === _activeRole);
  }
  if (q) {
    filtered = filtered.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }
  renderRows(container, filtered);
}

function renderRows(container, list) {
  const tbody = container.querySelector('#us-tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"
      style="text-align:center;padding:40px;color:var(--color-text-muted)">
      Sin resultados.</td></tr>`;
    return;
  }
  const STAFF_ROLES = ['coach','medico','fisio','psicologo','nutricionista','admin'];
  tbody.innerHTML = list.map(c => {
    const role     = c.role || 'cliente';
    const isStaff  = STAFF_ROLES.includes(role);
    const isPending = c.status === 'pending' || !c.name;
    const coach    = c.assignedCoach        ? (_staffMap[c.assignedCoach]        || '—') : '—';
    const nutri    = c.assignedNutricionista ? (_staffMap[c.assignedNutricionista] || '—') : '—';
    const statusBadge = isPending
      ? `<span class="us-badge us-badge-pending">Pendiente</span>`
      : `<span class="us-badge">Activo</span>`;
    // All roles can be clients of the gym — admins/coaches train too
    return `
      <tr class="us-row-clickable" data-uid="${c.uid}" style="cursor:pointer">
        <td>
          <div class="us-user-cell">
            <div class="us-avatar">${getInitials(c.name || '?')}</div>
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--color-text)">
                ${c.name || '<span style="color:var(--color-text-muted);font-style:italic">Sin nombre</span>'}
              </div>
              <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px">
                ${c.email || ''}
              </div>
            </div>
          </div>
        </td>
        <td><span class="us-badge ${isStaff ? 'us-badge-staff' : ''}">${role.toUpperCase()}</span></td>
        <td><span style="font-size:13px;color:var(--color-text-muted)">${coach}</span></td>
        <td><span style="font-size:13px;color:var(--color-text-muted)">${nutri}</span></td>
        <td>${statusBadge}</td>
        <td><span style="font-size:12px;color:var(--color-text-muted)">${fmtDate(c.updatedAt)}</span></td>
      </tr>`;
  }).join('');

  // Wire row clicks to open the permission editor (clients only)
  tbody.querySelectorAll('.us-row-clickable').forEach(row => {
    row.addEventListener('click', () => {
      const uid = row.dataset.uid;
      const user = _clients.find(c => c.uid === uid);
      if (user) openUserPermissionsModal(user);
    });
  });
}

// ── User permissions modal (canCreateRoutines · canUseDropsets) ──────
function openUserPermissionsModal(user) {
  const existing = document.getElementById('us-perm-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'us-perm-modal';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99990;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.6);padding:20px;
  `;
  overlay.innerHTML = `
    <div style="background:var(--color-bg-card,#1A1A1A);
                border:0.5px solid var(--color-border-tertiary,var(--glass-border));
                border-radius:var(--r-md,14px);padding:24px;
                max-width:420px;width:100%;
                font-family:'SF Pro Text',var(--font-sans)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px">
        <div style="flex:1;min-width:0">
          <h3 style="margin:0 0 4px;font-size:17px;font-weight:600;color:var(--color-text-primary,var(--color-text))">
            ${user.name || 'Usuario'}
          </h3>
          <p style="margin:0;font-size:12px;color:var(--color-text-tertiary,var(--color-text-muted))">${user.email || ''}</p>
        </div>
        <button id="us-perm-close" style="background:none;border:none;font-size:20px;
                color:var(--color-text-muted);cursor:pointer;padding:4px 8px;line-height:1">&times;</button>
      </div>

      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;
                  color:var(--color-text-tertiary,var(--color-text-muted));margin-bottom:10px;font-weight:600">
        Permisos
      </div>

      <div style="padding:14px;background:var(--color-background-primary,var(--glass-bg));
                  border:0.5px solid var(--color-border-tertiary,var(--glass-border));
                  border-radius:var(--r-sm,8px);display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:500;color:var(--color-text-primary,var(--color-text))">
            Crear sus propias rutinas
          </div>
          <div style="font-size:12px;color:var(--color-text-tertiary,var(--color-text-muted));margin-top:2px">
            Permite a este cliente crear y editar sus rutinas desde la app
          </div>
        </div>
        <label class="toggle-switch" style="flex-shrink:0">
          <input type="checkbox" id="us-perm-routines" ${user.canCreateRoutines ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div style="padding:14px;background:var(--color-background-primary,var(--glass-bg));
                  border:0.5px solid var(--color-border-tertiary,var(--glass-border));
                  border-radius:var(--r-sm,8px);display:flex;align-items:center;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:500;color:var(--color-text-primary,var(--color-text))">
            Usar drop sets
          </div>
          <div style="font-size:12px;color:var(--color-text-tertiary,var(--color-text-muted));margin-top:2px">
            Muestra el botón "Drop" en cada serie durante el entreno
          </div>
        </div>
        <label class="toggle-switch" style="flex-shrink:0">
          <input type="checkbox" id="us-perm-drops" ${user.canUseDropsets ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Close handlers
  const close = () => overlay.remove();
  overlay.querySelector('#us-perm-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // Toggle handlers
  overlay.querySelector('#us-perm-routines').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    try {
      await db.collection('users').doc(user.uid).update({
        canCreateRoutines: enabled,
        updatedAt: new Date(),
      });
      user.canCreateRoutines = enabled;
      toast(enabled ? 'Permiso activado · puede crear rutinas' : 'Permiso desactivado', 'success');
    } catch (err) {
      e.target.checked = !enabled;
      toast('Error: ' + err.message, 'error');
    }
  });

  overlay.querySelector('#us-perm-drops').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    try {
      await db.collection('users').doc(user.uid).update({
        canUseDropsets: enabled,
        updatedAt: new Date(),
      });
      user.canUseDropsets = enabled;
      toast(enabled ? 'Drop sets activados' : 'Drop sets desactivados', 'success');
    } catch (err) {
      e.target.checked = !enabled;
      toast('Error: ' + err.message, 'error');
    }
  });
}

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
  } catch { return '—'; }
}
