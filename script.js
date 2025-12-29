// 1. 语言包字典
const I18N = {
    zh: {
        navBrand: "网址导航",
        loading: "同步云端数据中...",
        searchPlaceholder: "搜索或输入网址...",
        addSite: "+ 网址",
        addCat: "+ 分类",
        settings: "设置",
        modalTitleSettings: "系统设置",
        sectionBoard: "面板设置",
        sectionTheme: "配色方案",
        sectionBackend: "后端配置 (Gist)",
        labelSwitchBoard: "切换面板",
        labelRenameBoard: "面板更名",
        btnApply: "应用",
        btnNew: "+ 新增",
        btnDel: "删除",
        btnSave: "连接并保存",
        modalTitleSite: "新增网址",
        labelSelectCat: "选择分类",
        labelSiteName: "名称",
        labelSiteUrl: "网址",
        btnConfirm: "确认添加",
        modalTitleCat: "新增分类",
        labelCatName: "分类名称",
        welcome: "欢迎使用",
        setupMsg: "请配置 Gist 以开启云端同步",
        setupBtn: "去配置",
        emptyBoard: "创建首个面板",
        confirmDelSite: "确认删除网址？",
        confirmDelCat: "确认删除分类及其下所有网址？",
        confirmReset: "要断开云端连接并清除本地数据吗？",
        confirmDelBoard: "确定删除此面板？",
        promptNewBoard: "输入新面板名称："
    },
    en: {
        navBrand: "AI Navigation",
        loading: "Syncing data...",
        searchPlaceholder: "Search or type URL...",
        addSite: "+ Site",
        addCat: "+ Category",
        settings: "Settings",
        modalTitleSettings: "System Settings",
        sectionBoard: "Board Settings",
        sectionTheme: "Themes",
        sectionBackend: "Backend (Gist)",
        labelSwitchBoard: "Switch Board",
        labelRenameBoard: "Rename Board",
        btnApply: "Apply",
        btnNew: "+ Add",
        btnDel: "Delete",
        btnSave: "Connect & Save",
        modalTitleSite: "Add New Site",
        labelSelectCat: "Select Category",
        labelSiteName: "Name",
        labelSiteUrl: "URL",
        btnConfirm: "Confirm",
        modalTitleCat: "Add New Category",
        labelCatName: "Category Name",
        welcome: "Welcome",
        setupMsg: "Configure Gist to enable sync",
        setupBtn: "Go to Setup",
        emptyBoard: "Create First Board",
        confirmDelSite: "Delete this site?",
        confirmDelCat: "Delete category and all its sites?",
        confirmReset: "Disconnect and clear local data?",
        confirmDelBoard: "Delete this board permanently?",
        promptNewBoard: "Enter new board name:"
    }
};

const CHINESE_GREETINGS = { /* ...保持之前的 48 个中文问候语... */ };
const ENGLISH_GREETINGS = { /* 可选：如果需要英文问候语可在此添加，目前逻辑默认为中文问候语 */ };

const THEMES = [
    { id: 'classic', name: '极简蓝', class: 'theme-classic' },
    { id: 'emerald', name: '雅致翠', class: 'theme-emerald' },
    { id: 'rose', name: '温柔粉', class: 'theme-rose' },
    { id: 'sand', name: '舒适沙', class: 'theme-sand' }
];

let db = { activeIndex: 0, boards: [], theme: 'classic', lang: 'zh' };
let isConfigured = false;
const CONFIG = { token: localStorage.getItem('gh_token'), gistId: localStorage.getItem('gh_gist_id') };

function init() {
    updateClock(); 
    setInterval(updateClock, 1000); 
    renderThemes();

    if (CONFIG.token) document.getElementById('ghToken').value = CONFIG.token;
    if (CONFIG.gistId) document.getElementById('gistId').value = CONFIG.gistId;

    if (!CONFIG.token || !CONFIG.gistId) {
        showSetupRequired();
    } else {
        fetchData();
    }
    lucide.createIcons();
}

// 切换语言逻辑
function setLanguage(lang) {
    db.lang = lang;
    render();
    pushToGist();
}

async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            headers: { 'Authorization': `token ${CONFIG.token}` }
        });
        if (!res.ok) throw new Error('Sync Error');
        const gist = await res.json();
        const content = JSON.parse(gist.files['ainav.json'].content);
        
        // 升级旧数据结构
        if (content.categories) {
            db = { activeIndex: 0, boards: [{ title: content.title || "Main", categories: content.categories }], theme: content.theme || 'classic', lang: 'zh' };
        } else {
            db = content;
        }
        
        if (!db.lang) db.lang = 'zh';
        
        isConfigured = true;
        applyTheme(db.theme || 'classic', false);
        updateStatus(true);
        render();
    } catch (err) {
        isConfigured = false;
        showSetupRequired();
    }
}

