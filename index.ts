import express, { Request, Response } from "express";
import router from "./routes";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import { CONFIG } from "./config";

config();

const app = express();
const port = process.env.PORT;

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: true }));

// built-in middleware for json
app.use(express.json());

// middleware for cookies
app.use(cookieParser());

app.use(router);

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
