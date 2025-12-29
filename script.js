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

    // 填充当前已有的配置到输入框
    if (CONFIG.token) document.getElementById('ghToken').value = CONFIG.token;
    if (CONFIG.gistId) document.getElementById('gistId').value = CONFIG.gistId;

    renderThemes();

    if (!CONFIG.token || !CONFIG.gistId) {
        showSetupRequired();
    } else {
        await fetchData();
    }
    lucide.createIcons();
}

async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            headers: { 'Authorization': `token ${CONFIG.token}` }
        });
        
        if (!res.ok) {
            if (res.status === 404) throw new Error('Gist ID 错误');
            if (res.status === 401 || res.status === 403) throw new Error('Token 无效或权限不足');
            throw new Error('网络请求失败');
        }

        const gist = await res.json();
        const file = gist.files['ainav.json'];
        
        if (!file) throw new Error('Gist 中未找到 ainav.json 文件');

        const content = JSON.parse(file.content);
        db = content.categories ? { activeIndex: 0, boards: [content], theme: 'classic' } : content;
        
        applyTheme(db.theme || 'classic', false); // 初始化应用主题，不触发同步
        updateStatus(true);
        render();
    } catch (err) {
        console.error(err);
        updateStatus(false);
        alert(`同步失败：${err.message}`);
        showSetupRequired();
    }
}

function render() {
    // 显示之前隐藏的面板
    document.getElementById('boardSettingItem').classList.remove('d-none');
    document.getElementById('themeSettingItem').classList.remove('d-none');
    
    const app = document.getElementById('app');
    const switcher = document.getElementById('boardSwitcher');
    const activeBoard = db.boards[db.activeIndex] || db.boards[0];

    if (!activeBoard) {
        app.innerHTML = `<div class="text-center py-5 mt-5"><h4>成功连接！</h4><button class="btn btn-theme-primary" onclick="createNewBoard()">创建首个面板</button></div>`;
        return;
    }

    const displayTitle = activeBoard.title + " 导航";
    document.getElementById('navBrandText').innerText = displayTitle;
    document.getElementById('pageTitle').innerText = displayTitle;
    document.getElementById('siteTitleInput').value = activeBoard.title;

    switcher.innerHTML = db.boards.map((b, i) => `<option value="${i}" ${i==db.activeIndex?'selected':''}>${b.title}</option>`).join('');

    document.getElementById('addSiteBtn').classList.remove('d-none');
    document.getElementById('addCatBtn').classList.remove('d-none');

    // 渲染卡片逻辑（省略，同前）...
    app.innerHTML = '';
    activeBoard.categories.forEach((cat, cIdx) => {
        // ... 原渲染代码 ...
    });
    lucide.createIcons();
}

// 修正：applyTheme 增加一个标志位防止初始化时反复 PATCH
function applyTheme(themeId, shouldPush = true) {
    db.theme = themeId;
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-accent', theme.accent);
    document.body.style.backgroundColor = theme.bg;
    if (shouldPush) pushToGist();
}

async function saveSettings() {
    const t = document.getElementById('ghToken').value.trim();
    const g = document.getElementById('gistId').value.trim();
    if (!t || !g) return alert("请填写完整");
    localStorage.setItem('gh_token', t);
    localStorage.setItem('gh_gist_id', g);
    location.reload(); // 重新加载以触发 fetchData
}

function resetConfig() {
    if(confirm("确定断开连接？")){
        localStorage.clear();
        location.reload();
    }
}

// 其余逻辑（pushToGist, createNewBoard 等）保持不变...
init();