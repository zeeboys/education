const { Octokit } = require('@octokit/rest')
require('dotenv').config()

// Initialize Octokit with GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || 'your-github-token-here'
})

// Bounty issue templates
const bountyIssues = [
  {
    title: "Create comprehensive Web3 tutorial series",
    category: "CONTENT_CREATION",
    difficulty: "INTERMEDIATE",
    reward: "0.25",
    description: "Create a comprehensive tutorial series covering Web3 fundamentals, smart contracts, and DApp development.",
    requirements: [
      "Create 10+ tutorial articles covering Web3 basics",
      "Include code examples and interactive demos",
      "Add quizzes and exercises for each tutorial",
      "Ensure content is beginner-friendly",
      "Follow accessibility best practices"
    ],
    skills: ["Technical Writing", "Web3 Knowledge", "Content Creation"],
    deadline: "2024-04-15"
  },
  {
    title: "Implement user dashboard with earnings tracking",
    category: "DEVELOPMENT",
    difficulty: "ADVANCED",
    reward: "0.35",
    description: "Build a comprehensive user dashboard that displays contributor earnings, reputation, and activity history.",
    requirements: [
      "Create responsive dashboard layout",
      "Integrate with DripsNetwork for earnings data",
      "Display reputation points and badges",
      "Show activity history and statistics",
      "Add export functionality for earnings data"
    ],
    skills: ["React", "TypeScript", "API Integration", "UI/UX"],
    deadline: "2024-04-20"
  },
  {
    title: "Design modern UI components for bounty system",
    category: "DESIGN_UX",
    difficulty: "INTERMEDIATE",
    reward: "0.15",
    description: "Design and implement modern, accessible UI components for the bounty management system.",
    requirements: [
      "Create component library with consistent design",
      "Implement dark/light theme support",
      "Ensure mobile responsiveness",
      "Add loading states and micro-interactions",
      "Follow WCAG accessibility guidelines"
    ],
    skills: ["UI/UX Design", "React", "CSS/Tailwind", "Accessibility"],
    deadline: "2024-04-10"
  },
  {
    title: "Translate platform documentation to Spanish",
    category: "TRANSLATION",
    difficulty: "BEGINNER",
    reward: "0.08",
    description: "Translate all platform documentation and UI text to Spanish to reach a broader audience.",
    requirements: [
      "Translate README.md to Spanish",
      "Translate all UI components and labels",
      "Translate setup documentation",
      "Ensure cultural adaptation and context",
      "Review and proofread for accuracy"
    ],
    skills: ["Spanish Fluency", "Technical Translation", "Attention to Detail"],
    deadline: "2024-04-05"
  },
  {
    title: "Implement automated testing suite",
    category: "DEVELOPMENT",
    difficulty: "ADVANCED",
    reward: "0.4",
    description: "Create comprehensive automated testing suite for both frontend and backend components.",
    requirements: [
      "Set up Jest for unit testing",
      "Implement integration tests for API endpoints",
      "Add E2E tests with Cypress",
      "Achieve 80%+ code coverage",
      "Set up CI/CD testing pipeline"
    ],
    skills: ["Testing", "Jest", "Cypress", "CI/CD"],
    deadline: "2024-04-25"
  },
  {
    title: "Create video tutorials for platform setup",
    category: "CONTENT_CREATION",
    difficulty: "INTERMEDIATE",
    reward: "0.2",
    description: "Create video tutorials guiding users through platform setup, bounty creation, and contribution process.",
    requirements: [
      "Create 5+ video tutorials (5-10 mins each)",
      "Cover setup, bounty creation, and contribution flow",
      "Add captions and transcripts",
      "Include screen recordings with clear narration",
      "Upload to YouTube and embed in documentation"
    ],
    skills: ["Video Production", "Technical Communication", "Screen Recording"],
    deadline: "2024-04-18"
  },
  {
    title: "Implement real-time notification system",
    category: "DEVELOPMENT",
    difficulty: "ADVANCED",
    reward: "0.3",
    description: "Build a real-time notification system for bounty updates, assignments, and payment confirmations.",
    requirements: [
      "Integrate WebSocket for real-time updates",
      "Create notification preferences UI",
      "Implement email notifications",
      "Add push notification support",
      "Design notification center component"
    ],
    skills: ["WebSocket", "Node.js", "React", "Email Integration"],
    deadline: "2024-04-22"
  },
  {
    title: "Create comprehensive API documentation",
    category: "CONTENT_CREATION",
    difficulty: "INTERMEDIATE",
    reward: "0.18",
    description: "Create detailed API documentation with examples, authentication guides, and interactive testing.",
    requirements: [
      "Document all API endpoints with examples",
      "Create authentication and authorization guide",
      "Add interactive API testing interface",
      "Include error handling documentation",
      "Generate OpenAPI/Swagger specification"
    ],
    skills: ["Technical Writing", "API Documentation", "OpenAPI"],
    deadline: "2024-04-12"
  },
  {
    title: "Implement advanced search and filtering",
    category: "DEVELOPMENT",
    difficulty: "INTERMEDIATE",
    reward: "0.22",
    description: "Add advanced search functionality with filters, sorting, and pagination for bounties and contributors.",
    requirements: [
      "Implement full-text search for bounties",
      "Add category and difficulty filters",
      "Create sorting options (date, reward, popularity)",
      "Implement infinite scroll pagination",
      "Add search analytics and tracking"
    ],
    skills: ["Search Implementation", "Database Optimization", "React"],
    deadline: "2024-04-17"
  },
  {
    title: "Create community engagement features",
    category: "COMMUNITY",
    difficulty: "INTERMEDIATE",
    reward: "0.16",
    description: "Build community features including discussion forums, contributor profiles, and social sharing.",
    requirements: [
      "Create discussion forum for each bounty",
      "Enhance contributor profiles with portfolios",
      "Add social sharing capabilities",
      "Implement contributor badges and achievements",
      "Create community leaderboard"
    ],
    skills: ["Community Features", "Social Integration", "Gamification"],
    deadline: "2024-04-20"
  }
]

