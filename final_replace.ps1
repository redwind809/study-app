$path = "assets/script.js"
$c = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Surgical replacements
$c = $c -replace "name: '陋ｹ髢€・ｭ・ｦ'", "name: '化学'"
$c = $c -replace 'showToast\("鬩･髦ｪ[^"]+笳・\);', 'showToast("一括ウェイト設定を保存しました");'
$c = $c -replace 'vocabArea = [^;]+// 隨倥・・ｿ・ｽ陷会｣ｰ: 陷雁€ｩ・ｪ讒ｫ・ｭ・ｦ驗吝・縺顔ｹ晢ｽｪ郢ｧ・｢', 'vocabArea = document.getElementById(''vocab-action-area''); // 単語学習エリア'
$c = $c -replace 'showToast\(`蜊倩ｪ槫ｭｦ鄙偵・遽・峇[^`]+縲Ａ\);', 'showToast(`単語学習の範囲「${unitId}」を完了としてマークしました。`);'
$c = $c -replace "showToast\('隰悟鴻・ｸ・ｾ郢ｧ蛛ｵﾎ懃ｹｧ・ｻ郢昴・繝ｨ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・\);", "showToast('学習記録をリセットしました');"
$c = $c -replace "btn\.innerHTML = '<i class=""fas fa-exclamation-triangle""></i> [^']*繝ｻ;", "btn.innerHTML = '<i class=""fas fa-exclamation-triangle""></i> クリックでリセット実行';"
$c = $c -replace "showToast\('郢ｧ繧・鴬闕ｳﾂ€陟趣ｽｦ[^']*繝ｻ, true\);", "showToast('もう一度クリックして学習記録をリセットします', true);"
$c = $c -replace "showToast\('陷・ｽｺ陷牙ｸ吮・[^']*邵ｺ蟶呻ｽ・, true\);", "showToast('エクスポートする単語データがありません', true);"
$c = $c -replace "showToast\('Excel郢晁ｼ斐＜[^']*笳・\);", "showToast('Excelファイルをエクスポートしました');"

[System.IO.File]::WriteAllText($path, $c, [System.Text.Encoding]::UTF8)
Write-Host "Replaced successfully."
