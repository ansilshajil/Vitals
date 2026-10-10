/* Vitals Healthspan polished UI v3.1
 * Add immediately before </body>, after the existing application script:
 * <script src="healthspan-polish.js?v=3.1"></script>
 */
(() => {
  'use strict';
  const BUILD = '3.1';
  const css = `
  .hs-wrap{position:relative;overflow:hidden}.hs-wrap:after{content:"";position:absolute;width:190px;height:190px;border-radius:50%;right:-105px;top:-105px;background:color-mix(in srgb,var(--accent) 15%,transparent);pointer-events:none}.hs-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.hs-kicker{text-transform:uppercase;letter-spacing:.09em;font-size:11px;font-weight:600;color:var(--accent)}.hs-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:5px 9px;font-size:12px;white-space:nowrap}.hs-dot{width:8px;height:8px;border-radius:50%;background:currentColor}.hs-agegrid{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;margin:12px 0}.hs-main{background:var(--panel);color:var(--panelText);padding:18px;border-radius:15px}.hs-main .hs-label{color:var(--panelMuted)}.hs-age{font:700 66px/.95 var(--num);margin:7px 0}.hs-compare{font-size:14px}.hs-side{display:grid;gap:10px}.hs-mini{background:var(--field);border:1px solid var(--line);border-radius:12px;padding:12px}.hs-label{font-size:12px;color:var(--muted)}.hs-value{font:700 28px/1.1 var(--num);margin-top:3px}.hs-detail{font-size:12px;color:var(--muted);margin-top:4px}.hs-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.hs-card{background:var(--field);border:1px solid var(--line);border-radius:12px;padding:13px}.hs-progress{height:6px;background:var(--line);border-radius:999px;overflow:hidden;margin-top:8px}.hs-progress span{display:block;height:100%;background:var(--accent);border-radius:inherit}.hs-contrib{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--line)}.hs-contrib strong,.hs-contrib small{display:block}.hs-contrib small{color:var(--muted)}.hs-delta{font:700 22px var(--num)}.hs-method{font-size:12px;color:var(--muted);margin:13px 0}.hs-build{font-size:11px;color:var(--muted);margin-top:8px}@media(max-width:390px){.hs-agegrid{grid-template-columns:1fr}.hs-side{grid-template-columns:1fr 1fr}}
  `;
  const style = document.createElement('style');
  style.id = 'healthspan-polish-css';
  style.textContent = css;
  document.head.appendChild(style);

  function clsForConfidence(v){ return v >= 80 ? 'good' : v >= 60 ? 'mid' : 'bad'; }
  function deltaRow(title,note,value){
    const cls = value <= 0 ? 'good' : 'bad';
    return `<div class="hs-contrib"><div><strong>${title}</strong><small>${note}</small></div><div class="hs-delta ${cls}">${value>0?'+':''}${value.toFixed(1)} yr</div></div>`;
  }
  function replaceHealthspan(){
    if(typeof S === 'undefined' || typeof healthspanAge !== 'function' || typeof dates !== 'function') return;
    const sections = [...document.querySelectorAll('section')];
    const section = sections.find(x => x.querySelector('h2')?.textContent.trim() === 'Healthspan age');
    if(!section) return;
    section.classList.add('hs-wrap');
    const ds = dates().filter(k => { const d=S.days[k]; return d && (d.hrv!=null || d.rhr!=null || d.sleepMin!=null); });
    if(!ds.length) return;
    const hs = healthspanAge(ds.at(-1));
    if(!hs){
      section.innerHTML = `<div class="hs-kicker">Long-term wellness estimate</div><h2>Healthspan age</h2><p class="note">Add age and sex in Settings and sync a VO₂max record. Confidence improves as up to 180 days of sleep, resting-heart-rate and activity data accumulate.</p><div class="hs-build">Healthspan build ${BUILD}</div>`;
      return;
    }
    const diff=hs.age-S.profile.age;
    const comparison=Math.abs(diff)<0.05?'Aligned with chronological age':`${Math.abs(diff).toFixed(1)} years ${diff<0?'younger':'older'} than chronological age`;
    const anchor=hs.anchor<=18.05?'≤18':hs.anchor.toFixed(1);
    const paceClass=hs.pace==null?'muted':hs.pace<.95?'good':hs.pace>1.05?'bad':'mid';
    const paceText=hs.pace==null?'Needs 21 recent valid days':hs.pace<.95?'Recent trend is favorable':hs.pace>1.05?'Recent trend needs attention':'Recent trend is stable';
    section.innerHTML=`<div class="hs-head"><div><div class="hs-kicker">Long-term wellness estimate</div><h2>Healthspan age</h2></div><span class="hs-pill ${clsForConfidence(hs.confidence)}"><span class="hs-dot"></span>${hs.confidence}% confidence</span></div><div class="hs-agegrid"><div class="hs-main"><div class="hs-label">Estimated Healthspan age</div><div class="hs-age">${hs.age.toFixed(1)}</div><div class="hs-compare">${comparison}</div></div><div class="hs-side"><div class="hs-mini"><div class="hs-label">Chronological age</div><div class="hs-value">${S.profile.age}</div></div><div class="hs-mini"><div class="hs-label">Pace indicator</div><div class="hs-value ${paceClass}">${hs.pace==null?'–':hs.pace.toFixed(2)+'×'}</div><div class="hs-detail">${paceText}</div></div></div></div><div class="hs-cards"><div class="hs-card"><div class="hs-label">VO₂ fitness-age anchor</div><div class="hs-value">${anchor}</div><div class="hs-detail">VO₂max ${hs.vo2.toFixed(1)} mL/kg/min</div></div><div class="hs-card"><div class="hs-label">Calibration</div><div class="hs-value">${hs.validDays}</div><div class="hs-detail">valid trend days</div><div class="hs-progress"><span style="width:${hs.confidence}%"></span></div></div></div><h3 style="margin-top:18px">Age contributors</h3>${deltaRow('Sleep','Long-term duration versus personal sleep need',hs.adjustments.sleep)}${deltaRow('Resting heart rate','Long-term median with a capped adjustment',hs.adjustments.rhr)}${deltaRow('Recorded activity','Average daily heart-rate-zone minutes',hs.adjustments.activity)}<p class="hs-method">VO₂max is mapped to sex-specific HUNT3 population age-band means using interpolation. Sleep, resting-HR and activity adjustments are transparent wellness heuristics capped at ±2 years each. The total estimate is capped at ±15 years from chronological age.</p><div class="warn small">This is a wellness estimate, not clinical biological age, KDM, PhenoAge, an epigenetic clock, or WHOOP’s proprietary score.</div><div class="hs-build">Healthspan build ${BUILD}</div>`;
  }

  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;replaceHealthspan();});});
  observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  replaceHealthspan();
})();
