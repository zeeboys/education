# 🎓🌟 Decentralized Education Platform (Stellar-Based)

A full-stack Web3 education platform powered by Stellar blockchain, featuring automated bounty payments with EDU tokens. Contributors earn rewards for creating educational content, while learners access free Web3 tutorials and courses.

## 🌟 Why Stellar?

- **💰 Ultra-Low Fees**: 0.00001 XLM per transaction (~$0.000001)
- **⚡ Lightning Fast**: 3-5 second confirmations
- **🌍 Global Access**: Available worldwide without gas fees
- **🔒 Built-in DEX**: Native asset exchange capabilities
- **📱 Mobile-First**: Designed for global accessibility

## 🚀 Repository

- **Organization**: [zeeboys/education](https://github.com/zeeboys/education)
- **Original**: [akordavid373/decentralized-education](https://github.com/akordavid373/decentralized-education)

## 🚀 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Stellar SDK** - Stellar blockchain integration

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Stellar SDK** - Blockchain interactions
### Features
- 🔐 Stellar wallet authentication
- 📚 Educational content management
- 💰 EDU token bounty system
- 👥 Contributor profiles and reputation
- 🏆 Certification system
- 📊 Impact metrics dashboard

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL
- Stellar wallet (any compatible wallet)

### Quick Start

1. **Clone and install dependencies**
   ```bash
   cd decentralized-education
   npm run install:all
   ```

2. **Setup environment**
   ```bash
   # Backend
   cd backend && cp .env.example .env
   
   # Frontend  
   cd frontend && cp .env.example .env.local
   ```

3. **Setup database**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

### Detailed Setup

For detailed setup instructions, see [docs/SETUP.md](docs/SETUP.md)

## � How to Contribute

### For Contributors
1. **Browse Issues** - Find educational bounties that match your skills
2. **Apply for Bounties** - Comment on issues with your experience and approach
3. **Complete Work** - Follow requirements and submit pull requests
4. **Get Rewarded** - Receive instant EDU token payments via Stellar

### For Funders
1. **Support Education** - Fund specific learning modules or contributors
2. **Track Impact** - See exactly how your funds are used
3. **Sustainable Giving** - Set up recurring EDU token streams
4. **Global Access** - Support education worldwide with minimal fees

### Quick Start for Contributors
```bash
# 1. Find a bounty at https://github.com/zeeboys/education/issues
# 2. Apply using the template in the issue
# 3. Clone and setup the project
git clone https://github.com/zeeboys/education.git
cd education
npm run install:all

# 4. Create your feature branch
git checkout -b bounty/[issue-number]-[description]

# 5. Complete the work and submit a PR
```

### Stellar Integration
- **Instant Payments**: EDU token rewards in 3-5 seconds
- **Ultra-Low Fees**: 0.00001 XLM per transaction
- **Global Access**: Available worldwide without gas fees
- **Built-in DEX**: Native asset exchange capabilities
- **Mobile-First**: Optimized for global accessibility

**Setup Guide**: See [docs/STELLAR_SETUP.md](docs/STELLAR_SETUP.md) for complete Stellar configuration.

## 📄 License

MIT License - see LICENSE file for details.
