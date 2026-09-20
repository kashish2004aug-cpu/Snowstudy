console.log("Snow Study Started ❄️");

/* =========================================================
   HELPERS
   ========================================================= */

function getTodayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
    if (!key) return null;

    const parts = key.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;

    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getDayDifference(laterKey, earlierKey) {
    const later = parseDateKey(laterKey);
    const earlier = parseDateKey(earlierKey);

    if (!later || !earlier) return null;

    const laterUTC = Date.UTC(
        later.getFullYear(),
        later.getMonth(),
        later.getDate()
    );

    const earlierUTC = Date.UTC(
        earlier.getFullYear(),
        earlier.getMonth(),
        earlier.getDate()
    );

    return Math.round((laterUTC - earlierUTC) / 86400000);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateKey) {
    const date = parseDateKey(dateKey);

    if (!date) return "Unknown date";

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getTimetableRows() {
    return Array.from(document.querySelectorAll(".timetable-row"));
}


/* =========================================================
   CURRENT DATE
   ========================================================= */

function updateCurrentDate() {
    const currentDate = document.getElementById("currentDate");

    if (!currentDate) return;

    currentDate.textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}


/* =========================================================
   TIMETABLE
   ========================================================= */

function createTimetableRow(task = {}) {
    const row = document.createElement("div");
    row.className = "timetable-row";

    const start = document.createElement("input");
    start.type = "time";
    start.value = task.start || "";

    const end = document.createElement("input");
    end.type = "time";
    end.value = task.end || "";

    const subject = document.createElement("input");
    subject.type = "text";
    subject.placeholder = "Subject";
    subject.value = task.subject || "";

    const goal = document.createElement("input");
    goal.type = "text";
    goal.placeholder = "Task / Goal";
    goal.value = task.goal || task.task || "";

    const target = document.createElement("input");
    target.type = "number";
    target.min = "0";
    target.placeholder = "Target";
    target.value = task.target ?? "";

    const completed = document.createElement("input");
    completed.type = "number";
    completed.min = "0";
    completed.placeholder = "Completed";
    completed.value = task.completed ?? "";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(task.done);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "🗑️";
    deleteButton.title = "Delete task";
    deleteButton.className = "delete-task";

    deleteButton.addEventListener("click", function () {
        row.remove();
        saveTimetable();
        refreshStudyViews();
    });

    row.appendChild(start);
    row.appendChild(end);
    row.appendChild(subject);
    row.appendChild(goal);
    row.appendChild(target);
    row.appendChild(completed);
    row.appendChild(checkbox);
    row.appendChild(deleteButton);

    return row;
}

function addTimetableRow() {
    const timetable = document.getElementById("timetable");

    if (!timetable) return;

    timetable.appendChild(createTimetableRow());

    saveTimetable();
    refreshStudyViews();
}

function loadTimetable() {
    const timetable = document.getElementById("timetable");

    if (!timetable) return;

    timetable.innerHTML = "";

    let saved = [];

    try {
        saved = JSON.parse(localStorage.getItem("snowStudyTimetable")) || [];
    } catch (error) {
        console.error("Could not load timetable:", error);
        saved = [];
    }

    if (saved.length === 0) {
        timetable.appendChild(createTimetableRow());
        return;
    }

    saved.forEach(task => {
        timetable.appendChild(createTimetableRow(task));
    });
}

function saveTimetable() {
    const rows = getTimetableRows();

    const data = rows.map(row => {
        const timeInputs = row.querySelectorAll('input[type="time"]');
        const textInputs = row.querySelectorAll('input[type="text"]');
        const numberInputs = row.querySelectorAll('input[type="number"]');
        const checkbox = row.querySelector('input[type="checkbox"]');

        return {
            start: timeInputs[0]?.value || "",
            end: timeInputs[1]?.value || "",
            subject: textInputs[0]?.value || "",
            goal: textInputs[1]?.value || "",
            target: Number(numberInputs[0]?.value) || 0,
            completed: Number(numberInputs[1]?.value) || 0,
            done: checkbox?.checked || false
        };
    });

    localStorage.setItem(
        "snowStudyTimetable",
        JSON.stringify(data)
    );
}


/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress() {
    const rows = getTimetableRows();
    const progressText = document.getElementById("progressText");

    if (!progressText) return;

    if (rows.length === 0) {
        progressText.textContent = "0%";
        return;
    }

    const completedTasks = rows.filter(row => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        return checkbox?.checked;
    }).length;

    const percentage = Math.round(
        (completedTasks / rows.length) * 100
    );

    progressText.textContent = `${percentage}%`;
}


