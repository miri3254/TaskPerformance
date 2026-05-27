const refreshButton = document.querySelector("#refreshButton");
const clearFiltersButton = document.querySelector("#clearFiltersButton");
const clearSearchButton = document.querySelector("#clearSearchButton");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const priorityFilter = document.querySelector("#priorityFilter");
const sortSelect = document.querySelector("#sortSelect");

const tableWrap = document.querySelector(".table-wrap");
const tasksBody = document.querySelector("#tasksBody");
const statusMessage = document.querySelector("#statusMessage");
const filteredCount = document.querySelector("#filteredCount");

const serverTime = document.querySelector("#serverTime");
const requestTime = document.querySelector("#requestTime");
const renderTime = document.querySelector("#renderTime");

const statusLabels = {
    Pending: "ממתינה",
    InProgress: "בטיפול",
    Completed: "הושלמה"
};

const priorityLabels = {
    Low: "נמוכה",
    Medium: "בינונית",
    High: "גבוהה"
};

const priorityRank = {
    Low: 1,
    Medium: 2,
    High: 3
};

const rowHeight = 48;
const rowBuffer = 14;

let allTasks = [];
let visibleTasks = [];
let lastServerTimeMs = 0;
let lastRequestMs = 0;
let filterFrameId = 0;
let scrollFrameId = 0;

function formatMs(value) {
    return `${Math.round(value)} ms`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function option(value, currentValue, label) {
    return `<option value="${value}"${value === currentValue ? " selected" : ""}>${label}</option>`;
}

function createRowHtml(task) {
    return `
        <tr class="task-row" data-task-id="${task.taskID}">
            <td><span class="task-id">${task.taskID}</span></td>
            <td><span class="task-title">${escapeHtml(task.title)}</span></td>
            <td>
                <select class="row-select status-editor status-${task.status.toLowerCase()}" data-field="status" aria-label="שינוי סטטוס למשימה ${task.taskID}">
                    ${option("Pending", task.status, statusLabels.Pending)}
                    ${option("InProgress", task.status, statusLabels.InProgress)}
                    ${option("Completed", task.status, statusLabels.Completed)}
                </select>
            </td>
            <td>
                <select class="row-select priority-editor priority-${task.priority.toLowerCase()}" data-field="priority" aria-label="שינוי עדיפות למשימה ${task.taskID}">
                    ${option("Low", task.priority, priorityLabels.Low)}
                    ${option("Medium", task.priority, priorityLabels.Medium)}
                    ${option("High", task.priority, priorityLabels.High)}
                </select>
            </td>
        </tr>
    `;
}

function prepareTask(task) {
    return {
        ...task,
        searchText: `${task.taskID} ${task.title}`.toLowerCase(),
        rowHtml: createRowHtml(task)
    };
}

function getFilteredTasks() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedPriority = priorityFilter.value;

    const filtered = allTasks.filter(task => {
        const isOpen = task.status === "Pending" || task.status === "InProgress";
        const matchesQuery = !query || task.searchText.includes(query);
        const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;
        const matchesPriority = selectedPriority === "all" || task.priority === selectedPriority;

        return isOpen && matchesQuery && matchesStatus && matchesPriority;
    });

    return filtered.sort((a, b) => {
        switch (sortSelect.value) {
            case "taskIdDesc":
                return b.taskID - a.taskID;
            case "priorityDesc":
                return priorityRank[b.priority] - priorityRank[a.priority] || a.taskID - b.taskID;
            case "priorityAsc":
                return priorityRank[a.priority] - priorityRank[b.priority] || a.taskID - b.taskID;
            case "titleAsc":
                return a.title.localeCompare(b.title, "he") || a.taskID - b.taskID;
            case "taskIdAsc":
            default:
                return a.taskID - b.taskID;
        }
    });
}

function spacerRow(height) {
    if (height <= 0) {
        return "";
    }

    return `<tr class="spacer-row"><td colspan="4" style="height:${height}px"></td></tr>`;
}

