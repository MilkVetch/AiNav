const I18N = {
    zh: {
        navBrand: "网址导航", searchPlaceholder: "搜索或输入网址...", addSite: "+ 网址", addCat: "+ 分类", settings: "设置",
        modalTitleSettings: "系统设置", menuLang: "语言设置", menuBoard: "面板管理", menuBackend: "后端配置", labelSwitchBoard: "切换面板",
        labelRenameBoard: "面板更名", btnApply: "应用", btnNew: "+ 新增", btnDel: "删除", btnSave: "连接并保存", modalTitleSite: "新增网址",
        labelSelectCat: "选择分类", labelSiteName: "名称", labelSiteUrl: "网址", btnConfirm: "确认", modalTitleCat: "新增分类",
        labelCatName: "分类名称", setupBtn: "去配置", emptyBoard: "创建首个面板",
        confirmDelSite: "确认删除网址？", confirmDelCat: "确认删除分类？", confirmReset: "断开云端连接并重置？", promptNewBoard: "输入新面板名称：",
        // 欢迎页文本
        introTitle: "这个导航站能做什么？",
        introDesc: "这是一个基于 GitHub Gist 的纯前端网址导航站。无需服务器，您的所有数据都安全地存储在您自己的 GitHub 账号中。",
        feature1: "多面板支持：按工作、生活、游戏分类管理。",
        feature2: "云端同步：电脑与手机浏览器实时无缝同步。",
        feature3: "原生响应：极速加载，无任何第三方追踪。",
        tutorialTitle: "建议配置教程",
        tutorialStep1: "1. 访问 GitHub 设置，创建一个 <b>Fine-grained PAT</b>。",
        tutorialStep2: "2. <b>权限：</b> 必须勾选 <b>Gists</b> 的读写权限。",
        tutorialStep3: "3. 创建一个公开或私有的 Gist，新建文件 <code>ainav.json</code>。",
        copyJsonBtn: "复制初始化 JSON",
        copySuccess: "已复制！去 Gist 粘贴吧",
    },
    en: {
        navBrand: "Nav Hub", searchPlaceholder: "Search or type URL...", addSite: "+ Site", addCat: "+ Category", settings: "Settings",
        modalTitleSettings: "Settings", menuLang: "Language", menuBoard: "Boards", menuBackend: "Storage", labelSwitchBoard: "Switch",
        labelRenameBoard: "Rename", btnApply: "Apply", btnNew: "+ New", btnDel: "Delete", btnSave: "Save", modalTitleSite: "Add Site",
        labelSelectCat: "Category", labelSiteName: "Name", labelSiteUrl: "URL", btnConfirm: "Confirm", modalTitleCat: "Add Category",
        labelCatName: "Name", setupBtn: "Setup", emptyBoard: "Create Board",
        confirmDelSite: "Delete?", confirmDelCat: "Delete category?", confirmReset: "Reset local data?", promptNewBoard: "Board name:",
        // Welcome page
        introTitle: "What can this site do?",
        introDesc: "A pure frontend navigation tool powered by GitHub Gist. No server needed, your data stays in your own GitHub account.",
        feature1: "Multi-Boards: Separate Work, Life, or Games.",
        feature2: "Cloud Sync: Instant sync between PC and Mobile.",
        feature3: "Privacy: Zero tracking, lightning fast.",
        tutorialTitle: "Configuration Guide",
        tutorialStep1: "1. Create a <b>Fine-grained PAT</b> in GitHub Settings.",
        tutorialStep2: "2. <b>Perms:</b> Grant <b>Gists</b> read/write access.",
        tutorialStep3: "3. Create a Gist with a file named <code>ainav.json</code>.",
        copyJsonBtn: "Copy Initial JSON",
        copySuccess: "Copied! Paste to Gist.",
    }
};

const GREETINGS = {
    zh: { "00:00": "午夜时分，灵感进发的时刻。", "05:00": "清晨好，新的一天开始了。", "08:00": "早安，开启高效的一天。", "12:00": "中午好，记得午休一下。", "14:00": "下午好，保持专注。", "18:00": "傍晚好，享受落日余晖。", "21:00": "夜深了，音乐是灵魂的港湾。", "23:00": "晚安，做个好梦。" },
    en: { "00:00": "Midnight, time for inspiration.", "05:00": "Early morning, a new day begins.", "08:00": "Good morning, stay focused.", "12:00": "Noon, take a short break.", "14:00": "Good afternoon, keep going.", "18:00": "Sunset, enjoy the evening.", "21:00": "Night, music for the soul.", "23:00": "Good night, sweet dreams." }
};

