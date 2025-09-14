export const handler = async (event) => {
    console.log('Test Lambda Event:', JSON.stringify(event, null, 2));

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Test Lambda executed successfully',
            event: event
        })
    };
};
