const express = require("express");
const bodyParser = require("body-parser");
const fauna = require("faunadb");
const serverless = require("serverless-http");
const { IncomingWebhook } = require('@slack/webhook');
const url = 'https://hooks.slack.com/services/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'
const webhook = new IncomingWebhook(url);
const q = fauna.query;
const client = new fauna.Client({
 secret: "fnAD6mxZS4ACDSpAaYAAtS-xHQ4S2--7zCCPPssX",
});
const format = (answers) => {
  if (answers.length == 0) {
    answers = ["No answers found"];
  }

  let formatted = {
    blocks: [],
  };

  for (answer of answers) {
    formatted["blocks"].push({
      type: "divider",
    });
    formatted["blocks"].push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: answer,
      },
    });
  }

  return formatted;
 };

const app = express();

const router = express.Router();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/.netlify/functions/server", router);

router.get("/test", (req, res) => {
  webhook.send({
    "type": "home",
    "blocks": [{
    "type": "actions",
    "elements": [
      {
        "type": "radio_buttons",
        "options": [
          {
            "text": {
              "type": "plain_text",
              "text": "*this is plain_text 0*",
              "emoji": true
            },
            "value": "value-0"
          },
          {
            "text": {
              "type": "plain_text",
              "text": "*this is plain_text 1*",
              "emoji": true
            },
            "value": "value-1"
          },
          {
            "text": {
              "type": "plain_text",
              "text": "*this is plain_text 2*",
              "emoji": true
            },
            "value": "value-2"
          }
        ],
        "action_id": "actionId-0"
      }
    ]
  }]})
  res.json({ hello: "world", body: req.body });
});

router.post("/adduser", async (req, res) => {
  const text = req.body.text
  var createP = client.query(
    q.Create(q.Collection('users'), { data: {
      username: text,
      team_id: req.body.team_id,
      channel_id: req.body.channel_id,
      user_id: req.body.user_id,
      api_app_id: req.body.api_app_id,
      response_url: req.body.response_url
    } })
  )
  await createP.then(function(response) {
    console.log(response.ref) // Would log the ref to console.
    res.status(201).send(text + " stored in the database")
  }).catch(error => {
    console.log(error.description)
    res.send(error.description)
  })
})

router.post("/addrepo", async (req, res) => {
  const text = req.body.text
  var createP = client.query(
    q.Create(q.Collection('repositories'), { data: {
      name: text,
      team_id: req.body.team_id,
      channel_id: req.body.channel_id,
      user_id: req.body.user_id,
      api_app_id: req.body.api_app_id,
      response_url: req.body.response_url
    }})
  )
  await createP.then(function(response) {
    console.log(response.ref) // Would log the ref to console.
    res.status(201).send(text + " stored in the database")
  }).catch(error => {
    console.log(error.description)
    res.send(error.description)
  })
})

router.post("/test", async (req, res) => {
  console.log(req.body)
  if(req.body.payload){
    const payload = JSON.parse(req.body.payload)
    console.log(payload.message)
    const response_url = payload.response_url
    console.log(payload && payload.actions[0].selected_option)
    const response_webhook = new IncomingWebhook(response_url);
    // response_webhook.send({
    //   text: payload.actions[0].selected_option.value + " chosen"
    // })
    response_webhook.send({
      text: payload.actions[0].selected_option.text.text
    })
    res.status(200).end();
  } else {
    const text = req.body.text
    const response_url = req.body.response_url
    const response_webhook = new IncomingWebhook(response_url);
    response_webhook.send({
      text: "Received: " + text
    })

    console.log(`Input text: ${text}`);
    let answers = text.split(",")
    const searchText = async (text) => {
      console.log("Beginning searchText");
      const answer = await client.query(
        q.Paginate(q.Match(q.Index("answers_by_question"), text))
      );
      console.log(`searchText response: ${answer.data}`);
      return answer.data;
    };

    const getTokenResponse = async (text) => {
      console.log("Beginning getTokenResponse");
      let answers = [];
      const questionTokens = text.split(/[ ]+/);
      console.log(`Tokens: ${questionTokens}`);
      for (token of questionTokens) {
        const tokenResponse = await client.query(
          q.Paginate(q.Match(q.Index("answers_by_qTokens"), text))
        );
        answers = [...answers, ...tokenResponse.data];
      }
      console.log(`Token answers: ${answers}`);
      return answers;
    };
    await searchText(text)
    await getTokenResponse(text)
    const formattedAnswers = format(answers);
    res.status(200);
    res.send(formattedAnswers);
  }
});


module.exports.handler = serverless(app);
