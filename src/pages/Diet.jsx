import { useEffect, useMemo, useState } from "react";
import { Utensils, Plus, Pencil, Trash2, X } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getDiet, saveDiet } from "../utils/db";
import { getTodayLocalDateKey } from "../utils/calculations";

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];
const CATEGORIES = ["Healthy", "Other"];
const COLORS = { Healthy: "#16a34a", Other: "#f59e0b" };

const emptyForm = {
  name: "",
  meal: "Breakfast",
  quantity: "",
  date: getTodayLocalDateKey(),
  category: "Healthy",
};

function Diet() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dateFilter, setDateFilter] = useState(getTodayLocalDateKey());

  useEffect(() => {
    async function load() {
      try {
        setFoods(await getDiet());
      } catch (error) {
        console.error("Failed to load diet data:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function persist(updated) {
    setFoods(updated);
    try {
      await saveDiet(updated);
    } catch (error) {
      console.error("Failed to save diet data:", error);
    }
  }

  const dayFoods = useMemo(
    () => foods.filter((f) => f.date === dateFilter),
    [foods, dateFilter]
  );

  const chartData = useMemo(() => {
    const healthy = dayFoods.filter((f) => f.category === "Healthy").length;
    const other = dayFoods.filter((f) => f.category === "Other").length;
    return [
      { name: "Healthy", value: healthy },
      { name: "Other", value: other },
    ].filter((d) => d.value > 0);
  }, [dayFoods]);

  function openAddForm() {
    setEditingFood(null);
    setForm({ ...emptyForm, date: dateFilter });
    setShowForm(true);
  }

  function openEditForm(food) {
    setEditingFood(food);
    setForm({
      name: food.name,
      meal: food.meal,
      quantity: food.quantity,
      date: food.date,
      category: food.category,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingFood(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.date) return;

    if (editingFood) {
      persist(
        foods.map((f) =>
          f.id === editingFood.id ? { ...f, ...form, name: form.name.trim() } : f
        )
      );
    } else {
      persist([...foods, { id: Date.now(), ...form, name: form.name.trim() }]);
    }
    closeForm();
  }

  function deleteFood(food) {
    const confirmed = window.confirm(`Delete "${food.name}"?`);
    if (!confirmed) return;
    persist(foods.filter((f) => f.id !== food.id));
  }

  if (loading) {
    return (
      <div className="module-page">
        <h1>🥗 Diet</h1>
        <p>Loading diet log...</p>
      </div>
    );
  }

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1>🥗 Diet Tracker</h1>
          <p>Personal food logging - not medical or nutrition advice.</p>
        </div>
        <button className="add-topic-button" onClick={openAddForm}>
          <Plus size={18} />
          Add Food
        </button>
      </div>

      {showForm && (
        <section className="module-form-card">
          <div className="add-topic-header">
            <h2>{editingFood ? "Edit Food" : "Add Food"}</h2>
            <button type="button" className="close-button" onClick={closeForm}>
              <X size={20} />
            </button>
          </div>
          <form className="grid-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Food Name</label>
              <input
                type="text"
                placeholder="Example: Grilled chicken salad"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Meal</label>
              <select value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })}>
                {MEALS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantity / Servings</label>
              <input
                type="text"
                placeholder="Example: 1 bowl"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="save-topic-button">
              {editingFood ? "Save Changes" : "Add Food"}
            </button>
          </form>
        </section>
      )}

      <section className="two-column">
        <div className="section-card">
          <div className="section-title">
            <Utensils size={22} />
            <h2>Foods Eaten</h2>
          </div>

          <input
            type="date"
            className="diet-date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />

          <div className="topic-list">
            {dayFoods.map((food) => (
              <div className="topic-row" key={food.id}>
                <div className="topic-information">
                  <strong>{food.name}</strong>
                  <span>
                    {food.meal} • {food.quantity || "—"} •{" "}
                    <span className={`badge badge-${food.category.toLowerCase()}`}>
                      {food.category}
                    </span>
                  </span>
                </div>
                <div className="topic-actions">
                  <button className="edit-button" onClick={() => openEditForm(food)}>
                    <Pencil size={17} />
                  </button>
                  <button className="delete-button" onClick={() => deleteFood(food)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
            {dayFoods.length === 0 && (
              <p className="empty-topics">No foods logged for this day.</p>
            )}
          </div>
        </div>

        <div className="section-card">
          <div className="section-title">
            <Utensils size={22} />
            <h2>Healthy vs Other</h2>
          </div>

          {chartData.length === 0 ? (
            <p className="empty-topics">No data to chart for this day yet.</p>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Diet;
