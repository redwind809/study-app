// --- 1. Variables & Base Data ---
const APP_VERSION = "v6.1.26";

const ALL_SUBJECTS_ID = 'all';

const SUBJECT_FIXED_COLORS = { chemistry: 'text-app-accent', math: 'text-green-400', physics: 'text-purple-400' };

const COLOR_PALETTE = ['text-sky-400', 'text-emerald-400', 'text-violet-400', 'text-amber-400', 'text-rose-400', 'text-fuchsia-400', 'text-cyan-400', 'text-lime-400', 'text-indigo-400', 'text-pink-400', 'text-yellow-400', 'text-teal-400', 'text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-red-500', 'text-blue-300', 'text-green-300', 'text-purple-300', 'text-orange-300', 'text-rose-300', 'text-emerald-300', 'text-sky-300'];

const TICKER_COLOR_CLASSES = [

    'text-red-400', 'text-orange-400', 'text-amber-400', 'text-yellow-400',

    'text-lime-400', 'text-green-400', 'text-emerald-400', 'text-teal-400',

    'text-cyan-400', 'text-sky-400', 'text-blue-400', 'text-indigo-400',

    'text-violet-400', 'text-purple-400', 'text-fuchsia-400', 'text-pink-400',

    'text-rose-400', 'text-gray-400'

];



const defaultSubjects = {

    chemistry: { id: 'chemistry', type: 'study', name: '陋ｹ髢・ｭ・ｦ', examDate: null, startDate: null, isActive: true, syllabus: [], history: {} }

};



const defaultTicker = {

    categories: [

        { id: 'tips', name: 'Tips', color: 'text-blue-400', weight: 10 },

        { id: 'quote', name: '陷ｷ蟠趣ｽｨﾂ', color: 'text-yellow-400', weight: 5 }

    ],

    messages: [], // 陋ｻ譎・ｄ邵ｺ・ｯ驕ｨ・ｺ

    isPaused: false,

    isEnabled: true

};







let appData = getBlankData();

let currentRecordDate = new Date();

let currentCalendarDate = new Date();

let selectedDateString = null;

let editingSubjectId = null;

let editingUnitIndex = null;



let tickerInterval = null;

let editingTickerCatId = null;



// --- 2. Utils ---



function escapeHtml(text) {

    if (text === null || text === undefined) return '';

    return String(text)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}

function getToday() { return new Date(); }

function getTodayStr() { return formatDate(getToday()); }

function formatDate(date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; }

function formatShortDate(date) { return `${date.getMonth() + 1}/${date.getDate()}`; }

function getActiveSubjects() { return Object.values(appData.subjects).filter(s => s.isActive && s.type === 'study'); }

function getActiveChallenges() { return Object.values(appData.subjects).filter(s => s.isActive && s.type === 'challenge'); }



function getSubjectColor(subjId) {

    if (SUBJECT_FIXED_COLORS[subjId]) return SUBJECT_FIXED_COLORS[subjId];

    const subj = appData.subjects[subjId];

    if (!subj) return 'text-gray-400';

    if (subj.type === 'challenge') return 'text-challenge-gold';

    let hash = 0; const name = subj.name;

    for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }

    const index = Math.abs(hash) % COLOR_PALETTE.length;

    return COLOR_PALETTE[index];

}



function showToast(msg) {

    const toast = document.getElementById('app-toast');

    if (!toast) return;

    toast.textContent = msg; toast.classList.remove('hidden');

    setTimeout(() => { toast.classList.remove('opacity-0'); toast.classList.add('opacity-100'); }, 10);

    setTimeout(() => { toast.classList.replace('opacity-100', 'opacity-0'); setTimeout(() => toast.classList.add('hidden'), 300); }, 2500);

}



function showAppConfirm(title, body, onOk) {

    const modal = document.getElementById('app-modal');

    document.getElementById('app-modal-title').textContent = title;

    document.getElementById('app-modal-body').textContent = body;

    const okBtn = document.getElementById('app-modal-ok');

    const cancelBtn = document.getElementById('app-modal-cancel');

    modal.classList.remove('hidden');

    const newOkBtn = okBtn.cloneNode(true); okBtn.parentNode.replaceChild(newOkBtn, okBtn);

    newOkBtn.onclick = () => { modal.classList.add('hidden'); onOk(); };

    cancelBtn.onclick = () => { modal.classList.add('hidden'); };

}



function copyTextToClipboard(text) {

    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);

}



// =========================================================

// --- 3. Data Logic (Firebase Cloud Sync & Secure Auth) ---

// =========================================================



// Firebase config is loaded from firebase-config.js



if (!firebase.apps.length) {

    firebase.initializeApp(firebaseConfig);

}

const db = firebase.firestore();



let currentUserDocId = null;



let googleAccessToken = null; // 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ蜩ｦoogle API騾包ｽｨ郢晏現繝ｻ郢ｧ・ｯ郢晢ｽｳ



// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螟青・｣隰・ｦｴ莠溯ｱ・ｽ｢隶匁ｺｯ繝ｻ闔牙･窶ｳ邵ｺ・ｮ郢晢ｽｭ郢ｧ・ｰ郢ｧ・､郢晢ｽｳ鬮｢・｢隰ｨ・ｰ

// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螢ｹﾎ溽ｹｧ・ｰ郢ｧ・｢郢ｧ・ｦ郢昜ｺ･・ｾ蠕後・陷髦ｪﾎ溽ｹｧ・ｰ郢ｧ・､郢晢ｽｳ郢ｧ繧・ｺ・妙・ｽ邵ｺ・ｪ郢晢ｽｭ郢ｧ・ｰ郢ｧ・､郢晢ｽｳ鬮｢・｢隰ｨ・ｰ

let isLoginProcessing = false;



function performGoogleLogin(onSuccess) {

    // 陷・ｽｦ騾・・・ｸ・ｭ邵ｺ・ｪ郢ｧ謌托ｽｽ霈費ｽらｸｺ蜉ｱ竊醍ｸｺ繝ｻ

    if (isLoginProcessing) return;

    isLoginProcessing = true;



    const btn = document.querySelector('button[onclick="performGoogleLogin()"]');

    if (btn) {

        btn.style.opacity = "0.5";

        btn.innerText = "隰暦ｽ･驍ｯ螢ｻ・ｸ・ｭ...";

    }



    const provider = new firebase.auth.GoogleAuthProvider();

    provider.addScope('https://www.googleapis.com/auth/tasks');

    provider.addScope('https://www.googleapis.com/auth/spreadsheets');



    firebase.auth().signInWithPopup(provider)

        .then((result) => {

            googleAccessToken = result.credential.accessToken;

            document.getElementById('login-error').textContent = "";



            // 隨倥・・・ｸｺ阮吮ｲ闖ｫ・ｮ雎・ｽ｣霓､・ｹ繝ｻ螢ｽ繝ｻ陷画ｻ灘・郢ｧ繧・ｼ邵ｺ・｣邵ｺ荵晢ｽ顔ｹ晁ｼ釆帷ｹｧ・ｰ邵ｺ・ｨ郢晄㈱縺｡郢晢ｽｳ郢ｧ雋槭・邵ｺ・ｫ隰鯉ｽｻ邵ｺ繝ｻ

            isLoginProcessing = false;

            if (btn) {

                btn.style.opacity = "1";

                btn.innerHTML = `<svg class="w-5 h-5 mr-3" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Google邵ｺ・ｧ郢晢ｽｭ郢ｧ・ｰ郢ｧ・､郢晢ｽｳ`;

            }

            // 郢晢ｽｭ郢ｧ・ｰ郢ｧ・､郢晢ｽｳ隰御ｻ咏ｲ･陟募ｾ後・郢ｧ・ｳ郢晢ｽｼ郢晢ｽｫ郢晁・繝｣郢ｧ・ｯ郢ｧ雋橸ｽｮ貅ｯ・｡繝ｻ

            if (typeof onSuccess === 'function') onSuccess();

        })

        .catch((error) => {

            console.error(error);

            let msg = 'ログイン失敗: ' + (error.message || 'unknown error');

            if (error.code === 'auth/cancelled-popup-request') {
                msg = 'エラー: ログイン処理が競合しました。もう一度お試しください。';
            } else if (error.code === 'auth/popup-closed-by-user') {
                msg = 'ログイン画面が閉じられました。';
            } else if (error.code === 'auth/popup-blocked') {
                msg = 'ポップアップがブロックされました。ブラウザ設定で許可してください。';
            } else if (error.message && error.message.includes('The requested action is invalid')) {
                msg = '設定エラー: Firebase の認証プロバイダ設定を確認してください。';
            }

            document.getElementById('login-error').textContent = msg;



            // 陞滂ｽｱ隰ｨ邇ｲ蜃ｾ郢ｧ繧育ｶｾ邵ｺ繝ｻ

            isLoginProcessing = false;

            if (btn) {

                btn.style.opacity = "1";

                btn.innerHTML = `<svg class="w-5 h-5 mr-3" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Google邵ｺ・ｧ郢晢ｽｭ郢ｧ・ｰ郢ｧ・､郢晢ｽｳ`;

            }

        });

}



// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ蜩ｦoogle ToDo郢晢ｽｪ郢ｧ・ｹ郢晏現竏磯ｨｾ竏ｽ・ｿ・｡邵ｺ蜷ｶ・矩ｫ｢・｢隰ｨ・ｰ

// 隨倥・・､逕ｻ蟲ｩ繝ｻ蜩ｦoogle ToDo郢晢ｽｪ郢ｧ・ｹ郢晏現竏磯ｨｾ竏ｽ・ｿ・｡邵ｺ蜷ｶ・矩ｫ｢・｢隰ｨ・ｰ繝ｻ驛・ｽｦ・ｪ陋ｻ繝ｻ繝ｰ郢晢ｽｼ郢ｧ・ｸ郢晢ｽｧ郢晢ｽｳ繝ｻ繝ｻ

function addToGoogleTasks(title, dateStr) {

    // 陷ｷ逎ｯ蠏ｯ邵ｺ蠕娯・邵ｺ繝ｻ・ｰ・ｴ陷ｷ蛹ｻﾂ竏壹＞郢晢ｽｩ郢晢ｽｼ郢晏現・定怎・ｺ邵ｺ蜉ｱ窶ｻ隰ｨ蜷ｶ竏ｴ郢ｧ繝ｻ

    if (!googleAccessToken) {

        showToast('Google未接続です。設定から再ログインしてください');

        return;

    }



    const due = dateStr + 'T00:00:00.000Z';



    fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {

        method: 'POST',

        headers: {

            'Authorization': `Bearer ${googleAccessToken}`,

            'Content-Type': 'application/json'

        },

        body: JSON.stringify({

            title: `[陝・ｽｦ驗咏ｶｻ ${title}`,

            due: due

        })

    }).then(response => {

        if (response.ok) {

            showToast('Google ToDoに追加しました');

        } else {

            console.error("Task sync failed", response);

            showToast('同期エラーが発生しました');

        }

    });

} // 隨倥・・・ｸｺ阮吶定峪・ｺ陋ｻ繝ｻ・狗ｸｺ・ｮ邵ｺ譴ｧ・ｭ・｣髫暦ｽ｣邵ｺ・ｧ邵ｺ蜻ｻ・ｼ繝ｻ



// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ蜩ｦemini陷ｷ莉｣・邵ｺ・ｮ雎包ｽｨ鬩･驛・ｽｿ・ｽ陷会｣ｰ 繝ｻ繝ｻ陷髦ｪﾎ溽ｹｧ・ｰ郢ｧ・､郢晢ｽｳ郢晁ｼ釆溽ｹ晢ｽｼ郢ｧ螳夲ｽｦ・ｪ陋ｻ繝ｻ竊鍋ｸｺ蜉ｱ笳・ｫ｢・｢隰ｨ・ｰ

async function exportToGoogleSheets() {
    if (!googleAccessToken) {
        showToast('Googleに接続してください');
        performGoogleLogin();
        return;
    }
    showToast('現在この機能はメンテナンス中です');
}

function saveData() {

    if (currentUserDocId) {

        // 郢晢ｽｭ郢ｧ・ｰ郢ｧ・､郢晢ｽｳ闕ｳ・ｭ邵ｺ・ｯFirestore(郢ｧ・ｯ郢晢ｽｩ郢ｧ・ｦ郢昴・邵ｺ・ｫ闖ｫ譎擾ｽｭ繝ｻ

        db.collection("study_apps").doc(currentUserDocId).set(JSON.parse(JSON.stringify(appData)))

            .then(() => console.log("Data saved to cloud"))

            .catch((error) => console.error("Save error:", error));

    } else {

        // 隴幢ｽｪ郢晢ｽｭ郢ｧ・ｰ郢ｧ・､郢晢ｽｳ隴弱ｅ繝ｻ郢晢ｽｭ郢晢ｽｼ郢ｧ・ｫ郢晢ｽｫ闖ｫ譎擾ｽｭ蛛・ｽｼ莠･・ｿ・ｵ邵ｺ・ｮ邵ｺ貅假ｽ√・繝ｻ

        localStorage.setItem('studyApp_v2_data', JSON.stringify(appData));

    }

}



function startListening() {

    if (!currentUserDocId) return;

    db.collection("study_apps").doc(currentUserDocId).onSnapshot((doc) => {

        if (doc.exists) {

            console.log("Data received from cloud");

            const cloudData = doc.data();

            appData = migrateData(cloudData);

            appData.debugDate = null;

            initTicker(); // 郢昴・繝ｻ郢ｧ・ｿ郢晢ｽｭ郢晢ｽｼ郢晉甥・ｾ蠕娯・郢昴・縺・ｹ昴・縺咲ｹ晢ｽｼ鬮｢蜿･・ｧ繝ｻ

            recordHistory();

            updateUI();

        } else {

            console.log("No data found, initializing...");

            saveData();

        }

    }, (error) => {

        console.error("Sync error:", error);

        if (error.code === 'permission-denied') {

            alert('クラウド同期の権限エラーが発生しました');

        }

    });

}



function migrateData(data) {

    if (!data.subjects) return data;

    Object.values(data.subjects).forEach(subj => {

        if (subj.isActive === undefined) subj.isActive = true;

        if (!subj.type) subj.type = 'study';

        if (!subj.history) subj.history = {};

        if (subj.type === 'challenge' && !subj.challengeHistory) subj.challengeHistory = {};

        if (!subj.difficultyLabels) subj.difficultyLabels = {};
        if (!subj.difficultyOrder) subj.difficultyOrder = Object.keys(subj.difficultyLabels); // 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螢ｻ・ｸ・ｦ邵ｺ・ｳ鬯・・繝ｻ陋ｻ繝ｻ
        if (!subj.difficultyFilter) subj.difficultyFilter = Object.keys(subj.difficultyLabels);
    });

    if (!data.ticker) data.ticker = JSON.parse(JSON.stringify(defaultTicker));

    if (data.ticker.isEnabled === undefined) data.ticker.isEnabled = true;

    if (!data.sleepLog) data.sleepLog = {};

    return data;

}



// 隨倥・鬮ｮ・｣隴冗§・ｺ・ｦ郢晏･ﾎ晉ｹ昜ｻ｣繝ｻ鬮｢・｢隰ｨ・ｰ

function getDifficultyLabels(subjId) {
    const subj = appData.subjects[subjId];
    return subj?.difficultyLabels || {};
}

function getDifficultyFilter(subjId) {

    const subj = appData.subjects[subjId];

    return subj?.difficultyFilter || Object.keys(getDifficultyLabels(subjId));

}

function populateDifficultySelect(selectEl, subjId, currentVal, includeNoChange) {

    selectEl.innerHTML = '';

    if (includeNoChange) {

        const opt = document.createElement('option');

        opt.value = 'no-change';

        opt.textContent = '変更しない';

        selectEl.appendChild(opt);

    }

    // const noneOpt = document.createElement('option'); noneOpt.value = ''; noneOpt.textContent = '繝ｻ蛹ｻ竊醍ｸｺ證ｦ・ｼ繝ｻ; selectEl.appendChild(noneOpt); // 陷台ｼ∝求

    const labels = getDifficultyLabels(subjId);

    const subj = appData.subjects[subjId];

    const order = (subj && subj.difficultyOrder) ? subj.difficultyOrder : Object.keys(labels);



    order.forEach(key => {

        // 郢晢ｽｩ郢晏生ﾎ晉ｸｺ謔滂ｽｭ莨懈Β邵ｺ蜷ｶ・玖撻・ｴ陷ｷ蛹ｻ繝ｻ邵ｺ・ｿ髯ｦ・ｨ驕会ｽｺ繝ｻ莠･轤朱ｫｯ・､邵ｺ霈費ｽ檎ｸｺ貅倥■郢ｧ・ｰ陝・ｽｾ驕ｲ蜴・ｽｼ繝ｻ

        if (labels[key]) {

            const label = labels[key] || key;

            const opt = document.createElement('option');

            opt.value = key;

            opt.textContent = label;

            if (key === currentVal) opt.selected = true;

            selectEl.appendChild(opt);

        }

    });

}

function isUnitInFilter(unit, subjId) {

    const filter = getDifficultyFilter(subjId);

    if (filter.length === 0) return true; // 郢晁ｼ斐≦郢晢ｽｫ郢ｧ・ｿ郢晢ｽｼ隴幢ｽｪ髫ｪ・ｭ陞ｳ螢ｹ竊醍ｹｧ迚吶・邵ｺ・ｦ陷ｷ・ｫ郢ｧ竏夲ｽ・

    const tags = Array.isArray(unit.difficulty) ? unit.difficulty : (unit.difficulty ? [unit.difficulty] : []);

    if (tags.length === 0) return true; // 郢ｧ・ｿ郢ｧ・ｰ邵ｺ・ｪ邵ｺ蜉ｱ繝ｻ陝ｶ・ｸ邵ｺ・ｫ陷ｷ・ｫ郢ｧ竏夲ｽ・

    return tags.some(t => filter.includes(t));

}



function renderDifficultyCheckboxes(containerId, subjId, currentTags = []) {

    const container = document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = '';



    // 鬩滓ｦ翫・陋ｹ謔ｶ竊定ｭ√・・ｭ諤懊・闔蜻磯共

    const current = Array.isArray(currentTags) ? currentTags : (currentTags ? [currentTags] : []);



    const labels = getDifficultyLabels(subjId);

    const subj = appData.subjects[subjId];

    const order = (subj && subj.difficultyOrder) ? subj.difficultyOrder : Object.keys(labels);



    order.forEach(key => {

        // 郢晢ｽｩ郢晏生ﾎ晉ｸｺ謔滂ｽｭ莨懈Β邵ｺ蜷ｶ・狗ｹｧ繧・・邵ｺ・ｮ邵ｺ・ｿ髯ｦ・ｨ驕会ｽｺ

        if (!labels[key]) return;



        const label = labels[key] || key;

        const labelEl = document.createElement('label');

        labelEl.className = 'flex items-center gap-1 cursor-pointer bg-gray-800 px-2 py-1 rounded border border-gray-700 hover:border-gray-500 select-none';



        const input = document.createElement('input');

        input.type = 'checkbox';

        input.value = key;

        input.checked = current.includes(key);

        input.className = 'accent-app-accent';

        if (containerId === 'bulk-edit-difficulty-checks') input.dataset.bulkDiff = 'true';



        const span = document.createElement('span');

        span.className = 'text-[10px] text-gray-300';

        span.textContent = label; // 郢晢ｽｩ郢晏生ﾎ晉ｸｺ・ｮ邵ｺ・ｿ髯ｦ・ｨ驕会ｽｺ



        labelEl.appendChild(input);

        labelEl.appendChild(span);

        container.appendChild(labelEl);

    });



    if (Object.keys(labels).length === 0) {

        container.innerHTML = '<span class="text-[10px] text-gray-500">郢ｧ・ｿ郢ｧ・ｰ髫ｪ・ｭ陞ｳ螢ｹ竊醍ｸｺ繝ｻ/span>';

    }

}



function recordHistory() {

    const dateStr = getTodayStr();

    Object.values(appData.subjects).forEach(subj => {

        if (subj.type === 'study') {

            if (!subj.history) subj.history = {};

            const total = subj.syllabus ? subj.syllabus.length : 0;

            if (total === 0) return;

            const completed = subj.syllabus.filter(i => i.status === 'completed').length;

            subj.history[dateStr] = Math.round((completed / total) * 100);

        }

    });

    saveData();

}



function getProgressAt(s, d) {

    if (!s || !s.history) return 0;

    if (s.history[d] !== undefined) return s.history[d];

    const sorted = Object.keys(s.history).sort();

    let last = null;

    for (const x of sorted) { if (x <= d) last = x; else break; }

    return last ? s.history[last] : 0;

}



function calculateLeastSquares(points) {

    const n = points.length; if (n < 2) return null;

    let sx = 0, sy = 0, sxy = 0, sx2 = 0;

    for (const p of points) { sx += p.x; sy += p.y; sxy += p.x * p.y; sx2 += p.x * p.x; }

    const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);

    const intercept = (sy - slope * sx) / n;

    return { slope, intercept };

}



function calculateChallengeStats(subj) {

    const start = subj.startDate ? new Date(subj.startDate) : getToday();

    const today = getToday();

    const totalDays = Math.max(1, Math.floor((today - start) / 86400000) + 1);

    let currentStreak = 0; let streakBroken = false;

    for (let i = 0; i < totalDays; i++) {

        const d = new Date(today); d.setDate(d.getDate() - i); const dStr = formatDate(d);

        if (subj.challengeHistory[dStr]) { if (!streakBroken) currentStreak++; } else { if (i > 0) streakBroken = true; }

    }

    let doneDays = 0; for (let k in subj.challengeHistory) { if (subj.challengeHistory[k] && new Date(k) >= start && new Date(k) <= today) doneDays++; }

    return { totalDays, doneDays, currentStreak, percentage: Math.round((doneDays / totalDays) * 100) };

}



function getStreakMessage(streak) {
    if (streak === 0) return '初日スタート';
    if (streak < 3) return 'いい流れ';
    if (streak < 7) return '順調です';
    if (streak < 14) return 'かなり良いペース';
    if (streak < 30) return 'すごい継続力';
    return 'レジェンド級';
}




// =========================================================

// --- Ticker Logic ---

// =========================================================

function initTicker() {

    updateTickerVisibility();

    if (tickerInterval) clearInterval(tickerInterval);

    tickerInterval = null;



    if (!appData.ticker.isEnabled) return;



    const wrappers = document.querySelectorAll('.ticker-wrapper');



    if (appData.ticker.isPaused) {

        wrappers.forEach(wrapper => {

            wrapper.innerHTML = '<div class="ticker-item text-xs text-gray-500">Loading...</div>';

        });

    } else {

        renderTicker(); // First render

        tickerInterval = setInterval(updateTicker, 10000);

    }

    updateTickerPauseBtn();

}



function updateTickerVisibility() {

    const box = document.getElementById('header-ticker-box');

    if (!box) return;

    if (appData.ticker.isEnabled) {

        box.classList.add('sm:block');

    } else {

        box.classList.remove('sm:block');

    }

    if (!box.classList.contains('hidden')) box.classList.add('hidden');

}



function updateTicker() {

    if (appData.ticker.isPaused) return;



    const wrappers = document.querySelectorAll('.ticker-wrapper');

    if (wrappers.length === 0) return;



    const nextMsg = getWeightedRandomMessage();



    wrappers.forEach(wrapper => {

        if (!nextMsg) {

            wrapper.innerHTML = '<div class="ticker-item text-xs text-gray-500">メッセージがありません</div>';

            return;

        }



        // 隴鯉ｽ｢陝・･繝ｻ髫補悪・ｴ・ｰ郢ｧ蛛ｵ笘・ｸｺ・ｹ邵ｺ・ｦ陷ｿ髢・ｾ繝ｻ

        const oldItems = Array.from(wrapper.children);



        // 隹ｺ・｡邵ｺ・ｮ髫補悪・ｴ・ｰ郢ｧ蜑・ｽｽ諛医・

        const nextEl = document.createElement('div');

        nextEl.className = 'ticker-item ticker-slide-enter';



        const cat = appData.ticker.categories.find(c => c.id === nextMsg.categoryId);

        const colorClass = cat ? cat.color : 'text-gray-400';

        const catName = cat ? cat.name : '';



        nextEl.innerHTML = '<span class="ticker-category-badge ' + colorClass + '">' + escapeHtml(catName) + '</span>' +
            '<span class="text-xs text-gray-200 truncate">' + escapeHtml(nextMsg.text) + '</span>';



        wrapper.appendChild(nextEl);



        // 陷ｿ・､邵ｺ繝ｻ・ｦ竏ｫ・ｴ・ｰ郢ｧ蟶敖ﾂ陜｣・ｴ邵ｺ霈披雷郢ｧ繝ｻ

        oldItems.forEach(el => {

            el.classList.remove('ticker-slide-enter');

            el.classList.add('ticker-slide-exit');

            setTimeout(() => { if (el.parentNode) el.remove(); }, 480);

        });

    });

}



function renderTicker() {

    // 陟托ｽｷ陋ｻ・ｶ騾ｧ繝ｻ竊楢ｭ厄ｽｴ隴・ｽｰ郢ｧ蛛ｵﾂｰ邵ｺ莉｣・九・莠･繝ｻ隴帶ｺｯ・｡・ｨ驕会ｽｺ騾包ｽｨ繝ｻ繝ｻ

    updateTicker();

}



function forceNextTicker() {

    // 霎滂ｽ｡陷会ｽｹ陋ｹ邏具ｽｸ・ｭ郢ｧ繝ｻ・ｸﾂ隴弱ｇ笳剰ｱ・ｽ｢闕ｳ・ｭ邵ｺ・ｯ郢ｧ・ｯ郢晢ｽｪ郢昴・縺醍ｸｺ蜉ｱ窶ｻ郢ｧ繧仰・ｲ邵ｺ・ｾ邵ｺ・ｪ邵ｺ繝ｻ・育ｸｺ繝ｻ竊鍋ｸｺ蜷ｶ・・

    if (!appData.ticker.isEnabled || appData.ticker.isPaused) return;



    updateTicker();

    clearInterval(tickerInterval);

    tickerInterval = setInterval(updateTicker, 10000);

}



function toggleTickerEnabled() {

    const isEnabled = document.getElementById('ticker-enabled-toggle').checked;

    appData.ticker.isEnabled = isEnabled;

    saveData();

    initTicker();

}



function toggleTickerPause(e) {

    if (e) e.stopPropagation();

    appData.ticker.isPaused = !appData.ticker.isPaused;

    saveData();

    initTicker();

}



function updateTickerPauseBtn() {

    const btns = document.querySelectorAll('.ticker-pause-btn');

    btns.forEach(btn => {

        btn.innerHTML = appData.ticker.isPaused ? '<i class="fas fa-play text-app-accent"></i>' : '<i class="fas fa-pause"></i>';

        btn.style.opacity = appData.ticker.isPaused ? "1" : ""; // 陋帶㊧・ｭ・｢闕ｳ・ｭ邵ｺ・ｯ陝ｶ・ｸ邵ｺ・ｫ髯ｦ・ｨ驕会ｽｺ

    });

}



function getWeightedRandomMessage() {

    const ticker = appData.ticker;

    if (!ticker || !ticker.messages || ticker.messages.length === 0) return null;



    // 郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ邵ｺ譁絶・邵ｺ・ｮ鬩･髦ｪ竏ｩ郢晄ｧｭ繝｣郢晏ｶｺ・ｽ諛医・

    const defaultWeight = 1;

    const weightedMessages = ticker.messages.map(msg => {

        const cat = ticker.categories.find(c => c.id === msg.categoryId);

        const weight = cat ? (parseInt(cat.weight) || 1) : defaultWeight;

        return { msg, weight };

    });



    const sum = weightedMessages.reduce((acc, item) => acc + item.weight, 0);

    let r = Math.random() * sum;



    for (const item of weightedMessages) {

        if (r < item.weight) return item.msg;

        r -= item.weight;

    }

    return weightedMessages[0].msg;

}





function addNewTickerCategory() {

    const id = 'cat_' + Date.now();

    const newCat = { id: id, name: '隴・ｽｰ髫穂ｸ翫″郢昴・縺也ｹ晢ｽｪ', color: 'text-gray-400', weight: 10 };

    appData.ticker.categories.push(newCat);

    saveData();

    renderTickerSettings();

    openTickerCategoryEditor(id);

}



