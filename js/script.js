//TODO
//fix instr range
//fix snare

//SEEDS
//60-4-32-0-43.13090
//90-2-32-0-98.39791
//60-4-32-0-86.57302
//60-4-32-0-98.95139
//60-4-32-0-70.62566
//60-4-32-0-22.61597

// Parameters
var tempo = 60.0;
var baseResolution = 4;
var durationFactor = 4;
var baseLength = 16;
var baseOscNumber = 10;
var chordProba = 0;

var maxDurationShort = 16;
var baseDetune = 1
var seedPrecision = 5;

var compressorThreshold = -24
var compressorRatio = 20

//oscilloscope
var oscWidth = 1000;
var oscHeight = 300;
var oscFFTSize = 2048;
var oscBaseSensitivity = 42;

//scheduler
var lookahead = 25.0;
var scheduleAheadTime = 0.1;
var schedulerTimer;
var nextNoteTime = 0.0;

//stuff
var commandList = [];
var noteDurations = [];
var cursor = 0;
var max = 1;
var chaos = 0;
var sqrChaos = 0;
var play = true;
var resolution;
var context;
var mixNode;
var scope;
var canvas;
var generationSeed;
var seed;
var mode;
var root;


$(document).ready(function(){
  initCanvas()
  scope = new Oscilloscope(context, canvas[0]);
  scope.start()
  generationSeed = Math.random()*100
  generationSeed = generationSeed.toFixed(seedPrecision)

  var ch = $('#chaos')[0]
  ch.addEventListener("input", function() {
      $('#chaosResult').html(ch.value)
  }, false); 
})


// Entry point. Get random seed and generate song
function generateSong(){
  getParams()
  seed = generationSeed
  $('#seed').html(generateSeed(seed))
  resetAndGenerate()
}

//Resets everything and generates new song
function resetAndGenerate(){
  reset()
  
  generateDurations();
  randomSong()

  //computes the nb of steps necessary to loop
  for(var i = 0;i<commandList.length;i++){
    max = lcm(max,commandList[i].sequence.length)
  }

  setInterval(scheduler, 100);
  generationSeed = Math.random()*100
  generationSeed = generationSeed.toFixed(seedPrecision)
  play = true;
}

//Reads inputs on html and set params
function getParams(){
   baseLength = parseInt($('#length').val())
   baseResolution = parseInt($('#resolution').val())
   tempo = parseInt($('#tempo').val())
   chaos = parseFloat($('#chaos').val()/100)
   //use squared value for calculationsfor slower increase
   sqrChaos = chaos*chaos
}

//Concatenates all needed params for the seed
function generateSeed(){
  return tempo + '-' + baseResolution + '-' + baseLength + '-' + chaos*100 + '-' + seed;
}

//Reads the seed value input and generates a song according to it
function loadSeed(){
  var input = $('#seedInput').val()
  var s =input.split(/-/g)
  tempo = parseInt(s[0]) || 60
  $('#tempo').val(tempo)
  baseResolution = parseInt(s[1]) ||4
  $('#resolution').val(baseResolution)
  baseLength = parseInt(s[2]) || 32
  $('#length').val(baseLength)
  chaos = parseFloat(s[3]/100) || 0
  $('#chaos').val(chaos*100)
  $('#chaosResult').html(chaos*100)
  seed = parseFloat(s[4]) || 1
  $('#seed').html(generateSeed())
  resetAndGenerate()
}

//Kill current song and reset params
function reset(){
  clearInterval(schedulerTimer);

  resolution = baseResolution
  cursor = 0
  nextNoteTime = 0.0
  max = 1

  for(var i = 0;i<commandList.length;i++){
    commandList[i].kill()
  }

  commandList = []

  resetContext()
  initOsc()
}

