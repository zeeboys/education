const { StellarSdk, Horizon } = require('stellar-sdk')
require('dotenv').config()

// Stellar configuration
const STELLAR_NETWORK = process.env.STELLAR_NETWORK || 'TESTNET'
const HORIZON_URL = STELLAR_NETWORK === 'PUBLIC' 
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org'

const server = new Horizon.Server(HORIZON_URL)
const stellarSdk = StellarSdk

// Project configuration
const PROJECT_CONFIG = {
  name: "Decentralized Education Platform",
  description: "A platform for learning Web3 with bounty-based contributions",
  monthlyBudget: process.env.MONTHLY_BUDGET || "100", // 100 XLM per month default
  issuerKeypair: stellarSdk.Keypair.fromSecret(process.env.ISSUER_SECRET_KEY),
  distributionKeypair: stellarSdk.Keypair.fromSecret(process.env.DISTRIBUTION_SECRET_KEY)
}

async function createStellarAssets() {
  try {
    console.log(`🚀 Setting up Stellar assets for ${PROJECT_CONFIG.name}`)
    
    const issuerKeypair = PROJECT_CONFIG.issuerKeypair
    const distributionKeypair = PROJECT_CONFIG.distributionKeypair
    
    // Create custom asset for education platform
    const educationAsset = new stellarSdk.Asset(
      'EDU',
      issuerKeypair.publicKey()
    )
    
    console.log(`📡 Issuer Public Key: ${issuerKeypair.publicKey()}`)
    console.log(`📡 Distribution Public Key: ${distributionKeypair.publicKey()}`)
    
    // Check if accounts exist and fund if needed (testnet only)
    if (STELLAR_NETWORK === 'TESTNET') {
      await fundTestnetAccounts(issuerKeypair, distributionKeypair)
    }
    
    // Create trustline from distribution account to issuer
    await createTrustline(distributionKeypair, educationAsset, issuerKeypair)
    
    // Send initial funding to distribution account
    await fundDistributionAccount(issuerKeypair, distributionKeypair, educationAsset)
    
    console.log(`✅ Stellar assets setup complete!`)
    console.log(`🪙 Education Asset: EDU:${issuerKeypair.publicKey()}`)
    console.log(`💰 Initial Supply: ${PROJECT_CONFIG.monthlyBudget} EDU`)
    
    return {
      success: true,
      assetCode: 'EDU',
      issuer: issuerKeypair.publicKey(),
      distribution: distributionKeypair.publicKey(),
      horizonUrl: HORIZON_URL
    }
    
  } catch (error) {
    console.error('❌ Error setting up Stellar assets:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

async function fundTestnetAccounts(issuerKeypair, distributionKeypair) {
  try {
    console.log('💧 Funding testnet accounts...')
    
    // Fund issuer account
    await server.friendbot(friendbotUrl(issuerKeypair.publicKey()))
    console.log(`✅ Issuer account funded: ${issuerKeypair.publicKey()}`)
    
    // Fund distribution account
    await server.friendbot(friendbotUrl(distributionKeypair.publicKey()))
    console.log(`✅ Distribution account funded: ${distributionKeypair.publicKey()}`)
    
  } catch (error) {
    console.log('ℹ️ Accounts may already exist or funding failed:', error.message)
  }
}

function friendbotUrl(address) {
  return `https://friendbot.stellar.org?addr=${address}`
}

async function createTrustline(distributionKeypair, asset, issuerKeypair) {
  try {
    console.log('🔗 Creating trustline...')
    
    const distributionAccount = await server.loadAccount(distributionKeypair.publicKey())
    
    const transaction = new stellarSdk.TransactionBuilder(distributionAccount, {
      fee: stellarSdk.BASE_FEE,
      networkPassphrase: stellarSdk.Networks[STELLAR_NETWORK]
    })
      .addOperation(stellarSdk.Operation.changeTrust({
        asset: asset,
        limit: '10000000' // Maximum 10 million EDU tokens
      }))
      .setTimeout(30)
      .build()
    
    transaction.sign(distributionKeypair)
    const result = await server.submitTransaction(transaction)
    
    console.log(`✅ Trustline created: ${result.hash}`)
    
  } catch (error) {
    console.error('❌ Error creating trustline:', error.message)
    throw error
  }
}

async function fundDistributionAccount(issuerKeypair, distributionKeypair, asset) {
  try {
    console.log('💰 Funding distribution account...')
    
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey())
    
    // Calculate monthly distribution (100 EDU tokens)
    const monthlyAmount = (parseFloat(PROJECT_CONFIG.monthlyBudget) * 10000000).toString() // 1 EDU = 10 million stroops
    
    const transaction = new stellarSdk.TransactionBuilder(issuerAccount, {
      fee: stellarSdk.BASE_FEE,
      networkPassphrase: stellarSdk.Networks[STELLAR_NETWORK]
    })
      .addOperation(stellarSdk.Operation.payment({
        destination: distributionKeypair.publicKey(),
        asset: asset,
        amount: monthlyAmount
      }))
      .setTimeout(30)
      .build()
    
    transaction.sign(issuerKeypair)
    const result = await server.submitTransaction(transaction)
    
    console.log(`✅ Distribution funded: ${result.hash}`)
    console.log(`💸 Amount: ${PROJECT_CONFIG.monthlyBudget} EDU`)
    
  } catch (error) {
    console.error('❌ Error funding distribution:', error.message)
    throw error
  }
}

async function distributeBountyReward(contributorAddress, rewardAmount, bountyId) {
  try {
    console.log(`🎯 Distributing Stellar reward:`)
    console.log(`   Contributor: ${contributorAddress}`)
    console.log(`   Reward: ${rewardAmount} EDU`)
    console.log(`   Bounty: ${bountyId}`)
    
    const distributionKeypair = PROJECT_CONFIG.distributionKeypair
    const educationAsset = new stellarSdk.Asset('EDU', PROJECT_CONFIG.issuerKeypair.publicKey())
    
    // Ensure contributor has trustline
    await ensureContributorTrustline(contributorAddress, educationAsset)
    
    // Send payment
    const distributionAccount = await server.loadAccount(distributionKeypair.publicKey())
    
    const amount = (parseFloat(rewardAmount) * 10000000).toString() // Convert to stroops
    
    const transaction = new stellarSdk.TransactionBuilder(distributionAccount, {
      fee: stellarSdk.BASE_FEE,
      networkPassphrase: stellarSdk.Networks[STELLAR_NETWORK]
    })
      .addOperation(stellarSdk.Operation.payment({
        destination: contributorAddress,
        asset: educationAsset,
        amount: amount
      }))
      .addMemo(stellarSdk.Memo.text(`Bounty ${bountyId}`))
      .setTimeout(30)
      .build()
    
    transaction.sign(distributionKeypair)
    const result = await server.submitTransaction(transaction)
    
    console.log(`✅ Reward distributed!`)
    console.log(`🔗 Transaction: ${result.hash}`)
    
    return {
      success: true,
      transactionHash: result.hash,
      amount: rewardAmount,
      asset: 'EDU',
      contributor: contributorAddress
    }
    
  } catch (error) {
    console.error('❌ Error distributing reward:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

async function ensureContributorTrustline(contributorAddress, asset) {
  try {
    const contributorAccount = await server.loadAccount(contributorAddress)
    
    // Check if trustline already exists
    const trustline = contributorAccount.balances.find(balance => 
      balance.asset_code === 'EDU' && balance.asset_issuer === asset.issuer
    )
    
    if (trustline) {
      console.log('✅ Contributor trustline already exists')
      return
    }
    
    console.log('⚠️ Contributor needs to create trustline first')
    console.log(`📋 Instructions for contributor:`)
    console.log(`   1. Use Stellar Laboratory or wallet`)
    console.log(`   2. Create trustline for EDU:${asset.issuer}`)
    console.log(`   3. Set limit to desired amount`)
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('⚠️ Contributor account not found on Stellar network')
    } else {
      console.error('❌ Error checking trustline:', error.message)
    }
  }
}

async function getAccountBalance(address) {
  try {
    const account = await server.loadAccount(address)
    const balances = account.balances.map(balance => ({
      asset: balance.asset_type === 'native' ? 'XLM' : `${balance.asset_code}:${balance.asset_issuer}`,
      balance: balance.balance,
      limit: balance.limit || 'N/A'
    }))
    
    return {
      success: true,
      address: address,
      balances: balances
    }
    
  } catch (error) {
    console.error('❌ Error getting balance:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// CLI interface
const command = process.argv[2]

switch (command) {
  case 'setup':
    createStellarAssets()
    break
  case 'distribute':
    distributeBountyReward(process.argv[3], process.argv[4], process.argv[5])
    break
  case 'balance':
    getAccountBalance(process.argv[3])
    break
  default:
    console.log('Usage:')
    console.log('  node stellar-setup.js setup')
    console.log('  node stellar-setup.js distribute <address> <amount> <bounty-id>')
    console.log('  node stellar-setup.js balance <address>')
}

module.exports = {
  createStellarAssets,
  distributeBountyReward,
  getAccountBalance,
  PROJECT_CONFIG
}
