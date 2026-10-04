const STATUSES = ['Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved'];

const I18N = {
  'en-IN': {
    title: '🏛️ Gram Panchayat Complaint Management',
    navCitizen: '👨‍🌾 Citizen', navTrack: '🔍 Track Complaint', navAdmin: '👨‍💼 Admin Login', navTts: '🔊 Read Aloud',
    h2Register: '📝 Register a Complaint', lName: 'Name', lPhone: 'Phone / Contact', lCategory: 'Category',
    optSelect: '-- Select --', lDesc: 'Description', lOther: 'Please specify (which problem?)', lPhoneHint: '10-digit mobile number', btnMic: '🎤 Speak Description', lLocation: 'Location',
    btnLoc: '📡 Use My Live Location', lMedia: 'Photo / Video Evidence', btnSubmit: 'Submit Complaint',
    h2Track: '🔍 Track Your Complaint', btnSearch: 'Search',
    phTrack: 'Enter Complaint ID (e.g. GP-2026-00125)', phLoc: 'e.g. Village School Road',
    Water: 'Water', Road: 'Road', Electricity: 'Electricity', Sanitation: 'Sanitation', Drainage: 'Drainage',
    Streetlight: 'Streetlight', Agriculture: 'Agriculture', Other: 'Other',
  },
  'mr-IN': {
    title: '🏛️ ग्रामपंचायत तक्रार व्यवस्थापन',
    navCitizen: '👨‍🌾 नागरिक', navTrack: '🔍 तक्रार तपासा', navAdmin: '👨‍💼 प्रशासक लॉगिन', navTts: '🔊 ऐका',
    h2Register: '📝 तक्रार नोंदवा', lName: 'नाव', lPhone: 'फोन / संपर्क', lCategory: 'प्रकार',
    optSelect: '-- निवडा --', lDesc: 'वर्णन', btnMic: '🎤 मराठीत बोला', lLocation: 'ठिकाण',
    btnLoc: '📡 माझे सध्याचे स्थान वापरा', lMedia: 'फोटो / व्हिडिओ पुरावा', btnSubmit: 'तक्रार पाठवा',
    h2Track: '🔍 तुमची तक्रार तपासा', btnSearch: 'शोधा', lOther: 'कुठला प्रकार (सांगा)', lPhoneHint: '10 अंकी मोबाइल नंबर',
    phTrack: 'तक्रार क्रमांक टाका (उदा. GP-2026-00125)', phLoc: 'उदा. गाव शाळा रस्ता',
    Water: 'पाणी', Road: 'रस्ता', Electricity: 'वीज', Sanitation: 'स्वच्छता', Drainage: 'गटार',
    Streetlight: 'रस्त्यावरील दिवा', Agriculture: 'शेती', Other: 'इतर',
  },
};

function applyLang() {
  const lang = document.getElementById('langSel').value;
  const t = I18N[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => { if (t[el.dataset.i18n]) el.textContent = t[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-opt]').forEach(el => { if (t[el.dataset.i18nOpt]) el.textContent = t[el.dataset.i18nOpt]; });
  document.getElementById('trackId').placeholder = t.phTrack;
  document.getElementById('cLocation').placeholder = t.phLoc;
  document.getElementById('cPhone').placeholder = t.lPhoneHint;
  document.documentElement.lang = lang === 'mr-IN' ? 'mr' : 'en';
}

// 📱 Phone: digits only, exactly 10
const phoneEl = document.getElementById('cPhone');
phoneEl.addEventListener('input', () => { phoneEl.value = phoneEl.value.replace(/\D/g, '').slice(0, 10); });

// 📂 Show "please specify" field when category = Other
const catEl = document.getElementById('cCategory');
const otherBox = document.getElementById('otherBox');
const otherInput = document.getElementById('cOther');
catEl.addEventListener('change', () => {
  const isOther = catEl.value === 'Other';
  otherBox.classList.toggle('hidden', !isOther);
  otherInput.required = isOther;
});

document.getElementById('langSel').addEventListener('change', applyLang);
applyLang();

document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
  });
});

// 🎤 Voice input (Speech-to-Text) for description
document.getElementById('micBtn').addEventListener('click', () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Voice input not supported. Please use Chrome.'); return; }
  const rec = new SR();
  rec.lang = document.getElementById('langSel').value;
  rec.interimResults = false;
  rec.onresult = e => {
    const text = e.results[0][0].transcript;
    const ta = document.getElementById('cDesc');
    ta.value = (ta.value ? ta.value + ' ' : '') + text;
  };
  rec.onerror = e => alert('Mic error: ' + e.error);
  rec.start();
});

