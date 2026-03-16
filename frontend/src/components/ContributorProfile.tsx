'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Award, Users, DollarSign, Calendar, Star, Github, Twitter, Globe } from 'lucide-react';

interface ContributorProfileProps {
  contributor: {
    id: string;
    username: string;
    displayName: string;
    bio?: string;
    avatar?: string;
    reputation: number;
    totalEarned: string;
    eduTokenBalance: string;
    skills: string[];
    createdBounties: Array<{
      id: string;
      title: string;
      status: string;
      createdAt: string;
    }>;
    assignedBounties: Array<{
      id: string;
      title: string;
      status: string;
      createdAt: string;
    }>;
    certifications: Array<{
      title: string;
      issuer: string;
      issueDate: string;
      verified: boolean;
    }>;
  };
  onContact?: (contributorId: string) => void;
}

const ContributorProfile: React.FC<ContributorProfileProps> = ({ contributor, onContact }) => {
  const statusColors = {
    OPEN: 'bg-blue-100 text-blue-800',
    ASSIGNED: 'bg-purple-100 text-purple-800',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };

  const getReputationLevel = (reputation: number) => {
    if (reputation >= 1000) return { level: 'Expert', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (reputation >= 500) return { level: 'Advanced', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (reputation >= 200) return { level: 'Intermediate', color: 'text-green-600', bg: 'bg-green-100' };
    return { level: 'Beginner', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const reputationInfo = getReputationLevel(contributor.reputation);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-t-lg">
        <div className="flex items-center gap-6">
          <div className="relative">
            {contributor.avatar ? (
              <img
                src={contributor.avatar}
                alt={contributor.displayName}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                <Users className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-2 border-white"></div>
          </div>
          
          <div className="flex-1 text-white">
            <h1 className="text-3xl font-bold mb-2">{contributor.displayName || contributor.username}</h1>
            <p className="text-blue-100 mb-3">@{contributor.username}</p>
            
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">{contributor.reputation}</span>
                <span className="text-sm">reputation</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${reputationInfo.bg} ${reputationInfo.color}`}>
                {reputationInfo.level}
              </span>
            </div>
            
            {contributor.bio && (
              <p className="text-blue-50 max-w-2xl">{contributor.bio}</p>
            )}
          </div>
          
          <div className="text-white">
            <button
              onClick={() => onContact?.(contributor.id)}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Contact
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border-b">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium">Total Earned</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{contributor.totalEarned} EDU</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <Award className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium">Current Balance</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{contributor.eduTokenBalance} EDU</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">Created Bounties</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{contributor.createdBounties.length}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <Award className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium">Assigned Bounties</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{contributor.assignedBounties.length}</div>
        </div>
      </div>

      {/* Skills Section */}
      {contributor.skills.length > 0 && (
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {contributor.skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bounties Section */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Created Bounties */}
          <div>
            <h3 className="text-lg font-medium mb-3">Created Bounties</h3>
            <div className="space-y-3">
              {contributor.createdBounties.slice(0, 3).map((bounty) => (
                <div key={bounty.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{bounty.title}</h4>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(bounty.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[bounty.status as keyof typeof statusColors]}`}>
                    {bounty.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
              {contributor.createdBounties.length === 0 && (
                <p className="text-gray-500 text-sm">No created bounties yet</p>
              )}
            </div>
          </div>

          {/* Assigned Bounties */}
          <div>
            <h3 className="text-lg font-medium mb-3">Assigned Bounties</h3>
            <div className="space-y-3">
              {contributor.assignedBounties.slice(0, 3).map((bounty) => (
                <div key={bounty.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{bounty.title}</h4>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(bounty.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[bounty.status as keyof typeof statusColors]}`}>
                    {bounty.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
              {contributor.assignedBounties.length === 0 && (
                <p className="text-gray-500 text-sm">No assigned bounties yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Certifications Section */}
      {contributor.certifications.length > 0 && (
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Certifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contributor.certifications.map((cert, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{cert.title}</h4>
                  <p className="text-sm text-gray-600">{cert.issuer}</p>
                  <p className="text-xs text-gray-500">
                    Issued {formatDistanceToNow(new Date(cert.issueDate), { addSuffix: true })}
                  </p>
                </div>
                {cert.verified && (
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    Verified
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Links (placeholder for future implementation) */}
      <div className="p-6 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-center gap-6">
          <button className="text-gray-600 hover:text-gray-900 transition-colors">
            <Github className="w-6 h-6" />
          </button>
          <button className="text-gray-600 hover:text-blue-600 transition-colors">
            <Twitter className="w-6 h-6" />
          </button>
          <button className="text-gray-600 hover:text-purple-600 transition-colors">
            <Globe className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContributorProfile;