/* =========================================================
   TASK PROGRESS
   ========================================================= */

function updateTaskProgress() {
    const rows = getTimetableRows();

    let card = document.getElementById("taskProgressCard");

    if (!card) {
        const timetableCard =
            document.querySelector(".timetable-dashboard-card") ||
            document.getElementById("timetable")?.parentElement;

        if (!timetableCard) return;

        card = document.createElement("div");
        card.id = "taskProgressCard";
        card.className = "card dashboard-card";

        timetableCard.insertAdjacentElement("afterend", card);
    }

    if (rows.length === 0) {
        card.innerHTML = `
            <div class="card-header">
                <h2>📊 Task Progress</h2>
            </div>
            <p class="dashboard-empty">No tasks yet.</p>
        `;
        return;
    }

    let html = `
        <div class="card-header">
            <h2>📊 Task Progress</h2>
        </div>
    `;

    rows.forEach(row => {
        const textInputs = row.querySelectorAll('input[type="text"]');
        const numberInputs = row.querySelectorAll('input[type="number"]');

        const subject = textInputs[0]?.value || "Task";
        const goal = textInputs[1]?.value || "";

        const target = Number(numberInputs[0]?.value) || 0;
        const completed = Number(numberInputs[1]?.value) || 0;

        if (target <= 0) return;

        const percentage = Math.min(
            100,
            Math.round((completed / target) * 100)
        );

        html += `
            <div class="progress-item">
                <div class="progress-item-header">
                    <span class="progress-subject">
                        ${escapeHTML(subject)}
                        ${goal ? ` — ${escapeHTML(goal)}` : ""}
                    </span>

                    <span class="progress-percent">
                        ${completed}/${target} (${percentage}%)
</span>
                </div>

                <div class="progress-bar">
                    <div
                        class="progress-fill"
                        style="width:${percentage}%"
                    ></div>
                </div>
            </div>
        `;
    });

    card.innerHTML = html;
}


/* =========================================================
   SUBJECT PROGRESS
   ========================================================= */

function updateSubjectProgress() {
    const container = document.getElementById("subjectProgress");

    if (!container) return;

    const rows = getTimetableRows();

    const subjects = {};

    rows.forEach(row => {
        const textInputs = row.querySelectorAll('input[type="text"]');
        const numberInputs = row.querySelectorAll('input[type="number"]');

        const subject = textInputs[0]?.value?.trim();

        if (!subject) return;

        const target = Number(numberInputs[0]?.value) || 0;
        const completed = Number(numberInputs[1]?.value) || 0;

        if (!subjects[subject]) {
            subjects[subject] = {
                target: 0,
                completed: 0
            };
        }

        subjects[subject].target += target;
        subjects[subject].completed += completed;
    });

    const names = Object.keys(subjects);

    if (names.length === 0) {
        container.innerHTML = `
            <p class="dashboard-empty">
                Add subjects to see progress.
            </p>
        `;
        return;
    }

    container.innerHTML = names.map(subject => {
        const data = subjects[subject];

        const percentage = data.target > 0
            ? Math.min(
                100,
                Math.round(
                    (data.completed / data.target) * 100
                )
            )
            : 0;

        return `
            <div class="progress-item">
                <div class="progress-item-header">
                    <span class="progress-subject">
                        ${escapeHTML(subject)}
                    </span>

                    <span class="progress-percent">
                        ${percentage}%
                    </span>
                </div>

                <div class="progress-bar">
                    <div
                        class="progress-fill"
                        style="width:${percentage}%"
                    ></div>
                </div>
            </div>
        `;
    }).join("");
}


