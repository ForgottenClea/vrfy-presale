const https = require('https');

const RAILWAY_TOKEN = 'fe9c40ff-8b2a-4d73-96f5-c33f2ea89377';
const DOMAIN = 'oraclechains.com';

function railwayQuery(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query, variables });

        const options = {
            hostname: 'backboard.railway.app',
            path: '/graphql/v2',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RAILWAY_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    if (result.errors) {
                        reject(result.errors);
                    } else {
                        resolve(result.data);
                    }
                } catch (e) {
                    reject(body);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    console.log('Connecting to Railway API...\n');

    // Step 1: List all projects to find vrfy-presale
    console.log('Step 1: Finding vrfy-presale project...');
    const projectsQuery = `
        query {
            me {
                projects {
                    edges {
                        node {
                            id
                            name
                            services {
                                edges {
                                    node {
                                        id
                                        name
                                    }
                                }
                            }
                            environments {
                                edges {
                                    node {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    try {
        const projects = await railwayQuery(projectsQuery);

        let targetProject = null;
        let targetService = null;
        let targetEnvironment = null;

        for (const edge of projects.me.projects.edges) {
            const project = edge.node;
            console.log(`  Found project: ${project.name} (${project.id})`);

            if (project.name.toLowerCase().includes('vrfy') || project.name.toLowerCase().includes('presale')) {
                targetProject = project;

                // Get first service
                if (project.services.edges.length > 0) {
                    targetService = project.services.edges[0].node;
                    console.log(`    Service: ${targetService.name} (${targetService.id})`);
                }

                // Get production environment
                for (const envEdge of project.environments.edges) {
                    const env = envEdge.node;
                    console.log(`    Environment: ${env.name} (${env.id})`);
                    if (env.name.toLowerCase() === 'production') {
                        targetEnvironment = env;
                    }
                }
                if (!targetEnvironment && project.environments.edges.length > 0) {
                    targetEnvironment = project.environments.edges[0].node;
                }
            }
        }

        if (!targetProject || !targetService || !targetEnvironment) {
            console.log('\n❌ Could not find vrfy-presale project/service');
            console.log('Available projects:');
            for (const edge of projects.me.projects.edges) {
                console.log(`  - ${edge.node.name}`);
            }
            return;
        }

        console.log(`\n✅ Found target:`);
        console.log(`   Project: ${targetProject.name}`);
        console.log(`   Service: ${targetService.name}`);
        console.log(`   Environment: ${targetEnvironment.name}`);

        // Step 2: Add custom domain
        console.log(`\nStep 2: Adding custom domain ${DOMAIN}...`);

        const addDomainMutation = `
            mutation customDomainCreate($input: CustomDomainCreateInput!) {
                customDomainCreate(input: $input) {
                    id
                    domain
                    status {
                        dnsRecords {
                            fqdn
                            purpose
                            recordType
                            recordValue
                        }
                    }
                }
            }
        `;

        const domainResult = await railwayQuery(addDomainMutation, {
            input: {
                domain: DOMAIN,
                environmentId: targetEnvironment.id,
                serviceId: targetService.id
            }
        });

        console.log('✅ Domain added to Railway!');
        console.log('   Domain:', domainResult.customDomainCreate.domain);
        console.log('   DNS Records needed:');

        for (const record of domainResult.customDomainCreate.status.dnsRecords) {
            console.log(`     ${record.recordType} ${record.fqdn} → ${record.recordValue}`);
        }

        // Step 3: Also add www subdomain
        console.log(`\nStep 3: Adding www.${DOMAIN}...`);

        const wwwResult = await railwayQuery(addDomainMutation, {
            input: {
                domain: `www.${DOMAIN}`,
                environmentId: targetEnvironment.id,
                serviceId: targetService.id
            }
        });

        console.log('✅ www domain added!');

        console.log('\n✨ Done! SSL certificates will be provisioned automatically.');
        console.log('   Wait 2-5 minutes for SSL to activate.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
