// ## Pseudocode

// - User picks a wiki to search (for MVP, there is only one option)
// - User enters search text
// - User submits search text
// * - Send a 'query' request to the API endpoint, pass along the search text
// * - API returns JSON listing the matching pages
// * - Display a list of matching pages
// * - User clicks a page name from the list
// * - Store the clicked page's name
// * - Send a 'parse' request to the API endpoint, pass along the page name
// * - API returns page data as JSON, including the HTML for the page
// - Process/sanitize the HTML in some way (there is a lot of junk in there)
//   * - get h1 (document title)
//   - get page content inside div#bodyContent
//   - Ryan suggests using regex to clean up HTML
// - Display the sanitized HTML in the content area
// - User can click an X in the corner to close article/results and return to the search page

// Create app namespace
const superwiki = {};

// Working API Endpoint
// const endpoint = 'https://performancewiki.ca/api.php';
// const endpoint = 'https://indieweb.org/wiki/api.php';
const endpoint = 'https://en.wikipedia.org/w/api.php';
// const endpoint = 'https://bulbapedia.bulbagarden.net/w/api.php';

superwiki.events = function() {
    // Listen for when a search result link is clicked
    $('.search-results').on('click', 'a', function() {
        const clickedPage = $(this).text();
        superwiki.getPage(endpoint, clickedPage);
    }); 
}

superwiki.search = function(endpointURL, queryText) {
    $.ajax({
        url: 'http://proxy.hackeryou.com',
        method: 'GET',
        dataType: 'json',
        data: {
            reqUrl: endpointURL,
            params: {
                action: 'query',
                format: 'json',
                list: 'search',
                srsearch: queryText,
                srwhat: 'text'
            },
            xmlToJSON: false
        }
    }).then(response => {
        superwiki.displayResults(response);
    });
}

superwiki.displayResults = function(resultsObject) {
    const results = resultsObject.query.search;
    console.log(results);
    results.forEach(hit => {
        // Create elements
        const listItem = $('<li>');
        const link = $('<a>').attr('href', '#').text(hit.title);
        const snippet = $('<p>').html(hit.snippet);
        // Put elements together and display
        listItem.append(link, snippet);
        $('.search-results').append(listItem);
    });
}

superwiki.getPage = function(endpointURL, pageTitle) {
    $.ajax({
        url: 'http://proxy.hackeryou.com',
        method: 'GET',
        dataType: 'json',
        data: {
            reqUrl: endpointURL,
            params: {
                action: 'parse',
                format: 'json',
                page: pageTitle
            },
            xmlToJSON: false
        }
    }).then(response => {
        superwiki.displayArticle(response);
    });
}

superwiki.displayArticle = function(resultsObject) {
    $('.article').empty();
    const articleTitle = $('<h1>').html(resultsObject.parse.displaytitle);
    const articleHTML = resultsObject.parse.text['*'];
    $('.article').append(articleTitle, articleHTML);
}

superwiki.init = function() {
    superwiki.events();
    superwiki.search(endpoint, 'outside the march');
}

$(function(){
    superwiki.init();
});