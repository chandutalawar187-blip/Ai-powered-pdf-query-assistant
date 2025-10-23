// client/src/App.js (FINAL COMPLETE FRONTEND CODE WITH FIRST/LAST NAME INPUT)
import React, { useState, useRef, useEffect, useCallback } from 'react';
// import './App.css'; // REMOVED: External CSS is not supported in single-file mandate

// --- START: FIREBASE INTEGRATION CODE ---
// NOTE: Replace these with your actual Firebase configuration values
const firebaseConfig = {
    apiKey: "AIzaSyDRyYIhYRAOLHqQkem4Ekspv7SFCjaTXkA",
    authDomain: "ai-powered-pdf-query-assistant.firebaseapp.com",
    projectId: "ai-powered-pdf-query-assistant",
    storageBucket: "ai-powered-pdf-query-assistant.firebasestorage.app",
    messagingSenderId: "350459830933",
    appId: "1:350459830933:web:2c18f7b80bbe6dac27b19c",
    measurementId: "G-53E18BYWMG"
};

// Function to dynamically load Firebase SDKs required for authentication
const loadFirebaseScripts = () => {
    // Check if Firebase app scripts are already available on the window object
    if (typeof window.firebase !== 'undefined' && window.firebase.auth) {
        return Promise.resolve();
    }

    const loadScript = (url) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });

    // We must load firebase-app first, then firebase-auth
    return loadScript("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js")
        .then(() => loadScript("https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"))
        .then(() => {
            // Initialize Firebase App after both scripts are loaded
            if (window.firebase && !window.firebase.apps.length) {
                window.firebase.initializeApp(firebaseConfig);
            }
        });
};


const getFirebaseAuth = () => {
    if (typeof window.firebase !== 'undefined' && window.firebase.auth) {
        // Ensure app is initialized before calling getAuth
        if (!window.firebase.apps.length) {
            window.firebase.initializeApp(firebaseConfig);
        }
        return window.firebase.auth();
    }
    // Fallback or error handling if Firebase isn't globally available
    throw new Error("Firebase Auth is not available. Ensure Firebase SDK scripts are loaded.");
};

// --- END: FIREBASE INTEGRATION CODE ---


// --- PRIVACY POLICY COMPONENT (Integrated) ---
const PrivacyPolicy = ({ colors, setPageMode }) => (
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
            Privacy Policy
        </h2>
        <p style={{ lineHeight: '1.6' }}>
            Your privacy is important to us. This policy explains how we handle your data.
        </p>

        <h3 style={{ marginTop: '20px', color: colors.textPrimary }}>1. Data Collection and Storage</h3>
        <p style={{ lineHeight: '1.6', color: colors.textSecondary }}>
            We collect the PDF files you upload, along with your username and hashed password (for authentication only). All uploaded files are stored temporarily on the server's disk space linked to your user account to facilitate the Retrieval-Augmented Generation (RAG) process. Your files are private and only accessible by your account.
        </p>

        <h3 style={{ marginTop: '20px', color: colors.textPrimary }}>2. Data Deletion</h3>
        <p style={{ lineHeight: '1.6', color: colors.textSecondary }}>
            You maintain full control over your documents. You can delete any uploaded file at any time via the **File Manager** page. Deleting a file removes it permanently from the server's disk storage and the database record. User accounts can be deleted manually by contacting support (this is a conceptual project; in a real app, an automated delete feature would be provided).
        </p>

        <h3 style={{ marginTop: '20px', color: colors.textPrimary }}>3. Security</h3>
        <p style={{ lineHeight: '1.6', color: colors.textSecondary }}>
            User passwords are not stored in plaintext; they are securely stored using cryptographic hashing and salting via `werkzeug.security`. We use session management for authentication.
        </p>

        <button
            onClick={() => setPageMode('tool')}
            style={{
                padding: '10px 30px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'background-color 0.3s',
                display: 'block',
                margin: '30px auto 0 auto',
                backgroundColor: colors.accentColor,
                color: 'white',
            }}
        >
            Go Back to the Tool
        </button>
    </div>
);
// --- END PRIVACY POLICY COMPONENT ---


// --- API URL CONFIGURATION ---
const RENDER_API_URL = 'https://ai-powered-pdf-query-assistant.onrender.com';
const LOCAL_API_URL = 'http://localhost:5000';

// CRITICAL: Determine the correct API_URL based on where the frontend is running
const API_URL = window.location.hostname === 'localhost'
              ? LOCAL_API_URL
              : RENDER_API_URL;

