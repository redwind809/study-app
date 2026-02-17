$path = "c:\myprogram\study-app\assets\script.js"
$lines = Get-Content $path

$start1 = ($lines | Select-String -SimpleMatch "function renderCalendar() {" | Select-Object -First 1).LineNumber
$end1Marker = ($lines | Select-String -SimpleMatch "function updateCalendarLegend() {" | Select-Object -First 1).LineNumber

$start2 = ($lines | Select-String -SimpleMatch "function completeVocabSchedule(unitId) {" | Select-Object -First 1).LineNumber
$end2Marker = ($lines | Select-String -SimpleMatch "function showVocabSummary() {" | Select-Object -First 1).LineNumber

if (-not $start1 -or -not $end1Marker -or -not $start2 -or -not $end2Marker) {
    Write-Error "Could not find function signatures."
    exit 1
}

$cal = Get-Content "c:\myprogram\study-app\clean_cal.txt"
$vocab = Get-Content "c:\myprogram\study-app\clean_vocab.txt"

$newLines = $lines[0..($start1-2)] + $cal + $lines[($end1Marker-2)..($start2-2)] + $vocab + $lines[($end2Marker-2)..($lines.Length-1)]
# Fix version
$newLines[1] = 'const APP_VERSION = "v6.1.26";'

$newContent = $newLines -join "`r`n"
# Use [System.IO.File]::WriteAllText to ensure exact UTF-8 and no BOM issues
[System.IO.File]::WriteAllText($path, $newContent, (New-Object System.Text.UTF8Encoding($false)))
