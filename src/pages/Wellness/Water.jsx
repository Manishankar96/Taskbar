import { useEffect, useMemo, useState } from "react";
import {
  Droplets,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";

import {
  getWater,
  getItem,
  putItem,
} from "../../utils/db";

import { calculateWaterPercentage } from "../../utils/calculations";

/* =========================================================
   SMALL WATER GLASS STYLES
========================================================= */

const waterGlassStyles = `
.water-small-visual {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0 10px;
}

.water-small-glass {
  position: relative;
  width: 90px;
  height: 120px;
  border: 4px solid rgba(80, 100, 120, 0.45);
  border-top: 0;
  border-radius: 8px 8px 18px 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 0 10px rgba(0, 0, 0, 0.08),
    0 6px 18px rgba(0, 0, 0, 0.08);
}

.water-small-glass::before {
  content: "";
  position: absolute;
  top: 0;
  left: -4px;
  right: -4px;
  height: 4px;
  border-radius: 8px;
  background: rgba(80, 100, 120, 0.45);
  z-index: 5;
}

.water-small-liquid {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  min-height: 0;
  background: linear-gradient(
    to top,
    rgba(35, 145, 230, 0.9),
    rgba(75, 185, 245, 0.72)
  );
  transition: height 0.8s ease;
  overflow: hidden;
}

.water-small-wave {
  position: absolute;
  top: -7px;
  left: -20%;
  width: 140%;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.38);
  animation: waterWaveMove 2.2s ease-in-out infinite;
}

.water-small-wave-two {
  position: absolute;
  top: -4px;
  left: -25%;
  width: 150%;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  animation: waterWaveMoveReverse 2.8s ease-in-out infinite;
}

.water-small-bubble {
  position: absolute;
  bottom: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  animation: waterBubbleUp 2.4s linear infinite;
}

.water-small-bubble-one {
  left: 22%;
}

.water-small-bubble-two {
  left: 58%;
  width: 4px;
  height: 4px;
  animation-delay: 0.7s;
}

.water-small-bubble-three {
  left: 76%;
  width: 6px;
  height: 6px;
  animation-delay: 1.2s;
}

.water-small-glass-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(90, 105, 120, 0.65);
  font-size: 12px;
  font-weight: 600;
}

.water-small-percentage {
  margin-top: 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
}

@keyframes waterWaveMove {
  0%,
  100% {
    transform: translateX(-8px) rotate(-1deg);
  }

  50% {
    transform: translateX(8px) rotate(1deg);
  }
}

@keyframes waterWaveMoveReverse {
  0%,
  100% {
    transform: translateX(8px);
  }

  50% {
    transform: translateX(-8px);
  }
}

@keyframes waterBubbleUp {
  0% {
    transform: translateY(10px);
    opacity: 0;
  }

  20% {
    opacity: 0.8;
  }

  100% {
    transform: translateY(-95px);
    opacity: 0;
  }
}

@media (max-width: 600px) {
  .water-small-glass {
    width: 75px;
    height: 100px;
  }
}

/* =========================================================
   COMPLETE WATER PAGE STYLES
   These styles are intentionally self-contained so the Water
   page does not depend on App.css.
========================================================= */

.water-card,
.water-status-card {
  width: 100%;
  box-sizing: border-box;
}

.water-card {
  padding: 28px;
  margin-top: 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(100, 120, 150, 0.16);
  box-shadow: 0 12px 35px rgba(25, 45, 80, 0.08);
  backdrop-filter: blur(12px);
}

.water-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 8px;
}

.water-header h2 {
  margin: 0;
  font-size: 24px;
  line-height: 1.25;
  color: #172033;
}

.water-header p {
  margin: 7px 0 0;
  color: #687386;
  font-size: 14px;
}

.water-icon {
  color: #2999ed;
  flex-shrink: 0;
}

.water-main-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  margin-top: 6px;
  text-align: center;
}

.water-main-value strong {
  font-size: clamp(38px, 6vw, 58px);
  line-height: 1;
  font-weight: 800;
  color: #172033;
}

.water-main-value span {
  font-size: 18px;
  font-weight: 600;
  color: #758095;
}

.water-progress {
  width: 100%;
  height: 14px;
  margin-top: 24px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8edf5;
}

.water-progress-fill {
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #35a9ef, #66c9ff);
  transition: width 0.5s ease;
}

.water-progress-info {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 9px;
  color: #69758a;
  font-size: 13px;
  font-weight: 600;
}

.water-target-section,
.water-amount-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(100, 120, 150, 0.12);
}

.water-target-section label,
.water-amount-section label {
  color: #273246;
  font-size: 14px;
  font-weight: 700;
}

.water-target-section input,
.water-amount-section select {
  width: 190px;
  min-height: 42px;
  box-sizing: border-box;
  padding: 9px 12px;
  border: 1px solid #d6deea;
  border-radius: 10px;
  background: #fff;
  color: #202b3d;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.water-target-section input:focus,
.water-amount-section select:focus {
  border-color: #4baaf0;
  box-shadow: 0 0 0 3px rgba(75, 170, 240, 0.14);
}

.water-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.water-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 17px;
  border: 0;
  border-radius: 11px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}

.water-actions button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.water-actions button:active:not(:disabled) {
  transform: translateY(0);
}

.water-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.water-add-button {
  color: #fff;
  background: linear-gradient(135deg, #278fe5, #48b8f5);
  box-shadow: 0 7px 18px rgba(39, 143, 229, 0.22);
}

.water-remove-button {
  color: #334155;
  background: #edf2f7;
}

.water-reset-button {
  color: #9b4d4d;
  background: #fff0f0;
}

.water-status-card {
  margin-top: 20px;
  padding: 24px 28px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(100, 120, 150, 0.14);
  box-shadow: 0 10px 30px rgba(25, 45, 80, 0.06);
}

.water-status-card h2 {
  margin: 0 0 20px;
  color: #172033;
  font-size: 21px;
}

.water-status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.water-status-grid > div {
  min-width: 0;
  padding: 18px;
  border-radius: 15px;
  background: rgba(241, 246, 251, 0.8);
}

.water-status-grid span {
  display: block;
  margin-bottom: 7px;
  color: #718096;
  font-size: 13px;
  font-weight: 600;
}

.water-status-grid strong {
  display: block;
  color: #172033;
  font-size: 20px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .water-status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .water-card,
  .water-status-card {
    padding: 20px;
    border-radius: 17px;
  }

  .water-header h2 {
    font-size: 20px;
  }

  .water-main-value strong {
    font-size: 42px;
  }

  .water-progress-info {
    flex-direction: column;
    gap: 4px;
  }

  .water-target-section,
  .water-amount-section {
    align-items: stretch;
    flex-direction: column;
    gap: 9px;
  }

  .water-target-section input,
  .water-amount-section select {
    width: 100%;
  }

  .water-actions {
    flex-direction: column;
  }

  .water-actions button {
    width: 100%;
  }

  .water-status-grid {
    grid-template-columns: 1fr 1fr;
  }

  .water-status-grid > div {
    padding: 14px;
  }
}

@media (max-width: 400px) {
  .water-status-grid {
    grid-template-columns: 1fr;
  }
}

`;

/* =========================================================
   DATE
========================================================= */

function getToday() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================================
   DEFAULT RECORD
========================================================= */

function createTodayRecord() {
  const today = getToday();

  return {
    id: today,
    date: today,
    target: 2500,
    consumed: 0,
  };
}

/* =========================================================
   NORMALIZE
========================================================= */

function getWaterAmount(record) {
  if (!record) return 0;

  const aggregate =
    record.consumed ??
    record.consumedMl;

  if (aggregate !== undefined) {
    const value = Number(aggregate);
    return Number.isFinite(value) && value >= 0
      ? value
      : 0;
  }

  const legacy =
    record.amountMl ??
    record.amount ??
    record.water ??
    record.quantity ??
    record.ml;

  const value = Number(legacy);
  return Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function normalizeWaterRecord(record, consumedOverride) {
  const today = getToday();
  const consumed =
    consumedOverride !== undefined
      ? Number(consumedOverride)
      : getWaterAmount(record);

  return {
    ...(record || {}),

    id: today,

    date: today,

    target:
      Number(record?.target) > 0
        ? Number(record.target)
        : 2500,

    consumed:
      Number.isFinite(consumed) && consumed >= 0
        ? consumed
        : 0,
  };
}

/* =========================================================
   WATER
========================================================= */

function Water() {
  const [water, setWater] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [amount, setAmount] =
    useState(250);

  const [saving, setSaving] =
    useState(false);

  const today = getToday();

  /* =======================================================
     LOAD TODAY
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadWater() {
      try {
        setLoading(true);

        const records = await getWater();

        // Prefer the new canonical daily record if it exists.
        const canonicalRecord = records.find(
          (record) =>
            record?.id === today &&
            (record?.consumed !== undefined ||
              record?.consumedMl !== undefined)
        );

        if (canonicalRecord) {
          const normalized = normalizeWaterRecord(
            canonicalRecord
          );

          if (mounted) {
            setWater(normalized);
          }
        } else {
          // Older versions stored one row per glass. Never throw those
          // rows away; simply sum them for today's display.
          const todayRows = records.filter(
            (record) =>
              record?.date === today ||
              record?.id === today
          );

          const legacyRows = todayRows.filter(
            (record) =>
              record?.consumed === undefined &&
              record?.consumedMl === undefined
          );

          const aggregate = todayRows.find(
            (record) =>
              record?.consumed !== undefined ||
              record?.consumedMl !== undefined
          );

          const consumed = aggregate
            ? getWaterAmount(aggregate)
            : legacyRows.reduce(
                (total, record) =>
                  total + getWaterAmount(record),
                0
              );

          if (todayRows.length > 0) {
            const normalized = normalizeWaterRecord(
              aggregate || todayRows[0],
              consumed
            );

            // Display the recovered value. We intentionally do not delete or
            // rewrite legacy rows during page load.
            if (mounted) {
              setWater(normalized);
            }
          } else {
            const newRecord = createTodayRecord();

            await putItem(
              "water",
              newRecord
            );

            if (mounted) {
              setWater(newRecord);
            }
          }
        }
      } catch (error) {
        console.error(
          "Failed to load water:",
          error
        );

        if (mounted) {
          setWater(
            createTodayRecord()
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadWater();

    return () => {
      mounted = false;
    };
  }, [today]);

  /* =======================================================
     SAVE TODAY
  ======================================================= */

  async function saveTodayRecord(
    updatedRecord
  ) {
    const record = {
      ...updatedRecord,

      id: today,

      date: today,

      target:
        Number(
          updatedRecord.target
        ) > 0
          ? Number(
              updatedRecord.target
            )
          : 2500,

      consumed:
        Number(
          updatedRecord.consumed
        ) >= 0
          ? Number(
              updatedRecord.consumed
            )
          : 0,
    };

    setSaving(true);

    try {
      await putItem(
        "water",
        record
      );

      setWater(record);
    } catch (error) {
      console.error(
        "Failed to save water:",
        error
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     GET LATEST RECORD
  ======================================================= */

  async function getLatestRecord() {
    try {
      const records = await getWater();

      const canonical = records.find(
        (record) =>
          record?.id === today &&
          (record?.consumed !== undefined ||
            record?.consumedMl !== undefined)
      );

      if (canonical) {
        return normalizeWaterRecord(canonical);
      }

      const todayRows = records.filter(
        (record) =>
          record?.date === today ||
          record?.id === today
      );

      if (todayRows.length > 0) {
        const aggregate = todayRows.find(
          (record) =>
            record?.consumed !== undefined ||
            record?.consumedMl !== undefined
        );

        const consumed = aggregate
          ? getWaterAmount(aggregate)
          : todayRows.reduce(
              (total, record) =>
                total + getWaterAmount(record),
              0
            );

        return normalizeWaterRecord(
          aggregate || todayRows[0],
          consumed
        );
      }
    } catch (error) {
      console.error(
        "Failed to read water:",
        error
      );
    }

    return (
      water ||
      createTodayRecord()
    );
  }

  /* =======================================================
     ADD
  ======================================================= */

  async function addWater() {
    if (saving) return;

    try {
      const current =
        await getLatestRecord();

      const updated = {
        ...current,

        consumed:
          current.consumed +
          amount,
      };

      await saveTodayRecord(
        updated
      );
    } catch (error) {
      console.error(
        "Add water failed:",
        error
      );
    }
  }

  /* =======================================================
     REMOVE
  ======================================================= */

  async function removeWater() {
    if (saving) return;

    try {
      const current =
        await getLatestRecord();

      const updated = {
        ...current,

        consumed: Math.max(
          0,
          current.consumed -
            amount
        ),
      };

      await saveTodayRecord(
        updated
      );
    } catch (error) {
      console.error(
        "Remove water failed:",
        error
      );
    }
  }

  /* =======================================================
     RESET
  ======================================================= */

  async function resetToday() {
    if (saving) return;

    try {
      const current =
        await getLatestRecord();

      const updated = {
        ...current,

        consumed: 0,
      };

      await saveTodayRecord(
        updated
      );
    } catch (error) {
      console.error(
        "Reset water failed:",
        error
      );
    }
  }

  /* =======================================================
     TARGET
  ======================================================= */

  async function changeTarget(
    event
  ) {
    if (saving) return;

    try {
      const value =
        Number(
          event.target.value
        );

      const current =
        await getLatestRecord();

      const updated = {
        ...current,

        target:
          value > 0
            ? value
            : 2500,
      };

      await saveTodayRecord(
        updated
      );
    } catch (error) {
      console.error(
        "Target update failed:",
        error
      );
    }
  }

  /* =======================================================
     PERCENTAGE
  ======================================================= */

  const percentage =
    useMemo(() => {
      if (!water) return 0;

      return calculateWaterPercentage(
        water.consumed,
        water.target
      );
    }, [water]);

  /*
    Glass should never visually overflow.
  */

  const glassFill =
    Math.min(
      Math.max(percentage, 0),
      100
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="page">

        <style>
          {waterGlassStyles}
        </style>

        <h1>Water</h1>

        <p>
          Loading today's water data...
        </p>

      </div>
    );
  }

  if (!water) {
    return (
      <div className="page">

        <style>
          {waterGlassStyles}
        </style>

        <h1>Water</h1>

        <p>
          Unable to load water data.
        </p>

      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="page">

      <style>
        {waterGlassStyles}
      </style>

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-header">

        <div>

          <h1>Water</h1>

          <p>
            Track your water intake
            for today.
          </p>

        </div>

      </div>

      {/* =================================================
          MAIN WATER CARD
      ================================================= */}

      <section className="card water-card">

        <div className="water-header">

          <div>

            <h2>
              Today's Water
            </h2>

            <p>
              {today}
            </p>

          </div>

          <Droplets
            size={36}
            className="water-icon"
          />

        </div>

        {/* =================================================
            SMALL ANIMATED GLASS
        ================================================= */}

        <div className="water-small-visual">

          <div>

            <div className="water-small-glass">

              {glassFill > 0 ? (
                <div
                  className="water-small-liquid"
                  style={{
                    height: `${glassFill}%`,
                  }}
                >

                  <div className="water-small-wave" />

                  <div className="water-small-wave-two" />

                  <span className="water-small-bubble water-small-bubble-one" />

                  <span className="water-small-bubble water-small-bubble-two" />

                  <span className="water-small-bubble water-small-bubble-three" />

                </div>
              ) : (
                <div className="water-small-glass-empty">
                  Empty
                </div>
              )}

            </div>

            <div className="water-small-percentage">
              {percentage}% full
            </div>

          </div>

        </div>

        {/* =================================================
            WATER VALUE
        ================================================= */}

        <div className="water-main-value">

          <strong>
            {water.consumed}
          </strong>

          <span>
            / {water.target} ml
          </span>

        </div>

        {/* =================================================
            PROGRESS
        ================================================= */}

        <div className="water-progress">

          <div
            className="water-progress-fill"
            style={{
              width: `${glassFill}%`,
            }}
          />

        </div>

        <div className="water-progress-info">

          <span>
            {percentage}% completed
          </span>

          <span>
            {Math.max(
              0,
              water.target -
                water.consumed
            )}{" "}
            ml remaining
          </span>

        </div>

        {/* =================================================
            TARGET
        ================================================= */}

        <div className="water-target-section">

          <label htmlFor="water-target">
            Daily Target (ml)
          </label>

          <input
            id="water-target"
            type="number"
            min="1"
            value={water.target}
            onChange={
              changeTarget
            }
            disabled={saving}
          />

        </div>

        {/* =================================================
            AMOUNT
        ================================================= */}

        <div className="water-amount-section">

          <label htmlFor="water-amount">
            Amount
          </label>

          <select
            id="water-amount"
            value={amount}
            onChange={(event) =>
              setAmount(
                Number(
                  event.target.value
                )
              )
            }
            disabled={saving}
          >

            <option value="100">
              100 ml
            </option>

            <option value="150">
              150 ml
            </option>

            <option value="200">
              200 ml
            </option>

            <option value="250">
              250 ml
            </option>

            <option value="300">
              300 ml
            </option>

            <option value="500">
              500 ml
            </option>

            <option value="750">
              750 ml
            </option>

            <option value="1000">
              1000 ml
            </option>

          </select>

        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="water-actions">

          <button
            type="button"
            onClick={addWater}
            className="water-add-button"
            disabled={saving}
          >

            <Plus size={18} />

            {saving
              ? "Saving..."
              : "Add Water"}

          </button>

          <button
            type="button"
            onClick={removeWater}
            className="water-remove-button"
            disabled={
              saving ||
              water.consumed <= 0
            }
          >

            <Minus size={18} />

            Remove

          </button>

          <button
            type="button"
            onClick={resetToday}
            className="water-reset-button"
            disabled={
              saving ||
              water.consumed === 0
            }
          >

            <RotateCcw size={18} />

            Reset Today

          </button>

        </div>

      </section>

      {/* =================================================
          STATUS
      ================================================= */}

      <section className="card water-status-card">

        <h2>
          Today's Status
        </h2>

        <div className="water-status-grid">

          <div>

            <span>
              Consumed
            </span>

            <strong>
              {water.consumed} ml
            </strong>

          </div>

          <div>

            <span>
              Target
            </span>

            <strong>
              {water.target} ml
            </strong>

          </div>

          <div>

            <span>
              Remaining
            </span>

            <strong>
              {Math.max(
                0,
                water.target -
                  water.consumed
              )}{" "}
              ml
            </strong>

          </div>

          <div>

            <span>
              Progress
            </span>

            <strong>
              {percentage}%
            </strong>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Water;