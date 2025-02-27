import { NextFunction, Request, Response } from "express";

const allowedOrigins = [
  "http://localhost:3000",
  process.env.CORS_ORIGIN,
  "http://localhost:5173",
];

export const configOptions = {
  csp: {
    "default-src": ["'self'"], // Restrict everything to same-origin by default
    "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"], // Allow scripts from self and CDNJS
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Allow styles from self and Google Fonts
    "font-src": ["'self'", "https://fonts.gstatic.com"], // Allow fonts from self and Google Fonts
    "img-src": ["'self'", "data:", ...allowedOrigins], // Allow images from self, data URIs, and allowed origins
    "connect-src": ["'self'", ...allowedOrigins], // Allow API requests and connect to the origins in allowedOrigins
    "frame-ancestors": ["'none'"], // Prevent embedding in iframes
    "form-action": ["'self'"], // Restrict form submissions to same origin
    "object-src": ["'none'"], // Disallow Flash, Silverlight, and other plugin content
    "base-uri": ["'self'"], // Prevent base tag from changing origins
    "upgrade-insecure-requests": [], // Upgrade HTTP to HTTPS
  },
  headers: {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "PUT, GET, PATCH, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "X-Requested-With, Content-Type, Accept, Origin, multipart/form-data, application/json",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Frame-Options": "SAMEORIGIN",
    "Referer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
};

export const credentials = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { origin } = req.headers;

  if (allowedOrigins.includes(origin)) {
    // Set CORS-related headers
    res.header("Access-Control-Allow-Origin", origin as string); // Allow requests from the specified origin
    res.header(
      "Access-Control-Allow-Credentials",
      configOptions.headers["Access-Control-Allow-Credentials"]
    ); // Allow credentials to be sent to the server
    // res.header('Access-Control-Allow-Methods', configOptions.headers['Access-Control-Allow-Methods']); // Allow the specified HTTP methods
    res.header(
      "Access-Control-Allow-Headers",
      configOptions.headers["Access-Control-Allow-Headers"]
    ); // Allow the specified headers in the request

    res.header(
      "Content-Security-Policy",
      Object.entries(configOptions.csp)
        .map(
          ([key, value]) =>
            `${key} ${Array.isArray(value) ? value.join(" ") : value}`
        )
        .join("; ")
    );

    // Add the "X-Content-Type-Options: nosniff" header
    res.header(
      "X-Content-Type-Options",
      configOptions.headers["X-Content-Type-Options"]
    ); // Prevent MIME type sniffing by the browser

    // Add Cache-Control headers to prevent caching
    res.header("Cache-Control", configOptions.headers["Cache-Control"]); // Prevent caching in all cases
    res.header("Pragma", configOptions.headers["Pragma"]); // Older HTTP 1.0 caches
    res.header("Expires", configOptions.headers["Expires"]); // Set expiration to the past, ensuring it expires immediately

    // Add the "X-Frame-Options: SAMEORIGIN" header
    res.header("X-Frame-Options", configOptions.headers["X-Frame-Options"]); // Prevent clickjacking by the browser

    // Add the "Referer-Policy: strict-origin-when-cross-origin" header
    res.header("Referer-Policy", configOptions.headers["Referer-Policy"]); // Prevent clickjacking by the browser

    // Add the "Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()" header
    res.header(
      "Permissions-Policy",
      configOptions.headers["Permissions-Policy"]
    );
  }

  next();
};
