const STATUSES = ['Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved'];

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' }, ...opts,
  });
  if (res.status === 401) { location.href = 'login.html'; throw new Error('unauthorized'); }
  return res.json();
}

(async function init() {
  const me = await api('/api/auth/me');
  if (!me.admin) { location.href = 'login.html'; return; }
  document.getElementById('who').textContent = '👤 ' + me.admin;
  load();
})();

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  location.href = 'login.html';
});

async function load() {
  const list = await api('/api/admin/complaints');
  document.getElementById('stats').innerHTML = STATUSES.map(s =>
    `<div class="stat">${s}: ${list.filter(c => c.status === s).length}</div>`).join('');
  document.getElementById('tbody').innerHTML = list.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.category}</td>
      <td>${c.description}</td>
      <td>${c.location}</td>
      <td><span class="badge s-${c.status.replace(' ', '')}">${c.status}</span></td>
      <td>${c.assignedTo || '—'}</td>
      <td>${c.media ? (c.mediaType === 'video'
        ? `<video src="${c.media}" style="max-width:140px;max-height:100px" controls preload="metadata"></video>`
        : `<img src="${c.media}" style="max-width:140px;max-height:100px;border-radius:6px;cursor:zoom-in" onclick="showBig(this.src)" alt="evidence" />`) : '—'}</td>
      <td class="actions">
        ${STATUSES.filter(s => s !== c.status).map(s =>
          `<button data-id="${c.id}" data-status="${s}">➜ ${s}</button>`).join('')}
        <button data-id="${c.id}" data-assign="1">👷 Assign</button>
        <button data-id="${c.id}" data-del="1">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="8">No complaints yet.</td></tr>';

  document.querySelectorAll('button[data-status]').forEach(b => b.addEventListener('click', async () => {
    await api(`/api/admin/complaints/${b.dataset.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: b.dataset.status }) });
    load();
  }));
  document.querySelectorAll('button[data-assign]').forEach(b => b.addEventListener('click', async () => {
    const name = prompt('Assign to officer/team name:');
    if (!name) return;
    await api(`/api/admin/complaints/${b.dataset.id}/assign`, { method: 'PATCH', body: JSON.stringify({ assignedTo: name }) });
    load();
  }));
  document.querySelectorAll('button[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this complaint?')) return;
    await api(`/api/admin/complaints/${b.dataset.id}`, { method: 'DELETE' });
    load();
  }));
}
