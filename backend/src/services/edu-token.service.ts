import { PrismaClient, BountyStatus } from '@prisma/client';
import { stellarService } from './stellar.service';
import { authService } from './auth.service';

const prisma = new PrismaClient();

export class EduTokenService {
  private issuerPublicKey: string;
  private issuerSecret: string;

  constructor() {
    this.issuerPublicKey = process.env.EDU_ISSUER_PUBLIC_KEY!;
    this.issuerSecret = process.env.EDU_ISSUER_SECRET!;
  }

  async initializeUserEduTokens(userWalletAddress: string): Promise<string> {
    try {
      // Create trustline for EDU tokens
      const trustlineTxHash = await stellarService.trustAsset(
        this.issuerSecret,
        this.issuerPublicKey
      );

      // Send initial EDU tokens to user (for demo purposes)
      const initialAmount = '100'; // 100 EDU tokens
      const paymentTxHash = await stellarService.sendEduTokens(
        this.issuerSecret,
        userWalletAddress,
        initialAmount,
        this.issuerPublicKey
      );

      // Update user's EDU token balance in database
      const user = await prisma.user.findUnique({
        where: { walletAddress: userWalletAddress }
      });

      if (user) {
        await authService.updateEduTokenBalance(user.id, initialAmount);
      }

      return paymentTxHash;
    } catch (error) {
      console.error('Error initializing EDU tokens:', error);
      throw error;
    }
  }

  async fundBountyEscrow(bountyId: string, creatorSecret: string): Promise<string> {
    try {
      const bounty = await prisma.bounty.findUnique({
        where: { id: bountyId },
        include: { creator: true }
      });

      if (!bounty) {
        throw new Error('Bounty not found');
      }

      if (!bounty.tokenReward) {
        throw new Error('Bounty does not have EDU token reward');
      }

      // Create escrow for bounty payment
      const escrowResult = await stellarService.createBountyEscrow(
        creatorSecret,
        bounty.tokenReward,
        this.issuerPublicKey,
        86400 * 7 // 7 days timelock
      );

      // Update bounty with escrow information
      await prisma.bounty.update({
        where: { id: bountyId },
        data: {
          stellarTxHash: escrowResult.transactionHash
        }
      });

      return escrowResult.transactionHash;
    } catch (error) {
      console.error('Error funding bounty escrow:', error);
      throw error;
    }
  }

  async releaseBountyPayment(bountyId: string, contributorWalletAddress: string): Promise<string> {
    try {
      const bounty = await prisma.bounty.findUnique({
        where: { id: bountyId },
        include: { creator: true }
      });

      if (!bounty) {
        throw new Error('Bounty not found');
      }

      if (!bounty.tokenReward || !bounty.stellarTxHash) {
        throw new Error('Bounty escrow not properly set up');
      }

      if (bounty.status !== BountyStatus.COMPLETED) {
        throw new Error('Bounty must be completed before payment release');
      }

      // In a real implementation, you'd need to manage escrow keys securely
      // For this demo, we'll simulate the release from the issuer account
      const paymentTxHash = await stellarService.sendEduTokens(
        this.issuerSecret,
        contributorWalletAddress,
        bounty.tokenReward,
        this.issuerPublicKey
      );

      // Update contributor's EDU token balance
      const contributor = await prisma.user.findUnique({
        where: { walletAddress: contributorWalletAddress }
      });

      if (contributor) {
        const currentBalance = BigInt(contributor.eduTokenBalance || '0');
        const rewardAmount = BigInt(bounty.tokenReward);
        const newBalance = (currentBalance + rewardAmount).toString();
        
        await authService.updateEduTokenBalance(contributor.id, newBalance);
        
        // Update total earned
        const currentTotal = BigInt(contributor.totalEarned || '0');
        const newTotal = (currentTotal + rewardAmount).toString();
        
        await prisma.user.update({
          where: { id: contributor.id },
          data: { totalEarned: newTotal }
        });

        // Increase reputation
        await authService.updateReputation(contributor.id, 10);
      }

      return paymentTxHash;
    } catch (error) {
      console.error('Error releasing bounty payment:', error);
      throw error;
    }
  }

  async getUserEduBalance(walletAddress: string): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { walletAddress }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get actual balance from Stellar
      const stellarBalances = await stellarService.getAccountBalance(walletAddress);
      const eduBalance = stellarBalances['EDU'] || '0';

      // Update database with actual balance
      await authService.updateEduTokenBalance(user.id, eduBalance);

      return eduBalance;
    } catch (error) {
      console.error('Error getting user EDU balance:', error);
      throw error;
    }
  }

  async distributeRewards(bountyId: string, contributorIds: string[]): Promise<void> {
    try {
      const bounty = await prisma.bounty.findUnique({
        where: { id: bountyId }
      });

      if (!bounty || !bounty.tokenReward) {
        throw new Error('Invalid bounty or no token reward specified');
      }

      const totalReward = BigInt(bounty.tokenReward);
      const rewardPerContributor = totalReward / BigInt(contributorIds.length);

      for (const contributorId of contributorIds) {
        const contributor = await prisma.user.findUnique({
          where: { id: contributorId }
        });

        if (contributor && contributor.walletAddress) {
          await this.releaseBountyPayment(bountyId, contributor.walletAddress);
        }
      }
    } catch (error) {
      console.error('Error distributing rewards:', error);
      throw error;
    }
  }

  async createBountyWithEduReward(bountyData: any, creatorSecret: string): Promise<any> {
    try {
      // Create bounty first
      const bounty = await prisma.bounty.create({
        data: bountyData
      });

      // Fund escrow if EDU token reward is specified
      if (bounty.tokenReward && bounty.tokenReward !== '0') {
        await this.fundBountyEscrow(bounty.id, creatorSecret);
      }

      return bounty;
    } catch (error) {
      console.error('Error creating bounty with EDU reward:', error);
      throw error;
    }
  }

  async validateEduTransaction(transactionHash: string): Promise<boolean> {
    try {
      const transaction = await stellarService.getTransactionStatus(transactionHash);
      return transaction.successful === true;
    } catch (error) {
      console.error('Error validating EDU transaction:', error);
      return false;
    }
  }

  async getEduTokenStats(): Promise<{
    totalSupply: string;
    totalDistributed: string;
    activeBounties: number;
    completedBounties: number;
  }> {
    try {
      const [totalSupply, totalDistributed, activeBounties, completedBounties] = await Promise.all([
        // Get total supply from issuer account
        stellarService.getAccountBalance(this.issuerPublicKey).then(balances => balances['EDU'] || '0'),
        
        // Calculate total distributed from completed bounties
        prisma.bounty.aggregate({
          where: {
            status: BountyStatus.COMPLETED,
            tokenReward: { not: null }
          },
          _sum: {
            tokenReward: true
          }
        }).then(result => result._sum.tokenReward || '0'),

        // Count active bounties with EDU rewards
        prisma.bounty.count({
          where: {
            status: { in: [BountyStatus.OPEN, BountyStatus.ASSIGNED, BountyStatus.IN_PROGRESS] },
            tokenReward: { not: null }
          }
        }),

        // Count completed bounties with EDU rewards
        prisma.bounty.count({
          where: {
            status: BountyStatus.COMPLETED,
            tokenReward: { not: null }
          }
        })
      ]);

      return {
        totalSupply,
        totalDistributed,
        activeBounties,
        completedBounties
      };
    } catch (error) {
      console.error('Error getting EDU token stats:', error);
      throw error;
    }
  }
}

export const eduTokenService = new EduTokenService();