let db = { activeIndex: 0, boards: [], lang: 'zh' };
let isConfigured = false;
const CONFIG = { token: localStorage.getItem('gh_token'), gistId: localStorage.getItem('gh_gist_id') };

function init() {
    updateClock(); setInterval(updateClock, 1000);
    if (CONFIG.token) document.getElementById('ghToken').value = CONFIG.token;
    if (CONFIG.gistId) document.getElementById('gistId').value = CONFIG.gistId;
    if (!CONFIG.token || !CONFIG.gistId) render();
    else fetchData();
    lucide.createIcons();
}

function updateClock() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    document.getElementById('digitalClock').innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    let glow = "rgba(150, 100, 255, 0.2)";
    if (h >= 5 && h < 12) glow = "rgba(255, 180, 100, 0.2)";
    else if (h >= 12 && h < 18) glow = "rgba(100, 200, 255, 0.2)";
    document.documentElement.style.setProperty('--glow-color', glow);
    const greetingEl = document.getElementById('greetingText');
    const lang = db.lang || 'zh';
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
        db = content.categories ? { activeIndex: 0, boards: [{title: "Main", categories: content.categories}], lang: 'zh' } : content;
        isConfigured = true; render();
    } catch (err) { isConfigured = false; render(); }
}

// 核心渲染：包含全新的欢迎引导页逻辑
function render() {
    const dict = I18N[db.lang || 'zh'];
    document.getElementById('navBrandText').innerText = dict.navBrand;
    document.getElementById('btnSettingsText').innerText = dict.settings;
    document.getElementById('searchInput').placeholder = dict.searchPlaceholder;
    document.getElementById('menuLangText').innerText = dict.menuLang;
    document.getElementById('menuBackendText').innerText = dict.menuBackend;
    document.getElementById('modalTitleSettings').innerText = dict.modalTitleSettings;

    const app = document.getElementById('app');

    // 视图 1：未配置状态（详细欢迎页）
    if (!isConfigured) {
        document.getElementById('searchBarArea').classList.add('hide'); // 未配置隐藏搜索
        document.getElementById('menuBoardItem').classList.add('hide');
        document.getElementById('menuBoardDivider').classList.add('hide');
        app.innerHTML = `
            <div class="welcome-container">
                <div class="welcome-card">
                    <h4><i data-lucide="sparkles" class="icon-sm"></i> ${dict.introTitle}</h4>
                    <p>${dict.introDesc}</p>
                    <ul>
                        <li>${dict.feature1}</li>
                        <li>${dict.feature2}</li>
                        <li>${dict.feature3}</li>
                    </ul>
                    <button class="save-btn" onclick="handleOpenSettings()"><i data-lucide="settings" class="icon-sm"></i> ${dict.setupBtn}</button>
                </div>
                <div class="welcome-card">
                    <h4><i data-lucide="book-open" class="icon-sm"></i> ${dict.tutorialTitle}</h4>
                    <div class="tutorial-step">${dict.tutorialStep1}</div>
                    <div class="tutorial-step">${dict.tutorialStep2}</div>
                    <div class="tutorial-step">${dict.tutorialStep3}</div>
                    <button class="glass-btn w-100 mt-3" id="copyBtn" onclick="copyInitialJSON()">
                        <i data-lucide="copy" class="icon-sm"></i> ${dict.copyJsonBtn}
                    </button>
                </div>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // 视图 2：正常渲染（代码同前，包含权限判断）
    document.getElementById('searchBarArea').classList.remove('hide');
    document.getElementById('menuBoardItem').classList.remove('hide');
    document.getElementById('menuBoardDivider').classList.remove('hide');
    document.getElementById('addSiteBtn').classList.remove('hide');
    document.getElementById('addCatBtn').classList.remove('hide');
    document.getElementById('addSiteBtn').innerText = dict.addSite;
    document.getElementById('addCatBtn').innerText = dict.addCat;

    const board = db.boards[db.activeIndex] || db.boards[0];
    if (!board) {
        app.innerHTML = `<div class="hero-section"><button class="save-btn" style="max-width:180px" onclick="createNewBoard()">${dict.emptyBoard}</button></div>`;
        return;
    }

    // 填充弹窗与选择框文本
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
}

// 复制初始 JSON 功能
function copyInitialJSON() {
    const initialData = {
        activeIndex: 0,
        lang: db.lang || "zh",
        boards: [{
            title: "Main",
            categories: [{ name: "Example", sites: [{ name: "Google", url: "https://www.google.com" }] }]
        }]
    };
    navigator.clipboard.writeText(JSON.stringify(initialData, null, 2)).then(() => {
        const btn = document.getElementById('copyBtn');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="check" class="icon-sm"></i> ${I18N[db.lang||'zh'].copySuccess}`;
        lucide.createIcons();
        setTimeout(() => { btn.innerHTML = oldHtml; lucide.createIcons(); }, 2000);
    });
}

