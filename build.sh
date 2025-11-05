#!/bin/bash
set -e

# Color output for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function that always interprets colors
colorecho() {
    echo -e "$@"
}

colorecho "${YELLOW}🧹 Cleaning generated files...${NC}"
rm -rf public/ resources/

colorecho "${YELLOW}📝 Processing TEI with EditionCrafter...${NC}"
mkdir -p public/edition/st-brendan

if [ "$1" == "production" ]; then
    colorecho "${YELLOW}   Processing for production (GitHub Pages)...${NC}"
    if ! editioncrafter process -i ./st-brendan.xml -o ./public/edition -u /edition; then
        colorecho "${RED}❌ EditionCrafter processing failed!${NC}"
        exit 1
    fi
else
    colorecho "${YELLOW}   Processing for local development...${NC}"
    if ! editioncrafter process -i ./st-brendan.xml -o ./public/edition -u /st-brendan/edition; then
        colorecho "${RED}❌ EditionCrafter processing failed!${NC}"
        exit 1
    fi
fi

colorecho "${GREEN}✓ EditionCrafter processing complete${NC}"

colorecho "${YELLOW}🏗️  Building Hugo site...${NC}"
if [ "$1" == "production" ]; then
    colorecho "${YELLOW}   Building for production (GitHub Pages)...${NC}"
    if ! hugo --minify --environment production; then
        colorecho "${RED}❌ Hugo build failed!${NC}"
        exit 1
    fi
else
    colorecho "${YELLOW}   Building for local development...${NC}"

    if ! hugo --minify --environment development; then
        colorecho "${RED}❌ Hugo build failed!${NC}"
        exit 1
    fi

    # Copy for local server structure
    colorecho "${YELLOW}   Copying files for local server structure...${NC}"
    mkdir -p public/st-brendan/edition
    cp -r public/edition public/st-brendan/
fi

colorecho "${GREEN}✅ Build complete!${NC}"
colorecho ""

if [ "$1" != "production" ]; then
    colorecho "To serve locally, run:"
    colorecho "  ${YELLOW}hugo server -D --environment development -p 8000${NC}"
    colorecho ""
    colorecho "Then open: ${YELLOW}http://localhost:8000/edition/${NC}"
fi