async function createBountyIssues() {
  try {
    console.log('🚀 Creating 10 bounty issues...')
    
    const owner = 'akordavid373'
    const repo = 'decentralized-education'
    
    for (let i = 0; i < bountyIssues.length; i++) {
      const bounty = bountyIssues[i]
      
      // Format the issue body using the bounty template
      const issueBody = formatBountyIssue(bounty)
      
      console.log(`📝 Creating issue ${i + 1}/10: ${bounty.title}`)
      
      try {
        const issue = await octokit.rest.issues.create({
          owner,
          repo,
          title: `[BOUNTY] ${bounty.title}`,
          body: issueBody,
          labels: ['bounty', bounty.category.toLowerCase().replace('_', '-'), bounty.difficulty.toLowerCase()]
        })
        
        console.log(`✅ Issue created: ${issue.data.html_url}`)
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`❌ Error creating issue "${bounty.title}":`, error.message)
      }
    }
    
    console.log('\n🎉 Bounty issue creation complete!')
    console.log('📊 Summary:')
    console.log(`   Total issues created: ${bountyIssues.length}`)
    console.log(`   Total reward pool: ${bountyIssues.reduce((sum, b) => sum + parseFloat(b.reward), 0).toFixed(2)} ETH`)
    console.log(`   Categories: ${[...new Set(bountyIssues.map(b => b.category))].join(', ')}`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
  }
}

