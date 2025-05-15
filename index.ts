import express, { Request, Response } from "express";
import router from "./routes";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import rateLimit from "express-rate-limit";
import { CONFIG } from "./config";
import session from "express-session";
import MemoryStore from "memorystore";
import cors from "cors";
import { setupAuth } from "./auth";

config();

const corsOption = {
  // origin: [CONFIG.CORS_ORIGIN, CONFIG.CORS_ORIGINB],
  origin: [
    "https://rentals.joinhumoni.com",
    "https://www.joinhumoni.com",
    "https://wait-list-backend-zeta.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();
const port = process.env.PORT || 3000;

// Configure rate limiting - more permissive in development
const limiter = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
  max:
    CONFIG.NODE_ENV === "development" ? 1000 : CONFIG.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

// Apply rate limiting to all routes except in development
if (CONFIG.NODE_ENV !== "development") {
  app.use(limiter);
}

// Configure session handling
const SessionStore = MemoryStore(session);
app.use(
  session({
    store: new SessionStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    secret: CONFIG.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: CONFIG.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: true }));

// built-in middleware for json
app.use(express.json());

// middleware for cookies
app.use(cookieParser());

app.use(cors(corsOption));

// Handle preflight requests
app.options("*", cors(corsOption)); // Enable preflight for all routes

setupAuth(app);

app.use(router);

// Health check endpoint
app.get(CONFIG.HEALTH_CHECK_PATH, (_req, res) => {
  res
    .status(200)
    .json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/", (req: Request, res: Response) => {
  res.send("⚡️⚡️⚡️Hello, Humoni Waitlist running!");
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(
        `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`
      );
    }
  });
  next();
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
