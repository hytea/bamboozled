# Bamboozled AWS Deployment Guide

Complete guide to deploying Bamboozled to AWS with support for both **website** and **Slack bot** using the same backend.

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Setup (one-time)
./deploy.sh setup

# 2. Configure API keys
./deploy.sh secrets

# 3. Build and deploy
./deploy.sh update
```

Your app will be live at the URL shown in the output! 🎉

---

## 📋 Prerequisites

### Required Tools
- **AWS CLI** - [Install](https://aws.amazon.com/cli/)
- **Node.js 20+** - [Install](https://nodejs.org/)
- **Docker** - [Install](https://www.docker.com/)
- **AWS Account** with appropriate permissions

### AWS Permissions Required
Your AWS IAM user/role needs permissions for:
- CloudFormation (create/update/delete stacks)
- ECS (Fargate tasks and services)
- ECR (Docker image repositories)
- EC2 (VPC, security groups, load balancers)
- RDS (PostgreSQL database)
- Secrets Manager (API keys and credentials)
- CloudWatch Logs
- IAM (role creation for services)

### Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter your default output format (json)
```

Verify configuration:
```bash
aws sts get-caller-identity
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Internet                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────┴─────┐
                    │   ALB    │ (Application Load Balancer)
                    │  Port 80 │
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    ┌───┴───┐       ┌────┴────┐      ┌───┴───┐
    │ /api/ │       │   /ws   │      │   /   │
    │       │       │         │      │       │
    └───┬───┘       └────┬────┘      └───┬───┘
        │                │               │
        └────────────────┼───────────────┘
                         │
              ┌──────────┴──────────┐
              │    ECS Fargate      │
              │                     │
              │  ┌───────────────┐  │
              │  │   Frontend    │  │ (Nginx:80)
              │  │   (React)     │  │
              │  └───────────────┘  │
              │          │          │
              │  ┌───────┴───────┐  │
              │  │    Backend    │  │ (Node:3001)
              │  │  (Fastify)    │  │
              │  │               │  │
              │  │ • WebSocket   │  │
              │  │ • REST API    │  │
              │  │ • Slack Bot   │  │ (optional)
              │  └───────┬───────┘  │
              └──────────┼──────────┘
                         │
                ┌────────┴────────┐
                │                 │
         ┌──────┴──────┐   ┌──────┴──────┐
         │     RDS     │   │   Secrets   │
         │ PostgreSQL  │   │   Manager   │
         └─────────────┘   └─────────────┘
```

### Key Components

| Component | Purpose | Cost Estimate |
|-----------|---------|---------------|
| **VPC** | Network isolation across 2 AZs | Free |
| **Application Load Balancer** | Routes traffic to containers | ~$16/month |
| **ECS Fargate** | Runs Docker containers (1 vCPU, 2GB RAM) | ~$30/month |
| **RDS PostgreSQL** | Production database (t4g.micro) | ~$15/month |
| **ECR** | Stores Docker images | ~$1/month |
| **Secrets Manager** | Stores API keys securely | ~$1/month |
| **CloudWatch Logs** | Application logs (7 day retention) | ~$2/month |
| **NAT Gateway** | Outbound internet for containers | ~$30/month |
| **Total** | | **~$95/month** |

> **Cost Optimization Tips:**
> - Use 2 NAT Gateways for HA (recommended for production)
> - Enable RDS Multi-AZ for high availability (+~$15/month)
> - Use Auto Scaling to scale down during low traffic
> - Delete unused ECR images regularly

---

## 🔧 Deployment Steps

### Step 1: First-Time Setup

```bash
./deploy.sh setup
```

This will:
- ✅ Check for required tools (AWS CLI, Node.js, Docker)
- ✅ Install AWS CDK globally
- ✅ Bootstrap CDK in your AWS account (creates S3 bucket for CDK assets)
- ✅ Install infrastructure dependencies

**Note:** Bootstrapping only needs to be done once per AWS account/region.

### Step 2: Configure API Keys

You need API keys for:
- **Anthropic** (Claude) OR **OpenRouter** - Required for AI features
- **Giphy** (optional) - For celebration GIFs
- **Slack** (optional) - If using Slack bot

