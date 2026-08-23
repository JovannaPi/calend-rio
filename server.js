const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE = path.join(__dirname, "data", "calendars.json");
const PORT = process.env.PORT || 3000;

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

// Serializes writes so concurrent requests never clobber each other.
let writeChain = Promise.resolve();
function mutate(fn) {
  writeChain = writeChain.then(() => {
    const store = readStore();
    const result = fn(store);
    writeStore(store);
    return result;
  });
  return writeChain;
}

function shortId(len = 8) {
  return crypto.randomBytes(len).toString("base64url").slice(0, len);
}

const VALID_TYPES = new Set(["prova", "atividade", "trabalho", "outro"]);

function sanitizeEventInput(body = {}) {
  const title = String(body.title || "").trim().slice(0, 200);
  const date = String(body.date || "").trim();
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {
    title,
    date,
    type: VALID_TYPES.has(body.type) ? body.type : "outro",
    time: /^\d{2}:\d{2}$/.test(body.time || "") ? body.time : "",
    color: /^#[0-9a-fA-F]{6}$/.test(body.color || "") ? body.color : "",
    theme: String(body.theme || "").trim().slice(0, 200),
    team: String(body.team || "").trim().slice(0, 200),
    description: String(body.description || "").trim().slice(0, 2000),
  };
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/calendars", async (req, res) => {
  const id = shortId();
  const name = String(req.body?.name || "Meu calendário").trim().slice(0, 120);
  await mutate((store) => {
    store[id] = { name, createdAt: Date.now(), events: [] };
  });
  res.json({ id, name });
});

app.get("/api/calendars/:id", (req, res) => {
  const store = readStore();
  const cal = store[req.params.id];
  if (!cal) return res.status(404).json({ error: "not_found" });
  res.json({ id: req.params.id, name: cal.name, events: cal.events });
});

app.patch("/api/calendars/:id", async (req, res) => {
  const store = readStore();
  if (!store[req.params.id]) return res.status(404).json({ error: "not_found" });
  const name = String(req.body?.name || "").trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: "invalid_name" });
  await mutate((s) => {
    s[req.params.id].name = name;
  });
  res.json({ ok: true, name });
});

app.post("/api/calendars/:id/events", async (req, res) => {
  const store = readStore();
  if (!store[req.params.id]) return res.status(404).json({ error: "not_found" });
  const clean = sanitizeEventInput(req.body);
  if (!clean) return res.status(400).json({ error: "invalid_event" });
  const event = { id: crypto.randomUUID(), ...clean, updatedAt: Date.now() };
  await mutate((s) => {
    s[req.params.id].events.push(event);
  });
  res.json(event);
});

app.put("/api/calendars/:id/events/:eventId", async (req, res) => {
  const store = readStore();
  const cal = store[req.params.id];
  if (!cal) return res.status(404).json({ error: "not_found" });
  const idx = cal.events.findIndex((e) => e.id === req.params.eventId);
  if (idx === -1) return res.status(404).json({ error: "event_not_found" });
  const clean = sanitizeEventInput(req.body);
  if (!clean) return res.status(400).json({ error: "invalid_event" });
  const event = { id: req.params.eventId, ...clean, updatedAt: Date.now() };
  await mutate((s) => {
    const list = s[req.params.id].events;
    const i = list.findIndex((e) => e.id === req.params.eventId);
    if (i !== -1) list[i] = event;
  });
  res.json(event);
});

app.delete("/api/calendars/:id/events/:eventId", async (req, res) => {
  const store = readStore();
  const cal = store[req.params.id];
  if (!cal) return res.status(404).json({ error: "not_found" });
  await mutate((s) => {
    s[req.params.id].events = s[req.params.id].events.filter(
      (e) => e.id !== req.params.eventId
    );
  });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Calend.rio rodando em http://localhost:${PORT}`);
});
