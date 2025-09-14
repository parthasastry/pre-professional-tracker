import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Stripe from 'stripe';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_USERS;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

export const handler = async (event) => {
    // Handle OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Content-Type': 'application/json'
            },
            body: ''
        };
    }

    try {
        const { httpMethod, pathParameters, body } = event;
        const payload = body ? JSON.parse(body) : {};
        const { user_id, university_id } = pathParameters || {};

        switch (httpMethod) {
            case 'POST':
                if (payload.action === 'create_checkout_session') {
                    return await createCheckoutSession(user_id, university_id, payload);
                } else if (payload.action === 'create_customer') {
                    return await createStripeCustomer(user_id, university_id, payload);
                } else if (payload.action === 'update_subscription') {
                    return await updateSubscription(user_id, university_id, payload);
                } else if (payload.action === 'get_available_plans') {
                    return await getAvailablePlans();
                } else {
                    return formatResponse(400, { error: 'Invalid action' });
                }
            case 'GET':
                // Check if this is a plans request (no path parameters)
                if (!user_id && !university_id) {
                    return await getAvailablePlans();
                } else {
                    // For subscription status, if we have user_id and university_id, return subscription status
                    return await getSubscriptionStatus(user_id, university_id);
                }
            default:
                return formatResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { error: error.message });
    }
};

async function createStripeCustomer(user_id, university_id, payload) {
    if (!user_id || !university_id) {
        return formatResponse(400, { error: 'User ID and University ID are required' });
    }

    // Get user data
    const userResponse = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { user_id, university_id }
    }));

    if (!userResponse.Item) {
        return formatResponse(404, { error: 'User not found' });
    }

    const user = userResponse.Item;

    try {
        // Create Stripe customer
        const customer = await stripe.customers.create({
            email: user.email,
            name: `${user.given_name} ${user.family_name}`,
            metadata: {
                user_id: user_id,
                university_id: university_id,
            }
        });

        // Update user with Stripe customer ID
        await docClient.send(new UpdateCommand({
            TableName: tableName,
            Key: { user_id, university_id },
            UpdateExpression: 'SET stripe_customer_id = :customer_id, updated_at = :updated_at',
            ExpressionAttributeValues: {
                ':customer_id': customer.id,
                ':updated_at': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        }));

        return formatResponse(200, {
            success: true,
            customer_id: customer.id,
            message: 'Stripe customer created successfully'
        });

    } catch (error) {
        console.error('Stripe customer creation error:', error);
        return formatResponse(500, { error: 'Failed to create Stripe customer' });
    }
}

async function createCheckoutSession(user_id, university_id, payload) {
    if (!user_id || !university_id) {
        return formatResponse(400, { error: 'User ID and University ID are required' });
    }

    const { price_id, success_url, cancel_url } = payload;

    if (!price_id || !success_url || !cancel_url) {
        return formatResponse(400, { error: 'price_id, success_url, and cancel_url are required' });
    }

    // Get user data
    const userResponse = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { user_id, university_id }
    }));

    if (!userResponse.Item) {
        return formatResponse(404, { error: 'User not found' });
    }

    const user = userResponse.Item;

    try {
        // Create or get Stripe customer
        let customerId = user.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: `${user.given_name} ${user.family_name}`,
                metadata: {
                    user_id: user_id,
                    university_id: university_id,
                }
            });
            customerId = customer.id;

            // Update user with customer ID
            await docClient.send(new UpdateCommand({
                TableName: tableName,
                Key: { user_id, university_id },
                UpdateExpression: 'SET stripe_customer_id = :customer_id, updated_at = :updated_at',
                ExpressionAttributeValues: {
                    ':customer_id': customerId,
                    ':updated_at': new Date().toISOString()
                }
            }));
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: price_id,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: success_url,
            cancel_url: cancel_url,
            metadata: {
                user_id: user_id,
                university_id: university_id,
            },
        });

        return formatResponse(200, {
            success: true,
            session_id: session.id,
            checkout_url: session.url
        });

    } catch (error) {
        console.error('Checkout session creation error:', error);
        return formatResponse(500, { error: 'Failed to create checkout session' });
    }
}