/* =========================================================
   WEAKNESS MAP
   ========================================================= */

function updateWeaknessMap() {
    const container = document.getElementById("weaknessMap");

    if (!container) return;

    const rows = getTimetableRows();

    const subjects = {};

    rows.forEach(row => {
        const textInputs = row.querySelectorAll('input[type="text"]');
        const numberInputs = row.querySelectorAll('input[type="number"]');

        const subject = textInputs[0]?.value?.trim();

        if (!subject) return;

        const target = Number(numberInputs[0]?.value) || 0;
        const completed = Number(numberInputs[1]?.value) || 0;

        if (!subjects[subject]) {
            subjects[subject] = {
                target: 0,
                completed: 0
            };
        }

        subjects[subject].target += target;
        subjects[subject].completed += completed;
    });

    const names = Object.keys(subjects);

    if (names.length === 0) {
        container.innerHTML = `
            <p class="dashboard-empty">
                No weakness data yet.
            </p>
        `;
        return;
    }

    container.innerHTML = names.map(subject => {
        const data = subjects[subject];

        const percentage = data.target > 0
            ? Math.min(
                100,
                Math.round(
                    (data.completed / data.target) * 100
                )
            )
            : 0;

        let status = "Weak";
        let className = "weak";

        if (percentage >= 80) {
            status = "Strong";
            className = "strong";
        } else if (percentage >= 50) {
            status = "Average";
            className = "average";
        }

        return `
            <div class="weakness-item ${className}">
                <span class="weakness-dot"></span>

                <div class="weakness-info">
                    <div class="weakness-subject">
                        ${escapeHTML(subject)}
                    </div>

                    <div class="weakness-status">
                        ${status}
                    </div>
                </div>

                <span class="weakness-percentage">
                    ${percentage}%
                </span>
            </div>
        `;
    }).join("");
}

/* =========================================================
   REVISION
   ========================================================= */

function updateRevisionList() {
    const container = document.getElementById("revisionList");

    if (!container) return;

    const rows = getTimetableRows();

    const revisionTasks = [];

    rows.forEach(row => {
        const textInputs = row.querySelectorAll('input[type="text"]');
        const numberInputs = row.querySelectorAll('input[type="number"]');

        const subject = textInputs[0]?.value?.trim();

        if (!subject) return;

        const target = Number(numberInputs[0]?.value) || 0;
        const completed = Number(numberInputs[1]?.value) || 0;

        if (target <= 0) return;

        const percentage = Math.round(
            (completed / target) * 100
        );

        if (percentage < 80) {
            revisionTasks.push({
                subject,
                percentage
            });
        }
    });

    if (revisionTasks.length === 0) {
        container.innerHTML = `
            <p class="dashboard-empty">
                🎉 Nothing needs revision right now.
            </p>
        `;
        return;
    }

    container.innerHTML = revisionTasks.map(task => {
        const urgent = task.percentage < 50;

        return `
            <div class="revision-item ${urgent ? "urgent" : "recommended"}">
                <span class="revision-indicator">
                    ${urgent ? "🔴" : "🟡"}
                </span>

                <div class="revision-info">
                    <div class="revision-subject">
                        ${escapeHTML(task.subject)}
                    </div>

                    <div class="revision-detail">
                        Current progress: ${task.percentage}%
                    </div>
                </div>

                <span class="revision-badge">
                    ${urgent ? "Weak" : "Revise"}
                </span>
            </div>
        `;
    }).join("");
}


/* =========================================================
   DAILY REPORT
   ========================================================= */

