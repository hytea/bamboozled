#!/bin/bash

# ============================================
# Bamboozled Deployment Script
# ============================================
# This script makes deploying to AWS super simple!
#
# Usage:
#   ./deploy.sh setup      - First time setup (install CDK, configure AWS)
#   ./deploy.sh build      - Build and push Docker images to ECR
#   ./deploy.sh deploy     - Deploy infrastructure to AWS
#   ./deploy.sh update     - Build + Deploy (full update)
#   ./deploy.sh destroy    - Destroy all AWS resources
#   ./deploy.sh logs       - View application logs
#   ./deploy.sh status     - Check deployment status
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install: https://aws.amazon.com/cli/"
        exit 1
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install: https://nodejs.org/"
        exit 1
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install: https://www.docker.com/"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run: aws configure"
        exit 1
    fi

    log_success "All prerequisites met!"
}

setup() {
    log_info "Setting up Bamboozled deployment..."

    check_prerequisites

    # Install CDK globally if not present
    if ! command -v cdk &> /dev/null; then
        log_info "Installing AWS CDK..."
        npm install -g aws-cdk
    fi

    # Install infrastructure dependencies
    log_info "Installing infrastructure dependencies..."
    cd infrastructure
    npm install
    cd ..

    # Bootstrap CDK (only needed once per AWS account/region)
    log_info "Bootstrapping CDK (this may take a few minutes)..."
    cd infrastructure
    cdk bootstrap
    cd ..

    log_success "Setup complete!"
    log_info "Next steps:"
    log_info "  1. Update API keys: aws secretsmanager update-secret --secret-id bamboozled/api-keys --secret-string '{...}'"
    log_info "  2. Build images: ./deploy.sh build"
    log_info "  3. Deploy: ./deploy.sh deploy"
}

build_images() {
    log_info "Building and pushing Docker images to ECR..."

    # Get AWS account ID and region
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region || echo "us-east-1")

    log_info "AWS Account: $AWS_ACCOUNT_ID"
    log_info "AWS Region: $AWS_REGION"

    # Get ECR repository URIs from CDK outputs
    BACKEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/bamboozled-backend"
    FRONTEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/bamboozled-frontend"

    # Login to ECR
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

    # Build backend image
    log_info "Building backend image..."
    docker build -t bamboozled-backend:latest -f backend/Dockerfile backend/
    docker tag bamboozled-backend:latest ${BACKEND_REPO}:latest

    log_info "Pushing backend image to ECR..."
    docker push ${BACKEND_REPO}:latest

    # Build frontend image
    log_info "Building frontend image..."
    docker build -t bamboozled-frontend:latest -f web-chat/Dockerfile web-chat/
    docker tag bamboozled-frontend:latest ${FRONTEND_REPO}:latest

    log_info "Pushing frontend image to ECR..."
    docker push ${FRONTEND_REPO}:latest

    log_success "Images built and pushed successfully!"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure to AWS..."

    cd infrastructure

    # Deploy the CDK stack
    cdk deploy --all --require-approval never

    cd ..

    log_success "Deployment complete!"

    # Get the website URL
    WEBSITE_URL=$(aws cloudformation describe-stacks --stack-name BamboozledStack --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" --output text 2>/dev/null || echo "Not available yet")

    if [ "$WEBSITE_URL" != "Not available yet" ]; then
        log_success "🎉 Your Bamboozled website is live at: $WEBSITE_URL"
    fi
}

update_secrets() {
    log_info "Updating API keys in AWS Secrets Manager..."

    # Interactive prompts for API keys
    read -p "Enter Anthropic API Key (or press Enter to skip): " ANTHROPIC_KEY
    read -p "Enter OpenRouter API Key (or press Enter to skip): " OPENROUTER_KEY
    read -p "Enter Giphy API Key (or press Enter to skip): " GIPHY_KEY
    read -p "Enter Slack Bot Token (or press Enter to skip): " SLACK_BOT_TOKEN
    read -p "Enter Slack Signing Secret (or press Enter to skip): " SLACK_SIGNING_SECRET
    read -p "Enter Slack App Token (or press Enter to skip): " SLACK_APP_TOKEN

    # Build JSON
    SECRET_JSON="{"
    [ -n "$ANTHROPIC_KEY" ] && SECRET_JSON+="\"ANTHROPIC_API_KEY\":\"$ANTHROPIC_KEY\","
    [ -n "$OPENROUTER_KEY" ] && SECRET_JSON+="\"OPENROUTER_API_KEY\":\"$OPENROUTER_KEY\","
    [ -n "$GIPHY_KEY" ] && SECRET_JSON+="\"GIPHY_API_KEY\":\"$GIPHY_KEY\","
    [ -n "$SLACK_BOT_TOKEN" ] && SECRET_JSON+="\"SLACK_BOT_TOKEN\":\"$SLACK_BOT_TOKEN\","
    [ -n "$SLACK_SIGNING_SECRET" ] && SECRET_JSON+="\"SLACK_SIGNING_SECRET\":\"$SLACK_SIGNING_SECRET\","
    [ -n "$SLACK_APP_TOKEN" ] && SECRET_JSON+="\"SLACK_APP_TOKEN\":\"$SLACK_APP_TOKEN\","
    SECRET_JSON="${SECRET_JSON%,}}"  # Remove trailing comma

    if [ "$SECRET_JSON" != "{}" ]; then
        aws secretsmanager update-secret \
            --secret-id bamboozled/api-keys \
            --secret-string "$SECRET_JSON"

        log_success "API keys updated successfully!"
        log_warning "You may need to restart the ECS service for changes to take effect."
    else
        log_warning "No API keys provided. Skipping update."
    fi
}

