// Video Studio UI: prompt (always open) → Claude writes the script → you edit/validate → Claude generates the video.
const $ = (s) => document.querySelector(s);
const api = async (url, opts = {}) => { const r = await fetch(url, { cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...opts }); return r.json(); };
let CAT = null, P = null, slug = new URLSearchParams(location.search).get('p'), dirty = false, saveTimer = null, selected = null;

const toolById = (id) => CAT.tools.find((t) => t.id === id);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// ---------- catalog (only tools with a working example) ----------
function renderCatalog() {
  const f = $('#filter').value.trim().toLowerCase(), nav = $('#catalog'); nav.innerHTML = '';
  for (const t of CAT.tools) {
    const styles = t.styles.filter((s) => !f || (t.name + ' ' + s.name).toLowerCase().includes(f));
    if (!styles.length) continue;
    const el = document.createElement('div'); el.className = 'tool';
    el.innerHTML = `<button class="tool-row" data-tool="${t.id}" data-style="${styles[0].id}"><span class="code">‹›</span><span class="name">${esc(t.name)}</span></button>`;
    if (styles.length > 1 || styles[0].name !== t.name) {
      const ul = document.createElement('div'); ul.className = 'styles';
      styles.forEach((s, i) => ul.insertAdjacentHTML('beforeend', `<button class="style-row ${s.example ? '' : 'noex'}" data-tool="${t.id}" data-style="${s.id}">${esc(s.name)}<span class="v">${s.example ? 'v' + (i + 1) : 'no preview yet'}</span></button>`));
      el.appendChild(ul);
    }
    nav.appendChild(el);
  }
  nav.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { select(b.dataset.tool, b.dataset.style); $('#main').scrollTo({ top: 0 }); }));
  markActive();
}
function markActive() {
  document.querySelectorAll('.style-row').forEach((b) => b.classList.toggle('active', !!selected && b.dataset.tool === selected.tool && b.dataset.style === selected.style));
  document.querySelectorAll('.tool-row').forEach((b) => b.classList.toggle('active', !!selected && b.dataset.tool === selected.tool && !b.nextElementSibling));
}
function select(toolId, styleId) {
  const t = toolById(toolId); if (!t) return;
  const st = t.styles.find((s) => s.id === styleId) || t.styles.find((s) => s.example) || t.styles[0];
  if (!st) return;
  selected = { tool: toolId, style: st.id };
  markActive();
  $('#previewTitle').textContent = st.name !== t.name ? st.name : t.name;
  $('#previewSub').textContent = st.name !== t.name ? t.name : '';
  if (st.example) { $('#noVideo').hidden = true; showVideo('/' + st.example); } else { const v = $('#player'); v.pause(); v.removeAttribute('src'); v.load(); $('#noVideo').hidden = false; $('#noVideo').innerHTML = `No preview of <b>${esc(st.name)}</b> yet: it is rendering in the background.<br>You can still pick this style and write a prompt.`; }
  const kind = t.example === 'fire' ? 'the discovery of fire' : t.example;
  $('#toolInfo').innerHTML = `<span>${esc(t.what)}</span>${t.speed ? `<span><b>Speed</b> ${esc(t.speed)}</span>` : ''}${kind ? `<span><b>Example</b> ${esc(kind)}</span>` : ''}`;
  $('#useInScene').disabled = !P || !P.scenes.length;
  $('#promptStyle').textContent = st.name !== t.name ? `${st.name} · ${t.name}` : t.name;
}
function showVideo(src, loop = true) {
  const v = $('#player'); v.loop = loop; $('#noVideo').hidden = true;
  if (v.getAttribute('src') !== src) { v.src = src; v.play().catch(() => {}); }
}
$('#mute').onclick = () => { const v = $('#player'); v.muted = !v.muted; $('#mute').textContent = v.muted ? '🔇' : '🔊'; };
$('#filter').oninput = renderCatalog;
$('#useInScene').onclick = (e) => {
  if (!P || !selected) return;
  e.stopPropagation();
  document.querySelectorAll('.menu').forEach((m) => m.remove());
  const m = document.createElement('div'); m.className = 'menu';
  const r = e.target.getBoundingClientRect(); m.style.left = r.left + 'px'; m.style.top = r.bottom + 4 + 'px';
  const value = `${selected.tool}/${selected.style}`;
  m.innerHTML = P.scenes.map((s) => `<button data-n="${s.n}">Scene ${s.n} · ${s.start}–${s.end}s</button>`).join('') + `<button data-n="all">All scenes</button>`;
  m.querySelectorAll('button').forEach((b) => (b.onclick = () => { P.scenes.forEach((s) => { if (b.dataset.n === 'all' || String(s.n) === b.dataset.n) s.tool = value; }); m.remove(); renderScenes(); touch(); }));
  document.body.appendChild(m);
  setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
};

