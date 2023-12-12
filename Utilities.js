export function db2mag(db_value) {
    return Math.pow(10, db_value / 20);
}

export function GetMaxAbsValue(array) {
    let min = 100;
    let max = -100;
    for (let i = 0; i < array.length; ++i) {
        min = Math.min(min, array[i]);
        max = Math.max(max, array[i]);
    }
    return Math.max(max, Math.abs(min));
}

export function createAudioBuffer(n_channels, n_frames, sample_rate) {
    // create a buffer
    return new AudioBuffer({
        numberOfChannels: n_channels,
        length: n_frames,
        sampleRate: sample_rate,
    });
}

export function createBiquadFilter(ctx, type, frequency, Q, gain_dB) {
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    if (type === "lowshelf" || type === "highshelf") filter.gain.value = gain_dB;
    return filter;
}

export function createGain(ctx, initial_gain = 1.0) {
    const gain = ctx.createGain();
    gain.gain.value = initial_gain;
    return gain;
}

export function createOscillator(ctx, type, frequency, detune) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    return osc;
}

export function createStereoPanner(ctx, pan) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    return panner;
}

export function createBufferSource(ctx, buffer, playback_rate, loop) {
    const bs = ctx.createBufferSource();
    bs.buffer = buffer;
    bs.playbackRate.value = playback_rate;
    bs.loop = loop;
    return bs;
}

// Function to load an Audio Worklet module
function loadAudioWorkletModule(audio_ctx, moduleURL) {
    return new Promise((resolve, reject) => {
        // Use the audio context's audioWorklet property to load the module
        audio_ctx.audioWorklet.addModule(moduleURL)
            .then(() => {
                // console.log(`Audio Worklet module loaded successfully from ${moduleURL}`);
                resolve();
            })
            .catch((error) => {
                console.error(`Error loading Audio Worklet module from ${moduleURL}`, error);
                reject(error);
            });
    });
}

// load multiple modules
export function LoadModules(audio_ctx, urls) {
    return urls.reduce((previousPromise, moduleURL) => {
        return previousPromise.then(() => {
            return loadAudioWorkletModule(audio_ctx, moduleURL);
        });
    }, Promise.resolve());
};

export function createAudioContext() {
    // initialize audio
    const audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
    // immediately suspend
    audio_ctx.suspend();
    return audio_ctx;
}

export function linearRampToValueAtTime(ctx, param, value, duration) {
    if (navigator.userAgent.includes("Firefox")) {
        exponentialRampToValueAtTime(ctx, param, value, duration);
    } else {
        const current_time = ctx.currentTime;
        duration = Math.max(duration, 0);
        param.cancelScheduledValues(current_time);
        const start_value = param.value;
        param.setValueCurveAtTime([start_value, value], current_time, duration);
    }
}

export function exponentialRampToValueAtTime(ctx, param, value, duration) {
    const current_time = ctx.currentTime;
    duration = Math.max(duration, 0);
    param.cancelScheduledValues(current_time);
    param.setTargetAtTime(value, current_time, duration / 2.5); // 2.5 comes from documentation that 5x time constant = 99%
}

export function MixToDB(mix) {
    if (mix < 0.5)
        return db2mag(2 * mix * -6);
    else
        return db2mag(-6 + (-60 * 2 * (mix - 0.5)));
}

export function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

export function triangle(amp, period, t) {
    return (4 * amp / period) * Math.abs(((t - period / 4) % period) - period / 2) - amp;
}

// division should be the following format
// whole note = 1
// half note = 1/2
// quarter note = 1/4
// eighth note = 1/8
// etc
export function BPMToTime(BPM, division) {
    const inv_div = 1 / division;
    return (60.0 / (BPM * inv_div / 4))
}

export function CheckPRNG(prng) {
    if (prng == null) {
        console.trace("prng is null!");
        return Math.random;
    }
    else return prng;
}