#!/bin/bash

# GCP Cloud Run Deployment Script
# This script builds and deploys the application to Google Cloud Run

set -e

# Configuration
PROJECT_ID="put-your-gcp-project-id-here"  # Change this to your GCP project ID
SERVICE_NAME="perps-vibe-ai"
REGION="asia-southeast1"  # Singapore region, change as needed
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment to Google Cloud Run${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
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
    --set-env-vars="$(grep -v '^#' .env | grep -v '^$' | grep -v '^PORT=' | xargs | sed 's/ /,/g')"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --region="${REGION}" \
    --format='value(status.url)')

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
echo -e "${GREEN}📚 Swagger docs: ${SERVICE_URL}/api${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "   - View logs: gcloud run services logs tail ${SERVICE_NAME} --region=${REGION}"
echo -e "   - Update service: ./scripts/deploy-cloudrun.sh"
echo -e "   - Delete service: gcloud run services delete ${SERVICE_NAME} --region=${REGION}"
