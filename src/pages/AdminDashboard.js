import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, secondaryAuth } from '../firebase'; 
import { getAuth, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, getDocs, where, writeBatch } from "firebase/firestore";
import './Dashboard.css';

const AdminDashboard = () => {
  const [issues, setIssues] = useState([]); 
  const [archivedIssues, setArchivedIssues] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [view, setView] = useState('dashboard'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTickets, setSelectedTickets] = useState([]);
  
  const [supName, setSupName] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPassword, setSupPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [supZone, setSupZone] = useState('North');
  const [isCreating, setIsCreating] = useState(false);
  const [replacingSup, setReplacingSup] = useState(null);

  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const qIssues = query(collection(db, "issues"), orderBy("timestamp", "desc"));
    const unsubIssues = onSnapshot(qIssues, (snapshot) => {
      const allIssues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort active issues by upvotes (descending) so highest priority is at the top
      let active = allIssues.filter(i => i.status !== "Resolved");
      active.sort((a, b) => (b.upvotes || 1) - (a.upvotes || 1));
      
      setIssues(active);
      setArchivedIssues(allIssues.filter(i => i.status === "Resolved"));
    });

    const qSups = query(collection(db, "web_users"), where("role", "==", "supervisor"));
    const unsubSups = onSnapshot(qSups, (snapshot) => {
      setSupervisors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubIssues(); unsubSups(); };
  }, []);

  const toggleSelectTicket = (issueId) => {
    setSelectedTickets(prev => prev.includes(issueId) ? prev.filter(id => id !== issueId) : [...prev, issueId]);
  };

  const handleBulkDelete = async () => {
    if (selectedTickets.length === 0) return;
    const confirmText = window.prompt(`🔥 WARNING: You are about to PERMANENTLY delete ${selectedTickets.length} ticket(s) from the database.\n\nTo confirm this action and save storage space, type "DELETE" below:`);
    if (confirmText !== "DELETE") {
      alert("Deletion aborted.");
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedTickets.forEach(issueId => batch.delete(doc(db, "issues", issueId)));
      await batch.commit();
      setSelectedTickets([]); 
      alert(`✅ ${selectedTickets.length} ticket(s) permanently deleted.`);
    } catch (error) {
      alert("Error deleting tickets: " + error.message);
    }
  };

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

  const handleCreateSupervisor = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, supEmail, supPassword);
      await setDoc(doc(db, "web_users", userCredential.user.uid), {
        role: 'supervisor', name: supName, email: supEmail, zone: supZone
      });
      await signOut(secondaryAuth);
      alert(`✅ Supervisor ${supName} created!`);
      setSupName(''); setSupEmail(''); setSupPassword('');
      setView('dashboard');
    } catch (error) {
      alert("Creation Failed: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmReplace = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, supEmail, supPassword);
      const newUid = userCredential.user.uid;
      await setDoc(doc(db, "web_users", newUid), {
        role: 'supervisor', name: supName, email: supEmail, zone: replacingSup.zone
      });
      
      const batch = writeBatch(db);
      const qTickets = query(collection(db, "issues"), where("assignedSupervisorId", "==", replacingSup.id));
      const ticketSnaps = await getDocs(qTickets);
      ticketSnaps.forEach(d => batch.update(d.ref, { assignedSupervisorId: newUid, assignedSupervisorName: supName }));

      const qWorkers = query(collection(db, "workers"), where("supervisorId", "==", replacingSup.id));
      const workerSnaps = await getDocs(qWorkers);
      workerSnaps.forEach(d => batch.update(d.ref, { supervisorId: newUid }));

      batch.delete(doc(db, "web_users", replacingSup.id));
      await batch.commit(); 
      await signOut(secondaryAuth);
      
      alert(`🔄 Success! ${supName} is now managing the ${replacingSup.zone} Zone.`);
      setReplacingSup(null);
      setSupName(''); setSupEmail(''); setSupPassword('');
    } catch (error) {
      alert("Migration Failed: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredArchive = archivedIssues.filter(issue => 
    (issue.issueId && issue.issueId.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (issue.location && issue.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="logo">Super Admin</div>
        <nav>
          <a href="#" className={view === 'dashboard' ? 'active' : ''} onClick={() => {setView('dashboard'); setSelectedTickets([]);}}>City Overview</a>
          <a href="#" className={view === 'supervisors' ? 'active' : ''} onClick={() => {setView('supervisors'); setReplacingSup(null); setSelectedTickets([]);}}>Manage Supervisors</a>
          <a href="#" className={view === 'archive' ? 'active' : ''} onClick={() => {setView('archive'); setSelectedTickets([]);}}>Ticket Archive</a>
          <a href="/profile">My Profile</a>
        </nav>
        <button onClick={() => signOut(auth).then(() => navigate('/login'))} className="logout-btn">Logout</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <h2>{view === 'dashboard' ? 'Tier 1: Geographical Routing' : view === 'archive' ? 'Global Resolved Archive' : 'Zone Administration'}</h2>
        </header>

        <div className="content-container">
          {view === 'dashboard' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ display: 'inline-block', marginRight: '15px' }}>Active City Tickets</h3>
                  <span className="count-badge">{issues.length} Active</span>
                </div>
                {selectedTickets.length > 0 && (
                  <button onClick={handleBulkDelete} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                    🗑️ Delete Selected ({selectedTickets.length})
                  </button>
                )}
              </div>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Photo</th>
                      <th>Type / Location</th>
                      <th>👍 Priority</th>
                      <th>Description</th>
                      <th>Route to Zone AS</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue) => (
                      <tr key={issue.id} style={{ background: selectedTickets.includes(issue.id) ? '#fee2e2' : 'transparent' }}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={selectedTickets.includes(issue.id)}
                            onChange={() => toggleSelectTicket(issue.id)}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                        </td>
                        <td><img src={issue.imageUrl} alt="Issue" className="evidence-thumb" /></td>
                        <td>
                          <strong>{issue.issueType}</strong><br/>
                          <span style={{fontSize: '0.8rem', color: '#64748b'}}>{issue.location}</span>
                        </td>
                        
                        {/* UPVOTE PRIORITY COLUMN */}
                        <td>
                          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                            👍 {issue.upvotes || 1}
                          </span>
                        </td>

                        <td className="desc-cell">{issue.description}</td>
                        <td>
                          <select 
                            className="status-select"
                            value={issue.assignedSupervisorId || ""} 
                            onChange={(e) => handleAssignSupervisor(issue.id, e.target.value)}
                          >
                            <option value="" disabled>Select Zone...</option>
                            {supervisors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.zone})</option>)}
                          </select>
                        </td>
                        <td><span className={`status-badge status-${(issue.status || 'submitted').toLowerCase().replace(' ', '-')}`}>{issue.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'supervisors' && (
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div className="card" style={{ flex: '1', minWidth: '300px', padding: '24px' }}>
                <h3 style={{ marginTop: 0, color: '#1e293b' }}>
                  {replacingSup ? `Replace ${replacingSup.zone} Supervisor` : 'Register New Supervisor'}
                </h3>
                {replacingSup && <p style={{fontSize: '0.85rem', color: '#ef4444'}}>Warning: This transfers all workers and tickets to the new account below.</p>}
                
                <form onSubmit={replacingSup ? handleConfirmReplace : handleCreateSupervisor} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>New Full Name</label>
                    <input type="text" required value={supName} onChange={(e) => setSupName(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>Zone Designation</label>
                    <select value={replacingSup ? replacingSup.zone : supZone} disabled={!!replacingSup} onChange={(e) => setSupZone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1', background: replacingSup ? '#f1f5f9' : 'white' }}>
                      <option value="North">North Zone</option><option value="South">South Zone</option>
                      <option value="East">East Zone</option><option value="West">West Zone</option>
                      <option value="Central">Central Zone</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>Login Email</label>
                    <input type="email" required value={supEmail} onChange={(e) => setSupEmail(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#64748b' }}>Temporary Password</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required minLength="6" value={supPassword} onChange={(e) => setSupPassword(e.target.value)} 
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
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button type="submit" disabled={isCreating} style={{ flex: 1, backgroundColor: replacingSup ? '#eab308' : '#10b981', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {isCreating ? 'Processing...' : replacingSup ? 'Execute Migration' : 'Create Account'}
                    </button>
                    {replacingSup && (
                      <button type="button" onClick={() => setReplacingSup(null)} style={{ background: '#cbd5e1', color: '#334155', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                    )}
                  </div>
                </form>
              </div>

              <div className="card" style={{ flex: '2', minWidth: '400px' }}>
                <div className="card-header">
                  <h3>Active Zone Commanders</h3>
                  <span className="count-badge">{supervisors.length} Leaders</span>
                </div>
                <div className="table-responsive">
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Zone</th><th>Action</th></tr></thead>
                    <tbody>
                      {supervisors.map(sup => (
                        <tr key={sup.id}>
                          <td><strong>{sup.name}</strong></td>
                          <td style={{fontSize: '0.85rem', color: '#64748b'}}>{sup.email}</td>
                          <td><span className="count-badge">{sup.zone}</span></td>
                          <td><button onClick={() => { setReplacingSup(sup); setSupName(''); setSupEmail(''); setSupPassword(''); }} style={{ background: '#fef08a', color: '#854d0e', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🔄 Replace</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'archive' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input 
                  type="text" placeholder="🔍 Search Global Archive..." 
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                />
                {selectedTickets.length > 0 && (
                  <button onClick={handleBulkDelete} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                    🗑️ Delete Selected ({selectedTickets.length})
                  </button>
                )}
              </div>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Issue ID</th>
                      <th>Type / Location</th>
                      <th>Proof of Work</th>
                      <th>Resolved By</th>
                      <th>Zone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArchive.length === 0 ? (
                      <tr><td colSpan="5" style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>No resolved tickets found.</td></tr>
                    ) : filteredArchive.map((issue) => (
                      <tr key={issue.id} style={{ background: selectedTickets.includes(issue.id) ? '#fee2e2' : 'transparent' }}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={selectedTickets.includes(issue.id)}
                            onChange={() => toggleSelectTicket(issue.id)}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                        </td>
                        <td style={{fontSize: '0.8rem', color: '#64748b'}}>{issue.issueId}</td>
                        <td><strong>{issue.issueType}</strong><br/><span style={{fontSize: '0.8rem'}}>{issue.location}</span></td>
                        <td>
                          {issue.resolvedImageUrl ? (
                          <a href={issue.resolvedImageUrl} target="_blank" rel="noopener noreferrer">
                          <img src={issue.resolvedImageUrl} alt="Proof" className="evidence-thumb" style={{ border: '2px solid #10b981' }} />
                          </a>
                            ) : (
                              <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>No Photo</span>
                            )}
                        </td>
                        <td><span style={{color: '#10b981', fontWeight: 'bold'}}>{issue.dispatchedWorkerName || "Unknown Worker"}</span></td>
                        <td><span className="count-badge">{issue.assignedSupervisorName}</span></td>
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

export default AdminDashboard;