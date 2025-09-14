import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_USERS || 'pre_professional_tracker_users';

const sampleUsers = [
    {
        university_id: 'university-001', // UCLA
        user_id: 'user-001',
        email: 'john.doe@ucla.edu',
        first_name: 'John',
        last_name: 'Doe',
        user_type: 'student',
        status: 'active',
        subscription_status: 'trial',
        trial_start_date: new Date().toISOString(),
        trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-002', // Stanford
        user_id: 'user-002',
        email: 'jane.smith@stanford.edu',
        first_name: 'Jane',
        last_name: 'Smith',
        user_type: 'student',
        status: 'active',
        subscription_status: 'active',
        subscription_plan: 'monthly',
        subscription_start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-003', // University of Michigan
        user_id: 'user-003',
        email: 'mike.johnson@umich.edu',
        first_name: 'Mike',
        last_name: 'Johnson',
        user_type: 'student',
        status: 'active',
        subscription_status: 'trial',
        trial_start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        trial_end_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-004', // Duke
        user_id: 'user-004',
        email: 'sarah.wilson@duke.edu',
        first_name: 'Sarah',
        last_name: 'Wilson',
        user_type: 'student',
        status: 'active',
        subscription_status: 'active',
        subscription_plan: 'yearly',
        subscription_start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-005', // UT Austin
        user_id: 'user-005',
        email: 'alex.brown@utexas.edu',
        first_name: 'Alex',
        last_name: 'Brown',
        user_type: 'student',
        status: 'active',
        subscription_status: 'trial',
        trial_start_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
        trial_end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-001', // UCLA - Advisor
        user_id: 'advisor-001',
        email: 'dr.advisor@ucla.edu',
        first_name: 'Dr. Sarah',
        last_name: 'Advisor',
        user_type: 'advisor',
        status: 'active',
        subscription_status: 'active',
        subscription_plan: 'yearly',
        subscription_start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-002', // Stanford - Advisor
        user_id: 'advisor-002',
        email: 'prof.miller@stanford.edu',
        first_name: 'Prof. David',
        last_name: 'Miller',
        user_type: 'advisor',
        status: 'active',
        subscription_status: 'active',
        subscription_plan: 'yearly',
        subscription_start_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days ago
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
    }
];

async function seedUsers() {
    console.log('🌱 Starting to seed users...');
    console.log(`📊 Table: ${tableName}`);
    console.log(`🌍 Region: ${process.env.AWS_REGION || 'us-east-2'}`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of sampleUsers) {
        try {
            await docClient.send(new PutCommand({
                TableName: tableName,
                Item: user
            }));

            console.log(`✅ Added: ${user.first_name} ${user.last_name} (${user.email}) - ${user.user_type}`);
            successCount++;
        } catch (error) {
            console.error(`❌ Error adding ${user.first_name} ${user.last_name}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n📈 Summary:');
    console.log(`✅ Successfully added: ${successCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log('🎉 User seeding completed!');
}

// Run the seeding function
seedUsers().catch(console.error);
