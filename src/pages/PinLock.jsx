import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Delete,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
} from "lucide-react";

import { verifyPin } from "../utils/pinLock";

const PinLock = ({
  onSuccess,
  onForgotPin,
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] =
    useState(false);
  const [showPin, setShowPin] =
    useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (pin.length === 4) {
      handleVerify(pin);
    }
  }, [pin]);

  const handleVerify = async (
    value
  ) => {
    if (checking) return;

    setChecking(true);
    setError("");

    try {
      const valid =
        await verifyPin(value);

      if (valid) {
        setPin("");
        onSuccess?.();
      } else {
        setError(
          "Incorrect PIN. Try again."
        );

        setPin("");

        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    } catch (error) {
      console.error(
        "PIN verification error:",
        error
      );

      setError(
        "Unable to verify PIN. Please try again."
      );

      setPin("");
    } finally {
      setChecking(false);
    }
  };

  const handleDigit = (digit) => {
    if (checking) return;

    setError("");

    if (pin.length >= 4) {
      return;
    }

    setPin(
      (previous) =>
        previous + digit
    );
  };

  const handleBackspace = () => {
    if (checking) return;

    setError("");

    setPin(
      (previous) =>
        previous.slice(0, -1)
    );
  };

  const handleClear = () => {
    if (checking) return;

    setError("");
    setPin("");
  };

  const handleInputChange = (
    event
  ) => {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 4);

    setError("");
    setPin(value);
  };

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key === "Backspace"
    ) {
      event.preventDefault();
      handleBackspace();
    }
  };

  const digits = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
  ];

  return (
    <div style={styles.container}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.card}>
        <div style={styles.logo}>
          <LockKeyhole size={31} />
        </div>

        <h1 style={styles.title}>
          TaskBar
        </h1>

        <h2 style={styles.heading}>
          App Locked
        </h2>

        <p style={styles.description}>
          Enter your 4-digit PIN to
          continue.
        </p>

        <div style={styles.pinArea}>
          <div
            style={styles.pinBoxes}
            onClick={() =>
              inputRef.current?.focus()
            }
          >
            {[0, 1, 2, 3].map(
              (index) => (
                <div
                  key={index}
                  style={{
                    ...styles.pinBox,
                    ...(pin.length >
                    index
                      ? styles.pinBoxActive
                      : {}),
                  }}
                >
                  {pin.length >
                  index
                    ? showPin
                      ? pin[index]
                      : "●"
                    : ""}
                </div>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setShowPin(
                (previous) =>
                  !previous
              )
            }
            style={styles.eyeButton}
            aria-label={
              showPin
                ? "Hide PIN"
                : "Show PIN"
            }
          >
            {showPin ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>

          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={
              handleInputChange
            }
            onKeyDown={
              handleKeyDown
            }
            style={styles.hiddenInput}
            aria-label="Enter 4 digit PIN"
          />
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <div style={styles.keypad}>
          {digits.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() =>
                handleDigit(digit)
              }
              disabled={checking}
              style={styles.key}
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            disabled={
              checking ||
              pin.length === 0
            }
            style={styles.actionKey}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() =>
              handleDigit("0")
            }
            disabled={checking}
            style={styles.key}
          >
            0
          </button>

          <button
            type="button"
            onClick={
              handleBackspace
            }
            disabled={
              checking ||
              pin.length === 0
            }
            style={styles.actionKey}
            aria-label="Delete last digit"
          >
            <Delete size={19} />
          </button>
        </div>

        <button
          type="button"
          onClick={onForgotPin}
          style={styles.forgotButton}
          disabled={checking}
        >
          <KeyRound size={16} />
          Forgot PIN?
        </button>

        <p style={styles.footer}>
          Your PIN protects access to
          the TaskBar app on this
          device.
        </p>
      </div>

      <style>
        {`
          @keyframes taskbar-pin-spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          button:active {
            transform: scale(0.97);
          }

          @media (max-width: 480px) {
            .taskbar-pin-card {
              padding: 28px 18px;
            }
          }
        `}
      </style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    minHeight: "100dvh",
    width: "100%",
    position: "relative",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    padding: "20px",
    boxSizing: "border-box",

    overflow: "auto",

    background:
      "radial-gradient(circle at 50% 20%, rgba(220,0,0,0.17), transparent 35%), linear-gradient(135deg, #050505, #130606, #050505)",

    color: "#fff",
  },

  glowOne: {
    position: "fixed",
    width: "300px",
    height: "300px",
    borderRadius: "50%",

    background:
      "rgba(255,0,0,0.13)",

    filter: "blur(90px)",

    top: "-120px",
    left: "-90px",

    pointerEvents: "none",
  },

  glowTwo: {
    position: "fixed",
    width: "280px",
    height: "280px",
    borderRadius: "50%",

    background:
      "rgba(190,0,0,0.12)",

    filter: "blur(90px)",

    bottom: "-110px",
    right: "-90px",

    pointerEvents: "none",
  },

  card: {
    position: "relative",

    width: "100%",
    maxWidth: "410px",

    padding: "35px 25px",

    borderRadius: "27px",

    boxSizing: "border-box",

    textAlign: "center",

    background:
      "linear-gradient(145deg, rgba(255,255,255,0.105), rgba(255,255,255,0.035))",

    border:
      "1px solid rgba(255,255,255,0.16)",

    boxShadow:
      "0 25px 80px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.08)",

    backdropFilter: "blur(25px)",
    WebkitBackdropFilter:
      "blur(25px)",
  },

  logo: {
    width: "64px",
    height: "64px",

    margin:
      "0 auto 16px",

    borderRadius: "20px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    background:
      "linear-gradient(135deg, #ff2929, #a90000)",

    color: "#fff",

    boxShadow:
      "0 10px 30px rgba(255,0,0,0.30)",
  },

  title: {
    margin: 0,

    color: "#fff",

    fontSize: "30px",

    fontWeight: 750,
  },

  heading: {
    margin:
      "8px 0 0",

    color: "#ff4141",

    fontSize: "19px",

    fontWeight: 650,
  },

  description: {
    margin:
      "11px auto 23px",

    maxWidth: "300px",

    color:
      "rgba(255,255,255,0.58)",

    fontSize: "14px",

    lineHeight: 1.5,
  },

  pinArea: {
    position: "relative",

    marginBottom: "17px",
  },

  pinBoxes: {
    display: "flex",

    justifyContent: "center",

    gap: "12px",

    cursor: "pointer",
  },

  pinBox: {
    width: "53px",
    height: "53px",

    borderRadius: "14px",

    border:
      "1px solid rgba(255,255,255,0.14)",

    background:
      "rgba(0,0,0,0.28)",

    display: "flex",

    alignItems: "center",
    justifyContent: "center",

    color: "#ff4040",

    fontSize: "18px",

    fontWeight: 700,

    boxSizing: "border-box",
  },

  pinBoxActive: {
    border:
      "1px solid rgba(255,55,55,0.72)",

    background:
      "rgba(255,0,0,0.09)",

    boxShadow:
      "0 0 20px rgba(255,0,0,0.12)",
  },

  eyeButton: {
    position: "absolute",

    right: "4px",
    top: "10px",

    width: "36px",
    height: "36px",

    borderRadius: "10px",

    border:
      "1px solid rgba(255,255,255,0.10)",

    background:
      "rgba(255,255,255,0.05)",

    color: "#aaa",

    display: "flex",

    alignItems: "center",
    justifyContent: "center",

    cursor: "pointer",
  },

  hiddenInput: {
    position: "absolute",

    width: "1px",
    height: "1px",

    opacity: 0,

    pointerEvents: "none",
  },

  error: {
    margin:
      "0 0 15px",

    padding:
      "10px 13px",

    borderRadius: "12px",

    background:
      "rgba(255,0,0,0.09)",

    border:
      "1px solid rgba(255,70,70,0.22)",

    color: "#ff8d8d",

    fontSize: "13px",
  },

  keypad: {
    width: "100%",

    maxWidth: "310px",

    margin: "0 auto",

    display: "grid",

    gridTemplateColumns:
      "repeat(3, 1fr)",

    gap: "10px",
  },

  key: {
    minHeight: "58px",

    borderRadius: "15px",

    border:
      "1px solid rgba(255,255,255,0.10)",

    background:
      "rgba(255,255,255,0.07)",

    color: "#fff",

    fontSize: "21px",

    fontWeight: 650,

    cursor: "pointer",

    touchAction: "manipulation",

    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.05)",
  },

  actionKey: {
    minHeight: "58px",

    borderRadius: "15px",

    border:
      "1px solid rgba(255,70,70,0.14)",

    background:
      "rgba(255,0,0,0.055)",

    color: "#ff9a9a",

    fontSize: "13px",

    fontWeight: 650,

    cursor: "pointer",

    touchAction: "manipulation",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  forgotButton: {
    marginTop: "18px",

    border: "none",

    background: "transparent",

    color: "#ff5959",

    fontSize: "14px",

    fontWeight: 650,

    cursor: "pointer",

    display: "inline-flex",

    alignItems: "center",

    justifyContent: "center",

    gap: "7px",
  },

  footer: {
    margin:
      "19px auto 0",

    maxWidth: "280px",

    color:
      "rgba(255,255,255,0.36)",

    fontSize: "12px",

    lineHeight: 1.5,
  },
};

export default PinLock;