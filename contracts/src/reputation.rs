use soroban_sdk::{contracttype, contracterror, Address, Env, String, Vec, Map, Symbol, U256};

// Contract errors
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    UserNotFound = 4,
    InvalidReputation = 5,
    InvalidAmount = 6,
    SelfOperation = 7,
    CertificationNotFound = 8,
    SkillNotFound = 9,
    DuplicateSkill = 10,
    DuplicateCertification = 11,
    InvalidLevel = 12,
}

// Reputation level
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ReputationLevel {
    Beginner = 0,
    Intermediate = 1,
    Advanced = 2,
    Expert = 3,
    Master = 4,
}

// User reputation data
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserReputation {
    pub address: Address,
    pub reputation_score: i32,
    pub level: ReputationLevel,
    pub completed_bounties: u32,
    pub created_bounties: u32,
    pub total_earned: i128,
    pub skills: Vec<String>,
    pub certifications: Vec<U256>,
    pub created_at: u64,
    pub updated_at: u64,
}

// Certification data
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Certification {
    pub id: U256,
    pub user: Address,
    pub title: String,
    pub issuer: Address,
    pub issue_date: u64,
    pub expiry_date: Option<u64>,
    pub verified: bool,
    pub created_at: u64,
}

// Reputation event
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReputationEvent {
    pub id: U256,
    pub user: Address,
    pub event_type: String,
    pub reputation_change: i32,
    pub bounty_id: Option<U256>,
    pub description: String,
    pub created_at: u64,
}

// Contract data keys
const ADMIN_KEY: &str = "ADMIN";
const NEXT_CERTIFICATION_ID_KEY: &str = "NEXT_CERTIFICATION_ID";
const NEXT_EVENT_ID_KEY: &str = "NEXT_EVENT_ID";
const USER_REPUTATION_KEY: &str = "USER_REPUTATION";
const CERTIFICATION_KEY: &str = "CERTIFICATION";
const USER_CERTIFICATIONS_KEY: &str = "USER_CERTIFICATIONS";
const USER_EVENTS_KEY: &str = "USER_EVENTS";
const SKILL_USERS_KEY: &str = "SKILL_USERS";

// Reputation thresholds for levels
const BEGINNER_THRESHOLD: i32 = 0;
const INTERMEDIATE_THRESHOLD: i32 = 100;
const ADVANCED_THRESHOLD: i32 = 500;
const EXPERT_THRESHOLD: i32 = 1000;
const MASTER_THRESHOLD: i32 = 2500;

// Reputation change amounts
const BOUNTY_COMPLETED_REP: i32 = 10;
const BOUNTY_CREATED_REP: i32 = 5;
const CERTIFICATION_VERIFIED_REP: i32 = 15;
const SKILL_ADDED_REP: i32 = 3;
const BOUNTY_CANCELLED_PENALTY: i32 = -5;

pub struct ReputationContract;

