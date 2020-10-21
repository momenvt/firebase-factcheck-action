const functions = require('firebase-functions');
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
    functions.logger.info("Recieved query: "+ query, {structuredData: true});
    factchecktools.claims.search({
        languageCode: 'en-US',
        query: query
    }).then(res => { 
        console.log(res);
        if(res.claims.length > 0){
            let result = pre_text + res.claims[0].text + by_text + res.claims[0].claimant + which_is + res.claims[0].claimReview[0].textualRating;
            conv.add(result);
        }else{
            conv.add("Could not find any result for this query");
        }
        return 0;
    }).catch(res => {
        functions.logger.error(res, {structuredData: true});
        conv.add("An error occurred");
    });
});

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
