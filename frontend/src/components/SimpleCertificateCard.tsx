'use client'

import React from 'react'
import { ExternalLink, Award, Calendar, CheckCircle } from 'lucide-react'
import { Certificate } from '@/types/certificate'

interface SimpleCertificateCardProps {
  certificate: Certificate
  onVerify?: (certificateHash: string) => void
  key?: string
}

export default function SimpleCertificateCard({ certificate, onVerify }: SimpleCertificateCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-blue-100 text-blue-800'
      case 'advanced':
        return 'bg-purple-100 text-purple-800'
      case 'expert':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleVerify = () => {
    if (onVerify) {
      onVerify(certificate.certificateHash)
    }
  }

  const handleViewOnStellar = () => {
    if (certificate.stellarExplorerUrl) {
      window.open(certificate.stellarExplorerUrl, '_blank')
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Award className="h-5 w-5 text-yellow-600" />
          <h3 className="text-lg font-semibold">Course Certificate</h3>
        </div>
        <div className="flex items-center space-x-2">
          {certificate.verified ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-600">
              Pending Verification
            </span>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-4 pt-4">
        {/* Course Information */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{certificate.course.title}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(certificate.course.difficulty)}`}>
              {certificate.course.difficulty}
            </span>
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(certificate.completionDate)}
            </span>
            <span>{certificate.course.duration} hours</span>
          </div>
        </div>

        {/* Certificate Details */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Certificate ID:</span>
              <p className="font-mono text-xs text-gray-600 break-all">
                {certificate.certificateHash.substring(0, 16)}...
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Learner:</span>
              <p className="text-gray-600">{certificate.user.displayName || certificate.user.username}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Wallet:</span>
              <p className="font-mono text-xs text-gray-600">
                {certificate.walletAddress.substring(0, 8)}...{certificate.walletAddress.slice(-8)}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Score:</span>
              <p className="text-gray-600">
                {certificate.metadata?.score || 'N/A'}%
              </p>
            </div>
          </div>
        </div>

        {/* Stellar Transaction Info */}
        {certificate.stellarTxHash && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Stellar Transaction</h4>
                <p className="text-xs text-blue-700 font-mono mt-1">
                  Tx: {certificate.stellarTxHash.substring(0, 16)}...
                </p>
              </div>
              <button
                onClick={handleViewOnStellar}
                className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 rounded"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View on Stellar
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            onClick={handleVerify}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Verify Certificate
          </button>
          
          {certificate.stellarExplorerUrl && (
            <button
              onClick={handleViewOnStellar}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Transaction
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