// 🔊 Text-to-Speech: read the current form summary aloud
document.getElementById('ttsBtn').addEventListener('click', () => {
  const lang = document.getElementById('langSel').value;
  const name = document.getElementById('cName').value || (lang === 'mr-IN' ? 'नाव नाही' : 'no name');
  const cat = document.getElementById('cCategory').value || (lang === 'mr-IN' ? 'निवडलेली नाही' : 'not selected');
  const desc = document.getElementById('cDesc').value || (lang === 'mr-IN' ? 'वर्णन नाही' : 'no description');
  const loc = document.getElementById('cLocation').value || (lang === 'mr-IN' ? 'ठिकाण नाही' : 'no location');
  const text = lang === 'mr-IN'
    ? `तुमचे नाव ${name}. तक्रार प्रकार ${cat}. वर्णन: ${desc}. ठिकाण: ${loc}.`
    : `Your name ${name}. Category ${cat}. Description: ${desc}. Location: ${loc}.`;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const voices = speechSynthesis.getVoices();
  const match = voices.find(v => v.lang.toLowerCase().startsWith(lang.toLowerCase().split('-')[0]));
  if (match) u.voice = match;
  if (lang === 'mr-IN' && !match) {
    // Fallback: online Google TTS voice (needs internet)
    try {
      const chunks = text.match(/.{1,180}/g) || [text];
      let i = 0;
      const playNext = () => {
        if (i >= chunks.length) return;
        const a = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=mr&q=' + encodeURIComponent(chunks[i++]));
        a.onended = playNext;
        a.play().catch(() => {});
      };
      playNext();
    } catch { alert('Marathi voice unavailable.'); }
    return;
  }
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
});

// Live location
document.getElementById('locBtn').addEventListener('click', () => {
  const msg = document.getElementById('locMsg');
  if (!navigator.geolocation) { msg.textContent = '❌ Geolocation not supported by your browser.'; return; }
  msg.textContent = '⏳ Getting your location...';
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const d = await r.json();
      if (d.display_name) address = d.display_name;
    } catch {}
    document.getElementById('cLocation').value = address;
    msg.innerHTML = `✅ Location set. <a href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank">View on map</a>`;
  }, err => {
    msg.textContent = '❌ Could not get location: ' + err.message + '. Please type it manually.';
  });
});

// Media preview
let mediaDataUrl = '';
let mediaType = '';
document.getElementById('cMedia').addEventListener('change', e => {
  const file = e.target.files[0];
  const preview = document.getElementById('mediaPreview');
  preview.innerHTML = '';
  mediaDataUrl = ''; mediaType = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    mediaDataUrl = reader.result;
    mediaType = file.type.startsWith('video') ? 'video' : 'image';
    preview.innerHTML = mediaType === 'video'
      ? `<video src="${mediaDataUrl}" controls></video>`
      : `<img src="${mediaDataUrl}" alt="evidence" />`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('complaintForm').addEventListener('submit', async e => {
  e.preventDefault();
  const phone = document.getElementById('cPhone').value.trim();
  if (!/^[0-9]{10}$/.test(phone)) {
    document.getElementById('submitResult').classList.remove('hidden');
    document.getElementById('submitResult').innerHTML =
      document.getElementById('langSel').value === 'mr-IN'
        ? '❌ कृपया 10 अंकी मोबाइल नंबर टाका.'
        : '❌ Please enter a valid 10-digit phone number.';
    return;
  }
  const cat = document.getElementById('cCategory').value;
  const other = document.getElementById('cOther').value.trim();
  if (cat === 'Other' && !other) {
    document.getElementById('submitResult').classList.remove('hidden');
    document.getElementById('submitResult').innerHTML =
      document.getElementById('langSel').value === 'mr-IN'
        ? '❌ कृपया तक्रार प्रकार सांगा.'
        : '❌ Please specify the complaint type.';
    return;
  }
  const body = {
    name: document.getElementById('cName').value.trim(),
    phone,
    category: cat === 'Other' ? `Other - ${other}` : cat,
    description: document.getElementById('cDesc').value.trim(),
    location: document.getElementById('cLocation').value.trim(),
    media: mediaDataUrl, mediaType,
  };
  const res = await fetch('/api/complaints', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json();
  const out = document.getElementById('submitResult');
  out.classList.remove('hidden');
  out.innerHTML = res.ok
    ? `✅ Complaint submitted! Your Complaint ID: <b>${data.id}</b><br>Use it to track your complaint.`
    : `❌ ${data.error}`;
  e.target.reset();
  document.getElementById('mediaPreview').innerHTML = '';
  mediaDataUrl = ''; mediaType = '';
});

document.getElementById('trackBtn').addEventListener('click', track);
document.getElementById('trackId').addEventListener('keydown', e => { if (e.key === 'Enter') track(); });
async function track() {
  const id = document.getElementById('trackId').value.trim();
  const out = document.getElementById('trackResult');
  const res = await fetch('/api/complaints/' + encodeURIComponent(id));
  const data = await res.json();
  if (!res.ok) { out.innerHTML = '<p>❌ No complaint found with that ID.</p>'; return; }
  const badge = `<span class="badge s-${data.status.replace(' ', '')}">${data.status}</span>`;
  out.innerHTML = `
    <div class="card">
      <p><b>ID:</b> ${data.id} &nbsp; ${badge}</p>
      <p><b>Category:</b> ${data.category}</p>
      <p><b>Description:</b> ${data.description}</p>
      <p><b>📍 Location:</b> ${data.location}</p>
      <p><b>Assigned To:</b> ${data.assignedTo || '—'}</p>
      <p><b>Submitted:</b> ${data.createdAt}</p>
      ${data.media ? (data.mediaType === 'video' ? `<video src="${data.media}" controls></video>` : `<img src="${data.media}" alt="evidence" />`) : ''}
      <p><b>History:</b> ${data.history.map(h => `${h.status} (${h.at})`).join(' → ')}</p>
    </div>`;
}
