/* 
 * anyWiki: Search any wiki
 * Conceptualized, built, and designed by Dylan On
 * https://dylanon.com
 */

// ## Pseudocode

// * - User picks a wiki to search (for MVP, there is only one option)
// * - User enters search text
// * - User submits search text
// * - Send a 'query' request to the API endpoint, pass along the search text
// * - API returns JSON listing the matching pages
// * - Display a list of matching pages
// * - Pagination needs to function (each new page is a new search request to the endpoint)
// * - User clicks a page name from the list
// * - Store the clicked page's name
// * - Send a request with the page name to get the page URL
// * - Send a request with the page URL to get the content HTML
// * - API returns page content as HTML
// * - Process/sanitize the HTML in some way (there is a lot of junk in there)
//   * - get h1 (document title)
//   * - get page content inside div#bodyContent
//   * - get images 
// * - Display the sanitized HTML in the content area
// * - User can click an X in the corner to close article/results and return to the search page

// Create app namespace
const anywiki = {};

anywiki.events = function() {
    // Listen for a change in the wiki URL input
    $('#search-endpoint').on('change', function() {
        $('.wiki-url-warning').empty();
        $('.search-warning').empty();
    });

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

    // Listen for a click outside the modal
    $('.search-view').on('click', function() {
        anywiki.closeModal();
    });

    // Listen for a click on the 'Back to results' link
    $('.modal-content').on('click', '.back-to-results', function(event) {
        event.preventDefault();
        anywiki.backToResults();
    });
    
    // Listen for when a search result link is clicked
    $('.modal-content').on('click', '.search-results a', function(event) {
        event.preventDefault();
        anywiki.selectedPage = $(this).text();
        anywiki.currentResults = $('.modal-content').html();
        anywiki.getURL(anywiki.selectedPage);
    });

    // Listen for a click on the "Next" link for more search results
    $('.modal-content').on('click', '.next-results', function(event) {
        event.preventDefault();
        anywiki.search(anywiki.searchText, anywiki.resultsViewed);
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
        anywiki.search(anywiki.searchText, anywiki.resultsViewed);
    });
}

anywiki.requestHTML = function(requestURL, paramsObject) {
    return $.ajax({
        url: 'http://proxy.hackeryou.com',
        method: 'GET',
        dataType: 'html',
        data: {
            reqUrl: requestURL,
            params: paramsObject,
            xmlToJSON: false
        }
    });
}

anywiki.requestJSON = function(paramsObject) {
    return $.ajax({
        url: 'http://proxy.hackeryou.com',
        method: 'GET',
        dataType: 'json',
        data: {
            reqUrl: anywiki.endpoint,
            params: paramsObject,
            xmlToJSON: false
        }
    });
}

