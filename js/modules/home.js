import { getUserProfile, getActiveSession, appState } from '../state.js';
import { navigate } from '../router.js';
import { getGreeting, t } from '../utils.js';
import { collections, db, timestamp } from '../firebase-config.js';

export async function render(container) {
  const profile = getUserProfile();
  const name    = profile?.name?.split(' ')[0] || 'Atleta';
  const greeting = getGreeting();

  container.innerHTML = `
    <div class="home-screen" id="home-page" style="padding-bottom: 100px;">

      <!-- Greeting -->
      <div class="home-greeting-display" style="width:100%; margin-bottom:24px;">
        <div class="home-greeting-line1">${greeting},</div>
        <div class="home-greeting-line2">${name}</div>
      </div>

      <!-- 1. Arc Gauge -->
      <div class="glass-card" style="margin-bottom:10px; padding:16px; cursor:pointer; position:relative;" id="card-arc-gauge">
        <svg width="100%" viewBox="0 0 200 110" style="overflow:visible;">
          <defs>
            <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#C10801"/>
              <stop offset="50%" stop-color="#F16001"/>
              <stop offset="100%" stop-color="#D9C3AB"/>
            </linearGradient>
          </defs>
          <path d="M 20,100 A 80,80 0 0,1 180,100" fill="none" stroke="var(--bg-track, rgba(255,255,255,0.07))" stroke-width="10" stroke-linecap="round"/>
          <path d="M 20,100 A 80,80 0 0,1 180,100" fill="none" stroke="url(#arcGradient)" stroke-width="18" stroke-dasharray="251.3" stroke-dashoffset="32.6" opacity="var(--opacity-glow-arc, 0.22)" filter="blur(var(--blur-glow-arc, 6px))" stroke-linecap="round"/>
          <path id="arc-main" d="M 20,100 A 80,80 0 0,1 180,100" fill="none" stroke="url(#arcGradient)" stroke-width="10" stroke-dasharray="251.3" stroke-dashoffset="251.3" stroke-linecap="round" style="transition: stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)"/>
          
          <text x="100" y="88" text-anchor="middle" font-family="var(--font-display)" font-size="32px" font-weight="600" fill="var(--color-text-primary)">87%</text>
          <text x="100" y="104" text-anchor="middle" font-family="var(--font-sans)" font-size="12px" fill="var(--color-text-tertiary)">de adherencia</text>
        </svg>
        <div style="text-align:center; margin-top: 12px; font-family: var(--font-sans); font-size: 12px; color: var(--color-text-tertiary);">
          1.840 / 2.065 kcal · Proteínas 162 / 180g
        </div>
      </div>

      <!-- 2. Sparklines -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
        <div class="glass-card-secondary glass-card-sparkline" style="padding:10px 12px;">
          <div class="spark-label">Racha</div>
          <div class="spark-value" id="spark-racha">0 días</div>
          <div class="spark-bar"><div class="spark-fill" style="width:80%;background:var(--spark1)"></div></div>
        </div>
        <div class="glass-card-secondary glass-card-sparkline" style="padding:10px 12px;">
          <div class="spark-label">Kcal</div>
          <div class="spark-value">89%</div>
          <div class="spark-bar"><div class="spark-fill" style="width:89%;background:var(--spark2)"></div></div>
        </div>
        <div class="glass-card-secondary glass-card-sparkline" style="padding:10px 12px;">
          <div class="spark-label">Proteína</div>
          <div class="spark-value">162g</div>
          <div class="spark-bar"><div class="spark-fill" style="width:90%;background:var(--spark3)"></div></div>
        </div>
      </div>

      <!-- 3. Scrollable Session Timeline -->
      <div class="glass-card-secondary" style="margin-bottom:10px; padding:16px 0; cursor:pointer;" id="card-timeline">
        <div style="padding:0 16px;">
          <div class="card-label">VOLUMEN SEMANAL</div>
          <div style="display:flex;align-items:baseline;gap:6px;">
            <div class="card-val-main" id="timeline-sessions-count">0 sesiones</div>
            <div class="card-val-sub">esta semana</div>
          </div>
          <div class="scroll-hint" id="timeline-scroll-hint">← desliza para ver todas las sesiones</div>
        </div>
        
        <div class="timeline-scroll-area" id="timeline-scroll-area">
          <!-- Populated by JS -->
        </div>
        
        <div class="timeline-dots" id="timeline-dots" style="display:flex;justify-content:center;gap:4px;margin-top:12px;">
          <!-- Populated by JS -->
        </div>
      </div>

      <!-- 4. Dot matrix heatmap -->
      <div class="glass-card-secondary" style="margin-bottom:24px; padding:16px; cursor:pointer;" id="card-heatmap">
        <div class="card-label" style="margin-bottom:16px;">CONSISTENCIA · 4 SEMANAS</div>
        <div style="display:flex; justify-content:space-between; max-width: 280px; margin:0 auto;" id="heatmap-grid">
          <!-- Populated by JS -->
        </div>
        <div style="display:flex; gap:16px; margin-top:20px; font-family:var(--font-sans); font-size:10px; color:var(--color-text-tertiary); justify-content:center; align-items:center;">
          <div style="display:flex; align-items:center; gap:6px;"><div style="width:5px;height:5px;border-radius:50%;background:#F16001;"></div>Entrenado</div>
          <div style="display:flex; align-items:center; gap:6px;"><div style="width:5px;height:5px;border-radius:50%;background:var(--color-text-tertiary);"></div>Descanso</div>
        </div>
      </div>

    </div>
  `;
}

