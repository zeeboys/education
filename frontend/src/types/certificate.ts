export interface Certificate {
  id: string
  userId: string
  courseId: string
  assessmentId: string
  stellarTxHash?: string
  certificateHash: string
  stellarDataKey?: string
  walletAddress: string
  completionDate: string
  stellarExplorerUrl?: string
  verified: boolean
  metadata?: {
    courseTitle: string
    learnerName: string
    issuerName: string
    certificateType: string
    difficulty: string
    duration: number
    score?: number
  }
  user: {
    id: string
    username: string
    displayName?: string
    walletAddress?: string
  }
  course: {
    id: string
    title: string
    category: string
    difficulty: string
    duration: number
    thumbnail?: string
  }
}

export interface CertificateVerification {
  success: boolean
  verified?: boolean
  stellarData?: any
  error?: string
}
