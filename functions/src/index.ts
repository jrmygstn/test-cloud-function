import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp(functions.config().firebase);

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("What's up Bu!?");
// });

// Listening for new messages
exports.sendMessageNotification = functions.database
    .ref("/Users/{receiversID}/Messages/{sendersID}/Message/{messageID}")
    .onWrite(async (change, context) => {
      const receiversID = context.params.receiversID;
      const sendersID = context.params.sendersID;
      functions.logger.log(
          "You have a new message from:",
          sendersID,
          "for user:",
          receiversID
      );
      // Get the device notification token.
      const getDeviceTokenPromise = admin.database()
          .ref("/Users/{receiversID}/fcmToken").once("value");

      // Get the receiver's profile
      const getReceiversProfilePromise = admin.auth()
          .getUser(receiversID);

      const results = await Promise.all([getDeviceTokenPromise,
        getReceiversProfilePromise]);
      const registrationToken = results[0];
      const sender = results[1];

      functions.logger.log(
          // "Here's your registration token instead", registrationToken
          results
      );

      // Check if there is a device token.
      if (!registrationToken.hasChild) {
        return functions.logger.log(
            "There is no notification token to send to."
        );
      }

      functions.logger.log(
          "Fetch sender's profile", sender
      );

      // Notification details.
      const payload = {
        notification: {
          title: "You have a new message!",
          body: "${sender.displayName} sent you a new message.",
          badge: "1",
        },
      };

      functions.logger.log(
          "Here's the payload info", payload
      );

      // Listing token.
      const token = Object.keys(registrationToken.val());

      functions.logger.log(
          "Here's the token info", token
      );

      // Send notification to the token.
      const response = await admin.messaging()
          .sendToDevice(token, payload);
      // Check if there was an error with the message.
      const tokenToRemove: readonly any[] = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          functions.logger.log(
              "Failure sending notification to",
              token[index],
              error
          );
        }
      });
      return Promise.all(tokenToRemove);
    });
