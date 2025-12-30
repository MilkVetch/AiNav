/**
 * 网址导航核心逻辑 - 2025 全新完整修复版
 * 功能：双语 I18N、动态时间、Gist 云端同步、多面板切换、弹窗动画隔离
 */

// 1. 国际化配置 (I18N)
const I18N = {
    zh: {
        navBrand: "网址导航", searchPlaceholder: "搜索或输入网址...", addSite: "+ 网址", addCat: "+ 分类", settings: "Setup",
        modalTitleSettings: "Setup", menuLang: "语言设置", menuBoard: "面板管理", menuSetup: "配置中心", 
        labelSwitchBoard: "切换面板", labelRenameBoard: "面板更名", btnApply: "应用", btnNew: "+ 新增", btnDel: "删除", 
        btnSave: "保存并同步", modalTitleSite: "新增网址", labelSelectCat: "选择分类", labelSiteName: "名称", 
        labelSiteUrl: "网址", btnConfirm: "确认添加", modalTitleCat: "新增分类", labelCatName: "分类名称", 
        setupBtn: "开始配置", emptyBoard: "创建首个面板", confirmDelSite: "确认删除网址？", 
        confirmDelCat: "确认删除分类？", confirmReset: "断开云端连接？", promptNewBoard: "输入新面板名称：",
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
        navBrand: "Nav Hub", searchPlaceholder: "Search...", addSite: "+ Site", addCat: "+ Category", settings: "Setup",
        modalTitleSettings: "Setup", menuLang: "Language", menuBoard: "Boards", menuSetup: "Setup", 
        labelSwitchBoard: "Switch", labelRenameBoard: "Rename", btnApply: "Apply", btnNew: "+ New", btnDel: "Delete", 
        btnSave: "Save & Sync", modalTitleSite: "Add Site", labelSelectCat: "Category", labelSiteName: "Name", 
        labelSiteUrl: "URL", btnConfirm: "Confirm", modalTitleCat: "Add Category", labelCatName: "Name", 
        setupBtn: "Setup Now", emptyBoard: "Create Board", confirmDelSite: "Delete?", 
        confirmDelCat: "Delete category?", confirmReset: "Reset config?", promptNewBoard: "Name:",
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

// 2. 双语问候语
const GREETINGS = {
    zh: { "00:00": "午夜时分，灵感进发的时刻。", "05:00": "清晨好，新的一天开始了。", "08:00": "早安，开启高效的一天。", "12:00": "中午好，记得午休一下。", "14:00": "下午好，保持专注。", "18:00": "傍晚好，享受落日余晖。", "21:00": "夜深了，音乐是灵魂的港湾。", "23:00": "晚安，做个好梦。" },
    en: { "00:00": "Midnight inspiration.", "05:00": "A new day begins.", "08:00": "Good morning, stay focused.", "12:00": "Take a short break.", "14:00": "Good afternoon.", "18:00": "Enjoy the sunset.", "21:00": "Music for the soul.", "23:00": "Good night, sweet dreams." }
};

// 3. 核心状态
let db = { activeIndex: 0, boards: [], lang: 'en' };
let isConfigured = false;
const CONFIG = { token: localStorage.getItem('gh_token'), gistId: localStorage.getItem('gh_gist_id') };

// 4. 初始化入口
function init() {
    updateClock(); 
    setInterval(updateClock, 1000);
    
    // 初始化状态小灯为断开状态
    updateStatus(false);

    if (CONFIG.token && CONFIG.gistId) {
        fetchData();
    } else {
        render(); // 未配置时显示引导页
    }
    lucide.createIcons();
}

// 5. 动态更新：时间、背景、问候语
function updateClock() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    
    // 数字时钟
    document.getElementById('digitalClock').innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    // 背景光晕随时间变化
    let glow = "rgba(150, 100, 255, 0.12)"; 
    if (h >= 5 && h < 12) glow = "rgba(255, 180, 100, 0.12)"; 
    else if (h >= 12 && h < 18) glow = "rgba(100, 200, 255, 0.12)"; 
    document.documentElement.style.setProperty('--glow-color', glow);

    // 双语问候
    const greetingEl = document.getElementById('greetingText');
    const lang = db.lang || 'en';
    const hourKeys = Object.keys(GREETINGS[lang]).sort().reverse();
    const currentKey = hourKeys.find(key => h >= parseInt(key.split(':')[0])) || "00:00";
    const target = GREETINGS[lang][currentKey];

    if (greetingEl.innerText !== target) {
        greetingEl.style.opacity = "0";
        setTimeout(() => {
            greetingEl.innerText = target;
            greetingEl.style.opacity = "1";
        }, 600);
    }
}

// 6. 数据层：Gist 拉取
async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            headers: { 'Authorization': `token ${CONFIG.token}` }
        });
        if (!res.ok) throw new Error();
        const gist = await res.json();
        const content = JSON.parse(gist.files['ainav.json'].content);
        
        // 兼容处理
        db = content.categories ? { activeIndex: 0, boards: [{ title: "Main", categories: content.categories }], lang: content.lang || 'en' } : content;

        isConfigured = true;
        updateStatus(true);
        render();
    } catch (err) {
        isConfigured = false;
        render();
    }
}

