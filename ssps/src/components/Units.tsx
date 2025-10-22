'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Unit = {
  id: string;
  unit_code: string;
  unit_name: string;
  prerequisites: string;
  concurrent_prerequisite: string; // 修复：使用正确的列名
  offered_terms: string;
  credit_point: number;
};

// Unit Modal Component
function UnitModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  formData, 
  setFormData, 
  mode,
  isSubmitting
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  formData: Partial<Unit>;
  setFormData: (data: Partial<Unit>) => void;
  mode: 'add' | 'edit';
  isSubmitting: boolean;
}) {
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-[#D6001C]">
            {mode === 'add' ? 'Add New Unit' : 'Edit Unit'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Code *
              </label>
              <input
                type="text"
                placeholder="e.g., ICT10001"
                value={formData.unit_code}
                onChange={(e) => setFormData({ ...formData, unit_code: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D6001C] focus:border-transparent"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Introduction to Programming"
                value={formData.unit_name}
                onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D6001C] focus:border-transparent"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credit Points *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g., 12.5"
                value={formData.credit_point || ''}
                onChange={(e) => setFormData({ ...formData, credit_point: parseFloat(e.target.value) || 0 })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D6001C] focus:border-transparent"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Offered Terms
              </label>
              <input
                type="text"
                placeholder="e.g., Semester 1, Semester 2"
                value={formData.offered_terms || ''}
                onChange={(e) => setFormData({ ...formData, offered_terms: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D6001C] focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prerequisites
              </label>
              <input
                type="text"
                placeholder="e.g., ICT10001, ICT10002"
                value={formData.prerequisites || ''}
                onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D6001C] focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concurrent Prerequisites
              </label>
              <input
                type="text"
                placeholder="e.g., ICT10003"
                value={formData.concurrent_prerequisite || ''} // 修复：使用正确的字段名
                onChange={(e) => setFormData({ ...formData, concurrent_prerequisite: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D6001C] focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[#D6001C] text-white rounded-lg hover:bg-[#B00018] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {mode === 'add' ? 'Adding...' : 'Updating...'}
                </span>
              ) : (
                mode === 'add' ? 'Add Unit' : 'Update Unit'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Units() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [formData, setFormData] = useState<Partial<Unit>>({
    unit_code: '',
    unit_name: '',
    prerequisites: '',
    concurrent_prerequisite: '', // 修复：使用正确的字段名
    offered_terms: '',
    credit_point: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const API = 'http://localhost:8000';

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const res = await fetch(`${API}/units`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load units');
    }
  };

  // 改进的错误处理函数
  const parseErrorMessage = (errorText: string): string => {
    try {
      const errorData = JSON.parse(errorText);
      
      // 处理数组错误
      if (Array.isArray(errorData)) {
        return errorData.map(err => {
          if (typeof err === 'object' && err !== null) {
            return err.message || err.detail || JSON.stringify(err);
          }
          return String(err);
        }).join(', ');
      }
      
      // 处理对象错误
      if (typeof errorData === 'object' && errorData !== null) {
        return errorData.detail || errorData.message || JSON.stringify(errorData);
      }
      
      return String(errorData);
    } catch {
      return errorText;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let response;
      if (editingId) {
        // 修复：使用正确的字段名
        const payload = {
          unit_code: formData.unit_code,
          unit_name: formData.unit_name,
          prerequisites: formData.prerequisites,
          concurrent_prerequisite: formData.concurrent_prerequisite, // 修复字段名
          offered_terms: formData.offered_terms,
          credit_point: formData.credit_point
        };

        response = await fetch(`${API}/units/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          const errorMessage = parseErrorMessage(errorText);
          throw new Error(errorMessage);
        }
        
        toast.success('Unit updated successfully');
      } else {
        // 创建新单元 - 使用正确的字段名
        const payload = {
          unit_code: formData.unit_code,
          unit_name: formData.unit_name,
          prerequisites: formData.prerequisites,
          concurrent_prerequisite: formData.concurrent_prerequisite, // 修复字段名
          offered_terms: formData.offered_terms,
          credit_point: formData.credit_point
        };

        response = await fetch(`${API}/units`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          const errorMessage = parseErrorMessage(errorText);
          throw new Error(errorMessage);
        }
        
        toast.success('Unit added successfully');
      }

      // 重置表单并关闭模态框
      setFormData({
        unit_code: '',
        unit_name: '',
        prerequisites: '',
        concurrent_prerequisite: '',
        offered_terms: '',
        credit_point: 0
      });
      setEditingId(null);
      setIsModalOpen(false);
      
      // 刷新单元列表
      await fetchUnits();
    } catch (err: any) {
      console.error('Error submitting unit:', err);
      toast.error(err.message || `Failed to ${editingId ? 'update' : 'add'} unit`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this unit? This action cannot be undone.')) return;

    setIsDeleting(id);
    try {
      const response = await fetch(`${API}/units/${id}`, { 
        method: 'DELETE' 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = parseErrorMessage(errorText);
        throw new Error(errorMessage);
      }
      
      toast.success('Unit deleted successfully');
      await fetchUnits();
    } catch (err: any) {
      console.error('Error deleting unit:', err);
      toast.error(err.message || 'Failed to delete unit');
    } finally {
      setIsDeleting(null);
    }
  };

  const openAddModal = () => {
    setFormData({
      unit_code: '',
      unit_name: '',
      prerequisites: '',
      concurrent_prerequisite: '',
      offered_terms: '',
      credit_point: 0
    });
    setEditingId(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (unit: Unit) => {
    setFormData({ 
      unit_code: unit.unit_code,
      unit_name: unit.unit_name,
      prerequisites: unit.prerequisites,
      concurrent_prerequisite: unit.concurrent_prerequisite, // 修复字段名
      offered_terms: unit.offered_terms,
      credit_point: unit.credit_point
    });
    setEditingId(unit.id);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setEditingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#D6001C] mb-2">
            Unit Management
          </h1>
          <p className="text-gray-600">
            Manage and organize your university units efficiently
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-[#D6001C] text-white rounded hover:bg-[#B00018] flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Unit
        </button>
      </div>

      {/* Units Table */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto border border-gray-200">
        {units.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-lg font-medium">No units found</p>
            <p className="text-sm">Add your first unit to get started</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#D6001C]">
              <tr>
                <th className="px-6 py-3 text-left text-white font-medium">Unit Code</th>
                <th className="px-6 py-3 text-left text-white font-medium">Unit Name</th>
                <th className="px-6 py-3 text-left text-white font-medium">Credit Points</th>
                <th className="px-6 py-3 text-left text-white font-medium">Prerequisites</th>
                <th className="px-6 py-3 text-left text-white font-medium">Concurrent</th>
                <th className="px-6 py-3 text-left text-white font-medium">Offered Terms</th>
                <th className="px-6 py-3 text-left text-white font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">{unit.unit_code}</td>
                  <td className="px-6 py-4 font-medium">{unit.unit_name}</td>
                  <td className="px-6 py-4 font-semibold">{unit.credit_point}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                    {unit.prerequisites ? (
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                        {unit.prerequisites}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                    {unit.concurrent_prerequisite ? ( // 修复字段名
                      <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                        {unit.concurrent_prerequisite}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {unit.offered_terms ? (
                      <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                        {unit.offered_terms}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Not specified</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      <button 
                        onClick={() => openEditModal(unit)} 
                        disabled={isDeleting === unit.id}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(unit.id)}
                        disabled={isDeleting === unit.id}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {isDeleting === unit.id ? (
                          <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                        {isDeleting === unit.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Unit Modal */}
      <UnitModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        mode={modalMode}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
