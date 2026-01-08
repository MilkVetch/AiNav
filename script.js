/**
 * 网址导航核心逻辑 - 2025 全新修复完整版
 */

const I18N = {
    zh: {
        navBrand: "网址导航", searchPlaceholder: "搜索或输入网址...", addSite: "+ 网址", addCat: "+ 分类", settings: "Settings",
        modalTitleSettings: "Settings", menuLang: "语言设置", menuBoard: "面板管理", menuSetup: "Setup", 
        labelSwitchBoard: "切换面板", labelRenameBoard: "面板更名", btnApply: "应用", btnNew: "+ 新增", btnDel: "删除", 
        btnSave: "保存并同步", modalTitleSite: "新增网址", setupBtn: "Setup Now", emptyBoard: "创建面板", 
        confirmReset: "确认注销并清空配置？", logout: "Logout"
    },
    en: {
        navBrand: "Nav Hub", searchPlaceholder: "Search...", addSite: "+ Site", addCat: "+ Category", settings: "Settings",
        modalTitleSettings: "Settings", menuLang: "Language", menuBoard: "Boards", menuSetup: "Setup", 
        labelSwitchBoard: "Switch", labelRenameBoard: "Rename", btnApply: "Apply", btnNew: "+ New", btnDel: "Delete", 
        btnSave: "Save & Sync", modalTitleSite: "Add Site", setupBtn: "Setup Now", emptyBoard: "Create Board", 
        confirmReset: "Logout and clear local storage?", logout: "Logout"
    }
};

const GREETINGS = {
    zh: { "00:00": "午夜时分，灵感进发的时刻。", "05:00": "清晨好，新的一天开始了。", "08:00": "早安，开启高效的一天。", "12:00": "中午好，记得午休一下。", "14:00": "下午好，保持专注。", "18:00": "傍晚好，享受落日余晖。", "21:00": "夜深了，音乐是灵魂的港湾。", "23:00": "晚安，做个好梦。" },
    en: { "00:00": "Midnight inspiration.", "05:00": "A new day begins.", "08:00": "Good morning, stay focused.", "12:00": "Take a short break.", "14:00": "Good afternoon.", "18:00": "Enjoy the sunset.", "21:00": "Music for the soul.", "23:00": "Good night, sweet dreams." }
};

let db = { activeIndex: 0, boards: [], lang: 'en' };
let isConfigured = false;
const CONFIG = { token: localStorage.getItem('gh_token'), gistId: localStorage.getItem('gh_gist_id') };

function init() {
    updateClock(); setInterval(updateClock, 1000);
    updateStatus(false);
    if (CONFIG.token && CONFIG.gistId) fetchData(); else render();
    lucide.createIcons();
}

