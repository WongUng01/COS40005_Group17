'use client';

const Dashboard = () => {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-blue-700">Department Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome, Head of Department. Here's an overview of student academic cases and activities.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SummaryCard title="Pending Cases" count={12} color="blue" />
        <SummaryCard title="Resolved Cases" count={47} color="green" />
        <SummaryCard title="Students with Timetable Clash" count={4} color="yellow" />
        <SummaryCard title="Repeating Units" count={9} color="red" />
      </div>

      {/* Case Management Table */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Case Submissions</h2>
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-500 uppercase border-b">
            <tr>
              <th className="py-2">Student</th>
              <th>Issue</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[{ name: "Jane Doe", issue: "Timetable Clash", status: "Pending" },
              { name: "John Smith", issue: "Unit Repetition", status: "Pending" },
              { name: "Alex Kim", issue: "Failed Core Unit", status: "In Review" },
            ].map((caseItem, idx) => (
              <tr key={idx}>
                <td className="py-2">{caseItem.name}</td>
                <td>{caseItem.issue}</td>
                <td>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      caseItem.status === "Pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : caseItem.status === "In Review"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {caseItem.status}
                  </span>
                </td>
                <td>
                  <button className="text-sm text-blue-600 hover:underline">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notices / Alerts */}
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-sm">
        <p className="text-sm text-red-800">
          🔔 You have 3 unresolved timetable conflicts and 2 cases awaiting your approval.
        </p>
      </div>
    </div>
  );
};

// Reusable card component
const SummaryCard = ({
  title,
  count,
  color,
}: {
  title: string;
  count: number;
  color: 'blue' | 'green' | 'red' | 'yellow';
}) => {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <div className={`p-4 rounded-md shadow-sm ${colorMap[color]} `}>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  );
};

export default Dashboard;
