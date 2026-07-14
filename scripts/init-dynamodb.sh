#!/bin/bash
# ============================================
# Billow — Initialize Local DynamoDB Tables
# ============================================
# Run this after `docker compose up dynamodb-local`
# Usage: ./scripts/init-dynamodb.sh

ENDPOINT="http://localhost:8000"
REGION="us-east-1"

echo "🌊 Billow — Initializing DynamoDB tables..."
echo ""

# Wait for DynamoDB Local to be ready
echo "⏳ Waiting for DynamoDB Local..."
for i in $(seq 1 30); do
  if aws dynamodb list-tables --endpoint-url $ENDPOINT --region $REGION 2>/dev/null | grep -q 'TableNames'; then
    echo "✅ DynamoDB Local is ready!"
    break
  fi
  sleep 1
  if [ $i -eq 30 ]; then
    echo "❌ Timeout waiting for DynamoDB Local"
    exit 1
  fi
done

# Create BillowCosts table
echo ""
echo "📊 Creating BillowCosts table..."
aws dynamodb create-table \
  --endpoint-url $ENDPOINT \
  --region $REGION \
  --table-name BillowCosts \
  --attribute-definitions \
    AttributeName=date,AttributeType=S \
    AttributeName=collectedAt,AttributeType=S \
  --key-schema \
    AttributeName=date,KeyType=HASH \
    AttributeName=collectedAt,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null && echo "✅ BillowCosts table created" || echo "ℹ️  BillowCosts table already exists"

# Create BillowBudget table
echo ""
echo "💰 Creating BillowBudget table..."
aws dynamodb create-table \
  --endpoint-url $ENDPOINT \
  --region $REGION \
  --table-name BillowBudget \
  --attribute-definitions \
    AttributeName=configId,AttributeType=S \
  --key-schema \
    AttributeName=configId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null && echo "✅ BillowBudget table created" || echo "ℹ️  BillowBudget table already exists"

echo ""
echo "🎉 DynamoDB initialization complete!"
echo "   View tables at: http://localhost:8001 (DynamoDB Admin)"
