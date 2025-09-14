import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_UNIVERSITIES || 'pre_professional_tracker_universities';

const sampleUniversities = [
    {
        university_id: 'university-001',
        name: 'University of California, Los Angeles',
        domain: 'ucla.edu',
        status: 'active',
        location: {
            city: 'Los Angeles',
            state: 'California',
            country: 'United States'
        },
        features: {
            pre_med: true,
            pre_dental: true,
            pre_pa: true,
            analytics: true,
            advisor_portal: true,
            announcements: true
        },
        settings: {
            hour_goals: {
                shadowing: 100,
                volunteering: 200
            },
            gpa_requirements: {
                minimum: 3.5,
                competitive: 3.7
            },
            checklist_items: [
                'Meet with pre-health advisor',
                'Complete prerequisite courses',
                'Shadow healthcare professionals',
                'Volunteer in healthcare settings',
                'Take MCAT',
                'Submit applications'
            ]
        },
        description: 'UCLA is a leading public research university with strong pre-health programs and excellent medical school preparation.',
        website: 'https://www.ucla.edu',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-002',
        name: 'Stanford University',
        domain: 'stanford.edu',
        status: 'active',
        location: {
            city: 'Stanford',
            state: 'California',
            country: 'United States'
        },
        features: {
            pre_med: true,
            pre_dental: true,
            pre_pa: true,
            analytics: true,
            advisor_portal: true,
            announcements: true
        },
        settings: {
            hour_goals: {
                shadowing: 120,
                volunteering: 250
            },
            gpa_requirements: {
                minimum: 3.7,
                competitive: 3.9
            },
            checklist_items: [
                'Meet with pre-health advisor',
                'Complete prerequisite courses',
                'Shadow healthcare professionals',
                'Volunteer in healthcare settings',
                'Take MCAT',
                'Submit applications'
            ]
        },
        description: 'Stanford University offers world-class pre-health education with cutting-edge research opportunities.',
        website: 'https://www.stanford.edu',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-003',
        name: 'University of Michigan',
        domain: 'umich.edu',
        status: 'active',
        location: {
            city: 'Ann Arbor',
            state: 'Michigan',
            country: 'United States'
        },
        features: {
            pre_med: true,
            pre_dental: true,
            pre_pa: true,
            analytics: true,
            advisor_portal: true,
            announcements: true
        },
        settings: {
            hour_goals: {
                shadowing: 100,
                volunteering: 200
            },
            gpa_requirements: {
                minimum: 3.5,
                competitive: 3.7
            },
            checklist_items: [
                'Meet with pre-health advisor',
                'Complete prerequisite courses',
                'Shadow healthcare professionals',
                'Volunteer in healthcare settings',
                'Take MCAT',
                'Submit applications'
            ]
        },
        description: 'University of Michigan provides comprehensive pre-health programs with strong medical school connections.',
        website: 'https://www.umich.edu',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-004',
        name: 'Duke University',
        domain: 'duke.edu',
        status: 'active',
        location: {
            city: 'Durham',
            state: 'North Carolina',
            country: 'United States'
        },
        features: {
            pre_med: true,
            pre_dental: true,
            pre_pa: true,
            analytics: true,
            advisor_portal: true,
            announcements: true
        },
        settings: {
            hour_goals: {
                shadowing: 110,
                volunteering: 220
            },
            gpa_requirements: {
                minimum: 3.6,
                competitive: 3.8
            },
            checklist_items: [
                'Meet with pre-health advisor',
                'Complete prerequisite courses',
                'Shadow healthcare professionals',
                'Volunteer in healthcare settings',
                'Take MCAT',
                'Submit applications'
            ]
        },
        description: 'Duke University offers excellent pre-health programs with strong ties to the Duke Medical School.',
        website: 'https://www.duke.edu',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-005',
        name: 'University of Texas at Austin',
        domain: 'utexas.edu',
        status: 'active',
        location: {
            city: 'Austin',
            state: 'Texas',
            country: 'United States'
        },
        features: {
            pre_med: true,
            pre_dental: true,
            pre_pa: true,
            analytics: true,
            advisor_portal: true,
            announcements: true
        },
        settings: {
            hour_goals: {
                shadowing: 100,
                volunteering: 200
            },
            gpa_requirements: {
                minimum: 3.5,
                competitive: 3.7
            },
            checklist_items: [
                'Meet with pre-health advisor',
                'Complete prerequisite courses',
                'Shadow healthcare professionals',
                'Volunteer in healthcare settings',
                'Take MCAT',
                'Submit applications'
            ]
        },
        description: 'UT Austin provides comprehensive pre-health education with strong research opportunities.',
        website: 'https://www.utexas.edu',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-006',
        name: 'University of North Carolina at Chapel Hill',
        domain: 'unc.edu',
        status: 'active',
        location: {
            city: 'Chapel Hill',
            state: 'North Carolina',
            country: 'United States'
        },
        features: {
            pre_med: true,
            pre_dental: true,
            pre_pa: true,
            analytics: true,
            advisor_portal: true,
            announcements: true
        },
        settings: {
            hour_goals: {
                shadowing: 100,
                volunteering: 200
            },
            gpa_requirements: {
                minimum: 3.5,
                competitive: 3.7
            },
            checklist_items: [
                'Meet with pre-health advisor',
                'Complete prerequisite courses',
                'Shadow healthcare professionals',
                'Volunteer in healthcare settings',
                'Take MCAT',
                'Submit applications'
            ]
        },
        description: 'UNC Chapel Hill offers excellent pre-health programs with strong medical school preparation.',
        website: 'https://www.unc.edu',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-007',
        name: 'University of Washington',
        domain: 'washington.edu',
        status: 'active',
        location: {
            city: 'Seattle',
            state: 'Washington',
            country: 'United States'
        },
        features: {
            pre_med: true,
            pre_dental: true,
            pre_pa: true,
            analytics: true,
            advisor_portal: true,
            announcements: true
        },
        settings: {
            hour_goals: {
                shadowing: 100,
                volunteering: 200
            },
            gpa_requirements: {
                minimum: 3.5,
                competitive: 3.7
            },
            checklist_items: [
                'Meet with pre-health advisor',
                'Complete prerequisite courses',
                'Shadow healthcare professionals',
                'Volunteer in healthcare settings',
                'Take MCAT',
                'Submit applications'
            ]
        },
        description: 'University of Washington provides comprehensive pre-health programs with strong research opportunities.',
        website: 'https://www.washington.edu',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-008',
        name: 'University of Pennsylvania',
        domain: 'upenn.edu',
        status: 'active',
        location: {
            city: 'Philadelphia',
            state: 'Pennsylvania',
            country: 'United States'
        },
        features: {
            pre_med: true,
            pre_dental: true,
            pre_pa: true,
            analytics: true,
            advisor_portal: true,
            announcements: true
        },
        settings: {
            hour_goals: {
                shadowing: 120,
                volunteering: 250
            },
            gpa_requirements: {
                minimum: 3.6,
                competitive: 3.8
            },
            checklist_items: [
                'Meet with pre-health advisor',
                'Complete prerequisite courses',
                'Shadow healthcare professionals',
                'Volunteer in healthcare settings',
                'Take MCAT',
                'Submit applications'
            ]
        },
        description: 'UPenn offers world-class pre-health education with strong ties to the Perelman School of Medicine.',
        website: 'https://www.upenn.edu',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-009',
        name: 'University of Chicago',
        domain: 'uchicago.edu',
        status: 'active',
        location: {
            city: 'Chicago',
            state: 'Illinois',
            country: 'United States'
        },
        features: {
            pre_med: true,
            pre_dental: true,
            pre_pa: true,
            analytics: true,
            advisor_portal: true,
            announcements: true
        },
        settings: {
            hour_goals: {
                shadowing: 110,
                volunteering: 220
            },
            gpa_requirements: {
                minimum: 3.6,
                competitive: 3.8
            },
            checklist_items: [
                'Meet with pre-health advisor',
                'Complete prerequisite courses',
                'Shadow healthcare professionals',
                'Volunteer in healthcare settings',
                'Take MCAT',
                'Submit applications'
            ]
        },
        description: 'University of Chicago provides excellent pre-health programs with strong research opportunities.',
        website: 'https://www.uchicago.edu',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        university_id: 'university-010',
        name: 'University of Virginia',
        domain: 'virginia.edu',
        status: 'active',
        location: {
            city: 'Charlottesville',
            state: 'Virginia',
            country: 'United States'
        },
        features: {
            pre_med: true,
            pre_dental: true,
            pre_pa: true,
            analytics: true,
            advisor_portal: true,
            announcements: true
        },
        settings: {
            hour_goals: {
                shadowing: 100,
                volunteering: 200
            },
            gpa_requirements: {
                minimum: 3.5,
                competitive: 3.7
            },
            checklist_items: [
                'Meet with pre-health advisor',
                'Complete prerequisite courses',
                'Shadow healthcare professionals',
                'Volunteer in healthcare settings',
                'Take MCAT',
                'Submit applications'
            ]
        },
        description: 'UVA offers comprehensive pre-health programs with strong medical school preparation.',
        website: 'https://www.virginia.edu',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

async function seedUniversities() {
    console.log('🌱 Starting to seed universities...');
    console.log(`📊 Table: ${tableName}`);
    console.log(`🌍 Region: ${process.env.AWS_REGION || 'us-east-2'}`);

    let successCount = 0;
    let errorCount = 0;

    for (const university of sampleUniversities) {
        try {
            await docClient.send(new PutCommand({
                TableName: tableName,
                Item: university
            }));

            console.log(`✅ Added: ${university.name} (${university.domain})`);
            successCount++;
        } catch (error) {
            console.error(`❌ Error adding ${university.name}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n📈 Summary:');
    console.log(`✅ Successfully added: ${successCount} universities`);
    console.log(`❌ Errors: ${errorCount} universities`);
    console.log('🎉 University seeding completed!');
}

// Run the seeding function
seedUniversities().catch(console.error);
