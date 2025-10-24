#!/bin/bash

# GCP Cloud Run Deployment Script
# This script builds and deploys the application to Google Cloud Run

set -e

# Configuration
PROJECT_ID="put-your-gcp-project-id-here"  # Change this to your GCP project ID
REGION="asia-southeast1"  # Singapore region, change as needed

# Environment and Account selection
ENVIRONMENT=${1:-production}  # Default to production if not specified
ACCOUNT=${2:-""}  # Account suffix (acc1, acc2, acc3)

# Build service name based on environment and account
if [ "$ENVIRONMENT" = "production" ]; then
    SERVICE_NAME="perps-vibe-ai-production"
    ENV_FILE=".env"
elif [ "$ENVIRONMENT" = "staging" ]; then
    if [ -z "$ACCOUNT" ]; then
        echo "Usage: $0 staging [acc1|acc2|acc3]"
        echo "Example: $0 staging acc1"
        echo ""
        echo "Available staging accounts:"
        echo "  - acc1: 0xaC00F8BF465f863c0eeD01185F8A0D400ae632dA"
        echo "  - acc2: 0xe2d3C51d70093cb2E1C7B16b7Ed10C2EB630AF1a"
        echo "  - 8659:     0x7AFabDfBeaaFB461Df17E33d6A3E61D83Fed8659"
        exit 1
    fi
    
    SERVICE_NAME="perps-vibe-ai-staging-${ACCOUNT}"
    ENV_FILE=".env.staging.${ACCOUNT}"
else
    echo "Usage: $0 [production|staging] [account]"
    echo "Examples:"
    echo "  $0 production"
    echo "  $0 staging acc1"
    exit 1
fi

IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file ${ENV_FILE} not found${NC}"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment to Google Cloud Run${NC}"
echo -e "${BLUE}📍 Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}📦 Service: ${SERVICE_NAME}${NC}"
echo -e "${BLUE}📄 Using env file: ${ENV_FILE}${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Prompt for project ID if not set
if [ "$PROJECT_ID" != "" ]; then
    echo -e "${YELLOW}⚠️  Please enter your GCP Project ID:${NC}"
    read -r PROJECT_ID
    IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
fi

# Set the project
echo -e "${GREEN}📦 Setting GCP project: ${PROJECT_ID}${NC}"
gcloud config set project "${PROJECT_ID}"

# Enable required APIs
echo -e "${GREEN}🔧 Enabling required GCP APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com

# Build the container image
echo -e "${GREEN}🔨 Building Docker image...${NC}"
gcloud builds submit --tag "${IMAGE_NAME}"

# Prepare environment variables
echo -e "${GREEN}🔧 Preparing environment variables...${NC}"

# Read all env vars from the environment-specific file
ENV_VARS=$(grep -v '^#' "$ENV_FILE" | grep -v '^$' | grep -v '^PORT=' | xargs | sed 's/ /,/g')

# Add ENVIRONMENT variable
if [ -n "$ENV_VARS" ]; then
    ENV_VARS="${ENV_VARS},ENVIRONMENT=${ENVIRONMENT}"
else
    ENV_VARS="ENVIRONMENT=${ENVIRONMENT}"
fi

# Deploy to Cloud Run
echo -e "${GREEN}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy "${SERVICE_NAME}" \
    --image="${IMAGE_NAME}" \
    --region="${REGION}" \
    --platform=managed \
    --port=8080 \
    --allow-unauthenticated \
    --min-instances=1 \
    --max-instances=1 \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300 \
    --set-env-vars="${ENV_VARS}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --region="${REGION}" \
    --format='value(status.url)')

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
echo -e "${GREEN}📚 Swagger docs: ${SERVICE_URL}/api${NC}"
echo -e "${BLUE}🏷️  Environment: ${ENVIRONMENT}${NC}"
if [ -n "$ACCOUNT" ]; then
    echo -e "${BLUE}👤 Account: ${ACCOUNT}${NC}"
fi
echo ""
echo -e "${YELLOW}💡 Deployment Commands:${NC}"
echo -e "   Production:"
echo -e "   - ./scripts/deploy-cloudrun.sh production"
echo ""
echo -e "   Staging (choose account):"
echo -e "   - ./scripts/deploy-cloudrun.sh staging acc1"
echo -e "   - ./scripts/deploy-cloudrun.sh staging acc2"
echo -e "   - ./scripts/deploy-cloudrun.sh staging acc3"
echo ""
echo -e "${YELLOW}💡 Management Commands:${NC}"
echo -e "   - View logs: gcloud run services logs tail ${SERVICE_NAME} --region=${REGION}"
echo -e "   - Delete service: gcloud run services delete ${SERVICE_NAME} --region=${REGION}"