#### Option A: Interactive Setup (Recommended)
```bash
./deploy.sh secrets
```

#### Option B: Manual Setup
```bash
# Create the secret with all keys at once
aws secretsmanager create-secret \
  --name bamboozled/api-keys \
  --secret-string '{
    "ANTHROPIC_API_KEY": "sk-ant-your-key",
    "OPENROUTER_API_KEY": "sk-or-your-key",
    "GIPHY_API_KEY": "your-giphy-key",
    "SLACK_BOT_TOKEN": "xoxb-your-token",
    "SLACK_SIGNING_SECRET": "your-signing-secret",
    "SLACK_APP_TOKEN": "xapp-your-token"
  }'

# Or update existing secret
aws secretsmanager update-secret \
  --secret-id bamboozled/api-keys \
  --secret-string '{"ANTHROPIC_API_KEY":"sk-ant-new-key"}'
```

#### Get API Keys:
- **Anthropic**: https://console.anthropic.com/
- **OpenRouter**: https://openrouter.ai/keys
- **Giphy**: https://developers.giphy.com/
- **Slack**: https://api.slack.com/apps (see Slack Bot Setup below)

### Step 3: Deploy Infrastructure

```bash
# Deploy CDK stack (creates VPC, RDS, ECS, ALB, etc.)
cd infrastructure
npm install
cdk deploy --all
```

**OR** use the deployment script:
```bash
./deploy.sh deploy
```

This will create:
- VPC with public/private/database subnets
- RDS PostgreSQL database
- ECS Fargate cluster
- Application Load Balancer
- Security groups and IAM roles
- ECR repositories for Docker images

**Time:** ~15-20 minutes

### Step 4: Build and Push Docker Images

```bash
./deploy.sh build
```

This will:
- Build backend Docker image
- Build frontend Docker image
- Push both images to ECR

**Time:** ~5 minutes

### Step 5: Trigger Deployment

After images are pushed, ECS will automatically:
- Pull the latest images from ECR
- Start new tasks
- Perform rolling update (zero downtime)

**Time:** ~3-5 minutes

### Step 6: Access Your Website

```bash
# Get the website URL
aws cloudformation describe-stacks \
  --stack-name BamboozledStack \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" \
  --output text
```

**OR**
```bash
./deploy.sh status
```

Open the URL in your browser! 🎉

---

## 🔄 Updating Your Deployment

### Update Application Code

```bash
# Build new images and deploy
./deploy.sh update
```

This performs:
1. Build latest Docker images
2. Push to ECR
3. ECS automatically picks up new images
4. Rolling update (zero downtime)

### Update Infrastructure

```bash
cd infrastructure
cdk diff  # Preview changes
cdk deploy --all  # Apply changes
```

### Update Environment Variables

Edit `infrastructure/lib/bamboozled-stack.ts` and modify the `environment` section:

```typescript
environment: {
  NODE_ENV: 'production',
  AI_PROVIDER: 'claude', // or 'openrouter'
  ENABLE_SLACK: 'true',  // or 'false'
},
```

Then redeploy:
```bash
cd infrastructure
cdk deploy
```

---

## 🤖 Slack Bot Setup

### Prerequisites
- Slack workspace with admin access
- Bamboozled deployed to AWS

### Step 1: Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: `Bamboozled`
4. Select your workspace

### Step 2: Configure OAuth Scopes
Under **OAuth & Permissions**, add these scopes:
- `chat:write` - Send messages
- `commands` - Handle slash commands
- `files:write` - Send puzzle images
- `im:history` - Read DM messages
- `im:write` - Send DMs
- `users:read` - Get user info

### Step 3: Create Slash Commands
Under **Slash Commands**, create these:

| Command | Request URL | Description |
|---------|-------------|-------------|
| `/puzzle` | (your-alb-url)/api/slack/commands | View current puzzle |
| `/leaderboard` | (your-alb-url)/api/slack/commands | Weekly rankings |
| `/stats` | (your-alb-url)/api/slack/commands | Your statistics |
| `/alltime` | (your-alb-url)/api/slack/commands | All-time leaderboard |
| `/botmood` | (your-alb-url)/api/slack/commands | Check bot's mood |
| `/help` | (your-alb-url)/api/slack/commands | Help message |

