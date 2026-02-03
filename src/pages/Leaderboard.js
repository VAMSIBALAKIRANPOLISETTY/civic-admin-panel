import React, { useState, useEffect } from 'react';
import './Dashboard.css'; // Re-use the neat CSS

const Leaderboard = () => {
  // Simulating User Data for now (You can connect this to Firestore later)
  const [users] = useState([
    { id: 1, name: "Vamsi Polisetty", points: 1250, badge: "Civic Hero 🏆" },
    { id: 2, name: "Kamal Kiran", points: 980, badge: "Guardian 🛡️" },
    { id: 3, name: "Sarah Smith", points: 450, badge: "Reporter 📷" },
  ]);

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="logo">CivicAdmin</div>
        <nav>
          <a href="/dashboard">Dashboard</a>
          <a href="/leaderboard" className="active">Leaderboard</a>
          <a href="#">Settings</a>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <h2>Community Champions</h2>
          <div className="user-profile">Admin</div>
        </header>

        <div className="content-container">
          <div className="card" style={{maxWidth: '800px', margin: '0 auto'}}>
            <div className="card-header">
              <h3>Top Contributors</h3>
              <span className="count-badge">Monthly Ranking</span>
            </div>
            
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Citizen Name</th>
                    <th>Badge</th>
                    <th>Impact Points</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{
                            width: '30px', height: '30px', 
                            background: index === 0 ? '#fbbf24' : '#f1f5f9', 
                            borderRadius: '50%', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', color: index === 0 ? 'white' : '#64748b'
                        }}>
                           {index + 1}
                        </div>
                      </td>
                      <td style={{fontWeight: '600'}}>{user.name}</td>
                      <td>
                        <span style={{
                            background: '#eff6ff', color: '#3b82f6', 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem'
                        }}>
                            {user.badge}
                        </span>
                      </td>
                      <td style={{fontWeight: 'bold', color: '#10b981'}}>
                        {user.points} pts
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

export default Leaderboard;