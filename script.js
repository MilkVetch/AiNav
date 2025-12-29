const THEMES = [
    { id: 'classic', name: '极简蓝', class: 'theme-classic' },
    { id: 'emerald', name: '雅致翠', class: 'theme-emerald' },
    { id: 'rose', name: '温柔粉', class: 'theme-rose' },
    { id: 'sand', name: '舒适沙', class: 'theme-sand' }
];

const CHINESE_GREETINGS = {
    "00:00": "午夜时分，正是灵感迸发的时刻。", "00:30": "夜深了，音乐是灵魂的港湾。",
    "05:00": "晨光初露，新的一天悄然开启。", "08:00": "专注当下，今天是值得奋斗的一天。",
    "12:00": "午间小憩，让精神重新充电。", "18:00": "暮色温柔，整理今日的果实。",
    "22:00": "夜已深，享受难得的静谧时光。"
    // ... 可以继续补充 48 个时段
};

let db = { activeIndex: 0, boards: [], theme: 'classic' };
let isConfigured = false;
const CONFIG = { token: localStorage.getItem('gh_token'), gistId: localStorage.getItem('gh_gist_id') };

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

// 2. 动态更新时钟、光晕和问候语
function updateClock() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    document.getElementById('digitalClock').innerText = timeStr;

    // 背景光晕随时间变化
    const hKey = h.toString().padStart(2, '0');
    let glow = "rgba(150, 100, 255, 0.2)"; // 默认深夜紫色
    if (h >= 5 && h < 12) glow = "rgba(255, 180, 100, 0.2)"; // 晨光橘
    else if (h >= 12 && h < 18) glow = "rgba(100, 200, 255, 0.2)"; // 午后蔚蓝
    document.documentElement.style.setProperty('--glow-color', glow);

    // 问候语半小时切换动画
    const greetingEl = document.getElementById('greetingText');
    const mKey = m < 30 ? "00" : "30";
    const currentKey = `${hKey}:${mKey}`;
    const target = CHINESE_GREETINGS[currentKey] || "Stay Focused.";

    if (greetingEl.innerText !== target) {
        greetingEl.style.opacity = "0";
        setTimeout(() => {
            greetingEl.innerText = target;
            greetingEl.style.opacity = "1";
        }, 600);
    }
}

// 3. 数据拉取
async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            headers: { 'Authorization': `token ${CONFIG.token}` }
        });
        if (!res.ok) throw new Error('Sync Error');
        const gist = await res.json();
        const content = JSON.parse(gist.files['ainav.json'].content);
        
        // 兼容性修正：如果获取的是旧版 categories 数组
        db = content.categories ? { activeIndex: 0, boards: [{title:"默认面板", categories:content.categories}], theme: 'classic' } : content;
        
        isConfigured = true;
        applyTheme(db.theme || 'classic', false);
        updateStatus(true);
        render();
    } catch (err) {
        isConfigured = false;
        showSetupRequired();
    }
}