//Closes current context, opens new one and reconnect everything
function resetContext(){
  context.close()
  context = new AudioContext

  mixNode = context.createGain();
  mixNode.gain.value = 1;

  compressor = context.createDynamicsCompressor()
  compressor.threshold.value = compressorThreshold;
  compressor.reduction.value = compressorRatio
  compressor.attack.value = 0;

  mixNode.connect(compressor);
  compressor.connect(context.destination);  
}
//what it says
function initCanvas(){
  context = new AudioContext
  canvas = $('<canvas width="' + oscWidth + '" height="' + oscHeight + '"></canvas>');
    $('#osc').append(canvas);
    if (typeof G_vmlCanvasManager !== 'undefined')
        G_vmlCanvasManager.initElement(canvas[0]);
}

//Create oscilloscope instance and connect to song
function initOsc(){
  if(!scope){
    initCanvas()

    scope = new Oscilloscope(context, canvas[0]);
    var slider = document.querySelector('#min');
    var label = document.querySelector('#label');

    slider.value = scope.sensitivity;
    label.textContent = ~~scope.sensitivity;
    slider.addEventListener('input', function() {
      scope.sensitivity = slider.value;
      label.textContent = slider.value;
    }, false );
  }
  else(
    scope.reset(context)
  )
  compressor.connect(scope.input);
  scope.start();
}

//Create and add a metronome to the commandList
function generateMetronome(){
  var metronomeInstr = new Instrument({})
  metronomeInstr.setOscillators({wave:'sine',detune:0})
  metronomeInstr.setEnvelope(0.8,0.3,0.01,0.1,0.0)
  var MetronomeSequence = []
  for(var i = 0;i<baseLength*resolution;i++){
    if(i == 0)
      MetronomeSequence.push([{note:880, duration:0.005}])
    else if(i%resolution == 0)
      MetronomeSequence.push([{note:440, duration:0.005}])
    else
      MetronomeSequence.push([{note:220, duration:0.005}])
  }
  var metronomeCommand = new Command(metronomeInstr,MetronomeSequence)
  commandList.push(metronomeCommand)
}

//generate 3 random commands as well as random drums, and add all to the commandList
function randomSong(){
  resolution = baseResolution
  //if chaos>0, chance to slightly change resolution 
  resolution += Math.round(getRandomFloat(0,(sqrChaos*sqrChaos)*resolution))

  //Choose the root note and scale(will be the same for all sequences)
  root = pickRandomProperty(rootNotes)
  var scale = randomScale(root)

  var instr1 = randomInstrument()
  var scale1 = extendScale(scale,4,6)
  var sequence1 = randomSequence(scale1,baseLength)
  var command1 = new Command(instr1,sequence1,'Instr1')
  commandList.push(command1)

  var instr2 = randomInstrument() 
  var scale2 = extendScale(scale,3,5)
  var sequence2 = randomSequence(scale2,baseLength)
  var command2 = new Command(instr2,sequence2,'Instr2')
  commandList.push(command2)

  var instr3 = randomInstrument() 
  var scale3 = extendScale(scale,2,3)
  var sequence3 = randomSequence(scale3,baseLength)
  var command3 = new Command(instr3,sequence3,'Instr3')
  commandList.push(command3)

  randomDrum(baseLength,commandList)
  displayParams()
}

//Display characteristics of the random song and add a mute command
function displayParams(){
  $('#instruments').empty()
  $('#instruments').append('<b>Root : </b>' +  root + '</br>')
  $('#instruments').append('<b>Scale/Mode : </b>' +  mode + '</br></br>')
  commandList.forEach(function(c){
    $('#instruments').append(c.display())
    $('#' + c.name + '').click(function(){
      var self = $(this)
      if(self.is(':checked')){
        c.muted = false
      }
      else{
        c.muted = true
      }
    })
  })
}



//SCHEDULER

//Advances the cursor for reading sequences and update display
function nextNote(){
  var secondsPerBeat = 60.0 / tempo
  nextNoteTime +=secondsPerBeat/resolution;
  var c = Math.floor(cursor/resolution +1)
  cursor++;
  $('#step').html('<b>Steps : </b>' + c + '/' + max/resolution)
    if (cursor == max) {
        cursor = 0;
    }
}
//Look at the sequences and play all scheduled notes
function scheduler(){
  if(!play)
    return
  while(nextNoteTime < context.currentTime + scheduleAheadTime){
    commandList.forEach(function(c){
      c.play(cursor)
    })
    nextNote()
  }
}
//Yep
function pause(){
  play = !play
}

