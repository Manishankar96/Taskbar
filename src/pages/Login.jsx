import React, { useState } from "react";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import app from "../firebase/firebaseConfig";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      const result = await signInWithPopup(auth, provider);

      console.log("Logged in user:", result.user);

      // After successful login
      navigate("/");
    } catch (error) {
      console.error("Google Login Error:", error);
      setError("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>✓</div>

        <h1 style={styles.title}>TaskBar</h1>

        <p style={styles.subtitle}>
          Your Personal Dashboard
        </p>

        <p style={styles.description}>
          Sign in to access your tasks, learning, timetable,
          goals and personal data.
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={styles.googleButton}
        >
          {loading ? (
            "Signing in..."
          ) : (
            <>
              <span style={styles.googleIcon}>G</span>
              Continue with Google
            </>
          )}
        </button>

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.footer}>
          Your data will be securely connected to your account.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    background: "#0f0f0f",
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    padding: "40px 30px",
    borderRadius: "20px",
    background: "#1c1c1c",
    border: "1px solid #333",
    textAlign: "center",
    boxSizing: "border-box",
  },

  logo: {
    width: "65px",
    height: "65px",
    margin: "0 auto 20px",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ff6b00",
    color: "#fff",
    fontSize: "32px",
    fontWeight: "bold",
  },

  title: {
    margin: "0",
    color: "#fff",
    fontSize: "32px",
  },

  subtitle: {
    margin: "8px 0",
    color: "#aaa",
    fontSize: "17px",
  },

  description: {
    margin: "25px 0",
    color: "#999",
    fontSize: "14px",
    lineHeight: "1.6",
  },

  googleButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#fff",
    color: "#222",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  },

  googleIcon: {
    fontSize: "20px",
    fontWeight: "bold",
  },

  error: {
    marginTop: "15px",
    color: "#ff6b6b",
    fontSize: "14px",
  },

  footer: {
    marginTop: "25px",
    color: "#666",
    fontSize: "12px",
  },
};

export default Login;