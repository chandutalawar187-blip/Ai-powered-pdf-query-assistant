// client/src/App.js (FINAL COMPLETE FRONTEND CODE WITH DUAL UPLOAD, DARK MODE & PAGE NAVIGATION)
import React, { useState, useRef } from 'react';
import './App.css';
import PrivacyPolicy from './PrivacyPolicy';


// NOTE: This must be the live Render URL you deployed!
const API_URL = 'http://127.0.0.1:5000';

// --- TABLE RENDERING UTILITY (MOVED OUTSIDE APP) ---

// Function to convert the Markdown table (received from Python) into basic HTML table tags
// Now accepts the current theme to apply appropriate contrast styling
const markdownTableToHtml = (markdown, isDark) => {
    // Styling constants for the HTML table
    const tableStyles = {
        tableBg: isDark ? '#2d3748' : '#fff',
        thBg: isDark ? '#4a5568' : '#f2f2f2',
        thText: isDark ? '#e2e8f0' : '#333',
        tdText: isDark ? '#a0aec0' : '#333',
        tdBorder: isDark ? '#4a5568' : '#eee',
    };

    // This function aggressively looks for Markdown table structures and converts them to HTML
    const lines = markdown.trim().split('\n').filter(line => line.includes('|'));

    if (lines.length < 2) return markdown;

    // Find the header (first line) and skip the separator (second line: |---|)
    const headerLine = lines[0].split('|').map(h => `<th style="background-color: ${tableStyles.thBg}; color: ${tableStyles.thText}; padding: 10px; border: 1px solid ${tableStyles.tdBorder}; text-align: left;">${h.trim().replace('Parameter', 'Parameter (Page(s))')}</th>`).join('');
    const header = `<thead><tr>${headerLine}</tr></thead>`;

    // Remaining lines are the body
    const bodyLines = lines.slice(2);

    const body = bodyLines.map((line, index) => {
        // Set row background based on alternating rows
        const rowBg = (index % 2 === 0) ? tableStyles.tableBg : (isDark ? '#1a202c' : '#fafafa');

        const rowCells = line.split('|').map(cell => `<td style="padding: 8px; border: 1px solid ${tableStyles.tdBorder}; color: ${tableStyles.tdText};">${cell.trim()}</td>`).join('');

        return `<tr style="background-color: ${rowBg};">${rowCells}</tr>`;
    }).join('');

    // Apply basic inline table styling for presentation
    return `<table class="comparison-table" style="width:100%; border-collapse: collapse; margin-top: 10px; color: ${tableStyles.tdText};">${header}<tbody>${body}</tbody></table>`;
};


// --- Global Style Definitions (FIXED SCOPE) ---

const baseInputStyle = {
    width: '100%',
    padding: '12px 18px',
    marginBottom: '15px',
    boxSizing: 'border-box',
    border: 'none',
    borderRadius: '8px',
};
const baseButtonStyle = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background-color 0.3s'
};
const baseQueryButtonStyle = {
    padding: '12px 25px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.3s',
    border: 'none',
    width: '100%'
};

// --- FOOTER COMPONENT (Instagram SVG) ---
const InstagramIcon = ({ color }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
);

// --- Privacy Policy ---



