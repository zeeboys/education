use soroban_sdk::{contracttype, contracterror, Address, Env, String, Token, Vec};

// Contract errors
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InsufficientBalance = 4,
    InvalidAmount = 5,
    InvalidRecipient = 6,
    MintLimitExceeded = 7,
    TransferFailed = 8,
}

// Contract metadata
#[contracttype]
pub struct TokenMetadata {
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub total_supply: i128,
}

// Contract data keys
const ADMIN_KEY: &str = "ADMIN";
const METADATA_KEY: &str = "METADATA";
const MINT_LIMIT_KEY: &str = "MINT_LIMIT";
const TOTAL_MINTED_KEY: &str = "TOTAL_MINTED";

// Default values
const DEFAULT_MINT_LIMIT: i128 = 10_000_000_000_000_000; // 10 billion EDU tokens (7 decimals)

pub struct EduTokenContract;

#[soroban_sdk::contractimpl]
impl EduTokenContract {
    /// Initialize the EDU token contract
    /// 
    /// # Arguments
    /// * `admin` - The admin address that can mint tokens
    /// * `name` - The token name
    /// * `symbol` - The token symbol  
    /// * `decimals` - Number of decimal places
    /// * `initial_supply` - Initial supply to mint to admin (optional)
    /// * `mint_limit` - Maximum total supply that can be minted
    pub fn initialize(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
        decimals: u32,
        initial_supply: Option<i128>,
        mint_limit: Option<i128>,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&String::from_str(&env, ADMIN_KEY)) {
            return Err(Error::AlreadyInitialized);
        }

        // Validate inputs
        if name.is_empty() || symbol.is_empty() {
            return Err(Error::InvalidRecipient);
        }

        if decimals > 18 {
            return Err(Error::InvalidAmount);
        }

        // Store admin
        env.storage().instance().set(&String::from_str(&env, ADMIN_KEY), &admin);

        // Store metadata
        let metadata = TokenMetadata {
            name: name.clone(),
            symbol: symbol.clone(),
            decimals,
            total_supply: initial_supply.unwrap_or(0),
        };
        env.storage().instance().set(&String::from_str(&env, METADATA_KEY), &metadata);

        // Set mint limit
        let limit = mint_limit.unwrap_or(DEFAULT_MINT_LIMIT);
        env.storage().instance().set(&String::from_str(&env, MINT_LIMIT_KEY), &limit);

        // Initialize total minted
        let total_minted = initial_supply.unwrap_or(0);
        env.storage().instance().set(&String::from_str(&env, TOTAL_MINTED_KEY), &total_minted);

        // Create token
        let token = Token::new(&env, &env.current_contract_address());
        
        // Mint initial supply if specified
        if let Some(supply) = initial_supply {
            if supply > 0 {
                token.mint(&admin, &supply);
            }
        }

        Ok(())
    }

    /// Mint new EDU tokens (admin only)
    /// 
    /// # Arguments
    /// * `to` - Recipient address
    /// * `amount` - Amount to mint
    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&String::from_str(&env, ADMIN_KEY))
            .ok_or(Error::NotInitialized)?;

        // Verify caller is admin
        if env.invoker() != admin {
            return Err(Error::Unauthorized);
        }

        // Validate amount
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Check mint limit
        let mint_limit: i128 = env
            .storage()
            .instance()
            .get(&String::from_str(&env, MINT_LIMIT_KEY))
            .ok_or(Error::NotInitialized)?;

        let total_minted: i128 = env
            .storage()
            .instance()
            .get(&String::from_str(&env, TOTAL_MINTED_KEY))
            .ok_or(Error::NotInitialized)?;

        if total_minted + amount > mint_limit {
            return Err(Error::MintLimitExceeded);
        }

        // Mint tokens
        let token = Token::new(&env, &env.current_contract_address());
        token.mint(&to, &amount);

        // Update total minted
        env.storage()
            .instance()
            .set(&String::from_str(&env, TOTAL_MINTED_KEY), &(total_minted + amount));

        // Update total supply in metadata
        let mut metadata: TokenMetadata = env
            .storage()
            .instance()
            .get(&String::from_str(&env, METADATA_KEY))
            .ok_or(Error::NotInitialized)?;
        
        metadata.total_supply += amount;
        env.storage()
            .instance()
            .set(&String::from_str(&env, METADATA_KEY), &metadata);

        Ok(())
    }

    /// Transfer tokens from caller to recipient
    /// 
    /// # Arguments
    /// * `to` - Recipient address
    /// * `amount` - Amount to transfer
    pub fn transfer(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        let caller = env.invoker();
        
        // Validate inputs
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if to == caller {
            return Err(Error::InvalidRecipient);
        }

        // Transfer tokens
        let token = Token::new(&env, &env.current_contract_address());
        
        // Check balance
        let balance = token.balance(&caller);
        if balance < amount {
            return Err(Error::InsufficientBalance);
        }

        token.transfer(&caller, &to, &amount);

        Ok(())
    }

    /// Transfer tokens from one address to another (requires approval)
    /// 
    /// # Arguments
    /// * `from` - Source address
    /// * `to` - Recipient address  
    /// * `amount` - Amount to transfer
    pub fn transfer_from(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        // Validate inputs
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if from == to {
            return Err(Error::InvalidRecipient);
        }

        // Transfer tokens
        let token = Token::new(&env, &env.current_contract_address());
        token.transfer_from(&from, &to, &amount);

        Ok(())
    }

    /// Get token metadata
    pub fn metadata(env: Env) -> Result<TokenMetadata, Error> {
        env.storage()
            .instance()
            .get(&String::from_str(&env, METADATA_KEY))
            .ok_or(Error::NotInitialized)
    }

    /// Get token balance for an address
    pub fn balance(env: Env, address: Address) -> Result<i128, Error> {
        let token = Token::new(&env, &env.current_contract_address());
        Ok(token.balance(&address))
    }

    /// Get total supply
    pub fn total_supply(env: Env) -> Result<i128, Error> {
        let metadata: TokenMetadata = env
            .storage()
            .instance()
            .get(&String::from_str(&env, METADATA_KEY))
            .ok_or(Error::NotInitialized)?;
        
        Ok(metadata.total_supply)
    }

    /// Get remaining mint capacity
    pub fn remaining_mint_capacity(env: Env) -> Result<i128, Error> {
        let mint_limit: i128 = env
            .storage()
            .instance()
            .get(&String::from_str(&env, MINT_LIMIT_KEY))
            .ok_or(Error::NotInitialized)?;

        let total_minted: i128 = env
            .storage()
            .instance()
            .get(&String::from_str(&env, TOTAL_MINTED_KEY))
            .ok_or(Error::NotInitialized)?;

        Ok(mint_limit - total_minted)
    }

    /// Check if address is admin
    pub fn is_admin(env: Env, address: Address) -> Result<bool, Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&String::from_str(&env, ADMIN_KEY))
            .ok_or(Error::NotInitialized)?;

        Ok(address == admin)
    }

    /// Update admin address (admin only)
    pub fn update_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&String::from_str(&env, ADMIN_KEY))
            .ok_or(Error::NotInitialized)?;

        // Verify caller is admin
        if env.invoker() != admin {
            return Err(Error::Unauthorized);
        }

        env.storage()
            .instance()
            .set(&String::from_str(&env, ADMIN_KEY), &new_admin);

        Ok(())
    }
}
