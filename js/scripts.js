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
// * - User can click an X in the corner to close article/results and return to the search page

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
        anywiki.searchWikiURL = $('#search-endpoint').val();
        anywiki.resultsViewed = 0;
        anywiki.getEndpoint(anywiki.searchWikiURL);
    });

    // Listen for a click on the modal 'Close' link
    $('.close-modal').on('click', function(event) {
        event.preventDefault();
        anywiki.closeModal();
    });

    // Listen for a click on the 'Back to results' link
    $('.modal-content').on('click', '.back-to-results', function(event) {
        event.preventDefault();
        console.log('going back');
        anywiki.backToResults();
    });
    
    // Listen for when a search result link is clicked
    $('.modal-content').on('click', '.search-results a', function(event) {
        event.preventDefault();
        anywiki.selectedPage = $(this).text();
        anywiki.currentResults = $('.modal-content').html();
        anywiki.getPage(anywiki.endpoint, anywiki.selectedPage);
    });

    // Listen for a click on the "Next" link for more search results
    $('.modal-content').on('click', '.next-results', function(event) {
        event.preventDefault();
        anywiki.search(anywiki.endpoint, anywiki.searchText, anywiki.resultsViewed);
    });

    // Listen for a click on the "Previous" link for previous search results
    $('.modal-content').on('click', '.previous-results', function(event) {
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
    const searchSummary = `<em>"${anywiki.searchText}"</em> on <span class="user-wiki-url">${anywiki.searchWikiURL}</span>`;
    const resultsHeading = $('<h1>').addClass('results-heading').html(searchSummary);

    const results = resultsObject.query.search;

    if (results.length === 0) {
        // If there are NO hits...
        const noHitsMessage = $('<p>').addClass('no-results').text(`Oops! There are no matching pages on ${anywiki.searchWikiURL}. Try adjusting your search terms.`);
        $('.modal-content').append(noHitsMessage);
    } else {
        // If there ARE hits...
        const resultsList = $('<ul>').addClass('search-results');
    
        results.forEach(hit => {
            // Create elements
            const listItem = $('<li>');
            const link = $('<a>').attr('href', '#').text(hit.title);
            const snippet = $('<p>').html(hit.snippet);
            // Put elements together and display
            listItem.append(link, snippet);
            resultsList.append(listItem);
    
            anywiki.resultsViewed = anywiki.resultsViewed += 1;
        });
    
        // Update pagination links
        
        const resultsNav = $('<nav>').addClass('results-nav');
        
        if (anywiki.resultsViewed > anywiki.resultsPerPage) {
            const previousLink = $('<a>').attr('href', '#').addClass('previous-results').text('Previous');
            resultsNav.append(previousLink);
        }
        if (anywiki.resultsViewed % anywiki.resultsPerPage === 0) {
            const nextLink = $('<a>').attr('href', '#').addClass('next-results').text('Next');
            resultsNav.append(nextLink);
        }
    
        // Add results list and nav to the page
        $('.modal-content').empty();
        $('.modal-content').append(resultsHeading, resultsList, resultsNav);
    }

    // Move the modal on screen
    $('.close-modal').css('display', 'block');
    $('.modal').addClass('modal-padding');
    $('.modal').addClass('modal-active');

    // Reset scroll to top of window
    $(window).scrollTop(0);
}

anywiki.backToResults = function() {
    $('.modal-content').html(anywiki.currentResults);
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
    // Create the article element
    const articleElement = $('<article>').addClass('article');

    // Create the back to results link and add it to the element
    const backIcon = '<i class="fa fa-arrow-left"></i>';
    const backLink = $('<a>').addClass('back-to-results').attr('href', '#').html(`${backIcon}&nbsp;Back to results`);
    articleElement.append(backLink);

    // Create the title and add it to the element
    const articleTitle = $('<h1>').text(anywiki.selectedPage);
    articleElement.append(articleTitle);

    // Store the HTML for processing
    let articleHTML = htmlString;

    // Fix links and image sources that start with '//' instead of 'http://' 
    const badHref = /href=["']\/\//g;
    const badSrc = /src=["']\/\//g;
    articleHTML = articleHTML.replace(badHref, 'href="http://');
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

    // If there are images, add an image carousel to the article element
    if (imageArray) {
        // Build image carousel
        const carousel = $('<div>').addClass('carousel');
        imageArray.forEach(image => {
            const carouselItem = $('<div>').addClass('carousel-cell');
            carouselItem.append($('<img>').attr('src', image));
            carousel.append(carouselItem);
        });
        articleElement.append(carousel);
    }

    // Remove inline styles and tables from article HTML, then add it to the article element
    articleHTML = DOMPurify.sanitize(articleHTML, {
        SAFE_FOR_JQUERY: true,
        FORBID_TAGS: ['table', 'style', 'img', 'sup'],
        FORBID_ATTR: ['style'],
        KEEP_CONTENT: false
    });
    articleHTML = $('<div>').addClass('article-body').html(articleHTML);
    articleElement.append(articleHTML);

    // Empty container and display the article
    $('.modal-content').empty();
    $('.modal-content').append(articleElement);

    // Initialize Flickity for image carousel
    $('.carousel').flickity({
        cellAlign: 'center',
        imagesLoaded: true,
        wrapAround: true
    });
}

anywiki.closeModal = function() {
    $('.modal').removeClass('modal-active');
    setTimeout(() => {
        $('.modal-content').empty();
        $('.modal').removeClass('modal-padding');
        $('.close-modal').css('display', 'none');
    }, 500); // Timing corresponds to modal transition time for 'top' property in _modal.scss
}

anywiki.init = function() {
    anywiki.events();
    anywiki.resultsPerPage = 10;
}

$(function(){
    anywiki.init();
});