function renderDailyReport(report) {
    const container = document.getElementById("dailyReport");

    if (!container) return;

    const percentage = Math.max(
        0,
        Math.min(100, Number(report.percentage) || 0)
    );

    const missedTasks = Array.isArray(report.missedTasks)
        ? report.missedTasks
        : [];

    container.innerHTML = `
        <div class="daily-report-box">

            <div class="report-stat">
                <span class="report-label">Date</span>
                <span class="report-value">
                    ${formatDate(report.date)}
                </span>
            </div>

            <div class="report-stat">
                <span class="report-label">Completed</span>
                <span class="report-value">
                    ${report.completed}/${report.total}
                </span>
            </div>

            <div class="report-stat">
                <span class="report-label">Progress</span>
                <span class="report-value">
                    ${percentage}%
                </span>
            </div>

            <div class="report-progress">
                <div
                    class="report-progress-fill"
                    style="width:${percentage}%"
                ></div>
            </div>

            ${
                missedTasks.length > 0
                    ? `
                        <div class="report-message">
                            <strong>Missed / incomplete:</strong>
                            <ul>
                                ${missedTasks.map(task => `
                                    <li>
                                        ${escapeHTML(task)}
                                    </li>
                                `).join("")}
                            </ul>
                        </div>
                    `
                    : `
                        <div class="report-message">
                            🎉 All planned targets were completed!
                        </div>
                    `
            }

        </div>
    `;
}

function generateDailyReport() {
    const rows = getTimetableRows();

    let totalTarget = 0;
    let totalCompleted = 0;

    const missedTasks = [];

    rows.forEach(row => {
        const textInputs = row.querySelectorAll('input[type="text"]');
        const numberInputs = row.querySelectorAll('input[type="number"]');

        const subject =
            textInputs[0]?.value?.trim() || "Untitled";

        const goal =
            textInputs[1]?.value?.trim() || "Task";

        const target =
            Number(numberInputs[0]?.value) || 0;

        const completed =
            Number(numberInputs[1]?.value) || 0;

        totalTarget += target;

        const safeCompleted = Math.min(
            Math.max(completed, 0),
            target
        );

        totalCompleted += safeCompleted;

        if (target > 0 && completed < target) {
            missedTasks.push(
                `${subject} — ${goal} (${completed}/${target})`
            );
        }
    });

    const percentage = totalTarget > 0
        ? Math.round(
            (totalCompleted / totalTarget) * 100
        )
        : 0;

    const report = {
        date: getTodayKey(),
        completed: totalCompleted,
        total: totalTarget,
        percentage,
        missed: missedTasks.length,
        missedTasks
    };

    /* Save today's report */
    localStorage.setItem(
        "snowStudyDailyReport",
        JSON.stringify(report)
    );

    /* Save/update report history */
    saveReportToHistory(report);

    /* Save/update study history */
    saveStudyHistory(report);

    /* Show report immediately */
    renderDailyReport(report);

    /* Update everything dependent on report */
    updateStreak();
    updateStudyHistory();
    updateWeeklyStats();
    updateAchievements();

    /* Refresh missed-task recovery */
    recoverMissedTasks();

    console.log("Daily report generated:", report);

    const reportCard =
        document.getElementById("dailyReport")?.closest(".card");

    if (reportCard) {
        reportCard.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

function loadDailyReportAndStreak() {
    let report = null;

    try {
        report = JSON.parse(
            localStorage.getItem("snowStudyDailyReport")
        );
    } catch (error) {
        console.error("Could not load daily report:", error);
    }

    if (report) {
        renderDailyReport(report);
    }

    updateStreak();
}

function saveReportToHistory(report) {
    let history = [];

    try {
        history = JSON.parse(
            localStorage.getItem("snowStudyReportHistory")
        ) || [];
    } catch (error) {
        history = [];
    }

    const existingIndex = history.findIndex(
        item => item.date === report.date
    );

    if (existingIndex >= 0) {
        history[existingIndex] = report;
    } else {
        history.push(report);
    }

    history.sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
    );

    localStorage.setItem(
        "snowStudyReportHistory",
        JSON.stringify(history)
    );
}

function saveStudyHistory(report) {
    let history = [];

    try {
        history = JSON.parse(
            localStorage.getItem("snowStudyHistory")
        ) || [];
    } catch (error) {
        history = [];
    }

    const entry = {
        date: report.date,
        completed: report.completed,
        target: report.total,
        total: report.total,
        percentage: report.percentage
    };

    const existingIndex = history.findIndex(
        item => item.date === report.date
    );

    if (existingIndex >= 0) {
        history[existingIndex] = entry;
    } else {
        history.push(entry);
    }

    history.sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
    );

    localStorage.setItem(
        "snowStudyHistory",
        JSON.stringify(history)
    );
}


