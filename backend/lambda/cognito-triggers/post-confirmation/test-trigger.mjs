export const handler = async (event) => {
    console.log('=== POST CONFIRMATION TRIGGER TEST ===');
    console.log('Event received:', JSON.stringify(event, null, 2));

    // Always return the event (required for Cognito triggers)
    return event;
};
