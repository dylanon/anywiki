// ## Pseudocode

// - User picks a wiki to search (for MVP, there is only one option)
// - User enters search text
// - User submits search text
// - Send a 'query' request to the API endpoint, pass along the search text
// - API returns JSON listing the matching pages
// - Display a list of matching pages
// - User clicks a page name from the list
// - Store the clicked page's name
// - Send a 'parse' request to the API endpoint, pass along the page name
// - API returns page data as JSON, including the HTML for the page
// - Process/sanitize the HTML in some way (there is a lot of junk in there)
//   - get h1 (document title)
//   - get page content inside div#bodyContent
//   - Ryan suggests using regex to clean up HTML
// - Display the sanitized HTML in the content area
// - User can click an X in the corner to close article/results and return to the search page

// Create app namespace
const superwiki = {};

// Working API Endpoint
// const endpoint = 'https://performancewiki.ca/api.php/';
const endpoint = 'https://en.wikipedia.org/w/api.php';
// const endpoint = 'https://bulbapedia.bulbagarden.net/w/api.php';

superwiki.search = function(endpointURL, queryText) {
    $.ajax({
        url: endpointURL,
        method: 'GET',
        dataType: 'json',
        // headers: { // This makes the browser send a preflight request
        //     'Api-User-Agent': 'superWiki/0.0.1 (https://dylanon.com/; hey@dylanon.com)'
        // },
        data: {
            action: 'query',
            format: 'json',
            origin: '*',
            list: 'search',
            srsearch: queryText,
            srwhat: 'text'
        }
    }).then((searchResults) => {
        console.log(searchResults);
    });
}

superwiki.init = function() {
    console.log('really initialized');
    superwiki.search(endpoint, 'outside the march');
}

$(function(){
    superwiki.init();
});