/* =========================================================
   STREAK
   ========================================================= */

function updateStreak() {
    const streakText =
        document.getElementById("streakText");

    let history = [];

    try {
        history = JSON.parse(
            localStorage.getItem("snowStudyReportHistory")
        ) || [];
    } catch (error) {
        history = [];
    }

    const today = getTodayKey();

    const successfulDays = new Set(
        history
            .filter(item =>
                item &&
                item.completed > 0 &&
                item.date
            )
            .map(item => item.date)
    );

    let streak = 0;

    if (successfulDays.has(today)) {
        streak = 1;

        let previousDate = parseDateKey(today);

        while (previousDate) {
            previousDate.setDate(
                previousDate.getDate() - 1
            );

            const key = getTodayKey(previousDate);

            if (!successfulDays.has(key)) {
                break;
            }

            streak++;
        }
    }

    localStorage.setItem(
        "studyStreak",
        String(streak)
    );

    if (streakText) {
        streakText.textContent =
            `Current streak: ${streak} day${streak === 1 ? "" : "s"} 🔥`;
    }

    const streakCard =
        document.getElementById("streakCard");

    if (streakCard && !streakText) {
        streakCard.textContent =
            `🔥 Streak: ${streak} day${streak === 1 ? "" : "s"}`;
    }
}

/* =========================================================
   MISSED TASKS
   ========================================================= */

function recoverMissedTasks() {
    const container =
        document.getElementById("missedTasks");

    if (!container) return;

    const rows = getTimetableRows();

    const missed = [];

    rows.forEach(row => {
        const textInputs = row.querySelectorAll('input[type="text"]');
        const numberInputs = row.querySelectorAll('input[type="number"]');

        const subject = textInputs[0]?.value?.trim();
        const goal = textInputs[1]?.value?.trim();

        const target = Number(numberInputs[0]?.value) || 0;
        const completed = Number(numberInputs[1]?.value) || 0;

        if (
            subject &&
            target > 0 &&
            completed < target
        ) {
            missed.push({
                subject,
                goal: goal || "Task",
                target,
                completed
            });
        }
    });

    if (missed.length === 0) {
        container.innerHTML = `
            <p class="dashboard-empty">
                🎉 No missed tasks.
            </p>
        `;
        return;
    }

    container.innerHTML = missed.map((task, index) => `
        <div class="missed-task-item">

            <div class="missed-task-icon">
                📌
            </div>

            <div class="missed-task-info">
                <div class="missed-task-name">
                    ${escapeHTML(task.subject)} —
                    ${escapeHTML(task.goal)}
                </div>

                <div>
                    ${task.completed}/${task.target}
                </div>
            </div>

            <button
                type="button"
                class="missed-task-action"
                onclick="addRecoveredTask(${index})"
            >
                Recover
            </button>

        </div>
    `).join("");

    container._missedTasks = missed;
}

