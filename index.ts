import express, { Request, Response } from "express";
import router from "./routes";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "dotenv";

config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"],
    optionsSuccessStatus: 200,
  })
);

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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
