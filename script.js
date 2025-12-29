const THEMES = [
    { id: 'classic', name: '极简蓝', primary: '#0d6efd', accent: '#0a58ca', bg: '#f8f9fa' },
    { id: 'emerald', name: '雅致翠', primary: '#198754', accent: '#146c43', bg: '#f0f7f4' },
    { id: 'rose', name: '温柔粉', primary: '#d63384', accent: '#b02a6a', bg: '#fff5f8' },
    { id: 'midnight', name: '深邃黑', primary: '#212529', accent: '#495057', bg: '#e9ecef' },
    { id: 'sand', name: '舒适沙', primary: '#854d0e', accent: '#713f12', bg: '#fefce8' }
];

let db = { activeIndex: 0, boards: [], theme: 'classic' };
let bootstrapModals = {};
let isConfigured = false;

const CONFIG = {
    token: localStorage.getItem('gh_token'),
    gistId: localStorage.getItem('gh_gist_id')
};

// 1. 初始化
async function init() {
    // 优先手动创建 Modal 实例，防止后续调用报错
    ['settingsModal', 'siteModal', 'catModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) bootstrapModals[id] = new bootstrap.Modal(el);
    });

    // 回显设置项
    if (CONFIG.token) document.getElementById('ghToken').value = CONFIG.token;
    if (CONFIG.gistId) document.getElementById('gistId').value = CONFIG.gistId;

    renderThemes();

    if (!CONFIG.token || !CONFIG.gistId) {
        isConfigured = false;
        showSetupRequired();
    } else {
        await fetchData();
    }
    lucide.createIcons();
}

// 2. 状态点点击逻辑
function confirmReset() {
    const msg = isConfigured ? "已连接。是否断开连接并清空本地配置？" : "未连接。是否重置？";
    if (confirm(msg)) {
        localStorage.clear();
        location.reload();
    }
}

// 3. 智能打开设置弹窗
function handleOpenSettings() {
    if (bootstrapModals['settingsModal']) {
        bootstrapModals['settingsModal'].show();
        // 如果未配置，自动折叠展开“后端配置”
        if (!isConfigured) {
            const collapseEl = document.getElementById('collapseBackend');
            const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseEl);
            bsCollapse.show();
        }
    }
}

async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            headers: { 'Authorization': `token ${CONFIG.token}` }
        });
        if (!res.ok) throw new Error('Auth Failed');
        
        const gist = await res.json();
        const file = gist.files['ainav.json'];
        
        if (file) {
            const content = JSON.parse(file.content);
            db = content.categories ? { activeIndex: 0, boards: [content], theme: 'classic' } : content;
        }
        
        isConfigured = true;
        applyTheme(db.theme || 'classic', false);
        updateStatus(true);
        render();
    } catch (err) {
        console.error(err);
        isConfigured = false;
        updateStatus(false);
        showSetupRequired();
    }
}

function render() {
    // 隐藏加载状态并显示配置成功后的功能
    document.getElementById('boardSettingItem').classList.remove('d-none');
    document.getElementById('themeSettingItem').classList.remove('d-none');
    document.getElementById('addSiteBtn').classList.remove('d-none');
    document.getElementById('addCatBtn').classList.remove('d-none');

    const app = document.getElementById('app');
    const activeBoard = db.boards[db.activeIndex] || db.boards[0];

    if (!activeBoard) {
        app.innerHTML = `<div class="text-center py-5 mt-5"><h4>欢迎！</h4><button class="btn btn-theme-primary px-4" onclick="createNewBoard()">创建首个面板</button></div>`;
        return;
    }

    // 更新标题
    const displayTitle = activeBoard.title + " 导航";
    document.getElementById('navBrandText').innerText = displayTitle;
    document.getElementById('pageTitle').innerText = displayTitle;
    document.getElementById('siteTitleInput').value = activeBoard.title;
    document.getElementById('boardSwitcher').innerHTML = db.boards.map((b, i) => `<option value="${i}" ${i==db.activeIndex?'selected':''}>${b.title}</option>`).join('');

    app.innerHTML = '';
    const select = document.getElementById('targetCat');
    select.innerHTML = '';

    activeBoard.categories.forEach((cat, cIdx) => {
        select.innerHTML += `<option value="${cIdx}">${cat.name}</option>`;
        let section = document.createElement('div');
        section.className = 'mb-5';
        section.innerHTML = `
            <div class="category-title mb-4">
                <span>${cat.name}</span>
                <button class="btn btn-link btn-sm text-muted opacity-50" onclick="deleteCat(${cIdx})"><i data-lucide="trash-2" class="icon-sm"></i></button>
            </div>
            <div class="row row-cols-2 row-cols-md-4 row-cols-lg-6 g-3" id="cat-${cIdx}"></div>`;
        app.appendChild(section);
        
        const grid = document.getElementById(`cat-${cIdx}`);
        cat.sites.forEach((site, sIdx) => {
            let domain = 'invalid';
            try {
                // 容错处理：即使存入了坏网址，渲染也不会崩溃
                domain = new URL(site.url).hostname;
            } catch(e) {}
            
            grid.innerHTML += `
                <div class="col"><div class="card nav-card shadow-sm p-3 text-center h-100 position-relative">
                    <button class="btn btn-link delete-item-btn p-0" onclick="event.preventDefault(); deleteSite(${cIdx}, ${sIdx})"><i data-lucide="x-circle" class="icon-sm"></i></button>
                    <a href="${site.url}" target="_blank" class="text-decoration-none text-dark stretched-link">
                        <img src="https://www.google.com/s2/favicons?sz=128&domain=${domain}" class="mb-2 bg-light p-1" onerror="this.src='https://lucide.dev/favicon.ico'">
                        <div class="small fw-bold text-truncate">${site.name}</div>
                    </a>
                </div></div>`;
        });
    });
    lucide.createIcons();
}

