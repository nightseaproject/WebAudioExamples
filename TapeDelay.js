import { createBiquadFilter, createStereoPanner, db2mag, createGain } from "./Utilities.js";

class TapeDelay {
  constructor(context, time, feedback = 0.3, wobble_rate_hz = 1, wobble_depth_ms = 4, eq_low_gain_dB = -1, eq_high_gain_dB = -2) {
    this.ctx = context;

    // input gain and output gain
    this.input = context.createGain();
    // output gain
    this.o = context.createGain();

    // Delay Line components
    this.dt = time;
    this.delay = context.createDelay(time + 0.1); // time + wobble room
    this.feedback = createGain(context, feedback);

    // Tone Controls for feedback loop
    const eq_low = createBiquadFilter(context, "lowshelf", 500, 1.0, eq_low_gain_dB);
    const eq_high = createBiquadFilter(context, "highshelf", 2000, 1.0, eq_high_gain_dB);

    // Feedback loop effects
    // saturator
    const saturator = context.createWaveShaper();
    saturator.curve = this.HyperTanDistortionCurve(0, 1.5);
    saturator.oversample = "4x";

    // diffusion, applies some phase smearing to the signal while it's in the feedback loop
    const diffusion = createBiquadFilter(context, "allpass", 500, 1.0, 0.0);

    // connect 
    // eq and compress before going into delay line
    this.input.connect(eq_low).connect(eq_high).connect(saturator).connect(diffusion).connect(this.delay);
    this.delay.connect(this.feedback).connect(eq_low); //fb loop
    this.delay.connect(this.o);

    // Panning
    this.pan_left = createStereoPanner(context, -1);
    this.pan_right = createStereoPanner(context, 1);
    const widening_l = createBiquadFilter(context, "allpass", 1000, 1.0, 0.0);
    const widening_r = createBiquadFilter(context, "allpass", 2000, 1.0, 0.0)
    this.o.connect(widening_l).connect(this.pan_left);
    this.o.connect(widening_r).connect(this.pan_right);

    // apply settings
    // min rate is 0.001 Hz
    // max rate is 10 Hz
    this.wr = clamp(wobble_rate_hz, 0.001, 10);
    // wobble depth input is from 0 to 1
    // max depth is 40 ms
    this.wd = clamp(wobble_depth_ms, 0, 40);
  }

  setFeedback(feedback_dB) {
    this.feedback.gain.setTargetAtTime(db2mag(feedback_dB), this.ctx.currentTime, 0.01);
  }

  setOutputGain(gain_dB) {
    this.o.gain.setTargetAtTime(db2mag(gain_dB), this.ctx.currentTime, 0.01);
  }

  connect(node) {
    this.pan_left.connect(node);
    this.pan_right.connect(node);
  }

  HyperTanDistortionCurve(ceiling_dB = 0, boost_dB = 3, curve_size = 512) {
    const curve = new Float32Array(curve_size);

    // a lower ceiling will result in the signal breaking up at lower volumes
    const scalar = db2mag(ceiling_dB);
    const scalar_boost = db2mag(boost_dB);

    for (let i = 0; i < curve_size; i++) {
      // from -1 to 1
      const x = (i * 2) / (curve_size - 1) - 1;
      curve[i] = scalar * Math.tanh(scalar_boost * x);
    }
    return curve;
  }


  dlm(history_data, tla) {
    // modulate the delay line
    const tp = 1 / this.wr;
    const ct = this.ctx.currentTime;
    let t = history_data.time;
    let dl = history_data.delay;
    while (t < (ct + tla)) {
      // new delay time
      const d = this.dt + Math.random() * this.wd;
      this.delay.delayTime.setValueCurveAtTime([dl, d], t, tp);
      t += tp;
      dl = d;
    }
    return { time: t, delay: dl }
  }

  start() {
    // modulate the delay line
    let data = { time: this.ctx.currentTime, delay: this.dt }
    const tla = 2; // timer look ahead
    data = this.dlm(data, tla);
    setInterval(() => {
      data = this.dlm(data, tla);
    }, tla * 500); // call timer twice per look ahead period
  }
}

export default TapeDelay;