#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# File to check
ENV_FILE=".env"

echo "🔍 Verificando variáveis de ambiente do Stripe em $ENV_FILE..."

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Arquivo $ENV_FILE não encontrado!${NC}"
    exit 1
fi

# Load variables from .env to checks (handling potential comments or empty lines)
# We don't source it to avoid executing arbitrary code, just grep/parsing
# Actually, sourcing is the standard way to verify what the app sees, but let's just check existence of keys and non-empty values.

# Function to check a variable
check_var() {
    local var_name=$1
    local description=$2
    
    # Get value using grep and cut. 
    # Logic: Look for line starting with VAR_NAME=, extract part after =, remove quotes if any.
    local value=$(grep "^$var_name=" "$ENV_FILE" | cut -d '=' -f2- | sed 's/^"//;s/"$//')
    
    if [ -z "$value" ]; then
        echo -e "${RED}❌ $var_name${NC} está vazia ou ausente."
        echo -e "   ↳ ${YELLOW}Onde encontrar:${NC} $description"
        return 1
    else
        # Basic validation masking the value
        local masked_value="${value:0:4}****${value: -4}"
        echo -e "${GREEN}✅ $var_name${NC} encontrada. ($masked_value)"
        return 0
    fi
}

echo "---------------------------------------------------"

# Check standard keys
check_var "STRIPE_SECRET_KEY" "Dashboard > Developers > API keys > Secret key (começa com sk_)"
check_var "STRIPE_WEBHOOK_SECRET" "Dashboard > Developers > Webhooks > Signing secret (começa com whsec_)"
check_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "Dashboard > Developers > API keys > Publishable key (começa com pk_)"

echo "---------------------------------------------------"
echo "📦 IDs de Preços (Produtos)"

# Check Price IDs
check_var "STRIPE_PRO_PRICE_ID" "Dashboard > Product Catalog > Produto Pro > Preço > API ID"
check_var "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID" "Deve ser igual ao STRIPE_PRO_PRICE_ID"
check_var "STRIPE_ENTERPRISE_PRICE_ID" "Dashboard > Product Catalog > Produto Enterprise > Preço > API ID"
check_var "NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID" "Deve ser igual ao STRIPE_ENTERPRISE_PRICE_ID"

echo "---------------------------------------------------"

# Verify consistency between Server and Client vars for Price IDs
# We need to source the file for this comparison to be accurate with variable expansion
set -a
source "$ENV_FILE"
set +a

echo "🔄 Verificando consistência..."

if [ "$STRIPE_PRO_PRICE_ID" != "$NEXT_PUBLIC_STRIPE_PRO_PRICE_ID" ]; then
    echo -e "${YELLOW}⚠️  Aviso: STRIPE_PRO_PRICE_ID e NEXT_PUBLIC_STRIPE_PRO_PRICE_ID são diferentes.${NC}"
else
     echo -e "${GREEN}✅ IDs do plano Pro coincidem.${NC}"
fi

if [ "$STRIPE_ENTERPRISE_PRICE_ID" != "$NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID" ]; then
    echo -e "${YELLOW}⚠️  Aviso: STRIPE_ENTERPRISE_PRICE_ID e NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID são diferentes.${NC}"
else
     echo -e "${GREEN}✅ IDs do plano Enterprise coincidem.${NC}"
fi

echo "---------------------------------------------------"
echo "🏁 Verificação concluída."