export async function init(container) {
  // Setup navigation
  container.querySelector('#card-arc-gauge')?.addEventListener('click', () => navigate('alimentacion'));
  container.querySelector('#card-timeline')?.addEventListener('click', () => navigate('entreno'));
  container.querySelector('#card-heatmap')?.addEventListener('click', () => navigate('entreno'));

  // Trigger Arc Gauge Animation
  setTimeout(() => {
    const arc = container.querySelector('#arc-main');
    if (arc) {
      // 87% adherencia = 251.3 * (1 - 0.87) = 32.669
      arc.style.strokeDashoffset = '32.669';
    }
  }, 200);

  // Load actual data for Timeline & Heatmap
  loadWorkoutData(container);
}

// Data Loading Logic
async function loadWorkoutData(container) {
  const profile = getUserProfile();
  if (!profile?.uid) return;

  try {
    const snap = await collections.workoutSessions(profile.uid)
      .orderBy('startTime', 'desc')
      .limit(30)
      .get();

    const sessions = snap.docs.map(d => d.data());
    
    // Calculate streak
    const sortedDates = [...new Set(
      sessions.map(s => {
        const d = s.startTime?.toDate?.() || new Date(s.startTime);
        return d.toISOString().split('T')[0];
      })
    )].sort().reverse();

    let streak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    let current = todayStr;
    for (const date of sortedDates) {
      if (date === current) { streak++; current = getPrevDay(current); }
      else if (date < current) break;
    }
    const streakEl = container.querySelector('#spark-racha');
    if (streakEl) streakEl.textContent = `${streak} días`;

    renderTimeline(container, sessions);
    renderHeatmap(container, sortedDates);

  } catch (e) {
    console.error("Error loading workout data", e);
    renderTimeline(container, []);
    renderHeatmap(container, []);
  }
}

function getPrevDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function renderTimeline(container, sessions) {
  const isDark = document.body.classList.contains('dark-mode') || !document.body.classList.contains('light-mode');
  const today = new Date();
  const day = today.getDay(); 
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
  const monday = new Date(today.setDate(diff));
  
  let daysOfWeek = [];
  let maxVolumeOfWeek = 1;
  let weeklySessionsCount = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    const isFuture = d > new Date();
    
    const daySessions = sessions.filter(s => {
      const sd = s.startTime?.toDate?.() || new Date(s.startTime);
      return sd.toISOString().split('T')[0] === dateStr;
    });

    let volumes = [];
    if (daySessions.length > 0) {
      weeklySessionsCount += daySessions.length;
      daySessions.forEach(session => {
        if (session.exercises && Array.isArray(session.exercises)) {
          session.exercises.forEach(ex => {
            let exVol = 0;
            if (ex.sets && Array.isArray(ex.sets)) {
              ex.sets.forEach(set => {
                const kg = parseFloat(set.weight) || 0;
                const reps = parseInt(set.reps) || 0;
                exVol += (kg > 0 ? kg * reps : reps);
              });
            }
            if (exVol > 0) volumes.push(exVol);
          });
        }
      });
      if (volumes.length === 0) volumes = [10, 15, 20]; 
    }
    
    maxVolumeOfWeek = Math.max(maxVolumeOfWeek, ...volumes);

    daysOfWeek.push({
      label: ['L','M','X','J','V','S','D'][i],
      isToday,
      isFuture,
      hasTraining: volumes.length > 0,
      volumes,
      totalSeries: volumes.length * 3
    });
  }

  const countEl = container.querySelector('#timeline-sessions-count');
  if (countEl) countEl.textContent = `${weeklySessionsCount} sesiones`;

  const scrollArea = container.querySelector('#timeline-scroll-area');
  const dotsArea = container.querySelector('#timeline-dots');
  if (!scrollArea || !dotsArea) return;

  let blocksHtml = '';
  let dotsHtml = '';

  daysOfWeek.forEach((d, idx) => {
    let barsHtml = '';
    
    if (d.isFuture) {
      barsHtml = `<div class="exercise-bar" style="height:4px;background:var(--bg-track);opacity:0.5"></div>`;
    } else if (!d.hasTraining) {
      barsHtml = `<div class="exercise-bar" style="height:4px;background:var(--bg-track);"></div>`;
    } else {
      barsHtml = d.volumes.map(vol => {
        let h = Math.max((vol / maxVolumeOfWeek) * 52, 6);
        let grad = isDark ? 
          (d.isToday ? 'linear-gradient(180deg, rgba(255,165,65,0.95) 0%, rgba(241,96,1,0.80) 100%)' : 'linear-gradient(180deg, rgba(241,96,1,0.65) 0%, rgba(193,8,1,0.45) 100%)') :
          (d.isToday ? 'linear-gradient(180deg, rgba(255,165,65,0.95) 0%, rgba(241,96,1,0.80) 100%)' : 'linear-gradient(180deg, rgba(241,96,1,0.75) 0%, rgba(193,8,1,0.55) 100%)');
        
        let glow = '';
        if (d.isToday) {
          let extraOpac = isDark ? 0.20 : 0;
          let baseOpac = 0.35 + (h/52)*0.30 + extraOpac;
          glow = `filter: drop-shadow(0 -${h*0.06}px ${h*0.19}px rgba(241,96,1,${baseOpac}))`;
        }

        return `<div class="exercise-bar" style="height:${h}px; background:${grad}; ${glow}"></div>`;
      }).join('');
    }

    let lblColor = d.isToday ? 'var(--color-text-primary)' : (d.isFuture || !d.hasTraining ? 'var(--color-text-muted)' : 'var(--color-text-tertiary)');
    let lblFontW = d.isToday ? '600' : (d.isFuture || !d.hasTraining ? '400' : '500');
    let dotHtml = d.isToday ? `<div style="width:4px;height:4px;background:var(--color-text-primary);border-radius:50%;flex-shrink:0;"></div>` : '';
    
    let subTxt = d.hasTraining ? `${d.totalSeries} ser` : '—';

    blocksHtml += `
      <div class="session-block" data-idx="${idx}">
        <div class="exercise-bars-row">${barsHtml}</div>
        <div class="session-day-label" style="color:${lblColor};font-weight:${lblFontW}">${d.label}${dotHtml}</div>
        <div class="session-series-total">${subTxt}</div>
      </div>
    `;

    dotsHtml += `<div class="scroll-dot" data-idx="${idx}" style="width:5px;height:5px;border-radius:50%;background:var(--bg-track);transition:all 200ms ease"></div>`;
  });

  scrollArea.innerHTML = blocksHtml;
  dotsArea.innerHTML = dotsHtml;

  setupScrollLogic(scrollArea, dotsArea);
}

