/* ============================================
   MERAKI v2 — AI-Powered Boutique CRM
   Gemini AI + Bulk WhatsApp with 4s Delay
   ============================================ */

const DB_KEY = 'meraki_data';

const defaultData = {
  customers: [], purchases: [], messages: [],
  templates: [
    { id:'tpl_bday', name:'Birthday Wish', category:'birthday', body:'🎂 Happy Birthday {name}! 🎉👗\n\nWishing you a year filled with style and elegance! ✨\n\nAs our special birthday gift, enjoy FLAT 20% OFF on your next purchase at Meraki! 💜\n\nValid for 7 days. Let your style speak! 💍' },
    { id:'tpl_newcollection', name:'New Collection', category:'newcollection', body:'👗✨ Hi {name}!\n\nOur stunning NEW COLLECTION just dropped at Meraki! 💜\n\nGorgeous sarees, elegant suits, trendy western wear & more!\n\n📍 Visit us today & be the first to explore!\n\nLet your style speak! 💍' },
    { id:'tpl_sale', name:'Sale Alert', category:'sale', body:'🏷️ FLASH SALE at Meraki! 🔥\n\nHi {name}!\n\nUp to 50% OFF on selected styles!\nSarees | Suits | Lehengas | Western Wear\n\nOffer valid till stocks last!\n📍 Visit today!\n\nLet your style speak! 👗' },
    { id:'tpl_festival', name:'Festival Offer', category:'festival', body:'🪔✨ Hi {name}!\n\nFestive Season Special at MERAKI! 🎉\n\nFlat 25% OFF on all ethnic wear!\nSarees | Lehengas | Suits | Kurtis\n\n📍 Visit us & shine bright!\n\nLet your style speak! 💜' },
    { id:'tpl_restock', name:'Back in Stock', category:'restock', body:'📦 Good news {name}!\n\nThe item you loved is BACK IN STOCK at Meraki! 🎉\n\nGrab it before it sells out again!\n\n📍 Visit us today!\n\nLet your style speak! 👗' },
    { id:'tpl_styling', name:'Styling Tips', category:'styling', body:'💡 Style Tip for {name}!\n\n✨ Pair a statement necklace with a simple kurti for an effortlessly chic look!\n\nNeed more styling advice? Visit Meraki! 💜' },
    { id:'tpl_followup', name:'Follow Up', category:'followup', body:'Hi {name}! 💜\n\nThank you for visiting Meraki! We hope you loved your purchase! 👗\n\nWe\'d love to see how you styled it! 📸\n\nLet your style speak! ✨' },
    { id:'tpl_missyou', name:'We Miss You', category:'followup', body:'💕 Hi {name},\n\nWe miss you at Meraki! Come back & enjoy 15% off! 🎁\n\nWe have beautiful new arrivals waiting!\n\n📍 See you soon!\n\nLet your style speak! 👗' },
  ],
  settings: { shopName:'Meraki', slogan:'Let Your Style Speak', geminiApiKey:'AIzaSyDVLPtWwu3uIs5IugBmOJtQ-oI840rHWHY' }
};

let data;
let bulkSendState = { active: false, cancelled: false };

// ---- Data ----
function loadData() {
  try {
    const s = localStorage.getItem(DB_KEY);
    data = s ? { ...defaultData, ...JSON.parse(s) } : JSON.parse(JSON.stringify(defaultData));
    data.templates = data.templates || defaultData.templates;
    data.settings = { ...defaultData.settings, ...(data.settings || {}) };
  } catch { data = JSON.parse(JSON.stringify(defaultData)); }
}
function saveData() { localStorage.setItem(DB_KEY, JSON.stringify(data)); }

// ---- Utilities ----
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function getInitials(n) { return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }
function getAvatarColor(n) {
  const c = ['#8B5CF6','#7C3AED','#6D28D9','#C084FC','#F43F5E','#EC4899','#D4A853','#10B981','#3B82F6','#F59E0B','#EF4444','#14B8A6','#A855F7','#D946EF'];
  let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}
function formatINR(a) { return '₹' + Number(a || 0).toLocaleString('en-IN'); }
function formatDate(d) {
  if (!d) return '-';
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dt = new Date(d); return `${dt.getDate()} ${m[dt.getMonth()]} ${dt.getFullYear()}`;
}
function formatDateTime(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function getBirthdayInfo(birthday) {
  if (!birthday) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const p = birthday.split('-');
  const bday = new Date(today.getFullYear(), parseInt(p[1])-1, parseInt(p[2]));
  if (bday < today) bday.setFullYear(today.getFullYear() + 1);
  return { daysUntil: Math.ceil((bday - today) / 86400000), date: bday };
}
function showToast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg;
  t.classList.remove('hidden'); t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.classList.add('hidden'), 300); }, 2500);
}

