// Copyright 2017 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const winston = require('winston');
// Imports the Google Cloud client library for Winston
const {LoggingWinston} = require('@google-cloud/logging-winston');
const loggingWinston = new LoggingWinston();
// Create a Winston logger that streams to Stackdriver Logging
// Logs will be written to: "projects/YOUR_PROJECT_ID/logs/winston_log"
const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    // Add Stackdriver Logging
    loggingWinston,
  ],
});

// [START gae_node_request_example]
const express = require('express');
const bodyParser = require('body-parser');

const expressapp = express();

const {google} = require('googleapis');
const {conversation} = require('@assistant/conversation');

const fact_check_api_key = "AIzaSyAAC6Lkl9p5-qH-N5EiohraCw2hv8tuQjI";
const factchecktools = google.factchecktools({version: 'v1alpha1', auth: fact_check_api_key});

const pre_text = "I found a claim that ";
const by_text = " by ";
const which_is = "which seems to be ";

const app = conversation();

app.handle('fact_check', conv => {
    const query = conv.intent.params.query.resolved;
    logger.info("Recieved query: "+ query);
    factchecktools.claims.search({
        languageCode: 'en-US',
        query: query
    }).then(res => {
        console.log(res);
        if(res !== undefined && res.claims !== undefined && res.claims.length > 0 && res.claims[0].claimReview[0].length > 0){
            let result = pre_text + res.claims[0].text + by_text + res.claims[0].claimant + which_is + res.claims[0].claimReview[0].textualRating;
            conv.add(result);
        }else{
            conv.add("Could not find any result for this query");
        }
        return 0;
    }).catch(err => {
        logger.error(err);
        conv.add("An error occurred during the API request");
    });
});

app.catch((conv, error) => {
    console.error(error);
    conv.add('I encountered a glitch. Can you say that again?');
});

const PORT = process.env.PORT || 8080;
expressapp.use(bodyParser.json(), app).listen(PORT);
module.exports = expressapp;