//Command: instrument + sequence of notes
function Command(instrument, sequence, name){
  this.instrument  = instrument;
  this.sequence = sequence;
  this.name = name;
  this.mute = false;
}
//Play the note at the cursor position
Command.prototype.play = function(c){
  if(this.muted)
    return
  //need to learn closures
  var self = this
  while(c >= this.sequence.length)
    c -= this.sequence.length
  //sequence = '-' means no note at that position
  if(this.sequence[c] != '-' ){
      this.sequence[c].forEach(function(n){
        //duration can be a nb in ms or a string ('16th', 'half', ...)
        var dur = typeof(n.duration) == 'number'? n.duration : noteDurations[n.duration]*60.0/tempo
        self.instrument.play(n.note, nextNoteTime, dur)
      })  
    }
}
//kill and empties the command
Command.prototype.kill = function(){
  this.instrument.kill()
  this.sequence = []
}

Command.prototype.display = function(){
  var mute = '<input id=' + this.name + ' type=checkbox checked> '
  var length = ' - Length : ' + this.sequence.length / resolution
  var filter = ' - Filter : ' + this.instrument.filter.type + ':' + this.instrument.filter.frequency.value
  return mute + this.name + length  + '</br>'
}


//Generates sequence of notes based on random params
function randomSequence(scale,baseLength,short){
  var length = Math.max(getRandomLength(baseLength,short) + Math.floor(sqrChaos*getRandomInt(-baseLength/2,baseLength*2)),1)

  //nb notes in the sequence. 1 = 1 note per step, 0 = no notes
  var density = getRandomFloat(0.1,1)
  //chance to go from one note to a neighbouring note
  var coherence = getRandomFloat(0.1,1)
  //should the notes be rather long(-1) or short(1)
  var durationSkew = getRandomFloat(-1,1)
  //De we have single notes or 3-notes chords
  var chord = rand()<chordProba+sqrChaos/4? true : false
  return generateSequence(scale,length,density,coherence,durationSkew,chord)
}
//Returns a random fraction of the baseLength
function getRandomLength(baseLength,short){
  //Returns a power of 2 smaller than the base length
  var length = getRandomPow2(Math.log(baseLength)/Math.log(2));

  //we can compute several length values and only keep the biggest to filter out too many low values
  for(var i = 0;i<2;i++){
    length = Math.max(length,getRandomPow2(Math.log(baseLength)/Math.log(2)))
  }

  if(short)
    length = Math.min(length,maxDurationShort)
  
  length = Math.min(length,baseLength)
  return length
  //return getRandomInt(1,baseLength)
}
//Returns a sequence of notes/durations or silences based on a lot of weird assumptions
function generateSequence(scale,length,density,coherence,durationSkew,chord){
  var seq = []

  var steps = length*resolution
  var lastNotePlayed = scale[0]
  //Initialize the sequence with all empty steps
  for(var i = 0;i<steps;i++){
    seq[i] = '-'
  }

  for(var i = 0;i<steps;i++){
    //density check. Should we play a note at this step?
    if(rand()<density){
      seq[i] = []
      // duration in number of steps
      // duration factor codes for the max duration of a note
      var duration = pickRandomArray(skewDuration(durationSkew))*resolution*durationFactor
      //lazy check
      if (duration<1)
        duration = 1
      // If the duration exeeds the total number of steps, only take the remaining steps
      duration = Math.min(duration,steps-i)
      
      var nbOfNotes = chord? getRandomInt(1,4) : 1
      for(var j = 0;j<nbOfNotes;j++){
        var note;
        //coherence check. Should we chose a note based on the last note played?
        if(getRandomFloat(0,1)<coherence & i>1){
          note = getNeighbourNote(lastNotePlayed,scale)
        }
        //If not, any note in the scale will do
        else{
          note = scale[pickRandomProperty(scale)]
        }

        var s = {note:note, duration:duration/resolution}
        seq[i].push(s)
        lastNotePlayed = note
      }
      //wait until the note is over before chosing a new one
      i+=duration-1
      // Haaaaaaaaaaa
      i = Math.floor(i)
    }
  }
  return seq
}
//Generates a list of possible notes durations to chose from based on the resolution
//Possible durations can be present multiple time for increased proba to be chosen
function generateDurations(){
  noteDurations = []
  for(var i = 1;i<=resolution*resolution;i++){
    //only keep power of 2 divisers
    if((i & (i - 1)) == 0){
      // i/resolution is a completely arbitrary way of generating the duration distribution.
      // nothing to see here
      for(var j = 0;j<i/resolution;j++){
        noteDurations.push(1/i)
      }
    }
  }
}
//Skew the duration distribution toward mostly long notes (-1) or mostly short (1)
function skewDuration(skew){
  if(skew<-1 || skew >1){
    //error handling like a pro
    console.log('skew must be between -1 and 1')
    return noteDurations
  }
  var l = noteDurations.length
  if(skew == 0){
    return noteDurations
  }
  // Already dont remember whats happening here
  else if(skew<0){
    var s = Math.floor((-1-skew)*-l)+1
    return noteDurations.slice(0,s)
  }
  else{
    var s = Math.floor((1-skew)*l)+1
    return noteDurations.slice(l-s,l)
  }
}

