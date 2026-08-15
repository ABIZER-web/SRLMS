import React, { useEffect, useState } from 'react';
import client from '../api/client';

export default function QrImage({ code, size = 140 }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    setDataUrl(null);
    setError('');
    client
      .get(`/linen-ops/qr/${code}`)
      .then((res) => setDataUrl(res.data.dataUrl))
      .catch((err) => setError(err?.response?.data?.message || 'QR generation failed'));
  }, [code]);

  if (error) return <div className="text-signal-red text-xs">{error}</div>;
  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-rail-800 rounded animate-pulse flex items-center justify-center text-[10px] text-rail-500"
      >
        generating…
      </div>
    );
  }
  return (
    <div className="inline-block bg-white p-2 rounded">
      <img src={dataUrl} alt={`QR for ${code}`} width={size} height={size} />
    </div>
  );
}
