let db = { title: "AI 网址导航", categories: [] };
let bootstrapModals = {};

const CONFIG = {
    token: localStorage.getItem('gh_token'),
    gistId: localStorage.getItem('gh_gist_id')
};

// 1. 初始化
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

// 2. 获取云端数据
async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            headers: { 'Authorization': `token ${CONFIG.token}` }
        });
        if (!res.ok) throw new Error('Network error');
        const gist = await res.json();
        const content = gist.files['ainav.json'].content;
        db = JSON.parse(content);
        
        updateStatus(true);
        render();
    } catch (err) {
        console.error(err);
        updateStatus(false);
        render(); 
        alert('同步失败：请检查 Token 权限和 Gist ID 是否正确，且 Gist 中包含 ainav.json。');
    }
}

// 3. 推送到云端
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
    } catch (err) {
        alert('同步至云端失败，请检查网络连接。');
    }
}

// 4. 渲染界面
function render() {
    const app = document.getElementById('app');
    const select = document.getElementById('targetCat');
    const brand = document.getElementById('navBrandText');
    const pageTitle = document.getElementById('pageTitle');

    // 显示操作按钮
    document.getElementById('addSiteBtn').classList.remove('d-none');
    document.getElementById('addCatBtn').classList.remove('d-none');
    document.getElementById('addCatBtn').classList.add('d-sm-block');

    const currentTitle = db.title || "AI 网址导航";
    brand.innerText = currentTitle;
    pageTitle.innerText = currentTitle;
    document.getElementById('siteTitleInput').value = currentTitle;

    app.innerHTML = ''; select.innerHTML = '';

    if (db.categories.length === 0) {
        app.innerHTML = '<div class="text-center py-5 text-muted">目前还没有内容，点击“分类”开始吧。</div>';
    }

    db.categories.forEach((cat, cIdx) => {
        select.innerHTML += `<option value="${cIdx}">${cat.name}</option>`;

        let section = document.createElement('div');
        section.className = 'mb-5';
        section.innerHTML = `
            <div class="category-title mb-4">
                <span>${cat.name}</span>
                <button class="btn btn-link btn-sm text-muted opacity-50" onclick="deleteCat(${cIdx})">
                    <i data-lucide="trash-2" class="icon-sm"></i>
                </button>
            </div>
            <div class="row row-cols-2 row-cols-md-4 row-cols-lg-6 g-3" id="cat-${cIdx}"></div>
        `;
        app.appendChild(section);

        const grid = document.getElementById(`cat-${cIdx}`);
        cat.sites.forEach((site, sIdx) => {
            const domain = new URL(site.url).hostname;
            grid.innerHTML += `
                <div class="col">
                    <div class="card nav-card shadow-sm p-3 text-center h-100 position-relative">
                        <button class="btn btn-link delete-item-btn p-0" onclick="event.preventDefault(); deleteSite(${cIdx}, ${sIdx})">
                            <i data-lucide="x-circle" class="icon-sm"></i>
                        </button>
                        <a href="${site.url}" target="_blank" class="text-decoration-none text-dark stretched-link">
                            <img src="https://www.google.com/s2/favicons?sz=128&domain=${domain}" 
                                 class="mb-2 bg-light p-1" onerror="this.src='https://lucide.dev/favicon.ico'">
                            <div class="small fw-bold text-truncate">${site.name}</div>
                        </a>
                    </div>
                </div>
            `;
        });
    });
    lucide.createIcons();
}

// 5. 交互逻辑
async function saveSettings() {
    const newToken = document.getElementById('ghToken').value.trim();
    const newGistId = document.getElementById('gistId').value.trim();
    const newTitle = document.getElementById('siteTitleInput').value.trim();

    // 关键校验：防止空配置
    if (!newToken || !newGistId) {
        alert('请填写 GitHub Token 和 Gist ID 以启用同步功能。');
        return;
    }

    localStorage.setItem('gh_token', newToken);
    localStorage.setItem('gh_gist_id', newGistId);
    
    // 更新内存中的标题
    db.title = newTitle || "AI 网址导航";
    
    // 保存并刷新
    await pushToGist();
    location.reload();
}

function addCategory() {
    const name = document.getElementById('catName').value;
    if(name) {
        db.categories.push({ name, sites: [] });
        closeModal('catModal');
        render();
        pushToGist();
    }
}

function addItem() {
    const cIdx = document.getElementById('targetCat').value;
    const name = document.getElementById('siteName').value;
    const url = document.getElementById('siteUrl').value;
    if(cIdx !== "" && name && url) {
        db.categories[cIdx].sites.push({ name, url });
        closeModal('siteModal');
        render();
        pushToGist();
    }
}

function deleteSite(cIdx, sIdx) {
    if(confirm('确认删除这个网址吗？')) {
        db.categories[cIdx].sites.splice(sIdx, 1);
        render();
        pushToGist();
    }
}

function deleteCat(idx) {
    if(confirm('删除分类将清空其下所有网址，确认吗？')) {
        db.categories.splice(idx, 1);
        render();
        pushToGist();
    }
}

function updateStatus(isOnline) {
    const dot = document.getElementById('syncStatus');
    dot.className = `ms-2 status-dot ${isOnline ? 'status-online' : 'bg-danger'}`;
}

function showSetupRequired() {
    // 未配置时隐藏操作按钮
    document.getElementById('addSiteBtn').classList.add('d-none');
    document.getElementById('addCatBtn').classList.add('d-none');

    const currentTitle = db.title || "AI 网址导航";
    document.getElementById('navBrandText').innerText = currentTitle;
    document.getElementById('pageTitle').innerText = currentTitle;

    document.getElementById('app').innerHTML = `
        <div class="text-center py-5 bg-white rounded-4 shadow-sm border mt-5">
            <i data-lucide="settings-2" class="text-primary mb-3" style="width:48px; height:48px;"></i>
            <h3>欢迎使用</h3>
            <p class="text-muted mb-4">请点击右上角的“设置”来关联您的 GitHub Gist 数据文件。</p>
            <button class="btn btn-primary px-4" onclick="openModal('settingsModal')">去配置</button>
        </div>
    `;
}

function openModal(id) { bootstrapModals[id].show(); }
function closeModal(id) { bootstrapModals[id].hide(); }

init();