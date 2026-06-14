const STORAGE_KEY = "habit-loop-journal.entries";

const fields = {
  trigger: document.querySelector("#triggerInput"),
  behavior: document.querySelector("#behaviorInput"),
  result: document.querySelector("#resultInput"),
};

const form = document.querySelector("#loopForm");
const submitButton = document.querySelector("#submitButton");
const newEntryButton = document.querySelector("#newEntryButton");
const backButton = document.querySelector("#backButton");
const entryList = document.querySelector("#entryList");
const searchInput = document.querySelector("#searchInput");
const reviewCount = document.querySelector("#reviewCount");
const exportButton = document.querySelector("#exportButton");
const deleteDialog = document.querySelector("#deleteDialog");
const deleteSummary = document.querySelector("#deleteSummary");
const confirmDeleteButton = document.querySelector("#confirmDeleteButton");
const cancelDeleteButton = document.querySelector("#cancelDeleteButton");
const appScreen = document.querySelector(".app-screen");
const screenEyebrow = document.querySelector("#screenEyebrow");
const screenTitle = document.querySelector("#screenTitle");
const views = {
  record: document.querySelector("#recordView"),
  review: document.querySelector("#reviewView"),
};

let entries = loadEntries();
let selectedId = entries[0]?.id ?? null;
let editingId = null;
let pendingDeleteId = null;
let activeView = "review";

render();
syncSubmitState();

Object.values(fields).forEach((field) => {
  field.addEventListener("input", syncSubmitState);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const draft = getDraft();
  if (!hasDraft(draft)) return;

  if (editingId) {
    entries = entries.map((entry) =>
      entry.id === editingId
        ? {
            ...entry,
            trigger: draft.trigger,
            behavior: draft.behavior,
            result: draft.result,
          }
        : entry,
    );
    selectedId = editingId;
    editingId = null;
    submitButton.textContent = "加入紀錄";
  } else {
    const entry = {
      id: crypto.randomUUID(),
      ...draft,
      createdAt: formatDate(),
    };
    entries = [entry, ...entries];
    selectedId = entry.id;
  }

  clearDraft();
  saveEntries();
  render();
  switchView("review");
});

newEntryButton.addEventListener("click", () => {
  editingId = null;
  submitButton.textContent = "加入紀錄";
  clearDraft();
  switchView("record");
});

backButton.addEventListener("click", () => {
  editingId = null;
  submitButton.textContent = "加入紀錄";
  clearDraft();
  switchView("review");
});

searchInput.addEventListener("input", render);

exportButton.addEventListener("click", exportEntries);

cancelDeleteButton.addEventListener("click", closeDeleteDialog);

deleteDialog.addEventListener("click", (event) => {
  if (event.target === deleteDialog) closeDeleteDialog();
});

confirmDeleteButton.addEventListener("click", () => {
  if (!pendingDeleteId) return;

  entries = entries.filter((item) => item.id !== pendingDeleteId);
  if (selectedId === pendingDeleteId) selectedId = entries[0]?.id ?? null;
  if (editingId === pendingDeleteId) {
    editingId = null;
    submitButton.textContent = "加入紀錄";
    clearDraft();
  }

  pendingDeleteId = null;
  closeDeleteDialog();
  saveEntries();
  render();
});

entryList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const card = button.closest("[data-entry-id]");
  const id = card?.dataset.entryId;
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;

  if (button.dataset.action === "select") {
    selectedId = id;
  }

  if (button.dataset.action === "edit") {
    editingId = id;
    fields.trigger.value = entry.trigger;
    fields.behavior.value = entry.behavior;
    fields.result.value = entry.result;
    selectedId = id;
    submitButton.textContent = "更新紀錄";
    syncSubmitState();
    switchView("record");
    fields.trigger.focus();
  }

  if (button.dataset.action === "delete") {
    openDeleteDialog(entry);
  }

  render();
});

function switchView(viewName) {
  activeView = viewName;
  Object.entries(views).forEach(([name, view]) => {
    view.classList.toggle("is-active", name === activeView);
  });
  appScreen.classList.toggle("is-record", activeView === "record");
  appScreen.classList.toggle("is-review", activeView === "review");
  backButton.hidden = activeView !== "record";
  document.querySelector(".title-block").hidden = false;
  screenEyebrow.textContent = activeView === "record" ? "New loop" : "Loop Journal";
  screenTitle.textContent = activeView === "record" ? "新增迴圈" : "習慣迴圈";
}

function openDeleteDialog(entry) {
  pendingDeleteId = entry.id;
  deleteSummary.textContent = `「${entry.trigger || "未命名觸發點"}」會從這台裝置移除。`;
  deleteDialog.hidden = false;
  confirmDeleteButton.focus();
}

function closeDeleteDialog() {
  pendingDeleteId = null;
  deleteDialog.hidden = true;
}

function getDraft() {
  return {
    trigger: fields.trigger.value.trim(),
    behavior: fields.behavior.value.trim(),
    result: fields.result.value.trim(),
  };
}

function hasDraft(draft) {
  return Boolean(draft.trigger || draft.behavior || draft.result);
}

function syncSubmitState() {
  submitButton.disabled = !hasDraft(getDraft());
}

function clearDraft() {
  fields.trigger.value = "";
  fields.behavior.value = "";
  fields.result.value = "";
  syncSubmitState();
}

function loadEntries() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function exportEntries() {
  if (entries.length === 0) return;

  const exportedAt = new Date();
  const payload = {
    app: "habit-loop-journal",
    version: 1,
    exportedAt: exportedAt.toISOString(),
    entries,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = exportedAt.toISOString().slice(0, 10);

  link.href = url;
  link.download = `habit-loop-journal-${dateStamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatDate() {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function render() {
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? entries[0];

  const keyword = searchInput.value.trim().toLowerCase();
  const filteredEntries = keyword
    ? entries.filter((entry) =>
        [entry.trigger, entry.behavior, entry.result, entry.createdAt]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
      )
    : entries;

  reviewCount.textContent = keyword
    ? `${filteredEntries.length} / ${entries.length} 筆`
    : `${entries.length} 筆紀錄`;
  exportButton.disabled = entries.length === 0;

  if (entries.length === 0) {
    entryList.innerHTML = `
      <section class="empty-state">
        <p>還沒有紀錄</p>
        <strong>先寫下一個小迴圈。</strong>
      </section>
    `;
    return;
  }

  if (filteredEntries.length === 0) {
    entryList.innerHTML = `
      <section class="empty-state">
        <p>找不到符合的紀錄</p>
        <strong>換個關鍵字試試。</strong>
      </section>
    `;
    return;
  }

  entryList.innerHTML = filteredEntries
    .map((entry) => {
      const selectedClass = entry.id === selectedEntry?.id ? " is-selected" : "";
      return `
        <article class="entry-card${selectedClass}" data-entry-id="${escapeHtml(entry.id)}">
          <button type="button" class="entry-main" data-action="select">
            <span>${escapeHtml(entry.createdAt)}</span>
            <strong>${escapeHtml(entry.trigger || "未命名觸發點")}</strong>
            <small><b>行為</b>${escapeHtml(entry.behavior || "尚未填寫")}</small>
            <em><b>結果</b>${escapeHtml(entry.result || "尚未填寫")}</em>
          </button>
          <div class="entry-actions">
            <button type="button" data-action="edit">編輯</button>
            <button type="button" data-action="delete">刪除</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
