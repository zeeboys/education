# Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL
- Stellar wallet (Freighter, Albedo, or compatible)
- Git

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd decentralized-education
```

### 2. Install Dependencies

```bash
npm run install:all
```

### 3. Environment Setup

#### Backend

Copy the environment file:
```bash
cd backend
cp .env.example .env
```

Update the following variables in `backend/.env`:
- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: Generate a secure random string
- `STELLAR_HORIZON_URL`: Stellar Horizon endpoint (default: https://horizon-testnet.stellar.org)
- `STELLAR_NETWORK`: Network type (TESTNET or PUBLIC)
- `EDU_ISSUER_PUBLIC_KEY`: Your EDU token issuer public key
- `EDU_ISSUER_SECRET`: Your EDU token issuer secret key
- `FRONTEND_URL`: Your frontend URL (default: http://localhost:3000)

#### Frontend

Copy the environment file:
```bash
cd frontend
cp .env.example .env.local
```

Update the following variables in `frontend/.env.local`:
- `NEXT_PUBLIC_API_URL`: Your backend API URL
- `NEXT_PUBLIC_STELLAR_NETWORK`: Stellar network (TESTNET or PUBLIC)
- `NEXT_PUBLIC_EDU_ISSUER`: Your EDU token issuer public key

### 4. Database Setup

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 5. Start Development Servers

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

## Configuration

### Database

The application uses PostgreSQL with Prisma ORM. The database schema is defined in `backend/prisma/schema.prisma`.

### Stellar Configuration

1. **Create EDU Token**: Use Stellar Laboratory to create your EDU token asset
2. **Fund Testnet Account**: Use Friendbot to fund your testnet account
3. **Configure Issuer**: Set up the EDU token issuer account and fund it

#### Creating EDU Token on Testnet:
```bash
# 1. Create issuer account
# 2. Create trustline for EDU token
# 3. Issue EDU tokens to the issuer account
# 4. Set issuer public key in environment variables
```

### Environment Variables

#### Backend (.env)
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/decentralized_education"
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK=TESTNET
EDU_ISSUER_PUBLIC_KEY=your-edu-token-issuer-public-key
EDU_ISSUER_SECRET=your-edu-token-issuer-secret-key
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_EDU_ISSUER=your-edu-token-issuer-public-key
```

## Development

### Database Management

```bash
# View database
npx prisma studio

# Reset database
npx prisma migrate reset

# Generate client
npx prisma generate
```

### Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Building for Production

```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**: Ensure PostgreSQL is running and DATABASE_URL is correct
2. **Stellar Connection Error**: Check Stellar network configuration and EDU issuer keys
3. **CORS Error**: Verify FRONTEND_URL matches your frontend URL
4. **TypeScript Errors**: Run `npm run build` to check for compilation issues
5. **EDU Token Issues**: Ensure EDU token is properly created and issuer account is funded

### Debug Mode

Set `NODE_ENV=development` to enable detailed error messages and debugging features.

## Deployment

### Backend Deployment

1. Set production environment variables
2. Run database migrations: `npx prisma migrate deploy`
3. Build the application: `npm run build`
4. Start the server: `npm start`

### Frontend Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Deploy the `out` or `.next` directory to your hosting provider

## Security Considerations

- Never commit `.env` files to version control
- Use strong JWT secrets in production
- Enable HTTPS in production
- Implement rate limiting and input validation
- Secure EDU token issuer keys properly
- Use hardware wallets for issuer accounts in production
- Regular security audits of Stellar transactions and accounts
