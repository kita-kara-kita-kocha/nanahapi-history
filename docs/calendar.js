// グローバル変数
let allVideos = [];
let filteredVideos = [];
let talentInfo = [];
let talentNameMap = {};
let currentDate = new Date();
let selectedTalents = new Set();
let archiveFiles = []; // アーカイブファイルのリスト

// DOM要素
const calendarElement = document.getElementById('calendar');
const loadingElement = document.getElementById('loading');
const talentButtonsElement = document.getElementById('talentButtons');
const clearAllBtnElement = document.getElementById('clearAllBtn');
const selectedCountElement = document.getElementById('selectedCount');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthButton = document.getElementById('prevMonth');
const nextMonthButton = document.getElementById('nextMonth');
const videoDetailsElement = document.getElementById('videoDetails');
const detailsDateElement = document.getElementById('detailsDate');
const detailsVideosElement = document.getElementById('detailsVideos');
const closeDetailsButton = document.getElementById('closeDetails');

// 初期化
async function init() {
    showLoading(true);
    
    // 選択状態を確実にクリア
    selectedTalents.clear();
    
    await loadTalentInfo();
    await getArchiveFilePaths();
    await loadAllVideos();
    setupEventListeners();
    
    showLoading(false);
    renderCalendar();
    updateSelectedCount();
}

// タレント情報を読み込み
async function loadTalentInfo() {
    try {
        const response = await fetch(`src/talent_info.json?v=${Date.now()}`);
        talentInfo = await response.json();
        
        // タレント名のマッピングを作成
        talentNameMap = {};
        talentColors = {};
        talentYtList = [];
        talentInfo.forEach(talent => {
            talentNameMap[talent.yt] = talent.name;
            talentColors[talent.yt] = talent.color;
            talentYtList.push(talent.yt);
        });

        createTalentButtons();
    } catch (error) {
        console.error('タレント情報の読み込みに失敗しました:', error);
    }
}

async function getArchiveFilePaths() {
    talentYtList.forEach(yt => {
        const fileName = `archives_${yt}.json`;
        if (!archiveFiles.includes(fileName)) {
            archiveFiles.push(fileName);
        }
    });
}

// 全動画データを読み込み
async function loadAllVideos() {
    allVideos = [];
    
    for (const file of archiveFiles) {
        try {
            const response = await fetch(`src/${file}?v=${Date.now()}`);
            const data = await response.json();
            
            if (data.items && Array.isArray(data.items)) {
                const talentName = file.replace('archives_', '').replace('.json', '');
                const talentDisplayName = talentNameMap[talentName] || talentName;
                
                const videosWithTalent = data.items.map(video => ({
                    ...video,
                    talent: talentName,
                    talentDisplayName: talentDisplayName,
                    upload_date_obj: new Date(video.upload_date)
                }));
                
                allVideos.push(...videosWithTalent);
            }
        } catch (error) {
            console.error(`${file} の読み込みに失敗しました:`, error);
        }
    }
    
    // 日付でソート
    allVideos.sort((a, b) => b.upload_date_obj - a.upload_date_obj);
    applyFilters();
}

// フィルターを適用
function applyFilters() {
    if (selectedTalents.size === 0) {
        filteredVideos = [...allVideos];
    } else {
        filteredVideos = allVideos.filter(video => selectedTalents.has(video.talent));
    }
}

// タレントボタンを作成
function createTalentButtons() {
    talentButtonsElement.innerHTML = '';
    
    talentInfo.forEach(talent => {
        const button = document.createElement('button');
        button.className = 'talent-btn';
        button.textContent = talent.name;
        button.style.borderColor = talentColors[talent.yt] || '#ccc';
        button.addEventListener('click', () => toggleTalent(talent.yt, button));
        talentButtonsElement.appendChild(button);
    });
}

// タレント選択の切り替え
function toggleTalent(talentId, button) {
    const talentColor = talentColors[talentId] || '#ccc';
    
    if (selectedTalents.has(talentId)) {
        selectedTalents.delete(talentId);
        button.classList.remove('active');
        // 選択解除時は元の境界線色に戻す
        button.style.background = '';
        button.style.borderColor = talentColor;
        button.style.color = '';
    } else {
        selectedTalents.add(talentId);
        button.classList.add('active');
        // 選択時はグラデーション背景を設定
        let gradientColorB = (parseInt(talentColor.slice(1), 16) - 0x1222222);
        if (gradientColorB < 0) {
            gradientColorB = 0;
        }
        button.style.background = `linear-gradient(45deg, ${talentColor}, #${gradientColorB.toString(16).padStart(6, '0')})`;
        button.style.borderColor = talentColor;
        button.style.color = 'white';
    }
    
    applyFilters();
    renderCalendar();
    updateSelectedCount();
}

// イベントリスナーを設定
function setupEventListeners() {
    clearAllBtnElement.addEventListener('click', () => {
        selectedTalents.clear();
        document.querySelectorAll('.talent-btn').forEach(btn => {
            btn.classList.remove('active');
            // 背景スタイルもリセット
            btn.style.background = '';
            btn.style.color = '';
            // 境界線色は元の色に戻す
            const talentName = btn.textContent;
            const talent = talentInfo.find(t => t.name === talentName);
            if (talent) {
                btn.style.borderColor = talentColors[talent.yt] || '#ccc';
            }
        });
        applyFilters();
        renderCalendar();
        updateSelectedCount();
    });
    
    prevMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    closeDetailsButton.addEventListener('click', () => {
        videoDetailsElement.style.display = 'none';
    });
    
    // モーダル外クリックで閉じる
    videoDetailsElement.addEventListener('click', (e) => {
        if (e.target === videoDetailsElement) {
            videoDetailsElement.style.display = 'none';
        }
    });
}