view_logs() {
    log_info "Fetching recent logs from CloudWatch..."

    # Get log group names
    BACKEND_LOG_GROUP="/aws/ecs/bamboozled-cluster/backend"
    FRONTEND_LOG_GROUP="/aws/ecs/bamboozled-cluster/frontend"

    echo ""
    log_info "Backend logs:"
    aws logs tail $BACKEND_LOG_GROUP --follow --since 10m 2>/dev/null || log_warning "No backend logs available yet"

    echo ""
    log_info "Frontend logs:"
    aws logs tail $FRONTEND_LOG_GROUP --follow --since 10m 2>/dev/null || log_warning "No frontend logs available yet"
}

check_status() {
    log_info "Checking deployment status..."

    # Check CloudFormation stack
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name BamboozledStack --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "NOT_DEPLOYED")

    log_info "Stack Status: $STACK_STATUS"

    if [ "$STACK_STATUS" = "CREATE_COMPLETE" ] || [ "$STACK_STATUS" = "UPDATE_COMPLETE" ]; then
        # Get service status
        CLUSTER_NAME=$(aws cloudformation describe-stacks --stack-name BamboozledStack --query "Stacks[0].Outputs[?OutputKey=='ClusterName'].OutputValue" --output text)
        SERVICE_NAME=$(aws cloudformation describe-stacks --stack-name BamboozledStack --query "Stacks[0].Outputs[?OutputKey=='ServiceName'].OutputValue" --output text)

        if [ -n "$CLUSTER_NAME" ] && [ -n "$SERVICE_NAME" ]; then
            RUNNING_TASKS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query "services[0].runningCount" --output text)
            DESIRED_TASKS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query "services[0].desiredCount" --output text)

            log_info "ECS Service: $RUNNING_TASKS / $DESIRED_TASKS tasks running"

            # Get website URL
            WEBSITE_URL=$(aws cloudformation describe-stacks --stack-name BamboozledStack --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" --output text)
            log_success "Website URL: $WEBSITE_URL"
        fi
    else
        log_warning "Stack is not in a healthy state. Status: $STACK_STATUS"
    fi
}

destroy() {
    log_warning "This will destroy all AWS resources created by Bamboozled!"
    read -p "Are you sure? Type 'yes' to confirm: " CONFIRM

    if [ "$CONFIRM" = "yes" ]; then
        log_info "Destroying infrastructure..."
        cd infrastructure
        cdk destroy --all --force
        cd ..
        log_success "Infrastructure destroyed!"
    else
        log_info "Destruction cancelled."
    fi
}

# Main script
case "$1" in
    setup)
        setup
        ;;
    build)
        check_prerequisites
        build_images
        ;;
    deploy)
        check_prerequisites
        deploy_infrastructure
        ;;
    update)
        check_prerequisites
        build_images
        deploy_infrastructure
        ;;
    secrets)
        check_prerequisites
        update_secrets
        ;;
    logs)
        check_prerequisites
        view_logs
        ;;
    status)
        check_prerequisites
        check_status
        ;;
    destroy)
        check_prerequisites
        destroy
        ;;
    *)
        echo "Bamboozled Deployment Script"
        echo ""
        echo "Usage: $0 {setup|build|deploy|update|secrets|logs|status|destroy}"
        echo ""
        echo "Commands:"
        echo "  setup    - First time setup (install CDK, configure AWS)"
        echo "  build    - Build and push Docker images to ECR"
        echo "  deploy   - Deploy infrastructure to AWS"
        echo "  update   - Build + Deploy (full update)"
        echo "  secrets  - Update API keys in AWS Secrets Manager"
        echo "  logs     - View application logs"
        echo "  status   - Check deployment status"
        echo "  destroy  - Destroy all AWS resources"
        echo ""
        exit 1
        ;;
esac
