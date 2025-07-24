// グローバル変数
let allVideos = [];
let filteredVideos = [];
let displayedVideos = [];
let currentPage = 0;
const videosPerPage = 20;
let talentInfo = [];
let talentNameMap = {};
let allTags = new Map(); // タグ名とその使用回数を保存

// DOM要素
const timelineElement = document.getElementById('timeline');
const loadingElement = document.getElementById('loading');
const talentButtonsElement = document.getElementById('talentButtons');
const clearAllBtnElement = document.getElementById('clearAllBtn');
const selectedCountElement = document.getElementById('selectedCount');
const filterResultsElement = document.getElementById('filterResults');
const dateSortElement = document.getElementById('dateSort');
const loadMoreButton = document.getElementById('loadMore');
const dateFromElement = document.getElementById('dateFrom');
const dateToElement = document.getElementById('dateTo');
const clearDateBtnElement = document.getElementById('clearDateBtn');
const tagSearchElement = document.getElementById('tagSearch');
const tagSuggestionsElement = document.getElementById('tagSuggestions');
const selectedTagsElement = document.getElementById('selectedTags');
const selectedTagCountElement = document.getElementById('selectedTagCount');
const clearTagsBtnElement = document.getElementById('clearTagsBtn');

// 選択されたタレント
let selectedTalents = new Set();

// 選択されたタグ
let selectedTags = new Set();

// タレントカラーマップ
let talentColors = {};

// アーカイブファイルのリスト
const archiveFiles = [
    'archives_@7_hapi_.json',
    'archives_@amanosakatu.json',
    'archives_@JabiDevi.json',
    'archives_@kirihuda_ataru.json',
    'archives_@kokoroninonno.json',
    'archives_@koyuchan_.json',
    'archives_@mel_samui.json',
    'archives_@memoa_923.json',
    'archives_@mimic_teionvo.json',
    'archives_@nekono_chiyuru.json',
    'archives_@nicola_aldin.json',
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
    selectedTags.clear();
    
    await loadTalentInfo();
    await loadAllVideos();
    setupEventListeners();
    updateSelectedCount();
    updateSelectedTagCount();
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
        talentInfo = await response.json();
        
        // タレント名のマッピングを作成
        talentNameMap = {};
        talentColors = {};
        talentInfo.forEach(talent => {
            console.log(`Loading talent: ${talent.yt} : ${talent.name}`);
            talentNameMap[talent.yt] = talent.name;
            talentColors[talent.yt] = talent.color;
        });
        // populateTalentFilter関数はloadAllVideos内で呼び出される
    } catch (error) {
        console.error('タレント情報の読み込みに失敗しました:', error);
    }
}

// 全ての動画データを読み込み
async function loadAllVideos() {
    const promises = archiveFiles.map(file => loadArchiveFile(file));
    const results = await Promise.all(promises);
    
    allVideos = [];
    const talentNames = new Set();
    allTags.clear();
    
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
                
                // タグを収集
                if (video.tags && Array.isArray(video.tags)) {
                    video.tags.forEach(tag => {
                        const normalizedTag = normalizeString(tag);
                        allTags.set(normalizedTag, (allTags.get(normalizedTag) || 0) + 1);
                    });
                }
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
        console.log(`Creating button for talent: ${talentName}`);
        const button = document.createElement('button');
        button.className = 'talent-btn';
        button.textContent = talentName;
        
        // タレント名からIDを逆引き
        const talentId = Object.keys(talentNameMap).find(id => talentNameMap[id] === talentName);
        button.style.borderColor = talentColors[talentId] || '#ccc';
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
    
    // タレント名からIDを逆引きして色を取得
    const talentId = Object.keys(talentNameMap).find(id => talentNameMap[id] === normalizedTalentName);
    const talentColor = talentColors[talentId] || '#ccc';
    
    if (selectedTalents.has(normalizedTalentName)) {
        selectedTalents.delete(normalizedTalentName);
        buttonElement.classList.remove('selected');
        // 選択解除時は元の境界線色に戻す
        buttonElement.style.background = '';
        buttonElement.style.borderColor = talentColor;
    } else {
        selectedTalents.add(normalizedTalentName);
        buttonElement.classList.add('selected');
        // 選択時はグラデーション背景を設定
        // 16進数talentColorから10進数200を引き、10進数で取得
        let gradientColorB = (parseInt(talentColor.slice(1), 16) - 0x1222222);
        if (gradientColorB < 0) {
            gradientColorB = 0;
        }
        console.log(`Gradient colors: ${talentColor}, ${gradientColorB.toString(16)}`);
        buttonElement.style.background = `linear-gradient(45deg, ${talentColor}, #${gradientColorB.toString(16).padStart(6, '0')})`;
        buttonElement.style.borderColor = talentColor;
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
        // 背景スタイルもリセット
        button.style.background = '';
        // 境界線色は元の色に戻す
        const talentName = button.textContent;
        const talentId = Object.keys(talentNameMap).find(id => talentNameMap[id] === talentName);
        const talentColor = talentColors[talentId] || '#ccc';
        button.style.borderColor = talentColor;
    });
    
    updateSelectedCount();
    applyFilters();
}

