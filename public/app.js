import { db } from "./firebase-config.js";
import { onAuth } from "./auth.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const TYPE_COLORS = {
  prova: "#ef476f",
  atividade: "#4d8cff",
  trabalho: "#06b6a4",
  outro: "#a78bfa",
};

const TYPE_LABELS = {
  prova: "Prova",
  atividade: "Atividade",
  trabalho: "Trabalho",
  outro: "Outro",
};

let events = [];
let currentDate = new Date();
let selectedDateStr = null;
let started = false;

const monthLabel = document.getElementById("monthLabel");
const calendarGrid = document.getElementById("calendarGrid");
const eventList = document.getElementById("eventList");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const upcomingList = document.getElementById("upcomingList");
const overviewEvents = document.getElementById("overviewEvents");

const modal = document.getElementById("eventModal");
const eventForm = document.getElementById("eventForm");
const modalTitle = document.getElementById("modalTitle");
const deleteBtn = document.getElementById("deleteEventBtn");

const toast = document.getElementById("toast");

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2200);
}

const eventsRef = collection(db, "events");

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function activeTypes() {
  return Array.from(document.querySelectorAll(".type-filter"))
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
}

function eventsForDate(dateStr) {
  const active = activeTypes();
  return events
    .filter((e) => e.date === dateStr && active.includes(e.type))
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  monthLabel.textContent = currentDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const todayStr = toDateStr(new Date());
  const active = activeTypes();

  calendarGrid.innerHTML = "";
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const cellStr = toDateStr(cellDate);
    const isOutside = cellDate.getMonth() !== month;

    const cell = document.createElement("div");
    cell.className = "day-cell";
    if (isOutside) cell.classList.add("outside");
    if (cellStr === todayStr) cell.classList.add("today");
    if (cellStr === selectedDateStr) cell.classList.add("selected");

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = cellDate.getDate();
    cell.appendChild(num);

    const dayEvents = events
      .filter((e) => e.date === cellStr && active.includes(e.type))
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    dayEvents.slice(0, 2).forEach((ev) => {
      const dot = document.createElement("div");
      dot.className = "day-event-dot";
      dot.style.background = ev.color || TYPE_COLORS[ev.type];
      dot.textContent = ev.title;
      cell.appendChild(dot);
    });
    if (dayEvents.length > 2) {
      const more = document.createElement("div");
      more.className = "day-more";
      more.textContent = `+${dayEvents.length - 2} mais`;
      cell.appendChild(more);
    }

    cell.addEventListener("click", () => selectDate(cellStr));
    calendarGrid.appendChild(cell);
  }
}

function selectDate(dateStr) {
  selectedDateStr = dateStr;
  const d = new Date(dateStr + "T00:00:00");
  const inCurrentMonth =
    d.getFullYear() === currentDate.getFullYear() &&
    d.getMonth() === currentDate.getMonth();
  if (!inCurrentMonth) {
    currentDate = new Date(d.getFullYear(), d.getMonth(), 1);
  }
  renderCalendar();
  renderEventList();
}

function renderEventList() {
  if (!selectedDateStr) {
    selectedDateLabel.textContent = "Selecione um dia";
    eventList.innerHTML =
      '<p class="empty-hint">Clique em um dia no calendário para ver os detalhes.</p>';
    return;
  }
  const d = new Date(selectedDateStr + "T00:00:00");
  selectedDateLabel.textContent = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const dayEvents = eventsForDate(selectedDateStr);
  if (dayEvents.length === 0) {
    eventList.innerHTML =
      '<p class="empty-hint">Nenhuma atividade neste dia.</p>';
    return;
  }

  eventList.innerHTML = "";
  dayEvents.forEach((ev) => eventList.appendChild(buildEventCard(ev)));
}

function buildEventCard(ev) {
  const card = document.createElement("div");
  card.className = "event-card";
  card.style.borderLeftColor = ev.color || TYPE_COLORS[ev.type];

  const title = document.createElement("div");
  title.className = "event-title";
  title.textContent = ev.title;
  card.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "event-meta";
  const tag = document.createElement("span");
  tag.className = "event-type-tag";
  tag.style.background = ev.color || TYPE_COLORS[ev.type];
  tag.textContent = TYPE_LABELS[ev.type] || ev.type;
  meta.appendChild(tag);

  const parts = [];
  if (ev.time) parts.push(ev.time);
  if (ev.theme) parts.push(ev.theme);
  if (ev.team) parts.push(ev.team);
  meta.appendChild(document.createTextNode(parts.join("  ·  ")));
  card.appendChild(meta);

  if (ev.description) {
    const desc = document.createElement("div");
    desc.className = "event-meta";
    desc.textContent = ev.description;
    card.appendChild(desc);
  }

  card.addEventListener("click", () => openModal(ev));
  return card;
}

