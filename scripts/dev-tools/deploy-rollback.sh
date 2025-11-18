#!/bin/bash
#
# Deployment Rollback Script
# Rolls back to previous deployment version

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

STACK_NAME="${STACK_NAME:-BamboozledStack}"

echo ""
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  ⚠️  DEPLOYMENT ROLLBACK ⚠️${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    error "AWS CLI not found"
    info "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
info "Checking AWS credentials..."
if ! aws sts get-caller-identity &>/dev/null; then
    error "AWS credentials not configured"
    info "Run: aws configure"
    exit 1
fi

success "AWS credentials valid"
echo ""

# Get current stack status
info "Fetching current deployment status..."
echo ""

current_status=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$current_status" = "NOT_FOUND" ]; then
    error "Stack '$STACK_NAME' not found"
    info "No deployment to rollback"
    exit 1
fi

info "Current stack status: $current_status"

# Get stack events to find previous successful deployment
info "Analyzing deployment history..."
echo ""

aws cloudformation describe-stack-events \
    --stack-name "$STACK_NAME" \
    --max-items 50 \
    --query 'StackEvents[?ResourceStatus==`UPDATE_COMPLETE` && ResourceType==`AWS::CloudFormation::Stack`].[Timestamp,ResourceStatusReason]' \
    --output table

echo ""

# Docker rollback option
echo -e "${BLUE}Rollback Options:${NC}"
echo ""
echo "1. Rollback CDK stack to previous version"
echo "2. Rollback Docker images to previous tag"
echo "3. Cancel rollback"
echo ""
read -p "Select option (1-3): " rollback_option

case $rollback_option in
    1)
        # CDK Stack Rollback
        warning "CDK does not support automatic rollback"
        echo ""
        info "To rollback CDK stack, you need to:"
        echo "  1. Check out the previous commit:"
        echo "     git log --oneline"
        echo "     git checkout <previous-commit>"
        echo ""
        echo "  2. Redeploy the previous version:"
        echo "     ./deploy.sh deploy"
        echo ""
        warning "This is a manual process to ensure data safety"
        ;;

    2)
        # Docker Image Rollback
        echo ""
        info "Fetching available Docker image tags from ECR..."

        # Get ECR repository URLs
        backend_repo=$(aws ecr describe-repositories --query 'repositories[?repositoryName==`bamboozled-backend`].repositoryUri' --output text 2>/dev/null || echo "")
        frontend_repo=$(aws ecr describe-repositories --query 'repositories[?repositoryName==`bamboozled-frontend`].repositoryUri' --output text 2>/dev/null || echo "")

        if [ -z "$backend_repo" ] || [ -z "$frontend_repo" ]; then
            warning "ECR repositories not found"
            info "Rollback via Docker images requires ECR setup"
            exit 1
        fi

        echo ""
        echo -e "${BLUE}Backend Images:${NC}"
        aws ecr list-images --repository-name bamboozled-backend --query 'imageIds[*].imageTag' --output table

        echo ""
        echo -e "${BLUE}Frontend Images:${NC}"
        aws ecr list-images --repository-name bamboozled-frontend --query 'imageIds[*].imageTag' --output table

        echo ""
        read -p "Enter backend image tag to rollback to: " backend_tag
        read -p "Enter frontend image tag to rollback to: " frontend_tag

        echo ""
        warning "Rolling back to:"
        info "Backend: $backend_tag"
        info "Frontend: $frontend_tag"
        echo ""

        read -p "Proceed with rollback? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            warning "Rollback cancelled"
            exit 0
        fi

        # Update ECS service with previous image tags
        info "Updating ECS services..."

        # Get ECS cluster and services
        cluster_name=$(aws ecs list-clusters --query 'clusterArns[0]' --output text 2>/dev/null | awk -F'/' '{print $NF}')

        if [ -z "$cluster_name" ]; then
            error "ECS cluster not found"
            exit 1
        fi

        # Note: This is a simplified version. In practice, you'd need to update task definitions
        warning "Image tag rollback requires updating ECS task definitions"
        info "This is typically done through infrastructure code (CDK)"
        echo ""
        info "Recommended approach:"
        echo "  1. Update infrastructure/lib/stack.ts with previous image tags"
        echo "  2. Run: cd infrastructure && npm run cdk deploy"
        ;;

    3)
        warning "Rollback cancelled"
        exit 0
        ;;

    *)
        error "Invalid option"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
info "Rollback process information displayed above"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Offer to run deployment verification after rollback
read -p "Would you like to verify the deployment? (y/n): " verify
if [[ $verify =~ ^[Yy]$ ]]; then
    ./scripts/dev-tools/deploy-verify.sh
fi