// --- ABOUT PAGE COMPONENT (Using React State for Navigation) ---
const AboutPage = ({ colors, toggleMode }) => (
    <div style={{
        padding: '40px',
        maxWidth: '800px',
        margin: '50px auto',
        backgroundColor: colors.bgSecondary,
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        color: colors.textPrimary,
        border: `1px solid ${colors.borderColor}`
    }}>
        <h2 style={{ color: colors.accentColor, borderBottom: `2px solid ${colors.accentColor}`, paddingBottom: '10px', marginBottom: '20px' }}>
            About the AI Verbatim Query Assistant
        </h2>

        <p style={{ fontSize: '1.1em', lineHeight: '1.6', marginBottom: '25px', textAlign: 'justify' }}>
            Hi, I'm **Chandrashekar**, and I'm currently pursuing my B.E. in CSE Engineering at GM Institute of Technology, Davangere. I developed this website as a project for the hackathon.
        </p>

        <p style={{ fontSize: '1.1em', lineHeight: '1.6', marginBottom: '25px', fontWeight: 'bold', color: colors.textPrimary, textAlign: 'justify' }}>
            This website is a direct solution for students who don't want their reading mood ruined by endless scrolling when they need a perfect, precise answer.
        </p>

        <ul style={{ listStyleType: 'none', paddingLeft: '0', fontSize: '1em', lineHeight: '1.8' }}>
            <li style={{ marginBottom: '10px' }}>✅ **Verbatim Extraction:** Gets the **exact line** from your notes, no summarizing.</li>
            <li style={{ marginBottom: '10px' }}>✅ **Dual Context RAG:** Upload both your **Notes** and **Question Paper** for smarter searches.</li>
            <li style={{ marginBottom: '10px' }}>✅ **Image Referencing:** Displays **relevant diagrams** when your answer cites a figure.</li>
            <li style={{ marginBottom: '10px' }}>✅ **Comparison Tables:** Automatically structures differentiation queries into clean tables.</li>
        </ul>

        <p style={{ marginTop: '30px', textAlign: 'center', fontSize: '1.2em', fontWeight: 'bold' }}>
            So go ahead and upload your notes. No more yapping—get your answer! Good luck with your studies.
        </p>

        <button
            onClick={toggleMode}
            style={{
                ...baseButtonStyle,
                display: 'block',
                margin: '30px auto 0 auto',
                backgroundColor: colors.accentColor,
                color: 'white',
                padding: '10px 30px'
            }}
        >
            Go Back to the Tool
        </button>
    </div>
);


