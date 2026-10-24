/* Vitals 365-Day Resting Heart Rate Chart v1.0
 * Load after running-dashboard-v3.js.
 * Uses S.days[YYYY-MM-DD].rhr already synced by the main Vitals app.
 */
(() => {
  'use strict';

  const BUILD = '1.0';
  const DAY_MS = 86400000;

  const css = `
    .rhr365-section{position:relative}
    .rhr365-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .rhr365-kicker{text-transform:uppercase;letter-spacing:.09em;font-size:11px;font-weight:600;color:var(--accent)}
    .rhr365-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}
    .rhr365-card{background:var(--field);border:1px solid var(--line);border-radius:12px;padding:13px}
    .rhr365-label{font-size:12px;color:var(--muted)}
    .rhr365-value{font:700 28px/1.1 var(--num);margin-top:4px}
    .rhr365-detail{font-size:12px;color:var(--muted);margin-top:4px}
    .rhr365-chart{display:grid;grid-template-columns:52px minmax(0,1fr);gap:8px;margin-top:14px}
    .rhr365-yaxis{height:240px;display:flex;flex-direction:column;justify-content:space-between;text-align:right;font-size:10px;color:var(--muted);padding:8px 0 28px}
    .rhr365-plot{position:relative;min-width:0;height:240px;overflow:hidden}
    .rhr365-gridlines{position:absolute;inset:8px 0 28px;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none}
    .rhr365-gridline{border-top:1px dashed color-mix(in srgb,var(--line) 82%,transparent)}
    .rhr365-svg{position:absolute;inset:8px 0 28px;width:100%;height:204px;overflow:visible}
    .rhr365-svg circle{opacity:.82}
    .rhr365-svg circle:hover{opacity:1;stroke:var(--panel-text);stroke-width:1.5}
    .rhr365-months{position:absolute;left:0;right:0;bottom:0;height:24px;color:var(--muted);font-size:9px}
    .rhr365-month{position:absolute;transform:translateX(-50%);white-space:nowrap}
    .rhr365-note{font-size:12px;color:var(--muted);margin-top:10px}
    .rhr365-empty{padding:15px;border:1px dashed var(--line);border-radius:10px;color:var(--muted);margin-top:12px}
    @media(max-width:520px){
      .rhr365-grid{grid-template-columns:repeat(2,1fr)}
      .rhr365-chart{grid-template-columns:45px minmax(0,1fr)}
      .rhr365-yaxis{font-size:9px}
      .rhr365-month:nth-child(even){display:none}
    }
  `;

  if (!document.getElementById('rhr365-style')) {
    const style = document.createElement('style');
    style.id = 'rhr365-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function dateString(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function getData() {
    if (typeof S === 'undefined' || !S.days) return [];

    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - 364 * DAY_MS);
    const startKey = dateString(start);
    const endKey = dateString(end);

    return Object.entries(S.days)
      .filter(([date, day]) =>
        date >= startKey &&
        date <= endKey &&
        Number.isFinite(day && day.rhr)
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, day]) => ({
        date,
        time: Date.parse(date + 'T00:00:00'),
        value: Number(day.rhr)
      }));
  }

  function monthLabels(startTime, endTime) {
    const labels = [];
    const d = new Date(startTime);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);

    while (d.getTime() <= endTime) {
      const pct = ((d.getTime() - startTime) / (endTime - startTime)) * 100;
      labels.push({
        pct: Math.max(0, Math.min(100, pct)),
        text: d.toLocaleDateString(undefined, { month: 'short' })
      });
      d.setMonth(d.getMonth() + 1);
    }
    return labels;
  }

  function chartHtml(data) {
    if (data.length < 2) {
      return '<div class="rhr365-empty">Not enough daily resting-heart-rate records in the last 365 days.</div>';
    }

    const values = data.map(x => x.value);
    let min = Math.floor(Math.min(...values) - 2);
    let max = Math.ceil(Math.max(...values) + 2);
    if (max <= min) max = min + 4;

    const W = 1200;
    const H = 204;
    const PAD = 5;
    const startTime = new Date(data[data.length - 1].time - 364 * DAY_MS).getTime();
    const endTime = data[data.length - 1].time;
    const rangeTime = Math.max(DAY_MS, endTime - startTime);
    const rangeValue = max - min;

    const points = data.map(item => ({
      ...item,
      x: ((item.time - startTime) / rangeTime) * W,
      y: PAD + ((max - item.value) / rangeValue) * (H - 2 * PAD)
    }));

    const line = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const tickValues = Array.from({ length: 5 }, (_, i) => max - (rangeValue * i / 4));
    const months = monthLabels(startTime, endTime);

    return `
      <div class="rhr365-chart">
        <div class="rhr365-yaxis">
          ${tickValues.map(v => `<span>${Math.round(v)} bpm</span>`).join('')}
        </div>
        <div class="rhr365-plot">
          <div class="rhr365-gridlines">
            ${tickValues.map(() => '<div class="rhr365-gridline"></div>').join('')}
          </div>
          <svg class="rhr365-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Daily resting heart rate over the last 365 days">
            <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"></polyline>
            ${points.map(p => `
              <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.4" fill="var(--accent)" vector-effect="non-scaling-stroke">
                <title>${p.date}: ${p.value} bpm</title>
              </circle>
            `).join('')}
          </svg>
          <div class="rhr365-months">
            ${months.map(m => `<span class="rhr365-month" style="left:${m.pct.toFixed(2)}%">${m.text}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderRhr365() {
    const app = document.getElementById('app');
    if (!app) return;

    const existing = app.querySelector('[data-rhr365]');
    if (existing) existing.remove();

    const data = getData();
    const section = document.createElement('section');
    section.className = 'rhr365-section';
    section.dataset.rhr365 = BUILD;

    if (data.length) {
      const values = data.map(x => x.value);
      const current = data[data.length - 1];
      const lowest = Math.min(...values);
      const highest = Math.max(...values);

      section.innerHTML = `
        <div class="rhr365-head">
          <div>
            <div class="rhr365-kicker">Daily physiology</div>
            <h2>Resting heart rate</h2>
            <div class="sub">Individual daily measurements from the last 365 days</div>
          </div>
          <span class="pill">${data.length} points</span>
        </div>
        <div class="rhr365-grid">
          <div class="rhr365-card">
            <div class="rhr365-label">Latest</div>
            <div class="rhr365-value">${Math.round(current.value)} bpm</div>
            <div class="rhr365-detail">${new Date(current.date + 'T12:00:00').toLocaleDateString()}</div>
          </div>
          <div class="rhr365-card">
            <div class="rhr365-label">Lowest</div>
            <div class="rhr365-value">${Math.round(lowest)} bpm</div>
            <div class="rhr365-detail">available daily records</div>
          </div>
          <div class="rhr365-card">
            <div class="rhr365-label">Highest</div>
            <div class="rhr365-value">${Math.round(highest)} bpm</div>
            <div class="rhr365-detail">available daily records</div>
          </div>
          <div class="rhr365-card">
            <div class="rhr365-label">Measurements</div>
            <div class="rhr365-value">${data.length}</div>
            <div class="rhr365-detail">actual days with RHR</div>
          </div>
        </div>
        ${chartHtml(data)}
        <p class="rhr365-note">Each dot is one actual daily resting-heart-rate value. Missing dates are left as gaps in time rather than filled with an average. Hover a point to see its date and bpm value.</p>
      `;
    } else {
      section.innerHTML = `
        <div class="rhr365-kicker">Daily physiology</div>
        <h2>Resting heart rate</h2>
        <div class="rhr365-empty">No daily resting-heart-rate values are currently available in saved Vitals data.</div>
      `;
    }

    const running = app.querySelector('[data-actual-runs]');
    if (running) {
      app.insertBefore(section, running);
      return;
    }

    const details = app.querySelector('details');
    if (details) app.insertBefore(section, details);
    else app.appendChild(section);
  }

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      renderRhr365();
    });
  });

  observer.observe(document.getElementById('app') || document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener('vitals-runs-updated', renderRhr365);
  renderRhr365();
})();
