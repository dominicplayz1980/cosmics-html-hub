const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
// Defaults make the starter project usable immediately.
// Set environment variables on your host to override these before public deployment.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "domthegoat";
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

const ROOT = __dirname;
const UPLOAD_DIR = path.join(ROOT, "uploads");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "files.json");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, "[]", "utf8");

app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(session({
  name: "cosmics.owner",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 2 * 60 * 60 * 1000
  }
}));

function readFiles() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8")); }
  catch { return []; }
}
function writeFiles(files) {
  fs.writeFileSync(DB_PATH, JSON.stringify(files, null, 2), "utf8");
}
function requireOwner(req, res, next) {
  if (req.session && req.session.owner === true) return next();
  return res.status(401).json({ error: "Owner login required." });
}
function safeOriginalName(name) {
  return path.basename(name).replace(/[^\w .()\-]/g, "_").slice(0, 120) || "download.html";
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => cb(null, crypto.randomUUID() + ".html")
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extOk = path.extname(file.originalname).toLowerCase() === ".html" ||
                  path.extname(file.originalname).toLowerCase() === ".htm";
    if (!extOk) return cb(new Error("Only .html or .htm files are allowed."));
    cb(null, true);
  }
});

app.get("/api/files", (_req, res) => {
  const items = readFiles().map(({ id, name, size, uploadedAt }) => ({ id, name, size, uploadedAt }));
  res.json(items);
});

app.post("/api/login", (req, res) => {
  if (!safeEqual(req.body.password || "", ADMIN_PASSWORD)) {
    return res.status(401).json({ error: "Wrong password." });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Could not start owner session." });
    req.session.owner = true;
    res.json({ ok: true });
  });
});

app.post("/api/logout", requireOwner, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => res.json({ owner: !!(req.session && req.session.owner) }));

app.post("/api/upload", requireOwner, (req, res) => {
  upload.single("htmlFile")(req, res, err => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed." });
    if (!req.file) return res.status(400).json({ error: "Choose an HTML file first." });
    const item = {
      id: path.basename(req.file.filename, ".html"),
      name: safeOriginalName(req.file.originalname).replace(/\.htm$/i, ".html"),
      diskName: req.file.filename,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };
    const files = readFiles();
    files.unshift(item);
    writeFiles(files);
    res.json({ ok: true, file: { id: item.id, name: item.name, size: item.size, uploadedAt: item.uploadedAt } });
  });
});

app.delete("/api/files/:id", requireOwner, (req, res) => {
  const files = readFiles();
  const item = files.find(f => f.id === req.params.id);
  if (!item) return res.status(404).json({ error: "File not found." });
  try { fs.unlinkSync(path.join(UPLOAD_DIR, item.diskName)); } catch {}
  writeFiles(files.filter(f => f.id !== item.id));
  res.json({ ok: true });
});

// Force download. Uploaded HTML is never rendered on this site's origin.
app.get("/download/:id", (req, res) => {
  const item = readFiles().find(f => f.id === req.params.id);
  if (!item) return res.status(404).send("File not found.");
  const filePath = path.join(UPLOAD_DIR, path.basename(item.diskName));
  if (!fs.existsSync(filePath)) return res.status(404).send("File is missing.");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.download(filePath, item.name, err => {
    if (err && !res.headersSent) res.status(500).send("Could not download this file.");
  });
});

app.use(express.static(path.join(ROOT, "public")));
app.get("/admin", (_req, res) => res.sendFile(path.join(ROOT, "public", "admin.html")));
app.get("*", (_req, res) => res.sendFile(path.join(ROOT, "public", "index.html")));

app.listen(PORT, () => console.log(`Cosmics HTML Hub running on port ${PORT}`));