anywiki.getEndpoint = function(urlString){
    // Gets the endpoint from the user-inputted URL
    let requestURL = urlString;
    const badStartRegex = /^[^a-zA-z]+/;
    const protocolRegex = /^https?:\/\//;
    const wikipediaRegex = /^(https?:\/\/)*wikipedia\.org/;

    // Replace non-letter characters at start with appropriate protocol
    if (badStartRegex.test(requestURL)) {
        requestURL = requestURL.replace(badStartRegex, 'http://');
    }
    // Add protocol if it's not specified
    if (protocolRegex.test(requestURL) === false) {
        requestURL = 'http://' + requestURL;
    }
    // Redirect Wikipedia home page to English Wikipedia
    if (wikipediaRegex.test(requestURL)) {
        requestURL = requestURL.replace(/wikipedia/, 'en.wikipedia');
    }

    const endpointRequest = anywiki.requestHTML(requestURL);
    $.when(endpointRequest)
        .then(response => {
            // Response is raw HTML of the page
            const regex = /rel=['"]EditURI.*href=['"](.*api\.php)/i;
            const matchArray = response.match(regex);
            // Proceed if we found an endpoint URL, but warn the user if we didn't
            if (matchArray) {
                // Store the endpoint URL only (the matched endpoint URL appears at index 1 of the array)
                let theEndpoint = matchArray[1];
                // If the URL doesn't start with letters, replace non-letters with 'http://'
                theEndpoint = theEndpoint.replace(badStartRegex, 'http://');
                // Store the endpoint
                anywiki.endpoint = theEndpoint;
                // Do the search
                anywiki.search(anywiki.searchText);
            } else {
                $('.wiki-url-warning').text(`Oops - That's not a wiki!`);
            }
        })
        .fail(() => {
            $('.wiki-url-warning').text(`Oops - I don't recognize that URL.`);
        });
}

anywiki.search = function(queryText, resultsOffset) {
    const searchParams = {
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: queryText,
        srlimit: anywiki.resultsPerPage,
        sroffset: resultsOffset,
        srwhat: 'text'
    }
    const searchRequest = anywiki.requestJSON(searchParams);
    $.when(searchRequest)
        .then(response => {
            anywiki.displayResults(response);
        })
        .fail(() => {
            $('.search-warning').text(`Search failed :'( Try a different wiki!`);
            if ($('.modal').hasClass('modal-active')) {
                anywiki.closeModal();
            }
        });
}

anywiki.displayResults = function(resultsObject) {
    const results = resultsObject.query.search;

    // Create a heading for the results page
    const searchSummary = `<em>"${anywiki.searchText}"</em> on <span class="user-wiki-url">${anywiki.searchWikiURL}</span>`;
    const resultsHeading = $('<h1>').addClass('results-heading').html(searchSummary);

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

anywiki.getURL = function(pageTitle) {
    const requestParams = {
        action: 'query',
        format: 'json',
        titles: pageTitle,
        prop: 'info',
        inprop: 'url'
    }
    const urlRequest = anywiki.requestJSON(requestParams);
    $.when(urlRequest)
        .then(response => {
            const pagesObject = response.query.pages;
            let pageURL = '';
            for (let page in pagesObject) {
                pageURL = pagesObject[page].fullurl;
            }
            anywiki.getContent(pageURL); 
        })
        .fail(() => {
            // The API always returns a URL - even one that doesn't exist.
            // This code will not run, but getContent() will throw an error for the user.
            console.log('Could not retrieve page URL.');
        });
}

anywiki.getContent = function(thePageURL) {
    const contentRequest = anywiki.requestHTML(thePageURL, {action: 'render'});
    $.when(contentRequest)
        .then(response => {
            // Response is a string of HTML
            anywiki.displayArticle(response);
        })
        .fail(() => {
            const failMessage = `<p class="no-article">Sorry! I can't find that page right now. Try another result.</p>`;
            anywiki.displayArticle(failMessage);
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
    }

    // If there are images, add an image carousel to the article element
    if (imageArray) {
        // Build image carousel
        const carousel = $('<div>').addClass('carousel');
        imageArray.forEach(image => {
            const carouselItem = $('<div>').addClass('carousel-cell');
            const carouselImage = $('<img>').attr('src', image).on('load', function() {
                // Images load slowly, so this runs after the carousel is initialized
                const imgWidth = $(this).width();
                const imgHeight = $(this).height();
                const carouselCell = $(this).parent();
                // If the loaded image is too small, remove its cell from the carousel
                if (imgWidth < 150 || imgHeight < 150) {
                    $('.carousel').flickity('remove', carouselCell);
                }
                // If the carousel is empty, uninitialize it and remove it from the DOM
                const cellsArray = $('.carousel').find('.carousel-cell');
                if (cellsArray.length === 0) {
                    $('.carousel').flickity('destroy').remove();
                }
            });
            carouselItem.append(carouselImage);
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

    // Replace default bullets with Font Awesome icons
    articleElement.find('ul').addClass('fa-ul');
    articleElement.find('ul li').prepend('<i class="fa-li fa fa-caret-right"></i>');

    // Empty container and display the article
    $('.modal-content').empty();
    $('.modal-content').append(articleElement);

    // Initialize Flickity for image carousel
    $('.carousel').flickity({
        cellAlign: 'center',
        imagesLoaded: true,
        wrapAround: true,
        accessibility: true
    });

    // Delay display of carousel so user doesn't see rapid changes in carousel content we are making
    setTimeout(() => {
        $('.carousel').fadeTo(300, 1);
    }, 1000);

    // Reset scroll to top of window
    $(window).scrollTop(0);
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