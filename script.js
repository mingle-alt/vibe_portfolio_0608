const STORAGE_KEY = 'vibePortfolio.v1';
const $ = (id) => document.getElementById(id);

let state = loadState();

function loadState() {
  const fallback = { projects: [], daily: [], weekly: [], tasks: [], updatedAt: null };
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || fallback; }
  catch { return fallback; }
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function uid(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function today() { return new Date().toISOString().slice(0, 10); }
function splitSkills(value) { return value.split(',').map(v => v.trim()).filter(Boolean); }
function escapeHtml(str = '') { return str.replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }

function setupDefaults() {
  $('projectDate').value = today();
  $('dailyDate').value = today();
}

$('projectForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = $('projectId').value || uid('project');
  const project = {
    id,
    title: $('projectTitle').value.trim(),
    date: $('projectDate').value,
    week: Number($('projectWeek').value || 0),
    skills: splitSkills($('projectSkills').value),
    demo: $('projectDemo').value.trim(),
    github: $('projectGithub').value.trim(),
    image: $('projectImage').value.trim(),
    desc: $('projectDesc').value.trim(),
    review: $('projectReview').value.trim()
  };
  const index = state.projects.findIndex(p => p.id === id);
  if (index >= 0) state.projects[index] = project;
  else state.projects.push(project);
  e.target.reset();
  $('projectId').value = '';
  setupDefaults();
  saveState();
});

$('cancelProjectEdit').addEventListener('click', () => { $('projectForm').reset(); $('projectId').value = ''; setupDefaults(); });

$('dailyForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const entry = {
    id: uid('daily'),
    date: $('dailyDate').value,
    project: $('dailyProject').value.trim(),
    learned: $('dailyLearned').value.trim(),
    blocked: $('dailyBlocked').value.trim(),
    solved: $('dailySolved').value.trim(),
    next: $('dailyNext').value.trim(),
    hours: Number($('dailyHours').value || 0)
  };
  state.daily.push(entry);
  if (entry.next) {
    state.tasks.push({ id: uid('task'), title: entry.next, sourceDate: entry.date, done: false });
  }
  e.target.reset();
  setupDefaults();
  saveState();
});

$('weeklyForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.weekly.push({
    id: uid('weekly'),
    week: Number($('weeklyWeek').value),
    project: $('weeklyProject').value.trim(),
    skill: $('weeklySkill').value.trim(),
    problem: $('weeklyProblem').value.trim(),
    growth: $('weeklyGrowth').value.trim(),
    goal: $('weeklyGoal').value.trim()
  });
  e.target.reset();
  saveState();
});