function updateClock() {
    const now = new Date(); const h = now.getHours();
    document.getElementById('digitalClock').innerText = `${h.toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    let glow = "rgba(150, 100, 255, 0.12)";
    if (h >= 5 && h < 12) glow = "rgba(255, 180, 100, 0.12)"; else if (h >= 12 && h < 18) glow = "rgba(100, 200, 255, 0.12)";
    document.documentElement.style.setProperty('--glow-color', glow);
    const greetingEl = document.getElementById('greetingText');
    const hourKeys = Object.keys(GREETINGS[db.lang || 'en']).sort().reverse();
    const currentKey = hourKeys.find(key => h >= parseInt(key.split(':')[0])) || "00:00";
    greetingEl.innerText = GREETINGS[db.lang || 'en'][currentKey];
}

async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, { headers: { 'Authorization': `token ${CONFIG.token}` } });
        if (!res.ok) throw new Error();
        const gist = await res.json();
        const content = JSON.parse(gist.files['ainav.json'].content);
        db = content.categories ? { activeIndex: 0, boards: [{ title: "Main", categories: content.categories }], lang: content.lang || 'en' } : content;
        isConfigured = true; updateStatus(true); render();
    } catch (err) { isConfigured = false; render(); }
}

function render() {
    const dict = I18N[db.lang || 'en'];
    document.getElementById('navBrandText').innerText = dict.navBrand;
    document.getElementById('btnSettingsText').innerText = dict.settings;
    document.getElementById('searchInput').placeholder = dict.searchPlaceholder;
    document.getElementById('menuLangText').innerText = dict.menuLang;
    document.getElementById('menuSetupText').innerText = dict.menuSetup;
    document.getElementById('menuLogoutText').innerText = dict.logout;
    document.getElementById('modalTitleSettings').innerText = dict.settings;

    const app = document.getElementById('app');

    if (!isConfigured) {
        document.getElementById('searchBarArea').classList.add('hide');
        document.getElementById('menuBoardItem').classList.add('hide');
        document.getElementById('addSiteBtn').classList.add('hide');
        document.getElementById('addCatBtn').classList.add('hide');
        app.innerHTML = `<div class="welcome-container">
            <div class="welcome-card"><h4>✨ What is this?</h4><ul><li>Multi-Boards support</li><li>Cloud Sync</li><li>Zero Ads</li></ul><button class="confirm-btn" onclick="handleOpenSetup()">Setup Now</button></div>
            <div class="welcome-card"><h4>📖 Setup Guide</h4><ul><li>1. Create GitHub Token</li><li>2. Create Gist ainav.json</li></ul><button class="glass-btn" style="width:100%" onclick="copyInitialJSON()">Copy Initial JSON</button></div>
        </div>`;
        lucide.createIcons(); return;
    }

    document.getElementById('searchBarArea').classList.remove('hide');
    document.getElementById('menuBoardItem').classList.remove('hide');
    document.getElementById('addSiteBtn').classList.remove('hide').innerText = dict.addSite;
    document.getElementById('addCatBtn').classList.remove('hide').innerText = dict.addCat;
    
    const board = db.boards[db.activeIndex] || db.boards[0];
    if (!board) { app.innerHTML = `<button class="confirm-btn" style="max-width:200px; margin: 2rem auto;" onclick="createNewBoard()">${dict.emptyBoard}</button>`; return; }

    document.getElementById('boardSwitcher').innerHTML = db.boards.map((b, i) => `<option value="${i}" ${i==db.activeIndex?'selected':''}>${b.title}</option>`).join('');
    
    app.innerHTML = '';
    const catSelect = document.getElementById('targetCat'); catSelect.innerHTML = '';
    board.categories.forEach((cat, cIdx) => {
        catSelect.innerHTML += `<option value="${cIdx}">${cat.name}</option>`;
        const section = document.createElement('section');
        section.innerHTML = `<div class="category-header"><span>${cat.name}</span><button class="close-btn" style="font-size:0.8rem" onclick="deleteCat(${cIdx})"><i data-lucide="trash-2" class="icon-sm"></i></button></div><div class="board-grid" id="cat-${cIdx}"></div>`;
        app.appendChild(section);
        cat.sites.forEach((site, sIdx) => {
            let domain = 'invalid'; try { domain = new URL(site.url).hostname; } catch(e) {}
            document.getElementById(`cat-${cIdx}`).innerHTML += `<a href="${site.url}" target="_blank" class="link-card"><button class="close-btn" style="position:absolute;top:8px;right:8px;opacity:0" onclick="event.preventDefault();deleteSite(${cIdx},${sIdx})">&times;</button><img src="https://www.google.com/s2/favicons?sz=128&domain=${domain}" onerror="this.src='https://lucide.dev/favicon.ico'"><span>${site.name}</span></a>`;
        });
    });
    lucide.createIcons();
}

function handleOpenSettings() { openCustomModal('settingsModal'); }
function handleOpenSetup() { openCustomModal('settingsModal'); showSettingPage('pageSetup'); }
function openCustomModal(id) { document.getElementById('modalOverlay').style.display='block'; document.getElementById(id).classList.add('active'); if(id==='settingsModal') showSettingsHome(); }
function closeAllModals() { document.getElementById('modalOverlay').style.display='none'; document.querySelectorAll('.custom-modal').forEach(m=>m.classList.remove('active')); }
function showSettingPage(p) { document.getElementById('settingsHome').classList.add('hide'); document.querySelectorAll('.detail-page').forEach(el=>el.classList.add('hide')); document.getElementById(p).classList.remove('hide'); document.getElementById('settingsBackBtn').classList.remove('hide'); }
function showSettingsHome() { document.getElementById('settingsHome').classList.remove('hide'); document.querySelectorAll('.detail-page').forEach(el=>el.classList.add('hide')); document.getElementById('settingsBackBtn').classList.add('hide'); }
function setLanguage(l) { db.lang = l; render(); if(isConfigured) pushToGist(); }
function saveSettings() { const t=document.getElementById('ghToken').value.trim(); const i=document.getElementById('gistId').value.trim(); if(t) localStorage.setItem('gh_token', t); if(i) localStorage.setItem('gh_gist_id', i); location.reload(); }
async function pushToGist() { if(!isConfigured) return; try { await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, { method: 'PATCH', headers: { 'Authorization': `token ${CONFIG.token}` }, body: JSON.stringify({ files: { 'ainav.json': { content: JSON.stringify(db, null, 2) } } }) }); updateStatus(true); } catch(e) { updateStatus(false); } }
function updateStatus(on) { const dot = document.getElementById('syncStatus'); if(dot) dot.className = `status-dot ${on?'status-online':''}`; }
function confirmReset() { if(confirm(I18N[db.lang||'en'].confirmReset)) { localStorage.clear(); location.reload(); } }
function handleSearch(e) { if(e.key==='Enter') { const q=e.target.value; window.open(q.includes('.') ? (q.startsWith('http')?q:'https://'+q) : 'https://www.google.com/search?q='+encodeURIComponent(q)); } }
function switchBoard(i) { db.activeIndex = parseInt(i); render(); pushToGist(); }
function createNewBoard() { const n=prompt("Board Name:"); if(n) { db.boards.push({title:n, categories:[]}); db.activeIndex=db.boards.length-1; render(); pushToGist(); } }
function deleteSite(c,s) { if(confirm("Delete site?")) { db.boards[db.activeIndex].categories[c].sites.splice(s,1); render(); pushToGist(); } }
function deleteCat(i) { if(confirm("Delete category?")) { db.boards[db.activeIndex].categories.splice(i,1); render(); pushToGist(); } }
function copyInitialJSON() { const data={activeIndex:0,lang:"en",boards:[]}; navigator.clipboard.writeText(JSON.stringify(data,null,2)); alert("Copied!"); }

init();