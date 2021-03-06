
/**
 * Created by arnab on 2/18/15.
 */

define(['jquery', 'navigation/navigation', 'jquery.dialogextend', 'modernizr', 'common/util'], function ($, navigation) {

    var totalChartsPerRow, totalRows, totalCharts_renderable;

    var closeAllObject = null;
    var dialogCounter = 0;
    var $menuUL = null;

    function calculateChartsPerScreen() {
        totalChartsPerRow = Math.floor($(window).width() / 350) || 1;
        totalRows = Math.floor($(window).height() / 400) || 1;

        //Based on totalChartsPerRow and totalRows, open some charts
        totalCharts_renderable = totalChartsPerRow * totalRows;

        //For small size screens
        if (isSmallView())
            totalRows = totalChartsPerRow = 1;
    }

    function tileAction() {
        calculateChartsPerScreen();

        require(["charts/chartWindow"], function(chartWindowObj) {
            var topMargin = 80;
            if (isSmallView()) topMargin = 100;

            var cellCount = 1,
                rowCount = 1,
                leftMargin = 20;
            var minWidth = $(".chart-dialog").dialog('option', 'minWidth');
            var minHeight = $(".chart-dialog").dialog('option', 'minHeight');

            if (isSmallView()) {
                minWidth = $(window).width() - (leftMargin * 2);
                minHeight = $(window).height() - topMargin;
            }

            var totalOccupiedSpace = (totalChartsPerRow * minWidth) + ((totalChartsPerRow - 1) * leftMargin);
            var remainingSpace = $(window).width() - totalOccupiedSpace;
            var startMargin = Math.round(remainingSpace / 2);

            var referenceObjectForPositioning = window;

            var chartCount = $(".chart-dialog").length;
            $(".chart-dialog").each(function () {
                var leftShift;
                var topShift = topMargin;

                // if charts can fit into a single row
                if(chartCount <= totalChartsPerRow)
                    leftShift = ($(window).width() - (minWidth * chartCount)) / 2;
                else {
                    // we have 2 rows or more
                    leftShift = ($(window).width() - (minWidth * totalChartsPerRow)) / 2;
                }

                if (cellCount > 1) {
                    leftShift = leftShift + (minWidth * (cellCount - 1)) + ((cellCount - 1) * 20);
                }

                if (rowCount > 1) {
                    topShift = topMargin + (minHeight * (rowCount - 1) + ((rowCount - 1) * 20));
                }

                referenceObjectForPositioning = window;
                referenceObjectForPositioning = $(this).dialog('option', {
                    position: {
                        my: "left+" + leftShift + " top" + (topShift < 0 ? "-" : "+") + topShift,
                        at: "left top",
                        of: referenceObjectForPositioning
                    },
                    width: minWidth,
                    height: minHeight
                });

                chartWindowObj.triggerResizeEffects($(this).dialog("widget").find('.chart-dialog'));

                if (++cellCount > totalChartsPerRow) {
                    cellCount = 1;
                    ++rowCount;
                    referenceObjectForPositioning = window;
                }
            });
        });
    };

    /*
        @param: options.date    javascript Date object representing initial time
        @param: options.title   the header title for spinners
        @param: options.changed  called when Date changes, callback argument is a string in yyyy_mm_dd format.
      useage: 
         var win = createBlankWindow(...);
         win.addDateToHeader({date:new Date(), title: 'sub header', changed: fn});
    */
    function addDateToHeader(options) {
        options = $.extend({
            title: 'title',
            date: null,
            changed: function (yyyy_mm_dd) { console.log(yyyy_mm_dd + ' changed'); }
        },options);

        var titlebar = this.parent().find('.ui-dialog-titlebar').addClass('with-dates with-contents');
        var header = this.parent().find('.ui-dialog-title');

        
        /* options: {date: date, onchange: fn } */
        var addDateDropDowns = function (opts) {
            // note that month is 0-based, like in the Date object. Adjust if necessary.
            function numberOfDays(year, month) {
                var isLeap = ((year % 4) == 0 && ((year % 100) != 0 || (year % 400) == 0));
                return [31, (isLeap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
            }

            function update(select, options) {
                var render = options.render || function (v) { return v + ''; };
                select.children().remove();
                /* add the title */
                for (var i = options.min; i <= options.max; ++i)
                    $('<option/>').val(i).text(render(i)).appendTo(select);
                select.val(options.initial || options.min);
                select.selectmenu('refresh');

                select.title = select.title || function (text) {
                    if (text) {
                        select._title = select._title || $('<option/>').val(-1).prependTo(select);
                        select._title.text(text);
                        select.updating = true;
                        select.val(-1).selectmenu('refresh');
                        select.updating = false;
                    }
                    else {
                        if (select._title) {
                            var value = select.val() === -1 ? options.initial : select.val();
                            select._title.remove();
                            select.updating = true;
                            select.val(value).selectmenu('refresh');
                            select.updating = false;
                            this._title = null;
                        }
                    }
                };

                return select;
            }

            var dt = opts.date || new Date();
            var year = $('<select />').insertAfter(header).selectmenu({ width: '70px' });
            var month = $('<select />').insertAfter(header).selectmenu({ width: '65px' });
            var day = $('<select />').insertAfter(header).selectmenu({ width: '60px'});
            year = update(year, { min: 2010, max: dt.getFullYear(), initial: dt.getFullYear()});
            month = update(month, {
                min: 0, max: 11, initial: dt.getMonth(),
                render: function (inx) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'][inx]; }
            });
            day = update(day, { min: 1, max: numberOfDays(dt.getFullYear(),dt.getMonth()), initial: dt.getDate()});

            /* add title elements if no date is specified */
            if (!opts.date) {
                year.title('Year');
                month.title('Month');
                day.title('Day');
            }
            
            var trigger_change = function () {
                /* TODO: search other files and make sure to use a UTC date */
                var yyyy_mm_dd = new Date(Date.UTC(year.val(), month.val(), day.val())).toISOString().slice(0, 10);
                opts.onchange(yyyy_mm_dd);
            }
            day.on('selectmenuchange', function () {
                if (day.updating) return;
                day.title(null);
                month.title(null);
                year.title(null);

                trigger_change();
            });

            var update_day = function () {
                var options = { min: 1, max: numberOfDays(year.val(), month.val()), initial: day.val() };
                if (options.initial > options.max)
                    options.initial = options.min;
                update(day, options);
            };

            [year, month].forEach(function (select) {
                select.on('selectmenuchange', function () {
                    if (month.updating || year.updating) return;
                    day.title(null);
                    month.title(null);
                    year.title(null);
                    update_day();
                    trigger_change();
                });
            })
            return {
                update: function (yyyy_mm_dd) {
                    day.title(null);
                    month.title(null);
                    year.title(null);
                    var args = yyyy_mm_dd.split('-');
                    year.val(args[0] | 0); year.selectmenu('refresh');
                    month.val((args[1] | 0)-1); month.selectmenu('refresh');
                    day.val(args[2] | 0); update_day();
                }
            }
        }

        /* options: {date: date, onchange: fn} , events => element.on('change',...) */
        var addDatePicker = function (opts) {
            var dpicker_input = $("<input type='hidden' />")
                .insertAfter(header);
            var dpicker = dpicker_input.datepicker({
                showOn: 'both',
                numberOfMonths: 2,
                maxDate: 0,
                minDate: new Date(2010,0,1),
                dateFormat: 'yy-mm-dd',
                showAnim: 'drop',
                showButtonPanel: true,
                changeMonth: true,
                changeYear: true,
                beforeShow: function (input, inst) { inst.dpDiv.css({ marginTop: '10px', marginLeft: '-220px' }); },
                onSelect: function () { $(this).change(); }
            }).datepicker("setDate", opts.date.toISOString().slice(0, 10));

            $.datepicker._gotoToday = function (id) {
                $(id).datepicker('setDate', new Date()).change().datepicker('hide');
            };

            /* use JQ-UI icon for datepicker */
            dpicker .next('button') .text('')
                .button({ icons: { primary: 'ui-icon-calendar' } });

            dpicker_input.on('change', function () {
                var yyyy_mm_dd = $(this).val();
                opts.onchange && opts.onchange(yyyy_mm_dd);
            });
            return dpicker_input;
        }


        var dpicker = addDatePicker({
            date: options.date || new Date(),onchange: function (yyyy_mm_dd) {
                dropdonws.update(yyyy_mm_dd);
                options.changed(yyyy_mm_dd);
            }
        });
        var dropdonws = addDateDropDowns({
            date: options.date, onchange: function (yyyy_mm_dd) {
                dpicker.datepicker("setDate", yyyy_mm_dd);
                options.changed(yyyy_mm_dd);
            }
        });

        $('<span class="span-in-dialog-header">' + options.title + '</span>').insertAfter(header);
    }

    return {

        init: function( $parentObj ) {
            calculateChartsPerScreen();

            loadCSS("windows/windows.css");
            $menuUL = $parentObj.find("ul");

            tileObject = $menuUL.find(".tile");

            closeAllObject = $menuUL.find(".closeAll");
            closeAllObject.click(function () {
                //console.log('Event for closing all chart windows!');
                /*
                  The close click is behaving weird.
                  Behavior - When there are charts opened, this event is able to close all charts and then
                            unable to hide the menu. When There are no charts, then it behaves normally
                */
                if ($('.chart-dialog').length > 0) {
                    $('.chart-dialog').dialog('close');
                }
            });

            require(["charts/chartWindow","websockets/binary_websockets"], function (chartWindowObj,liveapi) {


                //Attach click listener for tile menu
                tileObject.click(function () {
                    tileAction();
                });

                //Based on totalChartsPerRow and totalRows, open some charts
                var totalCharts_renderable = totalChartsPerRow * totalRows;
                liveapi
                    .cached.send({ trading_times: new Date().toISOString().slice(0, 10) })
                    .then(function (data) {
                        var markets = data.trading_times.markets;
                        /* return a random element of an array */
                        var rand = function (arr) { return arr[ Math.floor(Math.random()*arr.length) ]; };
                        var timePeriods = ['2h', '4h', '8h', '1d'];
                        var chartTypes = ['candlestick', 'line', 'ohlc', 'spline'];
                        for (var inx = 0; inx < totalCharts_renderable; ++inx){
                            var submarkets = rand(markets).submarkets;
                            var symbols = rand(submarkets).symbols;
                            var sym = rand(symbols);
                            var timepreiod = rand(timePeriods);
                            var chart_type = rand(chartTypes);

                            chartWindowObj
                                .addNewWindow(
                                    sym.symbol, sym.name, timepreiod,
                                    tileAction,/*Trigger tile action */ 
                                    chart_type);
                        }
                    });
            });

            return this;
        },

        tile: function() {
          tileAction();
        },

        closeAll: function() {
            //Trigger close even on all dialogs
            if (!closeAllObject)
            {
                closeAllObject.click();
            }
        },

        /* important options: { title:'',
                                resize:fn, // callabak for dialog resize event
                                close: fn, // callback for dialog close event
                                autoOpen: false,
                                resizeable:true,
                                collapsable:true,
                                minimizable: true,
                                maximizable: true,
                                closable:true
                              }
           notes:
                1- get generated dialog id via createBlankWindow(...).attr('id')
                2- if autoOpen == false  use createBalnkWindow(...).dialog('open') to open the dialog
                2- if minWidth and minHeight are not specified the options.width and options.height will be used for minimums.
          */
        createBlankWindow: function($html,options){
            $html = $($html);
            var id = "windows-dialog-" + ++dialogCounter;

            options = $.extend({
                autoOpen: false,
                resizable: true,
                width: 350,
                height: 400,
                my: 'center',
                at: 'center',
                of: window,
                title: 'blank window'
            }, options || {});
            options.minWidth = options.minWidth || options.width;
            options.minHeight = options.minHeight || options.height;
            
            if (options.resize)
                options.maximize = options.minimize  = options.restore = options.resize;

            var blankWindow = $html.attr("id", id)
                .dialog(options)
                .dialogExtend(options);

            // add an item to window menu
            var $windowMenuLink = $("<a href='#'>" + options.title + "</a>");
            var li = $('<li />').addClass(id + 'LI').html($windowMenuLink);
            $menuUL.append(li);
            // bring window to top on click
            $windowMenuLink.click(function () {
                blankWindow.dialog('moveToTop')
                     .parent().effect("bounce", { times: 2, distance: 15 }, 450);
            });

            navigation.updateListItemToggles();
            // remove item from window menu on close
            blankWindow.on('dialogclose', function () {
                li.remove();
            });

            if (options.resize)
                options.resize.call($html[0]);
            blankWindow.addDateToHeader = addDateToHeader;

            return blankWindow;
        },


        /*
            Uses a jquery-ui spinner to display a list of strings.
                @param: options.index       initial value of the array to show.
                @param: options.list        array of string items to show
                @param: options.changed     callback thats i called when menu is changed.
                @param: options.width       can specify the with of selectmenu.
            Note: you should add your input to dom before turning it a spinner.
    
            Note: you can call 'update_list(...)' on the returned spinner to update the list of items:
                var spinner = makeTextSpinner(input,{list:['a,'b','c'],inx:0});
                spinner.update_list(['a','d','e','f']);
    
            TODO: move this to a utility file
        */
        makeSelectmenu: function (select, options) {
            
            options = $.extend({
                list: ['empty'],
                inx: 0,
                changed: function () { }
            }, options);

            var inx = options.inx, list = options.list;
            var update_select = function(list) {
                select.children().remove();
                for(var i = 0; i < list.length; ++i)
                    $('<option/>').val(list[i]).text(list[i]).appendTo(select);
            }
            update_select(list);
            select.val(list[inx]);

            select = select.selectmenu({ width: options.width });
            select.on('selectmenuchange', function () {
                var val = $(this).val();
                options.changed(val);
            })

            select.update_list = function (new_list) {
                update_select(new_list);
                select.val(new_list[0]);
                select.selectmenu('refresh');
            }
            return select;
        }
    };

});
