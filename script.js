const THEMES = [
    { id: 'classic', name: '极简蓝', primary: '#0d6efd', accent: '#0a58ca', bg: '#f8f9fa' },
    { id: 'emerald', name: '雅致翠', primary: '#198754', accent: '#146c43', bg: '#f0f7f4' },
    { id: 'rose', name: '温柔粉', primary: '#d63384', accent: '#b02a6a', bg: '#fff5f8' },
    { id: 'midnight', name: '深邃黑', primary: '#212529', accent: '#495057', bg: '#e9ecef' },
    { id: 'sand', name: '舒适沙', primary: '#854d0e', accent: '#713f12', bg: '#fefce8' }
];

let db = { activeIndex: 0, boards: [], theme: 'classic' };
let bootstrapModals = {};

const CONFIG = {
    token: localStorage.getItem('gh_token'),
    gistId: localStorage.getItem('gh_gist_id')
};

// 1. 初始化入口
async function init() {
    // A. 优先实例化弹窗，确保按钮可用
    ['settingsModal', 'siteModal', 'catModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) bootstrapModals[id] = new bootstrap.Modal(el);
    });

    // B. 回显配置
    if (CONFIG.token) document.getElementById('ghToken').value = CONFIG.token;
    if (CONFIG.gistId) document.getElementById('gistId').value = CONFIG.gistId;

    // C. 渲染主题列表
    renderThemes();

    // D. 尝试获取数据
    if (!CONFIG.token || !CONFIG.gistId) {
        showSetupRequired();
    } else {
        await fetchData();
    }
    lucide.createIcons();
}

// 2. 数据拉取
async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            headers: { 'Authorization': `token ${CONFIG.token}` }
        });
        
        if (!res.ok) throw new Error('网络请求异常，请检查 Token 权限或 ID。');
        
        const gist = await res.json();
        const file = gist.files['ainav.json'];
        
        if (!file) {
            // 如果文件不存在，初始化一个空数据库
            db = { activeIndex: 0, boards: [], theme: 'classic' };
            await pushToGist(); 
        } else {
            const content = JSON.parse(file.content);
            db = content.categories ? { activeIndex: 0, boards: [content], theme: 'classic' } : content;
        }
        
        applyTheme(db.theme || 'classic', false);
        updateStatus(true);
        render();
    } catch (err) {
        console.error(err);
        updateStatus(false);
        alert(`连接失败: ${err.message}`);
        showSetupRequired();
    }
}

// 3. 核心渲染
function render() {
    // A. 解除 UI 限制
    document.getElementById('boardSettingItem').classList.remove('d-none');
    document.getElementById('themeSettingItem').classList.remove('d-none');
    document.getElementById('logoutBtn').classList.remove('d-none');
    document.getElementById('addSiteBtn').classList.remove('d-none');
    document.getElementById('addCatBtn').classList.remove('d-none');

    const app = document.getElementById('app');
    const switcher = document.getElementById('boardSwitcher');

    // 处理空面板情况
    if (!db.boards || db.boards.length === 0) {
        app.innerHTML = `
            <div class="text-center py-5 bg-white rounded-4 shadow border">
                <i data-lucide="layout-grid" class="text-primary mb-3" style="width:48px; height:48px;"></i>
                <h4>连接成功！</h4>
                <p class="text-muted">当前尚未创建任何导航面板。</p>
                <button class="btn btn-theme-primary px-4" onclick="createNewBoard()">+ 创建第一个面板</button>
            </div>`;
        lucide.createIcons();
        return;
    }

    const activeBoard = db.boards[db.activeIndex] || db.boards[0];
    const displayTitle = activeBoard.title + " 导航";
    
    document.getElementById('navBrandText').innerText = displayTitle;
    document.getElementById('pageTitle').innerText = displayTitle;
    document.getElementById('siteTitleInput').value = activeBoard.title;

    switcher.innerHTML = db.boards.map((b, i) => `<option value="${i}" ${i==db.activeIndex?'selected':''}>${b.title}</option>`).join('');

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
            const domain = new URL(site.url).hostname;
            grid.innerHTML += `
                <div class="col">
                    <div class="card nav-card shadow-sm p-3 text-center h-100 position-relative">
                        <button class="btn btn-link delete-item-btn p-0" onclick="event.preventDefault(); deleteSite(${cIdx}, ${sIdx})"><i data-lucide="x-circle" class="icon-sm"></i></button>
                        <a href="${site.url}" target="_blank" class="text-decoration-none text-dark stretched-link">
                            <img src="https://www.google.com/s2/favicons?sz=128&domain=${domain}" class="mb-2 bg-light p-1" onerror="this.src='https://lucide.dev/favicon.ico'">
                            <div class="small fw-bold text-truncate">${site.name}</div>
                        </a>
                    </div>
                </div>`;
        });
    });
    lucide.createIcons();
}