// 7. 核心渲染函数
function render() {
    const dict = I18N[db.lang || 'en'];
    
    // 基础文本更新
    document.getElementById('navBrandText').innerText = dict.navBrand;
    document.getElementById('btnSettingsText').innerText = dict.settings;
    document.getElementById('searchInput').placeholder = dict.searchPlaceholder;
    document.getElementById('menuLangText').innerText = dict.menuLang;
    document.getElementById('menuSetupText').innerText = dict.menuSetup;
    document.getElementById('modalTitleSettings').innerText = dict.modalTitleSettings;

    const app = document.getElementById('app');

    // 情况 A：未配置状态 - 显示引导页
    if (!isConfigured) {
        document.getElementById('searchBarArea').classList.add('hide');
        document.getElementById('menuBoardItem').classList.add('hide');
        document.getElementById('menuBoardDivider').classList.add('hide');
        document.getElementById('addSiteBtn').classList.add('hide');
        document.getElementById('addCatBtn').classList.add('hide');

        app.innerHTML = `
            <div class="welcome-container">
                <div class="welcome-card">
                    <h4>✨ ${dict.introTitle}</h4>
                    <p>${dict.introDesc}</p>
                    <ul>
                        <li>${dict.feature1}</li>
                        <li>${dict.feature2}</li>
                        <li>${dict.feature3}</li>
                    </ul>
                    <button class="save-btn" onclick="handleOpenSetup()">
                        <i data-lucide="settings" class="icon-sm"></i> ${dict.setupBtn}
                    </button>
                </div>
                <div class="welcome-card">
                    <h4>📖 ${dict.tutorialTitle}</h4>
                    <div class="tutorial-steps-wrapper">
                        <div class="tutorial-step">${dict.tutorialStep1}</div>
                        <div class="tutorial-step">${dict.tutorialStep2}</div>
                        <div class="tutorial-step">${dict.tutorialStep3}</div>
                    </div>
                    <button class="glass-btn" id="copyBtn" onclick="copyInitialJSON()">
                        <i data-lucide="copy" class="icon-sm"></i> ${dict.copyJsonBtn}
                    </button>
                </div>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // 情况 B：已配置状态 - 显示导航主区
    document.getElementById('searchBarArea').classList.remove('hide');
    document.getElementById('menuBoardItem').classList.remove('hide');
    document.getElementById('menuBoardDivider').classList.remove('hide');
    document.getElementById('addSiteBtn').classList.remove('hide');
    document.getElementById('addCatBtn').classList.remove('hide');
    document.getElementById('addSiteBtn').innerText = dict.addSite;
    document.getElementById('addCatBtn').innerText = dict.addCat;

    const board = db.boards[db.activeIndex] || db.boards[0];

    if (!board) {
        app.innerHTML = `<button class="save-btn" style="max-width:240px; margin: 2rem auto;" onclick="createNewBoard()">${dict.emptyBoard}</button>`;
        return;
    }

    // 设置菜单文本同步
    document.getElementById('menuBoardText').innerText = dict.menuBoard;
    document.getElementById('labelSwitchBoard').innerText = dict.labelSwitchBoard;
    document.getElementById('labelRenameBoard').innerText = dict.labelRenameBoard;
    document.getElementById('btnSaveConfig').innerText = dict.btnSave;

    // 渲染看板内容
    document.getElementById('boardSwitcher').innerHTML = db.boards.map((b, i) => 
        `<option value="${i}" ${i==db.activeIndex?'selected':''}>${b.title}</option>`
    ).join('');
    
    app.innerHTML = '';
    const catSelect = document.getElementById('targetCat');
    catSelect.innerHTML = '';

    board.categories.forEach((cat, cIdx) => {
        catSelect.innerHTML += `<option value="${cIdx}">${cat.name}</option>`;
        const section = document.createElement('section');
        section.innerHTML = `
            <div class="category-header">
                <span>${cat.name}</span>
                <button class="close-btn" style="font-size:0.8rem" onclick="deleteCat(${cIdx})">
                    <i data-lucide="trash-2" class="chevron-icon"></i>
                </button>
            </div>
            <div class="board-grid" id="cat-${cIdx}"></div>
        `;
        app.appendChild(section);

        cat.sites.forEach((site, sIdx) => {
            let domain = 'invalid';
            try { domain = new URL(site.url).hostname; } catch(e) {}
            document.getElementById(`cat-${cIdx}`).innerHTML += `
                <a href="${site.url}" target="_blank" class="link-card">
                    <button class="del-site-btn" onclick="event.preventDefault(); deleteSite(${cIdx}, ${sIdx})">
                        &times;
                    </button>
                    <img src="https://www.google.com/s2/favicons?sz=128&domain=${domain}" onerror="this.src='https://lucide.dev/favicon.ico'">
                    <span>${site.name}</span>
                </a>
            `;
        });
    });
    lucide.createIcons();
}

// 8. 弹窗与设置页逻辑
function openCustomModal(id) { 
    document.getElementById('modalOverlay').classList.add('active'); 
    document.getElementById(id).classList.add('active'); 
    if(id==='settingsModal') {
        document.getElementById('ghToken').value = CONFIG.token || '';
        document.getElementById('gistId').value = CONFIG.gistId || '';
    }
}

function closeAllModals() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.querySelectorAll('.custom-modal').forEach(m => m.classList.remove('active'));
    setTimeout(showSettingsHome, 300);
}

function handleOpenSettings() { 
    openCustomModal('settingsModal'); 
}

function handleOpenSetup() { 
    openCustomModal('settingsModal'); 
    showSettingPage('pageSetup'); 
}

function showSettingPage(pageId) {
    document.getElementById('settingsHome').classList.add('hide');
    document.querySelectorAll('.setting-detail-page').forEach(p => p.classList.add('hide'));
    document.getElementById(pageId).classList.remove('hide');
    document.getElementById('settingsBackBtn').classList.remove('hide');
}

function showSettingsHome() {
    document.getElementById('settingsHome').classList.remove('hide');
    document.querySelectorAll('.setting-detail-page').forEach(p => p.classList.add('hide'));
    document.getElementById('settingsBackBtn').classList.add('hide');
}

// 9. 核心功能函数
function setLanguage(lang) {
    db.lang = lang;
    render();
    if (isConfigured) pushToGist();
}

function saveSettings() {
    const token = document.getElementById('ghToken').value.trim();
    const id = document.getElementById('gistId').value.trim();
    if (token) localStorage.setItem('gh_token', token);
    if (id) localStorage.setItem('gh_gist_id', id);
    location.reload();
}

async function pushToGist() {
    if (!isConfigured) return;
    try {
        await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${CONFIG.token}` },
            body: JSON.stringify({ files: { 'ainav.json': { content: JSON.stringify(db, null, 2) } } })
        });
        updateStatus(true);
    } catch (e) { updateStatus(false); }
}