async function updateSubscription(user_id, university_id, payload) {
    if (!user_id || !university_id) {
        return formatResponse(400, { error: 'User ID and University ID are required' });
    }

    const { subscription_id, status, plan_id, current_period_end } = payload;

    if (!subscription_id || !status) {
        return formatResponse(400, { error: 'subscription_id and status are required' });
    }

    try {
        const updateData = {
            stripe_subscription_id: subscription_id,
            subscription_status: status,
            updated_at: new Date().toISOString()
        };

        if (plan_id) {
            updateData.subscription_plan = plan_id;
        }

        if (current_period_end) {
            updateData.subscription_ends_at = new Date(current_period_end * 1000).toISOString();
        }

        // Update user subscription
        const response = await docClient.send(new UpdateCommand({
            TableName: tableName,
            Key: { user_id, university_id },
            UpdateExpression: 'SET ' + Object.keys(updateData).map(key => `${key} = :${key}`).join(', '),
            ExpressionAttributeValues: Object.fromEntries(
                Object.entries(updateData).map(([key, value]) => [`:${key}`, value])
            ),
            ReturnValues: 'ALL_NEW'
        }));

        return formatResponse(200, {
            success: true,
            user: response.Attributes,
            message: 'Subscription updated successfully'
        });

    } catch (error) {
        console.error('Subscription update error:', error);
        return formatResponse(500, { error: 'Failed to update subscription' });
    }
}

async function getSubscriptionStatus(user_id, university_id) {
    if (!user_id || !university_id) {
        return formatResponse(400, { error: 'User ID and University ID are required' });
    }

    try {
        const userResponse = await docClient.send(new GetCommand({
            TableName: tableName,
            Key: { user_id, university_id }
        }));

        if (!userResponse.Item) {
            return formatResponse(404, { error: 'User not found' });
        }

        const user = userResponse.Item;
        const now = new Date();
        const trialEnds = new Date(user.trial_ends_at);
        const isTrialActive = user.subscription_status === 'trial' && now < trialEnds;
        const daysRemaining = Math.max(0, Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24)));

        return formatResponse(200, {
            subscription_status: user.subscription_status,
            trial_ends_at: user.trial_ends_at,
            subscription_ends_at: user.subscription_ends_at,
            subscription_plan: user.subscription_plan,
            stripe_customer_id: user.stripe_customer_id,
            stripe_subscription_id: user.stripe_subscription_id,
            trial_info: {
                is_trial_active: isTrialActive,
                days_remaining: daysRemaining,
                requires_subscription: !isTrialActive && user.subscription_status !== 'active'
            }
        });

    } catch (error) {
        console.error('Get subscription status error:', error);
        return formatResponse(500, { error: 'Failed to get subscription status' });
    }
}

async function getAvailablePlans() {
    try {
        const plans = [
            {
                id: 'monthly',
                name: 'Monthly Plan',
                price: 9.99,
                interval: 'month',
                priceId: process.env.STRIPE_MONTHLY_PRICE_ID,
                description: 'Perfect for short-term tracking',
                features: ['Unlimited experiences', 'GPA tracking', 'PDF export', 'Priority support'],
                popular: false
            },
            {
                id: 'yearly',
                name: 'Yearly Plan',
                price: 99.99,
                interval: 'year',
                priceId: process.env.STRIPE_YEARLY_PRICE_ID,
                description: 'Best value for long-term planning',
                features: ['Everything in Monthly', '2 months free', 'Advanced analytics', 'University partnerships'],
                popular: true
            }
        ];

        // Filter out plans without valid price IDs
        const validPlans = plans.filter(plan => plan.priceId && plan.priceId.trim() !== '');

        // If no valid plans, return a message
        if (validPlans.length === 0) {
            return formatResponse(200, {
                plans: [],
                message: 'No subscription plans are currently available. Please contact support.',
                success: true
            });
        }

        return formatResponse(200, {
            plans: validPlans,
            success: true
        });

    } catch (error) {
        console.error('Get available plans error:', error);
        return formatResponse(500, { error: 'Failed to get available plans' });
    }
}

function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}
