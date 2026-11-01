import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { accountRequest, supabase } from "./supabase";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  size: string;
};

type Cart = Record<number, number>;

type Profile = {
  name: string;
  email: string;
};

type SavedOrder = {
  id: string;
  createdAt: string;
  status: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
};

// STORE DETAILS — replace these placeholders to make the shop your own.
const STORE = {
  name: "Veda Ayurveda",
  tagline: "[Add a short line about your business here]",
  whatsappNumber: "", // Add country code + number, digits only. Example format: 919876543210
  currency: "₹",
};

// PRODUCT DETAILS — update names, descriptions, sizes, and prices here.
const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "[Product Name 01]",
    description: "[Add a short product description here. Avoid unverified medical claims.]",
    price: 0,
    size: "[Size / quantity]",
  },
  {
    id: 2,
    name: "[Product Name 02]",
    description: "[Add a short product description here. Avoid unverified medical claims.]",
    price: 0,
    size: "[Size / quantity]",
  },
  {
    id: 3,
    name: "[Product Name 03]",
    description: "[Add a short product description here. Avoid unverified medical claims.]",
    price: 0,
    size: "[Size / quantity]",
  },
];

function LeafMark({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`leaf-mark ${small ? "leaf-mark-small" : ""}`}
    >
      <svg viewBox="0 0 40 40" fill="none">
        <path d="M31.8 7.5C18.7 8.1 10 14.7 9.4 27.8c8.8.9 17.2-3.1 22.4-20.3Z" />
        <path d="M8.2 33.2c4.7-8.1 10.3-13.4 17.1-17" />
      </svg>
    </span>
  );
}

