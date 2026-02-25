import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import './Dashboard.css'; 

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        try {
          const docRef = doc(db, "web_users", auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching profile data:", error);
        }
      }
      setLoading(false);
    };
    
    fetchProfile();
  }, [auth.currentUser]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}><h2>Loading Profile...</h2></div>;
  }

  return (
    <div className="admin-layout">
      {/* Dynamic Sidebar based on Role */}
      <aside className="sidebar">
        <div className="logo">{userData?.role === 'admin' ? 'Super Admin' : 'Zone Supervisor'}</div>
        <nav>
          <a href={userData?.role === 'admin' ? '/admin' : '/supervisor'}>Dashboard</a>
          <a href="/profile" className="active">My Profile</a>
        </nav>
        <button onClick={() => signOut(auth).then(() => navigate('/login'))} className="logout-btn">Logout</button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <h2>Account Settings</h2>
          <div className="user-profile">{userData?.name || 'User'}</div>
        </header>

        <div className="content-container">
          <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '30px' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Profile Details</h3>
            
            {userData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#64748b' }}>Full Name:</span>
                  <span style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: '500' }}>{userData.name}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#64748b' }}>Registered Email:</span>
                  <span style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: '500' }}>{userData.email || auth.currentUser.email}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#64748b' }}>System Role:</span>
                  <span style={{ 
                    background: userData.role === 'admin' ? '#fef08a' : '#e0e7ff', 
                    color: userData.role === 'admin' ? '#854d0e' : '#4338ca', 
                    padding: '4px 12px', 
                    borderRadius: '12px', 
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    fontSize: '0.8rem'
                  }}>
                    {userData.role}
                  </span>
                </div>

                {/* Only display the Zone if the user is a Supervisor */}
                {userData.role === 'supervisor' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#64748b' }}>Assigned Zone:</span>
                    <span style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>{userData.zone}</span>
                  </div>
                )}

              </div>
            ) : (
              <p style={{ color: '#ef4444' }}>Error: Could not retrieve profile data. Ensure your document exists in the web_users database.</p>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;