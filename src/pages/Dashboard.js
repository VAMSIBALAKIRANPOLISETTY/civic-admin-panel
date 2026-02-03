import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import './Dashboard.css';

const Dashboard = () => {
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    // Sort by VOTES descending (Highest priority first)
    const q = query(collection(db, "issues"), orderBy("votes", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIssues(issuesData);
    });
    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    const issueRef = doc(db, "issues", id);
    await updateDoc(issueRef, { status: newStatus });
  };

  const getSeverityColor = (severity) => {
    if (severity === 'High') return '#ef4444'; // Red
    if (severity === 'Medium') return '#f97316'; // Orange
    return '#3b82f6'; // Blue
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">CivicAdmin</div>
        <nav>
          <a href="/dashboard" className="active">Dashboard</a>
          <a href="/leaderboard">Leaderboard</a> {/* NEW LINK */}
          <a href="#">Settings</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <h2>Overview</h2>
          <div className="user-profile">Admin</div>
        </header>

        <div className="content-container">
          <div className="card">
            <div className="card-header">
              <h3>Community Priority Queue</h3>
              <span className="count-badge">{issues.length} Issues</span>
            </div>
            
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Evidence</th>
                    <th>AI Analysis</th> {/* NEW */}
                    <th>Votes</th>      {/* NEW */}
                    <th>Location</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <img 
                          src={issue.imageUrl || "https://via.placeholder.com/50"} 
                          alt="Evidence" 
                          className="evidence-thumb"
                        />
                      </td>
                      <td>
                        {/* AI BADGE */}
                        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                            <span style={{
                                color: getSeverityColor(issue.aiSeverity), 
                                fontWeight: 'bold', 
                                fontSize: '0.8rem'
                            }}>
                                {issue.aiSeverity || "Analyzing..."}
                            </span>
                            <span style={{fontSize: '0.7rem', color: '#64748b'}}>
                                {issue.aiConfidence ? `${issue.aiConfidence}% match` : ""}
                            </span>
                        </div>
                      </td>
                      <td>
                         {/* VOTING DISPLAY */}
                         <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                            <span style={{fontSize: '1.1rem'}}>🔥</span>
                            <span style={{fontWeight: 'bold', color: '#334155'}}>{issue.votes || 0}</span>
                         </div>
                      </td>
                      <td className="location-cell">{issue.address}</td>
                      <td className="desc-cell">{issue.description}</td>
                      <td>
                        <span className={`status-badge status-${(issue.status || 'pending').toLowerCase().replace(' ', '-')}`}>
                          {issue.status}
                        </span>
                      </td>
                      <td>
                        <select 
                          className="status-select"
                          value={issue.status} 
                          onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                        >
                          <option value="Pending">Pending</option>
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

export default Dashboard;