require("dotenv").config();

const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// ─── Sécurité headers ──────────────────────────────
app.use(helmet());

// ─── CORS ──────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ─── Rate limiting global ──────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Trop de requêtes, réessayez dans 15 minutes." }
}));

// ─── Rate limiting auth (anti brute-force) ─────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Trop de tentatives. Réessayez dans 15 minutes." }
});

// ─── JSON parser ───────────────────────────────────
app.use(express.json({ limit: "10kb" }));

// ─── MongoDB ───────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch(err => {
    console.error("❌ Erreur MongoDB :", err.message);
    process.exit(1);
  });

// ─── Routes ────────────────────────────────────────
const { router: authRouter }  = require("./routes/auth");
const { router: studentsRouter } = require("./routes/students");


app.use("/auth",     authLimiter, authRouter);
app.use("/students", studentsRouter);

// ─── Santé du serveur ──────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()) + "s",
    timestamp: new Date().toISOString()
  });
});

// ─── 404 ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

// ─── Erreurs globales ──────────────────────────────
app.use((err, req, res, next) => {
  console.error("Erreur :", err);
  res.status(500).json({ error: "Erreur serveur interne" });
});

// ─── Démarrage ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur sur http://localhost:${PORT}`);
  console.log(`🔒 Mode : ${process.env.NODE_ENV || "development"}`);
});