//Generates an instrument based on random params.
//Trig is a text value (kick/snare/hihat) that tells the instrument to ignore normal playing mode
function randomInstrument(trig){
  var limit = false
  // Arbitrary land
  // Chose all the params of the random instr generation 
  var nbOsc = getRandomInt(1,baseOscNumber+sqrChaos*baseOscNumber);
  var distortion = getRandomFloat(0.0,sqrChaos/10);
  var peakLevel = getRandomFloat(0.04,0.06+sqrChaos/5);
  var sustainLevel = getRandomFloat(0.04,0.06+sqrChaos/5);
  var attack = getRandomFloat(0,1.5+sqrChaos*3);
  var decay = getRandomFloat(0,1.5+sqrChaos*3);
  var release = getRandomFloat(0,2+sqrChaos*3);

  var filterType = getRandomFilter();
  var filterFreq = getRandomInt(200,10000);
  //highpass has a tendency to lower the volume a lot. We will limit and level later
  if(filterType == 'highpass'){
    filterFreq = getRandomInt(200,4000)
    limit = true;
  }

  var filterDetune = getRandomInt(-sqrChaos*10,sqrChaos*10);
  var Q = getRandomFloat(0,1)*sqrChaos;
  var gain = getRandomFloat(0,1)*sqrChaos;

  var noiseType = getRandomNoise();
  var noiseFilterType = getRandomFilter()
  var noiseFilterCutoff = getRandomInt(200,10000);
  var noiseFilterVolume = getRandomFloat(0,1)*sqrChaos;

  var instr = new Instrument({})
  instr.setDistortion(distortion)
  
  if(trig){
    instr.trig = trig
    instr.kickRelease = getRandomFloat(0.1,2)+sqrChaos*0.5
    instr.snareRelease = getRandomFloat(0.1,0.5+sqrChaos*0.5)
    instr.hihatRelease = getRandomFloat(0.1,0.3+sqrChaos*0.5)
    return instr
  }

  instr.setEnvelope(peakLevel,sustainLevel,attack,decay,release) 
  instr.setFilter(filterType,filterFreq,filterDetune,Q,gain) 
  instr.setNoises({type:noiseType,filterType:noiseFilterType,cutoff:noiseFilterCutoff,volume:noiseFilterVolume})
  if(limit)
    instr.createLimiter()
  for(var i = 0;i<nbOsc;i++){
    var wave = getRandomWave();
    //beautiful
    var detune = getRandomInt(-baseDetune - sqrChaos*sqrChaos*sqrChaos*sqrChaos*10,sqrChaos*sqrChaos*sqrChaos*sqrChaos*10 + baseDetune)
    instr.setOscillators({wave:wave,detune:detune})
  }
  
  return instr
}
//Generate 3 random commands: kick/snare/hihat and adds them to the command list
function randomDrum(baseLength,commandList){
  var scale = ['A4']

  var kick = randomInstrument('kick') 
  var kickSequence = randomSequence(scale,baseLength,true)
  var kickCommand = new Command(kick,kickSequence,'Kick')
  commandList.push(kickCommand)

  var snare = randomInstrument('snare') 
  var snareSeq = randomSequence(scale,baseLength,true)
  var snareCommand = new Command(snare,snareSeq,'Snare')
  commandList.push(snareCommand)

  var hihat = randomInstrument('hihat') 
  var hihatSeq = randomSequence(scale,baseLength,true)
  var hihatCommand = new Command(hihat,hihatSeq,'Hihat')
  commandList.push(hihatCommand)
}

