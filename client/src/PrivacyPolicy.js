// client/src/PrivacyPolicy.js
import React from 'react';

const PrivacyPolicy = ({ colors, toggleMode, goBack }) => (
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
    <h2 style={{
      color: colors.accentColor,
      borderBottom: `2px solid ${colors.accentColor}`,
      paddingBottom: '10px',
      marginBottom: '20px'
    }}>
      Privacy Policy
    </h2>

    <p style={{ fontSize: '1.1em', lineHeight: '1.6', marginBottom: '20px', textAlign: 'justify' }}>
      <strong>AI Verbatim Query Assistant</strong> (“we”, “our”, or “us”) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we handle data when you use our app.
    </p>

    <h3 style={{ color: colors.accentColor }}>1. Data We Collect</h3>
    <ul style={{ lineHeight: '1.8', marginBottom: '20px' }}>
      <li>PDF Files: You can upload PDF documents (Notes or Question Papers) to our app.</li>
      <li>Question Inputs: Any questions you type into the app to query the PDFs.</li>
    </ul>

    <h3 style={{ color: colors.accentColor }}>2. How We Use Your Data</h3>
    <p style={{ lineHeight: '1.6', marginBottom: '20px', textAlign: 'justify' }}>
      Uploaded PDFs are temporarily stored and processed to allow our AI model to extract answers. Extracted data is used only to generate responses to your queries. PDFs and extracted data are not shared with third parties.
    </p>

    <h3 style={{ color: colors.accentColor }}>3. Storage</h3>
    <p style={{ lineHeight: '1.6', marginBottom: '20px', textAlign: 'justify' }}>
      PDF content is stored temporarily during processing. No personal information (e.g., names, emails) should be included in uploaded PDFs.
    </p>

    <h3 style={{ color: colors.accentColor }}>4. User Responsibilities</h3>
    <p style={{ lineHeight: '1.6', marginBottom: '20px', textAlign: 'justify' }}>
      Do not upload sensitive or personal documents. Only upload PDFs that you have the right to use. We are not responsible for any personal information you choose to upload.
    </p>

    <h3 style={{ color: colors.accentColor }}>5. Cookies and Tracking</h3>
    <p style={{ lineHeight: '1.6', marginBottom: '20px', textAlign: 'justify' }}>
      Our app does not use cookies or tracking to identify users.
    </p>

    <h3 style={{ color: colors.accentColor }}>6. Changes to Privacy Policy</h3>
    <p style={{ lineHeight: '1.6', marginBottom: '20px', textAlign: 'justify' }}>
      We may update this Privacy Policy from time to time. Any changes will be reflected in the app.
    </p>

    <h3 style={{ color: colors.accentColor }}>7. Contact</h3>
    <p style={{ lineHeight: '1.6', marginBottom: '20px', textAlign: 'justify' }}>
      For questions about this Privacy Policy, please contact us:<br />
      <strong>Email:</strong> chandutalawar187@gmail.com<br />
      <strong>Instagram:</strong> <a href="https://www.instagram.com/__chandu.talawar__/" target="_blank" rel="noopener noreferrer" style={{ color: colors.accentColor }}>__chandu.talawar__</a>
    </p>

    <button
      onClick={() => toggleMode()}
      style={{
        ...{
          padding: '10px 30px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          backgroundColor: colors.accentColor,
          color: 'white',
          border: 'none',
          display: 'block',
          margin: '30px auto 0 auto'
        }
      }}
    >
      Back to Tool
    </button>
  </div>
);

export default PrivacyPolicy;
