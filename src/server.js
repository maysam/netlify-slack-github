const express = require("express");
const bodyParser = require("body-parser");
const fauna = require("faunadb");
const serverless = require("serverless-http");
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
  res.json({ hello: "world" });
});
router.post("/test", async (req, res) => {
  const text = req.body.text;
  console.log(`Input text: ${text}`);
  let answers = text.split(",");
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
});


module.exports.handler = serverless(app);
