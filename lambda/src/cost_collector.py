"""
Billow Cost Collector — AWS Lambda Function
============================================
This function runs on a schedule (every 6 hours via EventBridge)
to collect AWS cost data from the Cost Explorer API and store it
in DynamoDB for the Billow dashboard to display.

How it works:
1. Query AWS Cost Explorer for today's costs, broken down by service
2. Query month-to-date cumulative costs
3. Calculate a simple forecast for end-of-month spending
4. Store the results in DynamoDB

Required IAM Permissions:
- ce:GetCostAndUsage (Cost Explorer)
- dynamodb:PutItem (DynamoDB)

Environment Variables:
- DYNAMODB_TABLE: Name of the DynamoDB table to write to
- AWS_REGION: AWS region (defaults to us-east-1)
"""

import boto3
import json
import os
import logging
from datetime import datetime, timedelta
from decimal import Decimal

# Set up logging — Lambda automatically sends logs to CloudWatch
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
# boto3 automatically uses the Lambda execution role's credentials
ce_client = boto3.client('ce')  # Cost Explorer
dynamodb = boto3.resource('dynamodb')


def handler(event, context):
    """
    Lambda entry point. Called by EventBridge on a schedule.
    
    Args:
        event: The EventBridge event (we don't use it, but it's required)
        context: Lambda context with metadata like remaining time
    
    Returns:
        dict: Response with status code and collected data summary
    """
    logger.info('Billow Cost Collector started')
    
    try:
        # Get the DynamoDB table name from environment variables
        table_name = os.environ.get('DYNAMODB_TABLE', 'BillowCosts')
        table = dynamodb.Table(table_name)
        
        # Calculate date ranges
        today = datetime.utcnow()
        today_str = today.strftime('%Y-%m-%d')
        
        # Start of current month (e.g., 2026-07-01)
        month_start = today.replace(day=1).strftime('%Y-%m-%d')
        
        # Tomorrow (Cost Explorer end date is exclusive)
        tomorrow = (today + timedelta(days=1)).strftime('%Y-%m-%d')
        
        # ------------------------------------------------
        # Step 1: Get today's costs broken down by service
        # ------------------------------------------------
        logger.info(f'Querying costs from {today_str} to {tomorrow}')
        
        daily_response = ce_client.get_cost_and_usage(
            TimePeriod={
                'Start': today_str,
                'End': tomorrow
            },
            Granularity='DAILY',
            Metrics=['UnblendedCost'],
            GroupBy=[
                {
                    'Type': 'DIMENSION',
                    'Key': 'SERVICE'
                }
            ]
        )
        
        # Parse the response into our format
        services = []
        total_cost = 0.0
        
        for result in daily_response.get('ResultsByTime', []):
            for group in result.get('Groups', []):
                service_name = group['Keys'][0]
                cost = float(group['Metrics']['UnblendedCost']['Amount'])
                
                if cost > 0.001:  # Skip negligible costs
                    services.append({
                        'serviceName': service_name,
                        'cost': round(cost, 4)
                    })
                    total_cost += cost
        
        # Calculate percentage for each service
        for service in services:
            service['percentage'] = round(
                (service['cost'] / total_cost * 100) if total_cost > 0 else 0,
                1
            )
        
        # Sort by cost descending
        services.sort(key=lambda x: x['cost'], reverse=True)
        
        # ------------------------------------------------
        # Step 2: Get month-to-date total for forecasting
        # ------------------------------------------------
        mtd_response = ce_client.get_cost_and_usage(
            TimePeriod={
                'Start': month_start,
                'End': tomorrow
            },
            Granularity='MONTHLY',
            Metrics=['UnblendedCost']
        )
        
        mtd_cost = 0.0
        for result in mtd_response.get('ResultsByTime', []):
            mtd_cost = float(result['Metrics']['UnblendedCost']['Amount'])
        
        # ------------------------------------------------
        # Step 3: Simple forecast (linear extrapolation)
        # ------------------------------------------------
        days_elapsed = today.day
        days_in_month = 30  # Simplified
        
        if days_elapsed > 0:
            daily_average = mtd_cost / days_elapsed
            forecasted_month_end = daily_average * days_in_month
        else:
            forecasted_month_end = 0.0
        
        # ------------------------------------------------
        # Step 4: Store in DynamoDB
        # ------------------------------------------------
        record = {
            'date': today_str,
            'collectedAt': today.isoformat() + 'Z',
            'totalCost': Decimal(str(round(total_cost, 4))),
            'currency': 'USD',
            'services': json.loads(json.dumps(services), parse_float=Decimal),
            'forecastedMonthEnd': Decimal(str(round(forecasted_month_end, 2))),
            'monthToDateCost': Decimal(str(round(mtd_cost, 4)))
        }
        
        table.put_item(Item=record)
        logger.info(f'Stored cost record: ${total_cost:.2f} today, ${mtd_cost:.2f} MTD')
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Cost data collected successfully',
                'date': today_str,
                'totalCost': round(total_cost, 4),
                'monthToDate': round(mtd_cost, 4),
                'forecast': round(forecasted_month_end, 2),
                'servicesCount': len(services)
            })
        }
        
    except Exception as e:
        logger.error(f'Error collecting cost data: {str(e)}')
        raise
