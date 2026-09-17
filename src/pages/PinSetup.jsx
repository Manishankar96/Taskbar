import React, { useRef, useState } from "react";
import { createPin } from "../utils/pinLock";

const PinSetup = ({ onComplete }) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState("create");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const inputRef = useRef(null);

  const currentValue =
    step === "create" ? pin : confirmPin;

  const handleDigit = (digit) => {
    if (saving) return;

    setError("");

    if (currentValue.length >= 4) {
      return;
    }

    if (step === "create") {
      setPin((previous) => previous + digit);
    } else {
      setConfirmPin((previous) => previous + digit);
    }
  };

  const handleBackspace = () => {
    if (saving) return;

    setError("");

    if (step === "create") {
      setPin((previous) => previous.slice(0, -1));
    } else {
      setConfirmPin((previous) =>
        previous.slice(0, -1)
      );
    }
  };

  const handleClear = () => {
    if (saving) return;

    setError("");

    if (step === "create") {
      setPin("");
    } else {
      setConfirmPin("");
    }
  };

  const handleContinue = async () => {
    if (saving) return;

    if (step === "create") {
      if (pin.length !== 4) {
        setError("Enter exactly 4 digits.");
        return;
      }

      setError("");
      setConfirmPin("");
      setStep("confirm");
      return;
    }

    if (confirmPin.length !== 4) {
      setError("Enter exactly 4 digits.");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match.");
      setConfirmPin("");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createPin(pin);

      onComplete?.();
    } catch (error) {
      console.error(
        "PIN creation error:",
        error
      );

      setError(
        error?.message ||
          "Unable to create PIN. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (event) => {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 4);

    setError("");

    if (step === "create") {
      setPin(value);
    } else {
      setConfirmPin(value);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      handleBackspace();
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleContinue();
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
      <div style={styles.card}>
        <div style={styles.logo}>
          ✓
        </div>

        <h1 style={styles.title}>
          TaskBar
        </h1>

        <p style={styles.subtitle}>
          {step === "create"
            ? "Create App PIN"
            : "Confirm App PIN"}
        </p>

        <p style={styles.description}>
          {step === "create"
            ? "Create a 4-digit PIN to protect your TaskBar app."
            : "Enter your 4-digit PIN again to confirm it."}
        </p>

        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={currentValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          style={styles.hiddenInput}
          aria-label={
            step === "create"
              ? "Create 4 digit PIN"
              : "Confirm 4 digit PIN"
          }
        />

        <div
          style={styles.pinDots}
          onClick={() =>
            inputRef.current?.focus()
          }
        >
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              style={{
                ...styles.pinDot,
                ...(currentValue.length > index
                  ? styles.pinDotFilled
                  : {}),
              }}
            >
              {currentValue.length > index
                ? "●"
                : ""}
            </div>
          ))}
        </div>

        {error && (
          <p style={styles.error}>
            {error}
          </p>
        )}

        <div style={styles.keypad}>
          {digits.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() =>
                handleDigit(digit)
              }
              disabled={saving}
              style={styles.key}
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            disabled={
              saving ||
              currentValue.length === 0
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
            disabled={saving}
            style={styles.key}
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={
              saving ||
              currentValue.length === 0
            }
            style={styles.actionKey}
            aria-label="Delete last digit"
          >
            ⌫
          </button>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={
            saving ||
            currentValue.length !== 4
          }
          style={{
            ...styles.continueButton,
            ...(currentValue.length !== 4 ||
            saving
              ? styles.continueButtonDisabled
              : {}),
          }}
        >
          {saving
            ? "Saving..."
            : step === "create"
            ? "Continue"
            : "Create PIN"}
        </button>

        <p style={styles.footer}>
          You can change your PIN later from
          Settings.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    minHeight: "100dvh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #0b0b0b 0%, #171717 50%, #0b0b0b 100%)",
    color: "#fff",
    overflow: "auto",
  },

  card: {
    width: "100%",
    maxWidth: "400px",
    padding: "34px 24px",
    borderRadius: "24px",
    background: "rgba(28, 28, 28, 0.96)",
    border: "1px solid #333",
    boxShadow:
      "0 20px 60px rgba(0, 0, 0, 0.45)",
    textAlign: "center",
    boxSizing: "border-box",
  },

  logo: {
    width: "62px",
    height: "62px",
    margin: "0 auto 16px",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ff6b00",
    color: "#fff",
    fontSize: "30px",
    fontWeight: "700",
  },

  title: {
    margin: "0",
    color: "#fff",
    fontSize: "30px",
    fontWeight: "700",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#ff6b00",
    fontSize: "18px",
    fontWeight: "600",
  },

  description: {
    margin: "12px 0 24px",
    color: "#999",
    fontSize: "14px",
    lineHeight: "1.5",
  },

  hiddenInput: {
    position: "absolute",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
  },

  pinDots: {
    display: "flex",
    justifyContent: "center",
    gap: "14px",
    marginBottom: "18px",
    cursor: "pointer",
  },

  pinDot: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    border: "1px solid #444",
    background: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ff6b00",
    fontSize: "18px",
    boxSizing: "border-box",
  },

  pinDotFilled: {
    border: "2px solid #ff6b00",
    background: "#21170f",
  },

  error: {
    margin: "0 0 16px",
    color: "#ff6b6b",
    fontSize: "14px",
  },

  keypad: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    width: "100%",
    maxWidth: "300px",
    margin: "0 auto",
  },

  key: {
    minHeight: "58px",
    border: "1px solid #3a3a3a",
    borderRadius: "14px",
    background: "#242424",
    color: "#fff",
    fontSize: "21px",
    fontWeight: "600",
    cursor: "pointer",
    touchAction: "manipulation",
  },

  actionKey: {
    minHeight: "58px",
    border: "1px solid #3a3a3a",
    borderRadius: "14px",
    background: "#1b1b1b",
    color: "#aaa",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    touchAction: "manipulation",
  },

  continueButton: {
    width: "100%",
    maxWidth: "300px",
    minHeight: "52px",
    marginTop: "16px",
    border: "none",
    borderRadius: "14px",
    background: "#ff6b00",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    touchAction: "manipulation",
  },

  continueButtonDisabled: {
    background: "#4a2a16",
    color: "#777",
    cursor: "not-allowed",
  },

  footer: {
    margin: "22px 0 0",
    color: "#666",
    fontSize: "12px",
    lineHeight: "1.5",
  },
};

export default PinSetup;