function addRecoveredTask(index) {
    const container =
        document.getElementById("missedTasks");

    if (!container || !container._missedTasks) return;

    const task = container._missedTasks[index];

    if (!task) return;

    const timetable =
        document.getElementById("timetable");

    if (!timetable) return;

    const recoveredRow = createTimetableRow({
        start: "",
        end: "",
        subject: task.subject,
        goal: `Recovery: ${task.goal}`,
        target: task.target - task.completed,
        completed: 0,
        done: false
    });

    timetable.appendChild(recoveredRow);

    saveTimetable();
    refreshStudyViews();
}


/* =========================================================
   REMINDERS
   ========================================================= */

function checkNextReminder() {
    const reminderText =
        document.getElementById("reminderText");

    if (!reminderText) return;

    const rows = getTimetableRows();

    if (rows.length === 0) {
        reminderText.textContent =
            "No study sessions scheduled. 🗓️";
        return;
    }

    const now = new Date();

    const upcoming = [];

    rows.forEach(row => {
        const timeInputs =
            row.querySelectorAll('input[type="time"]');

        const textInputs =
            row.querySelectorAll('input[type="text"]');

        const checkbox =
            row.querySelector('input[type="checkbox"]');

        if (checkbox?.checked) return;

        const start = timeInputs[0]?.value;

        if (!start) return;

        const [hours, minutes] =
            start.split(":").map(Number);

        const sessionTime = new Date();
        sessionTime.setHours(hours, minutes, 0, 0);

        if (sessionTime > now) {
            upcoming.push({
                time: sessionTime,
                subject:
                    textInputs[0]?.value || "Study",
                goal:
                    textInputs[1]?.value || ""
            });
        }
    });

    upcoming.sort(
        (a, b) => a.time - b.time
    );

    if (upcoming.length === 0) {
        reminderText.textContent =
            "No more study sessions today. 🌙";
        return;
    }

    const next = upcoming[0];

    reminderText.innerHTML = `
        <strong>Next:</strong>
        ${escapeHTML(next.subject)}
        ${next.goal ? ` — ${escapeHTML(next.goal)}` : ""}
        <br>
        ⏰ ${next.time.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit"
        })}
    `;
}


/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

function updateAchievements() {
    const container =
        document.getElementById("achievementList");

    if (!container) return;

    const streak =
        Number(localStorage.getItem("studyStreak")) || 0;

    const focusCount =
        Number(localStorage.getItem("focusSessions")) || 0;

    let history = [];

    try {
        history = JSON.parse(
            localStorage.getItem("snowStudyReportHistory")
        ) || [];
    } catch (error) {
        history = [];
    }

    const achievements = [];

    if (history.length >= 1) {
        achievements.push({
            icon: "🌱",
            text: "First study day completed"
        });
    }

    if (streak >= 3) {
        achievements.push({
            icon: "🔥",
            text: "3-day study streak"
        });
    }

    if (streak >= 7) {
        achievements.push({
            icon: "🏆",
            text: "7-day study streak"
        });
    }

    if (focusCount >= 1) {
        achievements.push({
            icon: "⏱️",
            text: "First focus session completed"
        });
    }

    if (focusCount >= 5) {
        achievements.push({
            icon: "🎯",
            text: "5 focus sessions completed"
        });
    }

    if (achievements.length === 0) {
        container.innerHTML = `
            <p class="dashboard-empty">
                Complete your first study session to unlock achievements. ✨
            </p>
        `;
        return;
    }

    container.innerHTML = achievements.map(item => `
        <div class="achievement-item">
            <span class="achievement-icon">
                ${item.icon}
            </span>

            <span class="achievement-text">
                ${escapeHTML(item.text)}
            </span>
        </div>
    `).join("");
}


/* =========================================================
   STUDY HOURS
   ========================================================= */

let studySeconds =
    Number(localStorage.getItem("studySeconds")) || 0;