function setupScrollLogic(scrollArea, dotsArea) {
  let isFirstVisit = !localStorage.getItem('tgwl_timeline_seen');
  const hint = document.getElementById('timeline-scroll-hint');
  if (hint && !isFirstVisit) hint.style.opacity = '0';

  const blocks = scrollArea.querySelectorAll('.session-block');
  const dots = dotsArea.querySelectorAll('.scroll-dot');
  
  let activeIdx = -1;

  const updateDots = (idx) => {
    dots.forEach((d, i) => {
      if (i === idx) {
        d.style.width = '14px';
        d.style.borderRadius = '3px';
        d.style.background = 'var(--color-text-primary)';
      } else {
        d.style.width = '5px';
        d.style.borderRadius = '50%';
        d.style.background = 'var(--bg-track)';
      }
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const newIdx = parseInt(entry.target.dataset.idx);
        if (newIdx !== activeIdx) {
          activeIdx = newIdx;
          updateDots(activeIdx);
          
          if (navigator.vibrate) navigator.vibrate([8]);
          else {
            const tallest = Array.from(entry.target.querySelectorAll('.exercise-bar'))
              .reduce((prev, curr) => (parseFloat(prev.style.height) > parseFloat(curr.style.height)) ? prev : curr, entry.target.querySelector('.exercise-bar'));
            if (tallest) {
              tallest.style.transform = 'scaleY(1.06)';
              tallest.style.transformOrigin = 'bottom';
              setTimeout(() => { tallest.style.transform = 'scaleY(1.0)'; }, 120);
            }
          }

          if (isFirstVisit && hint) {
            isFirstVisit = false;
            localStorage.setItem('tgwl_timeline_seen', '1');
            hint.style.opacity = '0';
          }
        }
      }
    });
  }, { root: scrollArea, threshold: 0.6 });

  blocks.forEach(b => observer.observe(b));

  setTimeout(() => {
    const todayBlock = Array.from(blocks).find(b => b.querySelector('.session-day-label').innerText.includes('•')) || 
                       Array.from(blocks).reverse().find(b => b.querySelector('.exercise-bar').style.height !== '4px');
    if (todayBlock) {
      todayBlock.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
    }
  }, 100);
}

function renderHeatmap(container, sortedDates) {
  const isDark = document.body.classList.contains('dark-mode') || !document.body.classList.contains('light-mode');
  const grid = container.querySelector('#heatmap-grid');
  if (!grid) return;

  const trainingSet = new Set(sortedDates);
  
  const today = new Date();
  
  const day = today.getDay(); 
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const thisMonday = new Date(today.setDate(diff));
  thisMonday.setDate(thisMonday.getDate() - 21);

  let colsHtml = '';
  const dayLabels = ['L','M','X','J','V','S','D'];

  colsHtml += `<div style="display:flex;flex-direction:column;gap:8px;margin-top:2px;">`;
  dayLabels.forEach(lbl => {
    colsHtml += `<div style="font-family:var(--font-sans);font-size:10px;color:var(--color-text-tertiary);height:9px;line-height:9px;width:12px;">${lbl}</div>`;
  });
  colsHtml += `</div>`;

  for (let w = 0; w < 4; w++) {
    let colHtml = `<div style="display:flex;flex-direction:column;gap:8px;">`;
    for (let d = 0; d < 7; d++) {
      const curDate = new Date(thisMonday);
      curDate.setDate(thisMonday.getDate() + (w * 7) + d);
      const dateStr = curDate.toISOString().split('T')[0];
      const hasT = trainingSet.has(dateStr);
      
      let bg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      let shadow = '';
      let border = '';
      
      if (hasT) {
        const intensity = Math.random();
        if (intensity < 0.33) {
          bg = isDark ? 'rgba(241,96,1,0.40)' : 'rgba(241,96,1,0.35)';
        } else if (intensity < 0.66) {
          bg = isDark ? 'rgba(241,96,1,0.70)' : 'rgba(241,96,1,0.65)';
          shadow = 'box-shadow: 0 0 3px rgba(241,96,1,0.30);';
        } else {
          bg = isDark ? 'rgba(241,96,1,0.92)' : 'rgba(241,96,1,0.90)';
          shadow = 'box-shadow: 0 0 5px rgba(241,96,1,0.55);';
        }
        
        if (w === 3) {
           border = isDark ? 'border: 1.5px solid rgba(241,96,1,0.90);' : 'border: 1.5px solid rgba(241,96,1,0.85);';
        }
      }

      colHtml += `<div style="width:9px;height:9px;border-radius:50%;background:${bg};${shadow}${border}"></div>`;
    }
    colHtml += `</div>`;
    colsHtml += colHtml;
  }

  grid.innerHTML = colsHtml;
}
