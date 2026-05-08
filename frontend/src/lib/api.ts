import axios from 'axios'
import { AuthResponse, ApiResponse, PaginatedResponse, Bounty, User } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  authenticate: async (signature: string, message: string, address: string): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/wallet', {
      signature,
      message,
      address,
    })
    return response.data
  },
  
  refreshToken: async (refreshToken: string): Promise<ApiResponse<any>> => {
    const response = await api.post('/api/auth/refresh', {
      refreshToken,
    })
    return response.data
  },
}

export const bountyAPI = {
  getBounties: async (params?: {
    page?: number
    limit?: number
    category?: string
    difficulty?: string
    status?: string
    search?: string
  }): Promise<PaginatedResponse<Bounty>> => {
    const response = await api.get('/api/bounties', { params })
    return {
      ...response.data,
      data: {
        ...response.data.data,
        items: response.data.data.bounties
      }
    }
  },

  getBounty: async (id: string): Promise<ApiResponse<Bounty>> => {
    const response = await api.get(`/api/bounties/${id}`)
    return response.data
  },

  createBounty: async (bounty: Partial<Bounty>): Promise<ApiResponse<Bounty>> => {
    const response = await api.post('/api/bounties', bounty)
    return response.data
  },

  updateBounty: async (id: string, bounty: Partial<Bounty>): Promise<ApiResponse<Bounty>> => {
    const response = await api.put(`/api/bounties/${id}`, bounty)
    return response.data
  },

  deleteBounty: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.delete(`/api/bounties/${id}`)
    return response.data
  },
}

export const userAPI = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await api.get('/api/users/profile')
    return response.data
  },

  updateProfile: async (profile: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.put('/api/users/profile', profile)
    return response.data
  },

  getStats: async (userId: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/api/users/stats/${userId}`)
    return response.data
  },

  getPublicProfile: async (walletAddress: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/api/users/public/${walletAddress}`)
    return response.data
  },
}

export default api
