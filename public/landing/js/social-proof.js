/**
 * Social Proof Notifications — "X just signed up" toasts
 *
 * Config source priority:
 *   1. growth-config edge function (https://<proj>.supabase.co/functions/v1/growth-config)
 *   2. localStorage cache ('nfs_social_proof_config')
 *   3. Hardcoded defaults
 *
 * Admin controls (a) on/off and (b) intervalSeconds only.
 * Names, cities and toast content remain synthetic and unchanged.
 */
(function () {
  'use strict';

  var CONFIG_KEY = 'nfs_social_proof_config';
  var CONFIG_URL = 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/growth-config';
  var FETCH_TIMEOUT_MS = 2500;
  var defaults = { enabled: true, intervalSeconds: 30 };

  function getCachedConfig() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.enabled === 'boolean' && typeof parsed.intervalSeconds === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }

  function cacheConfig(cfg) {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  function fetchConfigWithTimeout() {
    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        resolve(null);
      }, FETCH_TIMEOUT_MS);

      try {
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var opts = ctrl ? { signal: ctrl.signal } : {};
        if (ctrl) {
          setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, FETCH_TIMEOUT_MS);
        }
        fetch(CONFIG_URL, opts)
          .then(function (res) {
            if (!res.ok) throw new Error('bad status');
            return res.json();
          })
          .then(function (data) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (
              data &&
              typeof data.social_proof_enabled === 'boolean' &&
              typeof data.social_proof_interval_seconds === 'number'
            ) {
              resolve({
                enabled: data.social_proof_enabled,
                intervalSeconds: data.social_proof_interval_seconds
              });
            } else {
              resolve(null);
            }
          })
          .catch(function () {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(null);
          });
      } catch (e) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    });
  }

  // ── 300 UK first names (150 male + 150 female) ──────────────────────
  var FIRST_NAMES = [
    'Oliver','George','Harry','Jack','Jacob','Noah','Charlie','Muhammad','Thomas','Oscar',
    'James','William','Leo','Alfie','Henry','Joshua','Freddie','Archie','Ethan','Isaac',
    'Alexander','Joseph','Edward','Samuel','Max','Logan','Lucas','Daniel','Theo','Arthur',
    'Sebastian','Harrison','Finley','Mohammed','Adam','Dylan','Riley','Zachary','Teddy','David',
    'Toby','Jude','Louie','Mason','Reuben','Ronnie','Bobby','Hugo','Luca','Frankie',
    'Elliot','Caleb','Nathan','Ibrahim','Tommy','Stanley','Harley','Jenson','Jasper','Felix',
    'Albert','Dexter','Elijah','Benjamin','Reggie','Louis','Oakley','Blake','Jayden','Roman',
    'Jesse','Ryan','Luke','Harvey','Grayson','Connor','Tyler','Leon','Kai','Ezra',
    'Lewis','Carter','Eli','Ellis','Rowan','Aaron','Austin','Ayden','Rory','Robert',
    'Callum','Marcus','Preston','Sonny','Liam','Jamie','Ollie','Brodie','Miles','Cooper',
    'Patrick','Owen','Cameron','Arlo','Chester','Clark','Dominic','Flynn','Kit','Jackson',
    'Rafael','Victor','Albie','Rupert','Troy','Aiden','Barney','Fraser','Otis','Xavier',
    'Brody','Cecil','Dennis','Franklin','Hamish','Ian','Joel','Kenneth','Laurence','Mitchell',
    'Nelson','Peter','Quentin','Russell','Stephen','Trevor','Vincent','Warren','Angus','Bruce',
    'Colin','Derek','Ernest','Fergus','Graham','Howard','Jerome','Keith','Leonard','Malcolm',
    'Amelia','Olivia','Emily','Isla','Ava','Ella','Jessica','Isabella','Mia','Poppy',
    'Sophie','Grace','Lily','Evie','Sophia','Scarlett','Ruby','Chloe','Daisy','Freya',
    'Alice','Florence','Sienna','Matilda','Rosie','Millie','Eva','Lucy','Phoebe','Layla',
    'Charlotte','Willow','Harper','Ivy','Elsie','Maisie','Aria','Luna','Penelope','Violet',
    'Eliza','Darcie','Imogen','Lola','Hannah','Molly','Georgia','Jasmine','Bella','Ellie',
    'Amber','Thea','Harriet','Martha','Orla','Robyn','Lydia','Clara','Esme','Maria',
    'Anna','Zara','Maya','Bonnie','Heidi','Iris','Lottie','Mabel','Rose','Sadie',
    'Abigail','Aisha','Aurora','Bethany','Darcy','Demi','Elena','Emma','Faye','Felicity',
    'Gabriella','Gracie','Holly','Hope','Isobel','Julia','Katie','Lacey','Leah','Lena',
    'Maddison','Margaret','Nancy','Niamh','Nina','Nora','Paige','Pippa','Quinn','Rebecca',
    'Sara','Skye','Stella','Summer','Tessa','Tilly','Uma','Vera','Wendy','Wren',
    'Ada','Ailsa','Beatrice','Bronte','Caitlin','Dana','Edith','Fiona','Gemma','Hattie',
    'Iona','Joanne','Karen','Laura','Miriam','Natalie','Olive','Petra','Rachel','Saoirse',
    'Tabitha','Ursula','Valentina','Whitney','Xena','Yasmin','Zoe','Adrienne','Bridget','Cecilia',
    'Dorothy','Elisabeth','Frances','Gwendolyn','Helen','Ingrid','Janet','Katherine','Lillian','Monica'
  ];

  var LAST_INITIALS = 'A B C D E F G H I J K L M N O P R S T W'.split(' ');

  // ── UK cities grouped by region ────────────────────────────────────
  var UK_CITIES = {
    'London':       ['London','Croydon','Bromley','Enfield','Barnet','Ealing','Harrow','Kingston','Richmond','Sutton'],
    'Manchester':   ['Manchester','Salford','Stockport','Bolton','Oldham','Bury','Rochdale','Wigan','Tameside','Trafford'],
    'Birmingham':   ['Birmingham','Wolverhampton','Coventry','Dudley','Walsall','Solihull','Sandwell','Tamworth','Nuneaton','Redditch'],
    'Leeds':        ['Leeds','Bradford','Wakefield','Huddersfield','Halifax','Dewsbury','Keighley','Batley','Pudsey','Shipley'],
    'Liverpool':    ['Liverpool','Birkenhead','St Helens','Bootle','Wallasey','Southport','Crosby','Kirkby','Huyton','Prescot'],
    'Bristol':      ['Bristol','Bath','Weston-super-Mare','Clevedon','Portishead','Keynsham','Nailsea','Thornbury','Yate','Chippenham'],
    'Sheffield':    ['Sheffield','Rotherham','Doncaster','Barnsley','Chesterfield','Worksop','Retford','Mexborough','Wath','Maltby'],
    'Newcastle':    ['Newcastle','Gateshead','Sunderland','Durham','South Shields','Whitley Bay','Jarrow','Blyth','Cramlington','Morpeth'],
    'Nottingham':   ['Nottingham','Derby','Leicester','Loughborough','Mansfield','Newark','Beeston','Arnold','Hucknall','Ilkeston'],
    'Edinburgh':    ['Edinburgh','Livingston','Musselburgh','Dalkeith','Penicuik','Bonnyrigg','Bathgate','Dunfermline','Kirkcaldy','Falkirk'],
    'Glasgow':      ['Glasgow','Paisley','East Kilbride','Hamilton','Motherwell','Coatbridge','Clydebank','Airdrie','Dumbarton','Greenock'],
    'Cardiff':      ['Cardiff','Swansea','Newport','Bridgend','Barry','Caerphilly','Pontypridd','Llanelli','Neath','Merthyr Tydfil'],
    'Southampton':  ['Southampton','Portsmouth','Bournemouth','Winchester','Fareham','Eastleigh','Basingstoke','Gosport','Havant','Poole'],
    'Brighton':     ['Brighton','Hove','Worthing','Crawley','Eastbourne','Hastings','Lewes','Horsham','Haywards Heath','Littlehampton'],
    'Cambridge':    ['Cambridge','Peterborough','Norwich','Ipswich','Colchester','Chelmsford','Bury St Edmunds','Kings Lynn','Lowestoft','Great Yarmouth'],
    'Oxford':       ['Oxford','Reading','Swindon','Slough','Milton Keynes','High Wycombe','Aylesbury','Banbury','Bicester','Didcot'],
    'Plymouth':     ['Plymouth','Exeter','Torquay','Taunton','Barnstaple','Truro','Falmouth','Newquay','Paignton','Bodmin'],
    'York':         ['York','Harrogate','Scarborough','Selby','Thirsk','Ripon','Northallerton','Malton','Whitby','Pickering'],
    'Belfast':      ['Belfast','Lisburn','Bangor','Newtownards','Carrickfergus','Newry','Derry','Ballymena','Antrim','Omagh'],
    'Aberdeen':     ['Aberdeen','Inverness','Dundee','Perth','Stirling','Elgin','Peterhead','Fraserburgh','Arbroath','Montrose']
  };

  // Flatten all cities for random selection
  var ALL_CITIES = [];
  Object.keys(UK_CITIES).forEach(function (region) {
    UK_CITIES[region].forEach(function (city) {
      if (ALL_CITIES.indexOf(city) === -1) ALL_CITIES.push(city);
    });
  });

  // ── Visitor city detection ─────────────────────────────────────────
  // Vercel provides geo headers; fallback to timezone guess
  var visitorCity = null;
  var visitorRegion = null;
  var nearbyCities = [];

  function detectCity() {
    // Try Vercel geo header (available if deployed on Vercel)
    // We store the city from a lightweight fetch to our own origin
    var stored = sessionStorage.getItem('nfs_visitor_city');
    if (stored) {
      try {
        var parsed = JSON.parse(stored);
        visitorCity = parsed.city;
        visitorRegion = parsed.region;
        buildNearbyCities();
        return;
      } catch (e) {}
    }

    // Try fetching geo info from our edge function
    fetch('/functions/v1/ab-track?geo=1', { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.city) {
          visitorCity = data.city;
          visitorRegion = data.region || null;
          sessionStorage.setItem('nfs_visitor_city', JSON.stringify({ city: data.city, region: data.region }));
          buildNearbyCities();
        }
      })
      .catch(function () {
        // Fallback: use London as default
        visitorCity = 'London';
        visitorRegion = 'London';
        buildNearbyCities();
      });
  }

  function buildNearbyCities() {
    nearbyCities = [];

    // Find region that contains visitor city
    var matchedRegion = visitorRegion;
    if (!matchedRegion) {
      Object.keys(UK_CITIES).forEach(function (region) {
        if (UK_CITIES[region].indexOf(visitorCity) !== -1) {
          matchedRegion = region;
        }
      });
    }

    if (matchedRegion && UK_CITIES[matchedRegion]) {
      nearbyCities = UK_CITIES[matchedRegion].slice();
    }

    // If visitor city not in the region list, prepend it
    if (visitorCity && nearbyCities.indexOf(visitorCity) === -1) {
      nearbyCities.unshift(visitorCity);
    }
  }

  // ── Name rotation (never repeats in session) ──────────────────────
  var usedNameIndices = [];
  var namePool = [];

  function initNamePool() {
    namePool = [];
    for (var i = 0; i < FIRST_NAMES.length; i++) namePool.push(i);
    // Shuffle using Fisher-Yates
    for (var j = namePool.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = namePool[j];
      namePool[j] = namePool[k];
      namePool[k] = tmp;
    }
  }

  initNamePool();
  var namePointer = 0;

  function getNextName() {
    if (namePointer >= namePool.length) {
      // All 300 used — reshuffle
      initNamePool();
      namePointer = 0;
    }
    var idx = namePool[namePointer++];
    var firstName = FIRST_NAMES[idx];
    var lastInit = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
    return firstName + ' ' + lastInit + '.';
  }

  // ── City sequence: first 2 = visitor city, then nearby, then random ─
  var cityIndex = 0;

  function getNextCity() {
    cityIndex++;

    // First 2: visitor's own city
    if (cityIndex <= 2) {
      return visitorCity || 'London';
    }

    // Next few: nearby cities from same region
    var nearbyIdx = cityIndex - 3;
    if (nearbyCities.length > 0 && nearbyIdx < nearbyCities.length) {
      return nearbyCities[nearbyIdx];
    }

    // After that: random UK cities
    return ALL_CITIES[Math.floor(Math.random() * ALL_CITIES.length)];
  }

  // ── Toast UI ──────────────────────────────────────────────────────
  var toastContainer = null;

  function createContainer() {
    toastContainer = document.createElement('div');
    toastContainer.id = 'nfs-social-proof';
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('role', 'status');
    document.body.appendChild(toastContainer);
  }

  function showToast() {
    if (!toastContainer) createContainer();

    var name = getNextName();
    var city = getNextCity();

    var toast = document.createElement('div');
    toast.className = 'nfs-sp-toast';
    toast.innerHTML =
      '<div class="nfs-sp-dot"></div>' +
      '<div class="nfs-sp-content">' +
        '<strong>' + name + '</strong> from <strong>' + city + '</strong>' +
        '<span class="nfs-sp-action">just signed up</span>' +
      '</div>' +
      '<button class="nfs-sp-close" aria-label="Close">&times;</button>';

    // Close button
    toast.querySelector('.nfs-sp-close').addEventListener('click', function () {
      toast.classList.add('nfs-sp-exit');
      setTimeout(function () { toast.remove(); }, 300);
    });

    toastContainer.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(function () {
      toast.classList.add('nfs-sp-enter');
    });

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      if (toast.parentNode) {
        toast.classList.add('nfs-sp-exit');
        setTimeout(function () { toast.remove(); }, 300);
      }
    }, 5000);
  }

  // ── Init ───────────────────────────────────────────────────────────
  var activeConfig = null;

  function start(config) {
    activeConfig = config;
    if (!config.enabled) return;

    detectCity();

    // Wait a few seconds before first toast so the page loads first
    var firstDelay = 5000;
    var intervalMs = (config.intervalSeconds || 30) * 1000;

    setTimeout(function () {
      showToast();
      setInterval(showToast, intervalMs);
    }, firstDelay);
  }

  // Expose for admin preview (available before config resolves)
  window.__nfsSocialProof = {
    showToast: showToast,
    getConfig: function () { return activeConfig; }
  };

  fetchConfigWithTimeout().then(function (remote) {
    var config;
    if (remote) {
      config = remote;
      cacheConfig(remote);
    } else {
      config = getCachedConfig() || defaults;
    }
    start(config);
  });
})();
