import React, { useState } from 'react';
import './App.css'; 

// NOTE: Ensure your Flask server is running on this port
const API_URL = 'https://ai-powered-pdf-query-assistant.onrender.com';

// --- UTILITY FUNCTION ---
const markdownTableToHtml = (markdown) => {
    // This is a minimal parser for the specific Markdown table structure output by Gemini.
    const lines = markdown.trim().split('\n').filter(line => line.includes('|'));

    // Check if enough lines exist for a table (Header, Separator, at least one Body row)
    if (lines.length < 3) return markdown; 

    // The first line is the header (<thead>)
    // We remove the starting and ending '|', then map each column header
    const headerLine = lines[0].split('|').slice(1, -1).map(h => `<th>${h.trim()}</th>`).join('');
    const header = `<thead><tr>${headerLine}</tr></thead>`;

    // Skip the second line (the separator: |---|---|)
    const bodyLines = lines.slice(2);

    // Remaining lines are the body (<tbody>)
    const body = bodyLines.map(line => {
        // Remove starting/ending '|' and map to <td> tags
        const rowCells = line.split('|').slice(1, -1).map(cell => `<td>${cell.trim()}</td>`).join('');
        return `<tr>${rowCells}</tr>`;
    }).join('');

    // Class 'comparison-table' must be defined in App.css for proper styling
    return `<table class="comparison-table" style="width:100%; border-collapse: collapse;">${header}<tbody>${body}</tbody></table>`;
};