// ---------- prompt → script ----------
$('#promptForm').onsubmit = async (e) => {
  e.preventDefault();
  const prompt = $('#prompt').value.trim(); if (!prompt) { $('#prompt').focus(); return; }
  $('#writeScript').disabled = true;
  const r = await api('/api/script', { method: 'POST', body: JSON.stringify({ prompt, format: $('#newFormat').value, style: selected ? `${selected.tool}/${selected.style}` : null }) });
  $('#writeScript').disabled = false;
  if (r.error) return alert(r.error);
  $('#prompt').value = '';
  history.replaceState(null, '', '?p=' + r.slug); slug = r.slug;
  P = await api('/api/project/' + slug); await loadProjects(); renderProject();
  $('#project').scrollIntoView({ behavior: 'smooth' });
};
$('#prompt').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#promptForm').requestSubmit(); });

// ---------- project ----------
$('#newVideo').onclick = async () => {
  if (dirty) await save();
  P = null; slug = null; dirty = false; lastStatus = null;
  history.replaceState(null, '', location.pathname);
  $('#prompt').value = ''; $('#finalModal').hidden = true; document.title = 'Video Studio';
  await loadProjects(); renderProject();
  $('#main').scrollTo({ top: 0, behavior: 'smooth' }); $('#prompt').focus();
};
async function loadProjects() {
  const list = await api('/api/projects'), pick = $('#projectPick');
  pick.innerHTML = '<option value="">Video Studio · new video</option>' + list.map((p) => `<option value="${p.slug}">${esc(p.title || p.slug)}</option>`).join('');
  pick.value = slug || '';
  pick.onchange = () => { location.search = pick.value ? '?p=' + pick.value : ''; };
}
function toolOptions(cur) {
  let html = '<option value="">— pick —</option>', found = false;
  for (const t of CAT.tools) {
    const st = t.styles; if (!st.length) continue;
    html += `<optgroup label="${esc(t.name)}">` + st.map((s) => { const v = `${t.id}/${s.id}`; if (v === cur) found = true; return `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(s.name)}</option>`; }).join('') + '</optgroup>';
  }
  if (cur && !found) html += `<option value="${esc(cur)}" selected>${esc(cur)}</option>`;
  return html;
}
function renderScenes() {
  const tb = $('#sceneRows'); tb.innerHTML = '';
  const locked = ['building', 'writing-script'].includes(P.status);
  P.scenes.forEach((s, i) => {
    const tr = document.createElement('tr'); tr.className = s.status || '';
    tr.innerHTML = `<td class="n">${s.n}</td>
      <td class="time"><input type="number" step="0.1" min="0" data-k="start" value="${s.start}">–<input type="number" step="0.1" min="0" data-k="end" value="${s.end}"></td>
      <td class="toolc"><select data-k="tool">${toolOptions(s.tool)}</select>${s.clip ? `<span class="clip" data-clip="${esc(s.clip)}">▶ rendered clip</span>` : ''}</td>
      <td><textarea data-k="visual">${esc(s.visual)}</textarea></td>
      <td><textarea data-k="narration">${esc(s.narration)}</textarea></td>
      <td><textarea data-k="onscreen">${esc(s.onscreen)}</textarea></td>
      <td><textarea data-k="sound">${esc(s.sound)}</textarea></td>
      <td><textarea data-k="notes" placeholder="specs for this scene…">${esc(s.notes)}</textarea></td>
      <td class="del"><button title="Remove scene">×</button></td>`;
    tr.querySelectorAll('[data-k]').forEach((el) => { el.disabled = locked; el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { const k = el.dataset.k; s[k] = el.type === 'number' ? +el.value : el.value; touch(); if (k === 'start' || k === 'end') updateTotal(); if (k === 'tool' && s.tool) { const [t, st] = s.tool.split('/'); select(t, st); } }); });
    const del = tr.querySelector('.del button'); del.disabled = locked;
    del.onclick = () => { P.scenes.splice(i, 1); P.scenes.forEach((x, j) => (x.n = j + 1)); renderScenes(); touch(); };
    const c = tr.querySelector('.clip'); if (c) c.onclick = () => { showVideo('/files/' + P.slug + '/' + c.dataset.clip); $('#previewTitle').textContent = `Scene ${s.n}`; $('#previewSub').textContent = 'rendered clip'; $('#main').scrollTo({ top: 0, behavior: 'smooth' }); };
    tr.querySelector('select').addEventListener('focus', () => { if (s.tool) { const [t, st] = s.tool.split('/'); select(t, st); } });
    tb.appendChild(tr);
  });
  updateTotal();
}
function updateTotal() {
  const end = Math.max(0, ...P.scenes.map((s) => +s.end || 0));
  const words = P.scenes.map((s) => s.narration || '').join(' ').split(/\s+/).filter(Boolean).length;
  $('#total').textContent = `${P.scenes.length} scenes · ${end.toFixed(1)} s · ${words} words of narration`;
}
function styleNameOf(v) { const [t, s] = String(v || '').split('/'); const tool = toolById(t); const st = tool?.styles.find((x) => x.id === s); return st ? (st.name === tool.name ? tool.name : `${st.name} (${tool.name})`) : v; }
$('#projectStyle').onchange = () => {
  const v = $('#projectStyle').value; if (!P || !v) return;
  P.style = v; P.styleName = styleNameOf(v); P.scenes.forEach((s) => (s.tool = v));
  const [t, s] = v.split('/'); select(t, s);
  renderScenes(); renderProject(); touch();
};
function renderProject() {
  $('#empty').hidden = !!P; $('#proj').hidden = !P;
  if (!P) return;
  $('#title').value = P.title || ''; $('#format').value = P.format || '9:16'; $('#voice').value = P.voice?.on === true ? P.voice.voice : 'none'; $('#music').value = P.music && P.music !== 'auto' ? P.music : 'lofi';
  $('#ideaLine').textContent = (P.styleName ? 'Style: ' + P.styleName + ' · ' : '') + (P.idea ? 'Prompt: ' + P.idea : '');
  const ps = $('#projectStyle'), cur = P.style || P.scenes.find((s) => s.tool)?.tool || '';
  ps.innerHTML = toolOptions(cur).replace('— pick —', 'Style: pick one'); ps.value = cur;
  ps.disabled = ['building', 'writing-script'].includes(P.status);
  renderScenes(); renderLive();
}
const STATUS = { 'writing-script': 'writing script…', 'script-ready': 'script ready: edit & validate', ready: 'script ready: edit & validate', draft: 'draft', 'build-requested': 'waiting for Claude', building: 'generating video…', done: 'done', error: 'error' };
function renderLive() {
  const st = $('#status'); st.textContent = STATUS[P.status] || P.status; st.className = 'status ' + P.status;
  const writing = P.status === 'writing-script';
  $('#writing').hidden = !writing; $('#scriptBlock').hidden = writing;
  const busy = ['build-requested', 'building'].includes(P.status);
  $('#build').disabled = busy || !P.scenes.length;
  $('#build').textContent = busy ? 'Generating…' : P.status === 'done' ? 'Generate again' : 'Validate script & generate video';
  $('#stop').hidden = P.status !== 'building';
  $('#addScene').disabled = busy;
  $('#log').innerHTML = (P.log || []).slice(-80).map((l) => `<li><time>${new Date(l.at).toLocaleTimeString()}</time>${esc(l.text)}</li>`).join('');
  $('#log').parentElement.scrollTop = 1e6;
  $('#showFinal').hidden = !P.final;
}
// ---------- the finished video: its own window, closes only with "Close" ----------
function openFinal(autoplay = true) {
  if (!P || !P.final) return;
  const m = $('#finalModal'), v = $('#finalVideo'), src = '/files/' + P.slug + '/' + P.final;
  $('#finalTitle').textContent = P.title || P.slug;
  $('#finalPath').textContent = P.savedPath || '(copying to the outputs folder…)';
  const dl = $('#finalDownload'); dl.href = src; dl.download = `${(P.title || P.slug).replace(/[\/:*?"<>|]+/g, '').trim() || P.slug}.mp4`;
  if (v.getAttribute('src') !== src) v.src = src;
  $('#player').pause();
  m.hidden = false;
  if (autoplay) { v.muted = false; v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); }
}
function announceFinal() {
  openFinal(true);
  document.title = '✅ ' + (P.title || 'Video') + ' is ready';
  try { if (Notification.permission === 'granted') new Notification('Your video is ready', { body: P.title }); } catch {}
}
$('#showFinal').onclick = () => openFinal(true);
$('#finalClose').onclick = () => { const v = $('#finalVideo'); v.pause(); $('#finalModal').hidden = true; document.title = 'Video Studio'; $('#player').play().catch(() => {}); };
$('#finalReveal').onclick = async () => { const r = await api(`/api/project/${P.slug}/reveal`, { method: 'POST', body: '{}' }); if (r.path) { P.savedPath = r.path; $('#finalPath').textContent = r.path; } };
$('#finalCopyPath').onclick = () => { navigator.clipboard?.writeText($('#finalPath').textContent); $('#finalCopyPath').textContent = 'Copied'; setTimeout(() => ($('#finalCopyPath').textContent = 'Copy path'), 1500); };
function touch() { dirty = true; $('#saveState').textContent = 'saving…'; clearTimeout(saveTimer); saveTimer = setTimeout(save, 600); }
async function save() {
  if (!P) return;
  clearTimeout(saveTimer);
  P = await api('/api/project/' + P.slug, { method: 'PUT', body: JSON.stringify({ title: P.title, format: P.format, voice: P.voice, music: P.music, scenes: P.scenes, style: P.style, styleName: P.styleName }) });
  dirty = false; $('#saveState').textContent = 'saved'; renderLive();
}
$('#title').oninput = () => { P.title = $('#title').value; touch(); };
$('#format').onchange = () => { P.format = $('#format').value; touch(); };
$('#voice').onchange = () => { const v = $('#voice').value; P.voice = v === 'none' ? { engine: 'kokoro', voice: 'none', on: false } : { engine: 'kokoro', voice: v, on: true }; touch(); };
$('#music').onchange = () => { P.music = $('#music').value; touch(); };
$('#addScene').onclick = () => { if (!P) return; const last = P.scenes[P.scenes.length - 1]; const s0 = last ? +last.end : 0; P.scenes.push({ n: P.scenes.length + 1, start: s0, end: +(s0 + 3).toFixed(1), tool: last ? last.tool : '', visual: '', narration: '', onscreen: '', sound: '', notes: '' }); renderScenes(); touch(); };
$('#build').onclick = async () => {
  if (!confirm('Generate the video from this script? Claude Code will render every scene (this can take a while).')) return;
  if (dirty) await save();
  try { if (window.Notification && Notification.permission === 'default') Notification.requestPermission(); } catch {}
  P = await api(`/api/project/${P.slug}/build`, { method: 'POST', body: '{}' }); renderScenes(); renderLive();
};
$('#stop').onclick = async () => { P = await api(`/api/project/${P.slug}/stop`, { method: 'POST', body: '{}' }); renderScenes(); renderLive(); };

// live updates while Claude writes or builds (never overwrite what you're typing)
let lastStatus = null;
setInterval(async () => {
  if (!P || dirty) return;
  const fresh = await api('/api/project/' + P.slug); if (fresh.error) return;
  const changedScenes = JSON.stringify(fresh.scenes) !== JSON.stringify(P.scenes) || fresh.status !== lastStatus;
  const becameDone = fresh.final && fresh.final !== P.final;
  P = fresh;
  if (changedScenes && !document.activeElement?.closest?.('#sceneRows')) { renderProject(); if (lastStatus === 'writing-script') loadProjects(); }
  lastStatus = P.status;
  renderLive();
  if (becameDone) announceFinal();
}, 2500);

(async () => {
  CAT = await api('/api/catalog');
  await loadProjects();
  if (slug) { P = await api('/api/project/' + slug); if (P.error) P = null; }
  lastStatus = P?.status;
  renderCatalog(); renderProject();
  const first = P?.scenes?.find((s) => s.tool);
  if (first) { const [t, s] = first.tool.split('/'); select(t, s); } else select('tvhead', 'prehistoric');
  if (!P) $('#prompt').focus();
})();
