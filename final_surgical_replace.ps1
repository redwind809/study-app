$path = "assets/script.js"
$c = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Literal replacements
$c = $c.Replace("name: '陋ｹ髢€・ｭ・ｦ'", "name: '化学'")
$c = $c.Replace('showToast("鬩･髦ｪ竏ｩ郢ｧ蜑・ｽｸﾂ€隲｡・ｬ隴厄ｽｴ隴・ｽｰ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);', 'showToast("一括ウェイト設定を保存しました");')
$c = $c.Replace('const vocabArea = document.getElementById(''vocab-action-area''); // 隨倥・・ｿ・ｽ陷会｣ｰ: 陷雁€ｩ・ｪ讒ｫ・ｭ・ｦ驗吝・縺顔ｹ晢ｽｪ郢ｧ・｢', 'const vocabArea = document.getElementById(''vocab-action-area''); // 単語学習エリア')
$c = $c.Replace('showToast(`蜊倩ｪ槫ｭｦ鄙偵・遽・峇縲・{unitId}縲阪ｒ螳御ｺ・→縺励※繝槭・繧ｯ縺励∪縲Ａ);', 'showToast(`単語学習の範囲「${unitId}」を完了としてマークしました。`);')
$c = $c.Replace("showToast('隰悟鴻・ｸ・ｾ郢ｧ蛛ｵﾎ懃ｹｧ・ｻ郢昴・繝ｨ邵ｺ蜉ｱ竏ｪ邵ｺ蜉ｱ笳・);", "showToast('学習記録をリセットしました');")
$c = $c.Replace('btn.innerHTML = ''<i class="fas fa-exclamation-triangle"></i> 郢ｧ・ｿ郢昴・繝ｻ邵ｺ・ｧ陞ｳ貅ｯ・｡繝ｻ;', 'btn.innerHTML = ''<i class="fas fa-exclamation-triangle"></i> クリックでリセット実行'';')
$c = $c.Replace("showToast('郢ｧ繧・鴬闕ｳﾂ€陟趣ｽｦ郢ｧ・ｿ郢昴・繝ｻ邵ｺ・ｧ隰悟鴻・ｸ・ｾ郢ｧ雋槭・雎ｸ莠･謔臥ｸｺ蜉ｱ竏ｪ邵ｺ繝ｻ, true);", "showToast('もう一度クリックして学習記録をリセットします', true);")
$c = $c.Replace("showToast('陷・ｽｺ陷牙ｸ吮・郢ｧ葵昴Ι郢晢ｽｼ郢ｧ・ｿ邵ｺ蠕娯旺郢ｧ鄙ｫ竏ｪ邵ｺ蟶呻ｽ・, true);", "showToast('エクスポートする単語データがありません', true);")
$c = $c.Replace("showToast('Excel郢晁ｼ斐＜郢ｧ・､郢晢ｽｫ郢ｧ雋槭・陷牙ｸ呻ｼ邵ｺ・ｾ邵ｺ蜉ｱ笳・);", "showToast('Excelファイルをエクスポートしました');")

[System.IO.File]::WriteAllText($path, $c, [System.Text.Encoding]::UTF8)
Write-Host "Literal replace done."
