var rootNotes = {
  'A': 440,
  'A#':466.16,
  'B':493.88,
  'C':523.36,
  'C#':554.37,
  'D':587.33,
  'D#':622.25,
  'E':659.25,
  'F':698.46,
  'F#':739.99,
  'G':783.99,
  'G#':830.61
}
var scales = {
  0:'chromatic',
  1:'major',
  2:'naturalMinor',
  3:'harmonicMinor',
  4:'melodicMinor',
  5:'dorian',
  6:'phrygian',
  7:'lydian',
  8:'mixolydian',
  9:'locrian',
  10:'pentatonicMinorr',
  11:'pentatonicMajor'
}
var waves = {
  0:'sine',
  1:'square',
  2:'triangle',
  3:'sawtooth',
}
var noises = {
  0:'white',
  1:'pink',
  2:'brownian',
}
var filters = {
  0:'lowpass',
  1:'highpass',
  2:'bandpass',
  3:'lowshelf',
  4:'highshelf',
  5:'peaking',
  6:'allpass'
}

//greatest common denominator
function gcd(a,b){
  while(b != 0){
    t = b;
    b = a%b
    a=t
  }
  return a;
}
//least common multiplier
function lcm(a,b){
  return a*b/gcd(a,b)
}


//SEEDED RANDOMS

// Establish the parameters of the generator
var m = 25;
// a - 1 should be divisible by m's prime factors
var a = 11;
// c and m should be co-prime
var c = 17;
var rand = function() {
  // define the recurrence relationship
  seed = (a * seed + c) % m;
  // return an integer
  // Could return a float in (0, 1) by dividing by m
  return seed/m;
};

function getRandomFloat(a,b){
  return rand()*(b-a) +a
}
function getRandomInt(a,b){
  return Math.floor(rand()*(b - a + 1)) + a;
}
function pickRandomProperty(obj) {
    var keys = Object.keys(obj)
    return keys[ keys.length * rand() << 0 ];
}
function pickRandomArray(arr) {
    return arr[arr.length * rand() << 0 ];
}
function getRandomWave(){
  return waves[pickRandomProperty(waves)]
}
function getRandomNoise(){
  return noises[pickRandomProperty(noises)]
}
function getRandomFilter(){
  return filters[pickRandomProperty(filters)]
}

