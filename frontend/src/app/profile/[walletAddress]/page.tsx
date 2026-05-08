'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { userAPI } from '@/lib/api'
import { User, Trophy, Star, Calendar, Award, Briefcase, CheckCircle } from 'lucide-react'

interface ProfileData {
  profile: {
    walletAddress: string
    username?: string
    displayName?: string
    bio?: string
    avatar?: string
    skills: string[]
    reputation: number
    totalEarned: string
    submissionCount: number
    averageRating: number
    completedBounties: number
  }
  activity: {
    submissions: Array<{
      id: string
      bountyTitle: string
      bountyReward: string
      category: string
      difficulty: string
      completedAt: string
      reviews: Array<{
        rating: number
        comment: string
        reviewer: string
        createdAt: string
      }>
    }>
    completedBounties: Array<{
      id: string
      title: string
      reward: string
      category: string
      difficulty: string
      completedAt: string
      creator: string
    }>
    certifications: Array<{
      title: string
      issuer: string
      issueDate: string
      verified: boolean
    }>
  }
  stats: {
    totalSubmissions: number
    completedBounties: number
    certifications: number
    reputation: number
  }
}

export default function ProfilePage() {
  const params = useParams()
  const walletAddress = params.walletAddress as string
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await userAPI.getPublicProfile(walletAddress)
        setProfileData(response.data)
      } catch (err) {
        setError('Profile not found')
        console.error('Error fetching profile:', err)
      } finally {
        setLoading(false)
      }
    }

    if (walletAddress) {
      fetchProfile()
    }
  }, [walletAddress])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600">{error || 'This profile does not exist or is not available.'}</p>
        </div>
      </div>
    )
  }

  const { profile, activity, stats } = profileData

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.displayName || profile.username || 'Profile'}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="h-12 w-12 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.displayName || profile.username || 'Anonymous Contributor'}
                </h1>
                {profile.username && (
                  <span className="text-gray-500">@{profile.username}</span>
                )}
              </div>
              
              {profile.bio && (
                <p className="text-gray-600 mb-4">{profile.bio}</p>
              )}
              
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              
              <div className="text-sm text-gray-500 font-mono">
                {profile.walletAddress}
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <div className="text-center">
                <div className="flex items-center space-x-1 text-yellow-500 mb-1">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="text-2xl font-bold text-gray-900">{profile.reputation}</span>
                </div>
                <p className="text-sm text-gray-600">Reputation Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">EDU Earned</p>
                <p className="text-xl font-bold text-gray-900">{profile.totalEarned}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Submissions</p>
                <p className="text-xl font-bold text-gray-900">{profile.submissionCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Bounties</p>
                <p className="text-xl font-bold text-gray-900">{profile.completedBounties}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-xl font-bold text-gray-900">
                  {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button className="py-4 px-6 border-b-2 border-blue-500 text-blue-600 font-medium">
                Completed Bounties ({activity.completedBounties.length})
              </button>
              <button className="py-4 px-6 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium">
                Submissions ({activity.submissions.length})
              </button>
              <button className="py-4 px-6 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium">
                Certifications ({activity.certifications.length})
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* Completed Bounties */}
            <div className="space-y-4">
              {activity.completedBounties.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No completed bounties yet</p>
                </div>
              ) : (
                activity.completedBounties.map((bounty) => (
                  <div key={bounty.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{bounty.title}</h3>
                      <span className="text-green-600 font-bold">{bounty.reward} EDU</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {bounty.category}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                        {bounty.difficulty}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(bounty.completedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Created by {bounty.creator}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