// カレンダーをレンダリング
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 月名を表示
    currentMonthElement.textContent = `${year}年 ${month + 1}月`;
    
    // カレンダーグリッドをクリア
    calendarElement.innerHTML = '';
    
    // 曜日ヘッダーを追加
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    weekdays.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.textContent = day;
        calendarElement.appendChild(header);
    });
    
    // 月の最初の日と最後の日を取得
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 最初の週の空のセルを追加
    const startDayOfWeek = firstDay.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
        const prevDate = new Date(year, month, 1 - startDayOfWeek + i);
        const dayElement = createDayElement(prevDate, true);
        calendarElement.appendChild(dayElement);
    }
    
    // 月の日付を追加
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dayElement = createDayElement(date, false);
        calendarElement.appendChild(dayElement);
    }
    
    // 最後の週の空のセルを追加
    const totalCells = calendarElement.children.length - 7; // ヘッダーを除く
    const remainingCells = 42 - totalCells; // 6週間 × 7日
    for (let i = 1; i <= remainingCells; i++) {
        const nextDate = new Date(year, month + 1, i);
        const dayElement = createDayElement(nextDate, true);
        calendarElement.appendChild(dayElement);
    }
}

// 日要素を作成
function createDayElement(date, isOtherMonth) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }
    
    // 日付番号
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();
    dayElement.appendChild(dayNumber);
    
    // その日の動画を取得
    const dayVideos = getVideosForDate(date);
    
    if (dayVideos.length > 0) {
        dayElement.classList.add('has-videos');
        
        // 動画数バッジ
        const videoCount = document.createElement('div');
        videoCount.className = 'video-count';
        videoCount.textContent = dayVideos.length;
        dayElement.appendChild(videoCount);
        
        // タレント別の色インジケーター
        const indicators = document.createElement('div');
        indicators.className = 'video-indicators';
        
        const talentSet = new Set();
        dayVideos.forEach(video => {
            if (!talentSet.has(video.talent)) {
                talentSet.add(video.talent);
                const indicator = document.createElement('div');
                indicator.className = 'video-indicator';
                indicator.style.backgroundColor = talentColors[video.talent] || '#ccc';
                indicator.title = video.talentDisplayName;
                indicators.appendChild(indicator);
            }
        });
        
        dayElement.appendChild(indicators);
        
        // クリックイベント
        dayElement.addEventListener('click', () => {
            showDayDetails(date, dayVideos);
        });
    }
    
    return dayElement;
}

// 指定日の動画を取得
function getVideosForDate(date) {
    const dateStr = formatDateForComparison(date);
    return filteredVideos.filter(video => {
        const videoDateStr = formatDateForComparison(video.upload_date_obj);
        return videoDateStr === dateStr;
    });
}

// 日付を比較用にフォーマット
function formatDateForComparison(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 日の詳細を表示
function showDayDetails(date, videos) {
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    detailsDateElement.textContent = dateStr;
    
    detailsVideosElement.innerHTML = '';
    
    // 動画を時系列順（投稿時刻順）にソート
    const sortedVideos = [...videos].sort((a, b) => a.upload_date_obj - b.upload_date_obj);
    
    sortedVideos.forEach(video => {
        const videoItem = createVideoDetailItem(video);
        detailsVideosElement.appendChild(videoItem);
    });
    
    videoDetailsElement.style.display = 'block';
}

// 動画詳細アイテムを作成
function createVideoDetailItem(video) {
    const item = document.createElement('div');
    item.className = 'video-detail-item';
    
    const thumbnail = document.createElement('img');
    thumbnail.className = 'video-thumbnail';
    thumbnail.src = video.image;
    thumbnail.alt = video.alt;
    
    const info = document.createElement('div');
    info.className = 'video-info';
    
    const title = document.createElement('div');
    title.className = 'video-title';
    const titleLink = document.createElement('a');
    titleLink.href = video.video_url;
    titleLink.target = '_blank';
    titleLink.textContent = video.title;
    title.appendChild(titleLink);
    
    const meta = document.createElement('div');
    meta.className = 'video-meta';
    
    const talentName = document.createElement('span');
    talentName.className = 'talent-name';
    talentName.textContent = video.talentDisplayName;
    
    const uploadTime = document.createElement('span');
    uploadTime.textContent = formatTime(video.upload_date_obj);
    
    meta.appendChild(talentName);
    meta.appendChild(uploadTime);
    
    info.appendChild(title);
    info.appendChild(meta);
    
    // タグがある場合は表示
    if (video.tags && video.tags.length > 0) {
        const tags = document.createElement('div');
        tags.className = 'video-tags';
        
        video.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'video-tag';
            tagElement.textContent = `${tag}`;
            tags.appendChild(tagElement);
        });
        
        info.appendChild(tags);
    }
    
    item.appendChild(thumbnail);
    item.appendChild(info);
    
    return item;
}

// 時刻をフォーマット
function formatTime(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 選択中のタレント数を更新
function updateSelectedCount() {
    selectedCountElement.textContent = `選択中: ${selectedTalents.size}人`;
}

// ローディング表示の切り替え
function showLoading(show) {
    loadingElement.style.display = show ? 'flex' : 'none';
}

// 初期化実行
document.addEventListener('DOMContentLoaded', init);
