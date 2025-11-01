"use client";

import Select from "react-select";
import React, { useEffect, useState } from "react";
import { Bar, Pie, Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  LineController,
  BarController,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LineController,
  BarController 
);

//const API = "http://127.0.0.1:8000";
// const API = "http://localhost:8000";
const API = "https://cos40005-group17.onrender.com";


export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [graduationSummary, setGraduationSummary] = useState<any[]>([]);
  const [gradeDist, setGradeDist] = useState<any>({ grades: {}, available_units: [] });
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [unitPerformance, setUnitPerformance] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const availableUnits = gradeDist.available_units || [];

  useEffect(() => {
    async function loadAll() {
      setLoading(true);

      async function safeFetch(url: string) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (err) {
          console.error(`❌ ${url} failed:`, err);
          return null;
        }
      }

      try {
        const [ov, gs, gd, up, tr] = await Promise.all([
          safeFetch(`${API}/api/analytics/overview`),
          safeFetch(`${API}/api/analytics/graduation-summary`),
          safeFetch(`${API}/api/analytics/grade-distribution`),
          safeFetch(`${API}/api/analytics/unit-performance`),
          safeFetch(`${API}/api/analytics/trends`),
        ]);

        if (ov) setOverview(ov);
        if (gs) setGraduationSummary(gs);
        if (gd) setGradeDist(gd);
        if (up) setUnitPerformance(up);
        if (tr) setTrends(tr);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  useEffect(() => {
    const url = selectedUnit
      ? `${API}/api/analytics/grade-distribution?unit_code=${selectedUnit}`
      : `${API}/api/analytics/grade-distribution`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => setGradeDist(data))
      .catch((err) => console.error(err));
  }, [selectedUnit]);

  if (loading || !overview) {
    return (
      <div className="p-10 text-gray-600 text-center font-medium animate-pulse">
        Loading Swinburne Analytics Dashboard...
      </div>
    );
  }

  const allPrograms: string[] = Array.from(
    new Set(
      (overview?.students_by_program_major ?? []).map((r: any) =>
        String(r.program)
      )
    )
  );

  const gradeColors: Record<string, string> = {
    HD: "#D32F2F",
    D: "#F57C00",
    C: "#FBC02D",
    P: "#388E3C",
    N: "#9E9E9E",
    TRF: "#0288D1",
    NAN: "#616161",
  };

  return (
    <div className="p-8 space-y-12 bg-[#F9FAFB] min-h-screen">
      {/* 🔴 Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-[#D32F2F] tracking-tight">
          Swinburne Analytics Dashboard
        </h1>
      </div>

      {/* 🎯 Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            title: "Total Students",
            value:
              overview?.students_by_year?.reduce(
                (sum: number, r: any) => sum + (r.total_students || 0),
                0
              ) ?? 0,
            color: "#D32F2F",
          },
          {
            title: "Current Students",
            value:
              overview?.graduation_by_year?.reduce(
                (sum: number, r: any) => sum + (r.not_graduated || 0),
                0
              ) ?? 0,
            color: "#FBC02D",
          },
          {
            title: "Graduated Students",
            value:
              overview?.graduation_by_year?.reduce(
                (sum: number, r: any) => sum + (r.graduated || 0),
                0
              ) ?? 0,
            color: "#388E3C",
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center hover:shadow-lg transition-all duration-200"
          >
            <h3 className="text-gray-500 text-sm font-medium mb-2 uppercase tracking-wide">
              {card.title}
            </h3>
            <p
              className="text-3xl font-bold"
              style={{ color: card.color }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </section>

      {/* 🧱 Overview Section */}
      <section className="bg-white rounded-2xl shadow p-6 border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-[#1A1A1A]">
          Student Overview
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Students by Year</h3>
            <Bar
              data={{
                labels: overview.students_by_year.map((r: any) => r.intake_year),
                datasets: [
                  {
                    label: "Total Students",
                    backgroundColor: "#D32F2F",
                    data: overview.students_by_year.map(
                      (r: any) => r.total_students
                    ),
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
              }}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">
              Graduation Status by Year
            </h3>
            <Bar
              data={{
                labels: overview.graduation_by_year.map((r: any) => r.intake_year),
                datasets: [
                  {
                    label: "Graduated",
                    backgroundColor: "#388E3C",
                    data: overview.graduation_by_year.map(
                      (r: any) => r.graduated
                    ),
                  },
                  {
                    label: "Not Graduated",
                    backgroundColor: "#D32F2F",
                    data: overview.graduation_by_year.map(
                      (r: any) => r.not_graduated
                    ),
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { position: "bottom" } },
              }}
            />
          </div>
        </div>
      </section>

      {/* 🎓 Graduation & Students Summary (Side-by-Side Charts) */}
      <section className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-700">
          Student Distribution & Graduation
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {/* 🧭 Students by Program & Major */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Students by Program & Major</h3>

            <div className="mb-4">
              <label className="font-medium text-gray-600 mr-3">Select Program:</label>
              <select
                className="border rounded-md px-3 py-1"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
              >
                <option value="">All Programs</option>
                {allPrograms.map((p: string) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const activeStudents =
                overview.students_by_program_major.filter((r: any) => !r.graduation_status);

              const data = selectedProgram
                ? activeStudents
                    .filter((r: any) => r.program === selectedProgram)
                    .reduce((acc: any, curr: any) => {
                      acc[curr.major] = (acc[curr.major] || 0) + curr.total_students;
                      return acc;
                    }, {})
                : activeStudents.reduce((acc: any, curr: any) => {
                    acc[curr.program] = (acc[curr.program] || 0) + curr.total_students;
                    return acc;
                  }, {});

              return (
                <div className="flex justify-center">
                  <div style={{ width: "300px", height: "300px" }}>
                    <Pie
                      data={{
                        labels: Object.keys(data),
                        datasets: [
                          {
                            label: "Active Students",
                            data: Object.values(data),
                            backgroundColor: [
                              "#60a5fa",
                              "#f97316",
                              "#22c55e",
                              "#a855f7",
                              "#f43f5e",
                              "#14b8a6",
                              "#eab308",
                            ],
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: { boxWidth: 12, font: { size: 12 } },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 🎓 Graduation Summary */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Graduation Summary</h3>

            <div className="mb-4">
              <label className="font-medium text-gray-600 mr-3">Select Program:</label>
              <select
                className="border rounded-md px-3 py-1"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
              >
                <option value="">All Programs</option>
                {allPrograms.map((p: string) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const filtered = selectedProgram
                ? graduationSummary.filter((r) => r.program === selectedProgram)
                : graduationSummary;

              const data = selectedProgram
                ? filtered.reduce((acc: any, curr: any) => {
                    acc[curr.major] = (acc[curr.major] || 0) + curr.graduates;
                    return acc;
                  }, {})
                : filtered.reduce((acc: any, curr: any) => {
                    acc[curr.program] = (acc[curr.program] || 0) + curr.graduates;
                    return acc;
                  }, {});

              return (
                <div className="flex justify-center">
                  <div style={{ width: "300px", height: "300px" }}>
                    <Pie
                      data={{
                        labels: Object.keys(data),
                        datasets: [
                          {
                            label: "Graduates",
                            data: Object.values(data),
                            backgroundColor: [
                              "#60a5fa",
                              "#f97316",
                              "#22c55e",
                              "#a855f7",
                              "#f43f5e",
                              "#14b8a6",
                              "#eab308",
                            ],
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: { boxWidth: 12, font: { size: 12 } },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* 📈 Graduation Trends */}
      <section className="bg-white rounded-2xl shadow p-6 border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-[#1A1A1A]">
          Graduation Trends
        </h2>
        <div className="h-[400px]">
          <Chart
            type="bar"
            data={{
              labels: trends.map((r: any) => Number(r.year)),
              datasets: [
                {
                  type: "bar",
                  label: "Graduated",
                  data: trends.map((r: any) => r.graduated),
                  backgroundColor: "#388E3C",
                  yAxisID: "y",
                },
                {
                  type: "bar",
                  label: "Not Graduated",
                  data: trends.map((r: any) => r.not_graduated),
                  backgroundColor: "#D32F2F",
                  yAxisID: "y",
                },
                {
                  type: "line",
                  label: "Graduation Rate (%)",
                  data: trends.map((r: any) =>
                    (
                      (r.graduated / (r.graduated + r.not_graduated)) *
                      100
                    ).toFixed(1)
                  ),
                  borderColor: "#FBC02D",
                  borderWidth: 2,
                  yAxisID: "y1",
                  tension: 0.3,
                  fill: false,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { beginAtZero: true },
                y1: {
                  position: "right",
                  beginAtZero: true,
                  min: 0,
                  max: 100,
                },
              },
              plugins: {
                legend: { position: "bottom" },
              },
            }}
          />
        </div>
      </section>

      {/* 🧩 Unit Performance */}
      <section className="bg-white rounded-2xl p-6 shadow border border-gray-100">
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">
          Unit Performance Overview
        </h2>
        <Bar
          data={{
            labels: unitPerformance.map((u: any) => u.unit_code),
            datasets: [
              {
                label: "Avg Grade Point",
                data: unitPerformance.map((u: any) => u.avg_grade),
                backgroundColor: "#FBC02D",
              },
              {
                label: "Completion Rate (%)",
                data: unitPerformance.map((u: any) => u.completion_rate),
                backgroundColor: "#388E3C",
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { position: "bottom" } },
            scales: { y: { beginAtZero: true, max: 100 } },
          }}
        />
      </section>

      {/* 🧠 Grade Distribution */}
      <section className="bg-white rounded-2xl p-6 shadow border border-gray-100">
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">
          Unit Grades Distribution
        </h2>
        <div className="flex items-center gap-3 mb-4">
          <label className="font-medium text-gray-700">Select Unit:</label>
          <div className="min-w-[250px]">
            <Select
              options={[
                { value: "", label: "All Units" },
                ...(gradeDist.available_units || []).map((u: string) => ({
                  value: u,
                  label: u,
                })),
              ]}
              value={
                selectedUnit
                  ? { value: selectedUnit, label: selectedUnit }
                  : { value: "", label: "All Units" }
              }
              onChange={(opt) => setSelectedUnit(opt?.value || "")}
              placeholder="Search or select unit..."
              isSearchable
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: "#D32F2F",
                  boxShadow: "none",
                  "&:hover": { borderColor: "#B71C1C" },
                }),
              }}
            />
          </div>
        </div>

        <div className="flex justify-end mb-3">
          <button
            onClick={() => setChartType(chartType === "bar" ? "pie" : "bar")}
            className="text-sm font-medium text-[#D32F2F] hover:underline"
          >
            Switch to {chartType === "bar" ? "Pie" : "Bar"} View
          </button>
        </div>

        <div className="flex justify-center">
          <div style={{ width: "400px", height: "350px" }}>
            {(() => {
              const labels = Object.keys(gradeDist.grades);
              const dataValues = Object.values(gradeDist.grades);
              const backgroundColors = labels.map(
                (grade) => gradeColors[grade] || "#ccc"
              );

              const chartData = {
                labels,
                datasets: [
                  {
                    label: `Grades (${selectedUnit || "All Units"})`,
                    data: dataValues,
                    backgroundColor: backgroundColors,
                  },
                ],
              };

              const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom" as const },
                  title: {
                    display: true,
                    text: `Grade Distribution for ${selectedUnit || "All Units"}`,
                    color: "#1A1A1A",
                    font: { weight: "bold" as const },
                  },
                },
                scales:
                  chartType === "bar"
                    ? { y: { beginAtZero: true } }
                    : {},
              };

              return chartType === "bar" ? (
                <Bar data={chartData} options={options} />
              ) : (
                <Pie data={chartData} options={options} />
              );
            })()}
          </div>
        </div>
      </section>
    </div>
  );
}
