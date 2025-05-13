// CassSystem.jsx
import React, { useEffect, useState } from "react";
import { products as mockProducts } from "./mockData";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function CassSystem() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [taxMode, setTaxMode] = useState("with");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [companyReg, setCompanyReg] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("invoiceHistory") || "[]");
    setHistory(stored);
    if (!invoiceNumber) {
      const lastNum = stored.length > 0 ? parseInt(stored[stored.length - 1].invoiceNumber.slice(3)) : 0;
      const newInvoiceNum = "INV" + String(lastNum + 1).padStart(5, "0");
      setInvoiceNumber(newInvoiceNum);
    }
  }, []);

  const handleSearchEnter = (e) => {
    if (e.key === "Enter") {
      const matched = mockProducts.find((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
      if (matched) addToCart(matched);
      setSearch("");
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { ...product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (id, value) => {
    const qty = parseInt(value);
    if (!isNaN(qty) && qty >= 0) {
      setCart((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: qty } : item
        )
      );
    }
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = taxMode === "with" ? subtotal * 1.1 : subtotal * 0.9;

  const generatePDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(12);
    doc.text("Company Reg No: " + companyReg, 14, 15);
    doc.text("Date: " + new Date().toLocaleString(), 14, 22);
    doc.text("Invoice #: " + invoiceNumber, 14, 29);
    doc.text("Customer: " + customerName, 14, 36);
    doc.text("Phone: " + customerPhone, 14, 43);

    const tableData = cart.map((item) => [
      item.name,
      item.description || "-",
      item.quantity,
      item.unit,
      `$${item.price}`,
      `$${(item.quantity * item.price).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [["Product", "Description", "Qty", "Unit", "Price", "Total"]],
      body: tableData
    });

    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
    doc.text(`Total (${taxMode === "with" ? "+10%" : "-10%"}): $${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 16);
    doc.text("Signature: _________________________", 14, doc.lastAutoTable.finalY + 30);

    const pdfBlob = doc.output("bloburl");
    window.open(pdfBlob);

    const newRecord = {
      invoiceNumber,
      customerName,
      customerPhone,
      companyReg,
      date: new Date().toLocaleString(),
      cart,
      total: total.toFixed(2)
    };
    const updatedHistory = [...history, newRecord];
    localStorage.setItem("invoiceHistory", JSON.stringify(updatedHistory));
    setHistory(updatedHistory);
  }; 
  return (
    <div className="flex gap-6 p-6 text-black font-sans max-w-7xl mx-auto">
      <div className="w-1/2">
        <h2 className="text-2xl font-bold mb-4">🧾 Order Info</h2>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer Name"
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="text"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          placeholder="Invoice Number"
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="text"
          value={companyReg}
          onChange={(e) => setCompanyReg(e.target.value)}
          placeholder="Company Reg No"
          className="w-full mb-4 p-2 border rounded"
        />

        <h2 className="text-2xl font-bold mb-4">🛒 Product List</h2>
        <input
          type="text"
          value={search}
          placeholder="Scan or type barcode and press Enter..."
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchEnter}
          className="w-full p-2 border rounded mb-4"
        />

        <div className="grid grid-cols-1 gap-4">
          {mockProducts.map((p) => (
            <div key={p.id} className="border p-3 rounded bg-white shadow">
              <p className="font-semibold text-lg">{p.name}</p>
              <p className="text-sm text-gray-500">Price: ${p.price}</p>
              <p className="text-sm text-gray-500">{p.description || "No description."}</p>
              <p className="text-sm text-gray-500">Unit: {p.unit}</p>
              <button
                onClick={() => addToCart(p)}
                className="mt-2 bg-blue-600 text-white px-4 py-1 rounded"
              >
                + Add to Cart
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="w-1/2">
        <h2 className="text-2xl font-bold mb-4">🧾 Cart</h2>
        {cart.length === 0 ? (
          <p>No items in cart.</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2">Description</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Price</th>
                <th className="p-2">Remove</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.description || "-"}</td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, e.target.value)}
                      className="w-16 text-center border rounded"
                    />
                  </td>
                  <td className="p-2 text-center">{item.unit}</td>
                  <td className="p-2 text-center">${item.price}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 flex justify-between items-center">
          <div className="space-x-2">
            <button
              className={`px-3 py-1 border rounded ${taxMode === "with" ? "bg-green-600 text-white" : "bg-white"}`}
              onClick={() => setTaxMode("with")}
            >
              With Tax (+10%)
            </button>
            <button
              className={`px-3 py-1 border rounded ${taxMode === "without" ? "bg-red-600 text-white" : "bg-white"}`}
              onClick={() => setTaxMode("without")}
            >
              Without Tax (-10%)
            </button>
          </div>
          <div className="text-lg font-bold">Total: ${total.toFixed(2)}</div>
          <button
            onClick={generatePDF}
            className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
          >
            🖨 Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}