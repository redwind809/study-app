$path = "assets/script.js"
$content = Get-Content -Path $path -Encoding UTF8
$newContent = @()

# 1. Fix defaultSubjects
for ($i = 0; $i -lt $content.Length; $i++) {
    if ($content[$i] -match "const defaultSubjects = {") {
        $newContent += "const defaultSubjects = {"
        $newContent += "    chemistry: { id: 'chemistry', type: 'study', name: '化学', examDate: null, startDate: null, isActive: true, syllabus: [], history: {} }"
        $newContent += "};"
        $i += 4 # Skip corrupted lines
    } elseif ($content[$i] -match "showToast\(`蜊倩ｪ槫ｭｦ鄙偵・遽・峇") {
         $newContent += "        showToast(`単語学習の範囲「`${unitId}」を完了としてマークしました。`);"
    } elseif ($content[$i] -match "title.textContent = `${year}蟷ｴ") {
         $newContent += "    title.textContent = `${year}年 `${month + 1}月`;"
    } else {
        $newContent += $content[$i]
    }
}

# Actually, doing it line by line with simple -match is risky if indices shift.
# Let's use a more robust way: find blocks and replace.

$raw = [System.IO.File]::ReadAllText((Get-Item $path).FullName, [System.Text.Encoding]::UTF8)

# Functions to replace
function Replace-Block($text, $startPattern, $endPattern, $replacement) {
    $startIndex = $text.IndexOf($startPattern)
    if ($startIndex -ge 0) {
        $endIndex = $text.IndexOf($endPattern, $startIndex)
        if ($endIndex -ge 0) {
            $endIndex += $endPattern.Length
            return $text.Substring(0, $startIndex) + $replacement + $text.Substring($endIndex)
        }
    }
    return $text
}

# 1. defaultSubjects
$subjClean = "const defaultSubjects = {
    chemistry: { id: 'chemistry', type: 'study', name: '化学', examDate: null, startDate: null, isActive: true, syllabus: [], history: {} }
};"
$raw = Replace-Block $raw "const defaultSubjects = {" "};" $subjClean

# 2. renderCalendar (L2632-2744)
$calClean = Get-Content -Path "clean_cal.txt" -Raw
$raw = Replace-Block $raw "function renderCalendar() {" "grid.appendChild(cell);`r`n    }`r`n}" $calClean

# 3. completeVocabSchedule (L7504-7512)
$vocabClean = Get-Content -Path "clean_vocab.txt" -Raw
$raw = Replace-Block $raw "function completeVocabSchedule(unitId) {" "    }`r`n}" $vocabClean

# 4. showToast fixes (simple string replacements)
$raw = $raw.Replace('showToast("陷台ｼ∝求邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);', 'showToast("カテゴリーを削除しました");')
$raw = $raw.Replace('showToast("鬩･髦ｪ竏ｩ郢ｧ蜑・ｽｸﾂ€隲｡・ｬ隴厄ｽｴ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);', 'showToast("一括ウェイト設定を保存しました");')
$raw = $raw.Replace("showToast('隰悟鴻・ｸ・ｾ郢ｧ蛛ｵﾎ懃ｹｧ・ｻ郢昴・繝ｨ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);", "showToast('学習記録をリセットしました');")
$raw = $raw.Replace("showToast('Excel郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ郢ｧ雋槭・陷牙ｸ呻ｼ邵ｺ・ｾ邵ｺ蜉ｱ笳・);", "showToast('Excelファイルをエクスポートしました');")

# 5. Record lists area (L2165-2182 approx)
$recordAreaClean = "    // チャレンジ/単語帳/未達成エリアの表示制御
    const challengeArea = document.getElementById('challenge-action-area');
    const vocabArea = document.getElementById('vocab-action-area'); // 単語学習エリア
    const queueSection = document.getElementById('record-queue-section'); // 未達成セクション

    // 初期状態は非表示
    challengeArea.classList.add('hidden');
    vocabArea.classList.add('hidden');
    const settingsContainer = document.getElementById('vocab-settings-container');
    // 単語学習が進行中でない場合は設定を隠す
    if (settingsContainer && !(typeof vocabSession !== 'undefined' && vocabSession.isActive)) {
        settingsContainer.classList.add('hidden');
        settingsContainer.classList.remove('flex');
    }
    queueSection.style.display = 'block'; 
    todaysList.style.display = 'block'; 
    document.getElementById('record-task-count').parentElement.style.display = 'flex';"

$raw = Replace-Block $raw "// 郢昶・ﾎ慕ｹ晢ｽｬ郢晢ｽｳ郢ｧ・ｸ郢晄㈱縺｡郢晢ｽｳ陷ｿ鄙ｫ繝ｻVocab鬯・ｼ懈ｲｺ邵ｺ・ｮ髯ｦ・ｨ驕会ｽｺ" "record-task-count').parentElement.style.display = 'flex';" $recordAreaClean

[System.IO.File]::WriteAllText((Get-Item $path).FullName, $raw, [System.Text.Encoding]::UTF8)
Write-Host "Restoration complete."
