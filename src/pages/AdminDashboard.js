import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, secondaryAuth } from '../firebase'; // <-- Note the secondaryAuth import
import { getAuth, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc } from "firebase/firestore";
import './Dashboard.css';

const AdminDashboard = () => {
  const [issues, setIssues] = useState([]);
  const [view, setView] = useState('dashboard'); // Toggles between views
  const navigate = useNavigate();
  const auth = getAuth();

  // State for the New Supervisor Form
  const [supName, setSupName] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPassword, setSupPassword] = useState('');
  const [supZone, setSupZone] = useState('North');
  const [isCreating, setIsCreating] = useState(false);

  // Live Supervisors List (Fetched from DB)
  const [supervisors, setSupervisors] = useState([]);

  useEffect(() => {
    // 1. Fetch Issues
    const qIssues = query(collection(db, "issues"), orderBy("timestamp", "desc"));
    const unsubIssues = onSnapshot(qIssues, (snapshot) => {
      setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Fetch Active Supervisors from web_users table
    const qSups = query(collection(db, "web_users"));
    const unsubSups = onSnapshot(qSups, (snapshot) => {
      const supsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.role === 'supervisor'); // Only grab supervisors
      setSupervisors(supsData);
    });

    return () => { unsubIssues(); unsubSups(); };
  }, []);

  // --- ROUTING LOGIC ---
  const handleAssignSupervisor = async (firestoreDocId, supervisorId) => {
    const supervisor = supervisors.find(s => s.id === supervisorId);
    if (!supervisor) return;

    const issueRef = doc(db, "issues", firestoreDocId);
    await updateDoc(issueRef, {
      assignedSupervisorId: supervisor.id,
      assignedSupervisorName: supervisor.name,
      status: "Assigned"
    });
  };

  // --- CREATE SUPERVISOR LOGIC ---
  const handleCreateSupervisor = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // 1. Create the account using the GHOST connection (prevents Admin logout)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, supEmail, supPassword);
      const newUid = userCredential.user.uid;

      // 2. Save their profile to the web_users database
      await setDoc(doc(db, "web_users", newUid), {
        role: 'supervisor',
        name: supName,
        email: supEmail,
        zone: supZone
      });

      // 3. Log the ghost connection out to keep it clean
      await signOut(secondaryAuth);

      alert(`✅ Supervisor ${supName} created successfully!`);
      setSupName(''); setSupEmail(''); setSupPassword(''); // Clear form
      setView('dashboard'); // Return to dashboard
    } catch (error) {
      alert("Creation Failed: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="admin-layout">
      {/* Sidebar with Navigation */}
      <aside className="sidebar">
        <div className="logo">Super Admin</div>
        <nav>
          <a href="#" className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>City Overview</a>
          <a href="#" className={view === 'supervisors' ? 'active' : ''} onClick={() => setView('supervisors')}>Manage Supervisors</a>
        </nav>
        <button onClick={() => signOut(auth).then(() => navigate('/login'))} className="logout-btn">Logout</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <h2>{view === 'dashboard' ? 'Tier 1: Geographical Routing' : 'Supervisor Management'}</h2>
        </header>

        <div className="content-container">
          
          {/* VIEW 1: THE DASHBOARD */}
          {view === 'dashboard' && (
            <div className="card">
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Type / Location</th>
                      <th>Description</th>
                      <th>Route to Zone AS</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue) => (
                      <tr key={issue.id}>
                        <td><img src={issue.imageUrl} alt="Issue" className="evidence-thumb" /></td>
                        <td>
                          <strong>{issue.issueType}</strong><br/>
                          <span style={{fontSize: '0.8rem', color: '#64748b'}}>{issue.location}</span>
                        </td>
                        <td className="desc-cell">{issue.description}</td>
                        <td>
                          <select 
                            className="status-select"
                            value={issue.assignedSupervisorId || ""} 
                            onChange={(e) => handleAssignSupervisor(issue.id, e.target.value)}
                          >
                            <option value="" disabled>Select Zone...</option>
                            {/* Dynamically loads the supervisors you create! */}
                            {supervisors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.zone})</option>)}
                          </select>
                        </td>
                        <td><span className={`status-badge status-${(issue.status || 'submitted').toLowerCase()}`}>{issue.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: ADD SUPERVISOR FORM */}
          {view === 'supervisors' && (
            <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '30px' }}>
              <h3 style={{ marginTop: 0, color: '#1e293b' }}>Register New Area Supervisor</h3>
              <form onSubmit={handleCreateSupervisor} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>Full Name</label>
                  <input type="text" required value={supName} onChange={(e) => setSupName(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1' }} />
                </div>

                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>Assigned Zone</label>
                  <select value={supZone} onChange={(e) => setSupZone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}>
                    <option value="North">North Zone</option>
                    <option value="South">South Zone</option>
                    <option value="East">East Zone</option>
                    <option value="West">West Zone</option>
                    <option value="Central">Central Zone</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>Login Email</label>
                  <input type="email" required value={supEmail} onChange={(e) => setSupEmail(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1' }} />
                </div>

                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>Temporary Password</label>
                  <input type="password" required minLength="6" value={supPassword} onChange={(e) => setSupPassword(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1' }} />
                </div>

                <button type="submit" disabled={isCreating} style={{ backgroundColor: '#10b981', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
                  {isCreating ? 'Creating...' : 'Create Supervisor Account'}
                </button>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;