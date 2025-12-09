const https = require('https');

// GoDaddy API Credentials
const API_KEY = '9EGHhrKJw6L_FWThWX69mjbwgyekWH2GJn';
const API_SECRET = 'EXCDoWzdxjv1y9Sw8UTDTY';

const DOMAIN = 'oraclechains.com';
const RAILWAY_TARGET = 'vrfy-presale-production.up.railway.app';

function makeGoDaddyRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.godaddy.com',
            path: path,
            method: method,
            headers: {
                'Authorization': `sso-key ${API_KEY}:${API_SECRET}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body || '{}'));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    reject({ statusCode: res.statusCode, body: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function testAndAddDNS() {
    console.log('Testing GoDaddy API connection...');

    // First test: list domains
    try {
        const domains = await makeGoDaddyRequest('/v1/domains?limit=5');
        console.log('✅ API connected! Found domains:', domains.map(d => d.domain).join(', '));
    } catch (error) {
        console.error('❌ API test failed:', error);
        return;
    }

    console.log(`\nAdding DNS records for ${DOMAIN} → ${RAILWAY_TARGET}`);

    try {
        // Add CNAME for www
        const wwwRecord = [{
            data: RAILWAY_TARGET,
            ttl: 600
        }];

        await makeGoDaddyRequest(
            `/v1/domains/${DOMAIN}/records/CNAME/www`,
            'PUT',
            wwwRecord
        );
        console.log('✅ Added CNAME record: www → ' + RAILWAY_TARGET);

        // For root domain (@), add A record
        const railwayIPs = ['34.111.207.238'];

        const aRecords = railwayIPs.map(ip => ({
            data: ip,
            ttl: 600
        }));

        await makeGoDaddyRequest(
            `/v1/domains/${DOMAIN}/records/A/@`,
            'PUT',
            aRecords
        );
        console.log('✅ Added A record: @ → ' + railwayIPs.join(', '));

        console.log('\n✨ DNS records added!');
        console.log('Now add oraclechains.com in Railway dashboard under Networking.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testAndAddDNS();