function deleteTickerCategory(catId) {

    const category = appData.ticker.categories.find(c => c.id === catId);

    if (!category) return;

    showAppConfirm("郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ邵ｺ・ｮ陷台ｼ∝求", `郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ邵ｲ繝ｻ{category.name}邵ｲ髦ｪ竊堤ｸｲ竏ｫ・ｴ闊娯名邵ｺ荳莞鍋ｹ昴・縺晉ｹ晢ｽｼ郢ｧ・ｸ郢ｧ雋槭・邵ｺ・ｦ陷台ｼ∝求邵ｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂｰ繝ｻ豁・ () => {

        appData.ticker.categories = appData.ticker.categories.filter(c => c.id !== catId);

        appData.ticker.messages = appData.ticker.messages.filter(m => m.categoryId !== catId);

        saveData();

        renderTickerSettings();

        initTicker();

        showToast("カテゴリーを削除しました");
    });
}



function openBulkWeightEditor() {

    const list = document.getElementById('bulk-weight-list');

    list.innerHTML = '';

    appData.ticker.categories.forEach(cat => {

        const div = document.createElement('div');

        div.innerHTML = `

                    <label class="text-[10px] text-gray-400 block mb-1">${escapeHtml(cat.name)}: <span class="font-bold text-white" id="bulk-weight-value-${cat.id}">${cat.weight}</span></label>

                    <input type="range" id="bulk-weight-slider-${cat.id}" min="1" max="20" value="${cat.weight}" class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer">

                `;

        list.appendChild(div);

        const slider = document.getElementById(`bulk-weight-slider-${cat.id}`);

        const valueLabel = document.getElementById(`bulk-weight-value-${cat.id}`);

        slider.oninput = () => {

            valueLabel.textContent = slider.value;

        };

    });

    document.getElementById('ticker-bulk-weight-editor').classList.remove('hidden');

}



function closeBulkWeightEditor() {

    document.getElementById('ticker-bulk-weight-editor').classList.add('hidden');

}



function saveBulkWeights() {

    appData.ticker.categories.forEach(cat => {

        const slider = document.getElementById(`bulk-weight-slider-${cat.id}`);

        if (slider) {

            cat.weight = parseInt(slider.value);

        }

    });

    saveData();

    renderTickerSettings();

    closeBulkWeightEditor();

    showToast("鬩･髦ｪ竏ｩ郢ｧ蜑・ｽｸﾂ隲｡・ｬ隴厄ｽｴ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}





// 隨・ｽｼ隨・ｽｼ隨・ｽｼ 闖ｫ・ｮ雎・ｽ｣驍ゅ・蝨堤ｸｺ阮呻ｼ・ｸｺ荵晢ｽ・隨・ｽｼ隨・ｽｼ隨・ｽｼ



function openTickerCategoryEditor(catId) {

    editingTickerCatId = catId;

    const cat = appData.ticker.categories.find(c => c.id === catId);

    if (!cat) return;



    document.getElementById('edit-ticker-cat-name').value = cat.name;



    const colorValueInput = document.getElementById('edit-ticker-cat-color-value');

    colorValueInput.value = cat.color;



    const palette = document.getElementById('edit-ticker-cat-color-palette');

    palette.innerHTML = '';

    TICKER_COLOR_CLASSES.forEach(colorClass => {

        const swatch = document.createElement('div');

        const bgColor = colorClass.replace('text-', 'bg-');

        swatch.className = `w-full h-8 rounded cursor-pointer border-2 ${bgColor} transition-all`;

        swatch.dataset.colorClass = colorClass;



        if (cat.color === colorClass) {

            swatch.classList.add('border-white', 'ring-2', 'ring-offset-2', 'ring-offset-app-panel', 'ring-white');

        } else {

            swatch.classList.add('border-transparent');

        }



        swatch.onclick = () => {

            colorValueInput.value = colorClass;

            Array.from(palette.children).forEach(child => {

                child.classList.remove('border-white', 'ring-2', 'ring-offset-2', 'ring-offset-app-panel', 'ring-white');

                child.classList.add('border-transparent');

            });

            swatch.classList.remove('border-transparent');

            swatch.classList.add('border-white', 'ring-2', 'ring-offset-2', 'ring-offset-app-panel', 'ring-white');

        };

        palette.appendChild(swatch);

    });



    const weightSlider = document.getElementById('edit-ticker-cat-weight');

    const weightValue = document.getElementById('edit-ticker-cat-weight-value');

    weightSlider.value = cat.weight;

    weightValue.textContent = cat.weight;

    weightSlider.oninput = () => {

        weightValue.textContent = weightSlider.value;

    };



    renderEditorTickerMessages();

    document.getElementById('ticker-category-editor').classList.remove('hidden');

}



function closeTickerCategoryEditor() {

    document.getElementById('ticker-category-editor').classList.add('hidden');

    editingTickerCatId = null;

}



function saveTickerCategoryInfo() {

    const cat = appData.ticker.categories.find(c => c.id === editingTickerCatId);

    if (cat) {

        cat.name = document.getElementById('edit-ticker-cat-name').value.trim() || '陷ｷ蜥ｲ・ｧ・ｰ隴幢ｽｪ髫ｪ・ｭ陞ｳ繝ｻ;

        cat.color = document.getElementById('edit-ticker-cat-color-value').value;

        cat.weight = parseInt(document.getElementById('edit-ticker-cat-weight').value) || 10;

        saveData();

        renderTickerSettings();

        initTicker();

        showToast("郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ髫ｪ・ｭ陞ｳ螢ｹ・定ｭ厄ｽｴ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

        closeTickerCategoryEditor();

    }

}



function renderEditorTickerMessages() {

    const list = document.getElementById('editor-ticker-msg-list');

    list.innerHTML = '';



    const targetMsgs = appData.ticker.messages

        .map((msg, index) => ({ msg, index }))

        .filter(item => item.msg.categoryId === editingTickerCatId);



    if (targetMsgs.length === 0) {

        list.innerHTML = '<div class="text-xs text-gray-500 text-center py-4">郢晢ｽ｡郢昴・縺晉ｹ晢ｽｼ郢ｧ・ｸ邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ・/div>';

    } else {

        targetMsgs.forEach(item => {

            const div = document.createElement('div');

            div.className = "flex justify-between items-center border-b border-gray-800 py-2 last:border-0 group";

            div.innerHTML = `

                        <span class="text-xs text-gray-300 flex-1 mr-2 break-all">${escapeHtml(item.msg.text)}</span>

                        <button onclick="deleteTickerMessageInEditor(${item.index})" class="text-gray-500 hover:text-red-400 px-2"><i class="fas fa-trash"></i></button>

                    `;

            list.appendChild(div);

        });

    }

}



function addTickerMessageInEditor() {

    const input = document.getElementById('new-ticker-msg-input');

    const text = input.value.trim();

    if (!text) return;



    appData.ticker.messages.push({ categoryId: editingTickerCatId, text: text });

    saveData();

    input.value = '';

    renderEditorTickerMessages();

    renderTickerSettings(); // 闔会ｽｶ隰ｨ・ｰ隴厄ｽｴ隴・ｽｰ邵ｺ・ｮ邵ｺ貅假ｽ・

    initTicker();

}



function deleteTickerMessageInEditor(index) {

    const message = appData.ticker.messages[index];

    if (!message) return;

    showAppConfirm("郢晢ｽ｡郢昴・縺晉ｹ晢ｽｼ郢ｧ・ｸ邵ｺ・ｮ陷台ｼ∝求", `郢晢ｽ｡郢昴・縺晉ｹ晢ｽｼ郢ｧ・ｸ邵ｲ繝ｻ{message.text}邵ｲ髦ｪ・定恆莨∝求邵ｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂｰ繝ｻ豁・ () => {

        appData.ticker.messages.splice(index, 1);

        saveData();

        renderEditorTickerMessages();

        renderTickerSettings();

        showToast("郢晢ｽ｡郢昴・縺晉ｹ晢ｽｼ郢ｧ・ｸ郢ｧ雋樒ｎ鬮ｯ・､邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

    });

}



// 隨倥・・ｿ・ｽ陷会｣ｰ: 隴幢ｽｪ陞ｳ螟ゑｽｾ・ｩ邵ｺ・ｰ邵ｺ・｣邵ｺ貊・悴隰ｨ・ｰ郢ｧ雋橸ｽｮ貅ｯ・｣繝ｻ

function renderTickerSettings() {

    const list = document.getElementById('ticker-category-list');

    if (!list) return;

    list.innerHTML = '';



    const tickerEnabledToggle = document.getElementById('ticker-enabled-toggle');

    if (tickerEnabledToggle) {

        tickerEnabledToggle.checked = !!appData.ticker.isEnabled;

    }



    const categories = appData.ticker.categories || [];



    if (categories.length === 0) {

        list.innerHTML = '<div class="text-xs text-gray-500 text-center py-2">郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ・/div>';

    } else {

        categories.forEach(cat => {

            const div = document.createElement('div');

            div.className = "flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700 mb-2";

            div.innerHTML = `

                        <div class="flex items-center gap-2 overflow-hidden">

                            <span class="text-[10px] px-1.5 py-0.5 rounded border border-current font-bold ${cat.color}">${escapeHtml(cat.name)}</span>

                            <span class="text-[9px] text-gray-500 shrink-0">鬩･髦ｪ竏ｩ:${cat.weight}</span>

                        </div>

                        <div class="flex gap-1 shrink-0">

                            <button onclick="openTickerCategoryEditor('${cat.id}')" class="text-gray-400 hover:text-white px-2 py-1"><i class="fas fa-pen"></i></button>

                            <button onclick="deleteTickerCategory('${cat.id}')" class="text-gray-400 hover:text-red-400 px-2 py-1"><i class="fas fa-trash"></i></button>

                        </div>

                    `;

            list.appendChild(div);

        });

    }



    // 陷茨ｽｨ郢晢ｽ｡郢昴・縺晉ｹ晢ｽｼ郢ｧ・ｸ隰ｨ・ｰ邵ｺ・ｮ隴厄ｽｴ隴・ｽｰ

    const msgCountEl = document.getElementById('ticker-msg-count');

    if (msgCountEl) {

        msgCountEl.textContent = (appData.ticker.messages || []).length;

    }

}



// 隨・ｽｲ隨・ｽｲ隨・ｽｲ 闖ｫ・ｮ雎・ｽ｣驍ゅ・蝨堤ｸｺ阮呻ｼ・ｸｺ・ｾ邵ｺ・ｧ 隨・ｽｲ隨・ｽｲ隨・ｽｲ





function copyTickerPrompt() {

    const text = `陝・ｽｦ驗吝､・ｮ・｡騾・・縺・ｹ晏干ﾎ懃ｸｺ・ｮ郢昜ｹ斟礼ｹ晢ｽｼ郢ｧ・ｹ郢昴・縺・ｹ昴・縺咲ｹ晢ｽｼ騾包ｽｨ郢昴・繝ｻ郢ｧ・ｿ郢ｧ隹ｷSON陟厄ｽ｢陟台ｸ翫定抄諛医・邵ｺ蜉ｱ窶ｻ邵ｺ荳岩味邵ｺ霈費ｼ樒ｸｲ繝ｻn\n陟厄ｽ｢陟代・\n{\n  "categories": [\n    {"id": "tips", "name": "陝・ｽｦ驗吝・繝ｻ郢ｧ・ｳ郢昴・, "color": "text-blue-400", "weight": 10},\n    {"id": "quote", "name": "陋帶・・ｺ・ｺ邵ｺ・ｮ陷ｷ蟠趣ｽｨﾂ", "color": "text-yellow-400", "weight": 5}\n  ],\n  "messages": [\n    {"categoryId": "tips", "text": "郢晄亢ﾎ皮ｹ晏ｳｨ繝ｻ郢晢ｽｭ郢昴・縺醍ｹ昜ｹ昴Ε郢ｧ・ｯ郢ｧ蜑・ｽｽ・ｿ邵ｺ・｣邵ｺ・ｦ邵ｺ・ｿ郢ｧ蛹ｻ竕ｧ"},\n    {"categoryId": "quote", "text": "陞滂ｽｩ隰・亂竊堤ｸｺ・ｯ1%邵ｺ・ｮ邵ｺ・ｲ郢ｧ蟲ｨ・∫ｸｺ髦ｪ竊・9%邵ｺ・ｮ陷会ｽｪ陷牙ｸ吶堤ｸｺ繧・ｽ・}\n  ]\n}\n\n隴夲ｽ｡闔会ｽｶ:\n- 陝・ｽｦ驗吝・繝ｻ郢晢ｽ｢郢昶・繝ｻ郢晢ｽｼ郢ｧ・ｷ郢晢ｽｧ郢晢ｽｳ邵ｺ蠕｡・ｸ鄙ｫ窶ｲ郢ｧ蜿･繝ｻ陞ｳ・ｹ\n- 驕擾ｽｭ邵ｺ蜀暦ｽｰ・｡雋取鱒竊・30隴√・・ｭ蠍ｺ・ｻ・･陷繝ｻ\n- 陷ｷ驛・ｽｨ繝ｻ0闔会ｽｶ驕槫唱・ｺ・ｦ`;

    copyTextToClipboard(text);

    showToast("郢晏干ﾎ溽ｹ晢ｽｳ郢晏干繝ｨ郢ｧ蛛ｵ縺慕ｹ晄鱒繝ｻ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}





// --- 4. Render Logic (Renders UI parts) ---

function updateHeaderDate() {

    const d = getToday(); const days = ['隴鯉ｽ･', '隴帙・, '霓｣・ｫ', '雎鯉ｽｴ', '隴幢ｽｨ', '鬩･繝ｻ, '陜ｨ繝ｻ];

    document.getElementById('header-date-display').textContent = `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;



    // 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螢ｹ繝ｰ郢晢ｽｼ郢ｧ・ｸ郢晢ｽｧ郢晢ｽｳ隲繝ｻ・ｰ・ｱ郢ｧ螳夲ｽｨ・ｭ陞ｳ螟ょ愛鬮ｱ・｢邵ｺ・ｫ陷ｿ閧ｴ荳・

    const versionEl = document.getElementById('app-version-display');

    if (versionEl) versionEl.textContent = APP_VERSION;

}



function updateExamDaysDisplay() {

    const today = getToday();

    if (appData.currentSubjectId === ALL_SUBJECTS_ID) {

        let minDiff = Infinity; let found = false;

        getActiveSubjects().forEach(s => { if (s.examDate) { const d = Math.ceil((new Date(s.examDate) - today) / 86400000); if (d >= 0 && d < minDiff) { minDiff = d; found = true; } } });

        const text = found ? `騾ｶ・ｮ隶灘生竏ｪ邵ｺ・ｧ ${minDiff} 隴鯉ｽ･` : '騾ｶ・ｮ隶灘綜蠕玖ｭ幢ｽｪ髫ｪ・ｭ陞ｳ繝ｻ;

        document.getElementById('exam-days-left').textContent = text; document.getElementById('exam-days-left-mobile').textContent = text;

    } else {

        const subj = appData.subjects[appData.currentSubjectId];

        if (!subj || !subj.examDate) {

            const text = "騾ｶ・ｮ隶灘綜蠕玖ｭ幢ｽｪ髫ｪ・ｭ陞ｳ繝ｻ;

            document.getElementById('exam-days-left').textContent = text; document.getElementById('exam-days-left-mobile').textContent = text;

        } else {

            const diff = Math.ceil((new Date(subj.examDate) - today) / 86400000);

            const text = diff >= 0 ? `騾ｶ・ｮ隶灘生竏ｪ邵ｺ・ｧ ${diff} 隴鯉ｽ･` : `騾ｶ・ｮ隶灘生ﾂｰ郢ｧ繝ｻ${Math.abs(diff)} 隴鯉ｽ･驍ｨ遒≫с`;

            document.getElementById('exam-days-left').textContent = text; document.getElementById('exam-days-left-mobile').textContent = text;

        }

    }

}



function refreshSubjectSelectUI() {

    const sel = document.getElementById('subject-select'); sel.innerHTML = '';

    const allOpt = document.createElement('option'); allOpt.value = ALL_SUBJECTS_ID; allOpt.textContent = '驍ｱ荳樒ｲ・(陝・ｽｦ驗吝､・ｧ驢榊ｲｼ)'; sel.appendChild(allOpt);

    const studyGroup = document.createElement('optgroup'); studyGroup.label = "陝・ｽｦ驗吝宴・ｸ・ｭ";

    const challengeGroup = document.createElement('optgroup'); challengeGroup.label = "驍ｯ蜥擾ｽｶ螢ｹ繝｡郢晢ｽ｣郢晢ｽｬ郢晢ｽｳ郢ｧ・ｸ";

    const inactiveGroup = document.createElement('optgroup'); inactiveGroup.label = "隴幢ｽｪ陝・ｽｦ驗吶・;

    Object.values(appData.subjects).forEach(subj => {

        const opt = document.createElement('option'); opt.value = subj.id; opt.textContent = subj.name;

        if (!subj.isActive) inactiveGroup.appendChild(opt);

        else if (subj.type === 'challenge') challengeGroup.appendChild(opt);

        else studyGroup.appendChild(opt);

    });

    if (studyGroup.children.length) sel.appendChild(studyGroup);

    if (challengeGroup.children.length) sel.appendChild(challengeGroup);

    if (inactiveGroup.children.length) sel.appendChild(inactiveGroup);

    if (appData.currentSubjectId !== ALL_SUBJECTS_ID && !appData.subjects[appData.currentSubjectId]) appData.currentSubjectId = ALL_SUBJECTS_ID;

    sel.value = appData.currentSubjectId;

    sel.onchange = (e) => { appData.currentSubjectId = e.target.value; saveData(); updateUI(); };

}



function getCurrentSyllabus() {

    if (appData.currentSubjectId === ALL_SUBJECTS_ID) return getActiveSubjects().flatMap(subj => (subj.syllabus || []).map(item => ({ ...item, _subjectId: subj.id, _subjectName: subj.name })));

    return appData.subjects[appData.currentSubjectId]?.syllabus || [];

}

// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螟ゑｽｸ・ｦ鬮滂ｽｷ陋ｹ謔ｶﾂ竏ｫ蜊驍ｱ螢ｼ邇・崕繝ｻ・顔ｸｲ竏晁・陷医・骭占叉・ｭ陞滂ｽｮ隰繝ｻ竏ｴ邵ｲ竏ｵ譫夊氛驤ｴ蝨狗ｹｧ遒∽ｺ溯ｱ・ｽ｢

// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螢ｹ縺咲ｹ昴・縺也ｹ晢ｽｪ陷ｷ髦ｪ繝ｻ隴√・・ｭ邇ｲ辟夊崕・ｶ鬮ｯ闊鯉ｽ定ｬｦ・､陝偵・・邵ｺ貅ｷ閻ｰ陷医・繝ｻ郢昴・繝ｻ隰蜀怜愛鬮｢・｢隰ｨ・ｰ

function renderSlitBar() {

    const labelContainer = document.getElementById('category-labels-container');

    const slitWrapper = document.getElementById('slit-bar-wrapper');

    labelContainer.innerHTML = '';

    slitWrapper.innerHTML = '';



    let syllabus = getCurrentSyllabus();

    // 鬮ｮ・｣隴冗§・ｺ・ｦ郢晁ｼ斐≦郢晢ｽｫ郢ｧ・ｿ郢晢ｽｼ鬩包ｽｩ騾包ｽｨ

    const subjId = appData.currentSubjectId;

    if (subjId !== ALL_SUBJECTS_ID) {

        syllabus = syllabus.filter(u => isUnitInFilter(u, subjId));

    }

    if (syllabus.length === 0) return;



    // 郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ郢晢ｽｩ郢晏生ﾎ晞墓ｻ薙・

    const groups = [];

    let currentLabel = null;

    syllabus.forEach(item => {

        const labelKey = appData.currentSubjectId === ALL_SUBJECTS_ID ? item._subjectName : item.category;

        if (currentLabel !== labelKey) { groups.push({ label: labelKey, count: 1 }); currentLabel = labelKey; }

        else groups[groups.length - 1].count++;

    });

    groups.forEach(group => {

        const div = document.createElement('div');

        div.className = 'category-label-top';

        div.style.width = `${(group.count / syllabus.length) * 100}%`;



        // 隨倥・・ｿ・ｮ雎・ｽ｣繝ｻ繝ｻ隴√・・ｭ諤懷ｮ幃ｫｯ繝ｻsubstring)郢ｧ雋樒ｎ鬮ｯ・､邵ｺ蜉ｱﾂ竏壺落邵ｺ・ｮ邵ｺ・ｾ邵ｺ・ｾ髯ｦ・ｨ驕会ｽｺ

        div.textContent = group.label || '';



        // 陟｢・ｵ邵ｺ・ｮ邵ｺ貅假ｽ∫ｹ昴・繝ｻ郢晢ｽｫ郢昶・繝｣郢晄圜・ｼ蛹ｻ繝ｻ郢ｧ・ｦ郢ｧ・ｹ郢晏ｸ吶Σ郢晢ｽｼ邵ｺ・ｧ陷茨ｽｨ隴√・・｡・ｨ驕会ｽｺ繝ｻ蟲ｨ・る恆・ｽ陷会｣ｰ

        div.title = group.label || '';



        labelContainer.appendChild(div);

    });



    // 郢ｧ・ｹ郢晢ｽｪ郢昴・繝ｨ騾墓ｻ薙・

    syllabus.forEach(item => {

        const slit = document.createElement('div');

        let slitClass = `slit-item ${item.status}`;

        if (item.status === 'completed' && item.isWeak) slitClass += ' weak';

        else if (item.status === 'pending' && item.isWeak) slitClass += ' weak-pending';



        slit.className = slitClass;

        slit.style.flex = "1 1 0%";

        slit.style.display = "flex";

        slit.style.flexDirection = "column";



        // --- 1. 陷贋ｼ懊・陷ｷ髦ｪ縺顔ｹ晢ｽｪ郢ｧ・｢ (闕ｳ莨∃夂ｹ晢ｽｻ陷ｿ・ｯ陞溷ｳｨ繝ｻ闕ｳ・ｭ陞滂ｽｮ隰繝ｻ竏ｴ) ---

        const textArea = document.createElement('div');

        textArea.style.flex = '1 1 auto';

        textArea.style.display = 'flex';

        textArea.style.flexDirection = 'column';

        textArea.style.justifyContent = 'center';

        textArea.style.alignItems = 'center';

        textArea.style.minHeight = '0';

        textArea.style.padding = '4px 0';



        const text = document.createElement('span');

        text.className = 'slit-text';

        text.textContent = item.title;

        text.style.whiteSpace = 'nowrap';



        // 郢晁ｼ斐°郢晢ｽｳ郢晏現縺礼ｹｧ・､郢ｧ・ｺ髫ｪ閧ｲ・ｮ蜉ｱﾎ溽ｹｧ・ｸ郢昴・縺・

        const len = item.title.length;

        const availableHeight = 115;

        const defaultFontSize = 9;



        if (len * defaultFontSize > availableHeight) {

            const newSize = Math.max(4, Math.floor(availableHeight / len));

            text.style.fontSize = `${newSize}px`;

            text.style.letterSpacing = '0px';

        } else {

            text.style.fontSize = `${defaultFontSize}px`;

            text.style.letterSpacing = '1px';

        }

        textArea.appendChild(text);



        // --- 2. 陋ｹ・ｺ陋ｻ繝ｻ・企こ繝ｻ(騾具ｽｽ驍ｱ繝ｻ ---

        const separator = document.createElement('div');

        separator.style.flex = '0 0 1px';

        separator.style.height = '1px';



        // 隨倥・・ｿ・ｮ雎・ｽ｣繝ｻ螢ｹﾎ帷ｹｧ・､郢晏現ﾎ皮ｹ晢ｽｼ郢晏ｳｨﾂｰ邵ｺ・､隴幢ｽｪ陞ｳ蠕｡・ｺ繝ｻ騾具ｽｽ髢ｭ譴ｧ蜍ｹ)邵ｺ・ｮ陜｣・ｴ陷ｷ蛹ｻ繝ｻ魄溷､・ｳ・ｻ邵ｺ・ｮ驍ｱ螢ｹ竊鍋ｸｺ蜷ｶ・・

        const isLight = document.documentElement.classList.contains('light-mode');

        const isDarkBg = item.status === 'completed' || item.status === 'weak-pending';

        separator.style.backgroundColor = (isLight && !isDarkBg) ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.25)';

        separator.style.width = '100%';



        // --- 3. 闕ｳ遏ｩﾎ夊摎・ｺ陞ｳ螢ｹ縺顔ｹ晢ｽｪ郢ｧ・｢ (髣搾ｽｦ隰・・+ 陜玲ｨ顔・) ---

        const bottomArea = document.createElement('div');

        bottomArea.style.flex = '0 0 auto';

        bottomArea.style.display = 'flex';

        bottomArea.style.flexDirection = 'column';

        bottomArea.style.alignItems = 'center';

        bottomArea.style.padding = '2px 0';



        // 3-1. 髣搾ｽｦ隰・ｹ昴・郢ｧ・ｿ郢晢ｽｳ

        const weakBtn = document.createElement('div');

        weakBtn.className = 'slit-weak-btn';

        weakBtn.style.flex = '0 0 12px';

        weakBtn.style.height = '12px';

        weakBtn.style.fontSize = '9px';

        weakBtn.style.display = 'flex';

        weakBtn.style.alignItems = 'center';

        weakBtn.style.justifyContent = 'center';

        if (item.isWeak) weakBtn.classList.add('active');

        weakBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';

        weakBtn.onclick = (e) => toggleUnitWeakGlobal(item._subjectId || appData.currentSubjectId, item.id, e);



        // 3-2. 陷ｻ・ｨ陜玲ｨ顔・髯ｦ・ｨ驕会ｽｺ

        const lapDiv = document.createElement('div');

        lapDiv.style.flex = '0 0 10px';

        lapDiv.style.height = '10px';

        lapDiv.style.fontSize = '9px';

        lapDiv.style.lineHeight = '10px';

        lapDiv.className = 'font-mono text-center w-full';

        const count = item.lapCount || 0;

        lapDiv.textContent = count;

        if (item.status === 'completed') {

            lapDiv.style.color = 'rgba(0,0,0,0.7)';

            if (count >= 2) lapDiv.style.fontWeight = 'bold';

        } else {

            // 隨倥・・ｿ・ｮ雎・ｽ｣繝ｻ螢ｹﾎ帷ｹｧ・､郢晏現ﾎ皮ｹ晢ｽｼ郢晏ｳｨ竊醍ｹｧ陋ｾ・ｻ蜻域椢陝・干ﾂ竏壹Β郢晢ｽｼ郢ｧ・ｯ郢晢ｽ｢郢晢ｽｼ郢晏ｳｨ竊醍ｹｧ閾･蜊隴√・・ｭ繝ｻ

            lapDiv.style.color = (isLight && item.status !== 'weak-pending') ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';

        }



        bottomArea.appendChild(weakBtn);

        bottomArea.appendChild(lapDiv);



        slit.appendChild(textArea);

        slit.appendChild(separator);

        slit.appendChild(bottomArea);



        slitWrapper.appendChild(slit);

    });

}





// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螟仙ｱｮ隴冗§・ｺ・ｦ郢晁ｼ斐≦郢晢ｽｫ郢ｧ・ｿ郢晢ｽｼUI隰蜀怜愛繝ｻ逎ｯ繝ｻ陋ｻ蜉ｱ縺｡郢ｧ・ｰ陝・ｽｾ陟｢諛翫・鬩･蟠趣ｽ､繝ｻ雉憺ｫｯ・､闖ｫ・ｮ雎・ｽ｣繝ｻ繝ｻ

function renderDifficultyFilter() {

    const area = document.getElementById('difficulty-filter-area');

    const subjId = appData.currentSubjectId;

    if (subjId === ALL_SUBJECTS_ID || !appData.subjects[subjId] || appData.subjects[subjId].type === 'challenge') {

        area.classList.add('hidden'); return;

    }

    const subj = appData.subjects[subjId];

    const labels = subj.difficultyLabels || {};



    // 陞ｳ貊・怙邵ｺ・ｫsyllabus邵ｺ・ｫ闖ｴ・ｿ郢ｧ荳奇ｽ檎ｸｺ・ｦ邵ｺ繝ｻ・矩ｫｮ・｣隴冗§・ｺ・ｦ邵ｺ・ｰ邵ｺ鬘鯉ｽ｡・ｨ驕会ｽｺ繝ｻ逎ｯ繝ｻ陋ｻ蜉ｱ繝ｻ闕ｳ・ｭ髴・ｽｫ郢ｧ雋橸ｽｱ證ｮ蟷慕ｸｺ蜉ｱ窶ｻSet邵ｺ・ｸ繝ｻ繝ｻ

    const usedDiffs = new Set();

    (subj.syllabus || []).forEach(u => {

        const d = u.difficulty;

        if (d) {

            if (Array.isArray(d)) d.forEach(val => usedDiffs.add(val));

            else usedDiffs.add(d);

        }

    });



    if (usedDiffs.size === 0) { area.classList.add('hidden'); return; }



    area.classList.remove('hidden');

    area.innerHTML = '<span class="text-[9px] text-gray-500 mr-1 flex items-center">陝・ｽｾ髮趣ｽ｡:</span>';

    const filter = subj.difficultyFilter || Object.keys(labels);

    const order = subj.difficultyOrder || Object.keys(labels);



    // usedDiffs邵ｺ・ｫ陷ｷ・ｫ邵ｺ・ｾ郢ｧ蠕鯉ｽ狗ｹｧ繧・・郢ｧ蛛ｵﾂ・孑der鬯・・竊鍋ｹｧ・ｽ郢晢ｽｼ郢晏現・邵ｺ・ｦ髯ｦ・ｨ驕会ｽｺ

    order.filter(key => usedDiffs.has(key)).forEach(key => {

        const isOn = filter.includes(key);

        const label = labels[key] || key;

        const chip = document.createElement('button');

        // 郢昴・縺倡ｹｧ・､郢晢ｽｳ髫ｱ・ｿ隰ｨ・ｴ繝ｻ螢ｻ・ｸ・ｸ邵ｺ・ｿ邵ｺ・ｨ豼ｶ・ｲ

        chip.className = `text-[10px] px-2.5 py-1 rounded-full border transition-all flex items-center justify-center min-w-[24px] ${isOn

            ? 'bg-app-accent text-app-dark border-app-accent font-bold shadow-sm'

            : 'bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-500'}`;

        chip.textContent = label;

        chip.onclick = () => {

            if (isOn) {

                subj.difficultyFilter = filter.filter(f => f !== key);

            } else {

                subj.difficultyFilter = [...filter, key];

            }

            saveData(); updateUI();

        };

        area.appendChild(chip);

    });

}



// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螢ｹ繝ｻ郢晢ｽｼ郢晢｣ｰ騾包ｽｻ鬮ｱ・｢邵ｺ・ｮ郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ陋ｻ・･鬨ｾ・ｲ隰仙干繝ｰ郢晢ｽｼ隰蜀怜愛

function renderCategoryProgress(syllabus) {

    const section = document.getElementById('category-progress-section');

    const container = document.getElementById('category-progress-bars');

    if (!section || !container) return;



    // 郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ陋ｻ・･邵ｺ・ｫ鬮ｮ繝ｻ・ｨ繝ｻ

    const catMap = {};

    syllabus.forEach(u => {

        const cat = u.category || '隴幢ｽｪ陋ｻ繝ｻ・｡繝ｻ;

        if (!catMap[cat]) catMap[cat] = { total: 0, done: 0 };

        catMap[cat].total++;

        if (u.status === 'completed') catMap[cat].done++;

    });

    const categories = Object.entries(catMap);



    // 郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ2陋溷玄謔ｴ雋・邵ｺ・ｪ郢ｧ陋ｾ謦ｼ髯ｦ・ｨ驕会ｽｺ

    if (categories.length < 2) { section.classList.add('hidden'); return; }

    section.classList.remove('hidden');

    container.innerHTML = '';



    categories.forEach(([name, { total, done }]) => {

        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        const isAllDone = pct === 100;

        const row = document.createElement('div');

        row.className = 'flex items-center gap-2';

        row.innerHTML = `

                    <span class="text-[10px] ${isAllDone ? 'text-emerald-400 font-bold' : 'text-gray-400'} w-24 truncate shrink-0" title="${name}">${name}</span>

                    <div class="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">

                        <div class="h-full rounded-full transition-all duration-500 ${isAllDone ? 'bg-emerald-400' : 'bg-app-accent'}" style="width:${pct}%"></div>

                    </div>

                    <span class="text-[9px] ${isAllDone ? 'text-emerald-400 font-bold' : 'text-gray-500'} w-12 text-right shrink-0">${isAllDone ? '隨ｨ繝ｻ : ''} ${done}/${total}</span>

                `;

        container.appendChild(row);

    });

}



function renderMonthHeatmap(subj) {

    const container = document.getElementById('slit-bar-wrapper'); container.innerHTML = '';

    const labels = document.getElementById('category-labels-container'); labels.innerHTML = '';

    const start = subj.startDate ? new Date(subj.startDate) : getToday();

    const end = subj.examDate ? new Date(subj.examDate) : new Date(start.getFullYear(), start.getMonth() + 5, 1);

    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cursor <= end || cursor.getMonth() === end.getMonth()) {

        const year = cursor.getFullYear(); const month = cursor.getMonth();

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let doneCount = 0;

        for (let d = 1; d <= daysInMonth; d++) { if (subj.challengeHistory[formatDate(new Date(year, month, d))]) doneCount++; }

        const percent = Math.round((doneCount / daysInMonth) * 100);

        const lDiv = document.createElement('div'); lDiv.className = 'category-label-top'; lDiv.style.flex = "1"; lDiv.textContent = `${month + 1}隴帙・; labels.appendChild(lDiv);

        const bDiv = document.createElement('div'); bDiv.className = 'month-heat-item';

        bDiv.innerHTML = `<div class="month-heat-fill" style="height: ${percent}%; background-color: rgba(251, 191, 36, ${Math.max(0.2, percent / 100)});"></div><span class="month-heat-label">${percent}%</span>`;

        container.appendChild(bDiv);

        cursor.setMonth(cursor.getMonth() + 1);

        if (cursor > end && cursor.getMonth() !== end.getMonth()) break;

    }

}

// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螟奇ｽｨ蛟ｬ鮖ｸ騾包ｽｻ鬮ｱ・｢邵ｺ・ｮ郢晢ｽｪ郢ｧ・ｹ郢晏現・定ｬ蜀怜愛邵ｺ蜷ｶ・矩ｫ｢・｢隰ｨ・ｰ

function renderRecordLists() {
    const dateStr = formatDate(currentRecordDate);
    document.getElementById('record-date-display').textContent = dateStr;
    const isToday = dateStr === getTodayStr();
    document.getElementById('record-date-label').textContent = isToday ? "今日の予定" : "予定リスト";

    // 今日のリスト表示
    const todaysList = document.getElementById('todays-list');
    todaysList.innerHTML = '';
    const fullSchedule = appData.schedules[dateStr] || [];
    
    // 選択中の科目に合わせてスケジュールをフィルタリング
    const schedule = appData.currentSubjectId === ALL_SUBJECTS_ID 
        ? fullSchedule 
        : fullSchedule.filter(t => t.subjectId === appData.currentSubjectId);

    // 単元数/単語数の表示
    const currentSubjForCount = appData.currentSubjectId !== ALL_SUBJECTS_ID ? appData.subjects[appData.currentSubjectId] : null;
    if (currentSubjForCount && currentSubjForCount.isVocab) {
        let wordCount = 0;
        schedule.filter(t => t.unitId && t.unitId.startsWith('vocab_')).forEach(t => {
            const parts = t.unitId.split('_');
            if (parts.length === 3) {
                const s = parseInt(parts[1], 10), e = parseInt(parts[2], 10);
                if (!isNaN(s) && !isNaN(e)) wordCount += (e - s + 1);
            }
        });
        document.getElementById('record-task-count').textContent = `${wordCount} 単語`;
    } else {
        document.getElementById('record-task-count').textContent = `${schedule.length} 単元`;
    }

    if (schedule.length === 0) {
        todaysList.innerHTML = `<div class="text-xs text-gray-500 text-center py-8">予定はありません<br><span class="text-[9px] opacity-70">${isToday ? '管理画面から単元を追加しましょう' : ''}</span></div>`;
    } else {
        // カテゴリ別にグループ化
        const groups = {};
        schedule.forEach(task => {
            const subj = appData.subjects[task.subjectId];
            if (!subj) return;
            let unit = (subj.syllabus || []).find(u => u.id === task.unitId);
            if (!unit && subj.isVocab && task.unitId.startsWith('vocab_')) {
                const parts = task.unitId.split('_');
                const start = parts[1];
                const end = parts[2];
                unit = {
                    id: task.unitId,
                    title: `${start} ~ ${end}`,
                    category: '単語',
                    status: 'pending'
                };
            }
            if (!unit) return;
            const groupKey = unit.category || subj.name || '未分類';
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push({ unit, subj, task });
        });
        renderGroupedList(todaysList, groups, true, 'sched');
    }



    // 次のタスク/未達成単元リスト表示
    const queueList = document.getElementById('queue-list');
    queueList.innerHTML = '';
    const currentSubj = appData.subjects[appData.currentSubjectId];

    if (appData.currentSubjectId !== ALL_SUBJECTS_ID && currentSubj && currentSubj.type === 'study') {
        document.getElementById('current-subject-name-record').textContent = currentSubj.name;
        const pendingUnits = (currentSubj.syllabus || []).filter(u => u.status === 'pending');
        const todaysUnitIds = schedule.map(s => s.unitId);
        const displayUnits = pendingUnits.filter(u => !todaysUnitIds.includes(u.id));

        if (displayUnits.length === 0) {
            queueList.innerHTML = '<div class="text-xs text-gray-500 text-center py-4">未達成の予定はありません</div>';
        } else {
            const groups = {};
            displayUnits.forEach(unit => {
                const groupKey = unit.category || '未分類';
                if (!groups[groupKey]) groups[groupKey] = [];
                groups[groupKey].push({ unit, subj: currentSubj, task: { subjectId: currentSubj.id } });
            });
            renderGroupedList(queueList, groups, false, 'queue');
        }
    } else {
        document.getElementById('current-subject-name-record').textContent = '未選択または記録対象外';
        queueList.innerHTML = '<div class="text-xs text-gray-500 text-center py-4">対象科目が選択されていないか、<br>未達成予定を表示できない科目です</div>';
    }



    // チャレンジ/単語帳/未達成エリアの表示制御
    const challengeArea = document.getElementById('challenge-action-area');
    const vocabArea = document.getElementById('vocab-action-area'); // 隨倥・・ｿ・ｽ陷会｣ｰ: 陷雁ｩ・ｪ讒ｫ・ｭ・ｦ驗吝・縺顔ｹ晢ｽｪ郢ｧ・｢
    const queueSection = document.getElementById('record-queue-section'); // 未達成セクション

    // 闕ｳﾂ隴鯉ｽｦ鬮ｱ讚・ｽ｡・ｨ驕会ｽｺ邵ｺ・ｫ邵ｺ蜉ｱ窶ｻ霑･・ｶ隲ｷ荵晢ｽ堤ｹ晢ｽｪ郢ｧ・ｻ郢昴・繝ｨ
    challengeArea.classList.add('hidden');
    vocabArea.classList.add('hidden');
    const settingsContainer = document.getElementById('vocab-settings-container');
    // 隨倥・陝・ｽｦ驗吝宴・ｸ・ｭ邵ｺ・ｯFirestore邵ｺ・ｮ陷ｷ譴ｧ謔・ｹ晢ｽｪ郢ｧ・ｹ郢晉ｿｫ繝ｻ驍ｨ讙守ｽｰ邵ｺ・ｧupdateUI遶頑ｱenderRecordLists邵ｺ謔滉ｻ也ｸｺ・ｰ郢ｧ蠕娯ｻ郢ｧ繝ｻ
    //   髫ｪ・ｭ陞ｳ螢ｹﾎ鍋ｹ昜ｹ斟礼ｹ晢ｽｼ郢ｧ蟶晏恚邵ｺ霈披・邵ｺ繝ｻ・育ｸｺ繝ｻ竊鍋ｸｺ蜷ｶ・九・蛹ｻ・・ｹｧ蠕娯ｲ郢晢ｽ｡郢昜ｹ斟礼ｹ晢ｽｼ雎ｸ莠･・､・ｱ郢晁・縺堤ｸｺ・ｮ騾ｵ貅倥・陷ｴ貅ｷ螻冗ｸｺ・ｰ邵ｺ・｣邵ｺ貊ゑｽｼ繝ｻ
    if (settingsContainer && !(typeof vocabSession !== 'undefined' && vocabSession.isActive)) {
        settingsContainer.classList.add('hidden');
        settingsContainer.classList.remove('flex');
    }
    queueSection.style.display = 'block'; // 郢昴・繝ｵ郢ｧ・ｩ郢晢ｽｫ郢晏現繝ｻ髯ｦ・ｨ驕会ｽｺ
    todaysList.style.display = 'block'; // 郢昴・繝ｵ郢ｧ・ｩ郢晢ｽｫ郢晏現繝ｻ髯ｦ・ｨ驕会ｽｺ
    document.getElementById('record-task-count').parentElement.style.display = 'flex'; // 郢晏･繝｣郢敖郢晢ｽｼ鬩幢ｽｨ陋ｻ繝ｻﾎ懃ｹｧ・ｻ郢昴・繝ｨ

    if (currentSubj && currentSubj.type === 'challenge') {
        challengeArea.classList.remove('hidden');
        const isDone = !!currentSubj.challengeHistory[dateStr];
        const btn = document.getElementById('challenge-toggle-btn');
        const btnText = document.getElementById('challenge-btn-text');

        if (isDone) {
            btn.className = "w-full py-4 rounded-xl font-bold text-lg shadow-lg bg-app-success text-app-dark flex items-center justify-center gap-2";
            btnText.textContent = "チャレンジ完了！！";
            btn.onclick = () => toggleChallengeDate(currentSubj.id, dateStr, false);
        } else {
            btn.className = "w-full py-4 rounded-xl font-bold text-lg shadow-lg bg-gray-700 text-gray-400 hover:bg-challenge-gold hover:text-app-dark transition-all flex items-center justify-center gap-2";
            btnText.textContent = "未達成（タップして完了）";
            btn.onclick = () => toggleChallengeDate(currentSubj.id, dateStr, true);
        }
    } else if (currentSubj && currentSubj.isVocab) {
        // ★追加: 単語帳が選ばれている場合の特殊UI表示
        vocabArea.classList.remove('hidden');
        queueSection.style.display = 'none'; // 通常のキューは隠す
        document.getElementById('record-task-count').parentElement.style.display = 'flex'; // 上部の今日の予定リストは残す
        todaysList.style.display = 'block'; // 今日の予定リストを表示

        // 今日の予定の単語数
        const schedule = appData.schedules[dateStr] || [];
        const pendingVocabTasks = schedule.filter(t => {
            if (t.subjectId !== currentSubj.id) return false;
            return t.unitId && t.unitId.startsWith('vocab_');
        });

        // 実際の単語数を計算（各範囲の差分を合計）
        let totalWordCount = 0;
        pendingVocabTasks.forEach(t => {
            const parts = t.unitId.split('_');
            if (parts.length === 3) {
                const start = parseInt(parts[1], 10);
                const end = parseInt(parts[2], 10);
                if (!isNaN(start) && !isNaN(end)) totalWordCount += (end - start + 1);
            }
        });

        todaysList.innerHTML = `
            <div class="flex items-center justify-between p-4 bg-gray-800 rounded-2xl border border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer group shadow-md mt-2" onclick="showVocabRangeModal('today')">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-app-accent/20 flex items-center justify-center text-app-accent group-hover:bg-app-accent group-hover:text-app-dark transition-colors shadow-inner">
                        <i class="fas fa-play ml-1 text-lg"></i>
                    </div>
                    <div>
                        <div class="font-black text-gray-100 text-lg tracking-wide">今日の予定</div>
                        <div class="text-[10px] font-bold text-gray-400 mt-1">ここをタップして開始 <span class="text-app-accent ml-2">${totalWordCount} 単語</span></div>
                    </div>
                </div>
                <i class="fas fa-chevron-right text-gray-600 group-hover:text-white transition-colors"></i>
            </div>
        `;
    }

}



// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螢ｹ縺咲ｹ昴・縺也ｹ晢ｽｪ陋ｻ・･郢ｧ・ｰ郢晢ｽｫ郢晢ｽｼ郢晏干ﾎ懃ｹｧ・ｹ郢晏沺邱帝包ｽｻ

const _collapsedGroups = {};

function renderGroupedList(container, groups, isScheduled, prefix) {

    Object.entries(groups).forEach(([categoryName, items]) => {

        const key = `${prefix}_${categoryName}`;

        if (typeof _collapsedGroups[key] === 'undefined') _collapsedGroups[key] = false;



        // 郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ陷繝ｻ繝ｻ陞ｳ蠕｡・ｺ繝ｻ辟・

        const total = items.length;

        const done = items.filter(i => i.unit.status === 'completed').length;

        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        const isAllDone = pct === 100;



        // 郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ郢晏･繝｣郢敖郢晢ｽｼ

        const header = document.createElement('div');

        header.className = 'flex items-center gap-2 px-3 py-2 cursor-pointer select-none border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors';

        header.innerHTML = `

                    <i class="fas fa-chevron-${_collapsedGroups[key] ? 'right' : 'down'} text-[8px] text-gray-500 w-3"></i>

                    <span class="text-[11px] font-bold ${isAllDone ? 'text-emerald-400' : 'text-gray-300'} flex-1 truncate">${categoryName}</span>

                    <div class="flex items-center gap-2 shrink-0">

                        <div class="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">

                            <div class="h-1.5 rounded-full transition-all ${isAllDone ? 'bg-emerald-400' : 'bg-app-accent'}" style="width:${pct}%"></div>

                        </div>

                        <span class="text-[9px] ${isAllDone ? 'text-emerald-400 font-bold' : 'text-gray-500'} w-10 text-right">${done}/${total}</span>

                    </div>

                `;

        header.onclick = () => {

            _collapsedGroups[key] = !_collapsedGroups[key];

            renderRecordLists();

        };

        container.appendChild(header);



        // 闕ｳ・ｭ髴・ｽｫ繝ｻ蝓滄∪郢ｧ鄙ｫ笳・ｸｺ貅倪茜闕ｳ・ｭ邵ｺ・ｯ鬮ｱ讚・ｽ｡・ｨ驕会ｽｺ繝ｻ繝ｻ

        if (!_collapsedGroups[key]) {

            items.forEach(({ unit, subj, task }) => {

                const row = createTaskRow(unit, isScheduled ? subj.name : null, isScheduled, task);

                row.style.paddingLeft = '28px'; // 郢ｧ・､郢晢ｽｳ郢昴・ﾎｦ郢昴・

                container.appendChild(row);

            });

        }

    });

}



// 隨倥・・ｿ・ｮ雎・ｽ｣雋ょ現竏ｩ繝ｻ螢ｹ縺｡郢ｧ・ｹ郢ｧ・ｯ髯ｦ蠕鯉ｽ定抄諛医・邵ｺ蜷ｶ・矩ｫ｢・｢隰ｨ・ｰ

function createTaskRow(item, subjectName, isScheduled, taskData) {
    const row = document.createElement('div');
    const subjData = appData.subjects[taskData?.subjectId];
    const isVocabTask = subjData && subjData.isVocab;
    const isCompleted = item.status === 'completed';

    const leftDiv = document.createElement('div');
    leftDiv.className = "flex items-center gap-3 flex-1 min-w-0";

    const checkDiv = document.createElement('div');

    if (isVocabTask) {
        // 陷雁ｩ・ｪ讒ｫ・ｸ・ｳ郢ｧ・ｿ郢ｧ・ｹ郢ｧ・ｯ邵ｺ・ｮ陜｣・ｴ陷ｷ蛹ｻ繝ｻ郢昶・縺臥ｹ昴・縺醍ｹ晄㈱繝｣郢ｧ・ｯ郢ｧ・ｹ郢ｧ蟶晄直髯ｦ・ｨ驕会ｽｺ邵ｺ・ｫ邵ｺ蜉ｱﾂ竏ｬ・｡謔溘・闖ｴ阮吶・郢ｧ・ｿ郢昴・繝ｻ邵ｺ・ｧ隰悶・・ｮ螟ゑｽｯ繝ｻ蟲・ｹ晢ｽ｢郢晢ｽｼ郢敖郢晢ｽｫ郢ｧ蟶晏ｹ慕ｸｺ繝ｻ
        checkDiv.style.display = 'none';
        row.className = "flex items-center justify-between p-3 border-b border-gray-700/50 hover:bg-gray-800/50 transition-colors group cursor-pointer";

        // 陞ｳ蠕｡・ｺ繝ｻ・ｸ蛹ｻ竏ｩ邵ｺ・ｧ郢ｧ繧奇ｽｦ蜀ｶ・ｦ螟ょ飭邵ｺ・ｫ陋ｻ繝ｻﾂｰ郢ｧ荵晢ｽ育ｸｺ繝ｻ竊鍋ｸｺ蜷ｶ・玖怎・ｦ騾・・・ｼ莠･・･・ｽ邵ｺ・ｿ繝ｻ繝ｻ
        if (isCompleted) row.classList.add('opacity-50');

        row.onclick = () => {
            if (!document.getElementById('vocab-range-modal').classList.contains('hidden') || (typeof vocabSession !== 'undefined' && vocabSession.isActive)) {
                if (typeof showToast === 'function') showToast('隴鯉ｽ｢邵ｺ・ｫ陝・ｽｦ驗吝､蛻､鬮ｱ・｢邵ｺ遒∝ｹ慕ｸｺ荵晢ｽ檎ｸｺ・ｦ邵ｺ繝ｻ竏ｪ邵ｺ繝ｻ, true);
                return;
            }

            appData.currentSubjectId = taskData.subjectId;
            let startVal = '';
            let endVal = '';

            // 陷茨ｽｨ闖ｴ阮吶・邵ｲ蠕｡・ｻ鬆大ｾ狗ｸｺ・ｮ闔莠･・ｮ螢ｹﾂ髦ｪ・堤ｹｧ・ｯ郢晢ｽｪ郢昴・縺醍ｸｺ蜉ｱ笳・撻・ｴ陷ｷ蛹ｻ繝ｻ邵ｲ竏昴・闖ｫ譎芽風郢ｧ・ｿ郢ｧ・ｹ郢ｧ・ｯ邵ｺ荵晢ｽ芽ｭ崢陝・ｸ翫・隴崢陞滂ｽｧ郢ｧ螳夲ｽｨ閧ｲ・ｮ蜉ｱ笘・ｹｧ荵敖ｰ邵ｲ竏晁・驍乗鱒竊馴ｫ｢蜿･・ｧ荵昶・驍ｨ繧・ｽｺ繝ｻ・堤ｸｺ・ｾ邵ｺ・ｨ郢ｧ竏夲ｽ・
            // createTaskRow邵ｺ・ｯ霑ｴ・ｾ霑･・ｶ郢ｧ・ｹ郢ｧ・ｱ郢ｧ・ｸ郢晢ｽ･郢晢ｽｼ郢晢ｽｫ陷雁・ｽｽ謳ｾ・ｼ繝ｻnit繝ｻ蟲ｨ縲定惱・ｼ邵ｺ・ｰ郢ｧ蠕鯉ｽ狗ｸｺ・ｮ邵ｺ・ｧ邵ｲ竏壺落邵ｺ・ｮunit邵ｺ・ｮ驕ｽ繝ｻ蟲・ｹｧ雋槭・郢ｧ蠕鯉ｽ・
            const parts = item.id.split('_');
            if (parts.length === 3) {
                startVal = parts[1];
                endVal = parts[2];
            }

            document.getElementById('vocab-free-start').value = startVal;
            document.getElementById('vocab-free-end').value = endVal;

            if (typeof closeModal === 'function') closeModal();
            if (typeof switchTab === 'function') switchTab('record-screen');

            // 髢ｾ・ｪ騾包ｽｱ郢晢ｽ｢郢晢ｽｼ郢晏ｳｨ竊堤ｸｺ・ｯ騾｡・ｰ邵ｺ・ｪ郢ｧ鄙ｫﾂ竏ｫ蟲ｩ隰暦ｽ･鬮｢蜿･・ｧ荵昶雷邵ｺ螢ｹ竊鍋ｹ晢ｽ｢郢晢ｽｼ郢敖郢晢ｽｫ郢ｧ蟶晏ｹ慕ｸｺ繝ｻ
            showVocabRangeModal('today', item.id);
            updateUI();
        };
    } else {
        row.className = "flex items-center justify-between p-3 border-b border-gray-700/50 hover:bg-gray-800/50 transition-colors group";

        // 鬨ｾ螢ｼ・ｸ・ｸ郢ｧ・ｿ郢ｧ・ｹ郢ｧ・ｯ邵ｺ・ｮ郢昶・縺臥ｹ昴・縺醍ｹ晄㈱繝｣郢ｧ・ｯ郢ｧ・ｹ陷・ｽｦ騾・・
        checkDiv.className = `w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer transition-all active:scale-90 ${isCompleted ? 'bg-app-success border-app-success text-app-dark' : 'border-gray-500 text-transparent active:border-app-accent'}`;
        checkDiv.innerHTML = '<i class="fas fa-check text-xs"></i>';
        checkDiv.onclick = (e) => {
            e.stopPropagation();
            toggleStatusGlobal(taskData.subjectId, item.id);
        };
        checkDiv.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleStatusGlobal(taskData.subjectId, item.id);
        });
    }

    const textDiv = document.createElement('div');
    textDiv.className = "flex flex-col truncate";

    const titleDiv = document.createElement('div');
    titleDiv.className = `text-xs font-medium truncate ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'}`;
    titleDiv.textContent = item.title;

    const subDiv = document.createElement('div');
    subDiv.className = "text-[9px] text-gray-500 truncate";
    if (subjectName) subDiv.textContent = `[${subjectName}]`;

    textDiv.appendChild(titleDiv);
    textDiv.appendChild(subDiv);
    leftDiv.appendChild(checkDiv);
    leftDiv.appendChild(textDiv);
    row.appendChild(leftDiv);

    if (isScheduled && taskData) {
        const delBtn = document.createElement('button');
        delBtn.className = "text-gray-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity";
        delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        delBtn.onclick = () => {
            const dateStr = formatDate(currentRecordDate);
            const list = appData.schedules[dateStr];
            if (list) {
                const idx = list.indexOf(taskData);
                if (idx > -1) removeTaskFromDate(dateStr, idx);
            }
        };
        row.appendChild(delBtn);
    } else if (!isScheduled) {

        const addBtn = document.createElement('button');

        addBtn.className = "text-app-accent hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity";

        addBtn.innerHTML = '<i class="fas fa-plus-circle"></i>';

        addBtn.onclick = () => {

            const dateStr = formatDate(currentRecordDate);

            if (!appData.schedules[dateStr]) appData.schedules[dateStr] = [];

            appData.schedules[dateStr].push({ subjectId: taskData.subjectId, unitId: item.id });

            saveData();

            renderRecordLists();

        };

        row.appendChild(addBtn);

    }



    return row;

}







function toggleUnitWeakGlobal(subjectId, unitId, event) {

    if (event) event.stopPropagation();

    const subj = appData.subjects[subjectId];

    const item = (subj?.syllabus || []).find(s => s.id === unitId);

    if (item) {

        item.isWeak = !item.isWeak;

        saveData();

        updateUI();

    }

}



// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螢ｼ謐芽摎讒ｭ縺咲ｹｧ・ｦ郢晢ｽｳ郢昜ｺ･・ｯ・ｾ陟｢諛翫・郢ｧ・ｹ郢昴・繝ｻ郢ｧ・ｿ郢ｧ・ｹ陋ｻ繝ｻ蟠幃ｫ｢・｢隰ｨ・ｰ

function toggleStatusGlobal(subjectId, unitId) {

    const subj = appData.subjects[subjectId];

    const item = (subj?.syllabus || []).find(s => s.id === unitId);

    if (!item) return;



    if (item.status === 'pending') {

        // [1] 隴幢ｽｪ陞ｳ蠕｡・ｺ繝ｻ遶翫・陞ｳ蠕｡・ｺ繝ｻ(1陷ｻ・ｨ騾ｶ・ｮ鬩慕夢繝ｻ)

        item.status = 'completed';

        item.lapCount = (item.lapCount || 0) + 1;

        item.completedDate = getTodayStr();

        showToast(`陞ｳ蠕｡・ｺ繝ｻ・ｼ繝ｻ(霑ｴ・ｾ陜ｨ・ｨ: ${item.lapCount}陷ｻ・ｨ騾ｶ・ｮ)`);

        // syncToGoogleTasks(item.title, true);

    } else {

        // [2] 陞ｳ蠕｡・ｺ繝ｻ・ｸ蛹ｻ竏ｩ 遶翫・郢ｧ・ｯ郢晢ｽｪ郢昴・縺醍ｸｺ霈費ｽ檎ｸｺ貅ｷ・ｰ・ｴ陷ｷ繝ｻ

        // 驕抵ｽｺ髫ｱ髦ｪ繝郢ｧ・､郢ｧ・｢郢晢ｽｭ郢ｧ・ｰ郢ｧ雋槭・邵ｺ繝ｻ

        const isLapUp = confirm(`邵ｲ莉呎拷陜玲ｫ・ｽｨ蛟ｬ鮖ｸ邵ｲ譖ｾn邵ｲ繝ｻ{item.title}邵ｲ髦ｪ繝ｻ陷ｻ・ｨ陜玲ｨ顔・郢ｧ雋橸ｽ｢蜉ｱ・・ｸｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂｰ繝ｻ豁ハ\n[OK] = 陷ｻ・ｨ陜玲ｨ顔・郢ｧ雋橸ｽ｢蜉ｱ・・ｸｺ繝ｻ(+1)\n[郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ郢ｧ・ｻ郢晢ｽｫ] = 隴幢ｽｪ陞ｳ蠕｡・ｺ繝ｻ竊楢ｬ鯉ｽｻ邵ｺ蜈ｪ);



        if (isLapUp) {

            // 陷ｻ・ｨ陜玲ｨ顔・郢ｧ雋橸ｽ｢蜉ｱ・・ｸｺ蜉ｱ窶ｻ邵ｲ竏晢ｽｮ蠕｡・ｺ繝ｻ蠕狗ｹｧ蜑・ｽｻ鬆大ｾ狗ｸｺ・ｫ隴厄ｽｴ隴・ｽｰ

            item.lapCount = (item.lapCount || 1) + 1;

            item.completedDate = getTodayStr();

            showToast(`陷ｻ・ｨ陜玲ｫ・ｽｨ蛟ｬ鮖ｸ郢ｧ蜻亥ｳｩ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・(霑ｴ・ｾ陜ｨ・ｨ: ${item.lapCount}陷ｻ・ｨ騾ｶ・ｮ)`);

            // syncToGoogleTasks(item.title, true); // Google陋幢ｽｴ邵ｺ・ｫ郢ｧ繧・ｽｿ・ｵ邵ｺ・ｮ邵ｺ貅假ｽ・ｨｾ螟り｡・

        } else {

            // 隴幢ｽｪ陞ｳ蠕｡・ｺ繝ｻ竊楢ｬ鯉ｽｻ邵ｺ繝ｻ(Undo)

            item.status = 'pending';

            item.completedDate = null;

            if (item.lapCount > 0) item.lapCount--;

            showToast("隴幢ｽｪ陞ｳ蠕｡・ｺ繝ｻ竊楢ｬ鯉ｽｻ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

            // syncToGoogleTasks(item.title, false);

        }

    }



    recordHistory();

    updateUI();

}



// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螢ｹ繝ｻ郢ｧ・ｿ郢晢ｽｳ郢ｧ蜻域ｬｾ邵ｺ蜉ｱ笳・ｿｸ・ｬ鬮｢阮吮・騾包ｽｻ鬮ｱ・｢郢ｧ蜻亥ｳｩ隴・ｽｰ邵ｺ蜉ｱ窶ｻ豼ｶ・ｲ郢ｧ雋橸ｽ､蟲ｨ竏ｴ郢ｧ遏ｩ譛ｪ隰ｨ・ｰ

function toggleChallengeDate(subjId, dateStr, forceState) {

    const subj = appData.subjects[subjId];

    if (!subj) return;



    // 郢昴・繝ｻ郢ｧ・ｿ邵ｺ・ｮ闖ｫ譎擾ｽｭ蛛・ｽｼ繝ｻN/OFF陋ｻ繝ｻ・願ｭ厄ｽｿ邵ｺ闌ｨ・ｼ繝ｻ

    if (forceState) {

        subj.challengeHistory[dateStr] = true;

    } else {

        delete subj.challengeHistory[dateStr];

    }

    saveData();



    // 隨倥・纃ｾ髫輔・・ｼ螢ｹ・・ｸｺ阮吶帝・蜻医・郢晢ｽｪ郢ｧ・ｹ郢晏現・定怙閧ｴ邱帝包ｽｻ邵ｺ蜉ｱ窶ｻ邵ｲ竏壹・郢ｧ・ｿ郢晢ｽｳ邵ｺ・ｮ豼ｶ・ｲ郢ｧ雋槫初陟趣ｽｧ邵ｺ・ｫ陞溷ｳｨ竏ｴ郢ｧ繝ｻ

    if (document.getElementById('challenge-screen').classList.contains('active')) {

        renderChallengeScreen();

    }



    // 闔画じ繝ｻ騾包ｽｻ鬮ｱ・｢繝ｻ逎ｯﾂ・ｲ隰仙干縺堤ｹ晢ｽｩ郢晁ｼ費ｽ・ｹｧ・ｫ郢晢ｽｬ郢晢ｽｳ郢敖郢晢ｽｼ繝ｻ蟲ｨ・り惺譴ｧ謔・ｸｺ霈披雷郢ｧ繝ｻ

    // updateUI(); // 遯ｶ・ｻ郢ｧ繧・ｼ陷咲ｩゑｽｽ諛岩ｲ鬩･髦ｪ・櫁撻・ｴ陷ｷ蛹ｻ繝ｻ邵ｺ阮吶・髯ｦ蠕鯉ｽ堤ｹｧ・ｳ郢晢ｽ｡郢晢ｽｳ郢晏現縺・ｹｧ・ｦ郢晏現・邵ｺ・ｦ郢ｧ・尻



    // 郢晏･繝｣郢敖郢晢ｽｼ邵ｺ・ｮ鬨ｾ・｣驍ｯ螢ｽ蠕玖ｬｨ・ｰ髯ｦ・ｨ驕会ｽｺ邵ｺ・ｪ邵ｺ・ｩ郢ｧ蜻亥ｳｩ隴・ｽｰ邵ｺ蜷ｶ・狗ｸｺ貅假ｽ∫ｸｺ・ｫ陟｢繝ｻ・ｦ繝ｻ

    updateHeaderDate();

    updateExamDaysDisplay();

    // updateUI() 邵ｺ・ｮ闕ｳ・ｭ髴・ｽｫ邵ｺ・ｮ闕ｳﾂ鬩幢ｽｨ郢ｧ蜻育・陷榊供・ｮ貅ｯ・｡蠕鯉ｼ邵ｺ・ｦ髴・ｽｽ鬩･荳槫密

    const isChallenge = appData.currentSubjectId !== ALL_SUBJECTS_ID && appData.subjects[appData.currentSubjectId]?.type === 'challenge';

    if (isChallenge) {

        const stats = calculateChallengeStats(subj);

        const streakText = stats.currentStreak === 0 ? getStreakMessage(0) : `${stats.currentStreak}日連続！継続は力なり`;

        document.getElementById('streak-count-header').textContent = streakText;

    }

}



// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螟ょ愛鬮ｱ・｢郢ｧ・ｵ郢ｧ・､郢ｧ・ｺ邵ｺ・ｫ陷ｷ蛹ｻ・冗ｸｺ蟶吮ｻ闔ｨ・ｸ驍ｵ・ｮ邵ｺ蜉ｱﾂ竏ｬ・ｦ荵晢ｽ・ｸｺ蜷ｶ・・ｹｧ雋樣ｫ・叉鄙ｫ・・ｸｺ蟶吮螺郢ｧ・ｫ郢晢ｽｬ郢晢ｽｳ郢敖郢晢ｽｼ隰蜀怜愛

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('calendar-title');
    grid.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    title.textContent = `${year}年 ${month + 1}月`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const labels = document.getElementById('month-labels');
    if (labels) {
        labels.innerHTML = '';
        const prevMonth = new Date(year, month - 1, 1);
        const nextMonth = new Date(year, month + 1, 1);
        [prevMonth, currentCalendarDate, nextMonth].forEach((d, idx) => {
            const m = d.getMonth();
            const y = d.getFullYear();
            const daysInMonth = new Date(y, m + 1, 0).getDate();
            let doneCount = 0;
            const subjects = getActiveSubjects().filter(s => s.type === 'study');
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = formatDate(new Date(y, m, day));
                if (subjects.some(s => s.syllabus && s.syllabus.some(u => u.completedDate === dateStr))) {
                    doneCount++;
                }
            }
            const percent = Math.round((doneCount / daysInMonth) * 100);
            const lDiv = document.createElement('div');
            lDiv.className = 'category-label-top';
            lDiv.style.flex = "1";
            lDiv.textContent = `${m + 1}月 (${percent}%)`;
            labels.appendChild(lDiv);
        });
    }

    const totalCells = 42;
    updateCalendarLegend();

    for (let i = 0; i < totalCells; i++) {
        const dayNum = i - firstDay + 1;
        const cell = document.createElement('div');
        cell.className = "border-b border-r border-gray-700/50 relative p-1 flex flex-col items-center hover:bg-white/5 transition-colors cursor-pointer group min-h-[50px]";
        if ((i + 1) % 7 === 0) cell.classList.remove('border-r');
        if (i >= 35) cell.classList.remove('border-b');

        if (dayNum > 0 && dayNum <= lastDate) {
            const dateObj = new Date(year, month, dayNum);
            const dateStr = formatDate(dateObj);
            const isToday = dateStr === getTodayStr();

            const daySpan = document.createElement('span');
            daySpan.className = `text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 z-10 ${isToday
                ? 'bg-app-accent text-app-dark shadow-lg ring-2 ring-app-accent/30'
                : 'text-gray-300 group-hover:bg-gray-700'
                }`;
            daySpan.textContent = dayNum;
            cell.appendChild(daySpan);

            const currentId = appData.currentSubjectId;
            const isAll = currentId === ALL_SUBJECTS_ID;
            const currentSubj = appData.subjects[currentId];
            const isStudyMode = isAll || (currentSubj && currentSubj.type === 'study');
            const isChallengeMode = !isAll && (currentSubj && currentSubj.type === 'challenge');

            let marksContainer = document.createElement('div');
            marksContainer.className = "flex flex-wrap justify-center gap-0.5 w-full px-1";

            if (isStudyMode) {
                const subjects = isAll ? getActiveSubjects() : [currentSubj];
                const examSubjs = subjects.filter(s => s.examDate && formatDate(new Date(s.examDate)) === dateStr);
                if (examSubjs.length > 0) {
                    const flag = document.createElement('div');
                    flag.className = "absolute top-1 right-1 animate-pulse";
                    flag.innerHTML = examSubjs.map(s => `<i class="fas fa-flag text-[10px] ${getSubjectColor(s.id)} filter drop-shadow"></i>`).join('');
                    cell.appendChild(flag);
                }

                const hasEvent = (appData.schedules[dateStr] || []).some(t => {
                    const s = appData.subjects[t.subjectId];
                    if (!s || !s.isActive) return false;
                    return isAll ? s.type === 'study' : t.subjectId === currentId;
                });

                let hasCompleted = false;
                for (const s of subjects) {
                    if (s.syllabus && s.syllabus.some(u => u.completedDate === dateStr)) {
                        hasCompleted = true;
                        break;
                    }
                }
                if (hasEvent) {
                    marksContainer.innerHTML += `<div class="w-1.5 h-1.5 rounded-full bg-app-accent mb-0.5"></div>`;
                }
                if (hasCompleted) {
                    marksContainer.innerHTML += `<div class="w-1.5 h-1.5 rounded-full bg-app-success mb-0.5"></div>`;
                }
            }

            if (isChallengeMode && currentSubj.challengeHistory && currentSubj.challengeHistory[dateStr]) {
                marksContainer.innerHTML += `<i class="fas fa-star text-challenge-gold text-[10px] filter drop-shadow-md"></i>`;
                cell.classList.add('bg-challenge-gold/5');
            }
            cell.appendChild(marksContainer);
            cell.onclick = () => openDateModal(dateStr);
        } else {
            cell.className += " bg-gray-900/30 cursor-default";
        }
        grid.appendChild(cell);
    }
}

function updateCalendarLegend() {

    const legendEl = document.getElementById('calendar-legend'); if (!legendEl) return;

    const subjectsWithGoal = getActiveSubjects().filter(s => s.examDate);

    let html = subjectsWithGoal.length > 0 ? `<span class="mr-2">遯ｶ・ｻ 騾ｶ・ｮ隶灘綜蠕狗ｸｺ・ｮ豼ｶ・ｲ:</span> ${subjectsWithGoal.map(s => `<span class="${getSubjectColor(s.id)} flex items-center gap-1"><i class="fas fa-flag text-[10px]"></i>${escapeHtml(s.name)}</span>`).join(' ')}` : '<span class="text-gray-600">遯ｶ・ｻ 騾ｶ・ｮ隶灘綜蠕狗ｸｺ・ｯ髫ｧ・ｳ驍擾ｽｰ邵ｺ荵晢ｽ蛾坎・ｭ陞ｳ螢ｹ縲堤ｸｺ髦ｪ竏ｪ邵ｺ繝ｻ/span>';

    legendEl.innerHTML = html;

}



// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螟ゑｽｿ蜻医・郢昶・縺臥ｹ昴・縺鷹勗・ｨ郢ｧ蜻育ｷ帝包ｽｻ邵ｺ蜷ｶ・矩ｫ｢・｢隰ｨ・ｰ

function renderChallengeScreen() {

    const container = document.getElementById('challenge-matrix-container');

    const statsContainer = document.getElementById('challenge-stats-grid');



    const challenges = getActiveChallenges();



    if (challenges.length === 0) {

        container.innerHTML = '<div class="p-8 text-center text-xs text-gray-500">邵ｲ讙趣ｽｮ・｡騾・・ﾂ髦ｪ縺｡郢晄じﾂｰ郢ｧ繝ｻbr>驍ｯ蜥擾ｽｶ螢ｹ繝｡郢晢ｽ｣郢晢ｽｬ郢晢ｽｳ郢ｧ・ｸ郢ｧ螳夲ｽｿ・ｽ陷会｣ｰ邵ｺ蜉ｱ窶ｻ邵ｺ荳岩味邵ｺ霈費ｼ・/div>';

        statsContainer.innerHTML = '';

        return;

    }



    // 隴鯉ｽ･闔牙･繝ｻ郢昴・繝郢晢ｽｼ邵ｺ・ｮ騾墓ｻ薙・ (闔蛾大ｾ狗ｸｺ荵晢ｽ・隴鯉ｽ･陷鷹亂竏ｪ邵ｺ・ｧ)

    const dates = [];

    const today = getToday();

    for (let i = 0; i < 7; i++) {

        const d = new Date(today);

        d.setDate(d.getDate() - i);

        dates.push(d);

    }

    // 髯ｦ・ｨ驕会ｽｺ鬯・・ 陝ｾ・ｦ(鬩穂ｸｻ謔・ -> 陷ｿ・ｳ(闔蛾大ｾ・ 邵ｺ・ｫ邵ｺ蜷ｶ・狗ｸｺ荵敖竏晢ｽｷ・ｦ(闔蛾大ｾ・ -> 陷ｿ・ｳ(鬩穂ｸｻ謔・ 邵ｺ・ｫ邵ｺ蜷ｶ・狗ｸｺ繝ｻ

    // 騾ｶ・ｴ髴台ｻ｣・帝囎荵昶螺邵ｺ繝ｻ繝ｻ邵ｺ・ｧ 陝ｾ・ｦ(闔蛾大ｾ・ -> 陷ｿ・ｳ(鬩穂ｸｻ謔・ 邵ｺ・ｮ鬯・・縲定叉・ｦ邵ｺ・ｹ邵ｺ・ｾ邵ｺ繝ｻ



    let html = '<table class="challenge-table"><thead><tr>';

    html += '<th class="challenge-th" style="width: 30%;">鬯・・蟯ｼ</th>';



    dates.forEach(d => {

        const isToday = formatDate(d) === getTodayStr();

        const dStr = `${d.getMonth() + 1}/${d.getDate()}`;

        const week = ['隴鯉ｽ･', '隴帙・, '霓｣・ｫ', '雎鯉ｽｴ', '隴幢ｽｨ', '鬩･繝ｻ, '陜ｨ繝ｻ][d.getDay()];

        html += `<th class="challenge-th ${isToday ? 'today' : ''}">${dStr}<br><span class="text-[9px]">${week}</span></th>`;

    });

    html += '</tr></thead><tbody>';



    // 陷ｷ繝ｻ繝｡郢晢ｽ｣郢晢ｽｬ郢晢ｽｳ郢ｧ・ｸ邵ｺ・ｮ髯ｦ讙主・隰後・

    challenges.forEach(subj => {

        html += `<tr class="challenge-row">`;

        html += `<td class="challenge-name-cell">${escapeHtml(subj.name)}</td>`;



        dates.forEach(d => {

            const dateStr = formatDate(d);

            const isDone = !!subj.challengeHistory[dateStr];

            const isToday = dateStr === getTodayStr();



            let btnClass = isDone ? 'check-btn checked' : 'check-btn';

            if (isToday && !isDone) btnClass += ' today-incomplete'; // 闔蛾大ｾ玖ｭ幢ｽｪ陞ｳ蠕｡・ｺ繝ｻ竊醍ｹｧ闃ｽ・ｵ・､隴ｫ・ｰ



            html += `<td class="challenge-check-cell">

                        <button onclick="toggleChallengeDate('${subj.id}', '${dateStr}', ${!isDone})" class="${btnClass}">

                            <i class="fas fa-check"></i>

                        </button>

                    </td>`;

        });

        html += '</tr>';

    });

    html += '</tbody></table>';

    container.innerHTML = html;



    // 驍ｯ蜥擾ｽｶ螢ｽ蠕玖ｬｨ・ｰ邵ｺ・ｮ髯ｦ・ｨ驕会ｽｺ

    statsContainer.innerHTML = '';

    challenges.forEach(subj => {

        const stats = calculateChallengeStats(subj);

        statsContainer.innerHTML += `

                    <div class="bg-gray-800 p-3 rounded border border-gray-700 flex justify-between items-center">

                        <span class="text-[10px] text-gray-300 font-bold truncate pr-2">${escapeHtml(subj.name)}</span>

                        <div class="text-right">

                            <span class="text-lg font-bold text-challenge-gold">${stats.currentStreak}</span>

                            <span class="text-[9px] text-gray-500">隴鯉ｽ･鬨ｾ・｣驍ｯ繝ｻ/span>

                        </div>

                    </div>`;

    });

}



// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螢ｹ縺｡郢晞摩繝ｻ郢ｧ鬆大ｴ帷ｸｺ閧ｲ逡醍ｸｺ・ｮ郢晏･ﾎ晉ｹ昜ｻ｣繝ｻ鬮｢・｢隰ｨ・ｰ

function switchTab(targetId) {

    // 郢ｧ・ｳ郢晢ｽｳ郢昴・ﾎｦ郢昴・繝ｻ髯ｦ・ｨ驕会ｽｺ陋ｻ繝ｻ・願ｭ厄ｽｿ邵ｺ繝ｻ

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    document.getElementById(targetId).classList.add('active');

    document.getElementById('main-container').scrollTop = 0;



    // 郢ｧ繧・ｼ郢ｧ・ｯ郢晢ｽｪ郢昴・縺醍ｸｺ蜉ｱ笳・ｸｺ・ｮ邵ｺ遒・螢ｼ・ｸ・ｸ邵ｺ・ｮnav-btn邵ｺ・ｪ郢ｧ闃ｽ迚｡郢ｧ蛛ｵ笆ｽ邵ｺ莉｣・九・莠包ｽｸ・ｭ陞滂ｽｮ郢晄㈱縺｡郢晢ｽｳ邵ｺ・ｯ豼ｶ・ｲ陜暦ｽｺ陞ｳ螢ｹ竊醍ｸｺ・ｮ邵ｺ・ｧ霎滂ｽ｡髫募私・ｼ繝ｻ

    const clickedBtn = document.querySelector(`.nav-btn[data-target="${targetId}"]`);

    if (clickedBtn) {

        clickedBtn.classList.replace('text-gray-500', 'text-app-accent');

    }



    // 騾包ｽｻ鬮ｱ・｢邵ｺ譁絶・邵ｺ・ｮ隰蜀怜愛隴厄ｽｴ隴・ｽｰ

    if (targetId === 'challenge-screen') {

        renderChallengeScreen();

        loadSleepLogDate();

        // 陝・ｻ｣・鬩輔・・ｻ・ｶ邵ｺ霈披雷邵ｺ・ｦ隰蜀怜愛邵ｺ蜷ｶ・狗ｸｺ阮吮・邵ｺ・ｧ邵ｲ窶･isplay:block陷ｿ閧ｴ荳占募ｾ後・郢ｧ・ｵ郢ｧ・､郢ｧ・ｺ郢ｧ雋槫徐陟募干・・ｸｺ蟶呻ｽ・

        setTimeout(renderSleepChart, 50);

    }

    if (targetId === 'manage-screen') {

        renderManageScreen();

        renderTickerSettings();

    }

    if (targetId === 'record-screen') {
        renderRecordLists();
    }

    if (targetId === 'home-screen') updateUI(); // 郢晏ｸ吶・郢晢｣ｰ邵ｺ・ｫ隰鯉ｽｻ邵ｺ・｣邵ｺ貊灘・郢ｧ繧亥ｳｩ隴・ｽｰ

}



// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螟ゑｽｷ荳樒ｲ狗ｹ晢ｽ｢郢晢ｽｼ郢晏ｳｨ縲堤ｹｧ繧・・驕倬・蟯ｼ邵ｺ・ｮ郢晢ｽｪ郢ｧ・ｹ郢晏現・帝勗・ｨ驕会ｽｺ邵ｺ蜉ｱ窶ｻ驍ｱ・ｨ鬮ｮ繝ｻ縲堤ｸｺ髦ｪ・狗ｹｧ蛹ｻ竕ｧ邵ｺ・ｫ邵ｺ蜷ｶ・・

function renderManageScreen() {

    const list = document.getElementById('manage-subject-list');

    list.innerHTML = '';



    // 隨倥・・､逕ｻ蟲ｩ霓､・ｹ繝ｻ螢ｹ・・ｸｺ阮吶堤ｸｲ讙趣ｽｷ荳樒ｲ狗ｹ晢ｽ｢郢晢ｽｼ郢晏ｳｨ竊醍ｹｧ隧eturn邵ｲ髦ｪ・邵ｺ・ｦ邵ｺ繝ｻ笳・怎・ｦ騾・・・定恆莨∝求邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・



    const active = [], challenges = [], inactive = [];



    // 陷茨ｽｨ邵ｺ・ｦ邵ｺ・ｮ驕倬・蟯ｼ郢ｧ雋槭・鬯倥・

    Object.values(appData.subjects).forEach(s => {

        if (!s.isActive) inactive.push(s);

        else if (s.type === 'challenge') challenges.push(s);

        else active.push(s);

    });



    // 髯ｦ蠕鯉ｽ定抄諛医・邵ｺ蜷ｶ・狗ｹ晏･ﾎ晉ｹ昜ｻ｣繝ｻ鬮｢・｢隰ｨ・ｰ

    const createRow = (s) => `

                <div class="flex justify-between items-center bg-gray-800 p-3 rounded border border-gray-700 mb-2">

                    <div>

                        <div class="text-sm font-bold text-white">${escapeHtml(s.name)}</div>

                        </div>

                    <div class="flex gap-2">

                        <button onclick="toggleSubjectActive('${escapeHtml(s.id)}')" class="text-xs ${s.isActive ? 'text-gray-400' : 'text-app-accent'}">

                            <i class="fas ${s.isActive ? 'fa-archive' : 'fa-box-open'}"></i>

                        </button>

                        <button onclick="${s.type === 'challenge' ? `editChallenge('${escapeHtml(s.id)}')` : `editSubject('${escapeHtml(s.id)}')`}" class="text-xs bg-gray-700 text-white px-2 py-1 rounded border border-gray-600">驍ｱ・ｨ鬮ｮ繝ｻ/button>

                        <button onclick="deleteSubjectRequest('${escapeHtml(s.id)}')" class="text-xs bg-red-900/30 text-red-200 px-2 py-1 rounded border border-red-900/50"><i class="fas fa-trash"></i></button>

                    </div>

                </div>`;



    // 郢晢ｽｪ郢ｧ・ｹ郢晏沺邱帝包ｽｻ

    if (active.length) list.innerHTML += `<h4 class="text-xs text-gray-500 font-bold mb-2 pl-1">陝・ｽｦ驗吝､・ｧ驢榊ｲｼ</h4>` + active.map(createRow).join('');

    if (challenges.length) list.innerHTML += `<h4 class="text-xs text-gray-500 font-bold mb-2 mt-4 pl-1">郢昶・ﾎ慕ｹ晢ｽｬ郢晢ｽｳ郢ｧ・ｸ</h4>` + challenges.map(createRow).join('');

    if (inactive.length) list.innerHTML += `<h4 class="text-xs text-gray-500 font-bold mb-2 mt-4 pl-1 text-gray-600">郢ｧ・｢郢晢ｽｼ郢ｧ・ｫ郢ｧ・､郢昴・(隴幢ｽｪ陝・ｽｦ驗吶・</h4>` + inactive.map(createRow).join('');



    renderTickerSettings(); // 郢昴・縺・ｹ昴・縺咲ｹ晢ｽｼ髫ｪ・ｭ陞ｳ螢ｹ・りｭ厄ｽｴ隴・ｽｰ



    if (active.length + challenges.length + inactive.length === 0) {

        list.innerHTML = '<p class="text-center text-xs text-gray-500 py-4">驕倬・蟯ｼ邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ鍋ｸｲ繝ｻbr>闕ｳ荵敖ｰ郢ｧ闃ｽ・ｿ・ｽ陷会｣ｰ邵ｺ蜉ｱ窶ｻ邵ｺ荳岩味邵ｺ霈費ｼ樒ｸｲ繝ｻ/p>';

    }

}



// --- HANDLERS ---

function addNewSubject(type) {

    const nameInput = document.getElementById(type === 'challenge' ? 'new-challenge-name' : 'new-subject-name');

    const name = nameInput.value.trim(); if (!name) return;

    const id = 'subj_' + Date.now();

    if (type === 'challenge') appData.subjects[id] = { id, type: 'challenge', name, examDate: null, startDate: getTodayStr(), isActive: true, challengeHistory: {} };

    else appData.subjects[id] = { id, type: 'study', name, examDate: null, startDate: null, isActive: true, history: {}, syllabus: [] };

    nameInput.value = ''; saveData(); updateUI(); showToast('髴托ｽｽ陷会｣ｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}

function toggleSubjectActive(id) { if (appData.subjects[id]) { appData.subjects[id].isActive = !appData.subjects[id].isActive; saveData(); updateUI(); } }

function deleteSubjectRequest(id) { showAppConfirm("陷台ｼ∝求驕抵ｽｺ髫ｱ繝ｻ, `邵ｲ繝ｻ{appData.subjects[id].name}邵ｲ髦ｪ・定楜謔溘・邵ｺ・ｫ陷台ｼ∝求邵ｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂｰ繝ｻ豁・ () => { delete appData.subjects[id]; if (appData.currentSubjectId === id) appData.currentSubjectId = ALL_SUBJECTS_ID; saveData(); updateUI(); }); }

function editSubject(id) {

    editingSubjectId = id;

    document.getElementById('edit-subject-name-input').value = appData.subjects[id].name;

    // 陷雁ｩ・ｪ讒ｫ・ｸ・ｳ髫ｪ・ｭ陞ｳ螢ｹ繝ｻ陟包ｽｩ陷医・
    const isVocab = appData.subjects[id].isVocab || false;
    document.getElementById('edit-subject-is-vocab').checked = isVocab;
    const vocabSection = document.getElementById('vocab-import-section');
    if (isVocab) {
        vocabSection.classList.remove('hidden');
    } else {
        vocabSection.classList.add('hidden');
    }

    document.getElementById('unit-editor-area').classList.remove('hidden');

    document.getElementById('challenge-editor-area').classList.add('hidden');

    renderDifficultyCheckboxes('new-unit-difficulty-checks', id, []);

    renderUnitList();

    resetUnitInput();

    renderDifficultyLabels();

}



// 隨倥・鬮ｮ・｣隴冗§・ｺ・ｦ郢晢ｽｩ郢晏生ﾎ晞ｂ・｡騾・・(闕ｳ・ｦ邵ｺ・ｳ隴厄ｽｿ邵ｺ莠･・ｯ・ｾ陟｢諛・ｲｿ)

function renderDifficultyLabels() {

    const container = document.getElementById('difficulty-label-list');

    if (!container || !editingSubjectId) return;

    const subj = appData.subjects[editingSubjectId];

    if (!subj) return;



    const labels = subj.difficultyLabels || {};

    // 闕ｳ・ｦ邵ｺ・ｳ鬯・・繝ｻ陋ｻ蜉ｱ窶ｲ邵ｺ・ｪ邵ｺ繝ｻ・ｰ・ｴ陷ｷ蛹ｻ繝ｻ郢ｧ・ｭ郢晢ｽｼ邵ｺ・ｮ鬩滓ｦ翫・邵ｺ・ｧ陋ｻ譎・ｄ陋ｹ謔ｶ・邵ｺ・ｦ闖ｫ譎擾ｽｭ繝ｻ

    if (!subj.difficultyOrder) {

        subj.difficultyOrder = Object.keys(labels);

        saveData();

    }



    // 闕ｳ・ｦ邵ｺ・ｳ鬯・・竊楢惺・ｫ邵ｺ・ｾ郢ｧ蠕娯ｻ邵ｺ繝ｻ竊醍ｸｺ繝ｻ縺冗ｹ晢ｽｼ邵ｺ蠕娯旺郢ｧ蠕後・隴幢ｽｫ陝・ｽｾ邵ｺ・ｫ髴托ｽｽ陷会｣ｰ繝ｻ蝓溽ｴ幄惺蝓淞・ｧ闖ｫ譎・亜繝ｻ繝ｻ

    Object.keys(labels).forEach(k => {

        if (!subj.difficultyOrder.includes(k)) subj.difficultyOrder.push(k);

    });

    // 鬨ｾ繝ｻ竊楢氛莨懈Β邵ｺ蜉ｱ竊醍ｸｺ繝ｻ縺冗ｹ晢ｽｼ邵ｺ謔滓ｧ邵ｺ・ｾ郢ｧ蠕娯ｻ邵ｺ繝ｻ・檎ｸｺ・ｰ陷台ｼ∝求

    subj.difficultyOrder = subj.difficultyOrder.filter(k => labels.hasOwnProperty(k));



    container.innerHTML = '';



    subj.difficultyOrder.forEach((key, index) => {

        const label = labels[key];

        const row = document.createElement('div');

        row.className = 'flex items-center gap-2 bg-gray-900/50 p-1.5 rounded border border-gray-700/50';



        // 闕ｳ鬘費ｽｧ・ｻ陷崎ｼ斐・郢ｧ・ｿ郢晢ｽｳ

        const upBtn = index > 0

            ? `<button onclick="moveDifficultyLabel('${key}', -1)" class="text-gray-500 hover:text-white px-1"><i class="fas fa-chevron-up text-[10px]"></i></button>`

            : `<span class="w-4 inline-block"></span>`;



        // 闕ｳ迢暦ｽｧ・ｻ陷崎ｼ斐・郢ｧ・ｿ郢晢ｽｳ

        const downBtn = index < subj.difficultyOrder.length - 1

            ? `<button onclick="moveDifficultyLabel('${key}', 1)" class="text-gray-500 hover:text-white px-1"><i class="fas fa-chevron-down text-[10px]"></i></button>`

            : `<span class="w-4 inline-block"></span>`;



        row.innerHTML = `

                    <div class="flex flex-col gap-0.5">

                        ${upBtn}

                        ${downBtn}

                    </div>

                    <span class="text-[10px] text-gray-500 mr-2 shrink-0"><i class="fas fa-tag"></i></span>

                    <input type="text" value="${label}" id="diff-label-${key}"

                        class="flex-1 bg-gray-900 border border-gray-700 text-white text-[10px] rounded px-2 py-1 outline-none focus:border-app-accent">

                    <button onclick="updateDifficultyLabel('${key}')"

                        class="text-app-accent hover:text-sky-300 text-[10px] px-2" title="闖ｫ譎擾ｽｭ繝ｻ><i class="fas fa-save"></i></button>

                    <button onclick="removeDifficultyLabel('${key}')"

                        class="text-gray-600 hover:text-red-400 text-[10px] px-2" title="陷台ｼ∝求"><i class="fas fa-trash-alt"></i></button>

                `;

        container.appendChild(row);

    });

}



// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螟仙ｱｮ隴冗§・ｺ・ｦ郢ｧ・ｿ郢ｧ・ｰ邵ｺ・ｮ闕ｳ・ｦ邵ｺ・ｳ隴厄ｽｿ邵ｺ繝ｻ

function moveDifficultyLabel(key, direction) {

    const subj = appData.subjects[editingSubjectId];

    if (!subj || !subj.difficultyOrder) return;



    const idx = subj.difficultyOrder.indexOf(key);

    if (idx === -1) return;



    const newIdx = idx + direction;

    if (newIdx < 0 || newIdx >= subj.difficultyOrder.length) return;



    // 陷茨ｽ･郢ｧ譴ｧ蟠帷ｸｺ繝ｻ

    const temp = subj.difficultyOrder[newIdx];

    subj.difficultyOrder[newIdx] = subj.difficultyOrder[idx];

    subj.difficultyOrder[idx] = temp;



    saveData();

    renderDifficultyLabels();

}



function addDifficultyLabel() {
    const label = document.getElementById('new-diff-label').value.trim();
    if (!label) { showToast('郢ｧ・ｿ郢ｧ・ｰ邵ｺ・ｮ陷ｷ蜥ｲ・ｧ・ｰ郢ｧ雋槭・陷牙ｸ呻ｼ邵ｺ・ｦ邵ｺ荳岩味邵ｺ霈費ｼ・); return; }

    const subj = appData.subjects[editingSubjectId];
    if (!subj.difficultyLabels) subj.difficultyLabels = {};

    const existingLabels = Object.values(subj.difficultyLabels);
    if (existingLabels.includes(label)) { showToast('陷ｷ蠕個ｧ陷ｷ蜥ｲ・ｧ・ｰ邵ｺ・ｮ郢ｧ・ｿ郢ｧ・ｰ邵ｺ譴ｧ驥檎ｸｺ・ｫ陝・ｼ懈Β邵ｺ蜉ｱ竏ｪ邵ｺ繝ｻ); return; }

    const key = 'TAG_' + Date.now().toString(36).toUpperCase();





    subj.difficultyLabels[key] = label || key;



    // 闕ｳ・ｦ邵ｺ・ｳ鬯・・繝ｻ隴幢ｽｫ陝・ｽｾ邵ｺ・ｫ髴托ｽｽ陷会｣ｰ

    if (!subj.difficultyOrder) subj.difficultyOrder = Object.keys(subj.difficultyLabels);

    if (!subj.difficultyOrder.includes(key)) subj.difficultyOrder.push(key);



    // 郢晁ｼ斐≦郢晢ｽｫ郢ｧ・ｿ郢晢ｽｼ邵ｺ・ｫ郢ｧ繧奇ｽｿ・ｽ陷会｣ｰ繝ｻ蛹ｻ繝ｧ郢晁ｼ斐°郢晢ｽｫ郢昴・N繝ｻ繝ｻ

    if (!subj.difficultyFilter) subj.difficultyFilter = [];

    if (!subj.difficultyFilter.includes(key)) subj.difficultyFilter.push(key);



    // Input cleared
    document.getElementById('new-diff-label').value = '';



    saveData();

    renderDifficultyLabels();

    showToast(`郢ｧ・ｿ郢ｧ・ｰ ${key} 郢ｧ螳夲ｽｿ・ｽ陷会｣ｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}



function removeDifficultyLabel(key) {

    if (!confirm(`郢ｧ・ｿ郢ｧ・ｰ邵ｲ繝ｻ{key}邵ｲ髦ｪ・定恆莨∝求邵ｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂｰ繝ｻ豁ハ繝ｻ驛・ｽｨ・ｭ陞ｳ螢ｽ・ｸ蛹ｻ竏ｩ邵ｺ・ｮ陷贋ｼ懊・郢昴・繝ｻ郢ｧ・ｿ邵ｺ荵晢ｽ臥ｸｺ・ｯ陷台ｼ∝求邵ｺ霈費ｽ檎ｸｺ・ｾ邵ｺ蟶呻ｽ薙・闕・) return;

    const subj = appData.subjects[editingSubjectId];

    delete subj.difficultyLabels[key];



    // 闕ｳ・ｦ邵ｺ・ｳ鬯・・ﾂｰ郢ｧ蟲ｨ・り恆莨∝求

    if (subj.difficultyOrder) {

        subj.difficultyOrder = subj.difficultyOrder.filter(k => k !== key);

    }



    subj.difficultyFilter = (subj.difficultyFilter || []).filter(f => f !== key);



    saveData();

    renderDifficultyLabels();

    updateUI();

}



function updateDifficultyLabel(key) {

    const newVal = document.getElementById(`diff-label-${key}`).value.trim();

    const subj = appData.subjects[editingSubjectId];

    if (!subj.difficultyLabels) subj.difficultyLabels = {};

    subj.difficultyLabels[key] = newVal || key;

    saveData();

    showToast(`郢ｧ・ｿ郢ｧ・ｰ ${key} 郢ｧ蜑・ｽｿ譎擾ｽｭ蛟･・邵ｺ・ｾ邵ｺ蜉ｱ笳・);

}



function editChallenge(id) {

    editingSubjectId = id;

    const s = appData.subjects[id];

    document.getElementById('edit-challenge-name').value = s.name;

    document.getElementById('edit-challenge-start').value = s.startDate || '';

    document.getElementById('edit-challenge-end').value = s.examDate || '';



    // 髢ｾ・ｪ陷崎ｼ斐Γ郢ｧ・ｧ郢昴・縺鷹坎・ｭ陞ｳ螢ｹ繝ｻ陷ｿ閧ｴ荳・

    const autoType = s.autoCheckType || '';

    document.getElementById('edit-challenge-auto-type').value = autoType;

    document.getElementById('edit-challenge-target-time').value = s.autoCheckTime || '';

    toggleAutoTimeInput();



    document.getElementById('challenge-editor-area').classList.remove('hidden');

    document.getElementById('unit-editor-area').classList.add('hidden');

}



function updateSubjectName() {
    const n = document.getElementById('edit-subject-name-input').value.trim();
    if (n) {
        appData.subjects[editingSubjectId].name = n;
        saveData();
        updateUI();
        showToast('驕倬・蟯ｼ陷ｷ髦ｪ・定棔逕ｻ蟲ｩ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);
    }
}


function saveChallengeSettings() {

    const s = appData.subjects[editingSubjectId];

    s.name = document.getElementById('edit-challenge-name').value;

    s.startDate = document.getElementById('edit-challenge-start').value || null;

    s.examDate = document.getElementById('edit-challenge-end').value || null;



    // 髢ｾ・ｪ陷崎ｼ斐Γ郢ｧ・ｧ郢昴・縺鷹坎・ｭ陞ｳ螢ｹ繝ｻ闖ｫ譎擾ｽｭ繝ｻ

    s.autoCheckType = document.getElementById('edit-challenge-auto-type').value;

    s.autoCheckTime = document.getElementById('edit-challenge-target-time').value;



    saveData();

    updateUI();

    document.getElementById('challenge-editor-area').classList.add('hidden');

}



function toggleAutoTimeInput() {

    const type = document.getElementById('edit-challenge-auto-type').value;

    const area = document.getElementById('auto-time-input-area');

    const input = document.getElementById('edit-challenge-target-time');

    const help = document.getElementById('auto-time-help-text');



    if (type) {

        area.classList.remove('hidden');

        if (type === 'study_time') {

            input.type = 'number';

            input.placeholder = '60 (陋ｻ繝ｻ';

            help.textContent = '遯ｶ・ｻ騾ｶ・ｮ隶灘生竊堤ｸｺ蜷ｶ・玖恪迚呻ｽｼ・ｷ隴弱ｋ菫｣郢ｧ蛛ｵﾂ謔溘・邵ｲ髦ｪ縲定怦・･陷牙ｸ呻ｼ邵ｺ・ｦ邵ｺ荳岩味邵ｺ霈費ｼ・(關薙・ 1隴弱ｋ菫｣邵ｺ・ｪ郢ｧ繝ｻ0)';

        } else {

            input.type = 'time';

            input.placeholder = '';

            help.textContent = '遯ｶ・ｻ騾ｶ・ｮ隶灘生竊堤ｸｺ蜷ｶ・玖ｭ弱ｇ邯ｾ郢ｧ雋槭・陷牙ｸ呻ｼ邵ｺ・ｦ邵ｺ荳岩味邵ｺ霈費ｼ・;

        }

    } else {

        area.classList.add('hidden');

    }

}



function closeUnitEditor() { document.getElementById('unit-editor-area').classList.add('hidden'); }

function closeChallengeEditor() { document.getElementById('challenge-editor-area').classList.add('hidden'); }

// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螢ｹ繝｡郢ｧ・ｧ郢昴・縺醍ｹ晄㈱繝｣郢ｧ・ｯ郢ｧ・ｹ闔牙･窶ｳ邵ｺ・ｮ陷贋ｼ懊・郢晢ｽｪ郢ｧ・ｹ郢晁ご蜃ｽ隰悟ｮ｣譛ｪ隰ｨ・ｰ

// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螢ｹﾂ譴ｧ驥碁ｩ輔ｅﾂ髦ｪ繝ｻ隴√・・ｭ蜉ｱ・帝勗・ｨ驕会ｽｺ邵ｺ蜷ｶ・狗ｹｧ蛹ｻ竕ｧ邵ｺ・ｫ邵ｺ蜉ｱ笳・ｹ晢ｽｪ郢ｧ・ｹ郢晏沺邱帝包ｽｻ鬮｢・｢隰ｨ・ｰ

function renderUnitList() {

    const list = document.getElementById('manage-unit-list');

    list.innerHTML = '';

    const subj = appData.subjects[editingSubjectId];



    const allCheck = document.getElementById('select-all-units');

    if (allCheck) allCheck.checked = false;



    if (!subj || !subj.syllabus) return;



    subj.syllabus.forEach((item, idx) => {

        const div = document.createElement('div');

        div.className = `flex justify-between items-center bg-gray-900 p-2 rounded border border-gray-800 text-[10px] ${idx === editingUnitIndex ? 'border-app-accent bg-gray-800' : ''}`;



        let statusIcon = '<i class="far fa-circle text-gray-600"></i>';

        if (item.status === 'completed') {

            statusIcon = '<i class="fas fa-check-circle text-app-success"></i>';

        }



        const lapBadge = item.lapCount > 0 ? `<span class="bg-gray-700 text-gray-300 px-1.5 rounded-full text-[9px] ml-1">x${item.lapCount}</span>` : '';

        const weakIndicator = item.isWeak ? '<i class="fas fa-exclamation-triangle text-app-weak text-[9px] ml-1"></i>' : '';



        // 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螢ｼ・ｮ蠕｡・ｺ繝ｻ蠕狗ｸｺ・ｾ邵ｺ貅倥・邵ｲ譴ｧ驥碁ｩ輔ｅﾂ髦ｪ繝ｻ髯ｦ・ｨ驕会ｽｺ

        let dateDisplay = '';

        if (item.status === 'completed') {

            const dateText = (item.completedDate === 'initial') ? '隴鯉ｽ｢鬩輔・ : (item.completedDate ? item.completedDate.substring(5).replace('-', '/') : '');

            dateDisplay = `<span class="text-[9px] text-gray-500 ml-2">(${dateText})</span>`;

        }



        // 郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ陷ｷ繝ｻ
        const categoryDisplay = item.category ? `<span class="text-app-sub">[${escapeHtml(item.category)}]</span> ` : '';

        // 鬮ｮ・｣隴冗§・ｺ・ｦ郢ｧ・ｿ郢ｧ・ｰ
        let tagsDisplay = '';
        if (item.difficulty && Array.isArray(item.difficulty)) {
            const subjLabels = getDifficultyLabels(editingSubjectId) || {};
            item.difficulty.forEach(tag => {
                const displayLabel = subjLabels[tag] || tag;
                tagsDisplay += `<span class="bg-gray-700 text-gray-300 px-1 py-0.5 rounded text-[9px] ml-1 border border-gray-600">${escapeHtml(displayLabel)}</span>`;
            });
        }

        div.innerHTML = `

                    <div class="flex items-center gap-2 flex-1 min-w-0">

                        <input type="checkbox" class="unit-select-checkbox accent-app-accent cursor-pointer" value="${idx}">

                        <div class="w-4 text-center">${statusIcon}</div>

                        <span class="truncate flex-1 cursor-pointer" onclick="editUnit(${idx})">

                            ${categoryDisplay}${escapeHtml(item.title)}
                            ${tagsDisplay}

                            ${dateDisplay}

                            ${lapBadge}

                            ${weakIndicator}

                        </span>

                    </div>

                    <div class="flex gap-1 items-center">

                        <button onclick="editUnit(${idx})" class="text-gray-500 hover:text-white px-2 py-1"><i class="fas fa-pen"></i></button>

                        <button onclick="deleteUnitRequest(${idx})" class="text-gray-500 hover:text-red-400 px-2 py-1"><i class="fas fa-trash"></i></button>

                    </div>`;

        list.appendChild(div);

    });

}

// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螢ｹ縺咲ｹ昴・縺也ｹ晢ｽｪ闕ｳﾂ隲｡・ｬ陞溽判蟲ｩ邵ｺ・ｮ邵ｺ貅假ｽ∫ｸｺ・ｮ鬮｢・｢隰ｨ・ｰ驗抵ｽ､

function toggleAllUnitChecks(source) {

    const checks = document.querySelectorAll('.unit-select-checkbox');

    checks.forEach(c => c.checked = source.checked);

}



// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螟ゑｽｵ・ｱ陷ｷ蛹ｻ・・ｹｧ蠕娯螺闕ｳﾂ隲｡・ｬ驍ｱ・ｨ鬮ｮ繝ｻ・ｩ貅ｯ繝ｻ

function openBulkEditModal() {

    const checks = document.querySelectorAll('.unit-select-checkbox:checked');

    if (checks.length === 0) {

        showToast("驍ｱ・ｨ鬮ｮ繝ｻ笘・ｹｧ蜿･閻ｰ陷医・・帝ｩ包ｽｸ隰壽ｧｭ・邵ｺ・ｦ邵ｺ荳岩味邵ｺ霈費ｼ・);

        return;

    }

    // 鬩包ｽｸ隰壽ｨ費ｽｻ・ｶ隰ｨ・ｰ郢ｧ螳夲ｽ｡・ｨ驕会ｽｺ邵ｺ蜉ｱ窶ｻ郢晢ｽ｢郢晢ｽｼ郢敖郢晢ｽｫ郢ｧ蟶晏ｹ慕ｸｺ繝ｻ

    document.getElementById('bulk-selected-count').textContent = checks.length;



    // 陷茨ｽ･陷牙ｸｶ・ｬ繝ｻ・堤ｹ晢ｽｪ郢ｧ・ｻ郢昴・繝ｨ

    document.getElementById('bulk-edit-category').value = '';

    document.getElementById('bulk-edit-status').value = 'no-change';

    document.getElementById('bulk-edit-date').value = '';

    document.getElementById('bulk-edit-lap').value = '';

    document.getElementById('bulk-edit-category').value = '';

    document.getElementById('bulk-edit-status').value = 'no-change';

    document.getElementById('bulk-edit-date').value = '';

    document.getElementById('bulk-edit-lap').value = '';

    renderDifficultyCheckboxes('bulk-edit-difficulty-checks', editingSubjectId, []);

    toggleBulkDateInputInModal();

    toggleBulkDateInputInModal();



    document.getElementById('bulk-edit-modal').classList.remove('hidden');

}



function closeBulkEditModal() {

    document.getElementById('bulk-edit-modal').classList.add('hidden');

}



function toggleBulkDateInputInModal() {

    const val = document.getElementById('bulk-edit-status').value;

    const dateInput = document.getElementById('bulk-edit-date');

    if (val === 'completed_date') {

        dateInput.classList.remove('hidden');

    } else {

        dateInput.classList.add('hidden');

    }

}



function applyCombinedBulkEdit() {

    const checks = document.querySelectorAll('.unit-select-checkbox:checked');

    if (checks.length === 0) return;



    const subj = appData.subjects[editingSubjectId];



    // 陷ｷ繝ｻ繝ｻ陷牙ｸ崢・､郢ｧ雋槫徐陟輔・

    const newCat = document.getElementById('bulk-edit-category').value.trim();

    const statusType = document.getElementById('bulk-edit-status').value;

    const dateVal = document.getElementById('bulk-edit-date').value;

    const lapVal = document.getElementById('bulk-edit-lap').value;



    // 鬮ｮ・｣隴冗§・ｺ・ｦ陷ｿ髢・ｾ繝ｻ

    const diffChecks = document.querySelectorAll('#bulk-edit-difficulty-checks input:checked');

    const newDiffs = Array.from(diffChecks).map(c => c.value);

    const shouldUpdateDiff = newDiffs.length > 0;



    let updateCount = 0;



    if (!confirm(`鬩包ｽｸ隰壽ｧｭ・邵ｺ繝ｻ${checks.length} 闔会ｽｶ邵ｺ・ｮ陷贋ｼ懊・郢ｧ蜑・ｽｸﾂ隲｡・ｬ陞溽判蟲ｩ邵ｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂｰ繝ｻ豁・) return;



    checks.forEach(c => {

        const idx = parseInt(c.value);

        const item = subj.syllabus[idx];

        if (!item) return;



        // 郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ陞溽判蟲ｩ

        if (newCat) item.category = newCat;



        // 鬮ｮ・｣隴冗§・ｺ・ｦ陞溽判蟲ｩ

        if (shouldUpdateDiff) {

            item.difficulty = newDiffs;

        }



        // 郢ｧ・ｹ郢昴・繝ｻ郢ｧ・ｿ郢ｧ・ｹ陞溽判蟲ｩ

        if (statusType !== 'no-change') {

            if (statusType === 'pending') {

                item.status = 'pending';

                item.completedDate = null;

            } else if (statusType === 'initial') {

                item.status = 'completed';

                item.completedDate = 'initial';

            } else if (statusType === 'completed_today') {

                if (item.status !== 'completed') {

                    item.status = 'completed';

                    item.completedDate = getTodayStr();

                }

            } else if (statusType === 'completed_date' && dateVal) {

                item.status = 'completed';

                item.completedDate = dateVal;

            }

        }



        // 陷ｻ・ｨ陜玲ｨ顔・陞溽判蟲ｩ

        if (lapVal !== "") {

            item.lapCount = parseInt(lapVal);

        }



        updateCount++;

    });



    saveData();

    renderUnitList();

    closeBulkEditModal();

    showToast(`${updateCount}闔会ｽｶ郢ｧ蜻亥ｳｩ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

    updateUI();

}



function toggleUnitWeak(idx) { const item = appData.subjects[editingSubjectId].syllabus[idx]; item.isWeak = !item.isWeak; saveData(); renderUnitList(); updateUI(); }

// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螢ｼ閻ｰ闖ｴ骰具ｽｷ・ｨ鬮ｮ繝ｻ・らｹ晢ｽ｢郢晢ｽｼ郢敖郢晢ｽｫ邵ｺ・ｧ髯ｦ蠕娯鴬郢ｧ蛹ｻ竕ｧ邵ｺ・ｫ陞溽判蟲ｩ

function editUnit(idx) {

    editingUnitIndex = idx;

    const subj = appData.subjects[editingSubjectId];

    const item = subj.syllabus[idx];



    // 郢晢ｽ｢郢晢ｽｼ郢敖郢晢ｽｫ邵ｺ・ｫ陷茨ｽ･陷牙ｸ崢・､郢ｧ蛛ｵ縺晉ｹ昴・繝ｨ

    document.getElementById('single-edit-category').value = item.category;

    document.getElementById('single-edit-title').value = item.title;

    document.getElementById('single-edit-weak').checked = !!item.isWeak;

    document.getElementById('single-edit-lap').value = item.lapCount || 0;

    document.getElementById('single-edit-lap').value = item.lapCount || 0;

    renderDifficultyCheckboxes('single-edit-difficulty-checks', editingSubjectId, item.difficulty || []);



    // 郢ｧ・ｹ郢昴・繝ｻ郢ｧ・ｿ郢ｧ・ｹ邵ｺ・ｮ陋ｻ・､陞ｳ螢ｹ竊堤ｹｧ・ｻ郢昴・繝ｨ

    const statusSel = document.getElementById('single-edit-status');

    const dateInput = document.getElementById('single-edit-date');



    if (item.status === 'completed') {

        if (item.completedDate === 'initial') {

            statusSel.value = 'initial';

        } else {

            // 隴鯉ｽ･闔牙･窶ｲ陷茨ｽ･邵ｺ・｣邵ｺ・ｦ邵ｺ繝ｻ・玖撻・ｴ陷ｷ蛹ｻﾂ竏壹Ι郢晁ｼ斐°郢晢ｽｫ郢晏現繝ｻ邵ｲ譴ｧ蠕玖脂菫ｶ谺陞ｳ螢ｹﾂ髦ｪ竊鍋ｸｺ蜉ｱ窶ｻ邵ｺ譏ｴ繝ｻ隴鯉ｽ･闔牙･・定怦・･郢ｧ蠕鯉ｽ・

            statusSel.value = 'completed_date';

            dateInput.value = item.completedDate;

        }

    } else {

        statusSel.value = 'pending';

    }



    toggleSingleEditDateInput(); // 隴鯉ｽ･闔我ｿｶ・ｬ繝ｻ繝ｻ髯ｦ・ｨ驕会ｽｺ陋ｻ繝ｻ蟠・

    document.getElementById('single-unit-edit-modal').classList.remove('hidden');

}



// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螢ｼ閻ｰ闖ｴ骰具ｽｷ・ｨ鬮ｮ繝ｻﾎ皮ｹ晢ｽｼ郢敖郢晢ｽｫ邵ｺ・ｮ隰ｫ蝣ｺ・ｽ諞ｺ譛ｪ隰ｨ・ｰ驗抵ｽ､

function closeSingleUnitEditModal() {

    document.getElementById('single-unit-edit-modal').classList.add('hidden');

    editingUnitIndex = null;

}



function toggleSingleEditDateInput() {

    const val = document.getElementById('single-edit-status').value;

    const dateInput = document.getElementById('single-edit-date');

    if (val === 'completed_date') {

        dateInput.classList.remove('hidden');

    } else {

        dateInput.classList.add('hidden');

    }

}



function saveSingleUnitEdit() {

    const subj = appData.subjects[editingSubjectId];

    const item = subj.syllabus[editingUnitIndex];



    const cat = document.getElementById('single-edit-category').value.trim();

    const title = document.getElementById('single-edit-title').value.trim();



    if (!cat || !title) {

        showToast("郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ邵ｺ・ｨ陷贋ｼ懊・陷ｷ髦ｪ繝ｻ陟｢繝ｻ・ｰ蛹ｻ縲堤ｸｺ繝ｻ);

        return;

    }



    // 陋滂ｽ､郢ｧ蜻亥ｳｩ隴・ｽｰ

    item.category = cat;

    item.title = title;

    item.isWeak = document.getElementById('single-edit-weak').checked;

    item.lapCount = parseInt(document.getElementById('single-edit-lap').value) || 0;



    // 鬮ｮ・｣隴冗§・ｺ・ｦ隴厄ｽｴ隴・ｽｰ

    const diffChecks = document.querySelectorAll('#single-edit-difficulty-checks input:checked');

    const diffs = Array.from(diffChecks).map(c => c.value);

    item.difficulty = diffs.length > 0 ? diffs : undefined;



    const statusType = document.getElementById('single-edit-status').value;

    const dateVal = document.getElementById('single-edit-date').value;



    // 郢ｧ・ｹ郢昴・繝ｻ郢ｧ・ｿ郢ｧ・ｹ隴厄ｽｴ隴・ｽｰ郢晢ｽｭ郢ｧ・ｸ郢昴・縺・

    if (statusType === 'pending') {

        item.status = 'pending';

        item.completedDate = null;

    } else if (statusType === 'initial') {

        item.status = 'completed';

        item.completedDate = 'initial';

    } else {

        // completed

        item.status = 'completed';

        if (statusType === 'completed_date' && dateVal) {

            item.completedDate = dateVal;

        } else {

            // 邵ｲ謔滂ｽｮ蠕｡・ｺ繝ｻ闔蛾大ｾ・邵ｲ髦ｪ窶ｲ鬩包ｽｸ邵ｺ・ｰ郢ｧ蠕娯螺邵ｲ竏壺穐邵ｺ貅倥・隴鯉ｽ･闔我ｿｶ谺陞ｳ螢ｹ縲帝→・ｺ隹ｺ繝ｻ笆｡邵ｺ・｣邵ｺ貅ｷ・ｰ・ｴ陷ｷ蛹ｻ繝ｻ闔蛾大ｾ狗ｸｺ・ｮ隴鯉ｽ･闔峨・

            // 邵ｺ貅倪味邵ｺ蜉ｱﾂ竏ｵ驥檎ｸｺ・ｫ陞ｳ蠕｡・ｺ繝ｻ・ｸ蛹ｻ竏ｩ邵ｺ・ｧ隴鯉ｽ･闔牙･窶ｲ陞溷ｳｨ・冗ｹｧ蟲ｨ竊醍ｸｺ繝ｻ・ｰ・ｴ陷ｷ蛹ｻ繝ｻ驍ｯ・ｭ隰問・・邵ｺ貊灘ｩｿ邵ｺ迹夲ｽｦ・ｪ陋ｻ繝ｻﾂｰ郢ｧ繧托ｽｼ繝ｻ

            // 闔蛾宦螻鍋ｸｺ・ｯ隴丞ｮ茨ｽ､・ｺ騾ｧ繝ｻ竊楢棔逕ｻ蟲ｩ隰ｫ蝣ｺ・ｽ諛奇ｽ堤ｸｺ蜉ｱ窶ｻ邵ｺ繝ｻ・狗ｸｺ・ｮ邵ｺ・ｧ邵ｲ繝ｻ竏郁ｬ壽ｧｭ竊楢戊侭・樒ｸｺ・ｾ邵ｺ繝ｻ

            if (statusType === 'completed') {

                item.completedDate = getTodayStr();

            } else if (item.completedDate && statusType === 'completed_date') {

                // 隴鯉ｽ｢陝・･繝ｻ隴鯉ｽ･闔牙･・堤ｹｧ・ｭ郢晢ｽｼ郢昴・

            } else {

                item.completedDate = getTodayStr();

            }

        }

    }



    saveData();

    renderUnitList();

    updateUI();

    closeSingleUnitEditModal();

    showToast("陷贋ｼ懊・郢ｧ蜻亥ｳｩ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}



// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ繝ｻ隴鯉ｽ･騾ｶ・ｮ陞ｳ蠕｡・ｺ繝ｻ・堤ｸｲ譴ｧ蠕玖脂蛟･ﾂ髦ｪ縲堤ｸｺ・ｯ邵ｺ・ｪ邵ｺ荳環譴ｧ驥碁ｩ輔・initial)邵ｲ髦ｪ竊堤ｸｺ蜉ｱ窶ｻ髫ｪ蛟ｬ鮖ｸ邵ｺ蜷ｶ・矩ｫ｢・｢隰ｨ・ｰ

function saveUnit() {

    const cat = document.getElementById('new-unit-category').value.trim();

    const title = document.getElementById('new-unit-title').value.trim();

    if (!title) { showToast('陷贋ｼ懊・陷ｷ髦ｪ・定怦・･陷牙ｸ呻ｼ邵ｺ・ｦ邵ｺ荳岩味邵ｺ霈費ｼ・); return; }



    const w = document.getElementById('new-unit-weak').checked;

    const lap = parseInt(document.getElementById('new-unit-lap').value) || 0;

    const statusType = document.getElementById('new-unit-status-select').value;



    // 鬮ｮ・｣隴冗§・ｺ・ｦ郢ｧ・ｿ郢ｧ・ｰ鬩滓ｦ翫・陷ｿ髢・ｾ繝ｻ

    const diffChecks = document.querySelectorAll('#new-unit-difficulty-checks input:checked');

    const diffs = Array.from(diffChecks).map(c => c.value);



    const subj = appData.subjects[editingSubjectId];



    // 隴鯉ｽ･闔牙･竊堤ｹｧ・ｹ郢昴・繝ｻ郢ｧ・ｿ郢ｧ・ｹ邵ｺ・ｮ雎趣ｽｺ陞ｳ繝ｻ

    let newStatus = 'pending';

    let newDate = undefined;

    let shouldCleanSchedule = false;



    if (statusType === 'completed') {

        newStatus = 'completed';

        if (editingUnitIndex !== null && subj.syllabus[editingUnitIndex].completedDate && subj.syllabus[editingUnitIndex].completedDate !== 'initial') {

            newDate = subj.syllabus[editingUnitIndex].completedDate;

        } else {

            newDate = getTodayStr();

        }

    } else if (statusType === 'completed_init') {

        newStatus = 'completed';

        if (!subj.startDate) subj.startDate = getTodayStr();

        newDate = "initial";

        shouldCleanSchedule = true;

    }



    const newItem = {

        id: (editingUnitIndex !== null) ? subj.syllabus[editingUnitIndex].id : `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,

        category: cat,

        title: title,

        status: newStatus,

        completedDate: newDate,

        lapCount: lap,

        isWeak: w,

        difficulty: diffs.length > 0 ? diffs : undefined

    };



    if (editingUnitIndex !== null) {

        // 隴鯉ｽ｢陝・ｿｶ蟲ｩ隴・ｽｰ

        if (shouldCleanSchedule) {

            const uId = subj.syllabus[editingUnitIndex].id;

            Object.keys(appData.schedules).forEach(date => {

                appData.schedules[date] = appData.schedules[date].filter(task => task.unitId !== uId);

                if (appData.schedules[date].length === 0) delete appData.schedules[date];

            });

        }

        subj.syllabus[editingUnitIndex] = newItem;

    } else {

        // 隴・ｽｰ髫募臆・ｿ・ｽ陷会｣ｰ

        subj.syllabus.push(newItem);

    }



    saveData();

    renderUnitList();

    resetUnitInput();

    updateUI();

    showToast(editingUnitIndex !== null ? '陷贋ｼ懊・郢ｧ蜻亥ｳｩ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・ : '陷贋ｼ懊・郢ｧ螳夲ｽｿ・ｽ陷会｣ｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}



function resetUnitInput() {

    editingUnitIndex = null;

    document.getElementById('new-unit-category').value = '';

    document.getElementById('new-unit-title').value = '';

    document.getElementById('new-unit-status-select').value = 'pending';

    document.getElementById('new-unit-lap').value = 0;

    document.getElementById('new-unit-weak').checked = false;

    document.getElementById('add-update-unit-btn').textContent = '髴托ｽｽ陷会｣ｰ';

    document.getElementById('cancel-edit-unit-btn').classList.add('hidden');

    // 鬮ｮ・｣隴冗§・ｺ・ｦ郢晢ｽｪ郢ｧ・ｻ郢昴・繝ｨ

    if (editingSubjectId) renderDifficultyCheckboxes('new-unit-difficulty-checks', editingSubjectId, []);

}



function cancelEditUnit() { resetUnitInput(); }

function deleteUnitRequest(idx) { showAppConfirm("陷台ｼ∝求驕抵ｽｺ髫ｱ繝ｻ, "陷台ｼ∝求邵ｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂｰ繝ｻ繝ｻ, () => { appData.subjects[editingSubjectId].syllabus.splice(idx, 1); saveData(); renderUnitList(); updateUI(); }); }



// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螟占◇邵ｺ繝ｻ閻ｰ陷医・骭千ｸｺ・ｧ郢ｧ繧・樒ｹｧ・､郢ｧ・｢郢ｧ・ｦ郢昜ｺ･・ｴ・ｩ郢ｧ蠕鯉ｼ邵ｺ・ｪ邵ｺ繝ｻ・ｺ莠･・ｮ螟奇ｽｿ・ｽ陷会｣ｰ郢晢ｽ｢郢晢ｽｼ郢敖郢晢ｽｫ

// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ蜚週ML陋幢ｽｴ邵ｺ・ｮ隶堤洸ﾂ・ｰ邵ｺ・ｫ陷ｷ蛹ｻ・冗ｸｺ蟶吮ｻ郢ｧ・ｷ郢晢ｽｳ郢晏干ﾎ晉ｸｺ・ｫ邵ｺ蜉ｱ笳・滋莠･・ｮ螟奇ｽｿ・ｽ陷会｣ｰ郢晢ｽ｢郢晢ｽｼ郢敖郢晢ｽｫ

function openDateModal(dateStr) {

    selectedDateString = dateStr;

    document.getElementById('modal-date-title').textContent = formatShortDate(new Date(dateStr));



    const isChallenge = appData.currentSubjectId !== ALL_SUBJECTS_ID && appData.subjects[appData.currentSubjectId]?.type === 'challenge';

    document.getElementById('modal-study-content').style.display = isChallenge ? 'none' : 'block';

    document.getElementById('modal-challenge-content').style.display = isChallenge ? 'block' : 'none';



    if (isChallenge) {

        const subj = appData.subjects[appData.currentSubjectId]; const isDone = !!subj.challengeHistory[dateStr];

        document.getElementById('modal-challenge-status').textContent = `郢昶・ﾎ慕ｹ晢ｽｬ郢晢ｽｳ郢ｧ・ｸ: ${subj.name}`;

        const btn = document.getElementById('toggle-challenge-date-btn'); btn.className = isDone ? "w-full py-3 bg-red-900 text-red-200 rounded-lg" : "w-full py-3 bg-challenge-gold text-app-dark rounded-lg";

        btn.textContent = isDone ? "陷ｿ謔ｶ・願ｱｸ蛹ｻ笘・ : "鬩慕夢繝ｻ雋ょ現竏ｩ邵ｺ・ｫ邵ｺ蜷ｶ・・; btn.onclick = () => { toggleChallengeDate(subj.id, dateStr, !isDone); closeModal(); };

    } else {

        const isAll = appData.currentSubjectId === ALL_SUBJECTS_ID; document.getElementById('set-exam-btn').style.display = isAll ? 'none' : 'block';

        if (!isAll) { const s = appData.subjects[appData.currentSubjectId]; const isSet = s.examDate === dateStr; document.getElementById('exam-btn-text').textContent = isSet ? '騾ｶ・ｮ隶灘揃・ｧ・｣鬮ｯ・､' : '騾ｶ・ｮ隶灘揃・ｨ・ｭ陞ｳ繝ｻ; document.getElementById('set-exam-btn').onclick = () => { s.examDate = isSet ? null : dateStr; if (!isSet && !s.startDate) s.startDate = getTodayStr(); saveData(); updateUI(); closeModal(); }; }

        const comp = document.getElementById('modal-completed-list'); comp.innerHTML = ''; (isAll ? getActiveSubjects() : [appData.subjects[appData.currentSubjectId]]).forEach(s => { (s.syllabus || []).forEach(u => { if (u.completedDate === dateStr) comp.innerHTML += `<div class="text-[10px] mb-1 truncate">隨ｨ繝ｻ[${escapeHtml(s.name)}] ${escapeHtml(u.title)}</div>`; }); });



        const taskList = document.getElementById('modal-task-list');

        taskList.innerHTML = "";

        const currentSchedule = appData.schedules[dateStr] || [];



        currentSchedule.forEach((t, i) => {
            const s = appData.subjects[t.subjectId];
            let u = s?.syllabus.find(x => x.id === t.unitId);

            // 闔会ｽｮ隲・ｳ陷贋ｼ懊・邵ｺ・ｮ陟包ｽｩ陷医・
            if (!u && s?.isVocab && t.unitId.startsWith('vocab_')) {
                const parts = t.unitId.split('_');
                u = { id: t.unitId, title: `${parts[1]} ~ ${parts[2]}`, status: 'pending' };
            }

            if (u) {

                const isDone = u.status === 'completed';

                taskList.innerHTML += `

                        <div class="flex justify-between items-center p-2 text-xs border-b border-gray-800 ${isDone ? 'opacity-50' : ''}">

                            <span class="flex-1 min-w-0 truncate mr-2 ${isDone ? 'line-through' : ''}">[${escapeHtml(s.name)}] ${escapeHtml(u.title)}</span>

                            <button onclick="removeTaskFromDate('${dateStr}', ${i})" class="text-red-400 shrink-0"><i class="fas fa-trash-alt"></i></button>

                        </div>`;

            }

        });



        // UI邵ｺ・ｮ陋ｻ繝ｻ・願ｭ厄ｽｿ邵ｺ繝ｻ
        const normalUnitArea = document.getElementById('normal-unit-input-area');
        const vocabRangeArea = document.getElementById('vocab-range-input-area');

        const isVocab = !isAll && appData.subjects[appData.currentSubjectId]?.isVocab;

        const sel = document.getElementById('unit-selector');

        if (isVocab) {
            normalUnitArea.classList.add('hidden');
            vocabRangeArea.classList.remove('hidden');
            document.getElementById('vocab-range-start').value = '';
            document.getElementById('vocab-range-end').value = '';
        } else {
            normalUnitArea.classList.remove('hidden');
            vocabRangeArea.classList.add('hidden');
            sel.innerHTML = '<option value="">陷贋ｼ懊・髴托ｽｽ陷会｣ｰ...</option>';
        }

        const pendingGroup = document.createElement('optgroup');

        pendingGroup.label = "隴幢ｽｪ陞ｳ蠕｡・ｺ繝ｻ繝ｻ陷贋ｼ懊・";

        pendingGroup.className = "text-white bg-gray-900";



        const completedGroup = document.createElement('optgroup');

        completedGroup.label = "陞ｳ蠕｡・ｺ繝ｻ・ｸ蛹ｻ竏ｩ (陟包ｽｩ驗吝・繝ｻ陷ｻ・ｨ陜励・";

        completedGroup.className = "text-app-success bg-gray-900";



        getCurrentSyllabus().forEach(u => {

            const sId = u._subjectId || appData.currentSubjectId;

            const sName = u._subjectName || appData.subjects[sId].name;

            const isAlreadyScheduled = currentSchedule.some(t => t.subjectId === sId && t.unitId === u.id);



            if (!isAlreadyScheduled) {

                const option = document.createElement('option');

                option.value = `${sId}:${u.id}`;



                if (u.status === 'pending') {

                    option.textContent = `[${sName}] ${u.title}`;

                    pendingGroup.appendChild(option);

                } else {

                    const lap = u.lapCount || 1;

                    option.textContent = `[${sName}] ${u.title} (霑ｴ・ｾ陜ｨ・ｨ: ${lap}陷ｻ・ｨ)`;

                    completedGroup.appendChild(option);

                }

            }

        });



        if (pendingGroup.children.length > 0) sel.appendChild(pendingGroup);

        if (completedGroup.children.length > 0) sel.appendChild(completedGroup);

    }

    document.getElementById('date-modal').classList.remove('hidden');

}



function closeModal() { document.getElementById('date-modal').classList.add('hidden'); }

function removeTaskFromDate(d, i) { appData.schedules[d].splice(i, 1); saveData(); openDateModal(d); updateUI(); }

// 隨倥・・､逕ｻ蟲ｩ繝ｻ螢ｼ驟碑ｭ帶ｺｷ繝ｻ騾・・・帝恆・ｽ陷会｣ｰ邵ｺ蜉ｱ笳・滋莠･・ｮ螟ょ元鬪ｭ・ｲ鬮｢・｢隰ｨ・ｰ

function addUnitToDate() {

    const v = document.getElementById('unit-selector').value;

    if (!v) return;



    const [sid, uid] = v.split(':');



    // 郢ｧ・｢郢晏干ﾎ懆怙繝ｻ繝ｧ郢晢ｽｼ郢ｧ・ｿ邵ｺ・ｮ隴厄ｽｴ隴・ｽｰ

    if (!appData.schedules[selectedDateString]) {

        appData.schedules[selectedDateString] = [];

    }

    appData.schedules[selectedDateString].push({ subjectId: sid, unitId: uid });

    saveData();



    // 隨倥・・・ｸｺ阮吮ｲ髴托ｽｽ陷会｣ｰ鬩幢ｽｨ陋ｻ繝ｻ・ｼ蜩ｦoogle ToDo邵ｺ・ｸ陷ｷ譴ｧ謔・

    const targetSubj = appData.subjects[sid];

    const targetUnit = targetSubj?.syllabus.find(x => x.id === uid);

    if (targetUnit) {

        addToGoogleTasks(targetUnit.title, selectedDateString);

    }



    openDateModal(selectedDateString);
    updateUI();
}

// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螢ｼ閻ｰ髫ｱ讒ｫ・ｸ・ｳ邵ｺ・ｮ驕ｽ繝ｻ蟲・ｬ悶・・ｮ螢ｹ竊鍋ｹｧ蛹ｻ・玖滋莠･・ｮ螟奇ｽｿ・ｽ陷会｣ｰ
function addVocabRangeToDate() {
    const startInput = document.getElementById('vocab-range-start').value;
    const endInput = document.getElementById('vocab-range-end').value;
    const subjId = appData.currentSubjectId;

    if (subjId === ALL_SUBJECTS_ID || !appData.subjects[subjId]?.isVocab) return;

    const start = parseInt(startInput, 10);
    const end = parseInt(endInput, 10);

    if (isNaN(start) || isNaN(end) || start < 1 || start > end) {
        showToast('雎・ｽ｣邵ｺ蜉ｱ・樣⊃繝ｻ蟲・・逎ｯ蟷戊沂繝ｻ遶包ｽｦ 驍ｨ繧・ｽｺ繝ｻ・ｼ蟲ｨ・定怦・･陷牙ｸ呻ｼ邵ｺ・ｦ邵ｺ荳岩味邵ｺ霈費ｼ・, true);
        return;
    }

    const subj = appData.subjects[subjId];
    if (end > (subj.words?.length || 0)) {
        showToast(`驍ｨ繧・ｽｺ繝ｻ蛻・愾・ｷ邵ｺ謔溯・髫ｱ讒ｭ繝ｻ驍ｱ荵礼・(${subj.words?.length || 0})郢ｧ螳夲ｽｶ繝ｻ竏ｴ邵ｺ・ｦ邵ｺ繝ｻ竏ｪ邵ｺ蜈ｪ, true);
        return;
    }

    // 闔会ｽｮ隲・ｳ陷贋ｼ懊・邵ｺ・ｮID郢ｧ蛛ｵﾂ險・cab_start_end邵ｲ髦ｪ繝ｻ陟厄ｽ｢陟台ｸ翫定抄諛医・
    const unitId = `vocab_${start}_${end}`;
    const unitTitle = `${start} ~ ${end}`;

    // syllabus邵ｺ・ｫ邵ｺ・ｯ髴托ｽｽ陷会｣ｰ邵ｺ蟶吮・邵ｲ竏壹○郢ｧ・ｱ郢ｧ・ｸ郢晢ｽ･郢晢ｽｼ郢晢ｽｫ邵ｺ・ｮ邵ｺ・ｿ邵ｺ・ｫ騾具ｽｻ鬪ｭ・ｲ邵ｺ蜷ｶ・・
    // (郢ｧ・ｫ郢晢ｽｬ郢晢ｽｳ郢敖郢晢ｽｼ闕ｳ鄙ｫ繝ｻ schedules 邵ｺ・ｮ郢昴・繝ｻ郢ｧ・ｿ郢ｧ蜑・ｽｽ・ｿ邵ｺ・｣邵ｺ・ｦ闔会ｽｮ隲・ｳ騾ｧ繝ｻ竊馴勗・ｨ驕会ｽｺ邵ｺ蜷ｶ・・

    if (!appData.schedules[selectedDateString]) {
        appData.schedules[selectedDateString] = [];
    }

    // 隴鯉ｽ｢邵ｺ・ｫ陷ｷ蠕個ｧ闔莠･・ｮ螢ｹ窶ｲ邵ｺ・ｪ邵ｺ繝ｻﾂｰ驕抵ｽｺ髫ｱ繝ｻ
    const alreadyExists = appData.schedules[selectedDateString].some(t => t.subjectId === subjId && t.unitId === unitId);
    if (!alreadyExists) {
        appData.schedules[selectedDateString].push({ subjectId: subjId, unitId: unitId });

        // Google ToDo鬨ｾ・｣隰ｳ・ｺ
        addToGoogleTasks(unitTitle, selectedDateString);

        saveData();
        openDateModal(selectedDateString);
        updateUI();
        showToast(`${unitTitle} 邵ｺ・ｮ闔莠･・ｮ螢ｹ・帝恆・ｽ陷会｣ｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);
    } else {
        showToast('隴鯉ｽ｢邵ｺ・ｫ陷ｷ蠕個ｧ驕ｽ繝ｻ蟲・ｸｺ・ｮ闔莠･・ｮ螢ｹ窶ｲ陝・ｼ懈Β邵ｺ蜉ｱ竏ｪ邵ｺ繝ｻ);
    }
}

// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螢ｽ謔・ｫｯ莉吶・郢ｧ蠕娯・郢ｧ蟲ｨ笳守ｸｺ・ｮ陜｣・ｴ邵ｺ・ｧ陷閧ｴ逎・け螢ｹ・邵ｺ・ｦ邵ｺ荳奇ｽ檎ｹｧ蜿･驟碑ｭ帶ｻ・悴隰ｨ・ｰ

function syncFromGoogleTasks() {

    // 郢晏現繝ｻ郢ｧ・ｯ郢晢ｽｳ邵ｺ蠕娯・邵ｺ繝ｻ・ｰ・ｴ陷ｷ繝ｻ

    if (!googleAccessToken) {

        // 髢ｾ・ｪ陷崎ｼ斐定怙髦ｪﾎ溽ｹｧ・ｰ郢ｧ・､郢晢ｽｳ郢ｧ螳夲ｽｩ・ｦ邵ｺ・ｿ郢ｧ荵敖ｰ髢ｨ讒ｭ・･

        if (confirm("Google鬨ｾ・｣隰ｳ・ｺ邵ｺ・ｮ隰暦ｽ･驍ｯ螢ｹ窶ｲ陋ｻ繝ｻ・檎ｸｺ・ｦ邵ｺ繝ｻ竏ｪ邵ｺ蜷ｶﾂ繝ｻn陷閧ｴ逎・け螟ｲ・ｼ蛹ｻﾎ溽ｹｧ・ｰ郢ｧ・､郢晢ｽｳ繝ｻ蟲ｨ・邵ｺ・ｾ邵ｺ蜷ｶﾂｰ繝ｻ繝ｻ)) {

            performGoogleLogin();

        }

        return;

    }



    showToast("Google ToDo邵ｺ荵晢ｽ芽惺譴ｧ謔・叉・ｭ...");

    fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true', {

        headers: { 'Authorization': `Bearer ${googleAccessToken}` }

    })

        .then(response => {

            if (response.status === 401) {

                // 401郢ｧ・ｨ郢晢ｽｩ郢晢ｽｼ繝ｻ蝓滓ｄ鬮ｯ莉吶・郢ｧ魃会ｽｼ蟲ｨ繝ｻ陜｣・ｴ陷ｷ蛹ｻ・り怙髦ｪﾎ溽ｹｧ・ｰ郢ｧ・､郢晢ｽｳ邵ｺ・ｸ髫ｱ莨懶ｽｰ繝ｻ

                throw new Error("AUTH_EXPIRED");

            }

            return response.json();

        })

        .then(data => {

            if (!data.items) {

                showToast("陷ｷ譴ｧ謔・ｸｺ蜷ｶ・狗ｹｧ・ｿ郢ｧ・ｹ郢ｧ・ｯ邵ｺ・ｯ邵ｺ繧・ｽ顔ｸｺ・ｾ邵ｺ蟶呻ｽ鍋ｸｺ・ｧ邵ｺ蜉ｱ笳・);

                return;

            }

            // ...繝ｻ莠包ｽｸ・ｭ騾｡・･繝ｻ螢ｼ・､逕ｻ蟲ｩ邵ｺ・ｪ邵ｺ證ｦ・ｼ繝ｻ..

            let updatedCount = 0;

            const todayStr = getTodayStr();



            data.items.forEach(gTask => {

                if (gTask.title.startsWith("[陝・ｽｦ驗咏ｶｻ ")) {

                    const unitTitle = gTask.title.replace("[陝・ｽｦ驗咏ｶｻ ", "");

                    const isCompletedInGoogle = (gTask.status === 'completed');

                    let taskCompletedDate = null;

                    if (gTask.completed) {

                        taskCompletedDate = formatDate(new Date(gTask.completed));

                    }

                    Object.values(appData.subjects).forEach(subj => {

                        if (subj.type === 'study' && subj.syllabus) {

                            const unit = subj.syllabus.find(u => u.title === unitTitle);

                            if (unit && isCompletedInGoogle && unit.status === 'pending' && taskCompletedDate === todayStr) {

                                unit.status = 'completed';

                                unit.completedDate = taskCompletedDate;

                                updatedCount++;

                            }

                        }

                    });

                }

            });



            if (updatedCount > 0) {

                saveData();

                updateUI();

                showToast(`${updatedCount}陋滉ｹ昴・陷贋ｼ懊・郢ｧ雋樣・隴帶ｺ假ｼ邵ｺ・ｾ邵ｺ蜉ｱ笳・);

            } else {

                showToast("隴・ｽｰ邵ｺ蜉ｱ・櫁楜蠕｡・ｺ繝ｻ縺｡郢ｧ・ｹ郢ｧ・ｯ邵ｺ・ｯ邵ｺ繧・ｽ顔ｸｺ・ｾ邵ｺ蟶呻ｽ・);

            }

        })

        .catch(err => {

            if (err.message === "AUTH_EXPIRED" || err.message.includes("401")) {

                if (confirm("隰暦ｽ･驍ｯ螢ｹ繝ｻ隴帷甥譟題ｭ帶ｻ・応邵ｺ謔溘・郢ｧ蠕娯穐邵ｺ蜉ｱ笳・ｸｲ繝ｻn陷閧ｴ逎・け螢ｹ・邵ｺ・ｾ邵ｺ蜷ｶﾂｰ繝ｻ繝ｻ)) {

                    performGoogleLogin();

                }

            } else {

                console.error("Sync error:", err);

                showToast("陷ｷ譴ｧ謔・ｹｧ・ｨ郢晢ｽｩ郢晢ｽｼ邵ｺ讙主験騾墓ｺ假ｼ邵ｺ・ｾ邵ｺ蜉ｱ笳・);

            }

        });

}

function openSettingsModal() {

    document.getElementById('settings-modal').classList.remove('hidden');

    updateThemeBtn(document.documentElement.classList.contains('light-mode'));

    // 郢晁・繝ｻ郢ｧ・ｸ郢晢ｽｧ郢晢ｽｳ騾｡・ｪ陷ｿ・ｷ郢ｧ雋樊ｸ夊ｭ擾｣ｰ

    const vDisplay = document.getElementById('app-version-display');

    if (vDisplay && typeof APP_VERSION !== 'undefined') vDisplay.textContent = APP_VERSION;

}

function closeSettingsModal() { document.getElementById('settings-modal').classList.add('hidden'); }

function requestReset() { showAppConfirm("陷茨ｽｨ郢晢ｽｪ郢ｧ・ｻ郢昴・繝ｨ", "陷茨ｽｨ邵ｺ・ｦ邵ｺ・ｮ郢昴・繝ｻ郢ｧ・ｿ郢ｧ蜻茨ｽｶ莠･謔臥ｸｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂｰ繝ｻ繝ｻ, () => { appData = getBlankData(); saveData(); updateUI(); closeSettingsModal(); }); }

function exportData() { const blob = new Blob([JSON.stringify(appData)], { type: "application/json" }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup_${getTodayStr()}.json`; a.click(); }

// 陟包ｽｩ雎｢・ｻ: 郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ郢ｧ・､郢晢ｽｳ郢晄亢繝ｻ郢晏沺・ｩ貅ｯ繝ｻ

function importData(input) { const reader = new FileReader(); reader.onload = (e) => { appData = migrateData(JSON.parse(e.target.result)); saveData(); updateUI(); showToast('陟包ｽｩ陷医・・邵ｺ・ｾ邵ｺ蜉ｱ笳・); }; reader.readAsText(input.files[0]); }

function copyForKeep() {

    const d = formatDate(currentRecordDate); const tasks = appData.schedules[d] || [];

    let text = `邵ｲ繝ｻ{d} 邵ｺ・ｮ髫ｪ蛟ｬ鮖ｸ邵ｲ譖ｾn`; tasks.forEach(task => { const s = appData.subjects[task.subjectId]; const u = s?.syllabus.find(x => x.id === task.unitId); if (u) text += `${u.status === 'completed' ? '隨倥・ : '隨倥・} [${s.name}] ${u.title}\n`; });

    copyTextToClipboard(text); showToast('郢ｧ・ｳ郢晄鱒繝ｻ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}



// 陟包ｽｩ雎｢・ｻ: Gemini(AI)鬨ｾ・｣隰ｳ・ｺ隶匁ｺｯ繝ｻ

function copyPrompt() {

    const text = document.getElementById('gemini-prompt-template').value;

    copyTextToClipboard(text);

    showToast("郢昴・ﾎｦ郢晏干ﾎ樒ｹ晢ｽｼ郢晏現・堤ｹｧ・ｳ郢晄鱒繝ｻ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}



function importFromGemini() {

    const input = document.getElementById('gemini-json-input');

    const jsonStr = input.value.trim();

    if (!jsonStr) return;

    try {

        const data = JSON.parse(jsonStr);

        if (!data.name || !data.syllabus) throw new Error("陟厄ｽ｢陟台ｸ岩ｲ雎・ｽ｣邵ｺ蜉ｱ・･邵ｺ繧・ｽ顔ｸｺ・ｾ邵ｺ蟶呻ｽ・);



        const id = 'subj_' + Date.now();

        const newSubj = {

            id: id,

            type: 'study',

            name: data.name,

            examDate: null,

            startDate: getTodayStr(),

            isActive: true,

            history: {},

            syllabus: data.syllabus.map((item, i) => ({

                id: `u_${Date.now()}_${i}`,

                category: item.category,

                title: item.title,

                status: 'pending',

                isWeak: false

            }))

        };

        appData.subjects[id] = newSubj;

        saveData();

        updateUI();

        input.value = '';

        showToast(`邵ｲ繝ｻ{data.name}邵ｲ髦ｪ・定愾謔ｶ・企恷・ｼ邵ｺ・ｿ邵ｺ・ｾ邵ｺ蜉ｱ笳・);

    } catch (e) {

        alert("JSON邵ｺ・ｮ髫ｱ・ｭ邵ｺ・ｿ髴趣ｽｼ邵ｺ・ｿ邵ｺ・ｫ陞滂ｽｱ隰ｨ蜉ｱ・邵ｺ・ｾ邵ｺ蜉ｱ笳・ " + e.message);

    }

}



// 隨倥・ID郢晏生繝ｻ郢ｧ・ｹ邵ｺ・ｮ郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ隶堤洸ﾂ・ｰ郢ｧ・ｨ郢ｧ・ｯ郢ｧ・ｹ郢晄亢繝ｻ郢昴・陷髦ｪ縺・ｹ晢ｽｳ郢晄亢繝ｻ郢昴・

function exportSyllabusStructure() {

    if (!editingSubjectId) { showToast("驕倬・蟯ｼ邵ｺ遒≫・隰壽ｧｭ・・ｹｧ蠕娯ｻ邵ｺ繝ｻ竏ｪ邵ｺ蟶呻ｽ・); return; }

    const subj = appData.subjects[editingSubjectId];

    if (!subj || !subj.syllabus || subj.syllabus.length === 0) { showToast("陷贋ｼ懊・邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ・); return; }

    const structure = subj.syllabus.map(u => ({ id: u.id, category: u.category || "", title: u.title, difficulty: u.difficulty || "" }));

    const json = JSON.stringify(structure, null, 2);

    copyTextToClipboard(json);

    showToast(`${structure.length}闔会ｽｶ邵ｺ・ｮ隶堤洸ﾂ・ｰJSON郢ｧ蛛ｵ縺慕ｹ晄鱒繝ｻ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}



function reimportSyllabusStructure() {

    if (!editingSubjectId) { showToast("驕倬・蟯ｼ邵ｺ遒≫・隰壽ｧｭ・・ｹｧ蠕娯ｻ邵ｺ繝ｻ竏ｪ邵ｺ蟶呻ｽ・); return; }

    const subj = appData.subjects[editingSubjectId];

    if (!subj) return;



    const input = document.getElementById('syllabus-structure-input');

    const jsonStr = input.value.trim();

    if (!jsonStr) { showToast("JSON郢ｧ螳夲ｽｲ・ｼ郢ｧ雍具ｽｻ蛟･・邵ｺ・ｦ邵ｺ荳岩味邵ｺ霈費ｼ・); return; }



    let newStructure;

    try { newStructure = JSON.parse(jsonStr); } catch (e) { showToast("隨橸｣ｰ繝ｻ繝ｻJSON陟厄ｽ｢陟台ｸ翫♀郢晢ｽｩ郢晢ｽｼ: " + e.message); return; }

    if (!Array.isArray(newStructure)) { showToast("隨橸｣ｰ繝ｻ繝ｻ鬩滓ｦ翫・陟厄ｽ｢陟台ｸ翫・JSON邵ｺ謔滂ｽｿ繝ｻ・ｦ竏壹堤ｸｺ繝ｻ); return; }



    // ID隶諛・ｽｨ・ｼ: 隴鯉ｽ｢陝・・yllabus邵ｺ・ｮID郢ｧ・ｻ郢昴・繝ｨ

    const existingIds = new Set(subj.syllabus.map(u => u.id));

    const newIds = newStructure.map(u => u.id);

    const newIdSet = new Set(newIds);



    // 鬩･蟠趣ｽ､繝ｻ繝｡郢ｧ・ｧ郢昴・縺・

    if (newIds.length !== newIdSet.size) { showToast("隨橸｣ｰ繝ｻ繝ｻ鬩･蟠趣ｽ､繝ｻ・邵ｺ讚船邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ繝ｻ); return; }



    // 隴鯉ｽ｢陝・･竊鍋ｸｺ繧・夢邵ｺ・ｦ隴・ｽｰ髫穂ｸ岩・邵ｺ・ｪ邵ｺﾐ魯

    const missingIds = [...existingIds].filter(id => !newIdSet.has(id));

    if (missingIds.length > 0) { showToast(`隨橸｣ｰ繝ｻ繝ｻ${missingIds.length}闔会ｽｶ邵ｺ・ｮID邵ｺ蠕｡・ｸ蟠趣ｽｶ・ｳ: ${missingIds[0]}...`); return; }



    // 隴・ｽｰ髫穂ｸ岩・邵ｺ繧・夢邵ｺ・ｦ隴鯉ｽ｢陝・･竊鍋ｸｺ・ｪ邵ｺﾐ魯

    const extraIds = [...newIdSet].filter(id => !existingIds.has(id));

    if (extraIds.length > 0) { showToast(`隨橸｣ｰ繝ｻ繝ｻ${extraIds.length}闔会ｽｶ邵ｺ・ｮ闕ｳ閧ｴ繝ｻ邵ｺ・ｪID: ${extraIds[0]}...`); return; }



    // 陷ｷ繝ｻ・ｰ繝ｻ蟯ｼ邵ｺ・ｫcategory/title邵ｺ蠕娯旺郢ｧ荵敖ｰ

    for (const item of newStructure) {

        if (typeof item.category === 'undefined' || typeof item.title === 'undefined') {

            showToast(`隨橸｣ｰ繝ｻ繝ｻid:${item.id} 邵ｺ・ｫcategory邵ｺ・ｾ邵ｺ貅倥・title邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ伝); return;

        }

    }



    // 隶諛・ｽｨ・ｼOK 遶翫・category/title/difficulty邵ｺ・ｮ邵ｺ・ｿ隴厄ｽｴ隴・ｽｰ

    const updateMap = {};

    newStructure.forEach(item => { updateMap[item.id] = { category: item.category, title: item.title, difficulty: item.difficulty }; });



    let changed = 0;

    subj.syllabus.forEach(unit => {

        const update = updateMap[unit.id];

        if (unit.category !== update.category || unit.title !== update.title || (unit.difficulty || '') !== (update.difficulty || '')) {

            unit.category = update.category;

            unit.title = update.title;

            unit.difficulty = update.difficulty || undefined;

            changed++;

        }

    });



    saveData(); updateUI(); renderUnitList();

    input.value = '';

    showToast(`${changed}闔会ｽｶ邵ｺ・ｮcategory/title郢ｧ蜻亥ｳｩ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}



function importTickerData() {

    const input = document.getElementById('ticker-json-input');

    const jsonStr = input.value.trim();

    if (!jsonStr) return;

    try {

        const data = JSON.parse(jsonStr);

        if (!data.categories || !data.messages) throw new Error("陟厄ｽ｢陟台ｸ岩ｲ雎・ｽ｣邵ｺ蜉ｱ・･邵ｺ繧・ｽ顔ｸｺ・ｾ邵ｺ蟶呻ｽ・);



        let addedCategories = 0;

        let updatedCategories = 0;

        let addedMessages = 0;



        // Merge categories

        data.categories.forEach(newCat => {

            if (!newCat.id || !newCat.name) return; // Basic validation

            const existingCatIndex = appData.ticker.categories.findIndex(c => c.id === newCat.id);

            if (existingCatIndex > -1) {

                // Update existing category

                appData.ticker.categories[existingCatIndex] = { ...appData.ticker.categories[existingCatIndex], ...newCat };

                updatedCategories++;

            } else {

                // Add new category

                appData.ticker.categories.push(newCat);

                addedCategories++;

            }

        });



        // Merge messages

        data.messages.forEach(newMsg => {

            if (!newMsg.categoryId || !newMsg.text) return; // Basic validation

            const isDuplicate = appData.ticker.messages.some(m => m.categoryId === newMsg.categoryId && m.text === newMsg.text);

            if (!isDuplicate) {

                appData.ticker.messages.push(newMsg);

                addedMessages++;

            }

        });



        saveData();

        renderTickerSettings();

        initTicker(); // Restart ticker

        input.value = '';

        showToast(`郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ: ${addedCategories}闔会ｽｶ髴托ｽｽ陷会｣ｰ, ${updatedCategories}闔会ｽｶ隴厄ｽｴ隴・ｽｰ. 郢晢ｽ｡郢昴・縺晉ｹ晢ｽｼ郢ｧ・ｸ: ${addedMessages}闔会ｽｶ髴托ｽｽ陷会｣ｰ`);

    } catch (e) {

        alert("JSON邵ｺ・ｮ髫ｱ・ｭ邵ｺ・ｿ髴趣ｽｼ邵ｺ・ｿ邵ｺ・ｫ陞滂ｽｱ隰ｨ蜉ｱ・邵ｺ・ｾ邵ｺ蜉ｱ笳・ " + e.message);

    }

}

function resetTickerData() {

    if (confirm("郢昴・縺・ｹ昴・縺咲ｹ晢ｽｼ郢昴・繝ｻ郢ｧ・ｿ郢ｧ雋槭・隴帶ｺｷ蝟ｧ邵ｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂｰ繝ｻ繝ｻ)) {

        appData.ticker = JSON.parse(JSON.stringify(defaultTicker));

        saveData();

        renderTickerSettings();

        initTicker();

        showToast("陋ｻ譎・ｄ陋ｹ謔ｶ・邵ｺ・ｾ邵ｺ蜉ｱ笳・);

    }

}



function copyLongTermPrompt() {

    const subjects = getActiveSubjects().map(s => `${s.name} (騾ｶ・ｮ隶薙・ ${s.examDate || '隴幢ｽｪ陞ｳ繝ｻ})`).join(', ');

    const text = `闔会ｽ･闕ｳ荵昴・驕倬・蟯ｼ邵ｺ・ｮ鬮滂ｽｷ隴帶ｺｷ・ｭ・ｦ驗吝ｮ夲ｽｨ閧ｲ蛻､郢ｧ蝣､・ｫ荵昶ｻ邵ｺ・ｦ邵ｺ荳岩味邵ｺ霈費ｼ樒ｸｲ繝ｻn霑ｴ・ｾ陜ｨ・ｨ隴鯉ｽ･: ${getTodayStr()}\n驕倬・蟯ｼ: ${subjects}\n\n隴夲ｽ｡闔会ｽｶ:\n- 髫ｧ・ｦ鬯ｨ謐ｺ蠕狗ｸｺ荵晢ｽ蛾ｨｾ繝ｻ・ｮ蜉ｱ・邵ｺ・ｦ隴帛現・・ｸｺ・ｨ邵ｺ・ｮ郢晄ｧｭ縺・ｹ晢ｽｫ郢ｧ・ｹ郢晏現繝ｻ郢晢ｽｳ郢ｧ蜻育ｽｲ驕会ｽｺ\n- 陷・ｽｪ陷育｣ｯ・ｰ繝ｻ・ｽ髦ｪ・堤ｸｺ・､邵ｺ莉｣・狗ｸｺ阮吮・`;

    copyTextToClipboard(text);

    document.getElementById('gemini-copy-feedback').classList.remove('hidden');

    setTimeout(() => document.getElementById('gemini-copy-feedback').classList.add('hidden'), 3000);

}



function copyDailyPrompt() {

    const pending = getCurrentSyllabus().filter(i => i.status === 'pending').slice(0, 10).map(i => i.title).join(', ');

    const text = `闔蛾大ｾ狗ｸｺ・ｮ陝・ｽｦ驗吝・縺帷ｹｧ・ｱ郢ｧ・ｸ郢晢ｽ･郢晢ｽｼ郢晢ｽｫ郢ｧ蜑・ｽｽ諛医・邵ｺ蜉ｱ窶ｻ邵ｺ荳岩味邵ｺ霈費ｼ樒ｸｲ繝ｻn霑ｴ・ｾ陜ｨ・ｨ隴鯉ｽ･: ${getTodayStr()}\n陷・ｽｪ陷郁ご蝎ｪ邵ｺ・ｫ郢ｧ繝ｻ・狗ｸｺ・ｹ邵ｺ讎願・陷医・ﾂ蜻ｵ・｣繝ｻ ${pending}\n\n隴夲ｽ｡闔会ｽｶ:\n- 闔ｨ隨ｬ繝ｻ郢ｧ雋樊ｧ郢ｧ竏壺螺霑ｴ・ｾ陞ｳ貅ｽ蝎ｪ邵ｺ・ｪ隴弱ｋ菫｣陷托ｽｲ\n- 鬮ｮ繝ｻ・ｸ・ｭ陷牙ｸ吮ｲ鬯ｮ蛟･・櫁怺莠･辯戊叉・ｭ邵ｺ・ｫ鬩･髦ｪ・樒ｹｧ・ｿ郢ｧ・ｹ郢ｧ・ｯ`;

    copyTextToClipboard(text);

    document.getElementById('gemini-copy-feedback').classList.remove('hidden');

    setTimeout(() => document.getElementById('gemini-copy-feedback').classList.add('hidden'), 3000);

}



function copyReportPrompt() {

    const todayStr = getTodayStr();

    const done = [];

    getActiveSubjects().forEach(s => {

        s.syllabus.forEach(u => {

            if (u.completedDate === todayStr) done.push(`[${s.name}] ${u.title}`);

        });

    });

    const text = `闔蛾大ｾ狗ｸｺ・ｮ陝・ｽｦ驗呵ｲ橸｣ｰ・ｱ陷ｻ鄙ｫ縲堤ｸｺ蜷ｶﾂ繝ｻn陞ｳ貊灘多隴鯉ｽ･: ${todayStr}\n陞ｳ蠕｡・ｺ繝ｻ・邵ｺ貅ｷ閻ｰ陷医・\n${done.join('\n') || '邵ｺ・ｪ邵ｺ繝ｻ}\n\n邵ｺ阮吶・陷繝ｻ・ｮ・ｹ邵ｺ・ｧ髫榊・・∫ｸｺ・ｦ邵ｲ竏ｵ・ｬ・｡邵ｺ・ｮ郢晢ｽ｢郢昶・繝ｻ郢晢ｽｼ郢ｧ・ｷ郢晢ｽｧ郢晢ｽｳ邵ｺ・ｫ邵ｺ・､邵ｺ・ｪ邵ｺ蠕鯉ｽ狗ｹｧ・｢郢晏ｳｨ繝ｰ郢ｧ・､郢ｧ・ｹ郢ｧ蛛ｵ・･邵ｺ・ｰ邵ｺ霈費ｼ樒ｸｲ・｡;

    copyTextToClipboard(text);

    document.getElementById('gemini-copy-feedback').classList.remove('hidden');

    setTimeout(() => document.getElementById('gemini-copy-feedback').classList.add('hidden'), 3000);

}



// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ蜩・隶堤洸ﾂ・ｰ驍ｱ・ｨ鬮ｮ繝ｻ逡鷹ｫ｢・｢隰ｨ・ｰ (郢ｧ・ｿ郢ｧ・ｰ陝・ｽｾ陟｢諛・ｲｿ)

function exportSyllabusStructure() {

    const subj = appData.subjects[editingSubjectId];

    if (!subj || !subj.syllabus) {

        showToast("陷贋ｼ懊・郢昴・繝ｻ郢ｧ・ｿ邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ・);

        return;

    }

    // ID, Category, Title, Difficulty郢ｧ雋槭・陷峨・

    const data = subj.syllabus.map(u => ({

        id: u.id,

        category: u.category,

        title: u.title,

        difficulty: u.difficulty

    }));

    const json = JSON.stringify(data, null, 2);

    document.getElementById('syllabus-structure-input').value = json;

    copyTextToClipboard(json); // 郢ｧ・ｯ郢晢ｽｪ郢昴・繝ｻ郢晄㈱繝ｻ郢晏ｳｨ竊鍋ｹｧ繧・＆郢晄鱒繝ｻ

    showToast("JSON郢ｧ蛛ｵ縺醍ｹ晢ｽｪ郢昴・繝ｻ郢晄㈱繝ｻ郢晏ｳｨ竊鍋ｹｧ・ｳ郢晄鱒繝ｻ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}



function reimportSyllabusStructure() {

    const input = document.getElementById('syllabus-structure-input').value;

    if (!input) {

        showToast("JSON郢ｧ雋槭・陷牙ｸ呻ｼ邵ｺ・ｦ邵ｺ荳岩味邵ｺ霈費ｼ・);

        return;

    }

    try {

        const data = JSON.parse(input);

        if (!Array.isArray(data)) throw new Error("郢晢ｽｫ郢晢ｽｼ郢晏現窶ｲ鬩滓ｦ翫・邵ｺ・ｧ邵ｺ・ｯ邵ｺ繧・ｽ顔ｸｺ・ｾ邵ｺ蟶呻ｽ・);



        const subj = appData.subjects[editingSubjectId];

        if (!subj || !subj.syllabus) {

            showToast("驕倬・蟯ｼ邵ｺ遒≫・隰壽ｧｭ・・ｹｧ蠕娯ｻ邵ｺ繝ｻ竏ｪ邵ｺ蟶呻ｽ・);

            return;

        }



        let count = 0;

        data.forEach(item => {

            // ID邵ｺ・ｧ郢晄ｧｭ繝｣郢昶・ﾎｦ郢ｧ・ｰ邵ｺ蜉ｱ窶ｻ隴厄ｽｴ隴・ｽｰ

            const unit = subj.syllabus.find(u => u.id === item.id);

            if (unit) {

                if (item.category !== undefined) unit.category = item.category;

                if (item.title !== undefined) unit.title = item.title;



                // difficulty邵ｺ・ｮ隴厄ｽｴ隴・ｽｰ (鬩滓ｦ翫・陝・ｽｾ陟｢繝ｻ

                if (item.difficulty !== undefined) {

                    if (Array.isArray(item.difficulty)) {

                        unit.difficulty = item.difficulty;

                    } else if (typeof item.difficulty === 'string') {

                        unit.difficulty = [item.difficulty];

                    } else {

                        unit.difficulty = undefined; // null邵ｺ・ｪ邵ｺ・ｩ邵ｺ・ｯ郢ｧ・ｯ郢晢ｽｪ郢ｧ・｢

                    }

                }

                count++;

            }

        });

        saveData();

        renderUnitList(); // 郢晢ｽｪ郢ｧ・ｹ郢昜ｺ･繝ｻ隰蜀怜愛

        showToast(`${count}闔会ｽｶ邵ｺ・ｮ陷贋ｼ懊・隲繝ｻ・ｰ・ｱ郢ｧ蜻亥ｳｩ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

    } catch (e) {

        showAppConfirm("郢ｧ・ｨ郢晢ｽｩ郢晢ｽｼ", "JSON邵ｺ・ｮ郢昜ｻ｣繝ｻ郢ｧ・ｹ邵ｺ・ｫ陞滂ｽｱ隰ｨ蜉ｱ・邵ｺ・ｾ邵ｺ蜉ｱ笳・\n" + e.message, () => { });

    }

}



// --- CHART & UPDATE UI ---

// 隨倥・・ｿ・ｮ雎・ｽ｣霑夊肩・ｼ螢ｹﾂ譴ｧ驥碁ｩ輔・initial)邵ｲ髦ｪ・定崕譎・ｄ鬨ｾ・ｲ隰仙干竊堤ｸｺ蜉ｱ窶ｻ郢ｧ・ｰ郢晢ｽｩ郢晁ｼ披・陷ｿ閧ｴ荳千ｸｺ霈披雷郢ｧ遏ｩ譛ｪ隰ｨ・ｰ

function updatePaceChart(isChallenge) {

    const chartCanvas = document.getElementById('paceChart');

    if (!chartCanvas) return;



    const labels = [], actual = [], ideal = [], trend = [];

    let start, end;

    const today = getToday();



    let initialPercent = 0;

    // 郢晁ｼ斐≦郢晢ｽｫ郢ｧ・ｿ郢晢ｽｪ郢晢ｽｳ郢ｧ・ｰ陝・ｽｾ髮趣ｽ｡邵ｺ・ｮ郢ｧ・｢郢ｧ・､郢昴・ﾎ堤ｹ晢ｽｪ郢ｧ・ｹ郢昴・

    let targetItems = [];

    let totalTargetCount = 0;



    if (appData.currentSubjectId === ALL_SUBJECTS_ID) {

        // 陷茨ｽｨ驕倬・蟯ｼ郢晢ｽ｢郢晢ｽｼ郢昜ｼ夲ｽｼ蛹ｻ繝ｵ郢ｧ・｣郢晢ｽｫ郢ｧ・ｿ鬮ｱ讒ｫ・ｯ・ｾ陟｢諛ｶ・ｼ螢ｼ・ｾ謐ｺ謫るｨｾ螢ｹ・撹istory郢ｧ蜑・ｽｽ・ｿ騾包ｽｨ繝ｻ繝ｻ

        const dates = new Set();

        getActiveSubjects().forEach(s => {

            Object.keys(s.history).forEach(d => dates.add(d));

            if (s.startDate) dates.add(s.startDate);

        });

        dates.add(getTodayStr());

        const sorted = Array.from(dates).sort();

        if (sorted.length === 0) return;

        start = new Date(sorted[0]);



        let maxE = 0;

        getActiveSubjects().forEach(s => { if (s.examDate) maxE = Math.max(maxE, new Date(s.examDate).getTime()); });

        end = maxE > 0 ? new Date(maxE) : null;

        initialPercent = 0;



    } else {

        const s = appData.subjects[appData.currentSubjectId];

        if (!s) return;



        start = s.startDate ? new Date(s.startDate) : getToday();

        end = s.examDate ? new Date(s.examDate) : null;



        if (!isChallenge && s.syllabus && s.syllabus.length > 0) {

            // 隨倥・繝ｵ郢ｧ・｣郢晢ｽｫ郢ｧ・ｿ鬩包ｽｩ騾包ｽｨ繝ｻ螟よｨ溯舉・ｨ邵ｺ・ｮ郢晁ｼ斐≦郢晢ｽｫ郢ｧ・ｿ髫ｪ・ｭ陞ｳ螢ｹ・定愾髢・ｾ蜉ｱ・邵ｺ・ｦsyllabus郢ｧ蝣､・ｵ讒ｭ・企恷・ｼ郢ｧﾂ

            const filter = getDifficultyFilter(appData.currentSubjectId);

            targetItems = s.syllabus.filter(u => {

                // isUnitInFilter騾ｶ・ｸ陟冶侭繝ｻ郢晢ｽｭ郢ｧ・ｸ郢昴・縺代・蛹ｻ竏ｪ邵ｺ貅倥・鬮｢・｢隰ｨ・ｰ陷ｻ・ｼ邵ｺ・ｳ陷・ｽｺ邵ｺ證ｦ・ｼ繝ｻ

                const tags = Array.isArray(u.difficulty) ? u.difficulty : (u.difficulty ? [u.difficulty] : []);

                if (tags.length === 0) return true; // 郢ｧ・ｿ郢ｧ・ｰ邵ｺ・ｪ邵ｺ蜉ｱ繝ｻ陝ｶ・ｸ邵ｺ・ｫ陷ｷ・ｫ郢ｧ竏夲ｽ・

                return tags.some(t => filter.includes(t));

            });

            totalTargetCount = targetItems.length;



            const startDateStr = formatDate(start);



            if (totalTargetCount > 0) {

                // 驍ｨ讒ｭ・企恷・ｼ邵ｺ・ｾ郢ｧ蠕娯螺闕ｳ・ｭ邵ｺ・ｧ邵ｺ・ｮ陋ｻ譎・ｄ陞ｳ蠕｡・ｺ繝ｻ辟・

                const initialDoneCount = targetItems.filter(u =>

                    u.status === 'completed' &&

                    (u.completedDate === 'initial' || (u.completedDate && u.completedDate <= startDateStr))

                ).length;

                initialPercent = Math.round((initialDoneCount / totalTargetCount) * 100);

            } else {

                initialPercent = 0;

            }

        }

    }



    const dispEnd = (end && end > today) ? end : today;

    let cursor = new Date(start);

    let dayIdx = 0;

    const points = [];



    while (cursor <= dispEnd) {

        const dStr = formatDate(cursor);

        labels.push(formatShortDate(cursor));



        if (cursor <= today) {

            let val = 0;

            if (isChallenge) {

                const s = appData.subjects[appData.currentSubjectId];

                const daysPassed = Math.floor((cursor - new Date(s.startDate)) / 86400000) + 1;

                let done = 0;

                for (let k in s.challengeHistory) { if (new Date(k) <= cursor && new Date(k) >= new Date(s.startDate)) done++; }

                val = daysPassed > 0 ? Math.round((done / daysPassed) * 100) : 0;

            } else {

                if (appData.currentSubjectId === ALL_SUBJECTS_ID) {

                    // 陷茨ｽｨ驕倬・蟯ｼ邵ｺ・ｯ陟墓瑳謫るｨｾ螢ｹ・・

                    let total = 0, count = 0;

                    getActiveSubjects().forEach(s => { total += getProgressAt(s, dStr); count++; });

                    val = count > 0 ? Math.round(total / count) : 0;

                } else {

                    // 隨倥・閻ｰ驕倬・蟯ｼ邵ｺ・ｯ郢晁ｼ斐≦郢晢ｽｫ郢ｧ・ｿ郢晢ｽｪ郢晢ｽｳ郢ｧ・ｰ驍ｨ蜈域｣｡邵ｺ荵晢ｽ芽恪諷募飭邵ｺ・ｫ髫ｪ閧ｲ・ｮ繝ｻ

                    if (totalTargetCount > 0) {

                        // 邵ｺ譏ｴ繝ｻ隴鯉ｽ･邵ｺ・ｾ邵ｺ・ｧ邵ｺ・ｫ陞ｳ蠕｡・ｺ繝ｻ・邵ｺ貅倥＞郢ｧ・､郢昴・ﾎ定ｬｨ・ｰ繝ｻ閧ｲ・ｵ讒ｭ・企恷・ｼ邵ｺ・ｿ雋ょ現竏ｩ郢晢ｽｪ郢ｧ・ｹ郢晏現ﾂｰ郢ｧ莨夲ｽｼ繝ｻ

                        const doneCount = targetItems.filter(u =>

                            u.status === 'completed' &&

                            (u.completedDate === 'initial' || (u.completedDate && u.completedDate <= dStr))

                        ).length;

                        val = Math.round((doneCount / totalTargetCount) * 100);

                    } else {

                        val = 0;

                    }

                }

                if (val < initialPercent) val = initialPercent;

                points.push({ x: dayIdx, y: val });

            }

            actual.push(val);

        } else {

            actual.push(null);

        }



        if (!isChallenge && end) {

            const totalDays = (end - start) / 86400000;

            const passed = (cursor - start) / 86400000;

            if (totalDays > 0) {

                const idealVal = initialPercent + (100 - initialPercent) * (passed / totalDays);

                ideal.push(Math.min(100, idealVal));

            } else {

                ideal.push(100);

            }

        } else {

            ideal.push(null);

        }



        cursor.setDate(cursor.getDate() + 1);

        dayIdx++;

    }



    if (!isChallenge) {

        // 隨倥・・ｿ・ｮ雎・ｽ｣: 騾ｶ・ｴ髴代・4隴鯉ｽ･鬮｢阮吶・郢昴・繝ｻ郢ｧ・ｿ邵ｺ・ｧ郢晏現ﾎ樒ｹ晢ｽｳ郢晏ｳｨ・帝坎閧ｲ・ｮ繝ｻ

        const validPoints = points.filter(p => !isNaN(p.y));

        const recentPoints = validPoints.slice(-14); // 騾ｶ・ｴ髴代・4陋溘・

        let res = null;



        if (recentPoints.length >= 2) {

            // 騾ｶ・ｴ髴台ｻ｣繝ｧ郢晢ｽｼ郢ｧ・ｿ邵ｺ・ｮx陟趣ｽｧ隶灘生・・隘搾ｽｷ霓､・ｹ邵ｺ・ｫ雎・ｽ｣髫穂ｸ槫密邵ｺ蟶吮・邵ｲ竏壺落邵ｺ・ｮ邵ｺ・ｾ邵ｺ・ｾ髫ｪ閧ｲ・ｮ蜉ｱ・邵ｺ・ｦ陷茨ｽｨ闖ｴ阮吶・郢晏現ﾎ樒ｹ晢ｽｳ郢晏ｳｨ竊楢嵯蜉ｱ笳狗ｹｧ繝ｻ

            res = calculateLeastSquares(recentPoints);

        } else if (validPoints.length >= 2) {

            res = calculateLeastSquares(validPoints); // 郢昴・繝ｻ郢ｧ・ｿ闕ｳ蟠趣ｽｶ・ｳ邵ｺ・ｪ郢ｧ迚吶・隴帶ｻ・ｿ｣

        }



        if (res) {

            // 郢晏現ﾎ樒ｹ晢ｽｳ郢晏ｳｨﾎ帷ｹｧ・､郢晢ｽｳ隰蜀怜愛

            for (let i = 0; i < labels.length; i++) {

                trend.push(Math.max(0, Math.min(100, res.slope * i + res.intercept)));

            }



            // 隨倥・・ｿ・ｽ陷会｣ｰ: 陞ｳ蠕｡・ｺ繝ｻ・ｺ蝓滂ｽｸ・ｬ隴鯉ｽ･邵ｺ・ｮ髫ｪ閧ｲ・ｮ蜉ｱ竊帝勗・ｨ驕会ｽｺ

            if (res.slope > 0) {

                const daysToFinish = (100 - res.intercept) / res.slope;

                const finishDate = new Date(start);

                finishDate.setDate(finishDate.getDate() + Math.ceil(daysToFinish));



                // 邵ｺ繧・穐郢ｧ鄙ｫ竊馴ｩ包｣ｰ邵ｺ繝ｻ謔ｴ隴夲ｽ･繝ｻ繝ｻ0陝ｷ・ｴ闔会ｽ･闕ｳ髮√・繝ｻ蟲ｨ繝ｻ髯ｦ・ｨ驕会ｽｺ邵ｺ蜉ｱ竊醍ｸｺ繝ｻ

                const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() + 5);



                if (finishDate > maxDate) {

                    document.getElementById('predicted-finish-date').textContent = '闔蝓滂ｽｸ・ｬ陞ｳ蠕｡・ｺ繝ｻ 隴幢ｽｪ陞ｳ繝ｻ(郢晏｣ｹ繝ｻ郢ｧ・ｹ闕ｳ蟠趣ｽｶ・ｳ)';

                } else if (daysToFinish < 0) {

                    document.getElementById('predicted-finish-date').textContent = '闔蝓滂ｽｸ・ｬ陞ｳ蠕｡・ｺ繝ｻ 鬩慕夢繝ｻ雋ょ現竏ｩ';

                } else {

                    document.getElementById('predicted-finish-date').textContent = `闔蝓滂ｽｸ・ｬ陞ｳ蠕｡・ｺ繝ｻ ${formatDate(finishDate)}`;

                }

            } else {

                document.getElementById('predicted-finish-date').textContent = '闔蝓滂ｽｸ・ｬ陞ｳ蠕｡・ｺ繝ｻ -- (郢晏｣ｹ繝ｻ郢ｧ・ｹ陋帶㊧・ｻ讓費ｽｸ・ｭ)';

            }

        }

    }



    paceChart.data.labels = labels;

    paceChart.data.datasets[0].data = ideal;

    paceChart.data.datasets[1].data = actual;

    paceChart.data.datasets[2].data = trend;



    // 隨倥・・ｿ・ｽ陷会｣ｰ: 鬯・､ｧ・ｼ・ｵ邵ｺ・｣邵ｺ貊灘ｾ九・逎ｯﾂ・ｲ隰仙干窶ｲ陟・干竏ｴ邵ｺ貊灘ｾ九・蟲ｨ繝ｻ郢晄亢縺・ｹ晢ｽｳ郢晏現縺礼ｹｧ・､郢ｧ・ｺ郢ｧ雋橸ｽ､・ｧ邵ｺ髦ｪ・･邵ｺ蜷ｶ・・

    const pointRadii = actual.map((val, idx) => {

        if (idx === 0) return 2;

        const prev = actual[idx - 1];

        if (val !== null && prev !== null && val > prev) return 4; // 陟・干竏ｴ邵ｺ貊灘ｾ狗ｸｺ・ｯ陞滂ｽｧ邵ｺ髦ｪ・･

        return 0; // 陟・干竏ｴ邵ｺ・ｦ邵ｺ・ｪ邵ｺ繝ｻ蠕狗ｸｺ・ｯ霓､・ｹ郢ｧ蜻茨ｽｶ蛹ｻ笘・・閧ｲ・ｷ螢ｹ繝ｻ邵ｺ・ｿ繝ｻ繝ｻ

    });

    paceChart.data.datasets[1].pointRadius = pointRadii;

    paceChart.data.datasets[1].pointHoverRadius = pointRadii.map(r => r > 0 ? r + 2 : 0);

    // 髢ｭ譴ｧ蜍ｹ豼ｶ・ｲ郢ｧ繧・ｽｼ・ｷ髫ｱ・ｿ郢晄亢縺・ｹ晢ｽｳ郢晏現笆｡邵ｺ隨ｬ・ｿ繝ｻ・･邵ｺ蜷ｶ・矩坎・ｭ陞ｳ螢ｹ竊醍ｸｺ・ｩ邵ｺ・ｯDataset陷茨ｽｨ闖ｴ讌｢・ｨ・ｭ陞ｳ螢ｹ竊醍ｸｺ・ｮ邵ｺ・ｧ鬮ｮ・｣邵ｺ蜉ｱ・樒ｸｲ繝ｽadius邵ｺ・ｰ邵ｺ莉｣縲定怺竏昴・騾ｶ・ｮ驕ｶ荵昶命邵ｺ・ｯ邵ｺ繝ｻ



    // 隨倥・・ｿ・ｮ雎・ｽ｣繝ｻ螢ｹﾎ帷ｹｧ・､郢晏現ﾎ皮ｹ晢ｽｼ郢晉判蜃ｾ邵ｺ・ｮ郢ｧ・ｰ郢晢ｽｩ郢晄・迚｡髫ｱ・ｿ隰ｨ・ｴ

    const isLight = document.documentElement.classList.contains('light-mode');

    paceChart.data.datasets[0].borderColor = isLight ? '#0284c7' : '#38bdf8'; // 騾ｶ・ｮ隶薙・鬮ｱ繝ｻ

    paceChart.data.datasets[2].borderColor = isLight ? '#ea580c' : '#f97316'; // 闔蝓滂ｽｸ・ｬ(郢ｧ・ｪ郢晢ｽｬ郢晢ｽｳ郢ｧ・ｸ)



    paceChart.data.datasets[1].borderColor = isChallenge ? '#fbbf24' : '#10b981';

    paceChart.data.datasets[1].backgroundColor = isChallenge ? 'rgba(251, 191, 36, 0.1)' : 'rgba(16, 185, 129, 0.1)';



    paceChart.update();

}

function updateUI() {

    refreshSubjectSelectUI();

    updateHeaderDate();

    updateExamDaysDisplay();



    const isLight = document.documentElement.classList.contains('light-mode');

    // 隨倥・・ｿ・ｮ雎・ｽ｣繝ｻ螢ｹﾎ帷ｹｧ・､郢晏現ﾎ皮ｹ晢ｽｼ郢晏ｳｨ繝ｻ陷繝ｻ縺堤ｹ晢ｽｩ郢晄・繝ｬ隴趣ｽｯ郢ｧ雋橸ｽｰ莉｣・雎ｼ繝ｻ・･邵ｺ蜉ｱ窶ｻ髫募・・ｪ閧ｴﾂ・ｧ郢ｧ・｢郢昴・繝ｻ

    const circleBgColor = isLight ? '#cbd5e1' : '#1e293b';



    const isChallenge = appData.currentSubjectId !== ALL_SUBJECTS_ID && appData.subjects[appData.currentSubjectId]?.type === 'challenge';
    const isVocab = appData.currentSubjectId !== ALL_SUBJECTS_ID && appData.subjects[appData.currentSubjectId]?.isVocab;

    // 隨倥・ﾎ帷ｹ晢ｽｳ郢ｧ・ｿ郢ｧ・､郢晢｣ｰ郢晄ｧｭ縺・ｹｧ・ｰ郢晢ｽｬ郢晢ｽｼ郢ｧ・ｷ郢晢ｽｧ郢晢ｽｳ: 陷雁ｩ・ｪ讒ｫ・ｸ・ｳ驕倬・蟯ｼ邵ｺ・ｫsyllabus邵ｺ蠕娯・邵ｺ繝ｻ驕ｨ・ｺ邵ｺ・ｮ陜｣・ｴ陷ｷ蛹ｻﾂ縲姉rds邵ｺ荵晢ｽ蛾明・ｪ陷肴・蜃ｽ隰後・
    if (isVocab && appData.subjects[appData.currentSubjectId]) {
        const vocabSubj = appData.subjects[appData.currentSubjectId];
        if ((!vocabSubj.syllabus || vocabSubj.syllabus.length === 0) && vocabSubj.words && vocabSubj.words.length > 0) {
            vocabSubj.syllabus = [];
            const splitCount = 100;
            for (let i = 0; i < vocabSubj.words.length; i += splitCount) {
                const end = Math.min(i + splitCount, vocabSubj.words.length);
                vocabSubj.syllabus.push({
                    id: 'unit_auto_' + i,
                    title: `${i + 1} ~ ${end}`,
                    category: '陷雁ｩ・ｪ繝ｻ,
                    status: 'pending',
                    completedDate: null,
                    isWeak: false,
                    lapCount: 0,
                    difficulty: 'A'
                });
            }
            saveData();
        } else if (!vocabSubj.syllabus) {
            vocabSubj.syllabus = [];
        }
    }

    const navText = document.getElementById('nav-center-text');
    const navIcon = document.getElementById('nav-center-icon');
    if (navText && navIcon) {
        if (isVocab) {
            navText.textContent = '隴芽挙・ｨ繝ｻ;
            navIcon.className = 'fas fa-layer-group';
        } else {
            navText.textContent = '髫ｪ蛟ｬ鮖ｸ';
            navIcon.className = 'fas fa-pencil-alt';
        }
    }

    let percentage = 0;



    document.getElementById('current-subject-name-display').textContent = `髯ｦ・ｨ驕会ｽｺ闕ｳ・ｭ: ${appData.currentSubjectId === ALL_SUBJECTS_ID ? '驍ｱ荳樒ｲ・ : appData.subjects[appData.currentSubjectId].name}`;

    document.getElementById('streak-count-header').textContent = '';

    document.getElementById('streak-count-mobile').textContent = '';

    document.getElementById('map-title').textContent = isChallenge ? '隴帑ｺ･謖ｨ鬩慕夢繝ｻ陟趣ｽｦ' : '陷贋ｼ懊・郢晄ｧｭ繝｣郢昴・;

    document.getElementById('map-legend').style.display = isChallenge ? 'none' : 'flex';

    document.getElementById('map-legend').style.display = isChallenge ? 'none' : 'flex';

    document.getElementById('progress-label').textContent = isChallenge ? '陞ｳ貊灘多驍・・ : '鬨ｾ・ｲ隰千､ｼ邏ｫ';

    document.getElementById('predicted-finish-date').textContent = '';



    if (isChallenge) {

        document.getElementById('category-progress-section').classList.add('hidden');

        document.getElementById('difficulty-filter-area').classList.add('hidden');

        const subj = appData.subjects[appData.currentSubjectId]; const stats = calculateChallengeStats(subj);

        percentage = stats.percentage;

        const streakText = stats.currentStreak === 0 ? getStreakMessage(0) : `${stats.currentStreak}隴鯉ｽ･鬨ｾ・｣驍ｯ螟ゑｽｶ蜥擾ｽｶ螢ｻ・ｸ・ｭ繝ｻ繝ｻ${getStreakMessage(stats.currentStreak)}`;

        document.getElementById('streak-count-header').textContent = streakText;

        document.getElementById('streak-count-mobile').textContent = streakText;

        renderMonthHeatmap(subj);

        progressCircleChart.data.datasets[0].backgroundColor = ['#fbbf24', circleBgColor];

        progressCircleChart.data.datasets[0].data = [percentage, 100 - percentage];

    } else {



        renderSlitBar();


        // 鬮ｮ・｣隴冗§・ｺ・ｦ郢晁ｼ斐≦郢晢ｽｫ郢ｧ・ｿ郢晢ｽｼUI隰蜀怜愛

        renderDifficultyFilter();

        const syl = getCurrentSyllabus();

        // 鬮ｮ・｣隴冗§・ｺ・ｦ郢晁ｼ斐≦郢晢ｽｫ郢ｧ・ｿ郢晢ｽｼ鬩包ｽｩ騾包ｽｨ

        const subjId = appData.currentSubjectId;

        const filtered = (subjId !== ALL_SUBJECTS_ID) ? syl.filter(u => isUnitInFilter(u, subjId)) : syl;

        // 郢ｧ・ｫ郢昴・縺也ｹ晢ｽｪ陋ｻ・･鬨ｾ・ｲ隰仙干繝ｰ郢晢ｽｼ隰蜀怜愛繝ｻ蛹ｻ繝ｵ郢ｧ・｣郢晢ｽｫ郢ｧ・ｿ郢晢ｽｼ鬩包ｽｩ騾包ｽｨ雋ょ現竏ｩ繝ｻ繝ｻ

        renderCategoryProgress(filtered);

        const total = filtered.length;

        if (total > 0) {

            const completedNormal = filtered.filter(u => u.status === 'completed' && !u.isWeak).length;

            const completedWeak = filtered.filter(u => u.status === 'completed' && u.isWeak).length;

            percentage = Math.round(((completedNormal + completedWeak) / total) * 100);

            const pNormal = Math.round((completedNormal / total) * 100);

            const pWeak = Math.round((completedWeak / total) * 100);

            const pRemaining = 100 - pNormal - pWeak;

            progressCircleChart.data.datasets[0].backgroundColor = ['#10b981', '#fbbf24', circleBgColor];

            progressCircleChart.data.datasets[0].data = [pNormal, pWeak, pRemaining];

        } else {

            percentage = 0;

            progressCircleChart.data.datasets[0].backgroundColor = ['#10b981', circleBgColor];

            progressCircleChart.data.datasets[0].data = [0, 100];

        }

    }



    document.getElementById('total-progress-text').textContent = `${percentage}%`;

    progressCircleChart.update();



    renderRecordLists(); renderCalendar(); updatePaceChart(isChallenge); renderSleepChart(); loadSleepLogDate();

    if (document.getElementById('manage-screen').classList.contains('active')) renderManageScreen();

    document.body.style.opacity = 1;

}



const progressCircleChart = new Chart(document.getElementById('progressCircleChart').getContext('2d'), { type: 'doughnut', data: { datasets: [{ data: [0, 100], backgroundColor: ['#10b981', '#1e293b'], borderWidth: 0, cutout: '85%' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } } });

const paceChart = new Chart(document.getElementById('paceChart').getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: '騾ｶ・ｮ隶薙・, data: [], borderColor: '#38bdf8', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false }, { label: '陞ｳ貅ｽ・ｸ・ｾ', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 2, pointRadius: 2, fill: true, spanGaps: true }, { label: '闔蝓滂ｽｸ・ｬ', data: [], borderColor: '#f97316', borderWidth: 2, borderDash: [2, 2], pointRadius: 0, fill: false }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: '#334155' }, ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 6 } }, y: { min: 0, max: 100, grid: { color: '#334155' }, ticks: { color: '#64748b', font: { size: 9 } } } }, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 } } } } });



function updateChartColors() {

    const isLight = document.documentElement.classList.contains('light-mode');

    const gridColor = isLight ? '#cbd5e1' : '#334155';

    const textColor = isLight ? '#64748b' : '#94a3b8';



    if (paceChart && paceChart.options) {

        paceChart.options.scales.x.grid.color = gridColor;

        paceChart.options.scales.y.grid.color = gridColor;

        paceChart.options.scales.x.ticks.color = textColor;

        paceChart.options.scales.y.ticks.color = textColor;

        paceChart.options.plugins.legend.labels.color = textColor;

        paceChart.update();

    }

}



// --- Sleep Rhythm Logic ---

let sleepChartRange = 7;



function loadSleepLogDate() {

    const dateInput = document.getElementById('sleep-log-date');

    if (!dateInput.value) dateInput.value = getTodayStr(); // 陋ｻ譎・ｄ陋滂ｽ､郢ｧ・ｻ郢昴・繝ｨ

    const dateStr = dateInput.value;



    const log = (appData.sleepLog && appData.sleepLog[dateStr]) || { wake: '', bed: '' };

    document.getElementById('sleep-log-wake').value = log.wake || '';



    // allnighter or normal bed

    const bedInput = document.getElementById('sleep-log-bed');

    const nextDayCheckbox = document.getElementById('sleep-log-nextday');

    if (log.bed === 'allnighter') {

        bedInput.value = '';

        bedInput.disabled = true;

        bedInput.style.opacity = '0.3';

        nextDayCheckbox.checked = false;

        nextDayCheckbox.disabled = true;

    } else {

        bedInput.value = log.bed || '';

        bedInput.disabled = false;

        bedInput.style.opacity = '1';

        nextDayCheckbox.checked = !!log.bedNextDay;

        nextDayCheckbox.disabled = false;

    }

    updateBedNextDayLabel();

}



function updateBedNextDayLabel() {

    const cb = document.getElementById('sleep-log-nextday');

    const track = document.getElementById('sleep-log-nextday-track');

    const thumb = document.getElementById('sleep-log-nextday-thumb');

    const text = document.getElementById('sleep-log-nextday-text');

    if (cb.checked) {

        track.style.backgroundColor = '#7c3aed';

        thumb.style.left = '14px';

        thumb.style.backgroundColor = '#fff';

        text.style.color = '#c084fc';

    } else {

        track.style.backgroundColor = '#374151';

        thumb.style.left = '2px';

        thumb.style.backgroundColor = '#9ca3af';

        text.style.color = '#6b7280';

    }

}



function shiftSleepLogDate(diff) {

    const dateInput = document.getElementById('sleep-log-date');

    if (!dateInput.value) dateInput.value = getTodayStr();



    const current = new Date(dateInput.value);

    current.setDate(current.getDate() + diff);

    dateInput.value = formatDate(current);

    loadSleepLogDate();

}



function saveSleepLog(type) {

    const dateStr = document.getElementById('sleep-log-date').value;

    if (!dateStr) return;



    if (!appData.sleepLog) appData.sleepLog = {};

    if (!appData.sleepLog[dateStr]) appData.sleepLog[dateStr] = { wake: '', bed: '' };



    let msg = "";

    let updatedVal = "";



    if (type === 'wake') {

        const val = document.getElementById('sleep-log-wake').value;

        appData.sleepLog[dateStr].wake = val;

        msg = "隘搾ｽｷ陟朱大・鬮｢阮呻ｽ帝坎蛟ｬ鮖ｸ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・;

        updatedVal = val;

    } else if (type === 'bed') {

        const val = document.getElementById('sleep-log-bed').value;

        const nextDay = document.getElementById('sleep-log-nextday').checked;

        appData.sleepLog[dateStr].bed = val;

        appData.sleepLog[dateStr].bedNextDay = nextDay;

        msg = nextDay ? `陝・ｽｱ陝・刋蜃ｾ鬮｢阮呻ｽ帝坎蛟ｬ鮖ｸ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・(驗呎｢ｧ蠕・${val})` : "陝・ｽｱ陝・刋蜃ｾ鬮｢阮呻ｽ帝坎蛟ｬ鮖ｸ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・;

        updatedVal = val;

    } else if (type === 'allnighter') {

        appData.sleepLog[dateStr].bed = 'allnighter';

        delete appData.sleepLog[dateStr].bedNextDay;

        msg = "郢ｧ・ｪ郢晢ｽｼ郢晢ｽｫ繝ｻ莠･・ｾ・ｹ陞滓・・ｼ蟲ｨ・帝坎蛟ｬ鮖ｸ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・;

        // UI郢ｧ蜻亥ｳｩ隴・ｽｰ

        document.getElementById('sleep-log-bed').value = '';

        document.getElementById('sleep-log-bed').disabled = true;

        document.getElementById('sleep-log-bed').style.opacity = '0.3';

        document.getElementById('sleep-log-nextday').checked = false;

        document.getElementById('sleep-log-nextday').disabled = true;

        updateBedNextDayLabel();

    } else {

        // fallback for old calls (though now separate buttons)

        appData.sleepLog[dateStr].wake = document.getElementById('sleep-log-wake').value;

        appData.sleepLog[dateStr].bed = document.getElementById('sleep-log-bed').value;

        msg = "髫ｪ蛟ｬ鮖ｸ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・;

    }



    // 髢ｾ・ｪ陷崎ｼ斐Γ郢ｧ・ｧ郢昴・縺題崕・､陞ｳ繝ｻ

    // type隰悶・・ｮ螢ｹ窶ｲ邵ｺ繧・ｽ玖撻・ｴ陷ｷ蛹ｻ繝ｻ邵ｲ竏壺落郢ｧ蠕娯・鬮｢・｢鬨ｾ・｣邵ｺ蜷ｶ・狗ｹ昶・縺臥ｹ昴・縺醍ｸｺ・ｮ邵ｺ・ｿ髯ｦ蠕娯鴬邵ｺ・ｮ邵ｺ謔滓汨驍・・蝎ｪ邵ｺ・ｰ邵ｺ繝ｻ

    // 隴鯉ｽ｢陝・ｬ譛ｪ隰ｨ・ｰ邵ｺ・ｯ闕ｳ・｡隴・ｽｹ郢昶・縺臥ｹ昴・縺醍ｸｺ蜷ｶ・狗ｸｺ・ｮ邵ｺ・ｧ邵ｺ譏ｴ繝ｻ邵ｺ・ｾ邵ｺ・ｾ陋ｻ・ｩ騾包ｽｨ繝ｻ莠･諞ｶ闖ｴ諛・舞邵ｺ・ｯ邵ｺ・ｪ邵ｺ繝ｻ・ｼ繝ｻ

    checkSleepLogAutoChallenge(dateStr, appData.sleepLog[dateStr].wake, appData.sleepLog[dateStr].bed);



    saveData();

    renderSleepChart();

    showToast(msg);

}



function checkSleepLogAutoChallenge(dateStr, wake, bed) {

    const challenges = getActiveChallenges();

    let updated = false;



    challenges.forEach(c => {

        if (!c.autoCheckType || !c.autoCheckTime) return;



        let achieved = false;



        if (c.autoCheckType === 'waketime' && wake) {

            const wakeMin = timeToMinutes(wake);

            const targetMin = timeToMinutes(c.autoCheckTime);

            if (wakeMin <= targetMin) achieved = true;

        } else if (c.autoCheckType === 'bedtime' && bed && bed !== 'allnighter') {

            const bedLog = appData.sleepLog && appData.sleepLog[dateStr];

            const bedMin = timeToMinutes(bed, true, bedLog && bedLog.bedNextDay);

            const targetMin = timeToMinutes(c.autoCheckTime, true);

            if (bedMin <= targetMin) achieved = true;

        }



        if (achieved) {

            if (!c.challengeHistory) c.challengeHistory = {};

            if (!c.challengeHistory[dateStr]) {

                c.challengeHistory[dateStr] = true;

                updated = true;

            }

        }

    });



    if (updated) {

        renderChallengeScreen(); // Update the challenge table immediately

        showToast("騾ｶ・ｮ隶灘虫・・ｬ梧腸・ｼ竏壹Γ郢晢ｽ｣郢晢ｽｬ郢晢ｽｳ郢ｧ・ｸ郢ｧ蜻亥ｳｩ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

    }

}



function timeToMinutes(timeStr, isBedtime = false, bedNextDay = false) {

    if (!timeStr || timeStr === 'allnighter') return 9999;

    const [h, m] = timeStr.split(':').map(Number);

    let total = h * 60 + m;

    if (bedNextDay) {

        // 隴丞ｮ茨ｽ､・ｺ騾ｧ繝ｻ竊鍋ｸｲ讙趣ｽｿ譴ｧ蠕狗ｸｲ髦ｪ繝ｨ郢ｧ・ｰ郢晢ｽｫ邵ｺ阮ｫN邵ｺ・ｮ陜｣・ｴ陷ｷ蛹ｻﾂ竏晢ｽｸ・ｸ邵ｺ・ｫ+24隴弱ｋ菫｣

        total += 24 * 60;

    } else if (isBedtime && h < 4) {

        // 陟墓｢ｧ蟀ｿ闔蜻磯共: 00:00-03:59 邵ｺ・ｯ髢ｾ・ｪ陷崎ｼ斐帝・譴ｧ蠕玖ｬ・ｽｱ邵ｺ繝ｻ

        total += 24 * 60;

    }

    return total;

}



function changeSleepChartRange(days) {

    sleepChartRange = days;

    // 郢晄㈱縺｡郢晢ｽｳ邵ｺ・ｮ髫穂ｹ昶螺騾ｶ・ｮ隴厄ｽｴ隴・ｽｰ

    document.querySelectorAll('.chart-range-btn').forEach(btn => {

        if (parseInt(btn.dataset.range) === days) {

            btn.classList.remove('text-gray-400', 'hover:bg-gray-800');

            btn.classList.add('bg-gray-700', 'text-white');

        } else {

            btn.classList.add('text-gray-400', 'hover:bg-gray-800');

            btn.classList.remove('bg-gray-700', 'text-white');

        }

    });

    renderSleepChart();

}



function renderSleepChart() {

    const svg = document.getElementById('sleep-chart-svg');

    if (!svg) return;

    svg.innerHTML = '';



    const today = getToday();

    const days = [];



    // X髴・ｽｸ: 隴鯉ｽ･闔峨・(陝ｾ・ｦ邵ｺ遒≫с陷ｴ・ｻ邵ｲ竏晄価邵ｺ蠕｡・ｻ鬆大ｾ・

    for (let i = sleepChartRange - 1; i >= 0; i--) {

        const d = new Date(today);

        d.setDate(d.getDate() - i);

        days.push(formatDate(d));

    }



    // 隰蜀怜愛郢ｧ・ｵ郢ｧ・､郢ｧ・ｺ陞ｳ螢ｽ辟・

    const width = svg.clientWidth || 300;

    const height = svg.clientHeight || 150;

    const padding = { top: 20, right: 10, bottom: 20, left: 30 };

    const chartW = width - padding.left - padding.right;

    const chartH = height - padding.top - padding.bottom;



    // Y髴・ｽｸ郢ｧ・ｹ郢ｧ・ｱ郢晢ｽｼ郢晢ｽｫ: 陷題ざ蠕・8:00 (-360) 繝ｻ繝ｻ陟匁瑳蠕・4:00 (1440)

    // 邵ｺ阮呻ｽ檎ｸｺ・ｫ郢ｧ蛹ｻ・・0:00 邵ｺ蠕｡・ｸ・ｭ陞滂ｽｮ郢ｧ繝ｻ・・叉鄙ｫ竊楢ｭ夲ｽ･邵ｺ・ｦ邵ｲ竏ｫ謫・ｵ・ｰ(陞滓㈱ﾂ諛域ｃ)邵ｺ遒・・｣驍ｯ螢ｹ・邵ｺ・ｦ髯ｦ・ｨ驕会ｽｺ邵ｺ霈費ｽ檎ｹｧ繝ｻ

    // 驗呎｢ｧ蠕狗ｹ晏現縺堤ｹ晢ｽｫ陝・ｽｾ陟｢諛翫・邵ｺ貅假ｽ∬叉莨∝応郢ｧ繝ｻ8隴弱ｄ繝ｻ24隴弱ｅ竊楢ｫ｡・｡陟托ｽｵ

    const minMin = -360;

    const maxMin = 1440;

    const rangeMin = maxMin - minMin;



    // 隴弱ｇ邯ｾ隴√・・ｭ諤懊・郢ｧ雋槭・邵ｺ・ｫ陞溽判驪､ (0:00陜難ｽｺ雋・・

    // isPrevBed: 陷題ざ蠕狗ｸｺ・ｮ陝・ｽｱ陝・刋蜃ｾ鬮｢阮卍ｰ邵ｺ・ｩ邵ｺ繝ｻﾂｰ

    // bedNextDay: 驗呎｢ｧ蠕狗ｹ晏現縺堤ｹ晢ｽｫ邵ｺ阮ｫN邵ｺ荵昶・邵ｺ繝ｻﾂｰ

    const getMinutes = (timeStr, isPrevBed, bedNextDay) => {

        if (!timeStr || timeStr === 'allnighter') return null;

        const [h, m] = timeStr.split(':').map(Number);

        let total = h * 60 + m;



        if (isPrevBed) {

            if (bedNextDay) {

                // 隴丞ｮ茨ｽ､・ｺ騾ｧ繝ｻ竊馴・譴ｧ蠕玖ｬ悶・・ｮ繝ｻ 邵ｺ譏ｴ繝ｻ邵ｺ・ｾ邵ｺ・ｾ繝ｻ莠･・ｽ謐ｺ蠕狗ｸｺ・ｮ隴弱ｇ邯ｾ邵ｺ・ｨ邵ｺ蜉ｱ窶ｻ郢晏干ﾎ溽ｹ昴・繝ｨ繝ｻ繝ｻ

                // 關薙・ bedNextDay ON 邵ｺ・ｧ 05:00 遶翫・陟匁瑳蠕狗ｸｺ・ｮ05:00 (300陋ｻ繝ｻ

            } else if (total > 720) {

                // 12:00闔会ｽ･陟募ｾ後・陷題ざ蠕玖ｬ・ｽｱ邵ｺ繝ｻ・ｼ莠･・ｾ謐ｺ謫らｹ晢ｽｭ郢ｧ・ｸ郢昴・縺代・繝ｻ

                total -= 1440;

            }

            // 12:00闔会ｽ･陷代・陷贋ｺ･辯戊叉・ｭ)邵ｺ・ｯ邵ｺ譏ｴ繝ｻ邵ｺ・ｾ邵ｺ・ｾ繝ｻ蝓滂ｽｷ・ｱ陞滓・・ｰ・ｱ陝・劼・ｼ繝ｻ

        } else {

            // 陟匁瑳蠕狗ｸｺ・ｮ隘搾ｽｷ陟朱大・鬮｢繝ｻ

            // 邵ｺ譏ｴ繝ｻ邵ｺ・ｾ邵ｺ・ｾ

        }

        return total;

    };



    const getY = (min) => {

        if (min === null) return null;

        if (min < minMin || min > maxMin) return null;

        const percent = (min - minMin) / rangeMin;

        return padding.top + (percent * chartH);

    };



    const getX = (idx) => {

        const colWidth = chartW / days.length;

        return padding.left + (idx * colWidth) + (colWidth / 2);

    };



    // 郢ｧ・ｳ郢晢ｽｩ郢晢｣ｰ陝ｷ繝ｻ

    const colWidth = chartW / days.length;



    // --- 1. 隴弱ｋ菫｣郢ｧ・ｬ郢ｧ・､郢晏ｳｨﾎ帷ｹｧ・､郢晢ｽｳ (隶難ｽｪ驍ｱ繝ｻ - 3隴弱ｋ菫｣邵ｺ譁絶・ ---

    // -360(18), -180(21), 0(0), 180(3), 360(6), 540(9), 720(12), 900(15), 1080(18)

    for (let m = minMin; m <= maxMin; m += 180) {

        const y = getY(m);

        if (y === null) continue;



        // 24隴弱ｅ繝ｻ0隴弱ｊ・｡・ｨ髫ｪ蛟･ﾂ竏壺落郢ｧ蠕｡・ｻ・･陞滓じ繝ｻ隴弱ｇ邯ｾ

        let labelHour = Math.floor(m / 60);

        if (labelHour < 0) labelHour += 24;

        if (labelHour >= 24) labelHour -= 24;



        const isZero = (m === 0);



        // line

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

        line.setAttribute("x1", padding.left);

        line.setAttribute("y1", y);

        line.setAttribute("x2", width - padding.right);

        line.setAttribute("y2", y);

        line.setAttribute("stroke", isZero ? "#64748b" : "#334155");

        line.setAttribute("stroke-width", "1");

        if (!isZero) line.setAttribute("stroke-dasharray", "2 2");

        svg.appendChild(line);



        // label

        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");

        txt.setAttribute("x", padding.left - 5);

        txt.setAttribute("y", y + 3);

        txt.setAttribute("text-anchor", "end");

        txt.setAttribute("fill", isZero ? "#cbd5e1" : "#64748b");

        txt.setAttribute("font-size", "8");

        txt.textContent = String(labelHour);

        svg.appendChild(txt);

    }



    // --- 2. 隴鯉ｽ･闔牙･縺堤ｹ晢ｽｪ郢昴・繝ｩ (驍ｵ・ｦ驍ｱ繝ｻ & 郢昴・繝ｻ郢ｧ・ｿ郢晏干ﾎ溽ｹ昴・繝ｨ ---

    const barWidth = Math.max(2, colWidth * 0.7);



    days.forEach((dStr, idx) => {

        const xCenter = getX(idx);

        const xLeft = padding.left + (idx * colWidth);



        // 驍ｵ・ｦ郢ｧ・ｰ郢晢ｽｪ郢昴・繝ｩ驍ｱ繝ｻ

        const vLine = document.createElementNS("http://www.w3.org/2000/svg", "line");

        vLine.setAttribute("x1", xLeft);

        vLine.setAttribute("y1", padding.top);

        vLine.setAttribute("x2", xLeft);

        vLine.setAttribute("y2", height - padding.bottom);

        vLine.setAttribute("stroke", "#1e293b");

        vLine.setAttribute("stroke-width", "1");

        svg.appendChild(vLine);



        // 陷ｿ・ｳ驕ｶ・ｯ邵ｺ・ｮ鬮｢蟲ｨﾂｧ驍ｱ繝ｻ

        if (idx === days.length - 1) {

            const xRight = padding.left + ((idx + 1) * colWidth);

            const vLineR = document.createElementNS("http://www.w3.org/2000/svg", "line");

            vLineR.setAttribute("x1", xRight);

            vLineR.setAttribute("y1", padding.top);

            vLineR.setAttribute("x2", xRight);

            vLineR.setAttribute("y2", height - padding.bottom);

            vLineR.setAttribute("stroke", "#1e293b");

            vLineR.setAttribute("stroke-width", "1");

            svg.appendChild(vLineR);

        }



        // 隴鯉ｽ･闔牙･ﾎ帷ｹ晏生ﾎ・

        const showLabel = (sleepChartRange <= 14) || (idx % 3 === 0);



        if (showLabel) {

            const dObj = new Date(dStr);

            const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");

            txt.setAttribute("x", xCenter);

            txt.setAttribute("y", height - 5);

            txt.setAttribute("text-anchor", "middle");

            txt.setAttribute("fill", "#94a3b8");

            txt.setAttribute("font-size", "8");

            txt.textContent = `${dObj.getMonth() + 1}/${dObj.getDate()}`;

            svg.appendChild(txt);

        }



        // 郢昴・繝ｻ郢ｧ・ｿ郢晏干ﾎ溽ｹ昴・繝ｨ

        const logCurr = (appData.sleepLog && appData.sleepLog[dStr]);



        const dObj = new Date(dStr);

        const prevD = new Date(dObj);

        prevD.setDate(prevD.getDate() - 1);

        const prevStr = formatDate(prevD);

        const logPrev = (appData.sleepLog && appData.sleepLog[prevStr]);



        // 郢ｧ・ｪ郢晢ｽｼ郢晢ｽｫ繝ｻ莠･・ｾ・ｹ陞滓・・ｼ蟲ｨ繝ｻ陜｣・ｴ陷ｷ蛹ｻ繝ｻ・・憺ｭらｹｧ螳夲ｽ｡・ｨ驕会ｽｺ

        const prevIsAllnighter = logPrev && logPrev.bed === 'allnighter';

        if (prevIsAllnighter) {

            // 郢ｧ・ｪ郢晢ｽｼ郢晢ｽｫ髯ｦ・ｨ驕会ｽｺ: ・・憺ｭ・

            const allTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");

            allTxt.setAttribute("x", xCenter);

            allTxt.setAttribute("y", padding.top + chartH * 0.35);

            allTxt.setAttribute("text-anchor", "middle");

            allTxt.setAttribute("dominant-baseline", "middle");

            allTxt.setAttribute("fill", "#fb923c");

            allTxt.setAttribute("font-size", "10");

            allTxt.setAttribute("opacity", "0.7");

            allTxt.textContent = "陟包ｽｹ陞溘・;

            svg.appendChild(allTxt);

        }



        if ((logCurr || logPrev) && !prevIsAllnighter) {

            const minBed = logPrev && logPrev.bed && logPrev.bed !== 'allnighter'

                ? getMinutes(logPrev.bed, true, logPrev.bedNextDay) : null;

            const minWake = logCurr ? getMinutes(logCurr.wake, false) : null;



            const yBed = getY(minBed);

            const yWake = getY(minWake);



            if (yBed !== null && yWake !== null && yWake > yBed) {

                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

                rect.setAttribute("x", xCenter - barWidth / 2);

                rect.setAttribute("y", yBed);

                rect.setAttribute("width", barWidth);

                rect.setAttribute("height", yWake - yBed);

                rect.setAttribute("rx", "1");

                rect.setAttribute("fill", "rgba(139, 92, 246, 0.5)");

                rect.setAttribute("stroke", "none");

                svg.appendChild(rect);

            }



            const drawPoint = (y, color) => {

                if (y === null) return;

                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

                circle.setAttribute("cx", xCenter);

                circle.setAttribute("cy", y);

                circle.setAttribute("r", "2.5");

                circle.setAttribute("fill", color);

                circle.setAttribute("stroke", "#1e293b");

                circle.setAttribute("stroke-width", "1");

                svg.appendChild(circle);

            };



            drawPoint(yWake, "#facc15"); // 魄溘・迚｡ (隘搾ｽｷ陟弱・

            drawPoint(yBed, "#c084fc");   // 驍擾ｽｫ豼ｶ・ｲ (陝・ｽｱ陝・・

        }

    });

}



// 陋ｻ譎・ｄ陋ｹ蛹∝・邵ｺ・ｫ陷ｻ・ｼ邵ｺ・ｶ

// updateUI邵ｺ・ｮ隴崢陟募ｾ娯・ renderSleepChart() 郢ｧ螳夲ｽｿ・ｽ陷会｣ｰ邵ｺ蜷ｶ・玖｢繝ｻ・ｦ竏壺ｲ邵ｺ繧・ｽ・





// 郢晉ｿｫ繝ｳ郢ｧ・ｲ郢晢ｽｼ郢ｧ・ｷ郢晢ｽｧ郢晢ｽｳ邵ｺ・ｮ郢ｧ・､郢晏生ﾎｦ郢晞メ・ｨ・ｭ陞ｳ繝ｻ

document.querySelectorAll('.nav-btn').forEach(btn => {

    btn.onclick = () => {

        if (btn.dataset.target) {

            switchTab(btn.dataset.target);

        }

    };

});



document.getElementById('record-prev-day').onclick = () => { currentRecordDate.setDate(currentRecordDate.getDate() - 1); renderRecordLists(); };

document.getElementById('record-next-day').onclick = () => { currentRecordDate.setDate(currentRecordDate.getDate() + 1); renderRecordLists(); };

// 郢ｧ・ｫ郢晢ｽｬ郢晢ｽｳ郢敖郢晢ｽｼ邵ｺ・ｮ隴幄ご・ｧ・ｻ陷崎ｼ斐≧郢晏生ﾎｦ郢晏現・定怙蟠趣ｽｨ・ｭ陞ｳ繝ｻ

document.addEventListener('click', (e) => {

    if (e.target.closest('#prev-month')) {

        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);

        renderCalendar();

    }

    if (e.target.closest('#next-month')) {

        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);

        renderCalendar();

    }

});

// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螢ｹ繝ｦ郢晢ｽｼ郢晄ｧｫ繝ｻ郢ｧ鬆大ｴ帷ｸｺ蝓滂ｽｩ貅ｯ繝ｻ

function toggleTheme() {

    const html = document.documentElement;

    const isLight = html.classList.toggle('light-mode');



    updateThemeBtn(isLight);

    updateChartColors();



    // 髫ｪ・ｭ陞ｳ螢ｹ・定将譎擾ｽｭ繝ｻ

    localStorage.setItem('app_theme', isLight ? 'light' : 'dark');

}



function updateThemeBtn(isLight) {

    const btn = document.getElementById('theme-toggle-btn');

    if (btn) {

        if (isLight) {

            btn.innerHTML = '<i class="fas fa-sun text-orange-400"></i> <span class="text-gray-600">郢晢ｽｩ郢ｧ・､郢晏現ﾎ皮ｹ晢ｽｼ郢晄・・ｸ・ｭ</span>';

            btn.classList.replace('bg-gray-700', 'bg-gray-200');

            btn.classList.replace('text-white', 'text-gray-600');

        } else {

            btn.innerHTML = '<i class="fas fa-moon text-yellow-300"></i> <span>郢敖郢晢ｽｼ郢ｧ・ｯ郢晢ｽ｢郢晢ｽｼ郢晄・・ｸ・ｭ</span>';

            btn.classList.replace('bg-gray-200', 'bg-gray-700');

            btn.classList.replace('text-gray-600', 'text-white');

        }

    }

}



// 隨倥・・ｿ・ｽ陷会｣ｰ繝ｻ螢ｼ繝ｻ騾包ｽｻ鬮ｱ・｢郢晢ｽ｢郢晢ｽｼ郢晉甥繝ｻ郢ｧ鬆大ｴ帷ｸｺ蝓滂ｽｩ貅ｯ繝ｻ繝ｻ莠･閻ｰ髫ｱ讒ｫ・ｸ・ｳ騾包ｽｨ繝ｻ繝ｻ
let isFullscreenMode = false; // 隘搾ｽｷ陷榊｢灘・邵ｺ・ｯ陝ｶ・ｸ邵ｺ・ｫ郢ｧ・ｪ郢晁ｼ披・邵ｺ蜷ｶ・・

function applyFullscreenMode() {
    if (isFullscreenMode) {
        document.body.classList.add('fullscreen-mode');
    } else {
        document.body.classList.remove('fullscreen-mode');
    }
}

function toggleFullscreenMode() {
    isFullscreenMode = !isFullscreenMode;
    applyFullscreenMode();
    // 郢昶・縺臥ｹ昴・縺醍ｹ晄㈱繝｣郢ｧ・ｯ郢ｧ・ｹ邵ｺ・ｮ陷ｷ譴ｧ謔・
    const fsEl = document.getElementById('vocab-fullscreen-toggle');
    if (fsEl) fsEl.checked = isFullscreenMode;
}



// 隘搾ｽｷ陷榊｢灘・邵ｺ・ｫ闖ｫ譎擾ｽｭ蛟･・・ｹｧ蠕娯螺郢昴・繝ｻ郢晄ｧｭ・帝ｩ包ｽｩ騾包ｽｨ

(function initTheme() {

    const savedTheme = localStorage.getItem('app_theme');

    if (savedTheme === 'light') {

        document.documentElement.classList.add('light-mode');

    }

    // 郢晄㈱縺｡郢晢ｽｳ邵ｺ・ｮ髯ｦ・ｨ驕会ｽｺ邵ｺ・ｯHTML髫ｱ・ｭ邵ｺ・ｿ髴趣ｽｼ邵ｺ・ｿ陟募ｾ娯・髯ｦ蠕娯鴬邵ｺ貅假ｽ∫ｸｲ縲司ndow.onload驕ｲ蟲ｨ縲定怙讎奇ｽｺ・ｦ陷ｻ・ｼ邵ｺ・ｶ邵ｺ荵敖繝ｻ

    // 髫ｪ・ｭ陞ｳ螢ｹﾎ皮ｹ晢ｽｼ郢敖郢晢ｽｫ郢ｧ蟶晏ｹ慕ｸｺ繝ｻ笳・ｭ弱ｅ竊楢ｭ厄ｽｴ隴・ｽｰ邵ｺ蜷ｶ・狗ｹｧ蛹ｻ竕ｧ邵ｺ・ｫ邵ｺ蜉ｱ竏ｪ邵ｺ繝ｻ

})();

document.addEventListener('DOMContentLoaded', () => {

    // 郢晢ｽｭ郢晢ｽｼ郢昴・縺・ｹ晢ｽｳ郢ｧ・ｰ騾包ｽｻ鬮ｱ・｢邵ｺ・ｮ陋ｻ・ｶ陟包ｽ｡

    // 陝・ｻ｣・邵ｺ・ｰ邵ｺ螟ｧ・ｾ繝ｻ笆ｲ邵ｺ・ｦ邵ｺ荵晢ｽ臥ｹ晁ｼ斐♂郢晢ｽｼ郢晏ｳｨ縺・ｹｧ・ｦ郢晏現・・ｸｺ蟶呻ｽ九・蛹ｻ笆郢ｧ蟲ｨ笆ｽ邵ｺ蝓ｼ莠溯ｱ・ｽ｢ & 陋ｻ譎・ｄ陷・ｽｦ騾・・・ｾ繝ｻ笆繝ｻ繝ｻ

    setTimeout(() => {

        const loader = document.getElementById('initial-loader');

        if (loader) {

            loader.style.opacity = '0';

            setTimeout(() => loader.remove(), 500);

        }

    }, 500);



    // 郢晢ｽｭ郢ｧ・ｰ郢ｧ・､郢晢ｽｳ霑･・ｶ隲ｷ荵昴・騾ｶ・｣髫墓じ・定氣莉｣・闕ｳ竏晢ｽｯ・ｧ邵ｺ・ｫ

    // Firebase邵ｺ・ｮ髫ｱ・ｭ邵ｺ・ｿ髴趣ｽｼ邵ｺ・ｿ郢ｧ雋橸ｽｾ繝ｻ笆ｽ陟｢繝ｻ・ｦ竏壺ｲ邵ｺ繧・ｽ狗ｸｺ貅假ｽ∫ｸｲ縲各tInterval邵ｺ・ｧ郢昶・縺臥ｹ昴・縺醍ｸｺ蜷ｶ・狗ｸｺ荵敖繝ｻ

    // defer邵ｺ蜉ｱ窶ｻ邵ｺ繝ｻ・狗ｸｺ・ｮ邵ｺ・ｧDOMContentLoaded隴弱ｅ竊鍋ｸｺ・ｯfirebase陞溽判辟夂ｸｺ蠕｡・ｽ・ｿ邵ｺ蛹ｻ・狗ｸｺ・ｯ邵ｺ螢ｹ笆｡邵ｺ蠕個繝ｻ

    // 陞ｳ迚吶・邵ｺ・ｮ邵ｺ貅假ｽ》ry-catch邵ｺ・ｧ陜暦ｽｲ郢ｧﾂ邵ｺ荵敖竏晢ｽｭ莨懈Β郢昶・縺臥ｹ昴・縺醍ｹｧ螳夲ｽ｡蠕娯鴬

    const initFirebase = () => {

        if (typeof firebase === 'undefined') {

            setTimeout(initFirebase, 100);

            return;

        }



        firebase.auth().onAuthStateChanged((user) => {

            const modal = document.getElementById('login-modal');

            if (user) {

                currentUserDocId = user.uid;

                modal.classList.add('hidden');

                // 郢晢ｽｭ郢ｧ・ｰ郢ｧ・､郢晢ｽｳ邵ｺ讙趣ｽ｢・ｺ陞ｳ螢ｹ・邵ｺ・ｦ邵ｺ荵晢ｽ蛾ｨｾ螢ｻ・ｿ・｡郢ｧ蟶晏ｹ戊沂荵昶・郢ｧ繝ｻ

                startListening();

                //syncFromGoogleTasks(); // 隨倥・繝ｻ陷榊供驟碑ｭ帶ｺ假ｼ邵ｺ貅假ｼ櫁撻・ｴ陷ｷ蛹ｻ繝ｻ邵ｺ阮吶・髯ｦ蠕娯ｲ陟｢繝ｻ・ｦ竏壹堤ｸｺ蜻ｻ・ｼ繝ｻ

            } else {

                currentUserDocId = null;

                modal.classList.remove('hidden');

            }

        });

    };

    initFirebase();



    updateChartColors();

    updateChartColors(); // 鬩･蟠趣ｽ､繝ｻ・邵ｺ・ｦ邵ｺ繝ｻ・狗ｸｺ謔溘・邵ｺ・ｮ郢ｧ・ｳ郢晢ｽｼ郢晁崟ﾂ螢ｹ・願ｰｿ荵昶・

    initStudyTimeSelects(); // 隨倥・・ｿ・ｽ陷会｣ｰ: 郢ｧ・ｻ郢晢ｽｬ郢ｧ・ｯ郢晏現繝ｻ郢昴・縺醍ｹｧ・ｹ陋ｻ譎・ｄ陋ｹ繝ｻ

    // 郢ｧ・｢郢ｧ・ｳ郢晢ｽｼ郢昴・縺・ｹｧ・ｪ郢晢ｽｳ邵ｺ・ｮ陋ｻ譎・ｄ霑･・ｶ隲ｷ荵晢ｽ帝坎・ｭ陞ｳ螟ｲ・ｼ閧ｲ蟲ｩ髴台ｻ｣縲帝ｫ｢荵晢ｼ樒ｸｺ・ｦ邵ｺ繝ｻ笳・ｹｧ繧・・郢ｧ螳夲ｽｨ菫ｶ繝ｻ邵ｺ蜉ｱ窶ｻ郢ｧ繧頑・邵ｺ繝ｻ窶ｲ邵ｲ竏ｽ・ｸﾂ隴鯉ｽｦ郢昴・繝ｵ郢ｧ・ｩ郢晢ｽｫ郢晏現繝ｻ鬮｢蟲ｨﾂｧ邵ｺ・ｦ邵ｺ鄙ｫ・･邵ｺ荵敖竏ｵ諤呵崕譏ｴ笆｡邵ｺ鮃ｹ蟷慕ｸｺ謫ｾ・ｼ繝ｻ

    // 郢ｧ・ｿ郢晄じ繝ｻ陋ｻ譎・ｄ髯ｦ・ｨ驕会ｽｺ

    switchHabitTab('tab-habit-check');

});



// --- Global Data Migration ---

function getBlankData() {

    return {

        subjects: JSON.parse(JSON.stringify(defaultSubjects)),

        schedules: {},

        currentSubjectId: 'chemistry', // 陋ｻ譎・ｄ鬩包ｽｸ隰壽ｧｭ繝ｻ陋ｹ髢・ｭ・ｦ

        sleepLog: {},

        studyLog: {}, // 隨倥・・ｿ・ｽ陷会｣ｰ

        ticker: JSON.parse(JSON.stringify(defaultTicker))

    };

}



// --- Tab Logic ---

function switchHabitTab(tabId) {

    // 邵ｺ蜷ｶ竏狗ｸｺ・ｦ邵ｺ・ｮ郢ｧ・ｿ郢晄じ縺慕ｹ晢ｽｳ郢昴・ﾎｦ郢昴・・帝ｫｱ讚・ｽ｡・ｨ驕会ｽｺ

    ['tab-habit-check', 'tab-study-time', 'tab-life-rhythm'].forEach(id => {

        document.getElementById(id).classList.add('hidden');

    });

    // 邵ｺ蜷ｶ竏狗ｸｺ・ｦ邵ｺ・ｮ郢ｧ・ｿ郢晄じ繝ｻ郢ｧ・ｿ郢晢ｽｳ邵ｺ・ｮ郢ｧ・ｹ郢ｧ・ｿ郢ｧ・､郢晢ｽｫ郢ｧ蟶晄直郢ｧ・｢郢ｧ・ｯ郢昴・縺・ｹ晏私・ｼ蛹ｻ縺堤ｹ晢ｽｬ郢晢ｽｼ繝ｻ蟲ｨ竊・

    ['btn-tab-habit-check', 'btn-tab-study-time', 'btn-tab-life-rhythm'].forEach(id => {

        const btn = document.getElementById(id);

        btn.classList.remove('bg-gray-700', 'text-white', 'shadow');

        btn.classList.add('text-gray-400');

    });



    // 鬩包ｽｸ隰壽ｧｭ・・ｹｧ蠕娯螺郢ｧ・ｿ郢晄じ・帝勗・ｨ驕会ｽｺ

    document.getElementById(tabId).classList.remove('hidden');



    // 鬩包ｽｸ隰壽ｧｭ・・ｹｧ蠕娯螺郢晄㈱縺｡郢晢ｽｳ郢ｧ蛛ｵ縺・ｹｧ・ｯ郢昴・縺・ｹ晏私・ｼ驛√Ξ隴趣ｽｯ豼ｶ・ｲ郢晢ｽｻ騾具ｽｽ隴√・・ｭ證ｦ・ｼ蟲ｨ竊・

    const activeBtn = document.getElementById('btn-' + tabId);

    activeBtn.classList.remove('text-gray-400');

    activeBtn.classList.add('bg-gray-700', 'text-white', 'shadow');



    // 郢ｧ・ｰ郢晢ｽｩ郢晏｢鍋ｷ帝包ｽｻ邵ｺ・ｪ邵ｺ・ｩ邵ｺ謔滂ｽｿ繝ｻ・ｦ竏壺・陜｣・ｴ陷ｷ繝ｻ

    if (tabId === 'tab-study-time') {

        renderStudyChart();

    } else if (tabId === 'tab-life-rhythm') {

        renderSleepChart();

    }

}



// --- Study Time Logic ---

let studyChartRange = 7;

let studyTimeChart = null;



function initStudyTimeSelects() {

    const hourSelect = document.getElementById('study-log-hours');

    const minuteSelect = document.getElementById('study-log-minutes');

    hourSelect.innerHTML = '';

    minuteSelect.innerHTML = '';



    for (let i = 0; i <= 24; i++) {

        const opt = document.createElement('option');

        opt.value = i;

        opt.textContent = i;

        hourSelect.appendChild(opt);

    }

    for (let i = 0; i < 60; i++) {

        const opt = document.createElement('option');

        opt.value = i;

        opt.textContent = String(i).padStart(2, '0');

        minuteSelect.appendChild(opt);

    }

    loadStudyLogDate();

}



// 隨・ｽｲ隨・ｽｼ 郢晄㈱縺｡郢晢ｽｳ邵ｺ・ｧ陋ｻ繝ｻ・堤ｹ晢ｽｫ郢晢ｽｼ郢晄圜・ｼ繝ｻ9遶翫・遶翫・9繝ｻ繝ｻ

function stepMinutes(diff) {

    const sel = document.getElementById('study-log-minutes');

    let val = parseInt(sel.value) + diff;

    if (val < 0) val = 59;

    if (val > 59) val = 0;

    sel.value = val;

}



function loadStudyLogDate() {

    const dateInput = document.getElementById('study-log-date');

    if (!dateInput.value) dateInput.value = getTodayStr();

    const dateStr = dateInput.value;



    // 郢晢ｽｩ郢晏生ﾎ晁ｭ厄ｽｴ隴・ｽｰ

    const label = document.getElementById('study-time-label');

    if (dateStr === getTodayStr()) {

        label.textContent = "闔蛾大ｾ狗ｸｺ・ｮ陷咲甥・ｼ・ｷ隴弱ｋ菫｣";

    } else {

        const d = new Date(dateStr);

        label.textContent = `${d.getMonth() + 1}/${d.getDate()}邵ｺ・ｮ陷咲甥・ｼ・ｷ隴弱ｋ菫｣`;

    }



    const log = (appData.studyLog && appData.studyLog[dateStr]) || { time: 0 };

    const hours = Math.floor(log.time / 60);

    const minutes = log.time % 60;



    document.getElementById('study-log-hours').value = hours;

    document.getElementById('study-log-minutes').value = minutes;

}



function shiftStudyLogDate(diff) {

    const dateInput = document.getElementById('study-log-date');

    if (!dateInput.value) dateInput.value = getTodayStr();



    const current = new Date(dateInput.value);

    current.setDate(current.getDate() + diff);

    dateInput.value = formatDate(current);

    loadStudyLogDate();

}



function saveStudyLog() {

    const dateStr = document.getElementById('study-log-date').value;

    if (!dateStr) return;



    const h = parseInt(document.getElementById('study-log-hours').value) || 0;

    const m = parseInt(document.getElementById('study-log-minutes').value) || 0;

    const totalMinutes = h * 60 + m;



    if (!appData.studyLog) appData.studyLog = {};

    appData.studyLog[dateStr] = { time: totalMinutes };



    // 髢ｾ・ｪ陷崎ｼ斐Γ郢ｧ・ｧ郢昴・縺題崕・､陞ｳ繝ｻ

    checkStudyTimeAutoChallenge(dateStr, totalMinutes);



    saveData();

    renderStudyChart();

    showToast("陷咲甥・ｼ・ｷ隴弱ｋ菫｣郢ｧ螳夲ｽｨ蛟ｬ鮖ｸ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

}



function changeStudyChartRange(days) {

    studyChartRange = days;

    document.querySelectorAll('.study-chart-range-btn').forEach(btn => {

        if (parseInt(btn.dataset.range) === days) {

            btn.classList.remove('text-gray-400', 'hover:bg-gray-800');

            btn.classList.add('bg-gray-700', 'text-white');

        } else {

            btn.classList.add('text-gray-400', 'hover:bg-gray-800');

            btn.classList.remove('bg-gray-700', 'text-white');

        }

    });

    renderStudyChart();

}



function renderStudyChart() {

    const canvas = document.getElementById('studyTimeChart');

    if (!canvas) return;



    const ctx = canvas.getContext('2d');

    const today = getToday();

    const labels = [];

    const data = [];

    let totalTime = 0;



    // X髴・ｽｸ: 隴鯉ｽ･闔峨・(陝ｾ・ｦ邵ｺ遒≫с陷ｴ・ｻ邵ｲ竏晄価邵ｺ蠕｡・ｻ鬆大ｾ・

    for (let i = studyChartRange - 1; i >= 0; i--) {

        const d = new Date(today);

        d.setDate(d.getDate() - i);

        const dStr = formatDate(d);

        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);



        const log = (appData.studyLog && appData.studyLog[dStr]);

        const minutes = log ? log.time : 0;

        data.push(minutes / 60); // 隴弱ｋ菫｣陷雁・ｽｽ髦ｪ縲帝勗・ｨ驕会ｽｺ

        totalTime += minutes;

    }



    // 陷ｷ驛・ｽｨ蝓溷・鬮｢阮吶・髯ｦ・ｨ驕会ｽｺ隴厄ｽｴ隴・ｽｰ

    const th = Math.floor(totalTime / 60);

    const tm = totalTime % 60;

    document.getElementById('study-total-display').textContent = `${th}h ${tm}m`;



    const isLight = document.documentElement.classList.contains('light-mode');

    const barColor = isLight ? '#3b82f6' : '#60a5fa';

    const gridColor = isLight ? '#cbd5e1' : '#334155';

    const textColor = isLight ? '#64748b' : '#94a3b8';



    if (studyTimeChart) {

        studyTimeChart.destroy();

    }



    studyTimeChart = new Chart(ctx, {

        type: 'bar',

        data: {

            labels: labels,

            datasets: [{

                label: '陷咲甥・ｼ・ｷ隴弱ｋ菫｣ (隴弱ｋ菫｣)',

                data: data,

                backgroundColor: barColor,

                borderRadius: 4

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            scales: {

                x: {

                    grid: { display: false, color: gridColor },

                    ticks: { color: textColor, font: { size: 10 } }

                },

                y: {

                    beginAtZero: true,

                    grid: { color: gridColor, borderDash: [2, 2] },

                    ticks: { color: textColor, font: { size: 10 } }

                }

            },

            plugins: {

                legend: { display: false },

                tooltip: {

                    callbacks: {

                        label: (context) => {

                            const val = context.raw;

                            const h = Math.floor(val);

                            const m = Math.round((val - h) * 60);

                            return `${h}隴弱ｋ菫｣ ${m}陋ｻ繝ｻ;

                        }

                    }

                }

            }

        }

    });

}



function checkStudyTimeAutoChallenge(dateStr, minutes) {

    const challenges = getActiveChallenges();

    let updated = false;



    challenges.forEach(c => {

        if (c.autoCheckType === 'study_time' && c.autoCheckTime) {

            const target = parseInt(c.autoCheckTime);

            if (minutes >= target) {

                if (!c.challengeHistory) c.challengeHistory = {};

                if (!c.challengeHistory[dateStr]) {

                    c.challengeHistory[dateStr] = true;

                    updated = true;

                }

            }

        }

    });



    if (updated) {

        renderChallengeScreen();

        showToast("騾ｶ・ｮ隶灘虫・・ｬ梧腸・ｼ竏壹Γ郢晢ｽ｣郢晢ｽｬ郢晢ｽｳ郢ｧ・ｸ郢ｧ蜻亥ｳｩ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);

    }
}

// --- Vocab Import & Management ---
function toggleVocabSetting() {
    if (!editingSubjectId) return;
    const isVocab = document.getElementById('edit-subject-is-vocab').checked;
    const vocabSection = document.getElementById('vocab-import-section');
    appData.subjects[editingSubjectId].isVocab = isVocab;

    // Initialize vocab properties if not exist
    if (isVocab) {
        vocabSection.classList.remove('hidden');
        if (!appData.subjects[editingSubjectId].words) appData.subjects[editingSubjectId].words = [];
        if (!appData.subjects[editingSubjectId].syllabus) appData.subjects[editingSubjectId].syllabus = [];
        if (!appData.subjects[editingSubjectId].vocabSettings) {
            appData.subjects[editingSubjectId].vocabSettings = {
                isSimpleMode: false, isSwipeMode: false, isOkDisabled: false, isStrictMode: false, isSpeechEnabled: false, isGoogleSpeechEnabled: true, isFullscreenMode: true
            };
        }
        if (!appData.subjects[editingSubjectId].wordStats) appData.subjects[editingSubjectId].wordStats = {};
        if (!appData.subjects[editingSubjectId].drillStats) appData.subjects[editingSubjectId].drillStats = {};
        if (!appData.subjects[editingSubjectId].drills) appData.subjects[editingSubjectId].drills = [];
    } else {
        vocabSection.classList.add('hidden');
    }
    saveData();
    updateUI();
}

function handleVocabFileSelect(e) {
    if (!editingSubjectId) return;
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('vocab-file-name').textContent = file.name;
    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        // Header detection: check if first row is likely a header
        let startIndex = 0;
        if (jsonData.length > 0) {
            const firstRow = jsonData[0];
            const col1 = String(firstRow[0] || '').toLowerCase();
            const col2 = String(firstRow[1] || '').toLowerCase();
            if (col1.includes('id') || col1.includes('騾｡・ｪ陷ｿ・ｷ') || col2.includes('陷雁ｩ・ｪ繝ｻ) || col2.includes('word')) {
                startIndex = 1; // It's a header
            }
        }

        // Parse words: [ID, Word, Meaning, Memo]
        const newWords = [];
        for (let i = startIndex; i < jsonData.length; i++) {
            const row = jsonData[i];
            // 髯ｦ蠕娯ｲ陝・ｼ懈Β邵ｺ蜉ｱ竊醍ｸｺ繝ｻﾂｰ邵ｲ竏ｫ・ｩ・ｺ邵ｺ・ｮ陜｣・ｴ陷ｷ蛹ｻ繝ｻ郢ｧ・ｹ郢ｧ・ｭ郢昴・繝ｻ
            if (!row || row.length === 0 || row[1] == null || String(row[1]).trim() === "") continue;

            const word = {
                id: parseInt(row[0]) || (newWords.length + 1),
                word: row[1] != null ? String(row[1]) : "",
                meaning: row[2] != null ? String(row[2]) : "",
                memo: row[3] != null ? String(row[3]) : ""
            };
            newWords.push(word);
        }

        if (newWords.length === 0) {
            alert('陷雁ｩ・ｪ讒ｭ繝ｧ郢晢ｽｼ郢ｧ・ｿ邵ｺ迹夲ｽｦ荵昶命邵ｺ荵晢ｽ顔ｸｺ・ｾ邵ｺ蟶呻ｽ鍋ｸｺ・ｧ邵ｺ蜉ｱ笳・ｸｲ繝ｻ);
            return;
        }

        const subj = appData.subjects[editingSubjectId];
        subj.words = newWords;
        subj.wordStats = {}; // Reset stats upon new import

        // Auto-split into units
        const splitCountStr = document.getElementById('vocab-split-count').value;
        const splitCount = parseInt(splitCountStr, 10) || 100;
        subj.syllabus = [];

        for (let i = 0; i < newWords.length; i += splitCount) {
            const end = Math.min(i + splitCount, newWords.length);
            const unitTitle = `${i + 1} ~ ${end}`;
            subj.syllabus.push({
                id: 'unit_' + Date.now() + '_' + i,
                title: unitTitle,
                category: '陷雁ｩ・ｪ繝ｻ,
                status: 'pending',
                completedDate: null,
                isWeak: false,
                lapCount: 0,
                difficulty: 'A'
            });
        }

        saveData();
        renderUnitList();
        updateUI();
        showToast(`陷雁ｩ・ｪ讒ｭ・・${newWords.length} 闔会ｽｶ髫ｱ・ｭ邵ｺ・ｿ髴趣ｽｼ邵ｺ・ｿ邵ｲ竏ｵ・ｧ蛹ｺ繝ｻ郢ｧ蜻亥ｳｩ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・・・・;
    };
    reader.readAsArrayBuffer(file);
}



// === 陷雁ｩ・ｪ讒ｫ・ｸ・ｳ (Vocab) 隶匁ｺｯ繝ｻ ===

let vocabSession = {
    isActive: false,
    mode: 'free', // 'free' or 'today'
    queue: [],
    queueIndex: 0,
    startTime: 0,
    answerTime: 0,
    isTransitioning: false,
    isAnswerRevealed: false,
    results: [], // 陷ｷ繝ｻ閻ｰ髫ｱ讒ｭ繝ｻ郢ｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ陷繝ｻ・ｵ蜈域｣｡ ('邵ｲ繝ｻ, '隨・ｽｳ', '・・・)
    drillId: null // 闔蛾大ｾ狗ｹ晢ｽ｢郢晢ｽｼ郢昴・闖ｫ・ｮ髯ｦ繝ｻ邵ｺ・ｮ陜｣・ｴ陷ｷ蛹ｻ繝ｻ邵ｺ・ｿ郢ｧ・ｻ郢昴・繝ｨ
};

function startVocabSession(mode, targetUnitId = null) {
    const subjId = appData.currentSubjectId;
    if (subjId === ALL_SUBJECTS_ID) return;
    const subj = appData.subjects[subjId];
    if (!subj || !subj.isVocab || !subj.words || subj.words.length === 0) {
        showToast("陷雁ｩ・ｪ讒ｭ繝ｧ郢晢ｽｼ郢ｧ・ｿ邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ・, true);
        return;
    }

    vocabSession.mode = mode;
    vocabSession.queue = [];
    vocabSession.results = new Array(subj.words.length).fill(null);
    vocabSession.drillId = null;
    vocabSession.todayUnitIds = [];

    if (mode === 'free') {
        // 髢ｾ・ｪ騾包ｽｱ驕ｽ繝ｻ蟲・・蛹ｻ竊堤ｹｧ鄙ｫ竕邵ｺ蛹ｻ笘・怦・ｨ闔会ｽｶ繝ｻ繝ｻ
        // 郢晢ｽｩ郢晢ｽｳ郢敖郢晢｣ｰ陷・ｽｺ鬯伜ｾ後′郢晏干縺咏ｹ晢ｽｧ郢晢ｽｳ邵ｺ・ｪ邵ｺ・ｩ郢ｧ繧・ｽｰ繝ｻ謫るｧ繝ｻ竊鍋ｸｺ阮呻ｼ・ｸｺ・ｸ
        vocabSession.queue = subj.words.map((w, i) => i);
    } else if (mode === 'today') {
        const todayStr = getTodayStr();
        const schedules = appData.schedules[todayStr] || [];
        let mySchedules = schedules.filter(s => s.subjectId === subjId && s.unitId && s.unitId.startsWith('vocab_'));
        if (targetUnitId) {
            mySchedules = mySchedules.filter(s => s.unitId === targetUnitId);
        }

        if (mySchedules.length === 0) {
            showToast("闔蛾大ｾ狗ｸｺ・ｮ陷托ｽｲ郢ｧ髮・ｽｽ阮吮ｻ邵ｺ・ｯ邵ｺ繧・ｽ顔ｸｺ・ｾ邵ｺ蟶呻ｽ・);
            return;
        }

        let targetWordIds = new Set();
        mySchedules.forEach(schedule => {
            const unitId = schedule.unitId;
            if (unitId.startsWith('vocab_')) {
                const parts = unitId.split('_');
                const start = parseInt(parts[1], 10);
                const end = parseInt(parts[2], 10);
                for (let i = start; i <= end; i++) {
                    targetWordIds.add(i);
                }
            }
        });

        if (targetWordIds.size === 0) {
            showToast("闔蛾大ｾ狗ｸｺ・ｮ陷托ｽｲ郢ｧ髮・ｽｽ阮吮ｻ邵ｺ・ｫ陷雁ｩ・ｪ讒ｭ窶ｲ陷ｷ・ｫ邵ｺ・ｾ郢ｧ蠕娯ｻ邵ｺ繝ｻ竏ｪ邵ｺ蟶呻ｽ・);
            return;
        }

        // 髫ｧ・ｲ陟冶侭笘・ｹｧ蜿･閻ｰ髫ｱ讒ｭ縺・ｹ晢ｽｳ郢昴・繝｣郢ｧ・ｯ郢ｧ・ｹ郢ｧ蜻域ｭ楢怎・ｺ
        subj.words.forEach((w, i) => {
            const wordListId = Number(w.id || (i + 1));
            if (targetWordIds.has(wordListId)) {
                vocabSession.queue.push(i);
            }
        });

        if (vocabSession.queue.length === 0) {
            showToast("髫ｧ・ｲ陟冶侭笘・ｹｧ蜿･閻ｰ髫ｱ讒ｭ窶ｲ髫穂ｹ昶命邵ｺ荵晢ｽ顔ｸｺ・ｾ邵ｺ蟶呻ｽ鍋ｸｺ・ｧ邵ｺ蜉ｱ笳・, true);
            return;
        }

        // 郢晢ｽｩ郢晢ｽｳ郢敖郢晢｣ｰ郢ｧ・ｷ郢晢ｽ｣郢昴・繝ｵ郢晢ｽｫ繝ｻ蛹ｻ縺檎ｹ晏干縺咏ｹ晢ｽｧ郢晢ｽｳ繝ｻ繝ｻ
        const isRandom = document.getElementById('vocab-random-check')?.checked;
        if (isRandom) {
            for (let i = vocabSession.queue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [vocabSession.queue[i], vocabSession.queue[j]] = [vocabSession.queue[j], vocabSession.queue[i]];
            }
        }

        // 邵ｺ・ｨ郢ｧ鄙ｫ竕邵ｺ蛹ｻ笘・ｭ崢陋ｻ譏ｴ繝ｻ郢ｧ・ｹ郢ｧ・ｱ郢ｧ・ｸ郢晢ｽ･郢晢ｽｼ郢晢ｽｫ郢ｧ蜑・ｽｻ鬆大ｾ狗ｸｺ・ｮ闖ｫ・ｮ髯ｦ譬優邵ｺ・ｨ邵ｺ蜉ｱ窶ｻ闖ｫ譎・亜
        vocabSession.todayUnitIds = [...new Set(mySchedules.map(s => s.unitId))];
        vocabSession.drillId = vocabSession.todayUnitIds[0] || null;
    }

    if (vocabSession.queue.length === 0) return;

    vocabSession.queueIndex = 0;
    vocabSession.isActive = true;

    // 郢晢ｽ｢郢晢ｽｼ郢敖郢晢ｽｫ郢ｧ蟶晏陶邵ｺ蛟･・・
    if (typeof closeVocabRangeModal === 'function') closeVocabRangeModal();

    // UI陋ｻ繝ｻ・願ｭ厄ｽｿ邵ｺ繝ｻ
    applySimpleMode();
    document.getElementById('vocab-flashcard-container').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // 髢ｭ譴ｧ蜍ｹ郢ｧ・ｹ郢ｧ・ｯ郢晢ｽｭ郢晢ｽｼ郢晢ｽｫ鬮ｦ・ｲ雎・ｽ｢

    // 髫ｪ・ｭ陞ｳ螢ｹﾎ鍋ｹ昜ｹ斟礼ｹ晢ｽｼ郢ｧ蛛ｵ繝ｵ郢晢ｽｩ郢昴・縺咏ｹ晢ｽ･郢ｧ・ｫ郢晢ｽｼ郢晉甥繝ｻ邵ｺ・ｫabsolute鬩溷調・ｽ・ｮ邵ｺ・ｧ髯ｦ・ｨ驕会ｽｺ
    const settings = document.getElementById('vocab-settings-container');
    const flashcardContainer = document.getElementById('vocab-flashcard-container');
    if (settings && flashcardContainer) {
        settings.style.position = '';
        settings.style.top = '';
        settings.style.right = '';
        flashcardContainer.appendChild(settings);
        settings.classList.remove('hidden');
        settings.classList.add('flex');
    }

    initVocabCard();
}

function initVocabCard() {
    vocabSession.isTransitioning = false;
    vocabSession.isAnswerRevealed = false;

    const elMeaningArea = document.getElementById('meaning-area');
    const elFlashcardArea = document.getElementById('flashcard-area');
    const elBody = document.getElementById('vocab-flashcard-container');

    elMeaningArea.classList.add('invisible', 'opacity-0', 'translate-y-4');
    elMeaningArea.classList.remove('translate-y-0');

    const subj = appData.subjects[appData.currentSubjectId];
    const wordIndex = vocabSession.queue[vocabSession.queueIndex];
    const wordInfo = subj.words[wordIndex];
    const displayId = wordIndex + 1; // 1-indexed

    document.getElementById('word-id').innerText = `#${displayId}`;
    document.getElementById('english-word').innerText = wordInfo.word;
    document.getElementById('main-meaning').innerText = wordInfo.meaning;
    document.getElementById('sub-meanings').innerText = wordInfo.memo || "";

    document.getElementById('progress-text').innerText = `${vocabSession.mode === 'today' ? '闔蛾大ｾ狗ｸｺ・ｮ郢ｧ・ｿ郢ｧ・ｹ郢ｧ・ｯ' : '髢ｾ・ｪ騾包ｽｱ陝・ｽｦ驗吶・} (${vocabSession.queueIndex + 1}/${vocabSession.queue.length})`;

    // 郢晏干ﾎ溽ｹｧ・ｰ郢晢ｽｬ郢ｧ・ｹ郢晁・繝ｻ隴厄ｽｴ隴・ｽｰ
    const progressPercent = ((vocabSession.queueIndex) / vocabSession.queue.length) * 100;
function completeVocabSchedule(unitId) {
    const subjId = appData.currentSubjectId;
    const subj = appData.subjects[subjId];
    if (subj && subj.isVocab) {
        showToast(`蜊倩ｪ槫ｭｦ鄙偵・遽・峇縲・{unitId}縲阪ｒ螳御ｺ・→縺励※繝槭・繧ｯ縺励∪縺励◆縲Ａ);
        saveData();
        updateUI();
    }
}

function showVocabSummary() {
    vocabSession.isActive = false;
    document.getElementById('vocab-flashcard-container').classList.add('hidden');
    document.getElementById('vocab-summary-modal').classList.remove('hidden');

    // 髫ｪ・ｭ陞ｳ螢ｹﾎ鍋ｹ昜ｹ斟礼ｹ晢ｽｼ郢ｧ蟶晄直髯ｦ・ｨ驕会ｽｺ繝ｻ繝ｻixed鬩溷調・ｽ・ｮ邵ｺ・ｪ邵ｺ・ｮ邵ｺ・ｧappendChild闕ｳ蟠趣ｽｦ繝ｻ・ｼ繝ｻ
    const settings = document.getElementById('vocab-settings-container');
    if (settings) {
        settings.classList.add('hidden');
        settings.classList.remove('flex');
    }

    let p = 0, o = 0, b = 0;
    const tbody = document.getElementById('result-table-body');
    tbody.innerHTML = '';

    const subj = appData.subjects[appData.currentSubjectId];

    subj.words.forEach((w, i) => {
        const res = vocabSession.results[i];
        if (res) {
            if (res === '邵ｲ繝ｻ) p++; else if (res === '隨・ｽｳ') o++; else if (res === '・・・) b++;

            const tr = document.createElement('tr');
            let colorClass = "text-gray-400";
            if (res === '邵ｲ繝ｻ) colorClass = "text-app-success font-bold";
            if (res === '隨・ｽｳ') colorClass = "text-challenge-gold font-bold";
            if (res === '・・・) colorClass = "text-app-weak font-bold";

            const displayId = i + 1;
            tr.innerHTML = `<td class="p-2 text-center border-b border-gray-800 text-gray-500 font-mono">${displayId}</td><td class="p-2 border-b border-gray-800 font-bold text-gray-200">${w.word}</td><td class="p-2 text-center border-b border-gray-800 ${colorClass} text-lg">${res}</td>`;
            tbody.appendChild(tr);
        }
    });

    document.getElementById('count-perfect').innerText = p;
    document.getElementById('count-ok').innerText = o;
    document.getElementById('count-bad').innerText = b;

    // 郢晏干ﾎ溽ｹｧ・ｰ郢晢ｽｬ郢ｧ・ｹ郢晁・繝ｻ郢ｧ繧・懃ｹｧ・ｻ郢昴・繝ｨ
    document.getElementById('drill-progress').style.width = `0%`;
}

function closeVocabSummaryModal() {
    document.getElementById('vocab-summary-modal').classList.add('hidden');
    document.getElementById('vocab-flashcard-container').classList.add('hidden');

    // 髫ｪ・ｭ陞ｳ螢ｹﾎ鍋ｹ昜ｹ斟礼ｹ晢ｽｼ郢ｧ蟶晄直髯ｦ・ｨ驕会ｽｺ繝ｻ繝ｻixed鬩溷調・ｽ・ｮ邵ｺ・ｪ邵ｺ・ｮ邵ｺ・ｧappendChild闕ｳ蟠趣ｽｦ繝ｻ・ｼ繝ｻ
    const settings = document.getElementById('vocab-settings-container');
    if (settings) {
        settings.classList.add('hidden');
        settings.classList.remove('flex');
    }

    // 陷茨ｽｨ騾包ｽｻ鬮ｱ・｢郢晢ｽ｢郢晢ｽｼ郢晁歓・ｧ・｣鬮ｯ・､
    isFullscreenMode = false;
    applyFullscreenMode();

    updateUI(); // 騾包ｽｻ鬮ｱ・｢隴厄ｽｴ隴・ｽｰ
}

function quitVocabSession() {
    vocabSession.isActive = false;
    document.getElementById('vocab-flashcard-container').classList.add('hidden');

    const settings = document.getElementById('vocab-settings-container');
    if (settings) {
        settings.classList.add('hidden');
        settings.classList.remove('flex');
    }

    document.getElementById('drill-progress').style.width = '0%';
    isFullscreenMode = false;
    applyFullscreenMode();
    document.body.style.overflow = '';
    updateUI();
}

function retryWeakVocab() {
    let weakIndices = [];
    vocabSession.results.forEach((res, idx) => {
        if (res === '隨・ｽｳ' || res === '・・・) weakIndices.push(idx);
    });

    if (weakIndices.length === 0) {
        showToast("陟包ｽｩ驗吝・笘・ｹｧ蜿･閻ｰ髫ｱ讒ｭ窶ｲ邵ｺ繧・ｽ顔ｸｺ・ｾ邵ｺ蟶呻ｽ・, true);
        return;
    }

    vocabSession.queue = weakIndices;
    vocabSession.queueIndex = 0;

    document.getElementById('vocab-summary-modal').classList.add('hidden');
    document.getElementById('vocab-flashcard-container').classList.remove('hidden');

    vocabSession.isActive = true;
    initVocabCard();
}

// 郢ｧ・ｭ郢晢ｽｼ郢晄㈱繝ｻ郢晏ｳｨ縺咏ｹ晢ｽｧ郢晢ｽｼ郢晏現縺咲ｹ昴・繝ｨ邵ｺ・ｮ騾具ｽｻ鬪ｭ・ｲ
window.addEventListener('keydown', (e) => {
    if (!vocabSession.isActive) return;

    switch (e.code) {
        case 'ArrowDown': e.preventDefault(); showVocabMeaning(); break;
        case 'ArrowRight': e.preventDefault(); handleVocabResult('perfect'); break;
        case 'ArrowUp': e.preventDefault(); if (!vocabSettings.isOkDisabled) handleVocabResult('ok'); break;
        case 'ArrowLeft': e.preventDefault(); handleVocabResult('bad'); break;
        case 'Space':
            e.preventDefault();
            if (vocabSession.isAnswerRevealed) {
                // TODO: Voice synthesis if enabled
            } else {
                showVocabMeaning();
            }
            break;
        case 'Escape':
            e.preventDefault();
            quitVocabSession();
            break;
    }
});

// === 郢ｧ・ｹ郢晢ｽｯ郢ｧ・､郢晉軸譯・抄諛翫・郢昜ｸ莞ｦ郢晏ｳｨﾎ・===
let vocabTouchStartX = 0;
let vocabTouchStartY = 0;

document.addEventListener('touchstart', (e) => {
    if (!vocabSession.isActive || !vocabSettings.isSwipeEnabled) return;
    // 髫ｪ・ｭ陞ｳ螢ｹﾎ鍋ｹ昜ｹ斟礼ｹ晢ｽｼ陷繝ｻ繝ｻ郢ｧ・ｿ郢昴・繝｡邵ｺ・ｯ霎滂ｽ｡髫輔・
    const settingsEl = document.getElementById('vocab-settings-container');
    if (settingsEl && settingsEl.contains(e.target)) return;
    vocabTouchStartX = e.changedTouches[0].screenX;
    vocabTouchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (!vocabSession.isActive || !vocabSettings.isSwipeEnabled) return;
    const settingsEl = document.getElementById('vocab-settings-container');
    if (settingsEl && settingsEl.contains(e.target)) return;
    const endX = e.changedTouches[0].screenX;
    const endY = e.changedTouches[0].screenY;
    const diffX = endX - vocabTouchStartX;
    const diffY = endY - vocabTouchStartY;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    // 郢ｧ・ｿ郢昴・繝ｻ繝ｻ莠･・ｰ荳奇ｼ・ｸｺ繝ｻ・ｧ・ｻ陷榊桁・ｼ繝ｻ 驕ｲ譁絶斡髯ｦ・ｨ驕会ｽｺ
    if (absX < 15 && absY < 15) {
        showVocabMeaning();
        return;
    }

    // 隶難ｽｪ郢ｧ・ｹ郢晢ｽｯ郢ｧ・､郢昴・> 50px
    if (absX > absY && absX > 50) {
        if (diffX > 0) handleVocabResult('perfect');  // 陷ｿ・ｳ = Perfect
        else handleVocabResult('bad');                 // 陝ｾ・ｦ = Bad
    }
    // 闕ｳ鄙ｫ縺帷ｹ晢ｽｯ郢ｧ・､郢昴・> 50px = OK
    else if (absY > 50 && diffY < 0) {
        if (!vocabSettings.isOkDisabled) handleVocabResult('ok');
    }
});

// --- 陷雁ｩ・ｪ讒ｫ・ｱ・･雎・ｽｴ郢晢ｽ｢郢晢ｽｼ郢敖郢晢ｽｫ ---
function showVocabHistory() {
    const subjId = appData.currentSubjectId;
    if (subjId === ALL_SUBJECTS_ID) return;
    const subj = appData.subjects[subjId];
    if (!subj || !subj.isVocab || !subj.words) return;

    const tbody = document.getElementById('vocab-history-table-body');
    tbody.innerHTML = '';

    subj.words.forEach((w, index) => {
        const wordIdStr = String(index + 1);
        const normalStat = (subj.wordStats && subj.wordStats[wordIdStr]) || { p: 0, o: 0, b: 0 };
        const drillStat = (subj.drillStats && subj.drillStats[wordIdStr]) || { p: 0, o: 0, b: 0 };

        const totalStat = {
            p: normalStat.p + drillStat.p,
            o: normalStat.o + drillStat.o,
            b: normalStat.b + drillStat.b
        };

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-3 text-center border-b border-gray-800 text-gray-500 font-mono">${index + 1}</td>
            <td class="p-3 border-b border-gray-800 font-bold text-gray-200">${w.word}</td>
            <td class="p-3 text-center border-b border-gray-800 text-app-success font-bold bg-green-900/10">${totalStat.p || '-'}</td>
            <td class="p-3 text-center border-b border-gray-800 text-challenge-gold font-bold bg-yellow-900/10">${totalStat.o || '-'}</td>
            <td class="p-3 text-center border-b border-gray-800 text-gray-500 font-bold bg-gray-800/50">${totalStat.b || '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('vocab-history-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeVocabHistory() {
    document.getElementById('vocab-history-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// === 陷雁ｩ・ｪ讒ｫ・ｸ・ｳ郢ｧ・ｪ郢晏干縺咏ｹ晢ｽｧ郢晢ｽｳ髫ｪ・ｭ陞ｳ繝ｻ===
let vocabSettings = {
    isSimpleMode: false,
    isSpeechEnabled: false,
    isOkDisabled: false,
    isSwipeEnabled: false,
    settingsOrder: []
};

// 郢晢ｽｭ郢晢ｽｼ郢ｧ・ｫ郢晢ｽｫ郢ｧ・ｹ郢晏現ﾎ樒ｹ晢ｽｼ郢ｧ・ｸ邵ｺ荵晢ｽ蛾坡・ｭ邵ｺ・ｿ髴趣ｽｼ邵ｺ・ｿ
(function loadVocabSettings() {
    try {
        const saved = localStorage.getItem('vocabSettings');
        if (saved) {
            const parsed = JSON.parse(saved);
            vocabSettings.isSimpleMode = !!parsed.isSimpleMode;
            vocabSettings.isSpeechEnabled = !!parsed.isSpeechEnabled;
            vocabSettings.isOkDisabled = !!parsed.isOkDisabled;
            vocabSettings.isSwipeEnabled = !!parsed.isSwipeEnabled;
            vocabSettings.settingsOrder = parsed.settingsOrder || [];
        }
    } catch (e) { /* ignore */ }
})();

function saveVocabSettings() {
    localStorage.setItem('vocabSettings', JSON.stringify(vocabSettings));
}

function applyVocabSettingsUI() {
    const simEl = document.getElementById('vocab-simple-toggle');
    const spEl = document.getElementById('vocab-speech-toggle');
    const okEl = document.getElementById('vocab-disable-ok-toggle');
    const swEl = document.getElementById('vocab-swipe-toggle');
    const fsEl = document.getElementById('vocab-fullscreen-toggle');
    if (simEl) simEl.checked = vocabSettings.isSimpleMode;
    if (spEl) spEl.checked = vocabSettings.isSpeechEnabled;
    if (okEl) okEl.checked = vocabSettings.isOkDisabled;
    if (swEl) swEl.checked = vocabSettings.isSwipeEnabled;
    if (fsEl) fsEl.checked = isFullscreenMode;

    // 髫ｪ・ｭ陞ｳ螢ｹ繝ｻ闕ｳ・ｦ邵ｺ・ｳ鬯・・・定包ｽｩ陷医・
    restoreVocabSettingsOrder();
}

function toggleVocabSimple() {
    vocabSettings.isSimpleMode = document.getElementById('vocab-simple-toggle').checked;
    saveVocabSettings();
    applySimpleMode();
}

function toggleVocabSpeech() {
    vocabSettings.isSpeechEnabled = document.getElementById('vocab-speech-toggle').checked;
    saveVocabSettings();
    applySpeechButtonVisibility();
}

function toggleVocabDisableOk() {
    vocabSettings.isOkDisabled = document.getElementById('vocab-disable-ok-toggle').checked;
    saveVocabSettings();
}

function toggleVocabSwipe() {
    vocabSettings.isSwipeEnabled = document.getElementById('vocab-swipe-toggle').checked;
    saveVocabSettings();
    if (vocabSettings.isSwipeEnabled) {
        showToast('郢ｧ・ｹ郢晢ｽｯ郢ｧ・､郢晄ｶ君: 陷ｿ・ｳ=Perfect, 陝ｾ・ｦ=Bad, 闕ｳ繝ｻOK, 郢ｧ・ｿ郢昴・繝ｻ=驕ｲ譁絶斡');
    }
}

function applySimpleMode() {
    const container = document.getElementById('vocab-flashcard-container');
    if (!container) return;
    if (vocabSettings.isSimpleMode) {
        container.classList.add('simple-mode');
    } else {
        container.classList.remove('simple-mode');
    }
}

function applySpeechButtonVisibility() {
    const btn = document.getElementById('vocab-replay-speech-btn');
    if (!btn) return;
    if (vocabSettings.isSpeechEnabled) {
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
    }
}

// 鬮ｻ・ｳ陞｢・ｰ陷蜥ｲ蜃ｽ
function speakWord(text) {
    if (!text) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        utter.rate = 0.9;
        window.speechSynthesis.speak(utter);
    }
}

// === 陷雁ｩ・ｪ讒ｫ・ｸ・ｳUI陋ｻ・ｶ陟包ｽ｡繝ｻ驛・ｽｨ・ｭ陞ｳ螢ｹﾎ鍋ｹ昜ｹ斟礼ｹ晢ｽｼ繝ｻ繝ｻﾎ皮ｹ晢ｽｼ郢敖郢晢ｽｫ繝ｻ繝ｻ===
function toggleVocabMenu() {
    const menu = document.getElementById('vocab-menu-content');
    if (menu.classList.contains('vocab-menu-hidden')) {
        menu.classList.remove('vocab-menu-hidden');
        menu.classList.add('vocab-menu-visible');
    } else {
        menu.classList.remove('vocab-menu-visible');
        menu.classList.add('vocab-menu-hidden');
    }
}

// 闔画じ繝ｻ陜｣・ｴ隰・郢ｧ蛛ｵ縺｡郢昴・繝ｻ邵ｺ・ｧ郢晢ｽ｡郢昜ｹ斟礼ｹ晢ｽｼ郢ｧ蟶晏陶邵ｺ蛟･・・
document.addEventListener('click', (e) => {
    const container = document.getElementById('vocab-settings-container');
    const menu = document.getElementById('vocab-menu-content');
    if (container && !container.contains(e.target) && menu && menu.classList.contains('vocab-menu-visible')) {
        menu.classList.remove('vocab-menu-visible');
        menu.classList.add('vocab-menu-hidden');
    }
});

function showVocabRangeModal(mode = 'free', targetUnitId = null) {
    if (!document.getElementById('vocab-range-modal').classList.contains('hidden') || (typeof vocabSession !== 'undefined' && vocabSession.isActive)) {
        if (typeof showToast === 'function') showToast('隴鯉ｽ｢邵ｺ・ｫ陝・ｽｦ驗吝､蛻､鬮ｱ・｢邵ｺ遒∝ｹ慕ｸｺ荵晢ｽ檎ｸｺ・ｦ邵ｺ繝ｻ竏ｪ邵ｺ繝ｻ, true);
        return;
    }
    const subjId = appData.currentSubjectId;
    if (subjId === ALL_SUBJECTS_ID) return;
    const subj = appData.subjects[subjId];
    if (!subj || !subj.isVocab || !subj.words) return;

    const startInput = document.getElementById('vocab-free-start');
    const endInput = document.getElementById('vocab-free-end');
    const startBtn = document.getElementById('start-btn');

    if (mode === 'today') {
        const todayStr = getTodayStr();
        const schedules = appData.schedules[todayStr] || [];
        const mySchedules = schedules.filter(s => s.subjectId === subjId && s.unitId && s.unitId.startsWith('vocab_'));

        let selectedSchedules = mySchedules;
        if (targetUnitId) {
            selectedSchedules = mySchedules.filter(s => s.unitId === targetUnitId);
            if (selectedSchedules.length === 0) selectedSchedules = mySchedules;
        }

        let minStart = Infinity;
        let maxEnd = -Infinity;
        selectedSchedules.forEach(schedule => {
            const unitId = schedule.unitId;
            if (unitId.startsWith('vocab_')) {
                const parts = unitId.split('_');
                const start = parseInt(parts[1], 10);
                const end = parseInt(parts[2], 10);
                if (start < minStart) minStart = start;
                if (end > maxEnd) maxEnd = end;
            }
        });

        if (minStart !== Infinity && maxEnd !== -Infinity) {
            startInput.value = minStart;
            endInput.value = maxEnd;
        }

        // 闔蛾大ｾ狗ｸｺ・ｮ闔莠･・ｮ螢ｹﾎ皮ｹ晢ｽｼ郢昴・ 隴鯉ｽ｢邵ｺ・ｫ陷茨ｽ･陷牙ｸ呻ｼ・ｹｧ蠕娯ｻ邵ｺ繝ｻ・玖屐・､郢ｧ蛛ｵﾎ溽ｹ昴・縺醍ｸｺ蜷ｶ・・
        startInput.disabled = true;
        endInput.disabled = true;
        startInput.classList.add('opacity-50', 'cursor-not-allowed');
        endInput.classList.add('opacity-50', 'cursor-not-allowed');
        const sessionTargetUnitId = (selectedSchedules.length === 1) ? selectedSchedules[0].unitId : null;
        startBtn.onclick = () => startVocabSession('today', sessionTargetUnitId);
        startBtn.innerHTML = `
            <span class="relative z-10 flex items-center gap-2">
                <i class="fas fa-book-open h-6 w-6 group-hover:scale-110 transition-transform flex items-center justify-center text-xl"></i>
                TODAY'S TASKS
            </span>
            <span class="absolute inset-0 bg-blue-400 blur-md opacity-0 group-hover:opacity-40 transition-opacity"></span>
        `;
    } else {
        // 髢ｾ・ｪ騾包ｽｱ郢晢ｽ｢郢晢ｽｼ郢昴・
        startInput.disabled = false;
        endInput.disabled = false;
        startInput.classList.remove('opacity-50', 'cursor-not-allowed');
        endInput.classList.remove('opacity-50', 'cursor-not-allowed');
        endInput.value = subj.words.length;
        startBtn.onclick = startVocabFreeRange;
        startBtn.innerHTML = `
            <span class="relative z-10 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                TAP TO START
            </span>
            <span class="absolute inset-0 flex items-center gap-2 text-app-accent/80 blur-md hidden group-hover:flex">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                TAP TO START
            </span>
        `;
    }

    // 髫ｪ・ｭ陞ｳ螢ｹﾎ鍋ｹ昜ｹ斟礼ｹ晢ｽｼ郢ｧ蛛ｵﾎ皮ｹ晢ｽｼ郢敖郢晢ｽｫ陷繝ｻ竊馴勗・ｨ驕会ｽｺ
    const settings = document.getElementById('vocab-settings-container');
    const modal = document.getElementById('vocab-range-modal');
    if (settings && modal) {
        settings.style.position = 'absolute';
        settings.style.top = '16px';
        settings.style.right = '16px';
        modal.appendChild(settings);
        settings.classList.remove('hidden');
        settings.classList.add('flex');
    }

    if (modal) modal.classList.remove('hidden');
}

function closeVocabRangeModal() {
    document.getElementById('vocab-range-modal').classList.add('hidden');
    if (!vocabSession.isActive) {
        // 髫ｪ・ｭ陞ｳ螢ｹﾎ鍋ｹ昜ｹ斟礼ｹ晢ｽｼ郢ｧ蟶晄直髯ｦ・ｨ驕会ｽｺ
        const settings = document.getElementById('vocab-settings-container');
        if (settings) {
            settings.classList.add('hidden');
            settings.classList.remove('flex');
        }
    }
}

// === 髢ｾ・ｪ騾包ｽｱ驕ｽ繝ｻ蟲・ｸｺ・ｧ鬮｢蜿･・ｧ繝ｻ===
function startVocabFreeRange() {
    const subjId = appData.currentSubjectId;
    if (subjId === ALL_SUBJECTS_ID) return;
    const subj = appData.subjects[subjId];
    if (!subj || !subj.isVocab || !subj.words || subj.words.length === 0) {
        showToast("陷雁ｩ・ｪ讒ｭ繝ｧ郢晢ｽｼ郢ｧ・ｿ邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ・, true);
        return;
    }

    let startVal = parseInt(document.getElementById('vocab-free-start').value, 10);
    let endVal = parseInt(document.getElementById('vocab-free-end').value, 10);
    const isRandom = document.getElementById('vocab-random-check').checked;

    // 驕ｨ・ｺ隹ｺ繝ｻ竊醍ｹｧ迚吶・驕ｽ繝ｻ蟲・
    if (isNaN(startVal)) startVal = 1;
    if (isNaN(endVal)) endVal = subj.words.length;

    if (startVal < 1) startVal = 1;
    if (endVal > subj.words.length) endVal = subj.words.length;
    if (startVal > endVal) {
        showToast('驕ｽ繝ｻ蟲・ｸｺ譴ｧ・ｭ・｣邵ｺ蜉ｱ・･邵ｺ繧・ｽ顔ｸｺ・ｾ邵ｺ蟶呻ｽ・(鬮｢蜿･・ｧ繝ｻ遶包ｽｦ 驍ｨ繧・ｽｺ繝ｻ', true);
        return;
    }

    vocabSession.mode = 'free';
    vocabSession.drillId = null;
    vocabSession.todayUnitIds = [];
    vocabSession.results = new Array(subj.words.length).fill(null);

    // 郢ｧ・､郢晢ｽｳ郢昴・繝｣郢ｧ・ｯ郢ｧ・ｹ邵ｺ・ｯ0郢晏生繝ｻ郢ｧ・ｹ邵ｺ・ｪ邵ｺ・ｮ邵ｺ・ｧ -1
    let indices = [];
    for (let i = startVal - 1; i < endVal; i++) {
        indices.push(i);
    }

    // 郢晢ｽｩ郢晢ｽｳ郢敖郢晢｣ｰ郢ｧ・ｷ郢晢ｽ｣郢昴・繝ｵ郢晢ｽｫ
    if (isRandom) {
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
    }

    vocabSession.queue = indices;
    vocabSession.queueIndex = 0;
    vocabSession.isActive = true;

    closeVocabRangeModal();
    applySimpleMode();

    const flashcardContainer = document.getElementById('vocab-flashcard-container');
    flashcardContainer.classList.remove('hidden');

    // 髫ｪ・ｭ陞ｳ螢ｹﾎ鍋ｹ昜ｹ斟礼ｹ晢ｽｼ郢ｧ蛛ｵ繝ｵ郢晢ｽｩ郢昴・縺咏ｹ晢ｽ･郢ｧ・ｫ郢晢ｽｼ郢晉甥繝ｻ邵ｺ・ｫabsolute鬩溷調・ｽ・ｮ邵ｺ・ｧ髯ｦ・ｨ驕会ｽｺ
    const settings = document.getElementById('vocab-settings-container');
    if (settings && flashcardContainer) {
        settings.style.position = '';
        settings.style.top = '';
        settings.style.right = '';
        flashcardContainer.appendChild(settings);
        settings.classList.remove('hidden');
        settings.classList.add('flex');
    }

    initVocabCard();
}

// === 隰悟鴻・ｸ・ｾ郢晢ｽｪ郢ｧ・ｻ郢昴・繝ｨ ===
let _resetVocabConfirmTimer = null;
function resetVocabStats() {
    const subjId = appData.currentSubjectId;
    if (subjId === ALL_SUBJECTS_ID) return;
    const subj = appData.subjects[subjId];
    if (!subj || !subj.isVocab) return;

    if (_resetVocabConfirmTimer) {
        // 2陜玲ｨ貞ｲｼ郢ｧ・ｿ郢昴・繝ｻ: 陞ｳ貅ｯ・｡繝ｻ
        clearTimeout(_resetVocabConfirmTimer);
        _resetVocabConfirmTimer = null;

        subj.wordStats = {};
        subj.drillStats = {};
        saveData();
        updateUI();
        showToast('学習記録をリセットしました');
        // 陞ｻ・･雎・ｽｴ郢晢ｽ｢郢晢ｽｼ郢敖郢晢ｽｫ邵ｺ遒∝ｹ慕ｸｺ繝ｻ窶ｻ邵ｺ繝ｻ・檎ｸｺ・ｰ隴厄ｽｴ隴・ｽｰ
        showVocabHistory();
    } else {
        // 1陜玲ｨ貞ｲｼ郢ｧ・ｿ郢昴・繝ｻ: 驕抵ｽｺ髫ｱ蟠趣ｽ｡・ｨ驕会ｽｺ
        const btn = document.querySelector('#vocab-history-modal button[onclick="resetVocabStats()"]');
        let originalHTML = '';
        if (btn) {
            originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> クリックでリセット実行';
            btn.classList.add('bg-red-500/20', 'text-red-300');
        }
        showToast('郢ｧ繧・鴬闕ｳﾂ陟趣ｽｦ郢ｧ・ｿ郢昴・繝ｻ邵ｺ・ｧ隰悟鴻・ｸ・ｾ郢ｧ雋槭・雎ｸ莠･謔臥ｸｺ蜉ｱ竏ｪ邵ｺ繝ｻ, true);

        _resetVocabConfirmTimer = setTimeout(() => {
            _resetVocabConfirmTimer = null;
            if (btn) {
                btn.innerHTML = originalHTML;
                btn.classList.remove('bg-red-500/20', 'text-red-300');
            }
        }, 3000);
    }
}

// === Excel陷・ｽｺ陷峨・===
function exportVocabStatsToExcel() {
    const subjId = appData.currentSubjectId;
    if (subjId === ALL_SUBJECTS_ID) return;
    const subj = appData.subjects[subjId];
    if (!subj || !subj.isVocab || !subj.words || subj.words.length === 0) {
        showToast('陷・ｽｺ陷牙ｸ吮・郢ｧ荵昴Ι郢晢ｽｼ郢ｧ・ｿ邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ・, true);
        return;
    }

    const exportData = subj.words.map((w, index) => {
        const wordIdStr = String(index + 1);
        const normalStat = (subj.wordStats && subj.wordStats[wordIdStr]) || { p: 0, o: 0, b: 0 };
        const drillStat = (subj.drillStats && subj.drillStats[wordIdStr]) || { p: 0, o: 0, b: 0 };
        return {
            "ID": index + 1,
            "Word": w.word,
            "Meaning": w.meanings ? w.meanings[0] : '',
            "邵ｲ繝ｻ: (normalStat.p + drillStat.p) || 0,
            "隨・ｽｳ": (normalStat.o + drillStat.o) || 0,
            "・・・: (normalStat.b + drillStat.b) || 0
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Statistics");

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const filename = `vocab_stats_${subj.name || 'unknown'}_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, filename);
    showToast('Excelファイルをエクスポートしました');
}

// 隴芽挙・ｨ蛟･縺｡郢晏・・｡・ｨ驕会ｽｺ隴弱ｅ竊鍋ｹｧ・ｪ郢晏干縺咏ｹ晢ｽｧ郢晢ｽｳ髫ｪ・ｭ陞ｳ蝠・郢ｧ雋樣・隴帙・
document.addEventListener('DOMContentLoaded', () => {
    applyVocabSettingsUI();
    initVocabSortableSettings();
});

// SortableJS: 髫ｪ・ｭ陞ｳ螢ｹ繝ｻ闕ｳ・ｦ邵ｺ・ｳ隴厄ｽｿ邵ｺ莠･繝ｻ隴帶ｺｷ蝟ｧ
function initVocabSortableSettings() {
    const el = document.getElementById('vocab-sortable-settings');
    if (!el || typeof Sortable === 'undefined') return;
    new Sortable(el, {
        animation: 150,
        onEnd: function () {
            const newOrder = Array.from(el.children).map(item => item.dataset.settingKey);
            vocabSettings.settingsOrder = newOrder;
            saveVocabSettings();
        }
    });
}

// 髫ｪ・ｭ陞ｳ螢ｹ繝ｻ闕ｳ・ｦ邵ｺ・ｳ鬯・・・定包ｽｩ陷医・
function restoreVocabSettingsOrder() {
    if (!vocabSettings.settingsOrder || vocabSettings.settingsOrder.length === 0) return;
    const container = document.getElementById('vocab-sortable-settings');
    if (!container) return;
    const items = Array.from(container.children);
    const sortedItems = vocabSettings.settingsOrder
        .map(key => items.find(item => item.dataset.settingKey === key))
        .filter(Boolean);
    const remainingItems = items.filter(item => !vocabSettings.settingsOrder.includes(item.dataset.settingKey));
    sortedItems.concat(remainingItems).forEach(item => container.appendChild(item));
}
