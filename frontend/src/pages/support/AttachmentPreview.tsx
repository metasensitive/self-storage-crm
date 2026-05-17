import { useEffect, useState } from 'react';
import { Ic } from '@/components/Ic';
import type { SupportAttachment } from '@/api/support';
import { attachmentIcon, attachmentIconColor, attachmentLabel } from './utils';
// HoverZoom переехал в Composer — для уже отправленных сообщений достаточно
// клика по миниатюре, который открывает lightbox. Hover-зум в ленте мешал
// читать переписку (всплывал поверх соседних сообщений).

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
 * Превью вложения в баббле сообщения.
 *
 * Изображения — миниатюра в баббле + lightbox-оверлей по клику и hover-зум
 * (большое окно поверх ленты при наведении). Файлы прочих типов — карточка
 * с цветной иконкой по mime и кнопкой «скачать».
 *
 * Endpoint download требует auth:sanctum, поэтому простой <img src> без
 * Authorization-хедера получит 401 — тянем blob через fetch с Bearer и
 * подставляем через object-URL.
 */
export function AttachmentPreview({ attachment, authToken }: AttachmentPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  async function downloadFile() {
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
  }

  if (attachment.is_image) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          title="Открыть в полном размере"
          style={{
            padding: 0,
            background: 'transparent',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            overflow: 'hidden',
            cursor: 'pointer',
            maxWidth: 280,
            display: 'block',
            width: '100%',
          }}
        >
          <AuthedImage
            url={attachment.download_url}
            alt={attachment.original_name}
            authToken={authToken}
            maxHeight={200}
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

        {lightboxOpen && (
          <Lightbox
            url={attachment.download_url}
            name={attachment.original_name}
            authToken={authToken}
            onClose={() => setLightboxOpen(false)}
            onDownload={downloadFile}
          />
        )}
      </>
    );
  }

  // Не-изображение: компактная карточка с цветной иконкой типа.
  // - Имя строго в одну строку с ellipsis;
  // - Лейбл (PDF/DOCX/XLSX/TXT) — короткий, читается лучше сырого mime;
  // - Цвет имени берём из var(--ink) явно — внутри bubble «своих»
  //   сообщений inherit-цвет = var(--accent-fg) (белый), и на тёмном
  //   фоне карточки имя сливалось с подложкой.
  return (
    <button
      type="button"
      onClick={downloadFile}
      title={`Скачать «${attachment.original_name}»`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        background: 'var(--bg)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        maxWidth: 320,
        color: 'var(--ink)',
      }}
    >
      <span
        style={{
          color: attachmentIconColor(attachment.mime, attachment.original_name),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          background: 'var(--bg-muted)',
          borderRadius: 'var(--r-md)',
          flexShrink: 0,
        }}
      >
        <Ic name={attachmentIcon(attachment.mime, attachment.original_name)} size={18} />
      </span>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.3,
          }}
        >
          {attachment.original_name || 'Файл'}
        </div>
        <div
          className="t-small dim"
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {attachmentLabel(attachment.mime, attachment.original_name)} ·{' '}
          {fmtSize(attachment.size_bytes)}
        </div>
      </div>
      <Ic name="download" size={14} className="" />
    </button>
  );
}

/** Авторизованная картинка через blob-URL. */
function AuthedImage({
  url,
  alt,
  authToken,
  maxHeight = 320,
}: {
  url: string;
  alt: string;
  authToken: string | null;
  maxHeight?: number;
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
          width: '100%',
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
      style={{
        display: 'block',
        width: '100%',
        maxHeight,
        objectFit: 'cover',
      }}
    />
  );
}

/**
 * Полноэкранный lightbox с overlay-фоном. Закрывается по клику на фон,
 * Escape, или кнопкой ✕. Внутри — кнопка скачивания.
 */
function Lightbox({
  url,
  name,
  authToken,
  onClose,
  onDownload,
}: {
  url: string;
  name: string;
  authToken: string | null;
  onClose: () => void;
  onDownload: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label={`Просмотр: ${name}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
      }}
    >
      <header
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(to bottom, rgba(0,0,0,.5), transparent)',
          color: 'white',
        }}
      >
        <span
          style={{
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={name}
        >
          {name}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          title="Скачать"
          style={{
            background: 'rgba(255,255,255,.12)',
            border: '1px solid rgba(255,255,255,.2)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Ic name="download" size={14} />
          <span style={{ fontSize: 13 }}>Скачать</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          style={{
            background: 'rgba(255,255,255,.12)',
            border: '1px solid rgba(255,255,255,.2)',
            color: 'white',
            width: 32,
            height: 32,
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ic name="close" size={16} />
        </button>
      </header>

      <LightboxImage url={url} alt={name} authToken={authToken} />
    </div>
  );
}

function LightboxImage({
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
    return <div style={{ color: 'white' }}>Загрузка…</div>;
  }
  return (
    <img
      src={src}
      alt={alt}
      onClick={(e) => e.stopPropagation()}
      style={{
        maxWidth: '92vw',
        maxHeight: '88vh',
        objectFit: 'contain',
        cursor: 'default',
      }}
    />
  );
}

