/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(resolveSecurityHeaderEnvironment())
      }
    ];
  }
};

const productionCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
];

const previewCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://vercel.live",
  "img-src 'self' data: blob: https://vercel.live https://vercel.com",
  "font-src 'self' https://vercel.live https://assets.vercel.com",
  "connect-src 'self' https://vercel.live wss://ws-us3.pusher.com",
  "frame-src https://vercel.live",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
];

function resolveSecurityHeaderEnvironment() {
  if (process.env.VERCEL_ENV === "preview") {
    return "preview";
  }
  if (process.env.VERCEL_ENV === "production") {
    return "production";
  }
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  ) {
    return "development";
  }
  return "production";
}

function contentSecurityPolicy(environment) {
  if (environment === "preview") {
    return previewCsp.join("; ");
  }
  if (environment === "development") {
    return productionCsp
      .map((directive) => {
        if (directive.startsWith("script-src ")) {
          return `${directive} 'unsafe-eval'`;
        }
        if (directive.startsWith("connect-src ")) {
          return `${directive} ws://localhost:* ws://127.0.0.1:*`;
        }
        return directive;
      })
      .join("; ");
  }
  return productionCsp.join("; ");
}

function securityHeaders(environment) {
  return [
    {
      key: "Content-Security-Policy",
      value: contentSecurityPolicy(environment)
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff"
    },
    {
      key: "Referrer-Policy",
      value: "no-referrer"
    },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), browsing-topics=()"
    },
    {
      key: "X-Frame-Options",
      value: "DENY"
    }
  ];
}

export default nextConfig;
