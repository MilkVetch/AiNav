let db = { activeIndex: 0, boards: [] };
let bootstrapModals = {};

const CONFIG = {
    token: localStorage.getItem('gh_token'),
    gistId: localStorage.getItem('gh_gist_id')
};

async function init() {
    ['settingsModal', 'siteModal', 'catModal'].forEach(id => {
        bootstrapModals[id] = new bootstrap.Modal(document.getElementById(id));
    });

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
        if (!res.ok) throw new Error('Network error');
        const gist = await res.json();
        const file = gist.files['ainav.json'];
        
        if (file && file.content) {
            const content = JSON.parse(file.content);
            // 兼容性转换逻辑
            if (content.categories) {
                db = { activeIndex: 0, boards: [content] };
            } else {
                db = content;
            }
        }
        
        updateStatus(true);
        render();
    } catch (err) {
        console.error(err);
        updateStatus(false);
        showSetupRequired();
        alert('同步失败，请检查 Token 和 ID。');
    }
}

async function pushToGist() {
    if (!CONFIG.token || !CONFIG.gistId) return;
    updateStatus(false);
    try {
        await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${CONFIG.token}` },
            body: JSON.stringify({
                files: { 'ainav.json': { content: JSON.stringify(db, null, 2) } }
            })
        });
        updateStatus(true);
    } catch (err) { alert('云端同步失败'); }
}

function render() {
    const app = document.getElementById('app');
    const select = document.getElementById('targetCat');
    const switcher = document.getElementById('boardSwitcher');
    const brand = document.getElementById('navBrandText');
    const pageTitle = document.getElementById('pageTitle');
    const boardManage = document.getElementById('boardManageSection');

    // 处理无面板情况
    if (!db.boards || db.boards.length === 0) {
        brand.innerText = "网址导航";
        pageTitle.innerText = "网址导航";
        switcher.classList.add('d-none');
        boardManage.classList.remove('d-none'); // 即使没面板也要能进设置新增
        app.innerHTML = `
            <div class="text-center py-5 bg-white rounded-4 shadow-sm border">
                <i data-lucide="layout-grid" class="text-primary mb-3" style="width:48px; height:48px;"></i>
                <h4>尚未创建面板</h4>
                <p class="text-muted mb-4">连接成功！现在请先创建一个面板开始使用。</p>
                <button class="btn btn-success px-4" onclick="createNewBoard()">+ 创建第一个面板</button>
            </div>`;
        lucide.createIcons();
        return;
    }

    // 有面板的情况
    switcher.classList.remove('d-none');
    boardManage.classList.remove('d-none');
    document.getElementById('addSiteBtn').classList.remove('d-none');
    document.getElementById('addCatBtn').classList.remove('d-none');

    const activeBoard = db.boards[db.activeIndex] || db.boards[0];
    const displayTitle = activeBoard.title + " 导航";
    
    brand.innerText = displayTitle;
    pageTitle.innerText = displayTitle;
    document.getElementById('siteTitleInput').value = activeBoard.title;

    // 更新切换菜单
    switcher.innerHTML = db.boards.map((b, i) => `<option value="${i}" ${i==db.activeIndex?'selected':''}>${b.title}</option>`).join('');

    app.innerHTML = ''; select.innerHTML = '';
    if (activeBoard.categories.length === 0) {
        app.innerHTML = '<div class="text-center py-5 text-muted">此面板下暂无内容，点击“分类”开始。</div>';
    }

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

// 功能逻辑
function createNewBoard() {
    const name = prompt("请输入新面板名称（如：游戏、音乐）：");
    if (name) {
        db.boards.push({ title: name, categories: [] });
        db.activeIndex = db.boards.length - 1;
        render(); pushToGist(); closeModal('settingsModal');
    }
}

function switchBoard(idx) {
    db.activeIndex = parseInt(idx);
    render(); pushToGist();
}

function renameBoard() {
    const name = document.getElementById('siteTitleInput').value.trim();
    if (name && db.boards[db.activeIndex]) {
        db.boards[db.activeIndex].title = name;
        render(); pushToGist();
    }
}

function deleteCurrentBoard() {
    if (confirm("确定删除此面板吗？")) {
        db.boards.splice(db.activeIndex, 1);
        db.activeIndex = 0;
        render(); pushToGist();
    }
}

function resetConfig() {
    if (confirm("确定要清除本地配置并断开连接吗？")) {
        localStorage.clear();
        location.reload();
    }
}

async function saveSettings() {
    const t = document.getElementById('ghToken').value.trim();
    const g = document.getElementById('gistId').value.trim();
    if (!t || !g) return alert("请填写完整");
    localStorage.setItem('gh_token', t);
    localStorage.setItem('gh_gist_id', g);
    location.reload();
}

// 增删分类网址逻辑同前...
function addCategory() {
    const n = document.getElementById('catName').value;
    if(n) { db.boards[db.activeIndex].categories.push({name:n, sites:[]}); render(); pushToGist(); closeModal('catModal'); }
}
function addItem() {
    const cIdx = document.getElementById('targetCat').value;
    const n = document.getElementById('siteName').value;
    const u = document.getElementById('siteUrl').value;
    if(cIdx!=="" && n && u) { db.boards[db.activeIndex].categories[cIdx].sites.push({name:n, url:u}); render(); pushToGist(); closeModal('siteModal'); }
}
function deleteSite(c, s) { if(confirm('删除网址？')){ db.boards[db.activeIndex].categories[c].sites.splice(s,1); render(); pushToGist(); } }
function deleteCat(i) { if(confirm('删除分类？')){ db.boards[db.activeIndex].categories.splice(i,1); render(); pushToGist(); } }

function updateStatus(on) { document.getElementById('syncStatus').className = `ms-2 status-dot ${on?'status-online':'bg-danger'}`; }
function showSetupRequired() {
    document.getElementById('addSiteBtn').classList.add('d-none');
    document.getElementById('addCatBtn').classList.add('d-none');
    document.getElementById('app').innerHTML = `<div class="text-center py-5 bg-white rounded-4 shadow-sm border mt-5"><i data-lucide="settings-2" class="text-primary mb-3" style="width:48px; height:48px;"></i><h3>欢迎使用</h3><p class="text-muted mb-4">请点击右上角的“设置”来关联您的 GitHub Gist 数据文件。</p><button class="btn btn-primary px-4" onclick="openModal('settingsModal')">去配置</button></div>`;
}
function openModal(id) { bootstrapModals[id].show(); }
function closeModal(id) { bootstrapModals[id].hide(); }

init();