// 4. 辅助功能
function showSetupRequired() {
    document.getElementById('app').innerHTML = `
        <div class="text-center py-5 bg-white rounded-4 shadow border mt-5">
            <i data-lucide="settings-2" class="text-primary mb-3" style="width:48px; height:48px;"></i>
            <h3>需要配置</h3>
            <p class="text-muted mb-4">连接 GitHub Gist 后即可管理您的网址导航。</p>
            <button class="btn btn-primary px-4" onclick="openModal('settingsModal')">去配置</button>
        </div>`;
    lucide.createIcons();
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
    list.innerHTML = THEMES.map(t => `
        <div class="col-6">
            <div class="border rounded p-2 d-flex align-items-center theme-option" onclick="applyTheme('${t.id}')" style="cursor:pointer">
                <div class="rounded-circle me-2" style="width:20px; height:20px; background:${t.primary}"></div>
                <span class="small">${t.name}</span>
            </div>
        </div>`).join('');
}

async function saveSettings() {
    const t = document.getElementById('ghToken').value.trim();
    const g = document.getElementById('gistId').value.trim();
    if (!t || !g) return alert("请填写完整配置");
    localStorage.setItem('gh_token', t);
    localStorage.setItem('gh_gist_id', g);
    location.reload();
}

function resetConfig() {
    if(confirm("确定退出当前账号并清除本地连接吗？")){
        localStorage.clear();
        location.reload();
    }
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

// 弹窗辅助
function openModal(id) { if(bootstrapModals[id]) bootstrapModals[id].show(); }
function closeModal(id) { if(bootstrapModals[id]) bootstrapModals[id].hide(); }

// 逻辑功能适配
function switchBoard(idx) { db.activeIndex = parseInt(idx); render(); pushToGist(); }
function createNewBoard() {
    const name = prompt("输入新面板名称：");
    if(name){ db.boards.push({title:name, categories:[]}); db.activeIndex=db.boards.length-1; render(); pushToGist(); }
}
function renameBoard() {
    const name = document.getElementById('siteTitleInput').value.trim();
    if(name){ db.boards[db.activeIndex].title = name; render(); pushToGist(); }
}
function deleteCurrentBoard() {
    if(confirm("确定彻底删除此面板？")){ db.boards.splice(db.activeIndex,1); db.activeIndex=0; render(); pushToGist(); }
}
function addCategory() {
    const n = document.getElementById('catName').value;
    if(n){ db.boards[db.activeIndex].categories.push({name:n, sites:[]}); render(); pushToGist(); closeModal('catModal'); }
}
function addItem() {
    const cIdx = document.getElementById('targetCat').value;
    const n = document.getElementById('siteName').value;
    const u = document.getElementById('siteUrl').value;
    if(cIdx!=="" && n && u){ db.boards[db.activeIndex].categories[cIdx].sites.push({name:n, url:u}); render(); pushToGist(); closeModal('siteModal'); }
}
function deleteSite(c, s) { if(confirm('确认删除网址？')){ db.boards[db.activeIndex].categories[c].sites.splice(s,1); render(); pushToGist(); } }
function deleteCat(i) { if(confirm('确认删除分类？')){ db.boards[db.activeIndex].categories.splice(i,1); render(); pushToGist(); } }
function updateStatus(on) { document.getElementById('syncStatus').className = `ms-2 status-dot ${on?'status-online':'bg-danger'}`; }

// 启动
init();