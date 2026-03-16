import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { stellarService } from './stellar.service';

const prisma = new PrismaClient();

export class AuthService {
  async generateJWT(userId: string): Promise<string> {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
  }

  async createUserWithWallet(walletAddress: string, username?: string, displayName?: string) {
    // Validate wallet address
    const isValidAddress = await stellarService.validateAddress(walletAddress);
    if (!isValidAddress) {
      throw new Error('Invalid Stellar wallet address');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress },
          ...(username ? [{ username }] : [])
        ]
      }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        walletAddress,
        username,
        displayName,
      }
    });

    return user;
  }

  async authenticateWithWallet(walletAddress: string, signature: string, challenge: string) {
    // Validate wallet address
    const isValidAddress = await stellarService.validateAddress(walletAddress);
    if (!isValidAddress) {
      throw new Error('Invalid Stellar wallet address');
    }

    // Verify signature (simplified - in production, verify against challenge)
    // This is a placeholder for proper signature verification
    const user = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const token = await this.generateJWT(user.id);
    return { user, token };
  }

  async createUserWithEmail(email: string, password: string, username: string) {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        // Note: In a real implementation, you'd store the hashed password
        // For this demo, we're focusing on wallet authentication
      }
    });

    const token = await this.generateJWT(user.id);
    return { user, token };
  }

  async updateUserProfile(userId: string, updates: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    skills?: string[];
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates
    });

    return user;
  }

  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        createdBounties: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        assignedBounties: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        certifications: {
          take: 5,
          orderBy: { issueDate: 'desc' }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateReputation(userId: string, change: number) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        reputation: {
          increment: change
        }
      }
    });

    return user;
  }

  async updateEduTokenBalance(userId: string, amount: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        eduTokenBalance: amount
      }
    });

    return user;
  }
}

export const authService = new AuthService();
