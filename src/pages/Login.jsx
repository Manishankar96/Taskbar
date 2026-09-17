import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { signInWithGoogle } from "../firebase/auth";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await signInWithGoogle();

      console.log("Logged in user:", result.user);

      navigate("/");
    } catch (error) {
      console.error("Google Login Error:", error);

      setError(
        error?.message ||
          "Google login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background glow */}
      <div style={styles.glowOne}></div>
      <div style={styles.glowTwo}></div>

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          ✓
        </div>

        {/* Title */}
        <h1 style={styles.title}>
          TASKBAR
        </h1>

        <p style={styles.subtitle}>
          Your Personal Dashboard
        </p>

        <div style={styles.divider}></div>

        <p style={styles.description}>
          Sign in to access your tasks, learning,
          timetable, goals and personal data.
        </p>

        {/* Google Login */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            ...styles.googleButton,
            ...(loading ? styles.googleButtonDisabled : {}),
          }}
        >
          {loading ? (
            <>
              <span style={styles.spinner}></span>
              Signing in...
            </>
          ) : (
            <>
              <span style={styles.googleIcon}>G</span>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>!</span>

            <span>
              {error}
            </span>
          </div>
        )}

        {/* Security message */}
        <div style={styles.security}>
          <span style={styles.lockIcon}>🔒</span>

          <span>
            Secure authentication powered by Firebase
          </span>
        </div>

        <p style={styles.footer}>
          Your data is securely connected to your
          account.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",

    background:
      "radial-gradient(circle at 20% 20%, rgba(220, 20, 60, 0.18), transparent 35%)," +
      "radial-gradient(circle at 80% 80%, rgba(180, 0, 0, 0.16), transparent 35%)," +
      "linear-gradient(135deg, #050505 0%, #100000 45%, #050505 100%)",
  },

  glowOne: {
    position: "absolute",
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    background: "rgba(255, 0, 0, 0.12)",
    filter: "blur(90px)",
    top: "-100px",
    left: "-80px",
    pointerEvents: "none",
  },

  glowTwo: {
    position: "absolute",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "rgba(180, 0, 0, 0.10)",
    filter: "blur(100px)",
    bottom: "-120px",
    right: "-100px",
    pointerEvents: "none",
  },

  card: {
    width: "100%",
    maxWidth: "430px",
    padding: "42px 32px",
    boxSizing: "border-box",

    position: "relative",
    zIndex: 2,

    borderRadius: "24px",

    background:
      "linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.035))",

    border:
      "1px solid rgba(255, 255, 255, 0.14)",

    boxShadow:
      "0 25px 70px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255,255,255,0.08)",

    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",

    textAlign: "center",
  },

  logo: {
    width: "72px",
    height: "72px",
    margin: "0 auto 20px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    borderRadius: "20px",

    background:
      "linear-gradient(145deg, #ff2020, #a50000)",

    border:
      "1px solid rgba(255, 100, 100, 0.45)",

    boxShadow:
      "0 12px 35px rgba(255, 0, 0, 0.28)",

    color: "#ffffff",
    fontSize: "36px",
    fontWeight: "800",
  },

  title: {
    margin: "0",

    color: "#ffffff",

    fontSize: "32px",
    fontWeight: "800",
    letterSpacing: "3px",

    textShadow:
      "0 0 20px rgba(255, 0, 0, 0.25)",
  },

  subtitle: {
    margin: "8px 0 0",

    color: "#d0d0d0",

    fontSize: "15px",
    fontWeight: "500",
  },

  divider: {
    width: "55px",
    height: "3px",

    margin: "22px auto",

    borderRadius: "10px",

    background:
      "linear-gradient(90deg, #ff0000, #ff4d4d)",
  },

  description: {
    margin: "0 auto 28px",

    maxWidth: "340px",

    color: "#a9a9a9",

    fontSize: "14px",
    lineHeight: "1.7",
  },

  googleButton: {
    width: "100%",

    minHeight: "54px",

    padding: "14px 18px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",

    borderRadius: "13px",

    border:
      "1px solid rgba(255, 255, 255, 0.22)",

    background:
      "rgba(255, 255, 255, 0.96)",

    color: "#151515",

    fontSize: "15px",
    fontWeight: "700",

    cursor: "pointer",

    boxShadow:
      "0 10px 30px rgba(0, 0, 0, 0.25)",

    transition:
      "transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease",
  },

  googleButtonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  googleIcon: {
    width: "24px",
    height: "24px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    fontSize: "20px",
    fontWeight: "800",

    color: "#4285F4",
  },

  spinner: {
    width: "18px",
    height: "18px",

    borderRadius: "50%",

    border:
      "2px solid rgba(0, 0, 0, 0.2)",

    borderTop:
      "2px solid #111",

    animation:
      "taskbarLoginSpin 0.8s linear infinite",
  },

  errorBox: {
    marginTop: "18px",

    padding: "12px 14px",

    display: "flex",
    alignItems: "center",
    gap: "10px",

    borderRadius: "12px",

    background:
      "rgba(255, 0, 0, 0.10)",

    border:
      "1px solid rgba(255, 60, 60, 0.28)",

    color: "#ff8b8b",

    fontSize: "13px",
    lineHeight: "1.5",

    textAlign: "left",
  },

  errorIcon: {
    width: "22px",
    height: "22px",

    flexShrink: 0,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    borderRadius: "50%",

    background:
      "rgba(255, 0, 0, 0.22)",

    color: "#ff4d4d",

    fontWeight: "800",
  },

  security: {
    marginTop: "25px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",

    color: "#999",

    fontSize: "12px",
  },

  lockIcon: {
    fontSize: "12px",
  },

  footer: {
    margin: "10px 0 0",

    color: "#666",

    fontSize: "11px",
  },
};

export default Login;