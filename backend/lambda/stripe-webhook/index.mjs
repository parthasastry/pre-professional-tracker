import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Stripe from 'stripe';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_USERS;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

export const handler = async (event) => {
    const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
        console.error('Missing Stripe signature or webhook secret');
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing signature or webhook secret' })
        };
    }

    let stripeEvent;

    try {
        // Verify webhook signature
        stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid signature' })
        };
    }

    console.log('Processing Stripe webhook event:', stripeEvent.type);

    try {
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(stripeEvent.data.object);
                break;
            case 'customer.subscription.created':
                await handleSubscriptionCreated(stripeEvent.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(stripeEvent.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(stripeEvent.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(stripeEvent.data.object);
                break;
            case 'invoice.payment_failed':
                await handlePaymentFailed(stripeEvent.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${stripeEvent.type}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ received: true })
        };

    } catch (error) {
        console.error('Error processing webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Webhook processing failed' })
        };
    }
};

async function handleCheckoutSessionCompleted(session) {
    console.log('Processing checkout session completed:', session.id);

    const { user_id, university_id } = session.metadata;

    if (!user_id || !university_id) {
        console.error('Missing user_id or university_id in session metadata');
        return;
    }

    // Update user to mark subscription as active
    await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { user_id, university_id },
        UpdateExpression: 'SET subscription_status = :status, updated_at = :updated_at',
        ExpressionAttributeValues: {
            ':status': 'active',
            ':updated_at': new Date().toISOString()
        }
    }));

    console.log('User subscription activated:', user_id);
}

async function handleSubscriptionCreated(subscription) {
    console.log('Processing subscription created:', subscription.id);

    const customerId = subscription.customer;

    // Find user by Stripe customer ID
    const user = await findUserByStripeCustomerId(customerId);

    if (!user) {
        console.error('User not found for customer ID:', customerId);
        return;
    }

    // Update user subscription details
    await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { user_id: user.user_id, university_id: user.university_id },
        UpdateExpression: 'SET stripe_subscription_id = :sub_id, subscription_status = :status, subscription_plan = :plan, subscription_ends_at = :ends_at, updated_at = :updated_at',
        ExpressionAttributeValues: {
            ':sub_id': subscription.id,
            ':status': subscription.status,
            ':plan': subscription.items.data[0]?.price?.id || null,
            ':ends_at': new Date(subscription.current_period_end * 1000).toISOString(),
            ':updated_at': new Date().toISOString()
        }
    }));

    console.log('Subscription created for user:', user.user_id);
}

async function handleSubscriptionUpdated(subscription) {
    console.log('Processing subscription updated:', subscription.id);

    const customerId = subscription.customer;

    // Find user by Stripe customer ID
    const user = await findUserByStripeCustomerId(customerId);

    if (!user) {
        console.error('User not found for customer ID:', customerId);
        return;
    }

    // Update user subscription details
    await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { user_id: user.user_id, university_id: user.university_id },
        UpdateExpression: 'SET subscription_status = :status, subscription_plan = :plan, subscription_ends_at = :ends_at, updated_at = :updated_at',
        ExpressionAttributeValues: {
            ':status': subscription.status,
            ':plan': subscription.items.data[0]?.price?.id || null,
            ':ends_at': new Date(subscription.current_period_end * 1000).toISOString(),
            ':updated_at': new Date().toISOString()
        }
    }));

    console.log('Subscription updated for user:', user.user_id);
}

async function handleSubscriptionDeleted(subscription) {
    console.log('Processing subscription deleted:', subscription.id);

    const customerId = subscription.customer;

    // Find user by Stripe customer ID
    const user = await findUserByStripeCustomerId(customerId);

    if (!user) {
        console.error('User not found for customer ID:', customerId);
        return;
    }

    // Update user subscription status
    await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { user_id: user.user_id, university_id: user.university_id },
        UpdateExpression: 'SET subscription_status = :status, stripe_subscription_id = :sub_id, updated_at = :updated_at',
        ExpressionAttributeValues: {
            ':status': 'cancelled',
            ':sub_id': null,
            ':updated_at': new Date().toISOString()
        }
    }));

    console.log('Subscription cancelled for user:', user.user_id);
}

async function handlePaymentSucceeded(invoice) {
    console.log('Processing payment succeeded:', invoice.id);

    const customerId = invoice.customer;

    // Find user by Stripe customer ID
    const user = await findUserByStripeCustomerId(customerId);

    if (!user) {
        console.error('User not found for customer ID:', customerId);
        return;
    }

    // Update subscription end date
    if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);

        await docClient.send(new UpdateCommand({
            TableName: tableName,
            Key: { user_id: user.user_id, university_id: user.university_id },
            UpdateExpression: 'SET subscription_ends_at = :ends_at, updated_at = :updated_at',
            ExpressionAttributeValues: {
                ':ends_at': new Date(subscription.current_period_end * 1000).toISOString(),
                ':updated_at': new Date().toISOString()
            }
        }));
    }

    console.log('Payment succeeded for user:', user.user_id);
}

async function handlePaymentFailed(invoice) {
    console.log('Processing payment failed:', invoice.id);

    const customerId = invoice.customer;

    // Find user by Stripe customer ID
    const user = await findUserByStripeCustomerId(customerId);

    if (!user) {
        console.error('User not found for customer ID:', customerId);
        return;
    }

    // Update subscription status to past_due
    await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { user_id: user.user_id, university_id: user.university_id },
        UpdateExpression: 'SET subscription_status = :status, updated_at = :updated_at',
        ExpressionAttributeValues: {
            ':status': 'past_due',
            ':updated_at': new Date().toISOString()
        }
    }));

    console.log('Payment failed for user:', user.user_id);
}

async function findUserByStripeCustomerId(customerId) {
    // This is a simplified implementation
    // In production, you might want to add a GSI for stripe_customer_id
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');

    const response = await docClient.send(new ScanCommand({
        TableName: tableName,
        FilterExpression: 'stripe_customer_id = :customer_id',
        ExpressionAttributeValues: {
            ':customer_id': customerId
        }
    }));

    return response.Items?.[0] || null;
}
