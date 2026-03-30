import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function AnalyticsPage() {

  const { id } = useParams();
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get(`/exam/results/${id}`)
      .then(res => {

        console.log("ANALYTICS RAW:", res.data); // DEBUG

        // 🔥 FIXED DATA HANDLING
        if (Array.isArray(res.data)) {
          setData(res.data);
        } else if (Array.isArray(res.data.results)) {
          setData(res.data.results);
        } else {
          setData([]);
        }

      })
      .catch(err => {
        console.error(err);
        alert("Failed to load analytics");
      });
  }, [id]);

  // Safe mapping
  const scoreData = data.map(d => ({
    name: d.name || "Student",
    score: Number(d.score) || 0
  }));

  const passCount = data.filter(d => {
    const score = Number(d.score) || 0;
    const total = Number(d.total_marks) || 1;
    return score >= total * 0.4;
  }).length;

  const failCount = data.length - passCount;

  const pieData = [
    { name: "Pass", value: passCount },
    { name: "Fail", value: failCount }
  ];

  const COLORS = ["#22c55e", "#ef4444"];

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-10">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-3xl font-bold mb-10 text-center">
          Exam Analytics
        </h1>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-10">

          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4">Student Scores</h2>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4">Pass vs Fail</h2>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" outerRadius={100} label>
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Cheat logs */}
        <div className="mt-10 bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Cheating Activity</h2>

          {data.length === 0 ? (
            <p>No data available</p>
          ) : (
            data.map((d, i) => (
              <p key={i}>
                {d.name}: {d.cheat_count || 0} suspicious actions
              </p>
            ))
          )}
        </div>

        {/* Table */}
        <div className="mt-10 bg-white p-6 rounded-xl shadow">

          <h2 className="text-lg font-semibold mb-4">Detailed Results</h2>

          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Score</th>
                <th className="p-2">Total</th>
                <th className="p-2">Cheat Logs</th>
              </tr>
            </thead>

            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="text-center border-t">
                  <td className="p-2">{d.name}</td>
                  <td className="p-2">{d.score}</td>
                  <td className="p-2">{d.total_marks}</td>
                  <td className="p-2">{d.cheat_count || 0}</td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}