// 日付フィルターをクリア
function clearDateFilter() {
    dateFromElement.value = '';
    dateToElement.value = '';
    applyFilters();
}

// タグ検索機能
function filterTagSuggestions() {
    const searchTerm = tagSearchElement.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        tagSuggestionsElement.style.display = 'none';
        return;
    }
    
    const filteredTags = Array.from(allTags.entries())
        .filter(([tag, count]) => 
            tag.toLowerCase().includes(searchTerm) && !selectedTags.has(tag)
        )
        .sort((a, b) => b[1] - a[1]) // 使用回数の多い順
        .slice(0, 10); // 最大10個
    
    if (filteredTags.length === 0) {
        tagSuggestionsElement.style.display = 'none';
        return;
    }
    
    tagSuggestionsElement.innerHTML = filteredTags
        .map(([tag, count]) => 
            `<div class="tag-suggestion" data-tag="${escapeHtml(tag)}">
                <span class="tag-suggestion-name">${escapeHtml(tag)}</span>
                <span class="tag-suggestion-count">${count}件</span>
            </div>`
        ).join('');
    
    tagSuggestionsElement.style.display = 'block';
    
    // タグ選択のイベントリスナーを追加
    tagSuggestionsElement.querySelectorAll('.tag-suggestion').forEach(suggestion => {
        suggestion.addEventListener('click', () => {
            const tag = suggestion.dataset.tag;
            addTag(tag);
            tagSearchElement.value = '';
            tagSuggestionsElement.style.display = 'none';
        });
    });
}

// タグを追加
function addTag(tag) {
    if (!selectedTags.has(tag)) {
        selectedTags.add(tag);
        updateSelectedTagsDisplay();
        updateSelectedTagCount();
        applyFilters();
    }
}

// タグを削除
function removeTag(tag) {
    selectedTags.delete(tag);
    updateSelectedTagsDisplay();
    updateSelectedTagCount();
    applyFilters();
}

// 選択されたタグの表示を更新
function updateSelectedTagsDisplay() {
    if (selectedTags.size === 0) {
        selectedTagsElement.innerHTML = '';
        return;
    }
    
    selectedTagsElement.innerHTML = Array.from(selectedTags)
        .map(tag => 
            `<div class="selected-tag">
                <span>${escapeHtml(tag)}</span>
                <button class="selected-tag-remove" onclick="removeTag('${escapeHtml(tag)}')" title="削除">×</button>
            </div>`
        ).join('');
}

// 選択されたタグ数の表示を更新
function updateSelectedTagCount() {
    const count = selectedTags.size;
    if (count === 0) {
        selectedTagCountElement.textContent = '選択中: 0個';
    } else {
        selectedTagCountElement.textContent = `選択中: ${count}個`;
    }
}

// 全タグ選択を解除
function clearAllTags() {
    selectedTags.clear();
    updateSelectedTagsDisplay();
    updateSelectedTagCount();
    applyFilters();
}

// 動画のタグをクリックしたときの処理
function handleTagClick(tag) {
    addTag(tag);
}

// イベントリスナーの設定
function setupEventListeners() {
    clearAllBtnElement.addEventListener('click', clearAllSelections);
    dateSortElement.addEventListener('change', applyFilters);
    loadMoreButton.addEventListener('click', loadMoreVideos);
    dateFromElement.addEventListener('change', applyFilters);
    dateToElement.addEventListener('change', applyFilters);
    clearDateBtnElement.addEventListener('click', clearDateFilter);
    
    // タグフィルター関連
    tagSearchElement.addEventListener('input', filterTagSuggestions);
    tagSearchElement.addEventListener('focus', filterTagSuggestions);
    clearTagsBtnElement.addEventListener('click', clearAllTags);
    
    // タグ候補の外側をクリックしたら非表示
    document.addEventListener('click', (e) => {
        if (!tagSearchElement.contains(e.target) && !tagSuggestionsElement.contains(e.target)) {
            tagSuggestionsElement.style.display = 'none';
        }
    });
}

