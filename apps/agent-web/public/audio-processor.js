/**
 * Audio Processor for Gemini Live API
 * Captures microphone input and sends it to the main thread as PCM16
 */
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const inputData = input[0]; // Mono input
      
      // Send raw Float32 data to the main thread
      // The main thread will handle PCM16 conversion to avoid blocking the audio thread
      this.port.postMessage(inputData);
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
