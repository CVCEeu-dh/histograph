/*
  Image manipulation helper

  Requires imagemagick CLI tools to be installed. There are numerous ways to install them. For instance, if you're on OS X you can use Homebrew: brew install imagemagick.

  Test shipped in test/helpers.images.js files

  Modified images will be saved in the same location as the original files.
*/
var settings = require('../settings'),
    
    imk      = require('imagemagick'),
    
    fs       = require('fs'),
    path     = require('path'),
    async    = require('async'),
    _        = require('lodash');

module.exports = {
  /*
    crop an image starting at options.x, options.y till options.x and options.y

    oprions.src
  */
  crop: function(options, next) {
    var dims = options.width + 'x' + options.height + '+' + options.x + '+' + options.y,
        dst;

    dst = [
      options.src.replace(/\.[^/.]+$/, "_"), 
      dims,
      '.jpg'
    ].join('');
    
    imk.convert([options.src, '-crop', dims, '+repage', dst], next);
  }
}