function updateStudyHours() {
    const hoursCard =
        document.getElementById("studyHoursCard");

    const todayStudyTime =
        document.getElementById("todayStudyTime");

    const totalMinutes =
        Math.floor(studySeconds / 60);

    const hours =
        Math.floor(totalMinutes / 60);

    const minutes =
        totalMinutes % 60;

    const formatted =
        `${hours}h ${minutes}m`;

    if (hoursCard) {
        hoursCard.textContent = formatted;
    }

    if (todayStudyTime) {
        todayStudyTime.textContent = formatted;
    }

    localStorage.setItem(
        "studySeconds",
        String(studySeconds)
    );
}


/* =========================================================
   FOCUS SESSION
   60 MIN FOCUS → 10 MIN BREAK
   ========================================================= */

let focusMode =
    localStorage.getItem("focusMode") || "focus";

let focusTime =
    Number(localStorage.getItem("focusTime"));

if (!Number.isFinite(focusTime) || focusTime <= 0) {
    focusTime =
        focusMode === "break"
            ? 10 * 60
            : 60 * 60;
}

let focusRunning = false;

let focusInterval = null;

let focusSessions =
    Number(localStorage.getItem("focusSessions")) || 0;


/* Start / pause focus */
function startFocus() {
    if (focusRunning) {
        pauseFocus();
        return;
    }

    focusRunning = true;

    focusInterval = setInterval(() => {

        if (focusMode === "focus") {
            studySeconds++;
        }

        focusTime--;

        updateFocusTimer();
        updateStudyHours();

        localStorage.setItem(
            "focusTime",
            String(focusTime)
        );

        localStorage.setItem(
            "focusMode",
            focusMode
        );

        if (focusTime <= 0) {
            finishFocusPhase();
        }

    }, 1000);

    updateFocusTimer();
}

function pauseFocus() {
    focusRunning = false;

    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
    }

    localStorage.setItem(
        "focusTime",
        String(focusTime)
    );

    localStorage.setItem(
        "focusMode",
        focusMode
    );
}

function resetFocus() {
    pauseFocus();

    focusMode = "focus";

    focusTime = 60 * 60;

    localStorage.setItem(
        "focusMode",
        focusMode
    );

    localStorage.setItem(
        "focusTime",
        String(focusTime)
    );

    updateFocusTimer();
}

function finishFocusPhase() {
    pauseFocus();

    if (focusMode === "focus") {

        focusSessions++;

        localStorage.setItem(
            "focusSessions",
            String(focusSessions)
        );

        /* 60-minute focus completed */
        focusMode = "break";
        focusTime = 10 * 60;

        alert(
            "🎉 60-minute focus completed!\n\n☕ Time for your 10-minute break."
        );

    } else {

        /* 10-minute break completed */
        focusMode = "focus";
        focusTime = 60 * 60;

        alert(
            "✨ Break finished!\n\n🧠 Ready for another 60-minute focus session?"
        );
    }

    localStorage.setItem(
        "focusMode",
        focusMode
    );

    localStorage.setItem(
        "focusTime",
        String(focusTime)
    );

    updateFocusTimer();
    updateAchievements();
}

