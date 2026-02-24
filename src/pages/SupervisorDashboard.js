import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { getAuth, signOut } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import './Dashboard.css';

const SupervisorDashboard = () => {
  const [issues, setIssues] = useState([]);
  const navigate = useNavigate();
  const auth = getAuth();

  // Tier 2: Field Workers
  const [workers] = useState([
    { id: 'W_01', name: 'Ramesh (Plumber)', type: 'Water' },
    { id: 'W_02', name: 'Suresh (Electrician)', type: 'Street Light' },
    { id: 'W_03', name: 'Mahesh (Civil)', type: 'Road' },
    { id: 'W_04', name: 'Ganesh (Sanitation)', type: 'Garbage' }
  ]);

  useEffect(() => {
    // 1. Get the currently logged-in Area Supervisor's unique ID
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;

    // 2. Fetch the issues
    const q = query(collection(db, "issues"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 3. THE FIX: Filter the list so it ONLY shows tickets assigned to THIS exact supervisor
      const myZoneIssues = issuesData.filter(issue => issue.assignedSupervisorId === currentUserId);
      
      setIssues(myZoneIssues);
    });
    
    return () => unsubscribe();
  }, [auth.currentUser]); // Re-run if the user session changes

  const handleDispatchWorker = async (firestoreDocId, workerId) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const issueRef = doc(db, "issues", firestoreDocId);
    await updateDoc(issueRef, {
      dispatchedWorkerId: worker.id,
      dispatchedWorkerName: worker.name,
      status: "In Progress"
    });

    alert(`📲 SMS Dispatched to ${worker.name}:\n\n"New Task Assigned! Please check location coordinates and resolve immediately."`);
  };

  const handleStatusChange = async (firestoreDocId, newStatus) => {
    const issueRef = doc(db, "issues", firestoreDocId);
    await updateDoc(issueRef, { status: newStatus });
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">Zone Supervisor</div>
        <nav>
          <a href="/supervisor" className="active">My Zone Tasks</a>
        </nav>
        <button onClick={() => signOut(auth).then(() => navigate('/login'))} className="logout-btn">Logout</button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <h2>Tier 2: Functional Dispatch</h2>
        </header>

        <div className="content-container">
          <div className="card">
            <div className="card-header">
              <h3>Tickets Routed to Your Zone</h3>
              <span className="count-badge">{issues.length} Active</span>
            </div>
            
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Issue Type</th>
                    <th>Location Details</th>
                    <th>2. Dispatch Worker</th>
                    <th>Live Status</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <a href={issue.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img src={issue.imageUrl || "https://via.placeholder.com/50"} alt="Issue" className="evidence-thumb" />
                        </a>
                      </td>
                      
                      <td><strong>{issue.issueType}</strong></td>
                      <td className="desc-cell" title={issue.location}>{issue.location}</td>

                      {/* Tier 2: Assign Worker */}
                      <td>
                        <select 
                          className="status-select"
                          style={{ border: issue.dispatchedWorkerId ? '1px solid #2563eb' : '1px solid #cbd5e1' }}
                          value={issue.dispatchedWorkerId || ""} 
                          onChange={(e) => handleDispatchWorker(issue.id, e.target.value)}
                        >
                          {issue.dispatchedWorkerName ? (
                            <option value="assigned" disabled>👷 {issue.dispatchedWorkerName}</option>
                          ) : (
                            <option value="" disabled>Send Worker...</option>
                          )}
                          {workers
                            .filter(w => w.type === issue.issueType || issue.issueType === 'Others')
                            .map(w => <option key={w.id} value={w.id}>{w.name}</option>)
                          }
                          {workers.filter(w => w.type !== issue.issueType).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </td>

                      {/* Status Override */}
                      <td>
                        <select 
                          className={`status-badge status-${(issue.status || 'submitted').toLowerCase().replace(' ', '-')}`}
                          value={issue.status} 
                          onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                        >
                          <option value="Assigned">Assigned</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SupervisorDashboard;