function renderVisibleRows() {
    if (visibleTasks.length === 0) {
        tasksBody.innerHTML = '<tr class="state-row"><td colspan="4"><span class="state-msg">לא נמצאו משימות תואמות לסינון</span></td></tr>';
        return;
    }

    const scrollTop = tableWrap.scrollTop;
    const viewportRows = Math.ceil(tableWrap.clientHeight / rowHeight);
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - rowBuffer);
    const end = Math.min(visibleTasks.length, start + viewportRows + rowBuffer * 2);
    const topHeight = start * rowHeight;
    const bottomHeight = (visibleTasks.length - end) * rowHeight;
    const rows = visibleTasks.slice(start, end).map(task => task.rowHtml).join("");

    tasksBody.innerHTML = `${spacerRow(topHeight)}${rows}${spacerRow(bottomHeight)}`;
}

function renderTasks(tasks) {
    visibleTasks = tasks;
    tableWrap.scrollTop = 0;
    renderVisibleRows();
}

function applyFilters() {
    const renderStarted = performance.now();
    const filteredTasks = getFilteredTasks();
    renderTasks(filteredTasks);
    const renderFinished = performance.now();

    filteredCount.textContent = `${filteredTasks.length.toLocaleString()} תוצאות`;
    renderTime.textContent = formatMs(renderFinished - renderStarted);
    serverTime.textContent = formatMs(lastServerTimeMs);
    requestTime.textContent = formatMs(lastRequestMs);
    statusMessage.textContent = "";
    clearSearchButton.hidden = searchInput.value.trim() === "";
}

function scheduleApplyFilters() {
    cancelAnimationFrame(filterFrameId);
    filterFrameId = requestAnimationFrame(applyFilters);
}

function scheduleVisibleRows() {
    cancelAnimationFrame(scrollFrameId);
    scrollFrameId = requestAnimationFrame(renderVisibleRows);
}

async function updateTask(taskId, updates) {
    const task = allTasks.find(item => item.taskID === taskId);

    if (!task) {
        return;
    }

    const previousTask = { ...task };
    const nextTask = prepareTask({ ...task, ...updates });
    const taskIndex = allTasks.findIndex(item => item.taskID === taskId);

    allTasks[taskIndex] = nextTask;
    applyFilters();

    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: "PUT",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                status: nextTask.status,
                priority: nextTask.priority
            })
        });

        if (!response.ok) {
            throw new Error("שמירת השינוי נכשלה.");
        }

        if (nextTask.status === "Completed") {
            allTasks = allTasks.filter(item => item.taskID !== taskId);
            applyFilters();
        }
    } catch (error) {
        allTasks[taskIndex] = prepareTask(previousTask);
        statusMessage.textContent = error.message;
        applyFilters();
    }
}

async function loadTasks() {
    refreshButton.disabled = true;
    statusMessage.textContent = "טוען משימות...";

    try {
        const requestStarted = performance.now();
        const response = await fetch("/api/tasks", {
            headers: {
                Accept: "application/json"
            }
        });
        const data = await response.json();
        const requestFinished = performance.now();

        if (!response.ok) {
            throw new Error(data.title || "לא ניתן לטעון את המשימות.");
        }

        allTasks = data.tasks.map(prepareTask);
        lastServerTimeMs = data.serverTimeMs;
        lastRequestMs = requestFinished - requestStarted;
        applyFilters();
    } catch (error) {
        statusMessage.textContent = error.message;
    } finally {
        refreshButton.disabled = false;
    }
}

function clearFilters() {
    searchInput.value = "";
    statusFilter.value = "all";
    priorityFilter.value = "all";
    sortSelect.value = "taskIdAsc";
    applyFilters();
}

function clearSearch() {
    searchInput.value = "";
    searchInput.focus();
    applyFilters();
}

refreshButton.addEventListener("click", loadTasks);
clearFiltersButton.addEventListener("click", clearFilters);
clearSearchButton.addEventListener("click", clearSearch);
searchInput.addEventListener("input", scheduleApplyFilters);
statusFilter.addEventListener("change", scheduleApplyFilters);
priorityFilter.addEventListener("change", scheduleApplyFilters);
sortSelect.addEventListener("change", scheduleApplyFilters);
tableWrap.addEventListener("scroll", scheduleVisibleRows, { passive: true });
tasksBody.addEventListener("change", event => {
    const editor = event.target.closest(".row-select");

    if (!editor) {
        return;
    }

    const row = editor.closest("[data-task-id]");
    const taskId = Number(row.dataset.taskId);
    const field = editor.dataset.field;

    updateTask(taskId, {
        [field]: editor.value
    });
});

loadTasks();
