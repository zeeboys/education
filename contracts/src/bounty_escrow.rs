use soroban_sdk::{contracttype, contracterror, Address, Env, String, Vec, Map, Symbol, U256, Token};

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
    BountyNotFound = 6,
    InvalidStatus = 7,
    DeadlineExpired = 8,
    AlreadyApplied = 9,
    NotAssignee = 10,
    NotCreator = 11,
    EscrowNotFunded = 12,
    PaymentFailed = 13,
    InvalidDeadline = 14,
}

// Bounty status
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum BountyStatus {
    Open = 0,
    Funded = 1,
    Assigned = 2,
    InProgress = 3,
    UnderReview = 4,
    Completed = 5,
    Disputed = 6,
    Cancelled = 7,
    Expired = 8,
}

// Application status
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ApplicationStatus {
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Withdrawn = 3,
}

// Bounty structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bounty {
    pub id: U256,
    pub creator: Address,
    pub assignee: Option<Address>,
    pub title: String,
    pub description: String,
    pub reward_amount: i128,
    pub token_address: Address,
    pub deadline: u64,
    pub status: BountyStatus,
    pub created_at: u64,
    pub funded_at: Option<u64>,
    pub assigned_at: Option<u64>,
    pub completed_at: Option<u64>,
}

// Application structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Application {
    pub id: U256,
    pub bounty_id: U256,
    pub applicant: Address,
    pub proposal: String,
    pub experience: String,
    pub timeline: String,
    pub status: ApplicationStatus,
    pub created_at: u64,
    pub reviewed_at: Option<u64>,
}

// Contract data keys
const ADMIN_KEY: &str = "ADMIN";
const EDU_TOKEN_KEY: &str = "EDU_TOKEN";
const NEXT_BOUNTY_ID_KEY: &str = "NEXT_BOUNTY_ID";
const NEXT_APPLICATION_ID_KEY: &str = "NEXT_APPLICATION_ID";
const BOUNTY_KEY: &str = "BOUNTY";
const APPLICATION_KEY: &str = "APPLICATION";
const BOUNTY_APPLICATIONS_KEY: &str = "BOUNTY_APPLICATIONS";
const USER_APPLICATIONS_KEY: &str = "USER_APPLICATIONS";
const USER_BOUNTIES_KEY: &str = "USER_BOUNTIES";

// Constants
const MIN_DEADLINE_OFFSET: u64 = 86400; // 1 day minimum
const MAX_DEADLINE_OFFSET: u64 = 31536000; // 1 year maximum
const PLATFORM_FEE_BPS: u32 = 250; // 2.5% platform fee

pub struct BountyEscrowContract;

#[soroban_sdk::contractimpl]
impl BountyEscrowContract {
    /// Initialize the bounty escrow contract
    /// 
    /// # Arguments
    /// * `admin` - The admin address
    /// * `edu_token` - The EDU token contract address
    pub fn initialize(env: Env, admin: Address, edu_token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&String::from_str(&env, ADMIN_KEY)) {
            return Err(Error::AlreadyInitialized);
        }

        // Store admin
        env.storage().instance().set(&String::from_str(&env, ADMIN_KEY), &admin);
        
        // Store EDU token address
        env.storage().instance().set(&String::from_str(&env, EDU_TOKEN_KEY), &edu_token);

        // Initialize counters
        env.storage().instance().set(&String::from_str(&env, NEXT_BOUNTY_ID_KEY), &U256::from_u32(1));
        env.storage().instance().set(&String::from_str(&env, NEXT_APPLICATION_ID_KEY), &U256::from_u32(1));

