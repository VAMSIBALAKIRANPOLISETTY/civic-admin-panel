import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from './firebase';

// Import Pages
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import Profile from './pages/Profile';

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Fetch the user's role from Firestore
          const userDocRef = doc(db, "web_users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            setRole(userDocSnap.data().role);
          } else {
            setRole('unauthorized'); // Safely handle missing roles
          }
        } catch (error) {
          console.error("Database Error:", error);
          setRole('unauthorized');
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}><h2>Verifying Identity...</h2></div>;
  }

  // A safe screen to prevent infinite loops if the database isn't set up right
  const UnauthorizedView = () => (
    <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#ef4444' }}>Unauthorized Access</h2>
      <p>Your account is logged in, but you do not have an "admin" or "supervisor" role.</p>
      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Check your Firebase 'web_users' collection and make sure your Document ID matches your Auth UID exactly.</p>
      <button 
        onClick={() => signOut(getAuth())}
        style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '20px' }}
      >
        Logout and Try Again
      </button>
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* The Master Router */}
        <Route path="/" element={
          !user ? <Navigate to="/login" /> :
          role === 'admin' ? <Navigate to="/admin" /> :
          role === 'supervisor' ? <Navigate to="/supervisor" /> :
          <UnauthorizedView />
        } />
        
        {/* Login Route */}
        <Route path="/login" element={
          !user ? <Login /> : <Navigate to="/" />
        } />
        
        {/* Protected Admin Route */}
        <Route path="/admin" element={
          user && role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />
        } />

        {/* Protected Supervisor Route */}
        <Route path="/supervisor" element={
          user && role === 'supervisor' ? <SupervisorDashboard /> : <Navigate to="/" />
        } />

        {/* Protected Profile Route */}
        <Route path="/profile" element={
          user ? <Profile /> : <Navigate to="/" />
        } />
        
      </Routes>
    </Router>
  );
}

export default App;