import { db2mag, createGain, createAudioBuffer, createBufferSource } from "./Utilities.js";

class DigitalTexture {
    constructor(context, bit_depth, sample_rate_reduction, bit_drops_per_second, bit_drop_intensity, input_node) {
        this.c = context;
        // output node
        this.o = createGain(context, 1.0);

        // bit crusher
        this.bc = context.createWaveShaper();
        this.bc.curve = this.BitCrushCurve(bit_depth, 512);
        this.bc.oversample = "4x";

        // sample_rate_reduction
        sample_rate_reduction = Math.max(sample_rate_reduction, 1.0);
        const sr_buffer = createAudioBuffer(1, Math.ceil(sample_rate_reduction), context.sampleRate);
        sr_buffer.getChannelData(0).fill(0);
        sr_buffer.getChannelData(0)[0] = 1.0;
        this.sr = createBufferSource(context, sr_buffer, 1.0, true);
        const sr_gain = createGain(context, 0.0);
        this.sr.connect(sr_gain.gain);

        // randomized bit dropping
        if (bit_drops_per_second > 0) {
            setInterval(() => {
                const ct = context.currentTime;
                for (let i = 0; i < bit_drops_per_second; ++i) {
                    // random time in the next second
                    const rt = Math.random();
                    // drop gain suddenly and then return it after 1 sample
                    this.o.gain.setValueAtTime(db2mag(bit_drop_intensity), ct + rt);
                    this.o.gain.setValueAtTime(1.0, ct + rt + 1 / context.sampleRate);
                }
            }, 1000);
        }

        // connect
        input_node.connect(this.bc).connect(sr_gain).connect(this.o);
    }

    connect(node) {
        this.o.connect(node);
    }

    start() {
        this.sr.start();
    }

    // designs a wavefolder curve for bit crushing
    BitCrushCurve(bit_depth = 32, curve_size = 512) {
        const curve = new Float32Array(curve_size);
        const max_value = Math.pow(2, bit_depth) - 1.;
        for (let i = 0; i < curve_size; i++) {
            // from -1 to 1
            const x = (i * 2) / (curve_size - 1) - 1;
            // get quantized int representation and convert back to float
            curve[i] = Math.round(x * max_value) / max_value;
        }
        return curve;
    }
}

export default DigitalTexture;