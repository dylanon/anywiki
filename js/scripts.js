// ## Pseudocode

// * - User picks a wiki to search (for MVP, there is only one option)
// * - User enters search text
// * - User submits search text
// * - Send a 'query' request to the API endpoint, pass along the search text
// * - API returns JSON listing the matching pages
// * - Display a list of matching pages
// * - User clicks a page name from the list
// * - Store the clicked page's name
// * - Send a 'parse' request to the API endpoint, pass along the page name
// * - API returns page data as JSON, including the HTML for the page
// * - Process/sanitize the HTML in some way (there is a lot of junk in there)
//   * - get h1 (document title)
//   * - get page content inside div#bodyContent
//   * - get images 
//   * - Ryan suggests using regex to clean up HTML
// * - Display the sanitized HTML in the content area
// - User can click an X in the corner to close article/results and return to the search page

// Create app namespace
const anywiki = {};

// Working API Endpoint
// const endpoint = 'https://performancewiki.ca/api.php';
// const endpoint = 'https://indieweb.org/wiki/api.php';
const endpoint = 'https://en.wikipedia.org/w/api.php';
// const endpoint = 'https://bulbapedia.bulbagarden.net/w/api.php';

anywiki.events = function() {
    // Listen for a click on the "Search" button
    $('#search-submit').on('click', function(event) {
        event.preventDefault();
        anywiki.searchText = $('#search-text').val();
        const wikiURL = $('#search-endpoint').val();
        anywiki.resultsViewed = 0;
        anywiki.getEndpoint(wikiURL);
    });
    
    // Listen for when a search result link is clicked
    $('.search-results').on('click', 'a', function(event) {
        event.preventDefault();
        anywiki.selectedPage = $(this).text();
        anywiki.getPage(anywiki.endpoint, anywiki.selectedPage);
    });

    // Listen for a click on the "Next" link for more search results
    $('.results-nav').on('click', '.next-results', function(event) {
        event.preventDefault();
        anywiki.search(anywiki.endpoint, anywiki.searchText, anywiki.resultsViewed);
    });

    // Listen for a click on the "Previous" link for previous search results
    $('.results-nav').on('click', '.previous-results', function(event) {
        event.preventDefault();
        // Calculate value for sroffset - location in search results
        if (anywiki.resultsViewed % anywiki.resultsPerPage === 0) {
            anywiki.resultsViewed = anywiki.resultsViewed - anywiki.resultsPerPage * 2;
        } else {
            anywiki.resultsViewed = anywiki.resultsViewed - anywiki.resultsPerPage - (anywiki.resultsViewed % anywiki.resultsPerPage);
        }
        anywiki.search(anywiki.endpoint, anywiki.searchText, anywiki.resultsViewed);
    });
}

anywiki.getEndpoint = function(urlString){
    // Gets the endpoint from the user-inputted URL
    let requestURL = urlString;
    const badStart = /^[^a-zA-z]+/;
    const protocolRegex = /^https?:\/\//;
    const wikipediaRegex = /^(https?:\/\/)*wikipedia\.org/;

    // Replace non-letter characters at start with appropriate protocol
    if (badStart.test(requestURL)) {
        requestURL = requestURL.replace(badStart, 'http://');
    }
    // Add protocol if it's not specified
    if (protocolRegex.test(requestURL) === false) {
        requestURL = 'http://' + requestURL;
    }
    // Redirect Wikipedia home page to English Wikipedia
    if (wikipediaRegex.test(requestURL)) {
        requestURL = requestURL.replace(/wikipedia/, 'en.wikipedia');
    }

    $.ajax({
        url: 'http://proxy.hackeryou.com',
        method: 'GET',
        dataType: 'html',
        data: {
            reqUrl: requestURL,
            xmlToJSON: false
        }
    }).then((response) => {
        // Response is raw HTML of the page
        const regex = /rel=['"]EditURI.*href=['"](.*api\.php)/i;
        const matchArray = response.match(regex);
        // Store the endpoint URL only
        let theEndpoint = matchArray[1];
        // If the URL doesn't start with letters, replace non-letters with 'http://'
        theEndpoint = theEndpoint.replace(badStart, 'http://');
        // Store the endpoint
        anywiki.endpoint = theEndpoint;
        // Do the search
        anywiki.search(anywiki.endpoint, anywiki.searchText);
    });
}

anywiki.search = function(endpointURL, queryText, resultsOffset) {
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
                srlimit: anywiki.resultsPerPage,
                sroffset: resultsOffset,
                srwhat: 'text'
            },
            xmlToJSON: false
        }
    }).then(response => {
        anywiki.displayResults(response);
    });
}

