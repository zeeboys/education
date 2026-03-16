'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Users, DollarSign, Award, Calendar } from 'lucide-react';

interface BountyCardProps {
  bounty: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    reward: string;
    tokenReward?: string;
    tags: string[];
    status: string;
    deadline?: string;
    createdAt: string;
    creator: {
      username: string;
      displayName: string;
      reputation: number;
    };
    _count: {
      applications: number;
      submissions: number;
    };
  };
  onApply?: (bountyId: string) => void;
  onView?: (bountyId: string) => void;
}

const BountyCard: React.FC<BountyCardProps> = ({ bounty, onApply, onView }) => {
  const difficultyColors = {
    BEGINNER: 'bg-green-100 text-green-800',
    INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
    ADVANCED: 'bg-orange-100 text-orange-800',
    EXPERT: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    OPEN: 'bg-blue-100 text-blue-800',
    ASSIGNED: 'bg-purple-100 text-purple-800',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };

  const categoryIcons = {
    CONTENT_CREATION: '📝',
    DEVELOPMENT: '💻',
    DESIGN_UX: '🎨',
    TRANSLATION: '🌍',
    REVIEW: '🔍',
    MAINTENANCE: '🔧',
    RESEARCH: '📊',
    COMMUNITY: '👥',
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{categoryIcons[bounty.category as keyof typeof categoryIcons]}</span>
            <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer" 
                onClick={() => onView?.(bounty.id)}>
              {bounty.title}
            </h3>
          </div>
          <p className="text-gray-600 text-sm line-clamp-2">{bounty.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2 ml-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[bounty.status as keyof typeof statusColors]}`}>
            {bounty.status.replace('_', ' ')}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[bounty.difficulty as keyof typeof difficultyColors]}`}>
            {bounty.difficulty}
          </span>
        </div>
      </div>

      {/* Tags */}
      {bounty.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {bounty.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
              {tag}
            </span>
          ))}
          {bounty.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
              +{bounty.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Rewards */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-medium text-gray-900">{bounty.reward}</span>
        </div>
        {bounty.tokenReward && (
          <div className="flex items-center gap-1">
            <Award className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-purple-900">{bounty.tokenReward} EDU</span>
          </div>
        )}
      </div>

      {/* Meta Information */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{bounty.creator.displayName || bounty.creator.username}</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {bounty.creator.reputation} rep
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatDistanceToNow(new Date(bounty.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
        {bounty.deadline && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDistanceToNow(new Date(bounty.deadline), { addSuffix: true })}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-4">
          <span>{bounty._count.applications} applications</span>
          <span>{bounty._count.submissions} submissions</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onView?.(bounty.id)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
        >
          View Details
        </button>
        {bounty.status === 'OPEN' && onApply && (
          <button
            onClick={() => onApply(bounty.id)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
          >
            Apply
          </button>
        )}
      </div>
    </div>
  );
};

export default BountyCard;
