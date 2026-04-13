/* ============================================
   deals-loader.js — Load real deals from Supabase
   Replaces hardcoded deal cards with live data.
   Falls back to existing HTML if fetch fails.
   ============================================ */

(function () {
  'use strict';

  var SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';

  var ENDPOINT = SUPABASE_URL + '/rest/v1/properties?select=id,city,postcode,rent_monthly,profit_est,type,photos,status,featured,name,listing_type&status=eq.live&order=created_at.desc&limit=3';

  var DEFAULT_IMAGES = [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=220&fit=crop',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=220&fit=crop',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=220&fit=crop'
  ];

  function formatCurrency(val) {
    if (!val && val !== 0) return '-';
    return '\u00A3' + Number(val).toLocaleString('en-GB');
  }

  function getPhoto(property, index) {
    if (property.photos && Array.isArray(property.photos) && property.photos.length > 0) {
      return property.photos[0];
    }
    return DEFAULT_IMAGES[index % DEFAULT_IMAGES.length];
  }

  function getTitle(p) {
    if (p.name) return p.name;
    var parts = [];
    if (p.type) parts.push(p.type);
    if (p.city) parts.push(p.city);
    return parts.length ? parts.join(', ') : 'Property';
  }

  function getLocation(p) {
    var parts = [];
    if (p.city) parts.push(p.city);
    if (p.postcode) parts.push(p.postcode);
    return parts.join(' \u00B7 ');
  }

  function safe(val, fallback) {
    if (val === undefined || val === null || val === 'undefined') return fallback || '';
    return String(val);
  }

  function buildDealCardA(p, index) {
    var photo = getPhoto(p, index);
    var listingBadge = p.listing_type === 'sale'
      ? '<span style="background:rgba(5,150,105,0.9);color:#fff;font-size:9px;font-weight:600;padding:2px 8px;border-radius:9999px;margin-left:6px">Sale</span>'
      : '<span style="background:rgba(30,154,128,0.9);color:#fff;font-size:9px;font-weight:600;padding:2px 8px;border-radius:9999px;margin-left:6px">Rental</span>';
    var badge = (p.featured ? '<div class="deal-badge">Featured</div>' : '<div class="deal-badge">Live</div>') + listingBadge;
    var title = safe(getTitle(p), 'Property');
    var location = safe(getLocation(p));
    var rent = formatCurrency(p.rent_monthly);
    var profit = formatCurrency(p.profit_est);
    var typeLabel = safe(p.type, '-');
    var listingUrl = '/deals/' + safe(p.id);

    return '<div class="deal-card sr-child" data-feature="SHARED__LANDING_DEAL_CARD">' +
      '<div class="deal-img" style="background-image:url(\'' + photo + '\')">' + badge + '</div>' +
      '<div class="deal-body">' +
        '<h4>' + title + '</h4>' +
        '<div class="deal-meta">' + location + '</div>' +
        '<div class="deal-row"><span class="label">Monthly rent</span><span class="val">' + rent + '</span></div>' +
        '<div class="deal-row"><span class="label">Est. profit</span><span class="val profit">' + profit + '</span></div>' +
        '<div class="deal-row"><span class="label">Type</span><span class="val">' + typeLabel + '</span></div>' +
        '<div class="deal-btns">' +
          '<a href="' + listingUrl + '" class="btn btn-green btn-sm">Visit listing</a>' +
          '<a href="/signup" class="btn btn-outline btn-sm">Inquire now</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function buildDealCardB(p, index) {
    return buildDealCardA(p, index);
  }

  function loadDeals() {
    var grid = document.querySelector('.deal-grid');
    if (!grid) return;
    var isVariantB = grid.classList.contains('deal-cards-grid');

    fetch(ENDPOINT, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Accept': 'application/json'
      }
    })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      if (!Array.isArray(data) || data.length === 0) return; // keep hardcoded fallback
      var html = '';
      data.forEach(function (p, i) {
        html += isVariantB ? buildDealCardB(p, i) : buildDealCardA(p, i);
      });
      grid.innerHTML = html;
    })
    .catch(function () {
      // Network error or no data — keep existing hardcoded cards
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDeals);
  } else {
    loadDeals();
  }
})();