        Ok(())
    }

    /// Create a new bounty
    /// 
    /// # Arguments
    /// * `creator` - Bounty creator address
    /// * `title` - Bounty title
    /// * `description` - Bounty description
    /// * `reward_amount` - Reward amount in EDU tokens
    /// * `deadline` - Deadline timestamp
    pub fn create_bounty(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        reward_amount: i128,
        deadline: u64,
    ) -> Result<U256, Error> {
        // Validate inputs
        if title.is_empty() || description.is_empty() {
            return Err(Error::InvalidAmount);
        }

        if reward_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let current_time = env.ledger().timestamp();
        
        // Validate deadline
        if deadline <= current_time + MIN_DEADLINE_OFFSET {
            return Err(Error::InvalidDeadline);
        }

        if deadline > current_time + MAX_DEADLINE_OFFSET {
            return Err(Error::InvalidDeadline);
        }

        // Get next bounty ID
        let bounty_id: U256 = env
            .storage()
            .instance()
            .get(&String::from_str(&env, NEXT_BOUNTY_ID_KEY))
            .unwrap_or(U256::from_u32(1));

        // Increment bounty ID counter
        env.storage().instance().set(
            &String::from_str(&env, NEXT_BOUNTY_ID_KEY),
            &(bounty_id + U256::from_u32(1)),
        );

        // Get EDU token address
        let edu_token: Address = env
            .storage()
            .instance()
            .get(&String::from_str(&env, EDU_TOKEN_KEY))
            .ok_or(Error::NotInitialized)?;

        // Create bounty
        let bounty = Bounty {
            id: bounty_id,
            creator: creator.clone(),
            assignee: None,
            title: title.clone(),
            description: description.clone(),
            reward_amount,
            token_address: edu_token,
            deadline,
            status: BountyStatus::Open,
            created_at: current_time,
            funded_at: None,
            assigned_at: None,
            completed_at: None,
        };

        // Store bounty
        let bounty_key = String::from_str(&env, &format!("bounty_{}", bounty_id));
        env.storage().instance().set(&bounty_key, &bounty);

        // Add to user's bounties
        let user_bounties_key = String::from_str(&env, &format!("user_bounties_{}", creator));
        let mut user_bounties: Vec<U256> = env
            .storage()
            .instance()
            .get(&user_bounties_key)
            .unwrap_or(Vec::new(&env));
        user_bounties.push_back(bounty_id);
        env.storage().instance().set(&user_bounties_key, &user_bounties);

        Ok(bounty_id)
    }

    /// Fund a bounty (transfer EDU tokens to escrow)
    /// 
    /// # Arguments
    /// * `bounty_id` - Bounty ID
    /// * `funder` - Address funding the bounty
    pub fn fund_bounty(env: Env, bounty_id: U256, funder: Address) -> Result<(), Error> {
        let bounty_key = String::from_str(&env, &format!("bounty_{}", bounty_id));
        let mut bounty: Bounty = env
            .storage()
            .instance()
            .get(&bounty_key)
            .ok_or(Error::BountyNotFound)?;

        // Verify bounty is in Open status
        if bounty.status != BountyStatus::Open {
            return Err(Error::InvalidStatus);
        }

        // Verify funder is bounty creator
        if bounty.creator != funder {
            return Err(Error::Unauthorized);
        }

        // Get EDU token
        let edu_token: Address = env
            .storage()
            .instance()
            .get(&String::from_str(&env, EDU_TOKEN_KEY))
            .ok_or(Error::NotInitialized)?;

        let token = Token::new(&env, &edu_token);

        // Check funder's balance
        let balance = token.balance(&funder);
        if balance < bounty.reward_amount {
            return Err(Error::InsufficientBalance);
        }

        // Transfer tokens to contract (escrow)
        token.transfer(&funder, &env.current_contract_address(), &bounty.reward_amount);

        // Update bounty status
        bounty.status = BountyStatus::Funded;
        bounty.funded_at = Some(env.ledger().timestamp());

        // Store updated bounty
        env.storage().instance().set(&bounty_key, &bounty);

        Ok(())
    }

    /// Apply for a bounty
    /// 
    /// # Arguments
    /// * `bounty_id` - Bounty ID
    /// * `applicant` - Applicant address
    /// * `proposal` - Application proposal
    /// * `experience` - Applicant's experience
    /// * `timeline` - Expected completion timeline
    pub fn apply_for_bounty(
        env: Env,
        bounty_id: U256,
        applicant: Address,
        proposal: String,
        experience: String,
        timeline: String,
    ) -> Result<U256, Error> {
        let bounty_key = String::from_str(&env, &format!("bounty_{}", bounty_id));
        let bounty: Bounty = env
            .storage()
            .instance()
            .get(&bounty_key)
            .ok_or(Error::BountyNotFound)?;

        // Verify bounty is in Funded status
        if bounty.status != BountyStatus::Funded {
            return Err(Error::InvalidStatus);
        }

        // Verify deadline not expired
        if env.ledger().timestamp() > bounty.deadline {
            return Err(Error::DeadlineExpired);
        }

        // Check if already applied
        let bounty_applications_key = String::from_str(&env, &format!("bounty_applications_{}", bounty_id));
        let existing_applications: Vec<U256> = env
            .storage()
            .instance()
            .get(&bounty_applications_key)
            .unwrap_or(Vec::new(&env));

        for app_id in existing_applications.iter() {
            let app_key = String::from_str(&env, &format!("application_{}", app_id));
            let app: Application = env.storage().instance().get(&app_key).unwrap();
            if app.applicant == applicant && app.status != ApplicationStatus::Withdrawn {
                return Err(Error::AlreadyApplied);
            }
        }

        // Get next application ID
        let application_id: U256 = env
            .storage()
            .instance()
            .get(&String::from_str(&env, NEXT_APPLICATION_ID_KEY))
            .unwrap_or(U256::from_u32(1));

        // Increment application ID counter
        env.storage().instance().set(
            &String::from_str(&env, NEXT_APPLICATION_ID_KEY),
            &(application_id + U256::from_u32(1)),
        );

        // Create application
        let application = Application {
            id: application_id,
            bounty_id,
            applicant: applicant.clone(),
            proposal: proposal.clone(),
            experience: experience.clone(),
            timeline: timeline.clone(),
            status: ApplicationStatus::Pending,
            created_at: env.ledger().timestamp(),
            reviewed_at: None,
        };

        // Store application
        let app_key = String::from_str(&env, &format!("application_{}", application_id));
        env.storage().instance().set(&app_key, &application);

        // Add to bounty applications
        let mut bounty_applications = existing_applications;
        bounty_applications.push_back(application_id);
        env.storage().instance().set(&bounty_applications_key, &bounty_applications);

        // Add to user applications
        let user_applications_key = String::from_str(&env, &format!("user_applications_{}", applicant));
        let mut user_applications: Vec<U256> = env
            .storage()
            .instance()
            .get(&user_applications_key)
            .unwrap_or(Vec::new(&env));
        user_applications.push_back(application_id);
        env.storage().instance().set(&user_applications_key, &user_applications);

        Ok(application_id)
    }

    /// Assign bounty to applicant
    /// 
    /// # Arguments
    /// * `bounty_id` - Bounty ID
    /// * `application_id` - Application ID to approve
    /// * `creator` - Bounty creator address
    pub fn assign_bounty(
        env: Env,
        bounty_id: U256,
        application_id: U256,
        creator: Address,
    ) -> Result<(), Error> {
        let bounty_key = String::from_str(&env, &format!("bounty_{}", bounty_id));
        let mut bounty: Bounty = env
            .storage()
            .instance()
            .get(&bounty_key)
            .ok_or(Error::BountyNotFound)?;

        // Verify caller is bounty creator
        if bounty.creator != creator {
            return Err(Error::Unauthorized);
        }

        // Verify bounty is in Funded status
        if bounty.status != BountyStatus::Funded {
            return Err(Error::InvalidStatus);
        }

        // Get application
        let app_key = String::from_str(&env, &format!("application_{}", application_id));
        let mut application: Application = env
            .storage()
            .instance()
            .get(&app_key)
            .ok_or(Error::BountyNotFound)?;

        // Verify application is for this bounty and is pending
        if application.bounty_id != bounty_id || application.status != ApplicationStatus::Pending {
            return Err(Error::InvalidStatus);
        }

        // Update bounty
        bounty.assignee = Some(application.applicant.clone());
        bounty.status = BountyStatus::Assigned;
        bounty.assigned_at = Some(env.ledger().timestamp());

        // Update application
        application.status = ApplicationStatus::Approved;
        application.reviewed_at = Some(env.ledger().timestamp());

        // Reject other applications
        let bounty_applications_key = String::from_str(&env, &format!("bounty_applications_{}", bounty_id));
        let applications: Vec<U256> = env
            .storage()
            .instance()
            .get(&bounty_applications_key)
            .unwrap_or(Vec::new(&env));

        for app_id in applications.iter() {
            if *app_id != application_id {
                let other_app_key = String::from_str(&env, &format!("application_{}", app_id));
                let mut other_app: Application = env.storage().instance().get(&other_app_key).unwrap();
                if other_app.status == ApplicationStatus::Pending {
                    other_app.status = ApplicationStatus::Rejected;
                    other_app.reviewed_at = Some(env.ledger().timestamp());
                    env.storage().instance().set(&other_app_key, &other_app);
                }
            }
        }

        // Store updated bounty and application
        env.storage().instance().set(&bounty_key, &bounty);
        env.storage().instance().set(&app_key, &application);

        Ok(())
    }

    /// Complete bounty and release payment
    /// 
    /// # Arguments
    /// * `bounty_id` - Bounty ID
    /// * `creator` - Bounty creator address
    pub fn complete_bounty(env: Env, bounty_id: U256, creator: Address) -> Result<(), Error> {
        let bounty_key = String::from_str(&env, &format!("bounty_{}", bounty_id));
        let mut bounty: Bounty = env
            .storage()
            .instance()
            .get(&bounty_key)
            .ok_or(Error::BountyNotFound)?;

        // Verify caller is bounty creator
        if bounty.creator != creator {
            return Err(Error::Unauthorized);
        }

        // Verify bounty is assigned
        if bounty.status != BountyStatus::Assigned && bounty.status != BountyStatus::InProgress {
            return Err(Error::InvalidStatus);
        }

        let assignee = bounty.assignee.ok_or(Error::InvalidStatus)?;

        // Get EDU token
        let edu_token: Address = env
            .storage()
            .instance()
            .get(&String::from_str(&env, EDU_TOKEN_KEY))
            .ok_or(Error::NotInitialized)?;

        let token = Token::new(&env, &edu_token);

        // Calculate platform fee
        let platform_fee = (bounty.reward_amount * PLATFORM_FEE_BPS as i128) / 10000;
        let payment_amount = bounty.reward_amount - platform_fee;

        // Transfer payment to assignee
        token.transfer(&env.current_contract_address(), &assignee, &payment_amount);

        // Update bounty status
        bounty.status = BountyStatus::Completed;
        bounty.completed_at = Some(env.ledger().timestamp());

        // Store updated bounty
        env.storage().instance().set(&bounty_key, &bounty);

        Ok(())
    }

    /// Get bounty details
    pub fn get_bounty(env: Env, bounty_id: U256) -> Result<Bounty, Error> {
        let bounty_key = String::from_str(&env, &format!("bounty_{}", bounty_id));
        env.storage()
            .instance()
            .get(&bounty_key)
            .ok_or(Error::BountyNotFound)
    }

    /// Get application details
    pub fn get_application(env: Env, application_id: U256) -> Result<Application, Error> {
        let app_key = String::from_str(&env, &format!("application_{}", application_id));
        env.storage()
            .instance()
            .get(&app_key)
            .ok_or(Error::BountyNotFound)
    }

    /// Get all applications for a bounty
    pub fn get_bounty_applications(env: Env, bounty_id: U256) -> Result<Vec<U256>, Error> {
        let bounty_applications_key = String::from_str(&env, &format!("bounty_applications_{}", bounty_id));
        Ok(env
            .storage()
            .instance()
            .get(&bounty_applications_key)
            .unwrap_or(Vec::new(&env)))
    }

    /// Get all bounties for a user
    pub fn get_user_bounties(env: Env, user: Address) -> Result<Vec<U256>, Error> {
        let user_bounties_key = String::from_str(&env, &format!("user_bounties_{}", user));
        Ok(env
            .storage()
            .instance()
            .get(&user_bounties_key)
            .unwrap_or(Vec::new(&env)))
    }

    /// Get all applications for a user
    pub fn get_user_applications(env: Env, user: Address) -> Result<Vec<U256>, Error> {
        let user_applications_key = String::from_str(&env, &format!("user_applications_{}", user));
        Ok(env
            .storage()
            .instance()
            .get(&user_applications_key)
            .unwrap_or(Vec::new(&env)))
    }
}