function copyInitialJSON() {
    const data = { activeIndex: 0, lang: "en", boards: [] };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.innerText;
        btn.innerText = I18N[db.lang||'en'].copySuccess;
        setTimeout(() => { btn.innerText = originalText; }, 2000);
    });
}

function confirmReset() {
    if (confirm(I18N[db.lang||'en'].confirmReset)) {
        localStorage.clear();
        location.reload();
    }
}

// 10. 辅助功能 (CRUD)
function addItem() {
    let url = document.getElementById('siteUrl').value.trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    const cIdx = document.getElementById('targetCat').value;
    const n = document.getElementById('siteName').value;
    if (cIdx !== "" && n && url) {
        db.boards[db.activeIndex].categories[cIdx].sites.push({ name: n, url: url });
        closeAllModals(); render(); pushToGist();
    }
}

function addCategory() {
    const n = document.getElementById('catName').value.trim();
    if(n) { db.boards[db.activeIndex].categories.push({name: n, sites: []}); render(); pushToGist(); closeAllModals(); }
}

function createNewBoard() {
    const n = prompt(I18N[db.lang||'en'].promptNewBoard);
    if(n) { db.boards.push({title: n, categories: []}); db.activeIndex = db.boards.length - 1; render(); pushToGist(); }
}

function renameBoard() {
    const n = document.getElementById('siteTitleInput').value.trim();
    if(n) { db.boards[db.activeIndex].title = n; render(); pushToGist(); }
}

function deleteCurrentBoard() {
    if(confirm("Confirm Delete Board?")) { db.boards.splice(db.activeIndex, 1); db.activeIndex = 0; render(); pushToGist(); }
}

function deleteSite(c, s) { if(confirm("Delete site?")) { db.boards[db.activeIndex].categories[c].sites.splice(s,1); render(); pushToGist(); } }
function deleteCat(i) { if(confirm("Delete category?")) { db.boards[db.activeIndex].categories.splice(i,1); render(); pushToGist(); } }

function switchBoard(i) { db.activeIndex = parseInt(i); render(); pushToGist(); }

function updateStatus(on) {
    const dot = document.getElementById('syncStatus');
    if (dot) dot.className = `status-dot ${on ? 'status-online' : ''}`;
}

function handleSearch(e) {
    if (e.key === 'Enter') {
        const q = e.target.value;
        window.open(q.includes('.') ? (q.startsWith('http') ? q : 'https://'+q) : 'https://www.google.com/search?q='+encodeURIComponent(q));
    }
}

// 启动程序
init();