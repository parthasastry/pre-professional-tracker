#!/usr/bin/env node

/**
 * Seed Knowledge Base with Business Context Data
 * 
 * This script populates the knowledge base with initial business context
 * that the AI agents can use for decision making.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Configuration
const TABLE_RFP_KNOWLEDGE_BASE = process.env.TABLE_RFP_KNOWLEDGE_BASE || 'healthcare-uc-rfp-knowledge-base';

const businessContextData = [
    {
        content_id: 'service_regions',
        content_type: 'business_context',
        title: 'Service Regions',
        content_data: {
            value: ['North America', 'Europe', 'Asia Pacific'],
            details: 'We provide services in these regions with local teams'
        },
        description: 'Geographic regions where we provide healthcare IT services',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'current_capacity',
        content_type: 'business_context',
        title: 'Current Capacity',
        content_data: {
            value: 'Available - 2 projects can start in Q1 2024',
            details: 'We have capacity for 2 new healthcare IT projects starting Q1 2024'
        },
        description: 'Current project capacity and availability',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'healthcare_experience',
        content_type: 'business_context',
        title: 'Healthcare Experience',
        content_data: {
            value: '15+ years, 200+ healthcare IT implementations',
            details: 'Extensive experience in EHR, patient portals, and healthcare data analytics'
        },
        description: 'Our experience and track record in healthcare IT',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'typical_timeline',
        content_type: 'business_context',
        title: 'Typical Project Timeline',
        content_data: {
            value: '6-12 months for healthcare IT projects',
            details: 'EHR implementations: 8-12 months, Patient portals: 4-6 months, Data analytics: 6-8 months'
        },
        description: 'Standard project timelines for different types of healthcare IT projects',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'minimum_project_size',
        content_type: 'business_context',
        title: 'Minimum Project Size',
        content_data: {
            value: '$500K',
            details: 'Minimum project value we consider for healthcare IT implementations'
        },
        description: 'Minimum project size threshold for bid consideration',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'current_workload',
        content_type: 'business_context',
        title: 'Current Workload',
        content_data: {
            value: '60% capacity utilization',
            details: 'Currently running 12 projects with capacity for 8 more'
        },
        description: 'Current team workload and capacity utilization',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'specialties',
        content_type: 'business_context',
        title: 'Specialties',
        content_data: {
            value: ['EHR Implementation', 'Patient Portals', 'Data Analytics', 'HIPAA Compliance', 'Telemedicine'],
            details: 'Core areas of expertise in healthcare IT'
        },
        description: 'Our core specialties and areas of expertise',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'team_size',
        content_type: 'business_context',
        title: 'Team Size',
        content_data: {
            value: '25 healthcare IT specialists',
            details: 'Including 8 Epic certified consultants, 5 Cerner specialists, 12 developers'
        },
        description: 'Size and composition of our healthcare IT team',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'certifications',
        content_type: 'business_context',
        title: 'Certifications',
        content_data: {
            value: ['Epic Certified', 'Cerner Certified', 'HIPAA Compliant', 'AWS Healthcare Competency'],
            details: 'Industry certifications and compliance standards we maintain'
        },
        description: 'Industry certifications and compliance standards',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'pricing_guidelines',
        content_type: 'business_context',
        title: 'Pricing Guidelines',
        content_data: {
            value: {
                'EHR Implementation': '$800K - $2M',
                'Patient Portal': '$200K - $500K',
                'Data Analytics': '$300K - $800K',
                'Telemedicine': '$150K - $400K'
            },
            details: 'Typical pricing ranges for different types of healthcare IT projects'
        },
        description: 'Pricing guidelines for different project types',
        industry: 'Healthcare',
        created_by: 'system'
    }
];

const templateData = [
    {
        content_id: 'executive_summary_template',
        content_type: 'templates',
        title: 'Executive Summary Template',
        content_data: {
            content: `We are a leading healthcare IT consulting firm with 15+ years of experience in EHR Implementation, Patient Portals, Data Analytics, and HIPAA Compliance. Our team of 25 certified professionals has successfully implemented Epic Certified, Cerner Certified, and HIPAA Compliant solutions for healthcare organizations across North America, Europe, and Asia Pacific.

We understand the critical importance of seamless healthcare IT implementations and have a proven track record of delivering projects on time and within budget. Our expertise spans the full spectrum of healthcare technology needs, from electronic health records to patient engagement platforms.`
        },
        description: 'Template for executive summary section of RFP responses',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'company_overview_template',
        content_type: 'templates',
        title: 'Company Overview Template',
        content_data: {
            content: `Our company specializes in healthcare IT implementations with deep expertise in healthcare regulations and compliance. We maintain Epic Certified, Cerner Certified, and HIPAA Compliant certifications and have a proven track record of delivering projects within 6-12 months timelines.

Founded with a mission to transform healthcare through technology, we have grown to become a trusted partner for healthcare organizations seeking to modernize their IT infrastructure. Our team combines technical expertise with deep understanding of healthcare workflows and regulatory requirements.`
        },
        description: 'Template for company overview section',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'proposed_solution_template',
        content_type: 'templates',
        title: 'Proposed Solution Template',
        content_data: {
            content: `Based on your requirements, we propose a comprehensive solution that leverages our expertise in [SPECIALTIES]. Our approach includes:

1. **Discovery and Assessment**: Comprehensive analysis of your current systems and workflows
2. **Solution Design**: Custom architecture tailored to your specific needs
3. **Implementation Planning**: Detailed project plan with clear milestones
4. **Change Management**: Training and support for your team throughout the process
5. **Go-Live Support**: 24/7 support during and after implementation
6. **Post-Implementation**: Ongoing optimization and maintenance services

Our solution is designed to integrate seamlessly with your existing infrastructure while providing scalability for future growth.`
        },
        description: 'Template for proposed solution section',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'timeline_template',
        content_type: 'templates',
        title: 'Timeline Template',
        content_data: {
            content: `Our typical implementation timeline of 6-12 months ensures thorough planning and execution. Key milestones include:

**Phase 1: Discovery and Planning (Weeks 1-4)**
- Requirements gathering and analysis
- System architecture design
- Project team assembly

**Phase 2: Development and Configuration (Weeks 5-20)**
- System configuration and customization
- Integration development
- Testing and quality assurance

**Phase 3: Deployment and Training (Weeks 21-24)**
- Production deployment
- User training and documentation
- Go-live support

**Phase 4: Post-Implementation (Weeks 25-52)**
- Performance monitoring
- Optimization and fine-tuning
- Ongoing support and maintenance

This timeline can be adjusted based on project complexity and your specific requirements.`
        },
        description: 'Template for timeline and milestones section',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'team_qualifications_template',
        content_type: 'templates',
        title: 'Team Qualifications Template',
        content_data: {
            content: `Our team of 25 healthcare IT specialists includes Epic Certified, Cerner Certified, and HIPAA Compliant professionals with extensive experience in healthcare IT implementations. Key team members include:

- **Project Managers**: PMP-certified professionals with 10+ years healthcare experience
- **Solution Architects**: Certified in Epic and Cerner systems with deep technical expertise
- **Implementation Specialists**: Hands-on experience with 200+ healthcare implementations
- **Training Specialists**: Certified trainers with healthcare workflow expertise
- **Support Engineers**: 24/7 support team with rapid response capabilities

Our team has successfully delivered projects for hospitals, clinics, and healthcare systems across North America, Europe, and Asia Pacific.`
        },
        description: 'Template for team qualifications section',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'pricing_template',
        content_type: 'templates',
        title: 'Pricing Structure Template',
        content_data: {
            content: `Our pricing is competitive and based on project scope and complexity. We provide transparent pricing with clear deliverables and milestones. Minimum project engagement is $500K.

**Pricing Structure:**
- **Fixed Price**: For well-defined projects with clear requirements
- **Time and Materials**: For projects requiring flexibility and iterative development
- **Hybrid Approach**: Combination of fixed-price phases with flexible components

**Payment Terms:**
- 30% upon contract signing
- 40% at key milestones
- 30% upon project completion

**Included Services:**
- Project management and coordination
- System configuration and customization
- User training and documentation
- 90 days post-implementation support
- Access to our knowledge base and best practices

We provide detailed cost breakdowns for each project phase and are happy to discuss payment terms that work for your organization.`
        },
        description: 'Template for pricing structure section',
        industry: 'Healthcare',
        created_by: 'system'
    }
];

const complianceRulesData = [
    {
        content_id: 'hipaa_compliance_rules',
        content_type: 'compliance_rules',
        title: 'HIPAA Compliance Requirements',
        content_data: {
            content: `HIPAA Compliance Requirements for Healthcare IT Projects:

**Required Elements:**
- Patient data protection and privacy measures
- Data encryption for data at rest and in transit
- Access controls and user authentication
- Audit logging and monitoring
- Business Associate Agreements (BAAs)
- Data breach notification procedures
- Employee training on HIPAA compliance

**Implementation Requirements:**
- Minimum 256-bit encryption for sensitive data
- Multi-factor authentication for system access
- Role-based access controls (RBAC)
- Regular security assessments and penetration testing
- Incident response plan for data breaches
- HIPAA-compliant hosting and infrastructure

**Documentation Requirements:**
- Privacy Impact Assessment (PIA)
- Security Risk Assessment (SRA)
- Policies and procedures documentation
- Staff training records
- Business Associate Agreement templates`
        },
        description: 'HIPAA compliance requirements for healthcare IT implementations',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'healthcare_standards_compliance',
        content_type: 'compliance_rules',
        title: 'Healthcare Industry Standards',
        content_data: {
            content: `Healthcare Industry Standards Compliance:

**Data Interoperability Standards:**
- HL7 FHIR R4 for data exchange
- HL7 CDA for clinical document architecture
- DICOM for medical imaging
- IHE (Integrating the Healthcare Enterprise) profiles

**Coding Standards:**
- ICD-10-CM for diagnosis coding
- CPT/HCPCS for procedure coding
- SNOMED CT for clinical terminology
- LOINC for laboratory data

**Quality Standards:**
- Joint Commission standards
- CMS Quality Payment Program
- HEDIS measures for quality reporting
- NCQA accreditation requirements

**Security Standards:**
- NIST Cybersecurity Framework
- ISO 27001 for information security
- SOC 2 Type II compliance
- HITECH Act requirements

**Implementation Requirements:**
- API-first architecture for interoperability
- Standardized data formats and schemas
- Comprehensive audit trails
- Quality metrics and reporting capabilities`
        },
        description: 'Healthcare industry standards and compliance requirements',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'risk_management_compliance',
        content_type: 'compliance_rules',
        title: 'Risk Management and Business Continuity',
        content_data: {
            content: `Risk Management and Business Continuity Requirements:

**Risk Assessment Categories:**
- Technical risks (system failures, data loss)
- Security risks (cyber threats, unauthorized access)
- Operational risks (staff turnover, knowledge loss)
- Compliance risks (regulatory changes, audit findings)
- Business risks (scope creep, timeline delays)

**Mitigation Strategies:**
- Redundant systems and failover procedures
- Regular backups and disaster recovery testing
- Comprehensive documentation and knowledge transfer
- Change management processes
- Quality assurance and testing protocols

**Business Continuity Requirements:**
- 99.9% uptime SLA for critical systems
- 4-hour recovery time objective (RTO)
- 1-hour recovery point objective (RPO)
- 24/7 monitoring and support capabilities
- Incident escalation procedures

**Documentation Requirements:**
- Risk register with mitigation plans
- Business continuity plan
- Disaster recovery procedures
- Incident response playbooks
- Regular testing and validation records`
        },
        description: 'Risk management and business continuity compliance requirements',
        industry: 'Healthcare',
        created_by: 'system'
    },
    {
        content_id: 'timeline_capacity_compliance',
        content_type: 'compliance_rules',
        title: 'Timeline and Capacity Compliance',
        content_data: {
            content: `Timeline and Capacity Compliance Rules:

**Timeline Validation:**
- Minimum 6-month timeline for EHR implementations
- 12-18 months for complex multi-system integrations
- Include 20% buffer time for unexpected issues
- Account for client review and approval cycles
- Consider regulatory approval timelines

**Capacity Constraints:**
- Maximum 3 concurrent major implementations
- Team allocation based on project complexity
- Resource planning for peak demand periods
- Cross-training requirements for team redundancy

**Milestone Requirements:**
- Discovery and assessment: 4-6 weeks
- Solution design and architecture: 6-8 weeks
- Development and configuration: 12-16 weeks
- Testing and validation: 4-6 weeks
- Training and go-live: 2-4 weeks
- Post-implementation support: 12 weeks

**Risk Factors:**
- Client availability and responsiveness
- System complexity and integration requirements
- Regulatory approval processes
- Third-party vendor dependencies
- Scope changes and additional requirements`
        },
        description: 'Timeline and capacity compliance rules for project delivery',
        industry: 'Healthcare',
        created_by: 'system'
    }
];

const allKnowledgeData = [...businessContextData, ...templateData, ...complianceRulesData];

async function seedKnowledgeBase() {
    console.log('🌱 Seeding Knowledge Base with Business Context Data...');
    console.log(`📊 Table: ${TABLE_RFP_KNOWLEDGE_BASE}`);

    try {
        let successCount = 0;
        let errorCount = 0;

        for (const item of allKnowledgeData) {
            try {
                const timestamp = new Date().toISOString();
                const knowledgeItem = {
                    ...item,
                    created_at: timestamp,
                    updated_at: timestamp
                };

                await docClient.send(new PutCommand({
                    TableName: TABLE_RFP_KNOWLEDGE_BASE,
                    Item: knowledgeItem
                }));

                console.log(`✅ Added: ${item.title}`);
                successCount++;

            } catch (error) {
                console.error(`❌ Failed to add ${item.title}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📈 Seeding Complete!');
        console.log(`✅ Successfully added: ${successCount} items`);
        if (errorCount > 0) {
            console.log(`❌ Failed: ${errorCount} items`);
        }

        console.log('\n🔍 Knowledge Base now contains:');
        console.log('   • Service regions and coverage');
        console.log('   • Current capacity and workload');
        console.log('   • Healthcare experience and certifications');
        console.log('   • Project timelines and pricing guidelines');
        console.log('   • Team size and specialties');
        console.log('   • Response templates for all RFP sections');
        console.log('   • Executive summary, company overview, and solution templates');
        console.log('   • Timeline, team qualifications, and pricing templates');
        console.log('   • HIPAA compliance requirements and healthcare standards');
        console.log('   • Risk management and business continuity rules');
        console.log('   • Timeline and capacity compliance guidelines');

        console.log('\n🤖 AI agents can now make informed decisions using this business context!');

    } catch (error) {
        console.error('💥 Error seeding knowledge base:', error);
        process.exit(1);
    }
}

// Run the seeding
if (require.main === module) {
    seedKnowledgeBase();
}

module.exports = { seedKnowledgeBase, businessContextData, templateData, complianceRulesData, allKnowledgeData };
