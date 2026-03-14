'use client'

import { useState } from 'react'
import { StellarWallet, StellarService, EDUCATION_ASSET } from '@/lib/stellar'

interface StellarConnectProps {
  onConnect: (wallet: StellarWallet) => void
  onDisconnect: () => void
  isConnected: boolean
}

export default function StellarConnect({ onConnect, onDisconnect, isConnected }: StellarConnectProps) {
  const [showCreateWallet, setShowCreateWallet] = useState(false)
  const [showImportWallet, setShowImportWallet] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateWallet = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const wallet = new StellarWallet()
      const { publicKey, secret } = await wallet.createAccount()
      
      // Create trustline for EDU token
      const eduAsset = new (window as any).stellarSdk.Asset(EDUCATION_ASSET.code, EDUCATION_ASSET.issuer)
      await wallet.createTrustline(eduAsset)
      
      onConnect(wallet)
      
      // Store secret in localStorage for persistence
      localStorage.setItem('stellar_secret', secret)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet')
    } finally {
      setLoading(false)
    }
  }

  const handleImportWallet = async (secret: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const wallet = new StellarWallet(secret)
      await wallet.getBalance() // Validate wallet
      
      onConnect(wallet)
      localStorage.setItem('stellar_secret', secret)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid secret key')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    onDisconnect()
    localStorage.removeItem('stellar_secret')
  }

  if (isConnected) {
    return (
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Stellar Wallet Connected</span>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex space-x-4">
        <button
          onClick={() => setShowCreateWallet(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Wallet
        </button>
        <button
          onClick={() => setShowImportWallet(true)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Import Wallet
        </button>
      </div>

      {error && (
        <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Create Wallet Modal */}
      {showCreateWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Create Stellar Wallet</h3>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Creating wallet and trustline...</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  Create a new Stellar wallet to receive EDU tokens for your educational contributions.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={handleCreateWallet}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Wallet
                  </button>
                  <button
                    onClick={() => setShowCreateWallet(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Wallet Modal */}
      {showImportWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Import Stellar Wallet</h3>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Importing wallet...</p>
              </div>
            ) : (
              <ImportWalletForm
                onImport={handleImportWallet}
                onCancel={() => setShowImportWallet(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ImportWalletForm({ onImport, onCancel }: { onImport: (secret: string) => void; onCancel: () => void }) {
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!secret.trim()) {
      setError('Secret key is required')
      return
    }

    if (secret.startsWith('S') && secret.length === 56) {
      setError('')
      onImport(secret)
    } else {
      setError('Invalid Stellar secret key format')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Secret Key
        </label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="S..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter your Stellar secret key (starts with 'S')
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex space-x-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Import Wallet
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
