import { useState } from 'react';

export default function UploadPage() {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('ticket', file);

    try {
      const res = await fetch('http://localhost:3001/api/tickets/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Upload failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1> Upload Your Ticket</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Upload a 4D or TOTO ticket to extract numbers automatically
      </p>

      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ marginBottom: '20px' }}
      />

      {preview && (
        <div>
          <img src={preview} alt="ticket preview"
            style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', marginBottom: '20px' }} />
        </div>
      )}

      {loading && <p>⏳ Processing OCR... please wait...</p>}

      {error && <p style={{ color: 'red' }}>❌ {error}</p>}

      {result && (
<div style={{ background: '#1a1a2e', padding: '20px', borderRadius: '8px', border: '1px solid #00e5ff' }}>
  <h2 style={{ color: '#00e5ff', marginBottom: '12px' }}> OCR Results</h2>
  <p style={{ color: '#ffffff', marginBottom: '8px' }}><strong>Game Type:</strong> {result.gameType}</p>
  <p style={{ color: '#ffffff', marginBottom: '8px' }}><strong>Draw Date:</strong> {result.drawDate || 'Not detected'}</p>
  <p style={{ color: '#ffffff', marginBottom: '8px' }}><strong>Numbers:</strong> {result.numbers?.join(', ')}</p>
  <p style={{ color: '#ffffff', marginBottom: '8px' }}><strong>Bet Type:</strong> {result.betType}</p>
  <p style={{ color: '#ffffff', marginBottom: '8px' }}><strong>Ticket ID:</strong> {result.ticketId}</p>
</div>
      )}
    </div>
  );
}