$path = "c:\myprogram\study-app\assets\script.js"
$lines = Get-Content $path
$cal = Get-Content "c:\myprogram\study-app\clean_cal.txt"
$vocab = Get-Content "c:\myprogram\study-app\clean_vocab.txt"

$newContent = $lines[0..2625] + $cal + $lines[2840..7695] + $vocab + $lines[7724..($lines.Length-1)]
$newContent[1] = 'const APP_VERSION = "v6.1.26";'
$newContent | Set-Content $path -Encoding UTF8
