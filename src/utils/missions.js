import ctx from '../engine-bridge.js';

export const MISSIONS = [
  { id: 'letters50', title: 'Type 50 letters', target: 50, field: 'letters' },
  { id: 'streak20', title: 'Hit a 20 streak', target: 20, field: 'bestStreak' },
  { id: 'stars3', title: 'Collect 3 stars', target: 3, field: 'stars' },
  { id: 'perfect10', title: 'Land 10 perfects', target: 10, field: 'perfects' },
  { id: 'survive45', title: 'Survive 45 seconds', target: 45, field: 'time' }
];

// Live mutable reference into the save blob (kr_mission_progress facade) --
// getMissionProgress()'s backfill loop below mutates it directly, matching
// the original's in-memory-only backfill (no persist) until
// updateMissionsFromRun() explicitly calls saveProgress().
function loadProgress(){
  return ctx.save.get().missions;
}

function saveProgress(progress){
  ctx.save.patch({ missions: progress });
}

export function getMissionProgress(){
  const progress = loadProgress();
  MISSIONS.forEach(m => {
    if (!progress[m.id]) progress[m.id] = { value: 0, complete: false };
  });
  return progress;
}

export function getMissionLines(limit = 3){
  const progress = getMissionProgress();
  return MISSIONS
    .filter(m => !progress[m.id].complete)
    .slice(0, limit)
    .map(m => {
      const value = Math.min(m.target, Math.floor(progress[m.id].value || 0));
      return `${m.title.toUpperCase()}  ${value}/${m.target}`;
    });
}

export function updateMissionsFromRun(run){
  const progress = getMissionProgress();
  MISSIONS.forEach(m => {
    const nextValue = Math.max(progress[m.id].value || 0, Number(run[m.field] || 0));
    progress[m.id] = {
      value: Math.min(m.target, nextValue),
      complete: nextValue >= m.target
    };
  });
  saveProgress(progress);
  return progress;
}
