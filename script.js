// 默认主题配置
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

async function init() {
    ['settingsModal', 'siteModal', 'catModal'].forEach(id => {
        bootstrapModals[id] = new bootstrap.Modal(document.getElementById(id));
    });

    renderThemes(); // 渲染配色选项

    if (!CONFIG.token || !CONFIG.gistId) {
        showSetupRequired();
        lucide.createIcons();
        return;
    }
    await fetchData();
}

async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            headers: { 'Authorization': `token ${CONFIG.token}` }
        });
        const gist = await res.json();
        const content = JSON.parse(gist.files['ainav.json'].content);
        
        // 升级旧数据
        if (content.categories) {
            db = { activeIndex: 0, boards: [content], theme: 'classic' };
        } else {
            db = content;
        }
        
        applyTheme(db.theme || 'classic');
        updateStatus(true);
        render();
    } catch (err) {
        updateStatus(false);
        showSetupRequired();
    }
}

function applyTheme(themeId) {
    db.theme = themeId;
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-accent', theme.accent);
    document.body.style.backgroundColor = theme.bg;
    pushToGist();
}

function renderThemes() {
    const list = document.getElementById('themeList');
    list.innerHTML = THEMES.map(t => `
        <div class="col-6">
            <div class="border rounded p-2 d-flex align-items-center cursor-pointer theme-option" onclick="applyTheme('${t.id}')">
                <div class="rounded-circle me-2" style="width:20px; height:20px; background:${t.primary}"></div>
                <span class="small">${t.name}</span>
            </div>
        </div>
    `).join('');
}

function render() {
    const app = document.getElementById('app');
    const select = document.getElementById('targetCat');
    const switcher = document.getElementById('boardSwitcher');
    const brand = document.getElementById('navBrandText');
    const pageTitle = document.getElementById('pageTitle');

    if (!db.boards || db.boards.length === 0) {
        brand.innerText = "网址导航";
        app.innerHTML = `<div class="text-center py-5 bg-white rounded-4 shadow border mt-5"><h4>欢迎！</h4><p>请在设置中创建您的第一个面板。</p><button class="btn btn-theme-primary px-4" onclick="createNewBoard()">立即创建</button></div>`;
        lucide.createIcons(); return;
    }

    const activeBoard = db.boards[db.activeIndex] || db.boards[0];
    const displayTitle = activeBoard.title + " 导航";
    brand.innerText = displayTitle;
    pageTitle.innerText = displayTitle;
    document.getElementById('siteTitleInput').value = activeBoard.title;

    // 面板切换下拉框
    switcher.innerHTML = db.boards.map((b, i) => `<option value="${i}" ${i==db.activeIndex?'selected':''}>${b.title}</option>`).join('');

    document.getElementById('addSiteBtn').classList.remove('d-none');
    document.getElementById('addCatBtn').classList.remove('d-none');

    app.innerHTML = ''; select.innerHTML = '';
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

// 辅助逻辑
function switchBoard(idx) { db.activeIndex = parseInt(idx); render(); pushToGist(); }
function createNewBoard() {
    const name = prompt("面板名称：");
    if(name){ db.boards.push({title:name, categories:[]}); db.activeIndex=db.boards.length-1; render(); pushToGist(); }
}
function renameBoard() {
    const name = document.getElementById('siteTitleInput').value.trim();
    if(name){ db.boards[db.activeIndex].title = name; render(); pushToGist(); }
}
function deleteCurrentBoard() {
    if(confirm("确定删除？")){ db.boards.splice(db.activeIndex,1); db.activeIndex=0; render(); pushToGist(); }
}
function resetConfig() { if(confirm("确定清空本地配置？")){ localStorage.clear(); location.reload(); } }
async function saveSettings() {
    localStorage.setItem('gh_token', document.getElementById('ghToken').value.trim());
    localStorage.setItem('gh_gist_id', document.getElementById('gistId').value.trim());
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
function deleteSite(c, s) { if(confirm('删除？')){ db.boards[db.activeIndex].categories[c].sites.splice(s,1); render(); pushToGist(); } }
function deleteCat(i) { if(confirm('删除分类？')){ db.boards[db.activeIndex].categories.splice(i,1); render(); pushToGist(); } }
function updateStatus(on) { document.getElementById('syncStatus').className = `ms-2 status-dot ${on?'status-online':'bg-danger'}`; }
function showSetupRequired() {
    document.getElementById('app').innerHTML = `<div class="text-center py-5 mt-5"><button class="btn btn-theme-primary" onclick="openModal('settingsModal')">去配置 Gist</button></div>`;
}
function openModal(id) { bootstrapModals[id].show(); }
function closeModal(id) { bootstrapModals[id].hide(); }

init();