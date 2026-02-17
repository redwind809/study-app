$path = "c:\myprogram\study-app\assets\script.js"
$content = Get-Content $path -Raw -Encoding UTF8

$renderCalendarClean = @"
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('calendar-title');
    grid.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    title.textContent = ``${year}年 ``${month + 1}月;

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
            lDiv.textContent = ``${m + 1}月 (``${percent}%);
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
            daySpan.className = ``text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 z-10 ``${isToday
                ? 'bg-app-accent text-app-dark shadow-lg ring-2 ring-app-accent/30'
                : 'text-gray-300 group-hover:bg-gray-700'
                };
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
                    flag.innerHTML = examSubjs.map(s => `<i class="fas fa-flag text-[10px] ``${getSubjectColor(s.id)} filter drop-shadow"></i>`).join('');
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
"@

$completeVocabScheduleClean = @"
function completeVocabSchedule(unitId) {
    const subjId = appData.currentSubjectId;
    const subj = appData.subjects[subjId];
    if (subj && subj.isVocab) {
        showToast(``単語学習の範囲「``${unitId}」を完了としてマークしました。);
        saveData();
        updateUI();
    }
}
"@

# Replace renderCalendar block
$content = $content -replace 'function renderCalendar\(\) \{[\s\S]*?\}', $renderCalendarClean

# Replace completeVocabSchedule block
$content = $content -replace 'function completeVocabSchedule\(\w+\) \{[\s\S]*?\}', $completeVocabScheduleClean

# Fix version
$content = $content -replace 'const APP_VERSION = "v6.1.\d+";', 'const APP_VERSION = "v6.1.26";'

Set-Content $path $content -Encoding UTF8
