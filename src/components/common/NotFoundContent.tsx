import Link from 'next/link';

interface NotFoundContentProps {
  message?: string;
  detail?: string;
  action?: React.ReactNode;
}

const NotFoundContent = ({
  message = '페이지를 찾을 수 없습니다.',
  detail,
  action,
}: NotFoundContentProps) => (
  <div className="flex flex-col items-center justify-center gap-4">
    <h1
      className="text-4xl font-bold"
      style={{ color: 'var(--text-primary)' }}
    >
      404
    </h1>
    <p
      className="text-lg"
      style={{ color: 'var(--text-secondary)' }}
    >
      {message}
    </p>
    {detail && (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {detail}
      </p>
    )}
    {action ?? (
      <Link
        href="/"
        className="mt-4 rounded-lg px-6 py-2 text-sm"
        style={{
          backgroundColor: 'var(--sidebar-btn-bg)',
          color: 'var(--sidebar-btn-text)',
        }}
      >
        홈으로 돌아가기
      </Link>
    )}
  </div>
);

export default NotFoundContent;