// ---- Gemini AI ----
async function callGemini(prompt) {
  const apiKey = data.settings.geminiApiKey;
  if (!apiKey) throw new Error('NO_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API Error ${res.status}`);
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function buildAIPrompt(type, tone, length, keywords, instructions, customer) {
  const shop = data.settings.shopName || 'Meraki';
  const slogan = data.settings.slogan || 'Let Your Style Speak';
  const name = customer ? customer.name.split(' ')[0] : '{customer_name}';
  const prefs = customer?.preferences?.join(', ') || '';
  const tag = customer?.tag || '';
  const size = customer?.size || '';

  const typeDescriptions = {
    birthday: `a birthday wish for a customer named ${name}`,
    newcollection: `announcing a new clothing collection arrival`,
    sale: `a sale/offer announcement with discounts`,
    festival: `a festive season offer (Diwali, Eid, Christmas, etc.)`,
    followup: `a follow-up message after a recent purchase`,
    restock: `notifying that a previously out-of-stock item is back`,
    styling: `a styling tip related to fashion/clothing`,
    missyou: `a "we miss you" message for an inactive customer`,
    thankyou: `a thank you message after purchase`,
    custom: `a custom message for: ${instructions || 'general engagement'}`
  };

  const lengthGuide = {
    short: '2-3 lines, concise and impactful',
    medium: '4-6 lines, balanced detail',
    long: '7-10 lines, detailed and immersive'
  };

  let prompt = `You are a WhatsApp marketing copywriter for "${shop}", an Indian clothing boutique. Slogan: "${slogan}".

Write ${typeDescriptions[type] || type} message.

Requirements:
- Tone: ${tone}
- Length: ${lengthGuide[length] || lengthGuide.medium}
- Language: Mix of English and Hindi (Hinglish) naturally, like how Indian boutique owners talk
- Include relevant emojis (2-4 per message)
- End with "Let your style speak! 💜" or similar brand sign-off
- Make it feel personal, not robotic
- WhatsApp formatting: use *bold* for emphasis, _italic_ for style names
`;

  if (customer) {
    prompt += `\nCustomer details:
- Name: ${customer.name}
- Category: ${tag}${size ? `\n- Size: ${size}` : ''}${prefs ? `\n- Style preferences: ${prefs}` : ''}${customer.notes ? `\n- Notes: ${customer.notes}` : ''}`;
  }

  if (keywords) prompt += `\n- Must include these keywords/themes: ${keywords}`;
  if (instructions && type === 'custom') prompt += `\n- Additional instructions: ${instructions}`;

  prompt += `\n\nReturn ONLY the message text, no explanations. The message should be ready to send on WhatsApp.`;
  return prompt;
}

let currentAIGenerated = '';

async function generateAIMessage(e) {
  e.preventDefault();
  const apiKey = data.settings.geminiApiKey;
  if (!apiKey) {
    showToast('Please set your Gemini API key in Settings first!');
    showSettings();
    return;
  }

  const type = document.getElementById('aiType').value;
  const tone = document.querySelector('input[name="aiTone"]:checked').value;
  const length = document.querySelector('input[name="aiLength"]:checked').value;
  const keywords = document.getElementById('aiKeywords').value.trim();
  const instructions = document.getElementById('aiInstructions').value.trim();
  const customerId = document.getElementById('aiCustomer').value;
  const customer = customerId ? data.customers.find(c => c.id === customerId) : null;

  const prompt = buildAIPrompt(type, tone, length, keywords, instructions, customer);

  document.getElementById('aiLoading').classList.remove('hidden');
  document.getElementById('aiPreview').classList.add('hidden');
  document.getElementById('aiGenerateBtn').disabled = true;

  try {
    currentAIGenerated = await callGemini(prompt);
    document.getElementById('aiPreviewBody').textContent = currentAIGenerated;
    document.getElementById('aiPreview').classList.remove('hidden');
  } catch (err) {
    if (err.message === 'NO_API_KEY') {
      showToast('Please set your Gemini API key in Settings!');
      showSettings();
    } else {
      showToast('AI Error: ' + err.message);
    }
  } finally {
    document.getElementById('aiLoading').classList.add('hidden');
    document.getElementById('aiGenerateBtn').disabled = false;
  }
}

function regenerateAIMessage() { document.getElementById('aiForm').dispatchEvent(new Event('submit')); }

function copyAIMessage() {
  navigator.clipboard.writeText(currentAIGenerated).then(() => showToast('Copied! 📋'));
}

function useAIMessage() {
  document.getElementById('bulkMessage').value = currentAIGenerated;
  closeModal('aiModal');
  showToast('Message applied! ✨');
}

// ---- AI Suggestions (Dashboard) ----
const aiSuggestions = {
  general: [
    "💡 Send a 'We Miss You' to customers inactive 30+ days — offer 15% off to bring them back!",
    "👗 Track style preferences and notify customers when new stock matches their taste!",
    "🎂 Birthday customers spend 40% more! Always send a wish with a discount.",
    "📸 Ask happy customers to share photos wearing Meraki outfits for your WhatsApp status!",
    "💍 Bridal customers are highest value — create special packages and follow up regularly.",
    "🏷️ Run 'Mid-Week Special' on Wednesdays — slowest day, biggest opportunity!",
    "🧵 Custom stitching customers are loyal — send fabric care tips and alteration reminders.",
    "✨ Create a VIP group for top customers — early access to new collections!",
    "🪔 Start festive collection promos 2-3 weeks before the season!",
    "💝 Offer 'Refer a Friend' — ₹500 off for both referrer and new customer!",
  ]
};

function refreshAISuggestion() {
  const s = aiSuggestions.general;
  document.getElementById('aiSuggestion').textContent = s[Math.floor(Math.random() * s.length)];

  const insights = [];
  const cust = data.customers;
  if (cust.length > 0) {
    const vip = cust.filter(c => c.tag === 'vip').length;
    if (vip) insights.push({ icon: '💎', text: `${vip} VIP customers — send them early access to new collections!` });
    const bridal = cust.filter(c => c.tag === 'bridal').length;
    if (bridal) insights.push({ icon: '💍', text: `${bridal} bridal customers — create special wedding packages!` });
    const inactive = cust.filter(c => c.tag === 'inactive').length;
    if (inactive) insights.push({ icon: '💤', text: `${inactive} inactive customers — send 'We Miss You' with 15% off!` });
    const prefs = {};
    cust.forEach(c => (c.preferences || []).forEach(p => prefs[p] = (prefs[p] || 0) + 1));
    const top = Object.entries(prefs).sort((a, b) => b[1] - a[1])[0];
    if (top) insights.push({ icon: '👗', text: `Most popular style: ${top[0]} (${top[1]} customers) — stock up!` });
  }
  if (data.purchases.length > 0) {
    const spending = {};
    data.purchases.forEach(p => spending[p.customerName] = (spending[p.customerName] || 0) + (parseFloat(p.amount) || 0));
    const top = Object.entries(spending).sort((a, b) => b[1] - a[1])[0];
    if (top) insights.push({ icon: '⭐', text: `Top spender: ${top[0]} (${formatINR(top[1])}) — treat them special!` });
  }
  if (!insights.length) insights.push({ icon: '✨', text: 'Add customers & record sales to get AI-powered insights!' });

  document.getElementById('styleInsights').innerHTML = insights.slice(0, 4).map(i =>
    `<div class="insight-item"><span class="insight-icon">${i.icon}</span><span class="insight-text">${i.text}</span></div>`
  ).join('');
}

// ---- Navigation ----
function switchTab(tab) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.getElementById(tab).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'customers') renderCustomers();
  if (tab === 'messages') renderMessages();
  if (tab === 'purchases') renderPurchases();
  if (tab === 'templates') renderTemplates();
  if (tab === 'dashboard') renderDashboard();
}

