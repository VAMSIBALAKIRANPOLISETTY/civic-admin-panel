import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, secondaryAuth } from '../firebase'; // <-- secondaryAuth imported
import { getAuth, signOut, createUserWithEmailAndPassword } from "firebase/auth";

import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, addDoc, where } from "firebase/firestore";
import './Dashboard.css';

const SupervisorDashboard = () => {
  const [issues, setIssues] = useState([]); 
  const [archivedIssues, setArchivedIssues] = useState([]); 
  const [allWorkers, setAllWorkers] = useState([]); 
  const [workerStats, setWorkerStats] = useState({}); 
  const [view, setView] = useState('dashboard'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Worker Form State (Now includes Email & Password)
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerPassword, setNewWorkerPassword] = useState('');
  const [newWorkerType, setNewWorkerType] = useState('Water');
  const [showPassword, setShowPassword] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;

    const qIssues = query(collection(db, "issues"), orderBy("timestamp", "desc"));
    const unsubIssues = onSnapshot(qIssues, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const myZoneIssues = issuesData.filter(issue => issue.assignedSupervisorId === currentUserId);
      
      setIssues(myZoneIssues.filter(i => i.status !== "Resolved"));
      setArchivedIssues(myZoneIssues.filter(i => i.status === "Resolved"));

      const stats = {};
      myZoneIssues.forEach(issue => {
        if (issue.dispatchedWorkerId && issue.status === "Resolved") {
          stats[issue.dispatchedWorkerId] = (stats[issue.dispatchedWorkerId] || 0) + 1;
        }
      });
      setWorkerStats(stats);
    });

    const qWorkers = query(collection(db, "workers"), where("supervisorId", "==", currentUserId));
    const unsubWorkers = onSnapshot(qWorkers, (snapshot) => {
      setAllWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => { unsubIssues(); unsubWorkers(); };
  }, [auth.currentUser]);

  const activeWorkers = allWorkers.filter(w => !w.isDeleted);

  // --- UPGRADED TEAM MANAGEMENT (Generates App Logins) ---
  const handleAddWorker = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      // DATA PRESERVATION CHECK: Look up by Email
      const existingWorker = allWorkers.find(w => w.email && w.email.toLowerCase() === newWorkerEmail.toLowerCase());
      
      if (existingWorker) {
        if (existingWorker.isDeleted) {
          // Restore them
          await updateDoc(doc(db, "workers", existingWorker.id), { 
            isDeleted: false, 
            name: newWorkerName, // Update name if it changed
            type: newWorkerType  // Update type if it changed
          });
          alert(`✅ Welcome back! ${newWorkerName}'s profile has been restored.`);
        } else {
          alert(`⚠️ Action Denied: A worker is already using the email ${newWorkerEmail}.`);
        }
      } else {
        // BRAND NEW WORKER: Create Auth Account first
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newWorkerEmail, newWorkerPassword);
        const workerUid = userCredential.user.uid;

        // Save to Firestore using their exact Auth UID
        await setDoc(doc(db, "workers", workerUid), {
          name: newWorkerName, 
          email: newWorkerEmail,
          type: newWorkerType, 
          supervisorId: auth.currentUser.uid, 
          isDeleted: false
        });
        
        // Log out the secondary instance to keep things clean
        await signOut(secondaryAuth);
        
        alert(`✅ App Credentials generated! ${newWorkerName} can now log into the Field Worker App.`);
      }
      
      // Clear Form
      setNewWorkerName(''); 
      setNewWorkerEmail('');
      setNewWorkerPassword('');
    } catch (error) {
      alert("Error adding worker: " + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveWorker = async (workerId, workerName) => {
    const isWorking = issues.some(issue => issue.dispatchedWorkerId === workerId && issue.status !== "Resolved");
    if (isWorking) {
      alert(`⚠️ Action Denied: ${workerName} is assigned to an active task. Please reassign their ticket before deleting them.`);
      return;
    }
    const confirmText = window.prompt(`Type "${workerName}" below to archive their profile:`);
    if (confirmText !== workerName) return; 

    try {
      await updateDoc(doc(db, "workers", workerId), { isDeleted: true });
      alert(`🗑️ ${workerName}'s profile has been archived.`);
    } catch (error) {
      alert("Error removing worker: " + error.message);
    }
  };

  // --- TICKET LOGIC ---

  const handleDispatchWorker = async (firestoreDocId, workerId) => {
    const worker = activeWorkers.find(w => w.id === workerId);
    if (!worker) return;
    
    // 1. Update the Issue
    const issueRef = doc(db, "issues", firestoreDocId);
    await updateDoc(issueRef, { 
      dispatchedWorkerId: worker.id, 
      dispatchedWorkerName: `${worker.name} (${worker.type})`, 
      status: "In Progress" 
    });

    // 2. 🔔 THE NOTIFICATION PIPELINE
    // This pushes an alert directly to the Worker's Android App!
    await addDoc(collection(db, "notifications"), {
      userId: worker.id, // Target the specific worker
      issueId: firestoreDocId,
      message: `URGENT: You have been dispatched to a new ${worker.type} task!`,
      status: "Assigned",
      timestamp: Date.now()
    });

    alert(`Ticket dispatched! A notification has been sent to ${worker.name}'s mobile device.`);
  };

  // const handleDispatchWorker = async (firestoreDocId, workerId) => {
  //   const worker = activeWorkers.find(w => w.id === workerId);
  //   if (!worker) return;
  //   const issueRef = doc(db, "issues", firestoreDocId);
  //   await updateDoc(issueRef, { dispatchedWorkerId: worker.id, dispatchedWorkerName: `${worker.name} (${worker.type})`, status: "In Progress" });
  // };

  const handleStatusChange = async (firestoreDocId, newStatus) => {
    await updateDoc(doc(db, "issues", firestoreDocId), { status: newStatus });
  };

  const handleReopenTicket = async (firestoreDocId) => {
    if (window.confirm("Pull this ticket out of the archive?")) {
      await updateDoc(doc(db, "issues", firestoreDocId), { status: "In Progress" });
    }
  };

  const filteredArchive = archivedIssues.filter(issue => 
    (issue.issueId && issue.issueId.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (issue.location && issue.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="logo">Zone Supervisor</div>
        <nav>
          <a href="#" className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>My Zone Tasks</a>
          <a href="#" className={view === 'team' ? 'active' : ''} onClick={() => setView('team')}>Manage Team</a>
          <a href="#" className={view === 'archive' ? 'active' : ''} onClick={() => setView('archive')}>Ticket Archive</a>
          <a href="/profile">My Profile</a>
        </nav>
        <button onClick={() => signOut(auth).then(() => navigate('/login'))} className="logout-btn">Logout</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <h2>{view === 'dashboard' ? 'Tier 2: Functional Dispatch' : view === 'team' ? 'Field Worker Management' : 'Resolved Ticket Archive'}</h2>
        </header>

        <div className="content-container">
          {view === 'dashboard' && (
            <div className="card">
              <div className="table-responsive">
                <table>
                  <thead><tr><th>Photo</th><th>Issue Type</th><th>Location Details</th><th>Dispatch Worker</th><th>Live Status</th></tr></thead>
                  <tbody>
                    {issues.map((issue) => {
                      const validWorkers = activeWorkers.filter(w => w.type === issue.issueType || issue.issueType === 'Others' || w.type === 'Others');
                      return (
                      <tr key={issue.id}>
                        <td><img src={issue.imageUrl || "https://via.placeholder.com/50"} alt="Issue" className="evidence-thumb" /></td>
                        <td><strong>{issue.issueType}</strong></td>
                        <td className="desc-cell" title={issue.location}>{issue.location}</td>
                        <td>
                          {activeWorkers.length === 0 ? (
                            <span style={{color: '#ef4444', fontSize: '0.8rem'}}>⚠️ Roster Empty</span>
                          ) : (
                            <select 
                              className="status-select"
                              style={{ border: issue.dispatchedWorkerId ? '1px solid #2563eb' : '1px solid #cbd5e1' }}
                              value={issue.dispatchedWorkerId || ""} 
                              onChange={(e) => handleDispatchWorker(issue.id, e.target.value)}
                            >
                              {issue.dispatchedWorkerName ? <option value="assigned" disabled>👷 {issue.dispatchedWorkerName}</option> : <option value="" disabled>Send Worker...</option>}
                              {validWorkers.length === 0 ? <option value="" disabled>⚠️ No {issue.issueType} workers</option> : validWorkers.map(w => <option key={w.id} value={w.id}>{`${w.name} (${w.type})`}</option>)}
                            </select>
                          )}
                        </td>
                        <td>
                          <select className={`status-badge status-${(issue.status || 'submitted').toLowerCase().replace(' ', '-')}`} value={issue.status} onChange={(e) => handleStatusChange(issue.id, e.target.value)}>
                            <option value="Assigned">Assigned</option><option value="In Progress">In Progress</option><option value="Resolved">Mark Resolved</option>
                          </select>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'team' && (
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div className="card" style={{ flex: '1', minWidth: '300px', padding: '24px' }}>
                <h3 style={{ marginTop: 0, color: '#1e293b' }}>Register App Access</h3>
                
                {/* UPGRADED FORM WITH EMAIL/PASSWORD */}
                <form onSubmit={handleAddWorker} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>Worker Full Name</label>
                    <input type="text" required value={newWorkerName} onChange={(e) => setNewWorkerName(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>Department</label>
                    <select value={newWorkerType} onChange={(e) => setNewWorkerType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}>
                      <option value="Water">Water (Plumbing)</option><option value="Street Light">Street Light (Electrical)</option>
                      <option value="Road">Road (Civil)</option><option value="Garbage">Garbage (Sanitation)</option>
                      <option value="Electricity">Electricity</option><option value="Others">General Purpose</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>App Login Email</label>
                    <input type="email" required value={newWorkerEmail} onChange={(e) => setNewWorkerEmail(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>App Password</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required minLength="6" value={newWorkerPassword} onChange={(e) => setNewWorkerPassword(e.target.value)} 
                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #cbd5e1', paddingRight: '60px' }} 
                      />
                      <button 
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                      >
                        {showPassword ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isAdding} style={{ backgroundColor: '#10b981', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
                    {isAdding ? 'Generating...' : 'Create Worker App Login'}
                  </button>
                </form>

              </div>

              <div className="card" style={{ flex: '2', minWidth: '400px' }}>
                <div className="table-responsive">
                  <table>
                    <thead><tr><th>Name / App Email</th><th>Department</th><th>History</th><th>Action</th></tr></thead>
                    <tbody>
                      {activeWorkers.map(worker => {
                        const isBusy = issues.some(issue => issue.dispatchedWorkerId === worker.id && issue.status !== "Resolved");
                        return (
                        <tr key={worker.id}>
                          <td>
                            <strong>{worker.name}</strong><br/>
                            <span style={{fontSize: '0.8rem', color: '#64748b'}}>{worker.email}</span>
                          </td>
                          <td><span className="count-badge">{worker.type}</span></td>
                          <td><span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ {workerStats[worker.id] || 0} Tasks</span></td>
                          <td>
                            <button 
                              onClick={() => handleRemoveWorker(worker.id, worker.name)}
                              disabled={isBusy}
                              style={{ background: isBusy ? '#f1f5f9' : '#fee2e2', color: isBusy ? '#94a3b8' : '#ef4444', border: 'none', padding: '6px 12px', cursor: isBusy ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                              {isBusy ? '🔒 Busy' : 'Archive'}
                            </button>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'archive' && (
            <div className="card">
              <div className="card-header"><input type="text" placeholder="🔍 Search Archive..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '10px', width: '100%', maxWidth: '400px', borderRadius: '5px', border: '1px solid #cbd5e1' }}/></div>
              <div className="table-responsive">
                <table>
                  <thead><tr><th>Issue ID</th><th>Type / Location</th><th>Resolved By</th><th>Action</th></tr></thead>
                  <tbody>
                    {filteredArchive.map((issue) => (
                      <tr key={issue.id}>
                        <td style={{fontSize: '0.8rem', color: '#64748b'}}>{issue.issueId}</td>
                        <td><strong>{issue.issueType}</strong><br/><span style={{fontSize: '0.8rem'}}>{issue.location}</span></td>
                        <td><span style={{color: '#10b981', fontWeight: 'bold'}}>{issue.dispatchedWorkerName || "Unknown Worker"}</span></td>
                        <td><button onClick={() => handleReopenTicket(issue.id)} style={{ background: '#fef08a', color: '#854d0e', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>↺ Re-Open</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SupervisorDashboard;