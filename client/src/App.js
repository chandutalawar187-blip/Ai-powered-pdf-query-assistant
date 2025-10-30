// client/src/App.js (FINAL COMPLETE FRONTEND CODE WITH LOTTIE & SKELETONS)
import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { Player } from '@lottiefiles/react-lottie-player'; // --- Import Lottie Player ---

// --- NEW: IMPORT YOUR LOTTIE JSON FILE DIRECTLY ---
// We are NOW using this for the 'Thinking' animation
import appAnimationData from './app.json';

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

    // --- DYNAMIC HEADER FIX ---
    // This code was already correct and handles dynamic headers perfectly.
    const headerLine = lines[0].split('|').filter(h => h.trim()).map(h => `<th style="background-color: ${tableStyles.thBg}; color: ${tableStyles.thText}; padding: 10px; border: 1px solid ${tableStyles.tdBorder}; text-align: left;">${h.trim()}</th>`).join('');

    const header = headerLine ? `<thead><tr>${headerLine}</tr></thead>` : '';
    // --- END DYNAMIC HEADER FIX ---

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


// --- SOCIAL LOGIN ICON HELPER (UPDATED for Firebase - Microsoft Removed) ---
const SocialLoginButton = ({ provider, colors, setLoading, setAuthData, setMessage, firebaseLoaded }) => {
    const iconMap = {
        google: 'Google',
        github: 'GitHub',
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
                    throw new Error("Unsupported provider");
            }

            const result = await auth.signInWithPopup(providerInstance);
            const user = result.user;

            // Get the ID token to send to the backend for verification
            const idToken = await user.getIdToken();

            setAuthData({
                isAuthenticated: true,
                username: user.displayName || user.email || 'User',
                userId: user.uid,
                token: idToken,
            });
            setMessage(`Sign-in with ${iconMap[provider]} successful!`);

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


// --- PROFESSIONAL LOGIN/REGISTER COMPONENT (UPDATED with Theme Toggle) ---
const LoginPage = ({ colors, setIsAuthenticated, setUsername, setPageMode, setUserId, setToken, firebaseLoaded, toggleTheme, isDark }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
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
        if (!usernameInput) {
            setMessage('Please enter your email address above to reset the password.');
            return;
        }
        setLoading(true);
        setMessage('');

        try {
            const auth = getFirebaseAuth();
            // Firebase function to send the reset email
            await auth.sendPasswordResetEmail(usernameInput);
            setMessage(`Success! Password reset link sent to ${usernameInput}. Check your inbox.`);
            setResetMode(false); // Switch back to login view
            setUsernameInput('');
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

            if (isLogin) {
                userCredential = await auth.signInWithEmailAndPassword(usernameInput, passwordInput);
            } else {
                if (passwordInput.length < 6) {
                    setMessage('Password must be at least 6 characters long.');
                    setLoading(false);
                    return;
                }
                userCredential = await auth.createUserWithEmailAndPassword(usernameInput, passwordInput);
            }

            const user = userCredential.user;
            const idToken = await user.getIdToken();

            setAuthData({
                isAuthenticated: true,
                username: user.displayName || user.email || 'User',
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

        position: 'relative', // ADDED for theme toggle positioning

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
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
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
                <input
                    type="email"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Email"
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
                    {loading ? (isLogin ? 'Signing in...' : 'Registering...') : isLogin ? 'Sign In' : 'Sign Up'}
                </button>
            </form>
        );
    };


    return (
        <div style={cardStyle}>
            {/* --- ADDED: THEME TOGGLE BUTTON --- */}
            <button
                onClick={toggleTheme}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: colors.answerBg,
                    border: `1px solid ${colors.borderColor}`,
                    color: colors.textPrimary,
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    fontSize: '1.2em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2
                }}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
                {isDark ? '☀️' : '🌙'}
            </button>
            {/* --- END: THEME TOGGLE BUTTON --- */}


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
                    <SocialLoginButton provider="github" colors={colors} setLoading={setLoading} setAuthData={setAuthData} setMessage={setMessage} firebaseLoaded={firebaseLoaded} />
                    <SocialLoginButton provider="google" colors={colors} setLoading={setLoading} setAuthData={setAuthData} setMessage={setMessage} firebaseLoaded={firebaseLoaded} />
                    {/* REMOVED Microsoft Button */}
                    <div style={{ margin: '20px 0', fontSize: '0.9em', color: colors.textSecondary, position: 'relative' }}>
                        <div style={{ content: '""', position: 'absolute', top: '50%', left: 0, right: 0, borderTop: `1px solid ${colors.borderColor}` }}></div>
                        <span style={{ backgroundColor: colors.bgSecondary, padding: '0 10px', position: 'relative', zIndex: 1 }}>OR</span>
                    </div>
                </div>
            )}

            {/* --- Auth Form --- */}
            {renderAuthForm()}

            {/* --- MODIFIED: Use AnimatedMessage for login messages --- */}
            <AnimatedMessage
                message={message || (!firebaseLoaded ? 'Waiting for Firebase SDK...' : '')}
                type={message.includes('Failed') || message.includes('Error') || message.includes('Password') ? 'error' : (message.includes('Success') ? 'success' : 'info')}
                colors={colors}
            />

            {resetMode ? (
                <button
                    onClick={() => {
                        setResetMode(false);
                        setMessage('');
                        setUsernameInput('');
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
                        setUsernameInput('');
                        setPasswordInput('');
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


// --- NEW: SKELETON LOADING COMPONENTS ---

// Single Skeleton Bar
const Skeleton = ({ style, colors }) => (
    <div
        style={{
            ...style, // Allows custom width/height
            backgroundColor: colors.answerBg,
            borderRadius: '4px',
            animation: 'shimmer 2s infinite linear',
        }}
    />
);

// --- MODIFIED: This is now just a SKELETON, not the "Thinking" animation ---
const AnswerSkeleton = ({ colors }) => (
    <div style={{ width: '100%' }}>
        <Skeleton style={{ height: '20px', width: '90%', marginBottom: '10px' }} colors={colors} />
        <Skeleton style={{ height: '20px', width: '100%', marginBottom: '10px' }} colors={colors} />
        <Skeleton style={{ height: '20px', width: '70%', marginBottom: '10px' }} colors={colors} />
    </div>
);


// Skeleton for the File Manager Table
const FileTableSkeleton = ({ colors }) => {
    const SkeletonRow = () => (
        <tr style={{ backgroundColor: colors.answerBg }}>
            <td style={{ padding: '10px', border: `1px solid ${colors.borderColor}` }}>
                <Skeleton style={{ height: '20px', width: '80%' }} colors={colors} />
            </td>
            <td style={{ padding: '10px', border: `1px solid ${colors.borderColor}` }}>
                <Skeleton style={{ height: '20px', width: '100%' }} colors={colors} />
            </td>
            <td style={{ padding: '10px', border: `1px solid ${colors.borderColor}` }}>
                <Skeleton style={{ height: '20px', width: '50%' }} colors={colors} />
            </td>
            <td style={{ padding: '10px', border: `1px solid ${colors.borderColor}` }}>
                <Skeleton style={{ height: '20px', width: '100%' }} colors={colors} />
            </td>
        </tr>
    );
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                <thead>
                    <tr style={{ backgroundColor: colors.thBg }}>
                        <th style={{ padding: '10px', border: `1px solid ${colors.tdBorder}`, textAlign: 'left', color: colors.thText }}>Type</th>
                        <th style={{ padding: '10px', border: `1T'solid ${colors.tdBorder}`, textAlign: 'left', color: colors.thText }}>Filename</th>
                        <th style={{ padding: '10px', border: `1px solid ${colors.tdBorder}`, textAlign: 'left', color: colors.thText }}>Chunks</th>
                        <th style={{ padding: '10px', border: `1px solid ${colors.tdBorder}`, textAlign: 'center', color: colors.thText }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                </tbody>
            </table>
        </div>
    );
};

// --- NEW: ANIMATED MESSAGE COMPONENT ---
const AnimatedMessage = ({ message, type, colors }) => {
    if (!message) return null;

    let style = {
        padding: '12px 18px',
        borderRadius: '8px',
        margin: '10px 0',
        fontSize: '0.9em',
        animation: 'fadeIn 0.5s ease-out',
        border: '1px solid',
    };

    if (type === 'success') {
        style.backgroundColor = colors.isDark ? '#2f855a' : '#c6f6d5';
        style.color = colors.isDark ? '#c6f6d5' : '#2f855a';
        style.borderColor = colors.isDark ? '#38a169' : '#9ae6b4';
    } else if (type === 'error') {
        style.backgroundColor = colors.isDark ? '#c53030' : '#fed7d7';
        style.color = colors.isDark ? '#fed7d7' : '#c53030';
        style.borderColor = colors.isDark ? '#e53e3e' : '#fbb6b6';
    } else { // 'info'
        style.backgroundColor = colors.isDark ? '#2b6cb0' : '#ebf8ff';
        style.color = colors.isDark ? '#bee3f8' : '#2b6cb0';
        style.borderColor = colors.isDark ? '#4299e1' : '#bee3f8';
    }

    return (
        <div style={style}>
            {message}
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
            const response = await fetch(`${API_URL}/files`, { // --- FIX: Removed redundant userId query param
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
    }, [isAuthenticated, token]); // --- FIX: Removed redundant userId dependency

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
            const response = await fetch(`${API_URL}/files/${fileId}`, { // --- FIX: Removed redundant userId query param
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
                body: JSON.stringify({ fileId: fileId }), // --- FIX: Removed redundant userId from body
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

    // --- ADD THIS NEW useEffect HOOK ---
    // This hook runs ONCE on page load to set the pageMode from the URL
    useEffect(() => {
        const path = window.location.pathname.toLowerCase(); // Gets '/about'

        // Remove leading slash to match your pageMode state names
        const mode = path.substring(1);

        if (mode === 'about') {
            setPageMode('about');
        } else if (mode === 'privacy') {
            setPageMode('privacy');
        } else if (mode === 'file_manager') {
            setPageMode('file_manager');
        }
        // If the path is '/' (mode is ''),
        // the app will default to 'login' and let the auth check redirect to 'tool'.
        // This is the correct behavior.

    }, []); // The empty array [] means this only runs once.

    // --- MODIFIED: Determine message type ---
    const messageType = message.includes('Failed') || message.includes('Error') ? 'error' : (message.includes('Success') ? 'success' : 'info');

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

            {/* --- MODIFIED: Use AnimatedMessage --- */}
            <AnimatedMessage message={message} type={messageType} colors={colors} />

            {/* --- MODIFIED: Use FileTableSkeleton --- */}
            {loading && !message.includes('Switching') ? (
                <FileTableSkeleton colors={colors} />
            ) : files.length === 0 ? (
                <p style={{color: colors.textSecondary, marginTop: '20px'}}>You have no files stored. Please upload some from the tool page.</p>
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
    const [pageMode, setPageMode] =useState('loading');

    // AUTH STATE
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState(null);
    const [token, setToken] = useState(null);
    const [firebaseLoaded, setFirebaseLoaded] = useState(false); // New state for script loading

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
    const [question, setQuestion] =useState('');
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

    // --- NEW: INJECT CSS KEYFRAMES ---
    useEffect(() => {
        const styleId = 'app-animations';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                @keyframes shimmer {
                    0% { background-position: -468px 0; }
                    100% { background-position: 468px 0; }
                }

                div[style*="animation: shimmer"] {
                    background: linear-gradient(to right, ${colors.answerBg} 8%, ${colors.bgPrimary} 18%, ${colors.answerBg} 33%);
                    background-size: 800px 104px;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                {/* --- NEW: BLINK ANIMATION --- */}
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        // Update shimmer colors on theme change
        const styleTag = document.getElementById(styleId);
        if (styleTag) {
             styleTag.innerHTML = `
                @keyframes shimmer {
                    0% { background-position: -468px 0; }
                    100% { background-position: 468px 0; }
                }

                div[style*="animation: shimmer"] {
                    background: linear-gradient(to right, ${colors.answerBg} 8%, ${colors.bgPrimary} 18%, ${colors.answerBg} 33%);
                    background-size: 800px 104px;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                {/* --- NEW: BLINK ANIMATION --- */}
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `;
        }
    }, [colors.answerBg, colors.bgPrimary]); // Re-run if theme colors change


    // --- AUTH STATUS CHECKER (UPDATED for Firebase) ---
    const checkAuthStatus = useCallback(() => {
        if (typeof window.firebase === 'undefined' || !firebaseLoaded) return;

        const auth = getFirebaseAuth();
        // Sets up a listener for the entire app lifetime
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const idToken = await user.getIdToken();
                setIsAuthenticated(true);
                setUsername(user.displayName || user.email || 'User');
                setUserId(user.uid);
                setToken(idToken);

                // --- ADDED: SERVER WAKE-UP PING ---
                try {
                    console.log('Sending wake-up ping to server...');
                    const response = await fetch(`${API_URL}/files`, {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${idToken}` },
                    });

                    if (response.ok) {
                        console.log('Server is awake and responded.');
                    } else {
                        console.warn('Server wake-up ping failed or returned an error.');
                    }
                } catch (error) {
                    console.error('Network error during server wake-up ping:', error);
                }
                // --- END: SERVER WAKE-UP PING ---

                // --- BUG FIX: REMOVED THIS LINE ---
                // setActiveNotesFileName(null); // <-- This was the bug

                if (pageMode === 'login' || pageMode === 'register') {
                    setPageMode('tool');
                }
            } else {
                setIsAuthenticated(false);
                setUsername('');
                setUserId(null);
                setToken(null);
                setActiveNotesFileName(null); // <-- This one is CORRECT (clear on logout)
                if (pageMode === 'tool' || pageMode === 'file_manager') {
                    setPageMode('login');
                }
            }
        });
    }, [pageMode, firebaseLoaded]); // Dependencies are correct

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

    // --- THIS IS THE NEW useEffect HOOK for GitHub Pages ---
    // This hook runs ONCE on page load to set the pageMode from the URL
    useEffect(() => {
        // 1. Check for the redirect query parameter from 404.html
        const params = new URLSearchParams(window.location.search);
        const redirectPath = params.get('path'); // Will be 'about', 'privacy', etc.

        let mode = '';

        if (redirectPath) {
            // If we were redirected, use that path
            mode = redirectPath.toLowerCase();
            // Also, clean up the URL bar to remove the query param
            window.history.replaceState({}, '', '/' + mode);
        } else {
            // If no redirect, just read the normal path
            const path = window.location.pathname.toLowerCase(); // Gets '/about'
            mode = path.substring(1); // 'about', 'privacy', or ''
        }

        // 2. Set the pageMode based on the path
        if (mode === 'about') {
            setPageMode('about');
        } else if (mode === 'privacy') {
            setPageMode('privacy');
        } else if (mode === 'file_manager') {
            setPageMode('file_manager');
        }
        // If mode is '', the app will default to 'loading'
        // and let the auth check handle the next step. This is correct.

    }, []); // The empty array [] means this only runs once.

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

    // --- ADD THIS NEW HELPER FUNCTION ---
    const navigate = (mode) => {
        // 1. Set the React state
        setPageMode(mode);

        // 2. Update the browser's URL bar without reloading the page
        // We set the path to '/' for the main tool, or '/about' for the about page, etc.
        const path = (mode === 'tool' || mode === 'login') ? '/' : `/${mode}`;
        window.history.pushState({}, '', path);
    };

    // --- DUAL PDF UPLOAD HANDLERS (UPDATED to use Token) ---

    const handleUpload = async (file, type) => {
        if (!file || !isAuthenticated || !token) return; // --- FIX: Removed redundant userId check

        const isNotes = type === 'notes';
        const setFileMessage = isNotes ? setNotesMessage : setPaperMessage;
        const uploadEndpoint = isNotes ? `${API_URL}/upload-notes` : `${API_URL}/upload-paper`;

        setIsProcessing(true);
        setFileMessage(`Processing ${isNotes ? 'Notes' : 'Paper'}...`);

        const formData = new FormData();
        formData.append('pdf', file);
        // --- FIX: Removed redundant formData.append('userId', userId) ---
        // The backend gets the user ID securely from the token.

        try {
            const response = await fetch(uploadEndpoint, {
                method: 'POST',
                body: formData,
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();

            if (response.ok) {
                setFileMessage(`Success! ${isNotes ? 'Notes' : 'Paper'} processed. ${data.chunks_count} chunks indexed.`);
                if (isNotes) {
                    setAnswer(''); setSources(''); setMode(''); setFetchedImage(null);
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
            setFileMessage('Network Error: Could not connect to backend server.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNotesUpload = () => handleUpload(notesFile, 'notes');
    const handlePaperUpload = () => handleUpload(paperFile, 'paper');


    // --- QUERY HANDLER (UPDATED to use Token) ---
    // This is the PDF-ONLY query
    const handleQuery = async (e) => {
        e.preventDefault();
        const canQuery = isAuthenticated && activeNotesFileName && token && question.trim();

        // --- MODIFIED: Improved Error Handling ---
        if (queryLoading || isProcessing || !canQuery) {
             if (!activeNotesFileName) {
                 // Set error in the answer box
                 setAnswer('Please upload or set an active Notes PDF first.');
                 setMode('ERROR');
             }
             if (!question.trim()) {
                setAnswer('Please enter a question.');
                setMode('ERROR');
             }
             return;
        }

        setQueryLoading(true); setAnswer(''); setSources(''); setMode(''); setFetchedImage(null);

        try {
            const response = await fetch(`${API_URL}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ question }), // --- FIX: Removed redundant userId from body
            });

            const data = await response.json();

            if (response.ok) {
                setAnswer(data.answer);
                setSources(data.sources || "Direct API response.");
                setMode(data.mode || "VERBATIM");
                setFetchedImage(data.image_data || null);
            } else if (response.status === 401) {
                setAnswer('Unauthorized. Please log in.');
                setMode('ERROR');
                handleLogout(); // Force logout on auth failure
            } else {
                setAnswer(data.error); // Show the specific error from the backend
                setSources(data.sources || '');
                setMode('ERROR');
            }
        } catch (error) {
            setAnswer('Network Error: Could not connect to backend server.'); setSources(''); setMode('ERROR');
        } finally {
            setQueryLoading(false);
        }
    };

    // --- NEW: GOOGLE SOLVE HANDLER ---
    // This is the GOOGLE-ONLY query for MCQs
    const handleGoogleSolve = async (e) => {
        e.preventDefault();
        const canQuery = isAuthenticated && token && question.trim();

        // --- MODIFIED: Improved Error Handling ---
        if (queryLoading || isProcessing || !canQuery) {
             if (!question.trim()) {
                setAnswer('Please enter a question to solve.');
                setMode('ERROR');
             }
             // We don't check for activeNotesFileName here because the backend RAG-gate will
             return;
        }

        setQueryLoading(true); setAnswer(''); setSources(''); setMode(''); setFetchedImage(null);

        try {
            const response = await fetch(`${API_URL}/google-solve`, { // --- Calls the new endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ question }),
            });

            const data = await response.json();

            if (response.ok) {
                setAnswer(data.answer);
                setSources(data.sources || "Google Search");
                setMode(data.mode || "GOOGLE_SOLVE");
                setFetchedImage(null); // Google solve won't return images
            } else if (response.status === 401) {
                setAnswer('Unauthorized. Please log in.');
                setMode('ERROR');
                handleLogout(); // Force logout on auth failure
            } else {
                // --- MODIFIED: This now catches the "not relevant" error ---
                setAnswer(data.error); // Show the specific error from the backend
                setSources('Relevance Check Failed');
                setMode('ERROR');
            }
        } catch (error) {
            setAnswer('Network Error: Could not connect to backend server.'); setSources(''); setMode('ERROR');
        } finally {
            setQueryLoading(false);
        }
    };


    const renderAnswerContent = () => {
        // --- MODIFIED: Use Lottie Animation ---
        if (queryLoading) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Player
                        autoplay
                        loop
                        // --- --------------------------------- ---
                        // --- HERE IS THE FIX (Points to your local import) ---
                        // --- --------------------------------- ---
                        src={appAnimationData}
                        style={{
                            width: '300px',
                            maxWidth: '100%',
                            height: 'auto',
                            border: 'none' // --- FIX: Removed the red debug border ---
                        }}
                    />
                    <p style={{ color: colors.textSecondary, textAlign: 'center', marginTop: '5px', fontWeight: '500' }}>
                        Thinking...
                    </p>
                </div>
            );
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

        // --- MODIFIED: Use AnimatedMessage for all errors ---
        if (mode === 'ERROR') {
             return <AnimatedMessage message={answer} type="error" colors={colors} />;
        }

        // --- NEW: Handle GOOGLE_SOLVE mode ---
        // We can just render it the same as a VERBATIM answer
        if (mode === 'VERBATIM' || mode === 'GOOGLE_SOLVE') {
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
        }

        // Fallback for any other mode
        return (
            <p style={{
                whiteSpace: 'pre-wrap',
                color: colors.textPrimary,
            }}>
                {answer}
            </p>
        );
    };


    return (
        <div className="App" style={globalStyle}>
            {pageMode === 'loagin' ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: colors.textPrimary, backgroundColor: colors.bgPrimary}}>
                    <h2 style={{fontWeight: '500'}}>Loading Verbatim AI...</h2>
                </div>
            ) : pageMode === 'login' || pageMode === 'register' ? (
                <LoginPage
                    colors={colors}
                    setPageMode={setPageMode}
                    setIsAuthenticated={setIsAuthenticated}
                    setUsername={setUsername}
                    setUserId={setUserId}
                    setToken={setToken}
                    firebaseLoaded={firebaseLoaded}
                    toggleTheme={toggleTheme}
                    isDark={isDark}
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
                    userId={userId} // <-- This prop is no longer used by the component but doesn't hurt to pass
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
                                        padding: '8px 15px',
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
                            {/* --- MODIFIED: Use AnimatedMessage for notes --- */}
                            <AnimatedMessage
                                message={notesMessage || (!isAuthenticated ? 'Please sign in to upload files.' : '')}
                                type={notesMessage.startsWith('Success') ? 'success' : (notesMessage.includes('Error') || notesMessage.includes('Unauthorized') ? 'error' : 'info')}
                                colors={colors}
                            />
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
                             {/* --- MODIFIED: Use AnimatedMessage for paper --- */}
                            <AnimatedMessage
                                message={paperMessage || ''}
                                type={paperMessage.startsWith('Success') ? 'success' : (paperMessage.includes('Error') || paperMessage.includes('Unauthorized') ? 'error' : 'info')}
                                colors={colors}
                            />
                        </div>
                    </div>

                    {/* --------------------------- */}
                    {/* 2. ASK A QUESTION SECTION */}
                    {/* --------------------------- */}
                    <div style={sectionStyle}>
                        <h2 style={titleStyle}>2. Ask a Question</h2>
                        <form> {/* --- MODIFIED: Removed onSubmit from form tag --- */}
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder={
                                    !isAuthenticated ? 'Please log in to ask a question' :
                                    !activeNotesFileName ? 'Please upload a Notes PDF first' :
                                    `Querying notes file: ${activeNotesFileName}`
                                }
                                required
                                style={{...baseInputStyle, backgroundColor: colors.answerBg, color: colors.textPrimary}}
                                disabled={isProcessing || !isAuthenticated} // --- MODIFIED: Only disable if processing
                            />

                            {/* --- NEW: Button Container --- */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button" // --- MODIFIED: Changed to type="button"
                                    onClick={handleQuery} // --- MODIFIED: Use onClick
                                    disabled={queryLoading || isProcessing || !activeNotesFileName || !isAuthenticated}
                                    style={{
                                        ...baseQueryButtonStyle,
                                        backgroundColor: colors.successBg,
                                        color: 'white',
                                        flex: 2 // Make this the primary button
                                    }}
                                >
                                    {queryLoading ? 'Thinking...' : 'Get Answer (from PDF)'}
                                </button>

                                <button
                                    type="button" // --- NEW: Secondary Button ---
                                    onClick={handleGoogleSolve} // --- NEW: Calls new handler
                                    disabled={queryLoading || isProcessing || !isAuthenticated}
                                    style={{
                                        ...baseQueryButtonStyle,
                                        backgroundColor: colors.buttonBg, // Use accent color
                                        color: 'white',
                                        flex: 1 // Make this the secondary button
                                    }}
                                >
                                    {queryLoading ? 'Thinking...' : 'Solve (Google)'}
                                </button>
                            </div>
                        </form>

                        {/* --- ANSWER AND IMAGE DISPLAY --- */}
                        <div style={{ display: 'flex', gap: '20px', marginTop: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ flex: fetchedImage ? 2 : 1, minWidth: fetchedImage ? '400px' : 'auto' }}>
                                <h3 style={{ color: colors.textPrimary, borderBottom: `1px dashed ${colors.borderColor}`, paddingBottom: '5px' }}>
                                    AI Answer: <span style={{fontSize: '0.8em', color: colors.textSecondary}}>
                                        ({mode === 'VERBATIM' ? 'Verbatim Extraction (PDF)' :
                                          mode === 'GOOGLE_SOLVE' ? 'Google Search Answer' :
                                          mode === 'FULL_TEXT' ? 'Full Text Output (PDF)' :
                                          mode === 'COMPARISON' ? 'Comparison Table (PDF)' :
                                          mode})
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

                            <button onClick={() => navigate('about')} style={{ margin: '0 10px', color: colors.textSecondary, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                About
                            </button>

                            <button onClick={() => navigate('tool')} style={{ margin: '0 10px', color: colors.textSecondary, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                Tool
                            </button>
                            <button
                                onClick={() => navigate('privacy')}
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