import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import express, { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SchemaUser } from "./shared/schema";

// Extend Express.User interface to include our user properties
declare global {
  namespace Express {
    interface User extends SchemaUser {}
    interface Request {
      user?: User;
      isAuthenticated(): this is { user: User };
    }
  }
}

const scryptAsync = promisify(scrypt);

// Hash password using scrypt with salt
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Compare supplied password with stored hashed password
async function comparePasswords(supplied: string, stored: string) {
  try {
    // Check if the stored password has the expected format
    if (!stored.includes(".")) {
      console.error("Invalid stored password format - missing salt delimiter");
      return false;
    }

    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

    // Check if buffers have the same length before comparing
    if (hashedBuf.length !== suppliedBuf.length) {
      console.error(
        "Buffer length mismatch:",
        hashedBuf.length,
        suppliedBuf.length
      );
      return false;
    }

    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

// Import config for session secret
import { CONFIG } from "./config";

// Function to create default admin account if it doesn't exist
async function createDefaultAdminIfNeeded() {
  try {
    // Check if admin account exists
    const existingAdmin = await storage.getUserByUsername("admin");
    if (!existingAdmin) {
      console.log("Creating default admin account...");
      const hashedPassword = await hashPassword("Myrebirth044$");
      await storage.createUser({
        username: "admin",
        password: hashedPassword,
        email: "admin@humoni.com",
        isAdmin: 1,
      });
      console.log("Default admin account created successfully!");
    } else {
      console.log("Admin account already exists, skipping creation.");
    }
  } catch (error) {
    console.error("Error creating default admin account:", error);
  }
}

export function setupAuth(app: Express) {
  // Create default admin account on startup
  createDefaultAdminIfNeeded();
  const sessionSettings: session.SessionOptions = {
    secret: CONFIG.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy for username/password auth
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);

        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = await comparePasswords(password, user.password);

        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize user to session
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register API route
  app.post(
    "/api/register",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if username already exists
        const existingUser = await storage.getUserByUsername(req.body.username);
        if (existingUser) {
          res.status(400).json({ message: "Username already exists" });
          return;
        }

        // Hash the password before storing
        const hashedPassword = await hashPassword(req.body.password);

        // Create new user with hashed password
        const user = await storage.createUser({
          ...req.body,
          password: hashedPassword,
        });

        // Log the user in automatically
        req.login(user, (err) => {
          if (err) return next(err);
          // Remove password from response for security
          const { password, ...userWithoutPassword } = user;
          res.status(201).json(userWithoutPassword);
          return;
        });
      } catch (error) {
        console.error("Registration error:", error);
        res
          .status(500)
          .json({ message: "An error occurred during registration" });
      }
    }
  );

  // Login API route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate(
      "local",
      (err: any, user: Express.User | false, info: { message?: string }) => {
        if (err) return next(err);
        if (!user)
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials" });

        req.login(user, (err) => {
          if (err) return next(err);

          // Remove password from response for security
          const { password, ...userWithoutPassword } = user as any;
          res.json(userWithoutPassword);
        });
      }
    )(req, res, next);
  });

  // Logout API route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Update your route handlers to use the properly typed Request
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    // No need to type assert req.user since we've extended the type
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
    return;
  });

  // Admin check middleware
  // This is an example of how to check if a user has admin privileges
  // You can use this middleware for protected routes
  const adminOnly = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = req.user as SchemaUser;
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  };

  // Example of an admin-only API route
  app.get("/api/admin/check", adminOnly, (req, res) => {
    res.json({ message: "You have admin access", user: req.user });
  });
}