function updateFocusTimer() {
    const timer =
        document.getElementById("focusTime");

    const modeLabel =
        document.getElementById("focusModeLabel");

    const sessionCount =
        document.getElementById("focusSessionsCount");

    if (timer) {
        const minutes =
            Math.floor(focusTime / 60);

        const seconds =
            focusTime % 60;

        timer.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    if (modeLabel) {
        modeLabel.textContent =
            focusMode === "focus"
                ? "🧠 Focus Time — 60 min"
                : "☕ Break Time — 10 min";
    }

    if (sessionCount) {
        sessionCount.textContent =
            String(focusSessions);
    }
}

/* =========================================================
   STUDY HISTORY
   ========================================================= */

function updateStudyHistory() {
    const container =
        document.getElementById("studyHistory");

    if (!container) return;

    let history = [];

    try {
        history = JSON.parse(
            localStorage.getItem("snowStudyHistory")
        ) || [];
    } catch (error) {
        history = [];
    }

    history = history
        .filter(item => item && item.date)
        .sort((a, b) =>
            String(b.date).localeCompare(
                String(a.date)
            )
        );

    if (history.length === 0) {
        container.innerHTML = `
            <p class="dashboard-empty">
                No study history yet.
            </p>
        `;
        return;
    }

    container.innerHTML = history
        .slice(0, 7)
        .map(day => `
            <div class="weekly-stat-item">

                <div class="weekly-stat-header">
                    <span class="weekly-day">
                        ${formatDate(day.date)}
                    </span>

                    <span class="weekly-value">
                        ${day.completed}/${day.total || day.target || 0}
                    </span>
                </div>

                <div class="weekly-bar">
                    <div
                        class="weekly-bar-fill"
                        style="width:${Math.min(
                            100,
                            Number(day.percentage) || 0
                        )}%"
                    ></div>
                </div>

            </div>
        `)
        .join("");
}


/* =========================================================
   WEEKLY STATS
   ========================================================= */

function updateWeeklyStats() {
    const container =
        document.getElementById("weeklyStats");

    if (!container) return;

    let history = [];

    try {
        history = JSON.parse(
            localStorage.getItem("snowStudyReportHistory")
        ) || [];
    } catch (error) {
        history = [];
    }

    const today = new Date();

    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);

        date.setDate(
            date.getDate() - i
        );

        const key = getTodayKey(date);

        const report = history.find(
            item => item.date === key
        );

        last7Days.push({
            date: key,
            completed: report?.completed || 0,
            total: report?.total || 0,
            percentage: report?.percentage || 0
        });
    }

    container.innerHTML = last7Days.map(day => {
        const date = parseDateKey(day.date);

        const label = date.toLocaleDateString(
            "en-IN",
            { weekday: "short" }
        );

        return `
            <div class="weekly-stat-item">

                <div class="weekly-stat-header">
                    <span class="weekly-day">
                        ${label}
                    </span>

                    <span class="weekly-value">
                        ${day.percentage}%
                    </span>
                </div>

                <div class="weekly-bar">
                    <div
                        class="weekly-bar-fill"
                        style="width:${day.percentage}%"
                    ></div>
                </div>

            </div>
        `;
    }).join("");
}


/* =========================================================
   REFRESH ALL STUDY VIEWS
   ========================================================= */

function refreshStudyViews() {
    saveTimetable();

    updateProgress();
    updateTaskProgress();
    updateSubjectProgress();
    updateWeaknessMap();
    updateRevisionList();
    recoverMissedTasks();
    checkNextReminder();
    updateAchievements();
    updateStudyHours();
    updateFocusTimer();
    updateStudyHistory();
    updateWeeklyStats();
}


/* =========================================================
   INPUT / CHECKBOX EVENTS
   ========================================================= */

function setupTimetableEvents() {
    const timetable =
        document.getElementById("timetable");

    if (!timetable) return;

    timetable.addEventListener("input", function () {
        saveTimetable();

        updateProgress();
        updateTaskProgress();
        updateSubjectProgress();
        updateWeaknessMap();
        updateRevisionList();
        recoverMissedTasks();
        checkNextReminder();
    });

    timetable.addEventListener("change", function () {
        saveTimetable();

        updateProgress();
        updateTaskProgress();
        updateSubjectProgress();
        updateWeaknessMap();
        updateRevisionList();
        recoverMissedTasks();
        checkNextReminder();
    });
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    updateCurrentDate();

    loadTimetable();

    setupTimetableEvents();

    updateProgress();

    updateTaskProgress();

    updateSubjectProgress();

    updateWeaknessMap();

    updateRevisionList();

    loadDailyReportAndStreak();

    recoverMissedTasks();

    checkNextReminder();

    updateStudyHours();

    updateFocusTimer();

    updateStudyHistory();

    updateWeeklyStats();

    updateAchievements();

    /* Reminder refresh every minute */
    setInterval(
        checkNextReminder,
        60000
    );

    console.log(
        "Snow Study initialized successfully ❄️"
    );
});
