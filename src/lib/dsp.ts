// ============================================================
// Mel-Spectrogram DSP Utility
// Generates mel-spectrograms from raw PCM audio for BirdNET input
// ============================================================

/**
 * DSP configuration for BirdNET-compatible spectrogram generation.
 * BirdNET expects mel-spectrograms with specific parameters.
 */
export interface SpectrogramConfig {
  sampleRate: number;
  fftSize: number;
  hopLength: number;
  nMels: number;
  fMin: number;
  fMax: number;
  power: number;
}

/** Default config matching BirdNET's expected input */
export const BIRDNET_SPECTROGRAM_CONFIG: SpectrogramConfig = {
  sampleRate: 48000,
  fftSize: 2048,
  hopLength: 512, // ~10.67ms hop at 48kHz
  nMels: 64,
  fMin: 150,   // BirdNET lower frequency bound
  fMax: 15000, // BirdNET upper frequency bound
  power: 2.0,  // Power spectrogram
};

/**
 * Hann window function for FFT framing
 */
function hannWindow(length: number): Float32Array {
  const window = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (length - 1)));
  }
  return window;
}

/**
 * Compute the FFT of a real-valued signal using the Cooley-Tukey algorithm.
 * Returns magnitude spectrum.
 */
function realFFT(signal: Float32Array): Float32Array {
  const n = signal.length;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  real.set(signal);

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // FFT butterfly
  for (let len = 2; len <= n; len *= 2) {
    const halfLen = len / 2;
    const angle = (-2 * Math.PI) / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curReal = 1;
      let curImag = 0;

      for (let k = 0; k < halfLen; k++) {
        const tReal = curReal * real[i + k + halfLen] - curImag * imag[i + k + halfLen];
        const tImag = curReal * imag[i + k + halfLen] + curImag * real[i + k + halfLen];

        real[i + k + halfLen] = real[i + k] - tReal;
        imag[i + k + halfLen] = imag[i + k] - tImag;
        real[i + k] += tReal;
        imag[i + k] += tImag;

        const newCurReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newCurReal;
      }
    }
  }

  // Compute magnitude spectrum (only positive frequencies)
  const magnitudes = new Float32Array(n / 2 + 1);
  for (let i = 0; i <= n / 2; i++) {
    magnitudes[i] = real[i] * real[i] + imag[i] * imag[i];
  }
  return magnitudes;
}

/**
 * Create mel filterbank matrix
 */
function createMelFilterbank(
  nMels: number,
  nFft: number,
  sampleRate: number,
  fMin: number,
  fMax: number
): Float32Array[] {
  // Hz to Mel conversion
  const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
  const melToHz = (mel: number) => 700 * (Math.pow(10, mel / 2595) - 1);

  const melMin = hzToMel(fMin);
  const melMax = hzToMel(fMax);
  const nBins = nFft / 2 + 1;

  // Linearly spaced mel points
  const melPoints = new Float32Array(nMels + 2);
  for (let i = 0; i < nMels + 2; i++) {
    melPoints[i] = melMin + (i * (melMax - melMin)) / (nMels + 1);
  }

  // Convert back to Hz and then to FFT bin indices
  const binIndices = new Float32Array(nMels + 2);
  for (let i = 0; i < nMels + 2; i++) {
    const hz = melToHz(melPoints[i]);
    binIndices[i] = Math.floor(((nFft + 1) * hz) / sampleRate);
  }

  // Create triangular filters
  const filterbank: Float32Array[] = [];
  for (let m = 0; m < nMels; m++) {
    const filter = new Float32Array(nBins);
    const left = binIndices[m];
    const center = binIndices[m + 1];
    const right = binIndices[m + 2];

    for (let k = 0; k < nBins; k++) {
      if (k >= left && k <= center) {
        filter[k] = center !== left ? (k - left) / (center - left) : 0;
      } else if (k > center && k <= right) {
        filter[k] = right !== center ? (right - k) / (right - center) : 0;
      }
    }
    filterbank.push(filter);
  }

  return filterbank;
}

/**
 * Generate a mel-spectrogram from raw PCM audio.
 * Returns a flat Float32Array suitable for tensor creation.
 *
 * @param audio - Float32 PCM samples at the configured sample rate
 * @param config - Spectrogram generation parameters
 * @returns Flat Float32Array of shape [nFrames, nMels]
 */
export function computeMelSpectrogram(
  audio: Float32Array,
  config: SpectrogramConfig = BIRDNET_SPECTROGRAM_CONFIG
): { data: Float32Array; nFrames: number; nMels: number } {
  const { fftSize, hopLength, nMels, sampleRate, fMin, fMax, power } = config;

  // Pad audio to next power of 2 for FFT if needed
  const nFrames = Math.floor((audio.length - fftSize) / hopLength) + 1;

  if (nFrames <= 0) {
    throw new Error(
      `Audio too short: ${audio.length} samples, need at least ${fftSize} for FFT`
    );
  }

  // Pre-compute window and filterbank
  const window = hannWindow(fftSize);
  const filterbank = createMelFilterbank(nMels, fftSize, sampleRate, fMin, fMax);

  // Output buffer
  const melSpec = new Float32Array(nFrames * nMels);

  // Process each frame
  for (let frame = 0; frame < nFrames; frame++) {
    const start = frame * hopLength;

    // Extract and window the frame
    const windowed = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      windowed[i] = (audio[start + i] || 0) * window[i];
    }

    // Compute power spectrum
    const powerSpectrum = realFFT(windowed);

    // Apply power scaling
    if (power !== 2.0) {
      for (let i = 0; i < powerSpectrum.length; i++) {
        powerSpectrum[i] = Math.pow(powerSpectrum[i], power / 2);
      }
    }

    // Apply mel filterbank
    for (let m = 0; m < nMels; m++) {
      let energy = 0;
      const filter = filterbank[m];
      for (let k = 0; k < powerSpectrum.length; k++) {
        energy += filter[k] * powerSpectrum[k];
      }

      // Log-mel transform (with small epsilon for numerical stability)
      melSpec[frame * nMels + m] = Math.log(Math.max(energy, 1e-10));
    }
  }

  return { data: melSpec, nFrames, nMels };
}

/**
 * Normalize spectrogram to zero mean and unit variance
 */
export function normalizeSpectrogram(data: Float32Array): Float32Array {
  const n = data.length;
  let mean = 0;
  let std = 0;

  for (let i = 0; i < n; i++) mean += data[i];
  mean /= n;

  for (let i = 0; i < n; i++) std += (data[i] - mean) ** 2;
  std = Math.sqrt(std / n);

  const normalized = new Float32Array(n);
  const invStd = std > 1e-10 ? 1 / std : 1;
  for (let i = 0; i < n; i++) {
    normalized[i] = (data[i] - mean) * invStd;
  }

  return normalized;
}
