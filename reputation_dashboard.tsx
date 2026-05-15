import React from 'react';

// Contributor Profile & Reputation Dashboard
// Addresses issue #4

interface Contributor {
  name: string;
  contributions: number;
  bountiesCompleted: number;
  reputation: number;
  badges: string[];
}

interface ReputationDashboardProps {
  contributor: Contributor;
}

export const ReputationDashboard: React.FC<ReputationDashboardProps> = ({ contributor }) => {
  const level = Math.floor(contributor.reputation / 100) + 1;
  const progressToNext = contributor.reputation % 100;

  return (
    <div className="reputation-dashboard">
      <div className="profile-header">
        <h2>{contributor.name}</h2>
        <span className="level">Level {level}</span>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{contributor.contributions}</h3>
          <p>Contributions</p>
        </div>
        <div className="stat-card">
          <h3>{contributor.bountiesCompleted}</h3>
          <p>Bounties Done</p>
        </div>
        <div className="stat-card">
          <h3>{contributor.reputation}</h3>
          <p>Reputation</p>
        </div>
      </div>
      <div className="progress-bar">
        <div className="fill" style={{ width: progressToNext + '%' }}></div>
        <span>{progressToNext}/100 to Level {level + 1}</span>
      </div>
      <div className="badges">
        {contributor.badges.map(badge => (
          <span key={badge} className="badge">{badge}</span>
        ))}
      </div>
    </div>
  );
};

export default ReputationDashboard;
