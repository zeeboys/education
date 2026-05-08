'use client'

import React, { useState, useEffect } from 'react'
import CertificateCard from './CertificateCard'
import { Certificate, CertificateVerification } from '@/types/certificate'
import { toast } from 'react-hot-toast'

interface CertificateListProps {
  userId?: string
}

export default function CertificateList({ userId }: CertificateListProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)

  useEffect(() => {
    fetchCertificates()
  }, [userId])

  const fetchCertificates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/certificates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch certificates')
      }

      const data = await response.json()
      setCertificates(data.data.certificates)
    } catch (error) {
      console.error('Error fetching certificates:', error)
      toast.error('Failed to load certificates')
    } finally {
      setLoading(false)
    }
  }

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

      const data: CertificateVerification = await response.json()
      
      if (data.success && data.verified) {
        toast.success('Certificate verified successfully on Stellar blockchain!')
        // Update the certificate verification status
        setCertificates(prev => 
          prev.map(cert => 
            cert.certificateHash === certificateHash 
              ? { ...cert, verified: true }
              : cert
          )
        )
      } else {
        toast.error(data.error || 'Certificate verification failed')
      }
    } catch (error) {
      console.error('Error verifying certificate:', error)
      toast.error('Failed to verify certificate')
    } finally {
      setVerifying(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading certificates...</p>
        </div>
      </div>
    )
  }

  if (certificates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates yet</h3>
        <p className="text-gray-600">
          Complete courses and pass final assessments to earn verifiable certificates on the Stellar blockchain.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Certificates</h2>
        <p className="text-gray-600">
          Verifiable certificates secured on the Stellar blockchain
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
        {certificates.map((certificate) => (
          <CertificateCard
            key={certificate.id}
            certificate={certificate}
            onVerify={handleVerifyCertificate}
          />
        ))}
      </div>

      {verifying && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-gray-700">Verifying certificate on Stellar...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