// 4. 关键：修复 URL 解析崩溃
function render() {
    document.querySelectorAll('.hide').forEach(el => el.classList.remove('hide'));
    const app = document.getElementById('app');
    const activeBoard = db.boards[db.activeIndex] || db.boards[0];

    if (!activeBoard) {
        app.innerHTML = `<div class="hero-section"><h3>连接成功</h3><button class="save-btn" style="max-width:180px" onclick="createNewBoard()">创建首个面板</button></div>`;
        return;
    }

    document.getElementById('navBrandText').innerText = activeBoard.title + " 导航";
    app.innerHTML = '';
    const catSelect = document.getElementById('targetCat');
    catSelect.innerHTML = '';

    activeBoard.categories.forEach((cat, cIdx) => {
        catSelect.innerHTML += `<option value="${cIdx}">${cat.name}</option>`;
        const section = document.createElement('section');
        section.innerHTML = `
            <div class="category-header"><span>${cat.name}</span><button class="close-btn" style="font-size:1rem" onclick="deleteCat(${cIdx})"><i data-lucide="trash-2"></i></button></div>
            <div class="board-grid" id="cat-${cIdx}"></div>`;
        app.appendChild(section);

        const grid = document.getElementById(`cat-${cIdx}`);
        cat.sites.forEach((site, sIdx) => {
            let domain = 'invalid';
            try {
                // 修复点：增加 try-catch 解决 Invalid URL 报错
                domain = new URL(site.url).hostname;
            } catch(e) {
                console.warn("发现无效网址:", site.url);
            }
            
            grid.innerHTML += `
                <a href="${site.url}" target="_blank" class="link-card">
                    <button class="del-site-btn" onclick="event.preventDefault(); deleteSite(${cIdx}, ${sIdx})">&times;</button>
                    <img src="https://www.google.com/s2/favicons?sz=128&domain=${domain}" onerror="this.src='https://lucide.dev/favicon.ico'">
                    <span>${site.name}</span>
                </a>`;
        });
    });
    lucide.createIcons();
}

// 5. 交互逻辑：自动补全网址
function addItem() {
    const cIdx = document.getElementById('targetCat').value;
    const name = document.getElementById('siteName').value;
    let url = document.getElementById('siteUrl').value.trim();

    // 修复点：自动补全协议防止 URL 构造失败
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;

    if (cIdx !== "" && name && url) {
        db.boards[db.activeIndex].categories[cIdx].sites.push({ name, url });
        closeAllModals();
        render();
        pushToGist();
    }
}

// 其它基础函数 (pushToGist, saveSettings, openCustomModal 等保持原生实现...)
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
function toggleSection(id, force = false) {
    const el = document.getElementById(id);
    const open = el.style.display === 'block';
    document.querySelectorAll('.collapsible-content').forEach(c => c.style.display = 'none');
    el.style.display = (open && !force) ? 'none' : 'block';
}
function saveSettings() {
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
function applyTheme(id, push = true) {
    document.body.className = THEMES.find(t => t.id === id).class;
    db.theme = id;
    if (push) pushToGist();
}
function renderThemes() {
    document.getElementById('themeList').innerHTML = THEMES.map(t => `<div class="glass-btn" onclick="applyTheme('${t.id}')">${t.name}</div>`).join('');
}
function updateStatus(on) { 
    const dot = document.getElementById('syncStatus');
    if (dot) dot.className = `status-dot ${on ? 'status-online' : ''}`; 
}
function showSetupRequired() {
    document.getElementById('app').innerHTML = `<div class="hero-section"><h3>Welcome</h3><p>请点击设置配置 Gist 开启同步</p><button class="save-btn" style="max-width:180px" onclick="handleOpenSettings()">去配置</button></div>`;
}
function confirmReset() {
    if (confirm("断开连接并清除本地数据？")) { localStorage.clear(); location.reload(); }
}
function createNewBoard() {
    const name = prompt("面板名称：");
    if(name){ db.boards.push({title:name, categories:[]}); db.activeIndex=db.boards.length-1; render(); pushToGist(); }
}
function addCategory() {
    const n = document.getElementById('catName').value;
    if(n){ db.boards[db.activeIndex].categories.push({name:n, sites:[]}); render(); pushToGist(); closeAllModals(); }
}
function deleteSite(c, s) { if(confirm('删除？')){ db.boards[db.activeIndex].categories[c].sites.splice(s,1); render(); pushToGist(); } }
function deleteCat(i) { if(confirm('删除分类？')){ db.boards[db.activeIndex].categories.splice(i,1); render(); pushToGist(); } }
function handleSearch(e) {
    if (e.key === 'Enter') {
        const q = e.target.value;
        if (q.includes('.')) window.open(q.startsWith('http') ? q : 'https://' + q);
        else window.open('https://www.google.com/search?q=' + encodeURIComponent(q));
    }
}

init();