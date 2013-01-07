var net = require('net'),
    fs = require('fs'),
    blockSize,
    totalBlock,
    stream,
    conn,
    tempVideo = './videos/test_video.3gp',
    Buffer = require('buffer').Buffer,
    blocker = false;

conn = new net.Socket();
conn.connect(36152);

fs.stat(tempVideo, function (err, stats){
  blockSize = parseInt(stats.blksize, 10);
  totalBlock = stats.blocks;
});

stream = fs.createReadStream(tempVideo);

stream.on('data', function (chunk){
  if (!blocker){
    conn.write(chunk);
//    blocker = true;
  }
});

stream.on("close", function () {
  conn.end();
})