function Icon({
  name,
}: {
  name: "bag" | "minus" | "plus" | "close" | "arrow" | "user";
}) {
  const paths = {
    bag: (
      <>
        <path d="M6.5 8.5h11l1 11h-13l1-11Z" />
        <path d="M9 9V7a3 3 0 0 1 6 0v2" />
      </>
    ),
    minus: <path d="M6 12h12" />,
    plus: <path d="M12 6v12M6 12h12" />,
    close: <path d="m7 7 10 10M17 7 7 17" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function AppButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary" | "icon";
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      aria-label={label}
      className={`app-button app-button-${variant}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ProductImage({ index, name }: { index: number; name: string }) {
  return (
    <div className={`product-image product-image-${index}`} role="img" aria-label={`Photo placeholder for ${name}`}>
      <div className="image-placeholder">
        <LeafMark />
        <span>Product photo</span>
        <small>Replace this placeholder</small>
      </div>
    </div>
  );
}

type AuthView = "login" | "register" | "forgot" | "reset" | "account";

function AuthPanel({
  session,
  initialView,
  onClose,
}: {
  session: Session | null;
  initialView: AuthView;
  onClose: () => void;
}) {
  const [view, setView] = useState<AuthView>(
    initialView === "reset" ? "reset" : session ? "account" : initialView,
  );
  const [name, setName] = useState(
    String(session?.user.user_metadata?.full_name ?? ""),
  );
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<SavedOrder[]>([]);

  useEffect(() => {
    if (!session) {
      if (view === "account") setView("login");
      return;
    }
    setView((current) => (current === "reset" ? current : "account"));
    setEmail(session.user.email ?? "");

    accountRequest<{ profile: Profile; orders: SavedOrder[] }>(
      "/account",
      session.access_token,
    )
      .then((data) => {
        setProfile(data.profile);
        setName(data.profile.name);
        setOrders(data.orders);
      })
      .catch((requestError) => setError(requestError.message));
  }, [session]);

  const clearFeedback = () => {
    setError("");
    setMessage("");
  };

  const passwordError = (value: string) => {
    if (value.length < 8) return "Use at least 8 characters.";
    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
      return "Include an uppercase letter, a lowercase letter, and a number.";
    }
    return "";
  };

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    if (!email.trim()) return setError("Enter your email address.");
    if (!password) return setError("Enter your password.");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) setError("Email or password is incorrect. Please try again.");
  };

  const submitRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    if (name.trim().length < 2) return setError("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("Enter a valid email address, such as name@example.com.");
    }
    const validationError = passwordError(password);
    if (validationError) return setError(validationError);
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    setLoading(false);
    if (signUpError) return setError(signUpError.message);
    if (!data.session) {
      setMessage("Check your email to confirm your account, then return to log in.");
    } else {
      setMessage("Your account has been created.");
    }
  };

  const submitForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("Enter the email address used for your account.");
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: window.location.origin },
    );
    setLoading(false);
    if (resetError) return setError(resetError.message);
    setMessage("If an account exists for this email, a reset link is on its way.");
  };

  const submitNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    const validationError = passwordError(password);
    if (validationError) return setError(validationError);
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError(updateError.message);
    setMessage("Your password has been updated securely.");
    setPassword("");
    setConfirmPassword("");
    setView("account");
  };

  const updateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    if (!session) return;
    if (name.trim().length < 2) return setError("Name must be at least 2 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("Enter a valid email address, such as name@example.com.");
    }
    setLoading(true);
    try {
      const result = await accountRequest<{ profile: Profile }>(
        "/profile",
        session.access_token,
        { method: "PUT", body: JSON.stringify({ name: name.trim() }) },
      );
      const emailChanged =
        email.trim().toLowerCase() !== session.user.email?.toLowerCase();
      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: { full_name: name.trim() },
        ...(emailChanged ? { email: email.trim() } : {}),
      });
      if (userUpdateError) throw userUpdateError;
      setProfile(result.profile);
      setMessage(
        emailChanged
          ? "Name saved. Check your new email address to confirm the change."
          : "Account information updated.",
      );
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const switchView = (next: AuthView) => {
    clearFeedback();
    setPassword("");
    setConfirmPassword("");
    setView(next);
  };

  return (
    <div className="overlay account-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="account-title"
        aria-modal="true"
        className="account-panel"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="account-visual">
          <LeafMark />
          <div>
            <p className="eyebrow"><span /> Your account</p>
            <h2>Keep your details and orders in one calm place.</h2>
            <p>Creating an account is optional. You can always browse and order through WhatsApp as a guest.</p>
          </div>
          <div className="privacy-note">
            <strong>Protected by Supabase Auth</strong>
            <span>Passwords are handled securely and are never stored in this website’s code or browser storage.</span>
          </div>
        </div>

        <div className="account-content">
          <AppButton label="Close account panel" onClick={onClose} variant="icon"><Icon name="close" /></AppButton>

          {view === "account" && session ? (
            <div className="account-dashboard">
              <p className="eyebrow"><span /> Welcome back</p>
              <h2 id="account-title">Hello, {profile?.name || name || "there"}</h2>
              <div className="account-tabs" role="tablist" aria-label="Account sections">
                <span className="active-tab">Profile & orders</span>
              </div>
              <form className="auth-form profile-form" onSubmit={updateProfile}>
                <label>
                  Full name
                  <input
                    autoComplete="name"
                    maxLength={80}
                    onChange={(event) => setName(event.target.value)}
                    required
                    value={name}
                  />
                </label>
                <label>
                  Email address
                  <input
                    autoComplete="email"
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                  <small>A confirmation link will be sent if you change this.</small>
                </label>
                {error && <p className="form-message form-error" role="alert">{error}</p>}
                {message && <p className="form-message form-success" role="status">{message}</p>}
                <button className="app-button app-button-primary auth-submit" disabled={loading} type="submit">
                  {loading ? "Saving…" : "Save changes"}
                </button>
              </form>

              <div className="order-history">
                <div>
                  <h3>Order history</h3>
                  <span>{orders.length} saved {orders.length === 1 ? "order" : "orders"}</span>
                </div>
                {orders.length === 0 ? (
                  <div className="empty-orders">
                    <p>Your WhatsApp orders will appear here after you continue to checkout while logged in.</p>
                  </div>
                ) : orders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div>
                      <strong>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
                      <span>{order.status}</span>
                    </div>
                    <p>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</p>
                    <strong>{STORE.currency}{order.total.toLocaleString("en-IN")}</strong>
                  </article>
                ))}
              </div>
              <button className="text-button logout-button" onClick={() => supabase.auth.signOut()} type="button">Log out</button>
            </div>
          ) : (
            <div className="auth-box">
              <p className="eyebrow"><span /> {view === "register" ? "New here" : view === "forgot" || view === "reset" ? "Account recovery" : "Welcome back"}</p>
              <h2 id="account-title">
                {view === "register" ? "Create your account" : view === "forgot" ? "Reset your password" : view === "reset" ? "Choose a new password" : "Log in to your account"}
              </h2>
              <p className="auth-intro">
                {view === "register"
                  ? "Save your details and see the orders you continue on WhatsApp."
                  : view === "forgot"
                    ? "Enter your email and we’ll send you a secure reset link."
                    : view === "reset"
                      ? "Use a strong password you haven’t used elsewhere."
                      : "View your profile and your saved WhatsApp order history."}
              </p>

              <form
                className="auth-form"
                onSubmit={
                  view === "register"
                    ? submitRegistration
                    : view === "forgot"
                      ? submitForgot
                      : view === "reset"
                        ? submitNewPassword
                        : submitLogin
                }
              >
                {view === "register" && (
                  <label>
                    Full name
                    <input
                      autoComplete="name"
                      maxLength={80}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your full name"
                      required
                      value={name}
                    />
                  </label>
                )}
                {view !== "reset" && (
                  <label>
                    Email address
                    <input
                      autoComplete="email"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      required
                      type="email"
                      value={email}
                    />
                  </label>
                )}
                {view !== "forgot" && (
                  <label>
                    Password
                    <input
                      autoComplete={view === "login" ? "current-password" : "new-password"}
                      minLength={8}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={view === "login" ? "Enter your password" : "At least 8 characters"}
                      required
                      type="password"
                      value={password}
                    />
                    {view !== "login" && <small>Use 8+ characters with uppercase, lowercase, and a number.</small>}
                  </label>
                )}
                {(view === "register" || view === "reset") && (
                  <label>
                    Confirm password
                    <input
                      autoComplete="new-password"
                      minLength={8}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Enter it again"
                      required
                      type="password"
                      value={confirmPassword}
                    />
                  </label>
                )}
                {view === "login" && (
                  <button className="text-button forgot-link" onClick={() => switchView("forgot")} type="button">Forgot password?</button>
                )}
                {error && <p className="form-message form-error" role="alert">{error}</p>}
                {message && <p className="form-message form-success" role="status">{message}</p>}
                <button className="app-button app-button-primary auth-submit" disabled={loading} type="submit">
                  {loading ? "Please wait…" : view === "register" ? "Create account" : view === "forgot" ? "Send reset link" : view === "reset" ? "Update password" : "Log in"}
                  {!loading && <Icon name="arrow" />}
                </button>
              </form>

              <div className="auth-switch">
                {view === "login" ? (
                  <p>New to the shop? <button className="text-button" onClick={() => switchView("register")} type="button">Create an account</button></p>
                ) : (
                  <p>Already have an account? <button className="text-button" onClick={() => switchView("login")} type="button">Log in</button></p>
                )}
                <button className="guest-link" onClick={onClose} type="button">Continue shopping as a guest</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [session, setSession] = useState<Session | null>(null);

  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const total = useMemo(
    () =>
      PRODUCTS.reduce(
        (sum, product) => sum + product.price * (cart[product.id] ?? 0),
        0,
      ),
    [cart],
  );

  useEffect(() => {
    document.body.style.overflow = cartOpen || checkoutOpen || authOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, checkoutOpen, authOpen]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") {
        setAuthView("reset");
        setAuthOpen(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const changeQuantity = (id: number, amount: number) => {
    setCart((current) => {
      const quantity = Math.max(0, (current[id] ?? 0) + amount);
      const next = { ...current };
      if (quantity === 0) delete next[id];
      else next[id] = quantity;
      return next;
    });
  };

  const goToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  const openWhatsApp = () => {
    const orderLines = PRODUCTS.filter((product) => cart[product.id]).map(
      (product) =>
        `• ${product.name} × ${cart[product.id]} — ${STORE.currency}${(
          product.price * cart[product.id]
        ).toLocaleString("en-IN")}`,
    );
    const message = [
      `Hello ${STORE.name},`,
      "",
      "I'd like to place an order:",
      ...orderLines,
      "",
      `Total: ${STORE.currency}${total.toLocaleString("en-IN")}`,
      "",
      "Please confirm availability and the next steps. Thank you.",
    ].join("\n");

    if (session) {
      void accountRequest(
        "/orders",
        session.access_token,
        {
          method: "POST",
          body: JSON.stringify({
            items: PRODUCTS.filter((product) => cart[product.id]).map((product) => ({
              name: product.name,
              quantity: cart[product.id],
              price: product.price,
            })),
            total,
          }),
        },
      );
    }

    window.open(
      `https://wa.me/${STORE.whatsappNumber}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setCheckoutOpen(false);
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} type="button">
            <LeafMark small />
            <span>{STORE.name}</span>
          </button>
          <nav aria-label="Main navigation">
            <button onClick={goToProducts} type="button">Shop</button>
            <button
              onClick={() => {
                setAuthView(session ? "account" : "login");
                setAuthOpen(true);
              }}
              type="button"
            >
              <Icon name="user" />
              {session ? "Account" : "Log in"}
            </button>
            <button onClick={() => setCartOpen(true)} type="button">
              <Icon name="bag" />
              Cart
              <span className="cart-count">{itemCount}</span>
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="hero-copy">
            <p className="eyebrow"><span /> Mindfully made • Thoughtfully shared</p>
            <h1>Everyday care,<br /><em>rooted in tradition.</em></h1>
            <p className="hero-intro">{STORE.tagline}</p>
            <AppButton onClick={goToProducts}>
              Explore our products <Icon name="arrow" />
            </AppButton>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="sun-disc" />
            <svg viewBox="0 0 360 420" fill="none">
              <path className="stem" d="M181 410c5-114-28-202-93-277M183 410c-6-127 39-232 111-309" />
              <path className="stem fine" d="M145 260c-40-9-69-34-86-74M206 247c39-20 67-49 85-87M163 319c-34-15-58-40-71-76M195 332c27-14 51-37 70-70" />
              <g className="botanical-leaves">
                <ellipse cx="82" cy="119" rx="15" ry="38" transform="rotate(-40 82 119)" />
                <ellipse cx="57" cy="179" rx="13" ry="34" transform="rotate(-60 57 179)" />
                <ellipse cx="104" cy="205" rx="14" ry="37" transform="rotate(-34 104 205)" />
                <ellipse cx="88" cy="251" rx="13" ry="33" transform="rotate(-55 88 251)" />
                <ellipse cx="291" cy="92" rx="15" ry="40" transform="rotate(42 291 92)" />
                <ellipse cx="303" cy="153" rx="14" ry="37" transform="rotate(59 303 153)" />
                <ellipse cx="266" cy="196" rx="14" ry="35" transform="rotate(39 266 196)" />
                <ellipse cx="269" cy="260" rx="13" ry="34" transform="rotate(54 269 260)" />
              </g>
            </svg>
            <p>Small-batch care</p>
          </div>
        </section>

        <section className="promise-strip" aria-label="Our values">
          <p><LeafMark small /> Rooted in tradition</p>
          <p><LeafMark small /> Made with intention</p>
          <p><LeafMark small /> Personal service</p>
        </section>

        <section className="products-section" id="products">
          <div className="section-heading">
            <p className="eyebrow"><span /> Our collection</p>
            <h2>Simple rituals for <em>every day</em></h2>
            <p>Explore our current collection. Replace this text with a short introduction to your products.</p>
          </div>

          <div className="product-grid">
            {PRODUCTS.map((product, index) => (
              <article className="product-card" key={product.id}>
                <ProductImage index={index + 1} name={product.name} />
                <div className="product-info">
                  <div className="product-meta">
                    <span>{product.size}</span>
                    <span>Product {String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="product-footer">
                    <div>
                      <strong>{STORE.currency}{product.price.toLocaleString("en-IN")}</strong>
                      <small>Placeholder price</small>
                    </div>
                    <AppButton onClick={() => changeQuantity(product.id, 1)} variant="secondary">
                      Add to cart <Icon name="plus" />
                    </AppButton>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="personal-note">
          <LeafMark />
          <div>
            <p className="eyebrow"><span /> A personal touch</p>
            <h2>Questions before you order?</h2>
            <p>Add your own note here about how customers can contact you for product or ordering questions.</p>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-brand"><LeafMark small /><span>{STORE.name}</span></div>
        <p>© {new Date().getFullYear()} {STORE.name}. All rights reserved.</p>
        <p>Product information and contact details are placeholders.</p>
      </footer>

      {cartOpen && (
        <div className="overlay" role="presentation" onMouseDown={() => setCartOpen(false)}>
          <aside className="cart-drawer" aria-label="Your cart" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-heading">
              <div>
                <p className="eyebrow"><span /> Your selection</p>
                <h2>Your cart <small>{itemCount} {itemCount === 1 ? "item" : "items"}</small></h2>
              </div>
              <AppButton label="Close cart" onClick={() => setCartOpen(false)} variant="icon"><Icon name="close" /></AppButton>
            </div>

            {itemCount === 0 ? (
              <div className="empty-cart">
                <LeafMark />
                <h3>Your cart is empty</h3>
                <p>Add one of our products to begin your order.</p>
                <AppButton onClick={() => { setCartOpen(false); goToProducts(); }}>Browse products</AppButton>
              </div>
            ) : (
              <>
                <div className="cart-lines">
                  {PRODUCTS.filter((product) => cart[product.id]).map((product, index) => (
                    <div className="cart-line" key={product.id}>
                      <div className={`cart-thumb product-image-${index + 1}`}><LeafMark small /></div>
                      <div className="cart-line-copy">
                        <h3>{product.name}</h3>
                        <p>{product.size}</p>
                        <div className="quantity">
                          <AppButton label={`Remove one ${product.name}`} onClick={() => changeQuantity(product.id, -1)} variant="icon"><Icon name="minus" /></AppButton>
                          <span>{cart[product.id]}</span>
                          <AppButton label={`Add one ${product.name}`} onClick={() => changeQuantity(product.id, 1)} variant="icon"><Icon name="plus" /></AppButton>
                        </div>
                      </div>
                      <strong>{STORE.currency}{(product.price * cart[product.id]).toLocaleString("en-IN")}</strong>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <div><span>Total</span><strong>{STORE.currency}{total.toLocaleString("en-IN")}</strong></div>
                  <p>Delivery charges, if any, can be confirmed on WhatsApp.</p>
                  <AppButton onClick={() => setCheckoutOpen(true)}>
                    Checkout on WhatsApp <Icon name="arrow" />
                  </AppButton>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="overlay modal-overlay" role="presentation" onMouseDown={() => setCheckoutOpen(false)}>
          <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-icon"><LeafMark /></div>
            <AppButton label="Close checkout" onClick={() => setCheckoutOpen(false)} variant="icon"><Icon name="close" /></AppButton>
            <p className="eyebrow"><span /> One last step</p>
            <h2 id="checkout-title">Continue your order on WhatsApp</h2>
            <p>We’ll open WhatsApp with your selected products, quantities, and total already added. You can review the message before sending it.</p>
            <p className="checkout-account-note">
              {session
                ? "Because you’re logged in, this order will also be saved to your account history."
                : "You can continue as a guest. Logging in is optional."}
            </p>
            {!STORE.whatsappNumber && (
              <div className="setup-note">
                <strong>Setup needed</strong>
                <span>Add your WhatsApp number to <code>STORE.whatsappNumber</code> in <code>src/App.tsx</code> to enable checkout.</span>
              </div>
            )}
            <div className="modal-actions">
              <AppButton onClick={() => setCheckoutOpen(false)} variant="secondary">Go back</AppButton>
              <AppButton disabled={!STORE.whatsappNumber} onClick={openWhatsApp}>
                Open WhatsApp <Icon name="arrow" />
              </AppButton>
            </div>
          </section>
        </div>
      )}

      {authOpen && (
        <AuthPanel
          initialView={authView}
          onClose={() => setAuthOpen(false)}
          session={session}
        />
      )}
    </div>
  );
}