#[soroban_sdk::contractimpl]
impl ReputationContract {
    /// Initialize the reputation contract
    /// 
    /// # Arguments
    /// * `admin` - The admin address
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&String::from_str(&env, ADMIN_KEY)) {
            return Err(Error::AlreadyInitialized);
        }

        // Store admin
        env.storage().instance().set(&String::from_str(&env, ADMIN_KEY), &admin);

        // Initialize counters
        env.storage().instance().set(&String::from_str(&env, NEXT_CERTIFICATION_ID_KEY), &U256::from_u32(1));
        env.storage().instance().set(&String::from_str(&env, NEXT_EVENT_ID_KEY), &U256::from_u32(1));

        Ok(())
    }

    /// Create or update user reputation
    /// 
    /// # Arguments
    /// * `user` - User address
    /// * `initial_reputation` - Initial reputation score (optional)
    pub fn create_user_reputation(env: Env, user: Address, initial_reputation: Option<i32>) -> Result<(), Error> {
        let user_key = String::from_str(&env, &format!("user_reputation_{}", user));
        
        // Check if user already exists
        if env.storage().instance().has(&user_key) {
            return Err(Error::UserNotFound); // User already exists
        }

        let current_time = env.ledger().timestamp();
        let initial_score = initial_reputation.unwrap_or(0);
        let level = Self::calculate_level(initial_score);

        // Create user reputation
        let user_reputation = UserReputation {
            address: user.clone(),
            reputation_score: initial_score,
            level,
            completed_bounties: 0,
            created_bounties: 0,
            total_earned: 0,
            skills: Vec::new(&env),
            certifications: Vec::new(&env),
            created_at: current_time,
            updated_at: current_time,
        };

        // Store user reputation
        env.storage().instance().set(&user_key, &user_reputation);

        // Create initial reputation event
        Self::add_reputation_event(
            env,
            user.clone(),
            String::from_str(&env, "user_created"),
            initial_score,
            None,
            String::from_str(&env, "User reputation initialized"),
        )?;

        Ok(())
    }

    /// Add reputation to user
    /// 
    /// # Arguments
    /// * `user` - User address
    /// * `amount` - Reputation amount to add (can be negative)
    /// * `event_type` - Type of event
    /// * `bounty_id` - Related bounty ID (optional)
    /// * `description` - Event description
    pub fn add_reputation(
        env: Env,
        user: Address,
        amount: i32,
        event_type: String,
        bounty_id: Option<U256>,
        description: String,
    ) -> Result<(), Error> {
        let user_key = String::from_str(&env, &format!("user_reputation_{}", user));
        let mut user_reputation: UserReputation = env
            .storage()
            .instance()
            .get(&user_key)
            .ok_or(Error::UserNotFound)?;

        // Update reputation score
        let new_score = user_reputation.reputation_score + amount;
        
        // Ensure reputation doesn't go below 0
        if new_score < 0 {
            return Err(Error::InvalidReputation);
        }

        user_reputation.reputation_score = new_score;
        user_reputation.level = Self::calculate_level(new_score);
        user_reputation.updated_at = env.ledger().timestamp();

        // Store updated reputation
        env.storage().instance().set(&user_key, &user_reputation);

        // Add reputation event
        Self::add_reputation_event(env, user.clone(), event_type, amount, bounty_id, description)?;

        Ok(())
    }

    /// Add skill to user
    /// 
    /// # Arguments
    /// * `user` - User address
    /// * `skill` - Skill name
    pub fn add_skill(env: Env, user: Address, skill: String) -> Result<(), Error> {
        let user_key = String::from_str(&env, &format!("user_reputation_{}", user));
        let mut user_reputation: UserReputation = env
            .storage()
            .instance()
            .get(&user_key)
            .ok_or(Error::UserNotFound)?;

        // Check if skill already exists
        for existing_skill in user_reputation.skills.iter() {
            if *existing_skill == skill {
                return Err(Error::DuplicateSkill);
            }
        }

        // Add skill
        user_reputation.skills.push_back(skill.clone());
        user_reputation.updated_at = env.ledger().timestamp();

        // Store updated reputation
        env.storage().instance().set(&user_key, &user_reputation);

        // Add to skill index
        let skill_users_key = String::from_str(&env, &format!("skill_users_{}", skill));
        let mut skill_users: Vec<Address> = env
            .storage()
            .instance()
            .get(&skill_users_key)
            .unwrap_or(Vec::new(&env));
        
        // Check if user already in skill users
        let mut user_exists = false;
        for existing_user in skill_users.iter() {
            if *existing_user == user {
                user_exists = true;
                break;
            }
        }
        
        if !user_exists {
            skill_users.push_back(user.clone());
            env.storage().instance().set(&skill_users_key, &skill_users);
        }

        // Add reputation for adding skill
        Self::add_reputation(
            env,
            user.clone(),
            SKILL_ADDED_REP,
            String::from_str(&env, "skill_added"),
            None,
            String::from_str(&env, &format!("Added skill: {}", skill)),
        )?;

        Ok(())
    }

    /// Add certification to user
    /// 
    /// # Arguments
    /// * `user` - User address
    /// * `title` - Certification title
    /// * `issuer` - Issuer address
    /// * `expiry_date` - Expiry date (optional)
    pub fn add_certification(
        env: Env,
        user: Address,
        title: String,
        issuer: Address,
        expiry_date: Option<u64>,
    ) -> Result<U256, Error> {
        let user_key = String::from_str(&env, &format!("user_reputation_{}", user));
        let mut user_reputation: UserReputation = env
            .storage()
            .instance()
            .get(&user_key)
            .ok_or(Error::UserNotFound)?;

        // Get next certification ID
        let certification_id: U256 = env
            .storage()
            .instance()
            .get(&String::from_str(&env, NEXT_CERTIFICATION_ID_KEY))
            .unwrap_or(U256::from_u32(1));

        // Increment certification ID counter
        env.storage().instance().set(
            &String::from_str(&env, NEXT_CERTIFICATION_ID_KEY),
            &(certification_id + U256::from_u32(1)),
        );

        let current_time = env.ledger().timestamp();

        // Create certification
        let certification = Certification {
            id: certification_id,
            user: user.clone(),
            title: title.clone(),
            issuer: issuer.clone(),
            issue_date: current_time,
            expiry_date,
            verified: false,
            created_at: current_time,
        };

        // Store certification
        let cert_key = String::from_str(&env, &format!("certification_{}", certification_id));
        env.storage().instance().set(&cert_key, &certification);

        // Add to user certifications
        user_reputation.certifications.push_back(certification_id);
        user_reputation.updated_at = current_time;

        // Store updated reputation
        env.storage().instance().set(&user_key, &user_reputation);

        // Add to user certifications index
        let user_certs_key = String::from_str(&env, &format!("user_certifications_{}", user));
        let mut user_certifications: Vec<U256> = env
            .storage()
            .instance()
            .get(&user_certs_key)
            .unwrap_or(Vec::new(&env));
        user_certifications.push_back(certification_id);
        env.storage().instance().set(&user_certs_key, &user_certifications);

        Ok(certification_id)
    }

    /// Verify certification (admin only)
    /// 
    /// # Arguments
    /// * `certification_id` - Certification ID
    /// * `admin` - Admin address
    pub fn verify_certification(env: Env, certification_id: U256, admin: Address) -> Result<(), Error> {
        // Verify admin
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&String::from_str(&env, ADMIN_KEY))
            .ok_or(Error::NotInitialized)?;

        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }

        // Get certification
        let cert_key = String::from_str(&env, &format!("certification_{}", certification_id));
        let mut certification: Certification = env
            .storage()
            .instance()
            .get(&cert_key)
            .ok_or(Error::CertificationNotFound)?;

        if certification.verified {
            return Err(Error::InvalidReputation); // Already verified
        }

        // Mark as verified
        certification.verified = true;
        env.storage().instance().set(&cert_key, &certification);

        // Add reputation to user
        Self::add_reputation(
            env,
            certification.user.clone(),
            CERTIFICATION_VERIFIED_REP,
            String::from_str(&env, "certification_verified"),
            None,
            String::from_str(&env, &format!("Certification verified: {}", certification.title)),
        )?;

        Ok(())
    }

    /// Update bounty statistics for user
    /// 
    /// # Arguments
    /// * `user` - User address
    /// * `completed` - Whether bounty was completed
    /// * `created` - Whether bounty was created
    /// * `earned` - Amount earned (for completed bounties)
    pub fn update_bounty_stats(
        env: Env,
        user: Address,
        completed: bool,
        created: bool,
        earned: Option<i128>,
    ) -> Result<(), Error> {
        let user_key = String::from_str(&env, &format!("user_reputation_{}", user));
        let mut user_reputation: UserReputation = env
            .storage()
            .instance()
            .get(&user_key)
            .ok_or(Error::UserNotFound)?;

        let mut reputation_change = 0;

        if completed {
            user_reputation.completed_bounties += 1;
            reputation_change += BOUNTY_COMPLETED_REP;
        }

        if created {
            user_reputation.created_bounties += 1;
            reputation_change += BOUNTY_CREATED_REP;
        }

        if let Some(amount) = earned {
            user_reputation.total_earned += amount;
        }

        user_reputation.updated_at = env.ledger().timestamp();

        // Update reputation if changed
        if reputation_change != 0 {
            user_reputation.reputation_score += reputation_change;
            user_reputation.level = Self::calculate_level(user_reputation.reputation_score);
        }

        // Store updated reputation
        env.storage().instance().set(&user_key, &user_reputation);

        Ok(())
    }

    /// Get user reputation
    pub fn get_user_reputation(env: Env, user: Address) -> Result<UserReputation, Error> {
        let user_key = String::from_str(&env, &format!("user_reputation_{}", user));
        env.storage()
            .instance()
            .get(&user_key)
            .ok_or(Error::UserNotFound)
    }

    /// Get certification details
    pub fn get_certification(env: Env, certification_id: U256) -> Result<Certification, Error> {
        let cert_key = String::from_str(&env, &format!("certification_{}", certification_id));
        env.storage()
            .instance()
            .get(&cert_key)
            .ok_or(Error::CertificationNotFound)
    }

    /// Get user certifications
    pub fn get_user_certifications(env: Env, user: Address) -> Result<Vec<U256>, Error> {
        let user_certs_key = String::from_str(&env, &format!("user_certifications_{}", user));
        Ok(env
            .storage()
            .instance()
            .get(&user_certs_key)
            .unwrap_or(Vec::new(&env)))
    }

    /// Get users with specific skill
    pub fn get_users_with_skill(env: Env, skill: String) -> Result<Vec<Address>, Error> {
        let skill_users_key = String::from_str(&env, &format!("skill_users_{}", skill));
        Ok(env
            .storage()
            .instance()
            .get(&skill_users_key)
            .unwrap_or(Vec::new(&env)))
    }

    /// Get user reputation events
    pub fn get_user_events(env: Env, user: Address, limit: Option<u32>) -> Result<Vec<U256>, Error> {
        let user_events_key = String::from_str(&env, &format!("user_events_{}", user));
        let events: Vec<U256> = env
            .storage()
            .instance()
            .get(&user_events_key)
            .unwrap_or(Vec::new(&env));

        if let Some(limit) = limit {
            let end = std::cmp::min(events.len() as u32, limit) as usize;
            Ok(events.slice(0..end))
        } else {
            Ok(events)
        }
    }

    /// Helper function to calculate reputation level
    fn calculate_level(reputation_score: i32) -> ReputationLevel {
        if reputation_score >= MASTER_THRESHOLD {
            ReputationLevel::Master
        } else if reputation_score >= EXPERT_THRESHOLD {
            ReputationLevel::Expert
        } else if reputation_score >= ADVANCED_THRESHOLD {
            ReputationLevel::Advanced
        } else if reputation_score >= INTERMEDIATE_THRESHOLD {
            ReputationLevel::Intermediate
        } else {
            ReputationLevel::Beginner
        }
    }

    /// Helper function to add reputation event
    fn add_reputation_event(
        env: Env,
        user: Address,
        event_type: String,
        reputation_change: i32,
        bounty_id: Option<U256>,
        description: String,
    ) -> Result<U256, Error> {
        // Get next event ID
        let event_id: U256 = env
            .storage()
            .instance()
            .get(&String::from_str(&env, NEXT_EVENT_ID_KEY))
            .unwrap_or(U256::from_u32(1));

        // Increment event ID counter
        env.storage().instance().set(
            &String::from_str(&env, NEXT_EVENT_ID_KEY),
            &(event_id + U256::from_u32(1)),
        );

        // Create event
        let event = ReputationEvent {
            id: event_id,
            user: user.clone(),
            event_type: event_type.clone(),
            reputation_change,
            bounty_id,
            description: description.clone(),
            created_at: env.ledger().timestamp(),
        };

        // Store event
        let event_key = String::from_str(&env, &format!("event_{}", event_id));
        env.storage().instance().set(&event_key, &event);

        // Add to user events
        let user_events_key = String::from_str(&env, &format!("user_events_{}", user));
        let mut user_events: Vec<U256> = env
            .storage()
            .instance()
            .get(&user_events_key)
            .unwrap_or(Vec::new(&env));
        user_events.push_back(event_id);
        env.storage().instance().set(&user_events_key, &user_events);

        Ok(event_id)
    }
}
