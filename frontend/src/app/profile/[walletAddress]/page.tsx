'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { userAPI } from '@/lib/api'
import { User, Trophy, Star, Calendar, Award, Briefcase, CheckCircle, ExternalLink } from 'lucide-react'
import SimpleCertificateCard from '@/components/SimpleCertificateCard'
import { Certificate } from '@/types/certificate'

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
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [activeTab, setActiveTab] = useState<'bounties' | 'submissions' | 'certificates'>('bounties')
  const [verifying, setVerifying] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch profile data
        const profileResponse = await userAPI.getPublicProfile(walletAddress)
        setProfileData(profileResponse.data)
        
        // Fetch certificates
        try {
          const certificatesResponse = await fetch(`/api/certificates/user/${walletAddress}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          })
          
          if (certificatesResponse.ok) {
            const certificatesData = await certificatesResponse.json()
            setCertificates(certificatesData.data.certificates || [])
          }
        } catch (certError) {
          console.error('Error fetching certificates:', certError)
          // Don't fail the entire profile load if certificates fail
        }
        
      } catch (err) {
        setError('Profile not found')
        console.error('Error fetching profile:', err)
      } finally {
        setLoading(false)
      }
    }

    if (walletAddress) {
      fetchData()
    }
  }, [walletAddress])

  const handleVerifyCertificate = async (certificateHash: string) => {
    try {
      setVerifying(certificateHash)
      
      const response = await fetch(`/api/certificates/${certificateHash}/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to verify certificate')
      }

      const data = await response.json()
      
      if (data.success && data.verified) {
        // Update the certificate verification status
        setCertificates((prev: Certificate[]) => 
          prev.map((cert: Certificate) => 
            cert.certificateHash === certificateHash 
              ? { ...cert, verified: true }
              : cert
          )
        )
        alert('Certificate verified successfully on Stellar blockchain!')
      } else {
        alert(data.error || 'Certificate verification failed')
      }
    } catch (error) {
      console.error('Error verifying certificate:', error)
      alert('Failed to verify certificate')
    } finally {
      setVerifying(null)
    }
  }

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
              <button 
                onClick={() => setActiveTab('bounties')}
                className={`py-4 px-6 border-b-2 font-medium ${
                  activeTab === 'bounties' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Completed Bounties ({activity.completedBounties.length})
              </button>
              <button 
                onClick={() => setActiveTab('submissions')}
                className={`py-4 px-6 border-b-2 font-medium ${
                  activeTab === 'submissions' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Submissions ({activity.submissions.length})
              </button>
              <button 
                onClick={() => setActiveTab('certificates')}
                className={`py-4 px-6 border-b-2 font-medium ${
                  activeTab === 'certificates' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Certificates ({certificates.length})
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* Completed Bounties */}
            {activeTab === 'bounties' && (
              <div className="space-y-4">
                {activity.completedBounties.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No completed bounties yet</p>
                  </div>
                ) : (
                  activity.completedBounties.map((bounty: any) => (
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
            )}

            {/* Submissions */}
            {activeTab === 'submissions' && (
              <div className="space-y-4">
                {activity.submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No submissions yet</p>
                  </div>
                ) : (
                  activity.submissions.map((submission: any) => (
                    <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{submission.bountyTitle}</h3>
                        <span className="text-green-600 font-bold">{submission.bountyReward} EDU</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {submission.category}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                          {submission.difficulty}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(submission.completedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {submission.reviews.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <h4 className="font-medium text-gray-900">Reviews:</h4>
                          {submission.reviews.map((review: any, index: number) => (
                            <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{review.reviewer}</span>
                                <span className="text-yellow-500">{'⭐'.repeat(review.rating)}</span>
                              </div>
                              <p className="text-gray-600">{review.comment}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Certificates */}
            {activeTab === 'certificates' && (
              <div className="space-y-6">
                {certificates.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates yet</h3>
                    <p className="text-gray-600">
                      Complete courses and pass final assessments to earn verifiable certificates on the Stellar blockchain.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifiable Certificates</h2>
                      <p className="text-gray-600">
                        Certificates secured on the Stellar blockchain with verifiable proof of completion
                      </p>
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
                      {certificates.map((certificate: Certificate) => (
                        <SimpleCertificateCard
                          key={certificate.id}
                          certificate={certificate}
                          onVerify={handleVerifyCertificate}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
