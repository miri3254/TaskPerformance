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
const fetchedTotal = document.querySelector("#fetchedTotal");

const serverTime = document.querySelector("#serverTime");
const requestTime = document.querySelector("#requestTime");
const renderTime = document.querySelector("#renderTime");

const statusLabels = {
    Pending: "ממתינה",
    InProgress: "בטיפול"
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

function prepareTask(task) {
    const statusLabel = statusLabels[task.status] ?? task.status;
    const priorityLabel = priorityLabels[task.priority] ?? task.priority;
    const escapedTitle = escapeHtml(task.title);

    return {
        ...task,
        searchText: `${task.taskID} ${task.title}`.toLowerCase(),
        rowHtml: `
            <tr class="task-row">
                <td><span class="task-id">${task.taskID}</span></td>
                <td><span class="task-title">${escapedTitle}</span></td>
                <td><span class="badge badge-${task.status.toLowerCase()}">${statusLabel}</span></td>
                <td><span class="priority-chip priority-${task.priority.toLowerCase()}">${priorityLabel}</span></td>
            </tr>
        `
    };
}

function getFilteredTasks() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedPriority = priorityFilter.value;

    const filtered = allTasks.filter(task => {
        const matchesQuery = !query || task.searchText.includes(query);
        const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;
        const matchesPriority = selectedPriority === "all" || task.priority === selectedPriority;

        return matchesQuery && matchesStatus && matchesPriority;
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
    return height > 0
        ? `<tr class="spacer-row"><td colspan="4" style="height:${height}px"></td></tr>`
        : "";
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
        fetchedTotal.textContent = data.count.toLocaleString();
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

loadTasks();
