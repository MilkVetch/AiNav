const CHINESE_GREETINGS = {
    "00:00": "午夜时分，世界静谧，正是灵感迸发的时刻。", "00:30": "夜深了，音乐是灵魂最温柔的港湾。",
    "01:00": "星辰作伴，愿你的梦境充满动人的旋律。", "01:30": "万籁俱寂，享受这份独处的静谧吧。",
    "02:00": "深夜的坚持，终将汇聚成闪耀的光芒。", "02:30": "休息一会儿吧，好梦正在酝酿。",
    "03:00": "黎明前的沉静，是为了更响亮的鸣奏。", "03:30": "再微弱的光，也在努力照亮夜空。",
    "04:00": "清晨的先声，总是在宁静中开启。", "04:30": "天快亮了，辛苦了，早点休息。",
    "05:00": "晨光初露，新的一天悄然拉开序幕。", "05:30": "清晨的空气，透着奋斗的味道。",
    "06:00": "早安！让第一缕阳光唤醒你的活力。", "06:30": "闻鸡起舞，朝气蓬勃地迎接挑战吧。",
    "07:00": "热腾腾的早餐，开启元气满满的一天。", "07:30": "晨跑的时间，让律动跳跃在每一步。",
    "08:00": "专注当下，今天也是值得奋斗的一天。", "08:30": "清晨的律动，助你唤醒无限潜能。",
    "09:00": "金色的上午，为梦想全速冲刺。", "09:30": "灵感正在萌发，捕捉每一个奇思妙想。",
    "10:00": "高效办公，用旋律寻找你的心流状态。", "10:30": "一杯咖啡，让思维在乐章中碰撞。",
    "11:00": "保持节奏，终点就在不远的前方。", "11:30": "午饭时间近了，犒劳一下努力的自己。",
    "12:00": "午间小憩，让精神重新充充电。", "12:30": "美味午餐，享受这片刻的闲适心情。",
    "13:00": "闭目养神，让思绪在旋律中沉淀。", "13:30": "重启活力，午后的精彩才刚刚开始。",
    "14:00": "午后斜阳，保持优雅且从容的步伐。", "14:30": "灵感不打烊，在创作中寻找自我。",
    "15:00": "下午茶时光，给大脑一个甜蜜的拥抱。", "15:30": "阳光正好，在乐谱中寻找生活的色彩。",
    "16:00": "不忘初心，每一步努力都算数。", "16:30": "余晖渐起，记录这一刻的收获与感悟。",
    "17:00": "在音符中保持效率，迎接归途。", "17:30": "落日余晖，愿你的心情如霞光般灿烂。",
    "18:00": "暮色温柔，整理这一天沉甸甸的果实。", "18:30": "万家灯火，总有一盏是为你而亮。",
    "19:00": "晚风徐徐，沉浸在动人的节奏里。", "19:30": "放松身心，享受夜晚带来的静谧。",
    "20:00": "总结今日，为明天积蓄向上的力量。", "20:30": "阅读或创作，让灵魂在深夜里起舞。",
    "21:00": "舒缓的旋律，是忙碌一天的最佳注脚。", "21:30": "卸下疲惫，回归最纯粹的自我空间。",
    "22:00": "夜已深，享受这份难得的静谧时光。", "22:30": "放下手机，给眼睛和心灵放个假。",
    "23:00": "夜深沉，好梦正在星光下静静酝酿。", "23:30": "晚安，愿明早醒来，世界依旧温柔。"
};

const THEMES = [
    { id: 'classic', name: '极简蓝', class: 'theme-classic' },
    { id: 'emerald', name: '雅致翠', class: 'theme-emerald' },
    { id: 'rose', name: '温柔粉', class: 'theme-rose' },
    { id: 'sand', name: '舒适沙', class: 'theme-sand' }
];

let db = { activeIndex: 0, boards: [], theme: 'classic' };
let isConfigured = false;
const CONFIG = { token: localStorage.getItem('gh_token'), gistId: localStorage.getItem('gh_gist_id') };