function formatBountyIssue(bounty) {
  return `## 🎯 Bounty Information

### **Category**
${getCategoryCheckbox(bounty.category)}

### **Difficulty Level**
${getDifficultyCheckbox(bounty.difficulty)}

### **Reward Amount**
ETH: ${bounty.reward}

### **Deadline**
${bounty.deadline}

---

## 📋 Bounty Details

### **Description**
${bounty.description}

### **Requirements**
${bounty.requirements.map(req => `- [ ] ${req}`).join('\n')}

### **Acceptance Criteria**
- [ ] All requirements implemented and tested
- [ ] Code follows project style guidelines
- [ ] Documentation updated if necessary
- [ ] Reviewed and approved by maintainers

### **Skills Required**
${bounty.skills.map(skill => `- ${skill}`).join('\n')}

---

## 🏗️ Technical Specifications

### **Repository/Files**
Work will be done in the main repository codebase. Specific files/components to be determined based on approach.

### **Dependencies**
Use existing project dependencies. Request additional dependencies if needed with justification.

### **Testing Requirements**
- Unit tests for new functionality
- Integration tests where applicable
- Manual testing by maintainers

---

## 📚 Learning Objectives
Contributors will learn:
- Advanced Web3 development practices
- DripsNetwork integration patterns
- Decentralized application architecture
- Community-driven development

---

## 🔗 Additional Resources
- Project Documentation: [README.md](https://github.com/akordavid373/decentralized-education/blob/main/README.md)
- Setup Guide: [docs/SETUP.md](https://github.com/akordavid373/decentralized-education/blob/main/docs/SETUP.md)
- DripsNetwork Guide: [docs/DRIPS_SETUP.md](https://github.com/akordavid373/decentralized-education/blob/main/docs/DRIPS_SETUP.md)

---

## 💬 Additional Notes
This bounty is part of our mission to make Web3 education accessible to everyone worldwide. Your contribution will help thousands of learners!

---

## 🎁 How to Apply

1. **Comment below** with your interest and relevant experience
2. **Share your GitHub profile** and portfolio if applicable
3. **Explain your approach** to completing this bounty
4. **Wait for assignment** from the maintainers

### **Application Template**
\`\`\`
**GitHub:** @username
**Experience:** [Brief description of relevant experience]
**Approach:** [How you plan to complete this bounty]
**Timeline:** [Estimated completion time]
**Questions:** [Any questions about the requirements]
\`\`\`

---

## ⚡ Quick Apply Commands

Once assigned, contributors can:
\`\`\`bash
# Clone the repository
git clone https://github.com/akordavid373/decentralized-education.git

# Create feature branch
git checkout -b bounty/[issue-number]-[brief-description]

# Start development
npm run install:all
npm run dev
\`\`\`

---

## 💰 Reward Distribution

Rewards will be distributed via DripsNetwork after successful completion and review.
- **Payment Method**: DripsNetwork ETH stream
- **Timeline**: Within 24 hours of PR merge
- **Tracking**: On-chain transaction records

---

## 🏆 Recognition

- Contributor profile will be updated with reputation points
- Certificate of completion for portfolio
- Featured in project contributors section
- Opportunity for ongoing collaboration

Good luck and happy building! 🚀`
}

function getCategoryCheckbox(category) {
  const categories = {
    'CONTENT_CREATION': '📚 Content Creation',
    'DEVELOPMENT': '💻 Development',
    'DESIGN_UX': '🎨 Design & UX',
    'TRANSLATION': '🌍 Translation',
    'REVIEW': '🔍 Review',
    'MAINTENANCE': '🔧 Maintenance',
    'RESEARCH': '📊 Research',
    'COMMUNITY': '🤝 Community'
  }
  
  return `- [x] ${categories[category] || category}`
}

function getDifficultyCheckbox(difficulty) {
  const difficulties = {
    'BEGINNER': '🌱 Beginner (0.05-0.1 ETH)',
    'INTERMEDIATE': '🚀 Intermediate (0.1-0.3 ETH)',
    'ADVANCED': '⚡ Advanced (0.3-0.5 ETH)',
    'EXPERT': '🏆 Expert (0.5+ ETH)'
  }
  
  return `- [x] ${difficulties[difficulty] || difficulty}`
}

// CLI interface
if (require.main === module) {
  createBountyIssues()
}

module.exports = {
  createBountyIssues,
  bountyIssues
}
