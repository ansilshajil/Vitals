(() => {
'use strict';

const css = `
.ai-coach{
  margin-bottom:18px;
}

.ai-card{
  background:var(--field);
  border:1px solid var(--line);
  border-radius:16px;
  padding:16px;
}

.ai-title{
  font-size:22px;
  font-weight:700;
  margin-bottom:6px;
}

.ai-status{
  display:inline-block;
  padding:6px 12px;
  border-radius:999px;
  font-size:12px;
  font-weight:600;
  margin-bottom:12px;
}

.ai-good{
  background:rgba(0,200,120,.15);
  color:#00d084;
}

.ai-mid{
  background:rgba(255,170,0,.15);
  color:#ffb020;
}

.ai-bad{
  background:rgba(255,80,80,.15);
  color:#ff7070;
}

.ai-summary{
  line-height:1.6;
  margin-bottom:12px;
}

.ai-rec{
  margin-top:10px;
  padding:12px;
  border-radius:10px;
  background:var(--panel);
}

.ai-rec-title{
  font-weight:700;
  margin-bottom:6px;
}
`;

const st=document.createElement('style');
st.textContent=css;
document.head.appendChild(st);

function avg(arr){
  if(!arr.length) return null;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function getMetrics(){

  const keys=Object.keys(S.days||{}).sort();

  if(!keys.length) return null;

  const latestKey=keys[keys.length-1];

  const latest=S.days[latestKey];

  const score=
    typeof scoresFor==='function'
      ? scoresFor(latestKey)
      : null;

  const last7=
    keys.slice(-7).map(k=>S.days[k]);

  const sleepAvg=
    avg(
      last7
        .map(d=>d.sleepH)
        .filter(Number.isFinite)
    );

  const hrvAvg=
    avg(
      last7
        .map(d=>d.hrv)
        .filter(Number.isFinite)
    );

  const rhrAvg=
    avg(
      last7
        .map(d=>d.rhr)
        .filter(Number.isFinite)
    );

  const vo2 =
    [...keys]
      .reverse()
      .map(k=>S.days[k].vo2)
      .find(Number.isFinite);

  const runs =
    Object.values(S.days||{})
      .flatMap(d=>d.runs||[]);

  const weekRuns =
    runs.filter(r =>
      Date.parse(r.startTime) >
      Date.now()-7*86400000
    );

  const weeklyKm =
    weekRuns.reduce(
      (s,r)=>s+(r.distanceKm||0),
      0
    );

  return {
    recovery:
      score?.recovery ?? null,

    sleepAvg,
    hrvAvg,
    rhrAvg,
    vo2,
    weeklyKm,

    latestRhr:
      latest?.rhr ?? null
  };
}

function analyze(){

  const m=getMetrics();

  if(!m){
    return null;
  }

  let status='Maintain';
  let css='ai-mid';
  let summary='';
  let recommendation='';

  if(
    m.recovery>=80 &&
    m.sleepAvg>=8
  ){
    status='Productive';
    css='ai-good';

    summary=
      `Recovery is strong (${Math.round(m.recovery)}), average sleep is ${m.sleepAvg.toFixed(1)} hours, and weekly running volume is ${m.weeklyKm.toFixed(1)} km.`;

    recommendation=
      'Proceed with your planned workout or quality session.';
  }

  else if(
    m.recovery<60
  ){
    status='Recovery';
    css='ai-bad';

    summary=
      `Recovery is reduced (${Math.round(m.recovery)}). Your body may benefit from additional recovery before another hard workout.`;

    recommendation=
      'Easy recovery run or complete rest.';
  }

  else{

    summary=
      `Recovery and training metrics are mixed. Weekly running volume is ${m.weeklyKm.toFixed(1)} km and average sleep is ${m.sleepAvg?.toFixed(1) ?? '-'} hours.`;

    recommendation=
      'Moderate aerobic session.';
  }

  return {
    css,
    status,
    summary,
    recommendation,
    metrics:m
  };
}

function renderCoach(){

  const app=document.getElementById('app');

  if(!app) return;

  const old=
    app.querySelector('[data-ai-coach]');

  if(old) old.remove();

  const analysis=analyze();

  if(!analysis) return;

  const el=document.createElement('section');

  el.className='ai-coach';

  el.dataset.aiCoach='1';

  el.innerHTML=`
    <div class="ai-card">

      <div class="ai-title">
        🧠 AI Coach
      </div>

      <div class="ai-status ${analysis.css}">
        ${analysis.status}
      </div>

      <div class="ai-summary">
        ${analysis.summary}
      </div>

      <div class="ai-rec">
        <div class="ai-rec-title">
          Recommended Session
        </div>

        ${analysis.recommendation}
      </div>

      <div style="margin-top:14px">

        <b>Recovery:</b>
        ${analysis.metrics.recovery?.toFixed(0) ?? '-'}<br>

        <b>Sleep Avg:</b>
        ${analysis.metrics.sleepAvg?.toFixed(1) ?? '-'} h<br>

        <b>RHR:</b>
        ${analysis.metrics.latestRhr ?? '-'} bpm<br>

        <b>HRV Avg:</b>
        ${analysis.metrics.hrvAvg?.toFixed(0) ?? '-'} ms<br>

        <b>VO₂max:</b>
        ${analysis.metrics.vo2?.toFixed(1) ?? '-'}<br>

        <b>Weekly Distance:</b>
        ${analysis.metrics.weeklyKm.toFixed(1)} km

      </div>

    </div>
  `;

  const firstChild =
    app.firstElementChild;

  if(firstChild){
    app.insertBefore(el, firstChild);
  }
  else{
    app.appendChild(el);
  }
}

new MutationObserver(() => {
  requestAnimationFrame(renderCoach);
}).observe(
  document.body,
  {childList:true,subtree:true}
);

renderCoach();

})();