//Returns a random scale from the list
function randomScale(root){
  var x = parseInt(pickRandomProperty(scales))

  switch(x){
    case 0:
      return generateChromaticScale(root);
      break;
    case 1:
      return generateMajorScale(root);
      break;
    case 2:
      return generateNaturalMinorScale(root);
      break;
    case 3:
      return generateHarmonicMinorScale(root);
      break;
    case 4:
      return generateMelodicMinorScale(root);
      break;
    case 5:
      return generateDorianScale(root);
      break;
    case 6:
      return generatePhrygianScale(root);
      break;
    case 7:
      return generateLydianScale(root);
      break;
    case 8:
      return generateMixolydianScale(root);
      break;
    case 9:
      return generateLocrianScale(root);
      break;
    case 10:
      return generateMinorPentatonicScale(root);
      break;
    case 11:
      return generateMajorPentatonicScale(root);
      break;
  }
}
//Generates a scale based on a list of intervals and root note
// ex: generateScale([2,3,5,7,8,10],'A') returns a harmonic minor A scale
function generateScale(intervals,rootNote){
  var scale = {};
  scale[rootNote] = rootNotes[rootNote]
  for(var i =0;i<intervals.length;i++)
    scale[getNextScaleNote(rootNote,intervals[i])] = rootNotes[getNextScaleNote(rootNote,intervals[i])]
  return scale
}
//Helper function that returns a new note based on a root and an interval
function getNextScaleNote(note,offset){
  var notes = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#']
  var indexOfNote = notes.indexOf(note)
  var newIndex = indexOfNote+offset 
  if(newIndex>11)
    newIndex-=12
  return notes[newIndex]
}
//Returns a multiple octaves scale
function extendScale(scale,lowOctave,highOctave){
  var notes = {}
  for(var octave = lowOctave; octave<highOctave;octave++){
    for (var prop in scale){
      notes[prop+octave] = rootNotes[prop]*Math.pow(2,(octave-4));
    }
  }
  return notes;
}
//Returns a new random close (or identical) note based on a note and a scale.
function getNeighbourNote(note,scale){
  var offset ;
  var r = getRandomFloat(0,1)
  var g = getRandomGaussian()
  var sign = g>0?1:-1
  if(Math.abs(g)<0.5)
    offset = 0;
  else if(Math.abs(g)<1.5) 
    offset = sign*1
  else if(Math.abs(g)<2) 
    offset = sign*2
  else
    offset = sign*3

  //if(r<0.3333)
  //  offset = 0;
  //else if(r<0.666)
  //  offset = 1
  //else
  //  offset = -1

  sc = []

  Object.keys(scale).forEach(function(key,index) {
    sc.push(scale[key])
  });
  sc = sc.sort(function(a,b){return a-b})
  var nb = sc.length
  var indexOfNote = sc.indexOf(note)
  var newIndex = indexOfNote+offset 
  if(newIndex>nb-1)
    newIndex-=nb
  if(newIndex<0)
    newIndex = nb-1

  return sc[newIndex]
}