function render() {
    const lang = db.lang || 'zh';
    const dict = I18N[lang];

    // 1. 静态文本翻译更新
    document.getElementById('navBrandText').innerText = dict.navBrand;
    document.getElementById('addSiteBtn').innerText = dict.addSite;
    document.getElementById('addCatBtn').innerText = dict.addCat;
    document.getElementById('btnSettingsText').innerText = dict.settings;
    document.getElementById('searchInput').placeholder = dict.searchPlaceholder;
    document.getElementById('modalTitleSettings').innerText = dict.modalTitleSettings;
    document.getElementById('sectionBoardText').innerText = dict.sectionBoard;
    document.getElementById('sectionThemeText').innerText = dict.sectionTheme;
    document.getElementById('sectionBackendText').innerText = dict.sectionBackend;
    document.getElementById('labelSwitchBoard').innerText = dict.labelSwitchBoard;
    document.getElementById('labelRenameBoard').innerText = dict.labelRenameBoard;
    document.getElementById('btnApplyRename').innerText = dict.btnApply;
    document.getElementById('btnNewBoard').innerText = dict.btnNew;
    document.getElementById('btnDelBoard').innerText = dict.btnDel;
    document.getElementById('btnSaveConfig').innerText = dict.btnSave;
    
    // 弹窗翻译
    document.getElementById('modalTitleSite').innerText = dict.modalTitleSite;
    document.getElementById('labelSelectCat').innerText = dict.labelSelectCat;
    document.getElementById('labelSiteName').innerText = dict.labelSiteName;
    document.getElementById('labelSiteUrl').innerText = dict.labelSiteUrl;
    document.getElementById('btnConfirmSite').innerText = dict.btnConfirm;
    document.getElementById('modalTitleCat').innerText = dict.modalTitleCat;
    document.getElementById('labelCatName').innerText = dict.labelCatName;
    document.getElementById('btnConfirmCat').innerText = dict.btnConfirm;

    // 2. 动态内容渲染
    document.querySelectorAll('.hide').forEach(el => el.classList.remove('hide'));
    const app = document.getElementById('app');
    const activeBoard = db.boards[db.activeIndex] || db.boards[0];

    if (!activeBoard) {
        app.innerHTML = `<div class="hero-section"><h3>${dict.welcome}</h3><button class="save-btn" style="max-width:180px" onclick="createNewBoard()">${dict.emptyBoard}</button></div>`;
        return;
    }

    // 更新切换器
    document.getElementById('boardSwitcher').innerHTML = db.boards.map((b, i) => `<option value="${i}" ${i==db.activeIndex?'selected':''}>${b.title}</option>`).join('');
    document.getElementById('siteTitleInput').value = activeBoard.title;

    app.innerHTML = '';
    const catSelect = document.getElementById('targetCat');
    catSelect.innerHTML = '';

    activeBoard.categories.forEach((cat, cIdx) => {
        catSelect.innerHTML += `<option value="${cIdx}">${cat.name}</option>`;
        const section = document.createElement('section');
        section.innerHTML = `
            <div class="category-header">
                <span>${cat.name}</span>
                <button class="close-btn" style="font-size:1rem" onclick="deleteCat(${cIdx})"><i data-lucide="trash-2" class="icon-sm"></i></button>
            </div>
            <div class="board-grid" id="cat-${cIdx}"></div>
        `;
        app.appendChild(section);

        const grid = document.getElementById(`cat-${cIdx}`);
        cat.sites.forEach((site, sIdx) => {
            let domain = 'invalid';
            try { domain = new URL(site.url).hostname; } catch(e) {}
            grid.innerHTML += `
                <a href="${site.url}" target="_blank" class="link-card">
                    <button class="del-site-btn" onclick="event.preventDefault(); deleteSite(${cIdx}, ${sIdx})">&times;</button>
                    <img src="https://www.google.com/s2/favicons?sz=128&domain=${domain}" onerror="this.src='https://lucide.dev/favicon.ico'">
                    <span>${site.name}</span>
                </a>
            `;
        });
    });
    lucide.createIcons();
}

// ... updateClock, addItem, pushToGist 等函数保持不变 ...
// 注意：在 confirm 弹窗处请使用 dict.confirmXXX 变量以实现多语言。

function deleteSite(c, s) { 
    if(confirm(I18N[db.lang].confirmDelSite)){ 
        db.boards[db.activeIndex].categories[c].sites.splice(s,1); 
        render(); pushToGist(); 
    } 
}

function showSetupRequired() {
    const lang = db.lang || 'zh';
    const dict = I18N[lang];
    document.getElementById('app').innerHTML = `<div class="hero-section"><h3>${dict.welcome}</h3><p>${dict.setupMsg}</p><button class="save-btn" style="max-width:180px" onclick="handleOpenSettings()">${dict.setupBtn}</button></div>`;
}

// 启动程序
init();