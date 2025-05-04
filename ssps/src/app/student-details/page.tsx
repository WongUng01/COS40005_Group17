'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StudentUnit {
  unit_code: string;
  unit_name: string;
  grade: string;
  completed: boolean;
}

const StudentDetailPage: React.FC = () => {
  const searchParams = useSearchParams();
  const studentId = Number(searchParams.get('id'));

  const [studentName, setStudentName] = useState('');
  const [units, setUnits] = useState<StudentUnit[]>([]);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId) return;

      // Fetch student name
      const studentRes = await supabase
        .from('students')
        .select('name')
        .eq('id', studentId)
        .single();

      if (studentRes.data) {
        setStudentName(studentRes.data.name);
      }

      // Fetch student's unit details
      const unitRes = await supabase
        .from('student_units')
        .select('unit_code, unit_name, grade, completed')
        .eq('student_id', studentId);

      if (unitRes.data) {
        setUnits(unitRes.data as StudentUnit[]);
      }
    };

    fetchStudentData();
  }, [studentId]);

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '20px' }}>
        Student Details
      </h1>

      <div style={{
        backgroundColor: '#f9f9f9',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        marginBottom: '30px'
      }}>
        <p><strong>Name:</strong> {studentName}</p>
        <p><strong>ID:</strong> {studentId}</p>
      </div>

      <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Enrolled Units & Grades</h2>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: '#fff',
        border: '1px solid #ddd'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th style={headerCellStyle}>Unit Code</th>
            <th style={headerCellStyle}>Unit Name</th>
            <th style={headerCellStyle}>Grade</th>
            <th style={headerCellStyle}>Completed</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit, index) => (
            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff' }}>
              <td style={cellStyle}>{unit.unit_code}</td>
              <td style={cellStyle}>{unit.unit_name}</td>
              <td style={cellStyle}>{unit.grade}</td>
              <td style={cellStyle}>{unit.completed ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const headerCellStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  borderBottom: '2px solid #ddd',
  fontWeight: 'bold'
};

const cellStyle: React.CSSProperties = {
  padding: '12px',
  borderBottom: '1px solid #ddd'
};

export default StudentDetailPage;
