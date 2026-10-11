/* Google Health 12-month running-history sync v2.1 */
(() => {
'use strict';
const DEFAULT_CONFIG={runHistoryDays:365,exerciseTypes:['RUNNING','TRAIL_RUNNING','TREADMILL_RUNNING'],pageSize:25,maxPages:100,dashboard:{recentRuns:10,weeklyChartWeeks:12,monthlyChartMonths:12,paceTrendRuns:20,splitChartLimit:20}};
let RUN_CONFIG=DEFAULT_CONFIG;
window.getVitalsRunConfig=()=>RUN_CONFIG;
function n(v){const x=Number(v);return Number.isFinite(x)?x:null}
function durationSeconds(v){if(!v)return null;const m=String(v).match(/^(-?\d+(?:\.\d+)?)s$/);return m?Number(m[1]):null}
function localDay(interval){const ms=Date.parse(interval?.startTime);if(!Number.isFinite(ms))return null;const off=parseInt(String(interval.startUtcOffset||'0'),10)||0,d=new Date(ms+off*1000);return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`}
function parseZones(z={}){return {lightSeconds:durationSeconds(z.lightTime)||0,moderateSeconds:durationSeconds(z.moderateTime)||0,vigorousSeconds:durationSeconds(z.vigorousTime)||0,peakSeconds:durationSeconds(z.peakTime)||0}}
function parseMetric(m={}){const distance=n(m.distanceMillimeters);return {distanceKm:distance==null?null:distance/1e6,caloriesKcal:n(m.caloriesKcal),steps:n(m.steps),averageHeartRate:n(m.averageHeartRateBeatsPerMinute),activeZoneMinutes:n(m.activeZoneMinutes),heartRateZones:parseZones(m.heartRateZoneDurations),averageSpeedMps:n(m.averageSpeedMillimetersPerSecond)==null?null:n(m.averageSpeedMillimetersPerSecond)/1000,paceSecondsPerKm:n(m.averagePaceSecondsPerMeter)==null?null:n(m.averagePaceSecondsPerMeter)*1000,elevationGainM:n(m.elevationGainMillimeters)==null?null:n(m.elevationGainMillimeters)/1000}}
function parseSplit(x,i){const metric=parseMetric(x.metricsSummary),activeSeconds=durationSeconds(x.activeDuration)??Math.max(0,(Date.parse(x.endTime)-Date.parse(x.startTime))/1000);if(metric.paceSecondsPerKm==null&&metric.distanceKm>0)metric.paceSecondsPerKm=activeSeconds/metric.distanceKm;return {number:i+1,type:x.splitType||'UNKNOWN',startTime:x.startTime||null,endTime:x.endTime||null,activeSeconds,...metric}}
function parseRun(dp){const e=dp.exercise;if(!e?.interval)return null;const start=Date.parse(e.interval.startTime),end=Date.parse(e.interval.endTime);if(!Number.isFinite(start)||!Number.isFinite(end))return null;const metric=parseMetric(e.metricsSummary),activeSeconds=durationSeconds(e.activeDuration)??Math.max(0,(end-start)/1000);if(metric.paceSecondsPerKm==null&&metric.distanceKm>0)metric.paceSecondsPerKm=activeSeconds/metric.distanceKm;return {id:dp.name||`${e.interval.startTime}-${e.exerciseType}`,type:e.exerciseType||'UNKNOWN',name:e.displayName||'Run',startTime:e.interval.startTime,startUtcOffset:e.interval.startUtcOffset||'0s',endTime:e.interval.endTime,endUtcOffset:e.interval.endUtcOffset||'0s',elapsedSeconds:Math.max(0,(end-start)/1000),activeSeconds,hasGps:Boolean(e.exerciseMetadata?.hasGps),device:dp.dataSource?.device?.displayName||null,platform:dp.dataSource?.platform||null,splits:(e.splitSummaries||[]).map(parseSplit),...metric}}
async function fetchConfig(){try{const r=await fetch('vitals-config.json?v=2.1',{cache:'no-store'});if(r.ok){const x=await r.json();RUN_CONFIG={...DEFAULT_CONFIG,...x,dashboard:{...DEFAULT_CONFIG.dashboard,...(x.dashboard||{})}}}}catch(e){console.warn('Using default run configuration',e)}}
async function fetchExercisePages(){
 const today=typeof todayStr==='function'?todayStr():new Date().toISOString().slice(0,10);
 const since=typeof addDays==='function'?addDays(today,-RUN_CONFIG.runHistoryDays):new Date(Date.now()-RUN_CONFIG.runHistoryDays*864e5).toISOString().slice(0,10);
 const until=typeof addDays==='function'?addDays(today,1):new Date(Date.now()+864e5).toISOString().slice(0,10);
 const filter=`exercise.interval.civil_start_time >= "${since}" AND exercise.interval.civil_start_time < "${until}"`;
 let pageToken='',out=[];
 for(let page=0;page<RUN_CONFIG.maxPages;page++){
   const q=new URLSearchParams({filter,pageSize:String(Math.min(RUN_CONFIG.pageSize||25,25))});
   if(pageToken)q.set('pageToken',pageToken);
   const r=await fetch(`${BASE}exercise/dataPoints?${q}`,{headers:{Authorization:`Bearer ${token}`}});
   if (r.status === 500) {
  logs.push(
    `exercise: stopped at page ${page + 1} due to server error`
  );
  break;
}

if (!r.ok) {
  const body = await r.text().catch(() => '');
  throw new Error(
    `exercise HTTP ${r.status}: ${body.slice(0,500)}`
  );
}
   const j=await r.json(),points=j.dataPoints||[];out.push(...points);pageToken=j.nextPageToken||'';
   if(Array.isArray(logs))logs.push(`exercise page ${page+1}: ${points.length} sessions`);
   if(!pageToken)break;
 }
 return out;
}
function storeRuns(points){const allowed=new Set(RUN_CONFIG.exerciseTypes),byId=new Map();points.forEach(dp=>{const r=parseRun(dp);if(r&&allowed.has(r.type))byId.set(r.id,r)});Object.values(S.days).forEach(d=>{if(d.runs)delete d.runs});for(const run of byId.values()){const day=localDay({startTime:run.startTime,startUtcOffset:run.startUtcOffset});if(!day)continue;const d=S.days[day]||(S.days[day]={});(d.runs||(d.runs=[])).push(run)}Object.values(S.days).forEach(d=>d.runs?.sort((a,b)=>a.startTime.localeCompare(b.startTime)));S.runSync={syncedAt:new Date().toISOString(),historyDays:RUN_CONFIG.runHistoryDays,count:byId.size};save();return byId.size}
window.syncRunHistory=async function(){if(!token){status='Sign in with Google before syncing running history.';render();return}status='Loading 12 months of exercise sessions…';render();try{const pts=await fetchExercisePages(),count=storeRuns(pts);status=`Loaded ${count} running sessions from ${pts.length} exercise sessions.`;logs.push(`exercise: ${pts.length} sessions, ${count} runs retained`)}catch(e){status=`Running-history sync failed: ${e.message}`;logs.push(status)}render();window.dispatchEvent(new CustomEvent('vitals-runs-updated'))}
fetchConfig().then(()=>{if(typeof syncAll==='function'){const base=syncAll;syncAll=async function(){await base();if(token)await window.syncRunHistory()}}});
})();