// フィルターを適用
function applyFilters() {
    const sortOrder = dateSortElement.value;
    const dateFrom = dateFromElement.value;
    const dateTo = dateToElement.value;
    
    // タレントフィルターを適用
    let videos = allVideos;
    if (selectedTalents.size > 0) {
        videos = videos.filter(video => {
            const normalizedVideoTalentName = normalizeString(video.talentName);
            return selectedTalents.has(normalizedVideoTalentName);
        });
    }
    
    // タグフィルターを適用
    if (selectedTags.size > 0) {
        videos = videos.filter(video => {
            if (!video.tags || !Array.isArray(video.tags)) return false;
            
            return Array.from(selectedTags).every(selectedTag => {
                return video.tags.some(videoTag => 
                    normalizeString(videoTag) === selectedTag
                );
            });
        });
    }
    
    // 日付フィルターを適用
    if (dateFrom || dateTo) {
        videos = videos.filter(video => {
            const videoDate = new Date(video.upload_date);
            
            // 無効な日付の場合は除外
            if (isNaN(videoDate.getTime())) {
                return false;
            }
            
            // 日付を日単位で比較するため、時間をリセット
            const videoDateOnly = new Date(videoDate.getFullYear(), videoDate.getMonth(), videoDate.getDate());
            
            let passesFilter = true;
            
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                passesFilter = passesFilter && videoDateOnly >= fromDate;
            }
            
            if (dateTo) {
                const toDate = new Date(dateTo);
                passesFilter = passesFilter && videoDateOnly <= toDate;
            }
            
            return passesFilter;
        });
    }
    
    filteredVideos = videos;
    
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
    const dateFrom = dateFromElement.value;
    const dateTo = dateToElement.value;
    const hasDateFilter = dateFrom || dateTo;
    const hasTalentFilter = selectedTalents.size > 0;
    const hasTagFilter = selectedTags.size > 0;
    
    if (!hasDateFilter && !hasTalentFilter && !hasTagFilter) {
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
    
    let filterDescription = '';
    
    // 日付フィルターの説明
    if (hasDateFilter) {
        const formatDateForDisplay = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        };
        
        if (dateFrom && dateTo) {
            filterDescription += `📅 期間: ${formatDateForDisplay(dateFrom)} ～ ${formatDateForDisplay(dateTo)}`;
        } else if (dateFrom) {
            filterDescription += `📅 ${formatDateForDisplay(dateFrom)} 以降`;
        } else if (dateTo) {
            filterDescription += `📅 ${formatDateForDisplay(dateTo)} 以前`;
        }
        
        if (hasTalentFilter || hasTagFilter) {
            filterDescription += '<br>';
        }
    }
    
    // タレントフィルターの説明
    if (hasTalentFilter) {
        const selectedTalentList = Array.from(selectedTalents);
        filterDescription += `👥 選択中のタレント: ${selectedTalentList.join('、')}`;
        
        if (hasTagFilter) {
            filterDescription += '<br>';
        }
    }
    
    // タグフィルターの説明
    if (hasTagFilter) {
        const selectedTagList = Array.from(selectedTags);
        filterDescription += `🏷️ 選択中のタグ: ${selectedTagList.join('、')}`;
    }
    
    // タレント別の動画数内訳
    let breakdownHtml = '';
    if (hasTalentFilter) {
        const selectedTalentList = Array.from(selectedTalents);
        selectedTalentList.forEach(talent => {
            const count = talentCounts[talent] || 0;
            breakdownHtml += `<span class="talent-count">${talent}: ${count}件</span>`;
        });
    }
    
    filterResultsElement.innerHTML = `
        <h4>📊 フィルタリング結果</h4>
        <div class="result-summary">
            ${filterDescription}
            <br>
            表示される動画数: <strong>${totalCount}件</strong>
        </div>
        ${breakdownHtml ? `<div class="talent-breakdown">${breakdownHtml}</div>` : ''}
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
                    ${video.tags.map(tag => `<span class="tag" data-tag="${escapeHtml(normalizeString(tag))}">${escapeHtml(tag)}</span>`).join('')}
                </div>` : ''
            }
            <p class="video-description">${escapeHtml(video.description || '')}</p>
        </div>
    `;
    
    // タグのクリックイベントを追加
    if (video.tags && video.tags.length > 0) {
        const tagElements = videoItem.querySelectorAll('.tag');
        tagElements.forEach(tagElement => {
            tagElement.addEventListener('click', (e) => {
                e.preventDefault();
                const tagName = tagElement.dataset.tag;
                handleTagClick(tagName);
            });
        });
    }
    
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
