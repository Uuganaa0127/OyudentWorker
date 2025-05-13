// CassSystem.jsx
import React, { useEffect, useState } from "react";
import { products as mockProducts } from "./mockData";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function InvoiceList() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [taxMode, setTaxMode] = useState("with");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [companyReg, setCompanyReg] = useState("");
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState({ date: "", companyReg: "" });
  const [preview, setPreview] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 5;

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

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredHistory);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, "invoice_history.xlsx");
  };

  const filteredHistory = history.filter(h => {
    const dateMatch = filter.date ? h.date.includes(filter.date) : true;
    const regMatch = filter.companyReg ? h.companyReg.includes(filter.companyReg) : true;
    return dateMatch && regMatch;
  });

  const paginated = filteredHistory.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-6 text-black font-sans max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">📋 Invoice History</h2>
      <div className="flex gap-4 mb-4">
        <input
          type="date"
          value={filter.date}
          onChange={(e) => setFilter({ ...filter, date: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Company Reg No"
          value={filter.companyReg}
          onChange={(e) => setFilter({ ...filter, companyReg: e.target.value })}
          className="border p-2 rounded"
        />
        <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded">
          📥 Export to Excel
        </button>
      </div>
      <table className="w-full border text-sm mb-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Invoice #</th>
            <th className="p-2">Customer</th>
            <th className="p-2">Phone</th>
            <th className="p-2">Date</th>
            <th className="p-2">Total</th>
            <th className="p-2">Print</th>
            <th className="p-2">Preview</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((record, idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2">{record.invoiceNumber}</td>
              <td className="p-2">{record.customerName}</td>
              <td className="p-2">{record.customerPhone}</td>
              <td className="p-2">{record.date}</td>
              <td className="p-2">${record.total}</td>
              <td className="p-2">
                <button
                  onClick={() => printInvoice(record)}
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  🖨 Print
                </button>
              </td>
              <td className="p-2">
                <button
                  onClick={() => setPreview(record)}
                  className="bg-gray-600 text-white px-3 py-1 rounded"
                >
                  👁️ Preview
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 border rounded"
        >
          ◀ Prev
        </button>
        <span className="text-sm">Page {page}</span>
        <button
          disabled={page * perPage >= filteredHistory.length}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 border rounded"
        >
          Next ▶
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[600px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Preview: {preview.invoiceNumber}</h3>
            <p>Customer: {preview.customerName}</p>
            <p>Phone: {preview.customerPhone}</p>
            <p>Date: {preview.date}</p>
            <p>Company Reg: {preview.companyReg}</p>
            <p>Total: ${preview.total}</p>
            <ul className="mt-4 list-disc list-inside">
              {preview.cart.map((item, i) => (
                <li key={i}>
                  {item.name} - {item.quantity} {item.unit} @ ${item.price} each
                </li>
              ))}
            </ul>
            <div className="text-right mt-6">
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 bg-red-500 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
