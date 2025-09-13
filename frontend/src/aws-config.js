import { Amplify } from 'aws-amplify';

// Configure Amplify
const amplifyConfig = {
    Auth: {
        Cognito: {
            region: import.meta.env.VITE_AWS_REGION,
            userPoolId: import.meta.env.VITE_USER_POOL_ID,
            userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
        }
    },
    API: {
        REST: {
            'pre-professional-tracker': {
                endpoint: import.meta.env.VITE_BASE_API_URL,
                region: import.meta.env.VITE_AWS_REGION,
            }
        }
    }
}

export default amplifyConfig;