// ---- Dashboard ----
function renderDashboard() {
  const cust = data.customers;
  document.getElementById('statCustomers').textContent = cust.length;
  const upcoming = cust.map(c => ({ ...c, bdayInfo: getBirthdayInfo(c.birthday) }))
    .filter(c => c.bdayInfo && c.bdayInfo.daysUntil <= 30).sort((a, b) => a.bdayInfo.daysUntil - b.bdayInfo.daysUntil);
  document.getElementById('statBirthdays').textContent = upcoming.length;

  const bc = document.getElementById('upcomingBirthdays');
  if (!upcoming.length) { bc.innerHTML = '<div class="empty-state mini">No upcoming birthdays in 30 days</div>'; }
  else {
    bc.innerHTML = upcoming.slice(0, 5).map(c => {
      const d = c.bdayInfo.date;
      const when = c.bdayInfo.daysUntil === 0 ? '🎉 Today!' : c.bdayInfo.daysUntil === 1 ? 'Tomorrow' : `In ${c.bdayInfo.daysUntil} days`;
      const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
      return `<div class="birthday-item">
        <div class="birthday-date"><span>${mon}</span><span class="day">${d.getDate()}</span></div>
        <div class="birthday-info"><div class="birthday-name">${c.name}</div><div class="birthday-when">${when}</div></div>
        <button class="customer-whatsapp" onclick="sendWhatsApp('${c.id}','birthday')"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></button>
      </div>`;
    }).join('');
  }

  document.getElementById('statMessages').textContent = data.messages.length;
  document.getElementById('statRevenue').textContent = formatINR(data.purchases.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0));

  const acts = [
    ...data.messages.map(m => ({ t: 'msg', ts: m.timestamp, d: m })),
    ...data.purchases.map(p => ({ t: 'purch', ts: new Date(p.date).getTime(), d: p })),
    ...data.customers.map(c => ({ t: 'cust', ts: c.createdAt, d: c }))
  ].sort((a, b) => b.ts - a.ts).slice(0, 5);

  document.getElementById('recentActivity').innerHTML = acts.length ? acts.map(a => {
    let icon, bg, text;
    if (a.t === 'msg') { icon = '📢'; bg = '#EDE9FE'; text = `Broadcast to ${a.d.customerName}`; }
    else if (a.t === 'purch') { icon = '🛍️'; bg = '#D1FAE5'; text = `${a.d.customerName} bought ${a.d.item} — ${formatINR(a.d.amount)}`; }
    else { icon = '👤'; bg = '#F3E8FF'; text = `Added ${a.d.name}`; }
    return `<div class="activity-item"><div class="activity-icon" style="background:${bg}">${icon}</div><div class="activity-text">${text}</div><div class="activity-time">${formatDateTime(a.ts)}</div></div>`;
  }).join('') : '<div class="empty-state mini">No recent activity</div>';

  refreshAISuggestion();
}

