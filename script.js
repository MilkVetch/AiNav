const I18N = {
    zh: {
        navBrand: "网址导航", searchPlaceholder: "搜索或输入网址...", addSite: "+ 网址", addCat: "+ 分类", settings: "设置",
        modalTitleSettings: "系统设置", menuLang: "语言设置", menuBoard: "面板管理", menuBackend: "后端配置", labelSwitchBoard: "切换面板",
        labelRenameBoard: "面板更名", btnApply: "应用", btnNew: "+ 新增", btnDel: "删除", btnSave: "连接并保存", modalTitleSite: "新增网址",
        labelSelectCat: "选择分类", labelSiteName: "名称", labelSiteUrl: "网址", btnConfirm: "确认", modalTitleCat: "新增分类",
        labelCatName: "分类名称", setupBtn: "去配置", emptyBoard: "创建首个面板",
        confirmDelSite: "确认删除网址？", confirmDelCat: "确认删除分类？", confirmReset: "断开云端连接？", promptNewBoard: "输入新面板名称：",
        introTitle: "这个导航站能做什么？",
        introDesc: "基于 GitHub Gist 的极简导航。数据 100% 存储在您的私有账号中。",
        feature1: "多面板支持：按需分类，场景切换。",
        feature2: "云端同步：电脑与手机浏览器实时无缝同步。",
        feature3: "纯净隐私：无追踪，极速响应。",
        tutorialTitle: "建议配置教程",
        tutorialStep1: "1. 访问 GitHub 设置，创建一个 Fine-grained Token。",
        tutorialStep2: "2. 权限：必须勾选 Gists 的读写权限。",
        tutorialStep3: "3. 新建一个 Gist，包含文件 ainav.json。",
        copyJsonBtn: "复制初始化 JSON",
        copySuccess: "已复制！"
    },
    en: {
        navBrand: "Nav Hub", searchPlaceholder: "Search...", addSite: "+ Site", addCat: "+ Category", settings: "Settings",
        modalTitleSettings: "Settings", menuLang: "Language", menuBoard: "Boards", menuBackend: "Gist Config", labelSwitchBoard: "Switch",
        labelRenameBoard: "Rename", btnApply: "Apply", btnNew: "+ New", btnDel: "Delete", btnSave: "Save & Sync", modalTitleSite: "Add Site",
        labelSelectCat: "Category", labelSiteName: "Name", labelSiteUrl: "URL", btnConfirm: "Confirm", modalTitleCat: "Add Category",
        labelCatName: "Name", setupBtn: "Setup", emptyBoard: "Create Board",
        confirmDelSite: "Delete?", confirmDelCat: "Delete category?", confirmReset: "Reset config?", promptNewBoard: "Name:",
        introTitle: "What is this?",
        introDesc: "A minimal dashboard powered by GitHub Gist. 100% private data storage.",
        feature1: "Multi-Boards: Organize Work and Life.",
        feature2: "Cloud Sync: Sync between PC and Mobile.",
        feature3: "Privacy: No ads, zero tracking.",
        tutorialTitle: "Setup Guide",
        tutorialStep1: "1. Create a Fine-grained Token in GitHub.",
        tutorialStep2: "2. Perms: Grant Gists read/write access.",
        tutorialStep3: "3. Create a Gist with ainav.json file.",
        copyJsonBtn: "Copy Initial JSON",
        copySuccess: "Copied!"
    }
};

const GREETINGS = {
    zh: { "00:00": "午夜时分，灵感进发的时刻。", "05:00": "清晨好，新的一天开始了。", "08:00": "早安，开启高效的一天。", "12:00": "中午好，记得午休一下。", "14:00": "下午好，保持专注。", "18:00": "傍晚好，享受落日余晖。", "21:00": "夜深了，音乐是灵魂的港湾。", "23:00": "晚安，做个好梦。" },
    en: { "00:00": "Midnight inspiration.", "05:00": "A new day begins.", "08:00": "Good morning, stay focused.", "12:00": "Take a short break.", "14:00": "Good afternoon.", "18:00": "Enjoy the sunset.", "21:00": "Music for the soul.", "23:00": "Good night, sweet dreams." }
};

// 修改点 1：将初始状态的语言设为英文
let db = { activeIndex: 0, boards: [], lang: 'en' };
let isConfigured = false;
const CONFIG = { token: localStorage.getItem('gh_token'), gistId: localStorage.getItem('gh_gist_id') };

function init() {
    updateClock(); setInterval(updateClock, 1000);
    if (CONFIG.token && CONFIG.gistId) fetchData(); else render();
    lucide.createIcons();
}

