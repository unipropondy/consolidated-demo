import React, { useEffect, useState } from "react";
import { ChromePicker } from "react-color";
import "./Discount.css";

export default function Discount() {
  const [data, setData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerType, setPickerType] = useState("");
  const [editId, setEditId] = useState(null);

  // ✅ ADDED
  const [isReadOnly, setIsReadOnly] = useState(false);

  const [form, setForm] = useState({
    DiscountCode: "",
    Description: "",
    DiscountPercentage: "",
    FromDate: "",
    ToDate: "",
    isActive: true,
    isGuestMeal: false,
    Backcolor: "",
    ForeColor: ""
  });

  const loadData = async () => {
    try {
      console.log("📥 Loading discount data...");
      const res = await fetch("http://localhost:5000/api/discount");

      if (!res.ok) {
        let errorMsg = "Failed to load data";
        try {
          const errJson = await res.json();
          errorMsg = errJson.error || errorMsg;
        } catch {
          const errText = await res.text();
          errorMsg = errText || `HTTP Status: ${res.status}`;
        }
        console.error("❌ GET ERROR:", errorMsg);
        alert(`❌ Failed to load discounts: ${errorMsg}`);
        return;
      }

      const json = await res.json();
      console.log("✅ Loaded discounts:", json);
      setData(json || []);

    } catch (err) {
      console.error("❌ Fetch error:", err);
      alert(`❌ Error loading data: ${err.message}`);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange1 = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const saveData1 = async () => {
    try {
      const code = form.DiscountCode?.toString().trim();
      const desc = form.Description?.toString().trim();

      // ✅ VALIDATION: Check all required fields
      if (!code) {
        alert("❌ Error: Discount Code is required.");
        console.error("Validation failed: Discount Code is empty");
        return;
      }

      if (!desc) {
        alert("❌ Error: Description is required.");
        console.error("Validation failed: Description is empty");
        return;
      }

      // ✅ BLOCK SAVE FOR BACKEND DATA
      if (isReadOnly) {
        console.warn("⚠️ This record is read-only (from backend). Cannot edit.");
        alert("⚠️ This record is from backend system and cannot be edited.");
        setShowForm(false);
        return;
      }

      const url = editId
        ? `http://localhost:5000/api/discount/${editId}`
        : "http://localhost:5000/api/discount";

      const method = editId ? "PUT" : "POST";

      console.log(`📤 ${method} request to ${url} with data:`, form);

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        let errorMsg = "Unknown error occurred";
        try {
          const errJson = await res.json();
          errorMsg = errJson.error || errJson.message || errorMsg;
        } catch {
          const errText = await res.text();
          errorMsg = errText || `HTTP Status: ${res.status}`;
        }
        console.error("❌ Backend Error:", errorMsg);
        alert(`❌ Save failed: ${errorMsg}`);
        return;
      }

      const successData = await res.json();
      console.log("✅ Save response:", successData);
      alert("✅ Discount saved successfully!");

      // ✅ Reset form after successful save
      setShowForm(false);
      setEditId(null);
      setIsReadOnly(false);

      setForm({
        DiscountCode: "",
        Description: "",
        DiscountPercentage: "",
        FromDate: "",
        ToDate: "",
        isActive: true,
        isGuestMeal: false,
        Backcolor: "",
        ForeColor: ""
      });

      // ✅ Reload data
      loadData();

    } catch (err) {
      console.error("❌ Save error:", err);
      alert(`❌ Error saving: ${err.message}`);
    }
  };

  return (
    <div className="discount-container1">

      <div className="discount-header1">
        <h2 className="discount-title1">Discount</h2>

        <button
          className="discount-new-btn1"
          onClick={() => {
            setShowForm(true);
            setEditId(null);
            setIsReadOnly(false); // ✅ reset
          }}
        >
          New
        </button>
      </div>

      <table className="discount-table1">
        <thead>
          <tr>
            <th>DiscountCode</th>
            <th>Description</th>
            <th>DiscountPercentage</th>
            <th>Active</th>
            <th>GuestMeal</th>
          </tr>
        </thead>

        <tbody>
          {data && data.length > 0 && data.map((d, i) => (
            <tr
              key={i}
              onClick={() => {
                setForm(d);
                setEditId(d.Discountid);

                // ✅ detect backend data
                if (d.DiscountCode && d.DiscountCode.startsWith("DC000")) {
                  setIsReadOnly(true);
                } else {
                  setIsReadOnly(false);
                }

                setShowForm(true);
              }}
              style={{ cursor: "pointer" }}
            >
              <td>{d.DiscountCode}</td>

              <td>
                <div
                  style={{
                    background: d.Backcolor,
                    color: d.ForeColor,
                    padding: "5px"
                  }}
                >
                  {d.Description} ({d.DiscountPercentage}%)
                </div>
              </td>

              <td>{d.DiscountPercentage}</td>
              <td>{d.isActive ? "yes" : "no"}</td>
              <td>{d.isGuestMeal ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <div className="discount-overlay1">
          <div className="discount-form-box1">

            <h3 className="discount-form-title1">Discount</h3>

            <div className="discount-form-row1">
              <label>Discount Code</label>
              <input name="DiscountCode" value={form.DiscountCode} onChange={handleChange1} disabled={isReadOnly} />
            </div>

            <div className="discount-form-row1">
              <label>Description</label>
              <input name="Description" value={form.Description} onChange={handleChange1} disabled={isReadOnly} />
            </div>

            <div className="discount-form-row1">
              <label>Discount %</label>
              <input name="DiscountPercentage" value={form.DiscountPercentage} onChange={handleChange1} disabled={isReadOnly} />
              
              <label>Discount $</label>
              <input name="DiscountAmount" disabled={isReadOnly} />
            </div>

            <div className="discount-form-row1">
              <label>From Date</label>
              <input type="date" name="FromDate" value={form.FromDate || ""} onChange={handleChange1} disabled={isReadOnly} />

              <label>To Date</label>
              <input type="date" name="ToDate" value={form.ToDate || ""} onChange={handleChange1} disabled={isReadOnly} />
            </div>

            <div className="discount-form-row1">
              <label>Guest Meal</label>
              <input type="checkbox" name="isGuestMeal" checked={form.isGuestMeal} onChange={handleChange1} disabled={isReadOnly} />
            </div>

            <div className="discount-form-row1">
              <label>Active</label>
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange1} disabled={isReadOnly} />
            </div>

            <div className="discount-btn-row1">
              <button onClick={saveData1} className="discount-save-btn1">
                Save
              </button>

              <button onClick={() => setShowForm(false)} className="discount-exit-btn1">
                Exit
              </button>
            </div>

            <div className="discount-form-row1">
              <label>Button BackColor / ForeColor</label>

              <div
                className="discount-preview-box1"
                style={{
                  background: form.Backcolor,
                  color: form.ForeColor
                }}
              >
                {form.Description && form.DiscountPercentage &&
                  `${form.Description} ${form.DiscountPercentage}%`}
              </div>

              <div className="discount-color-btns1">
                <button onClick={() => { setPickerType("bg"); setShowColorPicker(true); }}>
                  Color
                </button>

                <button onClick={() => { setPickerType("text"); setShowColorPicker(true); }}>
                  Text Color
                </button>
              </div>
            </div>

          </div>

          {showColorPicker && (
            <div className="discount-custom-picker1">
              <ChromePicker
                color={pickerType === "bg" ? form.Backcolor : form.ForeColor}
                onChange={(color) => {
                  if (pickerType === "bg") {
                    setForm({ ...form, Backcolor: color.hex });
                  } else {
                    setForm({ ...form, ForeColor: color.hex });
                  }
                }}
              />
              <button onClick={() => setShowColorPicker(false)}>OK</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}