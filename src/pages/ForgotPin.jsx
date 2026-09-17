import React, {
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";

import { auth } from "../firebase/auth";
import { resetPin } from "../utils/pinLock";

const ForgotPin = ({
  onComplete,
  onBack,
}) => {
  const [step, setStep] = useState(
    "verify"
  );

  const [verifying, setVerifying] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [newPin, setNewPin] =
    useState("");

  const [confirmPin, setConfirmPin] =
    useState("");

  const [error, setError] =
    useState("");

  const [showNewPin, setShowNewPin] =
    useState(false);

  const [showConfirmPin, setShowConfirmPin] =
    useState(false);

  const inputRef = useRef(null);

  const currentValue =
    step === "create"
      ? newPin
      : confirmPin;

  const handleVerifyAccount = async () => {
    if (verifying) return;

    try {
      setError("");
      setVerifying(true);

      if (!auth.currentUser) {
        throw new Error(
          "Please sign in with your Google account first."
        );
      }

      const provider =
        new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      await reauthenticateWithPopup(
        auth.currentUser,
        provider
      );

      setStep("create");
    } catch (error) {
      console.error(
        "PIN recovery verification error:",
        error
      );

      if (
        error?.code ===
        "auth/popup-closed-by-user"
      ) {
        setError(
          "Google verification was cancelled."
        );
      } else if (
        error?.code ===
        "auth/popup-blocked"
      ) {
        setError(
          "Popup was blocked. Please allow popups and try again."
        );
      } else {
        setError(
          error?.message ||
            "Account verification failed. Please try again."
        );
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleDigit = (digit) => {
    if (saving) return;

    setError("");

    if (currentValue.length >= 4) {
      return;
    }

    if (step === "create") {
      setNewPin(
        (previous) =>
          previous + digit
      );
    } else {
      setConfirmPin(
        (previous) =>
          previous + digit
      );
    }
  };

  const handleBackspace = () => {
    if (saving) return;

    setError("");

    if (step === "create") {
      setNewPin(
        (previous) =>
          previous.slice(0, -1)
      );
    } else {
      setConfirmPin(
        (previous) =>
          previous.slice(0, -1)
      );
    }
  };

  const handleClear = () => {
    if (saving) return;

    setError("");

    if (step === "create") {
      setNewPin("");
    } else {
      setConfirmPin("");
    }
  };

  const handleInputChange = (event) => {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 4);

    setError("");

    if (step === "create") {
      setNewPin(value);
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

  const handleContinue = async () => {
    if (saving) return;

    if (step === "create") {
      if (newPin.length !== 4) {
        setError(
          "Enter exactly 4 digits."
        );
        return;
      }

      setConfirmPin("");
      setError("");
      setStep("confirm");

      return;
    }

    if (confirmPin.length !== 4) {
      setError(
        "Enter exactly 4 digits."
      );
      return;
    }

    if (newPin !== confirmPin) {
      setError(
        "PINs do not match."
      );

      setConfirmPin("");

      return;
    }

    try {
      setSaving(true);
      setError("");

      await resetPin(newPin);

      setStep("success");
    } catch (error) {
      console.error(
        "PIN reset error:",
        error
      );

      setError(
        error?.message ||
          "Unable to reset PIN. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSuccess = () => {
    onComplete?.();
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
        {step !== "success" && (
          <button
            type="button"
            onClick={onBack}
            style={styles.backButton}
            aria-label="Back"
          >
            <ArrowLeft size={19} />
          </button>
        )}

        <div style={styles.logo}>
          {step === "success" ? (
            <CheckCircle2
              size={32}
            />
          ) : (
            <KeyRound size={31} />
          )}
        </div>

        <h1 style={styles.title}>
          TaskBar
        </h1>

        {step === "verify" && (
          <>
            <h2 style={styles.heading}>
              Forgot PIN?
            </h2>

            <p style={styles.description}>
              Verify your Google account
              to reset your TaskBar PIN.
            </p>

            <div
              style={styles.securityBox}
            >
              <ShieldCheck
                size={21}
              />

              <span>
                Your TaskBar data will
                not be deleted.
              </span>
            </div>

            {error && (
              <div
                style={styles.error}
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={
                handleVerifyAccount
              }
              disabled={verifying}
              style={{
                ...styles.primaryButton,
                ...(verifying
                  ? styles.disabledButton
                  : {}),
              }}
            >
              {verifying ? (
                <>
                  <Loader2
                    size={19}
                    style={styles.spin}
                  />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck
                    size={19}
                  />
                  Verify with Google
                </>
              )}
            </button>

            <p style={styles.footer}>
              Account verification is
              required before creating a
              new PIN.
            </p>
          </>
        )}

        {step === "create" && (
          <>
            <h2 style={styles.heading}>
              Create New PIN
            </h2>

            <p style={styles.description}>
              Enter a new 4-digit PIN.
            </p>

            <PinInput
              value={newPin}
              show={showNewPin}
              onToggle={() =>
                setShowNewPin(
                  (previous) =>
                    !previous
                )
              }
              onChange={(value) =>
                setNewPin(value)
              }
              onKeyDown={
                handleKeyDown
              }
              inputRef={inputRef}
            />

            {error && (
              <div
                style={styles.error}
              >
                {error}
              </div>
            )}

            <Keypad
              digits={digits}
              onDigit={handleDigit}
              onClear={handleClear}
              onBackspace={
                handleBackspace
              }
              disabled={saving}
            />

            <button
              type="button"
              onClick={handleContinue}
              disabled={
                saving ||
                newPin.length !== 4
              }
              style={{
                ...styles.primaryButton,
                ...((saving ||
                  newPin.length !==
                    4)
                  ? styles.disabledButton
                  : {}),
              }}
            >
              Continue
            </button>
          </>
        )}

        {step === "confirm" && (
          <>
            <h2 style={styles.heading}>
              Confirm New PIN
            </h2>

            <p style={styles.description}>
              Enter the new PIN again.
            </p>

            <PinInput
              value={confirmPin}
              show={showConfirmPin}
              onToggle={() =>
                setShowConfirmPin(
                  (previous) =>
                    !previous
                )
              }
              onChange={(value) =>
                setConfirmPin(value)
              }
              onKeyDown={
                handleKeyDown
              }
              inputRef={inputRef}
            />

            {error && (
              <div
                style={styles.error}
              >
                {error}
              </div>
            )}

            <Keypad
              digits={digits}
              onDigit={handleDigit}
              onClear={handleClear}
              onBackspace={
                handleBackspace
              }
              disabled={saving}
            />

            <button
              type="button"
              onClick={handleContinue}
              disabled={
                saving ||
                confirmPin.length !==
                  4
              }
              style={{
                ...styles.primaryButton,
                ...((saving ||
                  confirmPin.length !==
                    4)
                  ? styles.disabledButton
                  : {}),
              }}
            >
              {saving
                ? "Saving..."
                : "Reset PIN"}
            </button>
          </>
        )}

        {step === "success" && (
          <>
            <h2 style={styles.heading}>
              PIN Reset Successful
            </h2>

            <p style={styles.description}>
              Your TaskBar PIN has been
              changed successfully.
            </p>

            <div
              style={styles.successBox}
            >
              <CheckCircle2
                size={24}
              />

              <span>
                Your new PIN is now
                active.
              </span>
            </div>

            <button
              type="button"
              onClick={handleSuccess}
              style={styles.primaryButton}
            >
              Continue to TaskBar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const PinInput = ({
  value,
  show,
  onToggle,
  onChange,
  onKeyDown,
  inputRef,
}) => {
  return (
    <div style={styles.pinInputArea}>
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
                ...(value.length >
                index
                  ? styles.pinBoxActive
                  : {}),
              }}
            >
              {value.length > index
                ? show
                  ? value[index]
                  : "●"
                : ""}
            </div>
          )
        )}
      </div>

      <div
        style={styles.hiddenInputWrapper}
      >
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
                .replace(/\D/g, "")
                .slice(0, 4)
            )
          }
          onKeyDown={onKeyDown}
          style={styles.hiddenInput}
          aria-label="PIN"
        />
      </div>

      <button
        type="button"
        onClick={onToggle}
        style={styles.eyeButton}
        aria-label={
          show
            ? "Hide PIN"
            : "Show PIN"
        }
      >
        {show ? (
          <EyeOff size={18} />
        ) : (
          <Eye size={18} />
        )}
      </button>
    </div>
  );
};

const Keypad = ({
  digits,
  onDigit,
  onClear,
  onBackspace,
  disabled,
}) => {
  return (
    <div style={styles.keypad}>
      {digits.map((digit) => (
        <button
          key={digit}
          type="button"
          onClick={() =>
            onDigit(digit)
          }
          disabled={disabled}
          style={styles.key}
        >
          {digit}
        </button>
      ))}

      <button
        type="button"
        onClick={onClear}
        disabled={disabled}
        style={styles.actionKey}
      >
        Clear
      </button>

      <button
        type="button"
        onClick={() =>
          onDigit("0")
        }
        disabled={disabled}
        style={styles.key}
      >
        0
      </button>

      <button
        type="button"
        onClick={onBackspace}
        disabled={disabled}
        style={styles.actionKey}
        aria-label="Delete last digit"
      >
        ⌫
      </button>
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
      "radial-gradient(circle at 50% 20%, rgba(220, 0, 0, 0.16), transparent 35%), linear-gradient(135deg, #050505, #120707, #050505)",
    color: "#fff",
  },

  glowOne: {
    position: "fixed",
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    background:
      "rgba(255, 0, 0, 0.14)",
    filter: "blur(80px)",
    top: "-100px",
    left: "-80px",
    pointerEvents: "none",
  },

  glowTwo: {
    position: "fixed",
    width: "260px",
    height: "260px",
    borderRadius: "50%",
    background:
      "rgba(180, 0, 0, 0.12)",
    filter: "blur(80px)",
    bottom: "-100px",
    right: "-80px",
    pointerEvents: "none",
  },

  card: {
    position: "relative",
    width: "100%",
    maxWidth: "410px",
    padding: "34px 25px",
    borderRadius: "26px",
    boxSizing: "border-box",
    textAlign: "center",

    background:
      "linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.035))",

    border:
      "1px solid rgba(255,255,255,0.16)",

    boxShadow:
      "0 25px 80px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.08)",

    backdropFilter: "blur(24px)",
    WebkitBackdropFilter:
      "blur(24px)",
  },

  backButton: {
    position: "absolute",
    top: "18px",
    left: "18px",
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    border:
      "1px solid rgba(255,255,255,0.12)",
    background:
      "rgba(255,255,255,0.06)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  logo: {
    width: "64px",
    height: "64px",
    margin: "0 auto 16px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    background:
      "linear-gradient(135deg, #ff2b2b, #a90000)",

    color: "#fff",

    boxShadow:
      "0 10px 30px rgba(255,0,0,0.30)",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 750,
    color: "#fff",
  },

  heading: {
    margin:
      "8px 0 0",
    color: "#ff4545",
    fontSize: "19px",
    fontWeight: 650,
  },

  description: {
    margin:
      "12px auto 24px",
    maxWidth: "320px",
    color: "rgba(255,255,255,0.60)",
    fontSize: "14px",
    lineHeight: 1.55,
  },

  securityBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "13px 14px",
    marginBottom: "18px",
    borderRadius: "14px",

    background:
      "rgba(255,0,0,0.07)",

    border:
      "1px solid rgba(255,80,80,0.18)",

    color: "#ffb0b0",
    fontSize: "13px",
    textAlign: "left",
  },

  successBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "15px",
    margin:
      "20px 0",
    borderRadius: "15px",

    background:
      "rgba(0,255,130,0.08)",

    border:
      "1px solid rgba(0,255,130,0.18)",

    color: "#9fffc5",
    fontSize: "14px",
  },

  error: {
    margin:
      "0 0 15px",
    padding: "11px 13px",
    borderRadius: "12px",

    background:
      "rgba(255,0,0,0.09)",

    border:
      "1px solid rgba(255,70,70,0.22)",

    color: "#ff8d8d",
    fontSize: "13px",
  },

  primaryButton: {
    width: "100%",
    minHeight: "52px",
    marginTop: "16px",
    border: "none",
    borderRadius: "15px",

    background:
      "linear-gradient(135deg, #ff2929, #c00000)",

    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",

    boxShadow:
      "0 10px 28px rgba(255,0,0,0.24)",
  },

  disabledButton: {
    opacity: 0.45,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  footer: {
    margin:
      "20px 0 0",
    color:
      "rgba(255,255,255,0.38)",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  pinInputArea: {
    position: "relative",
    marginBottom: "18px",
  },

  pinBoxes: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    cursor: "pointer",
  },

  pinBox: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",

    border:
      "1px solid rgba(255,255,255,0.15)",

    background:
      "rgba(0,0,0,0.28)",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    color: "#ff4b4b",
    fontSize: "19px",
    fontWeight: 700,

    boxSizing: "border-box",
  },

  pinBoxActive: {
    border:
      "1px solid rgba(255,50,50,0.70)",

    background:
      "rgba(255,0,0,0.09)",

    boxShadow:
      "0 0 18px rgba(255,0,0,0.12)",
  },

  hiddenInputWrapper: {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    opacity: 0,
  },

  hiddenInput: {
    width: "1px",
    height: "1px",
    border: "none",
    outline: "none",
  },

  eyeButton: {
    position: "absolute",
    right: "5px",
    top: "16px",
    width: "34px",
    height: "34px",
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
  },

  spin: {
    animation:
      "taskbar-pin-spin 1s linear infinite",
  },
};

export default ForgotPin;