function updateClock() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    document.getElementById('digitalClock').innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    let glow = "rgba(150, 100, 255, 0.12)";
    if (h >= 5 && h < 12) glow = "rgba(255, 180, 100, 0.12)";
    else if (h >= 12 && h < 18) glow = "rgba(100, 200, 255, 0.12)";
    document.documentElement.style.setProperty('--glow-color', glow);
    const greetingEl = document.getElementById('greetingText');
    const lang = db.lang || 'en';
    const hourKeys = Object.keys(GREETINGS[lang]).sort().reverse();
    const currentKey = hourKeys.find(key => h >= parseInt(key.split(':')[0])) || "00:00";
    const target = GREETINGS[lang][currentKey];
    if (greetingEl.innerText !== target) {
        greetingEl.style.opacity = "0";
        setTimeout(() => { greetingEl.innerText = target; greetingEl.style.opacity = "1"; }, 600);
    }
}

async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, { headers: { 'Authorization': `token ${CONFIG.token}` } });
        if (!res.ok) throw new Error();
        const gist = await res.json();
        const content = JSON.parse(gist.files['ainav.json'].content);
        // 数据升级时默认给 en
        db = content.categories ? { activeIndex: 0, boards: [{title: "Main", categories: content.categories}], lang: 'en' } : content;
        isConfigured = true; render();
    } catch (err) { isConfigured = false; render(); }
}

function render() {
    const dict = I18N[db.lang || 'en'];
    document.getElementById('navBrandText').innerText = dict.navBrand;
    document.getElementById('btnSettingsText').innerText = dict.settings;
    document.getElementById('searchInput').placeholder = dict.searchPlaceholder;
    document.getElementById('menuLangText').innerText = dict.menuLang;
    document.getElementById('menuBackendText').innerText = dict.menuBackend;
    document.getElementById('modalTitleSettings').innerText = dict.modalTitleSettings;
    
    if (isConfigured) {
        document.getElementById('menuBoardItem').classList.remove('hide');
        document.getElementById('menuBoardDivider').classList.remove('hide');
        document.getElementById('addSiteBtn').classList.remove('hide');
        document.getElementById('addCatBtn').classList.remove('hide');
        document.getElementById('addSiteBtn').innerText = dict.addSite;
        document.getElementById('addCatBtn').innerText = dict.addCat;
    }

    const app = document.getElementById('app');
    if (!isConfigured) {
        app.innerHTML = `
            <div class="welcome-container">
                <div class="welcome-card">
                    <h4>✨ ${dict.introTitle}</h4>
                    <p>${dict.introDesc}</p>
                    <ul><li>${dict.feature1}</li><li>${dict.feature2}</li><li>${dict.feature3}</li></ul>
                    <button class="save-btn" onclick="handleOpenSettings()">${dict.setupBtn}</button>
                </div>
                <div class="welcome-card">
                    <h4>📖 ${dict.tutorialTitle}</h4>
                    <div class="tutorial-step">${dict.tutorialStep1}</div>
                    <div class="tutorial-step">${dict.tutorialStep2}</div>
                    <div class="tutorial-step">${dict.tutorialStep3}</div>
                    <button class="glass-btn w-100 mt-3" id="copyBtn" onclick="copyInitialJSON()">${dict.copyJsonBtn}</button>
                </div>
            </div>`;
        lucide.createIcons(); return;
    }

    const board = db.boards[db.activeIndex] || db.boards[0];
    if (!board) {
        app.innerHTML = `<div class="hero-section"><button class="save-btn" style="max-width:180px; margin: 0 auto;" onclick="createNewBoard()">${dict.emptyBoard}</button></div>`;
        return;
    }

    document.getElementById('labelSwitchBoard').innerText = dict.labelSwitchBoard;
    document.getElementById('labelRenameBoard').innerText = dict.labelRenameBoard;
    document.getElementById('btnApplyRename').innerText = dict.btnApply;
    document.getElementById('btnNewBoard').innerText = dict.btnNew;
    document.getElementById('btnDelBoard').innerText = dict.btnDel;
    document.getElementById('btnSaveConfig').innerText = dict.btnSave;
    document.getElementById('modalTitleSite').innerText = dict.modalTitleSite;
    document.getElementById('btnConfirmSite').innerText = dict.btnConfirm;
    document.getElementById('modalTitleCat').innerText = dict.modalTitleCat;
    document.getElementById('btnConfirmCat').innerText = dict.btnConfirm;

    document.getElementById('boardSwitcher').innerHTML = db.boards.map((b, i) => `<option value="${i}" ${i==db.activeIndex?'selected':''}>${b.title}</option>`).join('');
    app.innerHTML = '';
    const catSelect = document.getElementById('targetCat');
    catSelect.innerHTML = '';

    board.categories.forEach((cat, cIdx) => {
        catSelect.innerHTML += `<option value="${cIdx}">${cat.name}</option>`;
        const section = document.createElement('section');
        section.innerHTML = `<div class="category-header"><span>${cat.name}</span><button class="close-btn" style="font-size:1rem" onclick="deleteCat(${cIdx})"><i data-lucide="trash-2" class="icon-sm"></i></button></div><div class="board-grid" id="cat-${cIdx}"></div>`;
        app.appendChild(section);
        cat.sites.forEach((site, sIdx) => {
            let domain = 'invalid';
            try { domain = new URL(site.url).hostname; } catch(e) {}
            document.getElementById(`cat-${cIdx}`).innerHTML += `<a href="${site.url}" target="_blank" class="link-card"><button class="del-site-btn" onclick="event.preventDefault(); deleteSite(${cIdx}, ${sIdx})">&times;</button><img src="https://www.google.com/s2/favicons?sz=128&domain=${domain}" onerror="this.src='https://lucide.dev/favicon.ico'"><span>${site.name}</span></a>`;
        });
    });
    lucide.createIcons();
    updateStatus(true);
}

