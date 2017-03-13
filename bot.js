//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const Mustache = require('mustache');
const contentTemplate = require('./templates/content');
const Firebase = new require('./firebase')();

Firebase.init();
// The rest of the code implements the routes for our Express server.


let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Webhook validation
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }
});

// Display the web page
app.get('/', function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(fs.readFileSync('./templates/index.html', 'utf8'));
  res.end();
});

app.post('/notifyusers', function (req, res) {
    console.log(req.body);
    var data = req.body;

    if (data.object === 'page') {
      console.log('xxxxxxx: ', data);
    }

    res.sendStatus(200);
});

// Message processing
app.post('/webhook', function (req, res) {
  console.log(req.body);
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {
    
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else if (event.postback) {
          receivedPostback(event);   
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

// Incoming events handling
// var melissa = "100007352556474";
// var tim = "10100621626986695";
// // var vincent = "10155073658881532";
// var vincent = "1292253867476452"; //
// // var chris = "10155471735122971";
// var chris = "1414479738602901"; //

// var admins = [vincent];

// var ALL_SENDERS = [];

function receivedMessage(event) {
  // var senderID = event.sender.id;
  // ALL_SENDERS.push(senderID);
  // if (senderID === melissa) {console.info('Hi Melissa!')}
  // var recipientID = event.recipient.id;
  // var timeOfMessage = event.timestamp;
  const message = event.message;
  const sender = event.sender;
  const recipient = event.recipient;
  const ts = event.timestamp;
  const OPT_IN_TRIGGER = 'Opt in';
  const ADD_LOCATION_TRIGGER = 'Add location';

  const availableCommands = 'Availble Commands:\n\n' 
    + '"Opt in" \n\n'
    + '"Add location" \n\n';

  console.log("Received message for user %d and page %d at %d with message:", 
    sender.id, recipient.id, ts);
  console.log(JSON.stringify(message));

  var messageId = message.mid;
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {
    switch (true) {
      case (OPT_IN_TRIGGER === messageText):
          Firebase.userOptIn(sender.id, ts)
            .then(function() {
              sendTextMessage(sender.id, 'You are opted in. Thanks!');
            }).catch(function() {
              sendTextMessage(sender.id, 'Sorry. An error occured.');
            });
          break;

      case (messageText.indexOf(ADD_LOCATION_TRIGGER) === 0):
        // add location 


        //parse message
        break;


      // case 'trigger!':
      //   admins.forEach(function(id) {sendMessage(id, 'This is a spam message');})
      //   break;
      // case 'hi to melissa':
      //   sendMessage(melissa, "Hiiiiii!")
      //   break;
        
      // case 'generic':
      //   sendMessage(senderID);
      //   break;

      default:
        sendTextMessage(sender.id, availableCommands);
    }
  } else if (messageAttachments) {
    //handleLocationPlot

    // {"mid":"mid.1489301909809:341fcfcb85","seq":3639,"attachments":[{"title":"Vincent's Location","url":"https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.bing.com%2Fmaps%2Fdefault.aspx%3Fv%3D2%26pc%3DFACEBK%26mid%3D8100%26where1%3D40.588296%252C%2B-74.458175%26FORM%3DFBKPL1%26mkt%3Den-US&h=ATOGp5Hz6F9DxD2x1W0hKK8yEGSns4iy_SKGjxMhQh5Uvc53u09u_0hdI2_qaYYCeu55TN_d2lHmn7gCOXAZdJY5hp8gfbC-4Mw6HlkqUI75&s=1&enc=AZNxOVS6D_Dyl5PGsXEyMUIayWa0dF8z9_Epyn0xqVJkj3xsh5AqG2S95eWp_ALY9Jq6NgpsiU8Jqm34bUOg4V7S","type":"location","payload":{"coordinates":{"lat":40.588296,"long":-74.458175}}}]}
    if (messageAttachments) {
      const coordinates = messageAttachments[0].payload.coordinates;

      if (coordinates.lat && coordinates.long) {
        Firebase.addLocation(sender.id, {coordinates: coordinates, ts: ts})
          .then(function() {
            sendTextMessage(sender.id, 'Location Added.');
          }).catch(function() {
            sendTextMessage(sender.id, 'Sorry. Unable to add location.');
          });
      } else {
        sendTextMessage(sender.id, 'Apologies! Unable to add location.');
      }
    }

    // sendTextMessage(senderID, "Message with attachment received");
  }
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  sendTextMessage(senderID, "Postback called");
}

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function sendMessage(recipientId, template, params) {
  var messageDate = {
    recipient: {
      id: recipientId
    },
    message: Mustache.render(template, params)
  }

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error('>>> resp', response);
      console.error('>>> err', error);
    }
  });  
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});
