// グローバル変数
let allVideos = [];
let filteredVideos = [];
let displayedVideos = [];
let currentPage = 0;
const videosPerPage = 20;
let talentInfo = [];
let talentNameMap = {};

// DOM要素
const timelineElement = document.getElementById('timeline');
const loadingElement = document.getElementById('loading');
const talentButtonsElement = document.getElementById('talentButtons');
const clearAllBtnElement = document.getElementById('clearAllBtn');
const selectedCountElement = document.getElementById('selectedCount');
const filterResultsElement = document.getElementById('filterResults');
const dateSortElement = document.getElementById('dateSort');
const loadMoreButton = document.getElementById('loadMore');

// 選択されたタレント
let selectedTalents = new Set();

// アーカイブファイルのリスト
const archiveFiles = [
    'archives_@amanosakatu.json',
    'archives_@JabiDevi.json',
    'archives_@kirihuda_ataru.json',
    'archives_@kokoroninonno.json',
    'archives_@koyuchan_.json',
    'archives_@mel_samui.json',
    'archives_@memoa_923.json',
    'archives_@mimic_teionvo.json',
    'archives_@nekono_chiyuru.json',
    'archives_@pieceofpudding3.json',
    'archives_@rinka__angel.json',
    'archives_@Toworu_.json'
];

// タレント名の表示用マッピング（削除される - talent_info.jsonから読み込み）

// 初期化
async function init() {
    showLoading(true);
    
    // 選択状態を確実にクリア
    selectedTalents.clear();
    
    await loadTalentInfo();
    await loadAllVideos();
    setupEventListeners();
    updateSelectedCount();
    applyFilters();
    showLoading(false);
}

// ローディング表示の切り替え
function showLoading(show) {
    loadingElement.style.display = show ? 'block' : 'none';
}

// 文字列を正規化する関数
function normalizeString(str) {
    if (!str) return '';
    return str.trim()
              .normalize('NFKC')  // Unicode正規化
              .replace(/＝/g, '=')  // 全角イコールを半角に
              .replace(/－/g, '-')  // 全角ハイフンを半角に
              .replace(/～/g, '~')  // 全角チルダを半角に
              .replace(/　/g, ' ')  // 全角スペースを半角に
              .replace(/・/g, '・'); // 中点は統一（念のため）
}

