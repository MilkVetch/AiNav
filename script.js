const THEMES = [
    { id: 'classic', name: '极简蓝', class: 'theme-classic' },
    { id: 'emerald', name: '雅致翠', class: 'theme-emerald' },
    { id: 'rose', name: '温柔粉', class: 'theme-rose' },
    { id: 'sand', name: '舒适沙', class: 'theme-sand' }
];

let db = { activeIndex: 0, boards: [], theme: 'classic' };
let isConfigured = false;

const CONFIG = {
    token: localStorage.getItem('gh_token'),
    gistId: localStorage.getItem('gh_gist_id')
};

// 1. 初始化
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

// 时间更新
function updateClock() {
    const now = new Date();
    document.getElementById('digitalClock').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// 2. 数据处理与渲染
async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            headers: { 'Authorization': `token ${CONFIG.token}` }
        });
        if (!res.ok) throw new Error('Sync Error');
        const gist = await res.json();
        const content = JSON.parse(gist.files['ainav.json'].content);
        
        // 兼容性
        db = content.categories ? { activeIndex: 0, boards: [content], theme: 'classic' } : content;
        
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
    document.querySelectorAll('.hide').forEach(el => el.classList.remove('hide'));
    const app = document.getElementById('app');
    const board = db.boards[db.activeIndex] || db.boards[0];

    if (!board) {
        app.innerHTML = `<div class="hero-section"><h3>连接成功</h3><button class="save-btn" style="max-width:200px" onclick="createNewBoard()">创建第一个面板</button></div>`;
        return;
    }

    // 标题
    document.getElementById('navBrandText').innerText = board.title + " 导航";
    document.getElementById('boardSwitcher').innerHTML = db.boards.map((b, i) => `<option value="${i}" ${i==db.activeIndex?'selected':''}>${b.title}</option>`).join('');

    app.innerHTML = '';
    const catSelect = document.getElementById('targetCat');
    catSelect.innerHTML = '';

    board.categories.forEach((cat, cIdx) => {
        catSelect.innerHTML += `<option value="${cIdx}">${cat.name}</option>`;
        const section = document.createElement('section');
        section.innerHTML = `
            <div class="category-header">
                <span>${cat.name}</span>
                <button class="close-btn" style="font-size:1rem" onclick="deleteCat(${cIdx})"><i data-lucide="trash-2"></i></button>
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

// 3. 原生弹窗逻辑
function openCustomModal(id) {
    document.getElementById('modalOverlay').style.display = 'block';
    document.getElementById(id).classList.add('active');
}

function closeAllModals() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.querySelectorAll('.custom-modal').forEach(m => m.classList.remove('active'));
}

function handleOpenSettings() {
    openCustomModal('settingsModal');
    if (!isConfigured) toggleSection('collapseBackend', true);
}

function toggleSection(id, forceOpen = false) {
    const el = document.getElementById(id);
    const isOpen = el.style.display === 'block';
    // 简单排他折叠
    document.querySelectorAll('.collapsible-content').forEach(c => c.style.display = 'none');
    el.style.display = (isOpen && !forceOpen) ? 'none' : 'block';
}

// 4. 功能函数 (修复 URL 问题)
function addItem() {
    const cIdx = document.getElementById('targetCat').value;
    const name = document.getElementById('siteName').value;
    let url = document.getElementById('siteUrl').value.trim();

    // 自动补全
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;

    if (cIdx !== "" && name && url) {
        db.boards[db.activeIndex].categories[cIdx].sites.push({ name, url });
        closeAllModals();
        render();
        pushToGist();
    }
}

// 登出/重置
function confirmReset() {
    if (confirm("要断开云端连接吗？")) {
        localStorage.clear();
        location.reload();
    }
}

// 其他原逻辑 (pushToGist, deleteSite, switchBoard 等按前序逻辑移植即可)
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

function saveSettings() {
    localStorage.setItem('gh_token', document.getElementById('ghToken').value.trim());
    localStorage.setItem('gh_gist_id', document.getElementById('gistId').value.trim());
    location.reload();
}

function applyTheme(id, push = true) {
    document.body.className = THEMES.find(t => t.id === id).class;
    db.theme = id;
    if (push) pushToGist();
}

function renderThemes() {
    document.getElementById('themeList').innerHTML = THEMES.map(t => `<div class="glass-btn" onclick="applyTheme('${t.id}')">${t.name}</div>`).join('');
}

function showSetupRequired() {
    document.getElementById('app').innerHTML = `<div class="hero-section"><h3>Welcome</h3><p>请点击设置连接云端数据</p><button class="save-btn" style="max-width:200px" onclick="handleOpenSettings()">去配置</button></div>`;
}

function updateStatus(on) { document.getElementById('syncStatus').className = `status-dot ${on?'status-online':''}`; }

// 逻辑功能
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
function addCategory() {
    const n = document.getElementById('catName').value;
    if(n){ db.boards[db.activeIndex].categories.push({name:n, sites:[]}); render(); pushToGist(); closeAllModals(); }
}
function deleteSite(c, s) { if(confirm('删除？')){ db.boards[db.activeIndex].categories[c].sites.splice(s,1); render(); pushToGist(); } }
function deleteCat(i) { if(confirm('删除分类？')){ db.boards[db.activeIndex].categories.splice(i,1); render(); pushToGist(); } }

// 搜索功能
function handleSearch(e) {
    if (e.key === 'Enter') {
        const query = e.target.value;
        if (query.includes('.')) window.open(query.startsWith('http') ? query : 'https://' + query);
        else window.open('https://www.google.com/search?q=' + encodeURIComponent(query));
    }
}

init();