// Basic inline styles for a clean look
const sectionStyle = { border: '1px solid #ddd', padding: '30px', marginBottom: '30px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' };
const titleStyle = { color: '#3498db', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' };
const inputStyle = { width: '100%', padding: '12px', marginBottom: '15px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '5px' };
const buttonStyle = { padding: '10px 20px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const queryButtonStyle = { padding: '12px 25px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
const answerBoxStyle = { minHeight: '150px', padding: '15px', backgroundColor: '#ecf0f1', borderRadius: '5px' };


function App() {
  // State for file management
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // State for querying and results
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState('');
  const [mode, setMode] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [fetchedImage, setFetchedImage] = useState(null); 

  // --- PDF UPLOAD HANDLER (/upload) ---
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('Please select a PDF file first.');
      return;
    }

    setIsProcessing(true);
    setUploadMessage('Processing PDF and chunking text...');

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadMessage(`Success! PDF processed. ${data.chunks_count} text chunks indexed.`);
        setAnswer('');
        setSources('');
        setMode('');
        setFetchedImage(null);
      } else {
        setUploadMessage(`Upload Error: ${data.error}`);
      }
    } catch (error) {
      setUploadMessage(`Network Error: Could not connect to backend server. Is Flask server running on ${API_URL}?`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- QUERY HANDLER (/query) ---
  const handleQuery = async (e) => {
    e.preventDefault();
    if (queryLoading || isProcessing || !uploadMessage.startsWith('Success')) return;

    setQueryLoading(true);
    setAnswer('');
    setSources('');
    setMode('');
    setFetchedImage(null);

    try {
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (response.ok) {
        setAnswer(data.answer);
        setSources(data.sources || "Direct API response.");
        // Capture mode and image data from the Python backend
        setMode(data.mode || "VERBATIM"); 
        setFetchedImage(data.image_data || null);
      } else {
        setAnswer(`Query Error: ${data.error}`);
        setSources('');
        setMode('ERROR');
      }
    } catch (error) {
      setAnswer('Network Error: Could not connect to backend server.');
      setSources('');
      setMode('ERROR');
    } finally {
      setQueryLoading(false);
    }
  };

  // --- UI RENDERING LOGIC ---
  const renderAnswerContent = () => {
    if (queryLoading) {
      return <p style={{ color: '#007bff' }}>Searching for the exact phrase...</p>;
    }
    if (!answer) {
      return <p style={{ color: '#888' }}>Ask a question to begin.</p>;
    }

    // Check for the Full Text Extraction mode
    if (mode === 'FULL_TEXT') {
      return (
        <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '500px', overflowY: 'scroll', border: '1px solid #ccc', padding: '15px' }}>
          {answer}
        </pre>
      );
    }

    // Check for the Comparison (Markdown) mode and render HTML table
    if (mode === 'COMPARISON') {
        const tableHtml = markdownTableToHtml(answer);
        
        return (
            <div style={{ padding: '15px', border: '1px solid #3498db', backgroundColor: '#f0f8ff', borderRadius: '5px' }}>
                <h4 style={{marginTop: '0', color: '#2c3e50'}}>Comparison Table</h4>
                
                {/* Use dangerouslySetInnerHTML to render the HTML table structure */}
                <div 
                    dangerouslySetInnerHTML={{ __html: tableHtml }} 
                    style={{ overflowX: 'auto' }}
                />
            </div>
        );
    }

    if (mode === 'ERROR') {
      return <p style={{ color: 'red', fontWeight: 'bold' }}>{answer}</p>;
    }

    // Default: Verbatim extraction
    return (
      <p style={{ whiteSpace: 'pre-wrap', fontWeight: '500' }}>{answer}</p>
    );
  };


  return (
    <div className="App" style={{ padding: '40px', fontFamily: 'Inter, sans-serif', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>AI-Powered Verbatim PDF Query Assistant</h1>

      {/* 1. Upload Document Section */}
      <div style={sectionStyle}>
        <h2 style={titleStyle}>1. Upload Document</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            disabled={isProcessing}
          />
          <button
            onClick={handleUpload}
            disabled={isProcessing || !selectedFile}
            style={buttonStyle}
          >
            {isProcessing ? 'Processing...' : 'Upload & Index'}
          </button>
        </div>
        <p style={{ marginTop: '10px', color: uploadMessage.startsWith('Success') ? 'green' : (uploadMessage.startsWith('Network') || uploadMessage.startsWith('Upload Error') ? 'red' : 'gray') }}>
          {uploadMessage}
        </p>
      </div>

      {/* 2. Ask a Question Section */}
      <div style={sectionStyle}>
        <h2 style={titleStyle}>2. Ask a Question</h2>
        <form onSubmit={handleQuery}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Compare TCP and UDP OR What is Figure 4.7?"
            required
            style={inputStyle}
            disabled={isProcessing || !uploadMessage.startsWith('Success')}
          />
          <button
            type="submit"
            disabled={queryLoading || isProcessing || !uploadMessage.startsWith('Success')}
            style={queryButtonStyle}
          >
            {queryLoading ? 'Thinking...' : 'Get Answer'}
          </button>
        </form>

        {/* --- ANSWER AND IMAGE DISPLAY --- */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            
            {/* Text Answer Section (Main Content) */}
            <div style={{ flex: fetchedImage ? 2 : 1, minWidth: '400px' }}> 
                <h3 style={{ color: '#34495e', borderBottom: '1px dashed #ddd', paddingBottom: '5px' }}>
                    AI Answer: <span style={{fontSize: '0.8em', color: '#999'}}>
                        ({mode === 'VERBATIM' ? 'Verbatim Extraction' : mode === 'FULL_TEXT' ? 'Full Text Output' : mode})
                    </span>
                </h3>
                <div style={answerBoxStyle}>
                    {renderAnswerContent()}
                </div>
            </div>

            {/* Image Display Section */}
            {fetchedImage && (
                <div style={{ flex: 1, minWidth: '300px', maxWidth: '350px', border: '2px solid #3498db', padding: '10px', backgroundColor: '#fff', borderRadius: '5px' }}>
                    <h4 style={{ color: '#3498db', marginTop: '0' }}>Extracted Figure Reference</h4>
                    <img 
                        src={fetchedImage} 
                        alt="Extracted figure reference" 
                        style={{ maxWidth: '100%', height: 'auto', display: 'block' }} 
                    />
                    <p style={{ fontSize: '0.8em', color: '#666', marginTop: '10px' }}>
                        *Cropped from the relevant page.
                    </p>
                </div>
            )}
        </div>
        
        {sources && (
          <p style={{ fontSize: '0.8em', color: '#666', marginTop: '10px' }}>
            **Debug Sources:** {sources}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
