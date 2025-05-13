import React, { useState, useEffect } from "react";
// import { apiService } from "@/apiService";

import { apiService } from "@/apiService/apiService.jsx";
// import { apiService } from "../../apiService/apiService"; // ← adjust to match actual file path
// import apiService from "@/apiService/apiService";
// import apiService from "@/apiService/apiService"; // ✅ bypass re-export



// import { usePopup } from "@/app/context/PopupContext";

export  function SendTimeHr() {
  const [attendance, setAttendance] = useState([]);
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [openMonths, setOpenMonths] = useState({});

//   const { show, showMessage } = usePopup();

  useEffect(() => {
    fetchAttendance();
    checkGeolocationPermission();
  }, []);

  const checkGeolocationPermission = async () => {
    if (!navigator.permissions || !navigator.geolocation) return;

    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (status.state === "granted" || status.state === "prompt") {
        getUserLocation();
      } else {
        showMessage("❌ Location not available", "error");
      }

      status.onchange = () => {
        if (status.state === "granted") getUserLocation();
      };
    } catch (err) {
      console.error("Permission check failed:", err);
    }
  };

  const getUserLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ latitude, longitude });
      },
      (err) => {
        console.error("Geolocation error:", err);
        showMessage("❌ Location access denied. Please allow it in settings.", "error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchAttendance = async () => {
    try {
      const data = await apiService.callGet("/timesheet");
      setAttendance(data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const submitTime = async (type) => {
    if (isSubmitting) return;

    if (location.latitude == null || location.longitude == null) {
      show("❌ Location not available. Please allow location access.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiService.callPost("/timesheet", {
        lat: location.latitude,
        long: location.longitude,
        type,
      });
      show(`🟢 Time ${type.toUpperCase()} submitted successfully!`, "success");
      fetchAttendance();
    } catch (err) {
      show(`❌ Failed to submit time ${type.toUpperCase()}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPopup = (date) => {
    setSelectedDate(date);
    setShowPopup(true);
  };

  const closePopup = () => {
    setSelectedDate(null);
    setShowPopup(false);
  };

  const groupByMonth = (records) => {
    const months = {};
    records.forEach((rec) => {
      const month = new Date(rec.createdAt).toLocaleString("default", {
        year: "numeric",
        month: "long",
      });
      if (!months[month]) months[month] = [];
      months[month].push(rec);
    });
    return months;
  };

  const toggleMonth = (month) => {
    setOpenMonths((prev) => ({
      ...prev,
      [month]: !prev[month],
    }));
  };

  const attendanceByMonth = groupByMonth(attendance);

  return (
    <div className="p-6 text-black mt-10 max-w-5xl mx-auto">
      {/* In/Out Buttons */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <button
          onClick={() => submitTime("in")}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded shadow"
          disabled={isSubmitting}
        >
          ✔ Check In
        </button>
        <button
          onClick={() => submitTime("out")}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded shadow"
          disabled={isSubmitting}
        >
          ⏱ Check Out
        </button>
      </div>

      {/* Attendance */}
      {Object.keys(attendanceByMonth).length > 0 ? (
        Object.entries(attendanceByMonth).map(([month, records]) => (
          <div key={month} className="mb-6">
            <button
              onClick={() => toggleMonth(month)}
              className="w-full flex justify-between items-center bg-gray-100 hover:bg-gray-200 px-6 py-3 font-medium rounded border"
            >
              <span>{month}</span>
              <span>{openMonths[month] ? "▲" : "▼"}</span>
            </button>

            {openMonths[month] && (
              <div className="mt-2 border rounded">
                <table className="min-w-full table-auto text-sm">
                  <thead className="bg-gray-50 font-semibold">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Office</th>
                      <th className="px-4 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => (
                      <tr key={rec.id} className="border-t">
                        <td className="px-4 py-2">{new Date(rec.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-2 capitalize">{rec.type}</td>
                        <td className="px-4 py-2">{rec.office?.name}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => openPopup(rec.createdAt)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-xs rounded"
                          >
                            Request Change
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      ) : (
        <p className="text-center text-gray-600">No attendance records available.</p>
      )}

      {/* Request Modal */}
      {showPopup && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded-lg w-96 shadow-md">
            <h3 className="text-lg font-semibold mb-2">Request Change</h3>
            <p className="text-sm mb-4">{new Date(selectedDate).toLocaleString()}</p>
            <textarea
              className="w-full p-2 border rounded mb-4"
              rows={4}
              placeholder="Enter your reason..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={closePopup}
                className="px-4 py-1 text-sm rounded border border-gray-400 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  closePopup();
                  show("✅ Request submitted", "success");
                }}
                className="px-4 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default SendTimeHr;