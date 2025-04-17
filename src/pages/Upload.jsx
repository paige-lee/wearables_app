import React, { useState, useRef } from 'react';
import { uploadFile } from '../api/api';

const Upload = () => {
  const user = localStorage.getItem("user");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [log, setLog] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async () => {
    if (!file) {
      setMsg("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("username", user);
    formData.append("file", file);

    setIsUploading(true);
    setMsg('');
    setLog('');

    try {
      const res = await uploadFile(formData);
      setMsg(res.data.message);
      setLog(res.data.log);
      localStorage.setItem("data_uploaded", "true"); // ✅ Mark data as uploaded
    } catch (err) {
      setMsg("Upload failed.");
      setLog(err.response?.data?.log || '');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <h2>Upload Your Garmin Data</h2>

      <p style={{ marginTop: '-0.5rem', marginBottom: '1rem', color: '#555' }}>
        Please upload a .zip file of your exported Garmin watch data.
      </p>


      <input
        id="file-upload"
        type="file"
        accept=".zip"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={e => setFile(e.target.files[0])}
      />

      <button onClick={triggerFileSelect} style={{ marginBottom: '1rem' }}>
        {file ? `Selected: ${file.name}` : 'Choose ZIP File'}
      </button>

      <br />

      <button onClick={handleUpload} disabled={isUploading || !file}>
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>

      <p>{msg}</p>

      <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f4f4f4', padding: '1rem' }}>
        {log}
      </pre>
    </div>
  );
};

export default Upload;
