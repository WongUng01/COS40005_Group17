"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import Link from "next/link";

type Student = {
  student_id: number;
  student_name: string;
  student_course: string;
  student_major: string;
  student_type?: string;
  spm_credit?: boolean;
};

type StudentUnit = {
  id: number;
  student_id: number;
  unit_code: string | null;
  unit_name: string;
  grade: string | null;
  completed: boolean;
  unit_type?: string | null;
};

type PlannerUnit = {
  id: string;
  planner_id: string;
  year: number;
  semester: string;
  unit_code: string | null;
  unit_name: string;
  prerequisites: string | null;
  unit_type: string;
  completed?: boolean;
  // backend uses `replacement` to store the code used to fill electives
  replacement?: string | null;
  replaced_by_name?: string | null;
};

export default function StudentUnitsPage() {
  const { student_id } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [defaultPlanner, setDefaultPlanner] = useState<PlannerUnit[]>([]);
  const [studentUnits, setStudentUnits] = useState<StudentUnit[]>([]);
  const [summary, setSummary] = useState({ completed_count: 0, total_required: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const API_URL = "http://127.0.0.1:8000";
  // const API_URL = "https://cos40005-group17.onrender.com";

  const fetchProgress = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/students/${student_id}/progress`);
      setStudent(data.student);
      setDefaultPlanner(data.default_planner_units || []);
      setStudentUnits(data.student_units || []);
      setSummary(data.summary || { completed_count: 0, total_required: 0 });
    } catch (err) {
      console.error("Failed to fetch progress:", err);
      toast.error("Failed to load student progress");
    } finally {
      setLoading(false);
    }
  }, [student_id]);

  useEffect(() => {
    if (student_id) fetchProgress();
  }, [student_id, fetchProgress]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("overwrite", "true");

    try {
      setUploading(true);
      abortControllerRef.current = new AbortController();
      await axios.post(`${API_URL}/students/${student_id}/upload-units`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: abortControllerRef.current.signal,
      });

      toast.success("Upload successful!");
      fetchProgress();
    } catch (err) {
      toast.error("Upload failed");
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
      abortControllerRef.current = null;
    }
  };

  // Build aligned view: align student units to planner order, handle electives and extras
  const alignedUnits = useMemo(() => {
    // Helper to normalize codes
    const norm = (c: any) => (c ? String(c).trim().toUpperCase() : "");

    // Map student units by code for quick lookup
    const studentMap = new Map<string, StudentUnit>();
    for (const su of studentUnits) {
      if (su.unit_code) studentMap.set(norm(su.unit_code), su);
    }

    const usedCodes = new Set<string>();
    const plannerOrderRows: Array<{
      planner: PlannerUnit;
      student?: StudentUnit | null;
      matched: boolean;
      extra?: boolean;
    }> = [];

    // Build a set of planner codes for quick exclusion test when selecting unmatched extras
    const plannerCodes = new Set<string>();
    for (const pu of defaultPlanner) {
      if (pu.unit_code) plannerCodes.add(norm(pu.unit_code));
      if ((pu as any).replacement) plannerCodes.add(norm((pu as any).replacement));
    }

    const extractReplacementFromName = (name: string | undefined) => {
      if (!name) return null;
      const m = name.match(/\(filled with\s*([A-Z0-9]+)\)/i);
      return m ? m[1].toUpperCase() : null;
    };

    for (const pu of defaultPlanner) {
      const plannerCode = norm(pu.unit_code);
      const replacementCode = norm((pu as any).replacement) || extractReplacementFromName(pu.unit_name || "") || null;

      let matchedStudent: StudentUnit | undefined | null = null;

      if (plannerCode) {
        const s = studentMap.get(plannerCode);
        if (s) {
          matchedStudent = s;
          usedCodes.add(norm(s.unit_code));
        }
      }

      if (!matchedStudent && replacementCode) {
        const s = studentMap.get(replacementCode);
        if (s) {
          matchedStudent = s;
          usedCodes.add(norm(s.unit_code));
        }
      }

      const matched = Boolean(matchedStudent);

      plannerOrderRows.push({
        planner: pu,
        student: matchedStudent ?? null,
        matched,
      });
    }

    // Extra student units (not used to match planner)
    const extras = studentUnits.filter((su) => {
      const code = norm(su.unit_code);
      if (!code) return true; 
      if (usedCodes.has(code)) return false;
      if (plannerCodes.has(code)) {
        usedCodes.add(code);
        return false;
      }
      return true;
    });

    for (const ex of extras) {
      plannerOrderRows.push({
        planner: null as any,
        student: ex,
        matched: false,
        extra: true,
      });
    }

    return plannerOrderRows;
  }, [defaultPlanner, studentUnits]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-red-600"></div>
      </div>
    );
  }

  if (!student) {
    return <div className="text-center text-gray-500 mt-10">Student not found</div>;
  }

  const completionRate =
    summary.total_required > 0
      ? Math.round((summary.completed_count / summary.total_required) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {student.student_name}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {student.student_course} — {student.student_major}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {student.student_type ? `Student Type: ${student.student_type.toUpperCase()}` : ""}
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <label
            htmlFor="unitUpload"
            className={`inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-semibold text-white transition ${
              uploading ? "bg-gray-400 cursor-not-allowed" : "bg-red-700 hover:bg-red-800"
            }`}
          >
            {uploading ? "Uploading..." : "Upload Excel"}
          </label>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="unitUpload" />

          <Link
            href="/information"
            className="px-5 py-2.5 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-900 transition"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-800">Study Progress Overview</h2>
          <span
            className={`text-sm font-semibold ${completionRate === 100 ? "text-green-700" : "text-red-700"}`}
          >
            {completionRate}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
          <div
            className="h-4 bg-gradient-to-r from-red-600 to-red-500 transition-all duration-700"
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {summary.completed_count} / {summary.total_required} units completed
        </p>
      </div>

      {/* Two Columns */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Default Study Planner */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          <div className="bg-red-700 text-white px-5 py-3 font-semibold text-lg rounded-t-xl">Default Study Planner</div>

          {defaultPlanner.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>⚠️ No applicable planner units found for this student.</p>
              <p className="text-xs mt-1">(e.g., International students may not have Malaysian MPU units.)</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-2 border">Year</th>
                    <th className="p-2 border">Sem</th>
                    <th className="p-2 border">Unit Code</th>
                    <th className="p-2 border">Unit Name</th>
                    <th className="p-2 border">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {defaultPlanner.map((unit) => (
                    <tr
                      key={unit.id}
                      className={`border transition ${
                        unit.completed ? "bg-green-50 text-green-700 font-medium" : "bg-white hover:bg-gray-50 text-gray-800"
                      }`}
                    >
                      <td className="p-2 border text-center">{unit.year}</td>
                      <td className="p-2 border text-center">{unit.semester}</td>
                      <td className="p-2 border font-mono text-center">{unit.unit_code || "-"}</td>
                      <td className="p-2 border">
                        <div className="flex items-center flex-wrap">
                          {/\(filled with .*?\)/i.test(unit.unit_name) ? (
                            <>
                              {unit.unit_name.split(/\(filled with .*?\)/i)[0]}
                              <span className="ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 border border-green-200 shadow-sm">
                                {unit.unit_name.match(/\(filled with .*?\)/i)?.[0]}
                              </span>
                            </>
                          ) : (
                            <span>{unit.unit_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 border text-center">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            unit.unit_type === "Major"
                              ? "bg-red-100 text-red-700"
                              : unit.unit_type === "Core"
                              ? "bg-blue-100 text-blue-700"
                              : unit.unit_type === "Elective"
                              ? "bg-green-100 text-green-700"
                              : unit.unit_type === "MPU"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {unit.unit_type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 flex gap-5 text-xs text-gray-600 border-t bg-gray-50 rounded-b-xl">
                <div>
                  <span className="inline-block w-3 h-3 bg-green-50 border border-green-300 mr-1"></span>
                  Completed
                </div>
                <div>
                  <span className="inline-block w-3 h-3 bg-white border border-gray-300 mr-1"></span>
                  Pending
                </div>
              </div>
            </>
          )}
        </div>

        {/* Student Completed Units (aligned) */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          <div className="bg-red-700 text-white px-5 py-3 font-semibold text-lg rounded-t-xl">Student Completed Units</div>

          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 border">Unit Code</th>
                <th className="p-2 border">Unit Name</th>
                <th className="p-2 border">Grade</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {alignedUnits.map((row, idx) => {
                const rowIsMatched = row.matched;
                const plannerUnit = row.planner;
                const studentUnit = row.student ?? null;

                const trClass = `border transition ${rowIsMatched ? "bg-green-50 text-green-700 font-medium" : "bg-white hover:bg-gray-50 text-gray-800"}`;

                const displayCode = studentUnit?.unit_code ?? (plannerUnit?.unit_code ?? "-");
                const displayName =
                  studentUnit?.unit_name ??
                  plannerUnit?.unit_name ??
                  "-";

                const displayGrade = studentUnit?.grade ?? "-";

                return (
                  <tr key={idx} className={trClass}>
                    <td className="p-2 border font-mono text-center">{displayCode || "-"}</td>
                    <td className="p-2 border">
                      <div className="flex items-center flex-wrap">
                        {studentUnit ? (
                          <span>{displayName}</span>
                        ) : plannerUnit && /\(filled with .*?\)/i.test(plannerUnit.unit_name) ? (
                          <>
                            <span>{plannerUnit.unit_name.split(/\(filled with .*?\)/i)[0]}</span>
                            <span className="ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 shadow-sm">
                              {plannerUnit.unit_name.match(/\(filled with .*?\)/i)?.[0]}
                            </span>
                          </>
                        ) : (
                          <span>{plannerUnit?.unit_name ?? "-"}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 border text-center font-semibold text-gray-700">{displayGrade}</td>
                    <td className="p-2 border text-center">
                      {studentUnit ? (
                        studentUnit.completed ? (
                          <span className="text-green-700 font-medium">✅ Completed</span>
                        ) : (
                          <span className="text-red-600 font-medium">❌ Incomplete</span>
                        )
                      ) : plannerUnit ? (
                        // planner row with no student match
                        <span className="text-red-600 font-medium">❌ Not Taken</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}