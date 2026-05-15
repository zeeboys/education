// EDU Token Bounty Payout System
// Addresses issue #2

interface Bounty {
  id: string;
  creator: string;
  amount: number;
  token: string;
  status: 'open' | 'claimed' | 'paid';
  claimant?: string;
}

class BountyPayoutSystem {
  private bounties: Map<string, Bounty> = new Map();

  createBounty(creator: string, amount: number, token: string = 'EDU'): Bounty {
    const bounty: Bounty = {
      id: 'bounty_' + Date.now(),
      creator,
      amount,
      token,
      status: 'open',
    };
    this.bounties.set(bounty.id, bounty);
    return bounty;
  }

  claimBounty(bountyId: string, claimant: string): Bounty {
    const bounty = this.bounties.get(bountyId);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== 'open') throw new Error('Bounty not available');
    bounty.claimant = claimant;
    bounty.status = 'claimed';
    return bounty;
  }

  approveAndPay(bountyId: string): { txHash: string; amount: number; recipient: string } {
    const bounty = this.bounties.get(bountyId);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== 'claimed' || !bounty.claimant) throw new Error('Bounty not claimed');
    bounty.status = 'paid';
    return {
      txHash: 'tx_' + bountyId + '_' + Date.now(),
      amount: bounty.amount,
      recipient: bounty.claimant,
    };
  }

  getOpenBounties(): Bounty[] {
    return Array.from(this.bounties.values()).filter(b => b.status === 'open');
  }

  getBountiesByCreator(creator: string): Bounty[] {
    return Array.from(this.bounties.values()).filter(b => b.creator === creator);
  }
}

export default BountyPayoutSystem;
