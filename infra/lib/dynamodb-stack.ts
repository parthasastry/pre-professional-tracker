import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class DatabaseConstruct extends Construct {
    // Core tables
    public readonly universitiesTable: dynamodb.Table;
    public readonly usersTable: dynamodb.Table;
    public readonly experiencesTable: dynamodb.Table;
    public readonly coursesTable: dynamodb.Table;
    public readonly checklistTable: dynamodb.Table;

    // Analytics and caching tables
    public readonly analyticsTable: dynamodb.Table;
    public readonly pdfCacheTable: dynamodb.Table;

    // University management tables
    public readonly universitySettingsTable: dynamodb.Table;
    public readonly advisorsTable: dynamodb.Table;
    public readonly announcementsTable: dynamodb.Table;

    // User goals and progress tracking
    public readonly userGoalsTable: dynamodb.Table;

    // Sessions table for individual experience sessions
    public readonly sessionsTable: dynamodb.Table;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // Universities Table - Core university data
        this.universitiesTable = new dynamodb.Table(this, 'UniversitiesTable', {
            tableName: process.env.TABLE_UNIVERSITIES || 'pre-professional-tracker-universities',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
        });

        // GSI for querying by domain
        this.universitiesTable.addGlobalSecondaryIndex({
            indexName: 'DomainIndex',
            partitionKey: { name: 'domain', type: dynamodb.AttributeType.STRING },
        });

        // Users Table - Students and advisors
        this.usersTable = new dynamodb.Table(this, 'UsersTable', {
            tableName: process.env.TABLE_USERS || 'pre-professional-tracker-users',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
        });

        // GSI for querying by email
        this.usersTable.addGlobalSecondaryIndex({
            indexName: 'EmailIndex',
            partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
        });

        // GSI for querying by user type (student/advisor)
        this.usersTable.addGlobalSecondaryIndex({
            indexName: 'UserTypeIndex',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'user_type', type: dynamodb.AttributeType.STRING },
        });

        // Experiences Table - Shadowing and volunteering
        this.experiencesTable = new dynamodb.Table(this, 'ExperiencesTable', {
            tableName: process.env.TABLE_EXPERIENCES || 'pre-professional-tracker-experiences-v2',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'experience_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        });

        // GSI for querying by university (for admin/university-wide queries)
        this.experiencesTable.addGlobalSecondaryIndex({
            indexName: 'UniversityIndex',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
        });

        // GSI for querying by category within a user
        this.experiencesTable.addGlobalSecondaryIndex({
            indexName: 'CategoryIndex',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'category', type: dynamodb.AttributeType.STRING },
        });

        // Courses Table - Academic tracking
        this.coursesTable = new dynamodb.Table(this, 'CoursesTable', {
            tableName: process.env.TABLE_COURSES || 'pre-professional-tracker-courses-v2',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'course_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        });

        // GSI for querying by university (for admin/university-wide queries)
        this.coursesTable.addGlobalSecondaryIndex({
            indexName: 'UniversityIndex',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'semester_year', type: dynamodb.AttributeType.STRING },
        });

        // GSI for querying by semester within a user
        this.coursesTable.addGlobalSecondaryIndex({
            indexName: 'SemesterIndex',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'semester_year', type: dynamodb.AttributeType.STRING },
        });

        // Checklist Table - Progress tracking
        this.checklistTable = new dynamodb.Table(this, 'ChecklistTable', {
            tableName: process.env.TABLE_CHECKLIST || 'pre-professional-tracker-checklist-v2',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'checklist_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        });

        // GSI for querying by university (for admin/university-wide queries)
        this.checklistTable.addGlobalSecondaryIndex({
            indexName: 'UniversityIndex',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
        });

        // GSI for querying by status within a user
        this.checklistTable.addGlobalSecondaryIndex({
            indexName: 'StatusIndex',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
        });

        // Analytics Table - University and user analytics
        this.analyticsTable = new dynamodb.Table(this, 'AnalyticsTable', {
            tableName: process.env.TABLE_ANALYTICS || 'pre-professional-tracker-analytics',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'analytics_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'expires_at',
        });

        // GSI for querying by date
        this.analyticsTable.addGlobalSecondaryIndex({
            indexName: 'DateIndex',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
        });

        // PDF Cache Table - Cached PDF exports
        this.pdfCacheTable = new dynamodb.Table(this, 'PdfCacheTable', {
            tableName: process.env.TABLE_PDF_CACHE || 'pre-professional-tracker-pdf-cache',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'pdf_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'expires_at',
        });

        // University Settings Table - University-specific configurations
        this.universitySettingsTable = new dynamodb.Table(this, 'UniversitySettingsTable', {
            tableName: process.env.TABLE_UNIVERSITY_SETTINGS || 'pre-professional-tracker-university-settings',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'setting_key', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        });

        // Advisors Table - University advisors
        this.advisorsTable = new dynamodb.Table(this, 'AdvisorsTable', {
            tableName: process.env.TABLE_ADVISORS || 'pre-professional-tracker-advisors',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'advisor_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        });

        // GSI for querying by advisor email
        this.advisorsTable.addGlobalSecondaryIndex({
            indexName: 'EmailIndex',
            partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
        });

        // Announcements Table - University announcements
        this.announcementsTable = new dynamodb.Table(this, 'AnnouncementsTable', {
            tableName: process.env.TABLE_ANNOUNCEMENTS || 'pre-professional-tracker-announcements',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'announcement_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        });

        // GSI for querying by target audience
        this.announcementsTable.addGlobalSecondaryIndex({
            indexName: 'TargetAudienceIndex',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'target_audience', type: dynamodb.AttributeType.STRING },
        });

        // GSI for querying by expiration date
        this.announcementsTable.addGlobalSecondaryIndex({
            indexName: 'ExpirationIndex',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'expires_at', type: dynamodb.AttributeType.STRING },
        });

        // User Goals Table - Personal goal tracking
        this.userGoalsTable = new dynamodb.Table(this, 'UserGoalsTable', {
            tableName: process.env.TABLE_USER_GOALS || 'pre-professional-tracker-user-goals',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'academic_year', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
        });

        // GSI for querying by university and academic year
        this.userGoalsTable.addGlobalSecondaryIndex({
            indexName: 'UniversityYearIndex',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'academic_year', type: dynamodb.AttributeType.STRING },
        });

        // Sessions Table - Individual experience sessions
        this.sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
            tableName: process.env.TABLE_SESSIONS || 'pre-professional-tracker-sessions',
            partitionKey: { name: 'experience_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'session_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
        });

        // GSI for querying sessions by user
        this.sessionsTable.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
        });

        // GSI for querying sessions by university
        this.sessionsTable.addGlobalSecondaryIndex({
            indexName: 'UniversityIndex',
            partitionKey: { name: 'university_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
        });

        // GSI for querying sessions by category
        this.sessionsTable.addGlobalSecondaryIndex({
            indexName: 'CategoryIndex',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'category', type: dynamodb.AttributeType.STRING },
        });
    }
}