// 其余辅助函数（保持不变）
function setLanguage(l) { db.lang = l; render(); if(isConfigured) pushToGist(); }
function showSettingPage(p) { document.getElementById('settingsHome').classList.add('hide'); document.querySelectorAll('.setting-detail-page').forEach(el => el.classList.add('hide')); document.getElementById(p).classList.remove('hide'); document.getElementById('settingsBackBtn').classList.remove('hide'); }
function showSettingsHome() { document.getElementById('settingsHome').classList.remove('hide'); document.querySelectorAll('.setting-detail-page').forEach(el => el.classList.add('hide')); document.getElementById('settingsBackBtn').classList.add('hide'); }
function addItem() { let u = document.getElementById('siteUrl').value.trim(); if(u && !/^https?:\/\//i.test(u)) u = 'https://'+u; const c = document.getElementById('targetCat').value; const n = document.getElementById('siteName').value; if(c!=="" && n && u) { db.boards[db.activeIndex].categories[c].sites.push({name:n, url:u}); closeAllModals(); render(); pushToGist(); } }
async function pushToGist() { if(!isConfigured) return; try { await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, { method: 'PATCH', headers: { 'Authorization': `token ${CONFIG.token}` }, body: JSON.stringify({ files: { 'ainav.json': { content: JSON.stringify(db, null, 2) } } }) }); updateStatus(true); } catch (e) { updateStatus(false); } }
function confirmReset() { if(confirm(I18N[db.lang||'zh'].confirmReset)) { localStorage.clear(); location.reload(); } }
function openCustomModal(id) { document.getElementById('modalOverlay').style.display = 'block'; document.getElementById(id).classList.add('active'); if(id==='settingsModal') showSettingsHome(); }
function closeAllModals() { document.getElementById('modalOverlay').style.display = 'none'; document.querySelectorAll('.custom-modal').forEach(m => m.classList.remove('active')); }
function handleOpenSettings() { openCustomModal('settingsModal'); }
function saveSettings() { localStorage.setItem('gh_token', document.getElementById('ghToken').value.trim()); localStorage.setItem('gh_gist_id', document.getElementById('gistId').value.trim()); location.reload(); }
function updateStatus(on) { const dot = document.getElementById('syncStatus'); if(dot) dot.className = `status-dot ${on?'status-online':''}`; }
function switchBoard(i) { db.activeIndex = parseInt(i); render(); pushToGist(); }
function createNewBoard() { const n = prompt(I18N[db.lang||'zh'].promptNewBoard); if(n){ db.boards.push({title:n, categories:[]}); db.activeIndex=db.boards.length-1; render(); pushToGist(); } }
function renameBoard() { const n = document.getElementById('siteTitleInput').value.trim(); if(n){ db.boards[db.activeIndex].title = n; render(); pushToGist(); } }
function deleteCurrentBoard() { if(confirm("Delete?")){ db.boards.splice(db.activeIndex,1); db.activeIndex=0; render(); pushToGist(); } }
function addCategory() { const n = document.getElementById('catName').value; if(n){ db.boards[db.activeIndex].categories.push({name:n, sites:[]}); render(); pushToGist(); closeAllModals(); } }
function deleteSite(c, s) { if(confirm("Delete?")){ db.boards[db.activeIndex].categories[c].sites.splice(s,1); render(); pushToGist(); } }
function deleteCat(i) { if(confirm("Delete?")){ db.boards[db.activeIndex].categories.splice(i,1); render(); pushToGist(); } }
function handleSearch(e) { if(e.key === 'Enter') { const q = e.target.value; window.open(q.includes('.') ? (q.startsWith('http') ? q : 'https://'+q) : 'https://www.google.com/search?q='+encodeURIComponent(q)); } }

init();