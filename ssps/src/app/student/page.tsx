'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Student {
  id: number;
  name: string;
  graduation_status: string;
}

const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, graduation_status');

      if (error) {
        console.error('Error fetching students:', error);
      } else {
        setStudents(data as Student[]);
      }
    };

    fetchStudents();
  }, []);

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  };

  const cellStyle: React.CSSProperties = {
    padding: '12px',
    textAlign: 'left',
    border: '1px solid #ddd',
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#f4f4f4',
    fontWeight: 'bold',
  };

  const rowStyle: React.CSSProperties = {
    backgroundColor: '#f9f9f9',
  };

  return (
    <div style={{ width: '80%', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '20px' }}>Students List</h1>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...cellStyle, ...headerStyle }}>Student ID</th>
            <th style={{ ...cellStyle, ...headerStyle }}>Name</th>
            <th style={{ ...cellStyle, ...headerStyle }}>Graduation Status</th>
            <th style={{ ...cellStyle, ...headerStyle }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} style={rowStyle}>
              <td style={cellStyle}>{student.id}</td>
              <td style={cellStyle}>{student.name}</td>
              <td style={cellStyle}>{student.graduation_status}</td>
              <td style={cellStyle}>
                <Link href={`/student-details?id=${student.id}`}>
                  <button
                    style={{
                      backgroundColor: '#0070f3',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentsPage;