// タレント情報を読み込み
async function loadTalentInfo() {
    try {
        const response = await fetch('src/talent_info.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        talentInfo = await response.json();
        
        // YouTube IDからタレント名へのマッピングを作成（正規化を適用）
        talentInfo.forEach(talent => {
            const normalizedName = normalizeString(talent.name);
            talentNameMap[talent.yt] = normalizedName;
            talentColors[talent.yt] = talent.color;
        });
    } catch (error) {
        console.error('Error loading talent info:', error);
        // フォールバック: 既存のマッピングを使用（正規化を適用）
        const fallbackMapping = {
            '@amanosakatu': 'まどろみ姉さん',
            '@JabiDevi': '蛇火',
            '@kirihuda_ataru': '切札アタル',
            '@kokoroninonno': 'ココロニ・ノンノ',
            '@koyuchan_': '星降こゆ',
            '@mel_samui': '花鹿める',
            '@memoa_923': 'めもあ',
            '@mimic_teionvo': 'みみっく＝わんだぁぼっくす',
            '@nekono_chiyuru': '猫野ちゆる',
            '@pieceofpudding3': 'ルシア・アラモード',
            '@rinka__angel': 'リンカ=エンジェルズシェア',
            '@Toworu_': '楠木トヲル'
        };
        
        talentNameMap = {};
        Object.entries(fallbackMapping).forEach(([key, value]) => {
            talentNameMap[key] = normalizeString(value);
        });
    }
}

// 全ての動画データを読み込み
async function loadAllVideos() {
    const promises = archiveFiles.map(file => loadArchiveFile(file));
    const results = await Promise.all(promises);
    
    allVideos = [];
    const talentNames = new Set();
    
    results.forEach((data, index) => {
        if (data && data.items) {
            const talentId = archiveFiles[index].replace('archives_', '').replace('.json', '');
            const mappedName = talentNameMap[talentId] || talentId;
            const talentName = normalizeString(mappedName);
            talentNames.add(talentName);
            
            data.items.forEach(video => {
                allVideos.push({
                    ...video,
                    talentId: talentId,
                    talentName: talentName
                });
            });
        }
    });
    
    // タレント選択肢を追加
    populateTalentFilter(Array.from(talentNames));
}

// 個別のアーカイブファイルを読み込み
async function loadArchiveFile(fileName) {
    try {
        const response = await fetch(`src/${fileName}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${fileName}:`, error);
        return null;
    }
}

// タレントフィルターの選択肢を設定
function populateTalentFilter(talentNames) {
    // タレント名をソート
    const sortedTalentNames = talentNames.sort();
    
    // タレントボタンを生成
    talentButtonsElement.innerHTML = '';
    sortedTalentNames.forEach((talentName, index) => {
        const button = document.createElement('button');
        button.className = 'talent-btn';
        button.textContent = talentName;
        button.style.borderColor = talentColors[talent.yt] || '#ccc';
        button.dataset.talent = talentName;
        button.addEventListener('click', () => {
            toggleTalentSelection(talentName, button);
        });
        talentButtonsElement.appendChild(button);
    });
}

// 選択数の表示を更新
function updateSelectedCount() {
    const count = selectedTalents.size;
    if (count === 0) {
        selectedCountElement.textContent = '全て表示中';
    } else {
        selectedCountElement.textContent = `選択中: ${count}人`;
    }
}

// タレント選択の切り替え
function toggleTalentSelection(talentName, buttonElement) {
    // タレント名を正規化（ボタンのテキストも正規化済みのはずだが、念のため）
    const normalizedTalentName = normalizeString(talentName);
    
    if (selectedTalents.has(normalizedTalentName)) {
        selectedTalents.delete(normalizedTalentName);
        buttonElement.classList.remove('selected');
    } else {
        selectedTalents.add(normalizedTalentName);
        buttonElement.classList.add('selected');
    }
    
    updateSelectedCount();
    applyFilters();
}

// 全選択解除
function clearAllSelections() {
    selectedTalents.clear();
    const allButtons = talentButtonsElement.querySelectorAll('.talent-btn');
    allButtons.forEach(button => {
        button.classList.remove('selected');
    });
    
    updateSelectedCount();
    applyFilters();
}

// イベントリスナーの設定
function setupEventListeners() {
    clearAllBtnElement.addEventListener('click', clearAllSelections);
    dateSortElement.addEventListener('change', applyFilters);
    loadMoreButton.addEventListener('click', loadMoreVideos);
}

// フィルターを適用
function applyFilters() {
    const sortOrder = dateSortElement.value;
    
    if (selectedTalents.size === 0) {
        filteredVideos = [...allVideos];
    } else {
        filteredVideos = allVideos.filter(video => {
            const normalizedVideoTalentName = normalizeString(video.talentName);
            return selectedTalents.has(normalizedVideoTalentName);
        });
    }
    
    // フィルタリング結果の詳細を表示
    showFilterResults();
    
    // ソート
    filteredVideos.sort((a, b) => {
        const dateA = new Date(a.upload_date);
        const dateB = new Date(b.upload_date);
        
        // 無効な日付をチェック
        const isValidDateA = !isNaN(dateA.getTime());
        const isValidDateB = !isNaN(dateB.getTime());
        
        // 無効な日付の処理
        if (!isValidDateA && !isValidDateB) {
            return 0; // 同じとして扱う
        }
        if (!isValidDateA) {
            return sortOrder === 'desc' ? 1 : -1; // 無効な日付を後ろに
        }
        if (!isValidDateB) {
            return sortOrder === 'desc' ? -1 : 1; // 無効な日付を後ろに
        }
        
        if (sortOrder === 'desc') {
            return dateB.getTime() - dateA.getTime();
        } else {
            return dateA.getTime() - dateB.getTime();
        }
    });
    
    // 表示をリセット
    currentPage = 0;
    displayedVideos = [];
    timelineElement.innerHTML = '';
    loadMoreVideos();
}

// フィルタリング結果の詳細を表示
function showFilterResults() {
    if (selectedTalents.size === 0) {
        filterResultsElement.style.display = 'none';
        return;
    }
    
    // タレント別の動画数を集計
    const talentCounts = {};
    filteredVideos.forEach(video => {
        const talentName = normalizeString(video.talentName);
        talentCounts[talentName] = (talentCounts[talentName] || 0) + 1;
    });
    
    // 結果表示を構築
    const totalCount = filteredVideos.length;
    const selectedTalentList = Array.from(selectedTalents);
    
    let breakdownHtml = '';
    selectedTalentList.forEach(talent => {
        const count = talentCounts[talent] || 0;
        breakdownHtml += `<span class="talent-count">${talent}: ${count}件</span>`;
    });
    
    filterResultsElement.innerHTML = `
        <h4>📊 フィルタリング結果</h4>
        <div class="result-summary">
            選択中のタレント: ${selectedTalentList.join('、')}
            <br>
            表示される動画数: <strong>${totalCount}件</strong>
        </div>
        <div class="talent-breakdown">
            ${breakdownHtml}
        </div>
    `;
    
    filterResultsElement.style.display = 'block';
}

// さらに動画を読み込み
function loadMoreVideos() {
    const startIndex = currentPage * videosPerPage;
    const endIndex = startIndex + videosPerPage;
    const newVideos = filteredVideos.slice(startIndex, endIndex);
    
    displayedVideos.push(...newVideos);
    renderVideos(newVideos);
    
    currentPage++;
    
    // さらに読み込むボタンの表示/非表示
    if (endIndex >= filteredVideos.length) {
        loadMoreButton.style.display = 'none';
    } else {
        loadMoreButton.style.display = 'block';
    }
}

// 動画を画面に描画
function renderVideos(videos) {
    videos.forEach(video => {
        const videoElement = createVideoElement(video);
        timelineElement.appendChild(videoElement);
    });
}

// 動画要素を作成
function createVideoElement(video) {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    
    const uploadDate = new Date(video.upload_date);
    const formattedDate = formatDate(uploadDate);
    
    videoItem.innerHTML = `
        <div class="video-thumbnail">
            <img src="${video.image}" alt="${video.alt || video.title}" loading="lazy">
        </div>
        <div class="video-content">
            <h3 class="video-title">
                <a href="${video.video_url}" target="_blank" rel="noopener noreferrer">
                    ${escapeHtml(video.title)}
                </a>
            </h3>
            <div class="video-meta">
                <span class="talent-name">${escapeHtml(video.talentName)}</span>
                <span class="upload-date">${formattedDate}</span>
            </div>
            ${video.tags && video.tags.length > 0 ? 
                `<div class="video-tags">
                    ${video.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>` : ''
            }
            <p class="video-description">${escapeHtml(video.description || '')}</p>
        </div>
    `;
    
    return videoItem;
}

// 日付のフォーマット
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// HTMLエスケープ
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// エラーハンドリング
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showLoading(false);
    
    if (timelineElement.children.length === 0) {
        timelineElement.innerHTML = `
            <div style="text-align: center; padding: 40px; background: rgba(255, 255, 255, 0.9); border-radius: 10px;">
                <h3>エラーが発生しました</h3>
                <p>動画データの読み込みに失敗しました。ページを再読み込みしてください。</p>
            </div>
        `;
    }
});

// ページ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', init);
