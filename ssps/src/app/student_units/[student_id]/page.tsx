'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';

type StudentUnit = {
  id: number;
  student_id: number;
  unit_code: string;
  unit_name: string;
  grade: string;
  completed: boolean;
};

const MAX_FILE_SIZE_MB = 10;
const SUPPORTED_TYPES = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];

export default function StudentUnitsPage() {
  const { student_id } = useParams();
  const [units, setUnits] = useState<StudentUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const API_URL = 'http://localhost:8000';

  // 改进的客户端验证
  const validateFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`文件大小不能超过 ${MAX_FILE_SIZE_MB}MB`);
      return false;
    }
    if (!SUPPORTED_TYPES.includes(file.type)) {
      toast.error('仅支持 Excel 文件 (.xlsx, .xls)');
      return false;
    }
    return true;
  };

  // 使用 useCallback 优化
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('overwrite', 'true');

    try {
      setUploading(true);
      abortControllerRef.current = new AbortController();

      // 上传请求
      const response = await axios.post(
        `${API_URL}/students/${student_id}/upload-units`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          signal: abortControllerRef.current.signal,
          timeout: 30000
        }
      );

      toast.success(`成功上传 ${response.data.message}`);

      // 优化数据刷新
      const { data } = await axios.get<StudentUnit[]>(
        `${API_URL}/students/${student_id}/units`
      );
      setUnits(Array.isArray(data) ? data : []);

    } catch (err) {
    let errorMessage = '上传失败';
    
    if (axios.isAxiosError(err)) {
      // 添加状态码信息
      errorMessage += ` (${err.response?.status})`;
      errorMessage += `: ${err.response?.data?.detail || err.message}`;
    } else if (err instanceof Error) {
      errorMessage += `: ${err.message}`;
    }

    toast.error(errorMessage);
    console.error('完整错误日志:', err);
  } finally {
      setUploading(false);
      e.target.value = '';
      abortControllerRef.current = null;
    }
  }, [student_id]);

  // 优化数据获取
  const fetchUnits = useCallback(async () => {
    try {
      const { data } = await axios.get<StudentUnit[]>(
        `${API_URL}/students/${student_id}/units`
      );
      setUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('数据获取失败:', err);
      toast.error('无法获取学生单元数据');
    } finally {
      setLoading(false);
    }
  }, [student_id]);

  useEffect(() => {
    if (student_id) fetchUnits();
  }, [student_id, fetchUnits]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 头部添加取消按钮 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Completed Units for {student_id}</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="unitUpload"
            />
            <label
              htmlFor="unitUpload"
              className={`px-4 py-2 ${
                uploading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white rounded cursor-pointer transition-colors`}
            >
              {uploading ? '上传中...' : '上传 Excel'}
            </label>
            {uploading && (
              <button
                onClick={() => abortControllerRef.current?.abort()}
                className="absolute -right-20 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                取消上传
              </button>
            )}
          </div>
          <Link
            href="/students"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            返回学生列表
          </Link>
        </div>
      </div>

      {/* 表格渲染优化 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          {/* 表头保持原样 */}
          <tbody className="bg-white divide-y divide-gray-200">
            {units.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">{u.unit_code}</td>
                <td className="px-6 py-4">{u.unit_name}</td>
                <td className="px-6 py-4 font-mono">{u.grade || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block w-6 h-6 ${u.completed ? 'text-green-500' : 'text-red-500'}`}>
                    {u.completed ? '✅' : '❌'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {units.length === 0 && (
          <div className="p-8 text-center text-gray-500">未找到相关课程记录</div>
        )}
      </div>
    </div>
  );
}