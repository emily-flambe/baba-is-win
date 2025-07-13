// Quick test to diagnose Gmail API issue
const TEST_EMAIL = "emily.cogsdill@demexchange.com";

async function testGmailAPI() {
    try {
        console.log('Testing Gmail API connection...');
        
        // Test endpoint call
        const response = await fetch('https://personal.emily-cogsdill.workers.dev/api/admin/test-email', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer 27dc2709f1ca0de1fa66c0be0a3d2effc9bba93a5d53acec473eb06374dacb6a',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: TEST_EMAIL,
                subject: 'Gmail API Test',
                content: 'Testing Gmail API connectivity'
            })
        });
        
        const result = await response.text();
        console.log('Response status:', response.status);
        console.log('Response:', result);
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testGmailAPI();