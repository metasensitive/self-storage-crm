import { useEffect, useState } from 'react';
import { Ic } from '@/components/Ic';
import type { SupportAttachment } from '@/api/support';

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

async function fetchAuthedBlob(url: string, token: string | null): Promise<Blob | null> {
  if (!token) return null;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return res.blob();
}

interface AttachmentPreviewProps {
  attachment: SupportAttachment;
  authToken: string | null;
}

/**
 * Превью вложения в баббле сообщения. Изображения — через blob-URL,
 * полученный fetch'ом с Authorization (download_url требует auth:sanctum,
 * простой <img src=...> без хедера получит 401). Остальные — карточка
 * с иконкой и кнопкой «Скачать».
 */
export function AttachmentPreview({ attachment, authToken }: AttachmentPreviewProps) {
  const handleDownload = async () => {
    const blob = await fetchAuthedBlob(attachment.download_url, authToken);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.original_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (attachment.is_image) {
    return (
      <button
        type="button"
        onClick={handleDownload}
        title="Скачать"
        style={{
          padding: 0,
          background: 'transparent',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          cursor: 'pointer',
          maxWidth: 280,
        }}
      >
        <AuthedImage
          url={attachment.download_url}
          alt={attachment.original_name}
          authToken={authToken}
        />
        <div
          className="t-small dim"
          style={{
            padding: '6px 10px',
            background: 'var(--bg)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
          >
            {attachment.original_name}
          </span>
          <span>{fmtSize(attachment.size_bytes)}</span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      title="Скачать"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: 'var(--bg)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        cursor: 'pointer',
        textAlign: 'left',
        minWidth: 220,
        maxWidth: 320,
      }}
    >
      <Ic name="file" size={18} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="t-body"
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {attachment.original_name}
        </div>
        <div className="t-small dim">{fmtSize(attachment.size_bytes)}</div>
      </div>
      <Ic name="download" size={14} />
    </button>
  );
}

function AuthedImage({
  url,
  alt,
  authToken,
}: {
  url: string;
  alt: string;
  authToken: string | null;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    fetchAuthedBlob(url, authToken).then((blob) => {
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, authToken]);

  if (!src) {
    return (
      <div
        style={{
          width: 280,
          height: 180,
          background: 'var(--bg-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ic name="image" size={20} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'cover' }}
    />
  );
}
