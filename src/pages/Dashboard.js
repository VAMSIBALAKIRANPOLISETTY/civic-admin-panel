import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import './Dashboard.css';

const Dashboard = () => {
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "issues"), orderBy("timestamp", "desc"));
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

  // Helper function to get badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'Resolved': return 'status-resolved';
      case 'In Progress': return 'status-progress';
      default: return 'status-pending';
    }
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">CivicAdmin</div>
        <nav>
          <a href="#" className="active">Dashboard</a>
          <a href="#">Reports</a>
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
              <h3>Recent Issues</h3>
              <span className="count-badge">{issues.length} Total</span>
            </div>
            
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Evidence</th>
                    <th>Issue Type</th>
                    <th>Location</th>
                    <th>Description</th>
                    <th>Date</th>
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
                        <span className="issue-type">{issue.issueType}</span>
                      </td>
                      <td className="location-cell">{issue.address}</td>
                      <td className="desc-cell">{issue.description}</td>
                      <td>{new Date(issue.timestamp).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(issue.status)}`}>
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