// 1. 初始化入口
function init() {
    updateClock(); // 立即运行一次更新
    setInterval(updateClock, 1000); // 每一秒心跳
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
    const h = now.getHours();
    const m = now.getMinutes();
    
    // 数字时钟
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    document.getElementById('digitalClock').innerText = timeStr;

    // A. 背景光晕渐变逻辑 (基于小时)
    const glowEl = document.getElementById('bgGlow');
    let glowColor = "";
    if (h >= 5 && h < 12) glowColor = "rgba(255, 180, 100, 0.2)"; // 晨光橘
    else if (h >= 12 && h < 18) glowColor = "rgba(100, 200, 255, 0.2)"; // 蔚蓝
    else glowColor = "rgba(150, 100, 255, 0.2)"; // 夜紫
    
    document.documentElement.style.setProperty('--glow-color', glowColor);

    // B. 问候语半小时切换与动画
    const greetingEl = document.getElementById('greetingText');
    const mKey = m < 30 ? "00" : "30";
    const hKey = h.toString().padStart(2, '0');
    const currentKey = `${hKey}:${mKey}`;
    const targetGreeting = CHINESE_GREETINGS[currentKey];

    if (greetingEl.innerText !== targetGreeting) {
        greetingEl.style.opacity = "0";
        greetingEl.style.transform = "translateY(8px)";
        setTimeout(() => {
            greetingEl.innerText = targetGreeting;
            greetingEl.style.opacity = "1";
            greetingEl.style.transform = "translateY(0)";
        }, 600);
    }
}

// 3. 数据层逻辑
async function fetchData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${CONFIG.gistId}`, {
            headers: { 'Authorization': `token ${CONFIG.token}` }
        });
        if (!res.ok) throw new Error('Sync Error');
        const gist = await res.json();
        const content = JSON.parse(gist.files['ainav.json'].content);
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
    const activeBoard = db.boards[db.activeIndex] || db.boards[0];

    if (!activeBoard) {
        app.innerHTML = `<div class="hero-section"><h3>连接成功</h3><button class="save-btn" style="max-width:180px" onclick="createNewBoard()">创建首个面板</button></div>`;
        return;
    }

    document.getElementById('navBrandText').innerText = activeBoard.title + " 导航";
    document.getElementById('boardSwitcher').innerHTML = db.boards.map((b, i) => `<option value="${i}" ${i==db.activeIndex?'selected':''}>${b.title}</option>`).join('');

    app.innerHTML = '';
    const catSelect = document.getElementById('targetCat');
    catSelect.innerHTML = '';

    activeBoard.categories.forEach((cat, cIdx) => {
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

// 4. 功能逻辑
function addItem() {
    const cIdx = document.getElementById('targetCat').value;
    const name = document.getElementById('siteName').value;
    let url = document.getElementById('siteUrl').value.trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url; // 自动补全 URL 协议

    if (cIdx !== "" && name && url) {
        db.boards[db.activeIndex].categories[cIdx].sites.push({ name, url });
        closeAllModals();
        render();
        pushToGist();
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

function confirmReset() {
    if (confirm("要断开云端连接并清除本地数据吗？")) {
        localStorage.clear();
        location.reload();
    }
}

function openCustomModal(id) {
    document.getElementById('modalOverlay').style.display = 'block';
    document.getElementById(id).classList.add('active');
}

function closeAllModals() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.querySelectorAll('.custom-modal').forEach(m => m.classList.remove('active'));
}

function toggleSection(id, force = false) {
    const el = document.getElementById(id);
    const open = el.style.display === 'block';
    document.querySelectorAll('.collapsible-content').forEach(c => c.style.display = 'none');
    el.style.display = (open && !force) ? 'none' : 'block';
}

function handleOpenSettings() {
    openCustomModal('settingsModal');
    if (!isConfigured) toggleSection('collapseBackend', true);
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

function handleSearch(e) {
    if (e.key === 'Enter') {
        const q = e.target.value;
        if (q.includes('.')) window.open(q.startsWith('http') ? q : 'https://' + q);
        else window.open('https://www.google.com/search?q=' + encodeURIComponent(q));
    }
}

function showSetupRequired() {
    document.getElementById('app').innerHTML = `<div class="hero-section"><h3>Welcome</h3><p>请配置 Gist 以开启云端同步</p><button class="save-btn" style="max-width:180px" onclick="handleOpenSettings()">去配置</button></div>`;
}

function updateStatus(on) { 
    document.getElementById('syncStatus').className = `status-dot ${on ? 'status-online' : ''}`; 
}

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

// 启动程序
init();