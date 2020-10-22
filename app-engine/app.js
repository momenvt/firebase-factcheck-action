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

// imports
const winston = require('winston');
const {LoggingWinston} = require('@google-cloud/logging-winston');
const express = require('express');
const bodyParser = require('body-parser');
const {google} = require('googleapis');
const {conversation} = require('@assistant/conversation');

// logger setup
const loggingWinston = new LoggingWinston();
const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    loggingWinston,
  ],
});


// server initiate
const expressapp = express();

// global const
const api_key = "AIzaSyAAC6Lkl9p5-qH-N5EiohraCw2hv8tuQjI";
const pre_text = "I found a claim that ";
const by_text = " by ";
const which_is = " rated this as ";
const sent_end = ". ";
const not_reviewed="However, this claim has not been reviewed by any fact-checker yet.";
const not_found = "Could not find any result for this query";
const apicode_error= "An error occurred during the API request";
const app_glitch = 'I encountered a glitch. Can you say that again?';
// logger const
const related_claims = "Number of related claims: ";
const number_reviews = "Number of review on the first related claim: ";


// API setup
const factchecktools = google.factchecktools({version: 'v1alpha1', auth: api_key});
const app = conversation();

// fact_check handler
app.handle('fact_check', conv => {
    const query = conv.intent.params.query.resolved;
    logger.info("Recieved query: "+ query);
    return factchecktools.claims.search({
        languageCode: 'en-US',
        query: query
    }).then(res => {
        if(res.data.claims !== undefined && res.data.claims.length > 0){
            logger.info(related_claims + res.data.claims.length);
            logger.info(JSON.stringify(res.data.claims[0]));
            var claim_text = pre_text + res.data.claims[0].text + by_text + res.data.claims[0].claimant + sent_end;
            if(res.data.claims[0].claimReview !== undefined && res.data.claims[0].claimReview.length > 0){
                logger.info(number_reviews + res.data.claims[0].claimReview.length);
                claim_text += res.data.claims[0].claimReview[0].publisher.name + which_is + res.data.claims[0].claimReview[0].textualRating + sent_end;
            }else{
                claim_text += not_reviewed;
            }
            conv.add(claim_text);
        }else{
            logger.error(JSON.stringify(res));
            conv.add(not_found);
        }
    }).catch(err => {
        logger.error(JSON.stringify(err));
        conv.add(apicode_error);
    });
});

// error
app.catch((conv, error) => {
    logger.error(JSON.stringify(error));
    conv.add(app_glitch);
});

// server start
const PORT = process.env.PORT || 8080;
expressapp.use(bodyParser.json(), app).listen(PORT);
module.exports = expressapp;