// 核心逻辑：添加网址（解决 www.google.com 报错问题）
function addItem() {
    const cIdx = document.getElementById('targetCat').value;
    const name = document.getElementById('siteName').value;
    let url = document.getElementById('siteUrl').value.trim();

    // 自动补全协议头，防止 new URL() 崩溃
    if (url && !/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    if(cIdx !== "" && name && url) {
        db.boards[db.activeIndex].categories[cIdx].sites.push({ name, url });
        closeModal('siteModal');
        // 重置表单
        document.getElementById('siteName').value = '';
        document.getElementById('siteUrl').value = '';
        render();
        pushToGist();
    } else {
        alert("请填写完整信息");
    }
}

// 其他工具函数
function showSetupRequired() {
    document.getElementById('app').innerHTML = `<div class="text-center py-5 bg-white rounded-4 shadow border mt-5"><h3>尚未配置</h3><p class="text-muted mb-4">连接 GitHub Gist 以管理您的数据。</p><button class="btn btn-primary px-4" onclick="handleOpenSettings()">去配置</button></div>`;
    lucide.createIcons();
}

async function saveSettings() {
    const t = document.getElementById('ghToken').value.trim();
    const g = document.getElementById('gistId').value.trim();
    if (!t || !g) return alert("请填写完整配置");
    localStorage.setItem('gh_token', t);
    localStorage.setItem('gh_gist_id', g);
    location.reload();
}

async function pushToGist() {
    if (!CONFIG.token || !CONFIG.gistId) return;
    try {
        await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${CONFIG.token}` },
            body: JSON.stringify({ files: { 'ainav.json': { content: JSON.stringify(db, null, 2) } } })
        });
        updateStatus(true);
    } catch (e) { updateStatus(false); }
}

function applyTheme(themeId, shouldPush = true) {
    db.theme = themeId;
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-accent', theme.accent);
    document.body.style.backgroundColor = theme.bg;
    if (shouldPush) pushToGist();
}

function renderThemes() {
    const list = document.getElementById('themeList');
    list.innerHTML = THEMES.map(t => `<div class="col-6"><div class="border rounded p-2 d-flex align-items-center theme-option" onclick="applyTheme('${t.id}')" style="cursor:pointer"><div class="rounded-circle me-2" style="width:20px; height:20px; background:${t.primary}"></div><span class="small">${t.name}</span></div></div>`).join('');
}

function updateStatus(on) { 
    const dot = document.getElementById('syncStatus');
    if (dot) dot.className = `status-dot ${on ? 'status-online' : 'bg-danger'}`; 
}
function openModal(id) { if(bootstrapModals[id]) bootstrapModals[id].show(); }
function closeModal(id) { if(bootstrapModals[id]) bootstrapModals[id].hide(); }
function switchBoard(idx) { db.activeIndex = parseInt(idx); render(); pushToGist(); }
function createNewBoard() {
    const name = prompt("输入新面板名称：");
    if(name){ db.boards.push({title:name, categories:[]}); db.activeIndex=db.boards.length-1; render(); pushToGist(); }
}
function renameBoard() {
    const name = document.getElementById('siteTitleInput').value.trim();
    if(name && db.boards[db.activeIndex]){ db.boards[db.activeIndex].title = name; render(); pushToGist(); }
}
function deleteCurrentBoard() {
    if(confirm("确定删除？")){ db.boards.splice(db.activeIndex,1); db.activeIndex=0; render(); pushToGist(); }
}
function addCategory() {
    const n = document.getElementById('catName').value;
    if(n){ db.boards[db.activeIndex].categories.push({name:n, sites:[]}); render(); pushToGist(); closeModal('catModal'); }
}
function deleteSite(c, s) { if(confirm('确认删除网址？')){ db.boards[db.activeIndex].categories[c].sites.splice(s,1); render(); pushToGist(); } }
function deleteCat(i) { if(confirm('确认删除分类？')){ db.boards[db.activeIndex].categories.splice(i,1); render(); pushToGist(); } }

init();