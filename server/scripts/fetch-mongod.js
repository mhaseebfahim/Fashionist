// Pre-downloads the mongod binary used by the test suite (mongodb-memory-server), with retries.
import { MongoBinary } from 'mongodb-memory-server-core';
for (let attempt = 1; attempt <= 8; attempt++) {
  try {
    console.log('mongod ready at', await MongoBinary.getPath({ version: '7.0.14' }));
    process.exit(0);
  } catch (e) {
    console.error(`attempt ${attempt} failed: ${e.message}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
process.exit(1);
