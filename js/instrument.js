//Instrument: list of oscillators with enveloppe, filter, distortion and noise params
function Instrument(params){
	this.context = context;
	this.oscillators = []
	this.noises = []

	// Default params
	this.oscillatorsParams = [{wave:'sine',detune:0}]
	this.noisesParams = []
	this.envelopeParams = {peakLevel:1,
				sustainLevel:1,
				attackTime:1,
				decayTime:1,
				releaseTime:1},

	this.instrGainNode = this.context.createGain();

	this.filter = this.context.createBiquadFilter();
	this.filter.type = 'lowpass'
	this.filter.frequency.value = 20000


	this.distortion = this.context.createWaveShaper();

	//hard coded pseudo limiter
	this.compressor = this.context.createDynamicsCompressor()
	this.compressor.threshold.value = -24;
	this.compressor.reduction.value = -200
	this.compressor.attack.value = 0;

	//routing
	this.filter.connect(this.distortion)
	this.distortion.connect(this.compressor)
	this.compressor.connect(this.instrGainNode)
	this.instrGainNode.connect(mixNode)
}
//Takes input params and create osc list
Instrument.prototype.setOscillators= function(){
	var args = Array.prototype.slice.call(arguments);
	var osc = this.oscillatorsParams
	args.forEach(function(a){
		osc.push(a)
	})
	this.oscillatorsParams = osc
}
//Takes input params and create noise list
Instrument.prototype.setNoises= function(){
	var args = Array.prototype.slice.call(arguments);
	var noise = []
	args.forEach(function(a){
		noise.push(a)
	})
	this.noisesParams = noise
}
//Takes input params and set instrument params
Instrument.prototype.setEnvelope = function(peak,sustain,a,d,r){
	this.envelopeParams.peakLevel = peak || 0.3;
	this.envelopeParams.sustainLevel = sustain || 0.1;
	this.envelopeParams.attackTime = a || 0.5;
	this.envelopeParams.decayTime = d || 0.5;
	this.envelopeParams.releaseTime = r || 0.5;
}
//Takes input params and set instrument params
Instrument.prototype.setFilter = function(type,freq,detune,Q,gain){
	this.filter.type = type;
	this.filter.frequency.value = freq;
	this.filter.Q.value = Q;
	this.filter.detune.value = detune;
	this.filter.gain.value = gain;
}
//Takes input params and set instrument params
Instrument.prototype.setDistortion = function(amount){
	if(amount === 0)
		return
	var k = typeof amount === 'number' ? amount : 50,
    	n_samples = 44100,
    	curve = new Float32Array(n_samples),
    	deg = Math.PI / 180,
    	i = 0,
    	x;
	for ( ; i < n_samples; ++i ) {
	  x = i * 2 / n_samples - 1;
	  curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
	}

  	this.distortion.curve = curve
}