### Step 4: Enable Socket Mode (Recommended for Development)
1. Go to **Socket Mode** → Enable
2. Create an App-Level Token with `connections:write` scope
3. Copy the token (starts with `xapp-`)

### Step 5: Enable Events
1. Go to **Event Subscriptions** → Enable
2. Request URL: Leave blank if using Socket Mode
3. Subscribe to bot events:
   - `message.im` - Direct messages

### Step 6: Install App to Workspace
1. Go to **Install App**
2. Click "Install to Workspace"
3. Authorize the app
4. Copy **Bot User OAuth Token** (starts with `xoxb-`)
5. Copy **Signing Secret** from **Basic Information**

### Step 7: Update AWS Secrets
```bash
aws secretsmanager update-secret \
  --secret-id bamboozled/api-keys \
  --secret-string '{
    "SLACK_BOT_TOKEN": "xoxb-your-token",
    "SLACK_SIGNING_SECRET": "your-signing-secret",
    "SLACK_APP_TOKEN": "xapp-your-token"
  }'
```

### Step 8: Enable Slack in Deployment
Edit `infrastructure/lib/bamboozled-stack.ts`:
```typescript
environment: {
  ENABLE_SLACK: 'true',
},
```

Redeploy:
```bash
./deploy.sh deploy
```

### Step 9: Test Slack Bot
In Slack:
1. Send a DM to your Bamboozled bot
2. Type `/puzzle` to see the current puzzle
3. Type your guess to submit an answer

---

## 📊 Monitoring & Logs

### View Logs
```bash
# Real-time logs
./deploy.sh logs

# Or use AWS CLI
aws logs tail /aws/ecs/bamboozled-cluster/backend --follow
aws logs tail /aws/ecs/bamboozled-cluster/frontend --follow
```

### CloudWatch Dashboard
Go to CloudWatch Console:
- **Metrics** → **ECS** → View CPU/Memory utilization
- **Logs** → **Log Groups** → View application logs

### Check Service Health
```bash
# Quick status check
./deploy.sh status

# Detailed service info
aws ecs describe-services \
  --cluster bamboozled-cluster \
  --services <service-name>
```

### Database Access
```bash
# Get database credentials
aws secretsmanager get-secret-value \
  --secret-id bamboozled/db-credentials \
  --query SecretString \
  --output text

# Connect via bastion host or AWS Systems Manager Session Manager
```

---

## 🔒 Security Best Practices

### 1. Secrets Management
- ✅ All secrets stored in AWS Secrets Manager (encrypted)
- ✅ No secrets in environment variables or code
- ✅ IAM role-based access only

### 2. Network Security
- ✅ Database in isolated subnets (no internet access)
- ✅ Application in private subnets
- ✅ Only ALB exposed to internet
- ✅ Security groups restrict traffic

### 3. SSL/TLS (Recommended for Production)
To enable HTTPS:
1. Get a domain name (e.g., from Route 53)
2. Request SSL certificate from ACM
3. Update ALB listener to use HTTPS (port 443)
4. Redirect HTTP to HTTPS

```typescript
// Add to bamboozled-stack.ts
const certificate = acm.Certificate.fromCertificateArn(
  this,
  'Certificate',
  'arn:aws:acm:us-east-1:123456789:certificate/...'
);

const httpsListener = alb.addListener('HTTPSListener', {
  port: 443,
  protocol: elbv2.ApplicationProtocol.HTTPS,
  certificates: [certificate],
});
```

### 4. Database Backups
- ✅ Automated backups enabled (7 days retention)
- ✅ Snapshots before deletion
- ✅ Deletion protection enabled

### 5. Container Security
- ✅ Images scanned for vulnerabilities on push
- ✅ Non-root user in containers
- ✅ Read-only root filesystem (where possible)

---

## 🐛 Troubleshooting

