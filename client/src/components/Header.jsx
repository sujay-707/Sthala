
import { Link, useNavigate } from "react-router-dom";
import { Search, Heart, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const [q, setQ] = useState("");

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("sthala_theme") === "dark"
  );

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("sthala_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((current) => !current);
  };

  return (
    <header className="header">
    <Link className="brand" to="/">
  <span className="sthala-logo">
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="43" cy="20" r="7" className="logo-sun" />
      <path d="M13 31 L32 15 L51 31" className="logo-roof" />
      <path d="M18 29 V47 H46 V29" className="logo-house" />
      <path d="M27 47 V36 Q32 30 37 36 V47" className="logo-door" />
    </svg>
  </span>
  sthala
</Link>

      <form
        className="search-pill"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(`/search?q=${encodeURIComponent(q)}`);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Where are you going?"
        />

        <button type="submit" aria-label="Search">
          <Search size={18} />
        </button>
      </form>

      <nav>
        <Link to="/search">Explore</Link>

        {user ? (
          <>
            <Link to="/wishlist">
              <Heart size={18} /> Wishlist
            </Link>

            <Link to="/reservations">Trips</Link>

            <button className="nav-button" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>

            <Link className="signup" to="/register">
              Sign up
            </Link>
          </>
        )}

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </nav>
    </header>
  );
}
