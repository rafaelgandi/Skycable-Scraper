
// See: http://phpjs.org/functions/array_unique:346
function array_unique(a){var b="",c={},d="",e=function(a,b){var c="";for(c in b)if(b.hasOwnProperty(c)&&b[c]+""==a+"")return c;return!1};for(b in a)a.hasOwnProperty(b)&&(d=a[b],!1===e(d,c)&&(c[b]=d));return c}
(function (window, z) {
	
	window.MASTER_SCHEDULES = {};
	window.STORED_SCHEDULES = false;
	window.LAST_SAVED_DATE = false;
	window.FAILED_TO_STORE_SCHEDULES = {};
	var AJAX_QUEUE = {},
		$PAGES = z('section.page'), // used in Ui
		$root = z(document),
		TAP = 'click';
	
	var _isLeapYear = function (_yr) {
		// http://kalender-365.de/leap-years.php		
		return (!/mar 01/.test((new Date(_yr, 1, 29)+'').toLowerCase()));
	},
	// See: http://stackoverflow.com/a/2673229
	isEmptyObject = function (obj) {
	  for (var prop in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, prop)) {
		  return false;
		}
	  }
	  return true;
	},
	_t = z.trim; // shroten trim method
	
	var _CONFIG = {
		//SCRAPER: 'http://rafaelgandi.phpfogapp.com/scraper/skycable.php',
		SCRAPER: 'http://fbpage.xpresstools.com/fbxpresstools/skycable.php',
		NUM_OF_MONTHS: 12,
		NUM_OF_DAYS: 31,		
		STORED_DATA_KEY: 'skycable'
	};
	
	var _CHANNELS = {
		'NATIONAL GEOGRAPHIC':41,
		'AXN':49,
		'BBC':29 ,
		'BIOGRAPHY':65,
		'CNN':28,
		'DISCOVERY CHANNEL':39,
		'DISNEY CHANNEL':47,
		'E!':57,
		'ESPN':31,
		'ETC':14,
		'FOX CHANNEL':50,
		'FOX CRIME':60,
		'FX':156,
		'AUSTRALIA NETWORK':130,
		'HBO':54,
		'HERO TV':44,
		'HISTORY CHANNEL':25,
		'JACK TV':51,
		'KIX':63,
		'LIFESTYLE NETWORK':52,
		'MAX':36,
		'MYX':23,
		'SOLAR SPORTS':70,
		'STAR MOVIES':55,
		'STAR SPORTS':32,
		'STAR WORLD':48,
		'VELVET':53
	};
	
	var Ui = {				
		gotoPage: function (_page, _data) {
			var $page = z(_page);
			$page.data('sent', '');
			if (!!_data) {
				$page.data('sent', JSON.stringify({
					'data': _data
				}));	
			}				
			$PAGES.addClass('hide');	
			$page.removeClass('hide');
			$root.trigger(_page.replace(/#/ig, ''), [_data, $page]);
		},
	
		init: function () {
			$root.on(TAP, 'a.page_link', function (e) {
				e.preventDefault();				
				var data = this.getAttribute('data-send'),
					page = '#'+this.href.replace(/^.+#/, '');
				Ui.gotoPage(
					page, 
					(!!data)
						? JSON.parse(data)
						: false
				);
				
			});
			
			$root.on(TAP, 'button[data-href]', function (e) {
				e.preventDefault();
				var page = this.getAttribute('data-href'),
					data =  this.getAttribute('data-send');
				Ui.gotoPage(
					page, 
					(!!data)
						? JSON.parse(data)
						: false
				);							
			});
		}
	};
	
	window._SkyDate = {
		isDate : function (_m, _d, _y) {
			var len = _t(_y+'').length;
			_y = (len !== 4) ? (function () {
				if (window.console) {console.log('Invalid year given')}
				return false;
			})() : _t(_y);
			if (_y === false) {return false;}
			var leap = (!_isLeapYear(_y)) ? 28 : 29;
			return ((+_m >= 1 && +_m <= _CONFIG.NUM_OF_MONTHS) && (+_d >= 1 && +_d <= leap));
		},
		
		today : (function () {
			var today = new Date(),
				d = (today.getDate() < 10) ? ('0'+today.getDate()) : today.getDate(),
				m = (today.getMonth()+1);
			m = (m < 10) ? ('0'+m) : m;				
			return {
				dateBare: today.getDate(),
				date: d,
				month: m,
				year: today.getFullYear(),
				timestamp: Math.floor(today.getTime() / 1000),
				dateFormatted: (m+'/'+d+'/'+today.getFullYear()) // format: MM/DD/YYYY
			};
		})(),

		getLatestDate: function (_schedules) {
			var d = _schedules || STORED_SCHEDULES || MASTER_SCHEDULES ,
				dates = [],
				max = 0,
				maxDate='';
			for (var date in d) {
				var time = (new Date(date)).getTime();
				if (time > max) {
					max = time;
					maxDate = date;
				} 
			}
			return maxDate;
		},
		
		getTomorrow: function (d,offset) {
			// See: http://stackoverflow.com/a/7759871
			// Another helpful link is: http://stackoverflow.com/a/4403870
			if (!offset) { offset = 1 }
			d = new Date(d); // format: MM/DD/YYYY
			var tom = new Date(new Date(d.getTime()).setDate(d.getDate() + offset)),
				date = tom.getDate(),
				month = (tom.getMonth()+1);
			date = (date < 10) ? ('0'+date) : date;	
			month = (month < 10) ? ('0'+month) : month;	
			return {
				dateBare: tom.getDate(),
				date: date,
				month: month,
				year: tom.getFullYear(),
				dateFormatted: (month+'/'+date+'/'+tom.getFullYear()) // format: MM/DD/YYYY
			};
		}
	};
	
	var _Storage = {
		removeStaleData: function (_scheds) {
			var now = parseInt(_SkyDate.today.dateFormatted.replace(/\//ig, ''), 10),
				d;
			for (var date in _scheds) {
				if (_scheds.hasOwnProperty(date)) {
					d = parseInt(date.replace(/\//ig, ''), 10);
					if (now > d) {
						// See: http://foohack.com/2007/06/javascript-style-tip-use-in-and-delete/
						delete _scheds[date];
					}
				}			
			}
			return _scheds;
		},
		
		removeEmptyObjects: function (_objs) {
			for (var p in _objs) {
				if (_objs.hasOwnProperty(p)) {
					if (isEmptyObject(_objs[p])) {
						delete _objs[p];
					}
				}
			}
			return _objs;
		},
		
		storeData: function (_newScheds) {
			var skycable = {},
				_newScheds = _newScheds || MASTER_SCHEDULES,
				scheds, 
				lastSavedDate;
			scheds = (!!STORED_SCHEDULES) 
						? _Storage.removeStaleData(z.extend(STORED_SCHEDULES, _newScheds))
						: _Storage.removeStaleData(_newScheds);
			scheds = _Storage.removeEmptyObjects(scheds);			
			lastSavedDate = _SkyDate.getLatestDate(scheds);	
			skycable['schedules'] = scheds;
			skycable['last_saved_date'] = lastSavedDate;
			skycable['failed_schedules'] = _Storage.removeStaleData(FAILED_TO_STORE_SCHEDULES);
			
			MASTER_SCHEDULES = STORED_SCHEDULES = skycable['schedules'];
			LAST_SAVED_DATE = skycable['last_saved_date'];
			FAILED_TO_STORE_SCHEDULES = skycable['failed_schedules'];
			return skycable;
		}
	};
	
	window.Skycable = {		
		config: _CONFIG,
		root: $root,
		ajaxLog: (function () {
			var $logarea = z('#log_textarea');
			$logarea.val('');
			return function (_msg) {
				$logarea.val(_msg+"\n"+$logarea.val());
			};
		})(),	
		
		callScraper: function (_channelNum, _date, _channelName, _callback) {
			var d = encodeURIComponent(_date),
				cNum = parseInt(_channelNum, 10),
				queueIden = _channelNum+'_'+_date,
				call = _callback || $.noop;	
			AJAX_QUEUE[queueIden] = true;			
			z.ajax({
				url: _CONFIG.SCRAPER,
				type: 'get',
				data: {
					'channel_num': cNum,
					'date': d
				},
				beforeSend: function () {
					Skycable.ajaxLog('processing...'+_channelName+' '+_date);	
				},
				error: function (xhr, status, error) {					
					Skycable.ajaxLog('FAIL on '+_channelName+' '+_date);
					// Add this sched to the "FAILED_TO_STORE_SCHEDULES" object
					if (!z.isArray(FAILED_TO_STORE_SCHEDULES[_date])) {
						FAILED_TO_STORE_SCHEDULES[_date] = [];
					}
					FAILED_TO_STORE_SCHEDULES[_date].push(_channelName+'|'+cNum);
					FAILED_TO_STORE_SCHEDULES[_date] = array_unique(FAILED_TO_STORE_SCHEDULES[_date]);
				},
				success: function (res) {					
					Skycable.ajaxLog('succees on '+_channelName+' '+_date);
					call(res, _channelName, _channelNum);
				},
				complete: function (xhr, status) {
					AJAX_QUEUE[queueIden] = false;
				}
			});		
		},
		
		wait: function (_callback) {
			(function check() {
				for (var p in AJAX_QUEUE) {
					if (!!AJAX_QUEUE[p]) {
						window.setTimeout(check, 80);
						return;
					}
				}
				AJAX_QUEUE = {}; // free the queue array
				_callback();
			})();
		},
		
		retryFailedSchedules: function () {
			var len = 0, p, fail = {};
			if (isEmptyObject(FAILED_TO_STORE_SCHEDULES)) { return false; }				
			for (var date in FAILED_TO_STORE_SCHEDULES) {
				FAILED_TO_STORE_SCHEDULES[date] = array_unique(FAILED_TO_STORE_SCHEDULES[date]);
				len = FAILED_TO_STORE_SCHEDULES[date].length;
				for (var i=0; i<len; i++) {
					p = FAILED_TO_STORE_SCHEDULES[date][i].split('|'); // 0=channel name|1=cannel num
					(function (p) {
						Skycable.callScraper(p[1], date, p[0], function (res, channelName, channelNum) {
							var chk = Skycable.parseResponse(res);
							if (typeof chk === 'object') {			
								MASTER_SCHEDULES[date][channelName] = chk;
							}
							else if (typeof chk === 'string' && chk === 'none yet') {
								Skycable.ajaxLog('No more schedules for '+channelName+' '+date);	
								// Check if "fail[date]" is not yet initialize as an Array //
								if (typeof fail[date] == 'undefined' || !z.isArray(fail[date])) { 
									fail[date] = []; //initialize as an Array
								}
								fail[date].push(channelName+'|'+channelNum); // ie: "AXN|49"
								// remove duplicate values in the array //
								fail[date] = array_unique(fail[date]); 
							}
							else {
								Skycable.ajaxLog('Weirdness('+JSON.stringify(chk)+') '+channelName+' '+date);	
							}
						});
					})(p);
				}
			}			
			Skycable.wait(function () {
				FAILED_TO_STORE_SCHEDULES = fail; // Reset to the new values, if there are any. Basically FAILED_TO_STORE_SCHEDULES will be reset here.				
				var schedData = _Storage.storeData(MASTER_SCHEDULES);
				Skycable.ajaxLog('RESCRAPING OF SKYCABLE WEBSITE DONE');	
				z('#log_result').val(JSON.stringify(schedData.schedules))
				if (!isEmptyObject(schedData.failed_schedules)) {
					Skycable.ajaxLog('====================================================');
					Skycable.ajaxLog('SCHEDULES THAT STILL FAILED'+"\n"+JSON.stringify(schedData.failed_schedules));
					Skycable.ajaxLog('====================================================');
				}						
			});
			return true;
		},
		
		getDataFromSkycable: function (_numOfDays) {
			var completeDate = _SkyDate.today,
				numOfDays = _numOfDays || 14, // lets limit it to 14, because of localStorage limit (2.5mb)
				currdate; 					
			for (var i=1; i <= numOfDays; i++) { 											
				if (i>1) {
					completeDate = _SkyDate.getTomorrow(completeDate.dateFormatted);
				}
				currdate = completeDate.dateFormatted;
				MASTER_SCHEDULES[currdate] = {};
				// Closure thingy here for the "currdate" variable
				// See: http://www.mennovanslooten.nl/blog/post/62
				(function (currdate) {					
					for (var p in _CHANNELS) {
						Skycable.callScraper(_CHANNELS[p], currdate, p, function (res, channelName, channelNum) {
							var chk = Skycable.parseResponse(res);
							if (typeof chk === 'object') {			
								MASTER_SCHEDULES[currdate][channelName] = chk;
							}
							else if (typeof chk === 'string' && chk === 'none yet') {
								Skycable.ajaxLog('No more schedules for '+channelName+' '+currdate);	
								// Check if "FAILED_TO_STORE_SCHEDULES[currdate]" is not yet initialize as an Array //
								if (typeof FAILED_TO_STORE_SCHEDULES[currdate] == 'undefined' || !z.isArray(FAILED_TO_STORE_SCHEDULES[currdate])) {
									FAILED_TO_STORE_SCHEDULES[currdate] = [];
								}
								FAILED_TO_STORE_SCHEDULES[currdate].push(channelName+'|'+channelNum); // ie: "AXN|49"
								// remove duplicate values in the array //
								FAILED_TO_STORE_SCHEDULES[currdate] = array_unique(FAILED_TO_STORE_SCHEDULES[currdate]); 
							}
							else {
								Skycable.ajaxLog('Weirdness('+JSON.stringify(chk)+') '+channelName+' '+currdate);	
							}
						});
					}					
				})(currdate);				
			}			
			Skycable.wait(function () {
				var schedData = _Storage.storeData(MASTER_SCHEDULES);
				console.dir(schedData);
				Skycable.ajaxLog('SCRAPING SKYCABLE WEBSITE DONE!!!');
				//alert('Skycable website scraping is done.');
				//console.log(JSON.stringify(MASTER_SCHEDULES));
				z('#log_result').val(JSON.stringify(schedData.schedules))
				if (!isEmptyObject(schedData.failed_schedules)) {
					Skycable.ajaxLog('====================================================');
					Skycable.ajaxLog('SCHEDULES THAT I FAILED TO SCRAPE'+"\n"+JSON.stringify(schedData.failed_schedules));
					Skycable.ajaxLog('====================================================');
				}									
			});
		},
		
		removeAllStoredData: function () {
			STORED_SCHEDULES = false;
			LAST_SAVED_DATE = false;
			FAILED_TO_STORE_SCHEDULES = {};
			MASTER_SCHEDULES = {};
		},
	
		parseResponse: function (_res) {
			_res = _res.replace(/<script.*?>.*?<\/script>/ig, '') // remove script tags				   
					   .replace(/<script.*?>/ig, '')
					   .replace(/<\/script.*?>/ig, '')
					   .replace(/<link.*?>/ig, '') // remove link tags
					   .replace(/<img.*?>/ig, '') // try to remove the images
					   .replace(/<input.*?>/ig, ''); // remove any input tag
			var scrapedData = [],
				$tempDiv = z('<div />').html(_res),
				foo = $tempDiv.find('script, link, img').remove(), // remove any left over unwanted tags
				$skedTable = $tempDiv.find('#ctl00_MainContentPlaceHolder_GridView1'),
				nlRegExp = /\n/ig;
			if (!$skedTable.length) {
				console.log('Oops looks like we have a new layout');
				return false;
			}
			if (_t($skedTable.text()).toLowerCase().replace(/\s+/ig, ' ').indexOf('no available schedule.') !== -1) {
				console.log('No more schedules available');		
				return 'none yet';
			}			
			$skedTable.children('tbody').children('tr').each(function () {
				var $me = z(this),
					$td = $me.children('td'),
					$childTd = $td.eq(1).find('td');
				if (!$td.length) {return true;}	
				scrapedData.push({
					time: _t($td.eq(0).text()).replace(nlRegExp, ''),
					title: _t($childTd.eq(0).text()).replace(nlRegExp, ''),
					desc: _t($childTd.eq(1).text()).replace(nlRegExp, ''),
				});
			});
			$tempDiv.remove();
			return scrapedData;
		},
		
		initEvents: function () {			
			///////////////// MENU EVENTS ///////////////////
			// Refresh schedule data (rescrape)//
			z('#refresh_data').on(TAP, function (e) {
				Skycable.removeAllStoredData();
				Skycable.getDataFromSkycable();
				Ui.gotoPage('#log_list_page');
			});
			// Add fresh new schedules //
			z('#more_data').on(TAP, function (e) {				
				Skycable.getDataFromSkycable(5); // add 5 more days to the schdules stored
				Ui.gotoPage('#log_list_page');
			});
			// Retry the schedules that we failed to scrape //
			z('#retry_failed_schedules').on(TAP, function () {
				if (Skycable.retryFailedSchedules()) {
					Ui.gotoPage('#log_list_page');
				}
				else {
					alert('No failed schedules, all is well.');
				}	
			});
		},
		
		init: function () {
			Ui.init();				
			Skycable.initEvents(); // Run the required events
			z('#log_textarea, #log_result').val('');
		}	
	};
	
})(window, Zepto);