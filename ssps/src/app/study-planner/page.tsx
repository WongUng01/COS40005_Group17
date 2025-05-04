"use client";

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Input, Select, Table, Button, Tabs, message } from 'antd';

const { Option } = Select;

interface Unit {
  code: string;
  name: string;
  prerequisite: string;
}

interface PlannerRow {
  year: number;
  semester: number;
  unitCode: string;
  unitName: string;
  prerequisite: string;
}

interface StudyPlanner {
  name: string;
  units: PlannerRow[];
}

const StudyPlannerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [unitOptions, setUnitOptions] = useState<Unit[]>([]);
  const [planners, setPlanners] = useState<StudyPlanner[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [tableData, setTableData] = useState<PlannerRow[]>([
    { year: 1, semester: 1, unitCode: '', unitName: '', prerequisite: '' }
  ]);

  useEffect(() => {
    fetchUnits();
    fetchPlanners();
  }, []);

  const fetchUnits = async () => {
    try {
      const res = await axios.get<Unit[]>('http://localhost:8000/units');
      setUnitOptions(res.data);
    } catch (err) {
      message.error('Failed to fetch units');
    }
  };

  const fetchPlanners = async () => {
    try {
      const res = await axios.get<StudyPlanner[]>('http://localhost:8000/study_planners/');
      setPlanners(res.data);
    } catch (err) {
      message.error('Failed to fetch planners');
    }
  };

  const handleChange = (value: any, index: number, key: keyof PlannerRow) => {
    const updated = [...tableData];
    updated[index][key] = value;

    if (key === 'unitCode') {
      const selected = unitOptions.find(unit => unit.code === value);
      updated[index].unitName = selected?.name || '';
      updated[index].prerequisite = selected?.prerequisite || '';
    }

    setTableData(updated);
  };

  const addRow = () => {
    setTableData([
      ...tableData,
      { year: 1, semester: 1, unitCode: '', unitName: '', prerequisite: '' }
    ]);
  };

  const savePlanner = async () => {
    if (!templateName) {
      message.warning('Please enter a template name');
      return;
    }

    const planner: StudyPlanner = {
      name: templateName,
      units: tableData
    };

    try {
      await axios.post('http://localhost:8000/study_planners/', planner);
      message.success('Planner saved');
      setTemplateName('');
      setTableData([{ year: 1, semester: 1, unitCode: '', unitName: '', prerequisite: '' }]);
      fetchPlanners();
    } catch (err) {
      message.error('Failed to save planner');
    }
  };

  const inputColumns = [
    {
      title: 'Year',
      dataIndex: 'year',
      render: (_: any, record: PlannerRow, index: number) => (
        <Input
          type="number"
          value={record.year}
          onChange={e => handleChange(Number(e.target.value), index, 'year')}
        />
      )
    },
    {
      title: 'Semester',
      dataIndex: 'semester',
      render: (_: any, record: PlannerRow, index: number) => (
        <Input
          type="number"
          value={record.semester}
          onChange={e => handleChange(Number(e.target.value), index, 'semester')}
        />
      )
    },
    {
      title: 'Unit Code',
      dataIndex: 'unitCode',
      render: (_: any, record: PlannerRow, index: number) => (
        <Select
          showSearch
          style={{ width: 150 }}
          value={record.unitCode}
          onChange={val => handleChange(val, index, 'unitCode')}
        >
          {unitOptions.map(unit => (
            <Option key={unit.code} value={unit.code}>
              {unit.code}
            </Option>
          ))}
        </Select>
      )
    },
    {
      title: 'Unit Name',
      dataIndex: 'unitName',
      render: (_: any, record: PlannerRow) => <Input value={record.unitName} readOnly />
    },
    {
      title: 'Prerequisite',
      dataIndex: 'prerequisite',
      render: (_: any, record: PlannerRow) => <Input value={record.prerequisite} readOnly />
    }
  ];

  const displayColumns = useMemo(() => {
    return [
      { title: 'Year', dataIndex: 'year' },
      { title: 'Semester', dataIndex: 'semester' },
      { title: 'Unit Code', dataIndex: 'unitCode' },
      { title: 'Unit Name', dataIndex: 'unitName' },
      { title: 'Prerequisite', dataIndex: 'prerequisite' }
    ];
  }, []);

  const generateRowKey = (record: PlannerRow) => {
    // Use a combination of properties to create a unique key for each row
    return `${record.year}-${record.semester}-${record.unitCode || 'no-unit-code'}`;
  };  

  const tabItems = [
    {
      key: 'create',
      label: 'Create Planner',
      children: (
        <>
          <Input
            placeholder="Template Name"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            style={{ width: 300, marginBottom: 20 }}
          />

          <Table
            dataSource={tableData}
            columns={inputColumns}
            rowKey={generateRowKey}
            pagination={false}
          />

          <Button type="dashed" onClick={addRow} style={{ marginTop: 16 }}>
            Add Row
          </Button>

          <Button type="primary" onClick={savePlanner} style={{ marginLeft: 16 }}>
            Save Planner
          </Button>
        </>
      )
    },
    {
      key: 'saved',
      label: 'Saved Planners',
      children: planners.length === 0 ? (
        <p>No saved planners found.</p>
      ) : (
        planners.map((planner, idx) => (
          <div key={planner.name + idx} style={{ marginBottom: '2rem' }}>
            <h4>{planner.name}</h4>
            <Table
              dataSource={planner.units}
              columns={displayColumns}
              rowKey={generateRowKey}
              pagination={false}
              size="small"
            />
          </div>
        ))
      )
    }
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Study Planner</h2>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  );
};

export default StudyPlannerPage;