// 修改点 2：一键复制生成的 JSON 默认设为英文
function copyInitialJSON() {
    const data = { 
        activeIndex: 0, 
        lang: "en", 
        boards: [] 
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.innerText;
        btn.innerText = I18N[db.lang||'en'].copySuccess;
        setTimeout(() => { btn.innerText = originalText; }, 2000);
    });
}

function setLanguage(l) { db.lang = l; render(); if(isConfigured) pushToGist(); }
function showSettingPage(p) { document.getElementById('settingsHome').classList.add('hide'); document.querySelectorAll('.setting-detail-page').forEach(el => el.classList.add('hide')); document.getElementById(p).classList.remove('hide'); document.getElementById('settingsBackBtn').classList.remove('hide'); }
function showSettingsHome() { document.getElementById('settingsHome').classList.remove('hide'); document.querySelectorAll('.setting-detail-page').forEach(el => el.classList.add('hide')); document.getElementById('settingsBackBtn').classList.add('hide'); }
function addItem() { let u = document.getElementById('siteUrl').value.trim(); if(u && !/^https?:\/\//i.test(u)) u = 'https://'+u; const c = document.getElementById('targetCat').value; const n = document.getElementById('siteName').value; if(c!=="" && n && u) { db.boards[db.activeIndex].categories[c].sites.push({name:n, url:u}); closeAllModals(); render(); pushToGist(); } }
async function pushToGist() { if(!isConfigured) return; try { await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, { method: 'PATCH', headers: { 'Authorization': `token ${CONFIG.token}` }, body: JSON.stringify({ files: { 'ainav.json': { content: JSON.stringify(db, null, 2) } } }) }); updateStatus(true); } catch (e) { updateStatus(false); } }
function confirmReset() { if (confirm(I18N[db.lang||'en'].confirmReset)) { localStorage.clear(); location.reload(); } }
function openCustomModal(id) { document.getElementById('modalOverlay').style.display = 'block'; document.getElementById(id).classList.add('active'); if(id==='settingsModal') showSettingsHome(); }
function closeAllModals() { document.getElementById('modalOverlay').style.display = 'none'; document.querySelectorAll('.custom-modal').forEach(m => m.classList.remove('active')); }
function handleOpenSettings() { openCustomModal('settingsModal'); }
function saveSettings() { localStorage.setItem('gh_token', document.getElementById('ghToken').value.trim()); localStorage.setItem('gh_gist_id', document.getElementById('gistId').value.trim()); location.reload(); }
function updateStatus(on) { const dot = document.getElementById('syncStatus'); if (dot) dot.className = `status-dot ${on?'status-online':''}`; }
function switchBoard(i) { db.activeIndex = parseInt(i); render(); pushToGist(); }
function createNewBoard() { const n = prompt(I18N[db.lang||'en'].promptNewBoard); if(n){ db.boards.push({title:n, categories:[]}); db.activeIndex=db.boards.length-1; render(); pushToGist(); } }
function renameBoard() { const n = document.getElementById('siteTitleInput').value.trim(); if(n){ db.boards[db.activeIndex].title = n; render(); pushToGist(); } }
function deleteCurrentBoard() { if(confirm("Delete?")){ db.boards.splice(db.activeIndex,1); db.activeIndex=0; render(); pushToGist(); } }
function addCategory() { const n = document.getElementById('catName').value; if(n){ db.boards[db.activeIndex].categories.push({name:n, sites:[]}); render(); pushToGist(); closeAllModals(); } }
function deleteSite(c, s) { if(confirm("Delete?")){ db.boards[db.activeIndex].categories[c].sites.splice(s,1); render(); pushToGist(); } }
function deleteCat(i) { if(confirm("Delete?")){ db.boards[db.activeIndex].categories.splice(i,1); render(); pushToGist(); } }
function handleSearch(e) { if (e.key === 'Enter') { const q = e.target.value; window.open(q.includes('.') ? (q.startsWith('http') ? q : 'https://'+q) : 'https://www.google.com/search?q='+encodeURIComponent(q)); } }

init();