// ---- Customers ----
let currentFilter = 'all';
function renderCustomers() {
  const search = document.getElementById('customerSearch')?.value.toLowerCase() || '';
  let list = data.customers;
  if (currentFilter !== 'all') list = list.filter(c => c.tag === currentFilter);
  if (search) list = list.filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search));

  const tagL = { vip:'💎 VIP', regular:'👗 Regular', new:'✨ New', bridal:'💍 Bridal', inactive:'💤 Inactive' };
  document.getElementById('customerList').innerHTML = list.length ? list.map(c => {
    const prefs = (c.preferences || []).slice(0, 2).join(' · ');
    return `<div class="customer-item" onclick="showCustomerDetail('${c.id}')">
      <div class="customer-avatar" style="background:${getAvatarColor(c.name)}">${getInitials(c.name)}</div>
      <div class="customer-info"><div class="customer-name">${c.name}</div><div class="customer-phone">${c.phone}</div>${prefs?`<div class="customer-prefs">${prefs}</div>`:''}</div>
      <span class="customer-tag tag-${c.tag}">${tagL[c.tag]||c.tag}</span>
      <button class="customer-whatsapp" onclick="event.stopPropagation();openWhatsApp('${c.phone}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></button>
    </div>`;
  }).join('') : `<div class="empty-state"><div class="empty-icon">👗</div><h3>${search?'No matches':'No customers yet'}</h3><p>${search?'Try different search':'Tap + to add'}</p></div>`;
}

function filterCustomers() { renderCustomers(); }
function filterByTag(btn, tag) { currentFilter = tag; document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active')); btn.classList.add('active'); renderCustomers(); }

function openAddCustomer() {
  document.getElementById('customerModalTitle').textContent = 'Add Customer';
  document.getElementById('customerForm').reset(); document.getElementById('customerId').value = '';
  document.querySelectorAll('#stylePrefs input').forEach(cb => cb.checked = false);
  openModal('customerModal');
}

function openEditCustomer(id) {
  const c = data.customers.find(c => c.id === id); if (!c) return;
  document.getElementById('customerModalTitle').textContent = 'Edit Customer';
  document.getElementById('customerId').value = c.id;
  document.getElementById('custName').value = c.name;
  document.getElementById('custPhone').value = c.phone;
  document.getElementById('custBirthday').value = c.birthday || '';
  document.getElementById('custTag').value = c.tag;
  document.getElementById('custSize').value = c.size || '';
  document.getElementById('custNotes').value = c.notes || '';
  document.querySelectorAll('#stylePrefs input').forEach(cb => cb.checked = (c.preferences||[]).includes(cb.value));
  openModal('customerModal');
}

function saveCustomer(e) {
  e.preventDefault();
  const id = document.getElementById('customerId').value;
  const prefs = Array.from(document.querySelectorAll('#stylePrefs input:checked')).map(cb => cb.value);
  const c = {
    id: id || genId(),
    name: document.getElementById('custName').value.trim(),
    phone: document.getElementById('custPhone').value.trim(),
    birthday: document.getElementById('custBirthday').value,
    tag: document.getElementById('custTag').value,
    size: document.getElementById('custSize').value,
    preferences: prefs,
    notes: document.getElementById('custNotes').value.trim(),
    createdAt: id ? (data.customers.find(c => c.id === id)?.createdAt || Date.now()) : Date.now()
  };
  if (id) { const i = data.customers.findIndex(c => c.id === id); if (i !== -1) data.customers[i] = c; }
  else data.customers.push(c);
  saveData(); closeModal('customerModal'); renderCustomers(); renderDashboard();
  showToast(id ? 'Customer updated! ✨' : 'Customer added! 💜');
}

function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  data.customers = data.customers.filter(c => c.id !== id);
  data.purchases = data.purchases.filter(p => p.customerId !== id);
  data.messages = data.messages.filter(m => m.customerId !== id);
  saveData(); closeModal('detailModal'); renderCustomers(); renderDashboard();
  showToast('Customer deleted');
}