function App() {
  // Global State for UI
  const [theme, setTheme] = useState('light');
  const [pageMode, setPageMode] = useState('tool');// NEW STATE: 'tool' or 'about'

  // DUAL FILE UPLOAD STATE
  const [notesFile, setNotesFile] = useState(null);
  const [paperFile, setPaperFile] = useState(null);

  // DUAL MESSAGE STATE
  const [notesMessage, setNotesMessage] = useState('');
  const [paperMessage, setPaperMessage] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  // State for querying and results
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState('');
  const [mode, setMode] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [fetchedImage, setFetchedImage] = useState(null);

  // --- REFS for File Inputs ---
  const notesFileInputRef = useRef(null);
  const paperFileInputRef = useRef(null);

  // --- Theme Toggle Logic ---
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // --- Dynamic Style Definitions ---

  const isDark = theme === 'dark';

  const colors = {
      bgPrimary: isDark ? '#1a202c' : '#f4f7f6',
      bgSecondary: isDark ? '#2d3748' : '#fff',
      textPrimary: isDark ? '#e2e8f0' : '#2c3e50',
      textSecondary: isDark ? '#a0aec0' : '#666',
      borderColor: isDark ? '#4a5568' : '#ddd',
      accentColor: isDark ? '#63b3ed' : '#1a73e8',
      buttonBg: isDark ? '#4299e1' : '#1a73e8',
      buttonHover: isDark ? '#3182ce' : '#155bb5',
      successBg: isDark ? '#2f855a' : '#00c853',
      answerBg: isDark ? '#243447' : '#f8f9fa'
  };

  const globalStyle = {
      fontFamily: 'Inter, sans-serif',
      margin: '0 auto',
      backgroundColor: colors.bgPrimary,
      minHeight: '100vh',
      color: colors.textPrimary,
      padding: '20px'
  };

  const sectionStyle = {
      border: `1px solid ${colors.borderColor}`,
      padding: '30px',
      marginBottom: '30px',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
      backgroundColor: colors.bgSecondary,
      transition: 'all 0.3s'
  };

  const titleStyle = {
      color: colors.accentColor,
      borderBottom: `1px solid ${colors.borderColor}`,
      paddingBottom: '10px',
      marginBottom: '20px'
  };

  // Adjusted Answer Box for better aesthetics (uses dynamic border/background)
  const answerBoxStyle = {
      minHeight: '150px',
      padding: '15px',
      backgroundColor: colors.answerBg,
      borderRadius: '8px',
      border: `1px solid ${colors.borderColor}`
  };

  // --- DUAL PDF UPLOAD HANDLERS ---

  const handleUpload = async (file, type) => {
    if (!file) return;

    const isNotes = type === 'notes';
    const setFileMessage = isNotes ? setNotesMessage : setPaperMessage;
    const uploadEndpoint = isNotes ? `${API_URL}/upload-notes` : `${API_URL}/upload-paper`;

    setIsProcessing(true);
    setFileMessage(`Processing ${isNotes ? 'Notes' : 'Paper'}...`);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch(uploadEndpoint, { method: 'POST', body: formData });
      const data = await response.json();

      if (response.ok) {
        setFileMessage(`Success! ${isNotes ? 'Notes' : 'Paper'} processed. ${data.chunks_count} chunks indexed.`);
        // Only clear question/answer if uploading Notes (the primary source for RAG)
        if (isNotes) {
            setAnswer(''); setSources(''); setMode(''); setFetchedImage(null);
        }
      } else {
        setFileMessage(`Upload Error: ${data.error}`);
      }
    } catch (error) {
      setFileMessage(`Network Error: Could not connect to backend server.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNotesUpload = () => handleUpload(notesFile, 'notes');
  const handlePaperUpload = () => handleUpload(paperFile, 'paper');


  const handleQuery = async (e) => {
    e.preventDefault();
    // Query is only allowed if at least the Notes file is successfully uploaded
    const canQuery = notesMessage.startsWith('Success');
    if (queryLoading || isProcessing || !canQuery) return;

    setQueryLoading(true); setAnswer(''); setSources(''); setMode(''); setFetchedImage(null);

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
        setMode(data.mode || "VERBATIM");
        setFetchedImage(data.image_data || null);
      } else {
        setAnswer(`Query Error: ${data.error}`); setSources(''); setMode('ERROR');
      }
    } catch (error) {
      setAnswer('Network Error: Could not connect to backend server.'); setSources(''); setMode('ERROR');
    } finally {
      setQueryLoading(false);
    }
  };

  // --- UI RENDERING LOGIC ---
  const renderAnswerContent = () => {
    if (queryLoading) {
      return <p style={{ color: colors.accentColor }}>Searching for the exact phrase...</p>;
    }
    if (!answer) {
      return <p style={{ color: colors.textSecondary }}>Ask a question to begin.</p>;
    }

    if (mode === 'FULL_TEXT') {
      return (
        <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '500px', overflowY: 'scroll', border: `1px solid ${colors.borderColor}`, padding: '15px', backgroundColor: colors.answerBg, color: colors.textPrimary }}>
          {answer}
        </pre>
      );
    }

    if (mode === 'COMPARISON') {
        // Pass theme status to the parsing utility for correct color injection
        const tableHtml = markdownTableToHtml(answer, isDark);

        return (
            <div style={{ padding: '15px', border: `1px solid ${colors.accentColor}`, backgroundColor: colors.answerBg, borderRadius: '8px' }}>
                <h4 style={{marginTop: '0', color: colors.accentColor}}>Comparison Table</h4>

                {/* CRITICAL: Use dangerouslySetInnerHTML to render the HTML table structure */}
                <div
                    dangerouslySetInnerHTML={{ __html: tableHtml }}
                    style={{ overflowX: 'auto', color: colors.textPrimary }}
                />
            </div>
        );
    }

    if (mode === 'ERROR') {
      return <p style={{ color: 'red', fontWeight: 'bold' }}>{answer}</p>;
    }

    return (
      // APPLIED FIX: Added textAlign: 'justify' and font size/line height for formal reading look
      <p style={{
          whiteSpace: 'pre-wrap',
          fontWeight: '500',
          color: colors.textPrimary,
          textAlign: 'justify', // <--- JUSTIFY ALIGNMENT APPLIED HERE
          fontSize: '1.05em',   // Slightly larger text
          lineHeight: '1.6'     // Increased line height for readability
      }}>
          {answer}
      </p>
    );
  };


 return (
  <div className="App" style={globalStyle}>
    {pageMode === 'about' ? (
      <AboutPage colors={colors} toggleMode={() => setPageMode('tool')} />
    ) : pageMode === 'privacy' ? (
      <PrivacyPolicy colors={colors} toggleMode={() => setPageMode('tool')} />
    ) : (
      <>
        {/* Header and Theme Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: colors.textPrimary, fontSize: '2em' }}>
            AI Verbatim Query Assistant
          </h1>
          <button
            onClick={toggleTheme}
            style={{
              ...baseButtonStyle,
              padding: '8px 15px',
              backgroundColor: colors.buttonBg,
              color: 'white',
              marginLeft: '20px'
            }}
          >
            {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        {/* ------------------------ */}
        {/* 1. DUAL UPLOAD SECTION */}
        {/* ------------------------ */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>1. Upload Documents</h2>

          {/* Notes PDF Upload */}
          <div style={{ border: `1px solid ${colors.borderColor}`, padding: '15px', borderRadius: '8px', marginBottom: '15px', backgroundColor: colors.answerBg }}>
            <h4 style={{marginTop: '0', color: colors.textPrimary}}>A. Notes/Reference PDF (Source of Answers)</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: '200px' }}>
                <input
                  type="file"
                  accept="application/pdf"
                  ref={notesFileInputRef}
                  onChange={(e) => setNotesFile(e.target.files[0])}
                  disabled={isProcessing}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', zIndex: 10, cursor: 'pointer' }}
                />
                <button
                  onClick={(e) => { e.preventDefault(); notesFileInputRef.current.click(); }}
                  disabled={isProcessing}
                  style={{ ...baseButtonStyle, backgroundColor: colors.bgSecondary, color: colors.textPrimary, border: `1px solid ${colors.borderColor}`, padding: '8px 15px', marginRight: '-1px' }}
                >
                  Choose File
                </button>
                <span
                  style={{ padding: '8px 15px', border: `1px solid ${colors.borderColor}`, borderRadius: '0 8px 8px 0', backgroundColor: colors.bgSecondary, color: colors.textSecondary, flexGrow: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                >
                  {notesFile ? notesFile.name : 'No file chosen'}
                </span>
              </div>

              <button
                onClick={handleNotesUpload}
                disabled={isProcessing || !notesFile}
                style={{ ...baseButtonStyle, backgroundColor: colors.buttonBg, color: 'white' }}
              >
                {isProcessing ? 'Processing...' : 'Upload Notes'}
              </button>
            </div>
            <p style={{ marginTop: '10px', color: notesMessage.startsWith('Success') ? colors.successBg : (notesMessage.startsWith('Network') || notesMessage.startsWith('Upload Error') ? 'red' : colors.textSecondary) }}>
              {notesMessage}
            </p>
          </div>

          {/* Question Paper PDF Upload */}
          <div style={{ border: `1px solid ${colors.borderColor}`, padding: '15px', borderRadius: '8px', backgroundColor: colors.answerBg }}>
            <h4 style={{marginTop: '0', color: colors.textPrimary}}>B. Question Paper PDF (Optional - For Context)</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: '200px' }}>
                <input
                  type="file"
                  accept="application/pdf"
                  ref={paperFileInputRef}
                  onChange={(e) => setPaperFile(e.target.files[0])}
                  disabled={isProcessing}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', zIndex: 10, cursor: 'pointer' }}
                />
                <button
                  onClick={(e) => { e.preventDefault(); paperFileInputRef.current.click(); }}
                  disabled={isProcessing}
                  style={{ ...baseButtonStyle, backgroundColor: colors.bgSecondary, color: colors.textPrimary, border: `1px solid ${colors.borderColor}`, padding: '8px 15px', marginRight: '-1px' }}
                >
                  Choose File
                </button>
                <span
                  style={{ padding: '8px 15px', border: `1px solid ${colors.borderColor}`, borderRadius: '0 8px 8px 0', backgroundColor: colors.bgSecondary, color: colors.textSecondary, flexGrow: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                >
                  {paperFile ? paperFile.name : 'No file chosen'}
                </span>
              </div>

              <button
                onClick={handlePaperUpload}
                disabled={isProcessing || !paperFile}
                style={{ ...baseButtonStyle, backgroundColor: colors.buttonBg, color: 'white' }}
              >
                {isProcessing ? 'Processing...' : 'Upload Paper'}
              </button>
            </div>
            <p style={{ marginTop: '10px', color: paperMessage.startsWith('Success') ? colors.successBg : (paperMessage.startsWith('Network') || paperMessage.startsWith('Upload Error') ? 'red' : colors.textSecondary) }}>
              {paperMessage}
            </p>
          </div>
        </div>

        {/* --------------------------- */}
        {/* 2. ASK A QUESTION SECTION */}
        {/* --------------------------- */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>2. Ask a Question</h2>
          <form onSubmit={handleQuery}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What is the definition of Virtual Machine? OR Compare two hosts."
              required
              style={{...baseInputStyle, backgroundColor: colors.answerBg, color: colors.textPrimary}}
              disabled={isProcessing || !notesMessage.startsWith('Success')}
            />
            <button
              type="submit"
              disabled={queryLoading || isProcessing || !notesMessage.startsWith('Success')}
              style={{...baseQueryButtonStyle, backgroundColor: colors.successBg, color: 'white'}}
            >
              {queryLoading ? 'Thinking...' : 'Get Answer'}
            </button>
          </form>

          {/* --- ANSWER AND IMAGE DISPLAY --- */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: fetchedImage ? 2 : 1, minWidth: fetchedImage ? '400px' : 'auto' }}>
              <h3 style={{ color: colors.textPrimary, borderBottom: `1px dashed ${colors.borderColor}`, paddingBottom: '5px' }}>
                AI Answer: <span style={{fontSize: '0.8em', color: colors.textSecondary}}>
                  ({mode === 'VERBATIM' ? 'Verbatim Extraction' : mode === 'FULL_TEXT' ? 'Full Text Output' : mode})
                </span>
              </h3>
              <div style={answerBoxStyle}>{renderAnswerContent()}</div>
            </div>

            {fetchedImage && (
              <div style={{ flex: 1, minWidth: '300px', maxWidth: '350px', border: `2px solid ${colors.accentColor}`, padding: '15px', backgroundColor: colors.answerBg, borderRadius: '8px' }}>
                <h4 style={{ color: colors.accentColor, marginTop: '0' }}>Extracted Figure Reference</h4>
                <img src={fetchedImage} alt="Extracted figure reference" style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: '4px' }} />
                <p style={{ fontSize: '0.8em', color: colors.textSecondary, marginTop: '10px' }}>*Cropped from the relevant page.</p>
              </div>
            )}
          </div>

          {sources && (
            <p style={{ fontSize: '0.8em', color: colors.textSecondary, marginTop: '10px' }}>
              **Debug Sources:** {sources}
            </p>
          )}
        </div>

        {/* ------------------- */}
        {/* FOOTER SECTION */}
        {/* ------------------- */}
        <div style={{
          marginTop: '60px',
          padding: '20px 0',
          borderTop: `1px solid ${colors.borderColor}`,
          textAlign: 'center',
          color: colors.textSecondary
        }}>
          <div style={{ marginBottom: '15px' }}>
            <a href="https://www.instagram.com/__chandu.talawar__/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Link"
              style={{ textDecoration: 'none' }}>
              <InstagramIcon color={colors.accentColor} />
            </a>
          </div>

          <div style={{ marginBottom: '10px', fontSize: '0.9em' }}>

            <button onClick={() => setPageMode('about')} style={{ margin: '0 10px', color: colors.textSecondary, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              About
            </button>

            <a href="#" style={{ margin: '0 10px', color: colors.textSecondary, textDecoration: 'none' }}>Tool</a>
            <button
  onClick={() => setPageMode('privacy')}
  style={{
    margin: '0 10px',
    color: colors.textSecondary,
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0
  }}
>
  Privacy Policy
</button>

          </div>

          <p style={{ fontSize: '0.8em', color: colors.textSecondary }}>
            &copy; 2025 AI Verbatim Query Assistant
          </p>
        </div>
      </>
    )}
  </div>
);
}

export default App;