$('weekFilter').addEventListener('change', renderProjects);
$('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vibe-portfolio-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});
$('clearBtn').addEventListener('click', () => {
  if (!confirm('저장된 모든 데이터를 삭제할까요?')) return;
  state = { projects: [], daily: [], weekly: [], tasks: [], updatedAt: null };
  saveState();
});

function render() {
  renderDashboard();
  renderWeekFilter();
  renderProjects();
  renderDaily();
  renderWeekly();
  renderTasks();
  renderTimeline();
}

function renderDashboard() {
  $('projectCount').textContent = state.projects.length;
  $('dailyCount').textContent = state.daily.length;
  $('weeklyCount').textContent = state.weekly.length;
  const hours = state.daily.reduce((sum, d) => sum + Number(d.hours || 0), 0);
  $('totalHours').textContent = `${hours}h`;
  $('openTaskCount').textContent = state.tasks.filter(t => !t.done).length;
  $('doneTaskCount').textContent = state.tasks.filter(t => t.done).length;
  $('lastSaved').textContent = state.updatedAt ? `마지막 저장: ${new Date(state.updatedAt).toLocaleString('ko-KR')}` : '아직 저장된 데이터 없음';
  renderSkills();
}

function renderSkills() {
  const counts = {};
  state.projects.forEach(p => p.skills.forEach(s => counts[s] = (counts[s] || 0) + 1));
  const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  if (!entries.length) { $('skillChart').className = 'skill-chart empty'; $('skillChart').textContent = '아직 등록된 기술스택이 없습니다.'; return; }
  const max = entries[0][1];
  $('skillChart').className = 'skill-chart';
  $('skillChart').innerHTML = entries.map(([skill, count]) => `
    <div class="bar-row"><strong>${escapeHtml(skill)}</strong><div class="bar"><span style="width:${(count/max)*100}%"></span></div><b>${count}</b></div>
  `).join('');
}

function renderWeekFilter() {
  const current = $('weekFilter').value;
  const weeks = [...new Set(state.projects.map(p => p.week).filter(Boolean))].sort((a,b)=>a-b);
  $('weekFilter').innerHTML = '<option value="all">전체 주차</option>' + weeks.map(w => `<option value="${w}">${w}주차</option>`).join('');
  $('weekFilter').value = weeks.includes(Number(current)) ? current : 'all';
}

function renderProjects() {
  const filter = $('weekFilter').value;
  const projects = state.projects
    .filter(p => filter === 'all' || String(p.week) === filter)
    .sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  if (!projects.length) { $('projectList').className = 'card-list empty'; $('projectList').textContent = '아직 등록된 결과물이 없습니다.'; return; }
  $('projectList').className = 'card-list';
  $('projectList').innerHTML = projects.map(p => `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(p.title)}</h3>
          <div class="meta"><span>${p.date || '-'}</span><span>${p.week ? p.week + '주차' : '주차 미입력'}</span>${p.skills.map(s => `<span class="badge">${escapeHtml(s)}</span>`).join('')}</div>
        </div>
        <div class="actions"><button class="edit" onclick="editProject('${p.id}')">수정</button><button class="delete" onclick="deleteProject('${p.id}')">삭제</button></div>
      </div>
      ${p.image ? `<img class="thumb" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)} 썸네일">` : ''}
      ${p.desc ? `<p>${escapeHtml(p.desc)}</p>` : ''}
      ${p.review ? `<p><b>회고:</b> ${escapeHtml(p.review)}</p>` : ''}
      <div class="links">${p.demo ? `<a href="${escapeHtml(p.demo)}" target="_blank">배포 보기</a>` : ''}${p.github ? `<a href="${escapeHtml(p.github)}" target="_blank">GitHub</a>` : ''}</div>
    </article>
  `).join('');
}

window.editProject = (id) => {
  const p = state.projects.find(item => item.id === id);
  if (!p) return;
  $('projectId').value = p.id;
  $('projectTitle').value = p.title;
  $('projectDate').value = p.date;
  $('projectWeek').value = p.week || '';
  $('projectSkills').value = p.skills.join(', ');
  $('projectDemo').value = p.demo;
  $('projectGithub').value = p.github;
  $('projectImage').value = p.image;
  $('projectDesc').value = p.desc;
  $('projectReview').value = p.review;
  location.hash = '#projects';
};

window.deleteProject = (id) => {
  if (!confirm('이 결과물을 삭제할까요?')) return;
  state.projects = state.projects.filter(p => p.id !== id);
  saveState();
};

function renderDaily() {
  const list = [...state.daily].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if (!list.length) { $('dailyList').className = 'card-list empty'; $('dailyList').textContent = '아직 Daily 기록이 없습니다.'; return; }
  $('dailyList').className = 'card-list';
  $('dailyList').innerHTML = list.map(d => `
    <article class="card">
      <div class="card-top"><h3>${escapeHtml(d.date)}</h3><button class="delete" onclick="deleteDaily('${d.id}')">삭제</button></div>
      <p><b>결과물:</b> ${escapeHtml(d.project || '-')}</p>
      <p><b>배운 것:</b> ${escapeHtml(d.learned)}</p>
      <p><b>막힌 점:</b> ${escapeHtml(d.blocked || '-')}</p>
      <p><b>해결 방법:</b> ${escapeHtml(d.solved || '-')}</p>
      <p><b>내일 개선:</b> ${escapeHtml(d.next || '-')}</p>
      <span class="badge">${d.hours || 0}h</span>
    </article>
  `).join('');
}
window.deleteDaily = (id) => { state.daily = state.daily.filter(d => d.id !== id); saveState(); };

function renderWeekly() {
  const list = [...state.weekly].sort((a,b)=>b.week-a.week);
  if (!list.length) { $('weeklyList').className = 'card-list empty'; $('weeklyList').textContent = '아직 Weekly 기록이 없습니다.'; return; }
  $('weeklyList').className = 'card-list';
  $('weeklyList').innerHTML = list.map(w => `
    <article class="card">
      <div class="card-top"><h3>Week ${w.week}</h3><button class="delete" onclick="deleteWeekly('${w.id}')">삭제</button></div>
      <p><b>대표 결과물:</b> ${escapeHtml(w.project || '-')}</p>
      <p><b>주요 기술:</b> ${escapeHtml(w.skill || '-')}</p>
      <p><b>어려웠던 문제:</b> ${escapeHtml(w.problem || '-')}</p>
      <p><b>성장한 부분:</b> ${escapeHtml(w.growth || '-')}</p>
      <p><b>다음 목표:</b> ${escapeHtml(w.goal || '-')}</p>
    </article>
  `).join('');
}
window.deleteWeekly = (id) => { state.weekly = state.weekly.filter(w => w.id !== id); saveState(); };

function renderTasks() {
  if (!state.tasks.length) { $('taskList').className = 'task-list empty'; $('taskList').textContent = 'Daily Loop에서 “내일 개선할 점”을 저장하면 자동으로 과제가 생성됩니다.'; return; }
  $('taskList').className = 'task-list';
  $('taskList').innerHTML = state.tasks.map(t => `
    <div class="task ${t.done ? 'done' : ''}">
      <div><b>${escapeHtml(t.title)}</b><div class="meta">등록일: ${escapeHtml(t.sourceDate || '-')}</div></div>
      <button onclick="toggleTask('${t.id}')">${t.done ? '다시 열기' : '해결 완료'}</button>
    </div>
  `).join('');
}
window.toggleTask = (id) => { const t = state.tasks.find(t => t.id === id); if (t) t.done = !t.done; saveState(); };

function renderTimeline() {
  const items = [
    ...state.projects.map(p => ({ type: '결과물', date: p.date, title: p.title, desc: p.desc, week: p.week })),
    ...state.daily.map(d => ({ type: 'Daily', date: d.date, title: d.project || 'Daily 회고', desc: d.learned })),
  ].filter(i => i.date).sort((a,b)=>b.date.localeCompare(a.date));
  if (!items.length) { $('timelineList').className = 'timeline empty'; $('timelineList').textContent = '아직 타임라인 데이터가 없습니다.'; return; }
  $('timelineList').className = 'timeline';
  $('timelineList').innerHTML = items.map(i => `
    <div class="timeline-item">
      <div class="meta"><span>${escapeHtml(i.date)}</span><span>${i.week ? i.week + '주차' : ''}</span><span class="badge">${escapeHtml(i.type)}</span></div>
      <h3>${escapeHtml(i.title)}</h3>
      <p>${escapeHtml(i.desc || '')}</p>
    </div>
  `).join('');
}

setupDefaults();
render();
