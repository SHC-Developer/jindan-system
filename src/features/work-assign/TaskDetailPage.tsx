import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskDetail } from '../../hooks/useTaskDetail';
import { useAuth } from '../../hooks/useAuth';
import { completeTask, addTaskAttachment } from '../../lib/tasks';
import { uploadTaskFile, formatFileSize } from '../../lib/storage';
import { downloadFileFromUrl } from '../../lib/download';
import { Loader2, ArrowLeft, Paperclip, CheckCircle, FileText } from 'lucide-react';

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { task, loading, error } = useTaskDetail(taskId ?? null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAssignee = user && task && task.assigneeId === user.uid;
  const canEdit = isAssignee && task?.status === 'pending';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId || !canEdit) return;
    e.target.value = '';
    setUploading(true);
    setUploadProgress(0);
    setMessage(null);
    try {
      const result = await uploadTaskFile(file, taskId, (p) => setUploadProgress(p));
      await addTaskAttachment(taskId, {
        downloadUrl: result.downloadUrl,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: result.fileType,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '파일 업로드에 실패했습니다.',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleComplete = async () => {
    if (!taskId || !user || !canEdit) return;
    setCompleting(true);
    setMessage(null);
    try {
      await completeTask(taskId, user.displayName ?? null);
      setMessage({ type: 'success', text: '업무를 완료 처리했습니다.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '완료 처리에 실패했습니다.',
      });
    } finally {
      setCompleting(false);
    }
  };

  const formatDate = (ms: number) =>
    new Date(ms).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-light/30">
        <p className="text-gray-500 flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" /> 업무 불러오는 중…
        </p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-brand-light/30 p-6">
        <p className="text-red-600">{error ?? '업무를 찾을 수 없습니다.'}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 text-brand-main hover:underline flex items-center gap-1"
        >
          <ArrowLeft size={16} /> 홈으로
        </button>
      </div>
    );
  }

  const isCompleted = task.status === 'completed';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-brand-light/30">
      <header className="flex-shrink-0 flex items-center gap-3 p-4 bg-white border-b border-gray-200">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          aria-label="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-brand-dark truncate flex-1">{task.title}</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">지시자</dt>
              <dd className="font-medium text-gray-900">{task.createdByDisplayName ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">지시 일시</dt>
              <dd className="font-medium text-gray-900">{formatDate(task.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">우선순위</dt>
              <dd className="font-medium text-gray-900">{task.priority}</dd>
            </div>
            {task.description && (
              <div>
                <dt className="text-gray-500">상세 내용</dt>
                <dd className="text-gray-900 whitespace-pre-wrap mt-1">{task.description}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-gray-800 flex items-center gap-2 mb-3">
            <Paperclip size={16} /> 첨부 파일
          </h3>
          {task.attachments.length === 0 ? (
            <p className="text-sm text-gray-500">첨부된 파일이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {task.attachments.map((att, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() =>
                      downloadFileFromUrl(att.downloadUrl, att.fileName ?? 'download')
                    }
                    className="flex items-center gap-2 text-sm text-brand-main hover:underline"
                  >
                    <FileText size={14} />
                    {att.fileName}
                    <span className="text-gray-400">({formatFileSize(att.fileSize)})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <div className="mt-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-sm text-brand-main hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <Paperclip size={14} /> 파일 첨부
              </button>
              {uploading && (
                <div className="mt-2 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-brand-sub" />
                  <span className="text-xs text-gray-500">{uploadProgress}%</span>
                </div>
              )}
            </div>
          )}
        </section>

        {message && (
          <p
            className={`text-sm ${
              message.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {message.text}
          </p>
        )}

        {isAssignee && !isCompleted && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="w-full bg-brand-main hover:bg-brand-main/90 disabled:opacity-50 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            {completing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <CheckCircle size={20} />
            )}
            업무 완료
          </button>
        )}

        {isCompleted && (
          <p className="text-sm text-green-600 flex items-center gap-2">
            <CheckCircle size={18} />
            {task.completedAt
              ? `${formatDate(task.completedAt)}에 완료 처리되었습니다.`
              : '완료됨'}
          </p>
        )}
      </div>
    </div>
  );
}
