import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Footer() {
    const { user, loading } = useAuth();

    return (
        <footer className="sthala-footer">
            <div className="footer-content">
                <h2>Find a place. Make it yours.</h2>

                <Link to="/search" className="footer-cta">
                    Explore Sthala
                    <span aria-hidden="true">↗</span>
                </Link>

                <nav className="footer-links" aria-label="Footer navigation">
                    <Link to="/search">Explore stays</Link>
                    <Link to="/wishlist">Wishlist</Link>
                    <Link to="/reservations">My stays</Link>

                    {!loading && (
                        <Link to={user ? "/reservations" : "/login"}>
                            {user ? "My account" : "Your account"}
                        </Link>
                    )}
                </nav>

                <p className="footer-tagline">
                    Find your place. Feel at home.
                </p>
            </div>

            <div className="footer-watermark" aria-hidden="true">
                STHALA
            </div>

            <div className="footer-bottom">
                <span className="footer-copyright">
                    © 2026 Sthala. All rights reserved. –{" "}
                    <a href="mailto:sujaymundaragi7@gmail.com">
                        sujaymundaragi7@gmail.com
                    </a>
                </span>

                <div className="footer-social">
                    <a
                        href="https://linkedin.com/in/sujay-mundaragi707"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        LinkedIn
                    </a>

                    <a
                        href="https://github.com/sujay-707"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        GitHub
                    </a>
                </div>

                <span className="footer-owner">
                    Sujay M Mundaragi –{" "}
                    <a href="tel:+918762338707">8762338707</a>
                </span>
            </div>
        </footer>
    );
}

export default Footer;