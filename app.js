const STORE = "studysprint-v1";
const state = { tasks: [], focusSeconds: 0, filter: "all", theme: "light" };
let duration = 25 * 60;
let remaining = duration;
let timer = null;
let running = false;

const $ = (id) => document.getElementById(id);
const load = () => {
  try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; }
};
const saved = load();
state.tasks = Array.isArray(saved.tasks) ? saved.tasks : [];
state.focusSeconds = Number(saved.focusSeconds) || 0;
state.theme = saved.theme === "dark" ? "dark" : "light";
$("notesInput").value = typeof saved.notes === "string" ? saved.notes : "";
if (state.theme === "dark") document.body.classList.add("dark");

function persist() {
  localStorage.setItem(STORE, JSON.stringify({
    tasks: state.tasks,
    focusSeconds: state.focusSeconds,
    notes: $("notesInput").value,
    theme: state.theme
  }));
}
function dateText(date, options) { return new Intl.DateTimeFormat(undefined, options).format(date); }
const now = new Date();
$("todayLabel").textContent = dateText(now, {weekday:"short",month:"short",day:"numeric"});
$("taskDate").textContent = dateText(now, {month:"short",day:"numeric",year:"numeric"});
$("year").textContent = now.getFullYear();

function renderTasks() {
  const completed = state.tasks.filter(t => t.done).length;
  const remainingCount = state.tasks.length - completed;
  const percent = state.tasks.length ? Math.round(completed / state.tasks.length * 100) : 0;
  $("completedCount").textContent = completed;
  $("remainingCount").textContent = remainingCount;
  $("focusMinutes").textContent = Math.floor(state.focusSeconds / 60);
  $("progressPercent").textContent = percent + "%";
  $("progressBar").style.width = percent + "%";
  const shown = state.tasks.filter(t => state.filter === "all" || (state.filter === "done" ? t.done : !t.done));
  const list = $("taskList");
  list.replaceChildren();
  if (!shown.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.tasks.length ? "Nothing in this filter yet." : "No tasks yet. Add your first task above.";
    list.append(empty);
  }
  shown.forEach(task => {
    const item = document.createElement("div");
    item.className = "task-item" + (task.done ? " done" : "");
    const check = document.createElement("input");
    check.type = "checkbox"; check.className = "task-check"; check.checked = task.done;
    check.setAttribute("aria-label", "Mark " + task.title + " complete");
    check.addEventListener("change", () => { task.done = check.checked; persist(); renderTasks(); });
    const copy = document.createElement("div"); copy.className = "task-copy";
    const title = document.createElement("strong"); title.textContent = task.title;
    const subject = document.createElement("small"); subject.textContent = task.subject;
    copy.append(title, subject);
    const del = document.createElement("button"); del.className = "delete-task"; del.type = "button"; del.textContent = "×";
    del.setAttribute("aria-label", "Delete " + task.title);
    del.addEventListener("click", () => { state.tasks = state.tasks.filter(t => t.id !== task.id); persist(); renderTasks(); });
    item.append(check, copy, del); list.append(item);
  });
}
$("taskForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("taskInput").value.trim();
  if (!title) return;
  state.tasks.unshift({id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title, subject: $("subjectSelect").value, done:false});
  $("taskInput").value = ""; persist(); renderTasks(); $("taskInput").focus();
});
document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  state.filter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b === button));
  renderTasks();
}));

function renderTimer() {
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  $("timerDisplay").textContent = String(mins).padStart(2,"0") + ":" + String(secs).padStart(2,"0");
  $("timerStatus").textContent = running ? "STAY IN THE FLOW" : remaining === 0 ? "SESSION COMPLETE" : "READY TO FOCUS";
  $("timerStart").textContent = running ? "Pause session" : remaining === 0 ? "Start again" : "Start focus";
  const circumference = 2 * Math.PI * 96;
  $("timerProgress").style.strokeDasharray = circumference;
  $("timerProgress").style.strokeDashoffset = circumference * (1 - remaining / duration);
}
function stopTimer() { if (timer) clearInterval(timer); timer = null; running = false; }
function tick() {
  if (remaining > 0) remaining--;
  if (remaining === 0) {
    stopTimer(); state.focusSeconds += duration; persist();
    $("timerStatus").textContent = "SESSION COMPLETE";
    $("timerStart").textContent = "Start again";
    renderTasks();
    if ("Notification" in window && Notification.permission === "granted") new Notification("StudySprint", {body:"Your focus session is complete. Take a short break."});
  }
  renderTimer();
}
$("timerStart").addEventListener("click", () => {
  if (running) { stopTimer(); renderTimer(); return; }
  if (remaining === 0) remaining = duration;
  running = true; renderTimer(); timer = setInterval(tick, 1000);
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(()=>{});
});
$("timerReset").addEventListener("click", () => { stopTimer(); remaining = duration; renderTimer(); });
document.querySelectorAll(".preset").forEach(button => button.addEventListener("click", () => {
  stopTimer(); duration = Number(button.dataset.minutes) * 60; remaining = duration;
  document.querySelectorAll(".preset").forEach(b => b.classList.toggle("selected", b === button));
  renderTimer();
}));
$("notesInput").addEventListener("input", () => { persist(); $("savedLabel").textContent = "Saved just now"; });
$("themeToggle").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  document.body.classList.toggle("dark", state.theme === "dark"); persist();
});
renderTasks(); renderTimer();