function showCustomerDetail(id) {
  const c = data.customers.find(c => c.id === id); if (!c) return;
  const purchases = data.purchases.filter(p => p.customerId === id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const messages = data.messages.filter(m => m.customerId === id).sort((a, b) => b.timestamp - a.timestamp);
  const bdayInfo = getBirthdayInfo(c.birthday);
  const totalSpent = purchases.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const tagL = { vip:'💎 VIP', regular:'👗 Regular', new:'✨ New', bridal:'💍 Bridal', inactive:'💤 Inactive' };

  document.getElementById('detailName').textContent = c.name;
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-profile">
      <div class="detail-avatar" style="background:${getAvatarColor(c.name)}">${getInitials(c.name)}</div>
      <div class="detail-name">${c.name}</div><div class="detail-phone">${c.phone}</div>
      <span class="customer-tag tag-${c.tag}" style="margin-top:8px;display:inline-block">${tagL[c.tag]||c.tag}</span>
      <div class="detail-actions">
        <button class="btn btn-whatsapp btn-sm" onclick="openWhatsApp('${c.phone}')">WhatsApp</button>
        <button class="btn btn-outline btn-sm" onclick="sendWhatsApp('${c.id}','custom')">💬 Message</button>
      </div>
    </div>
    <div class="detail-section"><h4>Information</h4>
      <div class="detail-info-grid">
        <div class="detail-info-item"><div class="detail-info-label">Phone</div><div class="detail-info-value">${c.phone}</div></div>
        <div class="detail-info-item"><div class="detail-info-label">Birthday</div><div class="detail-info-value">${c.birthday?formatDate(c.birthday):'-'}</div></div>
        <div class="detail-info-item"><div class="detail-info-label">Size</div><div class="detail-info-value">${c.size||'-'}</div></div>
        <div class="detail-info-item"><div class="detail-info-label">Category</div><div class="detail-info-value">${tagL[c.tag]||c.tag}</div></div>
        <div class="detail-info-item"><div class="detail-info-label">Total Spent</div><div class="detail-info-value">${formatINR(totalSpent)}</div></div>
        <div class="detail-info-item"><div class="detail-info-label">Purchases</div><div class="detail-info-value">${purchases.length}</div></div>
      </div>
    </div>
    ${(c.preferences||[]).length ? `<div class="detail-section"><h4>Style Preferences</h4><div style="display:flex;flex-wrap:wrap;gap:6px">${c.preferences.map(p=>`<span class="chip active" style="font-size:12px;padding:6px 12px">${p}</span>`).join('')}</div></div>` : ''}
    ${c.notes ? `<div class="detail-section"><h4>Notes</h4><p style="font-size:14px;color:var(--text-secondary);line-height:1.5">${c.notes}</p></div>` : ''}
    <div class="detail-section"><h4>Purchase History</h4>
      ${purchases.length ? `<div class="detail-purchase-list">${purchases.slice(0,10).map(p=>`<div class="detail-purchase-item"><div><div style="font-weight:600;font-size:14px">${p.item}</div><div style="font-size:12px;color:var(--text-light)">${formatDate(p.date)}</div></div><div style="font-weight:700;color:var(--success)">${formatINR(p.amount)}</div></div>`).join('')}</div>` : '<p style="font-size:13px;color:var(--text-light)">No purchases</p>'}
    </div>
    <div class="detail-btns">
      <button class="btn btn-outline" style="flex:1" onclick="openEditCustomer('${c.id}');closeModal('detailModal')">✏️ Edit</button>
      <button class="btn btn-danger" style="flex:1" onclick="deleteCustomer('${c.id}')">🗑️ Delete</button>
    </div>`;
  openModal('detailModal');
}

// ---- WhatsApp ----
function openWhatsApp(phone) { const cl = phone.replace(/[^\d+]/g, ''); window.open(`https://wa.me/${cl.replace('+','')}`, '_blank'); }

function sendWhatsApp(customerId, type) {
  const customer = data.customers.find(c => c.id === customerId); if (!customer) return;
  if (type === 'custom') { openBulkMessage('custom', [customerId]); return; }
  const tpl = data.templates.find(t => t.category === type);
  if (tpl) {
    const msg = tpl.body.replace(/{name}/g, customer.name.split(' ')[0]);
    logMessage(customerId, type, msg);
    window.open(`https://wa.me/${customer.phone.replace(/[^\d+]/g,'').replace('+','')}?text=${encodeURIComponent(msg)}`, '_blank');
    showToast('Opening WhatsApp...');
  }
}

function logMessage(customerId, type, message) {
  const c = data.customers.find(c => c.id === customerId);
  data.messages.push({ id: genId(), customerId, customerName: c?.name || 'Unknown', type, message: message.substring(0, 100), timestamp: Date.now() });
  saveData();
}

// ---- BULK MESSAGING WITH 4-SECOND DELAY ----
function openBulkMessage(type, preselected) {
  document.getElementById('bulkType').value = type;
  const titles = { birthday:'🎂 Birthday Wishes', newcollection:'👗 New Collection', sale:'🏷️ Sale Alert', festival:'🪔 Festival Offer', restock:'📦 Back in Stock', styling:'💡 Styling Tips', followup:'🤝 Follow Up', custom:'📢 Custom Broadcast', missyou:'💕 We Miss You', thankyou:'🙏 Thank You' };
  document.getElementById('bulkModalTitle').textContent = titles[type] || '📢 Broadcast';
  const tpl = data.templates.find(t => t.category === type);
  document.getElementById('bulkMessage').value = tpl ? tpl.body : '';

  let customers = data.customers;
  if (type === 'birthday') customers = customers.filter(c => c.birthday);

  document.getElementById('bulkCustomerList').innerHTML = customers.map(c => {
    const checked = preselected?.includes(c.id) ? 'checked' : 'checked';
    return `<label class="bulk-customer-item"><input type="checkbox" value="${c.id}" ${checked}><span>${c.name} (${c.phone})</span></label>`;
  }).join('');
  openModal('bulkModal');
}

function toggleAllBulk() {
  const cbs = document.querySelectorAll('#bulkCustomerList input[type="checkbox"]');
  const all = Array.from(cbs).every(cb => cb.checked);
  cbs.forEach(cb => cb.checked = !all);
}

function insertVar(v) {
  const ta = document.getElementById('bulkMessage');
  const start = ta.selectionStart; const end = ta.selectionEnd;
  ta.value = ta.value.substring(0, start) + v + ta.value.substring(end);
  ta.focus(); ta.selectionStart = ta.selectionEnd = start + v.length;
}

function openAITemplateForBulk() {
  // Pre-fill AI modal with bulk context
  const type = document.getElementById('bulkType').value;
  document.getElementById('aiType').value = type;
  openModal('aiModal');
  populateAICustomerSelect();
}

async function sendBulkMessage(e) {
  e.preventDefault();
  const message = document.getElementById('bulkMessage').value;
  const selected = Array.from(document.querySelectorAll('#bulkCustomerList input:checked')).map(cb => cb.value);
  if (!selected.length) { showToast('Select at least one customer'); return; }

  const sendMode = document.querySelector('input[name="sendMode"]:checked').value;
  const logAll = document.getElementById('bulkLogAll').checked;
  const type = document.getElementById('bulkType').value;

  closeModal('bulkModal');

  if (sendMode === 'auto') {
    // Auto mode: send with 4-second delay between each
    await startBulkSend(selected, message, type, logAll);
  } else {
    // Manual mode: open one by one
    selected.forEach(customerId => {
      const customer = data.customers.find(c => c.id === customerId);
      if (!customer) return;
      const personalized = message.replace(/{name}/g, customer.name.split(' ')[0]);
      if (logAll) logMessage(customerId, type, personalized);
      window.open(`https://wa.me/${customer.phone.replace(/[^\d+]/g,'').replace('+','')}?text=${encodeURIComponent(personalized)}`, '_blank');
    });
    showToast(`Opened ${selected.length} WhatsApp chats!`);
    renderDashboard();
  }
}

async function startBulkSend(customerIds, messageTemplate, type, logAll) {
  bulkSendState = { active: true, cancelled: false };
  const total = customerIds.length;

  // Show progress modal
  document.getElementById('progressIcon').textContent = '📤';
  document.getElementById('progressTitle').textContent = 'Sending Broadcasts...';
  document.getElementById('progressText').textContent = 'Starting...';
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('progressCount').textContent = `0 / ${total}`;
  document.getElementById('progressActions').classList.add('hidden');
  document.getElementById('progressCancelBtn').classList.remove('hidden');
  openModal('progressModal');

  for (let i = 0; i < total; i++) {
    if (bulkSendState.cancelled) break;

    const customer = data.customers.find(c => c.id === customerIds[i]);
    if (!customer) continue;

    const personalized = messageTemplate.replace(/{name}/g, customer.name.split(' ')[0]);

    if (logAll) logMessage(customerIds[i], type, personalized);

    // Open WhatsApp
    const url = `https://wa.me/${customer.phone.replace(/[^\d+]/g,'').replace('+','')}?text=${encodeURIComponent(personalized)}`;
    window.open(url, '_blank');

    // Update progress
    const pct = Math.round(((i + 1) / total) * 100);
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progressCount').textContent = `${i + 1} / ${total}`;
    document.getElementById('progressText').textContent = `Sent to ${customer.name}`;

    // Wait 4 seconds before next (except last)
    if (i < total - 1) {
      await new Promise(resolve => {
        let countdown = 4;
        const interval = setInterval(() => {
          if (bulkSendState.cancelled) { clearInterval(interval); resolve(); return; }
          countdown--;
          document.getElementById('progressText').textContent = `Next in ${countdown}s... (${customer.name} sent)`;
          if (countdown <= 0) { clearInterval(interval); resolve(); }
        }, 1000);
      });
    }
  }

  // Done
  document.getElementById('progressIcon').textContent = bulkSendState.cancelled ? '⛔' : '✅';
  document.getElementById('progressTitle').textContent = bulkSendState.cancelled ? 'Broadcast Cancelled' : 'Broadcast Complete!';
  document.getElementById('progressText').textContent = `Sent ${Math.round(document.getElementById('progressBar').style.width.replace('%','')) || 0}% of messages`;
  document.getElementById('progressActions').classList.remove('hidden');
  document.getElementById('progressCancelBtn').classList.add('hidden');
  renderDashboard();
}

function cancelBulkSend() {
  bulkSendState.cancelled = true;
  showToast('Cancelling broadcast...');
}

function showBirthdays() { openBulkMessage('birthday'); }

// ---- AI Template Modal ----
function openAITemplate() {
  document.getElementById('aiForm').reset();
  document.getElementById('aiPreview').classList.add('hidden');
  document.getElementById('aiLoading').classList.add('hidden');
  // Reset tone/length to defaults
  document.querySelector('input[name="aiTone"][value="warm"]').checked = true;
  document.querySelectorAll('input[name="aiTone"]').forEach(r => r.closest('.tone-option').classList.toggle('active', r.checked));
  document.querySelector('input[name="aiLength"][value="short"]').checked = true;
  document.querySelectorAll('input[name="aiLength"]').forEach(r => r.closest('.tone-option').classList.toggle('active', r.checked));
  populateAICustomerSelect();
  openModal('aiModal');
}

function populateAICustomerSelect() {
  document.getElementById('aiCustomer').innerHTML = '<option value="">-- All Customers (generic) --</option>' +
    data.customers.map(c => `<option value="${c.id}">${c.name} (${c.tag})</option>`).join('');
}

// Tone/Length radio visual toggle
document.addEventListener('change', (e) => {
  if (e.target.name === 'aiTone' || e.target.name === 'aiLength') {
    e.target.closest('.tone-selector').querySelectorAll('.tone-option').forEach(o => o.classList.toggle('active', o.querySelector('input').checked));
  }
  if (e.target.id === 'aiType') {
    document.getElementById('aiCustomPurposeGroup').style.display = e.target.value === 'custom' ? 'block' : 'none';
  }
});

// ---- Purchases ----
function renderPurchases() {
  const purchases = [...data.purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
  const today = new Date().toISOString().split('T')[0];
  const todayS = data.purchases.filter(p => p.date === today).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  document.getElementById('todayRevenue').textContent = formatINR(todayS);
  const ws = new Date(); ws.setDate(ws.getDate() - ws.getDay());
  const weekS = data.purchases.filter(p => new Date(p.date) >= ws).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  document.getElementById('weekRevenue').textContent = formatINR(weekS);
  const ms = new Date(); ms.setDate(1);
  const monthS = data.purchases.filter(p => new Date(p.date) >= ms).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  document.getElementById('monthRevenue').textContent = formatINR(monthS);

  document.getElementById('purchaseList').innerHTML = purchases.length ? purchases.map(p => `
    <div class="purchase-item">
      <div class="purchase-header"><div class="purchase-item-name">${p.item}</div><div class="purchase-amount">${formatINR(p.amount)}</div></div>
      <div class="purchase-details">${p.customerName} · ${formatDate(p.date)}${p.notes ? ` · ${p.notes}` : ''}</div>
    </div>`).join('') : '<div class="empty-state"><div class="empty-icon">🛍️</div><h3>No sales recorded</h3><p>Tap + to record</p></div>';
}

function openAddPurchase() {
  document.getElementById('purchaseForm').reset();
  document.getElementById('purchDate').value = new Date().toISOString().split('T')[0];
  populateCustomerSelect('purchCustomer');
  openModal('purchaseModal');
}

function savePurchase(e) {
  e.preventDefault();
  const cid = document.getElementById('purchCustomer').value;
  const c = data.customers.find(c => c.id === cid);
  data.purchases.push({
    id: genId(), customerId: cid, customerName: c?.name || 'Unknown',
    category: document.getElementById('purchCategory').value,
    item: document.getElementById('purchItem').value.trim(),
    amount: document.getElementById('purchAmount').value || 0,
    date: document.getElementById('purchDate').value || new Date().toISOString().split('T')[0],
    notes: document.getElementById('purchNotes').value.trim()
  });
  saveData(); closeModal('purchaseModal'); renderPurchases(); renderDashboard();
  showToast('Sale recorded! 🛍️');
}

// ---- Messages ----
let messageFilter = 'all';
function renderMessages() {
  let msgs = [...data.messages].sort((a, b) => b.timestamp - a.timestamp);
  if (messageFilter !== 'all') msgs = msgs.filter(m => m.type === messageFilter);
  document.getElementById('messageLog').innerHTML = msgs.length ? msgs.map(m => `
    <div class="message-item">
      <div class="message-item-header"><span class="message-recipient">${m.customerName}</span><span class="message-type type-${m.type}">${m.type}</span></div>
      <div class="message-preview">${m.message}</div>
      <div class="message-time">${formatDateTime(m.timestamp)}</div>
    </div>`).join('') : '<div class="empty-state"><div class="empty-icon">📢</div><h3>No broadcasts yet</h3></div>';
}

function filterMessages(btn, type) {
  messageFilter = type;
  document.querySelectorAll('#messages .filter-chips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active'); renderMessages();
}

// ---- Templates ----
function renderTemplates() {
  const catL = { birthday:'🎂', newcollection:'👗', sale:'🏷️', festival:'🪔', restock:'📦', styling:'💡', followup:'🤝', missyou:'💕', thankyou:'🙏', custom:'📝' };
  document.getElementById('templateList').innerHTML = data.templates.map(t => `
    <div class="template-card">
      <div class="template-card-header"><span class="template-name">${t.name}</span><span class="template-category type-${t.category}">${catL[t.category]||''} ${t.category}</span></div>
      <div class="template-body">${t.body || '(Empty)'}</div>
      <div class="template-actions">
        <button class="btn btn-outline btn-sm" onclick="editTemplate('${t.id}')">✏️ Edit</button>
        <button class="btn btn-primary btn-sm" onclick="useTemplate('${t.id}')">📤 Use</button>
      </div>
    </div>`).join('');
}

function useTemplate(id) { openBulkMessage(data.templates.find(t => t.id === id)?.category || 'custom'); }
function editTemplate(id) {
  const t = data.templates.find(t => t.id === id); if (!t) return;
  const body = prompt('Edit message:', t.body); if (body === null) return;
  t.body = body; saveData(); renderTemplates(); showToast('Template updated!');
}

// ---- Modals ----
function openModal(id) { document.getElementById(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); document.body.style.overflow = ''; }
document.addEventListener('click', e => { if (e.target.classList.contains('modal')) { e.target.classList.add('hidden'); document.body.style.overflow = ''; } });

function populateCustomerSelect(id) {
  document.getElementById(id).innerHTML = '<option value="">-- Select Customer --</option>' +
    data.customers.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');
}

// ---- Settings ----
function showSettings() {
  document.getElementById('settingShopName').value = data.settings.shopName || 'Meraki';
  document.getElementById('settingSlogan').value = data.settings.slogan || 'Let Your Style Speak';
  document.getElementById('settingApiKey').value = data.settings.geminiApiKey || '';
  openModal('settingsModal');
}

function saveSettings() {
  data.settings.shopName = document.getElementById('settingShopName').value.trim();
  data.settings.slogan = document.getElementById('settingSlogan').value.trim();
  data.settings.geminiApiKey = document.getElementById('settingApiKey').value.trim();
  saveData(); closeModal('settingsModal');
  showToast('Settings saved! ⚙️');
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `meraki_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
  showToast('Data exported! 📤');
}

function importData(e) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    try { const d = JSON.parse(ev.target.result); if (d.customers) { data = { ...defaultData, ...d }; saveData(); renderDashboard(); showToast('Imported! 📥'); } else showToast('Invalid file'); }
    catch { showToast('Error reading file'); }
  }; r.readAsText(f);
}

function clearAllData() {
  if (!confirm('⚠️ Delete ALL data?')) return; if (!confirm('Cannot be undone. Continue?')) return;
  data = JSON.parse(JSON.stringify(defaultData)); saveData();
  renderDashboard(); renderCustomers(); renderPurchases(); renderMessages(); renderTemplates();
  showToast('All data cleared');
}

// ---- Init ----
function init() {
  loadData();
  setTimeout(() => {
    document.getElementById('splash').classList.add('fade-out');
    document.getElementById('main').classList.remove('hidden');
    setTimeout(() => document.getElementById('splash').style.display = 'none', 500);
  }, 1800);
  renderDashboard();
  if (!data.customers.length) loadSampleData();
}

function loadSampleData() {
  const sample = [
    { id:genId(), name:'Priya Sharma', phone:'+91 98765 43210', birthday:'1992-05-15', tag:'vip', size:'M', preferences:['sarees','lehenga'], notes:'Loves Banarasi sarees.', createdAt:Date.now()-86400000*400 },
    { id:genId(), name:'Anita Gupta', phone:'+91 87654 32109', birthday:'1988-12-03', tag:'bridal', size:'S', preferences:['lehenga','suits','accessories'], notes:'Wedding in Dec 2026.', createdAt:Date.now()-86400000*60 },
    { id:genId(), name:'Kavya Reddy', phone:'+91 76543 21098', birthday:'1995-07-22', tag:'regular', size:'L', preferences:['western','indo-western'], notes:'Office wear.', createdAt:Date.now()-86400000*200 },
    { id:genId(), name:'Meera Patel', phone:'+91 65432 10987', birthday:'1990-01-10', tag:'vip', size:'M', preferences:['sarees','kurti'], notes:'Regular since 2021.', createdAt:Date.now()-86400000*500 },
    { id:genId(), name:'Ritu Singh', phone:'+91 54321 09876', birthday:'1998-03-18', tag:'new', size:'S', preferences:['western','accessories'], notes:'Budget-conscious.', createdAt:Date.now()-86400000*15 },
    { id:genId(), name:'Neha Joshi', phone:'+91 43210 98765', birthday:'1985-09-28', tag:'regular', size:'XL', preferences:['suits','kurti'], notes:'Prefers cotton.', createdAt:Date.now()-86400000*300 },
  ];
  data.customers = sample;
  const items = [
    { cat:'saree', name:'Banarasi Silk Saree - Royal Red', price:4500 },
    { cat:'lehenga', name:'Bridal Lehenga - Gold Embroidered', price:18500 },
    { cat:'suit', name:'Anarkali Suit - Navy Blue', price:2800 },
    { cat:'western', name:'Floral Maxi Dress', price:1800 },
    { cat:'kurti', name:'Cotton Kurti - Block Print', price:950 },
    { cat:'accessories', name:'Kundan Necklace Set', price:3200 },
    { cat:'indo-western', name:'Draped Saree Gown', price:5500 },
  ];
  sample.forEach(c => {
    const n = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < n; i++) {
      const it = items[Math.floor(Math.random() * items.length)];
      data.purchases.push({ id:genId(), customerId:c.id, customerName:c.name, category:it.cat, item:it.name, amount:it.price+Math.floor(Math.random()*500), date:new Date(Date.now()-Math.random()*86400000*90).toISOString().split('T')[0], notes:'' });
    }
  });
  saveData(); renderDashboard();
}

init();
