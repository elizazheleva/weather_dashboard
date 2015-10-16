/**
 * Plugin: jquery.zWeatherFeed
 * 
 * Version: 1.3.1
 * (c) Copyright 2011-2015, Zazar Ltd
 * 
 * Description: jQuery plugin for display of Yahoo! Weather feeds
 * 
 * History:
 * 1.3.1 - Forecast day option and background image code fix (credit to Romiko)
 * 1.3.0 - Added refresh timer
 * 1.2.1 - Handle invalid locations
 * 1.2.0 - Added forecast data option
 * 1.1.0 - Added user callback function
 *         New option to use WOEID identifiers
 *         New day/night CSS class for feed items
 *         Updated full forecast link to feed link location
 * 1.0.3 - Changed full forecast link to Weather Channel due to invalid Yahoo! link
	   Add 'linktarget' option for forecast link
 * 1.0.2 - Correction to options / link
 * 1.0.1 - Added hourly caching to YQL to avoid rate limits
 *         Uses Weather Channel location ID and not Yahoo WOEID
 *         Displays day or night background images
 **/

 
var tempUnit = 'c';
var address;
var woeid;

$(document).ready(function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(displayGeoLocationWeather);
	}
    displayWeatherData();
    $('#search').submit(function(e) {
        e.preventDefault();
        weatherGeocode('weatherLocation', 'weatherList');
    });

    function showLocation(address, woeid, tempUnit) {
        getCityImage(address);
        $('#weatherReport').empty();
        $('#weatherReport').weatherfeed([woeid], {
            unit: tempUnit,
            woeid: true
        });
        $('#weatherList').empty();
        displayWeatherData();
    }
	
	function displayGeoLocationWeather(position) {
	
		// Cache results for an hour to prevent overuse
		now = new Date();
		// Create Yahoo Weather feed API address
		var query = 'select * from geo.placefinder where text="' + position.coords.latitude + ',' + position.coords.longitude + '" and gflags="R"';
		var api = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent(query) + '&rnd=' + now.getFullYear() + now.getMonth() + now.getDay() + now.getHours() + '&format=json&callback=?';
		// Send request
		$.ajax({
			type: 'GET',
			url: api,
			dataType: 'json',
			success: function(data) {
				if (data.query.count > 0) {
					woeid = data.query.results.Result.woeid;
					showLocation(address, woeid, tempUnit);
				}
			},
			error: function(data) {
			}
		});
	
	}
    
    function getCityImage(address)
    {
			$('#bgrpic').css('background-image', "url('background.jpg')");
			$('.weather').css('background-image', "url('background.jpg')");	
        var url = "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=318f0c009c9aee06e5a817bb0278d56e&tags=" + address + "&per_page=1&group_id=1074553@N22";
        var src;
        $.getJSON(url + "&format=json&jsoncallback=?", function(data){
            $.each(data.photos.photo, function(i,item){
                src = "http://farm"+ item.farm +".static.flickr.com/"+ item.server +"/"+ item.id +"_"+ item.secret + ".jpg";
				$('#bgrpic').css('background-image', "url('" + src + "')");
				$('.weather').css('background-image', "url('" + src + "')");
            });
        });
        
    }


    function weatherGeocode(search, output) {
        var status;
        var results;
        var html = '';
        var msg = '';
        // Set document elements
        var search = document.getElementById(search).value;
        var output = document.getElementById(output);
        if (search) {
            output.innerHTML = '';
            // Cache results for an hour to prevent overuse
            now = new Date();
            // Create Yahoo Weather feed API address
            var query = 'select * from geo.places where text="' + search + '"';
            var api = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent(query) + '&rnd=' + now.getFullYear() + now.getMonth() + now.getDay() + now.getHours() + '&format=json&callback=?';
            // Send request
            $.ajax({
                type: 'GET',
                url: api,
                dataType: 'json',
                success: function(data) {
                    if (data.query.count > 0) {
                        if (data.query.count > 1) html = html;
                        html = html + '<ul>';
                        // List multiple returns
                        if (data.query.count > 1) {
                            for (var i = 0; i < data.query.count; i++) {
                                html = html + '<li>' + _getWeatherAddress(data.query.results.place[i]) + '</li>';
                            }
                        } else {
                            html = html + '<li>' + _getWeatherAddress(data.query.results.place) + '</li>';
                        }
                        html = html + '</ul>';
                        output.innerHTML = html;
                        // Bind callback links
                        $("a.weatherAddress").unbind('click');
                        $("a.weatherAddress").click(function(e) {
                            e.preventDefault();
                            address = $(this).text();
                            woeid = $(this).attr('rel');
                            showLocation(address, woeid, tempUnit);
                        });
                    } else {
                        output.innerHTML = 'The location could not be found';
                    }
                },
                error: function(data) {
                    output.innerHTML = 'An error has occurred';
                }
            });

        } else {
            // No search given
            output.innerHTML = 'Please enter a location or partial address';
        }
    }

    function _getWeatherAddress(data) {
        // Get address
        var address = data.name;
        if (data.admin2) address += ', ' + data.admin2.content;
        if (data.admin1) address += ', ' + data.admin1.content;
        address += ', ' + data.country.content;
        // Get woeid
        var woeid = data.woeid;
        return '<a class="weatherAddress" href="#" rel="' + woeid + '" title="Click for to see a weather report">' + address + '</a> ';
    }

    function displayWeatherData() {

        $.fn.weatherfeed = function(locations, options, fn) {

            // Set plugin defaults
            var defaults = {
                unit: 'c',
                image: true,
                country: false,
                highlow: true,
                wind: false,
                humidity: false,
                visibility: false,
                sunrise: false,
                sunset: false,
                forecast: true,
                forecastdays: 3,
                link: true,
                showerror: true,
                linktarget: '_self',
                woeid: true,
                refresh: 0
            };
            var options = $.extend(defaults, options);
            var row = 'odd';



            // Functions
            return this.each(function(i, e) {
                var $e = $(e);

                // Add feed class to user div
                if (!$e.hasClass('weatherFeed')) $e.addClass('weatherFeed');

                // Check and append locations
                if (!$.isArray(locations)) return false;

                var count = locations.length;
                if (count > 10) count = 10;

                var locationid = '';

                for (var i = 0; i < count; i++) {
                    if (locationid != '') locationid += ',';
                    locationid += "'" + locations[i] + "'";
                }

                // Cache results for an hour to prevent overuse
                now = new Date();

                // Select location ID type
                var queryType = options.woeid ? 'woeid' : 'location';

                // Create Yahoo Weather feed API address
                var query = "select * from weather.forecast where " + queryType + " in (" + locationid + ") and u='" + options.unit + "'";
                var api = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent(query) + '&rnd=' + now.getFullYear() + now.getMonth() + now.getDay() + now.getHours() + '&format=json&callback=?';

                // Request feed data
                sendRequest(query, api, options);

                if (options.refresh > 0) {

                    // Set timer interval for scrolling		
                    var interval = setInterval(function() {
                        sendRequest(query, api, options);
                    }, options.refresh * 60000);
                }

                // Function to gather new weather data
                function sendRequest(query, api, options) {

                    // Reset odd and even classes
                    row = 'odd';

                    // Clear user div
                    $e.html('');

                    $.ajax({
                        type: 'GET',
                        url: api,
                        dataType: 'json',
                        success: function(data) {

                            if (data.query) {

                                if (data.query.results.channel.length > 0) {

                                    // Multiple locations
                                    var result = data.query.results.channel.length;
                                    for (var i = 0; i < result; i++) {

                                        // Create weather feed item
                                        _process(e, data.query.results.channel[i], options);
                                    }
                                } else {

                                    // Single location only
                                    _process(e, data.query.results.channel, options);
                                }

                                // Optional user callback function
                                if ($.isFunction(fn)) fn.call(this, $e);

                            } else {
                                if (options.showerror) $e.html('<p>Weather information unavailable</p>');
                            }
                        },
                        error: function(data) {
                            if (options.showerror) $e.html('<p>Weather request failed</p>');
                        }
                    });
                };

                // Function to each feed item
                var _process = function(e, feed, options) {
                    var $e = $(e);

                    // Check for invalid location
                    if (feed.description != 'Yahoo! Weather Error') {

                        // Format feed items
                        var wd = feed.wind.direction;
                        if (wd >= 348.75 && wd <= 360) {
                            wd = "N"
                        };
                        if (wd >= 0 && wd < 11.25) {
                            wd = "N"
                        };
                        if (wd >= 11.25 && wd < 33.75) {
                            wd = "NNE"
                        };
                        if (wd >= 33.75 && wd < 56.25) {
                            wd = "NE"
                        };
                        if (wd >= 56.25 && wd < 78.75) {
                            wd = "ENE"
                        };
                        if (wd >= 78.75 && wd < 101.25) {
                            wd = "E"
                        };
                        if (wd >= 101.25 && wd < 123.75) {
                            wd = "ESE"
                        };
                        if (wd >= 123.75 && wd < 146.25) {
                            wd = "SE"
                        };
                        if (wd >= 146.25 && wd < 168.75) {
                            wd = "SSE"
                        };
                        if (wd >= 168.75 && wd < 191.25) {
                            wd = "S"
                        };
                        if (wd >= 191.25 && wd < 213.75) {
                            wd = "SSW"
                        };
                        if (wd >= 213.75 && wd < 236.25) {
                            wd = "SW"
                        };
                        if (wd >= 236.25 && wd < 258.75) {
                            wd = "WSW"
                        };
                        if (wd >= 258.75 && wd < 281.25) {
                            wd = "W"
                        };
                        if (wd >= 281.25 && wd < 303.75) {
                            wd = "WNW"
                        };
                        if (wd >= 303.75 && wd < 326.25) {
                            wd = "NW"
                        };
                        if (wd >= 326.25 && wd < 348.75) {
                            wd = "NNW"
                        };
                        var wf = feed.item.forecast[0];

                        // Determine day or night image
                        wpd = feed.item.pubDate;
                        n = wpd.indexOf(":");
                        tpb = _getTimeAsDate(wpd.substr(n - 2, 8));
                        tsr = _getTimeAsDate(feed.astronomy.sunrise);
                        tss = _getTimeAsDate(feed.astronomy.sunset);

                        // Get night or day
                        if (tpb > tsr && tpb < tss) {
                            daynight = 'day';
                        } else {
                            daynight = 'night';
                        }

                        // Add item container
                        var html = '<div class="weatherItem ' + row + ' ' + daynight + '"';
                        if (options.image) html += ' style="background-image: url(icons/icons_white/' + feed.item.condition.code.substring(0, 2) + daynight.substring(0, 1) + '.png); background-repeat: no-repeat; background-position: 60px 20px;"';
                        html += '>';

                        // Add item data
                        html += '<div class="current_weather"><div class="gradbgr"></div><div id="curr_cond"><div class="tablecell"><div class="weatherDesc">' + feed.item.condition.text + '</div>';

                        // Add optional data
                        if (options.highlow) html += '<div class="weatherRange">High: ' + wf.high + '&deg; <br> Low: ' + wf.low + '&deg;</div>';
                        if (options.wind) html += '<div class="weatherWind">Wind: ' + wd + ' ' + feed.wind.speed + feed.units.speed + '</div>';
                        if (options.humidity) html += '<div class="weatherHumidity">Humidity: ' + feed.atmosphere.humidity + '</div>';
                        if (options.visibility) html += '<div class="weatherVisibility">Visibility: ' + feed.atmosphere.visibility + '</div>';
                        if (options.sunrise) html += '<div class="weatherSunrise">Sunrise: ' + feed.astronomy.sunrise + '</div>';
                        if (options.sunset) html += '<div class="weatherSunset">Sunset: ' + feed.astronomy.sunset + '</div>';

                        html += '</div></div>';

                        html += '<div id="curr_location"><div class="tablecell"><div class="weatherCity">' + feed.location.city + ', ' + feed.location.country + '</div>';
                        var wfi = feed.item.forecast;
                        html += '<div class="weatherForecastDay">' + wfi[0].day + ', ' + wfi[0].date + '</div></div></div></div>';

                        html += '<div class="weatherRight">';
                        html += '<div class="weatherTemp">' + feed.item.condition.temp + '&deg;</div>';
                        html += '<div id="linechart"><canvas id="canvas" style="width: 209px; height: 100px;"></canvas></div>';

                        var randomScalingFactor = function() {
                            return Math.round(Math.random() * 100)
                        };
                        var lineChartData = {
                            labels: [wfi[0].day, wfi[1].day, wfi[2].day, wfi[3].day, wfi[4].day],
                            datasets: [{
                                label: "My First dataset",
                                fillColor: "rgba(255,255,255,1)",
                                strokeColor: "rgba(131,45,52,1)",
                                pointColor: "rgba(131,45,52,1)",
                                pointStrokeColor: "#fff",
                                pointHighlightFill: "#fff",
                                pointHighlightStroke: "rgba(220,220,220,1)",
                                data: [wfi[0].high, wfi[1].high, wfi[2].high, wfi[3].high, wfi[4].high]
                            }]

                        }

                        function drawChart() {
                            var ctx = document.getElementById("canvas").getContext("2d");
                            window.myLine = new Chart(ctx).Line(lineChartData, {
                                responsive: false
                            });
                        }

                        // Add item forecast data
                        if (options.forecast) {

                            html += '<div class="weatherForecast">';

                            var wfi = feed.item.forecast;
                            var wfid = options.forecastdays;
                            if (wfid > wfi.length) wfid = wfi.length;

                            for (var i = 1; i <= wfid; i++) {
                                html += '<div class="weatherForecastItem day' + (i + 1) + '" style="background-image: url(icons/icons_red/' + wfi[i].code + 'd.png); background-repeat: no-repeat; background-size: auto 40px; background-position: center top;">';
                                html += '<div class="weatherForecastDay">' + wfi[i].day + '</div>';
                                html += '<div class="weatherForecastRange">' + wfi[i].high + ' <br> <span class="darktxt">' + wfi[i].low + '</span></div>';
                                html += '</div>'
                            }

                            html += '<div style="clear:both"></div></div><div id="settings"><input id="settings_btn" type="button" name="answer" /></div><div id="settings_container">Temperature: <a href="#" id="cels">Celisius</a> | <a href="#" id="fahr">Fahrenheit</a></div>'

                        }
                        html += '</div>';

                    } else {
                        var html = '<div class="weatherItem ' + row + '">';
                        html += '<div class="weatherError">City not found</div>';
                    }

                    html += '</div>';

                    // Alternate row classes
                    if (row == 'odd') {
                        row = 'even';
                    } else {
                        row = 'odd';
                    }

                    // Apply new weather content
                    $e.append(html);
                    drawChart();

                    $('#settings_btn').click(function() {
                        $('#settings_container').toggle(400)
                    });


                    document.getElementById("fahr").onclick = function fun() {
                        tempUnit = 'f';
                        showLocation(address, woeid, tempUnit);
                    }

                    document.getElementById("cels").onclick = function fun() {
                        tempUnit = 'c';
                        showLocation(address, woeid, tempUnit);
                    }

                };

                // Get time string as date
                var _getTimeAsDate = function(t) {

                    d = new Date();
                    r = new Date(d.toDateString() + ' ' + t);

                    return r;
                };

            });
        };


    }
});