### Deployment fails with "No space left on device"
**Solution:** Clean up Docker images locally
```bash
docker system prune -a
```

### ECS tasks fail to start
**Check:**
1. View logs: `./deploy.sh logs`
2. Check task definition has correct environment variables
3. Verify secrets exist in Secrets Manager
4. Check security group allows outbound internet (for pulling images)

### Database connection errors
**Check:**
1. Security group allows ECS tasks to reach RDS (port 5432)
2. Database credentials secret exists
3. Environment variables correctly reference secret

### Website shows 503 Service Unavailable
**Check:**
1. ECS tasks are running: `./deploy.sh status`
2. Health checks passing: Check target group health in ALB console
3. Security groups allow ALB → ECS traffic

### Cannot push to ECR
**Solution:**
```bash
# Re-authenticate
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### High costs
**Optimization:**
1. Reduce NAT Gateways from 2 to 1 (dev/testing only)
2. Use smaller RDS instance (t4g.micro)
3. Reduce ECS task count during low traffic
4. Set CloudWatch Logs retention to 3-7 days

---

## 💰 Cost Management

### Monitor Costs
```bash
# Get cost estimate for last month
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-02-01 \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

### Set Up Billing Alerts
1. Go to AWS Budgets console
2. Create budget for $100/month
3. Set alerts at 80% and 100%

### Clean Up Test Deployments
```bash
./deploy.sh destroy
```

---

## 🎯 Production Checklist

Before going live:

### Infrastructure
- [ ] Enable RDS Multi-AZ for high availability
- [ ] Use 2 NAT Gateways (one per AZ)
- [ ] Configure custom domain with Route 53
- [ ] Enable SSL/TLS with ACM certificate
- [ ] Set up CloudWatch alarms for critical metrics
- [ ] Configure auto-scaling based on traffic patterns
- [ ] Enable AWS CloudTrail for audit logging

### Security
- [ ] Review IAM roles and policies
- [ ] Enable AWS GuardDuty for threat detection
- [ ] Set up AWS WAF rules if needed
- [ ] Rotate secrets regularly
- [ ] Enable VPC Flow Logs
- [ ] Configure MFA for AWS account

### Application
- [ ] Update CORS origins to production domain
- [ ] Set NODE_ENV=production
- [ ] Configure proper log levels (warn/error)
- [ ] Test all features (web + Slack bot)
- [ ] Verify database migrations
- [ ] Load test with expected traffic

### Monitoring
- [ ] Set up CloudWatch Dashboard
- [ ] Configure alerts for errors/high latency
- [ ] Set up SNS topic for notifications
- [ ] Configure dead letter queues for failed tasks
- [ ] Enable X-Ray for distributed tracing

---

## 🆘 Support

### Useful AWS Console Links
- **CloudFormation**: View stack status and resources
- **ECS**: Monitor tasks and services
- **CloudWatch**: View logs and metrics
- **Secrets Manager**: Manage API keys
- **RDS**: Database management
- **ECR**: Docker image repositories

### Useful Commands
```bash
# View all stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Force new deployment (without code changes)
aws ecs update-service \
  --cluster bamboozled-cluster \
  --service <service-name> \
  --force-new-deployment

# Execute command in running container
aws ecs execute-command \
  --cluster bamboozled-cluster \
  --task <task-id> \
  --container Backend \
  --command "/bin/bash" \
  --interactive
```

---

## 📝 Next Steps

1. **Custom Domain**: Set up Route 53 and SSL certificate
2. **CI/CD**: Integrate with GitHub Actions for automatic deployments
3. **Monitoring**: Set up detailed CloudWatch dashboards
4. **Backups**: Configure automated database backups to S3
5. **CDN**: Add CloudFront for faster global access

---

## 🎉 You're Done!

Your Bamboozled app is now running on AWS with:
- ✅ Scalable infrastructure (ECS Fargate)
- ✅ Production database (RDS PostgreSQL)
- ✅ Load balancing (ALB)
- ✅ Secure secrets management
- ✅ Website AND Slack bot support
- ✅ Auto-scaling and health monitoring

Enjoy your puzzle game! 🧩