anywiki.displayResults = function(resultsObject) {
    // Empty the results container
    $('.search-results').empty();

    const results = resultsObject.query.search;

    results.forEach(hit => {
        // Create elements
        const listItem = $('<li>');
        const link = $('<a>').attr('href', '#').text(hit.title);
        const snippet = $('<p>').html(hit.snippet);
        // Put elements together and display
        listItem.append(link, snippet);
        $('.search-results').append(listItem);

        anywiki.resultsViewed = anywiki.resultsViewed += 1;
    });

    // Update pagination links
    $('.results-nav').empty();

    if (anywiki.resultsViewed > anywiki.resultsPerPage) {
        const previousLink = $('<a>').attr('href', '#').addClass('previous-results').text('Previous');
        $('.results-nav').append(previousLink);
    }
    if (anywiki.resultsViewed % anywiki.resultsPerPage === 0) {
        const nextLink = $('<a>').attr('href', '#').addClass('next-results').text('Next');
        $('.results-nav').append(nextLink);
    }

}

anywiki.getPage = function(endpointURL, pageTitle) {
    $.ajax({
        url: 'http://proxy.hackeryou.com',
        method: 'GET',
        dataType: 'json',
        data: {
            reqUrl: endpointURL,
            params: {
                action: 'query',
                format: 'json',
                titles: pageTitle,
                prop: 'info',
                inprop: 'url'
            },
            xmlToJSON: false
        }
    }).then(response => {
        const pagesObject = response.query.pages;
        let pageURL = '';
        for (let page in pagesObject) {
            pageURL = pagesObject[page].fullurl;
        }
        anywiki.getContent(pageURL); 
    });
}

anywiki.getContent = function(thePageURL) {
    $.ajax({
        url: 'http://proxy.hackeryou.com',
        method: 'GET',
        dataType: 'html',
        data: {
            reqUrl: thePageURL,
            params: {
                action: 'render'
            },
            xmlToJSON: false
        }
    }).then(response => {
        // Response is a string of HTML
        anywiki.displayArticle(response);
    });
}

anywiki.displayArticle = function(htmlString) {
    const articleTitle = $('<h1>').text(anywiki.selectedPage);
    // Fix links and image sources that start with '//' instead of 'http://' 
    const badHref = /href=["']\/\//g;
    const badSrc = /src=["']\/\//g;
    let articleHTML = htmlString.replace(badHref, 'href="http://');
    articleHTML = articleHTML.replace(badSrc, 'src="http://');

    // Extract image URLs for properly referenced images
    let imageArray = articleHTML.match(/<img.*src=['"]https?:\/\/([^'"]*)\.(jpg|png)/g);
    if (imageArray) {
        imageArray.forEach((image, i) => {
            imageArray[i] = imageArray[i].replace(/<img.*src=['"]/, '');
        });
        console.log(imageArray);
    } else {
        console.log('No properly referenced images to grab.')
    }

    // Remove inline styles and tables from article HTML
    articleHTML = DOMPurify.sanitize(articleHTML, {
        SAFE_FOR_JQUERY: true,
        FORBID_TAGS: ['table', 'style', 'img', 'sup'],
        FORBID_ATTR: ['style'],
        KEEP_CONTENT: false
    });

    // Empty and display
    $('.article').empty();
    $('.article').append(articleTitle);
        if (imageArray) {
            // Build image carousel
            const carousel = $('<div>').addClass('carousel');
            imageArray.forEach(image => {
                const carouselItem = $('<div>').addClass('carousel-cell');
                carouselItem.append($('<img>').attr('src', image));
                carousel.append(carouselItem);
            });
            $('.article').append(carousel);
            $('.carousel').flickity({
                cellAlign: 'center',
                imagesLoaded: true,
                wrapAround: true
            });
        }
    $('.article').append(articleHTML);
}

anywiki.init = function() {
    anywiki.events();
    anywiki.resultsPerPage = 10;
}

$(function(){
    anywiki.init();
});