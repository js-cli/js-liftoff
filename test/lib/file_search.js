var expect = require('chai').expect;
var fileSearch = require('../../lib/file_search');
var path = require('path');

describe('fileSearch', function() {

  it('should locate a file using findup from an array of possible base paths', function() {
    expect(fileSearch('mochafile.js', ['../../'])).to.be.null;
    expect(fileSearch('package.json', [process.cwd()])).to.equal(path.resolve(__dirname,'..','..','package.json'));
    expect(fileSearch('package.json', [process.cwd(), '../../'])).to.equal(path.resolve(__dirname,'..','..','package.json'));
  });

});