// --- GLOBAL UTILITIES & STYLES (Keep as is) ---
const markdownTableToHtml = (markdown, isDark) => {
    // ... (utility function body remains the same)
    const tableStyles = {
        tableBg: isDark ? '#2d3748' : '#fff',
        thBg: isDark ? '#4a5568' : '#f2f2f2',
        thText: isDark ? '#e2e8f0' : '#333',
        tdText: isDark ? '#a0aec0' : '#333',
        tdBorder: isDark ? '#4a5568' : '#eee',
    };

    const lines = markdown.trim().split('\n').filter(line => line.includes('|'));

    if (lines.length < 2) return markdown;

    // The backend is instructed to output 'Parameter', 'IoT', and 'CPS'.
    const headerLine = lines[0].split('|').filter(h => h.trim()).map(h => `<th style="background-color: ${tableStyles.thBg}; color: ${tableStyles.thText}; padding: 10px; border: 1px solid ${tableStyles.tdBorder}; text-align: left;">${h.trim().replace('Parameter', 'Parameter (Page(s))')}</th>`).join('');

    const header = headerLine ? `<thead><tr>${headerLine}</tr></thead>` : '';

    const bodyLines = lines.slice(2);

    const body = bodyLines.map((line, index) => {
        const rowBg = (index % 2 === 0) ? tableStyles.tableBg : (isDark ? '#1a202c' : '#fafafa');

        const rowCells = line.split('|').filter(cell => cell.trim()).map(cell => `<td style="padding: 8px; border: 1px solid ${tableStyles.tdBorder}; color: ${tableStyles.tdText};">${cell.trim()}</td>`).join('');

        return `<tr style="background-color: ${rowBg};">${rowCells}</tr>`;
    }).join('');

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

// --- ABOUT PAGE COMPONENT (Omitted for brevity, assumed unchanged) ---
const AboutPage = ({ colors, setPageMode }) => (
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
            onClick={() => setPageMode('tool')}
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


// --- SOCIAL LOGIN ICON HELPER (UPDATED for Firebase) ---
const SocialLoginButton = ({ provider, colors, setLoading, setAuthData, setMessage, firebaseLoaded, setPendingAuthData, setPageMode }) => {
    const iconMap = {
        google: 'Google',
        github: 'GitHub',
        // Microsoft removed
    };
    const colorMap = {
        google: '#DB4437', // Red
        github: '#24292e', // Dark Gray/Black
    };

    const handleClick = async () => {
        if (!firebaseLoaded) return;
        try {
            setLoading(true);
            setMessage(`Signing in with ${iconMap[provider]}...`);
            const auth = getFirebaseAuth();
            let providerInstance;

            switch (provider) {
                case 'google':
                    providerInstance = new window.firebase.auth.GoogleAuthProvider();
                    break;
                case 'github':
                    providerInstance = new window.firebase.auth.GithubAuthProvider();
                    break;
                default:
                    // Should not happen if buttons are removed, but safety check
                    throw new Error("Unsupported provider");
            }

            const result = await auth.signInWithPopup(providerInstance);
            const user = result.user;

            // --- CRITICAL CHANGE: Redirect to Consent Page ---
            setPendingAuthData({
                username: user.displayName || 'N/A',
                email: user.email || 'N/A',
                userId: user.uid,
                token: await user.getIdToken(),
                provider: iconMap[provider]
            });
            setPageMode('consent_display');
            setMessage(``);

        } catch (error) {
            console.error("Firebase Auth Error:", error);
            setMessage(`Authentication Failed: ${error.message.replace('Firebase:', '').trim()}`);
            setAuthData({ isAuthenticated: false, username: '', userId: null, token: null });
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={!firebaseLoaded}
            style={{
                ...baseButtonStyle,
                backgroundColor: colorMap[provider],
                color: 'white',
                padding: '12px 20px',
                width: '100%',
                marginBottom: '10px',
                boxShadow: `0 2px 4px ${colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
            }}
        >
            <span>Sign in with {iconMap[provider]}</span>
        </button>
    );
};


// --- CONSENT DISPLAY PAGE (NEW COMPONENT) ---
const ConsentDisplayPage = ({ colors, pendingAuthData, setAuthData, setPageMode }) => {

    // Function to finalize login after user confirms
    const finalizeLogin = () => {
        setAuthData({
            isAuthenticated: true,
            username: pendingAuthData.username,
            userId: pendingAuthData.userId,
            token: pendingAuthData.token,
        });
        setPageMode('tool');
    };

    const data = [
        { label: 'Provider', value: pendingAuthData.provider },
        { label: 'Name (Display Name)', value: pendingAuthData.username },
        { label: 'Email Address', value: pendingAuthData.email },
        { label: 'Unique User ID (UID)', value: pendingAuthData.userId.substring(0, 8) + '...' },
    ];

    return (
        <div style={{
            padding: '40px',
            maxWidth: '550px',
            margin: '5vh auto',
            backgroundColor: colors.bgSecondary,
            borderRadius: '15px',
            boxShadow: `0 10px 30px ${colors.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'}`,
            color: colors.textPrimary,
            border: `1px solid ${colors.borderColor}`,
            textAlign: 'center',
        }}>
            <h2 style={{ color: colors.accentColor, fontSize: '1.8em', marginBottom: '10px' }}>
                Account Data Access
            </h2>
            <p style={{ color: colors.textSecondary, marginBottom: '30px' }}>
                You have successfully signed in using **{pendingAuthData.provider}**.
                We use the following information to personalize your experience and secure your uploaded files.
            </p>

            <div style={{ textAlign: 'left', marginBottom: '30px', border: `1px solid ${colors.borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
                {data.map((item, index) => (
                    <div
                        key={item.label}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '12px 15px',
                            backgroundColor: index % 2 === 0 ? colors.tableBg : colors.answerBg,
                            borderBottom: index < data.length - 1 ? `1px solid ${colors.borderColor}` : 'none'
                        }}
                    >
                        <span style={{ fontWeight: '600', color: colors.textPrimary }}>{item.label}:</span>
                        <span style={{ color: colors.accentColor, fontWeight: '500' }}>{item.value}</span>
                    </div>
                ))}
            </div>

            <p style={{ fontSize: '0.9em', color: colors.textSecondary, marginTop: '20px' }}>
                *Note: Your unique ID is used by the backend to link your documents to your account. Your files are private.
            </p>

            <button
                onClick={finalizeLogin}
                style={{
                    ...baseQueryButtonStyle,
                    backgroundColor: colors.successBg,
                    color: 'white',
                    marginTop: '20px',
                    width: '70%',
                }}
            >
                Continue to Query Assistant
            </button>
        </div>
    );
};


// --- PROFESSIONAL LOGIN/REGISTER COMPONENT (UPDATED for Firebase) ---
const LoginPage = ({ colors, setIsAuthenticated, setUsername, setPageMode, setUserId, setToken, firebaseLoaded, setPendingAuthData }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [emailInput, setEmailInput] = useState(''); // Changed from usernameInput to emailInput
    const [passwordInput, setPasswordInput] = useState('');

    // NEW STATES for Name fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // State to handle the password reset flow UI
    const [resetMode, setResetMode] = useState(false);

    const setAuthData = ({ isAuthenticated, username, userId, token }) => {
        setIsAuthenticated(isAuthenticated);
        setUsername(username);
        setUserId(userId);
        setToken(token);
        if (isAuthenticated) {
            setPageMode('tool');
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!firebaseLoaded) {
            setMessage('Firebase is still loading. Please wait.');
            return;
        }
        if (!emailInput) {
            setMessage('Please enter your email address above to reset the password.');
            return;
        }
        setLoading(true);
        setMessage('');

        try {
            const auth = getFirebaseAuth();
            // Firebase function to send the reset email
            await auth.sendPasswordResetEmail(emailInput);
            setMessage(`Success! Password reset link sent to ${emailInput}. Check your inbox.`);
            setResetMode(false); // Switch back to login view
            setEmailInput('');
        } catch (error) {
            console.error("Password Reset Error:", error);
            setMessage(`Reset Failed: ${error.message.replace('Firebase:', '').trim()}`);
        } finally {
            setLoading(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!firebaseLoaded) {
            setMessage('Firebase is still loading. Please wait.');
            return;
        }
        setLoading(true);
        setMessage('');

        try {
            const auth = getFirebaseAuth();
            let userCredential;
            let displayUsername;

            if (isLogin) {
                userCredential = await auth.signInWithEmailAndPassword(emailInput, passwordInput);
                // For login, use the existing display name or fallback to email
                displayUsername = userCredential.user.displayName || userCredential.user.email || 'User';

            } else {
                // Registration logic: Validate name fields
                if (passwordInput.length < 6) {
                    setMessage('Password must be at least 6 characters long.');
                    setLoading(false);
                    return;
                }
                if (!firstName || !lastName) {
                    setMessage('Please enter both First Name and Last Name.');
                    setLoading(false);
                    return;
                }

                // 1. Create User
                userCredential = await auth.createUserWithEmailAndPassword(emailInput, passwordInput);

                // 2. Set Display Name
                displayUsername = `${firstName} ${lastName}`.trim();

                await userCredential.user.updateProfile({
                    displayName: displayUsername
                });
            }

            const user = userCredential.user;
            const idToken = await user.getIdToken();

            setAuthData({
                isAuthenticated: true,
                username: displayUsername,
                userId: user.uid,
                token: idToken,
            });
            setMessage(`${isLogin ? 'Login' : 'Registration'} successful!`);

        } catch (error) {
            console.error("Firebase Auth Error:", error);
            setMessage(`Authentication Failed: ${error.message.replace('Firebase:', '').trim()}`);
        } finally {
            setLoading(false);
        }
    };

    const cardStyle = {
        padding: '40px',
        maxWidth: '400px',
        margin: '5vh auto',
        backgroundColor: colors.bgSecondary,
        borderRadius: '15px',
        boxShadow: `0 10px 30px ${colors.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'}`,
        color: colors.textPrimary,
        border: `1px solid ${colors.borderColor}`,
        textAlign: 'center',
        transform: loading ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 0.3s ease-in-out'
    };

    const inputFocusStyle = {
        boxShadow: `0 0 0 2px ${colors.accentColor}`,
        transition: 'box-shadow 0.2s'
    };

    // --- Render Content based on Reset Mode ---

    const renderAuthForm = () => {
        if (resetMode) {
            return (
                <form onSubmit={handlePasswordReset}>
                    <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="Enter your Email"
                        required
                        style={{
                            ...baseInputStyle,
                            backgroundColor: colors.answerBg,
                            color: colors.textPrimary,
                            border: `1px solid ${colors.borderColor}`,
                        }}
                        onFocus={(e) => e.target.style.boxShadow = inputFocusStyle.boxShadow}
                        onBlur={(e) => e.target.style.boxShadow = 'none'}
                        disabled={!firebaseLoaded}
                    />
                    <button
                        type="submit"
                        disabled={loading || !firebaseLoaded}
                        style={{
                            ...baseQueryButtonStyle,
                            backgroundColor: loading ? colors.buttonHover : colors.accentColor,
                            color: 'white',
                            marginBottom: '15px',
                            marginTop: '10px'
                        }}
                    >
                        {loading ? 'Sending Link...' : 'Send Reset Link'}
                    </button>
                </form>
            );
        }

        // Standard Login/Register Form
        return (
            <form onSubmit={handleSubmit}>

                {/* --- Name Fields (Only for Registration) --- */}
                {!isLogin && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First Name"
                            required
                            style={{
                                ...baseInputStyle,
                                width: '50%',
                                backgroundColor: colors.answerBg,
                                color: colors.textPrimary,
                                border: `1px solid ${colors.borderColor}`,
                            }}
                            onFocus={(e) => e.target.style.boxShadow = inputFocusStyle.boxShadow}
                            onBlur={(e) => e.target.style.boxShadow = 'none'}
                            disabled={!firebaseLoaded}
                        />
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last Name"
                            required
                            style={{
                                ...baseInputStyle,
                                width: '50%',
                                marginBottom: '15px',
                                backgroundColor: colors.answerBg,
                                color: colors.textPrimary,
                                border: `1px solid ${colors.borderColor}`,
                            }}
                            onFocus={(e) => e.target.style.boxShadow = inputFocusStyle.boxShadow}
                            onBlur={(e) => e.target.style.boxShadow = 'none'}
                            disabled={!firebaseLoaded}
                        />
                    </div>
                )}

                <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Email Address"
                    required
                    style={{
                        ...baseInputStyle,
                        backgroundColor: colors.answerBg,
                        color: colors.textPrimary,
                        border: `1px solid ${colors.borderColor}`,
                    }}
                    onFocus={(e) => e.target.style.boxShadow = inputFocusStyle.boxShadow}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                    disabled={!firebaseLoaded}
                />
                <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Password (Min 6 chars)"
                    required
                    style={{
                        ...baseInputStyle,
                        backgroundColor: colors.answerBg,
                        color: colors.textPrimary,
                        border: `1px solid ${colors.borderColor}`,
                    }}
                    onFocus={(e) => e.target.style.boxShadow = inputFocusStyle.boxShadow}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                    disabled={!firebaseLoaded}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                     {isLogin && (
                         <button
                             type="button"
                             onClick={() => {
                                 setResetMode(true);
                                 setMessage('');
                             }}
                             style={{
                                 background: 'none',
                                 border: 'none',
                                 color: colors.textSecondary,
                                 cursor: 'pointer',
                                 fontSize: '0.85em',
                                 textDecoration: 'underline',
                                 padding: 0,
                                 fontWeight: '400'
                             }}
                             disabled={!firebaseLoaded}
                         >
                             Forgot Password?
                         </button>
                     )}
                </div>
                <button
                    type="submit"
                    disabled={loading || !firebaseLoaded}
                    style={{
                        ...baseQueryButtonStyle,
                        backgroundColor: loading ? colors.buttonHover : colors.accentColor,
                        color: 'white',
                        marginBottom: '15px',
                        marginTop: '10px'
                    }}
                >
                    {loading ? (isLogin ? 'Signing in...' : 'Registering... ') : isLogin ? 'Sign In' : 'Sign Up'}
                </button>
            </form>
        );
    };


    return (
        <div style={cardStyle}>
            <h1 style={{ color: colors.accentColor, fontSize: '2em', marginBottom: '10px' }}>
                Verbatim AI
            </h1>
            <h3 style={{ color: colors.textSecondary, marginBottom: '30px', fontWeight: '400' }}>
                {resetMode ? 'Reset Your Password' : (isLogin ? 'Sign in to continue' : 'Create your account')}
            </h3>

            {/* --- Loading Indicator / Social Login Buttons --- */}
            {!firebaseLoaded && (
                <div style={{ color: colors.accentColor, margin: '20px 0', fontWeight: 'bold' }}>
                    Loading Authentication...
                </div>
            )}
            {!resetMode && (
                <div style={{ marginBottom: '20px', pointerEvents: firebaseLoaded ? 'auto' : 'none', opacity: firebaseLoaded ? 1 : 0.5 }}>
                    <SocialLoginButton provider="github" colors={colors} setLoading={setLoading} setAuthData={setAuthData} setMessage={setMessage} firebaseLoaded={firebaseLoaded} setPendingAuthData={setPendingAuthData} setPageMode={setPageMode} />
                    <SocialLoginButton provider="google" colors={colors} setLoading={setLoading} setAuthData={setAuthData} setMessage={setMessage} firebaseLoaded={firebaseLoaded} setPendingAuthData={setPendingAuthData} setPageMode={setPageMode} />
                    {/* Microsoft login button removed */}
                    <div style={{ margin: '20px 0', fontSize: '0.9em', color: colors.textSecondary, position: 'relative' }}>
                        <div style={{ content: '""', position: 'absolute', top: '50%', left: 0, right: 0, borderTop: `1px solid ${colors.borderColor}` }}></div>
                        <span style={{ backgroundColor: colors.bgSecondary, padding: '0 10px', position: 'relative', zIndex: 1 }}>OR</span>
                    </div>
                </div>
            )}

            {/* --- Auth Form --- */}
            {renderAuthForm()}

            <p style={{
                color: message.includes('Failed') || message.includes('Error') || message.includes('Password') ? 'red' : colors.successBg,
                fontSize: '0.9em',
                minHeight: '20px'
            }}>
                {message || (!firebaseLoaded ? 'Waiting for Firebase SDK...' : '')}
            </p>

            {resetMode ? (
                <button
                    onClick={() => {
                        setResetMode(false);
                        setMessage('');
                        setEmailInput('');
                    }}
                    style={{
                        ...baseButtonStyle,
                        display: 'block',
                        margin: '10px auto 0 auto',
                        backgroundColor: 'transparent',
                        color: colors.textSecondary,
                        textDecoration: 'none',
                        fontSize: '0.9em'
                    }}
                    disabled={!firebaseLoaded}
                >
                    Back to Sign In
                </button>
            ) : (
                <button
                    onClick={() => {
                        setIsLogin(prev => !prev);
                        setMessage('');
                        setEmailInput('');
                        setPasswordInput('');
                        setFirstName('');
                        setLastName('');
                    }}
                    style={{
                        ...baseButtonStyle,
                        display: 'block',
                        margin: '10px auto 0 auto',
                        backgroundColor: 'transparent',
                        color: colors.textSecondary,
                        textDecoration: 'none',
                        fontSize: '0.9em'
                    }}
                    disabled={!firebaseLoaded}
                >
                    {isLogin ? 'Don\'t have an account? Sign Up' : 'Already have an account? Sign In'}
                </button>
            )}
        </div>
    );
};

// --- FILE MANAGEMENT COMPONENT (UPDATED for Session Shift) ---
const FileManagementPage = ({ colors, setPageMode, isAuthenticated, token, userId, activeNotesFileName, setActiveNotesFileName, setNotesMessage }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const fetchFiles = useCallback(async () => {
        if (!isAuthenticated || !token) return;
        setLoading(true);
        setMessage('');

        try {
            // Send token in Authorization header
            const response = await fetch(`${API_URL}/files?userId=${userId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setFiles(data);
            } else {
                const errorData = await response.json();
                setMessage(`Failed to load files: ${errorData.error}`);
            }
        } catch (error) {
            setMessage('Network error while fetching files.');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, token, userId]);

    const handleDelete = async (fileId) => {
        if (!window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
            return;
        }
        if (!token) {
            setMessage("Authentication required to delete file.");
            return;
        }

        setMessage(`Deleting file ID ${fileId}...`);

        try {
            // Send token in Authorization header
            const response = await fetch(`${API_URL}/files/${fileId}?userId=${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                setMessage("File deleted successfully. RAG state rebuilt.");
                fetchFiles();
            } else {
                const errorData = await response.json();
                setMessage(`Deletion Failed: ${errorData.error}`);
            }
        } catch (error) {
            setMessage('Network error during file deletion.');
        }
    };

    // --- NEW FUNCTION: Set Active Notes File ---
    const handleSetActiveNotes = async (fileId, fileName) => {
        if (!token) {
            setMessage("Authentication required to set active file.");
            return;
        }
        setLoading(true);
        setMessage(`Switching active notes context to ${fileName}...`);

        try {
            const response = await fetch(`${API_URL}/set-active-notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fileId: fileId, userId: userId }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update state in the parent App component
                setActiveNotesFileName(data.filename);
                setNotesMessage(`Success! Active notes switched to: ${data.filename}`);
                setMessage(`Notes switched successfully.`);
            } else {
                setMessage(`Failed to switch notes: ${data.error}`);
            }
        } catch (error) {
            setMessage('Network error during notes switch.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchFiles();
        }
    }, [isAuthenticated, token, fetchFiles]);

    return (
        <div style={{
            padding: '40px',
            maxWidth: '900px',
            margin: '50px auto',
            backgroundColor: colors.bgSecondary,
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
            color: colors.textPrimary,
            border: `1px solid ${colors.borderColor}`
        }}>
            <h2 style={{ color: colors.accentColor, borderBottom: `2px solid ${colors.accentColor}`, paddingBottom: '10px', marginBottom: '20px' }}>
                Manage My Uploaded Documents
            </h2>
            <p style={{color: colors.textSecondary}}>
                **Active Notes File:** <span style={{fontWeight: 'bold', color: colors.accentColor}}>{activeNotesFileName || 'None'}</span>
            </p>
            <p style={{color: colors.textSecondary}}>
                Use the **Set Active** button to instantly switch the document used for answering queries, avoiding slow re-uploads.
            </p>

            <button
                onClick={() => setPageMode('tool')}
                style={{ ...baseButtonStyle, backgroundColor: colors.accentColor, color: 'white', marginBottom: '20px' }}
            >
                Back to Query Tool
            </button>

            {message && <p style={{ color: message.includes('Failed') || message.includes('Error') ? 'red' : colors.successBg }}>{message}</p>}

            {loading && !message.includes('Switching') ? (
                <p style={{color: colors.accentColor}}>Loading files...</p>
            ) : files.length === 0 ? (
                <p style={{color: colors.textSecondary}}>You have no files stored. Please upload some from the tool page.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                        <thead>
                            <tr style={{ backgroundColor: colors.thBg }}>
                                <th style={{ padding: '10px', border: `1px solid ${colors.tdBorder}`, textAlign: 'left', color: colors.thText }}>Type</th>
                                <th style={{ padding: '10px', border: `1px solid ${colors.tdBorder}`, textAlign: 'left', color: colors.thText }}>Filename</th>
                                <th style={{ padding: '10px', border: `1px solid ${colors.tdBorder}`, textAlign: 'left', color: colors.thText }}>Chunks</th>
                                <th style={{ padding: '10px', border: `1px solid ${colors.tdBorder}`, textAlign: 'center', color: colors.thText }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file, index) => {
                                const isNotes = file.type === 'notes';
                                const isActive = isNotes && file.filename === activeNotesFileName;
                                return (
                                    <tr key={file.id} style={{
                                        backgroundColor: isActive ? colors.accentColor + '10' : (index % 2 === 0 ? colors.tableBg : colors.answerBg),
                                        border: isActive ? `2px solid ${colors.accentColor}` : `1px solid ${colors.tdBorder}`,
                                    }}>
                                        <td style={{ padding: '10px', border: `1px solid ${colors.tdBorder}`, color: colors.textPrimary }}>
                                            <span style={{ fontWeight: 'bold', color: file.type === 'notes' ? (isActive ? colors.accentColor : colors.accentColor) : colors.textSecondary }}>
                                                {file.type.toUpperCase()} {isActive && '(ACTIVE)'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px', border: `1px solid ${colors.tdBorder}`, color: colors.textPrimary }}>{file.filename}</td>
                                        <td style={{ padding: '10px', border: `1px solid ${colors.tdBorder}`, color: colors.textPrimary }}>{file.indexed_chunks}</td>
                                        <td style={{ padding: '10px', border: `1px solid ${colors.tdBorder}`, textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                            {isNotes && !isActive && (
                                                <button
                                                    onClick={() => handleSetActiveNotes(file.id, file.filename)}
                                                    disabled={loading}
                                                    style={{ ...baseButtonStyle, backgroundColor: colors.buttonBg, color: 'white', padding: '5px 10px' }}
                                                >
                                                    Set Active
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                style={{ ...baseButtonStyle, backgroundColor: 'red', color: 'white', padding: '5px 10px' }}
                                                disabled={loading}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


// --- MAIN APP COMPONENT (MODIFIED) ---
function App() {
    // Global State for UI
    const [theme, setTheme] = useState('light');
    const [pageMode, setPageMode] = useState('login');

    // AUTH STATE
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState(null);
    const [token, setToken] = useState(null);
    const [firebaseLoaded, setFirebaseLoaded] = useState(false); // New state for script loading
    // NEW STATE: Holds auth data temporarily after social login, before consent
    const [pendingAuthData, setPendingAuthData] = useState(null);

    // DUAL FILE UPLOAD STATE
    const [notesFile, setNotesFile] = useState(null);
    const [paperFile, setPaperFile] = useState(null);

    // CRITICAL NEW STATE FOR ACTIVE FILE
    const [activeNotesFileName, setActiveNotesFileName] = useState(null);

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

    // --- Theme Toggle Logic (unchanged) ---
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // --- Dynamic Style Definitions (unchanged) ---

    const isDark = theme === 'dark';

    const colors = {
        isDark,
        bgPrimary: isDark ? '#1a202c' : '#f4f7f6',
        bgSecondary: isDark ? '#2d3748' : '#fff',
        textPrimary: isDark ? '#e2e8f0' : '#2c3e50',
        textSecondary: isDark ? '#a0aec0' : '#666',
        borderColor: isDark ? '#4a5568' : '#ddd',
        accentColor: isDark ? '#63b3ed' : '#1a73e8',
        buttonBg: isDark ? '#4299e1' : '#1a73e8',
        buttonHover: isDark ? '#3182ce' : '#155bb5',
        successBg: isDark ? '#2f855a' : '#00c853',
        answerBg: isDark ? '#243447' : '#f8f9fa',
        thBg: isDark ? '#4a5568' : '#f2f2f2',
        tdBorder: isDark ? '#4a5568' : '#eee',
        tableBg: isDark ? '#2d3748' : '#fff',
        thText: isDark ? '#e2e8f0' : '#333',
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

    const answerBoxStyle = {
        minHeight: '150px',
        padding: '15px',
        backgroundColor: colors.answerBg,
        borderRadius: '8px',
        border: `1px solid ${colors.borderColor}`
    };


    // --- AUTH STATUS CHECKER (UPDATED for Firebase) ---
    const checkAuthStatus = useCallback(() => {
        if (typeof window.firebase === 'undefined' || !firebaseLoaded) return;

        const auth = getFirebaseAuth();
        // Sets up a listener for the entire app lifetime
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const idToken = await user.getIdToken();
                setIsAuthenticated(true);
                // Use displayName if available, otherwise fall back to email
                setUsername(user.displayName || user.email || 'User');
                setUserId(user.uid);
                setToken(idToken);
                // We rely on the backend/File Manager to confirm the active file name.
                setActiveNotesFileName(prevState => prevState || 'Operating_Systems_Practice_Questions.pdf');

                if (pageMode === 'login' || pageMode === 'register' || pageMode === 'consent_display') {
                    setPageMode('tool');
                }
            } else {
                setIsAuthenticated(false);
                setUsername('');
                setUserId(null);
                setToken(null);
                setActiveNotesFileName(null);
                if (pageMode === 'tool' || pageMode === 'file_manager') {
                    setPageMode('login');
                }
            }
        });
    }, [pageMode, firebaseLoaded]);

    useEffect(() => {
        loadFirebaseScripts()
            .then(() => {
                setFirebaseLoaded(true);
                // Call checkAuthStatus only after scripts are confirmed loaded
            })
            .catch(error => {
                console.error("Failed to load Firebase SDKs:", error);
                setFirebaseLoaded(false);
            });
    }, []);

    useEffect(() => {
        // Runs whenever firebaseLoaded state changes
        if (firebaseLoaded) {
            checkAuthStatus();
        }
    }, [firebaseLoaded, checkAuthStatus]);


    // --- LOGOUT HANDLER (UPDATED for Firebase) ---
    const handleLogout = async () => {
        try {
            if (window.firebase) {
                const auth = getFirebaseAuth();
                await auth.signOut();
            }

            // Clear local state
            setIsAuthenticated(false);
            setUsername('');
            setUserId(null);
            setToken(null);
            setActiveNotesFileName(null);
            setNotesFile(null);
            setPaperFile(null);
            setNotesMessage('');
            setPaperMessage('');
            setAnswer('');
            setPageMode('login');
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };


    // --- DUAL PDF UPLOAD HANDLERS (UPDATED to use Token) ---

    const handleUpload = async (file, type) => {
        if (!file || !isAuthenticated || !userId || !token) return;

        const isNotes = type === 'notes';
        const setFileMessage = isNotes ? setNotesMessage : setPaperMessage;
        const uploadEndpoint = isNotes ? `${API_URL}/upload-notes` : `${API_URL}/upload-paper`;

        setIsProcessing(true);
        setFileMessage(`Processing ${isNotes ? 'Notes' : 'Paper'}...`);

        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('userId', userId); // Pass userId for backend state management

        try {
            const response = await fetch(uploadEndpoint, {
                method: 'POST',
                body: formData,
                // CRITICAL FIX: Send the ID Token in the Authorization header
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();

            if (response.ok) {
                setFileMessage(`Success! ${isNotes ? 'Notes' : 'Paper'} processed. ${data.chunks_count} chunks indexed.`);
                if (isNotes) {
                    setAnswer(''); setSources(''); setMode(''); setFetchedImage(null);
                    // CRITICAL: Set the active notes filename upon successful new notes upload
                    setActiveNotesFileName(file.name);
                }
            } else if (response.status === 401) {
                setFileMessage('Unauthorized. Please log in again.');
                handleLogout(); // Force logout on auth failure
            }
            else {
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


    // --- QUERY HANDLER (UPDATED to use Token) ---
    const handleQuery = async (e) => {
        e.preventDefault();
        const canQuery = isAuthenticated && activeNotesFileName && userId && token; // Check activeNotesFileName
        if (queryLoading || isProcessing || !canQuery) {
             if (!activeNotesFileName) {
                 setNotesMessage('Please upload or set an active Notes PDF first.');
             }
             return;
        }

        setQueryLoading(true); setAnswer(''); setSources(''); setMode(''); setFetchedImage(null);

        try {
            const response = await fetch(`${API_URL}/query`, {
                method: 'POST',
                // CRITICAL FIX: Send the ID Token in the Authorization header
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ question, userId }),
            });

            const data = await response.json();

            if (response.ok) {
                setAnswer(data.answer);
                setSources(data.sources || "Direct API response.");
                setMode(data.mode || "VERBATIM");
                setFetchedImage(data.image_data || null);
            } else if (response.status === 401) {
                setAnswer('Unauthorized. Please log in.');
                handleLogout(); // Force logout on auth failure
            } else {
                setAnswer(`Query Error: ${data.error}`); setSources(''); setMode('ERROR');
            }
        } catch (error) {
            setAnswer('Network Error: Could not connect to backend server.'); setSources(''); setMode('ERROR');
        } finally {
            setQueryLoading(false);
        }
    };

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
            const tableHtml = markdownTableToHtml(answer, isDark);

            return (
                <div style={{ padding: '15px', border: `1px solid ${colors.accentColor}`, backgroundColor: colors.answerBg, borderRadius: '8px' }}>
                    <h4 style={{marginTop: '0', color: colors.accentColor}}>Comparison Table</h4>

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
            <p style={{
                whiteSpace: 'pre-wrap',
                fontWeight: '500',
                color: colors.textPrimary,
                textAlign: 'justify',
                fontSize: '1.05em',
                lineHeight: '1.6'
            }}>
                {answer}
            </p>
        );
    };


    return (
        <div className="App" style={globalStyle}>
            {pageMode === 'login' || pageMode === 'register' ? (
                <LoginPage
                    colors={colors}
                    setPageMode={setPageMode}
                    setIsAuthenticated={setIsAuthenticated}
                    setUsername={setUsername}
                    setUserId={setUserId}
                    setToken={setToken}
                    firebaseLoaded={firebaseLoaded}
                    setPendingAuthData={setPendingAuthData}
                />
            ) : pageMode === 'consent_display' && pendingAuthData ? (
                <ConsentDisplayPage
                    colors={colors}
                    pendingAuthData={pendingAuthData}
                    setAuthData={({ isAuthenticated, username, userId, token }) => {
                        setIsAuthenticated(isAuthenticated);
                        setUsername(username);
                        setUserId(userId);
                        setToken(token);
                    }}
                    setPageMode={setPageMode}
                />
            ) : pageMode === 'about' ? (
                <AboutPage colors={colors} setPageMode={setPageMode} />
            ) : pageMode === 'privacy' ? (
                <PrivacyPolicy colors={colors} setPageMode={setPageMode} />
            ) : pageMode === 'file_manager' ? (
                <FileManagementPage
                    colors={colors}
                    setPageMode={setPageMode}
                    isAuthenticated={isAuthenticated}
                    userId={userId}
                    token={token}
                    activeNotesFileName={activeNotesFileName}
                    setActiveNotesFileName={setActiveNotesFileName}
                    setNotesMessage={setNotesMessage}
                />
            ) : (
                <>
                    {/* Header and Theme Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <h1 style={{ color: colors.textPrimary, fontSize: '2em', marginBottom: '10px' }}>
                            AI Verbatim Query Assistant
                        </h1>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ color: colors.accentColor, fontWeight: 'bold' }}>
                                {username ? `Welcome, ${username}` : 'Guest'}
                            </span>

                            {/* NEW LOCATION: File Manager Button */}
                            {isAuthenticated && (
                                <button
                                    onClick={() => setPageMode('file_manager')}
                                    style={{
                                        ...baseButtonStyle,
                                        padding: '8px 8px',
                                        backgroundColor: colors.accentColor,
                                        color: 'white',
                                        fontWeight: '500'
                                    }}
                                >
                                    File Manager
                                </button>
                            )}

                            <button
                                onClick={handleLogout}
                                style={{
                                    ...baseButtonStyle,
                                    padding: '8px 15px',
                                    backgroundColor: 'red',
                                    color: 'white',
                                }}
                            >
                                Logout
                            </button>
                            <button
                                onClick={toggleTheme}
                                style={{
                                    ...baseButtonStyle,
                                    padding: '8px 15px',
                                    backgroundColor: colors.buttonBg,
                                    color: 'white',
                                }}
                            >
                                {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
                            </button>
                        </div>
                    </div>

                    {/* ------------------------ */}
                    {/* 1. DUAL UPLOAD SECTION */}
                    {/* ------------------------ */}
                    <div style={sectionStyle}>
                        <h2 style={titleStyle}>1. Upload Documents</h2>
                        <p style={{color: colors.textSecondary}}>
                            Active Notes: <span style={{fontWeight: 'bold', color: colors.accentColor}}>{activeNotesFileName || 'None'}</span>.
                            To switch files quickly, visit the <button onClick={() => setPageMode('file_manager')} style={{background: 'none', border: 'none', color: colors.accentColor, padding: 0, textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold'}}>File Manager</button>.
                        </p>


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
                                        disabled={isProcessing || !isAuthenticated}
                                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', zIndex: 10, cursor: 'pointer' }}
                                    />
                                    <button
                                        onClick={(e) => { e.preventDefault(); notesFileInputRef.current.click(); }}
                                        disabled={isProcessing || !isAuthenticated}
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
                                    disabled={isProcessing || !notesFile || !isAuthenticated}
                                    style={{ ...baseButtonStyle, backgroundColor: colors.buttonBg, color: 'white' }}
                                >
                                    {isProcessing ? 'Processing...' : 'Upload Notes'}
                                </button>
                            </div>
                            <p style={{ marginTop: '10px', color: notesMessage.startsWith('Success') ? colors.successBg : (notesMessage.startsWith('Network') || notesMessage.includes('Error') || notesMessage.includes('Unauthorized') ? 'red' : colors.textSecondary) }}>
                                {notesMessage || (!isAuthenticated ? 'Please sign in to upload files.' : 'Upload your notes PDF.')}
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
                                        disabled={isProcessing || !isAuthenticated}
                                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', zIndex: 10, cursor: 'pointer' }}
                                    />
                                    <button
                                        onClick={(e) => { e.preventDefault(); paperFileInputRef.current.click(); }}
                                        disabled={isProcessing || !isAuthenticated}
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
                                    disabled={isProcessing || !paperFile || !isAuthenticated}
                                    style={{ ...baseButtonStyle, backgroundColor: colors.buttonBg, color: 'white' }}
                                >
                                    {isProcessing ? 'Processing...' : 'Upload Paper'}
                                </button>
                            </div>
                            <p style={{ marginTop: '10px', color: paperMessage.startsWith('Success') ? colors.successBg : (paperMessage.startsWith('Network') || paperMessage.includes('Error') || paperMessage.includes('Unauthorized') ? 'red' : colors.textSecondary) }}>
                                {paperMessage || (!isAuthenticated ? 'Please sign in to upload files.' : 'Upload your question paper PDF (Optional).')}
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
                                placeholder={`Querying notes file: ${activeNotesFileName || '---'}`}
                                required
                                style={{...baseInputStyle, backgroundColor: colors.answerBg, color: colors.textPrimary}}
                                disabled={isProcessing || !activeNotesFileName || !isAuthenticated}
                            />
                            <button
                                type="submit"
                                disabled={queryLoading || isProcessing || !activeNotesFileName || !isAuthenticated}
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
                    {/* FOOTER SECTION (Cleaned up) */}
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

                            <button onClick={() => setPageMode('tool')} style={{ margin: '0 10px', color: colors.textSecondary, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                Tool
                            </button>
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
                            {/* FILE MANAGER LINK IS REMOVED FROM FOOTER */}
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
