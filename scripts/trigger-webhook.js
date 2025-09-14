#!/usr/bin/env node

// Script to manually trigger a webhook for your existing subscription
const https = require('https');

const WEBHOOK_URL = 'https://jtei4wbgq2.execute-api.us-east-2.amazonaws.com/prod/stripe-webhook';
const WEBHOOK_SECRET = 'whsec_v6F0cX2MHSdX6SgidhA3qgIpPxgTd6XJ';

// Sample subscription created webhook payload
const webhookPayload = {
    id: 'evt_test_webhook',
    object: 'event',
    type: 'customer.subscription.created',
    data: {
        object: {
            id: 'sub_test_webhook',
            object: 'subscription',
            status: 'active',
            customer: 'cus_test_webhook',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
            items: {
                data: [{
                    price: {
                        id: 'price_1S6xpsDaD5goVVmv4dewLyih', // Monthly price ID
                        nickname: 'Monthly Plan'
                    }
                }]
            },
            metadata: {
                user_id: '512bb580-e091-705a-b00b-aed7413ec5ee',
                university_id: 'default-university'
            }
        }
    }
};

// Create the webhook signature
const crypto = require('crypto');
const payload = JSON.stringify(webhookPayload);
const timestamp = Math.floor(Date.now() / 1000);
const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

console.log('🚀 Triggering webhook for existing subscription...');
console.log('📡 Webhook URL:', WEBHOOK_URL);
console.log('🔑 Signature:', signature);

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': `t=${timestamp},v1=${signature}`
    }
};

const req = https.request(WEBHOOK_URL, options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('📋 Response:', data);
        if (res.statusCode === 200) {
            console.log('✅ Webhook triggered successfully!');
            console.log('🔄 Your subscription status should now be updated.');
        } else {
            console.log('❌ Webhook failed. Check the response above.');
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error:', error.message);
});

req.write(payload);
req.end();