//Returns a random number roughly following a gaussian distrubution (center: 0 - std dev:1)
function getRandomGaussian() {
    var u = 1 - getRandomFloat(0,1); // Subtraction to flip [0, 1) to (0, 1].
    var v = 1 - getRandomFloat(0,1);
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function getRandomPow2(max){
  return Math.pow(2,getRandomInt(0,max))
}






//Taken from Kevin Cennis: http://jsbin.com/kabodeqapuqu/4/edit?html,css,js,output
function Oscilloscope( ac, canvas ) {
  if ( !ac ) {
    throw new Error('No AudioContext provided');
  }
  if ( !canvas ) {
    throw new Error('No Canvas provided');
  } 
  this.ac = ac;
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.width = canvas.width;
  this.height = canvas.height;
  this.input = ac.createGain();
  this.analyzer = ac.createAnalyser();
  this.analyzer.fftSize = oscFFTSize;
  this.input.connect(this.analyzer);
  this.freqData = new Uint8Array(this.analyzer.frequencyBinCount);
  this.rAF = null;
  this.strokeStyle = '#6cf';
  this.sensitivity = oscBaseSensitivity;
}
Oscilloscope.prototype.reset = function(ac){
  this.stop()
  this.ac = ac;
  this.input = ac.createGain();
  this.analyzer = ac.createAnalyser();
  this.analyzer.fftSize = oscFFTSize;
  this.input.connect(this.analyzer);
  this.freqData = new Uint8Array(this.analyzer.frequencyBinCount);
  this.rAF = null;
}
// borrowed from https://github.com/cwilso/oscilloscope/blob/master/js/oscilloscope.js 
Oscilloscope.prototype.findZeroCrossing = function( data, width ) {
  var i = 0, 
    last = -1, 
    min = ( this.sensitivity - 0 ) * ( 256 - 128 ) / ( 100 - 0 ) + 128,
    s;
  
  while ( i < width && ( data[ i ] > 128 ) ) {
    i++;
  }

  if ( i >= width ) {
    return 0;
  }

  while ( i < width && ( ( s = data[ i ] ) < min ) ) {
    last = s >= 128 ? last === -1 ? i : last : -1;
    i++;
  }
  
  last = last < 0 ? i : last;
  
  return i === width ? 0 : last;
};
Oscilloscope.prototype.start = function() {
  this.rAF = requestAnimationFrame( this.draw.bind( this ) );
};
Oscilloscope.prototype.stop = function() {
  cancelAnimationFrame( this.rAF );
  this.rAF = null;
};
Oscilloscope.prototype.draw = function() {
  var len = this.freqData.length,
    scale = this.height / 256 / 2,
    i = j = 50,
    magnitude;

  // grid
  this.ctx.fillStyle = '#002233';
  this.ctx.fillRect( 0, 0, this.width, this.height );
  this.ctx.lineWidth = 0;
  this.ctx.strokeStyle = 'rgba(60,180,220,0.05)';
  this.ctx.beginPath();
  for ( ; i < this.width; i += 50 ) {
    this.ctx.moveTo( i, 0 );
    this.ctx.lineTo( i, this.height );
    for ( j = 0; j < this.height; j += 50 ) {
      this.ctx.moveTo( 0, j );
      this.ctx.lineTo( this.width, j );
    }
  }
  this.ctx.stroke();
  
  // x axis
  this.ctx.strokeStyle = 'rgba(60,180,220,0.22)';
  this.ctx.beginPath();
  this.ctx.moveTo( 0, this.height / 2 );
  this.ctx.lineTo( this.width, this.height / 2 );
  this.ctx.stroke();

  // waveform
  this.analyzer.getByteTimeDomainData( this.freqData );
  i = this.findZeroCrossing( this.freqData, this.width );
  this.ctx.lineWidth = 2.5;
  this.ctx.strokeStyle = this.strokeStyle;
  this.ctx.beginPath();
  this.ctx.moveTo( 0, ( 256 - this.freqData[ i ] ) * scale + this.height / 4 );
  for ( j = 0; i < len && j < this.width; i++, j++ ) {
    magnitude = ( 256 - this.freqData[ i ] ) * scale + this.height / 4;
    this.ctx.lineTo( j, magnitude );
  }

  this.ctx.stroke();

  this.rAF = requestAnimationFrame( this.draw.bind( this ) );
};



//Helper function to generate scales based on intervals
function generateChromaticScale(root){
  mode = 'Chromatic'
  return rootNotes
}
function generateMajorScale(rootNote){
  mode = 'Major'
  return generateScale([2,4,5,7,9,11],rootNote)
}
function generateNaturalMinorScale(rootNote){
  mode = 'Natural Minor'
  return generateScale([2,3,5,7,8,10],rootNote)
}
function generateHarmonicMinorScale(rootNote){
  mode = 'Harmonic Minor'
  return generateScale([2,3,5,7,8,11],rootNote)
}
function generateMelodicMinorScale(rootNote){
  mode = 'Melodic Minor'
  return generateScale([2,3,5,7,9,11],rootNote)
}
function generateDorianScale(rootNote){
  mode = 'Dorian'
  return generateScale([2,3,5,7,9,10],rootNote)
}
function generatePhrygianScale(rootNote){
  mode = 'Phrygian'
  return generateScale([1,3,5,7,8,10],rootNote)
}
function generateLydianScale(rootNote){
  mode = 'Lydian'
  return generateScale([2,4,6,7,9,11],rootNote)
}
function generateMixolydianScale(rootNote){
  mode = 'Mixolydian'
  return generateScale([2,4,5,7,9,10],rootNote)
}
function generateLocrianScale(rootNote){
  mode = 'Locrian'
  return generateScale([1,3,5,6,8,10],rootNote)
}
function generateMajorPentatonicScale(rootNote){
  mode = 'Major Penta'
  return generateScale([2,4,7,9],rootNote)
}
function generateMinorPentatonicScale(rootNote){
  mode = 'Minor Penta'
  return generateScale([3,5,7,10],rootNote)
}






