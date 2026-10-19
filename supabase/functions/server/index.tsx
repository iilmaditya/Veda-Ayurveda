import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-56ed2676/health", (c) => {
  return c.json({ status: "ok" });
});

const getAuthenticatedUser = async (authorization?: string) => {
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_ANON_KEY"),
  );
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
};

app.get("/make-server-56ed2676/account", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Please log in to view your account." }, 401);

  const storedProfile = await kv.get(`user:${user.id}:profile`);
  const orders = (await kv.get(`user:${user.id}:orders`)) ?? [];
  return c.json({
    profile: storedProfile ?? {
      name: user.user_metadata?.full_name ?? "",
      email: user.email ?? "",
    },
    orders,
  });
});

app.put("/make-server-56ed2676/profile", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Please log in to update your profile." }, 401);

  const body = await c.req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return c.json({ error: "Name must be between 2 and 80 characters." }, 400);
  }

  const profile = { name, email: user.email ?? "" };
  await kv.set(`user:${user.id}:profile`, profile);
  return c.json({ profile });
});

app.post("/make-server-56ed2676/orders", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Please log in to save an order." }, 401);

  const body = await c.req.json();
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: "An order must contain at least one item." }, 400);
  }

  const safeItems = body.items.slice(0, 20).map((item: any) => ({
    name: String(item.name ?? "").slice(0, 120),
    quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
    price: Math.max(0, Number(item.price) || 0),
  }));
  const order = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "Continued on WhatsApp",
    items: safeItems,
    total: Math.max(0, Number(body.total) || 0),
  };
  const key = `user:${user.id}:orders`;
  const orders = (await kv.get(key)) ?? [];
  await kv.set(key, [order, ...orders].slice(0, 50));
  return c.json({ order }, 201);
});

Deno.serve(app.fetch);
