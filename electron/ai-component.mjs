export const AI_COMPONENT = Object.freeze({
  version: '1.7.0',
  size: 56_194_294,
  baseUrl: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
})

export const AI_RESOURCE_MAP = Object.freeze({
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm': {
    chunks: [
      { hash: '3dae4038fc722ce4ce041fbc9c63fd5c2d9864bc732a01994518f96e9ec2f357', name: '3dae4038fc722ce4ce041fbc9c63fd5c2d9864bc732a01994518f96e9ec2f357', offsets: [0, 4_194_304] },
      { hash: 'ff8e86f29887739d249494309ca84dff33bef456c0346c2bbfcd21e3b388d87a', name: 'ff8e86f29887739d249494309ca84dff33bef456c0346c2bbfcd21e3b388d87a', offsets: [4_194_304, 8_388_608] },
      { hash: '84addde9e759e397be2ee00d49a52dbf1b1a98863df325dc1c080252cbfe5fd9', name: '84addde9e759e397be2ee00d49a52dbf1b1a98863df325dc1c080252cbfe5fd9', offsets: [8_388_608, 11_819_815] },
    ],
    size: 11_819_815,
    mime: 'application/wasm',
  },
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs': {
    chunks: [
      { hash: 'aa485cf3fa61ca007b3e1ca7b65068328270f072b61cdda490b732211e1da5d9', name: 'aa485cf3fa61ca007b3e1ca7b65068328270f072b61cdda490b732211e1da5d9', offsets: [0, 25_539] },
    ],
    size: 25_539,
    mime: 'text/javascript',
  },
  '/models/isnet_quint8': {
    chunks: [
      { hash: 'f27ae13d9f59f61a6a1b5d9a91c203f2c613346083f02072c27c91672ccda8cf', name: 'f27ae13d9f59f61a6a1b5d9a91c203f2c613346083f02072c27c91672ccda8cf', offsets: [0, 4_194_304] },
      { hash: '064e16ef5bd663f4c8b2d2531c018973282906db2b80c9995731340b84d28a47', name: '064e16ef5bd663f4c8b2d2531c018973282906db2b80c9995731340b84d28a47', offsets: [4_194_304, 8_388_608] },
      { hash: '829842727f98368990f103f052e112e521dd27123b9f6b8615efa6cb32bfaa4f', name: '829842727f98368990f103f052e112e521dd27123b9f6b8615efa6cb32bfaa4f', offsets: [8_388_608, 12_582_912] },
      { hash: '9d4c548caff42434be7b42d2f46e35a0da25f4d679ff4218b72bc8cf8fd4d291', name: '9d4c548caff42434be7b42d2f46e35a0da25f4d679ff4218b72bc8cf8fd4d291', offsets: [12_582_912, 16_777_216] },
      { hash: 'f3ce5fa0c5dc650423b4cb885d9fce1dbf043ee002c4a161688f36c2d2a122e0', name: 'f3ce5fa0c5dc650423b4cb885d9fce1dbf043ee002c4a161688f36c2d2a122e0', offsets: [16_777_216, 20_971_520] },
      { hash: '0a2415f50fe3072be594f7c4c66787f9465efed8dae6010b02f8575ea36bf81b', name: '0a2415f50fe3072be594f7c4c66787f9465efed8dae6010b02f8575ea36bf81b', offsets: [20_971_520, 25_165_824] },
      { hash: 'a2385cccf96fda2efcf32b61349bc9c3a8ccb9be2246e45db6bfca6e37b78117', name: 'a2385cccf96fda2efcf32b61349bc9c3a8ccb9be2246e45db6bfca6e37b78117', offsets: [25_165_824, 29_360_128] },
      { hash: 'ef08462567a199c89e0701ad47876c8fdc1b5eb487bbd6c2b58dd65fdc8bdc47', name: 'ef08462567a199c89e0701ad47876c8fdc1b5eb487bbd6c2b58dd65fdc8bdc47', offsets: [29_360_128, 33_554_432] },
      { hash: 'e57a35056b1480bc581977524cf0c19994542cb044626cfffca0b304a6cf227c', name: 'e57a35056b1480bc581977524cf0c19994542cb044626cfffca0b304a6cf227c', offsets: [33_554_432, 37_748_736] },
      { hash: 'b7b88898b9ab9e43209322097282f88e9e02315273e291373366261cd0a77059', name: 'b7b88898b9ab9e43209322097282f88e9e02315273e291373366261cd0a77059', offsets: [37_748_736, 41_943_040] },
      { hash: 'b275d60a2e1790daff7c9040fd99a3897bfdf7d1550da1ccf8bea60902e9c585', name: 'b275d60a2e1790daff7c9040fd99a3897bfdf7d1550da1ccf8bea60902e9c585', offsets: [41_943_040, 44_348_940] },
    ],
    size: 44_348_940,
    mime: 'application/octet-stream',
  },
})

export const AI_CHUNKS = Object.freeze([...new Map(
  Object.values(AI_RESOURCE_MAP).flatMap(resource => resource.chunks).map(chunk => [chunk.name, {
    name: chunk.name,
    hash: chunk.hash,
    size: chunk.offsets[1] - chunk.offsets[0],
  }]),
).values()])