//Chooses play mode depending on instrument type
Instrument.prototype.play = function(freq,time,duration){
	var gainNode = this.context.createGain();
	gainNode.gain.value = 0;
	gainNode.connect(this.filter);

	if(this.trig == 'kick'){
		this.playKick(gainNode,time)
		return
	}
	if(this.trig == 'snare'){
		this.playSnare(gainNode,time)
		return
	}
	if(this.trig == 'hihat'){
		this.playHihat(gainNode,time)
		return
	}
	else{
		this.playNote(gainNode,freq,time,duration)
	}
}
//(x_x)
Instrument.prototype.kill = function(){
	this.oscillators.forEach(function(o) {
		o.stop();
	});
	this.noises.forEach(function(n) {
		n.stop();
	});
	this.oscillators = [];
	this.noises = [];
}
//Iterates through all osc and noises and start/stop them according to params
Instrument.prototype.playNote = function(gainNode,freq,time,duration){
	this.oscillators = [];
	this.noises = [];
	
	var self = this;
	this.oscillatorsParams.forEach(function(o){
		var osc = self.createOsc(o.wave,freq + o.detune,gainNode)
		self.oscillators.push(osc)
		osc.start(time)
	})
	this.noisesParams.forEach(function(n){
		var noise = self.createNoise(n.type,n.filterType,n.cutoff, n.volume, gainNode)
		self.noises.push(noise)
		noise.start(time)
	})

	var attack = duration>this.envelopeParams.attackTime? this.envelopeParams.attackTime : duration
	var decay = duration>this.envelopeParams.attackTime? this.envelopeParams.decayTime : 0
	var release = duration + this.envelopeParams.releaseTime;

	gainNode.gain.setValueAtTime(0,time);

    gainNode.gain.linearRampToValueAtTime(this.envelopeParams.peakLevel, time + attack)
	gainNode.gain.setValueAtTime(this.envelopeParams.peakLevel,time + attack);

    gainNode.gain.linearRampToValueAtTime(this.envelopeParams.sustainLevel, time + attack + decay) 
    gainNode.gain.setValueAtTime(this.envelopeParams.sustainLevel,time + attack + decay);

    gainNode.gain.setValueAtTime(this.envelopeParams.sustainLevel,time + duration);
    
    gainNode.gain.exponentialRampToValueAtTime(0.001,time + release);

	this.oscillators.forEach(function(o) {
		o.stop(time + release);
	});
	this.noises.forEach(function(n) {
		n.stop(time + release);
	});
	
    
}
//Synthetize a relatively shitty kick
Instrument.prototype.playKick = function(gainNode,time){
	var n = 3
	gainNode.gain.setValueAtTime(this.envelopeParams.sustainLevel, time);
	gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3 +this.kickRelease);
	for(var i = 0;i<n;i++){
		var osc = this.context.createOscillator();
		osc.connect(gainNode);
		osc.frequency.setValueAtTime(120+n*15, time);
		osc.frequency.exponentialRampToValueAtTime(0.01, time + this.kickRelease);
		osc.start(time);
		osc.stop(time + this.kickRelease);
	}
}
//Synthetize a shitty snare
Instrument.prototype.playSnare = function(gainNode,time){
	gainNode.gain.setValueAtTime(this.envelopeParams.sustainLevel, time);

	this.noise = this.context.createBufferSource();
	this.noise.buffer = noiseBuffer(context)
	var noiseFilter = this.context.createBiquadFilter();
	noiseFilter.type = 'highpass';
	noiseFilter.frequency.value = 1000;
	this.noise.connect(noiseFilter);
	this.noiseEnvelope = this.context.createGain();
	noiseFilter.connect(this.noiseEnvelope);

	this.noiseEnvelope.connect(gainNode);
	this.osc = this.context.createOscillator();
	this.osc.type = 'triangle';

	this.oscEnvelope = this.context.createGain();
	this.osc.connect(this.oscEnvelope);
	this.noiseEnvelope.gain.setValueAtTime(this.envelopeParams.sustainLevel/2, time);
	this.noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + this.snareRelease	);
	this.noise.start(time)

	this.osc.frequency.setValueAtTime(100, time);
	this.oscEnvelope.gain.setValueAtTime(this.envelopeParams.sustainLevel, time);
	this.oscEnvelope.gain.exponentialRampToValueAtTime(0.01, time + this.snareRelease	);
	this.osc.start(time)

	this.osc.stop(time + this.snareRelease);
	this.noise.stop(time + this.snareRelease);
}
//Synthetize a shitty hihat
Instrument.prototype.playHihat = function(gainNode,time){
	var d = this.hihatRelease	
	var fundamental = 40;
	var ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];
	var self = this;

	// Bandpass
	var bandpass = context.createBiquadFilter();
	bandpass.type = "bandpass";
	bandpass.frequency.value = 10000;

	// Highpass
	var highpass = context.createBiquadFilter();
	highpass.type = "highpass";
	highpass.frequency.value = 7000;

	// Connect the graph
	bandpass.connect(highpass);
	highpass.connect(gainNode);

	// Create the oscillators
	ratios.forEach(function(ratio) {
		var osc = self.context.createOscillator();
		var osc2 = self.context.createOscillator();
		osc.type = "square";
		osc2.type = "triangle";
		// Frequency is the fundamental * this oscillator's ratio
		osc.frequency.value = fundamental * ratio;
		osc2.frequency.value = fundamental * ratio ;
		osc.connect(bandpass);
		osc2.connect(bandpass);
		osc.start(time);
		osc2.start(time);
		osc.stop(time + d);
		osc2.stop(time + d);
	});

	// Define the volume envelope
	gainNode.gain.setValueAtTime(0.00001, time);
	gainNode.gain.exponentialRampToValueAtTime(this.envelopeParams.sustainLevel, time + 0.03);
	gainNode.gain.exponentialRampToValueAtTime(this.envelopeParams.sustainLevel/3.0, time + this.hihatRelease);
	gainNode.gain.exponentialRampToValueAtTime(0.00001, time + this.hihatRelease + 1);
}
//Helper to create and connect an osc 
Instrument.prototype.createOsc = function(wave,freq,gainNode){
	var source = this.context.createOscillator();
	source.frequency.value = freq
	source.type = wave;
	source.connect(gainNode);
	return source
}
//Helper to create and connect a noise
Instrument.prototype.createNoise = function(type,filterType,cutoff,volume,gainNode){
	var bufferSize = 2*this.context.sampleRate
	var buffer = this.context.createBuffer(1,bufferSize,this.context.sampleRate);
	var data = buffer.getChannelData(0);
	if(type == 'white')
		data = createWhiteNoise(data,volume)
	else if (type == 'pink')
		data = createPinkNoise(data,volume)
	else if (type == 'brownian')
		data = createBrownianNoise(data,volume)
    var source = this.context.createBufferSource();
    source.loop = true;
    source.buffer = buffer
 	
 	var filter = this.context.createBiquadFilter();
	filter.type = filterType
	filter.frequency.value = cutoff

	source.connect(filter);
	filter.connect(gainNode)
	return source
}

//bla bla bla. Stolen from somewhere
createWhiteNoise = function(data,volume){
	for (i = 0; i < data.length; i++) {
        data[i] = (Math.random() - 0.5) * 2*volume;
    }
    return data
}
createPinkNoise = function(data,volume){
	var b0, b1, b2, b3, b4, b5, b6;
	    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
	for (i = 0; i < data.length; i++) {
        var white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11*volume; // (roughly) compensate for gain
        b6 = white * 0.115926;
    }
    return data
}
createBrownianNoise = function(data,volume){
	var lastOut = 0.0;
	for (i = 0; i < data.length; i++) {
        var white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5*volume; // (roughly) compensate for gain
    }
    return data
}
noiseBuffer = function(context) {

	var bufferSize = context.sampleRate;
	var buffer = context.createBuffer(1, bufferSize, context.sampleRate);
	var output = buffer.getChannelData(0);

	for (var i = 0; i < bufferSize; i++) {
		output[i] = Math.random() * 2 - 1;
	}

	return buffer;
};








