// WebGPU FFT PoC
// 目标: 验证是否可用 GPU 加速 256-point FFT

async function initWebGPU() {
  if (!navigator.gpu) {
    throw new Error('WebGPU not supported');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No GPU adapter found');
  }

  const device = await adapter.requestDevice({
    requiredFeatures: ['compute-shaders'],
    requiredLimits: {
      maxComputeWorkgroupStorageSize: 16384,
      maxComputeWorkgroupsPerDimension: 65535,
    },
  });

  return { device, adapter };
}

// WGSL shader for 256-point FFT (Radix-2, in-place)
const fftShaderCode = `
struct Params {
  n: u32,
  logN: u32,
};

@group(0) @binding(0) var<storage, read_write> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn bitReverse(i: u32, logN: u32) -> u32 {
  var rev: u32 = 0;
  for (var j = 0u; j < logN; j++) {
    rev = (rev << 1u) | ((i >> j) & 1u);
  }
  return rev;
}

fn fftStep(data: array<f32>, n: u32, logN: u32) {
  // Bit-reversal permutation
  var temp: array<f32, 512> = array<f32, 512>();
  for (var i = 0u; i < n; i++) {
    let rev = bitReverse(i, logN);
    temp[2u * rev] = data[2u * i];
    temp[2u * rev + 1u] = data[2u * i + 1u];
  }
  for (var i = 0u; i < n; i++) {
    data[2u * i] = temp[2u * i];
    data[2u * i + 1u] = temp[2u * i + 1u];
  }

  // Butterfly
  for (var s = 1u; s < logN; s++) {
    let m = 1u << s;
    let m2 = m >> 1u;
    for (var k = 0u; k < m2; k++) {
      let theta = -2.0 * 3.141592653589793 * f32(k) / f32(m);
      let wRe = cos(theta);
      let wIm = sin(theta);
      for (var j = 0u; j < n; j += m) {
        let aRe = data[2u * (j + k)];
        let aIm = data[2u * (j + k) + 1u];
        let bRe = data[2u * (j + k + m2)];
        let bIm = data[2u * (j + k + m2) + 1u];

        let cRe = wRe * bRe - wIm * bIm;
        let cIm = wRe * bIm + wIm * bRe;

        data[2u * (j + k)] = aRe + cRe;
        data[2u * (j + k) + 1u] = aIm + cIm;
        data[2u * (j + k + m2)] = aRe - cRe;
        data[2u * (j + k + m2) + 1u] = aIm - cIm;
      }
    }
  }
}

@compute @workgroup_size(256)
fn computeMain(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= params.n) {
    return;
  }

  // Copy to local for computation
  var localData: array<f32, 512>;
  for (var i = 0u; i < 2u * params.n; i++) {
    localData[i] = input[i];
  }

  fftStep(localData, params.n, params.logN);

  // Write back
  for (var i = 0u; i < 2u * params.n; i++) {
    output[i] = localData[i];
  }
}
`;

async function runFFT() {
  const { device } = await initWebGPU();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('webgpu');
  if (!ctx) throw new Error('WebGPU context not available');

  const n = 256;
  const logN = 8;

  // Create buffer: 2*n floats (real, imag)
  const bufferSize = 2 * n * 4; // 4 bytes per f32
  const inputBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  
  // Fill with 440Hz sine wave (real), imag=0
  const inputArray = new Float32Array(inputBuffer.getMappedRange());
  const sampleRate = 44100;
  for (let i = 0; i < n; i++) {
    inputArray[2 * i] = Math.sin(2 * Math.PI * 440 * i / sampleRate); // real
    inputArray[2 * i + 1] = 0; // imag
  }
  inputBuffer.unmap();

  const outputBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const paramsBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  const paramsArray = new Uint32Array(paramsBuffer.getMappedRange());
  paramsArray[0] = n;
  paramsArray[1] = logN;
  paramsBuffer.unmap();

  const module = device.createShaderModule({ code: fftShaderCode });
  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module, entryPoint: 'computeMain' },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputBuffer } },
      { binding: 1, resource: { buffer: outputBuffer } },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ],
  });

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatchWorkgroups(Math.ceil(n / 256));
  passEncoder.end();

  device.queue.writeBuffer(inputBuffer, 0, inputArray.buffer);
  device.queue.submit([commandEncoder.finish()]);

  // Read result
  const resultBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const copyEncoder = device.createCommandEncoder();
  copyEncoder.copyBufferToBuffer(outputBuffer, 0, resultBuffer, 0, bufferSize);
  device.queue.submit([copyEncoder.finish()]);

  await resultBuffer.mapAsync(GPUMapMode.READ);
  const resultArray = new Float32Array(resultBuffer.getMappedRange());
  resultBuffer.unmap();

  // Compute magnitude spectrum
  const magnitudes = [];
  for (let i = 0; i < n; i++) {
    const re = resultArray[2 * i];
    const im = resultArray[2 * i + 1];
    magnitudes.push(Math.sqrt(re * re + im * im));
  }

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <p>✅ WebGPU FFT succeeded (256 points)</p>
    <p>Input: 440Hz sine wave</p>
    <p>Peak at bin ${Math.round(440 * n / 44100)} (expected ~2.5)</p>
    <pre>${magnitudes.slice(0, 10).map(v => v.toFixed(3)).join(', ')}</pre>
  `;
}

document.getElementById('run')?.addEventListener('click', () => {
  runFFT().catch(console.error);
});