function renderUpcoming() {
  const todayStr = toDateStr(new Date());
  const active = activeTypes();
  const upcoming = events
    .filter((e) => e.date >= todayStr && active.includes(e.type))
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))
    .slice(0, 6);

  upcomingList.innerHTML = "";
  if (upcoming.length === 0) {
    upcomingList.innerHTML = '<p class="empty-hint">Nada por aqui ainda.</p>';
    return;
  }
  upcoming.forEach((ev) => {
    const card = buildEventCard(ev);
    const dateTag = document.createElement("div");
    dateTag.className = "event-meta";
    const d = new Date(ev.date + "T00:00:00");
    dateTag.textContent = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    card.insertBefore(dateTag, card.firstChild);
    upcomingList.appendChild(card);
  });
}

function renderOverview() {
  const todayStr = toDateStr(new Date());
  const upcoming = events
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))
    .slice(0, 3);

  overviewEvents.innerHTML = "";
  if (upcoming.length === 0) {
    overviewEvents.innerHTML = '<p class="empty-hint">Nada por aqui ainda.</p>';
    return;
  }
  upcoming.forEach((ev) => overviewEvents.appendChild(buildEventCard(ev)));
}

function renderAll() {
  renderCalendar();
  renderEventList();
  renderUpcoming();
  renderOverview();
}

function openModal(ev) {
  modalTitle.textContent = ev ? "Editar atividade" : "Nova atividade";
  document.getElementById("eventId").value = ev ? ev.id : "";
  document.getElementById("eventTitleInput").value = ev ? ev.title : "";
  document.getElementById("eventType").value = ev ? ev.type : "prova";
  document.getElementById("eventDate").value = ev ? ev.date : selectedDateStr || toDateStr(new Date());
  document.getElementById("eventTime").value = ev ? ev.time || "" : "";
  document.getElementById("eventColor").value = ev ? ev.color || TYPE_COLORS[ev.type] : TYPE_COLORS.prova;
  document.getElementById("eventTheme").value = ev ? ev.theme || "" : "";
  document.getElementById("eventTeam").value = ev ? ev.team || "" : "";
  document.getElementById("eventDescription").value = ev ? ev.description || "" : "";
  deleteBtn.classList.toggle("hidden", !ev);
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  eventForm.reset();
}

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("eventId").value;
  const payload = {
    title: document.getElementById("eventTitleInput").value.trim(),
    type: document.getElementById("eventType").value,
    date: document.getElementById("eventDate").value,
    time: document.getElementById("eventTime").value,
    color: document.getElementById("eventColor").value,
    theme: document.getElementById("eventTheme").value.trim(),
    team: document.getElementById("eventTeam").value.trim(),
    description: document.getElementById("eventDescription").value.trim(),
    updatedAt: Date.now(),
  };

  if (!payload.title || !payload.date) return;

  try {
    if (id) {
      await updateDoc(doc(db, "events", id), payload);
    } else {
      await addDoc(eventsRef, payload);
    }
    selectedDateStr = payload.date;
    closeModal();
  } catch {
    showToast("Não foi possível salvar. Tente novamente.");
  }
});

deleteBtn.addEventListener("click", async () => {
  const id = document.getElementById("eventId").value;
  if (!id) return;
  try {
    await deleteDoc(doc(db, "events", id));
    closeModal();
  } catch {
    showToast("Não foi possível excluir. Tente novamente.");
  }
});

document.getElementById("addEventBtn").addEventListener("click", () => openModal(null));
document.getElementById("closeModal").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

document.getElementById("prevMonth").addEventListener("click", () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  renderCalendar();
});

document.querySelectorAll(".type-filter").forEach((cb) => {
  cb.addEventListener("change", renderAll);
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  selectedDateStr = toDateStr(new Date());
  onSnapshot(eventsRef, (snap) => {
    events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  });
});
