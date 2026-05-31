const admin = require('firebase-admin');


class Notification {

    async sendNotificationToTopic(topic, title, body){
        const message = {
          notification: {
            title: title,
            body: body,
          },
          topic: topic,
        };
      
        try {
          await admin.messaging().send(message);
        } catch (error) {
          console.error("Error sending message:", error);
        }
    }; 

    async getAccessToken() {
      try {
        // Get the credential from the initialized app
        const credential = admin.credential.applicationDefault();
        
        // If using a service account explicitly, use the cert directly
        const authCredential = admin.app().options.credential;
        const token = await authCredential.getAccessToken();
        
        console.log('Access Token:', token.access_token);
        return token.access_token;
      } catch (error) {
        console.error('Error retrieving access token:', error);
        throw error;
      }
    }


}

module.exports = Notification
